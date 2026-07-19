import { Image, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { LampaCastMember } from '@/api/lampaExtras';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, radii, spacing } from '@/constants/aniverse';
import { resolveLampaPosterUrl } from '@/lib/config';

interface LampaDetailCastProps {
  cast: LampaCastMember[];
  loading?: boolean;
}

export function LampaDetailCast({ cast, loading }: LampaDetailCastProps) {
  if (!loading && !cast.length) return null;

  return (
    <View style={styles.wrap}>
      <SectionHeader title="Актёры" flush />
      {loading && !cast.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} width={88} height={140} rounded={radii.md} />
          ))}
        </ScrollView>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {cast.map((member) => (
            <CastTile key={member.id} member={member} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function CastTile({ member }: { member: LampaCastMember }) {
  const image = member.profilePath
    ? resolveLampaPosterUrl(member.profilePath, 'w185')
    : undefined;

  return (
    <View style={styles.tile}>
      <View style={styles.avatar}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <View style={styles.fallback}>
            <Text style={styles.fallbackLetter}>{member.name.slice(0, 1).toUpperCase()}</Text>
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {member.name}
      </Text>
      {member.character ? (
        <Text style={styles.role} numberOfLines={2}>
          {member.character}
        </Text>
      ) : null}
    </View>
  );
}

const TILE = Platform.isTV ? 88 : 72;

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { gap: Platform.isTV ? spacing.md : spacing.sm, paddingRight: spacing.lg },
  tile: { width: TILE, gap: 4 },
  avatar: {
    width: TILE,
    aspectRatio: 3 / 4,
    borderRadius: radii.sm,
    overflow: 'hidden',
    backgroundColor: colors.bgCard,
  },
  image: { width: '100%', height: '100%' },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bgElevated,
  },
  fallbackLetter: {
    color: colors.textSecondary,
    fontSize: Platform.isTV ? 22 : 18,
    fontWeight: '700',
  },
  name: {
    color: colors.text,
    fontSize: Platform.isTV ? 12 : 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  role: {
    color: colors.textSecondary,
    fontSize: 10,
    textAlign: 'center',
  },
});
