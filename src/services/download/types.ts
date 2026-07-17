export type DownloadState =
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type DownloadContentType = 'anime' | 'lampa' | 'manga';

export interface DownloadJob {
  contentType: DownloadContentType;
  title: string;
  sourceUrl: string;
  sourceUrlCandidates?: string[];
  posterUrl?: string;
  lampaKind?: string;
  lampaId?: string;
  season?: number;
  episode?: number;
  quality?: string;
  dubbing?: string;
  isHls?: boolean;
}

export interface DownloadRecord extends DownloadJob {
  id: string;
  state: DownloadState;
  progress: number;
  bytesLoaded?: number;
  bytesTotal?: number;
  localPath?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface QueueState {
  activeId: string | null;
  records: DownloadRecord[];
}

export function isHlsSourceUrl(url: string): boolean {
  return /\.m3u8(\?|$)/i.test(url) || url.includes('application/vnd.apple.mpegurl');
}

export function isActiveDownloadState(state: DownloadState): boolean {
  return state === 'queued' || state === 'downloading';
}

export function isPausedDownloadState(state: DownloadState): boolean {
  return state === 'paused';
}

export function isCompletedDownloadState(state: DownloadState): boolean {
  return state === 'completed';
}
