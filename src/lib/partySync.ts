import type { PartyRoomState } from "@/types/party";

/** Below this drift (seconds) we do nothing — playback is close enough. */
export const PARTY_SOFT_DRIFT_SEC = 0.35;
/** Above this drift (seconds) we hard-seek and show a "resynced" hint. */
export const PARTY_HARD_DRIFT_SEC = 1.25;

/**
 * Extra lead applied when a follower starts playing from a remote `play` event.
 * Compensates host→server→guest one-way delay so the guest does not start 1–3s behind.
 */
export const PARTY_PLAY_LATENCY_COMPENSATION_SEC = 0.35;

/** Quantize playback time to milliseconds for stable wire/DB sync. */
export function quantizePartyTimeSec(timeSec: number): number {
  if (!Number.isFinite(timeSec) || timeSec < 0) return 0;
  return Math.round(timeSec * 1000) / 1000;
}

/** How long (ms) a just-applied remote command suppresses local echo re-emission. */
export const PARTY_ECHO_GUARD_MS = 500;

/**
 * Effective playback position accounting for time elapsed since the server
 * last recorded state (mirrors the backend's `effective playback time` rule).
 */
export function computeEffectivePlaybackTime(
  state: Pick<PartyRoomState, "isPlaying" | "playbackTimeSec" | "playbackRate" | "updatedAt">,
  nowMs: number = Date.now(),
): number {
  const rate = state.playbackRate > 0 ? state.playbackRate : 1;
  if (!state.isPlaying) return state.playbackTimeSec;
  const updatedAtMs = state.updatedAt ? new Date(state.updatedAt).getTime() : nowMs;
  if (!Number.isFinite(updatedAtMs)) return state.playbackTimeSec;
  const elapsedSec = Math.max(0, (nowMs - updatedAtMs) / 1000);
  return state.playbackTimeSec + elapsedSec * rate;
}

/** Signed drift: positive means local playback is behind the remote/effective time. */
export function computeDrift(localTimeSec: number, remoteTimeSec: number): number {
  return remoteTimeSec - localTimeSec;
}

export function shouldSoftSeek(driftSec: number): boolean {
  const abs = Math.abs(driftSec);
  return abs > PARTY_SOFT_DRIFT_SEC && abs <= PARTY_HARD_DRIFT_SEC;
}

export function shouldHardSeek(driftSec: number): boolean {
  return Math.abs(driftSec) > PARTY_HARD_DRIFT_SEC;
}

export interface RemoteGuardState {
  /** Highest applied remote sequence number (monotonic per room). */
  lastAppliedSeq: number;
  /** Local-action echo emission is suppressed until this timestamp (ms epoch). */
  suppressUntilMs: number;
}

export function createRemoteGuardState(): RemoteGuardState {
  return { lastAppliedSeq: -1, suppressUntilMs: 0 };
}

export interface RemoteGuardResult {
  /** Whether the incoming remote command/state should be applied to the player. */
  apply: boolean;
  next: RemoteGuardState;
}

/**
 * Decides whether an incoming remote command (identified by a monotonically
 * increasing `seq`) should be applied, and marks a short window during which
 * locally-observed player events must not be re-broadcast (echo guard).
 */
export function applyRemoteGuard(
  prev: RemoteGuardState,
  seq: number,
  nowMs: number = Date.now(),
  suppressMs: number = PARTY_ECHO_GUARD_MS,
): RemoteGuardResult {
  if (seq <= prev.lastAppliedSeq) {
    return { apply: false, next: prev };
  }
  return {
    apply: true,
    next: { lastAppliedSeq: seq, suppressUntilMs: nowMs + suppressMs },
  };
}

/** Whether a local player action right now should be suppressed (it's an echo of a remote apply). */
export function isEchoSuppressed(guard: RemoteGuardState, nowMs: number = Date.now()): boolean {
  return nowMs < guard.suppressUntilMs;
}
