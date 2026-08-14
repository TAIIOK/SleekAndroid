export type FriendStatus = "pending" | "accepted" | "blocked" | string;

export interface FriendUser {
  id: string;
  email?: string | null;
  nickname?: string;
  avatar?: string | { url?: string } | null;
  isOnline?: boolean;
  lastLogin?: string | null;
  gender?: string | null;
  isAdmin?: boolean;
}

export interface Friendship {
  id: number;
  status: FriendStatus;
  createdAt: string;
  updatedAt: string;
  /** true when the current user is the sender (outgoing side). */
  inbox: boolean;
  user: FriendUser;
}

export interface FriendsMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FriendsResponse {
  data: Friendship[];
  meta: FriendsMeta;
}

export interface UserSearchResult {
  id: string;
  nickname?: string;
  avatar?: string | { url?: string } | null;
  isOnline?: boolean;
}

export function normalizeFriendStatus(status: FriendStatus | undefined): string {
  return String(status ?? "").trim().toLowerCase();
}

export function isAcceptedFriendship(friendship: Friendship): boolean {
  return normalizeFriendStatus(friendship.status) === "accepted";
}

export function isPendingFriendship(friendship: Friendship): boolean {
  return normalizeFriendStatus(friendship.status) === "pending";
}

export function isIncomingRequest(friendship: Friendship): boolean {
  return isPendingFriendship(friendship) && !friendship.inbox;
}

export function isOutgoingRequest(friendship: Friendship): boolean {
  return isPendingFriendship(friendship) && friendship.inbox;
}
