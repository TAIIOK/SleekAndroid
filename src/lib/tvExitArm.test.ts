import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTvExitArm, TV_EXIT_ARM_MS, TV_EXIT_DISARM_GRACE_MS } from './tvExitArm';

describe('createTvExitArm', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('arms after the delay on a rail-edge card', () => {
    const arm = createTvExitArm();
    arm.setEnabled(true);
    expect(arm.isArmed()).toBe(false);
    vi.advanceTimersByTime(TV_EXIT_ARM_MS - 1);
    expect(arm.isArmed()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(arm.isArmed()).toBe(true);
  });

  it('does not consume before the arm delay (Left from 2nd card)', () => {
    const arm = createTvExitArm();
    arm.setEnabled(true);
    expect(arm.consume()).toBe(false);
    vi.advanceTimersByTime(TV_EXIT_ARM_MS);
    expect(arm.consume()).toBe(true);
    expect(arm.consume()).toBe(false);
  });

  it('keeps the arm across blur→focus when native Left 2D-searches Down', () => {
    const arm = createTvExitArm();
    arm.setEnabled(true);
    vi.advanceTimersByTime(TV_EXIT_ARM_MS);
    arm.setEnabled(false);
    arm.setEnabled(true);
    expect(arm.isArmed()).toBe(true);
    expect(arm.consume()).toBe(true);
  });

  it('still consumes on key-up after blur before self-focus returns', () => {
    const arm = createTvExitArm();
    arm.setEnabled(true);
    vi.advanceTimersByTime(TV_EXIT_ARM_MS);
    arm.setEnabled(false);
    vi.advanceTimersByTime(TV_EXIT_DISARM_GRACE_MS - 1);
    expect(arm.consume()).toBe(true);
  });

  it('disarms after the grace if focus leaves the edge', () => {
    const arm = createTvExitArm();
    arm.setEnabled(true);
    vi.advanceTimersByTime(TV_EXIT_ARM_MS);
    arm.setEnabled(false);
    vi.advanceTimersByTime(TV_EXIT_DISARM_GRACE_MS);
    expect(arm.isArmed()).toBe(false);
    expect(arm.consume()).toBe(false);
  });
});
