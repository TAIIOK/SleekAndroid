import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Image,
  ImageBackground,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { LampaPersonDetail } from '@/api/lampaPerson';
import { LampaPersonPersonalDataCard } from '@/components/lampa/person/LampaPersonPersonalDataCard';
import { colors, radii, spacing } from '@/constants/aniverse';
import { resolveLampaPosterUrl } from '@/lib/config';
import { isTvUi } from '@/lib/isTvUi';
import { formatPersonBirthdayWithAge, localizePersonDepartment } from '@/lib/lampaPersonUtils';

interface LampaPersonHeroProps {
  person: LampaPersonDetail;
}

export function LampaPersonHero({ person }: LampaPersonHeroProps) {
  const tv = isTvUi();
  const image = person.profilePath
    ? resolveLampaPosterUrl(person.profilePath, 'w500')
    : undefined;
  const birthLine = formatPersonBirthdayWithAge(person.birthday, person.deathday);
  const departments = person.departments?.length
    ? person.departments
    : person.knownForDepartment
      ? [localizePersonDepartment(person.knownForDepartment) ?? person.knownForDepartment]
      : [];

  const sharePerson = async () => {
    try {
      await Share.share({
        message: person.name,
        title: person.name,
      });
    } catch {
      /* dismissed */
    }
  };

  return (
    <View style={styles.wrap}>
      {image ? (
        <ImageBackground source={{ uri: image }} style={StyleSheet.absoluteFill} blurRadius={28}>
          <View style={styles.bgDim} />
        </ImageBackground>
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.bgSolid]} />
      )}
      <LinearGradient
        colors={['rgba(0,0,0,0.2)', 'rgba(18,20,28,0.9)', colors.bg]}
        style={StyleSheet.absoluteFill}
      />

      <View style={[styles.inner, tv && styles.innerTv]}>
        <View style={[styles.photoWrap, tv && styles.photoWrapTv]}>
          {image ? (
            <Image source={{ uri: image }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoFallback]}>
              <Text style={styles.photoLetter}>{person.name.slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
        </View>

        <View style={[styles.infoCol, tv && styles.infoColTv]}>
          {departments.length > 0 ? (
            <View style={[styles.chips, tv && styles.chipsTv]}>
              {departments.map((department) => (
                <View key={department} style={styles.chip}>
                  <Text style={styles.chipText}>{department}</Text>
                </View>
              ))}
            </View>
          ) : null}

          <Text style={[styles.name, tv && styles.nameTv]}>{person.name}</Text>
          {person.englishName ? (
            <Text style={[styles.english, tv && styles.englishTv]}>{person.englishName}</Text>
          ) : null}

          {!tv ? (
            <Pressable onPress={() => void sharePerson()} style={styles.shareBtn}>
              <Ionicons name="share-outline" size={16} color={colors.text} />
              <Text style={styles.shareText}>Поделиться</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={[styles.dataCard, tv && styles.dataCardTv]}>
          <LampaPersonPersonalDataCard
            birthLine={birthLine}
            placeOfBirth={person.placeOfBirth}
            homepage={person.homepage}
            imdbId={person.imdbId}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: '#12141c',
  },
  bgDim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  bgSolid: { backgroundColor: '#12141c' },
  inner: {
    paddingTop: 72,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
  },
  innerTv: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  photoWrap: {
    width: 160,
    height: 220,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: colors.bgCard,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  photoWrapTv: {
    width: 180,
    height: 250,
  },
  photo: { width: '100%', height: '100%' },
  photoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  photoLetter: { color: colors.text, fontSize: 42, fontWeight: '800' },
  infoCol: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.sm,
  },
  infoColTv: {
    flex: 1,
    minWidth: 220,
    alignItems: 'flex-start',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  chipsTv: {
    justifyContent: 'flex-start',
  },
  chip: {
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  name: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  nameTv: {
    fontSize: 34,
    textAlign: 'left',
  },
  english: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 15,
    textAlign: 'center',
  },
  englishTv: {
    textAlign: 'left',
  },
  shareBtn: {
    marginTop: spacing.sm,
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  shareText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  dataCard: {
    width: '100%',
  },
  dataCardTv: {
    width: 320,
    maxWidth: '100%',
  },
});
