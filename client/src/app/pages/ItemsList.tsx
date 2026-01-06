import React, { useEffect, useState } from "react";
import "../../styles/ItemsList.css";
import { loadCount, loadPage} from "../lib/api";
import { TAG_OPTIONS } from "./AddItem";
import { Button } from "../components/ui/button";
import { Link } from "react-router-dom";

export type Item = {
  id: number;
  title: string;
  description: string;
  type: "LOST" | "FOUND";
  tagIds: string[];
  imageUrls: string[];
  createdAt?: string;
};

const PAGE_SIZE = 6;

// export default function ItemsList({changeView}: {changeView: (string) => void}) {
export default function ItemsList() {
  const [count, setCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = count ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : 1;

  useEffect(() => {
    loadCount(setCount, setError);
  }, []);

  useEffect(() => {
    loadPage(page, PAGE_SIZE, setLoading, setError, setItems);
  }, [page]);

  function goto(p: number) {
    if (p < 1) p = 1;
    if (count) p = Math.min(p, totalPages);
    setPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
          {items.map(item => (
            <Link to={"/items/" + item.id} key={item.id}>
            <div key={item.id} className={`item-card ${item.type === "FOUND" ? "found" : "lost"}`}>
              <div className="item-image">
                {item.imageUrls && item.imageUrls.length > 0 ? (
                  <img src={item.imageUrls[0]} alt={item.title} />
                ) : (
                  <div className="placeholder">No image</div>
                )}
              </div>
              <div className="item-body">
                <div className="item-row">
                  <h3 className="item-title">{item.title}</h3>
                  <span className="item-type">{item.type}</span>
                </div>
                <div className="item-desc">{item.description || "—"}</div>
                <div className="item-meta">
                  <span className="meta-tags">{item.tagIds.map(s => TAG_OPTIONS[s]).join(", ")}</span>
                </div>
                <div className="item-footer">
                  <small>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</small>
                </div>
              </div>
            </div>
            </Link>
          ))}
        </div>
      )}

      <div className="pagination">
        <button onClick={() => goto(1)} disabled={page === 1}>First</button>
        <button onClick={() => goto(page - 1)} disabled={page === 1}>Prev</button>
        <span className="page-numbers">Page {page} of {totalPages}</span>
        <button onClick={() => goto(page + 1)} disabled={count !== null && page >= totalPages}>Next</button>
        <button onClick={() => goto(totalPages)} disabled={count !== null && page >= totalPages}>Last</button>
      </div>
      {/* <Button onClick={()=>changeView("dashboard")}>Back</Button> */}
      {/* <Button onClick={()=>window.location.href = "/dashboard"}>Back</Button> */}
      <Link to="/dashboard"><Button >Back</Button></Link>
    </div>
  );
}
