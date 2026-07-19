import { NativeApkUpdatePrompt } from '@/components/shell/NativeApkUpdatePrompt';
import { OfflineBanner } from '@/components/shell/OfflineBanner';
import { OtaUpdatePrompt } from '@/components/shell/OtaUpdatePrompt';
import { SubscriptionGate } from '@/components/shell/SubscriptionGate';

/** Global overlays: offline, OTA (JS), APK binary update, subscription paywall. */
export function GlobalShell() {
  return (
    <>
      <OfflineBanner />
      <OtaUpdatePrompt />
      <NativeApkUpdatePrompt />
      <SubscriptionGate />
    </>
  );
}
