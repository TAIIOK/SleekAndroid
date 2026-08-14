import { Stack } from 'expo-router';

import { colors } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';

/** Shell body only — page header scrolls inside each screen with content. */
export default function FriendsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { flex: 1, backgroundColor: colors.bg },
        animation: isTvUi() ? 'none' : 'fade',
      }}
    />
  );
}
