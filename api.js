const API = "/api";
export function getToken() { return localStorage.getItem("cinebox-token") || ""; }

export async function api(path, options = {}) {
  const headers = { ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...(options.headers || {}) };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || `Erreur HTTP ${response.status}`);
  return data;
}
export const json = (method, body) => ({ method, body: JSON.stringify(body) });
