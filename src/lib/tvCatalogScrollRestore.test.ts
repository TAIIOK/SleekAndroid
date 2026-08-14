import { describe, expect, it } from 'vitest';

import {
  clearCatalogScrollSnapshot,
  consumeCatalogScrollSnapshot,
  markCatalogFreshLanding,
  saveCatalogScrollSnapshot,
  takeCatalogFreshLanding,
} from './tvCatalogScrollRestore';

describe('catalog fresh landing', () => {
  it('is consumed once after a sidebar hub switch', () => {
    markCatalogFreshLanding('/movies');
    expect(takeCatalogFreshLanding('/movies')).toBe(true);
    expect(takeCatalogFreshLanding('/movies')).toBe(false);
  });

  it('does not treat Back restore as a fresh landing', () => {
    saveCatalogScrollSnapshot('/anime', { scrollY: 800, railKey: 'seasonal', itemIndex: 2 });
    expect(takeCatalogFreshLanding('/anime')).toBe(false);
    expect(consumeCatalogScrollSnapshot('/anime')?.scrollY).toBe(800);
  });

  it('clears a leftover snapshot without marking landing by itself', () => {
    saveCatalogScrollSnapshot('/series', { scrollY: 120 });
    clearCatalogScrollSnapshot('/series');
    expect(consumeCatalogScrollSnapshot('/series')).toBeUndefined();
    expect(takeCatalogFreshLanding('/series')).toBe(false);
  });
});
