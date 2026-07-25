import { memo, useRef, useState } from 'react';
import {
  findNodeHandle,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { colors, spacing, tvFocus } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';

type LayoutId = 'en' | 'ru';

const ROWS_EN = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', '@', '.', '_'],
];

const ROWS_RU = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х'],
  ['ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'э'],
  ['я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю', 'ъ', 'ё'],
];

/** Android TV can deliver select twice when the parent re-renders mid-press. */
const PRESS_LOCK_MS = 140;

interface OnScreenKeyboardProps {
  onKey: (key: string) => void;
  /** Initial layout. Defaults to Russian for the RU-first product. */
  initialLayout?: LayoutId;
  /** Native tag of the first key — for `nextFocusDown` from the search field. */
  onFirstKeyNativeTag?: (tag: number | undefined) => void;
}

const KEY_SIZE = 40;
const KEY_WIDE = isTvUi() ? 96 : 100;

function OnScreenKeyboardComponent({
  onKey,
  initialLayout = 'ru',
  onFirstKeyNativeTag,
}: OnScreenKeyboardProps) {
  const [layout, setLayout] = useState<LayoutId>(initialLayout);
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const lastPressAtRef = useRef(0);
  const onKeyRef = useRef(onKey);
  onKeyRef.current = onKey;
  const onFirstKeyNativeTagRef = useRef(onFirstKeyNativeTag);
  onFirstKeyNativeTagRef.current = onFirstKeyNativeTag;

  const rows = layout === 'ru' ? ROWS_RU : ROWS_EN;
  const langToggleLabel = layout === 'ru' ? 'EN' : 'RU';
  const firstKey = rows[0]?.[0];

  const labelFor = (key: string) => {
    if (key === 'SPACE') return '␣';
    if (key === 'BACK') return '⌫';
    if (key === 'SUBMIT') return 'OK';
    if (key === 'LANG') return langToggleLabel;
    if (/^[a-z]$/.test(key)) return key.toUpperCase();
    return key;
  };

  const handlePress = (key: string) => {
    const now = Date.now();
    if (now - lastPressAtRef.current < PRESS_LOCK_MS) return;
    lastPressAtRef.current = now;

    if (key === 'LANG') {
      setLayout((current) => (current === 'ru' ? 'en' : 'ru'));
      return;
    }
    onKeyRef.current(key);
  };

  const renderKey = (key: string, wide?: boolean) => (
    <Pressable
      key={key}
      ref={
        key === firstKey
          ? (node) => {
              const tag = node
                ? (findNodeHandle(node as Parameters<typeof findNodeHandle>[0]) ?? undefined)
                : undefined;
              onFirstKeyNativeTagRef.current?.(tag);
            }
          : undefined
      }
      onFocus={() => setFocusedKey(key)}
      onBlur={() => {
        setFocusedKey((current) => (current === key ? null : current));
      }}
      onPress={() => handlePress(key)}
      style={[styles.key, wide && styles.keyWide, focusedKey === key && styles.keyFocused]}
    >
      <Text style={[styles.keyLabel, key === 'LANG' && styles.langLabel]}>{labelFor(key)}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      {rows.map((row, index) => (
        <View key={`${layout}-${index}`} style={styles.row}>
          {row.map((key) => renderKey(key))}
        </View>
      ))}
      <View style={styles.row}>
        {renderKey('LANG', true)}
        {renderKey('SPACE', true)}
        {renderKey('BACK')}
        {renderKey('SUBMIT', true)}
      </View>
    </View>
  );
}

/** Memoized so search-result re-renders do not rebuild keys mid-press on TV. */
export const OnScreenKeyboard = memo(OnScreenKeyboardComponent);

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
    borderWidth: tvFocus.borderWidth,
    borderColor: 'transparent',
  },
  keyWide: {
    minWidth: KEY_WIDE,
  },
  keyFocused: {
    backgroundColor: colors.brandAccent,
    borderColor: tvFocus.borderColor,
    transform: [{ scale: 1.06 }],
  },
  keyLabel: {
    color: colors.text,
    fontSize: isTvUi() ? 16 : 16,
    fontWeight: '600',
  },
  langLabel: {
    color: colors.brandTint,
    letterSpacing: 0.5,
  },
});
