import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, layout, radii, spacing } from '@/constants/aniverse';
import {
  formatProgressTime,
  type ContinueWatchingItem,
} from '@/lib/continueWatching';

const CARD_WIDTH = layout.continueCardWidth;

interface ContinueWatchingRowProps {
  items: ContinueWatchingItem[];
}

export function ContinueWatchingRow({ items }: ContinueWatchingRowProps) {
  const router = useRouter();
  const horizontalPad = Platform.isTV ? layout.gutterDesktop : layout.gutterMobile;
  const rowCount = Platform.isTV ? 1 : items.length <= 4 ? 1 : 2;
  const columns =
    rowCount > 1
      ? Array.from({ length: Math.ceil(items.length / rowCount) }, (_, columnIndex) =>
          items.slice(columnIndex * rowCount, columnIndex * rowCount + rowCount),
        )
      : [];

  if (!items.length) return null;

  return (
    <View style={styles.section}>
      <SectionHeader title="Продолжить просмотр" variant="continue" />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingHorizontal: horizontalPad }]}
        {...(Platform.isTV
          ? ({
              snapToAlignment: 'start',
              snapToInterval: CARD_WIDTH + 12,
              scrollAnimationEnabled: true,
            } as object)
          : {})}
      >
        {rowCount > 1 ? (
          <View style={styles.twoRowGrid}>
            {columns.map((columnItems, columnIndex) => (
              <View key={`col-${columnIndex}`} style={styles.twoRowColumn}>
                {columnItems.map((item, rowIndex) => (
                  <ContinueCard
                    key={item.id}
                    item={item}
                    onPress={() => openItem(router, item)}
                    isContentEntry={columnIndex === 0 && rowIndex === 0}
                  />
                ))}
              </View>
            ))}
          </View>
        ) : (
          items.map((item, index) => (
            <ContinueCard
              key={item.id}
              item={item}
              onPress={() => openItem(router, item)}
              isContentEntry={index === 0}
              spaced
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function openItem(
  router: ReturnType<typeof useRouter>,
  item: ContinueWatchingItem,
) {
  if (item.kind === 'anime' && item.animeId && item.episodeId) {
    router.push({
      pathname: '/watch/anime/[animeId]/[episodeId]',
      params: {
        animeId: String(item.animeId),
        episodeId: String(item.episodeId),
        title: item.title ?? '',
        ...(item.startProgress != null
          ? { startProgress: String(item.startProgress) }
          : {}),
      },
    });
    return;
  }
  router.push(item.href as never);
}

function ContinueCard({
  item,
  onPress,
  isContentEntry,
  spaced,
}: {
  item: ContinueWatchingItem;
  onPress: () => void;
  isContentEntry?: boolean;
  spaced?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <Pressable
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={[
        styles.card,
        spaced && styles.cardSpaced,
        { width: CARD_WIDTH },
        focused && styles.cardFocused,
      ]}
      {...(isContentEntry ? { hasTVPreferredFocus: true } : {})}
    >
      <View style={styles.posterWrap}>
        {item.poster ? (
          <Image source={{ uri: item.poster }} style={styles.poster} contentFit="cover" />
        ) : (
          <View style={[styles.poster, styles.posterFallback]}>
            <Text style={styles.posterFallbackText}>{item.title.slice(0, 1)}</Text>
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.8)']}
          style={styles.posterGradient}
        />
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(item.progress * 100)}%` }]} />
        </View>
      </View>
      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {item.subtitle}
          {item.progress > 0 ? ` · ${formatProgressTime(item.progress)}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: Platform.isTV ? spacing.lg : 32,
  },
  scroll: {
    paddingBottom: spacing.sm,
    gap: 12,
  },
  twoRowGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  twoRowColumn: {
    gap: 12,
  },
  card: {
    marginRight: 0,
  },
  cardSpaced: {
    marginRight: 12,
  },
  cardFocused: {
    transform: Platform.isTV ? undefined : [{ scale: 1.02 }],
  },
  posterWrap: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    aspectRatio: 16 / 9,
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  posterGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '50%',
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  posterFallbackText: {
    color: colors.brand,
    fontSize: 36,
    fontWeight: '700',
  },
  progressTrack: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.brand,
  },
  meta: {
    marginTop: 8,
    minHeight: 40 + 2 + 16,
  },
  title: {
    color: colors.text,
    height: 40,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    backgroundColor: 'transparent',
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 2,
    height: 16,
    fontSize: 12,
    lineHeight: 16,
    backgroundColor: 'transparent',
  },
});
