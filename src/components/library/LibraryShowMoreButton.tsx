import { StyleSheet, Text } from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing, tvFocus } from '@/constants/aniverse';

interface LibraryShowMoreButtonProps {
  remaining: number;
  pageSize: number;
  onPress: () => void;
}

export function LibraryShowMoreButton({
  remaining,
  pageSize,
  onPress,
}: LibraryShowMoreButtonProps) {
  if (remaining <= 0) return null;
  const next = Math.min(pageSize, remaining);

  return (
    <TvFocusable onPress={onPress} style={styles.btn} focusedStyle={styles.btnFocused}>
      <Text style={styles.label}>Показать ещё ({next})</Text>
    </TvFocusable>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    borderWidth: tvFocus.borderWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  btnFocused: {
    borderColor: '#ffffff',
    backgroundColor: tvFocus.fill,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
