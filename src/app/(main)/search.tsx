import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { searchCatalog } from '@/api/catalog';
import { PosterRail, type RailItem } from '@/components/catalog/PosterRail';
import { OnScreenKeyboard } from '@/components/auth/OnScreenKeyboard';
import { colors, spacing } from '@/constants/aniverse';
import { lampaDetailPath } from '@/lib/lampaDetail';
import { animePoster } from '@/lib/poster';
import {
  SEARCH_POPULAR_QUERIES,
  lampaKindForMediaFilter,
  searchTypeForMediaFilter,
  type SearchMediaFilter,
} from '@/lib/searchConfig';

type SearchLampaItem = RailItem & { kind?: string };

const MEDIA_OPTIONS: { id: SearchMediaFilter; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'anime', label: 'Аниме' },
  { id: 'movie', label: 'Фильмы' },
  { id: 'tv', label: 'Сериалы' },
];

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [media, setMedia] = useState<SearchMediaFilter>('all');
  const [animeItems, setAnimeItems] = useState<RailItem[]>([]);
  const [lampaItems, setLampaItems] = useState<SearchLampaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKeyboard, setShowKeyboard] = useState(Platform.isTV);

  const runSearch = async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) return;
    setLoading(true);
    setError(null);
    try {
      const result = await searchCatalog({
        q: trimmed,
        type: searchTypeForMediaFilter(media),
        limit: 30,
      });
      const lampaKind = lampaKindForMediaFilter(media);
      setAnimeItems(
        (result.anime ?? []).map((item) => ({
          id: item.id,
          title: item.title ?? 'Без названия',
          poster: animePoster(item),
          score: item.score,
        })),
      );
      setLampaItems(
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
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка поиска');
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (key: string) => {
    if (key === 'BACK') setQuery((v) => v.slice(0, -1));
    else if (key === 'SPACE') setQuery((v) => `${v} `);
    else if (key === 'SUBMIT') void runSearch(query);
    else setQuery((v) => v + key);
  };

  const showAnime = media === 'all' || media === 'anime';
  const showLampa = media === 'all' || media === 'movie' || media === 'tv';
  const lampaTitle =
    media === 'tv' ? 'Сериалы' : media === 'movie' ? 'Фильмы' : 'Фильмы и сериалы';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Поиск</Text>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Название аниме, фильма или сериала"
          placeholderTextColor={colors.textSecondary}
          onSubmitEditing={() => void runSearch(query)}
        />
        <Pressable style={styles.searchButton} onPress={() => void runSearch(query)}>
          <Text style={styles.searchButtonLabel}>Найти</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {MEDIA_OPTIONS.map((option) => (
          <FilterChip
            key={option.id}
            label={option.label}
            active={media === option.id}
            onPress={() => setMedia(option.id)}
          />
        ))}
      </ScrollView>

      {Platform.isTV && (
        <Pressable onPress={() => setShowKeyboard((v) => !v)} style={styles.toggleKeyboard}>
          <Text style={styles.toggleKeyboardLabel}>
            {showKeyboard ? 'Скрыть клавиатуру' : 'Показать клавиатуру'}
          </Text>
        </Pressable>
      )}
      {Platform.isTV && showKeyboard && <OnScreenKeyboard onKey={handleKey} />}

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
                    params: { q: query.trim(), bucket: 'anime' },
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
      style={[styles.chip, (active || focused) && styles.chipActive]}
    >
      <Text style={styles.chipLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: Platform.isTV ? spacing.lg : spacing.xxl,
    gap: Platform.isTV ? spacing.md : spacing.lg,
  },
  title: {
    color: colors.text,
    fontSize: Platform.isTV ? 26 : 24,
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
  searchButton: {
    backgroundColor: colors.brandAccent,
    borderRadius: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  searchButtonLabel: {
    color: colors.text,
    fontWeight: '700',
  },
  filters: { gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 999,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.sm,
  },
  chipActive: {
    borderColor: colors.brand,
    backgroundColor: 'rgba(195,192,255,0.12)',
  },
  chipLabel: {
    color: colors.text,
    fontSize: Platform.isTV ? 15 : 14,
    fontWeight: '600',
  },
  toggleKeyboard: { alignSelf: 'flex-start', padding: spacing.sm },
  toggleKeyboardLabel: { color: colors.brand, fontSize: 16 },
  popular: { gap: spacing.sm },
  popularTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  popularRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { color: colors.danger },
  empty: { color: colors.textSecondary, fontSize: 16 },
});
