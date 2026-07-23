import { Stack } from 'expo-router';

import { colors } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';

/**
 * Keep the movies catalog mounted under detail so Back restores rails/scroll/focus
 * without re-running the TV browse skeleton cascade.
 */
export default function MoviesLayout() {
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
