import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import {
  findNodeHandle,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SectionHeader } from '@/components/ui/SectionHeader';
import { TvFocusGuide } from '@/components/tv/TvFocusGuide';
import { colors, layout, radii, spacing, tvFocus } from '@/constants/aniverse';
import { usePosterDisplayUri } from '@/hooks/usePosterDisplayUri';
import { useTvCatalogVerticalNeighbors } from '@/hooks/useTvCatalogVerticalNeighbors';
import { useTvRailFocusRestore } from '@/hooks/useTvRailFocusRestore';
import type { ContinueWatchingItem } from '@/lib/continueWatching';
import { formatContinueProgressLabel } from '@/lib/continueWatching';
import { continuePosterDecodeSize } from '@/lib/catalogRailLayout';
import { isTvUi } from '@/lib/isTvUi';
import { tvHorizontalCatalogScrollProps, tvRailSectionSnapProps } from '@/lib/tvCatalogScroll';
import { setCatalogActiveFocus } from '@/lib/tvCatalogScrollRestore';
import { registerTvCatalogRail } from '@/lib/tvCatalogVerticalFocus';
import { tvNextFocusLeft } from '@/lib/tvRailFocus';
import { useTvEventHandlerSafe } from '@/lib/tvEventHandler';
import {
  requestTvHomeCatalogFocus,
  requestTvHomeChromeFocus,
} from '@/lib/tvHomeFocusHandoff';
import { useTvShellFocus } from '@/providers/TvShellFocus';

const CONTINUE_RAIL_KEY = '__continue__';
const CONTINUE_RAIL_PRIORITY = -1;

const CARD_WIDTH = layout.continueCardWidth;

interface ContinueWatchingRowProps {
  items: ContinueWatchingItem[];
}

export function ContinueWatchingRow({ items }: ContinueWatchingRowProps) {
  const router = useRouter();
  const neighbors = useTvCatalogVerticalNeighbors('/', CONTINUE_RAIL_PRIORITY);
  const nextFocusUp = neighbors.up;
  const nextFocusDown = neighbors.down;
  const { bindItem, ownsFocusRef } = useTvRailFocusRestore(items.length, {
    stealHorizontalEscape: isTvUi(),
  });
  const horizontalPad = isTvUi() ? layout.gutterDesktop : layout.gutterMobile;
  const itemTagsRef = useRef<(number | undefined)[]>([]);
  const [itemTags, setItemTags] = useState<(number | undefined)[]>([]);
  const flushTagsScheduled = useRef(false);

  const setItemTag = useCallback((index: number, tag: number | undefined) => {
    if (itemTagsRef.current[index] === tag) return;
    itemTagsRef.current[index] = tag;
    if (flushTagsScheduled.current) return;
    flushTagsScheduled.current = true;
    queueMicrotask(() => {
      flushTagsScheduled.current = false;
      setItemTags(itemTagsRef.current.slice());
    });
  }, []);

  useTvEventHandlerSafe((event) => {
    if (!isTvUi() || event.eventKeyAction === 0) return;
    if (!ownsFocusRef.current) return;
    if (event.eventType === 'up') {
      requestTvHomeChromeFocus();
      return;
    }
    if (event.eventType === 'down') {
      requestTvHomeCatalogFocus();
    }
  });

  if (!items.length) return null;

  const rail = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPad }]}
      {...tvHorizontalCatalogScrollProps}
    >
      {items.map((item, index) => {
        const railFocus = bindItem(index);
        return (
          <View key={item.id} collapsable={false}>
            <ContinueCard
              ref={(node) => {
                railFocus.ref?.(node);
                if (index === 0) registerTvCatalogRail('/', CONTINUE_RAIL_PRIORITY, node);
              }}
              item={item}
              onPress={() => openItem(router, item)}
              onFocus={railFocus.onFocus}
              onBlur={railFocus.onBlur}
              isContentEntry={false}
              railStart={index === 0}
              railEnd={index === items.length - 1}
              nextFocusLeft={itemTags[index - 1]}
              nextFocusRight={itemTags[index + 1]}
              nextFocusUp={nextFocusUp}
              nextFocusDown={nextFocusDown}
              onNativeTag={(tag) => setItemTag(index, tag)}
            />
          </View>
        );
      })}
    </ScrollView>
  );

  return (
    <View style={styles.section} {...tvRailSectionSnapProps}>
      <SectionHeader title="Продолжить просмотр" variant="continue" />
      {isTvUi() ? (
        <TvFocusGuide trapFocusRight>
          {rail}
        </TvFocusGuide>
      ) : (
        rail
      )}
    </View>
  );
}

function openItem(
  router: ReturnType<typeof useRouter>,
  item: ContinueWatchingItem,
) {
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
    railEnd?: boolean;
    nextFocusLeft?: number;
    nextFocusRight?: number;
    nextFocusUp?: number;
    nextFocusDown?: number;
    onNativeTag?: (tag: number | undefined) => void;
  }
>(function ContinueCard(
  {
    item,
    onPress,
    onFocus,
    onBlur,
    isContentEntry,
    railStart,
    railEnd,
    nextFocusLeft,
    nextFocusRight,
    nextFocusUp,
    nextFocusDown,
    onNativeTag,
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [selfTag, setSelfTag] = useState<number | undefined>();
  const shellFocus = useTvShellFocus();
  const nodeRef = useRef<(View & { requestTVFocus?: () => void }) | null>(null);
  const claimedEntryFocusRef = useRef(false);
  const exitLeft = isTvUi() && Boolean(railStart || isContentEntry);
  const exitUp = isTvUi() && Boolean(isContentEntry);
  const pinnedRight =
    nextFocusRight ?? (isTvUi() && railEnd ? selfTag : undefined);
  const pinnedLeft = tvNextFocusLeft({
    railStart: exitLeft,
    exitTag: shellFocus?.sidebarNativeTag,
    siblingTag: nextFocusLeft,
  });
  const { displayUrl, imageSource, onLoad, onError } = usePosterDisplayUri({
    poster: item.poster,
    animeId: item.animeId,
  });
  const decodeSize = continuePosterDecodeSize(CARD_WIDTH);

  const captureTag = (node: View | null) => {
    if (!isTvUi()) return;
    const tag =
      node != null
        ? (findNodeHandle(node as Parameters<typeof findNodeHandle>[0]) ?? undefined)
        : undefined;
    setSelfTag((prev) => (prev === tag ? prev : tag));
    onNativeTag?.(tag);
  };

  const setRefs = (node: View | null) => {
    nodeRef.current = node as (View & { requestTVFocus?: () => void }) | null;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
    captureTag(node);
  };

  useEffect(() => {
    if (!isTvUi() || !isContentEntry || claimedEntryFocusRef.current) return;
    claimedEntryFocusRef.current = true;
    const timer = setTimeout(() => {
      nodeRef.current?.requestTVFocus?.();
    }, 60);
    return () => clearTimeout(timer);
  }, [isContentEntry]);

  return (
    <Pressable
      ref={setRefs}
      onFocus={() => {
        setFocused(true);
        if (isTvUi() && nodeRef.current) {
          shellFocus?.registerContentAnchor(nodeRef.current);
          captureTag(nodeRef.current);
          setCatalogActiveFocus('/', CONTINUE_RAIL_KEY, 0);
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
      style={[
        styles.card,
        { width: CARD_WIDTH },
        focused && styles.cardFocused,
      ]}
      {...(isContentEntry && isTvUi() ? { hasTVPreferredFocus: true } : {})}
      {...(pinnedLeft != null ? { nextFocusLeft: pinnedLeft } : {})}
      {...(nextFocusUp != null ? { nextFocusUp } : {})}
      {...(nextFocusDown != null ? { nextFocusDown } : {})}
      {...(pinnedRight != null ? { nextFocusRight: pinnedRight } : {})}
    >
      <View style={[styles.posterFrame, focused && styles.posterFrameFocused]}>
        <View style={styles.posterWrap}>
          {imageSource ? (
            <Image
              source={{ ...imageSource, width: decodeSize.width, height: decodeSize.height }}
              style={styles.poster}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={displayUrl}
              transition={0}
              onLoad={onLoad}
              onError={onError}
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
        </View>
      </View>
      <View style={styles.meta}>
        <Text style={[styles.title, focused && styles.titleFocused]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.subtitle, focused && styles.subtitleFocused]} numberOfLines={1}>
          {item.subtitle}
          {item.progress > 0
            ? ` · ${formatContinueProgressLabel(item.progress, item.durationSec)}`
            : ''}
        </Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  section: {
    marginBottom: isTvUi() ? spacing.md : 32,
  },
  scroll: {
    paddingTop: isTvUi() ? 8 : 0,
    paddingBottom: isTvUi() ? 10 : spacing.sm,
    gap: isTvUi() ? 10 : 12,
  },
  card: {
    marginRight: 0,
  },
  cardFocused: {
    zIndex: 2,
    ...(isTvUi() ? {} : { transform: [{ scale: 1.02 }] }),
  },
  posterFrame: {
    borderRadius: radii.lg,
    borderWidth: isTvUi() ? tvFocus.borderWidth : 0,
    borderColor: 'transparent',
  },
  posterFrameFocused: {
    borderColor: isTvUi() ? tvFocus.borderColor : 'transparent',
    backgroundColor: isTvUi() ? tvFocus.wash : 'transparent',
  },
  posterWrap: {
    width: '100%',
    borderRadius: isTvUi() ? radii.md : radii.lg,
    overflow: 'hidden',
    aspectRatio: 16 / 9,
    backgroundColor: colors.bgCard,
    borderWidth: isTvUi() ? 0 : 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  focusWash: {
    backgroundColor: tvFocus.wash,
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
    fontSize: isTvUi() ? 36 : 28,
    fontWeight: '700',
  },
  progressTrack: {
    position: 'absolute',
    left: isTvUi() ? 12 : 8,
    right: isTvUi() ? 12 : 8,
    bottom: isTvUi() ? 10 : 8,
    height: isTvUi() ? 4 : 3,
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
    marginTop: isTvUi() ? 8 : 6,
    minHeight: isTvUi() ? 58 : 50,
  },
  title: {
    color: colors.text,
    height: isTvUi() ? 40 : 34,
    fontSize: isTvUi() ? 15 : 13,
    lineHeight: isTvUi() ? 20 : 17,
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
    height: isTvUi() ? 16 : 14,
    fontSize: isTvUi() ? 12 : 11,
    lineHeight: isTvUi() ? 16 : 14,
    backgroundColor: 'transparent',
  },
  subtitleFocused: {
    color: colors.brand,
  },
});
