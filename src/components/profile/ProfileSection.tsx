import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '@/constants/aniverse';

interface ProfileSectionProps {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

export function ProfileSection({ title, action, children }: ProfileSectionProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {action}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
});
