# 📰 AI News Intelligence Platform

**Live headlines from around the world. AI-powered summaries in one click. All in one clean dashboard.**

A full-stack app that pulls real-time news from 9+ sources, lets you generate instant AI summaries of any article, and keeps track of what you've saved and summarized — built end-to-end with FastAPI and React.

![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-B73BFE?logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?logo=sqlite&logoColor=white)
![Gemini API](https://img.shields.io/badge/Gemini_API-8E75B2?logo=googlegemini&logoColor=white)

---

## ✨ What it does

- 🌍 **Live news feed** — auto-aggregated from Prothom Alo, The Daily Star, BBC, CNN, Al Jazeera, TechCrunch, The Verge, CNBC, and NPR Health (plus GNews if you add a key). No hardcoded/mock articles — everything is fetched fresh, in parallel, and cached for 5 minutes.
- 🤖 **One-click AI summaries** — paste an article, a URL, or hit "Summarize" on any headline, and get a plain-English 2-3 sentence summary powered by Google's Gemini API.
- 🔖 **Bookmarks & history** — save articles and revisit past summaries, persisted in a real database (not just browser storage).
- 🔍 **Search & filter** — by category (World, Bangladesh, Technology, Business, Health) or keyword.
- 🛡️ **Built to not break** — every RSS fetch has its own timeout and error handling, so one dead feed can't take down the whole app; falls back gracefully if no API key is configured.

## 🖼️ Preview
![App Preview](https://github.com/user-attachments/assets/a67f87f9-c99a-4170-8e44-33d9dc872df3)

## 🧱 Tech Stack

| Layer | Tech |
|---|---|
| Backend | FastAPI, SQLAlchemy, SQLite |
| Frontend | React, Vite, Tailwind CSS |
| AI | Google Gemini API (`google-genai` SDK) |
| News sources | RSS (feedparser) + GNews API |
| Concurrency | `ThreadPoolExecutor` for parallel feed fetching |

## 🚀 Quick Start

```bash
git clone https://github.com/YOUR-USERNAME/ai-news-intelligence.git
cd ai-news-intelligence
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Add your own GEMINI_API_KEY (and optionally GNEWS_API_KEY) to .env

uvicorn main:app --reload --port 8000
```

Visit `http://127.0.0.1:8000/docs` for interactive API docs.

**No API keys? No problem** — the app still runs fully: news comes live from RSS feeds (no key required), and summaries show a clearly-labeled demo response instead of erroring.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`. Make sure the backend is running on port 8000 first — the frontend calls `http://127.0.0.1:8000` directly.

## 🏗️ Project Structure
ai-news-intelligence/
├── backend/
│ ├── main.py # FastAPI app + all routes
│ ├── news_service.py # RSS + GNews aggregation, dedup, caching
│ ├── ai_service.py # Gemini summarization
│ ├── models.py # SQLAlchemy models (Bookmark, SummaryHistory)
│ ├── schemas.py # Pydantic request/response shapes
│ ├── database.py # DB engine/session setup
│ ├── requirements.txt
│ └── .env.example # copy to .env and fill in your keys
└── frontend/
├── src/
│ ├── App.jsx # tabs + shared state
│ ├── api.js # all backend fetch calls
│ └── components/
│ ├── NewsFeed.jsx
│ ├── Summarizer.jsx
│ ├── Bookmarks.jsx
│ └── History.jsx
├── tailwind.config.js
└── package.json


## ⚙️ How the news aggregation works

`news_service.py` → `fetch_live_news()`:
1. Fires off requests to all RSS feeds **and** GNews **in parallel** using a `ThreadPoolExecutor` (so it's not N-times slower than one feed).
2. Each RSS feed is fetched with `requests.get(url, timeout=8)` first, then parsed with `feedparser.parse(response.content)` — fetching separately with a timeout matters because `feedparser.parse(url)` alone has no timeout and can hang the whole app if one feed is slow or unreachable.
3. If an article's RSS entry has no thumbnail at all, its own page is fetched for an Open Graph (`og:image`) meta tag as a fallback.
4. Every article is normalized into the same shape regardless of source: `{id, title, summary, source, url, category, published_at, image}`.
5. Results are deduplicated by URL, filtered to only the last 14 days, and sorted newest-first.
6. Cached in memory for 5 minutes so repeated page loads don't re-hit every feed.
7. If every single source fails (e.g. no internet), a one-item fallback array is returned so the UI never shows a blank broken page.

**To add more sources**, just add an entry to `RSS_SOURCES` in `news_service.py`:
```python
{"name": "Some Outlet", "url": "https://example.com/rss", "category": "World"}
```

## 💡 Design decisions worth mentioning in an interview

- **API key stays server-side.** The frontend never calls Gemini directly — it goes through the backend's own `/api/summarize` endpoint, which is both more secure and a realistic production pattern (not a demo shortcut with a key sitting in `localStorage`).
- **Bookmarks and summaries persist in a real SQLite database**, not `localStorage`, so they're consistent across devices and sessions.
- **Every external call has a timeout and a fallback.** A slow or dead RSS feed degrades gracefully instead of taking down the whole page — resilience thinking that matters in production code.
- **Parallel fetching over sequential.** Aggregating 9 sources one at a time would be painfully slow; a `ThreadPoolExecutor` fetches them all at once.

## 📌 Roadmap

- [ ] User authentication (per-user bookmarks/history)
- [ ] Deploy backend to Render/Railway, frontend to Vercel
- [ ] Pagination / infinite scroll
- [ ] Dark/light theme toggle

---

Built as a hands-on project to explore full-stack development, external API integration, and production-minded backend design.
