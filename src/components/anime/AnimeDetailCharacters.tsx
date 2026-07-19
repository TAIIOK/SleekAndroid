import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AnimeCharacter } from '@/api/catalog';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { colors, radii, spacing } from '@/constants/aniverse';
import { resolvePosterUrl } from '@/lib/config';

interface AnimeDetailCharactersProps {
  characters: AnimeCharacter[];
  loading?: boolean;
}

export function AnimeDetailCharacters({ characters, loading }: AnimeDetailCharactersProps) {
  if (!loading && !characters.length) return null;

  return (
    <View style={styles.wrap}>
      <SectionHeader title="Персонажи" />
      {loading && !characters.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} width={88} height={140} rounded={radii.md} />
          ))}
        </ScrollView>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {characters.map((character, index) => (
            <CharacterTile key={character.id ?? index} character={character} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function CharacterTile({ character }: { character: AnimeCharacter }) {
  const image = resolvePosterUrl(character.image);
  const role = character.role?.trim();

  return (
    <View style={styles.tile}>
      <View style={styles.avatar}>
        {image ? (
          <Image source={{ uri: image }} style={styles.image} />
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

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  row: { gap: spacing.md, paddingRight: spacing.lg },
  tile: { width: 88, gap: 6 },
  avatar: {
    width: 88,
    aspectRatio: 3 / 4,
    borderRadius: radii.md,
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
  fallbackLetter: { color: colors.textSecondary, fontSize: 22, fontWeight: '700' },
  name: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  role: {
    color: colors.textSecondary,
    fontSize: 10,
    textAlign: 'center',
  },
});
