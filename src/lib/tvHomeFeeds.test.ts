import { describe, expect, it } from 'vitest';

import { EMPTY_HOME_CONFIG, type CatalogHomeConfig } from '@aniverse/catalog';
import type { CatalogShowcase, LampaSection } from '@/api/catalog';

import { listTvHomeCatalogSources } from './tvHomeFeeds';

const animeShowcases: CatalogShowcase[] = [
  { id: 'trending', name: 'В тренде', path: '/api/catalog/anime/trending' },
  { id: 'recent', name: 'Новое', path: '/api/catalog/anime/recent' },
  { id: 'continue_watching', name: 'Продолжить', path: '/api/catalog/anime/continue' },
];

const lampaMovieSections: LampaSection[] = [
  { endpoint: 'trending', title: 'В тренде' },
  { endpoint: 'popular', title: 'Популярное' },
  { endpoint: 'now_playing', title: 'Сейчас в кино' },
];

const lampaTvSections: LampaSection[] = [
  { endpoint: 'popular', title: 'Популярные' },
  { endpoint: 'on_the_air', title: 'В эфире' },
  { endpoint: 'top_rated', title: 'Топ' },
];

const catalog = {
  animeShowcases,
  lampaMovieSections,
  lampaTvSections,
  enabledTypes: ['anime', 'lampa'],
  firstLampaKindId: 'movie',
};

describe('listTvHomeCatalogSources', () => {
  it('builds default movie → tv → anime rails when home config is unconfigured', () => {
    const sources = listTvHomeCatalogSources({
      ...catalog,
      filter: 'all',
      config: EMPTY_HOME_CONFIG,
    });

    expect(sources.map((source) => source.key)).toEqual([
      'movie:trending',
      'movie:popular',
      'movie:now_playing',
      'tv:popular',
      'tv:top_rated',
      'tv:on_the_air',
      'anime:trending',
      'anime:recent',
    ]);
  });

  it('honors configured homeSectionOrder on the Все tab', () => {
    const config: CatalogHomeConfig = {
      ...EMPTY_HOME_CONFIG,
      configured: true,
      enabledContentTypes: ['anime', 'lampa'],
      enabledAnimeShowcases: ['recent', 'trending'],
      enabledLampaSections: {
        movie: ['popular'],
        tv: ['on_the_air'],
      },
      homeSectionOrder: ['anime', 'movie', 'tv'],
    };

    const sources = listTvHomeCatalogSources({
      ...catalog,
      filter: 'all',
      config,
    });

    expect(sources.map((source) => source.key)).toEqual([
      'anime:recent',
      'anime:trending',
      'movie:popular',
      'tv:on_the_air',
    ]);
  });

  it('omits the continue_watching anime showcase', () => {
    const config: CatalogHomeConfig = {
      ...EMPTY_HOME_CONFIG,
      configured: true,
      enabledContentTypes: ['anime'],
      enabledAnimeShowcases: ['trending', 'continue_watching', 'recent'],
    };

    const sources = listTvHomeCatalogSources({
      ...catalog,
      enabledTypes: ['anime'],
      filter: 'anime',
      config,
    });

    expect(sources.map((source) => source.key)).toEqual(['anime:trending', 'anime:recent']);
  });

  it('keeps a configured Lampa continue-watching recommendation on the first kind', () => {
    const recSections: LampaSection[] = [
      { endpoint: 'recommendations:continue_watching', title: 'Продолжить' },
      { endpoint: 'popular', title: 'Популярное' },
    ];
    const config: CatalogHomeConfig = {
      ...EMPTY_HOME_CONFIG,
      configured: true,
      enabledContentTypes: ['lampa'],
      enabledLampaSections: {
        movie: ['recommendations:continue_watching', 'popular'],
        tv: [],
      },
    };

    const sources = listTvHomeCatalogSources({
      animeShowcases: [],
      lampaMovieSections: recSections,
      lampaTvSections: [],
      enabledTypes: ['lampa'],
      firstLampaKindId: 'movie',
      filter: 'movie',
      config,
    });

    expect(sources.map((source) => source.key)).toEqual([
      'movie:recommendations:continue_watching',
      'movie:popular',
    ]);
  });
});
