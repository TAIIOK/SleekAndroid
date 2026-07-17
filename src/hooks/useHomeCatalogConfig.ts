import { useCallback, useEffect, useRef, useState } from 'react';

import { request } from '@/api/client';
import { useAuth } from '@/providers/AuthProvider';
import {
  getHomeConfigUpdatedAt,
  isHomeConfigConfigured,
  loadHomeConfig,
  normalizeHomeConfig,
  saveHomeConfig,
  subscribeHomeConfig,
} from '@/lib/homeSettings';
import { EMPTY_HOME_CONFIG, type CatalogHomeConfig } from '@/types/homeConfig';

export interface CatalogHomeConfigRemote {
  config: Record<string, unknown> | null;
  updatedAt?: string;
}

export async function fetchCatalogHomeConfig(): Promise<CatalogHomeConfigRemote> {
  try {
    const json = await request<{
      data?: Record<string, unknown> | null;
      meta?: { updatedAt?: string };
    }>('/api/user/catalogHomeConfig');
    return {
      config: json.data ?? null,
      updatedAt: json.meta?.updatedAt,
    };
  } catch {
    return { config: null };
  }
}

export async function saveCatalogHomeConfig(
  config: Record<string, unknown>,
): Promise<Record<string, unknown> | null> {
  try {
    const json = await request<{ data?: Record<string, unknown> }>('/api/user/catalogHomeConfig', {
      method: 'PUT',
      body: JSON.stringify(config),
    });
    return json.data ?? null;
  } catch {
    return null;
  }
}

function parseRemoteUpdatedAt(value?: string): number {
  if (!value) return 0;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
}

export function useHomeCatalogConfig() {
  const { isAuthenticated } = useAuth();
  const [config, setConfig] = useState<CatalogHomeConfig>(EMPTY_HOME_CONFIG);
  const [ready, setReady] = useState(false);
  const syncInFlight = useRef(false);

  const refreshLocal = useCallback(async () => {
    const next = await loadHomeConfig();
    setConfig(next);
    setReady(true);
  }, []);

  useEffect(() => {
    void refreshLocal();
    return subscribeHomeConfig(() => {
      void refreshLocal();
    });
  }, [refreshLocal]);

  const syncFromServer = useCallback(async () => {
    if (!isAuthenticated || syncInFlight.current) return;
    syncInFlight.current = true;
    try {
      const remote = await fetchCatalogHomeConfig();
      const local = await loadHomeConfig();
      const localConfigured = isHomeConfigConfigured(local);
      const localUpdatedAt = await getHomeConfigUpdatedAt();

      if (remote.config && Object.keys(remote.config).length > 0) {
        const remoteNorm = normalizeHomeConfig(remote.config as Partial<CatalogHomeConfig>, {
          fromServer: true,
        });
        const remoteUpdatedAt = parseRemoteUpdatedAt(remote.updatedAt);

        if (localConfigured && !remoteNorm.configured) {
          await saveCatalogHomeConfig(local as unknown as Record<string, unknown>);
          setConfig(local);
          return;
        }

        if (localConfigured && remoteNorm.configured && localUpdatedAt > remoteUpdatedAt) {
          await saveCatalogHomeConfig(local as unknown as Record<string, unknown>);
          setConfig(local);
          return;
        }

        await saveHomeConfig(remoteNorm);
        setConfig(remoteNorm);
        return;
      }

      if (localConfigured) {
        await saveCatalogHomeConfig(local as unknown as Record<string, unknown>);
      }
    } finally {
      syncInFlight.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && ready) {
      void syncFromServer();
    }
  }, [isAuthenticated, ready, syncFromServer]);

  const persist = useCallback(
    async (next: CatalogHomeConfig) => {
      const normalized = normalizeHomeConfig({ ...next, configured: true });
      await saveHomeConfig(normalized);
      setConfig(normalized);
      if (isAuthenticated) {
        await saveCatalogHomeConfig(normalized as unknown as Record<string, unknown>);
      }
    },
    [isAuthenticated],
  );

  return { config, setConfig, persist, ready };
}
