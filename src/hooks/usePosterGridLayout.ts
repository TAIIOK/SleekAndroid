import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import { layout, spacing } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';

export function usePosterGridLayout(horizontalPadding = spacing.lg) {
  const { width } = useWindowDimensions();

  return useMemo(() => {
    // TV rails use ~10px gaps; keep the grid equally dense.
    const gap = isTvUi() ? 10 : spacing.md;

    // TV: overlay sidebar does not reserve layout width — pack full-bleed.
    if (isTvUi()) {
      const contentWidth = Math.max(0, width - horizontalPadding * 2);
      const targetWidth = layout.posterWidthRail;
      const columns = Math.max(3, Math.floor((contentWidth + gap) / (targetWidth + gap)));

      return {
        columns,
        gap,
        cardWidth: targetWidth,
        horizontalPadding,
      };
    }

    const columns = width >= 1280 ? 6 : width >= 1024 ? 5 : width >= 768 ? 4 : 3;
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
