import React, { useEffect, useMemo, useState, useRef } from "react";
import "../../styles/ItemsList.css";
import {
  loadCountWithFilters,
  loadItems,
  loadTags,
  TagDto,
  API_BASE,
  loadCommentsCount,
} from "../lib/api";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";

export type Item = {
  id: number;
  title: string;
  description: string;
  type: string; // backend sends "lost" | "found"
  tagIds: number[];
  imageUrls: string | null;
  createdAt?: string;
};

function toAbsoluteUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

const PAGE_SIZE = 6;
const DEBOUNCE_MS = 300;

export default function ItemsList() {
  const [count, setCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [tagById, setTagById] = useState<Record<number, TagDto>>({});
  const [allTags, setAllTags] = useState<TagDto[]>([]);

  const [commentCountByItemId, setCommentCountByItemId] = useState<Record<number, number>>({});

  // Filters
  const [searchText, setSearchText] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [tagMode, setTagMode] = useState<"any" | "all">("any");

  const totalPages = count ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : 1;

  // debounce search
  const debounceTimer = useRef<number | null>(null);
  useEffect(() => {
    if (debounceTimer.current) {
      window.clearTimeout(debounceTimer.current);
    }
    // @ts-ignore
    debounceTimer.current = window.setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) window.clearTimeout(debounceTimer.current);
    };
  }, [searchText]);

  // load tags once
  useEffect(() => {
    loadTags()
      .then((tags) => {
        const map: Record<number, TagDto> = {};
        tags.forEach((t) => (map[t.tid] = t));
        setTagById(map);
        setAllTags(tags);
      })
      .catch(() => {});
  }, []);

  // helper to build params
  const buildParams = (p: number) => {
    return {
      page: p,
      limit: PAGE_SIZE,
      searchText: debouncedSearch || undefined,
      tagIds: selectedTagIds.length ? selectedTagIds.join(",") : undefined,
      tagMode: selectedTagIds.length ? tagMode : undefined,
    } as Record<string, string | number | undefined>;
  };

  // load count when filters change
  useEffect(() => {
    setError(null);
    const params = {
      searchText: debouncedSearch || undefined,
      tagIds: selectedTagIds.length ? selectedTagIds.join(",") : undefined,
      tagMode: selectedTagIds.length ? tagMode : undefined,
    };
    loadCountWithFilters(params)
      .then((n) => setCount(Number.isFinite(n) ? n : 0))
      .catch((e: any) => setError(e?.message || "Failed to load count"));
  }, [debouncedSearch, selectedTagIds, tagMode]);

  // load page items whenever page or filters change
  useEffect(() => {
    setLoading(true);
    setError(null);
    const params = buildParams(page);
    loadItems(params)
      .then((res) => {
        setItems(Array.isArray(res.items) ? (res.items as any) : []);
      })
      .catch((e: any) => setError(e?.message || "Failed to load items"))
      .finally(() => setLoading(false));
  }, [page, debouncedSearch, selectedTagIds, tagMode]);

  // reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedTagIds, tagMode]);

  // load comment counts for visible page items
  useEffect(() => {
    if (!items.length) {
      setCommentCountByItemId({});
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const results = await Promise.all(
          items.map(async (it) => {
            try {
              const n = await loadCommentsCount(it.id);
              return [it.id, n] as const;
            } catch {
              return [it.id, 0] as const;
            }
          })
        );

        if (cancelled) return;

        const map: Record<number, number> = {};
        results.forEach(([id, n]) => (map[id] = n));
        setCommentCountByItemId(map);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items]);

  function goto(p: number) {
    if (p < 1) p = 1;
    if (count) p = Math.min(p, totalPages);
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function normalizeType(t: string) {
    const s = (t || "").toLowerCase();
    if (s === "lost") return "LOST";
    if (s === "found") return "FOUND";
    return t;
  }

  function toggleTag(tid: number) {
    setSelectedTagIds((prev) => (prev.includes(tid) ? prev.filter((x) => x !== tid) : [...prev, tid]));
  }

  return (
    <div className="items-root">
      <div className="items-header">
        <h2 className="form-title">Items</h2>
        <div className="page-info">
          {count !== null ? `${count} items — page ${page} / ${totalPages}` : "Loading count..."}
        </div>
      </div>

      {error && <div className="message">{error}</div>}

      {/* Filters */}
      <div className="filters-panel">
        <div className="filter-row">
          <input
            type="text"
            placeholder="Search title or description..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-row tags-row">
          <div className="tags-label"><strong>Tags:</strong></div>
          <div className="tags-list">
            {allTags.map((t) => {
              const active = selectedTagIds.includes(t.tid);
              return (
                <button
                  key={t.tid}
                  type="button"
                  className={`tag-pill ${active ? "active" : ""}`}
                  onClick={() => toggleTag(t.tid)}
                  title={t.tagname}
                  style={{ borderColor: t.color || undefined }}
                >
                  {t.tagname}
                </button>
              );
            })}
            {allTags.length === 0 && <div>No tags</div>}
          </div>

          <div className="tag-mode">
            <label>
              <input
                type="radio"
                checked={tagMode === "any"}
                onChange={() => setTagMode("any")}
              />{" "}
              Any
            </label>
            <label style={{ marginLeft: 8 }}>
              <input
                type="radio"
                checked={tagMode === "all"}
                onChange={() => setTagMode("all")}
              />{" "}
              All
            </label>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="message">Loading items...</div>
      ) : items.length === 0 ? (
        <div className="message">No items found</div>
      ) : (
        <div className="items-grid">
          {items.map((item) => {
            const imgSrc = toAbsoluteUrl(item.imageUrls);
            const typeLabel = normalizeType(item.type);
            const commentCount = commentCountByItemId[item.id] ?? 0;

            return (
              <Link to={"/items/" + item.id} key={item.id} style={{ textDecoration: "none" }}>
                <div className={`item-card ${typeLabel === "FOUND" ? "found" : "lost"}`}>
                  <div className="item-image">
                    {imgSrc ? <img src={imgSrc} alt={item.title} /> : <div className="placeholder">No image</div>}

                    <div
                      style={{
                        position: "absolute",
                        right: 10,
                        bottom: 10,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        background: "rgba(255,255,255,0.9)",
                        borderRadius: 9999,
                        padding: "6px 10px",
                        boxShadow: "0 6px 18px rgba(0,0,0,0.15)",
                        fontSize: 12,
                        fontWeight: 700,
                      }}
                      title={`${commentCount} comments`}
                    >
                      <MessageCircle size={16} />
                      <span>{commentCount}</span>
                    </div>
                  </div>

                  <div className="item-body">
                    <div className="item-row">
                      <h3 className="item-title">{item.title}</h3>
                      <span className="item-type">{typeLabel}</span>
                    </div>

                    <div className="item-desc">{item.description || "—"}</div>

                    <div className="item-meta">
                      <span className="meta-tags">
                        {item.tagIds.map((id) => tagById[id]?.tagname ?? `#${id}`).join(", ")}
                      </span>
                    </div>

                    <div className="item-footer">
                      <small>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</small>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="pagination">
        <button onClick={() => goto(1)} disabled={page === 1}>First</button>
        <button onClick={() => goto(page - 1)} disabled={page === 1}>Prev</button>
        <span className="page-numbers">Page {page} of {totalPages}</span>
        <button onClick={() => goto(page + 1)} disabled={count !== null && page >= totalPages}>Next</button>
        <button onClick={() => goto(totalPages)} disabled={count !== null && page >= totalPages}>Last</button>
      </div>

      <Link to="/dashboard">
        <Button>Back</Button>
      </Link>
    </div>
  );
}
