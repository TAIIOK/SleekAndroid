import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { useOnline } from '@/hooks/useOnline';
import { reprobeImageCdn } from '@/lib/imageCdn';

/** Re-probe yani CDN hosts when app becomes active or network returns. */
export function useImageCdnReprobe(): void {
  const online = useOnline();
  const wasOnline = useRef(online);

  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') {
        void reprobeImageCdn('app_active');
      }
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (online && !wasOnline.current) {
      void reprobeImageCdn('online');
    }
    wasOnline.current = online;
  }, [online]);
}
