import {
  findRecommendationSection,
  type RecommendationFeedSection,
} from '@aniverse/catalog';

export type RecommendationRailSlot<T> = {
  id: string;
  section: RecommendationFeedSection<T> | undefined;
  loading: boolean;
};

/**
 * One reserved rail slot per config id, in config order.
 * Empty sections are omitted after the feed arrives so later showcases stay below.
 */
export function recommendationRailSlots<T>(
  orderedIds: readonly string[],
  sections: readonly RecommendationFeedSection<T>[],
  isLoading: boolean,
): RecommendationRailSlot<T>[] {
  const slots: RecommendationRailSlot<T>[] = [];
  const seen = new Set<string>();

  for (const id of orderedIds) {
    const section = findRecommendationSection([...sections], id);
    if (section && seen.has(section.id)) continue;
    if (section) seen.add(section.id);

    const hasItems = Boolean(section && section.items.length > 0);
    if (!isLoading && !hasItems) continue;

    slots.push({
      id: section?.id ?? id,
      section: hasItems ? section : undefined,
      loading: isLoading && !hasItems,
    });
  }

  return slots;
}
