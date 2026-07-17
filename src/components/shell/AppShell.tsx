import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SleekLogo } from '@/components/brand/SleekLogo';
import { SleekWordmark } from '@/components/brand/SleekWordmark';
import { NavIcon } from '@/components/navigation/NavIcon';
import { GlassSurface } from '@/components/ui/GlassSurface';
import {
  colors,
  layout,
  mobileBottomChromeInset,
  mobileTopChromeInset,
  radii,
  spacing,
  typography,
} from '@/constants/aniverse';
import { openHomeSettings } from '@/lib/homeSettingsBridge';
import { isTvAllowedPath, tvRedirectPath } from '@/lib/tvRoutes';
import { useAuth } from '@/providers/AuthProvider';

const TV_NAV_ITEMS = [
  { label: 'Главная', path: '/' },
  { label: 'Аниме', path: '/anime' },
  { label: 'Фильмы', path: '/movies' },
  { label: 'Сериалы', path: '/series' },
  { label: 'Поиск', path: '/search' },
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
  { label: 'Поиск', path: '/search' },
  { label: 'История', path: '/history' },
  { label: 'Загрузки', path: '/downloads' },
  { label: 'Профиль', path: '/profile' },
] as const;

function normalizePath(segments: string[]): string {
  const cleaned = segments.filter((segment) => !segment.startsWith('('));
  if (cleaned.length === 0) return '/';
  return `/${cleaned.join('/')}`;
}

function isActivePath(currentPath: string, itemPath: string): boolean {
  if (itemPath === '/') return currentPath === '/';
  return currentPath === itemPath || currentPath.startsWith(`${itemPath}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const currentPath = normalizePath(segments as string[]);
  const isHome = currentPath === '/';

  if (Platform.isTV && !isTvAllowedPath(currentPath)) {
    const redirect = tvRedirectPath(currentPath);
    router.replace(redirect as '/');
    return null;
  }

  if (Platform.isTV) {
    return (
      <View style={[styles.tvRoot, { paddingTop: insets.top }]}>
        <View style={styles.tvSideNav}>
          <View style={styles.tvBrandRow}>
            <SleekLogo size={48} />
            <View style={styles.tvBrandText}>
              <SleekWordmark size="md" />
              <Text style={styles.tvBrandSubtitle}>TV</Text>
            </View>
          </View>
          <ScrollView style={styles.tvNavScroll} contentContainerStyle={styles.tvNavList}>
            {TV_NAV_ITEMS.map((item) => (
              <NavItem
                key={item.path}
                label={item.label}
                path={item.path}
                active={isActivePath(currentPath, item.path)}
                onPress={() => router.push(item.path as '/')}
              />
            ))}
          </ScrollView>
          <Pressable
            onPress={() => router.push('/profile')}
            style={[styles.tvProfile, isActivePath(currentPath, '/profile') && styles.tvProfileActive]}
          >
            <View style={styles.tvProfileAvatar}>
              <Ionicons name="person" size={20} color={colors.brand} />
            </View>
            <View style={styles.tvProfileText}>
              <Text style={styles.tvProfileName} numberOfLines={1}>
                {user?.nickname ?? 'Медиатека'}
              </Text>
              <Text style={styles.tvProfileHint}>Профиль</Text>
            </View>
          </Pressable>
        </View>
        <View style={styles.tvContent}>{children}</View>
      </View>
    );
  }

  const moreActive = MORE_LINKS.some((item) => isActivePath(currentPath, item.path));
  const topChrome = mobileTopChromeInset(insets.top);
  const bottomChrome = mobileBottomChromeInset(insets.bottom);

  return (
    <View style={styles.mobileRoot}>
      <View style={[styles.mobileContent, { paddingTop: topChrome, paddingBottom: bottomChrome }]}>
        {children}
      </View>

      <View
        style={[
          styles.mobileTopBar,
          { paddingTop: Math.max(insets.top, 12) },
        ]}
        pointerEvents="box-none"
      >
        <GlassSurface
          style={Platform.OS === 'web' ? undefined : styles.mobileTopIsland}
          className={
            Platform.OS === 'web' ? 'liquid-glass floating-island mobile-top-island' : undefined
          }
        >
          <SleekWordmark onPress={() => router.push('/')} size="md" />
          <View
            style={Platform.OS === 'web' ? undefined : styles.mobileTopActions}
            className={Platform.OS === 'web' ? 'mobile-top-actions' : undefined}
          >
            <IconButton
              icon="search-outline"
              label="Поиск"
              onPress={() => router.push('/search')}
            />
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
              onPress={() => router.push('/profile')}
              accent
            />
          </View>
        </GlassSurface>
      </View>

      <View
        style={[
          styles.mobileBottomWrap,
          { paddingBottom: Math.max(insets.bottom, 12) },
        ]}
        pointerEvents="box-none"
      >
        <View
          style={Platform.OS === 'web' ? undefined : styles.mobileBottomShell}
          className={Platform.OS === 'web' ? 'mobile-bottom-shell' : undefined}
        >
          <View
            style={Platform.OS === 'web' ? undefined : styles.mobileBottomIsland}
            className={Platform.OS === 'web' ? 'mobile-bottom-island' : undefined}
          >
            {MOBILE_NAV_ITEMS.map((item) => (
              <TabItem
                key={item.path}
                label={item.label}
                path={item.path}
                active={isActivePath(currentPath, item.path)}
                onPress={() => router.push(item.path as '/')}
              />
            ))}
            <TabItem
              label="Ещё"
              path="/more"
              active={moreActive || moreOpen}
              onPress={() => setMoreOpen(true)}
            />
          </View>
        </View>
      </View>

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
                  router.push(item.path as '/');
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

function NavItem({
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
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={[
        styles.sideItem,
        active && styles.sideItemActive,
        focused && styles.sideItemFocused,
      ]}
    >
      <NavIcon path={path} size={26} focused={active || focused} />
      <Text style={[styles.sideLabel, (active || focused) && styles.sideLabelActive]}>{label}</Text>
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
      <NavIcon path={path} size={20} focused={active} color={colors.textSecondary} />
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
    flexDirection: 'row',
    backgroundColor: colors.bg,
  },
  tvSideNav: {
    width: layout.tvSideNavWidth,
    backgroundColor: 'rgba(31,31,40,0.95)',
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  tvBrandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: 20,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tvBrandText: {
    minWidth: 0,
    gap: 2,
  },
  tvBrandSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  tvNavScroll: {
    flex: 1,
  },
  tvNavList: {
    paddingHorizontal: 12,
    paddingVertical: spacing.md,
    gap: 4,
  },
  tvContent: {
    flex: 1,
  },
  tvProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    margin: spacing.md,
    padding: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  tvProfileActive: {
    borderColor: colors.brand,
  },
  tvProfileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(195,192,255,0.2)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tvProfileText: {
    flex: 1,
    minWidth: 0,
  },
  tvProfileName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  tvProfileHint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  mobileRoot: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  mobileContent: {
    flex: 1,
  },
  mobileTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: layout.gutterMobile,
    paddingBottom: spacing.sm,
    zIndex: 10,
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
    zIndex: 10,
  },
  mobileBottomShell: {
    width: '100%',
    maxWidth: layout.mobileTabMaxWidth,
    alignSelf: 'center',
  },
  mobileBottomIsland: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: colors.glassStrong,
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 25,
    shadowOffset: { width: 0, height: 12 },
    ...(Platform.OS === 'web'
      ? ({
          // @ts-expect-error web-only
          backdropFilter: 'blur(24px)',
          // @ts-expect-error web-only
          WebkitBackdropFilter: 'blur(24px)',
        } as object)
      : {}),
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
    backgroundColor: 'rgba(195,192,255,0.2)',
  },
  tabLabel: {
    color: colors.textSecondary,
    ...typography.tabLabel,
  },
  tabLabelActive: {
    color: colors.brand,
  },
  sideItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    minHeight: 52,
  },
  sideItemActive: {
    backgroundColor: colors.brand,
  },
  sideItemFocused: {
    borderWidth: 2,
    borderColor: colors.brandTint,
  },
  sideLabel: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  sideLabelActive: {
    color: colors.brandOn,
    fontWeight: '600',
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
