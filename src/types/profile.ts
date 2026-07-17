export type LeaderboardPeriod = 'week' | 'month';
export type LeaderboardType = 'watch' | 'read';

export interface AchievementCatalogItem {
  id?: string;
  title?: string;
  description?: string;
  icon?: string;
  group?: string;
  rule?: string;
  isActive?: boolean;
}

export interface UserAchievementState {
  id?: string;
  userId?: string;
  achievementId?: string;
  achievement?: AchievementCatalogItem;
  tier?: number;
  progress?: number;
  isUnlocked?: boolean;
  unlockedAt?: string;
  updatedAt?: string;
}

export interface AchievementsData {
  catalog: AchievementCatalogItem[];
  state: UserAchievementState[];
}

export interface LeaderboardUser {
  id?: string;
  nickname?: string;
  avatar?: string | { url?: string };
}

export interface LeaderboardEntry {
  rank?: number;
  value?: number;
  user?: LeaderboardUser;
}

export interface LeaderboardResponse {
  data: LeaderboardEntry[];
  meta: { period?: LeaderboardPeriod; type?: LeaderboardType };
}
