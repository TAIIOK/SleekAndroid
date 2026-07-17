import type { AnimeVideo } from '@aniverse/types';
import {
  PLAYBACK_QUALITIES,
  normalizeDubbingName,
  pickPlaybackUrl,
  pickVideoUrlForQuality,
  type PlaybackQuality,
} from '@aniverse/playback';

export type { PlaybackQuality };
export { PLAYBACK_QUALITIES, normalizeDubbingName, pickPlaybackUrl, pickVideoUrlForQuality };

function dubbingEquals(a: string, b: string): boolean {
  return a.localeCompare(b, 'ru', { sensitivity: 'accent' }) === 0;
}

export function getUniqueDubbingOptions(videos: AnimeVideo[]): string[] {
  const unique = new Set<string>();
  for (const video of videos) {
    unique.add(normalizeDubbingName(video));
  }
  return Array.from(unique).sort((a, b) => a.localeCompare(b, 'ru', { sensitivity: 'accent' }));
}

export function hasQualityUrl(video: AnimeVideo, quality: PlaybackQuality): boolean {
  return Boolean(pickVideoUrlForQuality(video, quality));
}

export function getQualityOptionsForDubbing(
  videos: AnimeVideo[],
  dubbing: string,
): PlaybackQuality[] {
  if (!dubbing) return [];
  const matched = videos.filter((video) => dubbingEquals(normalizeDubbingName(video), dubbing));
  return PLAYBACK_QUALITIES.filter((quality) =>
    matched.some((video) => hasQualityUrl(video, quality)),
  );
}

export function pickDefaultQuality(options: PlaybackQuality[]): PlaybackQuality {
  if (options.includes('720p')) return '720p';
  if (options.includes('1080p')) return '1080p';
  return options[0] ?? '720p';
}

export function pickBestDubbingOption(videos: AnimeVideo[]): string | undefined {
  const options = getUniqueDubbingOptions(videos);
  if (!options.length) return undefined;

  return options.reduce((best, current) => {
    const bestCount = getQualityOptionsForDubbing(videos, best).length;
    const currentCount = getQualityOptionsForDubbing(videos, current).length;
    if (currentCount !== bestCount) return currentCount > bestCount ? current : best;
    return current.localeCompare(best, 'ru', { sensitivity: 'accent' }) < 0 ? current : best;
  });
}
