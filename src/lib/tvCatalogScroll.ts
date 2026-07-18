import { Platform } from 'react-native';

import { spacing } from '@/constants/aniverse';

/**
 * Vertical catalog ScrollView props for Android TV.
 * With `snapToAlignment="item"`, focus scrolls to the nearest ancestor that sets
 * `scrollSnapAlign` (rail section = header + posters) instead of only the card.
 */
export const tvVerticalCatalogScrollProps = Platform.isTV
  ? ({
      snapToAlignment: 'item' as const,
      snapToItemPadding: spacing.md,
      scrollAnimationEnabled: true,
    } as const)
  : ({} as const);

/** Put on rail/continue section wrappers so the title stays visible when a card is focused. */
export const tvRailSectionSnapProps = Platform.isTV
  ? ({
      scrollSnapAlign: 'start' as const,
      collapsable: false,
    } as const)
  : ({} as const);
