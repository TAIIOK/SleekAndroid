import type { Account, AuthResult } from '@aniverse/types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { fetchMe, login as apiLogin, logout as apiLogout } from '@/api/auth';
import { ApiError, setSubscriptionRequiredHandler, SubscriptionRequiredError } from '@/api/client';
import {
  accountFromSaved,
  bindSavedAccountTokenSync,
  getSavedAccount,
  getSavedAccountByAccessToken,
  persistCurrentAccount,
  removeSavedAccount,
  touchSavedAccount,
} from '@/lib/savedAccounts';
import { onSessionExpired } from '@/lib/sessionEvents';
import { flushProgressQueue } from '@/lib/progressQueue';
import { clearTokens, getToken, setTokens } from '@/lib/storage';
import { hydrateTokenCache, setTokenCache } from '@/lib/tokenCache';

interface AuthContextValue {
  user: Account | null;
  isAuthenticated: boolean;
  loading: boolean;
  subscriptionBlocked: boolean;
  subscriptionMessage: string | null;
  login: (loginId: string, password: string) => Promise<void>;
  logout: (options?: { removeSaved?: boolean }) => Promise<void>;
  switchAccount: (accountId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  applyAuthResult: (result: AuthResult) => Promise<void>;
  clearSubscriptionBlock: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

async function hydrateUserFromSaved(accessToken: string): Promise<Account | null> {
  const saved = await getSavedAccountByAccessToken(accessToken);
  return saved ? accountFromSaved(saved) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Account | null>(null);
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscriptionBlocked, setSubscriptionBlocked] = useState(false);
  const [subscriptionMessage, setSubscriptionMessage] = useState<string | null>(null);

  const syncAuthState = useCallback(async () => {
    setAuthenticated(!!(await getToken()));
  }, []);

  const applyAuthResult = useCallback(
    async (result: AuthResult) => {
      await setTokens(result.accessToken, result.refreshToken);
      setTokenCache(result.accessToken);
      await syncAuthState();
      const me = result.user ?? (await fetchMe());
      setUser(me);
      setAuthenticated(true);
      setSubscriptionBlocked(false);
      await persistCurrentAccount(me);
    },
    [syncAuthState],
  );

  const refreshUser = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      setAuthenticated(false);
      return;
    }
    try {
      const me = await fetchMe();
      setUser(me);
      setAuthenticated(true);
      await persistCurrentAccount(me);
    } catch (error) {
      if (isUnauthorized(error)) {
        setUser(null);
        setAuthenticated(false);
        await clearTokens();
        return;
      }
      // Network / transient errors: keep session, hydrate from cache if possible.
      setAuthenticated(true);
      const cached = await hydrateUserFromSaved(token);
      if (cached) setUser(cached);
    }
  }, []);

  useEffect(() => {
    bindSavedAccountTokenSync();
  }, []);

  useEffect(() => {
    setSubscriptionRequiredHandler((message) => {
      setSubscriptionBlocked(true);
      setSubscriptionMessage(message);
    });
    return () => setSubscriptionRequiredHandler(undefined);
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const token = await hydrateTokenCache();
        if (token) {
          await refreshUser();
          void flushProgressQueue();
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshUser]);

  useEffect(() => {
    return onSessionExpired(() => {
      setUser(null);
      setAuthenticated(false);
    });
  }, []);

  const login = useCallback(
    async (loginId: string, password: string) => {
      const result = await apiLogin(loginId, password);
      await applyAuthResult(result);
    },
    [applyAuthResult],
  );

  const logout = useCallback(
    async (options?: { removeSaved?: boolean }) => {
      const currentId = user?.id != null ? String(user.id) : null;
      await apiLogout();
      await clearTokens();
      setTokenCache(null);
      if (options?.removeSaved && currentId) {
        await removeSavedAccount(currentId);
      }
      setUser(null);
      setAuthenticated(false);
    },
    [user?.id],
  );

  const switchAccount = useCallback(
    async (accountId: string) => {
      const saved = await getSavedAccount(accountId);
      if (!saved) throw new Error('Аккаунт не найден на этом устройстве');
      await setTokens(saved.accessToken, saved.refreshToken);
      await syncAuthState();
      try {
        const me = await fetchMe();
        setUser(me);
        setAuthenticated(true);
        await persistCurrentAccount(me);
        await touchSavedAccount(accountId);
      } catch (error) {
        if (isUnauthorized(error)) {
          await removeSavedAccount(accountId);
          await clearTokens();
          setUser(null);
          setAuthenticated(false);
          throw new Error('Сессия истекла — войдите снова');
        }
        // Offline / transient: keep tokens and saved account, use cached profile.
        setUser(accountFromSaved(saved));
        setAuthenticated(true);
        await touchSavedAccount(accountId);
      }
    },
    [syncAuthState],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: authenticated,
      loading,
      subscriptionBlocked,
      subscriptionMessage,
      login,
      logout,
      switchAccount,
      refreshUser,
      applyAuthResult,
      clearSubscriptionBlock: () => {
        setSubscriptionBlocked(false);
        setSubscriptionMessage(null);
      },
    }),
    [
      user,
      authenticated,
      loading,
      subscriptionBlocked,
      subscriptionMessage,
      login,
      logout,
      switchAccount,
      refreshUser,
      applyAuthResult,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}

export function useSubscriptionGuard() {
  const { clearSubscriptionBlock } = useAuth();
  return {
    handleError: (error: unknown) => {
      if (error instanceof SubscriptionRequiredError) {
        return error.message;
      }
      return null;
    },
    clearSubscriptionBlock,
  };
}
