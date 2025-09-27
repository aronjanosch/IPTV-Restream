import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, AuthResponse } from '../types';
import apiService from '../services/ApiService';

interface AuthContextType {
  user: User | null;
  authenticated: boolean;
  loading: boolean;
  setupRequired: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  checkSetup: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);

  const checkSetup = async () => {
    try {
      const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
      const setupResponse = await apiService.request<{ setupRequired: boolean }>('/setup-required', 'GET', baseUrl + '/auth');
      setSetupRequired(setupResponse.setupRequired);
      return setupResponse.setupRequired;
    } catch (error) {
      console.error('Setup check failed:', error);
      setSetupRequired(false);
      return false;
    }
  };

  const checkAuth = async () => {
    try {
      // First check if setup is required
      const needsSetup = await checkSetup();
      if (needsSetup) {
        setLoading(false);
        return;
      }

      const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
      const authResponse = await apiService.request<AuthResponse>('/user', 'GET', baseUrl + '/auth');

      if (authResponse.authenticated && authResponse.user) {
        setUser(authResponse.user);
        setAuthenticated(true);
      } else {
        setUser(null);
        setAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
      const response = await apiService.request<AuthResponse>('/login', 'POST', baseUrl + '/auth', {
        email,
        password
      });

      if (response.authenticated && response.user) {
        setUser(response.user);
        setAuthenticated(true);
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
      const response = await apiService.request<AuthResponse>('/register', 'POST', baseUrl + '/auth', {
        email,
        password,
        name
      });

      if (response.authenticated && response.user) {
        setUser(response.user);
        setAuthenticated(true);
        setSetupRequired(false); // Setup is complete after first user registration
      } else {
        throw new Error('Registration failed');
      }
    } catch (error) {
      console.error('Registration failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const baseUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5001';
      await apiService.request('/logout', 'POST', baseUrl + '/auth');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      setAuthenticated(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value = {
    user,
    authenticated,
    loading,
    setupRequired,
    login,
    register,
    logout,
    checkAuth,
    checkSetup
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};