import { describe, expect, it } from 'vitest';

import { toggleExclusiveDetailSection } from '@/lib/detailSections';

describe('toggleExclusiveDetailSection', () => {
  it('opens a section from a collapsed state', () => {
    expect(toggleExclusiveDetailSection(null, 'characters')).toBe('characters');
  });

  it('collapses the open section when toggled again', () => {
    expect(toggleExclusiveDetailSection('characters', 'characters')).toBe(null);
  });

  it('switches to another section and unmounts the previous', () => {
    expect(toggleExclusiveDetailSection('characters', 'similar')).toBe('similar');
    expect(toggleExclusiveDetailSection('related', 'recommendations')).toBe(
      'recommendations',
    );
  });
});
