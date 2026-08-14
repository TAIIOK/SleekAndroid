import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePartySession } from "@/providers/PartySessionProvider";
import {
  computeDrift,
  computeEffectivePlaybackTime,
  PARTY_PLAY_LATENCY_COMPENSATION_SEC,
  quantizePartyTimeSec,
  shouldHardSeek,
  shouldSoftSeek,
} from "@/lib/partySync";
import {
  resolveRoomPlayTransition,
  shouldRetryRoomPlay,
  shouldSuppressAutoResume,
  shouldLeaderIgnoreRemoteControl,
  isStalePartySnapshot,
  nextAppliedAnchorMs,
} from "@/lib/partyPlaybackSyncLogic";
import type { PartyRemoteCommand } from "@/components/player/types";

/** Leader → room heartbeat interval while playing (tighter than 5–10s for 1–3s lag). */
const LEADER_SYNC_INTERVAL_MS = 3_500;
/** Retry local play while room is playing but the video element is still paused (F5 / autoplay). */
const RESUME_RETRY_INTERVAL_MS = 1_200;

export interface PartyPlaybackHost {
  getCurrentTime: () => number;
  isPlaying: () => boolean;
  getDuration?: () => number;
}

export interface UsePartyPlaybackSyncResult {
  partyControlled: true;
  canControl: boolean;
  canPlayPause: boolean;
  canSeek: boolean;
  isLeader: boolean;
  remoteCommand?: PartyRemoteCommand;
  /** Timestamp (ms) of the last hard resync — drive a transient "Синхронизировано" hint. */
  lastResyncAt?: number;
  onPartyPlay: () => void;
  onPartyPause: () => void;
  onPartySeek: (time: number) => void;
}

/**
 * Bridges `PartySessionProvider` realtime events with a video element via
 * `VideoPlayer`'s `partyRemoteCommand` / `onPartyPlay|Pause|Seek` props.
 *
 * - The leader is authoritative while locally synced with room intent.
 * - After F5/rejoin, a paused leader must catch up to room `isPlaying` instead of
 *   staying paused while guests continue.
 * - Intentional local pause must suppress catch-up/retry until the user plays again
 *   (otherwise a stale `isPlaying: true` state briefly restarts the host video).
 * - Followers apply control actions immediately and reconcile heartbeats
 *   ("sync" / `party:state`) using soft/hard drift thresholds.
 */
export function usePartyPlaybackSync(host: PartyPlaybackHost): UsePartyPlaybackSyncResult {
  const session = usePartySession();
  const { permissions, state, lastControlEvent, currentUserId, sendControl } = session;
  const isLeader = permissions.isLeader;
  const canPlayPause = permissions.canPlayPause;
  const canSeek = permissions.canSeek;
  const canControl = canPlayPause || canSeek;

  const seqRef = useRef(0);
  const [remoteCommand, setRemoteCommand] = useState<PartyRemoteCommand | undefined>();
  const [lastResyncAt, setLastResyncAt] = useState<number | undefined>();
  const processedControlRef = useRef<typeof lastControlEvent>(undefined);
  const processedStateRef = useRef<typeof state>(undefined);
  const hasSyncedOnceRef = useRef(false);
  /** Local video is paused but room wants playing — waiting for autoplay/user gesture. */
  const awaitingPlayRef = useRef(false);
  /** Current user explicitly paused — do not auto-resume until they play again. */
  const localPauseIntentRef = useRef(false);
  /** Server `updatedAt` of the last play/pause we applied — drop older snapshots. */
  const lastAppliedAnchorMsRef = useRef(0);

  const bumpAppliedAnchor = useCallback((updatedAt?: string, fallbackMs?: number) => {
    lastAppliedAnchorMsRef.current = nextAppliedAnchorMs(
      lastAppliedAnchorMsRef.current,
      updatedAt,
      fallbackMs,
    );
  }, []);

  const emitRemote = useCallback((patch: Omit<PartyRemoteCommand, "seq">) => {
    seqRef.current += 1;
    const next = { seq: seqRef.current, ...patch };
    if (typeof next.time === "number") {
      next.time = quantizePartyTimeSec(next.time);
    }
    setRemoteCommand(next);
  }, []);

  useEffect(() => {
    if (host.isPlaying()) {
      awaitingPlayRef.current = false;
    }
  }, [host, remoteCommand, state, lastControlEvent]);

  const reconcileTime = useCallback(
    (remoteTimeSec: number, hard = false) => {
      // Never soft-scrub a paused follower — progress would crawl with the host.
      if (!host.isPlaying() && !hard) return;
      const drift = computeDrift(host.getCurrentTime(), remoteTimeSec);
      if (hard || shouldHardSeek(drift)) {
        emitRemote({ time: remoteTimeSec });
        setLastResyncAt(Date.now());
      } else if (shouldSoftSeek(drift)) {
        emitRemote({ time: remoteTimeSec });
      }
    },
    [host, emitRemote],
  );

  /** Resume + optional snap. Avoids repeated seeks while still paused. */
  const followPlayingAt = useCallback(
    (timeSec: number, { snap }: { snap: boolean }) => {
      if (shouldSuppressAutoResume(localPauseIntentRef.current)) return;
      if (!host.isPlaying()) {
        if (snap || !awaitingPlayRef.current) {
          awaitingPlayRef.current = true;
          emitRemote({ time: timeSec, isPlaying: true });
          if (snap) setLastResyncAt(Date.now());
        } else {
          // Already snapped once; only retry play so the timeline stays put.
          emitRemote({ isPlaying: true });
        }
        return;
      }
      reconcileTime(timeSec, snap);
    },
    [host, emitRemote, reconcileTime],
  );

  /** Resolve play/sync anchor: prefer payload+updatedAt projection, else room state. */
  const resolveFollowTime = useCallback(
    (data?: { time?: number; updatedAt?: string; playbackRate?: number }, playing = true) => {
      if (typeof data?.time === "number") {
        return computeEffectivePlaybackTime(
          {
            isPlaying: playing,
            playbackTimeSec: data.time,
            playbackRate: data.playbackRate && data.playbackRate > 0 ? data.playbackRate : 1,
            updatedAt: data.updatedAt,
          },
          Date.now(),
        );
      }
      if (state) {
        return computeEffectivePlaybackTime(
          {
            isPlaying: playing,
            playbackTimeSec: state.playbackTimeSec,
            playbackRate: state.playbackRate,
            updatedAt: state.updatedAt,
          },
          Date.now(),
        );
      }
      return undefined;
    },
    [state],
  );

  // Direct control actions (play / pause / seek / rate) from the leader or a controlling guest.
  useEffect(() => {
    if (!lastControlEvent || lastControlEvent === processedControlRef.current) return;
    processedControlRef.current = lastControlEvent;
    if (currentUserId && lastControlEvent.from === currentUserId) return;

    const { action, data } = lastControlEvent;
    const disconnectPause =
      action === "pause" &&
      (data?.reason === "host_disconnect" || data?.reason === "member_disconnect");
    if (shouldLeaderIgnoreRemoteControl(isLeader, action, disconnectPause)) return;

    if (action === "play") {
      localPauseIntentRef.current = false;
      bumpAppliedAnchor(data?.updatedAt, Date.now());
      const base = resolveFollowTime(data, true);
      if (base != null) {
        followPlayingAt(base + PARTY_PLAY_LATENCY_COMPENSATION_SEC, { snap: true });
      } else {
        awaitingPlayRef.current = !host.isPlaying();
        emitRemote({ isPlaying: true });
      }
    } else if (action === "pause") {
      awaitingPlayRef.current = false;
      bumpAppliedAnchor(data?.updatedAt, Date.now());
      const t = resolveFollowTime(data, false);
      if (t != null) emitRemote({ time: t, isPlaying: false });
      else emitRemote({ isPlaying: false });
    } else if (action === "seek" && data?.time != null) {
      emitRemote({ time: data.time });
      setLastResyncAt(Date.now());
    } else if (action === "sync" && data?.time != null) {
      const t = resolveFollowTime(data, true) ?? data.time;
      followPlayingAt(t, { snap: false });
    }
  }, [
    lastControlEvent,
    isLeader,
    currentUserId,
    emitRemote,
    followPlayingAt,
    host,
    resolveFollowTime,
    bumpAppliedAnchor,
  ]);

  // Room state snapshots (on join / periodic `party:state`).
  useEffect(() => {
    if (!state || state === processedStateRef.current) return;
    const prev = processedStateRef.current;
    processedStateRef.current = state;

    if (isStalePartySnapshot(lastAppliedAnchorMsRef.current, state.updatedAt)) {
      return;
    }

    const effective = computeEffectivePlaybackTime(state);
    const firstSync = !hasSyncedOnceRef.current;
    const transition = resolveRoomPlayTransition({
      isLeader,
      localPauseIntent: localPauseIntentRef.current,
      roomIsPlaying: state.isPlaying,
      prevIsPlaying: prev?.isPlaying,
    });
    // After F5 the leader is paused locally while the room is still playing —
    // must catch up instead of ignoring state as "authoritative".
    // Skip catch-up when the user just paused (stale isPlaying:true still in flight),
    // but honor paused→playing (guest resumed after the host paused).
    const leaderNeedsCatchUp =
      isLeader &&
      state.isPlaying &&
      !host.isPlaying() &&
      (!localPauseIntentRef.current || transition.resume);
    // Disconnect policy (and any server pause) must stop the leader too.
    const leaderNeedsPause = isLeader && !state.isPlaying && host.isPlaying();
    if (!(firstSync || !isLeader || leaderNeedsCatchUp || leaderNeedsPause)) return;

    hasSyncedOnceRef.current = true;
    bumpAppliedAnchor(state.updatedAt);

    if (state.isPlaying) {
      if (!transition.resume) return;
      if (transition.clearLocalPauseIntent) {
        localPauseIntentRef.current = false;
      }
      const snap = firstSync || leaderNeedsCatchUp;
      const target = snap ? effective + PARTY_PLAY_LATENCY_COMPENSATION_SEC : effective;
      followPlayingAt(target, { snap });
    } else {
      awaitingPlayRef.current = false;
      emitRemote({ time: effective, isPlaying: false });
      if (firstSync) setLastResyncAt(Date.now());
    }
  }, [state, isLeader, followPlayingAt, emitRemote, host, bumpAppliedAnchor]);

  // Keep retrying play while the room is playing but the local element is still paused
  // (browser autoplay block, late media ready after refresh) — never after intentional pause.
  useEffect(() => {
    if (!state?.isPlaying) return;
    const tick = () => {
      if (
        !shouldRetryRoomPlay(state.isPlaying, localPauseIntentRef.current, host.isPlaying())
      ) {
        return;
      }
      const effective = computeEffectivePlaybackTime(state);
      followPlayingAt(effective + PARTY_PLAY_LATENCY_COMPENSATION_SEC, { snap: false });
    };
    const interval = setInterval(tick, RESUME_RETRY_INTERVAL_MS);
    tick();
    return () => clearInterval(interval);
  }, [state, host, followPlayingAt]);

  /** Prefer room anchor when local player is still at ~0 after re-open (seek not applied yet). */
  const authoritativeLocalTime = useCallback(() => {
    const local = host.getCurrentTime();
    if (!state) return local;
    const roomTime = computeEffectivePlaybackTime(state);
    if (local < 1 && roomTime > local + 2) return roomTime;
    return local;
  }, [host, state]);

  const controlPayload = useCallback(
    (time: number) => {
      const duration = host.getDuration?.() ?? 0;
      const payload: { time: number; duration?: number } = {
        time: quantizePartyTimeSec(time),
      };
      if (duration > 0) payload.duration = quantizePartyTimeSec(duration);
      return payload;
    },
    [host],
  );

  // Leader heartbeat — broadcast current position while playing.
  useEffect(() => {
    if (!isLeader) return;
    const interval = setInterval(() => {
      if (!host.isPlaying()) return;
      sendControl("sync", controlPayload(authoritativeLocalTime()));
    }, LEADER_SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isLeader, host, sendControl, authoritativeLocalTime, controlPayload]);

  const onPartyPlay = useCallback(() => {
    localPauseIntentRef.current = false;
    bumpAppliedAnchor(undefined, Date.now());
    const payload = controlPayload(authoritativeLocalTime());
    emitRemote({ time: payload.time, isPlaying: true });
    sendControl("play", payload);
  }, [sendControl, authoritativeLocalTime, emitRemote, controlPayload, bumpAppliedAnchor]);

  const onPartyPause = useCallback(() => {
    // Hold pause immediately so catch-up/retry cannot restart local playback
    // while the pause control is still in flight (stale room isPlaying:true).
    localPauseIntentRef.current = true;
    awaitingPlayRef.current = false;
    bumpAppliedAnchor(undefined, Date.now());
    if (processedStateRef.current) {
      processedStateRef.current = { ...processedStateRef.current, isPlaying: false };
    }
    const payload = controlPayload(authoritativeLocalTime());
    emitRemote({ time: payload.time, isPlaying: false });
    sendControl("pause", payload);
  }, [sendControl, authoritativeLocalTime, emitRemote, controlPayload, bumpAppliedAnchor]);

  const onPartySeek = useCallback(
    (time: number) => {
      sendControl("seek", controlPayload(time));
    },
    [sendControl, controlPayload],
  );

  return useMemo(
    () => ({
      partyControlled: true as const,
      canControl,
      canPlayPause,
      canSeek,
      isLeader,
      remoteCommand,
      lastResyncAt,
      onPartyPlay,
      onPartyPause,
      onPartySeek,
    }),
    [
      canControl,
      canPlayPause,
      canSeek,
      isLeader,
      remoteCommand,
      lastResyncAt,
      onPartyPlay,
      onPartyPause,
      onPartySeek,
    ],
  );
}
