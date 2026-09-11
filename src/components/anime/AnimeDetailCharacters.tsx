import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AnimeCharacter } from '@/api/catalog';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { colors, radii, spacing } from '@/constants/aniverse';
import { capDetailRailItems } from '@/lib/catalogRailPage';
import { resolveAnimePosterUrl } from '@/lib/config';
import { hotlinkImageSource, resolveHotlinkDisplayUri } from '@/lib/hotlinkImage';
import { isTvUi } from '@/lib/isTvUi';

interface AnimeDetailCharactersProps {
  characters: AnimeCharacter[];
  loading?: boolean;
  hideTitle?: boolean;
}

export function AnimeDetailCharacters({
  characters,
  loading,
  hideTitle = false,
}: AnimeDetailCharactersProps) {
  const visibleCharacters = capDetailRailItems(characters);

  if (!loading && !characters.length) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      {hideTitle ? null : isTvUi() ? (
        <SectionHeader title="Персонажи" flush />
      ) : (
        <Text style={styles.phoneTitle}>Персонажи</Text>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {visibleCharacters.map((character, index) => (
          <CharacterTile key={character.id ?? index} character={character} />
        ))}
      </ScrollView>
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

function CharacterTile({ character }: { character: AnimeCharacter }) {
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

  return (
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
}

const TILE = isTvUi() ? 88 : 72;
const TILE_H = Math.round((TILE * 4) / 3);

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  phoneTitle: {
    color: colors.brand,
    fontSize: 16,
    fontWeight: '700',
  },
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
