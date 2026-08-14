import { io, type Socket } from 'socket.io-client';

import { API_BASE } from '@/lib/config';
import { getTokenSync, hydrateTokenCache } from '@/lib/tokenCache';

/** Single root-namespace client (feed + party share one Engine.IO connection). */
let socket: Socket | null = null;
let socketOrigin: string | null = null;
let authBound = false;
/** True after server accepted JWT (`connected` with `{ ok: true }`). */
let partyAuthed = false;

function resolveSocketOrigin(): string {
  const origin = API_BASE.replace(/\/$/, '');
  if (!origin) {
    throw new Error('Socket API origin is not configured (extra.apiUrl)');
  }
  return origin;
}

function ensureSocket(): Socket {
  const origin = resolveSocketOrigin();
  if (socketOrigin && socketOrigin !== origin) {
    socket?.disconnect();
    socket = null;
    authBound = false;
    partyAuthed = false;
  }
  socketOrigin = origin;

  if (!socket) {
    socket = io(origin, {
      path: '/socket.io',
      autoConnect: false,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      randomizationFactor: 0.5,
    });
  }
  return socket;
}

export function isPartyAuthAck(payload: unknown): boolean {
  return (
    !!payload &&
    typeof payload === 'object' &&
    (payload as { ok?: unknown }).ok === true
  );
}

function bindAuthLifecycle(s: Socket) {
  if (authBound) return;
  authBound = true;
  s.on('connect', () => {
    partyAuthed = false;
    const token = getTokenSync();
    s.auth = { token };
    if (token) s.emit('auth', { token });
  });
  s.on('disconnect', () => {
    partyAuthed = false;
  });
  s.on('connected', (payload: unknown) => {
    if (isPartyAuthAck(payload)) partyAuthed = true;
  });
}

function connectSharedSocket(): Socket {
  const s = ensureSocket();
  bindAuthLifecycle(s);
  const token = getTokenSync();
  s.auth = { token };
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function emitSocketAuth(): void {
  const s = ensureSocket();
  bindAuthLifecycle(s);
  const token = getTokenSync();
  s.auth = { token };
  if (!token) return;
  if (!s.connected) {
    s.connect();
    return;
  }
  s.emit('auth', { token });
}

export function isPartySocketAuthed(): boolean {
  return partyAuthed && !!socket?.connected;
}

export function getSocket(): Socket {
  return ensureSocket();
}

export function connectSocket(): Socket {
  void hydrateTokenCache();
  return connectSharedSocket();
}

export function disconnectSocket() {
  socket?.disconnect();
  partyAuthed = false;
}

export function getPartySocket(): Socket {
  return ensureSocket();
}

export function connectPartySocket(): Socket {
  void hydrateTokenCache();
  return connectSharedSocket();
}
