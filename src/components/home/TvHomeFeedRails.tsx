import { LazyCatalogRail } from '@/components/catalog/LazyCatalogRail';
import { PosterRail } from '@/components/catalog/PosterRail';
import { useTvHomeFeedSource } from '@/hooks/useTvHomeFeedSource';
import type { TvHomeFeedSource } from '@/lib/tvHomeFeeds';

function TvHomeSourceRail({ source }: { source: TvHomeFeedSource }) {
  const {
    items,
    isLoading,
    isError,
    errorMessage,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    openItem,
  } = useTvHomeFeedSource(source);

  if (!isLoading && (isError || items.length === 0)) {
    return null;
  }

  return (
    <PosterRail
      title={source.title}
      items={items}
      loading={isLoading}
      onItemPress={openItem}
      errorMessage={isError ? errorMessage : undefined}
      hasNextPage={hasNextPage}
      isFetchingNextPage={isFetchingNextPage}
      onLoadMore={fetchNextPage}
    />
  );
}

interface TvHomeFeedRailsProps {
  sources: TvHomeFeedSource[];
}

export function TvHomeFeedRails({ sources }: TvHomeFeedRailsProps) {
  return (
    <>
      {sources.map((source, index) => (
        <LazyCatalogRail key={source.key} eager={index < 2}>
          <TvHomeSourceRail source={source} />
        </LazyCatalogRail>
      ))}
    </>
  );
}
