import React, { useState } from "react";

type ItemPayload = {
  title: string;
  description: string;
  type: string;
  latitude: number;
  longitude: number;
  tagIds: string[]; // array of tag strings
  imageUrls: string[];
};

const TAG_OPTIONS = ["wallet", "phone", "keys", "bag", "clothes"];

export default function AddItem() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const token = localStorage.getItem("token") || "";

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }

  async function uploadImage(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("image", file);
    const res = await fetch("/upload/addImage", {
      method: "POST",
      body: fd,
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || "Image upload failed");
    }
    const data = await res.json();
    // server returns { url: relativeUrl }
    return data.url;
  }

  async function submitItem(payload: ItemPayload) {
    const res = await fetch("/items/addItem", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || "Add item failed");
    }
    return await res.json();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!title.trim()) { setMessage("Title is required"); return; }
    if (!imageFile) { setMessage("Please select an image"); return; }
    const latNum = Number(latitude);
    const lonNum = Number(longitude);
    if (Number.isNaN(latNum) || Number.isNaN(lonNum)) {
      setMessage("Latitude and longitude must be numbers");
      return;
    }

    setLoading(true);
    try {
      // 1) upload image
      const imageUrl = await uploadImage(imageFile);
      // 2) submit item with returned image URL
      const payload: ItemPayload = {
        title: title.trim(),
        description: description.trim(),
        type: type.trim(),
        latitude: latNum,
        longitude: lonNum,
        tagIds: selectedTags,
        imageUrls: [imageUrl],
      };
      await submitItem(payload);
      setMessage("Item added successfully");
      // reset form
      setTitle("");
      setDescription("");
      setType("");
      setLatitude("");
      setLongitude("");
      setSelectedTags([]);
      setImageFile(null);
      // (document.getElementById("image-input") as HTMLInputElement | null)?.value = "";

      // (document.getElementById("image-input"))?.value = "";
    } catch (err: any) {
      setMessage(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ color: "black", background: "white", maxWidth: 600 }}>
      <div>
        <label><strong>Title</strong></label><br />
        <input value={title} onChange={e => setTitle(e.target.value)} />
      </div>

      <div>
        <label><strong>Description</strong></label><br />
        <textarea value={description} onChange={e => setDescription(e.target.value)} />
      </div>

      <div>
        <label><strong>Type</strong></label><br />
        <input value={type} onChange={e => setType(e.target.value)} />
      </div>

      <div>
        <label><strong>Latitude</strong></label><br />
        <input value={latitude} onChange={e => setLatitude(e.target.value)} />
      </div>

      <div>
        <label><strong>Longitude</strong></label><br />
        <input value={longitude} onChange={e => setLongitude(e.target.value)} />
      </div>

      <div>
        <label><strong>Tags</strong></label><br />
        {TAG_OPTIONS.map(tag => (
          <label key={tag} style={{ marginRight: 8 }}>
            <input
              type="checkbox"
              checked={selectedTags.includes(tag)}
              onChange={() => toggleTag(tag)}
            /> {tag}
          </label>
        ))}
      </div>

      <div>
        <label><strong>Image</strong></label><br />
        <input id="image-input" type="file" accept="image/*" onChange={e => {
          const f = e.target.files?.[0] || null;
          setImageFile(f);
        }} />
      </div>

      <div style={{ marginTop: 12 }}>
        <button type="submit" disabled={loading}>
          {loading ? "Submitting..." : "Submit"}
        </button>
      </div>

      {message && <div style={{ marginTop: 12 }}>{message}</div>}
    </form>
  );
}
