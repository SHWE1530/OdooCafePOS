import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User, POSSession } from '../types';
import { authAPI, sessionsAPI } from '../services/api';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeSession: POSSession | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  openSession: (startBalance: number, notes?: string) => Promise<void>;
  closeSession: (endBalance: number, notes?: string) => Promise<void>;
  refreshActiveSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [activeSession, setActiveSession] = useState<POSSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setActiveSession(null);
    showToast('Logged out successfully.', 'info');
  };

  const loadUserData = async (authToken: string) => {
    try {
      localStorage.setItem('token', authToken);
      setToken(authToken);
      const me = await authAPI.getMe();
      setUser(me);
      
      // Load active session (except for kitchen role, who doesn't use cashier sessions)
      if (me.role !== 'kitchen') {
        const session = await sessionsAPI.getActive();
        setActiveSession(session);
      }
      
      showToast(`Welcome back, ${me.name}!`, 'success');
    } catch (err: any) {
      console.error(err);
      logout();
      showToast('Session expired. Please log in again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadUserData(token);
    } else {
      setIsLoading(false);
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await authAPI.login(email, password);
      await loadUserData(data.access_token);
    } catch (err: any) {
      setIsLoading(false);
      const errMsg = err.response?.data?.detail || 'Invalid email or password';
      showToast(errMsg, 'error');
      throw err;
    }
  };


  const openSession = async (startBalance: number, notes?: string) => {
    try {
      const session = await sessionsAPI.open({ start_balance: startBalance, notes });
      setActiveSession(session);
      showToast('POS Session opened successfully!', 'success');
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || 'Failed to open session';
      showToast(errMsg, 'error');
      throw err;
    }
  };

  const closeSession = async (endBalance: number, notes?: string) => {
    if (!activeSession) return;
    try {
      const session = await sessionsAPI.close(activeSession.id, { end_balance: endBalance, notes });
      setActiveSession(null);
      showToast(`Session closed. Final balance: $${session.end_balance}`, 'success');
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || 'Failed to close session';
      showToast(errMsg, 'error');
      throw err;
    }
  };

  const refreshActiveSession = async () => {
    if (!user || user.role === 'kitchen') return;
    try {
      const session = await sessionsAPI.getActive();
      setActiveSession(session);
    } catch (err) {
      console.error('Error refreshing session:', err);
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLoading,
        activeSession,
        login,
        logout,
        openSession,
        closeSession,
        refreshActiveSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
