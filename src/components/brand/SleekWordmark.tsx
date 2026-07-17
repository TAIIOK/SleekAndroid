import { Platform, Pressable, Text } from 'react-native';

import { colors } from '@/constants/aniverse';

interface SleekWordmarkProps {
  onPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function SleekWordmark({ onPress, size = 'md' }: SleekWordmarkProps) {
  const fontSize = size === 'lg' ? 28 : size === 'sm' ? 18 : 20;

  if (Platform.OS === 'web') {
    const label = (
      <Text className="sleek-wordmark" style={{ fontSize }}>
        Sleek
      </Text>
    );
    if (!onPress) return label;
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="На главную">
        {label}
      </Pressable>
    );
  }

  const label = (
    <Text
      style={{
        color: colors.brand,
        fontSize,
        fontWeight: '700',
        letterSpacing: -0.8,
        backgroundColor: 'transparent',
      }}
    >
      Sleek
    </Text>
  );

  if (!onPress) return label;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="На главную">
      {label}
    </Pressable>
  );
}
