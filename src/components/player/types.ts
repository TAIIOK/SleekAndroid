import type { PlaybackErrorInfo } from '@/lib/playbackErrors';
import type { PlayerSkipSegment } from '@/lib/playerSkip';

export type { PlaybackErrorInfo };

export interface PlayerMenuOption {
  id: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
}

export interface PlayerEpisodeNavItem {
  id: number;
  label: string;
}

export interface PlayerEpisodeNav {
  items: PlayerEpisodeNavItem[];
  currentEpisodeId?: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious?: () => void;
  onNext?: () => void;
  onSelect?: (episodeId: number) => void;
}

export interface VideoPlayerProps {
  src: string;
  /** Optional HTTP headers for the media request (WatchHub / CDN). */
  headers?: Record<string, string>;
  title?: string;
  subtitle?: string;
  /** Absolute resume time in seconds. */
  startTime?: number;
  /** Resume as 0–1 fraction when absolute duration is unknown yet. */
  startProgressFraction?: number;
  onProgress?: (current: number, duration: number) => void;
  onEnded?: () => void;
  onAutoPlayNext?: () => void;
  /** Return true to suppress the error UI (caller is recovering, e.g. proxy fallback). */
  onPlaybackError?: (info: PlaybackErrorInfo) => boolean | void;
  skipSegments?: PlayerSkipSegment[];
  episodeNav?: PlayerEpisodeNav;
  onBack?: () => void;
  dubbingOptions?: PlayerMenuOption[];
  qualityOptions?: PlayerMenuOption[];
  connectionOptions?: PlayerMenuOption[];
  deliveryOptions?: PlayerMenuOption[];
}
