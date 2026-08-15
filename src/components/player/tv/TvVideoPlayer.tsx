import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Video, { ViewType } from 'react-native-video';

import { PlayerPerfOverlay } from '@/components/player/PlayerPerfOverlay';
import { SubtitleOverlay } from '@/components/player/SubtitleOverlay';
import type { VideoPlayerProps } from '@/components/player/types';
import { TvEpisodeDock } from '@/components/player/tv/TvEpisodeDock';
import { TvPlayerFocusSink, type TvDpadRevealTags } from '@/components/player/tv/TvPlayerFocusSink';
import { TvPlayerOverlays } from '@/components/player/tv/TvPlayerOverlays';
import { TvPlayerPanel } from '@/components/player/tv/TvPlayerPanel';
import {
  TV_PLAYER_HINT_HIDE_MS,
  TV_PLAYER_OPTIONS_ORDER,
} from '@/components/player/tv/tvPlayerTypes';
import { colors, spacing } from '@/constants/aniverse';
import { usePlayerPerfRenderCounter } from '@/hooks/usePlayerPerfStats';
import { useRNVideoEngine } from '@/hooks/useRNVideoEngine';
import { useTvPlayerRemote } from '@/hooks/useTvPlayerRemote';
import {
  launchExternalPlayer,
  listInstalledExternalPlayers,
  type ExternalPlayerTarget,
} from '@/lib/externalPlayer';
import { EMPTY_SKIP_SEGMENTS } from '@/lib/playerSkip';
import { isPlayerPerfOverlayEnabled } from '@/lib/playerPerf';
import { shouldIgnorePartyToggleRepeat } from '@/lib/partyPlaybackSyncLogic';
import { cyclePlaybackRate, cycleVideoFit } from '@/lib/playerPreferences';
import { subtitleTrackLabel } from '@/lib/subtitleTracks';

export function TvVideoPlayer({
  src,
  headers,
  title,
  subtitle,
  subtitles,
  startTime,
  startProgressFraction,
  onProgress,
  onEnded,
  onAutoPlayNext,
  onPlaybackError,
  skipSegments = EMPTY_SKIP_SEGMENTS,
  episodeNav,
  onBack,
  dubbingOptions,
  qualityOptions,
  connectionOptions,
  deliveryOptions,
  playbackCaptureRef,
  playbackControlRef,
  partyControlled = false,
  canPlayPause = true,
  canSeek = true,
  onPartyPlay,
  onPartyPause,
  onPartySeek,
  partyRemoteCommand,
  onPlayingChange,
  onControlsVisibleChange,
}: VideoPlayerProps) {
  const handleBack = onBack ?? (() => undefined);
  const perfEnabled = isPlayerPerfOverlayEnabled();
  const { noteRender, renderCountRef } = usePlayerPerfRenderCounter(perfEnabled);
  noteRender();

  const engine = useRNVideoEngine({
    src,
    headers,
    externalSubtitles: subtitles,
    startTime,
    startProgressFraction,
    // Party: mount paused; play only after room sync says so (phone parity).
    autoPlay: !partyControlled,
    skipSegments,
    onProgress,
    onEnded,
    onAutoPlayNext,
    onPlaybackError,
  });

  useEffect(() => {
    if (!playbackCaptureRef) return;
    playbackCaptureRef.current = engine.getPlaybackCapture;
    return () => {
      playbackCaptureRef.current = null;
    };
  }, [engine.getPlaybackCapture, playbackCaptureRef]);

  useEffect(() => {
    if (!playbackControlRef) return;
    playbackControlRef.current = { pause: engine.pause };
    return () => {
      playbackControlRef.current = null;
    };
  }, [engine.pause, playbackControlRef]);

  const partyPlayLocked = partyControlled && !canPlayPause;
  const partySeekLocked = partyControlled && !canSeek;
  const lastAppliedPartySeqRef = useRef(-1);
  const lastPartyToggleAtRef = useRef(0);
  const partyPlayingIntentRef = useRef(engine.playing);

  useEffect(() => {
    partyPlayingIntentRef.current = engine.playing;
  }, [engine.playing]);

  useEffect(() => {
    onPlayingChange?.(engine.playing);
  }, [engine.playing, onPlayingChange]);

  useEffect(() => {
    if (!partyRemoteCommand || partyRemoteCommand.seq === lastAppliedPartySeqRef.current) return;
    lastAppliedPartySeqRef.current = partyRemoteCommand.seq;
    if (typeof partyRemoteCommand.time === 'number') {
      engine.seekTo(partyRemoteCommand.time);
    }
    if (partyRemoteCommand.isPlaying === true) {
      partyPlayingIntentRef.current = true;
      engine.play();
    } else if (partyRemoteCommand.isPlaying === false) {
      partyPlayingIntentRef.current = false;
      engine.pause();
    }
  }, [partyRemoteCommand, engine.seekTo, engine.play, engine.pause]);

  const guardedTogglePlay = useCallback(() => {
    if (partyPlayLocked) return;
    if (partyControlled) {
      const now = Date.now();
      // OK key-down + Pressable onPress must not play-then-pause the room.
      if (shouldIgnorePartyToggleRepeat(lastPartyToggleAtRef.current, now)) return;
      lastPartyToggleAtRef.current = now;
      if (partyPlayingIntentRef.current) {
        partyPlayingIntentRef.current = false;
        onPartyPause?.();
        engine.pause();
      } else {
        partyPlayingIntentRef.current = true;
        onPartyPlay?.();
        engine.play();
      }
      return;
    }
    engine.togglePlay();
  }, [partyPlayLocked, partyControlled, engine, onPartyPlay, onPartyPause]);

  const guardedSeekBy = useCallback(
    (delta: number) => {
      if (partySeekLocked) return;
      const next = Math.max(0, engine.currentTime + delta);
      engine.seekBy(delta);
      if (partyControlled) onPartySeek?.(next);
    },
    [partySeekLocked, partyControlled, engine, onPartySeek],
  );

  const [externalPlayers, setExternalPlayers] = useState<ExternalPlayerTarget[]>([]);
  const [externalError, setExternalError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void listInstalledExternalPlayers().then(setExternalPlayers);
  }, []);

  const hasDubbing = Boolean(dubbingOptions && dubbingOptions.length > 1);
  const hasQuality = Boolean(qualityOptions && qualityOptions.length > 1);
  const hasConnection = Boolean(connectionOptions && connectionOptions.length > 1);
  const hasDelivery = Boolean(deliveryOptions && deliveryOptions.length > 1);
  const hasEpisodes = Boolean(episodeNav && episodeNav.items.length > 1);
  const hasSubtitles = engine.subtitleTracks.length > 0;
  const hasExternal = Platform.OS === 'android' && externalPlayers.length > 0;

  const handleSelectExternal = useCallback(
    async (target: ExternalPlayerTarget) => {
      setExternalError(null);
      engine.pause();
      onProgress?.(engine.currentTime, engine.duration);
      const result = await launchExternalPlayer({
        url: src,
        title: title ?? subtitle,
        positionSeconds: engine.currentTime,
        packageName: target.id === 'system' ? null : target.packageName,
      });
      if (!result.ok) setExternalError(result.message);
    },
    [engine, onProgress, src, subtitle, title],
  );

  const remote = useTvPlayerRemote({
    playing: engine.playing,
    prefs: engine.prefs,
    dubbingOptions,
    qualityOptions,
    connectionOptions,
    deliveryOptions,
    episodeNav,
    subtitleTracks: engine.subtitleTracks,
    activeSubtitle: engine.activeSubtitle,
    externalPlayers,
    hasDubbing,
    hasQuality,
    hasConnection,
    hasDelivery,
    hasEpisodes,
    hasSubtitles,
    hasExternal,
    hasPrevEpisode: Boolean(episodeNav?.hasPrevious),
    hasNextEpisode: Boolean(episodeNav?.hasNext),
    hasSkipPrompt: Boolean(engine.visibleSkip),
    onBack: handleBack,
    onTogglePlay: guardedTogglePlay,
    onSeekBack: () => guardedSeekBy(-engine.prefs.skipBackwardSeconds),
    onSeekForward: () => guardedSeekBy(engine.prefs.skipForwardSeconds),
    onPrevEpisode: episodeNav?.onPrevious,
    onNextEpisode: episodeNav?.onNext,
    onApplySkip: () => {
      if (engine.visibleSkip) engine.applySkip(engine.visibleSkip);
    },
    onSelectMenuOption: (option) => option.onSelect(),
    onSelectEpisode: (id) => episodeNav?.onSelect?.(id),
    onSelectSubtitle: engine.setSubtitleTrack,
    onSelectExternalPlayer: (target) => {
      void handleSelectExternal(target);
    },
    onPrefsChange: engine.updatePrefs,
  });

  useEffect(() => {
    onControlsVisibleChange?.(remote.panelVisible || !!remote.overlay);
  }, [remote.panelVisible, remote.overlay, onControlsVisibleChange]);

  const handleSettingsAction = useCallback(
    (action: 'rate' | 'fit' | 'autonext' | 'skip_open' | 'skip_end') => {
      const { prefs, updatePrefs } = engine;
      if (action === 'rate') {
        updatePrefs({ playbackRate: cyclePlaybackRate(prefs.playbackRate) });
      } else if (action === 'fit') {
        updatePrefs({ videoFit: cycleVideoFit(prefs.videoFit) });
      } else if (action === 'autonext') {
        updatePrefs({ autoPlayNext: !prefs.autoPlayNext });
      } else if (action === 'skip_open') {
        updatePrefs({ autoSkipOpening: !prefs.autoSkipOpening });
      } else if (action === 'skip_end') {
        updatePrefs({ autoSkipEnding: !prefs.autoSkipEnding });
      }
    },
    [engine],
  );

  const selectedDubbing = dubbingOptions?.find((o) => o.selected)?.label;
  const selectedQuality = qualityOptions?.find((o) => o.selected)?.label;
  const selectedConnection = connectionOptions?.find((o) => o.selected)?.label;
  const selectedDelivery = deliveryOptions?.find((o) => o.selected)?.label;
  const selectedSubtitle = engine.activeSubtitle
    ? subtitleTrackLabel(engine.activeSubtitle)
    : undefined;
  const showCenterDock =
    !remote.overlay &&
    !engine.playbackError &&
    (remote.panelVisible || !engine.playing);
  // Skip owns OK unless a bottom options pill (or overlay) is focused.
  const skipActionable =
    Boolean(engine.visibleSkip) &&
    !remote.overlay &&
    !(
      remote.panelVisible &&
      TV_PLAYER_OPTIONS_ORDER.includes(remote.panelFocus as (typeof TV_PLAYER_OPTIONS_ORDER)[number])
    );

  const [hintVisible, setHintVisible] = useState(true);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [revealTags, setRevealTags] = useState<TvDpadRevealTags>({});

  useEffect(() => {
    if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    if (remote.panelVisible || remote.overlay) {
      setHintVisible(false);
      return;
    }
    setHintVisible(true);
    hintTimerRef.current = setTimeout(() => setHintVisible(false), TV_PLAYER_HINT_HIDE_MS);
    return () => {
      if (hintTimerRef.current) clearTimeout(hintTimerRef.current);
    };
  }, [remote.overlay, remote.panelVisible, src]);

  const perfLines = useMemo(() => {
    if (!perfEnabled) return [];
    const srcShort = src ? `${src.slice(0, 28)}…` : '(no src)';
    return [
      engine.isLoading ? 'buf: yes' : 'buf: no',
      engine.playing ? 'play' : 'pause',
      `t ${engine.currentTime.toFixed(0)}/${engine.duration.toFixed(0)}s`,
      `nav ${episodeNav?.items.length ?? 0}`,
      srcShort,
    ];
  }, [
    perfEnabled,
    engine.isLoading,
    engine.playing,
    engine.currentTime,
    engine.duration,
    episodeNav?.items.length,
    src,
  ]);

  return (
    <View style={styles.root}>
      {engine.source ? (
        <Video
          key={`${src}-${engine.reloadKey}`}
          ref={engine.videoRef}
          style={styles.video}
          source={engine.source}
          paused={engine.paused}
          rate={engine.rate}
          volume={engine.volume}
          resizeMode={engine.resizeMode}
          selectedTextTrack={engine.selectedTextTrack}
          bufferConfig={engine.bufferConfig}
          controls={false}
          focusable={false}
          viewType={Platform.OS === 'android' ? ViewType.TEXTURE : undefined}
          playInBackground={false}
          ignoreSilentSwitch="ignore"
          onLoad={engine.onLoad}
          onProgress={engine.onProgress}
          onEnd={engine.onEnd}
          onError={engine.onError}
          onBuffer={engine.onBuffer}
          onReadyForDisplay={engine.onReadyForDisplay}
          onTextTracks={engine.onTextTracks}
          onTextTrackDataChanged={engine.onTextTrackDataChanged}
        />
      ) : null}

      <View style={styles.chrome} pointerEvents="box-none" collapsable={false}>
        <TvPlayerFocusSink
          sinkActive={!showCenterDock}
          revealEdges={!remote.panelVisible && !remote.overlay}
          overlayTrap={!!remote.overlay}
          onRevealTags={setRevealTags}
          onTvKey={remote.handleHwEvent}
        />

      <SubtitleOverlay cues={engine.activeSubtitleCues} text={engine.nativeCueText} />

      {engine.isLoading && !engine.playbackError ? (
        <View style={styles.center} pointerEvents="none">
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : null}

      <TvEpisodeDock
        visible={showCenterDock}
        playing={engine.playing}
        panelFocus={remote.panelFocus}
        hasPrev={remote.enabledButtons.has('prev_episode')}
        hasNext={remote.enabledButtons.has('next_episode')}
        onTvKey={remote.handleHwEvent}
        onFocusButton={remote.focusHud}
        onActivate={remote.activateButton}
        captureVertical={!remote.panelVisible}
        captureHorizontal={!remote.panelVisible}
        nextFocusDown={!remote.panelVisible ? revealTags.down : undefined}
        nextFocusUp={!remote.panelVisible ? revealTags.up : undefined}
      />

      {engine.playbackError || externalError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{engine.playbackError ?? externalError}</Text>
          {engine.playbackError ? (
            <Pressable focusable={false} onPress={engine.retryPlayback} style={styles.retryBtn}>
              <Text style={styles.retryText}>Повторить</Text>
            </Pressable>
          ) : (
            <Pressable
              focusable={false}
              onPress={() => setExternalError(null)}
              style={styles.retryBtn}
            >
              <Text style={styles.retryText}>Закрыть</Text>
            </Pressable>
          )}
          <Pressable focusable={false} onPress={handleBack} style={styles.backBtn}>
            <Text style={styles.retryText}>Назад</Text>
          </Pressable>
        </View>
      ) : null}

      {engine.visibleSkip && !remote.overlay && !engine.isLoading ? (
        <View style={styles.skipWrap} pointerEvents="none">
          <View style={[styles.skipBtn, skipActionable && styles.skipBtnFocused]}>
            <Text style={[styles.skipText, skipActionable && styles.skipTextFocused]}>
              {engine.visibleSkip.title}
            </Text>
            {skipActionable ? <Text style={styles.skipHint}>OK</Text> : null}
          </View>
        </View>
      ) : null}

      {hintVisible &&
      !remote.panelVisible &&
      !remote.overlay &&
      !engine.playbackError &&
      !engine.isLoading ? (
        <View style={styles.hint} pointerEvents="none">
          <Text style={styles.hintText}>
            {engine.visibleSkip
              ? 'OK — пропустить · ← → — перемотка · ↑ ↓ — панель · Back — выход'
              : 'OK — пауза · ↓ — серии / плей · ← → — перемотка · Back — выход'}
          </Text>
        </View>
      ) : null}

      <TvPlayerPanel
        visible={remote.panelVisible && !remote.overlay}
        panelFocus={remote.panelFocus}
        title={title}
        subtitle={subtitle}
        currentTime={engine.currentTime}
        duration={engine.duration}
        progress={engine.progress}
        prefs={engine.prefs}
        skipSegments={skipSegments}
        enabledButtons={remote.enabledButtons}
        hasDubbing={hasDubbing}
        hasQuality={hasQuality}
        hasConnection={hasConnection}
        hasDelivery={hasDelivery}
        hasSubtitles={hasSubtitles}
        selectedDubbing={selectedDubbing}
        selectedQuality={selectedQuality}
        selectedConnection={selectedConnection}
        selectedDelivery={selectedDelivery}
        selectedSubtitle={selectedSubtitle}
        onTvKey={remote.handleHwEvent}
        onFocusButton={remote.focusHud}
        onActivate={remote.activateButton}
      />

      <TvPlayerOverlays
        overlay={remote.overlay}
        overlayFocusIndex={remote.overlayFocusIndex}
        dubbingOptions={dubbingOptions}
        qualityOptions={qualityOptions}
        connectionOptions={connectionOptions}
        deliveryOptions={deliveryOptions}
        episodeNav={episodeNav}
        subtitleTracks={engine.subtitleTracks}
        activeSubtitle={engine.activeSubtitle}
        externalPlayers={externalPlayers}
        prefs={engine.prefs}
        onClose={remote.closeOverlay}
        onSelectMenuOption={(option) => option.onSelect()}
        onSelectEpisode={(id) => episodeNav?.onSelect?.(id)}
        onSelectSubtitle={engine.setSubtitleTrack}
        onSelectExternalPlayer={(target) => {
          void handleSelectExternal(target);
        }}
        onSettingsAction={handleSettingsAction}
      />

      {perfEnabled ? (
        <PlayerPerfOverlay
          enabled={perfEnabled}
          renderCountRef={renderCountRef}
          lines={perfLines}
        />
      ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1, width: '100%', height: '100%', zIndex: 0 },
  chrome: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
    elevation: 24,
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xxl,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  errorText: { color: colors.text, fontSize: 22, fontWeight: '600', textAlign: 'center' },
  retryBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.brandAccent,
  },
  backBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.bgElevated,
  },
  retryText: { color: colors.text, fontSize: 18, fontWeight: '600' },
  skipWrap: {
    position: 'absolute',
    right: spacing.xxl,
    bottom: 180,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  skipBtnFocused: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  skipText: { color: colors.text, fontSize: 18, fontWeight: '600' },
  skipTextFocused: { color: '#111' },
  skipHint: {
    color: 'rgba(17,17,17,0.55)',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  hint: {
    position: 'absolute',
    left: spacing.xxl,
    right: spacing.xxl,
    top: spacing.xxl,
    alignItems: 'center',
  },
  hintText: {
    color: colors.textSecondary,
    fontSize: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    overflow: 'hidden',
  },
});
