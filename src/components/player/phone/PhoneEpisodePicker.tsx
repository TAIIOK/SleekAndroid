import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { PlayerEpisodeNav } from '@/components/player/types';
import { colors, spacing } from '@/constants/aniverse';
import { buildEpisodeSections } from '@/lib/playerEpisodeSections';

const COLS = 5;
const GAP = 8;
const TILE_HEIGHT = 44;
const SECTION_GAP = 20;
const SEASON_HEADER_HEIGHT = 28;

function episodeCountLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} эпизод`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} эпизода`;
  return `${count} эпизодов`;
}

function estimateCurrentOffset(
  sections: ReturnType<typeof buildEpisodeSections>,
  currentEpisodeId?: number,
): number {
  const showHeaders = sections.length > 1;
  let y = 0;
  for (const section of sections) {
    if (showHeaders && section.season != null) y += SEASON_HEADER_HEIGHT;
    const idx = section.items.findIndex(({ item }) => item.id === currentEpisodeId);
    if (idx >= 0) {
      const row = Math.floor(idx / COLS);
      return y + row * (TILE_HEIGHT + GAP);
    }
    const rows = Math.ceil(section.items.length / COLS);
    y += rows * (TILE_HEIGHT + GAP) + SECTION_GAP;
  }
  return 0;
}

export function PhoneEpisodePicker({
  episodeNav,
  bottomInset,
  onSelect,
  onClose,
}: {
  episodeNav: PlayerEpisodeNav;
  bottomInset: number;
  onSelect: (episodeId: number) => void;
  onClose: () => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const sections = useMemo(
    () => buildEpisodeSections(episodeNav.items),
    [episodeNav.items],
  );
  const showSeasonHeaders = sections.length > 1;
  const currentItem = episodeNav.items.find(
    (item) => item.id === episodeNav.currentEpisodeId,
  );
  const tileWidth =
    gridWidth > 0 ? (gridWidth - GAP * (COLS - 1)) / COLS : undefined;

  useEffect(() => {
    const y = estimateCurrentOffset(sections, episodeNav.currentEpisodeId);
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: false });
    });
  }, [episodeNav.currentEpisodeId, sections]);

  return (
    <Pressable
      style={[styles.sheet, { paddingBottom: bottomInset + 16 }]}
      onPress={() => undefined}
    >
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Эпизоды</Text>
          <Text style={styles.count}>{episodeCountLabel(episodeNav.items.length)}</Text>
        </View>
        <Pressable
          onPress={onClose}
          style={styles.closeBtn}
          accessibilityLabel="Закрыть"
          hitSlop={8}
        >
          <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
        </Pressable>
      </View>

      {currentItem ? (
        <View style={styles.caption}>
          <Text style={styles.captionText} numberOfLines={1}>
            {currentItem.label}
          </Text>
        </View>
      ) : null}

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View
          style={styles.sections}
          onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
        >
          {sections.map((section) => (
            <View key={section.season ?? 'all'} style={styles.section}>
              {showSeasonHeaders && section.season != null ? (
                <Text style={styles.seasonHeader}>Сезон {section.season}</Text>
              ) : null}
              <View style={styles.grid}>
                {section.items.map(({ item, index }) => {
                  const isCurrent = item.id === episodeNav.currentEpisodeId;
                  const displayNumber = item.number ?? index + 1;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        onSelect(item.id);
                        onClose();
                      }}
                      accessibilityLabel={item.label}
                      accessibilityState={{ selected: isCurrent }}
                      style={[
                        styles.tile,
                        tileWidth != null ? { width: tileWidth } : styles.tileFallback,
                        isCurrent && styles.tileCurrent,
                      ]}
                    >
                      <Text style={[styles.tileNumber, isCurrent && styles.tileNumberCurrent]}>
                        {displayNumber}
                      </Text>
                      {isCurrent ? <Text style={styles.nowLabel}>Сейчас</Text> : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: {
    maxHeight: '75%',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: colors.bgCard,
    paddingTop: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    borderBottomWidth: 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  headerText: { flex: 1, minWidth: 0 },
  title: { color: '#fff', fontSize: 17, fontWeight: '700' },
  count: { color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  caption: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  captionText: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  scroll: { maxHeight: 420 },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  sections: { gap: SECTION_GAP },
  section: { gap: 10 },
  seasonHeader: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
  },
  tile: {
    height: TILE_HEIGHT,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  tileFallback: { width: '18%' },
  tileCurrent: {
    borderColor: colors.brand,
    backgroundColor: 'rgba(195,192,255,0.2)',
  },
  tileNumber: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  tileNumberCurrent: { color: colors.brand },
  nowLabel: {
    color: colors.brand,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 1,
  },
});
