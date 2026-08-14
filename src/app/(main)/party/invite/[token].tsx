import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { acceptPartyInvite, getPartyInvitePreview } from '@/api/party';
import { PartyInviteCard } from '@/components/party/PartyInviteCard';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import { setActivePartyRoomId } from '@/lib/activePartyRoom';
import { partyRoomHref } from '@/lib/partyRoomRoute';

export default function PartyInviteScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token: string }>();
  const inviteToken = String(token ?? '');

  const { data, isLoading, isError } = useQuery({
    queryKey: ['party-invite', inviteToken],
    queryFn: () => getPartyInvitePreview(inviteToken),
    enabled: !!inviteToken,
  });

  const accept = useMutation({
    mutationFn: () => acceptPartyInvite(inviteToken),
    onSuccess: async (room) => {
      await setActivePartyRoomId(room.id);
      router.replace(partyRoomHref(room.id));
    },
  });

  const goLobby = () => router.replace('/party');

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: Math.max(insets.top, 12) + spacing.md,
          paddingBottom: Math.max(insets.bottom, 12) + spacing.md,
        },
      ]}
    >
      <TvFocusable onPress={goLobby} style={styles.back}>
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </TvFocusable>

      <View style={styles.center}>
        {isLoading ? (
          <View style={styles.statusCard}>
            <Text style={styles.muted}>Загрузка приглашения…</Text>
          </View>
        ) : null}

        {isError || data?.expired ? (
          <View style={styles.statusCard}>
            <Ionicons name="link-outline" size={28} color={colors.textMuted} />
            <Text style={styles.statusTitle}>Приглашение недоступно</Text>
            <Text style={styles.muted}>Ссылка недействительна или истекла</Text>
            <TvFocusable onPress={goLobby} style={styles.secondary}>
              <Text style={styles.secondaryLabel}>В лобби</Text>
            </TvFocusable>
          </View>
        ) : null}

        {data && !data.expired ? (
          <PartyInviteCard
            title={data.title}
            content={data.content}
            joining={accept.isPending}
            onJoin={() => accept.mutate()}
            onLobby={goLobby}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignSelf: 'flex-start',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusCard: {
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  statusTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  muted: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  secondary: {
    marginTop: spacing.sm,
    paddingVertical: 10,
  },
  secondaryLabel: {
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
