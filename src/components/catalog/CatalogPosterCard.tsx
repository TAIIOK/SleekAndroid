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
export function CatalogPosterCard({
  title,
  poster,
  subtitle,
  rating,
  score,
  onPress,
  variant = 'rail',
  width,
  railStart,
  contentEntry,
}: CatalogPosterCardProps) {
  return (
    <PosterCard
      title={title}
      poster={poster}
      subtitle={subtitle}
      score={rating ?? score}
      onPress={onPress}
      width={width ?? (variant === 'grid' ? undefined : layout.posterWidthRail)}
      variant={variant}
      railStart={railStart}
      contentEntry={contentEntry}
    />
  );
}
