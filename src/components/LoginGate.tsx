import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const LoginGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, sdkReady } = useAuth();

  if (!sdkReady) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-black px-8 text-center">
        <h1 className="font-mono text-2xl font-medium text-white mb-1">
          attn<span className="text-white/40">.</span>
        </h1>
        <p className="text-white/30 text-sm mb-8">only signal, no noise.</p>
        <a
          href="https://warpcast.com"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full max-w-xs py-3 rounded-lg bg-white text-black font-medium text-sm text-center active:scale-95 transition-transform"
        >
          Open in Warpcast
        </a>
      </div>
    );
  }

  return <>{children}</>;
};
