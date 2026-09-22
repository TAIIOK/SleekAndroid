import { Image } from 'expo-image';
import { usePathname, useRouter } from 'expo-router';
import { memo, useCallback } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, type View as NativeView } from 'react-native';

import type { LampaCastMember } from '@/api/lampaExtras';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, radii, spacing } from '@/constants/aniverse';
import { capDetailRailItems } from '@/lib/catalogRailPage';
import { resolveLampaPosterUrl } from '@/lib/config';
import { DETAIL_FOCUS_CHARACTERS, useDetailFocusSlot } from '@/lib/detailFocus';
import { setDetailReturnPath } from '@/lib/detailNavigation';
import { isTvUi } from '@/lib/isTvUi';

interface LampaDetailCastProps {
  cast: LampaCastMember[];
  loading?: boolean;
  onSeeAll?: () => void;
}

export function LampaDetailCast({ cast, loading = false, onSeeAll }: LampaDetailCastProps) {
  const router = useRouter();
  const pathname = usePathname();
  const visibleCast = capDetailRailItems(cast);
  const hasMore = onSeeAll != null && cast.length > visibleCast.length;
  const seeAllFocus = useDetailFocusSlot(hasMore ? DETAIL_FOCUS_CHARACTERS : undefined);
  const tileFocus = useDetailFocusSlot(
    visibleCast.length > 0
      ? hasMore
        ? DETAIL_FOCUS_CHARACTERS + 1
        : DETAIL_FOCUS_CHARACTERS
      : undefined,
  );
  const bindFirstTile = useCallback(
    (node: NativeView | null) => {
      tileFocus.hostRef?.(node);
    },
    [tileFocus.hostRef],
  );

  if (!loading && visibleCast.length === 0) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <SectionHeader
        title="Актёры"
        flush
        onSeeAll={hasMore ? onSeeAll : undefined}
        seeAllHostRef={hasMore ? seeAllFocus.hostRef : undefined}
        seeAllNextFocusUp={hasMore ? seeAllFocus.nextFocusUp : undefined}
        seeAllNextFocusDown={hasMore ? seeAllFocus.nextFocusDown : undefined}
      />
      {loading && visibleCast.length === 0 ? (
        <ActivityIndicator color={colors.brand} style={styles.loader} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {visibleCast.map((member, index) => (
            <CastTile
              key={member.id}
              member={member}
              railStart={index === 0}
              hostRef={index === 0 ? bindFirstTile : undefined}
              nextFocusUp={tileFocus.nextFocusUp}
              nextFocusDown={tileFocus.nextFocusDown}
              onPress={() => {
                if (!member.id) return;
                if (!isTvUi()) setDetailReturnPath(pathname);
                router.push(`/person/${member.id}`);
              }}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const TILE = isTvUi() ? 88 : 72;
const TILE_H = Math.round((TILE * 4) / 3);

const CastTile = memo(function CastTile({
  member,
  onPress,
  railStart,
  hostRef,
  nextFocusUp,
  nextFocusDown,
}: {
  member: LampaCastMember;
  onPress: () => void;
  railStart?: boolean;
  hostRef?: (node: NativeView | null) => void;
  nextFocusUp?: number;
  nextFocusDown?: number;
}) {
  const image = member.profilePath
    ? resolveLampaPosterUrl(member.profilePath, 'w185')
    : undefined;
  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  return (
    <TvFocusable
      onPress={handlePress}
      railStart={railStart}
      hostRef={hostRef}
      nextFocusUp={nextFocusUp}
      nextFocusDown={nextFocusDown}
      style={styles.tile}
    >
      <View style={styles.avatar}>
        {image ? (
          <Image
            source={{ uri: image, width: TILE, height: TILE_H }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={image}
            transition={0}
          />
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
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  loader: { alignSelf: 'flex-start', marginVertical: spacing.sm },
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
