import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { usePosterGridLayout } from '@/hooks/usePosterGridLayout';

interface PosterGridProps {
  children: ReactNode;
  horizontalPadding?: number;
}

export function PosterGrid({ children, horizontalPadding }: PosterGridProps) {
  const { gap, horizontalPadding: pad } = usePosterGridLayout(horizontalPadding);

  return (
    <View style={[styles.grid, { gap, paddingHorizontal: pad }]}>
      {children}
    </View>
  );
}

export function usePosterGridCardWidth(horizontalPadding?: number) {
  const { cardWidth } = usePosterGridLayout(horizontalPadding);
  return cardWidth;
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
