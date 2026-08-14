import { Image, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/aniverse';
import { resolvePosterUrl } from '@/lib/config';
import { resolveAvatarUrl } from '@/lib/profileAvatar';

type FriendAvatarProps = {
  avatar?: string | { url?: string } | null;
  nickname?: string | null;
  size?: 36 | 44;
};

export function FriendAvatar({ avatar, nickname, size = 44 }: FriendAvatarProps) {
  const uri = resolvePosterUrl(resolveAvatarUrl(avatar));
  const letter = (nickname ?? '?').slice(0, 1).toUpperCase();
  const dim = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={dim} />;
  }

  return (
    <View style={[dim, styles.fallback]}>
      <Text style={[styles.letter, { fontSize: size >= 44 ? 16 : 13 }]}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  letter: {
    color: colors.text,
    fontWeight: '700',
  },
});
