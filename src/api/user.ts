import { request, requestData } from './client';
import type {
  AchievementsData,
  LeaderboardPeriod,
  LeaderboardResponse,
  LeaderboardType,
} from '@/types/profile';

export interface UserProfile {
  id?: number;
  nickname?: string;
  email?: string;
  avatar?: string;
  isOnline?: boolean;
  boostySubscriptions?: { status?: string }[];
  profileSettings?: { avatarUrl?: string };
}

export interface UserStats {
  totalWatchSeconds?: number;
  totalReadPages?: number;
  totalAchievements?: number;
  totalRatings?: number;
  totalReviews?: number;
  totalFriends?: number;
  isOnline?: boolean;
  lastActivity?: string;
  activity?: {
    totalWatchSeconds?: number;
    totalReadPages?: number;
    lastActivity?: string;
    isOnline?: boolean;
  };
  achievements?: { total?: number };
  social?: { totalRatings?: number; totalReviews?: number };
  history?: { currentStreak?: number; longestStreak?: number };
  preferences?: { topGenres?: { genreId?: number; name?: string }[] };
}

export async function fetchFullProfile(): Promise<UserProfile | null> {
  try {
    return await request<UserProfile>('/api/user');
  } catch {
    return null;
  }
}

export async function fetchUserStats(): Promise<UserStats | null> {
  try {
    return await requestData<UserStats>('/api/user/stats');
  } catch {
    return null;
  }
}

export async function hideActivityFeed(id: string): Promise<void> {
  await request(`/api/user/feed/${encodeURIComponent(id)}/hide`, { method: 'POST' });
}

export async function fetchActivityHistory(): Promise<unknown[]> {
  try {
    const json = await request<{ data?: unknown[] } | unknown[]>('/api/user/history?limit=100');
    if (Array.isArray(json)) return json;
    return json.data ?? [];
  } catch {
    return [];
  }
}

export async function fetchAchievements(): Promise<AchievementsData> {
  try {
    return await requestData<AchievementsData>('/api/user/achievements');
  } catch {
    return { catalog: [], state: [] };
  }
}

export async function fetchLeaderboard(
  period: LeaderboardPeriod = 'week',
  type: LeaderboardType = 'watch',
): Promise<LeaderboardResponse> {
  try {
    const json = await request<LeaderboardResponse>(
      `/api/user/leaderboard?period=${period}&type=${type}`,
    );
    return {
      data: json.data ?? [],
      meta: json.meta ?? { period, type },
    };
  } catch {
    return { data: [], meta: { period, type } };
  }
}
