export const DETAIL_EXTRA_SECTIONS = [
  'characters',
  'related',
  'recommendations',
  'similar',
] as const;

export type DetailExtraSection = (typeof DETAIL_EXTRA_SECTIONS)[number];

/** Exclusive accordion: opening A closes B. Opening the open section collapses it. */
export function toggleExclusiveDetailSection(
  current: DetailExtraSection | null,
  next: DetailExtraSection,
): DetailExtraSection | null {
  return current === next ? null : next;
}
