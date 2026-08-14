import { useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { CatalogPosterCard } from '@/components/catalog/CatalogPosterCard';
import { PosterGrid, usePosterGridCardWidth } from '@/components/catalog/PosterGrid';
import { LibraryShowMoreButton } from '@/components/library/LibraryShowMoreButton';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, spacing } from '@/constants/aniverse';
import { LIBRARY_PAGE_SIZE } from '@/lib/libraryPaging';
import { lampaDetailPath, lampaTitle } from '@/lib/lampaDetail';
import {
  MY_LISTS_STATUS_LABELS,
  MY_LISTS_STATUS_ORDER,
  countLabel,
  getLampaMediaBucket,
  getSavedLampaUserStatus,
  hasListStatus,
  lampaMatchesMediaFilter,
  normalizeListStatus,
  showAnimeLists,
  showLampaLists,
  type MyListsMediaFilter,
  type MyListsStatusFilter,
  type UserAnimeStatus,
} from '@/lib/myLists';
import { animePoster, lampaPosterPath } from '@/lib/poster';
import type { SavedAnimeItem } from '@/types/progress';
import { isTvUi } from '@/lib/isTvUi';

interface MyListsContentProps {
  media: MyListsMediaFilter;
  anime: SavedAnimeItem[];
  lampa: Array<Record<string, unknown>>;
  statusFilter: MyListsStatusFilter;
  groupByStatus: boolean;
  libraryTotal: number;
}

export function MyListsContent({
  media,
  anime,
  lampa,
  statusFilter,
  groupByStatus,
  libraryTotal,
}: MyListsContentProps) {
  const router = useRouter();
  const cardWidth = usePosterGridCardWidth();
  const resetKey = `${media}:${statusFilter}`;

  const visibleAnime = showAnimeLists(media)
    ? anime.filter((item) => {
        if (!hasListStatus(item.status)) return false;
        if (statusFilter === 'all') return true;
        return normalizeListStatus(item.status) === statusFilter;
      })
    : [];

  const visibleLampa = showLampaLists(media)
    ? lampa.filter((row) => {
        const status = getSavedLampaUserStatus(row);
        if (!hasListStatus(status)) return false;
        if (!lampaMatchesMediaFilter(row, media)) return false;
        if (statusFilter === 'all') return true;
        return normalizeListStatus(status) === statusFilter;
      })
    : [];

  const movieItems = visibleLampa.filter((row) => getLampaMediaBucket(row) === 'movie');
  const tvItems = visibleLampa.filter((row) => getLampaMediaBucket(row) === 'tv');

  const totalVisible = visibleAnime.length + movieItems.length + tvItems.length;

  if (totalVisible === 0) {
    return (
      <Text style={styles.empty}>
        {libraryTotal > 0 ? 'Нет тайтлов по выбранным фильтрам' : 'Списки пока пусты'}
      </Text>
    );
  }

  if (!groupByStatus) {
    if (media === 'all') {
      return (
        <View style={styles.sections}>
          {visibleAnime.length ? (
            <PaginatedKindSection
              resetKey={resetKey}
              title={
                statusFilter !== 'all'
                  ? MY_LISTS_STATUS_LABELS[statusFilter as UserAnimeStatus]
                  : 'Аниме'
              }
              itemCount={visibleAnime.length}
            >
              {(limit) =>
                visibleAnime.slice(0, limit).map((item, index) => (
                  <AnimeCard
                    key={`anime-${item.animeId}`}
                    item={item}
                    width={cardWidth}
                    railStart={index === 0}
                    onPress={() => router.push(`/anime/${item.animeId}` as '/')}
                  />
                ))
              }
            </PaginatedKindSection>
          ) : null}
          {movieItems.length ? (
            <PaginatedKindSection resetKey={resetKey} title="Фильмы" itemCount={movieItems.length}>
              {(limit) =>
                movieItems.slice(0, limit).map((row, index) => (
                  <LampaCard
                    key={`lampa-${String(row.lampaObjectId ?? row.id)}`}
                    row={row}
                    width={cardWidth}
                    railStart={index === 0}
                    onPress={() =>
                      router.push(
                        lampaDetailPath('movie', (row.lampa ?? row) as Record<string, unknown>) as '/',
                      )
                    }
                  />
                ))
              }
            </PaginatedKindSection>
          ) : null}
          {tvItems.length ? (
            <PaginatedKindSection resetKey={resetKey} title="Сериалы" itemCount={tvItems.length}>
              {(limit) =>
                tvItems.slice(0, limit).map((row, index) => (
                  <LampaCard
                    key={`lampa-${String(row.lampaObjectId ?? row.id)}`}
                    row={row}
                    width={cardWidth}
                    railStart={index === 0}
                    onPress={() =>
                      router.push(
                        lampaDetailPath('tv', (row.lampa ?? row) as Record<string, unknown>) as '/',
                      )
                    }
                  />
                ))
              }
            </PaginatedKindSection>
          ) : null}
        </View>
      );
    }

    const flatItems = [
      ...visibleAnime.map((item) => ({ type: 'anime' as const, item })),
      ...visibleLampa.map((row) => ({ type: 'lampa' as const, row })),
    ];

    return (
      <PaginatedKindSection
        resetKey={resetKey}
        title={
          media === 'anime'
            ? 'Аниме'
            : media === 'movie'
              ? 'Фильмы'
              : 'Сериалы'
        }
        itemCount={flatItems.length}
      >
        {(limit) =>
          flatItems.slice(0, limit).map((entry, index) =>
            entry.type === 'anime' ? (
              <AnimeCard
                key={`anime-${entry.item.animeId}`}
                item={entry.item}
                width={cardWidth}
                railStart={index === 0}
                onPress={() => router.push(`/anime/${entry.item.animeId}` as '/')}
              />
            ) : (
              <LampaCard
                key={`lampa-${String(entry.row.lampaObjectId ?? entry.row.id)}`}
                row={entry.row}
                width={cardWidth}
                railStart={index === 0}
                onPress={() => {
                  const bucket = getLampaMediaBucket(entry.row);
                  const nested = (entry.row.lampa ?? entry.row) as Record<string, unknown>;
                  router.push(lampaDetailPath(bucket, nested) as '/');
                }}
              />
            ),
          )
        }
      </PaginatedKindSection>
    );
  }

  const animeGroups = groupAnimeByStatus(visibleAnime);
  const movieGroups =
    media === 'all'
      ? [{ status: null as UserAnimeStatus | null, items: movieItems }]
      : groupLampaByStatus(movieItems);
  const tvGroups =
    media === 'all'
      ? [{ status: null as UserAnimeStatus | null, items: tvItems }]
      : groupLampaByStatus(tvItems);

  return (
    <View style={styles.sections}>
      {animeGroups.map((group) =>
        group.items.length ? (
          <PaginatedKindSection
            key={`anime-${group.status ?? 'all'}`}
            resetKey={resetKey}
            title={
              group.status != null
                ? MY_LISTS_STATUS_LABELS[group.status]
                : statusFilter !== 'all'
                  ? MY_LISTS_STATUS_LABELS[statusFilter as UserAnimeStatus]
                  : 'Аниме'
            }
            itemCount={group.items.length}
          >
            {(limit) =>
              group.items.slice(0, limit).map((item, index) => (
                <AnimeCard
                  key={`anime-${item.animeId}`}
                  item={item}
                  width={cardWidth}
                  railStart={index === 0}
                  onPress={() => router.push(`/anime/${item.animeId}` as '/')}
                />
              ))
            }
          </PaginatedKindSection>
        ) : null,
      )}

      {(media === 'all' || media === 'movie') &&
        movieGroups.map((group) =>
          group.items.length ? (
            <PaginatedKindSection
              key={`movie-${group.status ?? 'all'}`}
              resetKey={resetKey}
              title={
                group.status != null
                  ? MY_LISTS_STATUS_LABELS[group.status]
                  : 'Фильмы'
              }
              itemCount={group.items.length}
            >
              {(limit) =>
                group.items.slice(0, limit).map((row, index) => {
                  const nested = (row.lampa ?? row) as Record<string, unknown>;
                  return (
                    <LampaCard
                      key={`lampa-${String(row.lampaObjectId ?? row.id)}`}
                      row={row}
                      width={cardWidth}
                      railStart={index === 0}
                      onPress={() => router.push(lampaDetailPath('movie', nested) as '/')}
                    />
                  );
                })
              }
            </PaginatedKindSection>
          ) : null,
        )}

      {(media === 'all' || media === 'tv') &&
        tvGroups.map((group) =>
          group.items.length ? (
            <PaginatedKindSection
              key={`tv-${group.status ?? 'all'}`}
              resetKey={resetKey}
              title={
                group.status != null
                  ? MY_LISTS_STATUS_LABELS[group.status]
                  : 'Сериалы'
              }
              itemCount={group.items.length}
            >
              {(limit) =>
                group.items.slice(0, limit).map((row, index) => {
                  const nested = (row.lampa ?? row) as Record<string, unknown>;
                  return (
                    <LampaCard
                      key={`lampa-${String(row.lampaObjectId ?? row.id)}`}
                      row={row}
                      width={cardWidth}
                      railStart={index === 0}
                      onPress={() => router.push(lampaDetailPath('tv', nested) as '/')}
                    />
                  );
                })
              }
            </PaginatedKindSection>
          ) : null,
        )}
    </View>
  );
}

function PaginatedKindSection({
  resetKey,
  title,
  itemCount,
  children,
}: {
  resetKey: string;
  title: string;
  itemCount: number;
  children: (limit: number) => ReactNode;
}) {
  const [visibleCount, setVisibleCount] = useState(LIBRARY_PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(LIBRARY_PAGE_SIZE);
  }, [resetKey, itemCount]);

  const limit = Math.min(visibleCount, itemCount);
  const remaining = itemCount - limit;

  return (
    <View style={styles.section}>
      <SectionHeader title={title} subtitle={countLabel(itemCount)} showAccent={isTvUi()} />
      <PosterGrid>{children(limit)}</PosterGrid>
      <LibraryShowMoreButton
        remaining={remaining}
        pageSize={LIBRARY_PAGE_SIZE}
        onPress={() => setVisibleCount((n) => n + LIBRARY_PAGE_SIZE)}
      />
    </View>
  );
}

function AnimeCard({
  item,
  width,
  railStart,
  onPress,
}: {
  item: SavedAnimeItem;
  width: number;
  railStart: boolean;
  onPress: () => void;
}) {
  return (
    <CatalogPosterCard
      variant="grid"
      width={width}
      title={item.title ?? item.anime?.title?.toString() ?? 'Аниме'}
      poster={item.poster ?? (item.anime ? animePoster(item.anime) : undefined)}
      animeId={item.animeId}
      subtitle="Аниме"
      onPress={onPress}
      railStart={railStart}
    />
  );
}

function LampaCard({
  row,
  width,
  railStart,
  onPress,
}: {
  row: Record<string, unknown>;
  width: number;
  railStart: boolean;
  onPress: () => void;
}) {
  const bucket = getLampaMediaBucket(row);
  const nested = (row.lampa ?? row) as Record<string, unknown>;
  return (
    <CatalogPosterCard
      variant="grid"
      width={width}
      title={typeof row.title === 'string' ? row.title : lampaTitle(nested)}
      poster={
        typeof row.poster === 'string'
          ? row.poster
          : lampaPosterPath(nested) ?? lampaPosterPath(row)
      }
      subtitle={bucket === 'tv' ? 'Сериал' : 'Фильм'}
      onPress={onPress}
      railStart={railStart}
    />
  );
}

function groupAnimeByStatus(items: SavedAnimeItem[]) {
  const groups = MY_LISTS_STATUS_ORDER.map((status) => ({
    status,
    items: items.filter((item) => normalizeListStatus(item.status) === status),
  })).filter((group) => group.items.length > 0);
  return groups.length ? groups : [{ status: null as UserAnimeStatus | null, items }];
}

function groupLampaByStatus(items: Array<Record<string, unknown>>) {
  const groups = MY_LISTS_STATUS_ORDER.map((status) => ({
    status,
    items: items.filter(
      (row) => normalizeListStatus(getSavedLampaUserStatus(row)) === status,
    ),
  })).filter((group) => group.items.length > 0);
  return groups.length ? groups : [{ status: null as UserAnimeStatus | null, items }];
}

const styles = StyleSheet.create({
  empty: {
    color: colors.textSecondary,
    fontSize: 15,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  sections: {
    gap: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
});
