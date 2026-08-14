import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ActivityIndicator,
  findNodeHandle,
  Keyboard,
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
import { SearchFiltersPanel } from '@/components/search/SearchFiltersPanel';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, layout, radii, spacing, tvFocus } from '@/constants/aniverse';
import { useSavedLibrary } from '@/hooks/useSavedLibrary';
import { getLampaKind } from '@/lib/myLists';
import { lampaDetailPath, lampaTitle } from '@/lib/lampaDetail';
import { animePoster, animeTitle, lampaPosterPath } from '@/lib/poster';
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
import {
  clearSearchSession,
  getSearchSession,
  patchSearchSession,
  saveSearchSession,
} from '@/lib/searchSession';
import { launchTvVoiceSearch } from '@/lib/tvVoiceSearch';
import { useMobileChromeScrollProps } from '@/providers/MobileChromeScroll';

type SearchLampaItem = RailItem & { kind?: string };

export default function SearchScreen() {
  const router = useRouter();
  const initialSession = getSearchSession();
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(initialSession?.scrollY ?? 0);
  const [query, setQuery] = useState(() => initialSession?.query ?? '');
  const queryRef = useRef(query);
  queryRef.current = query;
  const [media, setMedia] = useState<SearchMediaFilter>(() => initialSession?.media ?? 'all');
  const [filters, setFilters] = useState<SearchFilterState>(
    () => initialSession?.filters ?? EMPTY_SEARCH_FILTERS,
  );
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const mediaRef = useRef(media);
  mediaRef.current = media;
  const [animeItems, setAnimeItems] = useState<RailItem[]>(() => initialSession?.animeItems ?? []);
  const [lampaItems, setLampaItems] = useState<SearchLampaItem[]>(
    () => initialSession?.lampaItems ?? [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => initialSession?.error ?? null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [hasSearched, setHasSearched] = useState(() => initialSession?.hasSearched ?? false);
  const [inputFocused, setInputFocused] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const voiceListeningRef = useRef(false);
  /** Pin Down from the search row — otherwise Android may land on the hidden sidebar anchor. */
  const [historyFirstTag, setHistoryFirstTag] = useState<number | undefined>();
  const [popularFirstTag, setPopularFirstTag] = useState<number | undefined>();

  const trackScrollY = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollYRef.current = event.nativeEvent.contentOffset.y;
  }, []);
  const chromeScrollProps = useMobileChromeScrollProps(trackScrollY, styles.content);

  const searchNextFocusDown = history.length > 0 ? historyFirstTag : popularFirstTag;

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

  const { savedAnime, savedLampa } = useSavedLibrary();

  const localLibraryItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [] as RailItem[];
    const animeHits = savedAnime
      .filter((item) => animeTitle(item).toLowerCase().includes(q))
      .slice(0, 12)
      .map((item) => ({
        id: item.animeId ?? item.id ?? 0,
        title: animeTitle(item),
        poster: animePoster(item),
        href: `/anime/${item.animeId ?? item.id}`,
      }));
    const lampaHits = (savedLampa as Array<Record<string, unknown>>)
      .filter((row) => {
        const nested = (row.lampa ?? row) as Record<string, unknown>;
        const title = lampaTitle(nested).toLowerCase();
        return title.includes(q);
      })
      .slice(0, 12)
      .map((row) => {
        const nested = (row.lampa ?? row) as Record<string, unknown>;
        const kind = getLampaKind(row);
        const path = lampaDetailPath(kind, nested);
        return {
          id: String(nested.id ?? nested.tmdbId ?? nested.objectId ?? path),
          title: lampaTitle(nested),
          poster: lampaPosterPath(nested),
          href: path,
          kind,
        };
      });
    return [...animeHits, ...lampaHits];
  }, [query, savedAnime, savedLampa]);

  useEffect(() => {
    void getSearchHistory().then(setHistory);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const saved = getSearchSession();
      const y = saved?.scrollY ?? 0;
      if (y > 0) {
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ y, animated: false });
          scrollYRef.current = y;
        });
      }
      return () => {
        patchSearchSession({ scrollY: scrollYRef.current });
      };
    }, []),
  );

  useEffect(() => {
    saveSearchSession({
      query,
      media,
      filters,
      animeItems,
      lampaItems,
      hasSearched,
      error,
      scrollY: scrollYRef.current,
    });
  }, [query, media, filters, animeItems, lampaItems, hasSearched, error]);

  useEffect(() => {
    if (!query.trim()) {
      setHasSearched(false);
      setAnimeItems([]);
      setLampaItems([]);
      setError(null);
      clearSearchSession();
    }
  }, [query]);

  const revealHeader = useCallback(() => {
    if (!isTvUi() || scrollYRef.current < 48) return;
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const runSearch = useCallback(async (q: string) => {
    const currentMedia = mediaRef.current;
    const currentFilters = filtersRef.current;
    if (!canRunCatalogSearch(q, currentMedia, currentFilters)) return;
    if (isTvUi()) Keyboard.dismiss();
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

  const onVoiceSearch = useCallback(async () => {
    if (voiceListeningRef.current) return;
    voiceListeningRef.current = true;
    revealHeader();
    Keyboard.dismiss();
    setVoiceListening(true);
    try {
      const result = await launchTvVoiceSearch();
      if (result.status === 'cancelled') return;
      if (result.status === 'unavailable') {
        setError(result.message);
        return;
      }
      setQuery(result.query);
      await runSearch(result.query);
    } finally {
      voiceListeningRef.current = false;
      setVoiceListening(false);
    }
  }, [revealHeader, runSearch]);

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
  const showLampaMovies = media === 'all' || media === 'movie';
  const showLampaTv = media === 'all' || media === 'tv';

  const lampaMovieItems = useMemo(
    () => lampaItems.filter((item) => (item.kind ?? 'movie') !== 'tv'),
    [lampaItems],
  );
  const lampaTvItems = useMemo(
    () => lampaItems.filter((item) => item.kind === 'tv'),
    [lampaItems],
  );

  const buildSeeAllLampaParams = useCallback(
    (kind: 'movie' | 'tv') => {
      const params: Record<string, string> = {
        q: query.trim(),
        bucket: 'lampa',
        kind,
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
    },
    [query, media, filters],
  );

  const onLampaItemPress = useCallback(
    (item: SearchLampaItem) => {
      const kind = item.kind ?? 'movie';
      router.push(lampaDetailPath(kind, { id: item.id }) as never);
    },
    [router],
  );

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
        <View style={[styles.topBar, !isTvUi() && styles.mobileInset]}>
          <Text style={styles.title}>Поиск</Text>

          {isTvUi() ? (
            <View style={styles.searchRow}>
              <TextInput
                style={[
                  styles.inputFocus,
                  styles.inputValue,
                  inputFocused && styles.inputFocused,
                ]}
                value={query}
                onChangeText={setQuery}
                placeholder="Название аниме, фильма или сериала"
                placeholderTextColor={colors.textSecondary}
                showSoftInputOnFocus
                returnKeyType="search"
                autoCorrect={false}
                autoCapitalize="none"
                underlineColorAndroid="transparent"
                textAlignVertical="center"
                {...(searchNextFocusDown != null
                  ? ({ nextFocusDown: searchNextFocusDown } as Record<string, number>)
                  : null)}
                onSubmitEditing={() => void runSearch(query)}
                onFocus={() => {
                  revealHeader();
                  setInputFocused(true);
                }}
                onBlur={() => setInputFocused(false)}
              />
              <TvFocusable
                onPress={() => void onVoiceSearch()}
                onFocus={revealHeader}
                nextFocusDown={searchNextFocusDown}
                disabled={voiceListening}
                accessibilityLabel="Голосовой поиск"
                style={styles.micBtn}
                focusedStyle={styles.micBtnFocused}
              >
                <Ionicons
                  name={voiceListening ? 'mic' : 'mic-outline'}
                  size={22}
                  color={colors.text}
                />
              </TvFocusable>
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
                  Keyboard.dismiss();
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
          ) : (
            <View style={styles.mobileSearch}>
              <View style={styles.mobileSearchField}>
                <Ionicons name="search-outline" size={22} color={colors.textSecondary} />
                <TextInput
                  style={styles.mobileInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Аниме, фильмы, сериалы…"
                  placeholderTextColor={colors.textMuted}
                  onSubmitEditing={() => void runSearch(query)}
                  returnKeyType="search"
                  autoCorrect={false}
                  autoCapitalize="none"
                  clearButtonMode="while-editing"
                />
              </View>
              <View style={styles.mobileActionsRow}>
                <TvFocusable
                  onPress={() => void runSearch(query)}
                  style={styles.mobileSearchButton}
                  focusedStyle={styles.searchButtonFocused}
                >
                  <Text style={styles.mobileSearchButtonLabel}>Найти</Text>
                </TvFocusable>
                <TvFocusable
                  onPress={() => setFiltersOpen(true)}
                  style={[styles.mobileFiltersBtn, filtersActive && styles.filtersBtnActive]}
                  focusedStyle={styles.filtersBtnFocused}
                >
                  <Ionicons
                    name="options-outline"
                    size={18}
                    color={filtersActive ? colors.brand : colors.textSecondary}
                  />
                  <Text style={styles.mobileFiltersBtnLabel} numberOfLines={1}>
                    {filtersActive && filtersSummary ? filtersSummary : 'Фильтры'}
                  </Text>
                </TvFocusable>
              </View>
            </View>
          )}
        </View>

        {history.length > 0 ? (
          <View style={[styles.popular, !isTvUi() && styles.mobileInset]}>
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

        {!hasSearched ? (
          <View style={[styles.popular, !isTvUi() && styles.mobileInset]}>
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
        ) : null}

        {error ? <Text style={[styles.error, !isTvUi() && styles.mobileInset]}>{error}</Text> : null}
        {loading ? (
          <ActivityIndicator
            color={colors.brand}
            style={[styles.loader, !isTvUi() && styles.mobileInset]}
          />
        ) : null}

        {localLibraryItems.length > 0 ? (
          <PosterRail
            title="В вашей библиотеке"
            items={localLibraryItems}
            itemWidth={isTvUi() ? undefined : layout.posterWidthDetail}
            onItemPress={(item) => {
              const href = (item as RailItem & { href?: string }).href;
              if (href) router.push(href as '/');
            }}
          />
        ) : null}

        {showAnime && animeItems.length > 0 ? (
          <PosterRail
            title="Аниме"
            items={animeItems}
            loading={loading}
            itemWidth={isTvUi() ? undefined : layout.posterWidthDetail}
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

        {showLampaMovies && lampaMovieItems.length > 0 ? (
          <PosterRail
            title="Фильмы"
            items={lampaMovieItems}
            loading={loading}
            itemWidth={isTvUi() ? undefined : layout.posterWidthDetail}
            onItemPress={onLampaItemPress}
            onSeeAll={
              canRunCatalogSearch(query, media, filters)
                ? () =>
                    router.push({
                      pathname: '/search/all',
                      params: buildSeeAllLampaParams('movie'),
                    })
                : undefined
            }
          />
        ) : null}

        {showLampaTv && lampaTvItems.length > 0 ? (
          <PosterRail
            title="Сериалы"
            items={lampaTvItems}
            loading={loading}
            itemWidth={isTvUi() ? undefined : layout.posterWidthDetail}
            onItemPress={onLampaItemPress}
            onSeeAll={
              canRunCatalogSearch(query, media, filters)
                ? () =>
                    router.push({
                      pathname: '/search/all',
                      params: buildSeeAllLampaParams('tv'),
                    })
                : undefined
            }
          />
        ) : null}

        {showEmpty ? (
          <Text style={[styles.empty, !isTvUi() && styles.mobileInset]}>Ничего не найдено</Text>
        ) : null}
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
  content: isTvUi()
    ? {
        padding: spacing.lg,
        gap: spacing.md,
        paddingBottom: spacing.xxl * 2,
      }
    : {
        paddingTop: spacing.md,
        gap: spacing.lg,
        paddingBottom: spacing.xxl,
      },
  mobileInset: {
    paddingHorizontal: layout.gutterMobile,
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
    maxWidth: 280,
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
  mobileSearch: {
    gap: spacing.md,
  },
  mobileSearchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    backgroundColor: colors.bgCard,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  mobileInput: {
    flex: 1,
    minHeight: 52,
    color: colors.text,
    fontSize: 17,
    lineHeight: 22,
    paddingVertical: spacing.sm,
  },
  mobileActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'stretch',
  },
  mobileSearchButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandAccent,
    borderRadius: 12,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  mobileSearchButtonLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  mobileFiltersBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  mobileFiltersBtnLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
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
    minHeight: 48,
  },
  micBtn: {
    borderRadius: 12,
    borderWidth: tvFocus.borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: tvFocus.fill,
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
