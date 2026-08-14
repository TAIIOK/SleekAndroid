import { ApiError, request } from '@/api/client';

const AVATAR_UPLOAD_PATH = '/api/uploads/avatar';

export type AvatarLocalFile = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

function resolveFilename(file: AvatarLocalFile): string {
  const name = file.fileName?.trim();
  if (name) return name;
  const mime = file.mimeType ?? '';
  if (mime.includes('png')) return 'image.png';
  if (mime.includes('webp')) return 'image.webp';
  return 'image.jpg';
}

function parseUploadUrl(json: Record<string, unknown>): string {
  const url = typeof json.url === 'string' ? json.url.trim() : '';
  if (!url) throw new ApiError('Invalid upload response', 500);
  return url;
}

/** Multipart avatar upload from a local URI (expo-image-picker). */
export async function uploadAvatarViaApi(file: AvatarLocalFile): Promise<string> {
  const form = new FormData();
  form.append('file', {
    uri: file.uri,
    name: resolveFilename(file),
    type: file.mimeType || 'image/jpeg',
  } as unknown as Blob);

  const json = await request<Record<string, unknown>>(AVATAR_UPLOAD_PATH, {
    method: 'POST',
    body: form,
  });

  return parseUploadUrl(json);
}
