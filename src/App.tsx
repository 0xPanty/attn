import { useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { LoginGate } from '@/components/LoginGate';
import { SignalFeed } from '@/pages/SignalFeed';
import { Header } from '@/components/Header';
import { WatchlistPanel } from '@/components/WatchlistPanel';
import { useWatchlist } from '@/hooks/useWatchlist';
import type { Language } from '@/types';

function AppContent() {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('attn_language') as Language) || 'en';
  });
  const [showWatchlist, setShowWatchlist] = useState(false);
  const { watchlist, addUser, removeUser } = useWatchlist();

  return (
    <div className="relative w-full h-full flex flex-col bg-black text-white">
      <Header
        language={language}
        onLanguageChange={(lang: Language) => { setLanguage(lang); localStorage.setItem('attn_language', lang); }}
        watchlistCount={watchlist.length}
        onWatchlistOpen={() => setShowWatchlist(true)}
      />
      <SignalFeed language={language} watchlistFids={watchlist.map((u) => u.fid)} />

      {showWatchlist && (
        <WatchlistPanel
          watchlist={watchlist}
          onAdd={addUser}
          onRemove={removeUser}
          onClose={() => setShowWatchlist(false)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LoginGate>
        <AppContent />
      </LoginGate>
    </AuthProvider>
  );
}
