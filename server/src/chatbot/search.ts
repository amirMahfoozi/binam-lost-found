// server/src/chatbot/search.ts
import { prisma } from "../db";
import { extractKeywords, normalizeText } from "./nlp";

export type ChatSuggestion = {
  id: number;
  title: string;
  type: string;
  imageUrl: string | null;
  descriptionSnippet: string;
  score: number;
};

function guessDesiredType(message: string): "lost" | "found" | undefined {
  const m = normalizeText(message);

  // if user says they LOST something, show FOUND results first
  if (
    m.includes("lost") ||
    m.includes("missing") ||
    m.includes("گم") ||
    m.includes("گمشده") ||
    m.includes("جا گذاشتم")
  ) {
    return "found";
  }

  // if user says they FOUND something, show LOST results first
  if (m.includes("found") || m.includes("پیدا کردم") || m.includes("پیدا شد") || m.includes("پیداش کردم")) {
    return "lost";
  }

  return undefined;
}

function makeSnippet(text: string, maxLen = 140): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen - 1) + "…";
}

export async function searchItemsFromMessage(message: string, maxResults = 5) {
  const keywords = extractKeywords(message, 8);
  const desiredType = guessDesiredType(message);

  if (keywords.length === 0) {
    return { keywords, desiredType, results: [] as ChatSuggestion[] };
  }

  // Map keywords -> tags (optional signal)
  const tagMatches = await prisma.tags.findMany({
    where: {
      OR: keywords.map((k) => ({ tagname: { contains: k, mode: "insensitive" } })),
    },
    select: { tid: true, tagname: true },
    take: 10,
  });

  const tagIds = tagMatches.map((t) => t.tid);

  // Candidate set then score in memory
  const candidates = await prisma.items.findMany({
    where: {
      ...(desiredType ? { type: desiredType } : {}),
      OR: [
        ...keywords.flatMap((k) => [
          { title: { contains: k, mode: "insensitive" } },
          { description: { contains: k, mode: "insensitive" } },
        ]),
        ...(tagIds.length > 0 ? [{ item_tags: { some: { tid: { in: tagIds } } } }] : []),
      ],
    },
    orderBy: { add_date: "desc" },
    take: 50,
    select: {
      iid: true,
      title: true,
      description: true,
      type: true,
      images: {
        orderBy: { uploaded_at: "asc" },
        take: 1,
        select: { image_url: true },
      },
      item_tags: {
        select: { tags: { select: { tagname: true } } },
      },
    },
  });

  const kwSet = keywords.map((k) => normalizeText(k));

  const scored: ChatSuggestion[] = candidates.map((c) => {
    const title = normalizeText(c.title);
    const desc = normalizeText(c.description);
    const tags = c.item_tags.map((t) => normalizeText(t.tags.tagname));

    let score = 0;
    for (const k of kwSet) {
      if (!k) continue;
      if (title.includes(k)) score += 2;
      if (desc.includes(k)) score += 1;
      if (tags.some((tg) => tg.includes(k))) score += 1;
    }

    return {
      id: c.iid,
      title: c.title,
      type: c.type,
      imageUrl: c.images[0]?.image_url ?? null,
      descriptionSnippet: makeSnippet(c.description),
      score,
    };
  });

  scored.sort((a, b) => (b.score - a.score) || (b.id - a.id));

  return {
    keywords,
    desiredType,
    results: scored.slice(0, maxResults),
  };
}
