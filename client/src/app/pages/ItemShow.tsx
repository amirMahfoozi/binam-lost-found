import React, { useEffect, useState } from "react";
import "../../styles/ItemShow.css";
import { deleteItem, showItem } from "../lib/api";
import { TAG_OPTIONS } from "./AddItem";
import { Link } from "react-router-dom";

type Image = {
  imid: number;
  iid?: number;
  image_url: string;
  uploaded_at?: string;
};

type Tag = {
  tid: number;
  name: string;
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
  const [deleting, setDeleting] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);

  useEffect(()=>{showItem(id, setItem, setError, setLoading);}, []);

  const handleDelete = () => deleteItem(id, setItem, setError, setDeleting, onDelete);

  return (
    <div>
    {loading && <div className="loading">Loading item…</div>}
    {error && <div className="error">Error: {error}</div>}
    {!item && <div className="notFound">Item not found</div>}

    {item &&
    <div className="container">
      <h2 className="title">{item.title}</h2>

      <div className="row">
        <div className="imageCol">
          {item.images && item.images.length > 0 ? (
            <>
              <img
                src={item.images[0].image_url}
                alt={item.title}
                className="image"
                onClick={() => setShowFullImage((s) => !s)}
              />
              {showFullImage && (
                <div className="lightbox" onClick={() => setShowFullImage(false)}>
                  <img src={item.images[0].image_url} alt={item.title} className="lightboxImage" />
                </div>
              )}
            </>
          ) : (
            <div className="noImage">No image</div>
          )}
        </div>

        <div className="infoCol">
          <p>
            <strong>Type:</strong> {item.type}
          </p>
          <p>
            <strong>Reported:</strong> {item.add_date ? new Date(item.add_date).toLocaleString() : "—"}
          </p>
          <p>
            <strong>Reporter:</strong> {item.users?.username ?? "unknown"}
          </p>
          <p>
            <strong>Location:</strong> {item.latitude}, {item.longitude}
          </p>

          <div className="tags">
            <strong>Tags:</strong>{" "}
            {/* {item.tags && item.tags.length > 0 ? (
              item.tags.map((t) => (
                <span
                  key={t.tid}
                  className={allowedTags.includes((t as any).name) ? "tag" : "tagUnknown"}
                >
                  {(t as any).name}
                </span>
              ))
            ) : (
              <span>—</span>
            )} */}
            <span>{item.tags && item.tags.length > 0 ? (
              item.tags.map(tag => TAG_OPTIONS[tag.tid]).join(", ")) : "-"}</span>
          </div>
        </div>
      </div>

      <div className="description">
        <strong>Description:</strong>
        <p className="descriptionText">{item.description}</p>
      </div>

      <div className="actions">
        <Link to="/items">
          <button className="button" aria-label="Edit item">Back</button>
        </Link>

        {item.permissions.canEdit && (
          <button
            className="button"
            onClick={() => (onEdit ? onEdit(item.iid) : alert("Edit action not implemented"))}
            aria-label="Edit item"
          >
            Edit
          </button>
        )}

        {item.permissions.canDelete && (
          <button
            className={`button deleteButton`}
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
      </div>

      {error && <div className="errorInline">Error: {error}</div>}
    </div>}
    </div>
  );
}
