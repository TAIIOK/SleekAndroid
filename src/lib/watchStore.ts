import type { WatchHubVideoLink } from '@/services/watchHub';

export interface LampaWatchPayload {
  lampaLinks: WatchHubVideoLink[];
  lampaId: string;
  lampaKind: 'movie' | 'tv';
  lampaTitle: string;
  season?: number;
  episode?: number;
  startProgress?: number;
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
