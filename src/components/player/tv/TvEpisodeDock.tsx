import { StyleSheet, Text, View } from 'react-native';

import { TvHudPressable } from '@/components/player/tv/TvHudPressable';
import type { TvPlayerButtonId, TvPlayerPanelFocus } from '@/components/player/tv/tvPlayerTypes';
import type { TvHwEvent } from '@/lib/tvEventHandler';
import { spacing } from '@/constants/aniverse';

interface TvEpisodeDockProps {
  visible: boolean;
  playing: boolean;
  panelFocus: TvPlayerPanelFocus;
  hasPrev: boolean;
  hasNext: boolean;
  onTvKey: (event: TvHwEvent) => void;
  onFocusButton: (id: TvPlayerButtonId) => void;
  onActivate: (id: TvPlayerButtonId) => void;
  /** Dock-only (panel hidden): ↑/↓ must show the bottom bar, not native-search. */
  captureVertical?: boolean;
  /** Dock-only (panel hidden): ←/→ seek without leaving play for reveal edges. */
  captureHorizontal?: boolean;
  nextFocusDown?: number;
  nextFocusUp?: number;
}

/** Mid-screen transport: prev / play / next — site TV-style circular controls. */
export function TvEpisodeDock({
  visible,
  playing,
  panelFocus,
  hasPrev,
  hasNext,
  onTvKey,
  onFocusButton,
  onActivate,
  captureVertical = false,
  captureHorizontal = false,
  nextFocusDown,
  nextFocusUp,
}: TvEpisodeDockProps) {
  if (!visible) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.row}>
        {hasPrev ? (
          <TvHudPressable
            style={[styles.btn, panelFocus === 'prev_episode' && styles.btnFocused]}
            onTvKey={onTvKey}
            captureVertical={captureVertical}
            captureHorizontal={captureHorizontal}
            onFocus={() => onFocusButton('prev_episode')}
            onPress={() => onActivate('prev_episode')}
          >
            <Text
              style={[styles.icon, panelFocus === 'prev_episode' && styles.iconFocused]}
            >
              ⏮
            </Text>
          </TvHudPressable>
        ) : (
          <View style={styles.spacer} />
        )}
        <TvHudPressable
          hasTVPreferredFocus
          style={[styles.btn, styles.btnPlay, panelFocus === 'play' && styles.btnFocused]}
          onTvKey={onTvKey}
          captureVertical={captureVertical}
          captureHorizontal={captureHorizontal}
          nextFocusDown={nextFocusDown}
          nextFocusUp={nextFocusUp}
          onFocus={() => onFocusButton('play')}
          onPress={() => onActivate('play')}
        >
          <Text
            style={[
              styles.icon,
              styles.iconPlay,
              panelFocus === 'play' && styles.iconFocused,
            ]}
          >
            {playing ? '❚❚' : '▶'}
          </Text>
        </TvHudPressable>
        {hasNext ? (
          <TvHudPressable
            style={[styles.btn, panelFocus === 'next_episode' && styles.btnFocused]}
            onTvKey={onTvKey}
            captureVertical={captureVertical}
            captureHorizontal={captureHorizontal}
            onFocus={() => onFocusButton('next_episode')}
            onPress={() => onActivate('next_episode')}
          >
            <Text
              style={[styles.icon, panelFocus === 'next_episode' && styles.iconFocused]}
            >
              ⏭
            </Text>
          </TvHudPressable>
        ) : (
          <View style={styles.spacer} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 36,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  spacer: {
    width: 56,
  },
  btn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  btnPlay: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  btnFocused: {
    backgroundColor: '#fff',
  },
  icon: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 22,
    fontWeight: '600',
  },
  iconPlay: {
    fontSize: 28,
    marginLeft: 2,
  },
  iconFocused: {
    color: '#111',
  },
});
