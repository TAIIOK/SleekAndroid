import { request, requestData } from '@/api/client';
import type { ActivityFeedResponse, ActivityFeedSettings } from '@/types/activityFeed';

const DEFAULT_FEED_LIMIT = 20;

export interface FetchFriendsFeedOptions {
  limit?: number;
  offset?: number;
}

export async function fetchFriendsFeed(
  options: FetchFriendsFeedOptions = {},
): Promise<ActivityFeedResponse> {
  const limit = options.limit ?? DEFAULT_FEED_LIMIT;
  const offset = options.offset ?? 0;
  try {
    const json = await request<ActivityFeedResponse>(
      `/api/user/feed?limit=${limit}&offset=${offset}`,
    );
    return {
      data: json.data ?? [],
      meta: json.meta ?? { limit },
    };
  } catch {
    return { data: [], meta: { limit } };
  }
}

export async function hideFeedItem(id: string): Promise<void> {
  await request(`/api/user/feed/${encodeURIComponent(id)}/hide`, {
    method: 'POST',
  });
}

export async function fetchFeedUnreadCount(): Promise<number> {
  try {
    const json = await request<{ total?: number }>('/api/user/feed/unread-count');
    return json.total ?? 0;
  } catch {
    return 0;
  }
}

export async function markFeedSeen(): Promise<void> {
  await request('/api/user/feed/mark-seen', { method: 'POST' });
}

export async function fetchActivitySettings(): Promise<ActivityFeedSettings | null> {
  try {
    return await requestData<ActivityFeedSettings>('/api/user/feed/settings');
  } catch {
    return null;
  }
}

export async function updateActivitySettings(
  data: Partial<ActivityFeedSettings>,
): Promise<ActivityFeedSettings | null> {
  try {
    return await requestData<ActivityFeedSettings>('/api/user/feed/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  } catch {
    return null;
  }
}

export async function muteUser(userId: string): Promise<void> {
  await request(`/api/user/mute/${encodeURIComponent(userId)}`, { method: 'POST' });
}

export async function unmuteUser(userId: string): Promise<void> {
  await request(`/api/user/mute/${encodeURIComponent(userId)}`, { method: 'DELETE' });
}

export async function blockUser(userId: string): Promise<void> {
  await request(`/api/user/block/${encodeURIComponent(userId)}`, { method: 'POST' });
}

export async function unblockUser(userId: string): Promise<void> {
  await request(`/api/user/block/${encodeURIComponent(userId)}`, { method: 'DELETE' });
}
