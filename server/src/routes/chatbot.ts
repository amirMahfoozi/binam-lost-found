// server/src/routes/chatbot.ts
import { Router } from "express";
import { handleChatMessage } from "../chatbot";
import { searchItemsFromMessage } from "../chatbot/search";

const router = Router();

/**
 * POST /chatbot/message
 * Body: { message: string }
 * Response: { reply, intent, keywords?, suggestions? }
 */
router.post("/message", async (req, res, next) => {
  try {
    const { message } = req.body as { message?: string };

    if (!message || typeof message !== "string" || message.trim() === "") {
      return res.status(400).json({ error: "message is required" });
    }

    const result = await handleChatMessage(message);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /chatbot/search
 * Body: { message: string }
 * Dedicated search API for the chatbot (Sprint subtask).
 */
router.post("/search", async (req, res, next) => {
  try {
    const { message } = req.body as { message?: string };

    if (!message || typeof message !== "string" || message.trim() === "") {
      return res.status(400).json({ error: "message is required" });
    }

    const { keywords, results } = await searchItemsFromMessage(message, 6);

    return res.status(200).json({
      intent: "search_items",
      keywords,
      reply:
        results.length === 0
          ? "مورد مرتبطی پیدا نشد. اگر ممکنه توضیح دقیق‌تری بده یا از نقشه/لیست جستجو کن."
          : "این موارد ممکنه مرتبط باشن:",
      suggestions: results.map((r) => ({
        ...r,
        link: `/items/${r.id}`,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
