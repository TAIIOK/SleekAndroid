import { describe, expect, it } from 'vitest';

import { recommendationRailSlots } from './animeRecommendationSlots';

const sections = [
  { id: 'because_you_watched', title: 'Смотрели', items: [{ id: 2 }] },
  { id: 'for_you', title: 'Для вас', items: [{ id: 1 }] },
];

describe('recommendationRailSlots', () => {
  it('keeps config order even when the feed arrives in a different order', () => {
    expect(
      recommendationRailSlots(['for_you', 'because_you_watched'], sections, false).map(
        (slot) => slot.id,
      ),
    ).toEqual(['for_you', 'because_you_watched']);
  });

  it('reserves a slot for every config id while the feed is loading', () => {
    expect(
      recommendationRailSlots(['for_you', 'from_your_lists'], [], true).map((slot) => ({
        id: slot.id,
        loading: slot.loading,
      })),
    ).toEqual([
      { id: 'for_you', loading: true },
      { id: 'from_your_lists', loading: true },
    ]);
  });

  it('drops empty sections after the feed arrives', () => {
    expect(
      recommendationRailSlots(
        ['for_you', 'from_your_lists'],
        [{ id: 'for_you', title: 'Для вас', items: [{ id: 1 }] }, { id: 'from_your_lists', title: 'Списки', items: [] }],
        false,
      ).map((slot) => slot.id),
    ).toEqual(['for_you']);
  });
});
