import { Platform } from 'react-native';

import { layout, spacing, typography } from '@/constants/aniverse';

/** Approximate vertical space for one catalog rail (title + posters + section gap). */
export function estimateCatalogRailHeight(): number {
  const posterHeight = layout.posterWidthRail / layout.posterAspect;
  const titleBlock = typography.railTitle.lineHeight + spacing.md;
  const railPad = Platform.isTV ? 18 : spacing.sm;
  const sectionGap = Platform.isTV ? spacing.md : 32;
  return Math.ceil(titleBlock + posterHeight + railPad + sectionGap);
}
