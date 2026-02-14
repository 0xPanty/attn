import { ExternalLink } from 'lucide-react';
import type { Signal, Language } from '@/types';

interface SignalCardProps {
  signal: Signal;
  language: Language;
}

export function SignalCard({ signal, language }: SignalCardProps) {
  const summary = language !== 'en' && signal.translatedSummary
    ? signal.translatedSummary
    : signal.summary;

  const timeAgo = getTimeAgo(signal.timestamp);

  return (
    <article className="px-4 py-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <img
          src={signal.author.pfpUrl}
          alt=""
          className="w-5 h-5 rounded-full"
        />
        <span className="text-sm text-white/50">
          {signal.author.displayName}
        </span>
        <span className="text-xs text-white/20">·</span>
        <span className="text-xs font-mono text-white/30">
          /{signal.channel}
        </span>
        <span className="text-xs text-white/20">·</span>
        <span className="text-xs text-white/30">{timeAgo}</span>
      </div>

      <p className="text-sm text-white/80 leading-relaxed mb-3">
        {summary}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-white/25">
          <span>♥ {signal.likes}</span>
          <span>↩ {signal.replies}</span>
          <span>⟲ {signal.recasts}</span>
        </div>

        <a
          href={signal.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-white/30 hover:text-white/60 transition-colors"
        >
          <span>original</span>
          <ExternalLink size={10} />
        </a>
      </div>
    </article>
  );
}

function getTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}
