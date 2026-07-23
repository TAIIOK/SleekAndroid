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
import {
  findActiveSkipPrompt,
  isEndingLikeSkip,
  isOpeningLikeSkip,
  type PlayerSkipSegment,
} from '@/lib/playerSkip';
import { toPlaybackErrorInfo, type PlaybackErrorInfo } from '@/lib/playbackErrors';
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
  /** Return true if the caller handled recovery (e.g. switched URL); error UI is skipped. */
  onPlaybackError?: (info: PlaybackErrorInfo) => boolean | void;
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
  onPlaybackError,
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
  /** Skip CTA only after loader is gone and we have a trusted playback position. */
  const [skipUiUnlocked, setSkipUiUnlocked] = useState(false);

  const videoRef = useRef<VideoRef>(null);
  const dismissedSkipsRef = useRef(new Set<string>());
  const autoHandledSkipsRef = useRef(new Set<string>());
  const wantPlayingRef = useRef(true);
  const hasBeenReadyRef = useRef(false);
  const showBufferingRef = useRef(true);
  const bufferSpinnerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUiTickRef = useRef(0);
  /** Last applied resume key (`src|time|fraction`). */
  const resumeKeyRef = useRef('');
  /** True after resume intent for current key was handled (seek or confirmed start-from-zero). */
  const resumeSettledRef = useRef(false);
  /** After resume seek, ignore stale progress timestamps until playback catches up. */
  const resumeTargetRef = useRef<number | null>(null);
  const durationRef = useRef(0);
  const currentTimeRef = useRef(0);
  /** True once onLoad reported a positive media duration (not HLS buffer window). */
  const durationFromLoadRef = useRef(false);
  const prefsRef = useRef(prefs);
  const skipSegmentsRef = useRef(skipSegments);
  const onProgressRef = useRef(onProgress);
  const onEndedRef = useRef(onEnded);
  const onAutoPlayNextRef = useRef(onAutoPlayNext);
  const onPlaybackErrorRef = useRef(onPlaybackError);
  const startTimeRef = useRef(startTime);
  const startProgressFractionRef = useRef(startProgressFraction);
  const srcRef = useRef(src);

  prefsRef.current = prefs;
  skipSegmentsRef.current = skipSegments;
  onProgressRef.current = onProgress;
  onEndedRef.current = onEnded;
  onAutoPlayNextRef.current = onAutoPlayNext;
  onPlaybackErrorRef.current = onPlaybackError;
  startTimeRef.current = startTime;
  startProgressFractionRef.current = startProgressFraction;
  srcRef.current = src;

  const resumeIntentTarget = useCallback((durSec: number): number | null => {
    if (typeof startTimeRef.current === 'number' && startTimeRef.current > 1) {
      return startTimeRef.current;
    }
    if (
      typeof startProgressFractionRef.current === 'number' &&
      startProgressFractionRef.current > 0.01 &&
      startProgressFractionRef.current < 0.95 &&
      durSec > 1
    ) {
      return durSec * startProgressFractionRef.current;
    }
    return null;
  }, []);

  const positionReadyForSkip = useCallback((timeSec: number): boolean => {
    if (!resumeSettledRef.current) return false;
    if (!hasBeenReadyRef.current) return false;
    if (showBufferingRef.current) return false;
    const resumeTarget = resumeTargetRef.current;
    // Exo may keep emitting pre-seek timestamps briefly after seek().
    // Do not trust optimistic UI time — only real progress past the resume point.
    if (resumeTarget != null && timeSec + 1.5 < resumeTarget) return false;
    return true;
  }, []);

  const refreshSkipPrompt = useCallback(
    (timeSec: number) => {
      if (!positionReadyForSkip(timeSec)) {
        setVisibleSkip(undefined);
        setSkipUiUnlocked(false);
        return;
      }

      const resumeTarget = resumeTargetRef.current;
      if (resumeTarget != null && timeSec + 1.5 >= resumeTarget) {
        resumeTargetRef.current = null;
      }

      setSkipUiUnlocked(true);
      const active = findActiveSkipPrompt(
        skipSegmentsRef.current,
        timeSec,
        dismissedSkipsRef.current,
      );
      setVisibleSkip(active);
    },
    [positionReadyForSkip],
  );

  const applyResume = useCallback(
    (durSec: number) => {
      if (!(durSec > 1)) return;

      const key = `${srcRef.current}|${startTimeRef.current ?? ''}|${startProgressFractionRef.current ?? ''}`;
      if (resumeKeyRef.current === key && resumeSettledRef.current) return;

      const target = resumeIntentTarget(durSec);
      if (target != null && target > 1 && target < durSec - 1) {
        resumeTargetRef.current = target;
        videoRef.current?.seek(target);
        // Keep UI near target, but leave currentTimeRef until onProgress confirms
        // so skip is not unlocked on a synthetic clock.
        setCurrentTime(target);
      } else {
        resumeTargetRef.current = null;
      }

      resumeKeyRef.current = key;
      resumeSettledRef.current = true;
      // Never evaluate skip here — wait for real progress after loader/position settle.
      setVisibleSkip(undefined);
      setSkipUiUnlocked(false);
    },
    [resumeIntentTarget],
  );

  useEffect(() => {
    void loadPlayerPreferences().then(setPrefs);
  }, []);

  useEffect(() => {
    dismissedSkipsRef.current = new Set();
    autoHandledSkipsRef.current = new Set();
    refreshSkipPrompt(currentTimeRef.current);
  }, [skipSegments, refreshSkipPrompt]);

  useEffect(() => {
    wantPlayingRef.current = true;
    hasBeenReadyRef.current = false;
    dismissedSkipsRef.current = new Set();
    autoHandledSkipsRef.current = new Set();
    resumeKeyRef.current = '';
    resumeSettledRef.current = false;
    resumeTargetRef.current = null;
    durationRef.current = 0;
    durationFromLoadRef.current = false;
    currentTimeRef.current = 0;
    showBufferingRef.current = true;
    setSkipUiUnlocked(false);
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

  // Resume props often arrive after onLoad — re-apply when intent changes.
  useEffect(() => {
    const key = `${src}|${startTime ?? ''}|${startProgressFraction ?? ''}`;
    if (resumeKeyRef.current === key && resumeSettledRef.current) return;
    resumeSettledRef.current = false;
    setSkipUiUnlocked(false);
    setVisibleSkip(undefined);
    if (durationRef.current > 1) applyResume(durationRef.current);
  }, [startTime, startProgressFraction, src, applyResume]);

  const setBufferingUi = useCallback(
    (isBuffering: boolean) => {
      if (bufferSpinnerTimerRef.current) {
        clearTimeout(bufferSpinnerTimerRef.current);
        bufferSpinnerTimerRef.current = null;
      }
      if (!isBuffering) {
        showBufferingRef.current = false;
        setShowBuffering(false);
        return;
      }
      if (!hasBeenReadyRef.current) {
        showBufferingRef.current = true;
        setShowBuffering(true);
        setVisibleSkip(undefined);
        setSkipUiUnlocked(false);
        return;
      }
      bufferSpinnerTimerRef.current = setTimeout(() => {
        showBufferingRef.current = true;
        setShowBuffering(true);
        setVisibleSkip(undefined);
        setSkipUiUnlocked(false);
        bufferSpinnerTimerRef.current = null;
      }, REBUFFER_SPINNER_DELAY_MS);
    },
    [],
  );

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
      if (durSec > 0) {
        durationRef.current = durSec;
        durationFromLoadRef.current = true;
        setDuration(durSec);
      }
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
      const seekable = data.seekableDuration || 0;
      currentTimeRef.current = timeSec;

      // Prefer onLoad duration. For HLS without it, adopt seekableDuration only while
      // playback is clearly inside the range — never treat the buffer edge as episode end.
      if (!durationFromLoadRef.current && seekable > durationRef.current && timeSec + 45 < seekable) {
        durationRef.current = seekable;
      }

      const durSec = durationRef.current > 0 ? durationRef.current : 0;
      // Duration may arrive after onLoad (HLS) — apply pending resume then.
      if (!resumeSettledRef.current && durSec > 1) {
        applyResume(durSec);
      }

      // Progress sync must not use raw seekableDuration (partial windows inflate %).
      onProgressRef.current?.(timeSec, durSec);

      const now = Date.now();
      if (now - lastUiTickRef.current >= UI_TICK_MS) {
        lastUiTickRef.current = now;
        setCurrentTime((prev) => (Math.abs(prev - timeSec) < 0.05 ? prev : timeSec));
        if (durSec > 0) {
          setDuration((prev) => (prev === durSec ? prev : durSec));
        }
      }

      refreshSkipPrompt(timeSec);

      if (!positionReadyForSkip(timeSec)) return;

      const segments = skipSegmentsRef.current;
      const currentPrefs = prefsRef.current;
      for (const segment of segments) {
        if (timeSec < segment.start || timeSec >= segment.end) continue;
        if (autoHandledSkipsRef.current.has(segment.id)) continue;
        const shouldAuto =
          (isOpeningLikeSkip(segment.type) && currentPrefs.autoSkipOpening) ||
          (isEndingLikeSkip(segment.type) && currentPrefs.autoSkipEnding);
        if (!shouldAuto) continue;
        autoHandledSkipsRef.current.add(segment.id);
        dismissedSkipsRef.current.add(segment.id);
        videoRef.current?.seek(segment.end);
        currentTimeRef.current = segment.end;
        setCurrentTime(segment.end);
        setVisibleSkip(undefined);
        break;
      }
    },
    [applyResume, positionReadyForSkip, refreshSkipPrompt],
  );

  const onEnd = useCallback(() => {
    setPlaying(false);
    onEndedRef.current?.();
    if (prefsRef.current.autoPlayNext && onAutoPlayNextRef.current) {
      onAutoPlayNextRef.current();
    }
  }, []);

  const onError = useCallback((error: OnVideoErrorData) => {
    const info = toPlaybackErrorInfo(error);
    if (onPlaybackErrorRef.current?.(info)) {
      setPlaybackError(null);
      setShowBuffering(true);
      setPlaying(false);
      return;
    }
    setPlaybackError(info.message);
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
    currentTimeRef.current = next;
    setCurrentTime(next);
    refreshSkipPrompt(next);
    if (wantPlayingRef.current) setPlaying(true);
  }, [duration, refreshSkipPrompt]);

  const seekBy = useCallback(
    (delta: number) => {
      seekTo(currentTimeRef.current + delta);
    },
    [seekTo],
  );

  const applySkip = useCallback(
    (segment: PlayerSkipSegment) => {
      dismissedSkipsRef.current.add(segment.id);
      setVisibleSkip(undefined);
      seekTo(segment.end);
    },
    [seekTo],
  );

  const retryPlayback = useCallback(() => {
    setPlaybackError(null);
    resumeKeyRef.current = '';
    resumeSettledRef.current = false;
    resumeTargetRef.current = null;
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

  const enterPictureInPicture = useCallback(() => {
    try {
      videoRef.current?.enterPictureInPicture();
    } catch {
      // Device/OS may reject PiP (unsupported, multi-window, etc.)
    }
  }, []);

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
    visibleSkip: skipUiUnlocked && !showBuffering ? visibleSkip : undefined,
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
    enterPictureInPicture,
    /** High-bitrate friendly ExoPlayer buffers (seconds via ms). */
    bufferConfig: {
      minBufferMs: 15000,
      maxBufferMs: 50000,
      bufferForPlaybackMs: 2500,
      bufferForPlaybackAfterRebufferMs: 5000,
    },
  };
}
