import type { SavedAnimeItem } from '@/types/progress';

export interface LibraryAnimeEntry {
  id?: number;
  animeId?: number;
  status?: string;
  isFavorite?: boolean;
  lastWatchingEpisode?: number;
  anime?: Record<string, unknown>;
}

export interface LibraryLampaEntry {
  id?: number;
  lampaObjectId?: string;
  status?: string;
  isFavorite?: boolean;
  lastEpisode?: number;
  lastSeasson?: number;
  lastSeason?: number;
  lampa?: Record<string, unknown>;
}

export interface LibraryAnimePut {
  status?: string;
  isFavorite?: boolean;
}

export interface LibraryLampaPut {
  status?: string;
  isFavorite?: boolean;
}

export interface FetchLibraryOptions {
  isFavorite?: boolean;
  include?: 'anime' | 'lampa';
}

export type BookmarkEntry =
  | {
      kind: 'anime';
      id: number;
      title: string;
      poster?: string;
      subtitle: string;
      to: string;
    }
  | {
      kind: 'lampa';
      id: string;
      title: string;
      poster?: string;
      subtitle: string;
      to: string;
    };

export type { SavedAnimeItem };
