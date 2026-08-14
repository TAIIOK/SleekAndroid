import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FriendAvatar } from '@/components/friends/FriendAvatar';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';

type FriendUserRowProps = {
  nickname?: string | null;
  userId: string;
  avatar?: string | { url?: string } | null;
  isOnline?: boolean;
  onPress?: () => void;
  actions?: ReactNode;
  bordered?: boolean;
};

export function FriendUserRow({
  nickname,
  userId,
  avatar,
  isOnline,
  onPress,
  actions,
  bordered = false,
}: FriendUserRowProps) {
  const label = nickname ?? userId;
  const body = (
    <>
      <FriendAvatar avatar={avatar} nickname={nickname} size={44} />
      <View style={styles.text}>
        <Text style={styles.nickname} numberOfLines={1}>
          {label}
        </Text>
        {isOnline ? <Text style={styles.online}>онлайн</Text> : null}
      </View>
    </>
  );

  let user: ReactNode;
  if (!onPress) {
    user = <View style={styles.user}>{body}</View>;
  } else if (isTvUi()) {
    user = (
      <TvFocusable onPress={onPress} style={styles.user} accessibilityLabel={label}>
        {body}
      </TvFocusable>
    );
  } else {
    user = (
      <Pressable onPress={onPress} style={styles.user} accessibilityRole="button">
        {body}
      </Pressable>
    );
  }

  return (
    <View style={[styles.row, bordered && styles.bordered]}>
      {user}
      {actions ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  bordered: {
    paddingHorizontal: spacing.md,
    borderBottomWidth: 0,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  user: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minWidth: 0,
  },
  text: { flex: 1, minWidth: 0 },
  nickname: { color: colors.text, fontWeight: '700', fontSize: 15 },
  online: { color: colors.brand, fontSize: 12, marginTop: 2 },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
});
