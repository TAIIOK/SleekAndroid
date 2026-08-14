import type { QueryClient } from '@tanstack/react-query';

/** Query families used on the home screen (phone + TV). */
const HOME_QUERY_KEYS = [
  ['catalog-root'],
  ['lampa-categories'],
  ['anime-categories'],
  ['library-anime'],
  ['library-lampa'],
  ['history'],
  ['library-favorites'],
  ['collections'],
  ['anime-progress'],
  ['lampa-progress'],
  ['history-feed'],
  ['lampa-sections'],
  ['anime-recommendations-feed'],
  ['anime-list'],
  ['lampa-items'],
  ['episode-ordinal'],
  ['party-room'],
] as const;

export async function refreshHomeQueries(queryClient: QueryClient): Promise<void> {
  await Promise.all(
    HOME_QUERY_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}
