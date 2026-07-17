import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import { layout, spacing } from '@/constants/aniverse';

export function usePosterGridLayout(horizontalPadding = spacing.lg) {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    const columns = width >= 1280 ? 6 : width >= 1024 ? 5 : width >= 768 ? 4 : 3;
    const gap = spacing.md;
    const contentWidth = Math.max(0, width - horizontalPadding * 2);
    const cardWidth = Math.floor((contentWidth - gap * (columns - 1)) / columns);

    return {
      columns,
      gap,
      cardWidth: Math.max(cardWidth, layout.posterWidthRail),
      horizontalPadding,
    };
  }, [horizontalPadding, width]);
}
