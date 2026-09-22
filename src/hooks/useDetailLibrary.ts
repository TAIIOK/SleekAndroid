import { useQuery } from '@tanstack/react-query';

import {
  fetchAnimeLibraryStatus,
  fetchLampaLibraryStatus,
  fetchSavedAnimeLibrary,
  fetchSavedLampaLibrary,
} from '@/api/library';
import type { SavedAnimeItem } from '@/types/progress';

/**
 * Detail screens need one library row (status, favorite, last episode).
 * Prefer a cache already filled by Continue Watching or My Lists.
 * A cold cache fetches status rows without embedded anime/lampa objects.
 */
export function useDetailAnimeLibrary(enabled: boolean): SavedAnimeItem[] {
  const includeCache = useQuery({
    queryKey: ['library-anime', 'include-anime'],
    queryFn: fetchSavedAnimeLibrary,
    enabled: false,
  });
  const legacyCache = useQuery({
    queryKey: ['library-anime'],
    queryFn: fetchSavedAnimeLibrary,
    enabled: false,
  });
  const cached = includeCache.data ?? legacyCache.data;
  const light = useQuery({
    queryKey: ['library-anime', 'status-only'],
    queryFn: fetchAnimeLibraryStatus,
    enabled: enabled && cached == null,
    staleTime: 60_000,
    refetchOnMount: false,
  });
  return cached ?? light.data ?? [];
}

export function useDetailLampaLibrary(enabled: boolean): unknown[] {
  const includeCache = useQuery({
    queryKey: ['library-lampa', 'include-lampa'],
    queryFn: fetchSavedLampaLibrary,
    enabled: false,
  });
  const light = useQuery({
    queryKey: ['library-lampa', 'status-only'],
    queryFn: fetchLampaLibraryStatus,
    enabled: enabled && includeCache.data == null,
    staleTime: 60_000,
    refetchOnMount: false,
  });
  return includeCache.data ?? light.data ?? [];
}
