import { describe, expect, it } from 'vitest';

import { animeHeroImageCandidates } from './animeDetail';
import { extractPosterPath } from './poster';

describe('animeHeroImageCandidates', () => {
  it('prefers typed background over portrait poster', () => {
    const candidates = animeHeroImageCandidates({
      id: 1,
      title: 'Test',
      poster: [
        {
          type: 'poster',
          source: 'https://cdn.example.com/poster.jpg',
        },
        {
          type: 'background',
          source: 'source2',
          preview: 'https://cdn.example.com/background.jpg',
        },
      ],
    });
    expect(candidates[0]).toBe('https://cdn.example.com/background.jpg');
  });

  it('uses explicit backdrop field first', () => {
    const candidates = animeHeroImageCandidates({
      id: 1,
      backdrop: 'https://cdn.example.com/api-backdrop.jpg',
      poster: [
        {
          type: 'background',
          source: 'https://cdn.example.com/background.jpg',
        },
      ],
    });
    expect(candidates[0]).toBe('https://cdn.example.com/api-backdrop.jpg');
  });
});

describe('extractPosterPath rail posters', () => {
  it('still picks type=poster from a mixed image array', () => {
    expect(
      extractPosterPath([
        { type: 'background', source: 'https://cdn.example.com/background.jpg' },
        { type: 'poster', source: 'https://cdn.example.com/poster.jpg' },
      ]),
    ).toBe('https://cdn.example.com/poster.jpg');
  });
});
