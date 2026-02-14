import { useState, useEffect } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { SignalCard } from '@/components/SignalCard';
import type { Signal, Language } from '@/types';

interface SignalFeedProps {
  language: Language;
  watchlistFids: number[];
}

export function SignalFeed({ language, watchlistFids }: SignalFeedProps) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchSignals = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const fidsParam = watchlistFids.length > 0 ? `&fids=${watchlistFids.join(',')}` : '';
      const res = await fetch(`/api/signals?lang=${language}${fidsParam}`);
      if (!res.ok) throw new Error('Failed to fetch signals');

      const data = await res.json();
      setSignals(data.signals || []);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setError('Failed to load signals');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, [language, watchlistFids.join(',')]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 size={20} className="animate-spin text-white/30" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-white/30">
            {signals.length} signals
          </span>
          {lastUpdated && (
            <span className="text-xs text-white/20">· {lastUpdated}</span>
          )}
        </div>
        <button
          onClick={() => fetchSignals(true)}
          disabled={refreshing}
          className="text-white/30 hover:text-white/60 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {error && (
        <div className="px-4 py-8 text-center text-sm text-red-400/60">
          {error}
        </div>
      )}

      {!error && signals.length === 0 && (
        <div className="px-4 py-16 text-center">
          <p className="text-sm text-white/30 font-mono">quiet day on Farcaster.</p>
          <p className="text-xs text-white/15 mt-2">nothing passed the signal filter — check back later.</p>
        </div>
      )}

      {signals.map((signal) => (
        <SignalCard key={signal.id} signal={signal} language={language} />
      ))}
    </div>
  );
}
