import React, { useEffect, useState } from "react";
import "../../styles/ItemsList.css";

type Item = {
  id: string;
  title: string;
  description: string;
  type: "LOST" | "FOUND";
  latitude: number;
  longitude: number;
  tagIds: string[];
  imageUrls: string[]; // relative urls
  createdAt?: string;
};

// const PAGE_SIZE_DEFAULT = 8;
const PAGE_SIZE = 4;

const MOCK_ITEMS = [
    {
      id: "1",
      title: "Black Wallet",
      description: "Leather wallet with several cards inside.",
      type: "LOST" as const,
      latitude: 37.7749,
      longitude: -122.4194,
      tagIds: ["wallet"],
      imageUrls: ["/mock-images/wallet.jpg"],
      createdAt: new Date().toISOString(),
    },
    {
      id: "2",
      title: "iPhone 13",
      description: "Blue case, cracked screen.",
      type: "FOUND" as const,
      latitude: 40.7128,
      longitude: -74.006,
      tagIds: ["phone"],
      imageUrls: ["/mock-images/phone.jpg"],
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
    {
      id: "3",
      title: "Keyring with red tag",
      description: "",
      type: "LOST" as const,
      latitude: 51.5074,
      longitude: -0.1278,
      tagIds: ["keys"],
      imageUrls: [],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    },
    {
      id: "4",
      title: "Black Backpack",
      description: "Contains a laptop sleeve.",
      type: "FOUND" as const,
      latitude: 48.8566,
      longitude: 2.3522,
      tagIds: ["bag"],
      imageUrls: ["/mock-images/bag.jpg"],
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: "5",
      title: "Grey Hoodie",
      description: "Medium size, no brand label.",
      type: "LOST" as const,
      latitude: 34.0522,
      longitude: -118.2437,
      tagIds: ["clothes"],
      imageUrls: ["/mock-images/hoodie.jpg"],
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    },
    {
        id: "6",
        title: "Grey Hoodie",
        description: "Medium size, no brand label.",
        type: "LOST" as const,
        latitude: 34.0522,
        longitude: -118.2437,
        tagIds: ["clothes"],
        imageUrls: ["/mock-images/hoodie.jpg"],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      },
      {
        id: "7",
        title: "Grey Hoodie",
        description: "Medium size, no brand label.",
        type: "LOST" as const,
        latitude: 34.0522,
        longitude: -118.2437,
        tagIds: ["clothes"],
        imageUrls: ["/mock-images/hoodie.jpg"],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      },
      {
        id: "8",
        title: "Grey Hoodie",
        description: "Medium size, no brand label.",
        type: "LOST" as const,
        latitude: 34.0522,
        longitude: -118.2437,
        tagIds: ["clothes"],
        imageUrls: ["/mock-images/hoodie.jpg"],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      },
      {
        id: "9",
        title: "Grey Hoodie",
        description: "Medium size, no brand label.",
        type: "LOST" as const,
        latitude: 34.0522,
        longitude: -118.2437,
        tagIds: ["clothes"],
        imageUrls: ["/mock-images/hoodie.jpg"],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      },
      {
        id: "10",
        title: "Grey Hoodie",
        description: "Medium size, no brand label.",
        type: "LOST" as const,
        latitude: 34.0522,
        longitude: -118.2437,
        tagIds: ["clothes"],
        imageUrls: ["/mock-images/hoodie.jpg"],
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      },
  ];

function formatLatLon(n: number) {
  return Number.isFinite(n) ? n.toFixed(5) : "";
}

export default function ItemsList() {
  const [count, setCount] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPages = count ? Math.max(1, Math.ceil(count / PAGE_SIZE)) : 1;

  useEffect(() => {
    // load count once
    async function loadCount() {
      try {
        const res = await fetch(`/items/count`);
        if (!res.ok) throw new Error(await res.text() || "Failed to load count");
        const data = await res.json();
        // assume server returns { count: number } or a number directly; handle both
        const c = typeof data === "number" ? data : data.count ?? null;
        setCount(c);
      } catch (err: any) {
        setError(err.message || "Error loading item count");
      }
    }

    // loadCount();
    setCount(MOCK_ITEMS.length);
  }, []);

  useEffect(() => {
    async function loadPage(p: number) {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/items?page=${p}&limit=${PAGE_SIZE}`);
        if (!res.ok) throw new Error(await res.text() || "Failed to load items");
        const data = await res.json();
        // expect data: { items: Item[] } or Item[]
        const list: Item[] = Array.isArray(data) ? data : data.items ?? [];
        setItems(list);
      } catch (err: any) {
        setError(err.message || "Error loading items");
        setItems([]);
      } finally {
        setLoading(false);
      }
    }

    async function loadPage2(p: number) {
        setLoading(true);
        setError(null);
        setItems(MOCK_ITEMS.slice((p-1)*PAGE_SIZE, p*PAGE_SIZE));
        setLoading(false);
      }

    // loadPage(page);
    loadPage2(page);
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
                  <span className="meta-tags">{item.tagIds.join(", ")}</span>
                  <span className="meta-loc">
                    {formatLatLon(item.latitude)}, {formatLatLon(item.longitude)}
                  </span>
                </div>
                <div className="item-footer">
                  <small>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</small>
                </div>
              </div>
            </div>
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
    </div>
  );
}
