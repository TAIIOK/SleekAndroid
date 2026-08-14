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

export interface CreatePartyFromAnimeParams {
  animeId: number;
  title?: string;
  episode?: number;
  season?: number;
}

export function useCreatePartyFromAnime() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [updatingExisting, setUpdatingExisting] = useState(false);

  const mutation = useMutation({
    mutationFn: async (params: CreatePartyFromAnimeParams) => {
      const existingId = await getActivePartyRoomId();
      if (existingId) {
        setUpdatingExisting(true);
        try {
          return await updatePartyContent(existingId, {
            contentType: 'anime',
            animeId: params.animeId,
            season: params.season,
            episode: params.episode,
            title: params.title,
          });
        } finally {
          setUpdatingExisting(false);
        }
      }
      return createPartyRoom({
        title: params.title?.trim() || 'Совместный просмотр',
        isPrivate: true,
        contentType: 'anime',
        animeId: params.animeId,
        season: params.season,
        episode: params.episode,
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
