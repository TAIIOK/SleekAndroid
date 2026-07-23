import { useState } from 'react';
import {
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { AnimeDetail } from '@/api/catalog';
import { DetailLibraryActions } from '@/components/library/DetailLibraryActions';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import {
  animeAltTitle,
  animeGenreNames,
  animeHeroImageCandidates,
  animeScore,
  buildAnimeHeroInfoRows,
  episodeNumber,
  localizedAnimeStatus,
  localizedAnimeType,
} from '@/lib/animeDetail';
import { resolveAnimePosterUrl } from '@/lib/config';
import type { UserListStatus } from '@/lib/libraryStatus';
import { animePoster } from '@/lib/poster';
import type { CollectionItemInput } from '@/types/collection';
import type { AnimeEpisode } from '@aniverse/types';
import { isTvUi } from '@/lib/isTvUi';

const HERO_OVERVIEW_LIMIT = 260;

interface AnimeDetailHeroProps {
  detail: AnimeDetail;
  resumeEpisode: AnimeEpisode | null;
  resumeLoading?: boolean;
  hasHistory: boolean;
  lastProgress?: number;
  episodesTotal?: number;
  userStatus?: string;
  isFavorite?: boolean;
  libraryDisabled?: boolean;
  collectionItem?: CollectionItemInput | null;
  onPlay: () => void;
  onStatusChange: (status: UserListStatus) => void;
  onToggleFavorite: () => void;
}

function truncateOverview(text: string, limit: number) {
  if (text.length <= limit) return { text, needsExpand: false };
  const cut = text.lastIndexOf(' ', limit);
  return {
    text: `${text.slice(0, cut > 0 ? cut : limit).trim()}…`,
    needsExpand: true,
  };
}

export function AnimeDetailHero({
  detail,
  resumeEpisode,
  resumeLoading = false,
  hasHistory,
  lastProgress = 0,
  episodesTotal,
  userStatus,
  isFavorite,
  libraryDisabled,
  collectionItem,
  onPlay,
  onStatusChange,
  onToggleFavorite,
}: AnimeDetailHeroProps) {
  const tv = isTvUi();
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const title = detail.title ?? 'Аниме';
  const alt = animeAltTitle(detail);
  const score = animeScore(detail);
  const typeLabel = localizedAnimeType(detail.type);
  const status = detail.status ? localizedAnimeStatus(detail.status) : undefined;
  const year = detail.year ? String(detail.year) : undefined;
  const genres = animeGenreNames(detail.genres).slice(0, 4);
  const infoRows = buildAnimeHeroInfoRows(detail, episodesTotal);
  const backdrop = resolveAnimePosterUrl(animeHeroImageCandidates(detail)[0]);
  const canPlay = Boolean(resumeEpisode) && !resumeLoading;
  const overview = (detail.description ?? '').trim();
  const truncated = truncateOverview(overview, HERO_OVERVIEW_LIMIT);
  const overviewText =
    overviewExpanded || !truncated.needsExpand ? overview : truncated.text;

  const playLabel = hasHistory
    ? 'Продолжить просмотр'
    : resumeLoading && !resumeEpisode
      ? 'Загрузка…'
      : 'Смотреть сейчас';

  const playHint =
    hasHistory && resumeEpisode && lastProgress > 0 && lastProgress < 1
      ? `Эп. ${episodeNumber(resumeEpisode)} · ${Math.round(lastProgress * 100)}%`
      : hasHistory && resumeEpisode
        ? `Эп. ${episodeNumber(resumeEpisode)}`
        : undefined;

  const leftCol = (
    <View style={styles.leftCol}>
      <Text style={styles.title} numberOfLines={3}>
        {title}
      </Text>
      {alt ? (
        <Text style={styles.alt} numberOfLines={2}>
          {alt}
        </Text>
      ) : null}

      <View style={styles.pills}>
        {typeLabel ? (
          <View style={[styles.pill, styles.pillAccent]}>
            <Text style={[styles.pillText, styles.pillAccentText]}>{typeLabel}</Text>
          </View>
        ) : null}
        {genres.map((genre) => (
          <View key={genre} style={styles.pill}>
            <Text style={styles.pillText}>{genre}</Text>
          </View>
        ))}
        {year ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{year}</Text>
          </View>
        ) : null}
        {score != null ? (
          <View style={[styles.pill, styles.pillRating]}>
            <Text style={styles.pillText}>
              <Text style={styles.star}>★ </Text>
              {score.toFixed(1)}
            </Text>
          </View>
        ) : null}
        {status ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{status}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <TvFocusable
          onPress={() => {
            if (canPlay) onPlay();
          }}
          hasTVPreferredFocus={tv}
          contentEntry={tv}
          railStart={tv}
          style={[styles.playBtn, !canPlay && styles.playDisabled]}
        >
          <Text style={styles.playLabel}>▶ {playLabel}</Text>
          {playHint ? <Text style={styles.playHint}>{playHint}</Text> : null}
        </TvFocusable>

        <DetailLibraryActions
          userStatus={userStatus}
          isFavorite={isFavorite}
          disabled={libraryDisabled}
          collectionItem={
            collectionItem ?? {
              mediaType: 'anime',
              mediaId: String(detail.id),
              title: detail.title ?? undefined,
              poster: animePoster(detail),
            }
          }
          onStatusChange={onStatusChange}
          onToggleFavorite={onToggleFavorite}
        />
      </View>
    </View>
  );

  const aside =
    infoRows.length > 0 || overview ? (
      <View style={styles.aside}>
        {infoRows.length > 0 ? (
          <View style={styles.infoGrid}>
            {infoRows.map((row) => (
              <View key={row.title} style={styles.infoRow}>
                <Text style={styles.infoLabel}>{row.title}</Text>
                <Text
                  style={[
                    styles.infoValue,
                    row.title === 'Возраст' && styles.infoValueDanger,
                  ]}
                  numberOfLines={2}
                >
                  {row.value}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {overview ? (
          <View style={[styles.asidePlot, infoRows.length > 0 && styles.asidePlotBorder]}>
            <Text style={styles.infoLabel}>Сюжет</Text>
            <Text style={styles.asidePlotBody}>{overviewText}</Text>
            {truncated.needsExpand ? (
              <TvFocusable
                onPress={() => setOverviewExpanded((v) => !v)}
                style={styles.moreBtn}
              >
                <Text style={styles.moreLabel}>
                  {overviewExpanded ? 'Свернуть' : 'Подробнее'}
                </Text>
              </TvFocusable>
            ) : null}
          </View>
        ) : null}
      </View>
    ) : null;

  const body = (
    <>
      <LinearGradient
        colors={['rgba(19,18,27,0.75)', 'rgba(19,18,27,0.2)', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 0.55, y: 0.5 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[
          'transparent',
          'rgba(19,18,27,0.35)',
          'rgba(19,18,27,0.85)',
          colors.bg,
        ]}
        locations={[0.35, 0.62, 0.85, 1]}
        style={styles.bottomFade}
        pointerEvents="none"
      />

      <View style={[styles.content, tv && styles.contentTv]}>
        {leftCol}
        {aside}
      </View>
    </>
  );

  return (
    <View style={styles.hero}>
      {backdrop ? (
        <ImageBackground
          source={{ uri: backdrop }}
          style={styles.backdrop}
          imageStyle={styles.backdropImage}
        >
          {body}
        </ImageBackground>
      ) : (
        <View style={styles.backdrop}>{body}</View>
      )}
    </View>
  );
}

const PAGE_PAD = isTvUi() ? spacing.lg : spacing.md;

const styles = StyleSheet.create({
  hero: {
    alignSelf: 'stretch',
    marginTop: -PAGE_PAD,
    marginHorizontal: -PAGE_PAD,
    backgroundColor: colors.bg,
  },
  backdrop: {
    width: '100%',
    minHeight: isTvUi() ? 520 : 280,
    justifyContent: 'flex-end',
    backgroundColor: colors.bg,
  },
  backdropImage: {
    resizeMode: 'cover',
  },
  bottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: isTvUi() ? 220 : 160,
  },
  content: {
    paddingHorizontal: PAGE_PAD,
    paddingTop: isTvUi() ? spacing.xxl : spacing.lg,
    paddingBottom: isTvUi() ? spacing.xl : spacing.md,
    gap: spacing.md,
    zIndex: 1,
  },
  contentTv: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  leftCol: {
    flex: 1.2,
    minWidth: 0,
    gap: spacing.sm,
    justifyContent: 'flex-start',
  },
  aside: {
    flex: 0.85,
    minWidth: isTvUi() ? 280 : undefined,
    maxWidth: isTvUi() ? 360 : undefined,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: spacing.md,
    gap: spacing.sm,
    alignSelf: 'stretch',
  },
  title: {
    color: colors.text,
    fontSize: isTvUi() ? 36 : 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  alt: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: isTvUi() ? 16 : 13,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.xs,
  },
  pill: {
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.48)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  pillAccent: {
    backgroundColor: colors.brandAccent,
    borderColor: 'transparent',
  },
  pillRating: {
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  pillText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 12,
    fontWeight: '600',
  },
  pillAccentText: {
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontSize: 11,
  },
  star: {
    color: colors.brand,
  },
  actions: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  playBtn: {
    backgroundColor: colors.brandAccent,
    borderRadius: 14,
    paddingHorizontal: spacing.xl,
    paddingVertical: 14,
    gap: 2,
    minWidth: 220,
  },
  playDisabled: {
    opacity: 0.55,
  },
  playLabel: {
    color: colors.text,
    fontSize: isTvUi() ? 16 : 15,
    fontWeight: '700',
  },
  playHint: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
  },
  infoGrid: {
    gap: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: spacing.md,
  },
  infoLabel: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  infoValue: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'right',
  },
  infoValueDanger: {
    color: '#f87171',
  },
  asidePlot: {
    gap: 8,
  },
  asidePlotBorder: {
    marginTop: 4,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  asidePlotBody: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    lineHeight: 22,
  },
  moreBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  moreLabel: {
    color: colors.brand,
    fontSize: 14,
    fontWeight: '700',
  },
});
