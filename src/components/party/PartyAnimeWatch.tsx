import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { fetchAnimeDetail, fetchAnimeEpisodes } from '@/api/catalog';
import { PartyReactionsOverlay } from '@/components/party/PartyReactionsOverlay';
import { PartySyncBadge } from '@/components/party/PartySyncBadge';
import { TvPlayerFocusSink } from '@/components/player/tv/TvPlayerFocusSink';
import { VideoPlayer } from '@/components/player/VideoPlayer';
import type { PlayerEpisodeNav } from '@/components/player/types';
import { usePartyPlaybackSync, type PartyPlaybackHost } from '@/hooks/usePartyPlaybackSync';
import { useWatchEpisodeNavigation } from '@/hooks/useWatchEpisodeNavigation';
import { episodeNumber } from '@/lib/animeDetail';
import {
  EMPTY_ANIME_VIDEOS,
  getQualityOptionsForDubbing,
  getUniqueDubbingOptions,
  pickBestDubbingOption,
  pickDefaultQuality,
  pickPlaybackUrl,
  type PlaybackQuality,
} from '@/lib/animePlaybackOptions';
import { isTvUi } from '@/lib/isTvUi';
import { computeEffectivePlaybackTime } from '@/lib/partySync';
import { usePartySession } from '@/providers/PartySessionProvider';

function useResolvedPartyEpisode(animeId: number, episodeOrdinal?: number) {
  const { data, isLoading } = useQuery({
    queryKey: ['party-watch-episodes', animeId],
    queryFn: () => fetchAnimeEpisodes(animeId, 1, 500),
    enabled: Number.isFinite(animeId) && animeId > 0,
    staleTime: 60_000,
  });
  const episodes = data?.episodes ?? [];

  const found = useMemo(() => {
    if (episodeOrdinal != null && episodeOrdinal > 0) {
      return episodes.find((ep) => episodeNumber(ep) === episodeOrdinal);
    }
    return episodes[0];
  }, [episodes, episodeOrdinal]);

  return {
    episode: found,
    isResolving:
      isLoading ||
      (episodeOrdinal != null && episodeOrdinal > 0 && !found && episodes.length === 0),
    notFound:
      episodeOrdinal != null &&
      episodeOrdinal > 0 &&
      !found &&
      !isLoading &&
      episodes.length > 0,
  };
}

export function PartyAnimeWatch({
  animeId,
  episodeOrdinal,
  season,
  onBack,
  onControlsVisibleChange,
}: {
  animeId: number;
  episodeOrdinal?: number;
  season?: number;
  onBack?: () => void;
  onControlsVisibleChange?: (visible: boolean) => void;
}) {
  const session = usePartySession();
  const { sendControl, permissions, content } = session;
  const canChangeEpisode = permissions.canChangeContent;
  const [chromeVisible, setChromeVisible] = useState(true);
  const seededDefaultEpisodeRef = useRef(false);

  const { data: detail } = useQuery({
    queryKey: ['anime', animeId],
    queryFn: () => fetchAnimeDetail(animeId),
    enabled: Number.isFinite(animeId) && animeId > 0,
    staleTime: 60_000,
  });

  const { episode, isResolving, notFound } = useResolvedPartyEpisode(animeId, episodeOrdinal);
  const currentEpisodeId = episode?.id ?? 0;
  const animeEpisodeNav = useWatchEpisodeNavigation(animeId, currentEpisodeId);

  const changeEpisode = useCallback(
    (ep: { id: number; number?: number; ordinal?: number }) => {
      if (!canChangeEpisode) return;
      const full = animeEpisodeNav.episodeById.get(ep.id);
      const nextOrdinal = full
        ? episodeNumber(full)
        : ep.number ?? ep.ordinal;
      if (!nextOrdinal || nextOrdinal === episodeOrdinal) return;
      sendControl('content', {
        contentType: 'anime',
        animeId,
        season: season ?? content?.season,
        episode: nextOrdinal,
      });
    },
    [
      animeId,
      animeEpisodeNav.episodeById,
      canChangeEpisode,
      content?.season,
      episodeOrdinal,
      season,
      sendControl,
    ],
  );

  useEffect(() => {
    if (!canChangeEpisode || seededDefaultEpisodeRef.current) return;
    if (episodeOrdinal != null && episodeOrdinal > 0) return;
    if (!episode) return;
    seededDefaultEpisodeRef.current = true;
    sendControl('content', {
      contentType: 'anime',
      animeId,
      season: season ?? content?.season,
      episode: episodeNumber(episode),
    });
  }, [animeId, canChangeEpisode, content?.season, episode, episodeOrdinal, season, sendControl]);

  const videos = episode?.video ?? EMPTY_ANIME_VIDEOS;
  const dubbingOptionsList = useMemo(() => getUniqueDubbingOptions(videos), [videos]);
  const [selectedDubbing, setSelectedDubbing] = useState('');
  const [selectedQuality, setSelectedQuality] = useState<PlaybackQuality>('720p');

  useEffect(() => {
    if (!dubbingOptionsList.length) return;
    setSelectedDubbing((current) => {
      if (current && dubbingOptionsList.includes(current)) return current;
      return pickBestDubbingOption(videos) ?? dubbingOptionsList[0];
    });
  }, [dubbingOptionsList, videos]);

  const qualityOptionsList = useMemo(
    () => getQualityOptionsForDubbing(videos, selectedDubbing),
    [videos, selectedDubbing],
  );

  useEffect(() => {
    setSelectedQuality(pickDefaultQuality(qualityOptionsList));
  }, [qualityOptionsList]);

  const src = useMemo(() => {
    if (selectedDubbing) return pickPlaybackUrl(videos, selectedDubbing, selectedQuality);
    return videos[0] ? pickPlaybackUrl(videos, videos[0].dubbing ?? '', selectedQuality) : undefined;
  }, [videos, selectedDubbing, selectedQuality]);

  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  const playingRef = useRef(false);
  const host = useMemo<PartyPlaybackHost>(
    () => ({
      getCurrentTime: () => currentTimeRef.current,
      isPlaying: () => playingRef.current,
      getDuration: () => durationRef.current,
    }),
    [],
  );
  const party = usePartyPlaybackSync(host);
  const [startTime, setStartTime] = useState<number | undefined>();

  useEffect(() => {
    setStartTime(undefined);
    currentTimeRef.current = 0;
    playingRef.current = false;
  }, [src]);

  useEffect(() => {
    if (startTime != null) return;
    if (session.state) {
      // Always seed join position from room clock (incl. paused-at-zero).
      const t = Math.max(0, computeEffectivePlaybackTime(session.state));
      setStartTime(t);
      currentTimeRef.current = t;
      return;
    }
    // Room is up but has no playback snapshot yet — join at 0 (still paused).
    if (!session.isLoadingRoom && session.room) {
      setStartTime(0);
    }
  }, [session.state, session.isLoadingRoom, session.room, startTime]);

  const dubbingOptions =
    dubbingOptionsList.length > 1
      ? dubbingOptionsList.map((label) => ({
          id: label,
          label,
          selected: label === selectedDubbing,
          onSelect: () => setSelectedDubbing(label),
        }))
      : undefined;

  const qualityOptions =
    qualityOptionsList.length > 1
      ? qualityOptionsList.map((q) => ({
          id: q,
          label: q,
          selected: q === selectedQuality,
          onSelect: () => setSelectedQuality(q),
        }))
      : undefined;

  const episodeNav: PlayerEpisodeNav | undefined =
    canChangeEpisode && animeEpisodeNav.items.length > 1
      ? {
          items: animeEpisodeNav.items,
          currentEpisodeId,
          hasPrevious: animeEpisodeNav.hasPrevious,
          hasNext: animeEpisodeNav.hasNext,
          onPrevious: animeEpisodeNav.previous
            ? () => changeEpisode(animeEpisodeNav.previous!)
            : undefined,
          onNext: animeEpisodeNav.next ? () => changeEpisode(animeEpisodeNav.next!) : undefined,
          onSelect: (id: number) => {
            const item = animeEpisodeNav.items.find((ep) => ep.id === id);
            if (item) changeEpisode(item);
          },
        }
      : undefined;

  if (isResolving || !detail || startTime == null) {
    return (
      <View style={styles.center}>
        {isTvUi() ? <TvPlayerFocusSink /> : null}
        <ActivityIndicator color="#fff" />
        <Text style={styles.muted}>Синхронизация позиции…</Text>
      </View>
    );
  }

  if (notFound || !src) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>{detail.title}</Text>
        <Text style={styles.muted}>
          {notFound
            ? 'Не удалось найти этот эпизод'
            : 'Для этого эпизода пока нет доступных озвучек'}
        </Text>
      </View>
    );
  }

  const resolvedOrdinal = episode ? episodeNumber(episode) : episodeOrdinal;

  return (
    <View style={styles.root}>
      <VideoPlayer
        src={src}
        title={detail.title}
        subtitle={resolvedOrdinal ? `Эпизод ${resolvedOrdinal}` : undefined}
        startTime={startTime}
        onBack={onBack}
        dubbingOptions={dubbingOptions}
        qualityOptions={qualityOptions}
        episodeNav={episodeNav}
        onAutoPlayNext={
          canChangeEpisode && animeEpisodeNav.next
            ? () => changeEpisode(animeEpisodeNav.next!)
            : undefined
        }
        onProgress={(current, duration) => {
          currentTimeRef.current = current;
          if (duration > 0) durationRef.current = duration;
        }}
        onPlayingChange={(playing) => {
          playingRef.current = playing;
        }}
        partyControlled
        canControl={party.canControl}
        canPlayPause={party.canPlayPause}
        canSeek={party.canSeek}
        onPartyPlay={party.onPartyPlay}
        onPartyPause={party.onPartyPause}
        onPartySeek={party.onPartySeek}
        partyRemoteCommand={party.remoteCommand}
        onControlsVisibleChange={(visible) => {
          setChromeVisible(visible);
          onControlsVisibleChange?.(visible);
        }}
      />
      {isTvUi() ? null : (
        <PartySyncBadge
          connected={session.connected}
          canControl={party.canControl}
          lastResyncAt={party.lastResyncAt}
          visible={chromeVisible}
        />
      )}
      <PartyReactionsOverlay reactions={session.reactions} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  title: { color: '#fff', fontWeight: '700', fontSize: 16, textAlign: 'center' },
  muted: { color: 'rgba(255,255,255,0.65)', fontSize: 13, textAlign: 'center' },
});
