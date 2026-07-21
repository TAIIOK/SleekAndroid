import {
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing, tvFocus } from '@/constants/aniverse';
import type { MyListsMediaFilter } from '@/lib/myLists';
import { isTvUi } from '@/lib/isTvUi';

interface MyListsStatsProps {
  anime: number;
  movie: number;
  tv: number;
  media: MyListsMediaFilter;
  onMediaChange: (value: MyListsMediaFilter) => void;
}

const STAT_ITEMS: {
  id: MyListsMediaFilter;
  label: string;
  key: 'anime' | 'movie' | 'tv';
}[] = [
  { id: 'anime', label: 'Аниме', key: 'anime' },
  { id: 'movie', label: 'Фильмы', key: 'movie' },
  { id: 'tv', label: 'Сериалы', key: 'tv' },
];

export function MyListsStats({ anime, movie, tv, media, onMediaChange }: MyListsStatsProps) {
  const counts = { anime, movie, tv };

  return (
    <View style={styles.row}>
      {STAT_ITEMS.map((item) => {
        const active = media === item.id;
        return (
          <TvFocusable
            key={item.id}
            onPress={() => onMediaChange(active ? 'all' : item.id)}
            style={[styles.card, active && styles.cardActive]}
          >
            <Text style={[styles.count, active && styles.countActive]}>{counts[item.key]}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>{item.label}</Text>
          </TvFocusable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  card: {
    minWidth: isTvUi() ? 120 : 104,
    flexGrow: 1,
    borderRadius: radii.lg,
    borderWidth: tvFocus.borderWidth,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  cardActive: {
    borderColor: 'rgba(195,192,255,0.4)',
    backgroundColor: 'rgba(195,192,255,0.12)',
  },
  count: {
    color: colors.text,
    fontSize: isTvUi() ? 26 : 24,
    fontWeight: '700',
  },
  countActive: {
    color: colors.brand,
  },
  label: {
    color: colors.textSecondary,
    fontSize: isTvUi() ? 14 : 13,
    fontWeight: '500',
    marginTop: 4,
  },
  labelActive: {
    color: colors.text,
  },
});
