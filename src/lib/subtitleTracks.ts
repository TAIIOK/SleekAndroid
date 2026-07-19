/** Subtitle track shape used by the in-app player HUD. */
export interface SubtitleTrackInfo {
  id?: string;
  language: string;
  label: string;
  name?: string;
  isDefault?: boolean;
}

export function subtitleTrackLabel(track: SubtitleTrackInfo): string {
  const label = track.label?.trim();
  if (label) return label;
  const name = track.name?.trim();
  if (name) return name;
  const language = track.language?.trim();
  if (language) return language.toUpperCase();
  return 'Субтитры';
}

export function findPreferredSubtitleTrack(
  tracks: SubtitleTrackInfo[],
  preferredLanguage?: string | null,
): SubtitleTrackInfo | null {
  if (!tracks.length) return null;
  const pref = preferredLanguage?.trim().toLowerCase();
  if (pref) {
    const byLang = tracks.find((t) => t.language?.toLowerCase() === pref);
    if (byLang) return byLang;
  }
  return tracks.find((t) => t.isDefault) ?? tracks[0] ?? null;
}
