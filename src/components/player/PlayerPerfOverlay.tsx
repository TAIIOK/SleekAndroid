import { useMemo, type MutableRefObject } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  usePlayerPerfSampler,
  type PlayerPerfSnapshot,
} from '@/hooks/usePlayerPerfStats';

export type PlayerPerfOverlayProps = {
  enabled: boolean;
  renderCountRef: MutableRefObject<number>;
  /** Extra one-line facts (buffering, src empty, nav size, …). */
  lines?: string[];
};

/**
 * Corner HUD for emulator perf comparison (episode binge / lag).
 * Owns FPS state so sampling does not re-render the player host.
 * pointerEvents=none so it never steals TV focus or phone gestures.
 */
export function PlayerPerfOverlay({
  enabled,
  renderCountRef,
  lines = [],
}: PlayerPerfOverlayProps) {
  const snapshot = usePlayerPerfSampler(enabled, renderCountRef);
  const linesKey = lines.join('|');
  const stableLines = useMemo(() => lines, [linesKey]);

  if (!enabled) return null;

  return <PerfHud snapshot={snapshot} lines={stableLines} />;
}

function PerfHud({
  snapshot,
  lines,
}: {
  snapshot: PlayerPerfSnapshot;
  lines: string[];
}) {
  const fpsColor =
    snapshot.fps >= 50 ? '#7CFFB2' : snapshot.fps >= 30 ? '#FFD56A' : '#FF7A7A';
  const uiColor =
    snapshot.uiRps <= 2 ? '#7CFFB2' : snapshot.uiRps <= 6 ? '#FFD56A' : '#FF7A7A';

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Text style={[styles.line, { color: fpsColor }]}>
        JS {snapshot.fps} fps · {snapshot.frameMs} ms
      </Text>
      <Text style={[styles.line, { color: uiColor }]}>
        UI {snapshot.uiRps}/s · Σ{snapshot.uiRenders}
      </Text>
      {lines.map((line) => (
        <Text key={line} style={styles.meta}>
          {line}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 9999,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.72)',
    gap: 2,
    maxWidth: 280,
  },
  line: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  meta: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontVariant: ['tabular-nums'],
  },
});
