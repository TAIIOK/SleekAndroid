/**
 * Pure helpers for Watch Party playback sync — kept testable outside the React hook.
 */

/** Held OK / duplicate onPress must not play then immediately pause the room. */
export const PARTY_TOGGLE_GUARD_MS = 800;

export function shouldIgnorePartyToggleRepeat(lastAtMs: number, nowMs: number): boolean {
  return lastAtMs > 0 && nowMs - lastAtMs < PARTY_TOGGLE_GUARD_MS;
}

/**
 * Leader still owns heartbeat/sync, but other members' play/pause/seek must
 * apply locally — otherwise a guest resume never starts the host player.
 */
export function shouldLeaderIgnoreRemoteControl(
  isLeader: boolean,
  action: string,
  isDisconnectPause: boolean,
): boolean {
  if (!isLeader || isDisconnectPause) return false;
  if (action === "play" || action === "pause" || action === "seek") return false;
  return true;
}

export function parsePartyUpdatedAtMs(updatedAt?: string): number | undefined {
  if (!updatedAt) return undefined;
  const ms = Date.parse(updatedAt);
  return Number.isFinite(ms) ? ms : undefined;
}

/** Pause/play snapshot that is older than a control we already applied. */
export function isStalePartySnapshot(appliedAtMs: number, snapshotUpdatedAt?: string): boolean {
  if (appliedAtMs <= 0) return false;
  const ms = parsePartyUpdatedAtMs(snapshotUpdatedAt);
  if (ms == null) return false;
  return ms < appliedAtMs;
}

export function nextAppliedAnchorMs(
  prevAppliedMs: number,
  snapshotUpdatedAt?: string,
  fallbackMs?: number,
): number {
  let next = prevAppliedMs;
  const fromSnapshot = parsePartyUpdatedAtMs(snapshotUpdatedAt);
  if (fromSnapshot != null && fromSnapshot > next) next = fromSnapshot;
  if (fallbackMs != null && fallbackMs > next) next = fallbackMs;
  return next;
}

/** Leader should ignore room play snapshots only after they intentionally paused locally. */
export function shouldLeaderIgnoreRoomPlay(isLeader: boolean, localPauseIntent: boolean): boolean {
  return isLeader && localPauseIntent;
}

/** Block auto-resume / followPlayingAt only when the local user chose to pause. */
export function shouldSuppressAutoResume(localPauseIntent: boolean): boolean {
  return localPauseIntent;
}

/** Whether the resume-retry loop should attempt play for the current room state. */
export function shouldRetryRoomPlay(
  roomIsPlaying: boolean,
  localPauseIntent: boolean,
  hostIsPlaying: boolean,
): boolean {
  return roomIsPlaying && !localPauseIntent && !hostIsPlaying;
}

export interface RoomPlayTransitionInput {
  isLeader: boolean;
  localPauseIntent: boolean;
  roomIsPlaying: boolean;
  /** Previous processed snapshot — `false` means the room was paused, so this play is a resume. */
  prevIsPlaying?: boolean;
}

export interface RoomPlayTransitionResult {
  /** Apply play to the local player. */
  resume: boolean;
  /** Clear local pause intent (remote play overrides a guest pause hold). */
  clearLocalPauseIntent: boolean;
}

/**
 * Decide how to react when `party:state` flips to playing.
 * A paused→playing transition is a remote resume and must start the host
 * even if they paused locally. A still-playing snapshot after local pause
 * is treated as a stale echo.
 */
export function resolveRoomPlayTransition(input: RoomPlayTransitionInput): RoomPlayTransitionResult {
  if (!input.roomIsPlaying) {
    return { resume: false, clearLocalPauseIntent: false };
  }
  if (input.prevIsPlaying === false) {
    return { resume: true, clearLocalPauseIntent: true };
  }
  if (shouldLeaderIgnoreRoomPlay(input.isLeader, input.localPauseIntent)) {
    return { resume: false, clearLocalPauseIntent: false };
  }
  return { resume: true, clearLocalPauseIntent: true };
}
