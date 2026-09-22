import { Tabs } from 'expo-router';

import { colors } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';

/**
 * Keep Home / Anime / Movies / Series mounted after first visit so phone (and TV)
 * hub switches do not remount catalog rails. Visible tab UI stays in AppShell;
 * default tab bar is hidden.
 *
 * Catalog hubs are single screens (`anime.tsx`, `movies.tsx`, `series.tsx`).
 * Title detail lives on the parent (main) Stack so opening a title from Home
 * does not switch the selected tab.
 *
 * `detachInactiveScreens={false}` is required: Android defaults to detaching
 * inactive tab scenes, which tears down the catalog tree on every hub switch.
 * TV still keeps detach off, but only the current hub and the previous hub
 * render their catalogs (`useTvHubRetained`). Phone keeps freeze-on-blur.
 */
export default function MainTabsLayout() {
  return (
    <Tabs
      tabBar={() => null}
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        lazy: true,
        freezeOnBlur: !isTvUi(),
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="anime" />
      <Tabs.Screen name="movies" />
      <Tabs.Screen name="series" />
    </Tabs>
  );
}
