import { layout, spacing, typography } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';

export function catalogPosterDecodeSize(width = layout.posterWidthRail): {
  width: number;
  height: number;
} {
  return {
    width: Math.round(width),
    height: Math.round(width / layout.posterAspect),
  };
}

export function continuePosterDecodeSize(width = layout.continueCardWidth): {
  width: number;
  height: number;
} {
  return {
    width: Math.round(width),
    height: Math.round((width * 9) / 16),
  };
}

/** Approximate vertical space for one catalog rail (title + posters + section gap). */
export function estimateCatalogRailHeight(): number {
  const posterHeight = catalogPosterDecodeSize().height;
  const titleBlock = typography.railTitle.lineHeight + spacing.md;
  const railPad = isTvUi() ? 18 : spacing.sm;
  const sectionGap = isTvUi() ? spacing.md : 32;
  return Math.ceil(titleBlock + posterHeight + railPad + sectionGap);
}
