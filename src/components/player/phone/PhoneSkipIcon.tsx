import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type MdiName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const BACKWARD_GLYPH: Record<number, MdiName> = {
  5: 'rewind-5',
  10: 'rewind-10',
  15: 'rewind-15',
  30: 'rewind-30',
  45: 'rewind-45',
  60: 'rewind-60',
};

const FORWARD_GLYPH: Record<number, MdiName> = {
  5: 'fast-forward-5',
  10: 'fast-forward-10',
  15: 'fast-forward-15',
  30: 'fast-forward-30',
  45: 'fast-forward-45',
  60: 'fast-forward-60',
};

export function PhoneSkipIcon({
  seconds,
  forward = false,
  size = 32,
  color = '#fff',
}: {
  seconds: number;
  forward?: boolean;
  size?: number;
  color?: string;
}) {
  const glyph = (forward ? FORWARD_GLYPH : BACKWARD_GLYPH)[seconds];
  if (glyph) {
    return <MaterialCommunityIcons name={glyph} size={size} color={color} />;
  }

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <MaterialCommunityIcons
        name={forward ? 'reload' : 'restore'}
        size={size}
        color={color}
      />
      <Text
        style={[
          styles.seconds,
          { color, fontSize: seconds >= 100 ? 9 : 11 },
        ]}
      >
        {seconds}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  seconds: {
    position: 'absolute',
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
});
