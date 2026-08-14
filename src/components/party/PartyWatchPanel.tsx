import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PartyAnimeWatch } from '@/components/party/PartyAnimeWatch';
import { TvFocusable } from '@/components/tv/TvFocusable';
import { colors, radii, spacing } from '@/constants/aniverse';
import { usePartySession } from '@/providers/PartySessionProvider';
import type { PartyContent } from '@/types/party';

function PartyWatchFallback({
  title,
  message,
  onBack,
  onPick,
}: {
  title: string;
  message: string;
  onBack?: () => void;
  onPick?: () => void;
}) {
  return (
    <View style={styles.fallback}>
      <Text style={styles.fallbackTitle}>{title}</Text>
      <Text style={styles.fallbackBody}>{message}</Text>
      {onPick ? (
        <TvFocusable onPress={onPick} style={styles.cta}>
          <Text style={styles.ctaLabel}>Выбрать контент</Text>
        </TvFocusable>
      ) : null}
      {onBack ? (
        <TvFocusable onPress={onBack} style={styles.secondary}>
          <Text style={styles.secondaryLabel}>Назад</Text>
        </TvFocusable>
      ) : null}
    </View>
  );
}

/** Fullscreen synced player for the room's current content. */
export function PartyWatchPanel({
  content,
  onBack,
  onControlsVisibleChange,
}: {
  content?: PartyContent;
  onBack?: () => void;
  onControlsVisibleChange?: (visible: boolean) => void;
}) {
  const router = useRouter();
  const { permissions } = usePartySession();
  const canPick = permissions.canChangeContent;

  if (content?.contentType === 'anime' && content.animeId) {
    return (
      <PartyAnimeWatch
        key={`party-anime-${content.animeId}-${content.episode ?? 0}`}
        animeId={content.animeId}
        episodeOrdinal={content.episode}
        season={content.season}
        onBack={onBack}
        onControlsVisibleChange={onControlsVisibleChange}
      />
    );
  }

  if (
    content?.tmdbId &&
    (content.contentType === 'movie' ||
      content.contentType === 'tv' ||
      content.contentType === 'lampa' ||
      content.kind === 'movie' ||
      content.kind === 'tv')
  ) {
    const kind = content.kind === 'tv' || content.contentType === 'tv' ? 'tv' : 'movie';
    return (
      <PartyWatchFallback
        title={content.title || 'Фильм / сериал'}
        message="Синхронный плеер для фильмов и сериалов подключается. Откройте тайтл и продолжите просмотр — комната сохранит выбор."
        onBack={onBack}
        onPick={
          canPick
            ? () => router.push(kind === 'tv' ? `/series/${content.tmdbId}` : `/movies/${content.tmdbId}`)
            : undefined
        }
      />
    );
  }

  return (
    <PartyWatchFallback
      title="Контент не выбран"
      message="Откройте аниме и нажмите «Смотреть вместе» — видео сразу откроется в комнате."
      onBack={onBack}
      onPick={canPick ? () => router.push('/anime') : undefined}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  fallbackTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  fallbackBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  cta: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.brandAccent,
  },
  ctaLabel: { color: colors.text, fontWeight: '700' },
  secondary: { paddingVertical: 10 },
  secondaryLabel: { color: colors.textSecondary, fontWeight: '600' },
});
