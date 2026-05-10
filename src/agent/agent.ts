import { ChatGroq } from "@langchain/groq";
import { createAgent, tool } from "langchain";
import Message from "../models/message.model";
import "../models/user.model";
import { z } from "zod";

const responseSchema = z.object({
  message: z.string(),
  error: z.boolean(),
});

const retrieveMessagesTool = tool(
  async ({ chatId, limit = 10, before, after }) => {
    const query: any = { chatId };
    if (before && after) {
      query.createdAt = { $gt: new Date(after), $lt: new Date(before) };
    } else if (before) {
      query.createdAt = { $lt: new Date(before) };
    } else if (after) {
      query.createdAt = { $gt: new Date(after) };
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 200);

    const messages = await Message.find(query)
      .populate("senderId")
      .sort({ createdAt: -1 })
      .limit(safeLimit);

    const formatted = messages.reverse().map((msg) => ({
      name: msg.senderId.fullName,
      userId: msg.senderId._id.toString(),
      message: msg.text,
      createdAt: msg.createdAt?.toISOString(),
    }));

    return JSON.stringify(formatted);
  },
  {
    name: "retrieve_messages",
    description: `
Fetch messages from a chat. Supports pagination and date filters.

Parameters:
- chatId (string): chat id to fetch messages from
- userId (string): the id of the simulated user (for context)
- limit (number, optional): max number of messages to return (default 10)
- before (ISO datetime string, optional): return messages created before this time
- after (ISO datetime string, optional): return messages created after this time

IMPORTANT:
- Return messages sorted oldest → newest (tool implementation reverses after fetching newest→oldest)
- Do NOT summarize or modify message text
`,
    schema: z.object({
      chatId: z.string(),
      userId: z.string().optional(),
      limit: z.number().int().min(1).max(200).optional(),
      before: z.string().optional(),
      after: z.string().optional(),
    }),
  },
);

const llm = new ChatGroq({
  model: process.env.GROQ_MODEL as string,
  temperature: 0,

  maxTokens: undefined,
  maxRetries: 2,
});

const systemPrompt = `You are a real human user inside a chat application.

You are NOT an AI and NOT an assistant.

You are ONLY simulating the user with the given userId.

--------------------

-INPUT:
- You will receive chat history from a tool (variable length; tool may apply limit, before, after filters)
- You will receive the latest message from another user

--------------------

TASK:
Your job is to reply EXACTLY like this user would reply in a real chat.

Use chat history to understand context.

--------------------

TOOL USAGE:
- You MUST use retrieve_messages tool first (if available)
- Tool output is the ONLY source of truth for chat history

--------------------

RESPONSE RULES:
- Reply like a real human texting
- Keep it short and natural
- DO NOT repeat the question unless a human would
- DO NOT say "I am an AI"
- DO NOT explain anything
- DO NOT output JSON
- DO NOT say you can see, view, or access the chat history
- DO NOT summarize the history unless the user explicitly asks you to summarize it
- If the user asks for the last messages, answer naturally like a person in the chat, not like a system response
- DO NOT copy the latest user message back verbatim
- Treat the latest user message as something to react to, not something to echo
- If the latest message is a reaction or profanity, respond like the same human would in a real chat thread

--------------------

CRITICAL RULE:
You are continuing a conversation, NOT answering questions like a chatbot.

So if user asks "who are you":
→ respond like a normal person in chat, NOT a definition

--------------------

ERROR CASE:
If tool fails or chatId/userId invalid  or anything is wrong :
then just mention about that there is something wrong or error
""
`;
const agent = createAgent({
  model: llm,
  tools: [retrieveMessagesTool],
  systemPrompt,
});

const validatorPrompt = `You are a validation layer for a chat app user-simulation bot.

You will receive the raw output from the agent that speaks on behalf of a bot-enabled user.
That raw output may include the original user message, tool calls, tool messages, and the final assistant message.

Your job:
- Analyze the full raw output carefully.
- Understand what the raw agent was trying to do.
- Use the raw tool message and the raw assistant output to decide the final reply.
- Return only the final message that the bot-enabled user should send.
- If the raw agent output is wrong, incomplete, invalid, or it clearly echoed the user message, set error to true.

What counts as wrong:
- The assistant repeated the incoming user message instead of replying naturally.
- The assistant acted like an AI, assistant, or system.
- The assistant returned empty, nonsensical, or malformed text.
- The assistant ignored the tool message when it should have used it.
- The assistant summarized instead of replying as a human in the chat.
- The assistant leaked internal reasoning or tool usage.

What to do:
- If the raw output is good, set error to false and return the final natural chat reply.
- If the raw output is bad, set error to true and return a short human-style message that clearly says there is something wrong or an error.
- The reply must be a plain string only, no JSON in the message field.
- Prefer allowing a natural human reply when plausible; only set error to true for clearly broken output.
- Never copy or paraphrase the assistant's bad text when creating the fallback.
- If the assistant sounds like a bot or assistant, ignore that wording completely and produce a short human-style chat reply instead.
- The fallback should sound like the simulated user in the conversation, not like a validator or system.
- When error is true, the message must include wording like "something is wrong" or "error".
`;

const validator = llm.withStructuredOutput(responseSchema);

const normalizeContent = (content: any): string => {
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (typeof part?.text === "string") return part.text;
        return "";
      })
      .join(" ")
      .trim();
  }
  if (typeof content?.text === "string") return content.text.trim();
  return "";
};

const isUsableHumanReply = (text: string, incomingMessage: string): boolean => {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (trimmed.length < 2 || trimmed.length > 400) return false;
  if (trimmed.toLowerCase() === incomingMessage.trim().toLowerCase())
    return false;
  const lowered = trimmed.toLowerCase();
  if (
    lowered.includes("retrieve_messages") ||
    lowered.includes("tool call") ||
    lowered.includes("role:") ||
    lowered.includes("system prompt")
  ) {
    return false;
  }
  return true;
};

const buildDeterministicFallbackReply = (incomingMessage: string): string => {
  const msg = incomingMessage.trim().toLowerCase();
  if (!msg) return "hey, I am here.";
  if (/(^|\s)(hi|hello|hey|yo)(\s|$)/i.test(msg)) return "hey, what's up?";
  if (/(thanks|thank you|thx)/i.test(msg)) return "anytime :)";
  if (msg.includes("?")) return "hmm, I think so. tell me a bit more?";
  if (/(angry|mad|wtf|fuck|bc|mc)/i.test(msg)) return "easy, what happened?";
  return "got it. tell me more.";
};

export const generateAiReply = async (
  chatId: string,
  userId: string,
  currentMessage: string,
  options?: { limit?: number; before?: string; after?: string },
): Promise<{ message: string; error: boolean }> => {
  try {
    const userContent = `chatId: ${chatId}\nuserId: ${userId}\nlimit: ${options?.limit ?? 10}\nbefore: ${options?.before ?? ""}\nafter: ${options?.after ?? ""}\nincomingMessage: ${currentMessage}`;

    const rawResponse = await agent.invoke({
      messages: [
        {
          role: "system",
          content:
            "The next message is from the other human in the chat. Do not repeat it. Reply only as the bot-enabled user, and make the reply different from the incoming message.",
        },
        {
          role: "user",
          content: userContent,
        },
      ],
    });

    const rawMessages = Array.isArray((rawResponse as any).messages)
      ? (rawResponse as any).messages
      : [];

    const rawToolMessage = [...rawMessages]
      .reverse()
      .find(
        (message) =>
          message?.name === "retrieve_messages" || message?.role === "tool",
      );

    const rawAiMessage = [...rawMessages]
      .reverse()
      .find(
        (message) => message?.name === "model" || message?.role === "assistant",
      );

    const aiTextFromMessages = normalizeContent(rawAiMessage?.content);
    const aiTextFromResponse = normalizeContent(
      (rawResponse as any)?.output_text,
    );
    const fallbackAiText = aiTextFromMessages || aiTextFromResponse;

    let validationResult: { message: string; error: boolean } | null = null;

    try {
      validationResult = await validator.invoke([
        {
          role: "system",
          content: validatorPrompt,
        },
        {
          role: "user",
          content: JSON.stringify(
            {
              toolMessage: rawToolMessage?.content ?? null,
              aiMessage: rawAiMessage?.content ?? null,
            },
            null,
            2,
          ),
        },
      ]);
    } catch {
      validationResult = null;
    }

    if (
      validationResult &&
      !validationResult.error &&
      validationResult.message?.trim()
    ) {
      return validationResult;
    }

    if (isUsableHumanReply(fallbackAiText, currentMessage)) {
      return { message: fallbackAiText, error: false };
    }

    return {
      message: buildDeterministicFallbackReply(currentMessage),
      error: false,
    };
  } catch (err: any) {
    return {
      message: buildDeterministicFallbackReply(currentMessage),
      error: false,
    };
  }
};
