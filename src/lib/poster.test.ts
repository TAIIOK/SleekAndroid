import { describe, expect, it } from 'vitest';

import {
  extractPosterPath,
  isPlausibleImageURL,
  pickFromPosterImages,
  pickPosterImageUrl,
} from './poster';

describe('isPlausibleImageURL', () => {
  it('rejects placeholder hosts without a dot', () => {
    expect(isPlausibleImageURL('https://source2')).toBe(false);
  });

  it('accepts normal CDN hosts', () => {
    expect(isPlausibleImageURL('https://static.yani.tv/posters/full/1.jpg')).toBe(true);
    expect(isPlausibleImageURL('//imgproxy.yani.tv/a.webp')).toBe(true);
  });
});

describe('pickPosterImageUrl', () => {
  it('prefers non-AVIF source over broken optimized AVIF', () => {
    const picked = pickPosterImageUrl({
      source: 'https://static.yani.tv/posters/full/1636891284.jpg',
      optimized: 'https://static.yani.tv/posters/huge/1636667500.avif',
      preview: '//static.yani.tv/posters/small/1.webp',
      thumbnail: '//static.yani.tv/posters/medium/1.webp',
    });
    expect(picked).toBe('https://static.yani.tv/posters/full/1636891284.jpg');
  });

  it('prefers source/optimized over thumbnail/preview', () => {
    expect(
      pickPosterImageUrl({
        thumbnail: 'https://static.yani.tv/posters/medium/1.webp',
        preview: 'https://static.yani.tv/posters/small/1.webp',
        source: 'https://static.yani.tv/posters/full/1.jpg',
        optimized: 'https://static.yani.tv/posters/huge/1.webp',
      }),
    ).toBe('https://static.yani.tv/posters/full/1.jpg');
  });

  it('skips implausible candidates', () => {
    expect(
      pickPosterImageUrl({
        source: 'https://source2',
        optimized: 'https://example.com/a.webp',
      }),
    ).toBe('https://example.com/a.webp');
  });
});

describe('extractPosterPath', () => {
  it('drops implausible absolute strings', () => {
    expect(extractPosterPath('https://source2')).toBeUndefined();
  });

  it('keeps relative paths', () => {
    expect(extractPosterPath('/storage/posters/1.jpg')).toBe('/storage/posters/1.jpg');
  });

  it('picks typed poster entry from mixed arrays', () => {
    const picked = extractPosterPath([
      { type: 'screenshot', source: 'https://example.com/ep.webp' },
      {
        type: 'poster',
        source: 'https://static.yani.tv/posters/full/1.jpg',
        optimized: 'https://static.yani.tv/posters/huge/1.avif',
      },
    ]);
    expect(picked).toBe('https://static.yani.tv/posters/full/1.jpg');
  });
});

describe('pickFromPosterImages', () => {
  it('normalizes protocol-relative URLs', () => {
    expect(
      pickFromPosterImages([
        {
          source: '//static.yani.tv/posters/full/1.jpg',
        },
      ]),
    ).toBe('https://static.yani.tv/posters/full/1.jpg');
  });
});
