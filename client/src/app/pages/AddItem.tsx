import React, { useEffect, useState } from "react";
import "../../styles/AddItem.css";

import { loadTags, submitItem, uploadImage, TagDto } from "../lib/api";
import { Link, useLocation } from "react-router-dom";

export type ItemPayload = {
  title: string;
  description: string;
  type: "LOST" | "FOUND";
  latitude: number;
  longitude: number;
  tagIds: number[];
  imageUrls: string[];
};

const TYPE_OPTIONS: Array<ItemPayload["type"]> = ["LOST", "FOUND"];

export default function AddItem() {
  const location = useLocation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ItemPayload["type"]>("LOST");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");

  const [tags, setTags] = useState<TagDto[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [tagsError, setTagsError] = useState<string | null>(null);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const lat = params.get("lat");
    const lng = params.get("lng");
    const t = params.get("type");

    if (lat) setLatitude(lat);
    if (lng) setLongitude(lng);

    if (t) {
      const tt = t.toLowerCase();
      if (tt === "lost") setType("LOST");
      if (tt === "found") setType("FOUND");
      if (t === "LOST") setType("LOST");
      if (t === "FOUND") setType("FOUND");
    }
  }, [location.search]);

  useEffect(() => {
    setTagsLoading(true);
    setTagsError(null);

    loadTags()
      .then((t) => setTags(t))
      .catch((e: any) => setTagsError(e?.message || "Failed to load tags"))
      .finally(() => setTagsLoading(false));
  }, []);

  function toggleTag(tid: number) {
    setSelectedTagIds((prev) =>
      prev.includes(tid) ? prev.filter((x) => x !== tid) : [...prev, tid]
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!title.trim()) return setMessage("Title is required.");
    if (!description.trim()) return setMessage("Description is required.");
    if (!latitude.trim() || !longitude.trim()) return setMessage("Coordination is required.");

    const latNum = Number(latitude);
    const lonNum = Number(longitude);
    if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
      return setMessage("Latitude and longitude must be numbers.");
    }

    if (selectedTagIds.length === 0) return setMessage("Select at least one tag.");

    setLoading(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) imageUrl = await uploadImage(imageFile);

      const payload: ItemPayload = {
        title: title.trim(),
        description: description.trim(),
        type,
        latitude: latNum,
        longitude: lonNum,
        tagIds: selectedTagIds,
        imageUrls: imageUrl ? [imageUrl] : [],
      };

      await submitItem(payload);

      setMessage("Item added successfully.");
      setTitle("");
      setDescription("");
      setType("LOST");
      setLatitude("");
      setLongitude("");
      setSelectedTagIds([]);
      setImageFile(null);

      const el = document.getElementById("image-input") as HTMLInputElement | null;
      if (el) el.value = "";

      window.location.href = "/dashboard";
    } catch (err: any) {
      setMessage(err.message || "An error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="add-item-root">
      <form className="add-item-form" onSubmit={onSubmit}>
        <h2 className="form-title">Add Lost / Found Item</h2>

        <label className="label">Title *</label>
        <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />

        <label className="label">Description *</label>
        <textarea className="textarea" value={description} onChange={(e) => setDescription(e.target.value)} />

        <label className="label">Type *</label>
        <div className="type-options">
          {TYPE_OPTIONS.map((opt) => (
            <label key={opt} className={`type-label ${type === opt ? "type-selected" : ""}`}>
              <input type="radio" name="item-type" value={opt} checked={type === opt} onChange={() => setType(opt)} />
              <span className="type-text">{opt}</span>
            </label>
          ))}
        </div>

        <div className="row">
          <div className="col">
            <label className="label">Latitude *</label>
            <input className="input" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
          </div>
          <div className="col">
            <label className="label">Longitude *</label>
            <input className="input" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
          </div>
        </div>

        <label className="label">Tags * (select at least one)</label>

        {tagsLoading && <div className="message">Loading tags…</div>}
        {tagsError && <div className="message">{tagsError}</div>}

        {!tagsLoading && !tagsError && (
          <div className="tags">
            {tags.map((tag) => (
              <button
                type="button"
                key={tag.tid}
                className={`tag-btn ${selectedTagIds.includes(tag.tid) ? "tag-selected" : ""}`}
                onClick={() => toggleTag(tag.tid)}
              >
                {tag.tagname}
              </button>
            ))}
          </div>
        )}

        <label className="label">Image</label>
        <input
          id="image-input"
          className="file-input"
          type="file"
          accept="image/*"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
        />

        <div className="actions">
          <button className="submit-btn" type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit"}
          </button>

          <Link to="/dashboard">
            <button className="cancel-btn" type="button" disabled={loading}>
              Cancel
            </button>
          </Link>
        </div>

        {message && <div className="message">{message}</div>}
      </form>
    </div>
  );
}
