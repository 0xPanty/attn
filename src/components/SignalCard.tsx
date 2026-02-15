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
        </div>

        <div className="mb-2">
          <span className="text-[11px] uppercase tracking-wider text-white/15">AI Summary</span>
        </div>
        <p className="text-base text-white/85 leading-7 mb-5">{summary}</p>

        <button
          onClick={() => setShowOriginal(!showOriginal)}
          className="flex items-center gap-1 text-sm text-white/30 hover:text-white/50 transition-colors mb-3"
        >
          {showOriginal ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          <span>{showOriginal ? 'Hide original' : 'Show original'}</span>
        </button>

        {showOriginal && (
          <div className="mb-4 pl-3 border-l border-white/10">
            <p className="text-[15px] text-white/60 leading-relaxed whitespace-pre-wrap">{signal.text}</p>
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
