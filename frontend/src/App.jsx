import { useEffect, useState } from "react";
import { Newspaper, Sparkles, Bookmark as BookmarkIcon, History as HistoryIcon, BrainCircuit } from "lucide-react";
import NewsFeed from "./components/NewsFeed";
import Summarizer from "./components/Summarizer";
import Bookmarks from "./components/Bookmarks";
import History from "./components/History";
import { api } from "./api";

const TABS = [
  { id: "feed", label: "News Feed", icon: Newspaper },
  { id: "summarizer", label: "Summarizer", icon: Sparkles },
  { id: "bookmarks", label: "Bookmarks", icon: BookmarkIcon },
  { id: "history", label: "History", icon: HistoryIcon },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("feed");
  const [bookmarks, setBookmarks] = useState([]);
  const [history, setHistory] = useState([]);
  const [pendingArticle, setPendingArticle] = useState(null);

  const bookmarkedUrls = new Set(bookmarks.map((b) => b.url));

  const loadBookmarks = async () => {
    try {
      setBookmarks(await api.getBookmarks());
    } catch (_) {}
  };

  const loadHistory = async () => {
    try {
      setHistory(await api.getSummaryHistory());
    } catch (_) {}
  };

  useEffect(() => {
    loadBookmarks();
    loadHistory();
  }, []);

  useEffect(() => {
    if (activeTab === "history") loadHistory();
    if (activeTab === "bookmarks") loadBookmarks();
  }, [activeTab]);

  const handleToggleBookmark = async (article) => {
    const existing = bookmarks.find((b) => b.url === article.url);
    if (existing) {
      await api.deleteBookmark(existing.id);
    } else {
      await api.addBookmark({
        title: article.title,
        url: article.url,
        source: article.source,
        category: article.category,
        published_at: article.published_at,
      });
    }
    loadBookmarks();
  };

  const handleSummarize = (article) => {
    setActiveTab("summarizer");
    setPendingArticle(article);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/60 px-6 py-4 flex items-center gap-3">
        <div className="bg-indigo-600/20 border border-indigo-500/40 p-2 rounded-lg text-indigo-400">
          <BrainCircuit className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white">AI News Intelligence Platform</h1>
          <p className="text-xs text-slate-400">Live headlines, AI summaries, and bookmarks</p>
        </div>
      </header>

      <nav className="bg-slate-900/40 border-b border-slate-800 px-6">
        <div className="max-w-6xl mx-auto flex gap-6 overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 flex items-center gap-2 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive ? "border-indigo-500 text-indigo-400" : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {activeTab === "feed" && (
          <NewsFeed
            bookmarkedUrls={bookmarkedUrls}
            onToggleBookmark={handleToggleBookmark}
            onSummarize={handleSummarize}
          />
        )}
        {activeTab === "summarizer" && (
          <Summarizer pendingArticle={pendingArticle} onConsumePending={() => setPendingArticle(null)} />
        )}
        {activeTab === "bookmarks" && (
          <Bookmarks
            bookmarks={bookmarks}
            onDelete={async (id) => {
              await api.deleteBookmark(id);
              loadBookmarks();
            }}
          />
        )}
        {activeTab === "history" && <History history={history} onDeleted={loadHistory} />}
      </main>
    </div>
  );
}
