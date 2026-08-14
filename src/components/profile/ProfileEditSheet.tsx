import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { uploadAvatarViaApi } from '@/api/avatarUpload';
import { updateProfile } from '@/api/user';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import { resolvePosterUrl } from '@/lib/config';

interface ProfileEditSheetProps {
  visible: boolean;
  nickname?: string;
  email?: string;
  avatarUrl?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function ProfileEditSheet({
  visible,
  nickname: initialNickname,
  email: initialEmail,
  avatarUrl,
  onClose,
  onSaved,
}: ProfileEditSheetProps) {
  const [nickname, setNickname] = useState(initialNickname ?? '');
  const [email, setEmail] = useState(initialEmail ?? '');
  const [localAvatar, setLocalAvatar] = useState<string | undefined>(avatarUrl);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setNickname(initialNickname ?? '');
    setEmail(initialEmail ?? '');
    setLocalAvatar(avatarUrl);
  }, [visible, initialNickname, initialEmail, avatarUrl]);

  const pickAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Нет доступа', 'Разрешите доступ к фотографиям');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setBusy(true);
    try {
      const url = await uploadAvatarViaApi({
        uri: asset.uri,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
      });
      setLocalAvatar(url);
      await updateProfile({ avatar: url });
    } catch (error) {
      Alert.alert('Ошибка', error instanceof Error ? error.message : 'Не удалось загрузить аватар');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const updated = await updateProfile({
        nickname: nickname.trim() || undefined,
        email: email.trim() || undefined,
        avatar: localAvatar,
      });
      if (!updated) throw new Error('Не удалось сохранить профиль');
      onSaved();
      onClose();
    } catch (error) {
      Alert.alert('Ошибка', error instanceof Error ? error.message : 'Не удалось сохранить');
    } finally {
      setBusy(false);
    }
  };

  const preview = resolvePosterUrl(localAvatar);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Редактировать профиль</Text>

          <TvFocusable onPress={() => void pickAvatar()} style={styles.avatarBtn}>
            {preview ? (
              <Image source={{ uri: preview }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarLetter}>
                  {(nickname || '?').slice(0, 1).toUpperCase()}
                </Text>
              </View>
            )}
            <Text style={styles.avatarHint}>Сменить фото</Text>
          </TvFocusable>

          <Text style={styles.label}>Никнейм</Text>
          <TextInput
            value={nickname}
            onChangeText={setNickname}
            style={styles.input}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          {busy ? <ActivityIndicator color={colors.brand} /> : null}

          <View style={styles.actions}>
            <TvFocusable onPress={onClose} style={styles.secondary}>
              <Text style={styles.secondaryLabel}>Отмена</Text>
            </TvFocusable>
            <TvFocusable disabled={busy} onPress={() => void save()} style={styles.primary}>
              <Text style={styles.primaryLabel}>Сохранить</Text>
            </TvFocusable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: spacing.sm },
  avatarBtn: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  avatar: { width: 72, height: 72, borderRadius: 36 },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  avatarLetter: { color: colors.text, fontSize: 24, fontWeight: '800' },
  avatarHint: { color: colors.brand, fontWeight: '600' },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: 'rgba(0,0,0,0.25)',
    marginBottom: spacing.sm,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.md },
  secondary: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  secondaryLabel: { color: colors.textSecondary, fontWeight: '600' },
  primary: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.brand,
  },
  primaryLabel: { color: '#fff', fontWeight: '700' },
});
