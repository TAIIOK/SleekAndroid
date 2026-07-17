import { Redirect, Slot } from 'expo-router';

import { LibraryHubLayout } from '@/components/library/LibraryHubLayout';

export default function LibraryLayout() {
  return (
    <LibraryHubLayout>
      <Slot />
    </LibraryHubLayout>
  );
}
