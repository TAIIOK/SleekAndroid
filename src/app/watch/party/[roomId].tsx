import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createPartyInvite, joinPartyRoom } from '@/api/party';
import { PartyChatBubble } from '@/components/party/PartyChatBubble';
import { PartyWatchPanel } from '@/components/party/PartyWatchPanel';
import { TvPlayerFocusSink } from '@/components/player/tv/TvPlayerFocusSink';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import { clearActivePartyRoomId } from '@/lib/activePartyRoom';
import { isTvUi } from '@/lib/isTvUi';
import { PartySessionProvider, usePartySession } from '@/providers/PartySessionProvider';
import type { PartyChatMessage } from '@/types/party';

const REACTIONS = ['🔥', '😂', '❤️', '👏'] as const;
const MAX_CHAT_PEEKS = 4;

function ChatPeek({
  message,
  onOpen,
  onDismiss,
}: {
  message: PartyChatMessage;
  onOpen: () => void;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4500);
    return () => clearTimeout(t);
  }, [message.id, onDismiss]);

  const body = (
    <>
      <Text style={styles.peekNick} numberOfLines={1}>
        {message.nickname || 'Участник'}
      </Text>
      <Text style={styles.peekText} numberOfLines={2}>
        {message.text}
      </Text>
    </>
  );

  // TV: never steal the player focus sink (Down would open the shell sidebar).
  if (isTvUi()) {
    return (
      <View style={styles.peek} pointerEvents="none">
        {body}
      </View>
    );
  }

  return (
    <TvFocusable onPress={onOpen} style={styles.peek}>
      {body}
    </TvFocusable>
  );
}

function PartyRoomBody() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    room,
    isLoadingRoom,
    roomError,
    content,
    members,
    timeline,
    permissions,
    currentUserId,
    playbackNotice,
    dismissPlaybackNotice,
    sendChat,
    sendReaction,
    leaveRoom,
  } = usePartySession();

  const [chatOpen, setChatOpen] = useState(false);
  const [text, setText] = useState('');
  const [inviteBusy, setInviteBusy] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [peeks, setPeeks] = useState<PartyChatMessage[]>([]);
  const seenChatIdsRef = useRef<Set<string>>(new Set());
  const seededRoomRef = useRef<string | null>(null);
  const chatOpenRef = useRef(chatOpen);
  chatOpenRef.current = chatOpen;

  useEffect(() => {
    if (!room?.id) return;
    void joinPartyRoom(room.id).catch(() => undefined);
  }, [room?.id]);

  useEffect(() => {
    if (!playbackNotice) return;
    const t = setTimeout(() => dismissPlaybackNotice(), 2800);
    return () => clearTimeout(t);
  }, [playbackNotice, dismissPlaybackNotice]);

  useEffect(() => {
    if (!room?.id) return;
    if (seededRoomRef.current === room.id) return;
    if (!timeline.length) return;
    seededRoomRef.current = room.id;
    for (const item of timeline) {
      if (item.kind === 'chat') seenChatIdsRef.current.add(item.id);
    }
  }, [room?.id, timeline]);

  useEffect(() => {
    if (chatOpenRef.current) {
      setPeeks([]);
      for (const item of timeline) {
        if (item.kind === 'chat') seenChatIdsRef.current.add(item.id);
      }
      return;
    }
    const incoming: PartyChatMessage[] = [];
    for (const item of timeline) {
      if (item.kind !== 'chat') continue;
      if (seenChatIdsRef.current.has(item.id)) continue;
      seenChatIdsRef.current.add(item.id);
      if (item.userId === currentUserId) continue;
      if (item.id.startsWith('local-')) continue;
      incoming.push(item);
    }
    if (!incoming.length) return;
    setPeeks((prev) => [...prev, ...incoming].slice(-MAX_CHAT_PEEKS));
  }, [timeline, currentUserId]);

  const handleBack = async () => {
    await leaveRoom();
    await clearActivePartyRoomId();
    if (router.canDismiss()) router.dismiss();
    else router.replace('/party');
  };

  const handleInvite = async () => {
    if (!room?.id || inviteBusy || !permissions.canManageInvites) return;
    setInviteBusy(true);
    try {
      const invite = await createPartyInvite(room.id);
      const code = invite.joinCode || invite.token;
      await Share.share({ message: `Код комнаты Aniverse: ${code}` });
    } finally {
      setInviteBusy(false);
    }
  };

  const submitChat = () => {
    const value = text.trim();
    if (!value) return;
    sendChat(value);
    setText('');
  };

  if (isLoadingRoom) {
    return (
      <View style={styles.center}>
        {isTvUi() ? <TvPlayerFocusSink /> : null}
        <Text style={styles.muted}>Подключение к комнате…</Text>
      </View>
    );
  }

  if (roomError || !room) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Комната недоступна</Text>
        <TvFocusable onPress={() => router.replace('/party')} style={styles.primaryBtn}>
          <Text style={styles.primaryBtnLabel}>В лобби</Text>
        </TvFocusable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.player}>
        <PartyWatchPanel
          content={content ?? room.content}
          onBack={() => void handleBack()}
          onControlsVisibleChange={setChromeVisible}
        />
      </View>

      {playbackNotice ? (
        <View style={styles.toast} pointerEvents="none">
          <Text style={styles.toastText}>{playbackNotice}</Text>
        </View>
      ) : null}

      {!isTvUi() && chromeVisible ? (
        <>
          <View
            style={[styles.topActionsWrap, { paddingTop: Math.max(insets.top, 8) }]}
            pointerEvents="box-none"
          >
            <View style={styles.topActions}>
              {permissions.canManageInvites ? (
                <TvFocusable
                  disabled={inviteBusy}
                  onPress={() => void handleInvite()}
                  style={styles.chromeBtn}
                >
                  <Ionicons name="share-outline" size={18} color="#fff" />
                </TvFocusable>
              ) : null}
              <TvFocusable
                onPress={() => setChatOpen((v) => !v)}
                style={[styles.chromeBtn, chatOpen && styles.chromeBtnActive]}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={18} color="#fff" />
              </TvFocusable>
            </View>
          </View>

          <View
            style={[
              styles.codeChrome,
              // Below player title + sync badge (site: safe-area + ~5.75rem).
              { top: Math.max(insets.top, 12) + 92 },
            ]}
            pointerEvents="box-none"
          >
            <View style={styles.codeChip}>
              <Text style={styles.codeKicker}>Код комнаты</Text>
              <Text style={styles.codeLabel}>
                {room.joinCode ? room.joinCode : `${members.length} уч.`}
              </Text>
            </View>
            <TvFocusable onPress={() => void handleBack()} style={styles.leaveBtn}>
              <Ionicons name="exit-outline" size={16} color={colors.danger} />
              <Text style={styles.leaveLabel}>Покинуть</Text>
            </TvFocusable>
          </View>
        </>
      ) : null}

      {!chatOpen && peeks.length > 0 ? (
        <View
          style={[styles.peekStack, { bottom: Math.max(insets.bottom, 12) + 88 }]}
          pointerEvents="box-none"
        >
          {peeks.map((message) => (
            <ChatPeek
              key={message.id}
              message={message}
              onOpen={() => setChatOpen(true)}
              onDismiss={() =>
                setPeeks((prev) => prev.filter((item) => item.id !== message.id))
              }
            />
          ))}
        </View>
      ) : null}

      {!isTvUi() && chatOpen ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.chatSheet, { paddingBottom: Math.max(insets.bottom, 10) }]}
        >
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>Чат</Text>
            <TvFocusable onPress={() => setChatOpen(false)} style={styles.chromeBtn}>
              <Ionicons name="close" size={18} color="#fff" />
            </TvFocusable>
          </View>

          <FlatList
            style={styles.chatList}
            data={timeline}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.chatContent}
            renderItem={({ item }) => (
              <PartyChatBubble
                item={item}
                isOwn={item.kind === 'chat' && item.userId === currentUserId}
              />
            )}
          />

          <View style={styles.reactions}>
            {REACTIONS.map((emoji) => (
              <TvFocusable
                key={emoji}
                onPress={() => sendReaction(emoji)}
                style={styles.reactionBtn}
              >
                <Text style={styles.reaction}>{emoji}</Text>
              </TvFocusable>
            ))}
          </View>

          {permissions.canChat ? (
            <View style={styles.composer}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Сообщение"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                onSubmitEditing={submitChat}
                returnKeyType="send"
              />
              <TvFocusable onPress={submitChat} style={styles.sendBtn}>
                <Ionicons name="send" size={18} color={colors.text} />
              </TvFocusable>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      ) : null}
    </View>
  );
}

export default function PartyRoomScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const id = String(roomId ?? '');
  if (!id) return null;
  return (
    <PartySessionProvider roomId={id}>
      <PartyRoomBody />
    </PartySessionProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  player: { ...StyleSheet.absoluteFill },
  center: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
  },
  muted: { color: colors.textSecondary },
  primaryBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.brandAccent,
  },
  primaryBtnLabel: { color: colors.text, fontWeight: '700' },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    top: '45%',
    zIndex: 70,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  toastText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  topActionsWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 60,
    paddingHorizontal: spacing.md,
    alignItems: 'flex-end',
  },
  codeChrome: {
    position: 'absolute',
    left: spacing.md,
    zIndex: 60,
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  codeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    gap: 2,
  },
  codeKicker: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  codeLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
    fontVariant: ['tabular-nums'],
  },
  topActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  leaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: 'rgba(239,68,68,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.4)',
  },
  leaveLabel: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  chromeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  chromeBtnActive: {
    backgroundColor: 'rgba(79,70,229,0.75)',
    borderColor: colors.brandAccent,
  },
  peekStack: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 65,
    width: '72%',
    maxWidth: 280,
    gap: spacing.sm,
  },
  peek: {
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    gap: 2,
  },
  peekNick: { color: colors.brandTint, fontSize: 11, fontWeight: '700' },
  peekText: { color: '#fff', fontSize: 13, lineHeight: 18 },
  chatSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 80,
    maxHeight: '55%',
    backgroundColor: 'rgba(19,18,27,0.96)',
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatTitle: { color: colors.text, fontWeight: '800', fontSize: 16 },
  chatList: { flexGrow: 1 },
  chatContent: { paddingVertical: spacing.sm, flexGrow: 1 },
  reactions: { flexDirection: 'row', gap: spacing.sm },
  reactionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  reaction: { fontSize: 18 },
  composer: { flexDirection: 'row', gap: spacing.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    backgroundColor: colors.bgCard,
    fontSize: 15,
  },
  sendBtn: {
    width: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandAccent,
  },
});
