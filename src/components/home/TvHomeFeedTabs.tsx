import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, layout, spacing, tvFocus } from '@/constants/aniverse';
import { tvHorizontalCatalogScrollProps } from '@/lib/tvCatalogScroll';
import { registerTvHomeTabsFocus } from '@/lib/tvHomeFocusHandoff';
import type { TvHomeFeedTab, TvHomeFeedTabOption } from '@/lib/tvHomeFeeds';

interface TvHomeFeedTabsProps {
  value: TvHomeFeedTab;
  onChange: (value: TvHomeFeedTab) => void;
  tabs: TvHomeFeedTabOption[];
}

export function TvHomeFeedTabs({ value, onChange, tabs }: TvHomeFeedTabsProps) {
  if (!tabs.length) return null;

  return (
    <View style={styles.nav}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        {...tvHorizontalCatalogScrollProps}
      >
        {tabs.map((tab, index) => {
          const active = value === tab.id;
          return (
            <View key={tab.id} collapsable={false} style={styles.tabWrap}>
              <TvFocusable
                onPress={() => onChange(tab.id)}
                style={styles.tab}
                focusedStyle={styles.tabFocused}
                railStart={index === 0}
                railEnd={index === tabs.length - 1}
                hostRef={index === 0 ? registerTvHomeTabsFocus : undefined}
              >
                <Text
                  style={[styles.tabLabel, active && styles.tabLabelActive]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </TvFocusable>
              <View style={[styles.underline, active && styles.underlineActive]} />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.lg,
    paddingHorizontal: layout.gutterDesktop,
  },
  tabWrap: {
    flexShrink: 0,
    maxWidth: 256,
    marginBottom: -1,
  },
  tab: {
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  tabFocused: {
    borderColor: '#ffffff',
    backgroundColor: tvFocus.fill,
  },
  tabLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: colors.text,
  },
  underline: {
    height: 2,
    marginHorizontal: 4,
    backgroundColor: 'transparent',
  },
  underlineActive: {
    backgroundColor: colors.brand,
  },
});
