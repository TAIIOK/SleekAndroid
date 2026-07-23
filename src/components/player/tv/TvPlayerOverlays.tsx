import { Image } from 'expo-image';
import { useEffect, useMemo, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import type {
  PlayerEpisodeNav,
  PlayerEpisodeNavItem,
  PlayerMenuOption,
} from '@/components/player/types';
import type { TvPlayerOverlay } from '@/components/player/tv/tvPlayerTypes';
import { colors, spacing } from '@/constants/aniverse';
import type { ExternalPlayerTarget } from '@/lib/externalPlayer';
import {
  formatPlaybackRate,
  videoFitLabel,
  type PlayerPreferences,
} from '@/lib/playerPreferences';
import { subtitleTrackLabel, type SubtitleTrackInfo } from '@/lib/subtitleTracks';

interface TvPlayerOverlaysProps {
  overlay: TvPlayerOverlay;
  overlayFocusIndex: number;
  dubbingOptions?: PlayerMenuOption[];
  qualityOptions?: PlayerMenuOption[];
  connectionOptions?: PlayerMenuOption[];
  deliveryOptions?: PlayerMenuOption[];
  episodeNav?: PlayerEpisodeNav;
  subtitleTracks?: SubtitleTrackInfo[];
  activeSubtitle?: SubtitleTrackInfo | null;
  externalPlayers?: ExternalPlayerTarget[];
  prefs: PlayerPreferences;
  onClose: () => void;
  onSelectMenuOption: (option: PlayerMenuOption) => void;
  onSelectEpisode: (episodeId: number) => void;
  onSelectSubtitle: (track: SubtitleTrackInfo | null) => void;
  onSelectExternalPlayer?: (target: ExternalPlayerTarget) => void;
  onSettingsAction: (action: 'rate' | 'fit' | 'autonext' | 'skip_open' | 'skip_end') => void;
}

const OVERLAY_HEADER_HEIGHT = 96;
const LIST_PADDING_TOP = spacing.lg;
const LIST_PADDING_BOTTOM = spacing.xxl;
/** Fixed row box — must match `styles.row` height. */
const ROW_HEIGHT = 56;
const ROW_GAP = spacing.sm;
const ROW_STRIDE = ROW_HEIGHT + ROW_GAP;

type OverlayListItem = {
  key: string;
  label: string;
  selected?: boolean;
  onPress: () => void;
};

function rowTopForIndex(index: number): number {
  return LIST_PADDING_TOP + index * ROW_STRIDE;
}

function OverlayShell({
  title,
  onClose,
  focusIndex,
  items,
}: {
  title: string;
  onClose: () => void;
  focusIndex: number;
  items: OverlayListItem[];
}) {
  const { height: windowHeight } = useWindowDimensions();
  const listHeight = Math.max(200, windowHeight - OVERLAY_HEADER_HEIGHT);

  const scrollRef = useRef<ScrollView>(null);
  /** Owned scroll position — do not sync from onScroll (avoids feedback jerks). */
  const scrollYRef = useRef(0);

  useEffect(() => {
    if (focusIndex < 0 || focusIndex >= items.length) return;

    const rowTop = rowTopForIndex(focusIndex);
    const rowBottom = rowTop + ROW_HEIGHT;
    const scrollY = scrollYRef.current;
    const viewTop = scrollY;
    const viewBottom = scrollY + listHeight;

    let nextY = scrollY;
    if (rowBottom > viewBottom) {
      nextY = rowBottom - listHeight;
    } else if (rowTop < viewTop) {
      nextY = rowTop;
    } else {
      return;
    }

    nextY = Math.max(0, nextY);
    if (nextY === scrollY) return;

    scrollYRef.current = nextY;
    scrollRef.current?.scrollTo({ y: nextY, animated: false });
  }, [focusIndex, items.length, listHeight]);

  return (
    <View style={styles.overlay}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <Pressable focusable={false} onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
      <ScrollView
        ref={scrollRef}
        style={{ height: listHeight }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        // Remote owns scrolling; disable touch drag fighting software focus.
        scrollEnabled={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Spacer keeps padding out of row math (paddingTop breaks index→y). */}
        <View style={{ height: LIST_PADDING_TOP }} />
        {items.map((item, index) => (
          <View key={item.key} style={styles.rowWrap}>
            <OptionRow
              label={item.label}
              selected={item.selected}
              focused={index === focusIndex}
              onPress={item.onPress}
            />
          </View>
        ))}
        <View style={{ height: LIST_PADDING_BOTTOM }} />
      </ScrollView>
    </View>
  );
}

function OptionRow({
  label,
  selected,
  focused,
  onPress,
}: {
  label: string;
  selected?: boolean;
  focused: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      focusable={false}
      onPress={onPress}
      style={[styles.row, selected && styles.rowSelected, focused && styles.rowFocused]}
    >
      <Text style={styles.rowLabel} numberOfLines={1}>{label}</Text>
      {selected ? <Text style={styles.check}>✓</Text> : null}
    </Pressable>
  );
}

function toMenuItems(
  options: PlayerMenuOption[],
  onSelect: (option: PlayerMenuOption) => void,
): OverlayListItem[] {
  return options.map((option) => ({
    key: option.id,
    label: option.label,
    selected: option.selected,
    onPress: () => onSelect(option),
  }));
}

type EpisodeSection = {
  season?: number;
  items: { item: PlayerEpisodeNav['items'][number]; index: number }[];
};

function buildEpisodeSections(items: PlayerEpisodeNav['items']): EpisodeSection[] {
  const seasons = new Set<number>();
  for (const item of items) {
    if (item.season != null) seasons.add(item.season);
  }

  if (seasons.size <= 1) {
    return [
      {
        season: seasons.size === 1 ? [...seasons][0] : undefined,
        items: items.map((item, index) => ({ item, index })),
      },
    ];
  }

  const bySeason = new Map<number, { item: PlayerEpisodeNav['items'][number]; index: number }[]>();
  items.forEach((item, index) => {
    const season = item.season ?? 0;
    const list = bySeason.get(season) ?? [];
    list.push({ item, index });
    bySeason.set(season, list);
  });

  return [...bySeason.entries()]
    .sort(([a], [b]) => a - b)
    .map(([season, sectionItems]) => ({ season, items: sectionItems }));
}

const SEASON_HEADER_HEIGHT = 40;
const EPISODE_CARD_HEIGHT = 110;
const EPISODE_CARD_GAP = spacing.sm;
const EPISODE_CARD_STRIDE = EPISODE_CARD_HEIGHT + EPISODE_CARD_GAP;
const EPISODES_PANEL_WIDTH = 520;

type EpisodeRenderEntry =
  | { kind: 'header'; key: string; title: string; height: number }
  | {
      kind: 'episode';
      key: string;
      focusIndex: number;
      item: PlayerEpisodeNavItem;
      selected: boolean;
      onPress: () => void;
      height: number;
    };

function formatEpisodeDuration(sec?: number): string | undefined {
  if (sec == null || sec <= 0) return undefined;
  const minutes = Math.round(sec / 60);
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

function buildEpisodeRenderEntries(
  episodeNav: PlayerEpisodeNav,
  onSelectEpisode: (episodeId: number) => void,
): EpisodeRenderEntry[] {
  const sections = buildEpisodeSections(episodeNav.items);
  const showSeasonHeaders = sections.length > 1;
  const entries: EpisodeRenderEntry[] = [];

  for (const section of sections) {
    if (showSeasonHeaders && section.season != null) {
      entries.push({
        kind: 'header',
        key: `season-${section.season}`,
        title: `Сезон ${section.season}`,
        height: SEASON_HEADER_HEIGHT,
      });
    }
    for (const { item, index } of section.items) {
      entries.push({
        kind: 'episode',
        key: String(item.id),
        focusIndex: index,
        item,
        selected: item.id === episodeNav.currentEpisodeId,
        onPress: () => onSelectEpisode(item.id),
        height: EPISODE_CARD_STRIDE,
      });
    }
  }
  return entries;
}

function NetflixEpisodeCard({
  item,
  selected,
  focused,
  onPress,
  showSeasonPrefix,
}: {
  item: PlayerEpisodeNavItem;
  selected: boolean;
  focused: boolean;
  onPress: () => void;
  showSeasonPrefix: boolean;
}) {
  const epNum = item.number ?? 0;
  const duration = formatEpisodeDuration(item.durationSec);
  const progress = Math.min(1, Math.max(0, item.progress ?? 0));
  const watched = progress >= 0.98;
  const progressPct = watched ? 100 : Math.round(progress * 100);
  const title = item.title?.trim() || item.label;
  const metaParts = [
    showSeasonPrefix && item.season != null ? `S${item.season}E${epNum}` : `Эп. ${epNum}`,
    duration,
    selected ? 'Сейчас' : undefined,
  ].filter(Boolean);

  return (
    <Pressable
      focusable={false}
      onPress={onPress}
      style={[
        styles.epCard,
        selected && styles.epCardSelected,
        focused && styles.epCardFocused,
      ]}
    >
      <View style={styles.epThumbWrap}>
        {item.thumbnail ? (
          <Image
            source={{ uri: item.thumbnail }}
            style={styles.epThumb}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.epThumb, styles.epThumbFallback]}>
            <Text style={styles.epThumbFallbackText}>{epNum || '▶'}</Text>
          </View>
        )}
        {progressPct > 0 ? (
          <View style={styles.epProgressTrack}>
            <View style={[styles.epProgressFill, { width: `${progressPct}%` }]} />
          </View>
        ) : null}
        {watched ? (
          <View style={styles.epWatchedBadge}>
            <Text style={styles.epWatchedText}>✓</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.epMeta}>
        <Text style={styles.epMetaLine} numberOfLines={1}>
          {metaParts.join(' · ')}
        </Text>
        <Text style={styles.epTitle} numberOfLines={1}>
          {title}
        </Text>
        {item.overview?.trim() ? (
          <Text style={styles.epOverview} numberOfLines={2}>
            {item.overview.trim()}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function EpisodesOverlayShell({
  episodeNav,
  focusIndex,
  onClose,
  onSelectEpisode,
}: {
  episodeNav: PlayerEpisodeNav;
  focusIndex: number;
  onClose: () => void;
  onSelectEpisode: (episodeId: number) => void;
}) {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const panelWidth = Math.min(EPISODES_PANEL_WIDTH, Math.max(380, Math.round(windowWidth * 0.42)));
  const listHeight = Math.max(200, windowHeight - OVERLAY_HEADER_HEIGHT);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const entries = useMemo(
    () => buildEpisodeRenderEntries(episodeNav, onSelectEpisode),
    [episodeNav, onSelectEpisode],
  );
  const multiSeason = buildEpisodeSections(episodeNav.items).length > 1;

  useEffect(() => {
    let offset = LIST_PADDING_TOP;
    let targetTop: number | null = null;
    let targetBottom: number | null = null;
    for (const entry of entries) {
      if (entry.kind === 'episode' && entry.focusIndex === focusIndex) {
        targetTop = offset;
        targetBottom = offset + EPISODE_CARD_HEIGHT;
        break;
      }
      offset += entry.height;
    }
    if (targetTop == null || targetBottom == null) return;

    const scrollY = scrollYRef.current;
    const viewTop = scrollY;
    const viewBottom = scrollY + listHeight;
    let nextY = scrollY;
    if (targetBottom > viewBottom) nextY = targetBottom - listHeight;
    else if (targetTop < viewTop) nextY = targetTop;
    else return;

    nextY = Math.max(0, nextY);
    if (nextY === scrollY) return;
    scrollYRef.current = nextY;
    scrollRef.current?.scrollTo({ y: nextY, animated: false });
  }, [entries, focusIndex, listHeight]);

  return (
    <View style={styles.episodesRoot} pointerEvents="box-none">
      <Pressable
        focusable={false}
        onPress={onClose}
        style={styles.episodesScrim}
        accessibilityLabel="Закрыть эпизоды"
      />
      <View style={[styles.episodesPanel, { width: panelWidth }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Эпизоды
          </Text>
          <Pressable focusable={false} onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
        <ScrollView
          ref={scrollRef}
          style={{ height: listHeight }}
          contentContainerStyle={styles.episodesList}
          showsVerticalScrollIndicator={false}
          scrollEnabled={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ height: LIST_PADDING_TOP }} />
          {entries.map((entry) => {
            if (entry.kind === 'header') {
              return (
                <View key={entry.key} style={styles.seasonHeader}>
                  <Text style={styles.seasonHeaderText}>{entry.title}</Text>
                </View>
              );
            }
            return (
              <View key={entry.key} style={styles.epCardWrap}>
                <NetflixEpisodeCard
                  item={entry.item}
                  selected={entry.selected}
                  focused={entry.focusIndex === focusIndex}
                  onPress={entry.onPress}
                  showSeasonPrefix={multiSeason}
                />
              </View>
            );
          })}
          <View style={{ height: LIST_PADDING_BOTTOM }} />
        </ScrollView>
      </View>
    </View>
  );
}

export function TvPlayerOverlays({
  overlay,
  overlayFocusIndex,
  dubbingOptions,
  qualityOptions,
  connectionOptions,
  deliveryOptions,
  episodeNav,
  subtitleTracks = [],
  activeSubtitle,
  externalPlayers = [],
  prefs,
  onClose,
  onSelectMenuOption,
  onSelectEpisode,
  onSelectSubtitle,
  onSelectExternalPlayer,
  onSettingsAction,
}: TvPlayerOverlaysProps) {
  if (!overlay) return null;

  if (overlay === 'dubbing' && dubbingOptions?.length) {
    return (
      <OverlayShell
        title="Озвучка"
        onClose={onClose}
        focusIndex={overlayFocusIndex}
        items={toMenuItems(dubbingOptions, onSelectMenuOption)}
      />
    );
  }

  if (overlay === 'quality' && qualityOptions?.length) {
    return (
      <OverlayShell
        title="Качество"
        onClose={onClose}
        focusIndex={overlayFocusIndex}
        items={toMenuItems(qualityOptions, onSelectMenuOption)}
      />
    );
  }

  if (overlay === 'connection' && connectionOptions?.length) {
    return (
      <OverlayShell
        title="Подключение"
        onClose={onClose}
        focusIndex={overlayFocusIndex}
        items={toMenuItems(connectionOptions, onSelectMenuOption)}
      />
    );
  }

  if (overlay === 'delivery' && deliveryOptions?.length) {
    return (
      <OverlayShell
        title="Тип потока"
        onClose={onClose}
        focusIndex={overlayFocusIndex}
        items={toMenuItems(deliveryOptions, onSelectMenuOption)}
      />
    );
  }

  if (overlay === 'episodes' && episodeNav?.items.length) {
    return (
      <EpisodesOverlayShell
        episodeNav={episodeNav}
        focusIndex={overlayFocusIndex}
        onClose={onClose}
        onSelectEpisode={onSelectEpisode}
      />
    );
  }

  if (overlay === 'subtitles' && subtitleTracks.length) {
    return (
      <OverlayShell
        title="Субтитры"
        onClose={onClose}
        focusIndex={overlayFocusIndex}
        items={[
          {
            key: 'off',
            label: 'Выкл',
            selected: !activeSubtitle,
            onPress: () => onSelectSubtitle(null),
          },
          ...subtitleTracks.map((track, index) => ({
            key: track.id ?? `${track.language}-${index}`,
            label: subtitleTrackLabel(track),
            selected:
              !!activeSubtitle &&
              activeSubtitle.language === track.language &&
              activeSubtitle.label === track.label,
            onPress: () => onSelectSubtitle(track),
          })),
        ]}
      />
    );
  }

  if (overlay === 'external' && externalPlayers.length) {
    return (
      <OverlayShell
        title="Внешний плеер"
        onClose={onClose}
        focusIndex={overlayFocusIndex}
        items={externalPlayers.map((target) => ({
          key: target.id,
          label: target.label,
          selected:
            (target.packageName ?? '') === (prefs.lastExternalPlayerPackage ?? '') ||
            (target.id === 'system' && !prefs.lastExternalPlayerPackage),
          onPress: () => onSelectExternalPlayer?.(target),
        }))}
      />
    );
  }

  if (overlay === 'settings') {
    const settings = [
      {
        id: 'rate' as const,
        label: `Скорость · ${formatPlaybackRate(prefs.playbackRate)}`,
      },
      {
        id: 'fit' as const,
        label: `Масштаб · ${videoFitLabel(prefs.videoFit)}`,
      },
      {
        id: 'autonext' as const,
        label: `Автослед. · ${prefs.autoPlayNext ? 'Вкл' : 'Выкл'}`,
      },
      {
        id: 'skip_open' as const,
        label: `Автопропуск интро · ${prefs.autoSkipOpening ? 'Вкл' : 'Выкл'}`,
      },
      {
        id: 'skip_end' as const,
        label: `Автопропуск титров · ${prefs.autoSkipEnding ? 'Вкл' : 'Выкл'}`,
      },
    ];

    return (
      <OverlayShell
        title="Настройки"
        onClose={onClose}
        focusIndex={overlayFocusIndex}
        items={settings.map((item) => ({
          key: item.id,
          label: item.label,
          onPress: () => onSettingsAction(item.id),
        }))}
      />
    );
  }

  return null;
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
    elevation: 50,
    backgroundColor: 'rgba(0,0,0,0.88)',
  },
  header: {
    height: OVERLAY_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    flex: 1,
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
  },
  closeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  closeText: { color: colors.text, fontSize: 20 },
  listContent: {
    paddingHorizontal: spacing.xxl,
  },
  rowWrap: {
    height: ROW_STRIDE,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  rowSelected: {
    borderColor: 'rgba(195,192,255,0.5)',
    backgroundColor: 'rgba(79,70,229,0.35)',
  },
  rowFocused: {
    borderColor: colors.brand,
  },
  rowLabel: { flex: 1, color: colors.text, fontSize: 20, fontWeight: '600' },
  check: { marginLeft: spacing.md, color: colors.brand, fontSize: 22, fontWeight: '700' },
  seasonHeader: {
    height: SEASON_HEADER_HEIGHT,
    justifyContent: 'center',
    paddingBottom: 4,
  },
  seasonHeaderText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  episodesRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    elevation: 50,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  episodesScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  episodesPanel: {
    height: '100%',
    backgroundColor: 'rgba(12,12,18,0.96)',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(255,255,255,0.08)',
    zIndex: 1,
  },
  episodesList: {
    paddingHorizontal: spacing.lg,
  },
  epCardWrap: {
    height: EPISODE_CARD_STRIDE,
  },
  epCard: {
    height: EPISODE_CARD_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  epCardSelected: {
    backgroundColor: 'rgba(79,70,229,0.22)',
  },
  epCardFocused: {
    borderColor: colors.brand,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  epThumbWrap: {
    width: 168,
    height: 94,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(0,0,0,0.45)',
    position: 'relative',
  },
  epThumb: {
    width: '100%',
    height: '100%',
  },
  epThumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  epThumbFallbackText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 22,
    fontWeight: '700',
  },
  epProgressTrack: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  epProgressFill: {
    height: '100%',
    backgroundColor: colors.brand,
  },
  epWatchedBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  epWatchedText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: '700',
  },
  epMeta: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    paddingRight: spacing.xs,
  },
  epMetaLine: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    fontWeight: '600',
  },
  epTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  epOverview: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 13,
    lineHeight: 18,
  },
});
