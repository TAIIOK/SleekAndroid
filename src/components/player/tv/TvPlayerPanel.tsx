import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { TvPlayerButtonId, TvPlayerPanelFocus } from '@/components/player/tv/tvPlayerTypes';
import { colors, radii, spacing } from '@/constants/aniverse';
import { formatPlaybackTime } from '@/lib/formatPlaybackTime';
import {
  formatPlaybackRate,
  videoFitLabel,
  type PlayerPreferences,
} from '@/lib/playerPreferences';

interface TvPlayerPanelProps {
  visible: boolean;
  panelFocus: TvPlayerPanelFocus;
  playing: boolean;
  title?: string;
  subtitle?: string;
  currentTime: number;
  duration: number;
  progress: number;
  prefs: PlayerPreferences;
  enabledButtons: Set<TvPlayerButtonId>;
  hasDubbing: boolean;
  hasQuality: boolean;
  hasConnection: boolean;
  hasDelivery: boolean;
  hasSubtitles?: boolean;
  selectedDubbing?: string;
  selectedQuality?: string;
  selectedConnection?: string;
  selectedDelivery?: string;
  selectedSubtitle?: string;
}

function TransportButton({
  focused,
  play,
  children,
}: {
  focused: boolean;
  play?: boolean;
  children: ReactNode;
}) {
  return (
    <View
      style={[
        styles.transportBtn,
        play && styles.transportBtnPlay,
        focused && styles.transportBtnFocused,
      ]}
    >
      <Text
        style={[
          styles.transportBtnText,
          play && styles.transportBtnTextPlay,
          focused && styles.transportBtnTextFocused,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

function OptionPill({
  label,
  value,
  focused,
  compact,
}: {
  label?: string;
  value: string;
  focused: boolean;
  compact?: boolean;
}) {
  return (
    <View style={[styles.pill, compact && styles.pillCompact, focused && styles.pillFocused]}>
      {label ? (
        <Text style={[styles.pillLabel, focused && styles.pillLabelFocused]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
      <Text style={[styles.pillValue, focused && styles.pillValueFocused]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function TvPlayerPanel({
  visible,
  panelFocus,
  playing,
  title,
  subtitle,
  currentTime,
  duration,
  progress,
  prefs,
  enabledButtons,
  hasDubbing,
  hasQuality,
  hasConnection,
  hasDelivery,
  hasSubtitles,
  selectedDubbing,
  selectedQuality,
  selectedConnection,
  selectedDelivery,
  selectedSubtitle,
}: TvPlayerPanelProps) {
  if (!visible) return null;

  const isFocused = (id: TvPlayerButtonId) => panelFocus === id;
  const timelineFocused = panelFocus === 'timeline';
  const progressWidth = `${Math.min(100, Math.max(0, progress))}%`;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.88)']}
        locations={[0, 0.45, 1]}
        style={styles.fade}
      />

      <View style={styles.body}>
        {(title || subtitle) && (
          <View style={styles.meta}>
            {title ? (
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
            ) : null}
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
            ) : null}
          </View>
        )}

        <View style={[styles.timeline, timelineFocused && styles.timelineFocused]}>
          <View style={styles.track}>
            <View style={[styles.progress, { width: progressWidth }]}>
              <View style={styles.thumb} />
            </View>
          </View>
        </View>

        <View style={styles.times}>
          <Text style={styles.time}>{formatPlaybackTime(currentTime)}</Text>
          <Text style={styles.time}>{formatPlaybackTime(duration)}</Text>
        </View>

        <View style={styles.transport}>
          <View style={styles.transportSide}>
            {enabledButtons.has('prev_episode') ? (
              <TransportButton focused={isFocused('prev_episode')}>⏮</TransportButton>
            ) : (
              <View style={styles.transportSpacer} />
            )}
            <TransportButton focused={isFocused('rprev')}>
              −{prefs.skipBackwardSeconds}
            </TransportButton>
          </View>

          <TransportButton focused={isFocused('play')} play>
            {playing ? '❚❚' : '▶'}
          </TransportButton>

          <View style={[styles.transportSide, styles.transportSideEnd]}>
            <TransportButton focused={isFocused('rnext')}>
              +{prefs.skipForwardSeconds}
            </TransportButton>
            {enabledButtons.has('next_episode') ? (
              <TransportButton focused={isFocused('next_episode')}>⏭</TransportButton>
            ) : (
              <View style={styles.transportSpacer} />
            )}
          </View>
        </View>

        <View style={styles.options}>
          {hasDubbing ? (
            <OptionPill
              label="Озвучка"
              value={selectedDubbing ?? '—'}
              focused={isFocused('dubbing')}
            />
          ) : null}
          {hasQuality ? (
            <OptionPill
              label="Качество"
              value={selectedQuality ?? '—'}
              focused={isFocused('quality')}
            />
          ) : null}
          {hasConnection ? (
            <OptionPill
              label="Подключение"
              value={selectedConnection ?? '—'}
              focused={isFocused('connection')}
            />
          ) : null}
          {hasDelivery ? (
            <OptionPill
              label="Поток"
              value={selectedDelivery ?? '—'}
              focused={isFocused('delivery')}
            />
          ) : null}
          {enabledButtons.has('episodes') ? (
            <OptionPill value="Эпизоды" focused={isFocused('episodes')} compact />
          ) : null}
          {hasSubtitles ? (
            <OptionPill
              label="CC"
              value={selectedSubtitle ?? 'Выкл'}
              focused={isFocused('subtitles')}
            />
          ) : null}
          <OptionPill
            label="Кадр"
            value={videoFitLabel(prefs.videoFit)}
            focused={isFocused('fit')}
          />
          {enabledButtons.has('external') ? (
            <OptionPill value="Внешний" focused={isFocused('external')} compact />
          ) : null}
          <OptionPill
            label="Настройки"
            value={formatPlaybackRate(prefs.playbackRate)}
            focused={isFocused('settings')}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  fade: {
    ...StyleSheet.absoluteFillObject,
    top: -120,
  },
  body: {
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(12,11,18,0.78)',
    gap: spacing.md,
  },
  meta: { gap: 4, marginBottom: 2 },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 16,
    fontWeight: '400',
  },
  timeline: {
    height: 10,
    borderRadius: radii.pill,
    justifyContent: 'center',
    paddingVertical: 2,
  },
  timelineFocused: {
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.brand,
    paddingHorizontal: 2,
    paddingVertical: 4,
  },
  track: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    overflow: 'visible',
    justifyContent: 'center',
  },
  progress: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: '#fff',
    maxWidth: '100%',
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    right: -7,
    top: '50%',
    marginTop: -7,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
  },
  time: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 15,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 2,
  },
  transportSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  transportSideEnd: {
    justifyContent: 'flex-end',
  },
  transportSpacer: {
    width: 56,
    height: 56,
  },
  transportBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  transportBtnPlay: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.14)',
  },
  transportBtnFocused: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  transportBtnText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 16,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  transportBtnTextPlay: {
    fontSize: 26,
    marginLeft: 2,
  },
  transportBtnTextFocused: {
    color: '#111',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  pill: {
    minWidth: 118,
    maxWidth: 200,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    gap: 2,
  },
  pillCompact: {
    minWidth: 96,
    justifyContent: 'center',
  },
  pillFocused: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  pillLabel: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  pillLabelFocused: {
    color: 'rgba(0,0,0,0.45)',
  },
  pillValue: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  pillValueFocused: {
    color: '#111',
  },
});
