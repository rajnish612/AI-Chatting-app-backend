import asyncHandler from "express-async-handler";
export const getChats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
});
