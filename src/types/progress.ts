export interface UserAnimeProgress {
  userId?: string;
  episodeId: number;
  animeId?: number;
  episodeOrdinal?: number;
  progress: number;
  completed: boolean;
  updatedAt?: string;
}

export interface UserLampaProgress {
  userId?: string;
  lampaId: string;
  seasonOrdinal: number;
  episodeOrdinal: number;
  progress: number;
  completed: boolean;
  updatedAt?: string;
}

export interface AnimeProgressPut {
  animeId?: number;
  episodeId: number;
  episodeOrdinal?: number;
  progress: number;
  completed?: boolean;
}

export interface LampaProgressPut {
  lampaId: string;
  seasonOrdinal?: number;
  episodeOrdinal?: number;
  progress: number;
  completed?: boolean;
}

export interface SavedAnimeItem {
  id?: number;
  animeId?: number;
  status?: string;
  title?: string;
  poster?: string;
  isFavorite?: boolean;
  lastWatchingEpisode?: number;
  anime?: Record<string, unknown>;
}
