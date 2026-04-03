'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { verifyPassword } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Restore session on mount
    const token = sessionStorage.getItem('pos_token');
    setAuthenticated(!!token);
    setChecking(false);
  }, []);

  const login = useCallback(async (password) => {
    const { token } = await verifyPassword(password);
    sessionStorage.setItem('pos_token', token);
    setAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem('pos_token');
    setAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ authenticated, checking, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
