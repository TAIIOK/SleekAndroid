import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { forwardRef, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, layout, radii, spacing, tvFocus } from '@/constants/aniverse';
import { useTvRailFocusRestore } from '@/hooks/useTvRailFocusRestore';
import {
  formatProgressTime,
  type ContinueWatchingItem,
} from '@/lib/continueWatching';
import { resumeLampaFromLastSelection } from '@/lib/resumeLampaPlayback';
import { tvHorizontalCatalogScrollProps, tvRailSectionSnapProps } from '@/lib/tvCatalogScroll';
import { useTvShellFocus } from '@/providers/TvShellFocus';

const CARD_WIDTH = layout.continueCardWidth;

interface ContinueWatchingRowProps {
  items: ContinueWatchingItem[];
}

export function ContinueWatchingRow({ items }: ContinueWatchingRowProps) {
  const router = useRouter();
  const { bindItem } = useTvRailFocusRestore(items.length);
  const [resumingId, setResumingId] = useState<string | null>(null);
  const horizontalPad = Platform.isTV ? layout.gutterDesktop : layout.gutterMobile;
  const rowCount = Platform.isTV ? 1 : items.length <= 4 ? 1 : 2;
  const columns =
    rowCount > 1
      ? Array.from({ length: Math.ceil(items.length / rowCount) }, (_, columnIndex) =>
          items.slice(columnIndex * rowCount, columnIndex * rowCount + rowCount),
        )
      : [];

  if (!items.length) return null;

  const onPressItem = (item: ContinueWatchingItem) => {
    void openItem(router, item, {
      isResuming: resumingId === item.id,
      setResumingId,
    });
  };

  return (
    <View style={styles.section} {...tvRailSectionSnapProps}>
      <SectionHeader title="Продолжить просмотр" variant="continue" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPad }]}
        {...tvHorizontalCatalogScrollProps}
      >
        {rowCount > 1 ? (
          <View style={styles.twoRowGrid}>
            {columns.map((columnItems, columnIndex) => (
              <View key={`col-${columnIndex}`} style={styles.twoRowColumn}>
                {columnItems.map((item, rowIndex) => {
                  const index = columnIndex * rowCount + rowIndex;
                  const railFocus = bindItem(index);
                  return (
                    <ContinueCard
                      key={item.id}
                      ref={railFocus.ref}
                      item={item}
                      busy={resumingId === item.id}
                      onPress={() => onPressItem(item)}
                      onFocus={railFocus.onFocus}
                      onBlur={railFocus.onBlur}
                      isContentEntry={columnIndex === 0 && rowIndex === 0}
                      railStart={columnIndex === 0}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        ) : (
          items.map((item, index) => {
            const railFocus = bindItem(index);
            return (
              <ContinueCard
                key={item.id}
                ref={railFocus.ref}
                item={item}
                busy={resumingId === item.id}
                onPress={() => onPressItem(item)}
                onFocus={railFocus.onFocus}
                onBlur={railFocus.onBlur}
                isContentEntry={index === 0}
                railStart={index === 0}
                spaced
              />
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

async function openItem(
  router: ReturnType<typeof useRouter>,
  item: ContinueWatchingItem,
  opts: {
    isResuming: boolean;
    setResumingId: (id: string | null) => void;
  },
) {
  if (opts.isResuming) return;

  if (item.kind === 'anime' && item.animeId && item.episodeId) {
    router.push({
      pathname: '/watch/anime/[animeId]/[episodeId]',
      params: {
        animeId: String(item.animeId),
        episodeId: String(item.episodeId),
        title: item.title ?? '',
        ...(item.startProgress != null
          ? { startProgress: String(item.startProgress) }
          : {}),
      },
    });
    return;
  }

  if (item.kind === 'movie' || item.kind === 'tv') {
    const routeId =
      item.routeId ||
      item.href.match(/\/(?:movies|series)\/(\d+)/)?.[1] ||
      '';
    if (routeId) {
      opts.setResumingId(item.id);
      try {
        const resumed = await resumeLampaFromLastSelection({
          kind: item.kind,
          routeId,
          season: item.season,
          episode: item.episode,
          startProgress: item.startProgress ?? item.progress,
        });
        if (resumed) {
          router.push('/watch/lampa');
          return;
        }
      } finally {
        opts.setResumingId(null);
      }
    }
  }

  router.push(item.href as never);
}

const ContinueCard = forwardRef<
  View,
  {
    item: ContinueWatchingItem;
    onPress: () => void;
    onFocus?: () => void;
    onBlur?: () => void;
    isContentEntry?: boolean;
    railStart?: boolean;
    spaced?: boolean;
    busy?: boolean;
  }
>(function ContinueCard(
  { item, onPress, onFocus, onBlur, isContentEntry, railStart, spaced, busy },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const shellFocus = useTvShellFocus();
  const nodeRef = useRef<View | null>(null);
  const exitLeft = Platform.isTV && Boolean(railStart || isContentEntry);
  const exitUp = Platform.isTV && Boolean(isContentEntry);
  const sidebarTag = exitLeft ? shellFocus?.sidebarNativeTag : undefined;

  const setRefs = (node: View | null) => {
    nodeRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  return (
    <Pressable
      ref={setRefs}
      onFocus={() => {
        setFocused(true);
        if (Platform.isTV && nodeRef.current) {
          shellFocus?.registerContentAnchor(nodeRef.current);
        }
        if (exitLeft) shellFocus?.setExitLeftEnabled(true);
        if (exitUp) shellFocus?.setExitUpEnabled(true);
        onFocus?.();
      }}
      onBlur={() => {
        setFocused(false);
        if (exitLeft) shellFocus?.setExitLeftEnabled(false);
        if (exitUp) shellFocus?.setExitUpEnabled(false);
        onBlur?.();
      }}
      onPress={onPress}
      disabled={busy}
      style={[
        styles.card,
        spaced && styles.cardSpaced,
        { width: CARD_WIDTH },
        focused && styles.cardFocused,
      ]}
      {...(isContentEntry && Platform.isTV ? { hasTVPreferredFocus: true } : {})}
      {...(sidebarTag != null ? { nextFocusLeft: sidebarTag } : {})}
    >
      <View style={[styles.posterFrame, focused && styles.posterFrameFocused]}>
        <View style={styles.posterWrap}>
          {item.poster ? (
            <Image
              source={{ uri: item.poster }}
              style={styles.poster}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={item.poster}
            />
          ) : (
            <View style={[styles.poster, styles.posterFallback]}>
              <Text style={styles.posterFallbackText}>{item.title.slice(0, 1)}</Text>
            </View>
          )}
          <View style={styles.posterScrim} pointerEvents="none" />
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(item.progress * 100)}%` }]} />
          </View>
          {focused ? (
            <View style={[StyleSheet.absoluteFill, styles.focusWash]} pointerEvents="none" />
          ) : null}
          {busy ? (
            <View style={[StyleSheet.absoluteFill, styles.busyOverlay]} pointerEvents="none">
              <ActivityIndicator color="#fff" />
              <Text style={styles.busyText}>Загрузка…</Text>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.meta}>
        <Text style={[styles.title, focused && styles.titleFocused]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.subtitle, focused && styles.subtitleFocused]} numberOfLines={1}>
          {item.subtitle}
          {item.progress > 0 ? ` · ${formatProgressTime(item.progress)}` : ''}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  section: {
    marginBottom: Platform.isTV ? spacing.md : 32,
  },
  scroll: {
    paddingTop: Platform.isTV ? 8 : 0,
    paddingBottom: Platform.isTV ? 10 : spacing.sm,
    gap: Platform.isTV ? 10 : 12,
  },
  twoRowGrid: {
    flexDirection: 'row',
    gap: Platform.isTV ? 10 : 12,
  },
  twoRowColumn: {
    gap: Platform.isTV ? 10 : 12,
  },
  card: {
    marginRight: 0,
  },
  cardSpaced: {
    // Spacing from ScrollView `gap` only (same as poster rails).
    marginRight: 0,
  },
  cardFocused: {
    zIndex: 2,
    ...(Platform.isTV ? {} : { transform: [{ scale: 1.02 }] }),
  },
  posterFrame: {
    borderRadius: radii.lg,
    borderWidth: Platform.isTV ? tvFocus.borderWidth : 0,
    borderColor: 'transparent',
  },
  posterFrameFocused: {
    borderColor: Platform.isTV ? tvFocus.borderColor : 'transparent',
    backgroundColor: Platform.isTV ? tvFocus.wash : 'transparent',
  },
  posterWrap: {
    borderRadius: Platform.isTV ? radii.md : radii.lg,
    overflow: 'hidden',
    aspectRatio: 16 / 9,
    backgroundColor: colors.bgCard,
    borderWidth: Platform.isTV ? 0 : 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  focusWash: {
    backgroundColor: tvFocus.wash,
  },
  busyOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    gap: 8,
  },
  busyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '22%',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterFallbackText: {
    color: colors.brand,
    fontSize: 36,
    fontWeight: '700',
  },
  progressTrack: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.brand,
  },
  meta: {
    marginTop: 8,
    minHeight: 40 + 2 + 16,
  },
  title: {
    color: colors.text,
    height: 40,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    backgroundColor: 'transparent',
  },
  titleFocused: {
    color: tvFocus.titleColor,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 2,
    height: 16,
    fontSize: 12,
    lineHeight: 16,
    backgroundColor: 'transparent',
  },
  subtitleFocused: {
    color: colors.brand,
  },
});
