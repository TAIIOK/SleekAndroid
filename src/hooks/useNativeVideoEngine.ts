import { useEvent, useEventListener } from 'expo';
import { useVideoPlayer, type VideoContentFit } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  getPlayerPreferencesSync,
  loadPlayerPreferences,
  savePlayerPreferences,
  type PlayerPreferences,
} from '@/lib/playerPreferences';
import { findActiveSkipPrompt, type PlayerSkipSegment } from '@/lib/playerSkip';

export interface NativeVideoEngineOptions {
  src: string;
  startTime?: number;
  startProgressFraction?: number;
  skipSegments?: PlayerSkipSegment[];
  onProgress?: (current: number, duration: number) => void;
  onEnded?: () => void;
  onAutoPlayNext?: () => void;
}

export function useNativeVideoEngine({
  src,
  startTime,
  startProgressFraction,
  skipSegments = [],
  onProgress,
  onEnded,
  onAutoPlayNext,
}: NativeVideoEngineOptions) {
  const [prefs, setPrefs] = useState<PlayerPreferences>(() => getPlayerPreferencesSync());
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [visibleSkip, setVisibleSkip] = useState<PlayerSkipSegment | undefined>();
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  const dismissedSkipsRef = useRef(new Set<string>());
  const autoHandledSkipsRef = useRef(new Set<string>());
  const didSeekRef = useRef(false);
  const prefsRef = useRef(prefs);
  const skipSegmentsRef = useRef(skipSegments);
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);
  const onAutoPlayNextRef = useRef(onAutoPlayNext);

  prefsRef.current = prefs;
  skipSegmentsRef.current = skipSegments;
  onProgressRef.current = onProgress;
  onEndedRef.current = onEnded;
  onAutoPlayNextRef.current = onAutoPlayNext;

  useEffect(() => {
    void loadPlayerPreferences().then(setPrefs);
  }, []);

  const player = useVideoPlayer(src, (instance) => {
    instance.timeUpdateEventInterval = 0.5;
    instance.playbackRate = prefsRef.current.playbackRate;
    instance.keepScreenOnWhilePlaying = true;
    instance.play();
  });

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
  const { status } = useEvent(player, 'statusChange', { status: player.status });

  const isLoading = status === 'loading' || (status === 'idle' && !playbackError);
  const isReady = status === 'readyToPlay' && player.duration > 0;

  useEffect(() => {
    didSeekRef.current = false;
    dismissedSkipsRef.current = new Set();
    autoHandledSkipsRef.current = new Set();
    setVisibleSkip(undefined);
    setPlaybackError(null);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  useEffect(() => {
    player.playbackRate = prefs.playbackRate;
  }, [player, prefs.playbackRate]);

  const resumeKeyRef = useRef<string>('');

  useEffect(() => {
    if (!isReady || player.duration <= 0) return;

    let target: number | undefined;
    if (startTime != null && startTime > 0 && startTime < player.duration) {
      target = startTime;
    } else if (
      startProgressFraction != null &&
      startProgressFraction > 0.01 &&
      startProgressFraction < 0.98
    ) {
      target = player.duration * startProgressFraction;
    }

    if (target == null || target <= 0) return;

    const resumeKey = `${src}|${startTime ?? ''}|${startProgressFraction ?? ''}|${Math.round(target)}`;
    if (didSeekRef.current && resumeKeyRef.current === resumeKey) return;

    didSeekRef.current = true;
    resumeKeyRef.current = resumeKey;
    player.currentTime = target;
    setCurrentTime(target);
  }, [isReady, startTime, startProgressFraction, player, player.duration, src]);

  useEffect(() => {
    if (status === 'error') {
      setPlaybackError('Не удалось воспроизвести видео');
    } else if (status === 'readyToPlay') {
      setPlaybackError(null);
      setDuration(player.duration || 0);
    }
  }, [status, player.duration]);

  useEventListener(player, 'timeUpdate', ({ currentTime: time }) => {
    const dur = player.duration || 0;
    setCurrentTime(time);
    setDuration(dur);
    onProgressRef.current?.(time, dur);

    const segments = skipSegmentsRef.current;
    const active = findActiveSkipPrompt(segments, time, dismissedSkipsRef.current);
    setVisibleSkip(active);

    const currentPrefs = prefsRef.current;
    for (const segment of segments) {
      if (time < segment.start || time >= segment.end) continue;
      if (autoHandledSkipsRef.current.has(segment.id)) continue;
      const shouldAuto =
        (segment.type === 'opening' && currentPrefs.autoSkipOpening) ||
        (segment.type === 'ending' && currentPrefs.autoSkipEnding);
      if (!shouldAuto) continue;
      autoHandledSkipsRef.current.add(segment.id);
      dismissedSkipsRef.current.add(segment.id);
      player.currentTime = segment.end;
      setCurrentTime(segment.end);
      setVisibleSkip(undefined);
      break;
    }
  });

  useEventListener(player, 'playToEnd', () => {
    onEndedRef.current?.();
    if (prefsRef.current.autoPlayNext && onAutoPlayNextRef.current) {
      onAutoPlayNextRef.current();
    }
  });

  const updatePrefs = useCallback((patch: Partial<PlayerPreferences>) => {
    void savePlayerPreferences(patch).then(setPrefs);
  }, []);

  const togglePlay = useCallback(() => {
    if (player.playing) player.pause();
    else player.play();
  }, [player]);

  const seekTo = useCallback(
    (time: number) => {
      const dur = player.duration || duration;
      if (!dur) return;
      const next = Math.max(0, Math.min(time, dur));
      player.currentTime = next;
      setCurrentTime(next);
    },
    [player, duration],
  );

  const seekBy = useCallback(
    (delta: number) => {
      seekTo((player.currentTime || currentTime) + delta);
    },
    [seekTo, player, currentTime],
  );

  const applySkip = useCallback(
    (segment: PlayerSkipSegment) => {
      dismissedSkipsRef.current.add(segment.id);
      seekTo(segment.end);
      setVisibleSkip(undefined);
    },
    [seekTo],
  );

  const retryPlayback = useCallback(() => {
    setPlaybackError(null);
    didSeekRef.current = false;
    try {
      player.replace(src, true);
      player.playbackRate = prefsRef.current.playbackRate;
      player.play();
    } catch {
      setPlaybackError('Не удалось воспроизвести видео');
    }
  }, [player, src]);

  const setVolume = useCallback(
    (level: number) => {
      player.volume = Math.max(0, Math.min(1, level));
    },
    [player],
  );

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const contentFit = prefs.videoFit as VideoContentFit;

  return {
    player,
    prefs,
    updatePrefs,
    playing: isPlaying,
    currentTime,
    duration,
    progress,
    isLoading: isLoading && !playbackError,
    isReady,
    playbackError,
    visibleSkip,
    contentFit,
    togglePlay,
    seekTo,
    seekBy,
    applySkip,
    retryPlayback,
    setVolume,
    volume: player.volume,
  };
}
