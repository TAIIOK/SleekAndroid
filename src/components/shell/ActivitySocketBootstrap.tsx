import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { useAuth } from '@/providers/AuthProvider';
import { startActivitySocket, stopActivitySocket } from '@/services/activitySocket';

/** Keeps friends/activity Socket.IO subscriptions alive while authenticated. */
export function ActivitySocketBootstrap() {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id != null ? String(user.id) : '';

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      stopActivitySocket();
      return;
    }
    startActivitySocket(userId, queryClient);
    return () => stopActivitySocket();
  }, [isAuthenticated, userId, queryClient]);

  return null;
}
