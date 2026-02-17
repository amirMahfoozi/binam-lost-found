// server/src/chatbot/nlp.ts
// Very small, dependency-free NLP helpers for intent detection + keyword extraction.
// This is NOT a full ML model; it is a lightweight heuristic layer suitable for this project.

const EN_STOPWORDS = new Set([
  "a","an","and","are","as","at","be","but","by","can","cant","could","did","do","does","doing",
  "for","from","had","has","have","having","how","i","im","in","into","is","it","its","me","my",
  "of","on","or","our","ours","please","pls","the","their","them","then","there","they","this","to",
  "was","we","were","what","where","when","who","why","with","you","your","yours"
]);

const FA_STOPWORDS = new Set([
  "و","یا","اما","که","این","اون","آن","هم","همه","یک","یه","را","رو","به","در","از","برای","با",
  "من","تو","شما","ما","او","ایشان","هست","هستم","هستی","هستید","هستیم","بود","بودم","بودیم",
  "کردم","کرد","کردی","کردید","کردیم","می","میشه","میتونم","میتونید","چطور","چگونه","کجا","چی",
  "لطفا","لطفاً","خواهش","خواهشاً"
]);

// normalize punctuation (includes Persian/Arabic punctuation)
const PUNCT_RE =
  /[\u200c\u200f\u202a-\u202e\u060c\u061b\u061f!"#$%&'()*+,\-.\/:;<=>?@[\]\\^_`{|}~]/g;

export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(PUNCT_RE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(input: string): string[] {
  const norm = normalizeText(input);
  if (!norm) return [];
  return norm.split(" ").map(s => s.trim()).filter(Boolean);
}

export function extractKeywords(input: string, maxKeywords = 6): string[] {
  const tokens = tokenize(input);

  const out: string[] = [];
  const seen = new Set<string>();

  for (const t of tokens) {
    if (t.length < 2) continue;
    if (EN_STOPWORDS.has(t) || FA_STOPWORDS.has(t)) continue;
    if (/^\d+$/.test(t)) continue; // drop pure numbers
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= maxKeywords) break;
  }

  return out;
}

// crude similarity: overlap of tokens (Jaccard-like)
export function tokenOverlapScore(aTokens: string[], bTokens: string[]): number {
  if (aTokens.length === 0 || bTokens.length === 0) return 0;
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}
