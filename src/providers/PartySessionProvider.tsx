import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getPartyRoom,
  kickPartyMember,
  leavePartyRoom as leavePartyRoomApi,
  listPartyMembers,
  listPartyMessages,
  listPartyReactions,
  transferPartyLeader,
  updatePartyPrivacy,
} from "@/api/party";
import {
  joinPartyRoom as joinPartyRoomSocket,
  leavePartyRoomSocket,
  requestPartyState,
  sendPartyChatEvent,
  sendPartyControlEvent,
  sendPartyLeader,
  sendPartyReactionEvent,
  subscribePartyEvents,
} from "@/services/partySocket";
import { useAuth } from "@/providers/AuthProvider";
import { clearActivePartyRoomId, setActivePartyRoomId } from "@/lib/activePartyRoom";
import type {
  PartyChatMessage,
  PartyContent,
  PartyControlActionType,
  PartyControlEvent,
  PartyControlPayload,
  PartyErrorEvent,
  PartyMember,
  PartyPermissions,
  PartyReactionEvent,
  PartyRoom,
  PartyRoomState,
  PartySystemMessage,
  PartyTimelineItem,
} from "@/types/party";

const MAX_CHAT_MESSAGES = 200;
const MAX_REACTIONS = 30;
const MAX_SYSTEM_MESSAGES = 80;

interface PartySessionValue {
  roomId: string;
  room?: PartyRoom;
  isLoadingRoom: boolean;
  roomError: boolean;
  members: PartyMember[];
  state?: PartyRoomState;
  content?: PartyContent;
  messages: PartyChatMessage[];
  /** Chat + client-only system rows, sorted by time. */
  timeline: PartyTimelineItem[];
  reactions: PartyReactionEvent[];
  leaderUserId?: string;
  currentUserId?: string;
  permissions: PartyPermissions;
  connected: boolean;
  lastControlEvent?: PartyControlEvent;
  socketError?: PartyErrorEvent;
  /** Brief on-video toast for remote pause/play. */
  playbackNotice?: string;
  dismissPlaybackNotice: () => void;
  sendChat: (text: string) => void;
  sendReaction: (emoji: string) => void;
  sendControl: (action: PartyControlActionType, data?: PartyControlPayload) => void;
  requestState: () => void;
  setLeader: (userId: string) => Promise<void>;
  kickMember: (userId: string) => Promise<void>;
  setPrivate: (isPrivate: boolean) => Promise<void>;
  refreshRoom: () => Promise<void>;
  leaveRoom: () => Promise<void>;
}

function formatPlaybackClock(sec?: number): string | undefined {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return undefined;
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

function makeSystemMessage(text: string): PartySystemMessage {
  return {
    id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind: "system",
    text,
    createdAt: new Date().toISOString(),
  };
}

const PartySessionContext = createContext<PartySessionValue | null>(null);

function derivePermissions(
  room: PartyRoom | undefined,
  currentUserId: string | undefined,
  leaderUserId: string | undefined,
): PartyPermissions {
  const isOwner = !!room && !!currentUserId && room.ownerId === currentUserId;
  const isLeader = !!currentUserId && leaderUserId === currentUserId;
  const controllerLike = isOwner || isLeader;
  return {
    isOwner,
    isLeader,
    canPlayPause: controllerLike || !!room?.allowGuestControl || !!room?.allowGuestPause,
    canSeek: controllerLike || !!room?.allowGuestControl || !!room?.allowGuestSeek,
    canChangeContent: controllerLike || !!room?.allowGuestControl,
    canKick: isOwner,
    canManageInvites: isOwner,
    canChat: true,
  };
}

export function PartySessionProvider({
  roomId,
  children,
  seededRoom,
}: {
  roomId: string;
  children: ReactNode;
  seededRoom?: PartyRoom;
}) {
  const { user } = useAuth();
  const currentUserId = user?.id != null ? String(user.id) : undefined;
  const queryClient = useQueryClient();
  const seededFromNav = useMemo(() => {
    return seededRoom && seededRoom.id === roomId ? seededRoom : undefined;
  }, [seededRoom, roomId]);
  // Freeze seed timestamp so useQuery options stay stable across re-renders.
  const seededAtRef = useRef<number | undefined>(undefined);
  if (seededFromNav && seededAtRef.current == null) {
    seededAtRef.current = Date.now();
  }

  const roomQuery = useQuery({
    queryKey: ["party-room", roomId],
    queryFn: () => getPartyRoom(roomId),
    enabled: !!roomId,
    // Content can change via «Смотреть вместе» while away — always revalidate on enter.
    staleTime: 0,
    refetchOnMount: "always",
    // Prefer nav seed over any leftover cache from the previous anime in this room.
    initialData: seededFromNav,
    initialDataUpdatedAt: seededFromNav ? seededAtRef.current : undefined,
  });

  const { data: initialMembers } = useQuery({
    queryKey: ["party-room-members", roomId],
    queryFn: () => listPartyMembers(roomId),
    enabled: !!roomId,
    staleTime: 10_000,
  });

  const { data: initialMessages } = useQuery({
    queryKey: ["party-room-messages", roomId],
    queryFn: () => listPartyMessages(roomId),
    enabled: !!roomId,
    staleTime: 30_000,
  });

  const { data: initialReactions } = useQuery({
    queryKey: ["party-room-reactions", roomId],
    queryFn: () => listPartyReactions(roomId),
    enabled: !!roomId,
    staleTime: 30_000,
  });

  const [members, setMembers] = useState<PartyMember[]>([]);
  const [state, setState] = useState<PartyRoomState | undefined>();
  const [content, setContent] = useState<PartyContent | undefined>(() =>
    seededFromNav && seededFromNav.id === roomId ? seededFromNav.content : undefined,
  );
  const [messages, setMessages] = useState<PartyChatMessage[]>([]);
  const [systemMessages, setSystemMessages] = useState<PartySystemMessage[]>([]);
  const [reactions, setReactions] = useState<PartyReactionEvent[]>([]);
  const [leaderUserId, setLeaderUserId] = useState<string | undefined>();
  const [connected, setConnected] = useState(false);
  const [lastControlEvent, setLastControlEvent] = useState<PartyControlEvent | undefined>();
  const [socketError, setSocketError] = useState<PartyErrorEvent | undefined>();
  const [playbackNotice, setPlaybackNotice] = useState<string | undefined>();

  const bootstrappedMembersRef = useRef(false);
  const bootstrappedMessagesRef = useRef(false);
  const bootstrappedReactionsRef = useRef(false);
  const knownMemberIdsRef = useRef<Set<string>>(new Set());
  const membersReadyRef = useRef(false);
  const membersByIdRef = useRef<Map<string, PartyMember>>(new Map());

  useEffect(() => {
    bootstrappedMembersRef.current = false;
    bootstrappedMessagesRef.current = false;
    bootstrappedReactionsRef.current = false;
    knownMemberIdsRef.current = new Set();
    membersReadyRef.current = false;
    membersByIdRef.current = new Map();
    seededAtRef.current = seededFromNav ? Date.now() : undefined;
    setMembers([]);
    setState(undefined);
    setContent(seededFromNav?.content);
    setMessages([]);
    setSystemMessages([]);
    setReactions([]);
    setLeaderUserId(undefined);
    setPlaybackNotice(undefined);
    if (roomId) void setActivePartyRoomId(roomId);
  }, [roomId, seededFromNav]);

  useEffect(() => {
    if (!roomQuery.data) return;
    setLeaderUserId(roomQuery.data.leaderUserId ?? roomQuery.data.ownerId);
    const nextContent = roomQuery.data.content;
    if (nextContent) {
      setContent((prev) => {
        const sameAnime =
          prev?.animeId != null &&
          nextContent.animeId != null &&
          prev.animeId === nextContent.animeId;
        const sameTmdb =
          prev?.tmdbId != null &&
          nextContent.tmdbId != null &&
          prev.tmdbId === nextContent.tmdbId;
        if (sameAnime || sameTmdb) {
          return { ...prev, ...nextContent };
        }
        return nextContent;
      });
    }
    // Seed playback from REST so re-open resumes before socket `party:state`.
    const pb = roomQuery.data.playback;
    if (pb && typeof pb.playbackTimeSec === "number") {
      setState((prev) => {
        const restAnimeId = nextContent?.animeId;
        const contentChanged =
          restAnimeId != null &&
          prev?.content?.animeId != null &&
          prev.content.animeId !== restAnimeId;
        if (prev && !contentChanged) return prev;
        return {
          roomId,
          isPlaying: !!pb.isPlaying,
          playbackTimeSec: pb.playbackTimeSec,
          playbackRate: pb.playbackRate && pb.playbackRate > 0 ? pb.playbackRate : 1,
          updatedAt: pb.updatedAt,
          leaderUserId: roomQuery.data.leaderUserId ?? roomQuery.data.ownerId,
          content: nextContent,
        };
      });
    }
  }, [roomQuery.data, roomId]);

  useEffect(() => {
    if (initialMembers && !bootstrappedMembersRef.current) {
      bootstrappedMembersRef.current = true;
      setMembers(initialMembers);
      knownMemberIdsRef.current = new Set(initialMembers.map((m) => m.userId));
      membersByIdRef.current = new Map(initialMembers.map((m) => [m.userId, m]));
      membersReadyRef.current = true;
    }
  }, [initialMembers]);

  useEffect(() => {
    if (initialMessages && !bootstrappedMessagesRef.current) {
      bootstrappedMessagesRef.current = true;
      setMessages(initialMessages.slice(-MAX_CHAT_MESSAGES));
    }
  }, [initialMessages]);

  useEffect(() => {
    if (initialReactions && !bootstrappedReactionsRef.current) {
      bootstrappedReactionsRef.current = true;
      setReactions(initialReactions.slice(-MAX_REACTIONS));
    }
  }, [initialReactions]);

  useEffect(() => {
    if (!roomId) return;

    // Enter only after JWT ack. Guard against duplicate `connected` handlers.
    let joined = false;
    const enterRoom = () => {
      if (joined) return;
      joined = true;
      joinPartyRoomSocket(roomId);
      requestPartyState(roomId);
    };

    const unsubscribe = subscribePartyEvents({
      onAuthenticated: () => {
        setConnected(true);
        enterRoom();
      },
      onDisconnect: () => {
        joined = false;
        setConnected(false);
      },
      onMembers: (list) => {
        setMembers(list);
        membersByIdRef.current = new Map(list.map((m) => [m.userId, m]));
        if (!membersReadyRef.current) {
          knownMemberIdsRef.current = new Set(list.map((m) => m.userId));
          membersReadyRef.current = true;
          return;
        }
        const prev = knownMemberIdsRef.current;
        const next = new Set(list.map((m) => m.userId));
        const joined = list.filter((m) => !prev.has(m.userId) && m.userId !== currentUserId);
        knownMemberIdsRef.current = next;
        if (joined.length) {
          setSystemMessages((sys) =>
            [
              ...sys,
              ...joined.map((m) =>
                makeSystemMessage(`${m.nickname || "Участник"} присоединился к просмотру`),
              ),
            ].slice(-MAX_SYSTEM_MESSAGES),
          );
        }
      },
      onState: (nextState) => {
        setState(nextState);
        if (nextState.leaderUserId) setLeaderUserId(nextState.leaderUserId);
        // party:state usually has no content; never clobber a fresher REST/socket content.
        if (nextState.content?.animeId || nextState.content?.tmdbId) {
          setContent(nextState.content);
        }
      },
      onControl: (event) => {
        setLastControlEvent(event);
        if (event.action === "content" && event.data) {
          const d = event.data;
          if (
            typeof d.animeId === "number" ||
            typeof d.tmdbId === "number" ||
            typeof d.episode === "number" ||
            typeof d.translatorId === "string" ||
            typeof d.sourceId === "string"
          ) {
            const nextContent: PartyContent = {
              contentType:
                (d.contentType as PartyContent["contentType"]) ||
                "anime",
              animeId: typeof d.animeId === "number" ? d.animeId : undefined,
              tmdbId: typeof d.tmdbId === "number" ? d.tmdbId : undefined,
              kind: d.kind === "movie" || d.kind === "tv" ? d.kind : undefined,
              sourceId: typeof d.sourceId === "string" ? d.sourceId : undefined,
              translatorId:
                typeof d.translatorId === "string"
                  ? d.translatorId
                  : typeof d.translatorId === "number"
                    ? String(d.translatorId)
                    : undefined,
              season: typeof d.season === "number" ? d.season : undefined,
              episode: typeof d.episode === "number" ? d.episode : undefined,
              title: typeof d.title === "string" ? d.title : undefined,
            };
            setContent((prev) => ({
              ...prev,
              ...nextContent,
              contentType: nextContent.contentType || prev?.contentType || "anime",
              animeId: nextContent.animeId ?? prev?.animeId,
              tmdbId: nextContent.tmdbId ?? prev?.tmdbId,
              kind: nextContent.kind ?? prev?.kind,
              sourceId: nextContent.sourceId ?? prev?.sourceId,
              translatorId: nextContent.translatorId ?? prev?.translatorId,
              season: nextContent.season ?? prev?.season,
              episode: nextContent.episode ?? prev?.episode,
              title: nextContent.title ?? prev?.title,
            }));
            // Content/episode switch always restarts playback from 0 on the server.
            setState((prev) =>
              prev
                ? {
                    ...prev,
                    isPlaying: false,
                    playbackTimeSec: 0,
                    content: nextContent,
                  }
                : prev,
            );
            void queryClient.invalidateQueries({ queryKey: ["party-room", roomId] });
          }
        }
        if (event.from && event.from === currentUserId) return;
        if (event.action !== "play" && event.action !== "pause") return;
        const nick =
          membersByIdRef.current.get(event.from)?.nickname ||
          (event.from === currentUserId ? "Вы" : "Участник");
        const clock = formatPlaybackClock(event.data?.time);
        let text: string;
        if (event.action === "pause" && event.data?.reason === "host_disconnect") {
          text = clock
            ? `Хост отключился — просмотр на паузе (${clock})`
            : "Хост отключился — просмотр на паузе";
        } else if (event.action === "pause" && event.data?.reason === "member_disconnect") {
          text = clock
            ? `${nick} отключился — просмотр на паузе (${clock})`
            : `${nick} отключился — просмотр на паузе`;
        } else if (event.action === "pause") {
          text = clock ? `${nick} поставил на паузу (${clock})` : `${nick} поставил на паузу`;
        } else {
          text = clock
            ? `${nick} продолжил воспроизведение (${clock})`
            : `${nick} продолжил воспроизведение`;
        }
        setPlaybackNotice(text);
        setSystemMessages((sys) => [...sys, makeSystemMessage(text)].slice(-MAX_SYSTEM_MESSAGES));
      },
      onContent: (nextContent) => {
        // Socket payload may be a rich event `{ contentType, animeId, ... }` or a PartyContent.
        const raw = nextContent as PartyContent & {
          contentType?: string;
          animeId?: number;
          tmdbId?: number;
          season?: number;
          episode?: number;
          title?: string;
          timeSec?: number;
        };
        if (!raw) return;
        const rawExtra = raw as PartyContent & {
          sourceId?: string;
          translatorId?: string | number;
          kind?: string;
          poster?: string;
        };
        const next: PartyContent = {
          contentType: (raw.contentType as PartyContent["contentType"]) || "anime",
          animeId: typeof raw.animeId === "number" ? raw.animeId : undefined,
          tmdbId: typeof raw.tmdbId === "number" ? raw.tmdbId : undefined,
          kind: rawExtra.kind === "movie" || rawExtra.kind === "tv" ? rawExtra.kind : undefined,
          sourceId: typeof rawExtra.sourceId === "string" ? rawExtra.sourceId : undefined,
          translatorId:
            typeof rawExtra.translatorId === "string"
              ? rawExtra.translatorId
              : typeof rawExtra.translatorId === "number"
                ? String(rawExtra.translatorId)
                : undefined,
          season: typeof raw.season === "number" ? raw.season : undefined,
          episode: typeof raw.episode === "number" ? raw.episode : undefined,
          title: typeof raw.title === "string" ? raw.title : undefined,
          poster: typeof rawExtra.poster === "string" ? rawExtra.poster : undefined,
        };
        setContent(next);
        // Episode/title switch restarts from the server anchor (usually 0).
        setState((st) =>
          st
            ? {
                ...st,
                isPlaying: false,
                playbackTimeSec: typeof raw.timeSec === "number" ? raw.timeSec : 0,
                content: next,
              }
            : st,
        );
        void queryClient.invalidateQueries({ queryKey: ["party-room", roomId] });
      },
      onLeader: (payload) => setLeaderUserId(payload.leaderUserId),
      onReaction: (reaction) =>
        setReactions((prev) => [...prev, reaction].slice(-MAX_REACTIONS)),
      onChat: (message) =>
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          const withoutOptimistic = prev.filter(
            (m) =>
              !(
                m.id.startsWith("local-") &&
                m.userId === message.userId &&
                m.text === message.text
              ),
          );
          return [...withoutOptimistic, message].slice(-MAX_CHAT_MESSAGES);
        }),
      onError: (error) => setSocketError(error),
    });

    return () => {
      unsubscribe();
      // Presence-only leave (BE no longer deletes membership on socket leave).
      leavePartyRoomSocket(roomId);
    };
  }, [roomId, currentUserId]);

  const dismissPlaybackNotice = useCallback(() => {
    setPlaybackNotice(undefined);
  }, []);

  const timeline = useMemo<PartyTimelineItem[]>(() => {
    const chatItems: PartyTimelineItem[] = messages.map((m) => ({ ...m, kind: "chat" as const }));
    const merged = [...chatItems, ...systemMessages];
    merged.sort((a, b) => {
      const ta = new Date(a.createdAt).getTime();
      const tb = new Date(b.createdAt).getTime();
      return (Number.isFinite(ta) ? ta : 0) - (Number.isFinite(tb) ? tb : 0);
    });
    return merged.slice(-MAX_CHAT_MESSAGES);
  }, [messages, systemMessages]);

  const sendChat = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !roomId) return;
      const optimistic: PartyChatMessage = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        userId: currentUserId || "me",
        nickname: user?.nickname,
        text: trimmed.slice(0, 500),
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimistic].slice(-MAX_CHAT_MESSAGES));
      sendPartyChatEvent(roomId, trimmed.slice(0, 500));
    },
    [roomId, currentUserId, user?.nickname],
  );

  const sendReaction = useCallback(
    (emoji: string) => {
      if (!roomId || !emoji) return;
      sendPartyReactionEvent(roomId, emoji);
    },
    [roomId],
  );

  const sendControl = useCallback(
    (action: PartyControlActionType, data?: PartyControlPayload) => {
      if (!roomId) return;
      sendPartyControlEvent(roomId, action, data);
    },
    [roomId],
  );

  const requestState = useCallback(() => {
    if (!roomId) return;
    requestPartyState(roomId);
  }, [roomId]);

  const setLeader = useCallback(
    async (userId: string) => {
      if (!roomId) return;
      sendPartyLeader(roomId, userId);
      await transferPartyLeader(roomId, userId).catch(() => undefined);
      setLeaderUserId(userId);
    },
    [roomId],
  );

  const kickMember = useCallback(
    async (userId: string) => {
      if (!roomId) return;
      await kickPartyMember(roomId, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    },
    [roomId],
  );

  const setPrivate = useCallback(
    async (isPrivate: boolean) => {
      if (!roomId) return;
      const updated = await updatePartyPrivacy(roomId, isPrivate);
      queryClient.setQueryData(["party-room", roomId], updated);
    },
    [roomId, queryClient],
  );

  const refreshRoom = useCallback(async () => {
    await roomQuery.refetch();
  }, [roomQuery]);

  const leaveRoom = useCallback(async () => {
    if (!roomId) return;
    leavePartyRoomSocket(roomId);
    await leavePartyRoomApi(roomId).catch(() => undefined);
    void clearActivePartyRoomId();
  }, [roomId]);

  const permissions = useMemo(
    () => derivePermissions(roomQuery.data, currentUserId, leaderUserId),
    [roomQuery.data, currentUserId, leaderUserId],
  );

  const value = useMemo<PartySessionValue>(
    () => ({
      roomId,
      room: roomQuery.data,
      isLoadingRoom: roomQuery.isLoading,
      roomError: roomQuery.isError,
      members,
      state,
      content,
      messages,
      timeline,
      reactions,
      leaderUserId,
      currentUserId,
      permissions,
      connected,
      lastControlEvent,
      socketError,
      playbackNotice,
      dismissPlaybackNotice,
      sendChat,
      sendReaction,
      sendControl,
      requestState,
      setLeader,
      kickMember,
      setPrivate,
      refreshRoom,
      leaveRoom,
    }),
    [
      roomId,
      roomQuery.data,
      roomQuery.isLoading,
      roomQuery.isError,
      members,
      state,
      content,
      messages,
      timeline,
      reactions,
      leaderUserId,
      currentUserId,
      permissions,
      connected,
      lastControlEvent,
      socketError,
      playbackNotice,
      dismissPlaybackNotice,
      sendChat,
      sendReaction,
      sendControl,
      requestState,
      setLeader,
      kickMember,
      setPrivate,
      refreshRoom,
      leaveRoom,
    ],
  );

  return <PartySessionContext.Provider value={value}>{children}</PartySessionContext.Provider>;
}

export function usePartySession(): PartySessionValue {
  const ctx = useContext(PartySessionContext);
  if (!ctx) throw new Error("usePartySession outside PartySessionProvider");
  return ctx;
}
