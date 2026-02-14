import { useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { LoginGate } from '@/components/LoginGate';
import { SignalFeed } from '@/pages/SignalFeed';
import { Header } from '@/components/Header';
import type { Language } from '@/types';

export default function App() {
  const [language, setLanguage] = useState<Language>('zh');

  return (
    <AuthProvider>
      <LoginGate>
        <div className="relative w-full h-full flex flex-col bg-black text-white">
          <Header language={language} onLanguageChange={setLanguage} />
          <SignalFeed language={language} />
        </div>
      </LoginGate>
    </AuthProvider>
  );
}
