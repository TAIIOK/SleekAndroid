export type FriendshipStatus =
  | "none"
  | "pending_outgoing"
  | "pending_incoming"
  | "accepted"
  | "blocked";

export type ProfileVisibilityLevel = "visible" | "friends_only" | "hidden";

export interface ProfileVisibilityMap {
  stats?: ProfileVisibilityLevel;
  library?: ProfileVisibilityLevel;
  collections?: ProfileVisibilityLevel;
  activity?: ProfileVisibilityLevel;
  watchingNow?: ProfileVisibilityLevel;
  friendsList?: ProfileVisibilityLevel;
  achievements?: ProfileVisibilityLevel;
  ratings?: ProfileVisibilityLevel;
  reviews?: ProfileVisibilityLevel;
}

export interface PublicUserProfile {
  id: string;
  nickname?: string;
  avatar?: string | { url?: string } | null;
  isOnline?: boolean;
  lastLogin?: string;
  gender?: string | null;
  createdAt?: string;
  friendshipStatus?: FriendshipStatus;
  profileVisibility?: ProfileVisibilityMap;
}

export type UserProfileTab = "overview" | "lists" | "activity" | "friends";

export const USER_PROFILE_TABS: { id: UserProfileTab; label: string }[] = [
  { id: "overview", label: "Обзор" },
  { id: "lists", label: "Списки" },
  { id: "activity", label: "Активность" },
  { id: "friends", label: "Друзья" },
];

export interface MutualFriendBrief {
  id: string;
  nickname?: string;
  avatar?: string | { url?: string } | null;
  isOnline?: boolean;
}

export interface FriendsLeaderboardResponse {
  viewerRank?: number | null;
  entries: import("@/types/profile").LeaderboardEntry[];
}

export interface PublicUserRating {
  id: string;
  entityType: string;
  entityId: string;
  value: number;
  createdAt: string;
}

export interface PublicUserReview {
  id: string;
  entityType: string;
  entityId: string;
  content: string;
  createdAt: string;
}

export interface TasteCompatibility {
  compatibility?: number;
  compatibilityPercent?: number;
  userId?: string;
  targetUserId?: string;
  commonAnime?: number;
  commonManga?: number;
  similarRatings?: number;
  commonGenres?: Array<{
    genreId?: number;
    name?: string;
    description?: string;
    weight?: number;
  }>;
}

export interface UserWatchingNow {
  kind: "anime" | "movie" | "tv";
  title?: string;
  poster?: string;
  to: string;
  progress: number;
  updatedAt?: string;
  animeId?: number;
  episodeId?: number;
  episodeOrdinal?: number;
  episodesTotal?: number;
  mediaKind?: string;
  lampaId?: string;
  seasonOrdinal?: number;
  episodeNumber?: number;
  score?: number;
}

export interface UserProfileLinkTarget {
  id: string;
  nickname?: string | null;
  isGuest?: boolean;
}

function shouldUseNicknameInProfileUrl(target: UserProfileLinkTarget): boolean {
  const nickname = target.nickname?.trim();
  if (!nickname) return false;
  if (target.isGuest) return false;
  if (nickname.toLowerCase() === "гость") return false;
  return true;
}

/** Builds a human-readable profile URL using nickname when available. */
export function userProfilePath(target: string | UserProfileLinkTarget): string {
  if (typeof target === "string") {
    const ref = target.trim();
    return `/users/${encodeURIComponent(ref)}`;
  }
  if (shouldUseNicknameInProfileUrl(target)) {
    return `/users/${encodeURIComponent(target.nickname!.trim())}`;
  }
  return `/users/${encodeURIComponent(target.id)}`;
}

/** Canonical URL segment for redirects (nickname or id). */
export function userProfileSlug(target: UserProfileLinkTarget): string {
  if (shouldUseNicknameInProfileUrl(target)) {
    return target.nickname!.trim();
  }
  return target.id;
}

const TAB_SEGMENTS: Record<Exclude<UserProfileTab, "overview">, string> = {
  lists: "lists",
  activity: "activity",
  friends: "friends",
};

/** Builds profile URL with optional tab segment. */
export function userProfileTabPath(
  target: string | UserProfileLinkTarget,
  tab: UserProfileTab = "overview",
): string {
  const base = userProfilePath(target);
  if (tab === "overview") return base;
  return `${base}/${TAB_SEGMENTS[tab]}`;
}

/** Maps pathname suffix to profile tab id. */
export function userProfileTabFromPath(pathname: string, basePath: string): UserProfileTab {
  const suffix = pathname.slice(basePath.length).replace(/^\//, "");
  switch (suffix) {
    case "lists":
      return "lists";
    case "activity":
      return "activity";
    case "friends":
      return "friends";
    default:
      return "overview";
  }
}
