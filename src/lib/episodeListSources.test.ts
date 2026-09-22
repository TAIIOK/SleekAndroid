import { describe, expect, it } from 'vitest';

import { projectEpisodeForList } from '@/lib/episodeListSources';
import type { AnimeEpisode, AnimeVideo } from '@aniverse/types';

function episode(video: AnimeVideo[]): AnimeEpisode {
  return {
    id: 7,
    ordinal: 3,
    title: 'Start',
    video,
  };
}

describe('projectEpisodeForList', () => {
  it('drops video urls and keeps playable dubbing names', () => {
    const listed = projectEpisodeForList(
      episode([
        { dubbing: 'AniDUB', hls720: 'https://cdn.example/a.m3u8' },
        { dubbing: 'AniDUB', hls1080: 'https://cdn.example/b.m3u8' },
        { dubbing: 'Studio', url: 'https://cdn.example/c.mp4' },
      ]),
    );
    expect(listed.video).toBeUndefined();
    expect(listed.playable).toBe(true);
    expect(listed.dubbingNames).toEqual(['AniDUB', 'Studio']);
    expect(JSON.stringify(listed)).not.toContain('m3u8');
  });

  it('marks an episode without streams as not playable', () => {
    const listed = projectEpisodeForList(episode([{ dubbing: 'Empty' }]));
    expect(listed.playable).toBe(false);
    expect(listed.dubbingNames).toEqual(['Empty']);
  });
});
