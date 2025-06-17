"use client";

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { sdk } from '@farcaster/frame-sdk';

interface AuthContextType {
  fid: number | null;
  token: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [fid, setFid] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const signIn = async () => {
    try {
      // @ts-ignore
      const { token } = await sdk.experimental.quickAuth();
      setToken(token);
      const payload = JSON.parse(atob(token.split('.')[1]));
      setFid(payload.sub);
    } catch (error) {
      console.error('Failed to sign in:', error);
      throw error;
    }
  };

  // Automatically sign in on mount if not already signed in
  useEffect(() => {
    if (!fid || !token) {
      signIn().catch(e => console.error('signIn effect error:', e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = () => {
    setFid(null);
    setToken(null);
  };

  return (
    <AuthContext.Provider
      value={{
        fid,
        token,
        signIn,
        signOut,
        isAuthenticated: !!fid && !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 