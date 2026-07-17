import { Platform } from 'react-native';

import { PhoneVideoPlayer } from '@/components/player/phone/PhoneVideoPlayer';
import { TvVideoPlayer } from '@/components/player/tv/TvVideoPlayer';
import type { VideoPlayerProps } from '@/components/player/types';

export type {
  PlayerEpisodeNav,
  PlayerEpisodeNavItem,
  PlayerMenuOption,
  VideoPlayerProps,
} from '@/components/player/types';

export function VideoPlayer(props: VideoPlayerProps) {
  if (Platform.isTV) {
    return <TvVideoPlayer {...props} />;
  }
  return <PhoneVideoPlayer {...props} />;
}
