import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
// @ts-ignore
import { sdk } from '@farcaster/miniapp-sdk';

interface UserInfo {
  fid: number;
  username: string;
  displayName: string;
  pfpUrl: string;
}

interface AuthState {
  user: UserInfo | null;
  sdkReady: boolean;
  signerUuid: string | null;
  signerStatus: 'none' | 'pending' | 'approved';
  requestSigner: () => Promise<string | null>;
}

const SIGNER_STORAGE_KEY = 'attn_signer_uuid';

const AuthContext = createContext<AuthState>({
  user: null,
  sdkReady: false,
  signerUuid: null,
  signerStatus: 'none',
  requestSigner: async () => null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [signerUuid, setSignerUuid] = useState<string | null>(null);
  const [signerStatus, setSignerStatus] = useState<'none' | 'pending' | 'approved'>('none');

  // Check stored signer on mount
  useEffect(() => {
    const stored = localStorage.getItem(SIGNER_STORAGE_KEY);
    if (stored) {
      setSignerUuid(stored);
      setSignerStatus('pending');
      // Check if already approved
      fetch(`/api/signer-status?uuid=${stored}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.status === 'approved') {
            setSignerStatus('approved');
          } else if (data.status === 'revoked') {
            localStorage.removeItem(SIGNER_STORAGE_KEY);
            setSignerUuid(null);
            setSignerStatus('none');
          }
        })
        .catch(() => {});
    }
  }, []);

  // Poll for approval when pending
  useEffect(() => {
    if (signerStatus !== 'pending' || !signerUuid) return;
    const interval = setInterval(async () => {
      try {
        const r = await fetch(`/api/signer-status?uuid=${signerUuid}`);
        const data = await r.json();
        if (data.status === 'approved') {
          setSignerStatus('approved');
          clearInterval(interval);
        }
      } catch { /* ignore */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [signerStatus, signerUuid]);

  useEffect(() => {
    const init = async () => {
      try {
        const context = await sdk.context;
        if (context?.user) {
          setUser({
            fid: context.user.fid,
            username: context.user.username,
            displayName: context.user.displayName,
            pfpUrl: context.user.pfpUrl,
          });
        }
        await sdk.actions.ready();
      } catch {
        await sdk.actions.ready().catch(() => {});
      } finally {
        setSdkReady(true);
      }
    };
    init();
  }, []);

  const requestSigner = useCallback(async (): Promise<string | null> => {
    if (signerUuid && signerStatus === 'approved') return signerUuid;
    try {
      const r = await fetch('/api/signer', { method: 'POST' });
      if (!r.ok) return null;
      const data = await r.json();
      setSignerUuid(data.signerUuid);
      setSignerStatus('pending');
      localStorage.setItem(SIGNER_STORAGE_KEY, data.signerUuid);
      // Open approval URL in Farcaster
      if (data.approvalUrl) {
        try {
          await sdk.actions.openUrl({ url: data.approvalUrl });
        } catch {
          window.open(data.approvalUrl, '_blank');
        }
      }
      return data.signerUuid;
    } catch {
      return null;
    }
  }, [signerUuid, signerStatus]);

  return (
    <AuthContext.Provider value={{ user, sdkReady, signerUuid, signerStatus, requestSigner }}>
      {children}
    </AuthContext.Provider>
  );
};
