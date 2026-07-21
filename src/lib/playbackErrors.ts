import type { OnVideoErrorData } from 'react-native-video';

export interface PlaybackErrorInfo {
  raw: string;
  message: string;
  isBadHttpStatus: boolean;
}

export function extractPlaybackErrorRaw(error: OnVideoErrorData): string {
  const details = error?.error;
  return (
    details?.errorString ||
    details?.errorException ||
    details?.errorCode ||
    details?.error ||
    details?.localizedDescription ||
    'Не удалось воспроизвести видео'
  );
}

export function isBadHttpStatusPlaybackError(raw: string): boolean {
  const lower = raw.toLowerCase();
  return (
    lower.includes('error_code_io_bad_http_status') ||
    lower.includes('bad_http_status') ||
    lower.includes('http status') ||
    /response\s*code\s*[45]\d\d/.test(lower)
  );
}

export function formatPlaybackErrorMessage(raw: string): string {
  const lower = raw.toLowerCase();

  if (isBadHttpStatusPlaybackError(raw)) {
    return 'Источник отклонил запрос к видео. Попробуйте «Прокси» или другой источник.';
  }
  if (
    lower.includes('error_code_io_network') ||
    lower.includes('network connection') ||
    lower.includes('unable to connect')
  ) {
    return 'Нет сети или сервер недоступен.';
  }
  if (lower.includes('error_code_io_file_not_found') || lower.includes('404')) {
    return 'Видео не найдено. Попробуйте другое качество или источник.';
  }
  if (lower.includes('exoplaybackexception') || lower.includes('exoplayer')) {
    return 'Не удалось воспроизвести видео.';
  }

  return raw.trim() || 'Не удалось воспроизвести видео';
}

export function toPlaybackErrorInfo(error: OnVideoErrorData): PlaybackErrorInfo {
  const raw = extractPlaybackErrorRaw(error);
  return {
    raw,
    message: formatPlaybackErrorMessage(raw),
    isBadHttpStatus: isBadHttpStatusPlaybackError(raw),
  };
}
