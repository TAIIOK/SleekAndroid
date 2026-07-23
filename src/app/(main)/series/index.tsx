import {
  ScrollView,
  StyleSheet,
} from 'react-native';

import { LampaKindRails } from '@/components/catalog/LampaKindRails';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, spacing } from '@/constants/aniverse';
import { useHomeCatalogConfig } from '@/hooks/useHomeCatalogConfig';
import { useTvCatalogScrollRestore } from '@/hooks/useTvCatalogScrollRestore';
import { tvVerticalCatalogScrollProps } from '@/lib/tvCatalogScroll';
import { isTvUi } from '@/lib/isTvUi';
import { useMobileChromeScrollProps } from '@/providers/MobileChromeScroll';

export default function SeriesBrowseScreen() {
  const { config, ready } = useHomeCatalogConfig();
  const catalogScroll = useTvCatalogScrollRestore('/series');
  const chromeScrollProps = useMobileChromeScrollProps(catalogScroll.onScroll, styles.content);

  return (
    <ScrollView
      ref={catalogScroll.scrollRef}
      style={styles.scroll}
      {...chromeScrollProps}
      {...tvVerticalCatalogScrollProps}
    >
      {isTvUi() ? <SectionHeader title="Сериалы" showAccent tvFocusEntry /> : null}
      {ready ? <LampaKindRails kind="tv" config={config} restorePath="/series" /> : null}
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
