import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout } from '@/constants/aniverse';
import { navigateBackFromDetail } from '@/lib/detailNavigation';
import { isMobileDetailRoute } from '@/lib/mobileRoutes';
import { isTvUi } from '@/lib/isTvUi';

/**
 * Phone detail back control.
 * Must be the last child INSIDE the detail screen root (same native surface as
 * content). Layout/Slot siblings sit under the native screen and lose touches
 * when poster images mount.
 */
export function MobileDetailBackButton() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  if (isTvUi() || !isMobileDetailRoute(pathname)) return null;

  const goBack = () => navigateBackFromDetail(null, pathname);

  return (
    <View
      pointerEvents="box-none"
      collapsable={false}
      style={[styles.chrome, { paddingTop: Math.max(insets.top, 8) }]}
    >
      <Pressable
        onPressIn={goBack}
        onPress={goBack}
        accessibilityLabel="Назад"
        accessibilityRole="button"
        hitSlop={20}
        style={styles.btn}
      >
        <Ionicons name="chevron-back" size={24} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  chrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10000,
    elevation: 10000,
    paddingHorizontal: layout.gutterMobile,
    paddingBottom: 8,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
});
