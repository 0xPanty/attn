import { useState } from 'react';
import { ExternalLink, Heart, MessageCircle, ChevronDown, ChevronUp, Languages } from 'lucide-react';
import { ReplyModal } from '@/components/ReplyModal';
import { useAuth } from '@/contexts/AuthContext';
import type { Signal, Language } from '@/types';

interface SignalCardProps {
  signal: Signal;
  language: Language;
}

export function SignalCard({ signal, language }: SignalCardProps) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(signal.likes);
  const [showReply, setShowReply] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);

  const summary = language !== 'en' && signal.translatedSummary
    ? signal.translatedSummary
    : signal.summary;

  const timeAgo = getTimeAgo(signal.timestamp);

  const handleLike = async () => {
    if (liked || !user) return;
    setLiked(true);
    setLikeCount((c) => c + 1);
    try {
      await fetch('/api/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: user.fid,
          castHash: signal.hash,
          type: 'like',
        }),
      });
    } catch {
      setLiked(false);
      setLikeCount((c) => c - 1);
    }
  };

  const handleReply = async (text: string) => {
    if (!user) return;
    const res = await fetch('/api/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fid: user.fid,
        castHash: signal.hash,
        type: 'reply',
        text,
      }),
    });
    if (!res.ok) throw new Error('Reply failed');
  };

  return (
    <>
      <article className="px-4 py-4 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-2 mb-2">
          <img src={signal.author.pfpUrl} alt="" className="w-5 h-5 rounded-full" />
          <span className="text-sm text-white/50">{signal.author.displayName}</span>
          <span className="text-xs text-white/20">·</span>
          <span className="text-xs font-mono text-white/30">/{signal.channel}</span>
          <span className="text-xs text-white/20">·</span>
          <span className="text-xs text-white/30">{timeAgo}</span>
        </div>

        <div className="mb-2">
          <span className="text-[10px] uppercase tracking-wider text-white/20">AI Summary</span>
        </div>
        <p className="text-sm text-white/80 leading-relaxed mb-3">{summary}</p>

        <button
          onClick={() => setShowOriginal(!showOriginal)}
          className="flex items-center gap-1 text-xs text-white/30 hover:text-white/50 transition-colors mb-3"
        >
          {showOriginal ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          <span>{showOriginal ? 'Hide original' : 'Show original'}</span>
        </button>

        {showOriginal && (
          <div className="mb-3 pl-3 border-l border-white/10">
            <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{signal.text}</p>
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
                className="flex items-center gap-1 text-xs text-white/30 hover:text-white/50 transition-colors mt-2"
              >
                <Languages size={12} />
                <span>{translating ? 'Translating...' : 'Translate'}</span>
              </button>
            )}
            {translatedText && (
              <p className="text-sm text-white/70 leading-relaxed mt-2 whitespace-pre-wrap">{translatedText}</p>
            )}
          </div>
        )}

        {signal.quotedCast && (
          <div className="mb-3 rounded-lg border border-white/10 p-3 bg-white/[0.02]">
            <div className="flex items-center gap-2 mb-1">
              {signal.quotedCast.author.pfpUrl && (
                <img src={signal.quotedCast.author.pfpUrl} alt="" className="w-4 h-4 rounded-full" />
              )}
              <span className="text-xs text-white/40">@{signal.quotedCast.author.username}</span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed line-clamp-4">{signal.quotedCast.text}</p>
          </div>
        )}

        {signal.images.length > 0 && (
          <div className={`mb-3 ${signal.images.length === 1 ? '' : 'grid grid-cols-2 gap-1.5'}`}>
            {signal.images.slice(0, 4).map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                className="w-full rounded-lg object-cover max-h-48"
                loading="lazy"
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 text-xs transition-colors ${
                liked ? 'text-red-400' : 'text-white/25 hover:text-red-400/60'
              }`}
            >
              <Heart size={13} fill={liked ? 'currentColor' : 'none'} />
              <span>{likeCount}</span>
            </button>

            <button
              onClick={() => setShowReply(true)}
              className="flex items-center gap-1 text-xs text-white/25 hover:text-white/60 transition-colors"
            >
              <MessageCircle size={13} />
              <span>{signal.replies}</span>
            </button>

            <span className="text-xs text-white/25">&#x27F2; {signal.recasts}</span>
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

      {showReply && (
        <ReplyModal
          authorUsername={signal.author.username}
          castHash={signal.hash}
          onClose={() => setShowReply(false)}
          onSend={handleReply}
        />
      )}
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
