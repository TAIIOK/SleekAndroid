import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';

import { fetchFavoriteBookmarks } from '@/api/library';
import { CatalogPosterCard } from '@/components/catalog/CatalogPosterCard';
import { PosterGrid, usePosterGridCardWidth } from '@/components/catalog/PosterGrid';
import { LibraryHubChrome } from '@/components/library/LibraryHubChrome';
import { LibraryShowMoreButton } from '@/components/library/LibraryShowMoreButton';
import { colors, spacing } from '@/constants/aniverse';
import { LIBRARY_PAGE_SIZE } from '@/lib/libraryPaging';
import { tvVerticalCatalogScrollProps } from '@/lib/tvCatalogScroll';
import { isTvUi } from '@/lib/isTvUi';
import { useMobileChromeScrollProps } from '@/providers/MobileChromeScroll';

export default function BookmarksScreen() {
  const router = useRouter();
  const cardWidth = usePosterGridCardWidth();
  const [visibleCount, setVisibleCount] = useState(LIBRARY_PAGE_SIZE);
  const chromeScrollProps = useMobileChromeScrollProps(undefined, styles.content);
  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ['library-favorites'],
    queryFn: fetchFavoriteBookmarks,
  });

  useEffect(() => {
    setVisibleCount(LIBRARY_PAGE_SIZE);
  }, [bookmarks.length]);

  const visible = useMemo(
    () => bookmarks.slice(0, visibleCount),
    [bookmarks, visibleCount],
  );
  const hasMore = bookmarks.length > visibleCount;

  return (
    <ScrollView
      style={styles.scroll}
      {...chromeScrollProps}
      {...tvVerticalCatalogScrollProps}
    >
      <LibraryHubChrome />
      {isLoading ? (
        <ActivityIndicator color={colors.brand} style={styles.loader} />
      ) : !bookmarks.length ? (
        <Text style={styles.empty}>Закладок пока нет</Text>
      ) : (
        <>
          <PosterGrid>
            {visible.map((item, index) => (
              <CatalogPosterCard
                key={`${item.kind}-${item.id}`}
                variant="grid"
                width={cardWidth}
                title={item.title}
                poster={item.poster}
                subtitle={item.subtitle}
                onPress={() => router.push(item.to as '/')}
                railStart={index === 0}
              />
            ))}
          </PosterGrid>
          {hasMore ? (
            <LibraryShowMoreButton
              remaining={bookmarks.length - visibleCount}
              pageSize={LIBRARY_PAGE_SIZE}
              onPress={() => setVisibleCount((n) => n + LIBRARY_PAGE_SIZE)}
            />
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: isTvUi() ? spacing.xxl * 2 : spacing.xl },
  loader: { marginTop: spacing.xxl },
  empty: {
    color: colors.textSecondary,
    fontSize: 15,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
});
