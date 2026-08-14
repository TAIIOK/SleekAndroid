import { describe, expect, it } from 'vitest';

import {
  decodeLampaRecommendationList,
  decodeRecommendationFeed,
  findRecommendationSection,
} from '@aniverse/catalog';

const feed = {
  data: {
    sections: [
      { id: 'for_you', title: 'Для вас', items: [] },
      { id: 'for_you', title: 'Для вас', items: [{ id: 1, title: 'A' }, { id: 2, title: 'B' }] },
      { id: 'because_you_watched', title: 'Потому что вы смотрели', items: [{ id: 3, title: 'C' }] },
    ],
  },
};

describe('decodeRecommendationFeed', () => {
  it('merges duplicate section ids instead of keeping the first empty copy', () => {
    const sections = decodeRecommendationFeed(feed);
    const forYou = sections.find((section) => section.id === 'for_you');
    expect(forYou?.items.map((item) => item.id)).toEqual([1, 2]);
  });
});

describe('findRecommendationSection', () => {
  it('matches section ids case-insensitively', () => {
    const sections = decodeRecommendationFeed(feed);
    expect(findRecommendationSection(sections, 'FOR_YOU')?.items).toHaveLength(2);
  });

  it('does not pick an unrelated section from a multi-section feed', () => {
    const sections = decodeRecommendationFeed(feed);
    expect(findRecommendationSection(sections, 'from_your_lists')).toBeUndefined();
  });
});

describe('decodeLampaRecommendationList', () => {
  it('returns merged items for a section filter', () => {
    expect(decodeLampaRecommendationList(feed, 'for_you').map((item) => item.id)).toEqual([1, 2]);
  });

  it('uses the only returned section when the filter id does not match', () => {
    expect(
      decodeLampaRecommendationList(
        { data: { sections: [{ id: 'because_you_watched', items: [{ id: 9 }] }] } },
        'for_you',
      ).map((item) => item.id),
    ).toEqual([9]);
  });
});
