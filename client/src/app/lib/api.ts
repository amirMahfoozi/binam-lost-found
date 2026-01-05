import { ItemPayload } from "../components/AddItem";

const API_BASE = "http://localhost:4000";

async function parseError(res: Response) {
  try {
    const data = await res.json();
    if (data?.error) return String(data.error);
  } catch {}
  return `Request failed: ${res.status}`;
}

// Step 1: register -> backend sends OTP (or logs it)
export async function register(email: string, username: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, username, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ success: boolean; message: string }>;
}

// Step 2: verify otp -> backend creates user and returns token
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

export async function uploadImage(file: File): Promise<string> {
  const token = localStorage.getItem("token");
  const fd = new FormData();
  fd.append("image", file);
  const res = await fetch(`${API_BASE}/upload/addImage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: fd
   });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || "Image upload failed");
  }
  const data = await res.json();
  return data.url;
}

export async function submitItem(payload: ItemPayload) {
  // const token = localStorage.getItem("token") || "";
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
