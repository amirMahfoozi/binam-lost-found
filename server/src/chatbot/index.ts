// server/src/chatbot/index.ts
import { classifyIntent } from "./classifier";
import { INTENTS, IntentName } from "./intents";
import { searchItemsFromMessage } from "./search";

export type ChatbotResponse = {
  intent: IntentName;
  reply: string;
  keywords?: string[];
  suggestions?: Array<{
    id: number;
    title: string;
    type: string;
    imageUrl: string | null;
    descriptionSnippet: string;
    score: number;
    link: string;
  }>;
};

export async function handleChatMessage(message: string): Promise<ChatbotResponse> {
  const intent = classifyIntent(message);

  if (intent === "search_items") {
    const { keywords, results } = await searchItemsFromMessage(message, 6);

    if (results.length === 0) {
      return {
        intent,
        keywords,
        reply:
          "چیزی شبیه توضیحت پیدا نکردم 😕\n" +
          "می‌تونی کلمات دقیق‌تر بگی، یا از لیست/نقشه جستجو کنی، یا یک پست جدید ثبت کنی.",
        suggestions: [],
      };
    }

    return {
      intent,
      keywords,
      reply: "این موارد ممکنه مرتبط باشن (برای دیدن جزئیات روی هر مورد کلیک کن):",
      suggestions: results.map((r) => ({
        ...r,
        link: `/items/${r.id}`,
      })),
    };
  }

  const def =
    INTENTS.find((i) => i.name === intent) ??
    INTENTS.find((i) => i.name === "fallback")!;

  return { intent, reply: def.response };
}
