import { useState } from 'react';
import { Globe, Users } from 'lucide-react';
import { LANGUAGE_LABELS, type Language } from '@/types';

interface HeaderProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  watchlistCount: number;
  onWatchlistOpen: () => void;
}

export function Header({ language, onLanguageChange, watchlistCount, onWatchlistOpen }: HeaderProps) {
  const [showLangMenu, setShowLangMenu] = useState(false);

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
      <h1 className="font-mono text-lg font-medium tracking-tight">
        attn<span className="text-white/40">.</span>
      </h1>

      <div className="flex items-center gap-3">
        <button
          onClick={onWatchlistOpen}
          className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors"
        >
          <Users size={14} />
          {watchlistCount > 0 && (
            <span className="text-xs text-white/40">{watchlistCount}</span>
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors"
          >
            <Globe size={14} />
            <span>{LANGUAGE_LABELS[language]}</span>
          </button>

          {showLangMenu && (
            <div className="absolute right-0 top-8 bg-zinc-900 border border-white/10 rounded-lg py-1 z-50">
              {(Object.entries(LANGUAGE_LABELS) as [Language, string][]).map(([code, label]) => (
                <button
                  key={code}
                  onClick={() => { onLanguageChange(code); setShowLangMenu(false); }}
                  className={`block w-full text-left px-4 py-2 text-sm hover:bg-white/5 transition-colors ${
                    code === language ? 'text-white' : 'text-white/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
