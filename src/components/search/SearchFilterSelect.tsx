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

export type SearchFilterOption = { value: string; label: string };

interface SearchFilterSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchFilterOption[];
}

/** TV-friendly dropdown used by search filter fields. */
export function SearchFilterSelect({
  label,
  value,
  onChange,
  options,
}: SearchFilterSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((opt) => opt.value === value);
  const display = selected?.label || options[0]?.label || label;

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
  };

  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TvFocusable
        onPress={() => setOpen(true)}
        style={[styles.trigger, Boolean(value) && styles.triggerActive]}
        focusedStyle={styles.triggerFocused}
      >
        <Text style={styles.triggerLabel} numberOfLines={1}>
          {display}
        </Text>
        <Text style={styles.chevron}>▾</Text>
      </TvFocusable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
        supportedOrientations={['landscape', 'landscape-left', 'landscape-right', 'portrait']}
      >
        <View style={styles.modal}>
          <Pressable
            style={styles.scrim}
            onPress={() => setOpen(false)}
            focusable={false}
            accessible={false}
          />
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <ScrollView
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            >
              {options.map((option) => {
                const active = value === option.value;
                return (
                  <TvFocusable
                    key={option.value || '__empty__'}
                    onPress={() => pick(option.value)}
                    style={[styles.option, active && styles.optionActive]}
                    focusedStyle={styles.optionFocused}
                    hasTVPreferredFocus={isTvUi() && active}
                  >
                    <Text style={styles.optionLabel}>{option.label}</Text>
                    {active ? <Text style={styles.check}>✓</Text> : null}
                  </TvFocusable>
                );
              })}
            </ScrollView>
            <TvFocusable
              onPress={() => setOpen(false)}
              style={styles.close}
              focusedStyle={styles.optionFocused}
            >
              <Text style={styles.closeLabel}>Закрыть</Text>
            </TvFocusable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
    minWidth: isTvUi() ? 160 : 140,
    flexGrow: 1,
    flexBasis: isTvUi() ? '46%' : '100%',
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: isTvUi() ? 12 : 10,
    borderRadius: radii.md,
    backgroundColor: colors.bgCard,
    borderWidth: tvFocus.borderWidth,
    borderColor: colors.border,
  },
  triggerActive: {
    borderColor: colors.brand,
    backgroundColor: 'rgba(195,192,255,0.12)',
  },
  triggerFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: tvFocus.fill,
  },
  triggerLabel: {
    flex: 1,
    color: colors.text,
    fontSize: isTvUi() ? 15 : 14,
    fontWeight: '600',
  },
  chevron: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  modal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    width: isTvUi() ? 360 : '100%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: radii.lg,
    backgroundColor: 'rgba(31,31,40,0.98)',
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
    zIndex: 2,
  },
  sheetTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.xs,
  },
  list: {
    maxHeight: isTvUi() ? 420 : 320,
  },
  listContent: {
    gap: spacing.xs,
    paddingBottom: spacing.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: isTvUi() ? 12 : 10,
    borderRadius: radii.md,
    borderWidth: tvFocus.borderWidth,
    borderColor: 'transparent',
    backgroundColor: colors.bgCard,
  },
  optionActive: {
    borderColor: colors.brand,
    backgroundColor: 'rgba(195,192,255,0.12)',
  },
  optionFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: tvFocus.fill,
  },
  optionLabel: {
    color: colors.text,
    fontSize: isTvUi() ? 16 : 15,
    fontWeight: '600',
    flex: 1,
  },
  check: {
    color: colors.brand,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: spacing.sm,
  },
  close: {
    marginTop: spacing.xs,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: tvFocus.borderWidth,
    borderColor: colors.border,
  },
  closeLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
