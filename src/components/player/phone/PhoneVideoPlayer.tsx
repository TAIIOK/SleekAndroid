import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Brightness from 'expo-brightness';
import { LinearGradient } from 'expo-linear-gradient';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Video, { ViewType } from 'react-native-video';

import { PhoneGestureHud } from '@/components/player/phone/PhoneGestureHud';
import { PhoneScrubBar } from '@/components/player/phone/PhoneScrubBar';
import type { PlayerMenuOption, VideoPlayerProps } from '@/components/player/types';
import { colors, spacing } from '@/constants/aniverse';
import { usePhonePlayerGestures } from '@/hooks/usePhonePlayerGestures';
import { useRNVideoEngine } from '@/hooks/useRNVideoEngine';
import {
  launchExternalPlayer,
  listInstalledExternalPlayers,
  type ExternalPlayerTarget,
} from '@/lib/externalPlayer';
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

const CONTROLS_HIDE_MS = 4000;

/**
 * Site-like phone player: TextureView + custom HUD in the activity window.
 * Bottom sheets use a transparent Modal; video itself is not in a Dialog.
 */
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
  const [lockToast, setLockToast] = useState(false);
  const [brightness, setBrightnessState] = useState(1);
  const [pipActive, setPipActive] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsVisibleRef = useRef(controlsVisible);
  const sheetRef = useRef(sheet);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    void listInstalledExternalPlayers().then(setExternalPlayers);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void Brightness.getBrightnessAsync()
      .then((value) => {
        if (cancelled) return;
        setBrightnessState(Math.max(0, Math.min(1, value)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    controlsVisibleRef.current = controlsVisible;
  }, [controlsVisible]);

  useEffect(() => {
    sheetRef.current = sheet;
  }, [sheet]);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    if (!engine.playing || sheet || engine.playbackError || externalError) return;
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), CONTROLS_HIDE_MS);
  }, [clearHideTimer, engine.playing, engine.playbackError, externalError, sheet]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  const hideControls = useCallback(() => {
    clearHideTimer();
    setControlsVisible(false);
  }, [clearHideTimer]);

  const setBrightness = useCallback((value: number) => {
    const next = Math.max(0, Math.min(1, value));
    setBrightnessState(next);
    void Brightness.setBrightnessAsync(next).catch(() => {});
  }, []);

  useEffect(() => {
    scheduleHide();
    return clearHideTimer;
  }, [scheduleHide, clearHideTimer, engine.playing]);

  useEffect(() => {
    if (!engine.playing || engine.playbackError || externalError) {
      setControlsVisible(true);
      clearHideTimer();
    }
  }, [engine.playing, engine.playbackError, externalError, clearHideTimer]);

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

  const isSuppressed = useCallback(
    () => sheetRef.current != null || !!engine.playbackError || !!externalError,
    [engine.playbackError, externalError],
  );

  const gestures = usePhonePlayerGestures({
    enabled: engine.prefs.gestureControlsEnabled,
    locked: engine.prefs.gesturesLocked,
    duration: engine.duration,
    currentTime: engine.currentTime,
    volume: engine.volume,
    brightness,
    skipBackwardSeconds: engine.prefs.skipBackwardSeconds,
    skipForwardSeconds: engine.prefs.skipForwardSeconds,
    setVolume: engine.setVolume,
    setBrightness,
    seekTo: engine.seekTo,
    seekBy: (delta) => {
      engine.seekBy(delta);
      showControls();
    },
    areControlsVisible: () => controlsVisibleRef.current,
    showControls,
    hideControls,
    isSuppressed,
  });

  const openSheet = (next: PhoneSheet) => {
    setSheet(next);
    setControlsVisible(true);
    clearHideTimer();
  };

  const toggleGestureLock = () => {
    const locked = !engine.prefs.gesturesLocked;
    engine.updatePrefs({ gesturesLocked: locked });
    if (locked) {
      setLockToast(true);
      setTimeout(() => setLockToast(false), 1800);
    }
    showControls();
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
      label: `Автопропуск интро · ${engine.prefs.autoSkipOpening ? 'Вкл' : 'Выкл'}`,
      onPress: () => engine.updatePrefs({ autoSkipOpening: !engine.prefs.autoSkipOpening }),
    },
    {
      id: 'skip_end',
      label: `Автопропуск титров · ${engine.prefs.autoSkipEnding ? 'Вкл' : 'Выкл'}`,
      onPress: () => engine.updatePrefs({ autoSkipEnding: !engine.prefs.autoSkipEnding }),
    },
    {
      id: 'gestures',
      label: `Жесты · ${engine.prefs.gestureControlsEnabled ? 'Вкл' : 'Выкл'}`,
      onPress: () =>
        engine.updatePrefs({ gestureControlsEnabled: !engine.prefs.gestureControlsEnabled }),
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
    else {
      void engine.updatePrefs({
        lastExternalPlayerPackage: target.packageName ?? '',
      });
    }
  };

  const padH = {
    paddingLeft: Math.max(insets.left, spacing.md),
    paddingRight: Math.max(insets.right, spacing.md),
  };

  const showChrome =
    (controlsVisible || !engine.playing) &&
    !engine.playbackError &&
    !externalError &&
    !pipActive;
  const canPickEpisodes = Boolean(episodeNav && episodeNav.items.length > 1);
  const selectedDubbing = dubbingOptions?.find((o) => o.selected)?.label;
  const selectedQuality = qualityOptions?.find((o) => o.selected)?.label;
  const selectedConnection = connectionOptions?.find((o) => o.selected)?.label;
  const selectedDelivery = deliveryOptions?.find((o) => o.selected)?.label;

  return (
    <GestureHandlerRootView style={styles.root}>
      <View
        style={styles.videoHost}
        collapsable={false}
        onLayout={(e) =>
          gestures.onLayout(e.nativeEvent.layout.width, e.nativeEvent.layout.height)
        }
      >
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
            onPictureInPictureStatusChanged={({ isActive }) => {
              setPipActive(isActive);
              if (isActive) {
                setControlsVisible(false);
                clearHideTimer();
              } else {
                showControls();
              }
            }}
          />
        ) : null}
      </View>

      <GestureDetector gesture={gestures.gesture}>
        <View collapsable={false} style={styles.gestureLayer} />
      </GestureDetector>

      <PhoneGestureHud
        kind={gestures.hudKind}
        volume={gestures.hudVolume}
        brightness={gestures.hudBrightness}
      />

      {gestures.doubleTapHint ? (
        <View style={styles.doubleTapRow} pointerEvents="none">
          <View style={styles.doubleTapHalf}>
            {gestures.doubleTapHint === 'backward' ? (
              <View style={styles.doubleTapPill}>
                <Text style={styles.doubleTapText}>−{engine.prefs.skipBackwardSeconds}c</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.doubleTapHalf}>
            {gestures.doubleTapHint === 'forward' ? (
              <View style={styles.doubleTapPill}>
                <Text style={styles.doubleTapText}>+{engine.prefs.skipForwardSeconds}c</Text>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      {lockToast ? (
        <View style={styles.lockToastWrap} pointerEvents="none">
          <View style={styles.lockToast}>
            <Text style={styles.lockToastText}>Жесты заблокированы</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.fadeLayer} pointerEvents="none">
        <LinearGradient
          colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.4)', 'transparent']}
          style={[styles.topFade, { opacity: showChrome ? 1 : 0 }]}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']}
          style={[styles.bottomFade, { opacity: showChrome ? 1 : 0 }]}
        />
      </View>

      {engine.isLoading && !engine.playbackError ? (
        <View style={styles.center} pointerEvents="none">
          <ActivityIndicator color={colors.brand} size="large" />
        </View>
      ) : null}

      {/* Always on top of chrome — skip must stay tappable after controls auto-hide. */}
      {engine.visibleSkip && !engine.playbackError && !externalError && !pipActive ? (
        <View
          style={[
            styles.skipFloat,
            padH,
            {
              bottom: showChrome
                ? Math.max(insets.bottom, 14) + 118
                : Math.max(insets.bottom, 24) + 12,
            },
          ]}
          pointerEvents="box-none"
        >
          <Pressable
            onPress={() => engine.applySkip(engine.visibleSkip!)}
            style={styles.skipBtn}
          >
            <Text style={styles.chipText}>{engine.visibleSkip.title}</Text>
          </Pressable>
        </View>
      ) : null}

      {engine.playbackError || externalError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Ошибка воспроизведения</Text>
          <Text style={styles.errorText}>{engine.playbackError ?? externalError}</Text>
          {engine.playbackError ? (
            <Pressable onPress={engine.retryPlayback} style={styles.errorBtn}>
              <Text style={styles.chipText}>Повторить</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => setExternalError(null)} style={styles.errorBtn}>
              <Text style={styles.chipText}>Закрыть</Text>
            </Pressable>
          )}
          <Pressable onPress={onBack} style={styles.errorBtn}>
            <Text style={styles.chipText}>Назад</Text>
          </Pressable>
        </View>
      ) : null}

      <View
        style={[styles.chrome, { opacity: showChrome ? 1 : 0 }]}
        pointerEvents={showChrome ? 'box-none' : 'none'}
      >
        <View
          style={[styles.topBar, padH, { paddingTop: Math.max(insets.top, 12) }]}
          pointerEvents="box-none"
        >
          <IconBtn onPress={onBack} label="Назад">
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </IconBtn>
          <View style={styles.meta}>
            {canPickEpisodes ? (
              <Pressable
                onPress={() => openSheet('episodes')}
                style={styles.titleBtn}
                hitSlop={8}
              >
                {title ? (
                  <Text style={styles.title} numberOfLines={1}>
                    {title}
                  </Text>
                ) : null}
                <Ionicons name="chevron-down" size={16} color="#fff" />
              </Pressable>
            ) : title ? (
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <IconBtn
            onPress={toggleGestureLock}
            label={engine.prefs.gesturesLocked ? 'Разблокировать жесты' : 'Заблокировать жесты'}
          >
            <Ionicons
              name={engine.prefs.gesturesLocked ? 'lock-closed' : 'lock-open'}
              size={20}
              color={engine.prefs.gesturesLocked ? '#fb923c' : '#fff'}
            />
          </IconBtn>
          <IconBtn
            onPress={() => {
              engine.enterPictureInPicture();
              showControls();
            }}
            label="Картинка в картинке"
          >
            <Ionicons name="browsers-outline" size={22} color="#fff" />
          </IconBtn>
          <IconBtn onPress={() => openSheet('settings')} label="Настройки">
            <Ionicons name="settings-outline" size={22} color="#fff" />
          </IconBtn>
        </View>

        <View style={styles.centerTransport} pointerEvents="box-none">
          <View style={styles.transportPill}>
            {episodeNav ? (
              <IconBtn
                onPress={episodeNav.onPrevious}
                disabled={!episodeNav.hasPrevious}
                label="Предыдущий эпизод"
                size={44}
              >
                <Ionicons name="play-skip-back" size={26} color="#fff" />
              </IconBtn>
            ) : null}
            <IconBtn
              onPress={() => {
                engine.seekBy(-engine.prefs.skipBackwardSeconds);
                showControls();
              }}
              label={`Назад ${engine.prefs.skipBackwardSeconds}с`}
              size={44}
            >
              <Text style={styles.seekLabel}>−{engine.prefs.skipBackwardSeconds}</Text>
            </IconBtn>
            <Pressable
              onPress={() => {
                engine.togglePlay();
                showControls();
              }}
              style={styles.playBtn}
              hitSlop={8}
              accessibilityLabel={engine.playing ? 'Пауза' : 'Воспроизведение'}
            >
              <Ionicons
                name={engine.playing ? 'pause' : 'play'}
                size={36}
                color="#fff"
                style={!engine.playing ? { marginLeft: 3 } : undefined}
              />
            </Pressable>
            <IconBtn
              onPress={() => {
                engine.seekBy(engine.prefs.skipForwardSeconds);
                showControls();
              }}
              label={`Вперёд ${engine.prefs.skipForwardSeconds}с`}
              size={44}
            >
              <Text style={styles.seekLabel}>+{engine.prefs.skipForwardSeconds}</Text>
            </IconBtn>
            {episodeNav ? (
              <IconBtn
                onPress={episodeNav.onNext}
                disabled={!episodeNav.hasNext}
                label="Следующий эпизод"
                size={44}
              >
                <Ionicons name="play-skip-forward" size={26} color="#fff" />
              </IconBtn>
            ) : null}
          </View>
        </View>

        <View
          style={[styles.bottomBar, padH, { paddingBottom: Math.max(insets.bottom, 14) }]}
          pointerEvents="box-none"
        >
          <PhoneScrubBar
            progress={engine.progress}
            currentTime={engine.currentTime}
            duration={engine.duration}
            skipSegments={skipSegments}
            onSeekRatio={(ratio) => {
              if (engine.duration > 0) engine.seekTo(engine.duration * ratio);
              showControls();
            }}
          />

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.menuRow}
          >
            <ActionChip
              label="Авто"
              active={engine.prefs.autoPlayNext}
              onPress={() => {
                engine.updatePrefs({ autoPlayNext: !engine.prefs.autoPlayNext });
                showControls();
              }}
              icon="play-forward"
            />
            {dubbingOptions && dubbingOptions.length > 1 ? (
              <ActionChip
                label={selectedDubbing ?? 'Озвучка'}
                onPress={() => openSheet('dubbing')}
                icon="mic"
              />
            ) : null}
            {qualityOptions && qualityOptions.length > 1 ? (
              <ActionChip
                label={selectedQuality ?? 'Качество'}
                onPress={() => openSheet('quality')}
                icon="videocam"
              />
            ) : null}
            {connectionOptions && connectionOptions.length > 1 ? (
              <ActionChip
                label={selectedConnection ?? 'Сеть'}
                onPress={() => openSheet('connection')}
                icon="wifi"
              />
            ) : null}
            {deliveryOptions && deliveryOptions.length > 1 ? (
              <ActionChip
                label={selectedDelivery ?? 'Поток'}
                onPress={() => openSheet('delivery')}
                icon="git-network"
              />
            ) : null}
            {canPickEpisodes ? (
              <ActionChip label="Эпизоды" onPress={() => openSheet('episodes')} icon="list" />
            ) : null}
            {engine.subtitleTracks.length > 0 ? (
              <ActionChip label="CC" onPress={() => openSheet('subtitles')} icon="text" />
            ) : null}
            {Platform.OS === 'android' && externalPlayers.length > 0 ? (
              <ActionChip
                label="Внешний"
                onPress={() => openSheet('external')}
                icon="open-outline"
              />
            ) : null}
          </ScrollView>
        </View>
      </View>

      <Modal
        visible={sheet != null}
        transparent
        animationType="slide"
        onRequestClose={() => setSheet(null)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setSheet(null)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
            onPress={() => undefined}
          >
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
    </GestureHandlerRootView>
  );
}

function IconBtn({
  children,
  onPress,
  disabled,
  label,
  size = 40,
}: {
  children: ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  label: string;
  size?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityLabel={label}
      hitSlop={8}
      style={[
        styles.iconBtn,
        { width: size, height: size, opacity: disabled ? 0.35 : 1 },
      ]}
    >
      {children}
    </Pressable>
  );
}

function ActionChip({
  label,
  onPress,
  icon,
  active,
}: {
  label: string;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.actionChip, active && styles.actionChipActive]}
    >
      <Ionicons name={icon} size={16} color={active ? colors.brand : colors.brandTint} />
      <Text style={[styles.actionChipText, active && styles.actionChipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  videoHost: { ...StyleSheet.absoluteFill, backgroundColor: '#000' },
  video: { ...StyleSheet.absoluteFill },
  gestureLayer: {
    ...StyleSheet.absoluteFill,
    zIndex: 10,
    backgroundColor: 'transparent',
  },
  fadeLayer: { ...StyleSheet.absoluteFill, zIndex: 15 },
  topFade: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
  bottomFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 180 },
  chrome: { ...StyleSheet.absoluteFill, zIndex: 20 },
  skipFloat: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 30,
    alignItems: 'flex-end',
  },
  center: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 25,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
  },
  meta: { flex: 1, gap: 2, minWidth: 0 },
  titleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: '100%' },
  title: { color: '#fff', fontSize: 16, fontWeight: '700', flexShrink: 1 },
  subtitle: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },
  iconBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  centerTransport: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  playBtn: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  menuRow: { gap: spacing.sm, paddingVertical: 4, alignItems: 'center' },
  actionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(79,70,229,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(195,192,255,0.22)',
    maxWidth: 160,
    overflow: 'hidden',
  },
  actionChipActive: {
    backgroundColor: 'rgba(79,70,229,0.42)',
    borderColor: colors.brand,
  },
  actionChipText: {
    color: colors.brandTint,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
    minWidth: 0,
  },
  actionChipTextActive: { color: colors.brand },
  skipBtn: {
    alignSelf: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: 'rgba(79,70,229,0.35)',
    borderWidth: 1,
    borderColor: colors.brand,
  },
  chipText: { color: colors.brandTint, fontSize: 15, fontWeight: '600' },
  doubleTapRow: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 22,
  },
  doubleTapHalf: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  doubleTapPill: {
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  doubleTapText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  lockToastWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 120,
    alignItems: 'center',
    zIndex: 35,
  },
  lockToast: {
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  lockToastText: { color: '#fff', fontSize: 14 },
  errorBox: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 40,
    paddingHorizontal: spacing.lg,
  },
  errorTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  errorText: { color: 'rgba(255,255,255,0.65)', fontSize: 14, textAlign: 'center' },
  errorBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
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
