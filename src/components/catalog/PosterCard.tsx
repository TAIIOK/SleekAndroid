import { Image } from 'expo-image';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout, radii, typography } from '@/constants/aniverse';
import { resolvePosterUrl } from '@/lib/config';

export interface PosterCardProps {
  title: string;
  poster?: string | null;
  subtitle?: string;
  score?: number | null;
  onPress?: () => void;
  width?: number;
  variant?: 'rail' | 'grid';
}

export function PosterCard({
  title,
  poster,
  subtitle,
  score,
  onPress,
  width,
  variant = 'rail',
}: PosterCardProps) {
  const [focused, setFocused] = useState(false);
  const cardWidth = width ?? (variant === 'grid' ? undefined : layout.posterWidthRail);
  // Poster may already be a full URL (e.g. from mapLampaToRailItem) or a relative path.
  const imageUrl =
    typeof poster === 'string' &&
    (poster.startsWith('http://') || poster.startsWith('https://') || poster.startsWith('//'))
      ? poster.startsWith('//')
        ? `https:${poster}`
        : poster
      : resolvePosterUrl(poster ?? undefined);
  const ratingLabel = score != null && Number.isFinite(score) ? score.toFixed(1) : undefined;

  return (
    <Pressable
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={[
        styles.card,
        variant === 'grid' ? styles.cardGrid : null,
        cardWidth != null
          ? { width: cardWidth }
          : variant === 'grid'
            ? styles.cardGridFluid
            : null,
      ]}
      {...(Platform.isTV ? { scrollSnapAlign: 'start' as const } : {})}
    >
      <View
        style={[
          styles.poster,
          { aspectRatio: layout.posterAspect },
          focused && styles.posterFocused,
        ]}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
        ) : (
          <Text style={styles.fallback}>{title.slice(0, 1) || '?'}</Text>
        )}
        {ratingLabel ? (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>{ratingLabel}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={styles.subtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginRight: 12,
  },
  cardGrid: {
    marginRight: 0,
  },
  cardGridFluid: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  poster: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  posterFocused: {
    borderColor: colors.brand,
    shadowColor: colors.focusGlow,
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    ...(Platform.isTV ? {} : { transform: [{ scale: 1.03 }] }),
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    color: colors.brand,
    fontSize: 36,
    fontWeight: '700',
  },
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(19,18,27,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingText: {
    color: colors.brand,
    fontSize: Platform.isTV ? 12 : 10,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    marginTop: 8,
    backgroundColor: 'transparent',
    ...typography.cardTitle,
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 2,
    backgroundColor: 'transparent',
    ...typography.cardSubtitle,
  },
});
