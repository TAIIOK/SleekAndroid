import { Image } from 'expo-image';
import { forwardRef, useCallback, useRef, useState } from 'react';
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
  onFocus?: () => void;
  onBlur?: () => void;
  width?: number;
  variant?: 'rail' | 'grid';
  /** First item in a horizontal rail — Left jumps to the TV sidebar. */
  railStart?: boolean;
  /** Prefer this card as the content-area focus entry. */
  contentEntry?: boolean;
}

export const PosterCard = forwardRef<View, PosterCardProps>(function PosterCard(
  {
    title,
    poster,
    subtitle,
    score,
    onPress,
    onFocus,
    onBlur,
    width,
    variant = 'rail',
    railStart = false,
    contentEntry = false,
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const shellFocus = useTvShellFocus();
  const nodeRef = useRef<View | null>(null);
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
  const sidebarTag = exitLeft ? shellFocus?.sidebarNativeTag : undefined;

  const setRefs = useCallback(
    (node: View | null) => {
      nodeRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    },
    [ref],
  );

  return (
    <Pressable
      ref={setRefs}
      onFocus={() => {
        setFocused(true);
        if (Platform.isTV && nodeRef.current) {
          shellFocus?.registerContentAnchor(nodeRef.current);
        }
        if (exitLeft) shellFocus?.setExitLeftEnabled(true);
        if (exitUp) shellFocus?.setExitUpEnabled(true);
        onFocus?.();
      }}
      onBlur={() => {
        setFocused(false);
        if (exitLeft) shellFocus?.setExitLeftEnabled(false);
        if (exitUp) shellFocus?.setExitUpEnabled(false);
        onBlur?.();
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
      {...(contentEntry && Platform.isTV ? { hasTVPreferredFocus: true } : {})}
      {...(sidebarTag != null ? { nextFocusLeft: sidebarTag } : {})}
    >
      <View style={[styles.posterFrame, focused && styles.posterFrameFocused]}>
        <View style={[styles.poster, { aspectRatio: layout.posterAspect }]}>
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={styles.image}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={imageUrl}
            />
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
});

const styles = StyleSheet.create({
  card: {
    // Spacing comes from the rail ScrollView `gap` — avoid double stride that
    // used to desync snap/focus scrolling on TV.
    marginRight: 0,
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
