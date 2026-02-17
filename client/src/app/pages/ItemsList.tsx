import React, { useEffect, useState } from "react";
import "../../styles/ItemsList.css";
import { loadCount, loadPage, loadTags, TagDto, API_BASE } from "../lib/api";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";

export type Item = {
  id: number;
  title: string;
  description: string;
  type: string; // backend sends "lost" | "found"
  tagIds: number[];
  imageUrls: string | null; // backend returns a single url (despite the name)
  createdAt?: string;
};

function toAbsoluteUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

const PAGE_SIZE = 6;

export default function ItemsList() {
  const [count, setCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [tagById, setTagById] = useState<Record<number, TagDto>>({});

  const totalPages = count ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : 1;

  useEffect(() => {
    loadCount(setCount, setError);
  }, []);

  useEffect(() => {
    loadPage(page, PAGE_SIZE, setLoading, setError, setItems);
  }, [page]);

  useEffect(() => {
    loadTags()
      .then((tags) => {
        const map: Record<number, TagDto> = {};
        tags.forEach((t) => (map[t.tid] = t));
        setTagById(map);
      })
      .catch(() => {});
  }, []);

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

  return (
    <div className="items-root">
      <div className="items-header">
        <h2 className="form-title">Items</h2>
        <div className="page-info">
          {count !== null ? `${count} items — page ${page} / ${totalPages}` : "Loading count..."}
        </div>
      </div>

      {error && <div className="message">{error}</div>}

      {loading ? (
        <div className="message">Loading items...</div>
      ) : (
        <div className="items-grid">
          {items.map((item) => {
            const imgSrc = toAbsoluteUrl(item.imageUrls);
            const typeLabel = normalizeType(item.type);

            return (
              <Link to={"/items/" + item.id} key={item.id}>
                <div className={`item-card ${typeLabel === "FOUND" ? "found" : "lost"}`}>
                  <div className="item-image">
                    {imgSrc ? <img src={imgSrc} alt={item.title} /> : <div className="placeholder">No image</div>}
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
