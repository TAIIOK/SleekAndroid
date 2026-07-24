import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { type View } from 'react-native';

import { CatalogPosterCard } from '@/components/catalog/CatalogPosterCard';
import { PaginatedContentRow } from '@/components/catalog/PaginatedContentRow';
import { useTvRailFocusRestore } from '@/hooks/useTvRailFocusRestore';
import { uniqueById } from '@/lib/searchConfig';
import {
  setCatalogActiveFocus,
  takePendingCatalogFocusRestore,
} from '@/lib/tvCatalogScrollRestore';
import { isTvUi } from '@/lib/isTvUi';

export interface RailItem {
  id: string | number;
  title: string;
  poster?: string | null;
  subtitle?: string;
  score?: number | null;
  /** Set only for anime catalog items — enables refresh-posters on dead images. */
  animeId?: number;
}

interface PosterRailProps {
  title: string;
  subtitle?: string;
  items: RailItem[];
  onItemPress?: (item: RailItem) => void;
  onSeeAll?: () => void;
  loading?: boolean;
  skeletonCount?: number;
  errorMessage?: string;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
  /** Override default rail poster width (e.g. denser detail rails on phone). */
  itemWidth?: number;
  /** Nested in a padded parent — no extra horizontal gutter. */
  flush?: boolean;
  /** First card is the screen content-entry (preferred focus after sidebar nav). */
  contentEntry?: boolean;
  /** Catalog path for scroll/focus restore (e.g. `/movies`). */
  restorePath?: string;
  /** Stable rail id for restore (defaults to title). */
  restoreRailKey?: string;
}

export function PosterRail({
  title,
  subtitle,
  items,
  onItemPress,
  onSeeAll,
  loading,
  errorMessage,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  itemWidth,
  flush = false,
  contentEntry = false,
  restorePath,
  restoreRailKey,
}: PosterRailProps) {
  // API pages (and some feeds) can repeat the same TMDB/anime id — keys must stay unique.
  const uniqueItems = useMemo(() => uniqueById(items), [items]);
  const { bindItem } = useTvRailFocusRestore(uniqueItems.length);
  const railKey = restoreRailKey ?? title;
  const hostsRef = useRef(new Map<number, View | null>());
  const itemsLengthRef = useRef(uniqueItems.length);
  const screenFocusedRef = useRef(false);
  itemsLengthRef.current = uniqueItems.length;

  const tryRestoreFocus = useCallback(() => {
    if (!isTvUi() || !restorePath || itemsLengthRef.current <= 0) return null;
    const index = takePendingCatalogFocusRestore(restorePath, railKey);
    if (index == null) return null;
    const clamped = Math.min(index, itemsLengthRef.current - 1);
    return setTimeout(() => {
      const host = hostsRef.current.get(clamped) as
        | (View & { requestTVFocus?: () => void })
        | null;
      host?.requestTVFocus?.();
    }, 80);
  }, [restorePath, railKey]);

  // Re-run on every screen focus — catalog stays mounted under Stack detail,
  // so a mount-only restore would never fire again on Back.
  // rAF: wait until useTvCatalogScrollRestore sets pending in the same focus pass.
  useFocusEffect(
    useCallback(() => {
      screenFocusedRef.current = true;
      if (!isTvUi() || !restorePath) {
        return () => {
          screenFocusedRef.current = false;
        };
      }
      let focusTimer: ReturnType<typeof setTimeout> | null = null;
      const frame = requestAnimationFrame(() => {
        focusTimer = tryRestoreFocus();
      });
      return () => {
        screenFocusedRef.current = false;
        cancelAnimationFrame(frame);
        if (focusTimer != null) clearTimeout(focusTimer);
      };
    }, [restorePath, tryRestoreFocus]),
  );

  // Progressive rails: pending may be set before this rail has items.
  useEffect(() => {
    if (!screenFocusedRef.current || !uniqueItems.length) return;
    const focusTimer = tryRestoreFocus();
    return () => {
      if (focusTimer != null) clearTimeout(focusTimer);
    };
  }, [uniqueItems.length, tryRestoreFocus]);

  return (
    <PaginatedContentRow
      title={title}
      subtitle={subtitle}
      items={uniqueItems}
      getItemKey={(item) => item.id}
      isLoading={loading}
      isError={Boolean(errorMessage)}
      errorMessage={errorMessage}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={onLoadMore}
      onSeeAll={onSeeAll}
      flush={flush}
      renderItem={(item, index) => {
        const railFocus = bindItem(index);
        return (
          <CatalogPosterCard
            ref={(node) => {
              hostsRef.current.set(index, node);
              railFocus.ref?.(node);
            }}
            title={item.title}
            poster={item.poster}
            animeId={item.animeId}
            subtitle={item.subtitle}
            rating={item.score}
            onPress={() => onItemPress?.(item)}
            onFocus={() => {
              railFocus.onFocus?.();
              if (restorePath) {
                setCatalogActiveFocus(restorePath, railKey, index);
              }
              if (
                hasNextPage &&
                !isFetchingNextPage &&
                onLoadMore &&
                index >= items.length - 3
              ) {
                onLoadMore();
              }
            }}
            onBlur={railFocus.onBlur}
            variant="rail"
            width={itemWidth}
            railStart={index === 0}
            contentEntry={contentEntry && index === 0}
            pinVerticalFocus={railFocus.pinVerticalFocus}
          />
        );
      }}
    />
  );
}
