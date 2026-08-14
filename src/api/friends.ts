import { request, requestData } from '@/api/client';
import type { FriendsResponse, UserSearchResult } from '@/types/friends';

export async function fetchFriendships(): Promise<FriendsResponse['data']> {
  try {
    return await requestData<FriendsResponse['data']>('/api/user/friends');
  } catch {
    return [];
  }
}

export async function fetchUserFriends(userId: string): Promise<FriendsResponse['data']> {
  try {
    return await requestData<FriendsResponse['data']>(
      `/api/user/friends/${encodeURIComponent(userId)}`,
    );
  } catch {
    return [];
  }
}

export async function sendFriendInvite(friendId: string): Promise<void> {
  await request('/api/user/friends', {
    method: 'POST',
    body: JSON.stringify({ friendId }),
  });
}

export async function acceptFriendInvite(friendId: string): Promise<void> {
  await request(`/api/user/friends/${encodeURIComponent(friendId)}`, {
    method: 'PUT',
  });
}

export async function rejectFriendInvite(friendId: string): Promise<void> {
  await request(`/api/user/friends/${encodeURIComponent(friendId)}`, {
    method: 'PATCH',
  });
}

export async function removeFriend(friendId: string): Promise<void> {
  await request(`/api/user/friends/${encodeURIComponent(friendId)}`, {
    method: 'DELETE',
  });
}

export async function searchUsers(nickname: string): Promise<UserSearchResult[]> {
  const q = nickname.trim();
  if (!q) return [];
  const data = await requestData<UserSearchResult[]>(
    `/api/user/search?nickname=${encodeURIComponent(q)}`,
  );
  if (!Array.isArray(data)) return [];
  return data.filter(
    (user): user is UserSearchResult => typeof user?.id === 'string' && user.id.length > 0,
  );
}

export async function fetchFriends(): Promise<FriendsResponse['data']> {
  return fetchFriendships();
}
