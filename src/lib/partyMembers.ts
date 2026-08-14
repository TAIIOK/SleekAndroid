import type { PartyChatMessage, PartyMember, PartyMemberRole } from "@/types/party";

/** Normalize REST/socket member payloads (`isMuted` → `muted`, etc.). */
export function normalizePartyMember(raw: unknown): PartyMember | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const userId = typeof m.userId === "string" ? m.userId : "";
  if (!userId) return null;
  const role = (typeof m.role === "string" ? m.role : "member") as PartyMemberRole;
  return {
    userId,
    nickname: typeof m.nickname === "string" ? m.nickname : undefined,
    avatar: typeof m.avatar === "string" ? m.avatar : undefined,
    role,
    online: Boolean(m.online),
    muted: Boolean(m.muted ?? m.isMuted),
    joinedAt: typeof m.joinedAt === "string" ? m.joinedAt : undefined,
  };
}

export function normalizePartyMembers(list: unknown): PartyMember[] {
  if (!Array.isArray(list)) return [];
  return list.map(normalizePartyMember).filter((m): m is PartyMember => !!m);
}

export function normalizePartyChatMessage(raw: unknown): PartyChatMessage | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const id = typeof m.id === "string" ? m.id : "";
  const userId = typeof m.userId === "string" ? m.userId : "";
  const text = typeof m.text === "string" ? m.text : "";
  if (!id || !userId || !text) return null;
  return {
    id,
    userId,
    text,
    nickname: typeof m.nickname === "string" ? m.nickname : undefined,
    avatar: typeof m.avatar === "string" ? m.avatar : undefined,
    createdAt: typeof m.createdAt === "string" ? m.createdAt : new Date().toISOString(),
  };
}

export function normalizePartyChatMessages(list: unknown): PartyChatMessage[] {
  if (!Array.isArray(list)) return [];
  return list.map(normalizePartyChatMessage).filter((m): m is PartyChatMessage => !!m);
}
