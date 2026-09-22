import type { AnimeEpisode } from '@aniverse/types';
import { normalizeDubbingName } from '@aniverse/playback';

import { pickVideoUrl } from '@/lib/animeDetail';

export type ListedAnimeEpisode = AnimeEpisode & {
  playable: boolean;
  dubbingNames: string[];
};

function dubbingNamesFromVideos(videos: AnimeEpisode['video']): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const video of videos ?? []) {
    const label = normalizeDubbingName(video);
    if (seen.has(label)) continue;
    seen.add(label);
    names.push(label);
  }
  return names;
}

/** Drop stream URLs from list state. Names and playable stay for the window. */
export function projectEpisodeForList(episode: AnimeEpisode): ListedAnimeEpisode {
  const videos = episode.video ?? [];
  const playable = videos.some((video) => !!pickVideoUrl(video));
  const dubbingNames = dubbingNamesFromVideos(videos);
  const { video: _video, ...rest } = episode;
  return { ...rest, playable, dubbingNames };
}
