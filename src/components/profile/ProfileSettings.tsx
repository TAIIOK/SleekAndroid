import { useRouter } from 'expo-router';
import {
  StyleSheet,
  Text,
} from 'react-native';

import { ProfileSection } from '@/components/profile/ProfileSection';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing, tvFocus } from '@/constants/aniverse';
import { isTvUi } from '@/lib/isTvUi';

interface ProfileSettingsProps {
  onLogout: () => void;
}

export function ProfileSettings({ onLogout }: ProfileSettingsProps) {
  const router = useRouter();

  return (
    <ProfileSection title="Настройки">
      <TvFocusable
        style={styles.row}
        focusedStyle={styles.rowFocused}
        onPress={() => router.push('/settings')}
      >
        <Text style={styles.rowLabel}>Параметры приложения</Text>
      </TvFocusable>
      {!isTvUi() ? (
        <TvFocusable
          style={styles.row}
          focusedStyle={styles.rowFocused}
          onPress={() => router.push('/accounts')}
        >
          <Text style={styles.rowLabel}>Управление аккаунтами</Text>
        </TvFocusable>
      ) : null}
      <TvFocusable
        style={[styles.row, styles.logoutRow]}
        focusedStyle={styles.logoutFocused}
        onPress={onLogout}
      >
        <Text style={styles.logoutLabel}>Выйти</Text>
      </TvFocusable>
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
    marginBottom: spacing.sm,
  },
  rowFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: tvFocus.fill,
  },
  rowLabel: {
    color: colors.text,
    fontSize: isTvUi() ? 18 : 15,
    fontWeight: '600',
  },
  logoutRow: {
    borderColor: 'rgba(248,113,113,0.25)',
    backgroundColor: 'rgba(63,29,29,0.35)',
    marginBottom: 0,
  },
  logoutFocused: {
    borderColor: tvFocus.borderColor,
    backgroundColor: 'rgba(127,29,29,0.55)',
  },
  logoutLabel: {
    color: colors.danger,
    fontSize: isTvUi() ? 18 : 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});
