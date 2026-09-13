import { useEffect, useState } from "react";
import { Search, ExternalLink, Bookmark, Sparkles, RefreshCw, Clock } from "lucide-react";
import { api } from "../api";

const CATEGORIES = ["All", "Bangladesh", "World", "Technology", "Business", "Health"];

export default function NewsFeed({ bookmarkedUrls, onToggleBookmark, onSummarize }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  const loadNews = async (cat = category, q = search) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getNews(cat, q);
      setArticles(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadNews(category, search);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-700">
        <h1 className="text-2xl font-bold text-white">Live News Feed</h1>
        <p className="text-sm text-slate-400 mt-1">
          Auto-fetched from Prothom Alo, The Daily Star, BBC, CNN, Al Jazeera and GNews — refreshes every 5 minutes.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                category === cat
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="relative min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search headlines..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </form>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Fetching live headlines...</span>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-950/40 border border-red-800 rounded-xl text-red-300 text-sm">
          Couldn't load news: {error}. Make sure the backend server is running on port 8000.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {articles.map((article) => {
            const isBookmarked = bookmarkedUrls.has(article.url);
            return (
              <article
                key={article.id}
                className="flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-indigo-600 transition-colors"
              >
                <img
                  src={article.image || "https://placehold.co/400x220?text=News"}
                  alt=""
                  className="w-full h-40 object-cover bg-slate-800"
                  loading="lazy"
                  onError={(e) => {
                    // Prevents infinite loop if the placeholder itself ever fails,
                    // and catches broken/expired/hotlink-blocked source images.
                    if (e.target.src !== "https://placehold.co/400x220?text=News") {
                      e.target.src = "https://placehold.co/400x220?text=News";
                    }
                  }}
                />
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-semibold text-indigo-400">{article.source}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {article.published_at}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-100 leading-snug line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-sm text-slate-400 line-clamp-3 flex-1">{article.summary}</p>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => onSummarize(article)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-sm font-medium transition-colors"
                    >
                      <Sparkles className="w-4 h-4" /> Summarize
                    </button>
                    <button
                      onClick={() => onToggleBookmark(article)}
                      className={`p-2 rounded-lg transition-colors ${
                        isBookmarked
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-800 text-slate-400 hover:text-white"
                      }`}
                      title="Bookmark"
                    >
                      <Bookmark className={`w-4 h-4 ${isBookmarked ? "fill-white" : ""}`} />
                    </button>
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
                      title="Open original article"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
