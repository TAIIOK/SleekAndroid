import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/aniverse';
import { resolvePosterUrl } from '@/lib/config';
import { resolveAvatarUrl } from '@/lib/profileAvatar';

type Size = 'sm' | 'md';

const SIZES: Record<Size, number> = {
  sm: 36,
  md: 44,
};

export function PartyMemberAvatar({
  nickname,
  avatar,
  online,
  isLeader,
  size = 'md',
}: {
  nickname?: string | null;
  avatar?: string | null;
  online?: boolean;
  isLeader?: boolean;
  size?: Size;
}) {
  const dim = SIZES[size];
  const uri = resolvePosterUrl(resolveAvatarUrl(avatar));
  const letter = (nickname ?? '?').trim().slice(0, 1).toUpperCase() || '?';

  return (
    <View style={{ width: dim, height: dim }}>
      {uri ? (
        <Image source={{ uri }} style={[styles.avatar, { width: dim, height: dim, borderRadius: dim / 2 }]} />
      ) : (
        <View
          style={[
            styles.avatar,
            styles.fallback,
            { width: dim, height: dim, borderRadius: dim / 2 },
          ]}
        >
          <Text style={[styles.letter, size === 'sm' && styles.letterSm]}>{letter}</Text>
        </View>
      )}
      {online ? <View style={[styles.online, size === 'sm' && styles.onlineSm]} /> : null}
      {isLeader ? (
        <View style={[styles.leader, size === 'sm' && styles.leaderSm]}>
          <Text style={styles.leaderMark}>★</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  letter: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  letterSm: {
    fontSize: 13,
  },
  online: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34d399',
    borderWidth: 2,
    borderColor: colors.bg,
  },
  onlineSm: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    borderWidth: 1.5,
  },
  leader: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandAccent,
  },
  leaderSm: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  leaderMark: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    lineHeight: 11,
  },
});
