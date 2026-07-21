import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { fetchGenres, searchCatalog } from '@/api/catalog';
import { PosterRail, type RailItem } from '@/components/catalog/PosterRail';
import { OnScreenKeyboard } from '@/components/auth/OnScreenKeyboard';
import { SearchFilters } from '@/components/search/SearchFilters';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing, tvFocus } from '@/constants/aniverse';
import { lampaDetailPath } from '@/lib/lampaDetail';
import { animePoster } from '@/lib/poster';
import { isTvUi } from '@/lib/isTvUi';
import {
  SEARCH_POPULAR_QUERIES,
  lampaKindForMediaFilter,
  searchTypeForMediaFilter,
  uniqueById,
  usesAnimeFilters,
  type SearchMediaFilter,
} from '@/lib/searchConfig';
import {
  addSearchHistory,
  clearSearchHistory,
  getSearchHistory,
} from '@/lib/searchHistory';

type SearchLampaItem = RailItem & { kind?: string };

export default function SearchScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const [query, setQuery] = useState('');
  const queryRef = useRef(query);
  queryRef.current = query;
  const [media, setMedia] = useState<SearchMediaFilter>('all');
  const [genre, setGenre] = useState('');
  const [year, setYear] = useState('');
  const [animeItems, setAnimeItems] = useState<RailItem[]>([]);
  const [lampaItems, setLampaItems] = useState<SearchLampaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const { data: genres = [] } = useQuery({
    queryKey: ['search-genres'],
    queryFn: fetchGenres,
    staleTime: 60 * 60 * 1000,
  });

  useEffect(() => {
    void getSearchHistory().then(setHistory);
  }, []);

  /** Only when returning from results — never on filter focus (causes bounce). */
  const revealHeader = useCallback(() => {
    if (!isTvUi() || scrollYRef.current < 48) return;
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    if (isTvUi()) setShowKeyboard(false);
    setLoading(true);
    setError(null);
    try {
      const animeFilters = usesAnimeFilters(media);
      const result = await searchCatalog({
        q: trimmed,
        type: searchTypeForMediaFilter(media),
        limit: 30,
        genre: animeFilters && genre ? genre : undefined,
        year: animeFilters && year ? year : undefined,
        lampaKind: lampaKindForMediaFilter(media),
      });
      const lampaKind = lampaKindForMediaFilter(media);
      setAnimeItems(
        uniqueById(
          (result.anime ?? []).map((item) => ({
            id: item.id,
            title: item.title ?? 'Без названия',
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
              title: item.title ?? item.name ?? 'Без названия',
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
      const nextHistory = await addSearchHistory(trimmed);
      setHistory(nextHistory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка поиска');
    } finally {
      setLoading(false);
    }
  }, [media, genre, year]);

  const clearHistory = useCallback(() => {
    void clearSearchHistory().then(() => setHistory([]));
  }, []);

  // Stable identity so memoized OnScreenKeyboard does not rebuild mid-press when
  // results/query re-render (Android TV can otherwise double-fire onPress).
  const handleKey = useCallback(
    (key: string) => {
      if (key === 'BACK') setQuery((v) => v.slice(0, -1));
      else if (key === 'SPACE') setQuery((v) => `${v} `);
      else if (key === 'SUBMIT') void runSearch(queryRef.current);
      else setQuery((v) => v + key);
    },
    [runSearch],
  );

  const showAnime = media === 'all' || media === 'anime';
  const showLampa = media === 'all' || media === 'movie' || media === 'tv';
  const lampaTitle =
    media === 'tv' ? 'Сериалы' : media === 'movie' ? 'Фильмы' : 'Фильмы и сериалы';

  return (
    <ScrollView
      ref={scrollRef}
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      onScroll={(event) => {
        scrollYRef.current = event.nativeEvent.contentOffset.y;
      }}
      scrollEventThrottle={16}
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
            style={styles.searchButton}
            focusedStyle={styles.searchButtonFocused}
          >
            <Text style={styles.searchButtonLabel}>Найти</Text>
          </TvFocusable>
        </View>

        {isTvUi() && showKeyboard ? <OnScreenKeyboard onKey={handleKey} /> : null}
      </View>

      <SearchFilters
        media={media}
        onMediaChange={setMedia}
        genre={genre}
        onGenreChange={setGenre}
        year={year}
        onYearChange={setYear}
        genres={genres}
      />

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
            {history.map((item) => (
              <FilterChip
                key={item}
                label={item}
                active={false}
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
          {SEARCH_POPULAR_QUERIES.map((item) => (
            <FilterChip
              key={item}
              label={item}
              active={false}
              onPress={() => {
                setQuery(item);
                void runSearch(item);
              }}
            />
          ))}
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {showAnime && animeItems.length > 0 && (
        <PosterRail
          title="Аниме"
          items={animeItems}
          loading={loading}
          onItemPress={(item) => router.push(`/anime/${item.id}`)}
          onSeeAll={
            query.trim().length >= 2
              ? () =>
                  router.push({
                    pathname: '/search/all',
                    params: {
                      q: query.trim(),
                      bucket: 'anime',
                      ...(genre ? { genre } : {}),
                      ...(year ? { year } : {}),
                    },
                  })
              : undefined
          }
        />
      )}

      {showLampa && lampaItems.length > 0 && (
        <PosterRail
          title={lampaTitle}
          items={lampaItems}
          loading={loading}
          onItemPress={(item) => {
            const kind = (item as SearchLampaItem).kind ?? 'movie';
            router.push(lampaDetailPath(kind, { id: item.id }) as never);
          }}
          onSeeAll={
            query.trim().length >= 2
              ? () =>
                  router.push({
                    pathname: '/search/all',
                    params: {
                      q: query.trim(),
                      bucket: 'lampa',
                      kind: media === 'tv' ? 'tv' : media === 'movie' ? 'movie' : 'movie',
                    },
                  })
              : undefined
          }
        />
      )}

      {!loading && query.trim().length >= 2 && animeItems.length === 0 && lampaItems.length === 0 ? (
        <Text style={styles.empty}>Ничего не найдено</Text>
      ) : null}
    </ScrollView>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={[styles.chip, (active || focused) && styles.chipActive, focused && styles.chipFocused]}
    >
      <Text style={styles.chipLabel}>{label}</Text>
    </Pressable>
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
});
