import { Redirect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { fetchLampaProgress } from '@/api/progress';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import { colors, spacing } from '@/constants/aniverse';
import { useThrottledLampaProgress } from '@/hooks/useThrottledLampaProgress';
import {
  getDownloadPreferencesSync,
  loadDownloadPreferences,
  saveDownloadPreferences,
} from '@/lib/downloadPreferences';
import {
  findLinkByQuality,
  lampaConnectionLabel,
  lampaDeliveryLabel,
  linkSupportsConnection,
  linkSupportsDelivery,
  listLampaQualityLabels,
  normalizePlaybackModes,
  pickDefaultLampaQuality,
  resolveLampaPlaybackUrl,
  type LampaConnectionMode,
  type LampaDeliveryMode,
} from '@/lib/lampaPlaybackOptions';
import { lampaResumeProgress } from '@/lib/progressUtils';
import { consumeLampaWatchPayload } from '@/lib/watchStore';
import { useAuth } from '@/providers/AuthProvider';

export default function WatchLampaScreen() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [payload] = useState(() => consumeLampaWatchPayload());

  const downloadPrefs = getDownloadPreferencesSync();
  const [lampaQuality, setLampaQuality] = useState('');
  const [lampaConnection, setLampaConnection] = useState<LampaConnectionMode>(
    downloadPrefs.directFirst ? 'direct' : 'proxy',
  );
  const [lampaDelivery, setLampaDelivery] = useState<LampaDeliveryMode>(
    downloadPrefs.preferStreamOverFile ? 'stream' : 'file',
  );
  const playbackTimeRef = useRef(0);
  const [resumeTime, setResumeTime] = useState<number | undefined>();
  const [resumeFraction, setResumeFraction] = useState<number | undefined>();

  useEffect(() => {
    void loadDownloadPreferences().then((prefs) => {
      setLampaConnection(prefs.directFirst ? 'direct' : 'proxy');
      setLampaDelivery(prefs.preferStreamOverFile ? 'stream' : 'file');
    });
  }, []);

  const lampaLinks = payload?.lampaLinks ?? [];
  const lampaId = payload?.lampaId?.trim() ?? '';
  const isSerial = payload?.lampaKind === 'tv';

  const { data: progressRows = [] } = useQuery({
    queryKey: ['lampa-progress', lampaId || undefined],
    queryFn: () => fetchLampaProgress(lampaId),
    enabled: isAuthenticated && !!lampaId,
    staleTime: 30_000,
  });

  const qualityOptionsList = useMemo(
    () => listLampaQualityLabels(lampaLinks),
    [lampaLinks],
  );

  useEffect(() => {
    if (!qualityOptionsList.length) return;
    setLampaQuality((current) => {
      if (current && qualityOptionsList.includes(current)) return current;
      return pickDefaultLampaQuality(qualityOptionsList);
    });
  }, [qualityOptionsList]);

  const activeLampaLink = useMemo(() => {
    const quality = lampaQuality || pickDefaultLampaQuality(qualityOptionsList);
    return findLinkByQuality(lampaLinks, quality) ?? lampaLinks[0];
  }, [lampaLinks, lampaQuality, qualityOptionsList]);

  useEffect(() => {
    if (!activeLampaLink) return;
    const modes = normalizePlaybackModes(activeLampaLink, lampaConnection, lampaDelivery);
    if (modes.connection !== lampaConnection) setLampaConnection(modes.connection);
    if (modes.delivery !== lampaDelivery) setLampaDelivery(modes.delivery);
  }, [activeLampaLink, lampaConnection, lampaDelivery]);

  const src = useMemo(() => {
    if (!activeLampaLink) return undefined;
    const modes = normalizePlaybackModes(activeLampaLink, lampaConnection, lampaDelivery);
    return resolveLampaPlaybackUrl(
      lampaLinks,
      lampaQuality || pickDefaultLampaQuality(qualityOptionsList),
      modes.connection,
      modes.delivery,
    );
  }, [
    activeLampaLink,
    lampaLinks,
    lampaQuality,
    qualityOptionsList,
    lampaConnection,
    lampaDelivery,
  ]);

  const syncedProgress = useMemo(
    () =>
      lampaResumeProgress(
        progressRows,
        lampaId,
        payload?.season,
        payload?.episode,
        isSerial,
      ),
    [progressRows, lampaId, payload?.season, payload?.episode, isSerial],
  );

  useEffect(() => {
    playbackTimeRef.current = 0;
    const fraction =
      payload?.startProgress != null && payload.startProgress > 0.01
        ? payload.startProgress
        : syncedProgress;

    if (fraction == null || fraction <= 0.01) {
      setResumeTime(undefined);
      setResumeFraction(undefined);
      return;
    }

    setResumeTime(undefined);
    setResumeFraction(fraction);
  }, [payload?.startProgress, syncedProgress, payload?.lampaId, payload?.season, payload?.episode]);

  const title = useMemo(() => {
    if (!payload) return 'Воспроизведение';
    return payload.lampaTitle || 'Воспроизведение';
  }, [payload]);

  const subtitle = useMemo(() => {
    if (!payload) return undefined;
    const parts: string[] = [];
    if (payload.season != null && payload.episode != null) {
      parts.push(`Сезон ${payload.season} · Эпизод ${payload.episode}`);
    }
    if (qualityOptionsList.length > 0) {
      parts.push(lampaQuality || pickDefaultLampaQuality(qualityOptionsList));
    }
    parts.push(lampaConnectionLabel(lampaConnection));
    parts.push(lampaDeliveryLabel(lampaDelivery));
    return parts.join(' · ');
  }, [payload, qualityOptionsList, lampaQuality, lampaConnection, lampaDelivery]);

  const syncProgress = useThrottledLampaProgress(
    isAuthenticated && !!lampaId,
    lampaId,
    isSerial,
    payload?.season,
    payload?.episode,
  );

  const switchWithResume = (apply: () => void) => {
    if (playbackTimeRef.current > 0) {
      setResumeTime(playbackTimeRef.current);
      setResumeFraction(undefined);
    }
    apply();
  };

  if (authLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.brand} size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (!payload || !src) {
    return (
      <View style={styles.loader}>
        <Text style={styles.errorTitle}>Нет источника видео</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>Назад</Text>
        </Pressable>
      </View>
    );
  }

  const qualityOptions =
    qualityOptionsList.length > 1
      ? qualityOptionsList.map((label) => ({
          id: label,
          label,
          selected: label === (lampaQuality || pickDefaultLampaQuality(qualityOptionsList)),
          onSelect: () => switchWithResume(() => setLampaQuality(label)),
        }))
      : undefined;

  const connectionOptions =
    activeLampaLink &&
    linkSupportsConnection(activeLampaLink, 'direct') &&
    linkSupportsConnection(activeLampaLink, 'proxy')
      ? (['direct', 'proxy'] as const).map((mode) => ({
          id: mode,
          label: lampaConnectionLabel(mode),
          selected: mode === lampaConnection,
          onSelect: () =>
            switchWithResume(() => {
              setLampaConnection(mode);
              void saveDownloadPreferences({ directFirst: mode === 'direct' });
            }),
        }))
      : undefined;

  const deliveryOptions =
    activeLampaLink &&
    linkSupportsDelivery(activeLampaLink, lampaConnection, 'stream') &&
    linkSupportsDelivery(activeLampaLink, lampaConnection, 'file')
      ? (['stream', 'file'] as const).map((mode) => ({
          id: mode,
          label: lampaDeliveryLabel(mode),
          selected: mode === lampaDelivery,
          onSelect: () =>
            switchWithResume(() => {
              setLampaDelivery(mode);
              void saveDownloadPreferences({ preferStreamOverFile: mode === 'stream' });
            }),
        }))
      : undefined;

  return (
    <VideoPlayer
      src={src}
      title={title}
      subtitle={subtitle}
      startTime={resumeTime}
      startProgressFraction={resumeFraction}
      onBack={() => router.back()}
      qualityOptions={qualityOptions}
      connectionOptions={connectionOptions}
      deliveryOptions={deliveryOptions}
      onProgress={(current, duration) => {
        playbackTimeRef.current = current;
        syncProgress(current, duration);
      }}
    />
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  errorTitle: { color: colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center' },
  backBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    backgroundColor: colors.bgElevated,
  },
  backText: { color: colors.text, fontSize: 18, fontWeight: '600' },
});
