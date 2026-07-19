export type TvPlayerOverlay =
  | 'dubbing'
  | 'quality'
  | 'connection'
  | 'delivery'
  | 'episodes'
  | 'settings'
  | null;

export type TvPlayerPanelFocus = 'timeline' | TvPlayerButtonId;

export type TvPlayerButtonId =
  | 'prev_episode'
  | 'rprev'
  | 'play'
  | 'rnext'
  | 'next_episode'
  | 'dubbing'
  | 'quality'
  | 'connection'
  | 'delivery'
  | 'episodes'
  | 'fit'
  | 'settings';

export const TV_PLAYER_TRANSPORT_ORDER: TvPlayerButtonId[] = [
  'prev_episode',
  'rprev',
  'play',
  'rnext',
  'next_episode',
];

export const TV_PLAYER_OPTIONS_ORDER: TvPlayerButtonId[] = [
  'dubbing',
  'quality',
  'connection',
  'delivery',
  'episodes',
  'fit',
  'settings',
];

export const TV_PANEL_HIDE_MS = 3000;
export const TV_PLAYER_HINT_HIDE_MS = 2500;
