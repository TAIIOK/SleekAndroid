/** Delay before Left/Up may jump to the sidebar after a rail-edge card gains focus. */
export const TV_EXIT_ARM_MS = 220;

/**
 * Keep the arm alive across native 2D-search blur (Left on a rail-start often
 * lands on the row below before key-up). Shorter than the arm window so Left
 * from the 2nd card (lands on 1st, then key-up) does not also exit.
 */
export const TV_EXIT_DISARM_GRACE_MS = 160;

export type TvExitArm = {
  isArmed: () => boolean;
  setEnabled: (enabled: boolean) => void;
  consume: () => boolean;
  reset: () => void;
};

/** Rail-edge Left/Up arm: delay on first focus, grace-disarm through 2D-search blur. */
export function createTvExitArm(): TvExitArm {
  let count = 0;
  let armed = false;
  let armTimer: ReturnType<typeof setTimeout> | null = null;
  let disarmTimer: ReturnType<typeof setTimeout> | null = null;

  const clearTimer = (timer: ReturnType<typeof setTimeout> | null) => {
    if (timer != null) clearTimeout(timer);
    return null;
  };

  return {
    isArmed: () => armed,
    setEnabled(enabled: boolean) {
      count = Math.max(0, count + (enabled ? 1 : -1));

      if (count === 0) {
        armTimer = clearTimer(armTimer);
        disarmTimer = clearTimer(disarmTimer);
        disarmTimer = setTimeout(() => {
          disarmTimer = null;
          if (count === 0) armed = false;
        }, TV_EXIT_DISARM_GRACE_MS);
        return;
      }

      if (enabled) {
        disarmTimer = clearTimer(disarmTimer);
        if (armed) return;
        armTimer = clearTimer(armTimer);
        armTimer = setTimeout(() => {
          armTimer = null;
          armed = count > 0;
        }, TV_EXIT_ARM_MS);
      }
    },
    consume() {
      if (!armed) return false;
      armed = false;
      return true;
    },
    reset() {
      count = 0;
      armed = false;
      armTimer = clearTimer(armTimer);
      disarmTimer = clearTimer(disarmTimer);
    },
  };
}
