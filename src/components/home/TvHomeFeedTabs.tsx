import { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing, tvFocus } from '@/constants/aniverse';
import {
  buildCompactTvHomeFeedRow,
  type TvHomeFeedTab,
  type TvHomeFeedTabOption,
} from '@/lib/tvHomeFeeds';

interface TvHomeFeedTabsProps {
  value: TvHomeFeedTab;
  onChange: (value: TvHomeFeedTab) => void;
  tabs: TvHomeFeedTabOption[];
}

export function TvHomeFeedTabs({ value, onChange, tabs }: TvHomeFeedTabsProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const { visible, moreLabel } = useMemo(
    () => buildCompactTvHomeFeedRow(tabs, value),
    [tabs, value],
  );

  useEffect(() => {
    setPickerOpen(false);
  }, [tabs]);

  if (!tabs.length) return null;

  const select = (id: TvHomeFeedTab) => {
    onChange(id);
    setPickerOpen(false);
  };

  return (
    <>
      <View style={styles.row}>
        {visible.map((tab, index) => {
          const active = value === tab.id;
          return (
            <TvFocusable
              key={tab.id}
              onPress={() => select(tab.id)}
              style={[styles.chip, active && styles.chipActive]}
              focusedStyle={active ? styles.chipFocusedActive : styles.chipFocused}
              railStart={index === 0}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]} numberOfLines={1}>
                {active ? `✓ ${tab.label}` : tab.label}
              </Text>
            </TvFocusable>
          );
        })}

        {moreLabel ? (
          <TvFocusable
            onPress={() => setPickerOpen(true)}
            style={[styles.chip, styles.moreChip]}
            focusedStyle={styles.chipFocused}
          >
            <Text style={styles.chipLabel}>{moreLabel}</Text>
          </TvFocusable>
        ) : null}
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={pickerOpen}
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Ленты</Text>
              <TvFocusable
                onPress={() => setPickerOpen(false)}
                style={styles.closeBtn}
                focusedStyle={styles.chipFocused}
              >
                <Text style={styles.closeLabel}>Закрыть</Text>
              </TvFocusable>
            </View>

            <ScrollView
              style={styles.sheetScroll}
              contentContainerStyle={styles.sheetList}
              showsVerticalScrollIndicator={false}
            >
              {tabs.map((tab) => {
                const active = value === tab.id;
                return (
                  <TvFocusable
                    key={tab.id}
                    onPress={() => select(tab.id)}
                    style={[styles.listItem, active && styles.listItemActive]}
                    focusedStyle={styles.listItemFocused}
                    hasTVPreferredFocus={active}
                  >
                    <Text
                      style={[styles.listItemLabel, active && styles.listItemLabelActive]}
                      numberOfLines={1}
                    >
                      {active ? `✓ ${tab.label}` : tab.label}
                    </Text>
                  </TvFocusable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    paddingTop: 2,
  },
  chip: {
    flexShrink: 0,
    maxWidth: 280,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: tvFocus.borderWidth,
    borderColor: colors.border,
  },
  moreChip: {
    borderStyle: 'dashed',
  },
  chipActive: {
    backgroundColor: 'rgba(195,192,255,0.18)',
    borderColor: colors.brand,
  },
  chipFocused: {
    borderColor: '#ffffff',
    backgroundColor: tvFocus.fill,
  },
  chipFocusedActive: {
    borderColor: '#ffffff',
    backgroundColor: 'rgba(195,192,255,0.32)',
  },
  chipLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  chipLabelActive: {
    color: colors.brandTint,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  sheet: {
    maxHeight: '80%',
    backgroundColor: colors.bgElevated ?? colors.bg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
  },
  closeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: tvFocus.borderWidth,
    borderColor: colors.border,
  },
  closeLabel: {
    color: colors.brand,
    fontSize: 16,
    fontWeight: '600',
  },
  sheetScroll: {
    maxHeight: 520,
  },
  sheetList: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  listItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    borderWidth: tvFocus.borderWidth,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  listItemActive: {
    borderColor: colors.brand,
    backgroundColor: 'rgba(167,139,250,0.12)',
  },
  listItemFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: tvFocus.fill,
  },
  listItemLabel: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '600',
  },
  listItemLabelActive: {
    color: colors.text,
  },
});
