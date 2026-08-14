import type { Socket } from "socket.io-client";
import {
  connectPartySocket,
  emitSocketAuth,
  getPartySocket,
  isPartyAuthAck,
  isPartySocketAuthed,
} from "@/services/socket";
import { normalizePartyChatMessage, normalizePartyMembers } from "@/lib/partyMembers";
import type {
  PartyChatMessage,
  PartyContent,
  PartyControlActionType,
  PartyControlEvent,
  PartyControlPayload,
  PartyErrorEvent,
  PartyMember,
  PartyReactionEvent,
  PartyRoomState,
} from "@/types/party";

/** Typed wrapper around party Socket.IO events on the root namespace (see socket.ts). */

export function partySocket(): Socket {
  return connectPartySocket();
}

function emitParty(event: string, payload: unknown): void {
  // Ensure transport is up, but never re-auth on every app emit.
  partySocket().emit(event, payload);
}

export function joinPartyRoom(roomId: string): void {
  emitParty("party:join", { roomId });
}

export function leavePartyRoomSocket(roomId: string): void {
  getPartySocket().emit("party:leave", { roomId });
}

export function requestPartyState(roomId: string): void {
  emitParty("party:request_state", { roomId });
}

export function sendPartyControlEvent(
  roomId: string,
  action: PartyControlActionType,
  data?: PartyControlPayload,
): void {
  emitParty("party:control", { roomId, action, data });
}

export function sendPartyLeader(roomId: string, userId: string): void {
  emitParty("party:leader", { roomId, userId });
}

export function sendPartyReactionEvent(roomId: string, emoji: string): void {
  emitParty("party:react", { roomId, emoji });
}

export function sendPartyChatEvent(roomId: string, text: string): void {
  emitParty("party:chat", { roomId, text });
}

export function sendPartyTyping(roomId: string, typing: boolean): void {
  emitParty("party:typing", { roomId, typing });
}

export interface PartySocketHandlers {
  onMembers?: (members: PartyMember[]) => void;
  onState?: (state: PartyRoomState) => void;
  onControl?: (event: PartyControlEvent) => void;
  onContent?: (content: PartyContent) => void;
  onLeader?: (payload: { leaderUserId: string }) => void;
  onReaction?: (reaction: PartyReactionEvent) => void;
  onChat?: (message: PartyChatMessage) => void;
  onTyping?: (payload: { userId: string; typing: boolean }) => void;
  onError?: (error: PartyErrorEvent) => void;
  /** Socket.IO transport connected (auth may still be in flight). */
  onConnect?: () => void;
  /** Server accepted JWT (`connected` ack with `{ ok: true }`) — safe to emit party:join. */
  onAuthenticated?: () => void;
  onDisconnect?: () => void;
}

/** Subscribe to all party:* server events; returns an unsubscribe function. */
export function subscribePartyEvents(handlers: PartySocketHandlers): () => void {
  // Bind listeners BEFORE connect/auth so we never miss the auth ack.
  const socket = getPartySocket();

  const bindings: Array<[string, (...args: unknown[]) => void]> = [];
  const bind = <T extends unknown[]>(event: string, fn?: (...args: T) => void) => {
    if (!fn) return;
    const wrapped = (...args: unknown[]) => fn(...(args as T));
    socket.on(event, wrapped);
    bindings.push([event, wrapped]);
  };

  bind<[unknown]>("party:members", (payload) => {
    handlers.onMembers?.(normalizePartyMembers(payload));
  });
  bind<[PartyRoomState]>("party:state", handlers.onState);
  bind<[PartyControlEvent]>("party:control", handlers.onControl);
  bind<[PartyContent]>("party:content", handlers.onContent);
  bind<[{ leaderUserId: string }]>("party:leader", handlers.onLeader);
  bind<[PartyReactionEvent]>("party:reaction", handlers.onReaction);
  bind<[unknown]>("party:chat", (payload) => {
    const msg = normalizePartyChatMessage(payload);
    if (msg) handlers.onChat?.(msg);
  });
  bind<[{ userId: string; typing: boolean }]>("party:typing", handlers.onTyping);
  bind<[Record<string, unknown>]>("party:error", (payload) => {
    const message =
      typeof payload?.message === "string"
        ? payload.message
        : typeof payload?.error === "string"
          ? payload.error
          : "party error";
    const code = typeof payload?.code === "string" ? payload.code : "party_error";
    handlers.onError?.({ code, message });
  });
  bind<[]>("connect", handlers.onConnect);
  // Ignore bare root `connected` (no payload) — only party JWT ack.
  bind<[unknown]>("connected", (payload) => {
    if (isPartyAuthAck(payload)) handlers.onAuthenticated?.();
  });
  bind<[]>("disconnect", handlers.onDisconnect);

  connectPartySocket();

  if (isPartySocketAuthed()) {
    // Already authed from a previous room / feed socket — enter without re-auth storm.
    handlers.onAuthenticated?.();
  } else if (socket.connected) {
    // Transport up but JWT not confirmed yet (or missed ack) — auth once.
    emitSocketAuth();
  }

  return () => {
    for (const [event, fn] of bindings) socket.off(event, fn);
  };
}
