import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Video from 'react-native-video';

import type { PlayerMenuOption, VideoPlayerProps } from '@/components/player/types';
import { colors, spacing } from '@/constants/aniverse';
import { useRNVideoEngine } from '@/hooks/useRNVideoEngine';
import {
  launchExternalPlayer,
  listInstalledExternalPlayers,
  type ExternalPlayerTarget,
} from '@/lib/externalPlayer';
import { formatPlaybackTime } from '@/lib/formatPlaybackTime';
import {
  cyclePlaybackRate,
  cycleVideoFit,
  formatPlaybackRate,
  videoFitLabel,
} from '@/lib/playerPreferences';
import { subtitleTrackLabel } from '@/lib/subtitleTracks';

type PhoneSheet =
  | 'dubbing'
  | 'quality'
  | 'connection'
  | 'delivery'
  | 'episodes'
  | 'subtitles'
  | 'settings'
  | 'external'
  | null;

const CONTROLS_HIDE_MS = 3200;

export function PhoneVideoPlayer({
  src,
  headers,
  title,
  subtitle,
  startTime,
  startProgressFraction,
  onProgress,
  onEnded,
  onAutoPlayNext,
  onPlaybackError,
  skipSegments = [],
  episodeNav,
  onBack,
  dubbingOptions,
  qualityOptions,
  connectionOptions,
  deliveryOptions,
}: VideoPlayerProps) {
  const insets = useSafeAreaInsets();
  const engine = useRNVideoEngine({
    src,
    headers,
    startTime,
    startProgressFraction,
    skipSegments,
    onProgress,
    onEnded,
    onAutoPlayNext,
    onPlaybackError,
  });

  const [controlsVisible, setControlsVisible] = useState(true);
  const [sheet, setSheet] = useState<PhoneSheet>(null);
  const [externalPlayers, setExternalPlayers] = useState<ExternalPlayerTarget[]>([]);
  const [externalError, setExternalError] = useState<string | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeRef = useRef(engine.volume);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void listInstalledExternalPlayers().then(setExternalPlayers);
  }, []);

  const scheduleHide = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (!engine.playing || sheet) return;
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_MS);
  }, [engine.playing, sheet]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    scheduleHide();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [scheduleHide, engine.playing]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (sheet) {
        setSheet(null);
        return true;
      }
      onBack?.();
      return true;
    });
    return () => sub.remove();
  }, [sheet, onBack]);

  useEffect(() => {
    volumeRef.current = engine.volume;
  }, [engine.volume]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => engine.prefs.gestureControlsEnabled && !engine.prefs.gesturesLocked,
        onMoveShouldSetPanResponder: (_, g) =>
          engine.prefs.gestureControlsEnabled &&
          !engine.prefs.gesturesLocked &&
          (Math.abs(g.dx) > 12 || Math.abs(g.dy) > 12),
        onPanResponderGrant: () => showControls(),
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) > Math.abs(g.dy) && Math.abs(g.dx) > 40) {
            const seconds = (g.dx / 120) * engine.prefs.skipForwardSeconds;
            engine.seekBy(seconds);
          } else if (Math.abs(g.dy) > 40) {
            const next = volumeRef.current - g.dy / 300;
            engine.setVolume(next);
            volumeRef.current = Math.max(0, Math.min(1, next));
          } else if (Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8) {
            engine.togglePlay();
          }
          scheduleHide();
        },
      }),
    [engine, scheduleHide, showControls],
  );

  const openSheet = (next: PhoneSheet) => {
    setSheet(next);
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  };

  const settingsRows = [
    {
      id: 'rate',
      label: `Скорость · ${formatPlaybackRate(engine.prefs.playbackRate)}`,
      onPress: () =>
        engine.updatePrefs({ playbackRate: cyclePlaybackRate(engine.prefs.playbackRate) }),
    },
    {
      id: 'fit',
      label: `Масштаб · ${videoFitLabel(engine.prefs.videoFit)}`,
      onPress: () => engine.updatePrefs({ videoFit: cycleVideoFit(engine.prefs.videoFit) }),
    },
    {
      id: 'autonext',
      label: `Автослед. · ${engine.prefs.autoPlayNext ? 'Вкл' : 'Выкл'}`,
      onPress: () => engine.updatePrefs({ autoPlayNext: !engine.prefs.autoPlayNext }),
    },
    {
      id: 'skip_open',
      label: `Авто OP · ${engine.prefs.autoSkipOpening ? 'Вкл' : 'Выкл'}`,
      onPress: () => engine.updatePrefs({ autoSkipOpening: !engine.prefs.autoSkipOpening }),
    },
    {
      id: 'skip_end',
      label: `Авто ED · ${engine.prefs.autoSkipEnding ? 'Вкл' : 'Выкл'}`,
      onPress: () => engine.updatePrefs({ autoSkipEnding: !engine.prefs.autoSkipEnding }),
    },
  ];

  const sheetOptions: PlayerMenuOption[] | undefined =
    sheet === 'dubbing'
      ? dubbingOptions
      : sheet === 'quality'
        ? qualityOptions
        : sheet === 'connection'
          ? connectionOptions
          : sheet === 'delivery'
            ? deliveryOptions
            : undefined;

  const sheetTitle =
    sheet === 'dubbing'
      ? 'Озвучка'
      : sheet === 'quality'
        ? 'Качество'
        : sheet === 'connection'
          ? 'Подключение'
          : sheet === 'delivery'
            ? 'Тип потока'
            : sheet === 'episodes'
              ? 'Эпизоды'
              : sheet === 'subtitles'
                ? 'Субтитры'
                : sheet === 'settings'
                  ? 'Настройки'
                  : sheet === 'external'
                    ? 'Внешний плеер'
                    : '';

  const openExternal = async (target: ExternalPlayerTarget) => {
    setExternalError(null);
    engine.pause();
    onProgress?.(engine.currentTime, engine.duration);
    const result = await launchExternalPlayer({
      url: src,
      title: title ?? subtitle,
      positionSeconds: engine.currentTime,
      packageName: target.id === 'system' ? null : target.packageName,
    });
    setSheet(null);
    if (!result.ok) setExternalError(result.message);
  };

  return (
    <View style={styles.root} {...panResponder.panHandlers}>
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
          playInBackground={false}
          ignoreSilentSwitch="ignore"
          fullscreenAutorotate
          fullscreenOrientation="landscape"
          onLoad={engine.onLoad}
          onProgress={engine.onProgress}
          onEnd={engine.onEnd}
          onError={engine.onError}
          onBuffer={engine.onBuffer}
          onReadyForDisplay={engine.onReadyForDisplay}
          onTextTracks={engine.onTextTracks}
        />
      ) : null}

      {engine.isLoading && !engine.playbackError ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : null}

      {engine.playbackError || externalError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{engine.playbackError ?? externalError}</Text>
          {engine.playbackError ? (
            <Pressable onPress={engine.retryPlayback} style={styles.menuChip}>
              <Text style={styles.chipText}>Повторить</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => setExternalError(null)} style={styles.menuChip}>
              <Text style={styles.chipText}>Закрыть</Text>
            </Pressable>
          )}
        </View>
      ) : null}

      {controlsVisible || !engine.playing ? (
        <View
          style={[
            styles.hud,
            {
              paddingTop: Math.max(insets.top, 8),
              paddingBottom: Math.max(insets.bottom, 12),
              paddingLeft: Math.max(insets.left, spacing.md),
              paddingRight: Math.max(insets.right, spacing.md),
            },
          ]}
        >
          <View style={styles.topRow}>
            <Pressable onPress={onBack} style={styles.backBtn}>
              <Text style={styles.chipText}>←</Text>
            </Pressable>
            <View style={styles.meta}>
              {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : null}
              {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
            </View>
          </View>

          <View style={styles.bottomBlock}>
            {engine.visibleSkip ? (
              <Pressable
                onPress={() => engine.applySkip(engine.visibleSkip!)}
                style={styles.skipBtn}
              >
                <Text style={styles.chipText}>{engine.visibleSkip.title}</Text>
              </Pressable>
            ) : null}

            <ScrubBar
              progress={engine.progress}
              currentTime={engine.currentTime}
              duration={engine.duration}
              onSeekRatio={(ratio) => {
                if (engine.duration > 0) engine.seekTo(engine.duration * ratio);
                showControls();
              }}
            />

            <View style={styles.transport}>
              {episodeNav?.hasPrevious ? (
                <Pressable onPress={episodeNav.onPrevious} style={styles.menuChip}>
                  <Text style={styles.chipText}>⏮</Text>
                </Pressable>
              ) : null}
              <Pressable
                onPress={() => {
                  engine.seekBy(-engine.prefs.skipBackwardSeconds);
                  showControls();
                }}
                style={styles.menuChip}
              >
                <Text style={styles.chipText}>−{engine.prefs.skipBackwardSeconds}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  engine.togglePlay();
                  showControls();
                }}
                style={[styles.menuChip, styles.playChip]}
              >
                <Text style={styles.chipText}>{engine.playing ? '❚❚' : '▶'}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  engine.seekBy(engine.prefs.skipForwardSeconds);
                  showControls();
                }}
                style={styles.menuChip}
              >
                <Text style={styles.chipText}>+{engine.prefs.skipForwardSeconds}</Text>
              </Pressable>
              {episodeNav?.hasNext ? (
                <Pressable onPress={episodeNav.onNext} style={styles.menuChip}>
                  <Text style={styles.chipText}>⏭</Text>
                </Pressable>
              ) : null}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.menuRow}>
              {dubbingOptions && dubbingOptions.length > 1 ? (
                <Pressable onPress={() => openSheet('dubbing')} style={styles.menuChip}>
                  <Text style={styles.chipText}>Озвучка</Text>
                </Pressable>
              ) : null}
              {qualityOptions && qualityOptions.length > 1 ? (
                <Pressable onPress={() => openSheet('quality')} style={styles.menuChip}>
                  <Text style={styles.chipText}>Качество</Text>
                </Pressable>
              ) : null}
              {connectionOptions && connectionOptions.length > 1 ? (
                <Pressable onPress={() => openSheet('connection')} style={styles.menuChip}>
                  <Text style={styles.chipText}>Сеть</Text>
                </Pressable>
              ) : null}
              {deliveryOptions && deliveryOptions.length > 1 ? (
                <Pressable onPress={() => openSheet('delivery')} style={styles.menuChip}>
                  <Text style={styles.chipText}>Тип</Text>
                </Pressable>
              ) : null}
              {episodeNav && episodeNav.items.length > 1 ? (
                <Pressable onPress={() => openSheet('episodes')} style={styles.menuChip}>
                  <Text style={styles.chipText}>Эпизоды</Text>
                </Pressable>
              ) : null}
              {engine.subtitleTracks.length > 0 ? (
                <Pressable onPress={() => openSheet('subtitles')} style={styles.menuChip}>
                  <Text style={styles.chipText}>CC</Text>
                </Pressable>
              ) : null}
              {Platform.OS === 'android' && externalPlayers.length > 0 ? (
                <Pressable onPress={() => openSheet('external')} style={styles.menuChip}>
                  <Text style={styles.chipText}>Внешний</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => openSheet('settings')} style={styles.menuChip}>
                <Text style={styles.chipText}>Настройки</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      ) : (
        <Pressable style={StyleSheet.absoluteFill} onPress={showControls} />
      )}

      <Modal visible={sheet != null} transparent animationType="slide" onRequestClose={() => setSheet(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheet(null)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => undefined}>
            <Text style={styles.sheetTitle}>{sheetTitle}</Text>
            <ScrollView style={styles.sheetScroll}>
              {sheet === 'settings'
                ? settingsRows.map((row) => (
                    <Pressable key={row.id} onPress={row.onPress} style={styles.sheetRow}>
                      <Text style={styles.sheetRowText}>{row.label}</Text>
                    </Pressable>
                  ))
                : null}
              {sheet === 'episodes' && episodeNav
                ? episodeNav.items.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        episodeNav.onSelect?.(item.id);
                        setSheet(null);
                      }}
                      style={[
                        styles.sheetRow,
                        item.id === episodeNav.currentEpisodeId && styles.sheetRowSelected,
                      ]}
                    >
                      <Text style={styles.sheetRowText}>{item.label}</Text>
                    </Pressable>
                  ))
                : null}
              {sheet === 'subtitles'
                ? [
                    <Pressable
                      key="off"
                      onPress={() => {
                        engine.setSubtitleTrack(null);
                        setSheet(null);
                      }}
                      style={[styles.sheetRow, !engine.activeSubtitle && styles.sheetRowSelected]}
                    >
                      <Text style={styles.sheetRowText}>Выкл</Text>
                      {!engine.activeSubtitle ? <Text style={styles.check}>✓</Text> : null}
                    </Pressable>,
                    ...engine.subtitleTracks.map((track, index) => {
                      const selected =
                        !!engine.activeSubtitle &&
                        engine.activeSubtitle.language === track.language &&
                        engine.activeSubtitle.label === track.label;
                      return (
                        <Pressable
                          key={track.id ?? `${track.language}-${index}`}
                          onPress={() => {
                            engine.setSubtitleTrack(track);
                            setSheet(null);
                          }}
                          style={[styles.sheetRow, selected && styles.sheetRowSelected]}
                        >
                          <Text style={styles.sheetRowText}>{subtitleTrackLabel(track)}</Text>
                          {selected ? <Text style={styles.check}>✓</Text> : null}
                        </Pressable>
                      );
                    }),
                  ]
                : null}
              {sheet === 'external'
                ? externalPlayers.map((target) => {
                    const selected =
                      (target.packageName ?? '') ===
                        (engine.prefs.lastExternalPlayerPackage ?? '') ||
                      (target.id === 'system' && !engine.prefs.lastExternalPlayerPackage);
                    return (
                      <Pressable
                        key={target.id}
                        onPress={() => {
                          void openExternal(target);
                        }}
                        style={[styles.sheetRow, selected && styles.sheetRowSelected]}
                      >
                        <Text style={styles.sheetRowText}>{target.label}</Text>
                        {selected ? <Text style={styles.check}>✓</Text> : null}
                      </Pressable>
                    );
                  })
                : null}
              {sheetOptions?.map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => {
                    option.onSelect();
                    setSheet(null);
                  }}
                  style={[styles.sheetRow, option.selected && styles.sheetRowSelected]}
                >
                  <Text style={styles.sheetRowText}>{option.label}</Text>
                  {option.selected ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function ScrubBar({
  progress,
  currentTime,
  duration,
  onSeekRatio,
}: {
  progress: number;
  currentTime: number;
  duration: number;
  onSeekRatio: (ratio: number) => void;
}) {
  const [width, setWidth] = useState(1);

  return (
    <View>
      <View style={styles.times}>
        <Text style={styles.time}>{formatPlaybackTime(currentTime)}</Text>
        <Text style={styles.time}>{formatPlaybackTime(duration)}</Text>
      </View>
      <Pressable
        style={styles.track}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width || 1)}
        onPress={(e) => onSeekRatio(Math.min(1, Math.max(0, e.nativeEvent.locationX / width)))}
      >
        <View style={[styles.progress, { width: `${Math.min(100, Math.max(0, progress))}%` }]} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hud: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  meta: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 17, fontWeight: '700' },
  subtitle: { color: colors.textSecondary, fontSize: 13 },
  bottomBlock: { gap: spacing.sm },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { color: colors.textSecondary, fontSize: 12, fontVariant: ['tabular-nums'] },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  progress: { height: '100%', backgroundColor: colors.brand },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  menuRow: { gap: spacing.sm, paddingVertical: 4 },
  menuChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  playChip: { minWidth: 56, alignItems: 'center' },
  chipText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  skipBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderWidth: 1,
    borderColor: colors.brand,
  },
  errorBox: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  errorText: { color: colors.text, fontSize: 18, fontWeight: '600' },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    maxHeight: '70%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: colors.bgCard,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  sheetScroll: { maxHeight: 420 },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sheetRowSelected: { backgroundColor: 'rgba(79,70,229,0.2)' },
  sheetRowText: { color: colors.text, fontSize: 16, fontWeight: '500', flex: 1 },
  check: { color: colors.brand, fontSize: 18, fontWeight: '700' },
});
