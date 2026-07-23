export type UserListStatus =
  | 'watching'
  | 'planned'
  | 'completed'
  | 'dropped'
  | 'on_hold';

export const LIBRARY_STATUS_OPTIONS: {
  value: UserListStatus;
  label: string;
  icon: string;
}[] = [
  { value: 'watching', label: 'Смотрю', icon: '▶' },
  { value: 'planned', label: 'В планах', icon: '☐' },
  { value: 'completed', label: 'Просмотрено', icon: '✓' },
  { value: 'dropped', label: 'Брошено', icon: '✕' },
  { value: 'on_hold', label: 'Отложено', icon: '⏸' },
];

export function libraryStatusLabel(status?: string): string | undefined {
  if (!status) return undefined;
  return LIBRARY_STATUS_OPTIONS.find((option) => option.value === status)?.label;
}
