import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useSegments } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  BackHandler,
  findNodeHandle,
  type View as ViewType,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SleekLogo } from '@/components/brand/SleekLogo';
import { SleekWordmark } from '@/components/brand/SleekWordmark';
import { DownloadNavIndicator } from '@/components/download/DownloadNavIndicator';
import { NavIcon } from '@/components/navigation/NavIcon';
import { TvFocusGuide } from '@/components/tv/TvFocusGuide';
import { GlassSurface } from '@/components/ui/GlassSurface';
import {
  colors,
  layout,
  mobileBottomChromeInset,
  mobileTopChromeInset,
  radii,
  spacing,
  tvFocus,
  typography,
} from '@/constants/aniverse';
import { openHomeSettings } from '@/lib/homeSettingsBridge';
import {
  isMobileChromeHiddenRoute,
  isMobileChromeScrollPinnedRoute,
  isMobileChromeShellLayoutRoute,
  isMobileDetailRoute,
} from '@/lib/mobileRoutes';
import { navigateBackFromDetail, setDetailReturnPath } from '@/lib/detailNavigation';
import {
  clearCatalogScrollSnapshot,
  clearPendingCatalogFocusRestore,
  clearCatalogActiveFocus,
  markCatalogFreshLanding,
} from '@/lib/tvCatalogScrollRestore';
import { isTvAllowedPath, tvRedirectPath } from '@/lib/tvRoutes';
import {
  shouldKeepClosedMenuSidebarAnchor,
  shouldParkSidebarOnRouteChange,
  topLevelNavKey,
} from '@/lib/tvSidebarHandoff';
import { useAuth } from '@/providers/AuthProvider';
import {
  MobileChromeAnimated,
  MobileChromeScrollProvider,
  useMobileChromeScroll,
  useMobileChromeTopAnimatedStyle,
} from '@/providers/MobileChromeScroll';
import { TvShellFocusProvider, useTvShellFocus } from '@/providers/TvShellFocus';
import { isTvUi } from '@/lib/isTvUi';
import { useTvImmersiveFocusLock } from '@/lib/tvImmersiveFocus';
import { notifyViewportScroll } from '@/lib/viewportScroll';

const TV_NAV_ITEMS = [
  { label: 'Поиск', path: '/search' },
  { label: 'Главная', path: '/' },
  { label: 'Аниме', path: '/anime' },
  { label: 'Фильмы', path: '/movies' },
  { label: 'Сериалы', path: '/series' },
  { label: 'Совместный просмотр', path: '/party' },
  { label: 'Друзья', path: '/friends/feed' },
  { label: 'Медиатека', path: '/library/lists' },
  { label: 'История', path: '/history' },
] as const;

const MOBILE_NAV_ITEMS = [
  { label: 'Главная', path: '/' },
  { label: 'Аниме', path: '/anime' },
  { label: 'Фильмы', path: '/movies' },
  { label: 'Сериалы', path: '/series' },
] as const;

const MORE_LINKS = [
  { label: 'Медиатека', path: '/library/lists' },
  { label: 'Совместный просмотр', path: '/party' },
  { label: 'Друзья', path: '/friends/feed' },
  { label: 'История', path: '/history' },
  { label: 'Загрузки', path: '/downloads' },
] as const;

function normalizePath(segments: string[]): string {
  const cleaned = segments.filter((segment) => !segment.startsWith('('));
  if (cleaned.length === 0) return '/';
  return `/${cleaned.join('/')}`;
}

function isActivePath(currentPath: string, itemPath: string): boolean {
  if (itemPath === '/') return currentPath === '/';
  // Hub entry points at lists; keep active across bookmarks/collections.
  if (itemPath === '/library/lists') {
    return currentPath === '/library' || currentPath.startsWith('/library/');
  }
  if (itemPath === '/friends/feed') {
    return (
      currentPath === '/friends' ||
      currentPath.startsWith('/friends/') ||
      currentPath.startsWith('/users/')
    );
  }
  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
}

function nativeTagOf(node: unknown): number | undefined {
  if (node == null) return undefined;
  return findNodeHandle(node as Parameters<typeof findNodeHandle>[0]) ?? undefined;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const currentPath = normalizePath(segments as string[]);
  const isHome = currentPath === '/';
  const tvBlocked = isTvUi() && !isTvAllowedPath(currentPath);

  useEffect(() => {
    if (!tvBlocked) return;
    router.replace(tvRedirectPath(currentPath) as '/');
  }, [tvBlocked, currentPath, router]);

  if (tvBlocked) {
    return null;
  }

  if (isTvUi()) {
    return (
      <TvShellFocusProvider>
        <TvAppShellFrame currentPath={currentPath} userNickname={user?.nickname}>
          {children}
        </TvAppShellFrame>
      </TvShellFocusProvider>
    );
  }

  const moreActive = MORE_LINKS.some((item) => isActivePath(currentPath, item.path));
  const isDetail = isMobileDetailRoute(currentPath);
  const hideChrome = isMobileChromeHiddenRoute(currentPath);
  const shellLayout = !hideChrome && isMobileChromeShellLayoutRoute(currentPath);
  // Overlay mode (home/catalog/library): content scrolls under floating islands and pads itself.
  // Shell mode (party lobby): nav | body | footer — content never under chrome.
  const overlayChrome = !hideChrome && !shellLayout;
  const topChrome = 0;
  // Detail pages keep a bottom safe inset for scroll content. Fullscreen party /
  // watch chrome-hidden routes must be edge-to-edge — the player handles its own
  // home-indicator padding on the control bar.
  const bottomChrome = hideChrome && isDetail ? Math.max(insets.bottom, 8) : 0;
  const topContentInset = overlayChrome ? mobileTopChromeInset(insets.top) : 0;
  const bottomContentInset = overlayChrome ? mobileBottomChromeInset(insets.bottom) : 0;
  const topHideDistance = Math.max(insets.top, 12) + layout.mobileTopBarHeight + 8;

  return (
    <MobileChromeScrollProvider
      hideDistance={topHideDistance}
      contentInsetsEnabled={overlayChrome}
      scrollPinned={!hideChrome && isMobileChromeScrollPinnedRoute(currentPath)}
      topContentInset={topContentInset}
      bottomContentInset={bottomContentInset}
    >
      <MobileAppChrome
        currentPath={currentPath}
        isHome={isHome}
        isDetail={isDetail}
        hideChrome={hideChrome}
        shellLayout={shellLayout}
        topChrome={topChrome}
        bottomChrome={bottomChrome}
        moreActive={moreActive}
        moreOpen={moreOpen}
        setMoreOpen={setMoreOpen}
        insetsTop={insets.top}
        insetsBottom={insets.bottom}
      >
        {children}
      </MobileAppChrome>
    </MobileChromeScrollProvider>
  );
}

function MobileAppChrome({
  children,
  currentPath,
  isHome,
  isDetail,
  hideChrome,
  shellLayout,
  topChrome,
  bottomChrome,
  moreActive,
  moreOpen,
  setMoreOpen,
  insetsTop,
  insetsBottom,
}: {
  children: React.ReactNode;
  currentPath: string;
  isHome: boolean;
  isDetail: boolean;
  hideChrome: boolean;
  shellLayout: boolean;
  topChrome: number;
  bottomChrome: number;
  moreActive: boolean;
  moreOpen: boolean;
  setMoreOpen: (open: boolean) => void;
  insetsTop: number;
  insetsBottom: number;
}) {
  const router = useRouter();
  const chromeScroll = useMobileChromeScroll();
  const topAnimatedStyle = useMobileChromeTopAnimatedStyle();
  const showChrome = !isDetail && !hideChrome;

  useEffect(() => {
    if (!isDetail) return;
    const onBack = () => {
      navigateBackFromDetail(null, currentPath);
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [isDetail, router, currentPath]);

  const prevPathRef = useRef(currentPath);
  useEffect(() => {
    const prev = prevPathRef.current;
    if (isMobileDetailRoute(currentPath) && !isMobileDetailRoute(prev)) {
      setDetailReturnPath(prev);
    }
    prevPathRef.current = currentPath;
  }, [currentPath]);

  useEffect(() => {
    chromeScroll?.reset();
    // Reset only on route change so the island returns when switching tabs.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- path-only
  }, [currentPath]);

  const topNav = (
    <GlassSurface
      style={Platform.OS === 'web' ? undefined : styles.mobileTopIsland}
      className={
        Platform.OS === 'web' ? 'liquid-glass floating-island mobile-top-island' : undefined
      }
    >
      <SleekWordmark onPress={() => router.navigate('/')} size="md" />
      <View
        style={Platform.OS === 'web' ? undefined : styles.mobileTopActions}
        className={Platform.OS === 'web' ? 'mobile-top-actions' : undefined}
      >
        <IconButton
          icon="search-outline"
          label="Поиск"
          onPress={() => router.navigate('/search')}
        />
        <DownloadNavIndicator />
        {isHome ? (
          <IconButton
            icon="settings-outline"
            label="Настройки главной"
            onPress={openHomeSettings}
            ring
          />
        ) : null}
        <IconButton
          icon="person-outline"
          label="Профиль"
          onPress={() => router.navigate('/profile')}
          accent
        />
      </View>
    </GlassSurface>
  );

  const bottomTabs = (
    <View
      style={Platform.OS === 'web' ? undefined : styles.mobileBottomShell}
      className={Platform.OS === 'web' ? 'mobile-bottom-shell' : undefined}
    >
      <GlassSurface
        style={styles.mobileBottomIsland}
        className={
          Platform.OS === 'web' ? 'liquid-glass floating-island mobile-bottom-island' : undefined
        }
      >
        {MOBILE_NAV_ITEMS.map((item) => (
          <TabItem
            key={item.path}
            label={item.label}
            path={item.path}
            active={isActivePath(currentPath, item.path)}
            onPress={() => {
              router.navigate(item.path as '/');
            }}
          />
        ))}
        <TabItem
          label="Ещё"
          path="/more"
          active={moreActive || moreOpen}
          onPress={() => setMoreOpen(true)}
        />
      </GlassSurface>
    </View>
  );

  return (
    <View style={styles.mobileRoot}>
      {/* Shell layout: nav (fixed) → body (scroll) → footer (fixed). */}
      {showChrome && shellLayout ? (
        <View style={[styles.mobileTopBarFlow, { paddingTop: Math.max(insetsTop, 12) }]}>
          {topNav}
        </View>
      ) : null}

      <View style={[styles.mobileContent, { paddingTop: topChrome, paddingBottom: bottomChrome }]}>
        {children}
      </View>

      {showChrome && shellLayout ? (
        <View style={[styles.mobileBottomBarFlow, { paddingBottom: Math.max(insetsBottom, 12) }]}>
          {bottomTabs}
        </View>
      ) : null}

      {/* Overlay layout (home/catalog): floating islands over scrolling content. */}
      {showChrome && !shellLayout ? (
        <>
          <MobileChromeAnimated.View
            style={[
              styles.mobileTopBar,
              { paddingTop: Math.max(insetsTop, 12) },
              topAnimatedStyle,
            ]}
            pointerEvents="box-none"
          >
            {topNav}
          </MobileChromeAnimated.View>

          <View
            style={[
              styles.mobileBottomWrap,
              { paddingBottom: Math.max(insetsBottom, 12) },
            ]}
            pointerEvents="box-none"
          >
            {bottomTabs}
          </View>
        </>
      ) : null}

      <Modal visible={moreOpen} transparent animationType="fade" onRequestClose={() => setMoreOpen(false)}>
        <Pressable style={styles.moreBackdrop} onPress={() => setMoreOpen(false)}>
          <Pressable style={styles.moreSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.moreTitle}>Ещё</Text>
            {MORE_LINKS.map((item) => (
              <Pressable
                key={item.path}
                style={styles.moreItem}
                onPress={() => {
                  setMoreOpen(false);
                  router.navigate(item.path as '/');
                }}
              >
                <NavIcon path={item.path} size={22} />
                <Text style={styles.moreItemLabel}>{item.label}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function TvAppShellFrame({
  children,
  currentPath,
  userNickname,
}: {
  children: React.ReactNode;
  currentPath: string;
  userNickname?: string | null;
}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const shellFocus = useTvShellFocus();
  const menuOpen = shellFocus?.menuOpen ?? false;
  const profileActive = isActivePath(currentPath, '/profile') || isActivePath(currentPath, '/accounts');
  const activeNavIndex = TV_NAV_ITEMS.findIndex((item) => isActivePath(currentPath, item.path));
  // HW Left/Up target: profile chip on profile/accounts, otherwise the active hub row.
  const hwAnchorIndex = profileActive ? -1 : activeNavIndex >= 0 ? activeNavIndex : 0;
  // Closed menu: no hidden fallback on detail — Android would open the overlay.
  const sidebarAnchorIndex = shouldKeepClosedMenuSidebarAnchor(currentPath) ? hwAnchorIndex : -1;
  const hideSidebar = isMobileChromeHiddenRoute(currentPath);
  const immersiveLock = useTvImmersiveFocusLock();

  /**
   * Park/close the overlay only on top-level hub switches. Detail push within a
   * hub only resets Left/Up arms so a stuck rail-edge cannot steal the next Left.
   */
  const [parkSidebarFocus, setParkSidebarFocus] = useState(false);
  const [lastNavTag, setLastNavTag] = useState<number | undefined>();
  const [profileChipTag, setProfileChipTag] = useState<number | undefined>();
  const contentTag = shellFocus?.contentNativeTag;
  const navKey = topLevelNavKey(currentPath);
  const lastNavIndex = TV_NAV_ITEMS.length - 1;
  const prevPathRef = useRef(currentPath);
  const prevNavKeyRef = useRef(navKey);

  // Render-phase: tab useFocusEffect must see a cleared snapshot / fresh-landing
  // flag before it runs. An effect here would lose the race and restore leftover scroll.
  if (prevNavKeyRef.current !== navKey) {
    clearCatalogScrollSnapshot(navKey);
    clearPendingCatalogFocusRestore(navKey);
    clearCatalogActiveFocus(navKey);
    if (isTvUi()) {
      markCatalogFreshLanding(navKey);
      notifyViewportScroll(0);
    }
    prevNavKeyRef.current = navKey;
  }

  useEffect(() => {
    const prevPath = prevPathRef.current;
    prevPathRef.current = currentPath;
    if (prevPath === currentPath) return;

    if (shouldParkSidebarOnRouteChange(prevPath, currentPath)) {
      shellFocus?.resetExitFlags();
      setParkSidebarFocus(true);
    } else {
      shellFocus?.resetExitArms();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- path handoff only
  }, [currentPath]);

  useEffect(() => {
    if (!parkSidebarFocus) return;
    if (contentTag != null) {
      setParkSidebarFocus(false);
      return;
    }
    const unparkTimer = setTimeout(() => {
      setParkSidebarFocus(false);
    }, 800);
    return () => {
      clearTimeout(unparkTimer);
    };
  }, [parkSidebarFocus, contentTag]);

  useEffect(() => {
    if (!hideSidebar) return;
    shellFocus?.closeMenu();
    shellFocus?.resetExitArms();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- immersive lock only
  }, [hideSidebar, currentPath]);

  useEffect(() => {
    if (!menuOpen) return;
    const onBack = () => {
      shellFocus?.closeMenu();
      shellFocus?.requestContentFocus();
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dismiss overlay only
  }, [menuOpen]);

  // Party room / watch / invite sit inside (main). The catalog TvFocusGuide
  // swallows D-pad, and a late-mounted player sink never wins hasTVPreferredFocus.
  // Render children full-bleed like the root `/watch` modal.
  if (hideSidebar) {
    return <View style={styles.tvRoot}>{children}</View>;
  }

  return (
    <View
      style={[styles.tvRoot, { paddingTop: insets.top }]}
      pointerEvents={immersiveLock ? 'none' : 'auto'}
    >
      {/*
        Sidebar before content (focus tree). Keep on-screen with opacity only when
        closed — translateX off-screen breaks nextFocusLeft / requestTVFocus.
      */}
      <TvFocusGuide
        style={[styles.tvSideNav, !menuOpen && styles.tvSideNavHidden]}
        trapFocusLeft
        pointerEvents={hideSidebar || immersiveLock ? 'none' : undefined}
      >
        {/* Glass paint layer — keep out of the flex/focus column or TVFocusGuide collapses. */}
        <View style={styles.tvSideNavGlass} pointerEvents="none">
          <LinearGradient
            colors={[
              'rgba(195,192,255,0.14)',
              'rgba(28,26,40,0.92)',
              'rgba(19,18,27,0.96)',
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.03)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0.4 }}
            style={styles.tvSideNavSheen}
          />
          <View style={styles.tvSideNavEdge} />
        </View>

        <View style={styles.tvSideNavContent}>
          <View style={styles.tvBrandRow}>
            <SleekLogo size={36} />
            <View style={styles.tvBrandText}>
              <SleekWordmark size="sm" />
              {menuOpen ? <Text style={styles.tvBrandSubtitle}>→ К контенту</Text> : null}
            </View>
          </View>
          <ScrollView style={styles.tvNavScroll} contentContainerStyle={styles.tvNavList}>
            {TV_NAV_ITEMS.map((item, index) => (
              <NavItem
                key={item.path}
                label={item.label}
                path={item.path}
                active={isActivePath(currentPath, item.path)}
                isSidebarAnchor={index === sidebarAnchorIndex}
                isHwAnchor={index === hwAnchorIndex}
                menuOpen={menuOpen}
                parkFocus={parkSidebarFocus}
                contentNativeTag={contentTag}
                nextFocusDown={index === lastNavIndex ? profileChipTag : undefined}
                onNativeTag={index === lastNavIndex ? setLastNavTag : undefined}
                onPress={() => {
                  shellFocus?.closeMenu();
                  router.navigate(item.path as '/');
                }}
              />
            ))}
            {/*
              Keep the profile chip in the same ScrollView as hub rows. A sibling
              footer is unreachable: Android TV ScrollView swallows Down.
              flexGrow spacer pins the chip to the bottom when the list is short.
            */}
            <View style={styles.tvNavFooterSpacer} pointerEvents="none" />
            <ProfileChip
              nickname={userNickname}
              active={profileActive}
              isSidebarAnchor={profileActive}
              isHwAnchor={profileActive}
              menuOpen={menuOpen}
              parkFocus={parkSidebarFocus}
              contentNativeTag={contentTag}
              nextFocusUp={lastNavTag}
              onNativeTag={setProfileChipTag}
              onPress={() => {
                shellFocus?.closeMenu();
                router.navigate('/profile');
              }}
            />
          </ScrollView>
        </View>
      </TvFocusGuide>

      <TvFocusGuide
        style={styles.tvContent}
        autoFocus={!immersiveLock && !menuOpen}
        pointerEvents={immersiveLock ? 'none' : undefined}
      >
        {children}
      </TvFocusGuide>

      {menuOpen ? (
        <View style={styles.tvMenuScrim} pointerEvents="none" />
      ) : null}
    </View>
  );
}

function NavItem({
  label,
  path,
  active,
  onPress,
  isSidebarAnchor,
  isHwAnchor,
  menuOpen,
  parkFocus = false,
  contentNativeTag,
  nextFocusDown,
  onNativeTag,
}: {
  label: string;
  path: string;
  active: boolean;
  onPress: () => void;
  isSidebarAnchor?: boolean;
  /** Publish as Left/Up HW target even when the closed menu has no fallback. */
  isHwAnchor?: boolean;
  menuOpen: boolean;
  /** True briefly after route change — forces focus out of the sidebar. */
  parkFocus?: boolean;
  contentNativeTag?: number;
  nextFocusDown?: number;
  onNativeTag?: (tag: number | undefined) => void;
}) {
  const [focused, setFocused] = useState(false);
  const shellFocus = useTvShellFocus();
  const pressableRef = useRef<ViewType | null>(null);
  // Closed menu: only the active anchor stays focusable for Left→sidebar.
  // Parked: nothing focusable so Android moves focus into content.
  const focusable = !parkFocus && (menuOpen || Boolean(isSidebarAnchor));

  const publishAnchor = () => {
    if ((isHwAnchor || isSidebarAnchor) && pressableRef.current) {
      shellFocus?.registerSidebarAnchor(pressableRef.current);
    }
    onNativeTag?.(nativeTagOf(pressableRef.current));
  };

  return (
    <Pressable
      ref={(node) => {
        pressableRef.current = node as unknown as ViewType | null;
        if (node) publishAnchor();
      }}
      onLayout={publishAnchor}
      focusable={focusable}
      hasTVPreferredFocus={menuOpen && Boolean(isSidebarAnchor) && !parkFocus}
      onFocus={() => {
        setFocused(true);
        shellFocus?.setSidebarFocused(true);
      }}
      onBlur={() => {
        setFocused(false);
        shellFocus?.setSidebarFocused(false);
      }}
      onPress={onPress}
      {...(contentNativeTag != null ? { nextFocusRight: contentNativeTag } : {})}
      {...(nextFocusDown != null ? { nextFocusDown } : {})}
      style={[
        styles.sideItem,
        active && styles.sideItemActive,
        focused && styles.sideItemFocused,
        active && focused && styles.sideItemActiveFocused,
      ]}
    >
      <NavIcon
        path={path}
        size={22}
        focused={active || focused}
        color={focused ? '#ffffff' : active ? colors.brand : colors.textSecondary}
      />
      <Text
        style={[
          styles.sideLabel,
          active && styles.sideLabelActive,
          focused && styles.sideLabelFocused,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ProfileChip({
  nickname,
  active,
  onPress,
  isSidebarAnchor,
  isHwAnchor,
  menuOpen,
  parkFocus = false,
  contentNativeTag,
  nextFocusUp,
  onNativeTag,
}: {
  nickname?: string | null;
  active: boolean;
  onPress: () => void;
  isSidebarAnchor?: boolean;
  isHwAnchor?: boolean;
  menuOpen: boolean;
  parkFocus?: boolean;
  contentNativeTag?: number;
  nextFocusUp?: number;
  onNativeTag?: (tag: number | undefined) => void;
}) {
  const [focused, setFocused] = useState(false);
  const shellFocus = useTvShellFocus();
  const pressableRef = useRef<ViewType | null>(null);
  const focusable = !parkFocus && (menuOpen || Boolean(isSidebarAnchor));

  const publishAnchor = () => {
    if ((isHwAnchor || isSidebarAnchor) && pressableRef.current) {
      shellFocus?.registerSidebarAnchor(pressableRef.current);
    }
    onNativeTag?.(nativeTagOf(pressableRef.current));
  };

  return (
    <Pressable
      ref={(node) => {
        pressableRef.current = node as unknown as ViewType | null;
        if (node) publishAnchor();
      }}
      onLayout={publishAnchor}
      focusable={focusable}
      hasTVPreferredFocus={menuOpen && Boolean(isSidebarAnchor) && !parkFocus}
      onFocus={() => {
        setFocused(true);
        shellFocus?.setSidebarFocused(true);
      }}
      onBlur={() => {
        setFocused(false);
        shellFocus?.setSidebarFocused(false);
      }}
      onPress={onPress}
      {...(contentNativeTag != null ? { nextFocusRight: contentNativeTag } : {})}
      {...(nextFocusUp != null ? { nextFocusUp } : {})}
      style={[
        styles.tvProfile,
        active && styles.tvProfileActive,
        focused && styles.tvProfileFocused,
      ]}
    >
      <View style={[styles.tvProfileAvatar, focused && styles.tvProfileAvatarFocused]}>
        <Ionicons name="person" size={16} color={colors.brand} />
      </View>
      <View style={styles.tvProfileText}>
        <Text style={styles.tvProfileName} numberOfLines={1}>
          {nickname?.trim() || 'Гость'}
        </Text>
        <Text style={styles.tvProfileHint}>Профиль</Text>
      </View>
    </Pressable>
  );
}

function TabItem({
  label,
  path,
  active,
  onPress,
}: {
  label: string;
  path: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={Platform.OS === 'web' ? undefined : [styles.tabItem, active && styles.tabItemActive]}
      className={
        Platform.OS === 'web'
          ? `mobile-tab-btn${active ? ' mobile-tab-btn--active' : ''}`
          : undefined
      }
    >
      <NavIcon path={path} size={20} focused={active} />
      <Text
        style={Platform.OS === 'web' ? undefined : [styles.tabLabel, active && styles.tabLabelActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function IconButton({
  icon,
  label,
  onPress,
  accent,
  ring,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accent?: boolean;
  ring?: boolean;
}) {
  const webClass = [
    'mobile-icon-btn',
    accent ? 'mobile-icon-btn--accent' : '',
    ring ? 'mobile-icon-btn--ring' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={
        Platform.OS === 'web'
          ? undefined
          : [styles.iconButton, accent && styles.iconButtonAccent, ring && styles.iconButtonRing]
      }
      className={Platform.OS === 'web' ? webClass : undefined}
    >
      <Ionicons
        name={icon}
        size={18}
        color={accent ? colors.brand : colors.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tvRoot: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  tvSideNav: {
    position: 'absolute',
    left: 10,
    top: 10,
    bottom: 10,
    width: layout.tvSideNavWidth,
    zIndex: 20,
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: 'rgba(22, 20, 34, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  tvSideNavHidden: {
    // Stay in the focus tree (no translateX) so nextFocusLeft / requestTVFocus work.
    opacity: 0,
  },
  tvSideNavGlass: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  tvSideNavContent: {
    flex: 1,
    zIndex: 1,
  },
  tvSideNavSheen: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 160,
  },
  tvSideNavEdge: {
    position: 'absolute',
    top: 14,
    bottom: 14,
    right: 0,
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  tvMenuScrim: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 15,
    backgroundColor: 'rgba(8,7,14,0.45)',
  },
  tvBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tvBrandText: {
    minWidth: 0,
    gap: 2,
  },
  tvBrandSubtitle: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: '600',
  },
  tvNavScroll: {
    flex: 1,
  },
  tvNavList: {
    flexGrow: 1,
    paddingHorizontal: 8,
    paddingVertical: spacing.sm,
    gap: 2,
  },
  tvNavFooterSpacer: {
    flexGrow: 1,
    minHeight: 8,
  },
  tvContent: {
    flex: 1,
  },
  tvProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    margin: spacing.sm,
    padding: 10,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: tvFocus.borderWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  tvProfileActive: {
    borderColor: 'rgba(195,192,255,0.45)',
    backgroundColor: 'rgba(195,192,255,0.12)',
  },
  tvProfileFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: 'rgba(195,192,255,0.22)',
    ...tvFocus.glow,
  },
  tvProfileAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(195,192,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  tvProfileAvatarFocused: {
    borderColor: tvFocus.borderColor,
  },
  tvProfileText: {
    flex: 1,
    minWidth: 0,
  },
  tvProfileName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  tvProfileHint: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  mobileRoot: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
    backgroundColor: colors.bg,
  },
  mobileContent: {
    flex: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  mobileTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: layout.gutterMobile,
    paddingBottom: spacing.sm,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  /** In-flow nav for shell layout routes (party). No solid bar behind the island. */
  mobileTopBarFlow: {
    paddingHorizontal: layout.gutterMobile,
    paddingBottom: spacing.sm,
    backgroundColor: 'transparent',
    zIndex: 2,
  },
  mobileBottomBarFlow: {
    paddingHorizontal: 12,
    paddingTop: spacing.sm,
    backgroundColor: 'transparent',
    zIndex: 2,
  },
  mobileTopIsland: {
    height: layout.mobileTopBarHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    borderColor: 'rgba(255,255,255,0.05)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 12 },
  },
  mobileTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  iconButtonAccent: {
    borderWidth: 1,
    borderColor: 'rgba(195,192,255,0.2)',
    backgroundColor: 'rgba(195,192,255,0.2)',
  },
  iconButtonRing: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  mobileBottomWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 12,
    paddingTop: spacing.sm,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  mobileBottomShell: {
    width: '100%',
    maxWidth: layout.mobileTabMaxWidth,
    alignSelf: 'center',
    backgroundColor: 'transparent',
  },
  mobileBottomIsland: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 6,
    paddingVertical: 6,
    backgroundColor: 'rgba(19,18,27,0.72)',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 12 },
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: radii.pill,
    minWidth: 0,
  },
  tabItemActive: {
    backgroundColor: 'rgba(195,192,255,0.22)',
  },
  tabLabel: {
    color: '#e8e6f4',
    ...typography.tabLabel,
  },
  tabLabelActive: {
    color: colors.brand,
  },
  sideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radii.md,
    minHeight: 44,
    borderWidth: tvFocus.borderWidth,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  // Route selected — soft glass tint only (never solid brand; that hides D-pad focus).
  sideItemActive: {
    backgroundColor: 'rgba(195,192,255,0.14)',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  sideItemFocused: {
    borderColor: 'rgba(255,255,255,0.85)',
    backgroundColor: 'rgba(195,192,255,0.26)',
    ...tvFocus.glow,
  },
  // Active + focused: high-contrast white ring so focus stays obvious on the current section.
  sideItemActiveFocused: {
    backgroundColor: 'rgba(195,192,255,0.34)',
    borderColor: '#ffffff',
    ...tvFocus.glow,
  },
  sideLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  sideLabelActive: {
    color: colors.brand,
    fontWeight: '600',
  },
  sideLabelFocused: {
    color: '#ffffff',
    fontWeight: '700',
  },
  moreBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
    padding: layout.gutterMobile,
    paddingBottom: mobileBottomChromeInset(0) + 8,
  },
  moreSheet: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  moreTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  moreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
  },
  moreItemLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
});
