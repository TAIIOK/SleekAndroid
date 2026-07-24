import { Image } from 'expo-image';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import {
  findNodeHandle,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, layout, radii, tvFocus, typography } from '@/constants/aniverse';
import {
  reportDeadPoster,
  subscribeAnimePosterRefresh,
} from '@/lib/animePosterRefresh';
import { resolvePosterUrl } from '@/lib/config';
import {
  reportYaniPosterLoadError,
  reportYaniPosterLoadSuccess,
} from '@/lib/imageCdn';
import {
  isPlausibleImageURL,
  normalizedAbsoluteURLString,
} from '@/lib/poster';
import { useTvShellFocus } from '@/providers/TvShellFocus';
import { isTvUi } from '@/lib/isTvUi';

export interface PosterCardProps {
  title: string;
  poster?: string | null;
  /** When set, dead anime posters can trigger refresh-posters. */
  animeId?: number | null;
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
  /**
   * Temporarily pin Up/Down to this card (hold-Right guard).
   * Cleared by caller after a short arm window so intentional Up/Down still works.
   */
  pinVerticalFocus?: boolean;
}

function resolveDisplayPosterUrl(poster?: string | null): string | undefined {
  if (typeof poster !== 'string') return undefined;
  if (
    poster.startsWith('http://') ||
    poster.startsWith('https://') ||
    poster.startsWith('//')
  ) {
    const normalized = normalizedAbsoluteURLString(poster);
    if (!normalized || !isPlausibleImageURL(normalized)) return undefined;
    return normalized;
  }
  return resolvePosterUrl(poster);
}

export const PosterCard = forwardRef<View, PosterCardProps>(function PosterCard(
  {
    title,
    poster,
    animeId,
    subtitle,
    score,
    onPress,
    onFocus,
    onBlur,
    width,
    variant = 'rail',
    railStart = false,
    contentEntry = false,
    pinVerticalFocus = false,
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [selfTag, setSelfTag] = useState<number | undefined>();
  const [overridePoster, setOverridePoster] = useState<string | null>(null);
  const didReportUnresolvedRef = useRef(false);
  const shellFocus = useTvShellFocus();
  const nodeRef = useRef<View | null>(null);
  const displayTitle = title.trim() || 'Без названия';
  const cardWidth = width ?? (variant === 'grid' ? undefined : layout.posterWidthRail);
  const imageUrl = resolveDisplayPosterUrl(overridePoster ?? poster);
  const ratingLabel = score != null && Number.isFinite(score) ? score.toFixed(1) : undefined;
  const exitLeft = isTvUi() && railStart;
  const exitUp = isTvUi() && contentEntry;
  const sidebarTag = exitLeft ? shellFocus?.sidebarNativeTag : undefined;
  const pinVertical =
    isTvUi() && variant === 'rail' && focused && pinVerticalFocus && selfTag != null;

  useEffect(() => {
    setOverridePoster(null);
    didReportUnresolvedRef.current = false;
  }, [poster, animeId]);

  useEffect(() => {
    if (animeId == null || !Number.isFinite(animeId) || animeId <= 0) return;
    return subscribeAnimePosterRefresh((event) => {
      if (event.animeId !== animeId) return;
      setOverridePoster(event.posterURLString);
    });
  }, [animeId]);

  useEffect(() => {
    if (didReportUnresolvedRef.current) return;
    if (animeId == null || !Number.isFinite(animeId) || animeId <= 0) return;
    const raw = (overridePoster ?? poster)?.trim();
    if (!raw) return;
    const isAbsolute =
      raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('//');
    if (!isAbsolute) return;
    const normalized = normalizedAbsoluteURLString(raw);
    if (normalized && isPlausibleImageURL(normalized)) return;
    didReportUnresolvedRef.current = true;
    reportDeadPoster({ animeId, failedUrl: null, rawPath: raw });
  }, [animeId, poster, overridePoster]);

  const setRefs = useCallback(
    (node: View | null) => {
      nodeRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
      const tag =
        node != null
          ? (findNodeHandle(node as Parameters<typeof findNodeHandle>[0]) ?? undefined)
          : undefined;
      setSelfTag(tag);
    },
    [ref],
  );

  return (
    <Pressable
      ref={setRefs}
      onFocus={() => {
        setFocused(true);
        if (isTvUi() && nodeRef.current) {
          shellFocus?.registerContentAnchor(nodeRef.current);
          const tag = findNodeHandle(
            nodeRef.current as Parameters<typeof findNodeHandle>[0],
          );
          if (tag != null) setSelfTag(tag);
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
      {...(contentEntry && isTvUi() ? { hasTVPreferredFocus: true } : {})}
      {...(sidebarTag != null ? { nextFocusLeft: sidebarTag } : {})}
      {...(pinVertical
        ? { nextFocusUp: selfTag, nextFocusDown: selfTag }
        : {})}
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
              onLoad={() => reportYaniPosterLoadSuccess()}
              onError={() => {
                reportYaniPosterLoadError(imageUrl);
                if (animeId != null) {
                  reportDeadPoster({
                    animeId,
                    failedUrl: imageUrl,
                    rawPath: overridePoster ?? poster,
                  });
                }
              }}
            />
          ) : (
            <Text style={styles.fallback}>{displayTitle.slice(0, 1) || '?'}</Text>
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
        {displayTitle}
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
    ...(isTvUi() ? {} : { transform: [{ scale: 1.03 }] }),
  },
  posterFrame: {
    borderRadius: radii.md,
    borderWidth: isTvUi() ? tvFocus.borderWidth : 0,
    borderColor: 'transparent',
  },
  posterFrameFocused: {
    borderColor: isTvUi() ? tvFocus.borderColor : 'transparent',
    backgroundColor: isTvUi() ? tvFocus.wash : 'transparent',
  },
  poster: {
    backgroundColor: colors.bgCard,
    borderRadius: isTvUi() ? radii.sm : radii.md,
    overflow: 'hidden',
    borderWidth: isTvUi() ? 0 : 1,
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
    fontSize: isTvUi() ? 28 : 36,
    fontWeight: '700',
  },
  ratingBadge: {
    position: 'absolute',
    top: isTvUi() ? 6 : 8,
    right: isTvUi() ? 6 : 8,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(19,18,27,0.65)',
    paddingHorizontal: isTvUi() ? 6 : 8,
    paddingVertical: isTvUi() ? 2 : 4,
    zIndex: 1,
  },
  ratingText: {
    color: colors.brand,
    fontSize: isTvUi() ? 11 : 10,
    fontWeight: '700',
  },
  title: {
    color: colors.text,
    marginTop: isTvUi() ? 6 : 8,
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
