import { OfflineBanner } from '@/components/shell/OfflineBanner';
import { SubscriptionGate } from '@/components/shell/SubscriptionGate';

/** Global overlays: offline notice + subscription paywall (site parity). */
export function GlobalShell() {
  return (
    <>
      <OfflineBanner />
      <SubscriptionGate />
    </>
  );
}
