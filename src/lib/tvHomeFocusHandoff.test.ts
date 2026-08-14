import { describe, expect, it } from 'vitest';

import { shouldClaimHandoffSlot } from './tvHomeFocusClaim';

describe('shouldClaimHandoffSlot', () => {
  it('lets the first rail claim an empty slot', () => {
    expect(shouldClaimHandoffSlot(Number.POSITIVE_INFINITY, 0)).toBe(true);
  });

  it('keeps a closer rail when a later rail mounts', () => {
    expect(shouldClaimHandoffSlot(0, 1)).toBe(false);
  });

  it('lets an earlier rail replace a later one', () => {
    expect(shouldClaimHandoffSlot(1, 0)).toBe(true);
  });

  it('lets the owning rail refresh its node after a ref churn', () => {
    expect(shouldClaimHandoffSlot(0, 0)).toBe(true);
  });
});
