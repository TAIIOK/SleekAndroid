import { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, radii, spacing } from '@/constants/aniverse';
import { useOnline } from '@/hooks/useOnline';

export function OfflineBanner() {
  const online = useOnline();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(!online);

  useEffect(() => {
    setVisible(!online);
  }, [online]);

  if (!visible) return null;

  const top = Platform.isTV
    ? insets.top + spacing.md
    : insets.top + layout.mobileTopBarHeight + spacing.sm;

  return (
    <View pointerEvents="none" style={[styles.wrap, { top }]}>
      <View style={styles.banner}>
        <Text style={styles.text}>Оффлайн — проверьте подключение к интернету</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 50,
    alignItems: 'center',
  },
  banner: {
    maxWidth: 480,
    width: '100%',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.3)',
    backgroundColor: 'rgba(245,158,11,0.12)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  text: {
    color: '#fde68a',
    fontSize: 14,
    textAlign: 'center',
  },
});
