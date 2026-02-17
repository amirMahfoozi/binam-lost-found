// server/src/chatbot/classifier.ts
import { INTENTS, IntentName } from "./intents";
import { extractKeywords, normalizeText, tokenize, tokenOverlapScore } from "./nlp";

type TrainedExample = {
  intent: IntentName;
  tokens: string[];
};

const trained: TrainedExample[] = [];

// 'Training' step: pre-tokenize examples once at startup.
for (const intent of INTENTS) {
  for (const ex of intent.examples) {
    const tokens = tokenize(ex);
    trained.push({ intent: intent.name, tokens });
  }
}

// words/phrases that strongly indicate the user is describing an item
const LOST_FOUND_HINTS = [
  "lost","missing","i lost","i have lost","left my","where is",
  "found","i found",
  "گم","گمشده","گم کردم","جا گذاشتم","پیدا کردم","پیدا شد","پیداش کردم",
];

const ITEM_WORDS = [
  "wallet","card","phone","laptop","keys","key","bag","backpack","charger","earbuds","airpods",
  "id","student card","bank card","watch","bottle","umbrella",
  "کیف","کوله","گوشی","لپتاپ","کلید","کارت","شارژر","هندزفری","ایرپاد","ساعت","بطری","چتر",
  "کارت دانشجویی","کارت بانکی","عینک",
];

// words/phrases that strongly indicate the user is asking about app usage, not searching items
const FEATURE_HINTS = [
  "help","راهنما","امکانات","feature","features","نقشه","map","ثبت","add item","post","چطور","چگونه",
];

export function shouldSearchItems(message: string): boolean {
  const m = normalizeText(message);
  if (m.length < 6) return false;

  if (FEATURE_HINTS.some((h) => m.includes(h))) return false;
  if (LOST_FOUND_HINTS.some((h) => m.includes(h))) return true;
  if (ITEM_WORDS.some((h) => m.includes(normalizeText(h)))) return true;

  // fallback heuristic
  const kws = extractKeywords(message, 8);
  return kws.length >= 3;
}

export function classifyIntent(message: string): IntentName {
  if (shouldSearchItems(message)) return "search_items";

  const msgTokens = tokenize(message);
  if (msgTokens.length === 0) return "fallback";

  let bestIntent: IntentName = "fallback";
  let bestScore = 0;

  for (const ex of trained) {
    const score = tokenOverlapScore(msgTokens, ex.tokens);
    if (score > bestScore) {
      bestScore = score;
      bestIntent = ex.intent;
    }
  }

  return bestScore >= 0.2 ? bestIntent : "fallback";
}
