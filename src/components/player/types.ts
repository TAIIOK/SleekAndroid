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
  /** Season number when grouping episodes (Lampa / multi-season). */
  season?: number;
  /** Display episode number inside a season (defaults to list index + 1). */
  number?: number;
  /** Short title for Netflix-style cards (falls back to label). */
  title?: string;
  /** Episode still / thumbnail URL. */
  thumbnail?: string;
  /** Short synopsis for the card. */
  overview?: string;
  /** Runtime in seconds. */
  durationSec?: number;
  /** Watch progress 0–1. */
  progress?: number;
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

/** Imperative controls for episode teardown (pause before clearing src). */
export interface PlayerControlHandle {
  pause: () => void;
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
  /**
   * Filled by the player with a snapshot getter (iOS dismiss parity).
   * Call before leaving so progress flush uses the latest time + last-known duration.
   */
  playbackCaptureRef?: {
    current: (() => { currentTime: number; duration: number }) | null;
  };
  /** Filled by the player so watch screens can pause before unloading src. */
  playbackControlRef?: {
    current: PlayerControlHandle | null;
  };
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
