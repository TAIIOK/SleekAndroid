import { useCallback, useEffect, useRef, useState } from 'react';

import {
  reportDeadPoster,
  subscribeAnimePosterRefresh,
} from '@/lib/animePosterRefresh';
import { needsHotlinkReferer } from '@/lib/config';
import { prefetchPosterDisplayUri, hotlinkImageSource } from '@/lib/hotlinkImage';
import {
  reportYaniPosterLoadError,
  reportYaniPosterLoadSuccess,
  rewritePosterURL,
} from '@/lib/imageCdn';
import {
  isPlausibleImageURL,
  normalizedAbsoluteURLString,
} from '@/lib/poster';
import { displayPosterUrl } from '@/lib/posterDisplay';

export type PosterImageSource = {
  uri: string;
  headers?: Record<string, string>;
  cacheKey?: string;
};

/**
 * Shared poster display path for catalog rails and continue watching:
 * resolve → rewrite yani host → prefetch Anilib bytes (TV Glide drops Referer).
 */
export function usePosterDisplayUri(options: {
  poster?: string | null;
  animeId?: number | null;
}): {
  displayUrl: string | undefined;
  imageSource: PosterImageSource | undefined;
  onLoad: () => void;
  onError: () => void;
} {
  const { poster, animeId } = options;
  const [overridePoster, setOverridePoster] = useState<string | null>(null);
  const [hotlinkUri, setHotlinkUri] = useState<string | null>(null);
  const didReportUnresolvedRef = useRef(false);
  const hotlinkTriedRef = useRef(false);

  const imageUrl = displayPosterUrl(overridePoster ?? poster);
  const displayUrl = hotlinkUri ?? imageUrl;

  useEffect(() => {
    setOverridePoster(null);
    didReportUnresolvedRef.current = false;
  }, [poster, animeId]);

  useEffect(() => {
    setHotlinkUri(null);
    hotlinkTriedRef.current = false;
    if (!imageUrl || !needsHotlinkReferer(imageUrl)) return;
    // TV Glide/expo-image often drops Referer and never fires onError — prefetch bytes.
    hotlinkTriedRef.current = true;
    let cancelled = false;
    void prefetchPosterDisplayUri(imageUrl).then((uri) => {
      if (!cancelled && uri) setHotlinkUri(uri);
    });
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  useEffect(() => {
    if (animeId == null || !Number.isFinite(animeId) || animeId <= 0) return;
    return subscribeAnimePosterRefresh((event) => {
      if (event.animeId !== animeId) return;
      setOverridePoster(event.posterURLString);
    });
  }, [animeId]);

  useEffect(() => {
    if (didReportUnresolvedRef.current) return;
    if (animeId == null || !Number.isFinite(animeId) || animeId <= 0) return;
    const raw = (overridePoster ?? poster)?.trim();
    if (!raw) return;
    const isAbsolute =
      raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('//');
    if (!isAbsolute) return;
    const normalized = normalizedAbsoluteURLString(raw);
    if (normalized && isPlausibleImageURL(normalized)) return;
    didReportUnresolvedRef.current = true;
    reportDeadPoster({ animeId, failedUrl: null, rawPath: raw });
  }, [animeId, poster, overridePoster]);

  const onLoad = useCallback(() => {
    reportYaniPosterLoadSuccess();
  }, []);

  const onError = useCallback(() => {
    if (imageUrl) reportYaniPosterLoadError(imageUrl);
    if (imageUrl) {
      const rewritten = rewritePosterURL(imageUrl);
      if (rewritten !== imageUrl) setOverridePoster(rewritten);
    }
    if (animeId != null) {
      reportDeadPoster({
        animeId,
        failedUrl: imageUrl,
        rawPath: overridePoster ?? poster,
      });
    }
    if (imageUrl && needsHotlinkReferer(imageUrl) && !hotlinkTriedRef.current) {
      hotlinkTriedRef.current = true;
      void prefetchPosterDisplayUri(imageUrl).then((uri) => {
        if (uri) setHotlinkUri(uri);
      });
    }
  }, [animeId, imageUrl, overridePoster, poster]);

  const imageSource: PosterImageSource | undefined = displayUrl
    ? hotlinkUri
      ? { uri: hotlinkUri }
      : hotlinkImageSource(displayUrl)
    : undefined;

  return { displayUrl, imageSource, onLoad, onError };
}
