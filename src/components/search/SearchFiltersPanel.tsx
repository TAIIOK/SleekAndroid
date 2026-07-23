import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { SearchFilters } from '@/components/search/SearchFilters';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing, tvFocus } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';
import type { SearchFilterState, SearchMediaFilter } from '@/lib/searchConfig';

interface SearchFiltersPanelProps {
  visible: boolean;
  onClose: () => void;
  media: SearchMediaFilter;
  onMediaChange: (value: SearchMediaFilter) => void;
  filters: SearchFilterState;
  onFiltersChange: (patch: Partial<SearchFilterState>) => void;
  genres: Array<{ id: number | string; name: string }>;
  lampaGenres: Array<{ id: number | string; name: string }>;
}

/** Right-side filter drawer over the search screen. */
export function SearchFiltersPanel({
  visible,
  onClose,
  media,
  onMediaChange,
  filters,
  onFiltersChange,
  genres,
  lampaGenres,
}: SearchFiltersPanelProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={['landscape', 'landscape-left', 'landscape-right', 'portrait']}
    >
      <View style={styles.root}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>Фильтры</Text>
            <TvFocusable
              onPress={onClose}
              style={styles.closeBtn}
              focusedStyle={styles.closeBtnFocused}
              hasTVPreferredFocus={isTvUi()}
            >
              <Text style={styles.closeLabel}>Закрыть</Text>
            </TvFocusable>
          </View>
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={false}
          >
            <SearchFilters
              media={media}
              onMediaChange={onMediaChange}
              filters={filters}
              onFiltersChange={onFiltersChange}
              genres={genres}
              lampaGenres={lampaGenres}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  panel: {
    width: isTvUi() ? 440 : '90%',
    maxWidth: 520,
    height: '100%',
    backgroundColor: 'rgba(31,31,40,0.98)',
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingTop: spacing.lg,
    zIndex: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: isTvUi() ? 22 : 20,
    fontWeight: '700',
  },
  closeBtn: {
    borderRadius: radii.pill,
    borderWidth: tvFocus.borderWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.bgCard,
  },
  closeBtnFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: tvFocus.fill,
  },
  closeLabel: {
    color: colors.text,
    fontWeight: '600',
    fontSize: isTvUi() ? 15 : 14,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
  },
});
