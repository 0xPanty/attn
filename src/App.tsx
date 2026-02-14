import { useState } from 'react';
import { SignalFeed } from '@/pages/SignalFeed';
import { Header } from '@/components/Header';
import type { Language } from '@/types';

export default function App() {
  const [language, setLanguage] = useState<Language>('zh');

  return (
    <div className="relative w-full h-full flex flex-col bg-black text-white">
      <Header language={language} onLanguageChange={setLanguage} />
      <SignalFeed language={language} />
    </div>
  );
}
