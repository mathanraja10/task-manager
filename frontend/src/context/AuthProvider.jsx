import { useCallback, useEffect, useMemo, useState } from 'react';
import { AuthContext } from './authContext';
import { authApi } from '../services/authApi';
import { setUnauthorizedHandler } from '../services/api';
import { tokenStorage } from '../utils/tokenStorage';

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => tokenStorage.get());
  const [user, setUser] = useState(null);
  // True only while a token saved by an earlier visit is being verified with /auth/me.
  const [loading, setLoading] = useState(() => Boolean(tokenStorage.get()));

  const logout = useCallback(() => {
    tokenStorage.clear();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
  }, [logout]);

  // Restore the session on page load.
  useEffect(() => {
    if (!loading) return undefined;
    let cancelled = false;
    authApi
      .me()
      .then((me) => !cancelled && setUser(me))
      .catch(() => !cancelled && logout())
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [loading, logout]);

  const startSession = useCallback(({ user: nextUser, token: nextToken }) => {
    tokenStorage.set(nextToken);
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const login = useCallback(
    async (credentials) => startSession(await authApi.login(credentials)),
    [startSession],
  );

  const register = useCallback(
    async (details) => startSession(await authApi.register(details)),
    [startSession],
  );

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      loading,
      login,
      register,
      logout,
    }),
    [user, token, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
