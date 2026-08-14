import { describe, expect, it } from 'vitest';

import {
  defaultKeepMargin,
  defaultPrefetchMargin,
  FAR_MEASURE_SLACK_PX,
  isRailNearViewport,
  isSlotClearlyFarFromViewport,
} from './nearViewport';

const SCREEN = 1000;
const RAIL = 200;

describe('default margins', () => {
  it('prefetches ~1 screen on TV and keeps ~0.75 behind', () => {
    expect(defaultPrefetchMargin(SCREEN, true)).toBe(1000);
    expect(defaultKeepMargin(SCREEN, true)).toBe(750);
  });

  it('uses the same 1.25× band on phone', () => {
    expect(defaultPrefetchMargin(SCREEN, false)).toBe(1250);
    expect(defaultKeepMargin(SCREEN, false)).toBe(1250);
  });
});

describe('isRailNearViewport', () => {
  const prefetch = 1000;
  const keep = 750;

  it('treats a rail intersecting the window as near', () => {
    expect(isRailNearViewport(100, RAIL, SCREEN, prefetch, keep)).toBe(true);
    expect(isRailNearViewport(-50, RAIL, SCREEN, prefetch, keep)).toBe(true);
    expect(isRailNearViewport(900, RAIL, SCREEN, prefetch, keep)).toBe(true);
  });

  it('mounts upcoming rails within the prefetch band', () => {
    expect(isRailNearViewport(SCREEN + 500, RAIL, SCREEN, prefetch, keep)).toBe(true);
    expect(isRailNearViewport(SCREEN + 1000, RAIL, SCREEN, prefetch, keep)).toBe(true);
    expect(isRailNearViewport(SCREEN + 1001, RAIL, SCREEN, prefetch, keep)).toBe(false);
  });

  it('drops passed rails beyond the keep band', () => {
    expect(isRailNearViewport(-keep - RAIL, RAIL, SCREEN, prefetch, keep)).toBe(true);
    expect(isRailNearViewport(-keep - RAIL - 1, RAIL, SCREEN, prefetch, keep)).toBe(false);
  });

  it('does not keep a rail 1.5 screens above even though prefetch is 1 screen', () => {
    const y = -1500 - RAIL;
    expect(isRailNearViewport(y, RAIL, SCREEN, prefetch, keep)).toBe(false);
    expect(isRailNearViewport(y, RAIL, SCREEN, prefetch, prefetch)).toBe(false);
    expect(isRailNearViewport(y, RAIL, SCREEN, prefetch, 1500)).toBe(true);
  });

  it('applies slack only as extra keep when already active', () => {
    const y = -keep - RAIL - 20;
    expect(isRailNearViewport(y, RAIL, SCREEN, prefetch, keep, 0)).toBe(false);
    expect(isRailNearViewport(y, RAIL, SCREEN, prefetch, keep, 48)).toBe(true);
  });
});

describe('isSlotClearlyFarFromViewport', () => {
  const prefetch = 1000;
  const keep = 750;

  it('does not skip measure for a slot still inside the extra slack band', () => {
    const contentY = SCREEN + prefetch + FAR_MEASURE_SLACK_PX;
    expect(isSlotClearlyFarFromViewport(contentY, RAIL, 0, SCREEN, prefetch, keep)).toBe(false);
  });

  it('skips measure for a slot well below the prefetch band', () => {
    const contentY = SCREEN + prefetch + FAR_MEASURE_SLACK_PX + 1;
    expect(isSlotClearlyFarFromViewport(contentY, RAIL, 0, SCREEN, prefetch, keep)).toBe(true);
  });

  it('uses scrollY so a mid-feed slot becomes far after a top landing', () => {
    expect(isSlotClearlyFarFromViewport(4000, RAIL, 4000, SCREEN, prefetch, keep)).toBe(false);
    expect(isSlotClearlyFarFromViewport(4000, RAIL, 0, SCREEN, prefetch, keep)).toBe(true);
  });
});
