import { StyleSheet, Text, View } from 'react-native';

import type { TvPlayerPanelFocus } from '@/components/player/tv/tvPlayerTypes';
import { spacing } from '@/constants/aniverse';

interface TvEpisodeDockProps {
  visible: boolean;
  playing: boolean;
  panelFocus: TvPlayerPanelFocus;
  hasPrev: boolean;
  hasNext: boolean;
}

function CircleButton({
  focused,
  play,
  children,
}: {
  focused: boolean;
  play?: boolean;
  children: string;
}) {
  return (
    <View style={[styles.btn, play && styles.btnPlay, focused && styles.btnFocused]}>
      <Text style={[styles.icon, play && styles.iconPlay, focused && styles.iconFocused]}>
        {children}
      </Text>
    </View>
  );
}

/** Mid-screen transport: prev / play / next — site TV-style circular controls. */
export function TvEpisodeDock({
  visible,
  playing,
  panelFocus,
  hasPrev,
  hasNext,
}: TvEpisodeDockProps) {
  if (!visible) return null;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.row}>
        {hasPrev ? (
          <CircleButton focused={panelFocus === 'prev_episode'}>⏮</CircleButton>
        ) : (
          <View style={styles.spacer} />
        )}
        <CircleButton focused={panelFocus === 'play'} play>
          {playing ? '❚❚' : '▶'}
        </CircleButton>
        {hasNext ? (
          <CircleButton focused={panelFocus === 'next_episode'}>⏭</CircleButton>
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
