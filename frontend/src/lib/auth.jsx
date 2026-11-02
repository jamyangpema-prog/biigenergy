import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('be_user') || 'null'); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('be_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me').then((r) => {
      setUser(r.data);
      localStorage.setItem('be_user', JSON.stringify(r.data));
    }).catch(() => {
      localStorage.removeItem('be_token');
      localStorage.removeItem('be_user');
      setUser(null);
    }).finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('be_token', data.token);
    localStorage.setItem('be_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('be_token');
    localStorage.removeItem('be_user');
    setUser(null);
  };

  const can = (action) => {
    if (!user) return false;
    const role = user.role;
    if (role === 'admin') return true;
    if (role === 'estimator') return action !== 'manage_users';
    return action === 'view';
  };

  return (
    <AuthCtx.Provider value={{ user, login, logout, loading, can }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
