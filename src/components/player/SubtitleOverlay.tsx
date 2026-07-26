import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/aniverse';
import type { SubtitleCue } from '@/lib/parseSubtitles';
import { isTvUi } from '@/lib/isTvUi';

interface SubtitleOverlayProps {
  cues: SubtitleCue[];
  /** Fallback plain text (e.g. native onTextTrackDataChanged). */
  text?: string;
}

/** Timed subtitle plaque over video — RN overlay (Exo SubtitleView is covered by HUD). */
export function SubtitleOverlay({ cues, text }: SubtitleOverlayProps) {
  const body =
    cues.length > 0 ? cues.map((cue) => cue.text).join('\n') : (text?.trim() ?? '');
  if (!body) return null;

  const tv = isTvUi();

  return (
    <View style={[styles.wrap, tv ? styles.wrapTv : styles.wrapPhone]} pointerEvents="none">
      <Text style={[styles.text, tv ? styles.textTv : styles.textPhone]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  /** Sit near the bottom edge; panel/dock cover when open. */
  wrapTv: {
    paddingBottom: 36,
  },
  wrapPhone: {
    paddingBottom: 96,
  },
  text: {
    color: colors.text,
    textAlign: 'center',
    fontWeight: '700',
    maxWidth: '86%',
    backgroundColor: 'rgba(0,0,0,0.55)',
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  textTv: {
    fontSize: 28,
    lineHeight: 36,
  },
  textPhone: {
    fontSize: 16,
    lineHeight: 22,
  },
});
