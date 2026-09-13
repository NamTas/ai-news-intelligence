const BASE_URL = "http://127.0.0.1:8000";

async function request(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let detail = "Request failed";
    try {
      const errData = await res.json();
      detail = errData.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  getNews: (category = "All", query = "") => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (query) params.set("query", query);
    return request(`/api/news?${params.toString()}`);
  },

  summarize: (payload) => request("/api/summarize", { method: "POST", body: payload }),

  getBookmarks: () => request("/api/bookmarks"),

  getSummaryHistory: () => request("/api/summaries"),

  deleteSummary: (id) => request(`/api/summaries/${id}`, { method: "DELETE" }),

  clearSummaryHistory: () => request("/api/summaries", { method: "DELETE" }),

  addBookmark: (payload) => request("/api/bookmarks", { method: "POST", body: payload }),

  deleteBookmark: (id) => request(`/api/bookmarks/${id}`, { method: "DELETE" }),
};
