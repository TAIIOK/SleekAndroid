import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, type DimensionValue } from 'react-native';

import { TvHudPressable } from '@/components/player/tv/TvHudPressable';
import type { TvPlayerButtonId, TvPlayerPanelFocus } from '@/components/player/tv/tvPlayerTypes';
import { radii, spacing } from '@/constants/aniverse';
import { formatPlaybackTime } from '@/lib/formatPlaybackTime';
import {
  formatPlaybackRate,
  videoFitLabel,
  type PlayerPreferences,
} from '@/lib/playerPreferences';
import { isOpeningLikeSkip, type PlayerSkipSegment } from '@/lib/playerSkip';
import type { TvHwEvent } from '@/lib/tvEventHandler';

function pct(value: number): DimensionValue {
  return `${Math.min(100, Math.max(0, value))}%`;
}

interface TvPlayerPanelProps {
  visible: boolean;
  panelFocus: TvPlayerPanelFocus;
  title?: string;
  subtitle?: string;
  currentTime: number;
  duration: number;
  progress: number;
  prefs: PlayerPreferences;
  skipSegments?: PlayerSkipSegment[];
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
  onTvKey: (event: TvHwEvent) => void;
  onFocusButton: (id: TvPlayerPanelFocus) => void;
  onActivate: (id: TvPlayerButtonId) => void;
}

function OptionPill({
  label,
  value,
  focused,
  compact,
  onTvKey,
  onFocus,
  onPress,
}: {
  label?: string;
  value: string;
  focused: boolean;
  compact?: boolean;
  onTvKey: (event: TvHwEvent) => void;
  onFocus: () => void;
  onPress: () => void;
}) {
  return (
    <TvHudPressable
      style={[styles.pill, compact && styles.pillCompact, focused && styles.pillFocused]}
      onTvKey={onTvKey}
      onFocus={onFocus}
      onPress={onPress}
    >
      {label ? (
        <Text style={[styles.pillLabel, focused && styles.pillLabelFocused]} numberOfLines={1}>
          {label}
        </Text>
      ) : null}
      <Text style={[styles.pillValue, focused && styles.pillValueFocused]} numberOfLines={1}>
        {value}
      </Text>
    </TvHudPressable>
  );
}

/** Compact site-like bottom HUD: meta + timeline + option pills (no seek transport). */
export function TvPlayerPanel({
  visible,
  panelFocus,
  title,
  subtitle,
  currentTime,
  duration,
  progress,
  prefs,
  skipSegments = [],
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
  onTvKey,
  onFocusButton,
  onActivate,
}: TvPlayerPanelProps) {
  if (!visible) return null;

  const isFocused = (id: TvPlayerButtonId) => panelFocus === id;
  const timelineFocused = panelFocus === 'timeline';
  const progressWidth = pct(progress);

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.82)']}
        locations={[0, 0.5, 1]}
        style={styles.fade}
        pointerEvents="none"
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

        <TvHudPressable
          captureHorizontal
          style={[styles.timeline, timelineFocused && styles.timelineFocused]}
          onTvKey={onTvKey}
          onFocus={() => onFocusButton('timeline')}
          onPress={() => onActivate('play')}
        >
          <View style={styles.track}>
            {duration > 0
              ? skipSegments.map((segment) => {
                  const left = (segment.start / duration) * 100;
                  const width = ((segment.end - segment.start) / duration) * 100;
                  return (
                    <View
                      key={segment.id}
                      style={[
                        styles.skipMark,
                        isOpeningLikeSkip(segment.type) ? styles.skipOpen : styles.skipEnd,
                        { left: pct(left), width: pct(Math.max(width, 0.5)) },
                      ]}
                    />
                  );
                })
              : null}
            <View style={[styles.progress, { width: progressWidth }]}>
              <View style={styles.thumb} />
            </View>
          </View>
        </TvHudPressable>

        <View style={styles.times}>
          <Text style={styles.time}>{formatPlaybackTime(currentTime)}</Text>
          <Text style={styles.time}>{formatPlaybackTime(duration)}</Text>
        </View>

        <View style={styles.options}>
          {hasDubbing ? (
            <OptionPill
              label="Озвучка"
              value={selectedDubbing ?? '—'}
              focused={isFocused('dubbing')}
              onTvKey={onTvKey}
              onFocus={() => onFocusButton('dubbing')}
              onPress={() => onActivate('dubbing')}
            />
          ) : null}
          {hasQuality ? (
            <OptionPill
              label="Качество"
              value={selectedQuality ?? '—'}
              focused={isFocused('quality')}
              onTvKey={onTvKey}
              onFocus={() => onFocusButton('quality')}
              onPress={() => onActivate('quality')}
            />
          ) : null}
          {hasConnection ? (
            <OptionPill
              label="Сеть"
              value={selectedConnection ?? '—'}
              focused={isFocused('connection')}
              onTvKey={onTvKey}
              onFocus={() => onFocusButton('connection')}
              onPress={() => onActivate('connection')}
            />
          ) : null}
          {hasDelivery ? (
            <OptionPill
              label="Поток"
              value={selectedDelivery ?? '—'}
              focused={isFocused('delivery')}
              onTvKey={onTvKey}
              onFocus={() => onFocusButton('delivery')}
              onPress={() => onActivate('delivery')}
            />
          ) : null}
          {enabledButtons.has('episodes') ? (
            <OptionPill
              value="Эпизоды"
              focused={isFocused('episodes')}
              compact
              onTvKey={onTvKey}
              onFocus={() => onFocusButton('episodes')}
              onPress={() => onActivate('episodes')}
            />
          ) : null}
          {hasSubtitles ? (
            <OptionPill
              label="CC"
              value={selectedSubtitle ?? 'Выкл'}
              focused={isFocused('subtitles')}
              onTvKey={onTvKey}
              onFocus={() => onFocusButton('subtitles')}
              onPress={() => onActivate('subtitles')}
            />
          ) : null}
          <OptionPill
            label="Кадр"
            value={videoFitLabel(prefs.videoFit)}
            focused={isFocused('fit')}
            onTvKey={onTvKey}
            onFocus={() => onFocusButton('fit')}
            onPress={() => onActivate('fit')}
          />
          {enabledButtons.has('external') ? (
            <OptionPill
              value="Внешний"
              focused={isFocused('external')}
              compact
              onTvKey={onTvKey}
              onFocus={() => onFocusButton('external')}
              onPress={() => onActivate('external')}
            />
          ) : null}
          <OptionPill
            label="Скорость"
            value={formatPlaybackRate(prefs.playbackRate)}
            focused={isFocused('settings')}
            onTvKey={onTvKey}
            onFocus={() => onFocusButton('settings')}
            onPress={() => onActivate('settings')}
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
    ...StyleSheet.absoluteFill,
    top: -64,
  },
  body: {
    width: '100%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.78)',
    gap: 6,
  },
  meta: { gap: 1, marginBottom: 2 },
  title: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 12,
    fontWeight: '400',
  },
  timeline: {
    height: 10,
    borderRadius: radii.pill,
    justifyContent: 'center',
    paddingVertical: 3,
  },
  timelineFocused: {
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: '#fff',
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  track: {
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.14)',
    overflow: 'visible',
    justifyContent: 'center',
  },
  skipMark: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  skipOpen: { backgroundColor: 'rgba(251,146,60,0.45)' },
  skipEnd: { backgroundColor: 'rgba(195,192,255,0.45)' },
  progress: {
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: '#fff',
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
    backgroundColor: '#fff',
  },
  times: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: -2,
  },
  time: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 11,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  pill: {
    minWidth: 72,
    maxWidth: 180,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    gap: 0,
  },
  pillCompact: {
    minWidth: 64,
    justifyContent: 'center',
  },
  pillFocused: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  pillLabel: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  pillLabelFocused: {
    color: 'rgba(0,0,0,0.45)',
  },
  pillValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  pillValueFocused: {
    color: '#111',
  },
});
