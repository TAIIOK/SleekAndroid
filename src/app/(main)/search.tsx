import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  findNodeHandle,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { fetchGenres, fetchLampaGenres, lampaItemTitle, searchCatalog } from '@/api/catalog';
import { PosterRail, type RailItem } from '@/components/catalog/PosterRail';
import { OnScreenKeyboard } from '@/components/auth/OnScreenKeyboard';
import { SearchFiltersPanel } from '@/components/search/SearchFiltersPanel';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing, tvFocus } from '@/constants/aniverse';
import { lampaDetailPath } from '@/lib/lampaDetail';
import { animePoster, animeTitle } from '@/lib/poster';
import { isTvUi } from '@/lib/isTvUi';
import {
  EMPTY_SEARCH_FILTERS,
  SEARCH_POPULAR_QUERIES,
  canRunCatalogSearch,
  catalogSearchFilterParams,
  hasActiveSearchFilters,
  lampaKindForMediaFilter,
  pruneFiltersForMedia,
  searchTypeForMediaFilter,
  summarizeSearchFilters,
  uniqueById,
  type SearchFilterState,
  type SearchMediaFilter,
} from '@/lib/searchConfig';
import {
  addSearchHistory,
  clearSearchHistory,
  getSearchHistory,
} from '@/lib/searchHistory';
import { useMobileChromeScrollProps } from '@/providers/MobileChromeScroll';

type SearchLampaItem = RailItem & { kind?: string };

export default function SearchScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const [query, setQuery] = useState('');
  const queryRef = useRef(query);
  queryRef.current = query;
  const [media, setMedia] = useState<SearchMediaFilter>('all');
  const [filters, setFilters] = useState<SearchFilterState>(EMPTY_SEARCH_FILTERS);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const mediaRef = useRef(media);
  mediaRef.current = media;
  const [animeItems, setAnimeItems] = useState<RailItem[]>([]);
  const [lampaItems, setLampaItems] = useState<SearchLampaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  /** Pin Down from the search row — otherwise Android may land on the hidden sidebar anchor. */
  const [keyboardFirstTag, setKeyboardFirstTag] = useState<number | undefined>();
  const [historyFirstTag, setHistoryFirstTag] = useState<number | undefined>();
  const [popularFirstTag, setPopularFirstTag] = useState<number | undefined>();

  const trackScrollY = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = event.nativeEvent.contentOffset.y;
  }, []);
  const chromeScrollProps = useMobileChromeScrollProps(trackScrollY, styles.content);

  const searchNextFocusDown = showKeyboard
    ? keyboardFirstTag
    : history.length > 0
      ? historyFirstTag
      : popularFirstTag;

  const bindNativeTag = useCallback(
    (setter: (tag: number | undefined) => void) => (node: View | null) => {
      setter(node ? (findNodeHandle(node) ?? undefined) : undefined);
    },
    [],
  );

  const { data: genres = [] } = useQuery({
    queryKey: ['search-genres'],
    queryFn: fetchGenres,
    staleTime: 60 * 60 * 1000,
  });

  const { data: lampaGenres = [] } = useQuery({
    queryKey: ['search-lampa-genres'],
    queryFn: fetchLampaGenres,
    staleTime: 60 * 60 * 1000,
  });

  useEffect(() => {
    void getSearchHistory().then(setHistory);
  }, []);

  const revealHeader = useCallback(() => {
    if (!isTvUi() || scrollYRef.current < 48) return;
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const runSearch = useCallback(async (q: string) => {
    const currentMedia = mediaRef.current;
    const currentFilters = filtersRef.current;
    if (!canRunCatalogSearch(q, currentMedia, currentFilters)) return;
    if (isTvUi()) setShowKeyboard(false);
    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const result = await searchCatalog({
        q: q.trim(),
        type: searchTypeForMediaFilter(currentMedia),
        limit: 30,
        ...catalogSearchFilterParams(currentMedia, currentFilters),
      });
      const lampaKind = lampaKindForMediaFilter(currentMedia);
      setAnimeItems(
        uniqueById(
          (result.anime ?? []).map((item) => ({
            id: item.id,
            animeId: typeof item.id === 'number' && item.id > 0 ? item.id : undefined,
            title: animeTitle(item),
            poster: animePoster(item),
            score: item.score,
          })),
        ),
      );
      setLampaItems(
        uniqueById(
          (result.lampa ?? [])
            .filter((item) => {
              if (!lampaKind) return true;
              const kind = String(
                (item as unknown as Record<string, unknown>).kind ??
                  (item as unknown as Record<string, unknown>).mediaKind ??
                  'movie',
              );
              return kind === lampaKind;
            })
            .map((item) => ({
              id: item.id,
              title: lampaItemTitle(item),
              poster: item.poster ?? item.poster_path,
              score: item.vote_average,
              kind: String(
                (item as unknown as Record<string, unknown>).kind ??
                  (item as unknown as Record<string, unknown>).mediaKind ??
                  lampaKind ??
                  'movie',
              ),
            })),
        ),
      );
      if (q.trim().length >= 2) {
        const nextHistory = await addSearchHistory(q.trim());
        setHistory(nextHistory);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка поиска');
    } finally {
      setLoading(false);
    }
  }, []);

  const clearHistory = useCallback(() => {
    void clearSearchHistory().then(() => setHistory([]));
  }, []);

  const handleKey = useCallback(
    (key: string) => {
      if (key === 'BACK') setQuery((v) => v.slice(0, -1));
      else if (key === 'SPACE') setQuery((v) => `${v} `);
      else if (key === 'SUBMIT') void runSearch(queryRef.current);
      else setQuery((v) => v + key);
    },
    [runSearch],
  );

  const onMediaChange = useCallback((next: SearchMediaFilter) => {
    setMedia(next);
    setFilters((prev) => pruneFiltersForMedia(next, prev));
  }, []);

  const onFiltersChange = useCallback((patch: Partial<SearchFilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
  }, []);

  const filtersActive = media !== 'all' || hasActiveSearchFilters(media, filters);
  const filtersSummary = useMemo(
    () => summarizeSearchFilters(media, filters, genres, lampaGenres),
    [media, filters, genres, lampaGenres],
  );

  const closeFilters = useCallback(() => {
    setFiltersOpen(false);
    if (canRunCatalogSearch(queryRef.current, mediaRef.current, filtersRef.current)) {
      void runSearch(queryRef.current);
    }
  }, [runSearch]);

  const showAnime = media === 'all' || media === 'anime';
  const showLampa = media === 'all' || media === 'movie' || media === 'tv';
  const lampaSectionTitle =
    media === 'tv' ? 'Сериалы' : media === 'movie' ? 'Фильмы' : 'Фильмы и сериалы';

  const seeAllAnimeParams = useMemo(() => {
    const params: Record<string, string> = {
      q: query.trim(),
      bucket: 'anime',
    };
    const f = catalogSearchFilterParams(media, filters);
    if (f.genre) params.genre = f.genre;
    if (f.year) params.year = f.year;
    if (f.status) params.status = f.status;
    if (f.animeType) params.animeType = f.animeType;
    if (f.season) params.season = f.season;
    if (f.ageRating) params.ageRating = f.ageRating;
    if (f.ratingMin) params.ratingMin = f.ratingMin;
    if (f.sortBy) params.sortBy = f.sortBy;
    if (f.order) params.order = f.order;
    return params;
  }, [query, media, filters]);

  const seeAllLampaParams = useMemo(() => {
    const params: Record<string, string> = {
      q: query.trim(),
      bucket: 'lampa',
      kind: media === 'tv' ? 'tv' : 'movie',
    };
    const f = catalogSearchFilterParams(media, filters);
    if (f.lampaGenre) params.lampaGenre = f.lampaGenre;
    if (f.year) params.year = f.year;
    if (f.lampaStatus) params.lampaStatus = f.lampaStatus;
    if (f.lampaMinRating) params.lampaMinRating = f.lampaMinRating;
    if (f.lampaLang) params.lampaLang = f.lampaLang;
    if (f.lampaCountry) params.lampaCountry = f.lampaCountry;
    if (f.sortBy) params.sortBy = f.sortBy;
    if (f.order) params.order = f.order;
    return params;
  }, [query, media, filters]);

  const showEmpty =
    !loading &&
    hasSearched &&
    canRunCatalogSearch(query, media, filters) &&
    animeItems.length === 0 &&
    lampaItems.length === 0;

  return (
    <>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        keyboardShouldPersistTaps="handled"
        {...chromeScrollProps}
      >
        <View style={styles.topBar}>
          <Text style={styles.title}>Поиск</Text>

          <View style={styles.searchRow}>
            {isTvUi() ? (
              <TvFocusable
                onPress={() => {
                  revealHeader();
                  setShowKeyboard(true);
                }}
                onFocus={revealHeader}
                nextFocusDown={searchNextFocusDown}
                style={styles.inputFocus}
                focusedStyle={styles.inputFocused}
              >
                <Text style={query ? styles.inputValue : styles.inputPlaceholder} numberOfLines={1}>
                  {query || 'Название аниме, фильма или сериала'}
                </Text>
              </TvFocusable>
            ) : (
              <TextInput
                style={styles.input}
                value={query}
                onChangeText={setQuery}
                placeholder="Название аниме, фильма или сериала"
                placeholderTextColor={colors.textSecondary}
                onSubmitEditing={() => void runSearch(query)}
              />
            )}
            <TvFocusable
              onPress={() => void runSearch(query)}
              onFocus={revealHeader}
              nextFocusDown={searchNextFocusDown}
              style={styles.searchButton}
              focusedStyle={styles.searchButtonFocused}
            >
              <Text style={styles.searchButtonLabel}>Найти</Text>
            </TvFocusable>
            <TvFocusable
              onPress={() => {
                revealHeader();
                setShowKeyboard(false);
                setFiltersOpen(true);
              }}
              onFocus={revealHeader}
              nextFocusDown={searchNextFocusDown}
              style={[styles.filtersBtn, filtersActive && styles.filtersBtnActive]}
              focusedStyle={styles.filtersBtnFocused}
            >
              <Text style={styles.filtersBtnLabel} numberOfLines={1}>
                {filtersActive && filtersSummary ? `Фильтры · ${filtersSummary}` : 'Фильтры'}
              </Text>
            </TvFocusable>
          </View>

          {isTvUi() && showKeyboard ? (
            <OnScreenKeyboard onKey={handleKey} onFirstKeyNativeTag={setKeyboardFirstTag} />
          ) : null}
        </View>

        {history.length > 0 ? (
          <View style={styles.popular}>
            <View style={styles.historyHeader}>
              <Text style={styles.popularTitle}>Недавние</Text>
              <TvFocusable
                onPress={clearHistory}
                style={styles.clearHistory}
                focusedStyle={styles.clearHistoryFocused}
              >
                <Text style={styles.clearHistoryLabel}>Очистить</Text>
              </TvFocusable>
            </View>
            <View style={styles.popularRow}>
              {history.map((item, index) => (
                <FilterChip
                  key={item}
                  label={item}
                  active={false}
                  hostRef={index === 0 ? bindNativeTag(setHistoryFirstTag) : undefined}
                  onPress={() => {
                    setQuery(item);
                    void runSearch(item);
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.popular}>
          <Text style={styles.popularTitle}>Популярные запросы</Text>
          <View style={styles.popularRow}>
            {SEARCH_POPULAR_QUERIES.map((item, index) => (
              <FilterChip
                key={item}
                label={item}
                active={false}
                hostRef={index === 0 ? bindNativeTag(setPopularFirstTag) : undefined}
                onPress={() => {
                  setQuery(item);
                  void runSearch(item);
                }}
              />
            ))}
          </View>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {loading ? <ActivityIndicator color={colors.brand} style={styles.loader} /> : null}

        {showAnime && animeItems.length > 0 ? (
          <PosterRail
            title="Аниме"
            items={animeItems}
            loading={loading}
            onItemPress={(item) => router.push(`/anime/${item.id}`)}
            onSeeAll={
              canRunCatalogSearch(query, media, filters)
                ? () =>
                    router.push({
                      pathname: '/search/all',
                      params: seeAllAnimeParams,
                    })
                : undefined
            }
          />
        ) : null}

        {showLampa && lampaItems.length > 0 ? (
          <PosterRail
            title={lampaSectionTitle}
            items={lampaItems}
            loading={loading}
            onItemPress={(item) => {
              const kind = (item as SearchLampaItem).kind ?? 'movie';
              router.push(lampaDetailPath(kind, { id: item.id }) as never);
            }}
            onSeeAll={
              canRunCatalogSearch(query, media, filters)
                ? () =>
                    router.push({
                      pathname: '/search/all',
                      params: seeAllLampaParams,
                    })
                : undefined
            }
          />
        ) : null}

        {showEmpty ? <Text style={styles.empty}>Ничего не найдено</Text> : null}
      </ScrollView>

      <SearchFiltersPanel
        visible={filtersOpen}
        onClose={closeFilters}
        media={media}
        onMediaChange={onMediaChange}
        filters={filters}
        onFiltersChange={onFiltersChange}
        genres={genres}
        lampaGenres={lampaGenres}
      />
    </>
  );
}

function FilterChip({
  label,
  active,
  onPress,
  hostRef,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  hostRef?: (node: View | null) => void;
}) {
  return (
    <TvFocusable
      onPress={onPress}
      hostRef={hostRef}
      style={[styles.chip, active && styles.chipActive]}
      focusedStyle={styles.chipFocused}
    >
      <Text style={styles.chipLabel}>{label}</Text>
    </TvFocusable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: isTvUi() ? spacing.lg : spacing.xxl,
    gap: isTvUi() ? spacing.md : spacing.lg,
    paddingBottom: isTvUi() ? spacing.xxl * 2 : spacing.xxl,
  },
  topBar: {
    gap: isTvUi() ? spacing.md : spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: isTvUi() ? 26 : 24,
    fontWeight: '700',
  },
  filtersBtn: {
    borderRadius: 12,
    borderWidth: tvFocus.borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: isTvUi() ? 280 : 200,
  },
  filtersBtnActive: {
    borderColor: colors.brand,
    backgroundColor: 'rgba(195,192,255,0.12)',
  },
  filtersBtnFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: tvFocus.fill,
  },
  filtersBtnLabel: {
    color: colors.text,
    fontSize: isTvUi() ? 15 : 14,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputFocus: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: tvFocus.borderWidth,
    borderColor: colors.border,
  },
  inputFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: tvFocus.fill,
  },
  inputValue: {
    color: colors.text,
    fontSize: 16,
  },
  inputPlaceholder: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  searchButton: {
    backgroundColor: colors.brandAccent,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchButtonFocused: {
    borderColor: colors.text,
    backgroundColor: colors.brand,
    transform: [{ scale: 1.06 }],
  },
  searchButtonLabel: {
    color: colors.text,
    fontWeight: '700',
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.bgCard,
    borderWidth: tvFocus.borderWidth,
    borderColor: colors.border,
  },
  chipActive: {
    borderColor: colors.brand,
    backgroundColor: 'rgba(195,192,255,0.12)',
  },
  chipFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: tvFocus.fill,
  },
  chipLabel: {
    color: colors.text,
    fontSize: isTvUi() ? 15 : 14,
    fontWeight: '600',
  },
  popular: { gap: spacing.sm },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  popularTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  clearHistory: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  clearHistoryFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: tvFocus.fill,
  },
  clearHistoryLabel: {
    color: colors.brand,
    fontSize: isTvUi() ? 14 : 13,
    fontWeight: '600',
  },
  popularRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { color: colors.danger },
  empty: { color: colors.textSecondary, fontSize: 16 },
  loader: { marginVertical: spacing.lg },
});
