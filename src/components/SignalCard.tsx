import { useState } from 'react';
import { ExternalLink, Heart, MessageCircle } from 'lucide-react';
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

        <p className="text-sm text-white/80 leading-relaxed mb-3">{summary}</p>

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

            <span className="text-xs text-white/25">⟲ {signal.recasts}</span>
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
