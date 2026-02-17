import { ItemPayload } from "../pages/AddItem";
import { Item } from "../pages/ItemsList";
import { ItemResponse } from "../pages/ItemShow";

export const API_BASE = "http://localhost:4000";

async function parseError(res: Response) {
  try {
    const data = await res.json();
    if (data?.error) return String(data.error);
  } catch {}
  return `Request failed: ${res.status}`;
}

// ---------- Auth ----------
export async function register(email: string, username: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ success: boolean; message: string }>;
}

export async function verifyOtp(email: string, otp: string) {
  const res = await fetch(`${API_BASE}/auth/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{
    token: string;
    user: { uid: string; email: string; username: string };
  }>;
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{
    token: string;
    user: { uid: string; email: string; username: string };
  }>;
}

// ---------- Upload ----------
export async function uploadImage(file: File): Promise<string> {
  const token = localStorage.getItem("token");
  const fd = new FormData();
  fd.append("image", file);

  const res = await fetch(`${API_BASE}/upload/addImage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: fd,
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "Image upload failed");
  }

  const data = await res.json();
  return data.url;
}

// ---------- Tags ----------
export type TagDto = { tid: number; tagname: string; color: string | null };

export async function loadTags(): Promise<TagDto[]> {
  const res = await fetch(`${API_BASE}/tags`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

// ---------- Items ----------
export async function submitItem(payload: ItemPayload) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_BASE}/items/addItem`, {
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

export async function loadCount(
  setCount: (n: number) => void,
  setError: (err: string | null) => void
) {
  try {
    const res = await fetch(`${API_BASE}/items/count`);
    if (!res.ok) throw new Error((await res.text()) || "Failed to load count");
    const data = await res.json();
    const c = typeof data === "number" ? data : data.count ?? null;
    setCount(c);
  } catch (err: any) {
    setError(err.message || "Error loading item count");
  }
}

// Generic loader (works for list + map + filters)
export async function loadItems(params?: Record<string, string | number | undefined>) {
  const qs =
    params
      ? "?" +
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== "")
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join("&")
      : "";

  const res = await fetch(`${API_BASE}/items${qs}`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ items: Item[]; pagination: any }>;
}

export async function loadPage(
  p: number,
  PAGE_SIZE: number,
  setLoading: (isLoading: boolean) => void,
  setError: (err: string | null) => void,
  setItems: (items: Item[]) => void
) {
  setLoading(true);
  setError(null);

  try {
    const res = await fetch(`${API_BASE}/items?page=${p}&limit=${PAGE_SIZE}`);
    if (!res.ok) throw new Error((await res.text()) || "Failed to load items");
    const data = await res.json();
    const list: Item[] = Array.isArray(data) ? data : data.items ?? [];
    setItems(list);
  } catch (err: any) {
    setError(err.message || "Error loading items");
    setItems([]);
  } finally {
    setLoading(false);
  }
}

export async function showItem(
  id: number,
  setItem: (item: ItemResponse | null) => void,
  setError: (err: string | null) => void,
  setLoading: (isLoading: boolean) => void
) {
  const token = localStorage.getItem("token");

  let mounted = true;
  setLoading(true);
  setError(null);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  fetch(`${API_BASE}/items/${id}`, { headers })
    .then(async (res) => {
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      return res.json();
    })
    .then((data: ItemResponse) => {
      if (!mounted) return;
      setItem(data);
    })
    .catch((err: Error) => {
      if (!mounted) return;
      setError(err.message || "Failed to load item");
    })
    .finally(() => {
      if (!mounted) return;
      setLoading(false);
    });

  return () => {
    mounted = false;
  };
}

export async function deleteItem(
  id: number,
  setItem: (item: ItemResponse | null) => void,
  setError: (err: string | null) => void,
  setDeleting: (isDeleting: boolean) => void,
  onDeleted?: (id: number) => void
) {
  const token = localStorage.getItem("token");

  if (!confirm("Delete this item? This action cannot be undone.")) return;

  setDeleting(true);
  setError(null);

  try {
    const res = await fetch(`${API_BASE}/items/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || `HTTP ${res.status}`);
    }

    if (onDeleted) onDeleted(id);
    setItem(null);
  } catch (err: any) {
    setError(err?.message || "Failed to delete item");
  } finally {
    setDeleting(false);
  }
}
