const API_BASE_URL = "http://localhost:4000";

export interface ApiOptions extends RequestInit {
  authToken?: string | null;
}

export async function apiFetch<T>(
  path: string,
  options: ApiOptions = {}
): Promise<T> {
  const { authToken, headers, ...rest } = options;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
      ...(authToken
        ? {
            Authorization: `Bearer ${authToken}`,
          }
        : {}),
    },
  });

  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (data && typeof data.error === "string") {
        message = data.error;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return res.json();
}
