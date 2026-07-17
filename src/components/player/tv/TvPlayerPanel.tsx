import { StyleSheet, Text, View } from 'react-native';

import type { TvPlayerButtonId, TvPlayerPanelFocus } from '@/components/player/tv/tvPlayerTypes';
import { colors, spacing } from '@/constants/aniverse';
import { formatPlaybackTime } from '@/lib/formatPlaybackTime';
import { formatPlaybackRate, type PlayerPreferences } from '@/lib/playerPreferences';

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
  selectedDubbing?: string;
  selectedQuality?: string;
  selectedConnection?: string;
  selectedDelivery?: string;
}

function FocusChip({
  label,
  focused,
  large,
}: {
  label: string;
  focused: boolean;
  large?: boolean;
}) {
  return (
    <View style={[styles.chip, large && styles.chipLarge, focused && styles.chipFocused]}>
      <Text style={[styles.chipText, large && styles.chipTextLarge]}>{label}</Text>
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
  selectedDubbing,
  selectedQuality,
  selectedConnection,
  selectedDelivery,
}: TvPlayerPanelProps) {
  if (!visible) return null;

  const isFocused = (id: TvPlayerButtonId) => panelFocus === id;
  const timelineFocused = panelFocus === 'timeline';

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.body}>
        {(title || subtitle) && (
          <View style={styles.meta}>
            {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
        )}

        <View style={[styles.timeline, timelineFocused && styles.timelineFocused]}>
          <View style={styles.track}>
            <View style={[styles.progress, { width: `${Math.min(100, Math.max(0, progress))}%` }]} />
          </View>
        </View>

        <View style={styles.times}>
          <Text style={styles.time}>{formatPlaybackTime(currentTime)}</Text>
          <Text style={styles.time}>{formatPlaybackTime(duration)}</Text>
        </View>

        <View style={styles.transport}>
          {enabledButtons.has('prev_episode') ? (
            <FocusChip label="⏮" focused={isFocused('prev_episode')} />
          ) : null}
          <FocusChip
            label={`−${prefs.skipBackwardSeconds}`}
            focused={isFocused('rprev')}
          />
          <FocusChip
            label={playing ? '❚❚' : '▶'}
            focused={isFocused('play')}
            large
          />
          <FocusChip
            label={`+${prefs.skipForwardSeconds}`}
            focused={isFocused('rnext')}
          />
          {enabledButtons.has('next_episode') ? (
            <FocusChip label="⏭" focused={isFocused('next_episode')} />
          ) : null}
        </View>

        <View style={styles.options}>
          {hasDubbing ? (
            <FocusChip
              label={selectedDubbing ?? 'Озвучка'}
              focused={isFocused('dubbing')}
            />
          ) : null}
          {hasQuality ? (
            <FocusChip
              label={selectedQuality ?? 'Качество'}
              focused={isFocused('quality')}
            />
          ) : null}
          {hasConnection ? (
            <FocusChip
              label={selectedConnection ?? 'Подключение'}
              focused={isFocused('connection')}
            />
          ) : null}
          {hasDelivery ? (
            <FocusChip
              label={selectedDelivery ?? 'Тип'}
              focused={isFocused('delivery')}
            />
          ) : null}
          {enabledButtons.has('episodes') ? (
            <FocusChip label="Эпизоды" focused={isFocused('episodes')} />
          ) : null}
          <FocusChip
            label={`⚙ ${formatPlaybackRate(prefs.playbackRate)}`}
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
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  body: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  meta: { gap: 4 },
  title: { color: colors.text, fontSize: 26, fontWeight: '700' },
  subtitle: { color: colors.textSecondary, fontSize: 18 },
  timeline: {
    borderRadius: 8,
    paddingVertical: 6,
  },
  timelineFocused: {
    borderWidth: 2,
    borderColor: colors.brand,
    paddingHorizontal: 4,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
    backgroundColor: colors.brand,
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: { color: colors.textSecondary, fontSize: 16, fontVariant: ['tabular-nums'] },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.bgElevated,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  chipLarge: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    minWidth: 88,
    alignItems: 'center',
  },
  chipFocused: {
    borderColor: colors.brand,
    backgroundColor: colors.brandAccent,
  },
  chipText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  chipTextLarge: { fontSize: 22 },
});
