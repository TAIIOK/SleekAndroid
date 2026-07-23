import { useState } from 'react';
import {
  ImageBackground,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { LampaDetail } from '@/api/catalog';
import { DetailLibraryActions } from '@/components/library/DetailLibraryActions';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import type { UserListStatus } from '@/lib/libraryStatus';
import {
  buildLampaHeroInfoRows,
  lampaAltTitle,
  lampaBackdrop,
  lampaGenreNames,
  lampaKindLabel,
  lampaRating,
  lampaStatus,
  lampaTitle,
  lampaYear,
  localizedLampaStatus,
} from '@/lib/lampaDetail';
import { lampaPosterPath } from '@/lib/poster';
import type { CollectionItemInput } from '@/types/collection';
import { isTvUi } from '@/lib/isTvUi';

const HERO_OVERVIEW_LIMIT = 260;

interface LampaDetailHeroProps {
  detail: LampaDetail;
  kind: string;
  isSerial: boolean;
  hasHistory: boolean;
  lastSeason: number;
  lastEpisode: number;
  lastProgress: number;
  userStatus?: string;
  isFavorite?: boolean;
  libraryDisabled?: boolean;
  collectionItem?: CollectionItemInput | null;
  onWatch: () => void;
  onOpenSources?: () => void;
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

export function LampaDetailHero({
  detail,
  kind,
  isSerial,
  hasHistory,
  lastSeason,
  lastEpisode,
  lastProgress,
  userStatus,
  isFavorite,
  libraryDisabled,
  collectionItem,
  onWatch,
  onOpenSources,
  onStatusChange,
  onToggleFavorite,
}: LampaDetailHeroProps) {
  const tv = isTvUi();
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const title = lampaTitle(detail);
  const alt = lampaAltTitle(detail);
  const year = lampaYear(detail);
  const rating = lampaRating(detail);
  const kindLabel = lampaKindLabel(kind);
  const statusLabel = lampaStatus(detail)
    ? localizedLampaStatus(lampaStatus(detail))
    : undefined;
  const backdrop = lampaBackdrop(detail, tv ? 'original' : 'w780');
  const genres = lampaGenreNames(detail.genres).slice(0, 4);
  const infoRows = buildLampaHeroInfoRows(detail, isSerial);
  const overview = (detail.overview ?? detail.description ?? '').trim();
  const truncated = truncateOverview(overview, HERO_OVERVIEW_LIMIT);
  const overviewText =
    overviewExpanded || !truncated.needsExpand ? overview : truncated.text;

  const playLabel = hasHistory ? 'Продолжить просмотр' : 'Смотреть сейчас';
  const playHint =
    hasHistory && isSerial
      ? lastProgress > 0 && lastProgress < 1
        ? `S${lastSeason} · E${lastEpisode} · ${Math.round(lastProgress * 100)}%`
        : `S${lastSeason} · E${lastEpisode}`
      : undefined;

  const library = (
    <DetailLibraryActions
      userStatus={userStatus}
      isFavorite={isFavorite}
      disabled={libraryDisabled}
      collectionItem={
        collectionItem ?? {
          mediaType: 'lampa',
          mediaId: `${kind === 'home' ? 'tv' : kind}:${detail.id ?? ''}`,
          title: title || undefined,
          poster: lampaPosterPath(detail),
        }
      }
      onStatusChange={onStatusChange}
      onToggleFavorite={onToggleFavorite}
      extraActions={
        isSerial && onOpenSources ? (
          <TvFocusable onPress={onOpenSources} style={styles.iconBtn}>
            <Text style={styles.iconLabel}>⧉</Text>
          </TvFocusable>
        ) : null
      }
    />
  );

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
        {kindLabel ? (
          <View style={[styles.pill, styles.pillAccent]}>
            <Text style={[styles.pillText, styles.pillAccentText]}>{kindLabel}</Text>
          </View>
        ) : null}
        {genres.map((genre) => (
          <View key={genre} style={styles.pill}>
            <Text style={styles.pillText}>{genre}</Text>
          </View>
        ))}
        {year != null ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{year}</Text>
          </View>
        ) : null}
        {rating != null ? (
          <View style={[styles.pill, styles.pillRating]}>
            <Text style={styles.pillText}>
              <Text style={styles.star}>★ </Text>
              {rating.toFixed(1)}
            </Text>
          </View>
        ) : null}
        {statusLabel ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{statusLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <TvFocusable
          onPress={onWatch}
          hasTVPreferredFocus={tv}
          contentEntry={tv}
          railStart={tv}
          style={styles.playBtn}
        >
          <Text style={styles.playLabel}>▶ {playLabel}</Text>
          {playHint ? <Text style={styles.playHint}>{playHint}</Text> : null}
        </TvFocusable>
        {library}
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
                <Text style={styles.infoValue} numberOfLines={2}>
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
      {/* Soft side wash so text stays readable */}
      <LinearGradient
        colors={['rgba(19,18,27,0.75)', 'rgba(19,18,27,0.2)', 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 0.55, y: 0.5 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {/* Bottom dissolve into page background / plot */}
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
    // Cancel ScrollView content padding — full-bleed top + sides.
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
  playLabel: {
    color: colors.text,
    fontSize: isTvUi() ? 16 : 15,
    fontWeight: '700',
  },
  playHint: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  iconLabel: {
    color: colors.text,
    fontSize: 18,
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
