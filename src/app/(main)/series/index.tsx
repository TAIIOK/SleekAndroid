import {
  ScrollView,
  StyleSheet,
} from 'react-native';

import { LampaKindRails } from '@/components/catalog/LampaKindRails';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, spacing } from '@/constants/aniverse';
import { EMPTY_HOME_CONFIG } from '@/types/homeConfig';
import { isTvUi } from '@/lib/isTvUi';

export default function SeriesBrowseScreen() {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {isTvUi() ? <SectionHeader title="Сериалы" showAccent tvFocusEntry /> : null}
      <LampaKindRails kind="tv" config={EMPTY_HOME_CONFIG} />
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
