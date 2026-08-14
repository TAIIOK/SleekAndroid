import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { createPartyRoom, updatePartyContent } from '@/api/party';
import {
  getActivePartyRoomId,
  setActivePartyRoomId,
} from '@/lib/activePartyRoom';
import { partyRoomHref } from '@/lib/partyRoomRoute';
import type { PartyRoom } from '@/types/party';

export interface CreatePartyFromLampaParams {
  tmdbId: number;
  kind: 'movie' | 'tv';
  title?: string;
  poster?: string;
  season?: number;
  episode?: number;
  sourceId?: string;
  translatorId?: string | number;
}

export function useCreatePartyFromLampa() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [updatingExisting, setUpdatingExisting] = useState(false);

  const mutation = useMutation({
    mutationFn: async (params: CreatePartyFromLampaParams) => {
      const translatorId =
        params.translatorId != null ? String(params.translatorId) : undefined;
      const existingId = await getActivePartyRoomId();
      if (existingId) {
        setUpdatingExisting(true);
        try {
          return await updatePartyContent(existingId, {
            contentType: params.kind,
            tmdbId: params.tmdbId,
            kind: params.kind,
            animeId: 0,
            season: params.season,
            episode: params.episode,
            sourceId: params.sourceId,
            translatorId,
            title: params.title,
            poster: params.poster,
          });
        } finally {
          setUpdatingExisting(false);
        }
      }
      return createPartyRoom({
        title: params.title?.trim() || 'Совместный просмотр',
        isPrivate: true,
        contentType: params.kind,
        tmdbId: params.tmdbId,
        kind: params.kind,
        season: params.season,
        episode: params.episode,
        sourceId: params.sourceId,
        translatorId,
        allowGuestPause: true,
        allowGuestSeek: false,
        allowGuestControl: false,
        pauseOnMemberDisconnect: true,
      });
    },
    onSuccess: async (room: PartyRoom) => {
      await setActivePartyRoomId(room.id);
      queryClient.setQueryData(['party-room', room.id], room);
      router.push(partyRoomHref(room.id));
    },
  });

  return {
    createParty: mutation.mutate,
    creating: mutation.isPending,
    error: mutation.error,
    updatingExisting,
  };
}
