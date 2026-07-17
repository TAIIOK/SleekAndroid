import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { radii } from '@/constants/aniverse';

const logoSource = require('../../../assets/images/sleek-app-icon.png');

interface SleekLogoProps {
  size?: number;
}

export function SleekLogo({ size = 48 }: SleekLogoProps) {
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: radii.lg }]}>
      <Image source={logoSource} style={{ width: size, height: size }} contentFit="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
  },
});
