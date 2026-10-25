import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('showbook_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('showbook_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.data.user);
          localStorage.setItem('showbook_user', JSON.stringify(res.data.data.user));
        } catch {
          setUser(null);
          setToken(null);
          localStorage.removeItem('showbook_token');
          localStorage.removeItem('showbook_user');
        }
      }
      setLoading(false);
    }
    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { user: userData, token: tokenData } = res.data.data;
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem('showbook_token', tokenData);
    localStorage.setItem('showbook_user', JSON.stringify(userData));
    return userData;
  };

  const register = async (name, email, password) => {
    const res = await api.post('/auth/register', { name, email, password });
    const { user: userData, token: tokenData } = res.data.data;
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem('showbook_token', tokenData);
    localStorage.setItem('showbook_user', JSON.stringify(userData));
    return userData;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Continue client cleanup regardless
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('showbook_token');
    localStorage.removeItem('showbook_user');
  };

  const updateProfile = async (name) => {
    const res = await api.patch('/auth/me', { name });
    const updated = res.data.data.user;
    setUser(updated);
    localStorage.setItem('showbook_user', JSON.stringify(updated));
    return updated;
  };

  const changePassword = async (currentPassword, newPassword) => {
    const res = await api.patch('/auth/me/password', { currentPassword, newPassword });
    return res.data;
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'ADMIN',
    login,
    register,
    logout,
    updateProfile,
    changePassword,
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
