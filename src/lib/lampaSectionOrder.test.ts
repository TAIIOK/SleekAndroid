import { describe, expect, it } from 'vitest';

import { orderLampaSectionsByEndpoints } from './lampaSectionOrder';

describe('orderLampaSectionsByEndpoints', () => {
  const sections = [
    { endpoint: 'trending', title: 'В тренде' },
    { endpoint: 'popular', title: 'Популярное' },
    { endpoint: 'now_playing', title: 'Сейчас в кино' },
    { endpoint: 'top_rated', title: 'Топ' },
  ];

  it('keeps the enabled endpoint order, not the API list order', () => {
    expect(
      orderLampaSectionsByEndpoints(sections, ['now_playing', 'trending']).map(
        (section) => section.endpoint,
      ),
    ).toEqual(['now_playing', 'trending']);
  });

  it('drops endpoints missing from the catalog', () => {
    expect(
      orderLampaSectionsByEndpoints(sections, ['popular', 'missing', 'top_rated']).map(
        (section) => section.endpoint,
      ),
    ).toEqual(['popular', 'top_rated']);
  });
});
