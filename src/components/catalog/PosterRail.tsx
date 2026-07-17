import { CatalogPosterCard } from '@/components/catalog/CatalogPosterCard';
import { PaginatedContentRow } from '@/components/catalog/PaginatedContentRow';

export interface RailItem {
  id: string | number;
  title: string;
  poster?: string | null;
  subtitle?: string;
  score?: number | null;
}

interface PosterRailProps {
  title: string;
  subtitle?: string;
  items: RailItem[];
  onItemPress?: (item: RailItem) => void;
  onSeeAll?: () => void;
  loading?: boolean;
  skeletonCount?: number;
  errorMessage?: string;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  onLoadMore?: () => void;
}

export function PosterRail({
  title,
  subtitle,
  items,
  onItemPress,
  onSeeAll,
  loading,
  errorMessage,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
}: PosterRailProps) {
  return (
    <PaginatedContentRow
      title={title}
      subtitle={subtitle}
      items={items}
      getItemKey={(item) => item.id}
      isLoading={loading}
      isError={Boolean(errorMessage)}
      errorMessage={errorMessage}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={onLoadMore}
      onSeeAll={onSeeAll}
      renderItem={(item) => (
        <CatalogPosterCard
          title={item.title}
          poster={item.poster}
          subtitle={item.subtitle}
          rating={item.score}
          onPress={() => onItemPress?.(item)}
          variant="rail"
        />
      )}
    />
  );
}
