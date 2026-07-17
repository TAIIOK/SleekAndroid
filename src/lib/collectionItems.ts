import { lampaDetailPath } from '@/lib/lampaDetail';
import { resolvePosterUrl } from '@/lib/config';
import type { CollectionMediaType, UserCollectionItem } from '@/types/collection';

export function collectionItemPath(item: UserCollectionItem): string {
  const { mediaType, mediaId } = item;
  switch (mediaType as CollectionMediaType) {
    case 'anime':
      return `/anime/${mediaId}`;
    case 'manga':
      return `/manga/${mediaId}`;
    case 'lampa': {
      const [kind, id] = mediaId.includes(':') ? mediaId.split(':', 2) : ['movie', mediaId];
      return lampaDetailPath(kind, { id, objectId: id });
    }
    default:
      return '/';
  }
}

export function collectionItemPoster(
  mediaType: CollectionMediaType,
  poster?: string | null,
): string | undefined {
  if (!poster) return undefined;
  return resolvePosterUrl(poster);
}

export function formatCollectionItemCount(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} тайтл`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${count} тайтла`;
  return `${count} тайтлов`;
}
