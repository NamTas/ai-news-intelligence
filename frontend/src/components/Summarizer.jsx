import { useEffect, useState } from "react";
import { Sparkles, RefreshCw, AlertCircle, Copy } from "lucide-react";
import { api } from "../api";

export default function Summarizer({ pendingArticle, onConsumePending }) {
  const [mode, setMode] = useState("paste"); // "paste" | "url"
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // When the user clicks "Summarize" on a news card, pre-fill this form
  // and run it automatically.
  useEffect(() => {
    if (pendingArticle) {
      setTitle(pendingArticle.title);
      setText(pendingArticle.summary || "");
      setMode("paste");
      runSummarize(pendingArticle.summary || pendingArticle.title, pendingArticle.title);
      onConsumePending();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingArticle]);

  const runSummarize = async (overrideText, overrideTitle) => {
    const bodyText = overrideText ?? text;
    const bodyTitle = overrideTitle ?? title;

    if (mode === "paste" && !bodyText.trim()) {
      setError("Paste some article text first.");
      return;
    }
    if (mode === "url" && !url.trim()) {
      setError("Enter an article URL first.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload =
        mode === "url"
          ? { url, title: bodyTitle }
          : { text: bodyText, title: bodyTitle };
      const data = await api.summarize(payload);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copySummary = () => {
    if (!result) return;
    const plain = `${result.title}\n\n${result.executive_summary}\n\nKey points:\n${result.key_insights
      .map((p) => `- ${p}`)
      .join("\n")}`;
    navigator.clipboard.writeText(plain);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Input side */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 h-fit">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" /> Summarize an Article
        </h2>

        <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800">
          <button
            onClick={() => setMode("paste")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === "paste" ? "bg-indigo-600 text-white" : "text-slate-400"
            }`}
          >
            Paste Text
          </button>
          <button
            onClick={() => setMode("url")}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === "url" ? "bg-indigo-600 text-white" : "text-slate-400"
            }`}
          >
            Article URL
          </button>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-300 block mb-1">Title (optional)</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Bangladesh AI Policy Update"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {mode === "paste" ? (
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1">Article text</label>
            <textarea
              rows={8}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the article's text here..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500 resize-none"
            />
          </div>
        ) : (
          <div>
            <label className="text-sm font-medium text-slate-300 block mb-1">Article URL</label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        )}

        <button
          onClick={() => runSummarize()}
          disabled={loading}
          className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" /> Summarizing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Generate Summary
            </>
          )}
        </button>
      </div>

      {/* Output side */}
      <div>
        {error ? (
          <div className="p-6 bg-red-950/40 border border-red-800 rounded-xl text-red-300 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        ) : result ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-bold text-white leading-snug">{result.title}</h3>
              <button
                onClick={copySummary}
                className="flex-shrink-0 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                title="Copy summary"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-indigo-400 uppercase tracking-wide mb-2">
                Summary
              </h4>
              <p className="text-base text-slate-100 leading-relaxed">{result.executive_summary}</p>
            </div>

            {result.key_insights?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-indigo-400 uppercase tracking-wide mb-2">
                  Key Points
                </h4>
                <ul className="space-y-2">
                  {result.key_insights.map((point, i) => (
                    <li key={i} className="flex gap-2 text-base text-slate-200">
                      <span className="text-indigo-400 font-bold">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800">
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Sentiment</span>
                <p className="text-sm text-slate-200 font-medium mt-0.5">{result.sentiment}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase">Impact</span>
                <p className="text-sm text-slate-200 font-medium mt-0.5">{result.impact_analysis}</p>
              </div>
            </div>

            {result.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {result.tags.map((tag, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center p-12 bg-slate-900/50 border border-dashed border-slate-800 rounded-xl text-center">
            <p className="text-sm text-slate-500">
              Paste an article, enter a URL, or click "Summarize" on a news card to get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
