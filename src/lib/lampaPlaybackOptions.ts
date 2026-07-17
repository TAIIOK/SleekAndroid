import {
  formatWatchHubQualityLabel,
  type WatchHubVideoLink,
} from '@/services/watchHub';

export type LampaConnectionMode = 'direct' | 'proxy';
export type LampaDeliveryMode = 'stream' | 'file';

function uniqPlaybackUrls(urls: (string | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const s = u?.trim();
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

export function listUrlsForPlaybackMode(
  link: WatchHubVideoLink,
  connection: LampaConnectionMode,
  delivery: LampaDeliveryMode,
): string[] {
  if (connection === 'direct') {
    if (delivery === 'stream') return uniqPlaybackUrls(link.stream ?? []);
    return uniqPlaybackUrls([...(link.file ?? []), ...(link.urls ?? [])]);
  }
  if (delivery === 'stream') return uniqPlaybackUrls(link.proxy?.stream ?? []);
  return uniqPlaybackUrls(link.proxy?.file ?? []);
}

export function pickPlaybackUrlFromLink(
  link: WatchHubVideoLink,
  connection: LampaConnectionMode,
  delivery: LampaDeliveryMode,
): string | undefined {
  return listUrlsForPlaybackMode(link, connection, delivery)[0];
}

function watchHubQualityRank(label: string): number {
  const digits = label.match(/(\d{3,4})/)?.[1];
  return digits ? Number(digits) : 0;
}

export function linkHasAnyPlaybackUrl(link: WatchHubVideoLink): boolean {
  return (
    pickPlaybackUrlFromLink(link, 'direct', 'stream') != null ||
    pickPlaybackUrlFromLink(link, 'direct', 'file') != null ||
    pickPlaybackUrlFromLink(link, 'proxy', 'stream') != null ||
    pickPlaybackUrlFromLink(link, 'proxy', 'file') != null
  );
}

export function listLampaQualityLabels(links: WatchHubVideoLink[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const link of links) {
    const quality = formatWatchHubQualityLabel(link.quality);
    if (seen.has(quality)) continue;
    if (!linkHasAnyPlaybackUrl(link)) continue;
    seen.add(quality);
    out.push(quality);
  }
  return out.sort((a, b) => watchHubQualityRank(b) - watchHubQualityRank(a));
}

export function findLinkByQuality(
  links: WatchHubVideoLink[],
  quality: string,
): WatchHubVideoLink | undefined {
  return links.find((link) => formatWatchHubQualityLabel(link.quality) === quality);
}

export function resolveLampaPlaybackUrl(
  links: WatchHubVideoLink[],
  quality: string,
  connection: LampaConnectionMode,
  delivery: LampaDeliveryMode,
): string | undefined {
  const link = findLinkByQuality(links, quality) ?? links.find(linkHasAnyPlaybackUrl);
  if (!link) return undefined;
  return pickPlaybackUrlFromLink(link, connection, delivery);
}

export function pickDefaultLampaQuality(qualities: string[]): string {
  return qualities[0] ?? 'Авто';
}

export function linkSupportsConnection(
  link: WatchHubVideoLink,
  mode: LampaConnectionMode,
): boolean {
  return (
    listUrlsForPlaybackMode(link, mode, 'stream').length > 0 ||
    listUrlsForPlaybackMode(link, mode, 'file').length > 0
  );
}

export function linkSupportsDelivery(
  link: WatchHubVideoLink,
  connection: LampaConnectionMode,
  mode: LampaDeliveryMode,
): boolean {
  return listUrlsForPlaybackMode(link, connection, mode).length > 0;
}

export function pickDefaultPlaybackModes(link: WatchHubVideoLink): {
  connection: LampaConnectionMode;
  delivery: LampaDeliveryMode;
} {
  const connection: LampaConnectionMode = linkSupportsConnection(link, 'direct')
    ? 'direct'
    : 'proxy';
  const delivery: LampaDeliveryMode = linkSupportsDelivery(link, connection, 'stream')
    ? 'stream'
    : 'file';
  return { connection, delivery };
}

export function normalizePlaybackModes(
  link: WatchHubVideoLink,
  connection: LampaConnectionMode,
  delivery: LampaDeliveryMode,
): { connection: LampaConnectionMode; delivery: LampaDeliveryMode } {
  let nextConnection = connection;
  let nextDelivery = delivery;

  if (!linkSupportsConnection(link, nextConnection)) {
    nextConnection = linkSupportsConnection(link, 'direct') ? 'direct' : 'proxy';
  }
  if (!linkSupportsDelivery(link, nextConnection, nextDelivery)) {
    nextDelivery = linkSupportsDelivery(link, nextConnection, 'stream') ? 'stream' : 'file';
  }

  return { connection: nextConnection, delivery: nextDelivery };
}

export function lampaConnectionLabel(mode: LampaConnectionMode): string {
  return mode === 'direct' ? 'Напрямую' : 'Прокси';
}

export function lampaDeliveryLabel(mode: LampaDeliveryMode): string {
  return mode === 'stream' ? 'Стрим' : 'Файл';
}
