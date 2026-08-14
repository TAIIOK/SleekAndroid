import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radii, spacing } from '@/constants/aniverse';

const BIO_LIMIT = 360;

interface LampaPersonBioCardProps {
  biography: string;
}

export function LampaPersonBioCard({ biography }: LampaPersonBioCardProps) {
  const [expanded, setExpanded] = useState(false);
  const text = biography.trim();
  if (!text) return null;

  const isLong = text.length > BIO_LIMIT;
  const visibleText =
    !isLong || expanded ? text : `${text.slice(0, BIO_LIMIT).trim()}…`;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name="document-text-outline" size={16} color={colors.brand} />
        </View>
        <Text style={styles.title}>Биография</Text>
      </View>
      <Text style={styles.body}>{visibleText}</Text>
      {isLong ? (
        <Pressable onPress={() => setExpanded((value) => !value)} style={styles.toggle}>
          <Text style={styles.toggleText}>{expanded ? 'Свернуть' : 'Читать полностью'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#171923',
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
  body: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 15,
    lineHeight: 24,
  },
  toggle: { alignSelf: 'flex-start' },
  toggleText: { color: colors.brand, fontSize: 14, fontWeight: '700' },
});
