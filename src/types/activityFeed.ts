export interface ActivityFeedActor {
  id: string;
  nickname?: string;
  avatar?: string | { url?: string } | null;
}

export interface ActivityFeedItem {
  id: string;
  actorUserId: string;
  actor?: ActivityFeedActor | null;
  entityType: string;
  entityId?: string | null;
  action: string;
  text?: string | null;
  snapshot?: unknown;
  hiddenByActor?: boolean;
  createdAt: string;
  updatedAt: string;
  grouped?: boolean;
  count?: number | null;
  lastAt?: string | null;
}

export interface ActivityFeedMeta {
  limit: number;
  nextSinceId?: string | null;
  nextUntilId?: string | null;
}

export interface ActivityFeedResponse {
  data: ActivityFeedItem[];
  meta: ActivityFeedMeta;
}

export type ActivityVisibility = "friends" | "all" | "none";

export interface ActivityFeedSettings {
  userId?: string;
  visibility?: ActivityVisibility;
  showAnime?: boolean;
  showManga?: boolean;
  showLampa?: boolean;
  autoPostAchievements?: boolean;
  spoilerDays?: number;
  mutedUserIds?: string[];
  mutedEntityKeys?: string[];
  locale?: string;
  updatedAt?: string;
}

export interface ActivityFeedDisplayItem {
  id: string;
  actor: ActivityFeedActor;
  actionLabel: string;
  title: string;
  poster?: string;
  to: string;
  createdAt: Date | null;
}
