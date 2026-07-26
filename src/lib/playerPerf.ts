/**
 * Player performance HUD — opt-in only (never on in production sideload/OTA).
 * Enable: `EXPO_PUBLIC_PLAYER_PERF=1` for local / QA builds.
 */
export function isPlayerPerfOverlayEnabled(): boolean {
  return process.env.EXPO_PUBLIC_PLAYER_PERF === '1';
}
