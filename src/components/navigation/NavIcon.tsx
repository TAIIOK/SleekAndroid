import { Ionicons } from '@expo/vector-icons';

import { colors } from '@/constants/aniverse';

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  '/': 'home-outline',
  '/anime': 'play-circle-outline',
  '/movies': 'film-outline',
  '/series': 'tv-outline',
  '/schedule': 'calendar-outline',
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
  '/schedule': 'calendar',
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

export function NavIcon({ path, size = 22, color, focused }: NavIconProps) {
  const name = focused
    ? (ICON_MAP_ACTIVE[path] ?? ICON_MAP[path] ?? 'ellipse')
    : (ICON_MAP[path] ?? 'ellipse-outline');
  const resolvedColor = color ?? (focused ? colors.brand : colors.textSecondary);
  return <Ionicons name={name} size={size} color={resolvedColor} />;
}
