import { describe, expect, it } from 'vitest';

import {
  PARTY_TOGGLE_GUARD_MS,
  resolveRoomPlayTransition,
  shouldIgnorePartyToggleRepeat,
  shouldLeaderIgnoreRemoteControl,
  shouldLeaderIgnoreRoomPlay,
  shouldRetryRoomPlay,
  shouldSuppressAutoResume,
  isStalePartySnapshot,
} from '@/lib/partyPlaybackSyncLogic';

describe('shouldIgnorePartyToggleRepeat', () => {
  it('allows the first toggle', () => {
    expect(shouldIgnorePartyToggleRepeat(0, 1_000)).toBe(false);
  });

  it('blocks a second OK within the guard window', () => {
    expect(shouldIgnorePartyToggleRepeat(1_000, 1_000 + PARTY_TOGGLE_GUARD_MS - 1)).toBe(true);
  });

  it('allows a later intentional toggle', () => {
    expect(shouldIgnorePartyToggleRepeat(1_000, 1_000 + PARTY_TOGGLE_GUARD_MS)).toBe(false);
  });
});

describe('shouldLeaderIgnoreRemoteControl', () => {
  it('lets the leader apply another member play/pause/seek', () => {
    expect(shouldLeaderIgnoreRemoteControl(true, 'play', false)).toBe(false);
    expect(shouldLeaderIgnoreRemoteControl(true, 'pause', false)).toBe(false);
    expect(shouldLeaderIgnoreRemoteControl(true, 'seek', false)).toBe(false);
  });

  it('lets the leader apply disconnect pause', () => {
    expect(shouldLeaderIgnoreRemoteControl(true, 'pause', true)).toBe(false);
  });

  it('keeps leader authority for sync/rate/content', () => {
    expect(shouldLeaderIgnoreRemoteControl(true, 'sync', false)).toBe(true);
    expect(shouldLeaderIgnoreRemoteControl(true, 'rate', false)).toBe(true);
    expect(shouldLeaderIgnoreRemoteControl(true, 'content', false)).toBe(true);
  });

  it('never ignores remote controls for followers', () => {
    expect(shouldLeaderIgnoreRemoteControl(false, 'sync', false)).toBe(false);
  });
});

describe('shouldLeaderIgnoreRoomPlay', () => {
  it('blocks resume for leader with local pause intent', () => {
    expect(shouldLeaderIgnoreRoomPlay(true, true)).toBe(true);
  });

  it('allows resume for leader after a guest pause', () => {
    expect(shouldLeaderIgnoreRoomPlay(true, false)).toBe(false);
  });
});

describe('resolveRoomPlayTransition', () => {
  it('guest pause then guest play: leader resumes', () => {
    expect(
      resolveRoomPlayTransition({
        isLeader: true,
        localPauseIntent: false,
        roomIsPlaying: true,
      }),
    ).toEqual({ resume: true, clearLocalPauseIntent: true });
  });

  it('leader local pause with stale isPlaying:true stays paused', () => {
    expect(
      resolveRoomPlayTransition({
        isLeader: true,
        localPauseIntent: true,
        roomIsPlaying: true,
        prevIsPlaying: true,
      }),
    ).toEqual({ resume: false, clearLocalPauseIntent: false });
  });

  it('host pause then guest play: paused→playing resumes the host', () => {
    expect(
      resolveRoomPlayTransition({
        isLeader: true,
        localPauseIntent: true,
        roomIsPlaying: true,
        prevIsPlaying: false,
      }),
    ).toEqual({ resume: true, clearLocalPauseIntent: true });
  });
});

describe('isStalePartySnapshot', () => {
  it('drops a pause snapshot older than the play already applied', () => {
    const playAt = Date.parse('2026-08-14T20:00:05.000Z');
    expect(isStalePartySnapshot(playAt, '2026-08-14T20:00:01.000Z')).toBe(true);
    expect(isStalePartySnapshot(playAt, '2026-08-14T20:00:06.000Z')).toBe(false);
  });
});

describe('shouldRetryRoomPlay', () => {
  it('retries when the room is playing and local video is still paused', () => {
    expect(shouldRetryRoomPlay(true, false, false)).toBe(true);
    expect(shouldRetryRoomPlay(true, true, false)).toBe(false);
    expect(shouldSuppressAutoResume(false)).toBe(false);
  });
});
