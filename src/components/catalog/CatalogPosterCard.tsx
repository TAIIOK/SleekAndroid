import { forwardRef } from 'react';
import { View } from 'react-native';

import { layout } from '@/constants/aniverse';
import { PosterCard, type PosterCardProps } from '@/components/catalog/PosterCard';

export type CatalogPosterVariant = 'rail' | 'grid';

export interface CatalogPosterCardProps extends Omit<PosterCardProps, 'width' | 'score'> {
  variant?: CatalogPosterVariant;
  rating?: number | null;
  score?: number | null;
  width?: number;
}

/** Site-compatible poster card wrapper (CatalogPosterCard parity). */
export const CatalogPosterCard = forwardRef<View, CatalogPosterCardProps>(
  function CatalogPosterCard(
    {
      title,
      poster,
      animeId,
      subtitle,
      rating,
      score,
      onPress,
      onFocus,
      onBlur,
      variant = 'rail',
      width,
      railStart,
      contentEntry,
      pinVerticalFocus,
      nextFocusUp,
      nextFocusDown,
    },
    ref,
  ) {
    return (
      <PosterCard
        ref={ref}
        title={title}
        poster={poster}
        animeId={animeId}
        subtitle={subtitle}
        score={rating ?? score}
        onPress={onPress}
        onFocus={onFocus}
        onBlur={onBlur}
        width={width ?? (variant === 'grid' ? undefined : layout.posterWidthRail)}
        variant={variant}
        railStart={railStart}
        contentEntry={contentEntry}
        pinVerticalFocus={pinVerticalFocus}
        nextFocusUp={nextFocusUp}
        nextFocusDown={nextFocusDown}
      />
    );
  },
);
