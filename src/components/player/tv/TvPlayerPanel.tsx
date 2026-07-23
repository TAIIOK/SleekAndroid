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
        )}

        <View style={styles.timelineRow}>
          <Text style={styles.time}>{formatPlaybackTime(currentTime)}</Text>
          <View style={[styles.timeline, timelineFocused && styles.timelineFocused]}>
            <View style={styles.track}>
              <View style={[styles.progress, { width: progressWidth }]}>
                <View style={styles.thumb} />
              </View>
            </View>
          </View>
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
              label="Сеть"
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
            label="Скорость"
            value={formatPlaybackRate(prefs.playbackRate)}
            focused={isFocused('settings')}
          />
        </View>
      </View>
    </View>
  );
}

const BTN = 44;
const BTN_PLAY = 52;

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  fade: {
    ...StyleSheet.absoluteFillObject,
    top: -72,
  },
  body: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm + 2,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(12,11,18,0.78)',
    gap: spacing.sm,
  },
  meta: { gap: 2 },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 13,
    fontWeight: '400',
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  timeline: {
    flex: 1,
    height: 16,
    borderRadius: radii.pill,
    justifyContent: 'center',
    paddingVertical: 4,
  },
  timelineFocused: {
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.brand,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  track: {
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    overflow: 'visible',
    justifyContent: 'center',
  },
  progress: {
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.brand,
    maxWidth: '100%',
    position: 'relative',
  },
  thumb: {
    position: 'absolute',
    right: -5,
    top: '50%',
    marginTop: -5,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.brand,
  },
  time: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 12,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
    minWidth: 40,
    textAlign: 'center',
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transportSide: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  transportSideEnd: {
    justifyContent: 'flex-end',
  },
  transportSpacer: {
    width: BTN,
    height: BTN,
  },
  transportBtn: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  transportBtnPlay: {
    width: BTN_PLAY,
    height: BTN_PLAY,
    borderRadius: BTN_PLAY / 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.14)',
  },
  transportBtnFocused: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  transportBtnText: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  transportBtnTextPlay: {
    fontSize: 20,
    marginLeft: 1,
  },
  transportBtnTextFocused: {
    color: '#111',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    minWidth: 88,
    maxWidth: 220,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(195,192,255,0.2)',
    backgroundColor: 'rgba(79,70,229,0.14)',
    gap: 1,
  },
  pillCompact: {
    minWidth: 80,
    justifyContent: 'center',
  },
  pillFocused: {
    backgroundColor: colors.brand,
    borderColor: colors.brandTint,
  },
  pillLabel: {
    color: 'rgba(218,215,255,0.65)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  pillLabelFocused: {
    color: 'rgba(29,0,165,0.55)',
  },
  pillValue: {
    color: colors.brandTint,
    fontSize: 15,
    fontWeight: '600',
  },
  pillValueFocused: {
    color: colors.brandOn,
  },
});
