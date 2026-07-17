import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

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

function OverlayShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.overlay}>
      <View style={styles.header}>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.list}>{children}</ScrollView>
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
      onPress={onPress}
      style={[styles.row, selected && styles.rowSelected, focused && styles.rowFocused]}
    >
      <Text style={styles.rowLabel} numberOfLines={1}>{label}</Text>
      {selected ? <Text style={styles.check}>✓</Text> : null}
    </Pressable>
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
  prefs,
  onClose,
  onSelectMenuOption,
  onSelectEpisode,
  onSettingsAction,
}: TvPlayerOverlaysProps) {
  if (!overlay) return null;

  if (overlay === 'dubbing' && dubbingOptions?.length) {
    return (
      <OverlayShell title="Озвучка" onClose={onClose}>
        {dubbingOptions.map((option, index) => (
          <OptionRow
            key={option.id}
            label={option.label}
            selected={option.selected}
            focused={index === overlayFocusIndex}
            onPress={() => onSelectMenuOption(option)}
          />
        ))}
      </OverlayShell>
    );
  }

  if (overlay === 'quality' && qualityOptions?.length) {
    return (
      <OverlayShell title="Качество" onClose={onClose}>
        {qualityOptions.map((option, index) => (
          <OptionRow
            key={option.id}
            label={option.label}
            selected={option.selected}
            focused={index === overlayFocusIndex}
            onPress={() => onSelectMenuOption(option)}
          />
        ))}
      </OverlayShell>
    );
  }

  if (overlay === 'connection' && connectionOptions?.length) {
    return (
      <OverlayShell title="Подключение" onClose={onClose}>
        {connectionOptions.map((option, index) => (
          <OptionRow
            key={option.id}
            label={option.label}
            selected={option.selected}
            focused={index === overlayFocusIndex}
            onPress={() => onSelectMenuOption(option)}
          />
        ))}
      </OverlayShell>
    );
  }

  if (overlay === 'delivery' && deliveryOptions?.length) {
    return (
      <OverlayShell title="Тип потока" onClose={onClose}>
        {deliveryOptions.map((option, index) => (
          <OptionRow
            key={option.id}
            label={option.label}
            selected={option.selected}
            focused={index === overlayFocusIndex}
            onPress={() => onSelectMenuOption(option)}
          />
        ))}
      </OverlayShell>
    );
  }

  if (overlay === 'episodes' && episodeNav?.items.length) {
    return (
      <OverlayShell title="Эпизоды" onClose={onClose}>
        {episodeNav.items.map((item, index) => (
          <OptionRow
            key={item.id}
            label={item.label}
            selected={item.id === episodeNav.currentEpisodeId}
            focused={index === overlayFocusIndex}
            onPress={() => onSelectEpisode(item.id)}
          />
        ))}
      </OverlayShell>
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
      <OverlayShell title="Настройки" onClose={onClose}>
        {settings.map((item, index) => (
          <OptionRow
            key={item.id}
            label={item.label}
            focused={index === overlayFocusIndex}
            onPress={() => onSettingsAction(item.id)}
          />
        ))}
      </OverlayShell>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 50,
    backgroundColor: 'rgba(0,0,0,0.88)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
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
  list: {
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  rowSelected: {
    borderColor: 'rgba(195,192,255,0.5)',
    backgroundColor: 'rgba(79,70,229,0.35)',
  },
  rowFocused: {
    borderColor: colors.brand,
    borderWidth: 2,
  },
  rowLabel: { flex: 1, color: colors.text, fontSize: 20, fontWeight: '600' },
  check: { marginLeft: spacing.md, color: colors.brand, fontSize: 22, fontWeight: '700' },
});
