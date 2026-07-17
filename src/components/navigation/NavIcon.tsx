import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/constants/aniverse';

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  '/': 'home-outline',
  '/anime': 'play-circle-outline',
  '/movies': 'film-outline',
  '/series': 'tv-outline',
  '/search': 'search-outline',
  '/history': 'time-outline',
  '/profile': 'person-outline',
  '/library/lists': 'library-outline',
  '/downloads': 'download-outline',
  '/more': 'grid-outline',
};

const ICON_MAP_ACTIVE: Record<string, keyof typeof Ionicons.glyphMap> = {
  '/': 'home',
  '/anime': 'play-circle',
  '/movies': 'film',
  '/series': 'tv',
  '/search': 'search',
  '/history': 'time',
  '/profile': 'person',
  '/library/lists': 'library',
  '/downloads': 'download',
  '/more': 'grid',
};

interface NavIconProps {
  path: string;
  size?: number;
  color?: string;
  focused?: boolean;
}

export function NavIcon({ path, size = 22, color = colors.textSecondary, focused }: NavIconProps) {
  const name = focused
    ? (ICON_MAP_ACTIVE[path] ?? ICON_MAP[path] ?? 'ellipse')
    : (ICON_MAP[path] ?? 'ellipse-outline');
  return <Ionicons name={name} size={size} color={focused ? colors.brand : color} />;
}
