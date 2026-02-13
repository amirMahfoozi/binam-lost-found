import React, { useEffect, useState } from "react";
import "../../styles/AddItem.css";

import { uploadImage, submitItem } from "../lib/api";
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

export const TAG_OPTIONS = ["wallet", "phone", "keys", "bag", "clothes"];
const TYPE_OPTIONS: Array<ItemPayload["type"]> = ["LOST", "FOUND"];

export default function AddItem() {
  const location = useLocation();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<ItemPayload["type"]>("LOST");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // ✅ Prefill from map hold: /add-item?lat=...&lng=...&type=lost
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

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!title.trim()) { setMessage("Title is required."); return; }
    if (!type) { setMessage("Type is required."); return; }
    if (!latitude.trim() || !longitude.trim()) { setMessage("Coordination is required."); return; }

    const latNum = Number(latitude);
    const lonNum = Number(longitude);
    if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
      setMessage("Latitude and longitude must be numbers.");
      return;
    }

    if (selectedTags.length === 0) {
      setMessage("Select at least one tag.");
      return;
    }

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
        tagIds: selectedTags.map((s) => TAG_OPTIONS.indexOf(s) + 1), // ✅ 1-based IDs
        imageUrls: imageUrl ? [imageUrl] : [],
      };

      await submitItem(payload);

      setMessage("Item added successfully.");
      setTitle(""); setDescription(""); setType("LOST"); setLatitude(""); setLongitude("");
      setSelectedTags([]); setImageFile(null);

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
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} />

        <label className="label">Description</label>
        <textarea className="textarea" value={description} onChange={e => setDescription(e.target.value)} />

        <label className="label">Type *</label>
        <div className="type-options">
          {TYPE_OPTIONS.map(opt => (
            <label key={opt} className={`type-label ${type === opt ? "type-selected" : ""}`}>
              <input
                type="radio"
                name="item-type"
                value={opt}
                checked={type === opt}
                onChange={() => setType(opt)}
              />
              <span className="type-text">{opt}</span>
            </label>
          ))}
        </div>

        <div className="row">
          <div className="col">
            <label className="label">Latitude *</label>
            <input className="input" value={latitude} onChange={e => setLatitude(e.target.value)} />
          </div>
          <div className="col">
            <label className="label">Longitude *</label>
            <input className="input" value={longitude} onChange={e => setLongitude(e.target.value)} />
          </div>
        </div>

        <label className="label">Tags * (select at least one)</label>
        <div className="tags">
          {TAG_OPTIONS.map(tag => (
            <button
              type="button"
              key={tag}
              className={`tag-btn ${selectedTags.includes(tag) ? "tag-selected" : ""}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        <label className="label">Image</label>
        <input id="image-input" className="file-input" type="file" accept="image/*" onChange={e => {
          const f = e.target.files?.[0] || null;
          setImageFile(f);
        }} />

        <div className="actions">
          <button className="submit-btn" type="submit" disabled={loading}>
            {loading ? "Submitting..." : "Submit"}
          </button>
          {/* <button className="cancel-btn" type="Cancel" disabled={loading} onClick={() => changeView("dashboard")}>
            {loading ? "Submitting..." : "Cancel"}
          </button> */}
          <Link to="/dashboard">
            <button className="cancel-btn" type="Cancel" disabled={loading}>
              {loading ? "Submitting..." : "Cancel"}
            </button>
          </Link>
        </div>

        {message && <div className="message">{message}</div>}
      </form>
    </div>
  );
}
