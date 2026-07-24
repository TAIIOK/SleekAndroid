import { createApiClient, ApiError, SubscriptionRequiredError } from '@aniverse/api';

import { apiUrl } from '@/lib/config';
import { getImageCdnPreferenceSync } from '@/lib/imageCdn';
import { notifySessionExpired } from '@/lib/sessionEvents';
import { clearTokens, getRefreshToken, getToken, setTokens } from '@/lib/storage';

export { ApiError, SubscriptionRequiredError };

let subscriptionHandler: ((message: string) => void) | undefined;

export function setSubscriptionRequiredHandler(handler: ((message: string) => void) | undefined) {
  subscriptionHandler = handler;
}

const api = createApiClient({
  apiUrl,
  storage: {
    getToken,
    getRefreshToken,
    setTokens,
    clearTokens,
  },
  getImageCdnPreference: () => getImageCdnPreferenceSync(),
  onSessionExpired: notifySessionExpired,
  onSubscriptionRequired: (message) => subscriptionHandler?.(message),
});

export const request = api.request;
export const requestData = api.requestData;
export const unwrapData = api.unwrapData;
