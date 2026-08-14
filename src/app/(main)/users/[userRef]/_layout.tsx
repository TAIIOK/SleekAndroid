import { Stack } from 'expo-router';

import { colors } from '@/constants/aniverse';

/** Shell body only — profile header scrolls inside each tab with content. */
export default function UserProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { flex: 1, backgroundColor: colors.bg },
      }}
    />
  );
}
