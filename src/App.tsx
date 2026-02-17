import { useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { LoginGate } from '@/components/LoginGate';
import { SignalFeed } from '@/pages/SignalFeed';
import { Header } from '@/components/Header';
import { InfoPanel } from '@/components/InfoPanel';
import type { Language } from '@/types';

function AppContent() {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('attn_language') as Language) || 'en';
  });
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="relative w-full h-full flex flex-col bg-black text-white">
      <Header
        language={language}
        onLanguageChange={(lang: Language) => { setLanguage(lang); localStorage.setItem('attn_language', lang); }}
        onInfoOpen={() => setShowInfo(true)}
      />
      <SignalFeed language={language} watchlistFids={[]} />

      {showInfo && (
        <InfoPanel language={language} onClose={() => setShowInfo(false)} />
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
