import { describe, expect, it } from 'vitest';

import { higherQualityImageUrl } from '@/lib/imageQuality';

describe('higherQualityImageUrl', () => {
  it('rewrites a TMDB size segment', () => {
    const url = 'https://watchhub.taiiok.ru/tmdb/img/t/p/w342/ab/cd.jpg';
    expect(higherQualityImageUrl(url, 'w780')).toBe(
      'https://watchhub.taiiok.ru/tmdb/img/t/p/w780/ab/cd.jpg',
    );
    expect(higherQualityImageUrl(url, 'original')).toBe(
      'https://watchhub.taiiok.ru/tmdb/img/t/p/original/ab/cd.jpg',
    );
  });

  it('promotes Yani small and medium posters to huge', () => {
    expect(
      higherQualityImageUrl('https://static.yani.tv/posters/medium/1.webp', 'w780'),
    ).toBe('https://static.yani.tv/posters/huge/1.webp');
    expect(
      higherQualityImageUrl('https://imgproxy.yani.tv/posters/small/2.jpg'),
    ).toBe('https://imgproxy.yani.tv/posters/huge/2.jpg');
  });

  it('leaves already-large and non-sized URLs unchanged', () => {
    const huge = 'https://static.yani.tv/posters/huge/1.webp';
    const source = 'https://cdn.example.com/backdrop.jpg';
    expect(higherQualityImageUrl(huge, 'original')).toBe(huge);
    expect(higherQualityImageUrl(source, 'original')).toBe(source);
    expect(higherQualityImageUrl(undefined, 'w780')).toBeUndefined();
  });
});
