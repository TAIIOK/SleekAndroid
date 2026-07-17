import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  fetchAnimeCategories,
  fetchAnimeList,
  fetchAnimeRecommendationFeed,
  type CatalogShowcase,
} from '@/api/catalog';
import { PosterRail, type RailItem } from '@/components/catalog/PosterRail';
import {
  dedupeAnimeRailsByPath,
  isHomeExcludedAnimeRecommendationSection,
  resolveAnimeCustomSections,
  resolveEnabledRecommendationShowcaseIds,
  resolveRecommendationFeedSectionIds,
  resolveRegularAnimeShowcaseIds,
} from '@/lib/homeSettings';
import type { ContinueWatchingDedupeKeys } from '@/lib/continueWatchingDedupe';
import { mapAnimeToRailItem } from '@/lib/poster';
import type { CatalogHomeConfig } from '@/types/homeConfig';

function AnimeShowcaseRail({
  showcase,
  onItemPress,
}: {
  showcase: CatalogShowcase;
  onItemPress: (item: RailItem) => void;
}) {
  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ['anime-list', showcase.path],
    queryFn: () => fetchAnimeList(showcase.path, 1, 24),
  });

  return (
    <PosterRail
      title={showcase.name}
      items={data.map(mapAnimeToRailItem)}
      loading={isLoading}
      onItemPress={onItemPress}
      errorMessage={isError ? (error as Error).message : undefined}
    />
  );
}

function AnimeRecommendationRails({
  enabledShowcaseIds,
  showcases,
  onItemPress,
  forHome = false,
  continueWatchingDedupe,
}: {
  enabledShowcaseIds: string[];
  showcases: CatalogShowcase[];
  onItemPress: (item: RailItem) => void;
  forHome?: boolean;
  continueWatchingDedupe?: ContinueWatchingDedupeKeys;
}) {
  const feedSectionIds = useMemo(
    () => resolveRecommendationFeedSectionIds(enabledShowcaseIds),
    [enabledShowcaseIds],
  );

  const titleByShowcaseId = useMemo(
    () => new Map(showcases.map((showcase) => [showcase.id, showcase.name])),
    [showcases],
  );

  const { data: feedSections = [], isLoading } = useQuery({
    queryKey: ['anime-recommendations-feed', feedSectionIds.join(',')],
    queryFn: () => fetchAnimeRecommendationFeed(24),
    enabled: feedSectionIds.length > 0,
  });

  const visibleSections = useMemo(() => {
    const allowed = new Set(feedSectionIds);
    const seen = new Set<string>();
    const excludeAnimeIds = continueWatchingDedupe?.animeIds;
    return feedSections
      .filter((section) => allowed.has(section.id) && section.items.length > 0)
      .filter((section) => !forHome || !isHomeExcludedAnimeRecommendationSection(section.id))
      .filter((section) => {
        if (seen.has(section.id)) return false;
        seen.add(section.id);
        return true;
      })
      .map((section) => {
        const items =
          forHome && excludeAnimeIds?.size
            ? section.items.filter((item) => !excludeAnimeIds.has(item.id))
            : section.items;
        return {
          ...section,
          title: titleByShowcaseId.get(section.id) ?? section.title,
          items,
        };
      })
      .filter((section) => section.items.length > 0);
  }, [feedSections, feedSectionIds, titleByShowcaseId, forHome, continueWatchingDedupe]);

  if (!feedSectionIds.length) return null;

  return (
    <>
      {visibleSections.map((section) => (
        <PosterRail
          key={section.id}
          title={section.title}
          items={section.items.map(mapAnimeToRailItem)}
          loading={isLoading}
          onItemPress={onItemPress}
        />
      ))}
    </>
  );
}

interface AnimeCatalogRailsProps {
  config: CatalogHomeConfig;
  forHome?: boolean;
  continueWatchingDedupe?: ContinueWatchingDedupeKeys;
}

export function AnimeCatalogRails({
  config,
  forHome = false,
  continueWatchingDedupe,
}: AnimeCatalogRailsProps) {
  const router = useRouter();
  const { data: animeCat, isLoading } = useQuery({
    queryKey: ['anime-categories'],
    queryFn: fetchAnimeCategories,
  });

  const allShowcaseIds = useMemo(
    () => (animeCat?.showcases ?? []).map((showcase) => showcase.id),
    [animeCat],
  );

  const regularShowcaseIds = useMemo(
    () => resolveRegularAnimeShowcaseIds(config, allShowcaseIds),
    [config, allShowcaseIds],
  );

  const recommendationShowcaseIds = useMemo(
    () => resolveEnabledRecommendationShowcaseIds(config, allShowcaseIds, { forHome }),
    [config, allShowcaseIds, forHome],
  );

  const regularShowcases = useMemo(
    () => (animeCat?.showcases ?? []).filter((showcase) => regularShowcaseIds.includes(showcase.id)),
    [animeCat, regularShowcaseIds],
  );

  const customSections = useMemo(() => {
    const customSectionsRaw = resolveAnimeCustomSections(config);
    return dedupeAnimeRailsByPath(regularShowcases, customSectionsRaw).secondary;
  }, [regularShowcases, config]);

  const openAnime = (item: RailItem) => {
    router.push(`/anime/${item.id}`);
  };

  if (isLoading && !regularShowcases.length && !recommendationShowcaseIds.length) {
    return <PosterRail title="Аниме" items={[]} loading onItemPress={() => {}} />;
  }

  if (!regularShowcases.length && !customSections.length && !recommendationShowcaseIds.length) {
    return null;
  }

  return (
    <>
      <AnimeRecommendationRails
        enabledShowcaseIds={recommendationShowcaseIds}
        showcases={animeCat?.showcases ?? []}
        onItemPress={openAnime}
        forHome={forHome}
        continueWatchingDedupe={continueWatchingDedupe}
      />
      {regularShowcases.map((showcase) => (
        <AnimeShowcaseRail key={showcase.id} showcase={showcase} onItemPress={openAnime} />
      ))}
      {customSections.map((section) => (
        <AnimeShowcaseRail
          key={section.id}
          showcase={{ id: section.id, name: section.title, path: section.path }}
          onItemPress={openAnime}
        />
      ))}
    </>
  );
}
