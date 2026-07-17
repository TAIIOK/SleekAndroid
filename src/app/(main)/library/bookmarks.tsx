import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { fetchFavoriteBookmarks } from '@/api/library';
import { CatalogPosterCard } from '@/components/catalog/CatalogPosterCard';
import { PosterGrid } from '@/components/catalog/PosterGrid';
import { colors, layout, spacing } from '@/constants/aniverse';

export default function BookmarksScreen() {
  const router = useRouter();
  const { data: bookmarks = [], isLoading } = useQuery({
    queryKey: ['library-favorites'],
    queryFn: fetchFavoriteBookmarks,
  });

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {isLoading ? (
        <ActivityIndicator color={colors.brand} style={styles.loader} />
      ) : !bookmarks.length ? (
        <Text style={styles.empty}>Закладок пока нет</Text>
      ) : (
        <PosterGrid>
          {bookmarks.map((item) => (
            <CatalogPosterCard
              key={`${item.kind}-${item.id}`}
              variant="grid"
              width={layout.posterWidthRail}
              title={item.title}
              poster={item.poster}
              subtitle={item.subtitle}
              onPress={() => router.push(item.to as '/')}
            />
          ))}
        </PosterGrid>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { paddingBottom: spacing.xl },
  loader: { marginTop: spacing.xxl },
  empty: {
    color: colors.textSecondary,
    fontSize: 15,
    paddingVertical: spacing.xl,
  },
});
