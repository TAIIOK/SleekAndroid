import type { FriendshipStatus, ProfileVisibilityLevel, ProfileVisibilityMap, PublicUserProfile } from "@/types/userProfile";

export type ProfileSectionKey =
  | "stats"
  | "library"
  | "collections"
  | "activity"
  | "watchingNow"
  | "friendsList"
  | "achievements"
  | "ratings"
  | "reviews";

const SECTION_MESSAGES: Record<ProfileSectionKey, { hidden: string; friendsOnly: string }> = {
  stats: {
    hidden: "Пользователь скрыл статистику",
    friendsOnly: "Статистика доступна только друзьям — отправьте заявку",
  },
  library: {
    hidden: "Пользователь скрыл списки",
    friendsOnly: "Списки доступны только друзьям — отправьте заявку",
  },
  collections: {
    hidden: "Пользователь скрыл коллекции",
    friendsOnly: "Коллекции доступны только друзьям — отправьте заявку",
  },
  activity: {
    hidden: "Пользователь скрыл активность",
    friendsOnly: "Активность доступна только друзьям — отправьте заявку",
  },
  watchingNow: {
    hidden: "Пользователь скрыл текущий просмотр",
    friendsOnly: "Текущий просмотр доступен только друзьям",
  },
  friendsList: {
    hidden: "Пользователь скрыл список друзей",
    friendsOnly: "Список друзей доступен только друзьям",
  },
  achievements: {
    hidden: "Пользователь скрыл достижения",
    friendsOnly: "Достижения доступны только друзьям",
  },
  ratings: {
    hidden: "Пользователь скрыл оценки",
    friendsOnly: "Оценки доступны только друзьям",
  },
  reviews: {
    hidden: "Пользователь скрыл рецензии",
    friendsOnly: "Рецензии доступны только друзьям",
  },
};

function resolveLevel(
  profile: PublicUserProfile,
  section: ProfileSectionKey,
): ProfileVisibilityLevel {
  const map = profile.profileVisibility;
  if (map) {
    return map[section] ?? "visible";
  }
  if (profile.friendshipStatus === "blocked") return "hidden";
  if (profile.friendshipStatus === "accepted") return "visible";
  return "friends_only";
}

export function canViewProfileSection(
  profile: PublicUserProfile,
  section: ProfileSectionKey,
): boolean {
  const level = resolveLevel(profile, section);
  if (level === "visible") return true;
  if (level === "hidden") return false;
  return profile.friendshipStatus === "accepted";
}

export function profileSectionMessage(
  profile: PublicUserProfile,
  section: ProfileSectionKey,
): string | undefined {
  if (canViewProfileSection(profile, section)) return undefined;
  const level = resolveLevel(profile, section);
  const messages = SECTION_MESSAGES[section];
  if (level === "hidden") return messages.hidden;
  return messages.friendsOnly;
}

export function isProfileBlocked(profile: PublicUserProfile): boolean {
  return profile.friendshipStatus === "blocked";
}

export function isProfileRestricted(profile: PublicUserProfile): boolean {
  const status = profile.friendshipStatus ?? "none";
  return status === "blocked" || status === "pending_outgoing" || status === "none";
}

export function profileRestrictionHint(status: FriendshipStatus | undefined): string | undefined {
  switch (status) {
    case "blocked":
      return "Вы заблокировали этого пользователя";
    case "pending_outgoing":
      return "Часть профиля станет доступна после принятия заявки в друзья";
    case "none":
      return "Некоторые разделы доступны только друзьям";
    default:
      return undefined;
  }
}
