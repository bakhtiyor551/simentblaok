'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, AuthUser, getToken } from './api';

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (login: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api<AuthUser>('/auth/me')
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('blockerp_token');
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(loginName: string, password: string) {
    const data = await api<{ token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login: loginName, password }),
    });
    localStorage.setItem('blockerp_token', data.token);
    setUser(data.user);
  }

  function logout() {
    localStorage.removeItem('blockerp_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
