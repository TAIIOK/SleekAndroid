import { VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { VideoPlayerProps } from '@/components/player/types';
import { TvPlayerOverlays } from '@/components/player/tv/TvPlayerOverlays';
import { TvPlayerPanel } from '@/components/player/tv/TvPlayerPanel';
import { TV_PLAYER_HINT_HIDE_MS } from '@/components/player/tv/tvPlayerTypes';
import { colors, spacing } from '@/constants/aniverse';
import { useNativeVideoEngine } from '@/hooks/useNativeVideoEngine';
import { useTvPlayerRemote } from '@/hooks/useTvPlayerRemote';
import { cyclePlaybackRate, cycleVideoFit } from '@/lib/playerPreferences';

export function TvVideoPlayer({
  src,
  title,
  subtitle,
  startTime,
  startProgressFraction,
  onProgress,
  onEnded,
  onAutoPlayNext,
  skipSegments = [],
  episodeNav,
  onBack,
  dubbingOptions,
  qualityOptions,
  connectionOptions,
  deliveryOptions,
}: VideoPlayerProps) {
  const handleBack = onBack ?? (() => undefined);

  const engine = useNativeVideoEngine({
    src,
    startTime,
    startProgressFraction,
    skipSegments,
    onProgress,
    onEnded,
    onAutoPlayNext,
  });

  const hasDubbing = Boolean(dubbingOptions && dubbingOptions.length > 1);
  const hasQuality = Boolean(qualityOptions && qualityOptions.length > 1);
  const hasConnection = Boolean(connectionOptions && connectionOptions.length > 1);
  const hasDelivery = Boolean(deliveryOptions && deliveryOptions.length > 1);
  const hasEpisodes = Boolean(episodeNav && episodeNav.items.length > 1);

  const remote = useTvPlayerRemote({
    playing: engine.playing,
    prefs: engine.prefs,
    dubbingOptions,
    qualityOptions,
    connectionOptions,
    deliveryOptions,
    episodeNav,
    hasDubbing,
    hasQuality,
    hasConnection,
    hasDelivery,
    hasEpisodes,
    hasPrevEpisode: Boolean(episodeNav?.hasPrevious),
    hasNextEpisode: Boolean(episodeNav?.hasNext),
    onBack: handleBack,
    onTogglePlay: engine.togglePlay,
    onSeekBack: () => engine.seekBy(-engine.prefs.skipBackwardSeconds),
    onSeekForward: () => engine.seekBy(engine.prefs.skipForwardSeconds),
    onPrevEpisode: episodeNav?.onPrevious,
    onNextEpisode: episodeNav?.onNext,
    onSelectMenuOption: (option) => option.onSelect(),
    onSelectEpisode: (id) => episodeNav?.onSelect?.(id),
    onPrefsChange: engine.updatePrefs,
  });

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
  const showPausedBadge = !engine.playing && !remote.panelVisible && !remote.overlay;

  const [hintVisible, setHintVisible] = useState(true);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  return (
    <View style={styles.root}>
      <VideoView
        style={styles.video}
        player={engine.player}
        contentFit={engine.contentFit}
        nativeControls={false}
      />

      {engine.isLoading && !engine.playbackError ? (
        <View style={styles.center} pointerEvents="none">
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : null}

      {showPausedBadge && !engine.isLoading && !engine.playbackError ? (
        <View style={styles.center} pointerEvents="none">
          <View style={styles.pausedBadge}>
            <Text style={styles.pausedIcon}>▶</Text>
          </View>
        </View>
      ) : null}

      {engine.playbackError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{engine.playbackError}</Text>
          <Pressable onPress={engine.retryPlayback} style={styles.retryBtn}>
            <Text style={styles.retryText}>Повторить</Text>
          </Pressable>
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <Text style={styles.retryText}>Назад</Text>
          </Pressable>
        </View>
      ) : null}

      {engine.visibleSkip && !remote.overlay ? (
        <View style={styles.skipWrap}>
          <Pressable
            onPress={() => engine.applySkip(engine.visibleSkip!)}
            style={styles.skipBtn}
          >
            <Text style={styles.skipText}>{engine.visibleSkip.title}</Text>
          </Pressable>
        </View>
      ) : null}

      {hintVisible && !remote.panelVisible && !remote.overlay && !engine.playbackError ? (
        <View style={styles.hint} pointerEvents="none">
          <Text style={styles.hintText}>
            OK — пауза · ← → — перемотка · ↑ ↓ — панель · Back — выход
          </Text>
        </View>
      ) : null}

      <TvPlayerPanel
        visible={remote.panelVisible && !remote.overlay}
        panelFocus={remote.panelFocus}
        playing={engine.playing}
        title={title}
        subtitle={subtitle}
        currentTime={engine.currentTime}
        duration={engine.duration}
        progress={engine.progress}
        prefs={engine.prefs}
        enabledButtons={remote.enabledButtons}
        hasDubbing={hasDubbing}
        hasQuality={hasQuality}
        hasConnection={hasConnection}
        hasDelivery={hasDelivery}
        selectedDubbing={selectedDubbing}
        selectedQuality={selectedQuality}
        selectedConnection={selectedConnection}
        selectedDelivery={selectedDelivery}
      />

      <TvPlayerOverlays
        overlay={remote.overlay}
        overlayFocusIndex={remote.overlayFocusIndex}
        dubbingOptions={dubbingOptions}
        qualityOptions={qualityOptions}
        connectionOptions={connectionOptions}
        deliveryOptions={deliveryOptions}
        episodeNav={episodeNav}
        prefs={engine.prefs}
        onClose={remote.closeOverlay}
        onSelectMenuOption={(option) => option.onSelect()}
        onSelectEpisode={(id) => episodeNav?.onSelect?.(id)}
        onSettingsAction={handleSettingsAction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1, width: '100%', height: '100%' },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pausedBadge: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pausedIcon: { color: '#fff', fontSize: 48, marginLeft: 6 },
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: colors.brand,
  },
  skipText: { color: colors.text, fontSize: 18, fontWeight: '600' },
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
