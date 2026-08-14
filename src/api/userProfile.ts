import { fetchUserFriends as fetchUserFriendsList } from '@/api/friends';
import { request, requestData, unwrapData } from '@/api/client';
import {
  normalizeCollection,
  normalizeCollectionDetail,
} from '@/api/collections';
import type { ActivityFeedResponse } from '@/types/activityFeed';
import type { UserCollection, UserCollectionDetail } from '@/types/collection';
import type { FetchLibraryOptions, BookmarkEntry } from '@/types/library';
import type { UserStats } from '@/api/user';
import type { AchievementsData, LeaderboardType } from '@/types/profile';
import type {
  FriendsLeaderboardResponse,
  MutualFriendBrief,
  PublicUserProfile,
  PublicUserRating,
  PublicUserReview,
  TasteCompatibility,
  UserWatchingNow,
  ProfileVisibilityMap,
} from '@/types/userProfile';

// Re-export normalize helpers used by public profile library fetches.
export { normalizeCollection, normalizeCollectionDetail };

const DEFAULT_ACTIVITIES_LIMIT = 20;

export interface FetchUserActivitiesOptions {
  limit?: number;
  offset?: number;
}

function normalizePublicUserProfile(raw: unknown): PublicUserProfile | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const id = obj.id;
  if (typeof id !== 'string' || !id.trim()) return null;

  return {
    id,
    nickname: typeof obj.nickname === 'string' ? obj.nickname : undefined,
    avatar: obj.avatar as PublicUserProfile['avatar'],
    isOnline: typeof obj.isOnline === 'boolean' ? obj.isOnline : undefined,
    lastLogin: typeof obj.lastLogin === 'string' ? obj.lastLogin : undefined,
    gender: typeof obj.gender === 'string' ? obj.gender : obj.gender === null ? null : undefined,
    createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : undefined,
    friendshipStatus: obj.friendshipStatus as PublicUserProfile['friendshipStatus'],
    profileVisibility: obj.profileVisibility as ProfileVisibilityMap | undefined,
  };
}

export async function fetchUserBrief(userId: string): Promise<PublicUserProfile | null> {
  try {
    const data = await requestData<unknown>(`/api/user/${encodeURIComponent(userId)}`);
    return normalizePublicUserProfile(data);
  } catch {
    return null;
  }
}

export async function fetchUserFriends(userId: string) {
  return fetchUserFriendsList(userId);
}

export async function fetchUserActivities(
  userId: string,
  options: FetchUserActivitiesOptions = {},
): Promise<ActivityFeedResponse> {
  const limit = options.limit ?? DEFAULT_ACTIVITIES_LIMIT;
  const offset = options.offset ?? 0;
  try {
    const json = await request<ActivityFeedResponse>(
      `/api/user/${encodeURIComponent(userId)}/activities?limit=${limit}&offset=${offset}`,
    );
    return {
      data: json.data ?? [],
      meta: json.meta ?? { limit },
    };
  } catch {
    return { data: [], meta: { limit } };
  }
}

function buildUserLibraryQuery(options?: FetchLibraryOptions): string {
  const params = new URLSearchParams();
  if (options?.isFavorite) params.set('isFavorite', 'true');
  if (options?.include) params.set('include', options.include);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export async function fetchUserMutualFriends(userId: string): Promise<MutualFriendBrief[]> {
  try {
    const data = await requestData<MutualFriendBrief[]>(
      `/api/user/${encodeURIComponent(userId)}/friends/mutual`,
    );
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchFriendsLeaderboard(
  period: 'week' | 'month' = 'week',
  type: LeaderboardType = 'watch',
): Promise<FriendsLeaderboardResponse | null> {
  try {
    return await requestData<FriendsLeaderboardResponse>(
      `/api/user/leaderboard/friends?period=${period}&type=${type}`,
    );
  } catch {
    return null;
  }
}

export async function fetchUserRatings(userId: string, limit = 10): Promise<PublicUserRating[]> {
  try {
    const data = await requestData<PublicUserRating[]>(
      `/api/user/${encodeURIComponent(userId)}/ratings?limit=${limit}`,
    );
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchUserReviews(userId: string, limit = 5): Promise<PublicUserReview[]> {
  try {
    const data = await requestData<PublicUserReview[]>(
      `/api/user/${encodeURIComponent(userId)}/reviews?limit=${limit}`,
    );
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchPublicUserStats(userId: string): Promise<UserStats | null> {
  try {
    return await requestData<UserStats>(`/api/user/${encodeURIComponent(userId)}/stats`);
  } catch {
    return null;
  }
}

export async function fetchUserAchievements(userId: string): Promise<AchievementsData> {
  try {
    return await requestData<AchievementsData>(
      `/api/user/${encodeURIComponent(userId)}/achievements`,
    );
  } catch {
    return { catalog: [], state: [] };
  }
}

export async function fetchUserLibraryAnimeRaw(
  userId: string,
  options?: FetchLibraryOptions,
): Promise<unknown[]> {
  try {
    const json = await request<unknown>(
      `/api/user/${encodeURIComponent(userId)}/library/anime${buildUserLibraryQuery(options)}`,
    );
    const data = unwrapData(json);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchUserLibraryLampaRaw(
  userId: string,
  options?: FetchLibraryOptions,
): Promise<unknown[]> {
  try {
    const json = await request<unknown>(
      `/api/user/${encodeURIComponent(userId)}/library/lampa${buildUserLibraryQuery(options)}`,
    );
    const data = unwrapData(json);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export async function fetchUserWatchingNow(userId: string): Promise<UserWatchingNow | null> {
  try {
    const data = await requestData<UserWatchingNow | null>(
      `/api/user/${encodeURIComponent(userId)}/watching-now`,
    );
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

export async function fetchUserRecentlyWatched(
  userId: string,
  limit = 6,
): Promise<UserWatchingNow[]> {
  try {
    const data = await requestData<unknown[]>(
      `/api/user/${encodeURIComponent(userId)}/recently-watched?limit=${limit}`,
    );
    if (!Array.isArray(data)) return [];
    return data.filter((row): row is UserWatchingNow => row != null && typeof row === 'object');
  } catch {
    return [];
  }
}

export async function fetchUserTasteCompatibility(
  userId: string,
): Promise<TasteCompatibility | null> {
  try {
    return await requestData<TasteCompatibility>(
      `/api/user/${encodeURIComponent(userId)}/taste/compatibility`,
    );
  } catch {
    return null;
  }
}

export async function fetchUserCollections(userId: string): Promise<UserCollection[]> {
  try {
    const json = await request<unknown>(`/api/user/${encodeURIComponent(userId)}/collections`);
    const data = unwrapData(json);
    if (!Array.isArray(data)) return [];
    return data
      .map(normalizeCollection)
      .filter((col): col is UserCollection => col != null);
  } catch {
    return [];
  }
}

export async function fetchUserCollection(
  userId: string,
  collectionId: number,
): Promise<UserCollectionDetail | null> {
  try {
    const json = await request<unknown>(
      `/api/user/${encodeURIComponent(userId)}/collections/${collectionId}`,
    );
    return normalizeCollectionDetail(json);
  } catch {
    return null;
  }
}

export type { BookmarkEntry };
