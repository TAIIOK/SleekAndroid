import { Platform, ScrollView, StyleSheet } from 'react-native';

import { LampaKindRails } from '@/components/catalog/LampaKindRails';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, spacing } from '@/constants/aniverse';
import { EMPTY_HOME_CONFIG } from '@/types/homeConfig';

export default function MoviesBrowseScreen() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {Platform.isTV ? <SectionHeader title="Фильмы" showAccent tvFocusEntry /> : null}
      <LampaKindRails kind="movie" config={EMPTY_HOME_CONFIG} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
});
