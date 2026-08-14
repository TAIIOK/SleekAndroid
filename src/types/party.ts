/** Watch Party (совместный просмотр) — REST + Socket.IO party:* contract types (v1). */

export type PartyContentType = "anime" | "movie" | "tv" | "lampa";

export type PartyMemberRole = "owner" | "leader" | "member" | "guest";

export interface PartyContent {
  contentType: PartyContentType;
  animeId?: number;
  tmdbId?: number;
  /** Lampa media kind — disambiguates movie vs tv for the same tmdbId. */
  kind?: "movie" | "tv";
  /** WatchHub source preference (synced so guests resolve the same stream family). */
  sourceId?: string;
  /** WatchHub translator preference (stringified id). */
  translatorId?: string;
  season?: number;
  episode?: number;
  title?: string;
  poster?: string;
}

export interface PartyLobbyOwner {
  id: string;
  nickname: string;
  avatar?: string | null;
}

export interface PartyLobbyPlayback {
  isPlaying: boolean;
  playbackTimeSec: number;
  durationSec?: number | null;
  playbackRate?: number;
  updatedAt?: string;
}

export interface PartyRoom {
  id: string;
  title: string;
  isPrivate: boolean;
  ownerId: string;
  leaderUserId?: string;
  joinCode?: string;
  maxMembers?: number;
  memberCount?: number;
  allowGuestControl?: boolean;
  allowGuestPause?: boolean;
  allowGuestSeek?: boolean;
  /** Pause when any non-host member drops presence. Host disconnect always pauses. */
  pauseOnMemberDisconnect?: boolean;
  content?: PartyContent;
  owner?: PartyLobbyOwner;
  playback?: PartyLobbyPlayback;
  createdAt?: string;
  updatedAt?: string;
}

export interface PartyLobbyStats {
  viewersOnline: number;
  activeRooms: number;
  averageRating: number;
}

export interface PartyMember {
  userId: string;
  nickname?: string;
  avatar?: string;
  role: PartyMemberRole;
  online?: boolean;
  muted?: boolean;
  joinedAt?: string;
}

/** Raw room playback state as returned by the server (before effective-time projection). */
export interface PartyRoomState {
  roomId: string;
  isPlaying: boolean;
  playbackTimeSec: number;
  playbackRate: number;
  updatedAt?: string;
  leaderUserId?: string;
  content?: PartyContent;
}

export type PartyControlActionType = "play" | "pause" | "seek" | "rate" | "content" | "sync";

export interface PartyControlPayload {
  time?: number;
  rate?: number;
  /** Media duration in seconds (leader reports for lobby progress). */
  duration?: number;
  durationSec?: number;
  /** Server/host anchor for projecting effective time on the follower. */
  updatedAt?: string;
  playbackRate?: number;
  /** System pause reasons: host_disconnect | member_disconnect */
  reason?: string;
  userId?: string;
  contentType?: PartyContentType;
  animeId?: number;
  tmdbId?: number;
  kind?: "movie" | "tv";
  sourceId?: string;
  translatorId?: string;
  season?: number;
  episode?: number;
  title?: string;
}

export interface PartyControlEvent {
  from: string;
  action: PartyControlActionType;
  data?: PartyControlPayload;
  seq?: number;
}

export interface PartyChatMessage {
  id: string;
  userId: string;
  nickname?: string;
  avatar?: string;
  text: string;
  createdAt: string;
}

/** Client-only system row in the party chat timeline (not from REST/socket chat). */
export interface PartySystemMessage {
  id: string;
  kind: "system";
  text: string;
  createdAt: string;
}

export type PartyTimelineItem =
  | ({ kind: "chat" } & PartyChatMessage)
  | PartySystemMessage;

export interface PartyReactionEvent {
  id?: string;
  userId: string;
  nickname?: string;
  emoji: string;
  createdAt?: string;
}

export interface PartyErrorEvent {
  code: string;
  message: string;
}

export interface CreatePartyRoomPayload {
  title: string;
  isPrivate: boolean;
  contentType: PartyContentType;
  animeId?: number;
  tmdbId?: number;
  kind?: "movie" | "tv";
  sourceId?: string;
  translatorId?: string;
  season?: number;
  episode?: number;
  maxMembers?: number;
  allowGuestControl?: boolean;
  allowGuestPause?: boolean;
  allowGuestSeek?: boolean;
  pauseOnMemberDisconnect?: boolean;
}

export interface JoinPartyRoomPayload {
  inviteToken?: string;
}

export interface PartyInvite {
  token: string;
  joinCode: string;
  urlPath: string;
  expiresAt: string;
}

export interface PartyInvitePreview {
  roomId: string;
  title?: string;
  isPrivate?: boolean;
  memberCount?: number;
  content?: PartyContent;
  expiresAt?: string;
  expired?: boolean;
}

export interface PartyControlRequest {
  action: PartyControlActionType;
  data?: PartyControlPayload;
}

export interface PartyPrivacyPayload {
  isPrivate: boolean;
}

/** Derived, client-side permission summary for the current user in a room. */
export interface PartyPermissions {
  isOwner: boolean;
  isLeader: boolean;
  canPlayPause: boolean;
  canSeek: boolean;
  canChangeContent: boolean;
  canKick: boolean;
  canManageInvites: boolean;
  canChat: boolean;
}
