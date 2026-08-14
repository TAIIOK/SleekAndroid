export type ProfileAvatarSource = string | { url?: string } | null | undefined;

export function resolveAvatarUrl(avatar: ProfileAvatarSource): string | undefined {
  if (!avatar) return undefined;
  if (typeof avatar === 'string') {
    const trimmed = avatar.trim();
    return trimmed || undefined;
  }
  if (typeof avatar === 'object' && typeof avatar.url === 'string') {
    const trimmed = avatar.url.trim();
    return trimmed || undefined;
  }
  return undefined;
}
