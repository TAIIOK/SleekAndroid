import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { fetchAnimeDetail, fetchLampaDetail } from '@/api/catalog';
import { openContinueWatchingItem } from '@/components/home/ContinueWatchingRow';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, layout, spacing, tvFocus } from '@/constants/aniverse';
import { useTvCatalogVerticalNeighbors } from '@/hooks/useTvCatalogVerticalNeighbors';
import {
  HOME_HERO_RAIL_PRIORITY,
  registerTvHomeHeroFocus,
} from '@/lib/tvHomeFocusHandoff';
import { animeGenreNames, animeHeroImageCandidates, animeScore } from '@/lib/animeDetail';
import { animeHeroImageUrls } from '@/lib/config';
import {
  continueSecondaryAction,
  formatContinueHeroEyebrow,
  type ContinueWatchingItem,
} from '@/lib/continueWatching';
import { hotlinkImageSource } from '@/lib/hotlinkImage';
import { lampaBackdrop, lampaGenreNames, lampaRating, lampaYear } from '@/lib/lampaDetail';

interface ContinueWatchingHeroProps {
  item: ContinueWatchingItem;
  /** First D-pad target on the TV home screen. */
  isContentEntry?: boolean;
}

export function ContinueWatchingHero({
  item,
  isContentEntry = false,
}: ContinueWatchingHeroProps) {
  const router = useRouter();
  const neighbors = useTvCatalogVerticalNeighbors('/', HOME_HERO_RAIL_PRIORITY);
  const poster = item.poster;
  const lampaId = lampaRouteId(item);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [item.id]);

  const { data: animeDetail } = useQuery({
    queryKey: ['anime', item.animeId ?? 0],
    queryFn: () => fetchAnimeDetail(item.animeId!),
    enabled: item.kind === 'anime' && item.animeId != null,
    staleTime: 60_000,
  });

  const { data: lampaDetail } = useQuery({
    queryKey: ['lampa', item.kind, lampaId ?? ''],
    queryFn: () => fetchLampaDetail(item.kind, lampaId!),
    enabled: lampaId != null,
    staleTime: 60_000,
  });

  const backdrop = useMemo(() => {
    if (item.kind === 'anime' && animeDetail) {
      return animeHeroImageUrls(animeHeroImageCandidates(animeDetail))[0];
    }
    if (lampaDetail) return lampaBackdrop(lampaDetail, 'w780');
    return undefined;
  }, [animeDetail, item.kind, lampaDetail]);

  const imageUri = imageFailed ? poster : backdrop ?? poster;

  const meta = useMemo(() => {
    if (item.kind === 'anime' && animeDetail) {
      return formatHeroMeta({
        score: animeScore(animeDetail),
        year: animeDetail.year,
        genres: animeGenreNames(animeDetail.genres),
      });
    }
    if (lampaDetail) {
      return formatHeroMeta({
        score: lampaRating(lampaDetail),
        year: lampaYear(lampaDetail),
        genres: lampaGenreNames(lampaDetail.genres),
      });
    }
    return '';
  }, [animeDetail, item.kind, lampaDetail]);

  const overview = useMemo(() => {
    if (item.kind === 'anime') return (animeDetail?.description ?? '').trim();
    return (lampaDetail?.overview ?? lampaDetail?.description ?? '').trim();
  }, [animeDetail, item.kind, lampaDetail]);

  const secondary = continueSecondaryAction(item);
  const eyebrow = formatContinueHeroEyebrow(item);

  return (
    <View style={styles.hero}>
      {imageUri ? (
        <Image
          key={imageUri}
          source={hotlinkImageSource(imageUri)}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          contentPosition={{ top: '18%', left: '72%' }}
          cachePolicy="memory-disk"
          recyclingKey={imageUri}
          transition={0}
          onError={() => {
            if (!imageFailed && backdrop && poster && backdrop !== poster) setImageFailed(true);
          }}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallback]} />
      )}
      <LinearGradient
        colors={['rgba(19,18,27,0.94)', 'rgba(19,18,27,0.55)', 'rgba(19,18,27,0.08)']}
        locations={[0, 0.42, 1]}
        start={{ x: 0, y: 0.45 }}
        end={{ x: 0.78, y: 0.45 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['transparent', colors.bg]}
        locations={[0.62, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.content}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        {meta ? (
          <Text style={styles.meta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        {overview ? (
          <Text style={styles.overview} numberOfLines={2}>
            {overview}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <HeroPlayButton
            label="Продолжить"
            accessibilityLabel={`Продолжить ${item.title}`}
            hasTVPreferredFocus={isContentEntry}
            contentEntry={isContentEntry}
            railStart={isContentEntry}
            hostRef={registerTvHomeHeroFocus}
            nextFocusDown={neighbors.down}
            onPress={() => openContinueWatchingItem(router, item)}
          />
          {secondary ? (
            <TvFocusable
              onPress={() => router.push(secondary.href as never)}
              nextFocusDown={neighbors.down}
              accessibilityLabel={secondary.label}
              style={styles.secondary}
              focusedStyle={styles.secondaryFocused}
            >
              <Text style={styles.secondaryLabel}>{secondary.label}</Text>
            </TvFocusable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function HeroPlayButton({
  label,
  accessibilityLabel,
  onPress,
  hasTVPreferredFocus,
  contentEntry,
  railStart,
  hostRef,
  nextFocusDown,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  hasTVPreferredFocus?: boolean;
  contentEntry?: boolean;
  railStart?: boolean;
  hostRef?: (node: View | null) => void;
  nextFocusDown?: number;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <TvFocusable
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      hasTVPreferredFocus={hasTVPreferredFocus}
      contentEntry={contentEntry}
      railStart={railStart}
      hostRef={hostRef}
      nextFocusDown={nextFocusDown}
      accessibilityLabel={accessibilityLabel}
      style={styles.primary}
      focusedStyle={styles.primaryFocused}
    >
      <Text style={focused ? styles.primaryLabelFocused : styles.primaryLabel}>▶  {label}</Text>
    </TvFocusable>
  );
}

function lampaRouteId(item: ContinueWatchingItem): string | null {
  if (item.kind !== 'movie' && item.kind !== 'tv') return null;
  if (item.routeId && /^\d+$/.test(item.routeId)) return item.routeId;
  const id = item.href.split('?')[0]?.split('/').filter(Boolean).pop() ?? '';
  return /^\d+$/.test(id) ? id : null;
}

function formatHeroMeta(input: {
  score?: number;
  year?: number;
  genres?: string[];
}): string {
  const genres = (input.genres ?? []).map((genre) => genre.trim()).filter(Boolean).slice(0, 3);
  const parts: string[] = [];
  if (input.score != null && input.score > 0) parts.push(`★ ${input.score.toFixed(1)}`);
  if (input.year != null && input.year > 0) parts.push(String(input.year));
  if (genres.length) parts.push(genres.join(', '));
  return parts.join(' · ');
}

const styles = StyleSheet.create({
  hero: {
    minHeight: 420,
    marginBottom: spacing.md,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    backgroundColor: colors.bg,
  },
  fallback: {
    backgroundColor: colors.bgCard,
  },
  content: {
    maxWidth: 640,
    paddingHorizontal: layout.gutterDesktop,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
    zIndex: 1,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
  },
  title: {
    color: '#fff',
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  meta: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
  },
  overview: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 15,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  primary: {
    borderRadius: 999,
    backgroundColor: '#fff',
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  primaryFocused: {
    backgroundColor: colors.brandAccent,
    borderWidth: 3,
    borderColor: colors.brandTint,
  },
  primaryLabel: {
    color: '#111',
    fontSize: 16,
    fontWeight: '700',
  },
  primaryLabelFocused: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondary: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  secondaryFocused: {
    borderWidth: tvFocus.borderWidth,
    borderColor: tvFocus.borderColor,
  },
  secondaryLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
