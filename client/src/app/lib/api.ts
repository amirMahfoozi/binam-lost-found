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

export async function loadCountWithFilters(params?: Record<string, string | number | undefined>) {
  // Calls /items with page=1&limit=1 but returns total count from headers or from response if backend includes it.
  // Since backend currently returns only items + pagination, we'll request a large limit and use returned length OR
  // better: use the existing /items and count via a separate endpoint if available. As a pragmatic approach,
  // request limit=1 and rely on a custom header "X-Total-Count" if backend sets it; otherwise fall back to
  // a request with limit=1000 to estimate count. Adjust according to your backend capabilities.
  const qs =
    params
      ? "?" +
        Object.entries({ ...params })
          .filter(([, v]) => v !== undefined && v !== "")
          .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
          .join("&")
      : "";

  const url = `${API_BASE}/items${qs}${qs ? "&" : "?"}page=1&limit=1`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(await parseError(res));

  // Try to read total from header first
  const totalFromHeader = res.headers.get("X-Total-Count");
  if (totalFromHeader) {
    return Number(totalFromHeader);
  }

  // Otherwise, fall back: ask with a large limit (server caps at 100)
  const fallbackRes = await fetch(`${API_BASE}/items${qs}${qs ? "&" : "?"}page=1&limit=100`);
  if (!fallbackRes.ok) throw new Error(await parseError(fallbackRes));
  const json = await fallbackRes.json();
  if (json && Array.isArray(json.items) && json.pagination && json.pagination.limit) {
    // If backend provides pagination info with page and limit but not total, we cannot know exact total.
    // Return items length as best-effort.
    return Array.isArray(json.items) ? json.items.length : 0;
  }
  return Array.isArray(json.items) ? json.items.length : 0;
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

// ---------- Chatbot ----------
export type ChatbotSuggestion = {
  id: number;
  title: string;
  type: string;
  imageUrl: string | null;
  descriptionSnippet: string;
  score: number;
  link: string; // frontend route, e.g. /items/123
};

export type ChatbotResponse = {
  intent: string;
  reply: string;
  keywords?: string[];
  suggestions?: ChatbotSuggestion[];
};

export async function sendChatbotMessage(message: string): Promise<ChatbotResponse> {
  const res = await fetch(`${API_BASE}/chatbot/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

// ---------- Comments ----------
export type CommentDto = {
  cid: number;
  iid: number;
  uid: number;
  comment_text: string;
  report_count: number | null;
  date_added: string;
  user: { uid: number; username: string } | null;
  permissions: { canDelete: boolean };
};

export async function loadComments(itemId: number): Promise<CommentDto[]> {
  const token = localStorage.getItem("token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/comments/items/${itemId}/comments`, { headers });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  return (data?.comments ?? []) as CommentDto[];
}

export async function addComment(itemId: number, body: string): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("You must be logged in to comment.");

  const res = await fetch(`${API_BASE}/comments/items/${itemId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ body }),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function deleteComment(commentId: number): Promise<void> {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("You must be logged in.");

  const res = await fetch(`${API_BASE}/comments/${commentId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function reportComment(commentId: number): Promise<{ reportCount: number }> {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("You must be logged in to report.");

  const res = await fetch(`${API_BASE}/comments/${commentId}/report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ success: boolean; reportCount: number }>;
}

export async function loadCommentsCount(itemId: number): Promise<number> {
  const res = await fetch(`${API_BASE}/comments/items/${itemId}/comments`);
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  const list = Array.isArray(data?.comments) ? data.comments : [];
  return list.length;
}
// src/lib/api.ts
function getToken() {
  return localStorage.getItem('token');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
export async function loadItemForEdit(id: number) {
  const res = await fetch(`${API_BASE}/items/${id}`, {
    headers: {
      ...authHeaders(),
    },
  });

  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.error || `Failed to load item (${res.status})`);
  return j;
}

export async function updateItem(
  id: number,
  payload: {
    title?: string;
    description?: string;
    type?: 'lost' | 'found';
    latitude?: number;
    longitude?: number;
    tagIds?: number[];
    addImageUrls?: string[];
    removeImageIds?: number[];
  }
) {
  const res = await fetch(`${API_BASE}/items/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.error || `Failed to update item (${res.status})`);
  return j;
}

