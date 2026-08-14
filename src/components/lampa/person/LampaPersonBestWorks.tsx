import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { LampaPersonCredit } from '@/api/lampaPerson';
import { CatalogPosterCard } from '@/components/catalog/CatalogPosterCard';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { layout, spacing } from '@/constants/aniverse';
import { lampaDetailPath, lampaTitle } from '@/lib/lampaDetail';
import {
  formatCreditMeta,
  formatCreditRating,
  personCreditKey,
  pickTopPersonCredits,
} from '@/lib/lampaPersonUtils';
import { lampaPosterPath } from '@/lib/poster';

interface LampaPersonBestWorksProps {
  items: LampaPersonCredit[];
  isLoading?: boolean;
  onViewAll?: () => void;
}

const CARD_W = Math.min(layout.posterWidthRail, 148);

export function LampaPersonBestWorks({
  items,
  isLoading,
  onViewAll,
}: LampaPersonBestWorksProps) {
  const router = useRouter();
  const bestWorks = pickTopPersonCredits(items, 8);

  if (!isLoading && !bestWorks.length) return null;

  return (
    <View style={styles.wrap}>
      <SectionHeader
        title="Лучшие работы"
        flush
        onSeeAll={bestWorks.length && onViewAll ? onViewAll : undefined}
        seeAllLabel="Смотреть все"
      />

      {isLoading && !bestWorks.length ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <View key={index} style={styles.skelCard}>
              <Skeleton width={CARD_W} height={CARD_W / layout.posterAspect} rounded={22} />
              <Skeleton width="85%" height={14} style={{ marginTop: 12 }} />
              <Skeleton width="70%" height={12} style={{ marginTop: 8 }} />
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {bestWorks.map((item) => {
            const kind = item.mediaType ?? item.kind ?? 'movie';
            const path = lampaDetailPath(kind, item);
            const rating = formatCreditRating(item);
            const meta = formatCreditMeta(item);
            return (
              <View key={personCreditKey(item)} style={styles.card}>
                <CatalogPosterCard
                  title={lampaTitle(item)}
                  poster={lampaPosterPath(item)}
                  width={CARD_W}
                  score={rating ? Number(rating) : undefined}
                  onPress={() => router.push(path as '/')}
                />
                {item.character ? (
                  <Text style={styles.character} numberOfLines={2}>
                    {item.character}
                  </Text>
                ) : null}
                {meta ? (
                  <Text style={styles.meta} numberOfLines={1}>
                    {meta}
                  </Text>
                ) : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { gap: spacing.md, paddingRight: spacing.sm },
  card: { width: CARD_W, gap: 4 },
  skelCard: { width: CARD_W },
  character: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  meta: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12,
  },
});
