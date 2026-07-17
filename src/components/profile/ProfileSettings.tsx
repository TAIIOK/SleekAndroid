import { useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text } from 'react-native';

import { ProfileSection } from '@/components/profile/ProfileSection';
import { colors, radii, spacing } from '@/constants/aniverse';

interface ProfileSettingsProps {
  onLogout: () => void;
}

export function ProfileSettings({ onLogout }: ProfileSettingsProps) {
  const router = useRouter();

  return (
    <ProfileSection title="Настройки">
      {!Platform.isTV ? (
        <Pressable
          style={styles.row}
          onPress={() => router.push('/accounts')}
        >
          <Text style={styles.rowLabel}>Управление аккаунтами</Text>
        </Pressable>
      ) : null}
      <Pressable style={[styles.row, styles.logoutRow]} onPress={onLogout}>
        <Text style={styles.logoutLabel}>Выйти</Text>
      </Pressable>
    </ProfileSection>
  );
}

const styles = StyleSheet.create({
  row: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    padding: spacing.lg,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  logoutRow: {
    borderColor: 'rgba(248,113,113,0.25)',
    backgroundColor: 'rgba(63,29,29,0.35)',
  },
  logoutLabel: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
