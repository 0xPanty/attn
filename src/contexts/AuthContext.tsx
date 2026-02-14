import React, { createContext, useContext, useState, useEffect } from 'react';
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
}

const AuthContext = createContext<AuthState>({
  user: null,
  sdkReady: false,
  signerUuid: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [signerUuid, setSignerUuid] = useState<string | null>(null);

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

  return (
    <AuthContext.Provider value={{ user, sdkReady, signerUuid }}>
      {children}
    </AuthContext.Provider>
  );
};
