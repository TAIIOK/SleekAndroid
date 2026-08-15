import { describe, expect, it } from 'vitest';

import { catalogVerticalNeighbors } from './tvCatalogVerticalNeighbors';
import type { TvCatalogVerticalSnapshot } from './tvCatalogVerticalFocusTypes';

const snapshot: TvCatalogVerticalSnapshot = {
  chromePrimaryTag: 10,
  chromeSecondaryTag: 11,
  rails: [
    { priority: -1, tag: 20 },
    { priority: 0, tag: 30 },
    { priority: 1, tag: 40 },
  ],
};

describe('catalogVerticalNeighbors', () => {
  it('sends continue Up to chrome and Down to the first catalog rail', () => {
    expect(catalogVerticalNeighbors(snapshot, -1)).toEqual({ up: 10, down: 30 });
  });

  it('places Quick Actions between continue and catalog rails', () => {
    expect(
      catalogVerticalNeighbors(
        {
          chromePrimaryTag: 10,
          rails: [
            { priority: -1, tag: 20 },
            { priority: -0.5, tag: 25 },
            { priority: 0, tag: 30 },
          ],
        },
        -0.5,
      ),
    ).toEqual({ up: 20, down: 30 });
  });

  it('sends the first catalog rail Up to continue', () => {
    expect(catalogVerticalNeighbors(snapshot, 0)).toEqual({ up: 20, down: 40 });
  });

  it('sends the last rail Down nowhere', () => {
    expect(catalogVerticalNeighbors(snapshot, 1)).toEqual({ up: 30, down: undefined });
  });

  it('uses the page title when no previous rail exists', () => {
    expect(
      catalogVerticalNeighbors({ chromePrimaryTag: 10, rails: [{ priority: 0, tag: 30 }] }, 0),
    ).toEqual({ up: 10, down: undefined });
  });
});
