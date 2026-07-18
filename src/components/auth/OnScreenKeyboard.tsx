import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/aniverse';

const ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', '@', '.', '_'],
];

interface OnScreenKeyboardProps {
  onKey: (key: string) => void;
}

const KEY_SIZE = 40;
const KEY_WIDE = Platform.isTV ? 96 : 100;

export function OnScreenKeyboard({ onKey }: OnScreenKeyboardProps) {
  const [focusedKey, setFocusedKey] = useState<string | null>(null);

  const labelFor = (key: string) => {
    if (key === 'SPACE') return '␣';
    if (key === 'BACK') return '⌫';
    if (key === 'SUBMIT') return 'OK';
    return key;
  };

  const renderKey = (key: string, wide?: boolean) => (
    <Pressable
      key={key}
      onFocus={() => setFocusedKey(key)}
      onBlur={() => setFocusedKey(null)}
      onPress={() => onKey(key)}
      style={[styles.key, wide && styles.keyWide, focusedKey === key && styles.keyFocused]}
    >
      <Text style={styles.keyLabel}>{labelFor(key)}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {ROWS.map((row, index) => (
        <View key={index} style={styles.row}>
          {row.map((key) => renderKey(key))}
        </View>
      ))}
      <View style={styles.row}>
        {renderKey('SPACE', true)}
        {renderKey('BACK')}
        {renderKey('SUBMIT', true)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
  },
  key: {
    minWidth: KEY_SIZE,
    height: KEY_SIZE,
    borderRadius: 8,
    backgroundColor: colors.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  keyWide: {
    minWidth: KEY_WIDE,
  },
  keyFocused: {
    backgroundColor: colors.brandAccent,
    transform: [{ scale: 1.04 }],
  },
  keyLabel: {
    color: colors.text,
    fontSize: Platform.isTV ? 16 : 16,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
