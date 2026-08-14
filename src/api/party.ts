import { request, requestData } from '@/api/client';
import { normalizePartyChatMessages, normalizePartyMembers } from '@/lib/partyMembers';
import type {
  CreatePartyRoomPayload,
  JoinPartyRoomPayload,
  PartyChatMessage,
  PartyContent,
  PartyControlRequest,
  PartyInvite,
  PartyInvitePreview,
  PartyLobbyOwner,
  PartyLobbyPlayback,
  PartyLobbyStats,
  PartyMember,
  PartyReactionEvent,
  PartyRoom,
} from '@/types/party';

/** Resolve room id from flat PartyRoom, `{ roomId }`, or nested `{ room: { id } }`. */
export function resolvePartyRoomId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const p = payload as Record<string, unknown>;
  if (typeof p.id === "string" && p.id) return p.id;
  if (typeof p.roomId === "string" && p.roomId) return p.roomId;
  const nested = p.room;
  if (nested && typeof nested === "object") {
    const id = (nested as { id?: unknown }).id;
    if (typeof id === "string" && id) return id;
  }
  return undefined;
}

/** Normalize API room payloads (flat client DTO or legacy nested details) into PartyRoom. */
export function normalizePartyRoom(payload: unknown): PartyRoom {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid party room response");
  }
  const p = payload as Record<string, unknown>;

  // Legacy nested: { room, state, members, content }
  if (p.room && typeof p.room === "object") {
    const room = p.room as Record<string, unknown>;
    const state = p.state && typeof p.state === "object" ? (p.state as Record<string, unknown>) : undefined;
    const content: PartyContent = {
      contentType: (room.contentType as PartyContent["contentType"]) || "anime",
      animeId: typeof room.animeId === "number" ? room.animeId : undefined,
      tmdbId: typeof room.tmdbId === "number" ? room.tmdbId : undefined,
      kind: room.kind === "movie" || room.kind === "tv" ? room.kind : undefined,
      sourceId: typeof room.sourceId === "string" ? room.sourceId : undefined,
      translatorId:
        typeof room.translatorId === "string"
          ? room.translatorId
          : typeof room.translatorId === "number"
            ? String(room.translatorId)
            : undefined,
      season: typeof room.season === "number" ? room.season : undefined,
      episode: typeof room.episode === "number" ? room.episode : undefined,
    };
    const nestedContent = p.content;
    if (nestedContent && typeof nestedContent === "object" && "title" in nestedContent) {
      const title = (nestedContent as { title?: unknown }).title;
      if (typeof title === "string") content.title = title;
    }
    const members = Array.isArray(p.members) ? p.members : [];
    const nestedPlayback =
      p.playback && typeof p.playback === "object"
        ? (p.playback as Record<string, unknown>)
        : state;
    const playback: PartyLobbyPlayback | undefined = nestedPlayback
      ? {
          isPlaying: Boolean(nestedPlayback.isPlaying),
          playbackTimeSec:
            typeof nestedPlayback.playbackTimeSec === "number"
              ? nestedPlayback.playbackTimeSec
              : 0,
          durationSec:
            typeof nestedPlayback.durationSec === "number" ? nestedPlayback.durationSec : null,
          updatedAt:
            typeof nestedPlayback.updatedAt === "string" ? nestedPlayback.updatedAt : undefined,
          playbackRate:
            typeof nestedPlayback.playbackRate === "number" ? nestedPlayback.playbackRate : 1,
        }
      : undefined;
    return {
      id: String(room.id ?? ""),
      title: String(room.title ?? ""),
      isPrivate: Boolean(room.isPrivate),
      ownerId: String(room.ownerId ?? ""),
      leaderUserId:
        (typeof state?.leaderUserId === "string" && state.leaderUserId) ||
        String(room.ownerId ?? ""),
      joinCode: typeof room.joinCode === "string" ? room.joinCode : undefined,
      maxMembers: typeof room.maxMembers === "number" ? room.maxMembers : undefined,
      memberCount: members.length,
      allowGuestControl: Boolean(room.allowGuestControl),
      allowGuestPause: Boolean(room.allowGuestPause),
      allowGuestSeek: Boolean(room.allowGuestSeek),
      pauseOnMemberDisconnect: Boolean(
        (room as { pauseOnMemberDisconnect?: unknown }).pauseOnMemberDisconnect,
      ),
      content,
      playback,
      createdAt: typeof room.createdAt === "string" ? room.createdAt : undefined,
      updatedAt: typeof room.updatedAt === "string" ? room.updatedAt : undefined,
    };
  }

  const id = resolvePartyRoomId(p);
  if (!id) throw new Error("Party room response missing id");

  const flat = p as unknown as PartyRoom;
  const rawContent =
    p.content && typeof p.content === "object"
      ? (p.content as Record<string, unknown>)
      : null;
  const content: PartyContent | undefined = rawContent
    ? {
        contentType:
          (typeof rawContent.contentType === "string"
            ? rawContent.contentType
            : "anime") as PartyContent["contentType"],
        animeId: typeof rawContent.animeId === "number" ? rawContent.animeId : undefined,
        tmdbId: typeof rawContent.tmdbId === "number" ? rawContent.tmdbId : undefined,
        kind:
          rawContent.kind === "movie" || rawContent.kind === "tv"
            ? rawContent.kind
            : undefined,
        sourceId: typeof rawContent.sourceId === "string" ? rawContent.sourceId : undefined,
        translatorId:
          typeof rawContent.translatorId === "string"
            ? rawContent.translatorId
            : typeof rawContent.translatorId === "number"
              ? String(rawContent.translatorId)
              : undefined,
        season: typeof rawContent.season === "number" ? rawContent.season : undefined,
        episode: typeof rawContent.episode === "number" ? rawContent.episode : undefined,
        title: typeof rawContent.title === "string" ? rawContent.title : undefined,
        poster: typeof rawContent.poster === "string" ? rawContent.poster : undefined,
      }
    : flat.content;

  const rawPlayback =
    p.playback && typeof p.playback === "object"
      ? (p.playback as Record<string, unknown>)
      : null;
  const rawState =
    p.state && typeof p.state === "object" ? (p.state as Record<string, unknown>) : null;
  const playbackSource = rawPlayback ?? rawState;
  const playback: PartyLobbyPlayback | undefined = playbackSource
    ? {
        isPlaying: Boolean(playbackSource.isPlaying),
        playbackTimeSec:
          typeof playbackSource.playbackTimeSec === "number"
            ? playbackSource.playbackTimeSec
            : 0,
        durationSec:
          typeof playbackSource.durationSec === "number" ? playbackSource.durationSec : null,
        updatedAt:
          typeof playbackSource.updatedAt === "string" ? playbackSource.updatedAt : undefined,
        playbackRate:
          typeof playbackSource.playbackRate === "number" ? playbackSource.playbackRate : 1,
      }
    : flat.playback;

  return {
    ...flat,
    id,
    owner: p.owner && typeof p.owner === "object" ? (p.owner as PartyLobbyOwner) : flat.owner,
    playback,
    content,
  };
}

async function requestPartyRoom(path: string, init?: Parameters<typeof requestData>[1]): Promise<PartyRoom> {
  const raw = await requestData<unknown>(path, init);
  return normalizePartyRoom(raw);
}

/** Public lobby — non-private rooms only. */
export async function listPublicPartyRooms(): Promise<PartyRoom[]> {
  try {
    const list = await requestData<unknown[]>("/api/party/rooms");
    return (list ?? []).map((item) => normalizePartyRoom(item));
  } catch {
    return [];
  }
}

/** Rooms the current user owns or is a member of. */
export async function listMyPartyRooms(): Promise<PartyRoom[]> {
  try {
    const list = await requestData<unknown[]>("/api/party/rooms/my");
    return (list ?? []).map((item) => normalizePartyRoom(item));
  } catch {
    return [];
  }
}

/** Lobby footer metrics. */
export async function getPartyLobbyStats(): Promise<PartyLobbyStats> {
  try {
    return await requestData<PartyLobbyStats>("/api/party/stats");
  } catch {
    return { viewersOnline: 0, activeRooms: 0, averageRating: 0 };
  }
}

export async function createPartyRoom(payload: CreatePartyRoomPayload): Promise<PartyRoom> {
  return requestPartyRoom("/api/party/rooms", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getPartyRoom(roomId: string): Promise<PartyRoom> {
  return requestPartyRoom(`/api/party/rooms/${roomId}`);
}

export async function joinPartyRoom(
  roomId: string,
  payload?: JoinPartyRoomPayload,
): Promise<PartyRoom> {
  return requestPartyRoom(`/api/party/rooms/${roomId}/join`, {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
}

export async function leavePartyRoom(roomId: string): Promise<void> {
  await request(`/api/party/rooms/${roomId}/leave`, { method: "POST" });
}

export async function deletePartyRoom(roomId: string): Promise<void> {
  await request(`/api/party/rooms/${roomId}`, { method: "DELETE" });
}

export async function createPartyInvite(roomId: string): Promise<PartyInvite> {
  return requestData<PartyInvite>(`/api/party/rooms/${roomId}/invite`, {
    method: "POST",
  });
}

export async function getPartyInvitePreview(token: string): Promise<PartyInvitePreview> {
  return requestData<PartyInvitePreview>(`/api/party/invite/${token}`);
}

export async function acceptPartyInvite(token: string): Promise<PartyRoom> {
  return requestPartyRoom("/api/party/invite/accept", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

export async function joinPartyByCode(code: string): Promise<PartyRoom> {
  return requestPartyRoom(`/api/party/join-code/${encodeURIComponent(code)}`, {
    method: "POST",
  });
}

export async function sendPartyControl(
  roomId: string,
  payload: PartyControlRequest,
): Promise<void> {
  await request(`/api/party/rooms/${roomId}/control`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePartyContent(
  roomId: string,
  payload: PartyContent | Record<string, unknown>,
): Promise<PartyRoom> {
  return requestPartyRoom(`/api/party/rooms/${roomId}/content`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePartyPrivacy(
  roomId: string,
  isPrivate: boolean,
): Promise<PartyRoom> {
  return requestPartyRoom(`/api/party/rooms/${roomId}/privacy`, {
    method: "POST",
    body: JSON.stringify({ isPrivate, is_private: isPrivate }),
  });
}

export async function updatePartyPermissions(
  roomId: string,
  flags: {
    allowGuestControl: boolean;
    allowGuestPause: boolean;
    allowGuestSeek: boolean;
    pauseOnMemberDisconnect: boolean;
  },
): Promise<void> {
  await request(`/api/party/rooms/${roomId}/permissions`, {
    method: "POST",
    body: JSON.stringify(flags),
  });
}

export async function kickPartyMember(roomId: string, memberId: string): Promise<void> {
  await request(`/api/party/rooms/${roomId}/kick`, {
    method: "POST",
    body: JSON.stringify({ member_id: memberId }),
  });
}

export async function transferPartyLeader(roomId: string, newLeaderId: string): Promise<void> {
  await request(`/api/party/rooms/${roomId}/leader`, {
    method: "POST",
    body: JSON.stringify({ new_leader_id: newLeaderId }),
  });
}

export async function listPartyMembers(roomId: string): Promise<PartyMember[]> {
  try {
    const raw = await requestData<unknown[]>(`/api/party/rooms/${roomId}/members`);
    return normalizePartyMembers(raw);
  } catch {
    return [];
  }
}

export async function listPartyMessages(roomId: string): Promise<PartyChatMessage[]> {
  try {
    const raw = await requestData<unknown[]>(`/api/party/rooms/${roomId}/messages`);
    return normalizePartyChatMessages(raw);
  } catch {
    return [];
  }
}

export async function sendPartyMessage(roomId: string, text: string): Promise<PartyChatMessage> {
  return requestData<PartyChatMessage>(`/api/party/rooms/${roomId}/messages`, {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function sendPartyReaction(roomId: string, emoji: string): Promise<void> {
  await request(`/api/party/rooms/${roomId}/reaction`, {
    method: "POST",
    body: JSON.stringify({ emoji }),
  });
}

export async function listPartyReactions(roomId: string): Promise<PartyReactionEvent[]> {
  try {
    return await requestData<PartyReactionEvent[]>(`/api/party/rooms/${roomId}/reactions`);
  } catch {
    return [];
  }
}
