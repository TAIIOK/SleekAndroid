import { usePathname, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { LampaCastMember } from '@/api/lampaExtras';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, radii, spacing } from '@/constants/aniverse';
import { resolveLampaPosterUrl } from '@/lib/config';
import { setDetailReturnPath } from '@/lib/detailNavigation';
import { isTvUi } from '@/lib/isTvUi';

interface LampaDetailCastProps {
  cast: LampaCastMember[];
  loading?: boolean;
}

export function LampaDetailCast({ cast, loading }: LampaDetailCastProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mountImages, setMountImages] = useState(false);

  useEffect(() => {
    if (loading || !cast.length) {
      setMountImages(false);
      return;
    }
    const timer = setTimeout(() => setMountImages(true), 120);
    return () => clearTimeout(timer);
  }, [loading, cast.length]);

  if (!loading && !cast.length) return null;

  const showSkeleton = loading && !cast.length;
  const showTiles = !showSkeleton && mountImages;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <SectionHeader title="Актёры" flush />
      {showTiles ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {cast.map((member) => (
            <CastTile
              key={member.id}
              member={member}
              onPress={() => {
                if (!member.id) return;
                if (!isTvUi()) setDetailReturnPath(pathname);
                router.push(`/person/${member.id}`);
              }}
            />
          ))}
        </ScrollView>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          pointerEvents="none"
        >
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} width={TILE} height={140} rounded={radii.md} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function CastTile({
  member,
  onPress,
}: {
  member: LampaCastMember;
  onPress: () => void;
}) {
  const image = member.profilePath
    ? resolveLampaPosterUrl(member.profilePath, 'w185')
    : undefined;

  return (
    <TvFocusable onPress={onPress} style={styles.tile}>
      <View style={styles.avatar}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
        ) : (
          <View style={styles.fallback}>
            <Text style={styles.fallbackLetter}>
              {(member.name ?? '?').slice(0, 1).toUpperCase()}
            </Text>
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
    </TvFocusable>
  );
}

const TILE = isTvUi() ? 88 : 72;

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { gap: isTvUi() ? spacing.md : spacing.sm, paddingRight: spacing.lg },
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
    fontSize: isTvUi() ? 22 : 18,
    fontWeight: '700',
  },
  name: {
    color: colors.text,
    fontSize: isTvUi() ? 12 : 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  role: {
    color: colors.textSecondary,
    fontSize: 10,
    textAlign: 'center',
  },
});
