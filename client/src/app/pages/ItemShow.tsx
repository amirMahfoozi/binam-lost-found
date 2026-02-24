import React, { useEffect, useState } from "react";
import "../../styles/ItemShow.css";
import { deleteItem, showItem, API_BASE } from "../lib/api";
import { Link, Route, useNavigate } from "react-router-dom";
<Route path='/items/:id/edit' element={<EditItem />} />
// ✅ add these imports (make sure you added these functions/types in api.ts)
import { addComment, deleteComment, loadComments, reportComment, CommentDto } from "../lib/api";
import EditItem from "./EditItem";

function toAbsoluteUrl(url?: string) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `${API_BASE}${url.startsWith("/") ? "" : "/"}${url}`;
}

type Image = {
  imid: number;
  iid?: number;
  image_url: string;
  uploaded_at?: string;
};

type Tag = {
  tid: number;
  tagname: string;
  color?: string | null;
};

type Permissions = {
  canEdit: boolean;
  canDelete: boolean;
};

export type ItemResponse = {
  iid: number;
  uid?: number;
  type: string;
  title: string;
  description: string;
  latitude: string | number;
  longitude: string | number;
  add_date?: string;
  images: Image[];
  tags: Tag[];
  users?: {
    uid?: number;
    username?: string;
  };
  permissions: Permissions;
};

type Props = {
  id: number;
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
};

export default function ItemShow({ id, onEdit, onDelete }: Props) {
  const [item, setItem] = useState<ItemResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  // ✅ comments state
  const [comments, setComments] = useState<CommentDto[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    showItem(id, setItem, setError, setLoading);
  }, [id]);

  const handleDelete = () => deleteItem(id, setItem, setError, setDeleting, onDelete);

  function normalizeType(t: string) {
    const s = (t || "").toLowerCase();
    if (s === "lost") return "LOST";
    if (s === "found") return "FOUND";
    return t;
  }

  async function refreshComments() {
    setCommentsLoading(true);
    setCommentsError(null);
    try {
      const list = await loadComments(id);
      setComments(Array.isArray(list) ? list : []);
    } catch (e: any) {
      setCommentsError(e?.message || "Failed to load comments");
    } finally {
      setCommentsLoading(false);
    }
  }

  useEffect(() => {
    refreshComments();
  }, [id]);

  async function onAddComment() {
    const body = newComment.trim();
    if (!body) return;

    setPosting(true);
    setCommentsError(null);
    try {
      await addComment(id, body);
      setNewComment("");
      await refreshComments();
    } catch (e: any) {
      setCommentsError(e?.message || "Failed to add comment");
    } finally {
      setPosting(false);
    }
  }

  async function onReport(cid: number) {
    if (!confirm("Report this comment?")) return;
    setCommentsError(null);
    try {
      await reportComment(cid);
      await refreshComments(); // backend hides when report_count >= 5
    } catch (e: any) {
      setCommentsError(e?.message || "Failed to report comment");
    }
  }

  async function onDeleteComment(cid: number) {
    if (!confirm("Delete this comment?")) return;
    setCommentsError(null);
    try {
      await deleteComment(cid);
      await refreshComments();
    } catch (e: any) {
      setCommentsError(e?.message || "Failed to delete comment");
    }
  }

  return (
    <div>
      {loading && <div className="loading">Loading item…</div>}
      {error && <div className="error">Error: {error}</div>}
      {!loading && !item && <div className="notFound">Item not found</div>}

      {item && (
        <div className="container">
          <h2 className="title">{item.title}</h2>

          <div className="row">
            <div className="imageCol">
              {item.images && item.images.length > 0 ? (
                <>
                  <img
                    src={toAbsoluteUrl(item.images[0].image_url)}
                    alt={item.title}
                    className="image"
                    onClick={() => setShowFullImage((s) => !s)}
                  />
                  {showFullImage && (
                    <div className="lightbox" onClick={() => setShowFullImage(false)}>
                      <img
                        src={toAbsoluteUrl(item.images[0].image_url)}
                        alt={item.title}
                        className="lightboxImage"
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="noImage">No image</div>
              )}
            </div>

            <div className="infoCol">
              <p>
                <strong>Type:</strong> {normalizeType(item.type)}
              </p>
              <p>
                <strong>Reported:</strong>{" "}
                {item.add_date ? new Date(item.add_date).toLocaleString() : "—"}
              </p>
              <p>
                <strong>Reporter:</strong> {item.users?.username ?? "unknown"}
              </p>
              <p>
                <strong>Location:</strong> {item.latitude}, {item.longitude}
              </p>

              <div className="tags">
                <strong>Tags:</strong>{" "}
                <span>{item.tags?.length ? item.tags.map((t) => t.tagname).join(", ") : "—"}</span>
              </div>
            </div>
          </div>

          <div className="description">
            <strong>Description:</strong>
            <p className="descriptionText">{item.description}</p>
          </div>

          {/* ✅ COMMENTS SECTION */}
          <div className="description" style={{ marginTop: 16 }}>
            <strong>Comments:</strong>

            {/* add comment */}
            <div style={{ marginTop: 10 }}>
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment…"
                rows={3}
                className="textarea"
                style={{ width: "100%", resize: "vertical" }}
              />
              <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                <button
                  className="button"
                  onClick={onAddComment}
                  disabled={posting || newComment.trim() === ""}
                >
                  {posting ? "Posting…" : "Post"}
                </button>

                <button className="button" onClick={refreshComments} disabled={commentsLoading}>
                  {commentsLoading ? "Refreshing…" : "Refresh"}
                </button>

                <span style={{ fontSize: 12, color: "#666" }}>
                  Comments with 5 reports are hidden automatically.
                </span>
              </div>

              {commentsError && <div className="errorInline">Error: {commentsError}</div>}
            </div>

            {/* list comments */}
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              {commentsLoading ? (
                <div className="loading">Loading comments…</div>
              ) : comments.length === 0 ? (
                <div style={{ fontSize: 14, color: "#666" }}>No comments yet.</div>
              ) : (
                comments.map((c) => (
                  <div
                    key={c.cid}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: 12,
                      background: "white",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                          {c.user?.username ?? "Unknown"}
                        </div>
                        <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
                          {c.date_added ? new Date(c.date_added).toLocaleString() : ""}
                          {typeof c.report_count === "number" ? ` • Reports: ${c.report_count}` : ""}
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <button
                          type="button"
                          onClick={() => onReport(c.cid)}
                          className="button"
                          style={{ padding: "6px 10px", background: "#f59e0b" }}
                        >
                          Report
                        </button>

                        {c.permissions?.canDelete ? (
                          <button
                            type="button"
                            onClick={() => onDeleteComment(c.cid)}
                            className="button deleteButton"
                            style={{ padding: "6px 10px" }}
                          >
                            Delete
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div style={{ marginTop: 8, fontSize: 14, whiteSpace: "pre-wrap" }}>
                      {c.comment_text}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="actions">
            <Link to="/items">
              <button className="button">Back</button>
            </Link>

            {item.permissions.canEdit && (
              <button className='button' onClick={() => navigate(`/items/${item.iid}/edit`)}>
                Edit
              </button>
            )}

            {item.permissions.canDelete && (
              <button className="button deleteButton" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting…" : "Delete"}
              </button>
            )}
          </div>

          {error && <div className="errorInline">Error: {error}</div>}
        </div>
      )}
    </div>
  );
}