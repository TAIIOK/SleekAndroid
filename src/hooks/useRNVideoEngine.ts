import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  OnLoadData,
  OnProgressData,
  OnVideoErrorData,
  OnBufferData,
  OnTextTracksData,
  VideoRef,
} from 'react-native-video';
import { SelectedTrackType } from 'react-native-video';

import {
  getPlayerPreferencesSync,
  loadPlayerPreferences,
  savePlayerPreferences,
  type PlayerPreferences,
  type VideoFitMode,
} from '@/lib/playerPreferences';
import { findActiveSkipPrompt, type PlayerSkipSegment } from '@/lib/playerSkip';
import {
  findPreferredSubtitleTrack,
  type SubtitleTrackInfo,
} from '@/lib/subtitleTracks';

const REBUFFER_SPINNER_DELAY_MS = 400;
const UI_TICK_MS = 1000;

function fitToResizeMode(fit: VideoFitMode): 'contain' | 'cover' | 'stretch' {
  if (fit === 'cover') return 'cover';
  if (fit === 'fill') return 'stretch';
  return 'contain';
}

function sameSubtitleTracks(a: SubtitleTrackInfo[], b: SubtitleTrackInfo[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((track, index) => {
    const other = b[index];
    return (
      track.language === other.language &&
      track.label === other.label &&
      (track.id ?? '') === (other.id ?? '')
    );
  });
}

export interface RNVideoEngineOptions {
  src: string;
  headers?: Record<string, string>;
  startTime?: number;
  startProgressFraction?: number;
  skipSegments?: PlayerSkipSegment[];
  onProgress?: (current: number, duration: number) => void;
  onEnded?: () => void;
  onAutoPlayNext?: () => void;
}

export function useRNVideoEngine({
  src,
  headers,
  startTime,
  startProgressFraction,
  skipSegments = [],
  onProgress,
  onEnded,
  onAutoPlayNext,
}: RNVideoEngineOptions) {
  const [prefs, setPrefs] = useState<PlayerPreferences>(() => getPlayerPreferencesSync());
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [visibleSkip, setVisibleSkip] = useState<PlayerSkipSegment | undefined>();
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [subtitleTracks, setSubtitleTracks] = useState<SubtitleTrackInfo[]>([]);
  const [activeSubtitle, setActiveSubtitle] = useState<SubtitleTrackInfo | null>(null);
  const [showBuffering, setShowBuffering] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [volume, setVolumeState] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const videoRef = useRef<VideoRef>(null);
  const dismissedSkipsRef = useRef(new Set<string>());
  const autoHandledSkipsRef = useRef(new Set<string>());
  const didSeekRef = useRef(false);
  const wantPlayingRef = useRef(true);
  const hasBeenReadyRef = useRef(false);
  const bufferSpinnerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUiTickRef = useRef(0);
  const resumeKeyRef = useRef('');
  const durationRef = useRef(0);
  const prefsRef = useRef(prefs);
  const skipSegmentsRef = useRef(skipSegments);
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);
  const onAutoPlayNextRef = useRef(onAutoPlayNext);
  const startTimeRef = useRef(startTime);
  const startProgressFractionRef = useRef(startProgressFraction);

  prefsRef.current = prefs;
  skipSegmentsRef.current = skipSegments;
  onProgressRef.current = onProgress;
  onEndedRef.current = onEnded;
  onAutoPlayNextRef.current = onAutoPlayNext;
  startTimeRef.current = startTime;
  startProgressFractionRef.current = startProgressFraction;

  useEffect(() => {
    void loadPlayerPreferences().then(setPrefs);
  }, []);

  useEffect(() => {
    didSeekRef.current = false;
    wantPlayingRef.current = true;
    hasBeenReadyRef.current = false;
    dismissedSkipsRef.current = new Set();
    autoHandledSkipsRef.current = new Set();
    resumeKeyRef.current = '';
    durationRef.current = 0;
    setVisibleSkip(undefined);
    setPlaybackError(null);
    setCurrentTime(0);
    setDuration(0);
    setSubtitleTracks([]);
    setActiveSubtitle(null);
    setShowBuffering(true);
    setPlaying(true);
    if (bufferSpinnerTimerRef.current) {
      clearTimeout(bufferSpinnerTimerRef.current);
      bufferSpinnerTimerRef.current = null;
    }
  }, [src, reloadKey]);

  const setBufferingUi = useCallback((isBuffering: boolean) => {
    if (bufferSpinnerTimerRef.current) {
      clearTimeout(bufferSpinnerTimerRef.current);
      bufferSpinnerTimerRef.current = null;
    }
    if (!isBuffering) {
      setShowBuffering(false);
      return;
    }
    if (!hasBeenReadyRef.current) {
      setShowBuffering(true);
      return;
    }
    bufferSpinnerTimerRef.current = setTimeout(() => {
      setShowBuffering(true);
      bufferSpinnerTimerRef.current = null;
    }, REBUFFER_SPINNER_DELAY_MS);
  }, []);

  const applyResume = useCallback((durSec: number) => {
    if (didSeekRef.current || durSec <= 0) return;
    const key = `${src}|${startTimeRef.current ?? ''}|${startProgressFractionRef.current ?? ''}`;
    if (resumeKeyRef.current === key) return;

    let target = 0;
    if (typeof startTimeRef.current === 'number' && startTimeRef.current > 0) {
      target = startTimeRef.current;
    } else if (
      typeof startProgressFractionRef.current === 'number' &&
      startProgressFractionRef.current > 0 &&
      startProgressFractionRef.current < 0.95
    ) {
      target = durSec * startProgressFractionRef.current;
    }

    if (target > 1 && target < durSec - 1) {
      videoRef.current?.seek(target);
      setCurrentTime(target);
    }
    didSeekRef.current = true;
    resumeKeyRef.current = key;
  }, [src]);

  const source = useMemo(() => {
    const uri = src?.trim();
    if (!uri) return undefined;
    const lower = uri.toLowerCase();
    const type = lower.includes('.m3u8')
      ? 'm3u8'
      : lower.includes('.mpd')
        ? 'mpd'
        : undefined;
    return {
      uri,
      ...(type ? { type } : {}),
      ...(headers && Object.keys(headers).length ? { headers } : {}),
    };
  }, [src, headers]);

  const onLoad = useCallback(
    (data: OnLoadData) => {
      const durSec = data.duration > 0 ? data.duration : 0;
      durationRef.current = durSec;
      setDuration(durSec);
      hasBeenReadyRef.current = true;
      setBufferingUi(false);
      setPlaybackError(null);
      applyResume(durSec);

      const tracks: SubtitleTrackInfo[] = (data.textTracks ?? [])
        .filter((t) => t.language || t.title || t.index != null)
        .map((t) => ({
          id: String(t.index),
          language: t.language ?? '',
          label: t.title || t.language || `Track ${t.index}`,
          isDefault: Boolean(t.selected),
        }));
      setSubtitleTracks((prev) => (sameSubtitleTracks(prev, tracks) ? prev : tracks));

      const preferred = findPreferredSubtitleTrack(
        tracks,
        prefsRef.current.preferredSubtitleLanguage,
      );
      if (preferred) setActiveSubtitle(preferred);

      if (wantPlayingRef.current) setPlaying(true);
    },
    [applyResume, setBufferingUi],
  );

  const onProgressEvent = useCallback(
    (data: OnProgressData) => {
      const timeSec = data.currentTime;
      const durSec = durationRef.current > 0 ? durationRef.current : data.seekableDuration || 0;
      onProgressRef.current?.(timeSec, durSec);

      const now = Date.now();
      if (now - lastUiTickRef.current >= UI_TICK_MS) {
        lastUiTickRef.current = now;
        setCurrentTime((prev) => (Math.abs(prev - timeSec) < 0.05 ? prev : timeSec));
        if (durSec > 0) {
          setDuration((prev) => (prev === durSec ? prev : durSec));
        }
      }

      const segments = skipSegmentsRef.current;
      const active = findActiveSkipPrompt(segments, timeSec, dismissedSkipsRef.current);
      setVisibleSkip((prev) => (prev?.id === active?.id ? prev : active));

      const currentPrefs = prefsRef.current;
      for (const segment of segments) {
        if (timeSec < segment.start || timeSec >= segment.end) continue;
        if (autoHandledSkipsRef.current.has(segment.id)) continue;
        const shouldAuto =
          (segment.type === 'opening' && currentPrefs.autoSkipOpening) ||
          (segment.type === 'ending' && currentPrefs.autoSkipEnding);
        if (!shouldAuto) continue;
        autoHandledSkipsRef.current.add(segment.id);
        dismissedSkipsRef.current.add(segment.id);
        videoRef.current?.seek(segment.end);
        setCurrentTime(segment.end);
        setVisibleSkip(undefined);
        break;
      }
    },
    [],
  );

  const onEnd = useCallback(() => {
    setPlaying(false);
    onEndedRef.current?.();
    if (prefsRef.current.autoPlayNext && onAutoPlayNextRef.current) {
      onAutoPlayNextRef.current();
    }
  }, []);

  const onError = useCallback((error: OnVideoErrorData) => {
    const message =
      error?.error?.errorString ||
      error?.error?.errorException ||
      'Не удалось воспроизвести видео';
    setPlaybackError(message);
    setShowBuffering(false);
    setPlaying(false);
  }, []);

  const onBuffer = useCallback(
    (data: OnBufferData) => {
      setBufferingUi(Boolean(data.isBuffering));
      if (!data.isBuffering) hasBeenReadyRef.current = true;
    },
    [setBufferingUi],
  );

  const onReadyForDisplay = useCallback(() => {
    hasBeenReadyRef.current = true;
    setBufferingUi(false);
  }, [setBufferingUi]);

  const onTextTracks = useCallback((data: OnTextTracksData) => {
    const tracks: SubtitleTrackInfo[] = (data.textTracks ?? []).map((t) => ({
      id: String(t.index),
      language: t.language ?? '',
      label: t.title || t.language || `Track ${t.index}`,
      isDefault: Boolean(t.selected),
    }));
    setSubtitleTracks((prev) => (sameSubtitleTracks(prev, tracks) ? prev : tracks));
  }, []);

  const updatePrefs = useCallback((patch: Partial<PlayerPreferences>) => {
    void savePlayerPreferences(patch).then(setPrefs);
  }, []);

  const togglePlay = useCallback(() => {
    setPlaying((prev) => {
      const next = !prev;
      wantPlayingRef.current = next;
      return next;
    });
  }, []);

  const pause = useCallback(() => {
    wantPlayingRef.current = false;
    setPlaying(false);
  }, []);

  const seekTo = useCallback((time: number) => {
    const dur = durationRef.current || duration;
    if (!dur) return;
    const next = Math.max(0, Math.min(time, dur));
    videoRef.current?.seek(next);
    setCurrentTime(next);
    if (wantPlayingRef.current) setPlaying(true);
  }, [duration]);

  const seekBy = useCallback(
    (delta: number) => {
      seekTo(currentTime + delta);
    },
    [seekTo, currentTime],
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
    wantPlayingRef.current = true;
    hasBeenReadyRef.current = false;
    setShowBuffering(true);
    setPlaying(true);
    setReloadKey((k) => k + 1);
  }, []);

  const setVolume = useCallback((level: number) => {
    setVolumeState(Math.max(0, Math.min(1, level)));
  }, []);

  const setSubtitleTrack = useCallback((track: SubtitleTrackInfo | null) => {
    setActiveSubtitle(track);
    void savePlayerPreferences({
      preferredSubtitleLanguage: track?.language ?? '',
    }).then(setPrefs);
  }, []);

  const selectedTextTrack = useMemo(() => {
    if (!activeSubtitle?.id) return undefined;
    return {
      type: SelectedTrackType.INDEX,
      value: Number(activeSubtitle.id),
    };
  }, [activeSubtitle]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return {
    videoRef,
    reloadKey,
    source,
    paused: !playing,
    rate: prefs.playbackRate,
    volume,
    resizeMode: fitToResizeMode(prefs.videoFit),
    selectedTextTrack,
    onLoad,
    onProgress: onProgressEvent,
    onEnd,
    onError,
    onBuffer,
    onReadyForDisplay,
    onTextTracks,
    prefs,
    updatePrefs,
    playing,
    currentTime,
    duration,
    progress,
    isLoading: showBuffering && !playbackError,
    isReady: hasBeenReadyRef.current && duration > 0,
    playbackError,
    visibleSkip,
    contentFit: prefs.videoFit,
    subtitleTracks,
    activeSubtitle,
    setSubtitleTrack,
    togglePlay,
    pause,
    seekTo,
    seekBy,
    applySkip,
    retryPlayback,
    setVolume,
    /** High-bitrate friendly ExoPlayer buffers (seconds via ms). */
    bufferConfig: {
      minBufferMs: 15000,
      maxBufferMs: 50000,
      bufferForPlaybackMs: 2500,
      bufferForPlaybackAfterRebufferMs: 5000,
    },
  };
}
