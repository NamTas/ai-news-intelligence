import { Trash2, ExternalLink, Bookmark as BookmarkIcon } from "lucide-react";

export default function Bookmarks({ bookmarks, onDelete }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <BookmarkIcon className="w-6 h-6 text-indigo-400" /> Saved Articles
        </h1>
        <span className="text-sm text-slate-400 px-3 py-1 rounded-full bg-slate-900 border border-slate-800">
          {bookmarks.length} saved
        </span>
      </div>

      {bookmarks.length === 0 ? (
        <div className="py-16 text-center bg-slate-900/40 rounded-xl border border-slate-800">
          <BookmarkIcon className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">
            No saved articles yet. Click the bookmark icon on any news card to save it here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {bookmarks.map((b) => (
            <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
              <span className="text-xs font-semibold text-indigo-400">{b.source}</span>
              <h3 className="font-semibold text-slate-100 leading-snug">{b.title}</h3>
              <div className="flex items-center gap-2 pt-2 mt-auto border-t border-slate-800">
                <a
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-sm text-slate-200"
                >
                  <ExternalLink className="w-4 h-4" /> Open
                </a>
                <button
                  onClick={() => onDelete(b.id)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-red-900/40 text-slate-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
