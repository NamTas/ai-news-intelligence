"""
Auto-aggregates news from multiple live sources so the feed is never
hand-typed/mock data:
  1. GNews API          -> general international headlines by category
  2. RSS feeds          -> Prothom Alo, The Daily Star, CNN, BBC, Al Jazeera

All sources are normalized into the same article shape the frontend expects:
{id, title, summary, source, url, category, published_at, readTime, image}
"""
import os
import time
import hashlib
import requests
import feedparser
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

load_dotenv()  # ensures .env is loaded even if this module is imported before main.py's load_dotenv() runs

GNEWS_API_KEY = os.getenv("GNEWS_API_KEY", "")

# Each RSS source is tagged with a category so it still works with the
# category filter buttons in the UI. Add/remove feeds here freely.
RSS_SOURCES = [
    {"name": "Prothom Alo", "url": "https://en.prothomalo.com/feed", "category": "Bangladesh"},
    {"name": "The Daily Star", "url": "https://www.thedailystar.net/rss.xml", "category": "Bangladesh"},
    {"name": "BBC News", "url": "http://feeds.bbci.co.uk/news/world/rss.xml", "category": "World"},
    {"name": "CNN", "url": "http://rss.cnn.com/rss/cnn_topstories.rss", "category": "World"},
    {"name": "Al Jazeera", "url": "https://www.aljazeera.com/xml/rss/all.xml", "category": "World"},
    {"name": "TechCrunch", "url": "https://techcrunch.com/feed/", "category": "Technology"},
    {"name": "The Verge", "url": "https://www.theverge.com/rss/index.xml", "category": "Technology"},
    {"name": "CNBC Business", "url": "https://www.cnbc.com/id/10001147/device/rss/rss.html", "category": "Business"},
    {"name": "NPR Health", "url": "https://feeds.npr.org/1128/rss.xml", "category": "Health"},
]

_CACHE = {"data": None, "fetched_at": 0}
CACHE_TTL_SECONDS = 300  # 5 minutes - avoids hammering feeds on every page load
_PLACEHOLDER_IMAGE = "https://placehold.co/400x220?text=News"


def _make_id(url: str) -> int:
    """Stable numeric id derived from the article URL, so the same article
    always gets the same id across requests (needed for bookmarking)."""
    return int(hashlib.md5(url.encode()).hexdigest(), 16) % (10**9)


def _safe_date(entry) -> str:
    """RSS feeds format dates inconsistently - fall back to 'today' if parsing fails."""
    for key in ("published", "updated"):
        raw = entry.get(key)
        if raw:
            try:
                return parsedate_to_datetime(raw).date().isoformat()
            except Exception:
                pass
    return datetime.now(timezone.utc).date().isoformat()


def _normalize_image_url(url: str) -> str:
    """Some feeds (Al Jazeera among them) give protocol-relative URLs like
    '//www.aljazeera.com/photo.jpg' instead of a full 'https://...' URL.
    Browsers can't load those directly as an <img src>, so this fixes them up."""
    if not url:
        return ""
    if url.startswith("//"):
        return "https:" + url
    if url.startswith("http"):
        return url
    return ""  # relative paths like "/images/x.jpg" have no reliable base to resolve against


def _extract_image(entry) -> str:
    """Tries several places RSS feeds hide a thumbnail, in order of
    reliability. Many feeds (Prothom Alo, Daily Star, etc.) don't use the
    media: namespace at all and instead embed an <img> tag directly inside
    the article's HTML description - that's the most common case in
    practice, so it's checked even though it looks last here."""
    if "media_content" in entry and entry.media_content:
        url = _normalize_image_url(entry.media_content[0].get("url", ""))
        if url:
            return url
    if "media_thumbnail" in entry and entry.media_thumbnail:
        url = _normalize_image_url(entry.media_thumbnail[0].get("url", ""))
        if url:
            return url
    for enclosure in entry.get("enclosures", []):
        if enclosure.get("type", "").startswith("image"):
            url = _normalize_image_url(enclosure.get("href", "") or enclosure.get("url", ""))
            if url:
                return url
    for link in entry.get("links", []):
        if link.get("type", "").startswith("image"):
            url = _normalize_image_url(link.get("href", ""))
            if url:
                return url

    # Fallback: look for an <img src="..."> inside the HTML summary/content
    import re
    html_blob = entry.get("summary", "") or ""
    if entry.get("content"):
        html_blob += " " + " ".join(c.get("value", "") for c in entry.content)
    match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', html_blob)
    if match:
        url = _normalize_image_url(match.group(1))
        if url:
            return url

    return _PLACEHOLDER_IMAGE


def _fetch_og_image(article_url: str) -> str:
    """Some feeds (Al Jazeera confirmed - their RSS has zero per-article
    image data, only a channel-level logo) don't include a thumbnail at
    all in the feed. As a fallback, fetch the article page itself and
    pull its Open Graph image meta tag - the same image every social
    media preview uses. Kept fast with a short timeout since this runs
    per-article on top of the feed fetch itself."""
    try:
        resp = requests.get(
            article_url,
            timeout=4,
            headers={"User-Agent": "Mozilla/5.0 (compatible; NewsAggregator/1.0)"},
        )
        resp.raise_for_status()
        import re
        match = re.search(
            r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']',
            resp.text[:20000],  # og:image is always in <head>, no need to scan the whole page
        )
        if match:
            return _normalize_image_url(match.group(1))
    except Exception:
        pass
    return ""


def _fetch_one_rss(source: dict, query: str = "") -> list:
    """Fetch and normalize a single RSS feed. Never raises - a broken feed
    just returns an empty list so one bad source can't break the whole page.
    Uses requests with an explicit timeout (feedparser's own URL fetching
    has no timeout and can hang the whole request if a feed is slow/down)."""
    try:
        resp = requests.get(
            source["url"],
            timeout=8,
            headers={"User-Agent": "Mozilla/5.0 (compatible; NewsAggregator/1.0)"},
        )
        resp.raise_for_status()
        parsed = feedparser.parse(resp.content)

        articles = []
        for entry in parsed.entries[:15]:
            title = entry.get("title", "").strip()
            if not title:
                continue
            if query and query.lower() not in title.lower():
                continue
            summary = entry.get("summary", "") or entry.get("description", "")
            # Strip any leftover HTML tags from RSS summaries
            import re
            summary = re.sub("<[^<]+?>", "", summary).strip()

            url = entry.get("link", "")
            image_url = _extract_image(entry)
            articles.append({
                "id": _make_id(url),
                "title": title,
                "summary": summary[:280],
                "source": source["name"],
                "url": url,
                "category": source["category"],
                "published_at": _safe_date(entry),
                "readTime": "3 min",
                "image": image_url,
                "_needs_og_image": image_url == _PLACEHOLDER_IMAGE and bool(url),
            })

        # For articles whose RSS entry had no image at all (confirmed the
        # case for Al Jazeera - their feed only has a channel-level logo,
        # nothing per-article), fetch each article page's og:image tag in
        # parallel. Capped to the first 8 per source so a source with zero
        # RSS images can't make the whole feed slow.
        needs_og = [a for a in articles if a.pop("_needs_og_image")][:15]
        if needs_og:
            with ThreadPoolExecutor(max_workers=15) as og_executor:
                og_results = og_executor.map(lambda a: _fetch_og_image(a["url"]), needs_og)
                for art, og_image in zip(needs_og, og_results):
                    if og_image:
                        art["image"] = og_image

        return articles
    except Exception as e:
        print(f"[news_service] Failed to fetch RSS '{source['name']}': {e}")
        return []


def _fetch_gnews(category: str = "", query: str = "") -> list:
    if not GNEWS_API_KEY or GNEWS_API_KEY.startswith("YOUR_"):
        return []

    try:
        if query:
            url = f"https://gnews.io/api/v4/search?q={query}&lang=en&max=10&apikey={GNEWS_API_KEY}"
        else:
            cat = category.lower() if category and category not in ("All", "Bangladesh", "World") else "general"
            url = f"https://gnews.io/api/v4/top-headlines?category={cat}&lang=en&max=10&apikey={GNEWS_API_KEY}"

        res = requests.get(url, timeout=8)
        res.raise_for_status()
        data = res.json()

        return [
            {
                "id": _make_id(art["url"]),
                "title": art["title"],
                "summary": (art.get("description") or "")[:280],
                "source": art.get("source", {}).get("name", "GNews"),
                "url": art["url"],
                "category": category or "General",
                "published_at": (art.get("publishedAt") or "")[:10],
                "readTime": "3 min",
                "image": art.get("image") or "https://placehold.co/400x220?text=News",
            }
            for art in data.get("articles", [])
        ]
    except Exception as e:
        print(f"[news_service] GNews fetch failed: {e}")
        return []


def fetch_live_news(category: str = "All", query: str = "", force_refresh: bool = False) -> list:
    """
    Pulls from GNews + all RSS sources in parallel, merges, dedupes, and
    sorts by publish date (newest first). Cached for CACHE_TTL_SECONDS so
    repeated page loads don't refetch every feed each time.
    """
    now = time.time()
    cache_key_matches = (
        _CACHE["data"] is not None
        and (now - _CACHE["fetched_at"]) < CACHE_TTL_SECONDS
        and not force_refresh
        and not query  # never cache search queries
    )
    if cache_key_matches:
        all_articles = _CACHE["data"]
    else:
        all_articles = []
        with ThreadPoolExecutor(max_workers=len(RSS_SOURCES) + 1) as executor:
            futures = [executor.submit(_fetch_one_rss, src, query) for src in RSS_SOURCES]
            futures.append(executor.submit(_fetch_gnews, category, query))
            # Hard cap of 12s total - individual fetches already timeout at 8s,
            # this just guarantees the endpoint always responds even if a
            # thread somehow hangs past its own timeout.
            try:
                for future in as_completed(futures, timeout=12):
                    try:
                        all_articles.extend(future.result())
                    except Exception:
                        pass
            except TimeoutError:
                # Grab whatever results are already done; abandon the rest.
                for future in futures:
                    if future.done():
                        try:
                            all_articles.extend(future.result())
                        except Exception:
                            pass

        # Deduplicate by URL, sort newest first
        seen = set()
        deduped = []
        for art in sorted(all_articles, key=lambda a: a["published_at"], reverse=True):
            if art["url"] not in seen:
                seen.add(art["url"])
                deduped.append(art)
        all_articles = deduped

        # Drop anything older than 14 days. This is a "live news" feed, so a
        # source with a stale/broken RSS endpoint (some public feeds go
        # unmaintained and serve old cached content) shouldn't be able to
        # inject old articles into what's supposed to be current headlines.
        from datetime import timedelta
        cutoff = (datetime.now(timezone.utc) - timedelta(days=14)).date().isoformat()
        all_articles = [a for a in all_articles if a["published_at"] >= cutoff]

        if not query:
            _CACHE["data"] = all_articles
            _CACHE["fetched_at"] = now

    # Apply category filter (skip if "All")
    if category and category != "All":
        all_articles = [a for a in all_articles if a["category"].lower() == category.lower()]

    # Fallback so the page is never empty even if every source fails
    # (e.g. no internet / all feeds down at once)
    if not all_articles:
        all_articles = [{
            "id": 0,
            "title": "No live articles available right now",
            "summary": "All news sources were unreachable. Check your internet connection or NEWS_API_KEY, then refresh.",
            "source": "System",
            "url": "#",
            "category": "System",
            "published_at": datetime.now(timezone.utc).date().isoformat(),
            "readTime": "-",
            "image": "https://placehold.co/400x220?text=No+Data",
        }]

    return all_articles
