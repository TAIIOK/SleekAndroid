export type UserListStatus =
  | 'watching'
  | 'planned'
  | 'completed'
  | 'dropped'
  | 'on_hold';

export const LIBRARY_STATUS_OPTIONS: { value: UserListStatus; label: string }[] = [
  { value: 'watching', label: 'Смотрю' },
  { value: 'planned', label: 'В планах' },
  { value: 'completed', label: 'Просмотрено' },
  { value: 'dropped', label: 'Брошено' },
  { value: 'on_hold', label: 'Отложено' },
];

export function libraryStatusLabel(status?: string): string | undefined {
  if (!status) return undefined;
  return LIBRARY_STATUS_OPTIONS.find((option) => option.value === status)?.label;
}
