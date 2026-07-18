import { Image } from 'expo-image';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, layout, radii, tvFocus, typography } from '@/constants/aniverse';
import { resolvePosterUrl } from '@/lib/config';
import { useTvShellFocus } from '@/providers/TvShellFocus';

export interface PosterCardProps {
  title: string;
  poster?: string | null;
  subtitle?: string;
  score?: number | null;
  onPress?: () => void;
  width?: number;
  variant?: 'rail' | 'grid';
  /** First item in a horizontal rail — Left jumps to the TV sidebar. */
  railStart?: boolean;
  /** Prefer this card as the content-area focus entry. */
  contentEntry?: boolean;
}

export function PosterCard({
  title,
  poster,
  subtitle,
  score,
  onPress,
  width,
  variant = 'rail',
  railStart = false,
  contentEntry = false,
}: PosterCardProps) {
  const [focused, setFocused] = useState(false);
  const shellFocus = useTvShellFocus();
  const cardWidth = width ?? (variant === 'grid' ? undefined : layout.posterWidthRail);
  const imageUrl =
    typeof poster === 'string' &&
    (poster.startsWith('http://') || poster.startsWith('https://') || poster.startsWith('//'))
      ? poster.startsWith('//')
        ? `https:${poster}`
        : poster
      : resolvePosterUrl(poster ?? undefined);
  const ratingLabel = score != null && Number.isFinite(score) ? score.toFixed(1) : undefined;
  const exitLeft = Platform.isTV && railStart;
  const exitUp = Platform.isTV && contentEntry;

  return (
    <Pressable
      onFocus={() => {
        setFocused(true);
        if (exitLeft) shellFocus?.setExitLeftEnabled(true);
        if (exitUp) shellFocus?.setExitUpEnabled(true);
      }}
      onBlur={() => {
        setFocused(false);
        if (exitLeft) shellFocus?.setExitLeftEnabled(false);
        if (exitUp) shellFocus?.setExitUpEnabled(false);
      }}
      onPress={onPress}
      style={[
        styles.card,
        variant === 'grid' ? styles.cardGrid : null,
        cardWidth != null
          ? { width: cardWidth }
          : variant === 'grid'
            ? styles.cardGridFluid
            : null,
        focused && styles.cardFocused,
      ]}
      {...(Platform.isTV ? { scrollSnapAlign: 'start' as const } : {})}
      {...(contentEntry && Platform.isTV ? { hasTVPreferredFocus: true } : {})}
    >
      <View style={[styles.posterFrame, focused && styles.posterFrameFocused]}>
        <View style={[styles.poster, { aspectRatio: layout.posterAspect }]}>
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
          {focused ? (
            <View style={[StyleSheet.absoluteFill, styles.focusWash]} pointerEvents="none" />
          ) : null}
        </View>
      </View>
      <Text style={[styles.title, focused && styles.titleFocused]} numberOfLines={2}>
        {title}
      </Text>
      {subtitle ? (
        <Text style={[styles.subtitle, focused && styles.subtitleFocused]} numberOfLines={1}>
          {subtitle}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginRight: Platform.isTV ? 10 : 12,
  },
  cardGrid: {
    marginRight: 0,
  },
  cardGridFluid: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  cardFocused: {
    zIndex: 2,
    ...(Platform.isTV ? {} : { transform: [{ scale: 1.03 }] }),
  },
  posterFrame: {
    borderRadius: radii.md,
    borderWidth: Platform.isTV ? tvFocus.borderWidth : 0,
    borderColor: 'transparent',
  },
  posterFrameFocused: {
    borderColor: Platform.isTV ? tvFocus.borderColor : 'transparent',
    backgroundColor: Platform.isTV ? tvFocus.wash : 'transparent',
    ...(Platform.isTV ? tvFocus.glow : {}),
  },
  poster: {
    backgroundColor: colors.bgCard,
    borderRadius: Platform.isTV ? radii.sm : radii.md,
    overflow: 'hidden',
    borderWidth: Platform.isTV ? 0 : 1,
    borderColor: colors.borderLight,
  },
  focusWash: {
    backgroundColor: tvFocus.wash,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallback: {
    color: colors.brand,
    fontSize: Platform.isTV ? 28 : 36,
    fontWeight: '700',
  },
  ratingBadge: {
    position: 'absolute',
    top: Platform.isTV ? 6 : 8,
    right: Platform.isTV ? 6 : 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(19,18,27,0.65)',
    paddingHorizontal: Platform.isTV ? 6 : 8,
    paddingVertical: Platform.isTV ? 2 : 4,
    zIndex: 1,
  },
  ratingText: {
    color: colors.brand,
    fontSize: Platform.isTV ? 11 : 10,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    marginTop: Platform.isTV ? 6 : 8,
    backgroundColor: 'transparent',
    ...typography.cardTitle,
  },
  titleFocused: {
    color: tvFocus.titleColor,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 2,
    backgroundColor: 'transparent',
    ...typography.cardSubtitle,
  },
  subtitleFocused: {
    color: colors.brand,
  },
});
