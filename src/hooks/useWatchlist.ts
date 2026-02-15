import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export interface WatchUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
}

const STORAGE_KEY = 'attn_watchlist';

export function useWatchlist() {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [loaded, setLoaded] = useState(false);

  // Load from Redis on login
  useEffect(() => {
    if (!user?.fid || loaded) return;
    fetch(`/api/watchlist?fid=${user.fid}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.watchlist && data.watchlist.length > 0) {
          setWatchlist(data.watchlist);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data.watchlist));
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [user?.fid, loaded]);

  // Sync to Redis + localStorage on change
  const syncWatchlist = useCallback((next: WatchUser[]) => {
    setWatchlist(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    if (user?.fid) {
      fetch(`/api/watchlist?fid=${user.fid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ watchlist: next }),
      }).catch(() => {});
    }
  }, [user?.fid]);

  const addUser = (u: WatchUser) => {
    setWatchlist((prev) => {
      if (prev.some((w) => w.fid === u.fid)) return prev;
      if (prev.length >= 10) return prev;
      const next = [...prev, u];
      syncWatchlist(next);
      return next;
    });
  };

  const removeUser = (fid: number) => {
    setWatchlist((prev) => {
      const next = prev.filter((w) => w.fid !== fid);
      syncWatchlist(next);
      return next;
    });
  };

  return { watchlist, addUser, removeUser };
}
