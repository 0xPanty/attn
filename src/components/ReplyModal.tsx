import { useState } from 'react';
import { X, Loader2, Send, Languages } from 'lucide-react';

interface ReplyModalProps {
  authorUsername: string;
  castHash: string;
  onClose: () => void;
  onSend: (text: string) => Promise<void>;
}

export function ReplyModal({ authorUsername, castHash, onClose, onSend }: ReplyModalProps) {
  const [input, setInput] = useState('');
  const [translatedPreview, setTranslatedPreview] = useState<string | null>(null);
  const [translating, setTranslating] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranslate = async () => {
    if (!input.trim()) return;
    setTranslating(true);
    setError(null);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input, lang: 'en' }),
      });
      if (!res.ok) throw new Error('Translation failed');
      const data = await res.json();
      setTranslatedPreview(data.translation);
    } catch {
      setError('Translation failed');
    } finally {
      setTranslating(false);
    }
  };

  const handleSend = async () => {
    const textToSend = translatedPreview || input;
    if (!textToSend.trim()) return;
    setSending(true);
    setError(null);
    try {
      await onSend(textToSend);
      onClose();
    } catch {
      setError('Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-zinc-900 rounded-t-2xl p-4 pb-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-white/50">Reply to @{authorUsername}</span>
          <button onClick={onClose} className="text-white/30 hover:text-white/60">
            <X size={18} />
          </button>
        </div>

        <textarea
          value={input}
          onChange={(e) => { setInput(e.target.value); setTranslatedPreview(null); }}
          placeholder="Write your reply..."
          className="w-full bg-zinc-800 text-white text-sm rounded-lg p-3 resize-none h-24 outline-none placeholder:text-white/20 mb-3"
          autoFocus
        />

        {translatedPreview && (
          <div className="bg-zinc-800/50 rounded-lg p-3 mb-3 border border-white/5">
            <span className="text-xs text-white/30 block mb-1">Translation preview:</span>
            <p className="text-sm text-white/70">{translatedPreview}</p>
          </div>
        )}

        {error && (
          <p className="text-xs text-red-400/60 mb-3">{error}</p>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={handleTranslate}
            disabled={!input.trim() || translating}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 text-sm text-white/50 hover:text-white/80 transition-colors disabled:opacity-30"
          >
            {translating ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}
            <span>Translate to EN</span>
          </button>

          <div className="flex-1" />

          <button
            onClick={handleSend}
            disabled={(!input.trim() && !translatedPreview) || sending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-30"
          >
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            <span>{translatedPreview ? 'Send Translation' : 'Send Original'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
