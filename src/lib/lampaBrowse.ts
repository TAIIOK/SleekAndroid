import {
  resolveLampaSectionEndpoints,
  shouldExcludeCjkFromLampaSection,
  type CatalogHomeConfig,
} from '@aniverse/catalog';
import { orderLampaSectionsByEndpoints } from '@/lib/lampaSectionOrder';

type LampaSectionKey = {
  endpoint: string;
  fetch?: { urlPath?: string };
};

export function lampaItemsQueryKey(
  kind: string,
  section: LampaSectionKey,
  pageSize: number,
  excludeCjk: boolean,
) {
  return [
    'lampa-items',
    kind,
    section.endpoint,
    section.fetch?.urlPath,
    pageSize,
    excludeCjk,
  ] as const;
}

export function firstVisibleLampaSection<T extends { endpoint: string }>(
  sections: T[],
  kind: 'movie' | 'tv',
  config: CatalogHomeConfig,
): T | undefined {
  if (!sections.length) return undefined;
  const endpoints = resolveLampaSectionEndpoints(
    config,
    kind,
    sections.map((section) => section.endpoint),
  );
  return orderLampaSectionsByEndpoints(sections, endpoints)[0];
}

export function firstLampaSectionExcludeCjk(
  section: { endpoint: string } | undefined,
  hideAsian: boolean,
): boolean {
  if (!section) return false;
  return shouldExcludeCjkFromLampaSection(section.endpoint, hideAsian);
}
