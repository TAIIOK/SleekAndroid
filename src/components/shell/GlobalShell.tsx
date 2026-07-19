import { OfflineBanner } from '@/components/shell/OfflineBanner';
import { OtaUpdatePrompt } from '@/components/shell/OtaUpdatePrompt';
import { SubscriptionGate } from '@/components/shell/SubscriptionGate';

/** Global overlays: offline notice, OTA update prompt, subscription paywall (site parity). */
export function GlobalShell() {
  return (
    <>
      <OfflineBanner />
      <OtaUpdatePrompt />
      <SubscriptionGate />
    </>
  );
}
