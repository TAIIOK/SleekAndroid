import { lampaDetailPath, lampaTitle } from '@/lib/lampaDetail';
import { animePoster } from '@/lib/poster';
import type { BookmarkEntry, LibraryAnimeEntry, LibraryLampaEntry } from '@/types/library';

function resolveAnimeListTitle(anime?: Record<string, unknown>): string | undefined {
  if (!anime) return undefined;
  for (const key of ['title', 'alternativeTitle', 'titleEn', 'name']) {
    const value = anime[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function lampaPoster(item: Record<string, unknown>): string | undefined {
  for (const key of ['poster', 'poster_path', 'posterPath']) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

export function mapFavoriteAnimeToBookmark(entry: LibraryAnimeEntry): BookmarkEntry | null {
  if (!entry.isFavorite || entry.animeId == null) return null;
  const anime = entry.anime;
  const title = resolveAnimeListTitle(anime) ?? 'Аниме';
  const poster = anime ? animePoster(anime) : undefined;
  return {
    kind: 'anime',
    id: entry.animeId,
    title,
    poster,
    subtitle: 'Аниме',
    to: `/anime/${entry.animeId}`,
  };
}

export function mapFavoriteLampaToBookmark(entry: LibraryLampaEntry): BookmarkEntry | null {
  if (!entry.isFavorite || !entry.lampaObjectId) return null;
  const lampaRaw = entry.lampa;
  const lampaItem = (lampaRaw ?? { objectId: entry.lampaObjectId }) as Record<string, unknown>;
  const kind = String(lampaItem.kind ?? lampaRaw?.kind ?? 'movie');
  return {
    kind: 'lampa',
    id: entry.lampaObjectId,
    title: lampaTitle(lampaItem),
    poster: lampaPoster(lampaItem),
    subtitle: kind === 'tv' || kind === 'home' ? 'Сериал' : 'Фильм',
    to: lampaDetailPath(kind, lampaItem),
  };
}

export function mergeFavoriteBookmarks(
  animeRows: LibraryAnimeEntry[],
  lampaRows: LibraryLampaEntry[],
): BookmarkEntry[] {
  const anime = animeRows
    .map(mapFavoriteAnimeToBookmark)
    .filter((item): item is BookmarkEntry => item != null);
  const lampa = lampaRows
    .map(mapFavoriteLampaToBookmark)
    .filter((item): item is BookmarkEntry => item != null);
  return [...anime, ...lampa];
}
