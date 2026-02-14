import { useState, useEffect } from 'react';

export interface WatchUser {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
}

const STORAGE_KEY = 'attn_watchlist';

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchUser[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist));
  }, [watchlist]);

  const addUser = (user: WatchUser) => {
    setWatchlist((prev) => {
      if (prev.some((u) => u.fid === user.fid)) return prev;
      return [...prev, user];
    });
  };

  const removeUser = (fid: number) => {
    setWatchlist((prev) => prev.filter((u) => u.fid !== fid));
  };

  return { watchlist, addUser, removeUser };
}
