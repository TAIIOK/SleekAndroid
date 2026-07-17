import { Platform, ScrollView, StyleSheet } from 'react-native';

import { AnimeCatalogRails } from '@/components/catalog/AnimeCatalogRails';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { useHomeCatalogConfig } from '@/hooks/useHomeCatalogConfig';
import { colors, spacing } from '@/constants/aniverse';

export default function AnimeBrowseScreen() {
  const { config, ready } = useHomeCatalogConfig();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      {Platform.isTV ? <SectionHeader title="Аниме" showAccent /> : null}
      {ready ? <AnimeCatalogRails config={config} /> : null}
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
