import { request, requestData, unwrapData } from './client';
import type {
  CollectionItemInput,
  UserCollection,
  UserCollectionDetail,
  UserCollectionItem,
} from '@/types/collection';

export function normalizeCollection(raw: unknown): UserCollection | null {
  if (!raw || typeof raw !== 'object' || !('id' in raw)) return null;
  const id = (raw as UserCollection).id;
  if (typeof id !== 'number' || !Number.isFinite(id)) return null;
  return raw as UserCollection;
}

export function normalizeCollectionDetail(raw: unknown): UserCollectionDetail {
  const payload = unwrapData<UserCollectionDetail | UserCollection>(raw);
  if (payload && typeof payload === 'object' && 'collection' in payload) {
    const detail = payload as UserCollectionDetail;
    return {
      collection: normalizeCollection(detail.collection) ?? (detail.collection as UserCollection),
      items: Array.isArray(detail.items) ? detail.items : [],
    };
  }
  const collection = normalizeCollection(payload);
  if (collection) {
    return { collection, items: [] };
  }
  throw new Error('Некорректный ответ сервера для коллекции');
}

export async function fetchCollections(): Promise<UserCollection[]> {
  try {
    const json = await request<unknown>('/api/v2/collections');
    const data = unwrapData(json);
    if (!Array.isArray(data)) return [];
    return data
      .map(normalizeCollection)
      .filter((col): col is UserCollection => col != null);
  } catch {
    return [];
  }
}

export async function fetchCollection(id: number): Promise<UserCollectionDetail> {
  const json = await request<unknown>(`/api/v2/collections/${id}`);
  return normalizeCollectionDetail(json);
}

export async function createCollection(name: string, description?: string): Promise<UserCollection> {
  const json = await request<unknown>('/api/v2/collections', {
    method: 'POST',
    body: JSON.stringify({ name, description: description?.trim() || undefined }),
  });
  const collection = normalizeCollection(unwrapData(json));
  if (!collection) {
    throw new Error('Сервер не вернул созданную коллекцию');
  }
  return collection;
}

export async function deleteCollection(id: number): Promise<void> {
  await request(`/api/v2/collections/${id}`, { method: 'DELETE' });
}

export async function removeCollectionItem(collectionId: number, itemId: number): Promise<void> {
  await request(`/api/v2/collections/${collectionId}/items/${itemId}`, { method: 'DELETE' });
}

export async function addCollectionItem(
  collectionId: number,
  item: CollectionItemInput,
): Promise<UserCollectionItem> {
  return requestData<UserCollectionItem>(`/api/v2/collections/${collectionId}/items`, {
    method: 'POST',
    body: JSON.stringify(item),
  });
}
