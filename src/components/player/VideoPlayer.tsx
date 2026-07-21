import { PhoneVideoPlayer } from '@/components/player/phone/PhoneVideoPlayer';
import { TvVideoPlayer } from '@/components/player/tv/TvVideoPlayer';
import type { VideoPlayerProps } from '@/components/player/types';
import { isTvUi } from '@/lib/isTvUi';

export type {
  PlayerEpisodeNav,
  PlayerEpisodeNavItem,
  PlayerMenuOption,
  VideoPlayerProps,
} from '@/components/player/types';

export function VideoPlayer(props: VideoPlayerProps) {
  if (isTvUi()) {
    return <TvVideoPlayer {...props} />;
  }
  return <PhoneVideoPlayer {...props} />;
}
