import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, X, Send } from "lucide-react";
import {
  API_BASE,
  ChatbotResponse,
  ChatbotSuggestion,
  sendChatbotMessage,
  loadItems,
} from "../lib/api";

type ChatMessage = {
  id: string;
  from: "user" | "bot";
  text: string;
  suggestions?: ChatbotSuggestion[];
};

function uid() {
  return Math.random().toString(36).slice(2);
}

function intersectById<T extends { id: number }>(lists: T[][]): T[] {
  if (lists.length === 0) return [];
  if (lists.length === 1) return lists[0];

  const needed = lists.length;
  const counts = new Map<number, { item: T; hits: number }>();

  for (const list of lists) {
    for (const it of list) {
      const prev = counts.get(it.id);
      if (!prev) counts.set(it.id, { item: it, hits: 1 });
      else counts.set(it.id, { item: prev.item, hits: prev.hits + 1 });
    }
  }

  return [...counts.values()]
    .filter((x) => x.hits === needed)
    .map((x) => x.item);
}

function itemToSuggestion(item: any): ChatbotSuggestion {
  const imageUrl =
    item?.imageUrls ?? item?.imageUrl ?? item?.images?.[0]?.image_url ?? null;

  return {
    id: Number(item.id),
    title: String(item.title ?? ""),
    type: String(item.type ?? ""),
    imageUrl: imageUrl ? String(imageUrl) : null,
    descriptionSnippet: String(item.description ?? "").slice(0, 120),
    score: 1, // not used now; required by type
    link: `/items/${item.id}`,
  };
}

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const hasInitial = useMemo(() => messages.length > 0, [messages.length]);

  useEffect(() => {
    if (open && !hasInitial) {
      setMessages([
        {
          id: uid(),
          from: "bot",
          text:
            "سلام! من دستیار Lost & Found هستم 🙂\n" +
            "می‌تونی بپرسی «راهنما» یا «امکانات»، یا وسیله‌ات رو توصیف کنی تا موارد مشابه رو پیشنهاد بدم.",
        },
      ]);
    }
  }, [open, hasInitial]);

  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [open, messages, busy]);

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;

    setInput("");
    setBusy(true);

    setMessages((m) => [...m, { id: uid(), from: "user", text }]);

    try {
      const res: ChatbotResponse = await sendChatbotMessage(text);

      const keywords = Array.isArray(res.keywords) ? res.keywords : [];

      if (keywords.length === 0) {
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            from: "bot",
            text: res.reply,
            suggestions: res.suggestions ?? [],
          },
        ]);
        return;
      }

      const trimmedKeywords = keywords
        .map((k) => String(k).trim())
        .filter((k) => k.length > 0)
        .slice(0, 5);

      const lists = await Promise.all(
        trimmedKeywords.map(async (kw) => {
          const data = await loadItems({ searchText: kw });
          return data.items ?? [];
        })
      );

      const intersected = intersectById(lists);

      const suggestions: ChatbotSuggestion[] = intersected
        .slice(0, 6)
        .map(itemToSuggestion);

      setMessages((m) => [
        ...m,
        {
          id: uid(),
          from: "bot",
          text: res.reply,
          suggestions,
        },
      ]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { id: uid(), from: "bot", text: e?.message ? `خطا: ${e.message}` : "خطا در ارتباط با سرور." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-3 text-white shadow-lg hover:bg-blue-700"
        aria-label="Open chatbot"
      >
        <MessageCircle className="size-5" />
        <span className="hidden sm:inline">Chat</span>
      </button>

      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[92vw] max-w-sm overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <div>
              <div className="text-sm font-semibold text-gray-900">Lost &amp; Found Assistant</div>
              <div className="text-xs text-gray-500">Ask for help or describe your item</div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 hover:bg-gray-100"
              aria-label="Close chatbot"
            >
              <X className="size-5 text-gray-700" />
            </button>
          </div>

          <div ref={scrollRef} className="max-h-[55vh] space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((m) => (
              <div key={m.id} className={m.from === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.from === "user"
                      ? "max-w-[85%] whitespace-pre-wrap rounded-2xl bg-blue-600 px-3 py-2 text-sm text-white"
                      : "max-w-[85%] whitespace-pre-wrap rounded-2xl bg-gray-100 px-3 py-2 text-sm text-gray-900"
                  }
                >
                  {m.text}

                  {m.from === "bot" && m.suggestions && m.suggestions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {m.suggestions.map((s) => (
                        <SuggestionCard key={s.id} s={s} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {busy && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl bg-gray-100 px-3 py-2 text-sm text-gray-700">
                  در حال فکر کردن…
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 px-3 py-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="پیام خود را بنویسید… (Enter برای ارسال)"
                className="min-h-[44px] w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />

              <button
                type="button"
                onClick={send}
                disabled={busy || input.trim() === ""}
                className="inline-flex h-[44px] w-[44px] items-center justify-center rounded-xl bg-blue-600 text-white disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Send message"
              >
                <Send className="size-4" />
              </button>
            </div>

            <div className="mt-2 text-[11px] text-gray-500">
              پیشنهاد: «راهنما»، «امکانات»، یا مثلاً «کیف مشکی با کارت دانشجویی»
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SuggestionCard({ s }: { s: ChatbotSuggestion }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-2">
      <div className="flex gap-2">
        {s.imageUrl ? (
          <img
            src={`${API_BASE}${s.imageUrl}`}
            alt={s.title}
            className="h-12 w-12 rounded-lg object-cover"
          />
        ) : (
          <div className="h-12 w-12 rounded-lg bg-gray-100" />
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="truncate text-sm font-medium text-gray-900">{s.title}</div>
            <span
              className={
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold " +
                (s.type === "found" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")
              }
            >
              {s.type.toUpperCase()}
            </span>
          </div>

          <div className="mt-1 text-xs text-gray-600">{s.descriptionSnippet}</div>

          <div className="mt-2">
            <Link to={s.link} className="text-xs font-semibold text-blue-700 hover:underline">
              Open item page →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
