import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing, tvFocus } from '@/constants/aniverse';
import { collectionItemPoster, formatCollectionItemCount } from '@/lib/collectionItems';
import type { UserCollection, UserCollectionItem } from '@/types/collection';

interface LibraryCollectionCardProps {
  collection: UserCollection;
  previewItems?: UserCollectionItem[];
  previewLoading?: boolean;
  selected?: boolean;
  railStart?: boolean;
  onPress: () => void;
}

export function LibraryCollectionCard({
  collection,
  previewItems = [],
  previewLoading = false,
  selected = false,
  railStart = false,
  onPress,
}: LibraryCollectionCardProps) {
  const itemCount = collection.itemCount ?? previewItems.length;
  const cover = previewItems[0]
    ? collectionItemPoster(previewItems[0].mediaType, previewItems[0].poster)
    : undefined;
  const avatars = previewItems.slice(0, 4);

  return (
    <TvFocusable
      onPress={onPress}
      railStart={railStart}
      style={[styles.card, selected && styles.cardSelected]}
      focusedStyle={styles.cardFocused}
    >
      {previewLoading ? (
        <View style={styles.coverFallback} />
      ) : cover ? (
        <Image source={{ uri: cover }} style={styles.cover} contentFit="cover" />
      ) : (
        <View style={styles.coverFallback} />
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.45)', 'rgba(0,0,0,0.85)']}
        locations={[0, 0.45, 1]}
        style={styles.shade}
      />
      <View style={styles.body}>
        <View style={styles.top}>
          <View style={styles.titleBlock}>
            <Text style={styles.name} numberOfLines={1}>
              {collection.name}
            </Text>
            <Text style={styles.desc} numberOfLines={1}>
              {collection.description?.trim() || 'Личная подборка'}
            </Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeLabel}>{formatCollectionItemCount(itemCount)}</Text>
          </View>
        </View>
        {avatars.length > 0 ? (
          <View style={styles.avatars}>
            {avatars.map((item, index) => {
              const uri = collectionItemPoster(item.mediaType, item.poster);
              return (
                <View
                  key={item.id}
                  style={[styles.avatar, { marginLeft: index === 0 ? 0 : -8, zIndex: avatars.length - index }]}
                >
                  {uri ? (
                    <Image source={{ uri }} style={styles.avatarImage} contentFit="cover" />
                  ) : (
                    <View style={styles.avatarFallback} />
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.empty}>Пока пусто</Text>
        )}
      </View>
    </TvFocusable>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    minWidth: '23%',
    flexGrow: 1,
    flexBasis: '23%',
    minHeight: 112,
    overflow: 'hidden',
    borderRadius: radii.md,
    borderWidth: tvFocus.borderWidth,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  cardSelected: {
    borderColor: colors.brand,
    backgroundColor: 'rgba(195,192,255,0.08)',
  },
  cardFocused: {
    borderColor: '#ffffff',
    backgroundColor: tvFocus.fill,
  },
  cover: {
    ...StyleSheet.absoluteFillObject,
  },
  coverFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  shade: {
    ...StyleSheet.absoluteFillObject,
  },
  body: {
    flex: 1,
    justifyContent: 'space-between',
    padding: spacing.sm,
    gap: spacing.sm,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.xs,
  },
  titleBlock: { flex: 1, minWidth: 0, gap: 2 },
  name: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  desc: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
  },
  badge: {
    flexShrink: 0,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeLabel: {
    color: colors.text,
    fontSize: 10,
    fontWeight: '600',
  },
  avatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(0,0,0,0.5)',
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  empty: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11,
  },
});
