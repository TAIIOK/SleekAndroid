import { CatalogPosterCard } from '@/components/catalog/CatalogPosterCard';
import { PaginatedContentRow } from '@/components/catalog/PaginatedContentRow';
import { useTvRailFocusRestore } from '@/hooks/useTvRailFocusRestore';

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
  /** Override default rail poster width (e.g. denser detail rails on phone). */
  itemWidth?: number;
  /** Nested in a padded parent — no extra horizontal gutter. */
  flush?: boolean;
  /** First card is the screen content-entry (preferred focus after sidebar nav). */
  contentEntry?: boolean;
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
  itemWidth,
  flush = false,
  contentEntry = false,
}: PosterRailProps) {
  const { bindItem } = useTvRailFocusRestore(items.length);

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
      flush={flush}
      renderItem={(item, index) => {
        const railFocus = bindItem(index);
        return (
          <CatalogPosterCard
            ref={railFocus.ref}
            title={item.title}
            poster={item.poster}
            subtitle={item.subtitle}
            rating={item.score}
            onPress={() => onItemPress?.(item)}
            onFocus={() => {
              railFocus.onFocus?.();
              if (
                hasNextPage &&
                !isFetchingNextPage &&
                onLoadMore &&
                index >= items.length - 3
              ) {
                onLoadMore();
              }
            }}
            onBlur={railFocus.onBlur}
            variant="rail"
            width={itemWidth}
            railStart={index === 0}
            contentEntry={contentEntry && index === 0}
          />
        );
      }}
    />
  );
}
