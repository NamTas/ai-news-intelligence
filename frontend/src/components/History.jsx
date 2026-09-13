import { History as HistoryIcon, Trash2 } from "lucide-react";
import { api } from "../api";

export default function History({ history, onDeleted }) {
  const handleDeleteOne = async (id) => {
    await api.deleteSummary(id);
    onDeleted();
  };

  const handleClearAll = async () => {
    await api.clearSummaryHistory();
    onDeleted();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <HistoryIcon className="w-6 h-6 text-indigo-400" /> Summary History
          </h1>
          <p className="text-sm text-slate-400 mt-1">Your last 50 generated summaries.</p>
        </div>
        {history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-800 text-red-300 hover:bg-red-900/40 text-sm font-medium"
          >
            Clear All
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/40 rounded-xl border border-slate-800">
          <HistoryIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">
            Summaries you generate will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item) => (
            <div key={item.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-2 gap-3">
                <h3 className="font-semibold text-slate-100">{item.article_title}</h3>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-slate-500">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleDeleteOne(item.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-300"
                    title="Delete this summary"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{item.executive_summary}</p>
              <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                {item.sentiment}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
