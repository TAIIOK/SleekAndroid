import { useQuery } from '@tanstack/react-query';

import { fetchSavedAnimeLibrary, fetchSavedLampaLibrary } from '@/api/library';
import { useAuth } from '@/providers/AuthProvider';

export function useSavedLibrary() {
  const { isAuthenticated } = useAuth();

  const animeQuery = useQuery({
    queryKey: ['library-anime', 'include-anime'],
    queryFn: fetchSavedAnimeLibrary,
    enabled: isAuthenticated,
  });

  const lampaQuery = useQuery({
    queryKey: ['library-lampa', 'include-lampa'],
    queryFn: fetchSavedLampaLibrary,
    enabled: isAuthenticated,
  });

  return {
    savedAnime: animeQuery.data ?? [],
    savedLampa: lampaQuery.data ?? [],
    isLoading: animeQuery.isLoading || lampaQuery.isLoading,
    isError: animeQuery.isError || lampaQuery.isError,
    refetch: async () => {
      await Promise.all([animeQuery.refetch(), lampaQuery.refetch()]);
    },
  };
}
