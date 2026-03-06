import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { validateAccessCode, fetchNewJWT, persistAuth, clearAuth, getStoredSession } from '../services/auth';
import { configureApi, setAuthToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [jwt, setJwt] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // true while checking stored session
  const [isConnected, setIsConnected] = useState(false);
  const refreshTimer = useRef(null);

  // Start JWT refresh timer (every 20 min)
  const startRefreshTimer = useCallback(() => {
    if (refreshTimer.current) clearInterval(refreshTimer.current);
    refreshTimer.current = setInterval(async () => {
      try {
        const token = await fetchNewJWT();
        setJwt(token);
        setAuthToken(token);
        persistAuth(token, localStorage.getItem('osg_access_code') || '');
        console.log('JWT refreshed silently');
      } catch (e) {
        console.warn('JWT refresh failed:', e.message);
      }
    }, 20 * 60 * 1000);
  }, []);

  const stopRefreshTimer = useCallback(() => {
    if (refreshTimer.current) {
      clearInterval(refreshTimer.current);
      refreshTimer.current = null;
    }
  }, []);

  // Configure API client callbacks
  useEffect(() => {
    configureApi({
      onTokenExpired: async () => {
        const token = await fetchNewJWT();
        setJwt(token);
        setAuthToken(token);
        return token;
      },
      onAuthFailed: () => {
        logout();
      },
    });
  }, []);

  // Check for stored session on mount
  useEffect(() => {
    (async () => {
      const session = getStoredSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

      try {
        let token = session.jwt;
        if (session.needsRefresh) {
          token = await fetchNewJWT();
          persistAuth(token, session.accessCode);
        }
        setJwt(token);
        setAuthToken(token);
        setIsAuthenticated(true);
        setIsConnected(true);
        startRefreshTimer();
      } catch (e) {
        clearAuth();
      }
      setIsLoading(false);
    })();

    return () => stopRefreshTimer();
  }, [startRefreshTimer, stopRefreshTimer]);

  /**
   * Log in with an access code.
   * @param {string} code
   * @returns {{ success: boolean, error?: string }}
   */
  const login = useCallback(async (code) => {
    if (!validateAccessCode(code)) {
      return { success: false, error: 'Invalid access code' };
    }

    try {
      const token = await fetchNewJWT();
      setJwt(token);
      setAuthToken(token);
      persistAuth(token, code);
      setIsAuthenticated(true);
      setIsConnected(true);
      startRefreshTimer();
      return { success: true };
    } catch (e) {
      return { success: false, error: 'Connection failed — try again' };
    }
  }, [startRefreshTimer]);

  /**
   * Log out — clear everything.
   */
  const logout = useCallback(() => {
    setJwt(null);
    setAuthToken(null);
    setIsAuthenticated(false);
    setIsConnected(false);
    clearAuth();
    stopRefreshTimer();
  }, [stopRefreshTimer]);

  return (
    <AuthContext.Provider value={{ jwt, isAuthenticated, isLoading, isConnected, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
