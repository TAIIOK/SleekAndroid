import { layout, spacing, typography } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';

/** Approximate vertical space for one catalog rail (title + posters + section gap). */
export function estimateCatalogRailHeight(): number {
  const posterHeight = layout.posterWidthRail / layout.posterAspect;
  const titleBlock = typography.railTitle.lineHeight + spacing.md;
  const railPad = isTvUi() ? 18 : spacing.sm;
  const sectionGap = isTvUi() ? spacing.md : 32;
  return Math.ceil(titleBlock + posterHeight + railPad + sectionGap);
}
