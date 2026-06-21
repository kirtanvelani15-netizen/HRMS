import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem('token'));

  // Set token in axios defaults
  const setAuthToken = useCallback((tkn) => {
    if (tkn) {
      api.defaults.headers.common['Authorization'] = `Bearer ${tkn}`;
      localStorage.setItem('token', tkn);
    } else {
      delete api.defaults.headers.common['Authorization'];
      localStorage.removeItem('token');
    }
  }, []);

  // Load user on mount
  useEffect(() => {
    const loadUser = async () => {
      const savedToken = localStorage.getItem('token');
      if (savedToken) {
        setAuthToken(savedToken);
        try {
          const { data } = await api.get('/auth/me');
          if (data.success) setUser(data.data);
        } catch (error) {
          setAuthToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };
    loadUser();
  }, [setAuthToken]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.success) {
      setAuthToken(data.token);
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  const logout = () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  const updateUser = (userData) => setUser(prev => ({ ...prev, ...userData }));

  // Returns true if the current user's company has the given module enabled.
  // Super admins always return true.
  const hasModule = (moduleKey) => {
    if (!user) return false;
    if (user.isSuperAdmin) return true;
    return user.company?.modules?.includes(moduleKey) ?? true; // fallback true for legacy users with no company
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser, setUser, hasModule }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export default AuthContext;
