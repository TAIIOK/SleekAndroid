export type CollectionMediaType = 'anime' | 'lampa' | 'manga';

export interface UserCollection {
  id: number;
  userId?: string;
  name: string;
  description?: string | null;
  createdAt?: string;
  updatedAt?: string;
  itemCount?: number;
}

export interface UserCollectionItem {
  id: number;
  collectionId: number;
  mediaType: CollectionMediaType;
  mediaId: string;
  title?: string | null;
  poster?: string | null;
  addedAt?: string;
}

export interface UserCollectionDetail {
  collection: UserCollection;
  items: UserCollectionItem[];
}

export interface CollectionItemInput {
  mediaType: CollectionMediaType;
  mediaId: string;
  title?: string;
  poster?: string;
}
