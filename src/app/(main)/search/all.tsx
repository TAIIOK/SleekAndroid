import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { searchCatalog } from '@/api/catalog';
import { CatalogPosterCard } from '@/components/catalog/CatalogPosterCard';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, spacing, tvFocus } from '@/constants/aniverse';
import { usePosterGridLayout } from '@/hooks/usePosterGridLayout';
import { lampaDetailPath } from '@/lib/lampaDetail';
import { animePoster } from '@/lib/poster';
import { isTvUi } from '@/lib/isTvUi';
import {
  lampaKindForMediaFilter,
  mediaForSearchBucket,
  searchTypeForMediaFilter,
  uniqueById,
  type SearchSeeAllBucket,
} from '@/lib/searchConfig';

const PAGE_SIZE = 24;

export default function SearchAllScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    q?: string;
    bucket?: string;
    kind?: string;
  }>();
  const { columns, gap, cardWidth, horizontalPadding } = usePosterGridLayout(spacing.lg);

  const q = (params.q ?? '').trim();
  const bucket = (params.bucket as SearchSeeAllBucket | undefined) ?? 'anime';
  const kind = params.kind ?? null;
  const media = mediaForSearchBucket(bucket, kind);
  const canSearch = q.length >= 2 && (bucket === 'anime' || bucket === 'lampa');
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search-all', q, bucket, kind, page],
    queryFn: () =>
      searchCatalog({
        q,
        type: searchTypeForMediaFilter(media),
        limit: PAGE_SIZE,
        page,
      }),
    enabled: canSearch,
  });

  const title = bucket === 'anime' ? 'Аниме' : kind === 'tv' ? 'Сериалы' : 'Фильмы';

  const items = useMemo(() => {
    if (!data) return [];
    if (bucket === 'anime') {
      return uniqueById(data.anime ?? []).map((item) => ({
        key: `anime-${item.id}`,
        title: item.title ?? 'Без названия',
        poster: animePoster(item),
        score: item.score,
        onPress: () => router.push(`/anime/${item.id}` as '/'),
      }));
    }
    const lampaKind = lampaKindForMediaFilter(media);
    return uniqueById(
      (data.lampa ?? []).filter((item) => {
        if (!lampaKind) return true;
        const row = item as unknown as Record<string, unknown>;
        const k = String(row.kind ?? row.mediaKind ?? 'movie');
        return k === lampaKind;
      }),
    ).map((item) => {
      const row = item as unknown as Record<string, unknown>;
      const k = String(row.kind ?? row.mediaKind ?? lampaKind ?? 'movie');
      return {
        key: `lampa-${item.id}`,
        title: item.title ?? item.name ?? 'Без названия',
        poster: item.poster ?? item.poster_path,
        score: item.vote_average,
        onPress: () => router.push(lampaDetailPath(k, { id: item.id }) as '/'),
      };
    });
  }, [data, bucket, media, router]);

  const loadMore = useCallback(() => {
    if (!isFetching && items.length >= page * PAGE_SIZE) {
      setPage((prev) => prev + 1);
    }
  }, [isFetching, items.length, page]);

  if (!canSearch) {
    router.replace('/search');
    return null;
  }

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingHorizontal: horizontalPadding }]}>
        <TvFocusable
          onPress={() => router.back()}
          style={styles.backBtn}
          focusedStyle={styles.backBtnFocused}
          hasTVPreferredFocus={isTvUi()}
        >
          <Text style={styles.back}>← Назад</Text>
        </TvFocusable>
        <Text style={styles.title}>{q ? `${title} · «${q}»` : title}</Text>
      </View>

      {isLoading && page === 1 ? (
        <ActivityIndicator color={colors.brand} style={styles.loader} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.key}
          numColumns={columns}
          contentContainerStyle={[styles.grid, { paddingHorizontal: horizontalPadding, gap }]}
          columnWrapperStyle={columns > 1 ? { gap } : undefined}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetching ? <ActivityIndicator color={colors.brand} style={styles.footer} /> : null
          }
          renderItem={({ item, index }) => (
            <CatalogPosterCard
              variant="grid"
              width={cardWidth}
              title={item.title}
              poster={item.poster}
              score={item.score}
              onPress={item.onPress}
              railStart={index % columns === 0}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingTop: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  backBtn: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  backBtnFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: tvFocus.fill,
  },
  back: {
    color: colors.brand,
    fontSize: isTvUi() ? 16 : 14,
    fontWeight: '600',
  },
  title: {
    color: colors.text,
    fontSize: isTvUi() ? 22 : 22,
    fontWeight: '700',
  },
  loader: {
    marginTop: spacing.xxl,
  },
  grid: {
    paddingBottom: spacing.xxl,
  },
  footer: {
    marginVertical: spacing.lg,
  },
});
