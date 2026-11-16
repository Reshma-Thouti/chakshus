/**
 * context/AuthContext.jsx
 *
 * Authentication & Role State Provider.
 * Stores JWT in localStorage, validates session on mount,
 * and enforces doctor vs patient portal access.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, getAuthMe } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('diavision_user');
    return cached ? JSON.parse(cached) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('diavision_token') || null);
  const [loading, setLoading] = useState(true);

  // Validate existing token on mount
  useEffect(() => {
    async function initAuth() {
      const storedToken = localStorage.getItem('diavision_token');
      if (storedToken) {
        try {
          const res = await getAuthMe();
          if (res?.user) {
            setUser(res.user);
            localStorage.setItem('diavision_user', JSON.stringify(res.user));
          }
        } catch (err) {
          console.warn('Session expired or invalid, logging out:', err.message);
          logout();
        }
      }
      setLoading(false);
    }
    initAuth();
  }, []);

  const login = useCallback(async (email, password, expectedRole) => {
    const res = await loginUser({ email, password, expectedRole });
    if (res?.token && res?.user) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('diavision_token', res.token);
      localStorage.setItem('diavision_user', JSON.stringify(res.user));
    }
    return res;
  }, []);

  const register = useCallback(async (userData) => {
    const res = await registerUser(userData);
    if (res?.token && res?.user) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('diavision_token', res.token);
      localStorage.setItem('diavision_user', JSON.stringify(res.user));
    }
    return res;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('diavision_token');
    localStorage.removeItem('diavision_user');
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(token && user),
    isDoctor: user?.role === 'doctor',
    isPatient: user?.role === 'patient',
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
