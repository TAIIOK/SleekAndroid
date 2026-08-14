export interface CatalogHomeConfigRemote {
  config: Record<string, unknown> | null;
  updatedAt?: string;
  /** GET failed — keep local cache, do not push it to the server. */
  unavailable?: boolean;
}

function coerceConfigObject(value: unknown): Record<string, unknown> | null {
  if (value == null) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
    return null;
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

export function looksLikeHomeConfig(value: Record<string, unknown>): boolean {
  return (
    'enabledContentTypes' in value ||
    'enabledAnimeShowcases' in value ||
    'enabledLampaSections' in value ||
    'enabledAnimeCustomSections' in value ||
    'configured' in value ||
    'homeSectionOrder' in value
  );
}

/**
 * Pulls `catalogHomeConfig` out of the API envelope.
 * Handles `{ data, meta }`, a JSON-string `data` (gin RawMessage), and an already-unwrapped object.
 */
export function extractRemoteHomeConfig(json: unknown): CatalogHomeConfigRemote {
  if (!json || typeof json !== 'object' || Array.isArray(json)) {
    return { config: null };
  }

  const root = json as Record<string, unknown>;
  const meta =
    root.meta && typeof root.meta === 'object' && !Array.isArray(root.meta)
      ? (root.meta as { updatedAt?: unknown })
      : undefined;
  const updatedAt = typeof meta?.updatedAt === 'string' ? meta.updatedAt : undefined;

  const candidates = [root.data, root];
  for (const candidate of candidates) {
    const parsed = coerceConfigObject(candidate);
    if (!parsed) continue;

    if ('data' in parsed && !looksLikeHomeConfig(parsed)) {
      const nested = coerceConfigObject(parsed.data);
      if (nested && looksLikeHomeConfig(nested)) {
        return { config: nested, updatedAt };
      }
    }

    if (looksLikeHomeConfig(parsed)) {
      return { config: parsed, updatedAt };
    }
  }

  return { config: null, updatedAt };
}
