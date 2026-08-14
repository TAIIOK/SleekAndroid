import { StyleSheet, Text, View } from 'react-native';

import { PartyMemberAvatar } from '@/components/party/PartyMemberAvatar';
import { colors, radii, spacing } from '@/constants/aniverse';
import type { PartyTimelineItem } from '@/types/party';

export function PartyChatBubble({
  item,
  isOwn,
}: {
  item: PartyTimelineItem;
  isOwn?: boolean;
}) {
  if (item.kind === 'system') {
    return (
      <View style={styles.systemWrap}>
        <Text style={styles.system}>{item.text}</Text>
      </View>
    );
  }

  if (isOwn) {
    return (
      <View style={[styles.row, styles.rowOwn]}>
        <View style={[styles.bubble, styles.bubbleOwn]}>
          <Text style={styles.textOwn}>{item.text}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <PartyMemberAvatar
        nickname={item.nickname}
        avatar={item.avatar}
        size="sm"
      />
      <View style={styles.otherCol}>
        <Text style={styles.nick} numberOfLines={1}>
          {item.nickname ?? item.userId}
        </Text>
        <View style={[styles.bubble, styles.bubbleOther]}>
          <Text style={styles.textOther}>{item.text}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  systemWrap: {
    alignItems: 'center',
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  system: {
    color: colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  rowOwn: {
    justifyContent: 'flex-end',
  },
  otherCol: {
    flex: 1,
    gap: 2,
    maxWidth: '78%',
  },
  nick: {
    color: colors.brand,
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 4,
  },
  bubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.lg,
  },
  bubbleOwn: {
    maxWidth: '80%',
    backgroundColor: colors.brandAccent,
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bgElevated,
    borderBottomLeftRadius: 6,
  },
  textOwn: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
  },
  textOther: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
  },
});
