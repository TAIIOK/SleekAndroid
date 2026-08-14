import { LazyCatalogRail } from '@/components/catalog/LazyCatalogRail';
import { PosterRail } from '@/components/catalog/PosterRail';
import { useTvHomeFeedSource } from '@/hooks/useTvHomeFeedSource';
import type { CatalogHomeConfig } from '@/lib/homeSettings';
import { TV_CATALOG_EAGER_RAILS } from '@/lib/catalogRailPage';
import type { TvHomeFeedSource } from '@/lib/tvHomeFeeds';

function TvHomeSourceRail({
  source,
  config,
  restorePath,
  homeFocusPriority,
}: {
  source: TvHomeFeedSource;
  config: CatalogHomeConfig;
  restorePath?: string;
  homeFocusPriority: number;
}) {
  const {
    items,
    isLoading,
    isError,
    errorMessage,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    openItem,
  } = useTvHomeFeedSource(source, config);

  if (!isLoading && !isError && items.length === 0) return null;

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
      restorePath={restorePath}
      restoreRailKey={source.key}
      railFocusPriority={homeFocusPriority}
    />
  );
}

interface TvHomeFeedRailsProps {
  sources: TvHomeFeedSource[];
  config: CatalogHomeConfig;
  restorePath?: string;
}

export function TvHomeFeedRails({ sources, config, restorePath }: TvHomeFeedRailsProps) {
  return (
    <>
      {sources.map((source, index) => (
        <LazyCatalogRail key={source.key} eager={index < TV_CATALOG_EAGER_RAILS}>
          <TvHomeSourceRail
            source={source}
            config={config}
            restorePath={restorePath}
            homeFocusPriority={index}
          />
        </LazyCatalogRail>
      ))}
    </>
  );
}
