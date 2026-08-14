import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import { useDownloadQueue } from '@/hooks/useDownloadQueue';
import { isActiveDownloadState, isPausedDownloadState } from '@/services/download/types';
import { isTvUi } from '@/lib/isTvUi';

export function DownloadNavIndicator() {
  const router = useRouter();
  const { records } = useDownloadQueue();
  if (isTvUi()) return null;

  const active = records.filter(
    (r) => isActiveDownloadState(r.state) || isPausedDownloadState(r.state),
  );
  if (!active.length) return null;

  const downloading = active.find((r) => r.state === 'downloading');
  const label = downloading
    ? `${Math.round((downloading.progress || 0) * 100)}%`
    : String(active.length);

  return (
    <TvFocusable onPress={() => router.push('/downloads')} style={styles.btn}>
      <Text style={styles.icon}>⬇</Text>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{label}</Text>
      </View>
    </TvFocusable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  icon: { color: colors.text, fontSize: 16 },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 3,
    backgroundColor: colors.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
