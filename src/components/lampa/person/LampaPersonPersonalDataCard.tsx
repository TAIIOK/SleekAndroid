import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing } from '@/constants/aniverse';

interface LampaPersonPersonalDataCardProps {
  birthLine?: string;
  placeOfBirth?: string;
  homepage?: string;
  imdbId?: string;
}

export function LampaPersonPersonalDataCard({
  birthLine,
  placeOfBirth,
  homepage,
  imdbId,
}: LampaPersonPersonalDataCardProps) {
  if (!birthLine && !placeOfBirth && !homepage && !imdbId) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="information-circle-outline" size={16} color={colors.brand} />
        </View>
        <Text style={styles.title}>Личные данные</Text>
      </View>

      <View style={styles.rows}>
        {birthLine ? <InfoRow label="Дата рождения" value={birthLine} /> : null}
        {placeOfBirth ? <InfoRow label="Место рождения" value={placeOfBirth} /> : null}
        {homepage || imdbId ? (
          <View style={styles.row}>
            <Text style={styles.label}>Ссылки</Text>
            <View style={styles.links}>
              {homepage ? (
                <Pressable
                  accessibilityLabel="Сайт"
                  onPress={() => void Linking.openURL(homepage)}
                  style={styles.linkBtn}
                >
                  <Ionicons name="globe-outline" size={16} color={colors.textSecondary} />
                </Pressable>
              ) : null}
              {imdbId ? (
                <Pressable
                  accessibilityLabel="IMDb"
                  onPress={() => void Linking.openURL(`https://www.imdb.com/name/${imdbId}/`)}
                  style={styles.linkBtn}
                >
                  <Ionicons name="link-outline" size={16} color={colors.textSecondary} />
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(23,25,35,0.95)',
    padding: spacing.md,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(195,192,255,0.15)',
  },
  title: { color: colors.text, fontSize: 17, fontWeight: '700' },
  rows: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  label: { width: '38%', color: 'rgba(255,255,255,0.45)', fontSize: 14 },
  value: {
    flex: 1,
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  links: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  linkBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
});
