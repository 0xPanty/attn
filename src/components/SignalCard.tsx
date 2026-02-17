import { useState } from 'react';
import { ExternalLink, Heart, MessageCircle, Repeat2, ChevronDown, ChevronUp, Languages } from 'lucide-react';
import type { Signal, Language } from '@/types';

interface SignalCardProps {
  signal: Signal;
  language: Language;
}

export function SignalCard({ signal, language }: SignalCardProps) {
  const [showOriginal, setShowOriginal] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  const summary = language !== 'en' && signal.translatedSummary
    ? signal.translatedSummary
    : signal.summary;

  const timeAgo = getTimeAgo(signal.timestamp);

  return (
    <>
      <article className="px-5 py-6 mb-1 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-2 mb-4">
          <img src={signal.author.pfpUrl} alt="" className="w-6 h-6 rounded-full" />
          <span className="text-[15px] text-white/45">{signal.author.displayName}</span>
          <span className="text-sm text-white/15">·</span>
          <span className="text-sm font-mono text-white/20">/{signal.channel}</span>
          <span className="text-sm text-white/15">·</span>
          <span className="text-sm text-white/20">{timeAgo}</span>
          <span
            className={`ml-auto w-2.5 h-2.5 rounded-full shrink-0 ${
              signal.heat === 'red'
                ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]'
                : signal.heat === 'yellow'
                ? 'bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.4)]'
                : 'bg-emerald-400/60'
            }`}
            title={signal.heat === 'red' ? 'Hot' : signal.heat === 'yellow' ? 'Warm' : 'Normal'}
          />
        </div>

        <div className="mb-2">
          <span className="text-[11px] uppercase tracking-wider text-white/15">AI Summary</span>
        </div>
        <p className="text-base text-white/85 leading-7 mb-5 break-words overflow-hidden">{summary}</p>

        {signal.communityReactions && signal.communityReactions.length > 0 && (
          <div className="mb-5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 overflow-hidden">
            <span className="text-[11px] uppercase tracking-wider text-white/25 block mb-2.5">Community</span>
            <div className="space-y-2">
              {signal.communityReactions.map((r, i) => (
                <button
                  key={i}
                  onClick={async () => {
                    const url = `https://warpcast.com/${r.username}/${r.hash?.slice(0, 10) || ''}`;
                    try {
                      const { sdk } = await import('@farcaster/miniapp-sdk');
                      await sdk.actions.openUrl({ url });
                    } catch {
                      window.open(url, '_blank');
                    }
                  }}
                  className="flex items-start gap-2 text-sm hover:bg-white/[0.03] rounded px-1 -mx-1 py-0.5 transition-colors cursor-pointer text-left w-full"
                >
                  {r.isKol && <span className="shrink-0 text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-medium">KOL</span>}
                  {r.isQuote && <span className="shrink-0 text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded font-medium">🔁</span>}
                  <span className="text-white/40 shrink-0">@{r.username}</span>
                  <span className="text-white/60 break-all">{(language !== 'en' && r.translatedText) ? r.translatedText : r.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setShowOriginal(!showOriginal)}
          className="flex items-center gap-1 text-sm text-white/30 hover:text-white/50 transition-colors mb-3"
        >
          {showOriginal ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <span>{showOriginal ? 'Hide original' : 'Show original'}</span>
        </button>

        {showOriginal && (
          <div className="mb-4 pl-3 border-l border-white/10">
            <p className="text-[15px] text-white/60 leading-relaxed whitespace-pre-wrap overflow-hidden">
              {signal.text.replace(/https?:\/\/\S+/g, '').trim()}
            </p>
            {language !== 'en' && !translatedText && (
              <button
                onClick={async () => {
                  setTranslating(true);
                  try {
                    const r = await fetch('/api/translate', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ text: signal.text, lang: language }),
                    });
                    if (r.ok) {
                      const data = await r.json();
                      setTranslatedText(data.translation);
                    }
                  } catch { /* ignore */ }
                  setTranslating(false);
                }}
                disabled={translating}
                className="flex items-center gap-1 text-sm text-white/30 hover:text-white/50 transition-colors mt-3"
              >
                <Languages size={14} />
                <span>{translating ? 'Translating...' : 'Translate'}</span>
              </button>
            )}
            {translatedText && (
              <p className="text-[15px] text-white/70 leading-relaxed mt-3 whitespace-pre-wrap">{translatedText}</p>
            )}
          </div>
        )}

        {signal.quotedCast && (
          <div className="mb-4 rounded-lg border border-white/10 p-4 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-2">
              {signal.quotedCast.author.pfpUrl && (
                <img src={signal.quotedCast.author.pfpUrl} alt="" className="w-5 h-5 rounded-full" />
              )}
              <span className="text-sm text-white/40">@{signal.quotedCast.author.username}</span>
            </div>
            <p className="text-sm text-white/50 leading-relaxed line-clamp-4">{signal.quotedCast.text}</p>
          </div>
        )}

        {signal.images.length > 0 && (
          <div className={`mb-4 ${signal.images.length === 1 ? '' : 'grid grid-cols-2 gap-1.5'}`}>
            {signal.images.slice(0, 4).map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="w-full rounded-lg object-cover max-h-56"
                loading="lazy"
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-5">
            <span className="flex items-center gap-1.5 text-sm text-white/20">
              <Heart size={14} />
              <span>{signal.likes}</span>
            </span>
            <span className="flex items-center gap-1.5 text-sm text-white/20">
              <MessageCircle size={14} />
              <span>{signal.replies}</span>
            </span>
            <span className="flex items-center gap-1.5 text-sm text-white/20">
              <Repeat2 size={14} />
              <span>{signal.recasts}</span>
            </span>
          </div>

          <button
            onClick={async () => {
              try {
                const { sdk } = await import('@farcaster/miniapp-sdk');
                await sdk.actions.openUrl({ url: signal.originalUrl });
              } catch {
                window.open(signal.originalUrl, '_blank');
              }
            }}
            className="flex items-center gap-1 text-sm text-white/30 hover:text-white/60 transition-colors"
          >
            <span>original</span>
            <ExternalLink size={12} />
          </button>
        </div>
      </article>
    </>
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
