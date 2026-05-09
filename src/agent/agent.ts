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
  async ({ chatId, userId }) => {
    const messages = await Message.find({ chatId })
      .populate("senderId")
      .limit(10)
      .sort({ createdAt: -1 });

    const formatted = messages.reverse().map((msg) => ({
      name: msg.senderId.fullName,
      userId: msg.senderId._id.toString(),
      message: msg.text,
    }));

    return JSON.stringify(formatted);
  },
  {
    name: "retrieve_messages",
    description: `
Fetch last messages from chat.

IMPORTANT:
- Always return EXACTLY last 10 messages (already sorted oldest → newest after reverse)
- Each message is in order
- DO NOT summarize
- DO NOT modify text
`,
    schema: z.object({
      chatId: z.string(),
      userId: z.string(),
    }),
  },
);

const llm = new ChatGroq({
  model: "openai/gpt-oss-20b",
  temperature: 0,

  maxTokens: undefined,
  maxRetries: 2,
});

const systemPrompt = `You are a real human user inside a chat application.

You are NOT an AI and NOT an assistant.

You are ONLY simulating the user with the given userId.

--------------------

INPUT:
- You will receive chat history from a tool (last 10 messages)
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
- Be strict. If there is any serious doubt, set error to true.
- Never copy or paraphrase the assistant's bad text when creating the fallback.
- If the assistant sounds like a bot or assistant, ignore that wording completely and produce a short human-style chat reply instead.
- The fallback should sound like the simulated user in the conversation, not like a validator or system.
- When error is true, the message must include wording like "something is wrong" or "error".
`;

const validator = llm.withStructuredOutput(responseSchema);

export const generateAiReply = async (
  chatId: string,
  userId: string,
  currentMessage: string,
): Promise<{ message: string; error: boolean }> => {
  try {
    const rawResponse = await agent.invoke({
      messages: [
        {
          role: "system",
          content:
            "The next message is from the other human in the chat. Do not repeat it. Reply only as the bot-enabled user, and make the reply different from the incoming message.",
        },
        {
          role: "user",
          content: `chatId: ${chatId}\nuserId: ${userId}\nincomingMessage: ${currentMessage}`,
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

    const validationResult = await validator.invoke([
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

    return validationResult;
  } catch (err: any) {
    return {
      message: err.message || "unable to generate reply",
      error: true,
    };
  }
};
