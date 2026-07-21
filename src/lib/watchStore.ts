import type { WatchHubSeasonEpisodes, WatchHubVideoLink } from '@/services/watchHub';

export interface LampaWatchPayload {
  lampaLinks: WatchHubVideoLink[];
  lampaId: string;
  lampaKind: 'movie' | 'tv';
  lampaTitle: string;
  season?: number;
  episode?: number;
  startProgress?: number;
  /** WatchHub session — required for in-player episode switching on serials. */
  taskId?: string;
  sourceId?: string;
  translatorId?: number;
  seasons?: WatchHubSeasonEpisodes[];
}

/** Encode season+episode into a single id for PlayerEpisodeNav. */
export function lampaEpisodeNavId(season: number, episode: number): number {
  return season * 10_000 + episode;
}

export function parseLampaEpisodeNavId(id: number): { season: number; episode: number } {
  const season = Math.floor(id / 10_000);
  const episode = id % 10_000;
  return { season, episode };
}

let pendingLampaWatch: LampaWatchPayload | null = null;

export function setLampaWatchPayload(payload: LampaWatchPayload): void {
  pendingLampaWatch = payload;
}

export function consumeLampaWatchPayload(): LampaWatchPayload | null {
  const payload = pendingLampaWatch;
  pendingLampaWatch = null;
  return payload;
}
