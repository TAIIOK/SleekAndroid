import { Stack } from 'expo-router';

import { colors } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';

/**
 * Keep the anime catalog mounted under detail so Back restores rails/scroll/focus
 * without remounting feed queries.
 */
export default function AnimeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: isTvUi() ? 'none' : 'fade',
        contentStyle: { backgroundColor: colors.bg },
        freezeOnBlur: true,
      }}
    />
  );
}
