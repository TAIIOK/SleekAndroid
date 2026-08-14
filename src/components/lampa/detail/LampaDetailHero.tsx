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
import { useCreatePartyFromLampa } from '@/hooks/useCreatePartyFromLampa';
import type { UserListStatus } from '@/lib/libraryStatus';
import { resolveLampaTmdbId } from '@/lib/lampaDetail';
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
  const { createParty, creating: creatingParty } = useCreatePartyFromLampa();
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const title = lampaTitle(detail);
  const alt = lampaAltTitle(detail);
  const year = lampaYear(detail);
  const rating = lampaRating(detail);
  const kindLabel = lampaKindLabel(kind);
  const statusLabel = lampaStatus(detail)
    ? localizedLampaStatus(lampaStatus(detail))
    : undefined;
  const backdrop = lampaBackdrop(detail, 'w780');
  const genres = lampaGenreNames(detail.genres).slice(0, 4);
  const infoRows = buildLampaHeroInfoRows(detail, isSerial);
  const overview = (detail.overview ?? detail.description ?? '').trim();
  const truncated = truncateOverview(overview, HERO_OVERVIEW_LIMIT);
  const overviewText =
    overviewExpanded || !truncated.needsExpand ? overview : truncated.text;

  const playLabel = hasHistory ? 'Продолжить' : 'Смотреть сейчас';
  const playHint =
    hasHistory && isSerial
      ? lastProgress > 0 && lastProgress < 1
        ? `S${lastSeason} · E${lastEpisode} · ${Math.round(lastProgress * 100)}%`
        : `S${lastSeason} · E${lastEpisode}`
      : undefined;

  const mediaKind = kind === 'home' || kind === 'tv' ? 'tv' : 'movie';
  const tmdbId = resolveLampaTmdbId(detail, String(detail.id ?? ''));

  const library = (
    <DetailLibraryActions
      userStatus={userStatus}
      isFavorite={isFavorite}
      disabled={libraryDisabled}
      collectionItem={
        collectionItem ?? {
          mediaType: 'lampa',
          mediaId: `${mediaKind}:${detail.id ?? ''}`,
          title: title || undefined,
          poster: lampaPosterPath(detail),
        }
      }
      onStatusChange={onStatusChange}
      onToggleFavorite={onToggleFavorite}
      extraActions={
        tmdbId ? (
          <TvFocusable
            disabled={creatingParty || libraryDisabled}
            onPress={() =>
              createParty({
                tmdbId,
                kind: mediaKind,
                title,
                poster: lampaPosterPath(detail),
                season: isSerial ? lastSeason : undefined,
                episode: isSerial ? lastEpisode : undefined,
              })
            }
            style={styles.extraBtn}
          >
            <Text style={styles.extraLabel}>{creatingParty ? '…' : '👥'}</Text>
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
        <View
          style={[
            styles.watchRow,
            hasHistory && onOpenSources ? styles.watchRowSplit : styles.watchRowSolo,
          ]}
        >
          <TvFocusable
            onPress={onWatch}
            hasTVPreferredFocus={tv}
            contentEntry={tv}
            railStart={tv}
            style={[
              styles.playBtn,
              hasHistory && onOpenSources ? styles.playBtnCompact : styles.playBtnSolo,
            ]}
          >
            <Text style={styles.playLabel} numberOfLines={1}>
              ▶ {playLabel}
            </Text>
            {playHint ? (
              <Text style={styles.playHint} numberOfLines={1}>
                {playHint}
              </Text>
            ) : null}
          </TvFocusable>
          {hasHistory && onOpenSources ? (
            <TvFocusable onPress={onOpenSources} style={styles.sourcesBtn}>
              <Text style={styles.sourcesLabel} numberOfLines={1}>
                Выбрать источник
              </Text>
            </TvFocusable>
          ) : null}
        </View>
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
      {!tv ? (
        <LinearGradient
          colors={[
            'rgba(0,0,0,0.35)',
            'rgba(19,18,27,0.55)',
            'rgba(19,18,27,0.82)',
            colors.bg,
          ]}
          locations={[0, 0.35, 0.72, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : (
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
        </>
      )}

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
    paddingTop: isTvUi() ? spacing.xxl : spacing.sm,
    paddingBottom: isTvUi() ? spacing.xl : spacing.sm,
    gap: isTvUi() ? spacing.md : spacing.sm,
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
    gap: isTvUi() ? spacing.sm : 6,
    justifyContent: 'flex-start',
    // Match anime detail — clear floating back button / status bar on phone.
    paddingTop: isTvUi() ? 0 : 120,
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
    color: '#fff',
    fontSize: isTvUi() ? 36 : 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  alt: {
    color: 'rgba(255,255,255,0.9)',
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
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  pillAccent: {
    backgroundColor: colors.brandAccent,
    borderColor: 'transparent',
  },
  pillRating: {
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  pillText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  pillAccentText: {
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontSize: 11,
  },
  star: {
    color: colors.brand,
  },
  actions: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  watchRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
    width: '100%',
  },
  watchRowSplit: {
    flexWrap: 'nowrap',
  },
  watchRowSolo: {
    flexWrap: 'wrap',
  },
  playBtn: {
    backgroundColor: colors.brandAccent,
    borderRadius: isTvUi() ? 14 : 12,
    paddingVertical: isTvUi() ? 14 : 11,
    gap: 2,
    justifyContent: 'center',
  },
  playBtnCompact: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
    paddingHorizontal: isTvUi() ? spacing.lg : spacing.md,
  },
  playBtnSolo: {
    minWidth: isTvUi() ? 220 : 168,
    paddingHorizontal: isTvUi() ? spacing.xl : spacing.lg,
  },
  playLabel: {
    color: '#fff',
    fontSize: isTvUi() ? 16 : 14,
    fontWeight: '700',
  },
  playHint: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: isTvUi() ? 11 : 10,
  },
  sourcesBtn: {
    flexShrink: 0,
    borderRadius: isTvUi() ? 14 : 12,
    paddingHorizontal: isTvUi() ? spacing.lg : 12,
    paddingVertical: isTvUi() ? 14 : 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  sourcesLabel: {
    color: '#fff',
    fontSize: isTvUi() ? 15 : 13,
    fontWeight: '700',
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
  extraBtn: {
    width: isTvUi() ? 48 : 38,
    height: isTvUi() ? 48 : 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  extraLabel: {
    color: colors.brand,
    fontSize: isTvUi() ? 18 : 16,
  },
});
