import { createClient } from "@/lib/supabase/client";

const BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

export async function getToken(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) return token;
  } catch {}
  // fallback to localStorage if session call fails
  return localStorage.getItem("access_token");
}

async function fetchWithAuth(path: string, options: RequestInit = {}) {
  const token = await getToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || "Request failed");
  }

  return res.json();
}

// Public — no auth needed (Brahmastra share links)
export async function getBrahmastraByShareId(shareId: string) {
  const res = await fetch(`${BASE_URL}/oracle/share/${shareId}`);
  if (!res.ok) throw new Error("Brief not found or expired");
  return res.json();
}

export const api = {
  get: (path: string) => fetchWithAuth(path),
  post: (path: string, body: unknown) =>
    fetchWithAuth(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path: string, body?: unknown) =>
    fetchWithAuth(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: (path: string, body?: unknown) =>
    fetchWithAuth(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: (path: string) => fetchWithAuth(path, { method: "DELETE" }),

  // Brahmastra — auth required
  getBrahmastraBrief: (subjectId: string, forceRefresh = false) =>
    fetchWithAuth(`/oracle/${subjectId}${forceRefresh ? "?force_refresh=true" : ""}`),
  postBrahmastraFeedback: (subjectId: string, body: { question_text: string; appeared: boolean }) =>
    fetchWithAuth(`/oracle/${subjectId}/feedback`, { method: "POST", body: JSON.stringify(body) }),

  upload: async (path: string, formData: FormData) => {
    const token = await getToken();
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(error.detail || "Upload failed");
    }
    return res.json();
  },
};
