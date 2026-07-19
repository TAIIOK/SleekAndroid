import type { ReactNode } from 'react';
import { View } from 'react-native';

import { useNearViewport } from '@/hooks/useNearViewport';
import { estimateCatalogRailHeight } from '@/lib/catalogRailLayout';

type LazyCatalogRailProps = {
  /** Skip visibility gating and mount children immediately. */
  eager?: boolean;
  children: ReactNode;
};

/**
 * Defers mounting rail content until the slot is near the viewport.
 * Reserves estimated height so page scroll length stays stable.
 */
export function LazyCatalogRail({ eager = false, children }: LazyCatalogRailProps) {
  const { ref, active, onLayoutCheck } = useNearViewport({ eager });
  const placeholderHeight = estimateCatalogRailHeight();

  return (
    <View
      ref={ref}
      collapsable={false}
      onLayout={onLayoutCheck}
      style={!active ? { minHeight: placeholderHeight } : undefined}
    >
      {active ? children : null}
    </View>
  );
}
