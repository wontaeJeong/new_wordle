import { useCallback, useEffect, useState } from 'react';
import { AuthRequestError, getSession, login as requestLogin, logout as requestLogout } from '../auth/api';
import type { AuthSession, AuthUser, LoginCredentials } from '../auth/api';

type AuthStatus = 'loading' | 'anonymous' | 'authenticated';

interface AuthModel {
  status: AuthStatus;
  user: AuthUser | null;
  sessionError: string | null;
  loginError: string | null;
  isLoginPending: boolean;
  isLogoutPending: boolean;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AuthRequestError) {
    return error.message;
  }

  return fallback;
}

function applySession(session: AuthSession | null, setUser: (user: AuthUser | null) => void, setStatus: (status: AuthStatus) => void) {
  if (session) {
    setUser(session.user);
    setStatus('authenticated');
    return;
  }

  setUser(null);
  setStatus('anonymous');
}

export function useAuth(): AuthModel {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoginPending, setIsLoginPending] = useState(false);
  const [isLogoutPending, setIsLogoutPending] = useState(false);

  const refreshSession = useCallback(async () => {
    setStatus('loading');
    setSessionError(null);

    try {
      applySession(await getSession(), setUser, setStatus);
    } catch (error) {
      setUser(null);
      setStatus('anonymous');
      setSessionError(getAuthErrorMessage(error, 'Unable to verify your session.'));
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoginPending(true);
    setLoginError(null);

    try {
      const session = await requestLogin({
        username: credentials.username.trim(),
        password: credentials.password,
      });
      setSessionError(null);
      applySession(session, setUser, setStatus);
      return true;
    } catch (error) {
      setLoginError(getAuthErrorMessage(error, 'Unable to sign in.'));
      return false;
    } finally {
      setIsLoginPending(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLogoutPending(true);

    try {
      await requestLogout();
    } finally {
      setUser(null);
      setStatus('anonymous');
      setIsLogoutPending(false);
    }
  }, []);

  return {
    status,
    user,
    sessionError,
    loginError,
    isLoginPending,
    isLogoutPending,
    login,
    logout,
    refreshSession,
  };
}
