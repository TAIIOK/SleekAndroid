import { Image } from 'expo-image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, type View as NativeView } from 'react-native';

import type { AnimeCharacter } from '@/api/catalog';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, radii, spacing } from '@/constants/aniverse';
import { capDetailRailItems } from '@/lib/catalogRailPage';
import { resolveAnimePosterUrl } from '@/lib/config';
import { DETAIL_FOCUS_CHARACTERS, useDetailFocusSlot } from '@/lib/detailFocus';
import { hotlinkImageSource, resolveHotlinkDisplayUri } from '@/lib/hotlinkImage';
import { isTvUi } from '@/lib/isTvUi';

interface AnimeDetailCharactersProps {
  characters: AnimeCharacter[];
  loading?: boolean;
  onSeeAll?: () => void;
}

export function AnimeDetailCharacters({
  characters,
  loading = false,
  onSeeAll,
}: AnimeDetailCharactersProps) {
  const visibleCharacters = capDetailRailItems(characters);
  const hasMore = onSeeAll != null && characters.length > visibleCharacters.length;
  const seeAllFocus = useDetailFocusSlot(hasMore ? DETAIL_FOCUS_CHARACTERS : undefined);
  const tileFocus = useDetailFocusSlot(
    visibleCharacters.length > 0
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

  if (!loading && visibleCharacters.length === 0) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <SectionHeader
        title="Персонажи"
        flush
        onSeeAll={hasMore ? onSeeAll : undefined}
        seeAllHostRef={hasMore ? seeAllFocus.hostRef : undefined}
        seeAllNextFocusUp={hasMore ? seeAllFocus.nextFocusUp : undefined}
        seeAllNextFocusDown={hasMore ? seeAllFocus.nextFocusDown : undefined}
      />
      {loading && visibleCharacters.length === 0 ? (
        <ActivityIndicator color={colors.brand} style={styles.loader} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {visibleCharacters.map((character, index) => (
            <CharacterTile
              key={character.id ?? index}
              character={character}
              railStart={index === 0}
              hostRef={index === 0 ? bindFirstTile : undefined}
              nextFocusUp={tileFocus.nextFocusUp}
              nextFocusDown={tileFocus.nextFocusDown}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function characterImageUrl(character: AnimeCharacter): string | undefined {
  return (
    resolveAnimePosterUrl(character.thumbnail) ??
    resolveAnimePosterUrl(character.image)
  );
}

function characterRole(character: AnimeCharacter): string | undefined {
  const role = (character.type ?? character.role)?.trim();
  return role || undefined;
}

function CharacterTile({
  character,
  railStart,
  hostRef,
  nextFocusUp,
  nextFocusDown,
}: {
  character: AnimeCharacter;
  railStart?: boolean;
  hostRef?: (node: NativeView | null) => void;
  nextFocusUp?: number;
  nextFocusDown?: number;
}) {
  const remoteUri = characterImageUrl(character);
  const role = characterRole(character);
  const fallbackTried = useRef(false);
  const [source, setSource] = useState<{ uri: string; headers?: Record<string, string> } | null>(
    () => (remoteUri ? hotlinkImageSource(remoteUri) : null),
  );
  const [failed, setFailed] = useState(!remoteUri);

  useEffect(() => {
    fallbackTried.current = false;
    setFailed(!remoteUri);
    setSource(remoteUri ? hotlinkImageSource(remoteUri) : null);
  }, [remoteUri]);

  const onImageError = () => {
    if (!remoteUri || fallbackTried.current) {
      setFailed(true);
      return;
    }
    fallbackTried.current = true;
    void resolveHotlinkDisplayUri(remoteUri).then((uri) => {
      if (uri) {
        setSource({ uri });
        setFailed(false);
      } else {
        setFailed(true);
      }
    });
  };

  const body = (
    <View style={styles.tile}>
      <View style={styles.avatar}>
        {source && !failed ? (
          <Image
            source={{ ...source, width: TILE, height: TILE_H }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={source.uri}
            transition={0}
            onError={onImageError}
          />
        ) : (
          <View style={styles.fallback}>
            <Text style={styles.fallbackLetter}>
              {(character.name ?? '?').slice(0, 1).toUpperCase()}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.name} numberOfLines={2}>
        {character.name ?? 'Персонаж'}
      </Text>
      {role ? (
        <Text style={styles.role} numberOfLines={2}>
          {role}
        </Text>
      ) : null}
    </View>
  );

  if (!isTvUi()) return body;

  return (
    <TvFocusable
      railStart={railStart}
      hostRef={hostRef}
      nextFocusUp={nextFocusUp}
      nextFocusDown={nextFocusDown}
      style={styles.tile}
    >
      {body}
    </TvFocusable>
  );
}

const TILE = isTvUi() ? 88 : 72;
const TILE_H = Math.round((TILE * 4) / 3);

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  loader: { alignSelf: 'flex-start', marginVertical: spacing.sm },
  row: { gap: isTvUi() ? spacing.md : 6, paddingRight: spacing.lg },
  tile: { width: TILE, gap: 2 },
  avatar: {
    width: TILE,
    height: TILE_H,
    borderRadius: isTvUi() ? radii.sm : 8,
    overflow: 'hidden',
    backgroundColor: colors.bgCard,
  },
  image: {
    width: TILE,
    height: TILE_H,
  },
  fallback: {
    width: TILE,
    height: TILE_H,
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
