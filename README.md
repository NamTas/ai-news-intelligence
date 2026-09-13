# AI News Intelligence Platform

Full-stack app: live news aggregated automatically from multiple sources (no
manual/mock data), AI-powered summarization, and bookmarks — built with
FastAPI + React.

## What changed from your earlier version

1. **News feed is now fully auto-generated.** `news_service.py` pulls live
   from 5 RSS feeds (Prothom Alo, The Daily Star, BBC, CNN, Al Jazeera) in
   parallel, plus GNews if you add a key — no `SAMPLE_ARTICLES` array
   anymore. Results are cached for 5 minutes and deduplicated by URL.
2. **Summarizer output is clearer.** Bigger, readable fonts (was `text-[10px]`
   in places), plainer language in the AI prompt itself (plain 2-3 sentence
   summary instead of vague "intelligence briefing" jargon), and a simpler
   two-column layout: input on the left, result on the right.
3. **The Gemini API key now lives only on the backend** (`.env`), not in
   browser localStorage. The frontend never talks to Gemini directly anymore
   — it calls your own `/api/summarize` endpoint, which is both more secure
   and a better match for "APIs and backend integration" on the JD.
4. **Bookmarks and summary history are now saved in the database**, not
   `localStorage` — so they show the same data on any device/browser.
5. Added a missing `GET /api/summaries` endpoint (the History tab needed it
   but it didn't exist before).

## ⚠️ Security note

You pasted live API keys earlier in this chat. Please **regenerate both**
before using them again:
- Gemini: https://aistudio.google.com/app/apikey
- GNews: https://gnews.io (dashboard)

Never hardcode keys in `.py`/`.jsx` files or commit them to Git — always use
`.env` (already `.gitignore`-able, see below).

## Project structure

```
ai-news-intelligence/
├── backend/
│   ├── main.py            # FastAPI app + all routes
│   ├── news_service.py    # RSS + GNews aggregation (the main fix)
│   ├── ai_service.py       # Gemini summarization
│   ├── models.py          # SQLAlchemy models (Bookmark, SummaryHistory)
│   ├── schemas.py         # Pydantic request/response shapes
│   ├── database.py        # DB engine/session setup
│   ├── requirements.txt
│   └── .env.example       # copy to .env and fill in your keys
└── frontend/
    ├── src/
    │   ├── App.jsx             # tabs + shared state
    │   ├── api.js              # all backend fetch calls
    │   └── components/
    │       ├── NewsFeed.jsx
    │       ├── Summarizer.jsx
    │       ├── Bookmarks.jsx
    │       └── History.jsx
    ├── tailwind.config.js
    └── package.json
```

## Setup — Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# Open .env and paste your OWN (regenerated) keys:
#   GEMINI_API_KEY=...
#   GNEWS_API_KEY=...   (optional — RSS feeds work without it)

uvicorn main:app --reload --port 8000
```

Visit `http://127.0.0.1:8000/docs` — you should see interactive API docs.
Test the news endpoint directly: `http://127.0.0.1:8000/api/news`

**Without any keys configured**, the app still runs fully:
- News comes from the 5 RSS feeds (no key needed for those)
- Summarize returns a clearly-labeled demo summary instead of erroring

## Setup — Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173`. Make sure the backend is running on port 8000
first — the frontend calls `http://127.0.0.1:8000` directly (see `src/api.js`
if you need to change the port).

## How the news aggregation actually works

`news_service.py` → `fetch_live_news()`:
1. Fires off requests to all 5 RSS feeds **and** GNews **in parallel** using
   a `ThreadPoolExecutor` (so it's not 5x slower than one feed).
2. Each RSS feed is fetched with `requests.get(url, timeout=8)` first, then
   parsed with `feedparser.parse(response.content)` — fetching separately
   with a timeout is important because `feedparser.parse(url)` alone has no
   timeout and can hang the whole app if one feed is slow or unreachable.
3. Every article is normalized into the same shape regardless of source:
   `{id, title, summary, source, url, category, published_at, image}`.
4. Results are deduplicated by URL and sorted newest-first.
5. Cached in memory for 5 minutes (`CACHE_TTL_SECONDS`) so page reloads
   don't re-hit every feed.
6. If every single source fails (e.g. no internet), a one-item fallback
   array is returned so the UI never shows a blank broken page.

**To add more sources** (e.g. a specific Bangladeshi outlet with an RSS
feed), just add an entry to the `RSS_SOURCES` list in `news_service.py`:
```python
{"name": "Some Outlet", "url": "https://example.com/rss", "category": "Bangladesh"}
```

## Talking points for your interview

- "The news feed pulls live from 5 RSS sources plus a news API in parallel,
  normalizes everything into one schema, and caches results — that's the
  API integration and backend requirement from the JD in practice."
- "I moved the LLM API key server-side instead of the browser calling Gemini
  directly with a key from localStorage — that's a real production/security
  habit, not just a demo shortcut."
- "Bookmarks and summaries persist in a real SQLite database with proper
  models, not just localStorage — so it behaves like an actual product."
- "Each RSS fetch has its own timeout and try/except, so one broken feed
  (or a network outage) degrades gracefully instead of crashing the whole
  page — that's the kind of resilience thinking I'd bring to production
  code."

## Next steps if you have more time

- Add authentication (JWT) so bookmarks/history are per-user, not global
- Deploy backend to Render/Railway and frontend to Vercel
- Add a loading skeleton instead of a spinner for a more polished feel
- Add pagination or "load more" once you have enough articles per source
