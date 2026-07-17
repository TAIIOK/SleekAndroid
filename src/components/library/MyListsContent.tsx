import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { CatalogPosterCard } from '@/components/catalog/CatalogPosterCard';
import { PosterGrid } from '@/components/catalog/PosterGrid';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, layout, spacing } from '@/constants/aniverse';
import { lampaDetailPath, lampaTitle } from '@/lib/lampaDetail';
import {
  MY_LISTS_STATUS_LABELS,
  MY_LISTS_STATUS_ORDER,
  countLabel,
  getLampaKind,
  getSavedLampaUserStatus,
  hasListStatus,
  normalizeListStatus,
  showAnimeLists,
  showLampaLists,
  type MyListsMediaFilter,
  type MyListsStatusFilter,
  type UserAnimeStatus,
} from '@/lib/myLists';
import { animePoster, lampaPosterPath } from '@/lib/poster';
import type { SavedAnimeItem } from '@/types/progress';

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
  const cardWidth = layout.posterWidthRail;

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
        if (media !== 'all' && getLampaKind(row) !== media) return false;
        if (statusFilter === 'all') return true;
        return normalizeListStatus(status) === statusFilter;
      })
    : [];

  const totalVisible = visibleAnime.length + visibleLampa.length;

  if (totalVisible === 0) {
    return (
      <Text style={styles.empty}>
        {libraryTotal > 0 ? 'Нет тайтлов по выбранным фильтрам' : 'Списки пока пусты'}
      </Text>
    );
  }

  if (!groupByStatus) {
    return (
      <PosterGrid>
        {visibleAnime.map((item) => (
          <CatalogPosterCard
            key={`anime-${item.animeId}`}
            variant="grid"
            width={cardWidth}
            title={item.title ?? item.anime?.title?.toString() ?? 'Аниме'}
            poster={item.poster ?? (item.anime ? animePoster(item.anime) : undefined)}
            subtitle="Аниме"
            onPress={() => router.push(`/anime/${item.animeId}` as '/')}
          />
        ))}
        {visibleLampa.map((row) => {
          const kind = getLampaKind(row);
          const nested = (row.lampa ?? row) as Record<string, unknown>;
          return (
            <CatalogPosterCard
              key={`lampa-${String(row.lampaObjectId ?? row.id)}`}
              variant="grid"
              width={cardWidth}
              title={typeof row.title === 'string' ? row.title : lampaTitle(nested)}
              poster={
                typeof row.poster === 'string'
                  ? row.poster
                  : lampaPosterPath(nested) ?? lampaPosterPath(row)
              }
              subtitle={kind === 'tv' ? 'Сериал' : 'Фильм'}
              onPress={() => router.push(lampaDetailPath(kind, nested) as '/')}
            />
          );
        })}
      </PosterGrid>
    );
  }

  const animeGroups = groupAnimeByStatus(visibleAnime);
  const lampaGroups = groupLampaByStatus(visibleLampa, media);

  return (
    <View style={styles.sections}>
      {animeGroups.map((group) =>
        group.items.length ? (
          <View key={group.status ?? 'anime'} style={styles.section}>
            <SectionHeader
              title={
                group.status != null
                  ? MY_LISTS_STATUS_LABELS[group.status]
                  : statusFilter !== 'all'
                    ? MY_LISTS_STATUS_LABELS[statusFilter as UserAnimeStatus]
                    : 'Аниме'
              }
              subtitle={countLabel(group.items.length)}
              showAccent={Platform.isTV}
            />
            <PosterGrid>
              {group.items.map((item) => (
                <CatalogPosterCard
                  key={`anime-${item.animeId}`}
                  variant="grid"
                  width={cardWidth}
                  title={item.title ?? item.anime?.title?.toString() ?? 'Аниме'}
                  poster={item.poster ?? (item.anime ? animePoster(item.anime) : undefined)}
                  subtitle="Аниме"
                  onPress={() => router.push(`/anime/${item.animeId}` as '/')}
                />
              ))}
            </PosterGrid>
          </View>
        ) : null,
      )}
      {lampaGroups.map((group) =>
        group.items.length ? (
          <View key={group.status ?? 'lampa'} style={styles.section}>
            <SectionHeader
              title={
                group.status != null
                  ? MY_LISTS_STATUS_LABELS[group.status]
                  : media === 'movie'
                    ? 'Фильмы'
                    : media === 'tv'
                      ? 'Сериалы'
                      : 'Фильмы и сериалы'
              }
              subtitle={countLabel(group.items.length)}
              showAccent={Platform.isTV}
            />
            <PosterGrid>
              {group.items.map((row) => {
                const kind = getLampaKind(row);
                const nested = (row.lampa ?? row) as Record<string, unknown>;
                return (
                  <CatalogPosterCard
                    key={`lampa-${String(row.lampaObjectId ?? row.id)}`}
                    variant="grid"
                    width={cardWidth}
                    title={typeof row.title === 'string' ? row.title : lampaTitle(nested)}
                    poster={
                      typeof row.poster === 'string'
                        ? row.poster
                        : lampaPosterPath(nested) ?? lampaPosterPath(row)
                    }
                    subtitle={kind === 'tv' ? 'Сериал' : 'Фильм'}
                    onPress={() => router.push(lampaDetailPath(kind, nested) as '/')}
                  />
                );
              })}
            </PosterGrid>
          </View>
        ) : null,
      )}
    </View>
  );
}

function groupAnimeByStatus(items: SavedAnimeItem[]) {
  const groups = MY_LISTS_STATUS_ORDER.map((status) => ({
    status,
    items: items.filter((item) => normalizeListStatus(item.status) === status),
  })).filter((group) => group.items.length > 0);
  return groups.length ? groups : [{ status: null as UserAnimeStatus | null, items }];
}

function groupLampaByStatus(items: Array<Record<string, unknown>>, media: MyListsMediaFilter) {
  if (media === 'all') {
    return [{ status: null as UserAnimeStatus | null, items }];
  }
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
