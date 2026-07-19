import { useEffect, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import type { PlayerEpisodeNav, PlayerMenuOption } from '@/components/player/types';
import type { TvPlayerOverlay } from '@/components/player/tv/tvPlayerTypes';
import { colors, spacing } from '@/constants/aniverse';
import {
  formatPlaybackRate,
  videoFitLabel,
  type PlayerPreferences,
} from '@/lib/playerPreferences';

interface TvPlayerOverlaysProps {
  overlay: TvPlayerOverlay;
  overlayFocusIndex: number;
  dubbingOptions?: PlayerMenuOption[];
  qualityOptions?: PlayerMenuOption[];
  connectionOptions?: PlayerMenuOption[];
  deliveryOptions?: PlayerMenuOption[];
  episodeNav?: PlayerEpisodeNav;
  prefs: PlayerPreferences;
  onClose: () => void;
  onSelectMenuOption: (option: PlayerMenuOption) => void;
  onSelectEpisode: (episodeId: number) => void;
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

export function TvPlayerOverlays({
  overlay,
  overlayFocusIndex,
  dubbingOptions,
  qualityOptions,
  connectionOptions,
  deliveryOptions,
  episodeNav,
  prefs,
  onClose,
  onSelectMenuOption,
  onSelectEpisode,
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
      <OverlayShell
        title="Эпизоды"
        onClose={onClose}
        focusIndex={overlayFocusIndex}
        items={episodeNav.items.map((item) => ({
          key: String(item.id),
          label: item.label,
          selected: item.id === episodeNav.currentEpisodeId,
          onPress: () => onSelectEpisode(item.id),
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
        label: `Авто OP · ${prefs.autoSkipOpening ? 'Вкл' : 'Выкл'}`,
      },
      {
        id: 'skip_end' as const,
        label: `Авто ED · ${prefs.autoSkipEnding ? 'Вкл' : 'Выкл'}`,
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
});
