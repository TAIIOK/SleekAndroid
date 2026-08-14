import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { LampaPersonCredit } from '@/api/lampaPerson';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, radii, spacing } from '@/constants/aniverse';
import { resolveLampaPosterUrl } from '@/lib/config';
import { lampaDetailPath } from '@/lib/lampaDetail';
import {
  creditYear,
  formatCreditRating,
  isCreditInProduction,
  personCreditKey,
  personProjectLabel,
  pluralProjects,
} from '@/lib/lampaPersonUtils';
import { lampaPosterPath } from '@/lib/poster';

interface LampaPersonProjectsListProps {
  items: LampaPersonCredit[];
  isLoading?: boolean;
  totalItems?: number;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

export function LampaPersonProjectsList({
  items,
  isLoading,
  totalItems = 0,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: LampaPersonProjectsListProps) {
  const remaining = Math.max(totalItems - items.length, 0);

  if (!isLoading && !items.length) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Все проекты</Text>

      {isLoading && !items.length ? (
        <View style={styles.list}>
          {Array.from({ length: 4 }).map((_, index) => (
            <View key={index} style={[styles.row, index < 3 && styles.rowBorder]}>
              <Skeleton width={40} height={14} />
              <View style={styles.mid}>
                <Skeleton width={48} height={72} rounded={radii.md} />
                <View style={styles.midText}>
                  <Skeleton width="70%" height={14} />
                  <Skeleton width="50%" height={12} style={{ marginTop: 8 }} />
                </View>
              </View>
              <Skeleton width={40} height={14} />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.list}>
          {items.map((item, index) => (
            <ProjectRow
              key={personCreditKey(item)}
              item={item}
              isLast={index === items.length - 1 && !hasNextPage}
            />
          ))}

          {hasNextPage ? (
            <Pressable
              onPress={onLoadMore}
              disabled={isFetchingNextPage}
              style={({ pressed }) => [styles.loadMore, pressed && styles.loadMorePressed]}
            >
              {isFetchingNextPage ? (
                <ActivityIndicator color={colors.brand} />
              ) : (
                <>
                  <Text style={styles.loadMoreText}>
                    Показать ещё {remaining} {pluralProjects(remaining)}
                  </Text>
                  <Text style={styles.loadMoreChevron}>⌄</Text>
                </>
              )}
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

function ProjectRow({ item, isLast }: { item: LampaPersonCredit; isLast: boolean }) {
  const router = useRouter();
  const kind = item.mediaType ?? item.kind ?? 'movie';
  const posterPath = lampaPosterPath(item);
  const poster = posterPath ? resolveLampaPosterUrl(posterPath, 'w185') : undefined;
  const inProduction = isCreditInProduction(item);
  const rating = formatCreditRating(item);
  const year = creditYear(item);
  const path = lampaDetailPath(kind, item);

  return (
    <Pressable
      onPress={() => router.push(path as '/')}
      style={({ pressed }) => [
        styles.row,
        !isLast && styles.rowBorder,
        pressed && styles.rowPressed,
      ]}
    >
      <Text style={styles.year}>{year ?? '—'}</Text>

      <View style={styles.mid}>
        <View style={styles.poster}>
          {poster ? (
            <Image source={{ uri: poster }} style={styles.posterImage} />
          ) : (
            <View style={styles.posterFallback}>
              <Text style={styles.posterLetter}>
                {personProjectLabel(item).slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <View style={styles.midText}>
          <Text style={styles.projectTitle} numberOfLines={2}>
            {personProjectLabel(item)}
          </Text>
          {item.character ? (
            <Text style={styles.character} numberOfLines={1}>
              {item.character}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.trailing}>
        {inProduction ? (
          <View style={styles.inProd}>
            <Text style={styles.inProdText}>В производстве</Text>
          </View>
        ) : rating ? (
          <Text style={styles.rating}>
            <Text style={styles.star}>★ </Text>
            {rating}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  list: {
    overflow: 'hidden',
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#171923',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  rowPressed: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  year: {
    width: 44,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  mid: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  poster: {
    width: 48,
    height: 72,
    borderRadius: radii.md,
    overflow: 'hidden',
    backgroundColor: colors.bgCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  posterImage: { width: '100%', height: '100%' },
  posterFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterLetter: { color: colors.textSecondary, fontWeight: '700' },
  midText: { flex: 1, minWidth: 0, gap: 4 },
  projectTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  character: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
  },
  trailing: {
    flexShrink: 0,
    alignItems: 'flex-end',
    maxWidth: 110,
  },
  inProd: {
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  inProdText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  rating: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontWeight: '700',
  },
  star: { color: '#facc15' },
  loadMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  loadMorePressed: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  loadMoreText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontWeight: '700',
  },
  loadMoreChevron: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 16,
  },
});
