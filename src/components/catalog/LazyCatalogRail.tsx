import type { ReactNode } from 'react';
import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';

import { layout } from '@/constants/aniverse';
import { useNearViewport } from '@/hooks/useNearViewport';
import { estimateCatalogRailHeight } from '@/lib/catalogRailLayout';
import { useHomeScrollLazySlot } from '@/providers/HomeScrollLazy';
import { isTvUi } from '@/lib/isTvUi';

type LazyCatalogRailProps = {
  /** Start mounted (skip the first placeholder frame). Still unmounts when far. */
  eager?: boolean;
  /** Phone home: scroll-Y gating via HomeScrollLazy. */
  homeLazy?: boolean;
  /** Unique id for scroll-position lazy gating on phone home. */
  sessionKey?: string;
  rootMargin?: number;
  deactivateWhenFar?: boolean;
  placeholderMinHeight?: number;
  children: ReactNode;
};

function resolveLazyOptions({
  eager,
  homeLazy,
  rootMargin,
  deactivateWhenFar,
}: Pick<LazyCatalogRailProps, 'eager' | 'homeLazy' | 'rootMargin' | 'deactivateWhenFar'>) {
  const phoneHome = Boolean(homeLazy && !isTvUi());
  return {
    eager,
    rootMargin: rootMargin ?? (phoneHome ? layout.homeLazyRootMargin : undefined),
    // Phone browse + TV: unmount rails that left the keep band.
    deactivateWhenFar: deactivateWhenFar ?? !phoneHome,
    recheckOnFocus: !phoneHome,
  };
}

function PhoneHomeLazyRail({
  sessionKey,
  eager = false,
  children,
}: {
  sessionKey: string;
  eager?: boolean;
  children: ReactNode;
}) {
  const { active, onLayout, viewRef, estimatedHeight } = useHomeScrollLazySlot(sessionKey);
  const show = eager || active;

  return (
    <View
      ref={viewRef}
      collapsable={false}
      onLayout={onLayout}
      style={show ? undefined : { minHeight: estimatedHeight }}
    >
      {show ? children : null}
    </View>
  );
}

function ViewportLazyRail({
  lazyOptions,
  placeholderHeight,
  children,
}: {
  lazyOptions: ReturnType<typeof resolveLazyOptions>;
  placeholderHeight: number;
  children: ReactNode;
}) {
  const { ref, active, onLayoutCheck } = useNearViewport(lazyOptions);
  const [slotHeight, setSlotHeight] = useState(placeholderHeight);

  const onLayout = (event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    if (active) {
      if (height > placeholderHeight * 0.5) {
        setSlotHeight(height);
      } else if (height < 16) {
        // Successful empty rails collapse; do not keep a full-rail gap when far.
        setSlotHeight(0);
      }
    }
    onLayoutCheck({ y, height });
  };

  return (
    <View
      ref={ref}
      collapsable={false}
      onLayout={onLayout}
      style={!active ? { minHeight: slotHeight } : undefined}
    >
      {active ? children : null}
    </View>
  );
}

/**
 * Defers mounting rail content until the slot is near the viewport.
 * Phone home uses scroll-position gating (no measureInWindow per frame).
 * TV / browse unmount rails that leave the keep band.
 */
export function LazyCatalogRail({
  eager = false,
  homeLazy = false,
  sessionKey,
  rootMargin,
  deactivateWhenFar,
  placeholderMinHeight,
  children,
}: LazyCatalogRailProps) {
  const phoneHome = Boolean(homeLazy && !isTvUi());
  const lazyOptions = resolveLazyOptions({ eager, homeLazy, rootMargin, deactivateWhenFar });
  const placeholderHeight = placeholderMinHeight ?? estimateCatalogRailHeight();

  if (phoneHome && sessionKey) {
    return (
      <PhoneHomeLazyRail sessionKey={sessionKey} eager={eager}>
        {children}
      </PhoneHomeLazyRail>
    );
  }

  return (
    <ViewportLazyRail lazyOptions={lazyOptions} placeholderHeight={placeholderHeight}>
      {children}
    </ViewportLazyRail>
  );
}
