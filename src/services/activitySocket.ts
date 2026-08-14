import type { QueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';

import { connectSocket, getSocket, isPartyAuthAck } from '@/services/socket';

export type ActivitySocketScope = 'me' | 'friends' | 'global';

type ActivityNewPayload = {
  actorUserId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
};

let bound = false;
let activeUserId: string | null = null;
let queryClientRef: QueryClient | null = null;
const subscribedScopes = new Set<ActivitySocketScope>();

function invalidateActivityQueries(actorUserId?: string) {
  const qc = queryClientRef;
  if (!qc) return;

  void qc.invalidateQueries({ queryKey: ['friends-feed'] });
  void qc.invalidateQueries({ queryKey: ['feed-unread'] });

  if (actorUserId) {
    void qc.invalidateQueries({ queryKey: ['user-activities', actorUserId] });
    void qc.invalidateQueries({ queryKey: ['user-watching-now', actorUserId] });
    void qc.invalidateQueries({ queryKey: ['user-stats', actorUserId] });
    void qc.invalidateQueries({ queryKey: ['user-achievements', actorUserId] });
  }

  const self = activeUserId;
  if (self && (!actorUserId || actorUserId === self)) {
    void qc.invalidateQueries({ queryKey: ['achievements'] });
    void qc.invalidateQueries({ queryKey: ['leaderboard'] });
    void qc.invalidateQueries({ queryKey: ['user-stats'] });
  }
}

function onActivityNew(payload: unknown) {
  const event = (payload && typeof payload === 'object' ? payload : {}) as ActivityNewPayload;
  invalidateActivityQueries(
    typeof event.actorUserId === 'string' ? event.actorUserId : undefined,
  );
}

function emitSubscribe(socket: Socket, scope: ActivitySocketScope) {
  socket.emit('activity:subscribe', { scope });
  subscribedScopes.add(scope);
}

function emitUnsubscribe(socket: Socket, scope: ActivitySocketScope) {
  socket.emit('activity:unsubscribe', { scope });
  subscribedScopes.delete(scope);
}

function bindLifecycle(socket: Socket) {
  if (bound) return;
  bound = true;

  socket.on('activity:new', onActivityNew);

  const resubscribe = () => {
    if (!activeUserId) return;
    for (const scope of ['me', 'friends'] as const) {
      emitSubscribe(socket, scope);
    }
  };

  socket.on('connect', resubscribe);
  socket.on('connected', (payload: unknown) => {
    if (isPartyAuthAck(payload)) resubscribe();
  });
}

export function startActivitySocket(userId: string, queryClient: QueryClient): void {
  if (!userId) return;
  activeUserId = userId;
  queryClientRef = queryClient;

  const socket = connectSocket();
  bindLifecycle(socket);

  if (socket.connected) {
    emitSubscribe(socket, 'me');
    emitSubscribe(socket, 'friends');
  }
}

export function stopActivitySocket(): void {
  try {
    const socket = getSocket();
    if (socket.connected) {
      for (const scope of [...subscribedScopes]) {
        emitUnsubscribe(socket, scope);
      }
    } else {
      subscribedScopes.clear();
    }
  } catch {
    subscribedScopes.clear();
  }
  activeUserId = null;
}
