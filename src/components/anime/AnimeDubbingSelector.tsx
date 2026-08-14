import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing, tvFocus } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';

interface AnimeDubbingSelectorProps {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
}

export function AnimeDubbingSelector({
  options,
  selected,
  onSelect,
}: AnimeDubbingSelectorProps) {
  const [open, setOpen] = useState(false);

  if (options.length <= 1) return null;

  const selectedLabel = selected || options[0];

  return (
    <View style={styles.wrap}>
      <TvFocusable onPress={() => setOpen(true)} style={styles.trigger}>
        <Text style={styles.triggerValue}>{selectedLabel}</Text>
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </TvFocusable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Озвучка</Text>
            <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
              {options.map((option, index) => {
                const active = option === selectedLabel;
                return (
                  <TvFocusable
                    key={option}
                    hasTVPreferredFocus={open && (active || (index === 0 && !selectedLabel))}
                    onPress={() => {
                      onSelect(option);
                      setOpen(false);
                    }}
                    style={[styles.option, active && styles.optionActive]}
                  >
                    <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                      {option}
                    </Text>
                    {active ? (
                      <Ionicons name="checkmark" size={18} color={colors.brand} />
                    ) : null}
                  </TvFocusable>
                );
              })}
            </ScrollView>
            <TvFocusable onPress={() => setOpen(false)} style={styles.closeBtn}>
              <Text style={styles.closeLabel}>Закрыть</Text>
            </TvFocusable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: isTvUi() ? 200 : 128,
    maxWidth: isTvUi() ? 400 : 280,
    marginLeft: 'auto',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: isTvUi() ? spacing.sm : 6,
    borderRadius: isTvUi() ? radii.lg : radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: isTvUi() ? spacing.md : 8,
    paddingVertical: isTvUi() ? 12 : 6,
  },
  triggerValue: {
    flex: 1,
    minWidth: 0,
    color: colors.text,
    fontSize: isTvUi() ? 15 : 12,
    fontWeight: '600',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '70%',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: colors.bgElevated,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sheetTitle: {
    color: colors.brand,
    fontSize: isTvUi() ? 20 : 16,
    fontWeight: '700',
  },
  list: {
    maxHeight: 320,
  },
  listContent: {
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: isTvUi() ? 14 : 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  optionActive: {
    backgroundColor: 'rgba(167,139,250,0.15)',
    borderWidth: 1,
    borderColor: tvFocus.borderColor,
  },
  optionLabel: {
    flex: 1,
    minWidth: 0,
    color: colors.textSecondary,
    fontSize: isTvUi() ? 16 : 14,
    fontWeight: '600',
  },
  optionLabelActive: {
    color: colors.brand,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  closeLabel: {
    color: colors.text,
    fontWeight: '700',
  },
});
