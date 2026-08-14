import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  createPartyRoom,
  getPartyLobbyStats,
  getPartyRoom,
  joinPartyByCode,
  leavePartyRoom,
  listMyPartyRooms,
  listPublicPartyRooms,
} from '@/api/party';
import { PartyActiveSessionBanner } from '@/components/party/PartyActiveSessionBanner';
import { PartyJoinCodeCard } from '@/components/party/PartyJoinCodeCard';
import { PartyLobbyHero } from '@/components/party/PartyLobbyHero';
import { PartyRoomCard } from '@/components/party/PartyRoomCard';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, radii, spacing } from '@/constants/aniverse';
import {
  clearActivePartyRoomId,
  getActivePartyRoomId,
  setActivePartyRoomId,
} from '@/lib/activePartyRoom';
import { partyRoomHref } from '@/lib/partyRoomRoute';
import { useAuth } from '@/providers/AuthProvider';
import { useMobileChromeScrollProps } from '@/providers/MobileChromeScroll';

function EmptySection({ icon, title, hint }: { icon: keyof typeof Ionicons.glyphMap; title: string; hint: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={22} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyHint}>{hint}</Text>
    </View>
  );
}

function RoomListSkeleton() {
  return (
    <View style={styles.skeletonList}>
      <Skeleton height={98} rounded={radii.lg} />
      <Skeleton height={98} rounded={radii.lg} />
    </View>
  );
}

export default function PartyLobbyScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const lobbyFocused = pathname === '/party';
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const chromeScrollProps = useMobileChromeScrollProps(undefined, styles.content);
  const [joinCode, setJoinCode] = useState('');
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const isGuest = !user?.email || user.nickname === 'Гость';

  useEffect(() => {
    void getActivePartyRoomId().then(setActiveRoomId);
  }, []);

  const publicQuery = useQuery({
    queryKey: ['party-public'],
    queryFn: listPublicPartyRooms,
    enabled: !isGuest,
  });
  const myQuery = useQuery({
    queryKey: ['party-my'],
    queryFn: listMyPartyRooms,
    enabled: !isGuest,
  });
  const { data: stats } = useQuery({
    queryKey: ['party-stats'],
    queryFn: getPartyLobbyStats,
    enabled: !isGuest,
  });
  const activeRoomQuery = useQuery({
    queryKey: ['party-room', activeRoomId],
    queryFn: () => getPartyRoom(activeRoomId!),
    enabled: !isGuest && !!activeRoomId,
    staleTime: 15_000,
    retry: false,
  });

  const publicRooms = publicQuery.data ?? [];
  const myRooms = myQuery.data ?? [];

  const activeRoom = useMemo(() => {
    if (!activeRoomId) return undefined;
    if (activeRoomQuery.data?.id === activeRoomId) return activeRoomQuery.data;
    return myRooms.find((room) => room.id === activeRoomId)
      ?? publicRooms.find((room) => room.id === activeRoomId);
  }, [activeRoomId, activeRoomQuery.data, myRooms, publicRooms]);

  useEffect(() => {
    if (!activeRoomId || !activeRoomQuery.isError) return;
    void clearActivePartyRoomId().then(() => setActiveRoomId(null));
  }, [activeRoomId, activeRoomQuery.isError]);

  const openRoom = async (roomId: string) => {
    await setActivePartyRoomId(roomId);
    setActiveRoomId(roomId);
    router.push(partyRoomHref(roomId));
  };

  const create = useMutation({
    mutationFn: () =>
      createPartyRoom({
        title: 'Совместный просмотр',
        isPrivate: true,
        contentType: 'anime',
        allowGuestPause: true,
        pauseOnMemberDisconnect: true,
      }),
    onSuccess: async (room) => {
      await setActivePartyRoomId(room.id);
      setActiveRoomId(room.id);
      queryClient.setQueryData(['party-room', room.id], room);
      void queryClient.invalidateQueries({ queryKey: ['party-my'] });
      router.push(partyRoomHref(room.id));
    },
  });

  const join = useMutation({
    mutationFn: () => joinPartyByCode(joinCode.trim()),
    onSuccess: async (room) => {
      await openRoom(room.id);
    },
  });

  const leave = useMutation({
    mutationFn: (roomId: string) => leavePartyRoom(roomId),
    onSuccess: async (_void, roomId) => {
      await clearActivePartyRoomId();
      setActiveRoomId(null);
      queryClient.removeQueries({ queryKey: ['party-room', roomId] });
      void queryClient.invalidateQueries({ queryKey: ['party-my'] });
      void queryClient.invalidateQueries({ queryKey: ['party-public'] });
      void queryClient.invalidateQueries({ queryKey: ['party-stats'] });
    },
  });

  if (isGuest) {
    return (
      <View style={styles.guestRoot}>
        <View style={styles.guestCard}>
          <Ionicons name="people-outline" size={36} color={colors.brand} />
          <Text style={styles.guestTitle}>Совместный просмотр</Text>
          <Text style={styles.guestBody}>
            Гостевые аккаунты не могут создавать комнаты. Войдите в полный аккаунт.
          </Text>
          <TvFocusable
            onPress={() => router.push('/login')}
            style={styles.guestCta}
            hasTVPreferredFocus={lobbyFocused}
            railStart={lobbyFocused}
            contentEntry={lobbyFocused}
          >
            <Text style={styles.guestCtaLabel}>Войти</Text>
          </TvFocusable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView {...chromeScrollProps} style={styles.scroll}>
      <PartyLobbyHero
        viewersOnline={stats?.viewersOnline}
        activeRooms={stats?.activeRooms}
        creating={create.isPending}
        onCreate={() => create.mutate()}
        tvEntry={lobbyFocused}
      />

      {activeRoom ? (
        <PartyActiveSessionBanner
          room={activeRoom}
          onOpen={() => void openRoom(activeRoom.id)}
          onLeave={() => leave.mutate(activeRoom.id)}
          leaving={leave.isPending && leave.variables === activeRoom.id}
        />
      ) : null}

      <PartyJoinCodeCard
        value={joinCode}
        onChangeText={setJoinCode}
        joining={join.isPending}
        onJoin={() => join.mutate()}
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Мои комнаты</Text>
        {myQuery.isLoading ? <RoomListSkeleton /> : null}
        {!myQuery.isLoading && myRooms.length === 0 ? (
          <EmptySection
            icon="film-outline"
            title="Пока нет активных комнат"
            hint="Создайте комнату или зайдите по коду"
          />
        ) : null}
        {myRooms.map((room) => (
          <PartyRoomCard
            key={room.id}
            room={room}
            onOpen={() => void openRoom(room.id)}
            onLeave={() => leave.mutate(room.id)}
            leaving={leave.isPending && leave.variables === room.id}
          />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Публичные</Text>
        {publicQuery.isLoading ? <RoomListSkeleton /> : null}
        {!publicQuery.isLoading && publicRooms.length === 0 ? (
          <EmptySection
            icon="globe-outline"
            title="Нет публичных комнат"
            hint="Скоро здесь появятся открытые комнаты"
          />
        ) : null}
        {publicRooms.map((room) => (
          <PartyRoomCard
            key={room.id}
            room={room}
            label="Присоединиться"
            onOpen={() => void openRoom(room.id)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  section: { gap: spacing.sm },
  sectionTitle: {
    color: colors.text,
    fontWeight: '800',
    fontSize: 17,
  },
  empty: {
    alignItems: 'flex-start',
    gap: 4,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  emptyTitle: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
    marginTop: 4,
  },
  emptyHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  skeletonList: { gap: spacing.sm },
  guestRoot: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  guestCard: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  guestTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  guestBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  guestCta: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: radii.md,
    backgroundColor: colors.brandAccent,
  },
  guestCtaLabel: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
});
