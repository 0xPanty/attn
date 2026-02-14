import { useState } from 'react';
import { Search, X, Plus, Minus, Loader2, Users } from 'lucide-react';
import type { WatchUser } from '@/hooks/useWatchlist';

interface SearchResult {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  followerCount: number;
}

interface WatchlistPanelProps {
  watchlist: WatchUser[];
  onAdd: (user: WatchUser) => void;
  onRemove: (fid: number) => void;
  onClose: () => void;
}

export function WatchlistPanel({ watchlist, onAdd, onRemove, onClose }: WatchlistPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/search-user?q=${encodeURIComponent(query.trim())}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setResults(data.users || []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const isInWatchlist = (fid: number) => watchlist.some((u) => u.fid === fid);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-zinc-900 rounded-t-2xl p-4 pb-8 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-white/50" />
            <span className="text-sm font-medium text-white/70">Watchlist</span>
            <span className="text-xs text-white/30">({watchlist.length})</span>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white/60">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 flex items-center bg-zinc-800 rounded-lg px-3 py-2">
            <Search size={14} className="text-white/30 mr-2" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search username..."
              className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/20"
              autoFocus
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!query.trim() || searching}
            className="px-3 py-2 rounded-lg bg-white text-black text-sm font-medium disabled:opacity-30"
          >
            {searching ? <Loader2 size={14} className="animate-spin" /> : 'Search'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {/* Search Results */}
          {results.length > 0 && (
            <div className="mb-4">
              <span className="text-xs text-white/30 mb-2 block">Results</span>
              {results.map((user) => (
                <div key={user.fid} className="flex items-center gap-3 py-2">
                  <img src={user.pfpUrl} alt="" className="w-8 h-8 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 truncate">{user.displayName}</p>
                    <p className="text-xs text-white/30">@{user.username} · {user.followerCount} followers</p>
                  </div>
                  {isInWatchlist(user.fid) ? (
                    <button
                      onClick={() => onRemove(user.fid)}
                      className="p-1.5 rounded-lg bg-red-500/10 text-red-400"
                    >
                      <Minus size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={() => onAdd({ fid: user.fid, username: user.username, displayName: user.displayName, pfpUrl: user.pfpUrl })}
                      className="p-1.5 rounded-lg bg-white/10 text-white/60 hover:text-white"
                    >
                      <Plus size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Current Watchlist */}
          {watchlist.length > 0 && (
            <div>
              <span className="text-xs text-white/30 mb-2 block">Your Watchlist</span>
              {watchlist.map((user) => (
                <div key={user.fid} className="flex items-center gap-3 py-2">
                  <img src={user.pfpUrl} alt="" className="w-8 h-8 rounded-full" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 truncate">{user.displayName}</p>
                    <p className="text-xs text-white/30">@{user.username}</p>
                  </div>
                  <button
                    onClick={() => onRemove(user.fid)}
                    className="p-1.5 rounded-lg bg-red-500/10 text-red-400"
                  >
                    <Minus size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {watchlist.length === 0 && results.length === 0 && (
            <p className="text-center text-sm text-white/20 py-8">
              Search and add users to your watchlist
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
