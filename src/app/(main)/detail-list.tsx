import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, usePathname, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import {
  fetchAnimeCharacters,
  fetchAnimeRelated,
  fetchAnimeSimilar,
  mapLampaToRailItem,
  type LampaItem,
} from '@/api/catalog';
import {
  fetchLampaCast,
  fetchLampaRecommendations,
  fetchLampaRelated,
  fetchLampaSimilar,
} from '@/api/lampaExtras';
import { CatalogPosterCard } from '@/components/catalog/CatalogPosterCard';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, layout, radii, spacing, tvFocus } from '@/constants/aniverse';
import { usePosterGridLayout } from '@/hooks/usePosterGridLayout';
import {
  animeListCardSubtitle,
  excludeRelatedFromSimilar,
  extractRelatedItems,
  sortAnimeItemsByYear,
  type AnimeRelatedItem,
} from '@/lib/animeDetail';
import { DETAIL_CAST_FETCH_LIMIT } from '@/lib/catalogRailPage';
import { resolveAnimePosterUrl, resolveLampaPosterUrl } from '@/lib/config';
import { setDetailReturnPath } from '@/lib/detailNavigation';
import { isTvUi } from '@/lib/isTvUi';
import { excludeRelatedLampaItems, lampaCardSubtitle, lampaDetailPath } from '@/lib/lampaDetail';
import { mapAnimeToRailItem } from '@/lib/poster';
import { useMobileChromeScroll, useMobileChromeScrollProps } from '@/providers/MobileChromeScroll';

type DetailListSection = 'cast' | 'characters' | 'related' | 'recommendations' | 'similar';

interface GridCard {
  key: string;
  title: string;
  poster?: string;
  subtitle?: string;
  score?: number | null;
  onPress?: () => void;
}

function pickParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

function positiveId(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function isSection(value: string): value is DetailListSection {
  return (
    value === 'cast' ||
    value === 'characters' ||
    value === 'related' ||
    value === 'recommendations' ||
    value === 'similar'
  );
}

const SECTION_TITLES: Record<DetailListSection, string> = {
  cast: 'Актёры',
  characters: 'Персонажи',
  related: 'Связанные',
  recommendations: 'Рекомендации',
  similar: 'Похожее',
};

export default function DetailListScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const media = pickParam(params.media) === 'anime' ? 'anime' : pickParam(params.media) === 'lampa' ? 'lampa' : '';
  const sectionParam = pickParam(params.section);
  const section = isSection(sectionParam) ? sectionParam : null;
  const kind = pickParam(params.kind) === 'tv' ? 'tv' : 'movie';
  const id = positiveId(pickParam(params.id));
  const collectionId = positiveId(pickParam(params.collectionId));
  const title = pickParam(params.title).trim() || (section ? SECTION_TITLES[section] : 'Список');
  const ready = media !== '' && section != null && id != null;

  const horizontalPadding = isTvUi() ? spacing.lg : layout.gutterMobile;
  const { columns, gap, cardWidth } = usePosterGridLayout(horizontalPadding);
  const chrome = useMobileChromeScroll();
  const chromeScrollProps = useMobileChromeScrollProps(
    undefined,
    [styles.grid, { paddingHorizontal: horizontalPadding, gap }],
    { padTop: false },
  );
  const headerPadTop =
    !isTvUi() && chrome?.contentInsetsEnabled ? chrome.topContentInset : spacing.md;

  const similarQuery = useQuery({
    queryKey: ['lampa-similar', kind, id ?? 0],
    queryFn: () => fetchLampaSimilar(kind, id!),
    enabled: ready && media === 'lampa' && section === 'similar',
  });
  const recommendationsQuery = useQuery({
    queryKey: ['lampa-recommendations', kind, id ?? 0],
    queryFn: () => fetchLampaRecommendations(kind, id!),
    enabled: ready && media === 'lampa' && section === 'recommendations',
  });
  const franchiseQuery = useQuery({
    queryKey: ['lampa-related', kind, id ?? 0],
    queryFn: () => fetchLampaRelated(kind, id!, collectionId),
    enabled:
      ready &&
      media === 'lampa' &&
      (section === 'related' || (section === 'similar' && collectionId != null)),
  });
  const castQuery = useQuery({
    queryKey: ['lampa-cast', kind, id ?? 0, DETAIL_CAST_FETCH_LIMIT],
    queryFn: () => fetchLampaCast(kind, id!, DETAIL_CAST_FETCH_LIMIT),
    enabled: ready && media === 'lampa' && section === 'cast',
  });
  const animeRelatedQuery = useQuery({
    queryKey: ['anime-related', id ?? 0],
    queryFn: () => fetchAnimeRelated(id!),
    enabled:
      ready &&
      media === 'anime' &&
      (section === 'related' || section === 'recommendations' || section === 'similar'),
  });
  const animeSimilarQuery = useQuery({
    queryKey: ['anime-similar', id ?? 0],
    queryFn: () => fetchAnimeSimilar(id!),
    enabled: ready && media === 'anime' && section === 'similar',
  });
  const charactersQuery = useQuery({
    queryKey: ['anime-characters', id ?? 0],
    queryFn: () => fetchAnimeCharacters(id!),
    enabled: ready && media === 'anime' && section === 'characters',
  });

  const cards = useMemo<GridCard[]>(() => {
    if (!ready || section == null || id == null) return [];
    if (media === 'lampa' && section === 'cast') {
      return (castQuery.data ?? []).map((member) => ({
        key: `cast-${member.id}`,
        title: member.name,
        subtitle: member.character,
        poster: member.profilePath
          ? resolveLampaPosterUrl(member.profilePath, 'w342')
          : undefined,
        onPress: () => {
          if (!isTvUi()) setDetailReturnPath(pathname);
          router.push(`/person/${member.id}`);
        },
      }));
    }
    if (media === 'lampa') {
      const source =
        section === 'related'
          ? (franchiseQuery.data ?? [])
          : section === 'recommendations'
            ? (recommendationsQuery.data ?? [])
            : excludeRelatedLampaItems(similarQuery.data ?? [], franchiseQuery.data ?? []);
      return source.map((item) =>
        lampaCard(item, () =>
          router.push(lampaDetailPath(itemKind(item, kind), { id: item.id }) as '/'),
        ),
      );
    }
    if (section === 'characters') {
      return (charactersQuery.data ?? []).map((character, index) => ({
        key: `character-${character.id ?? index}`,
        title: character.name?.trim() || 'Персонаж',
        subtitle: (character.type ?? character.role)?.trim() || undefined,
        poster:
          resolveAnimePosterUrl(character.thumbnail) ??
          resolveAnimePosterUrl(character.image),
      }));
    }
    const relatedItems = sortAnimeItemsByYear(extractRelatedItems(animeRelatedQuery.data ?? [], id, false));
    const source =
      section === 'related'
        ? relatedItems
        : section === 'recommendations'
          ? extractRelatedItems(animeRelatedQuery.data ?? [], id, true)
          : excludeRelatedFromSimilar(animeSimilarQuery.data ?? [], relatedItems);
    return source.map((item) => animeCard(item, () => router.push(`/anime/${item.id}`)));
  }, [
    animeRelatedQuery.data,
    animeSimilarQuery.data,
    castQuery.data,
    charactersQuery.data,
    franchiseQuery.data,
    id,
    kind,
    media,
    pathname,
    ready,
    recommendationsQuery.data,
    router,
    section,
    similarQuery.data,
  ]);

  const loading =
    ready &&
    ((media === 'lampa' && section === 'similar' && (similarQuery.isLoading || (collectionId != null && franchiseQuery.isLoading))) ||
      (media === 'lampa' && section === 'recommendations' && recommendationsQuery.isLoading) ||
      (media === 'lampa' && section === 'related' && franchiseQuery.isLoading) ||
      (media === 'lampa' && section === 'cast' && castQuery.isLoading) ||
      (media === 'anime' && section === 'characters' && charactersQuery.isLoading) ||
      (media === 'anime' && section === 'similar' && (animeSimilarQuery.isLoading || animeRelatedQuery.isLoading)) ||
      (media === 'anime' && (section === 'related' || section === 'recommendations') && animeRelatedQuery.isLoading));

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, { paddingHorizontal: horizontalPadding, paddingTop: headerPadTop }]}>
        <TvFocusable
          onPress={() => router.back()}
          style={styles.backBtn}
          focusedStyle={styles.backBtnFocused}
          hasTVPreferredFocus={isTvUi()}
          railStart
        >
          <Ionicons name="chevron-back" size={isTvUi() ? 20 : 18} color={colors.text} />
          <Text style={styles.back}>Назад</Text>
        </TvFocusable>
        <Text style={styles.title}>{title}</Text>
      </View>

      {!ready ? (
        <Text style={styles.empty}>Список недоступен</Text>
      ) : loading ? (
        <ActivityIndicator color={colors.brand} style={styles.loader} />
      ) : cards.length === 0 ? (
        <Text style={styles.empty}>Нет данных</Text>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(item) => item.key}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? { gap } : undefined}
          {...chromeScrollProps}
          renderItem={({ item, index }) => (
            <CatalogPosterCard
              variant="grid"
              width={cardWidth}
              title={item.title}
              poster={item.poster}
              subtitle={item.subtitle}
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

function itemKind(item: LampaItem, fallback: 'movie' | 'tv'): 'movie' | 'tv' {
  if (item.kind === 'tv') return 'tv';
  if (item.kind === 'movie') return 'movie';
  return fallback;
}

function lampaCard(item: LampaItem, onPress: () => void): GridCard {
  const mapped = mapLampaToRailItem(item);
  return {
    key: `lampa-${item.id}`,
    title: mapped.title,
    poster: mapped.poster,
    subtitle: lampaCardSubtitle(item),
    score: mapped.score,
    onPress,
  };
}

function animeCard(item: AnimeRelatedItem, onPress: () => void): GridCard {
  const mapped = mapAnimeToRailItem(item);
  return {
    key: `anime-${item.id}`,
    title: mapped.title,
    poster: mapped.poster,
    subtitle: animeListCardSubtitle(item),
    score: mapped.score,
    onPress,
  };
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  backBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgCard,
    borderWidth: isTvUi() ? tvFocus.borderWidth : 1,
    borderColor: colors.border,
  },
  backBtnFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: tvFocus.fill,
  },
  back: {
    color: colors.text,
    fontSize: isTvUi() ? 15 : 14,
    fontWeight: '600',
  },
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  loader: {
    marginTop: spacing.xxl,
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 16,
    paddingHorizontal: spacing.lg,
  },
  grid: {
    paddingBottom: spacing.xxl,
  },
});
