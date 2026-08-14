import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';

import type { PlayerEpisodeNav, PlayerMenuOption } from '@/components/player/types';
import {
  TV_PANEL_HIDE_MS,
  TV_PLAYER_CENTER_ORDER,
  TV_PLAYER_OPTIONS_ORDER,
  type TvPlayerButtonId,
  type TvPlayerOverlay,
  type TvPlayerPanelFocus,
} from '@/components/player/tv/tvPlayerTypes';
import { useTvEventHandlerSafe, type TvHwEvent } from '@/lib/tvEventHandler';
import type { ExternalPlayerTarget } from '@/lib/externalPlayer';
import { cyclePlaybackRate, cycleVideoFit, type PlayerPreferences } from '@/lib/playerPreferences';
import type { SubtitleTrackInfo } from '@/lib/subtitleTracks';
import { isTvPlayerActivationKeyUp, mapHiddenHudKey } from '@/lib/tvPlayerRemote';

/** Min interval between overlay ↑/↓ steps — held D-pad can fire faster than focus can follow. */
const OVERLAY_NAV_MIN_MS = 150;

interface UseTvPlayerRemoteOptions {
  playing: boolean;
  prefs: PlayerPreferences;
  dubbingOptions?: PlayerMenuOption[];
  qualityOptions?: PlayerMenuOption[];
  connectionOptions?: PlayerMenuOption[];
  deliveryOptions?: PlayerMenuOption[];
  episodeNav?: PlayerEpisodeNav;
  subtitleTracks?: SubtitleTrackInfo[];
  activeSubtitle?: SubtitleTrackInfo | null;
  externalPlayers?: ExternalPlayerTarget[];
  hasDubbing: boolean;
  hasQuality: boolean;
  hasConnection: boolean;
  hasDelivery: boolean;
  hasEpisodes: boolean;
  hasSubtitles: boolean;
  hasExternal: boolean;
  hasPrevEpisode: boolean;
  hasNextEpisode: boolean;
  /** Skip OP/ED/intro CTA is visible — OK activates it instead of play/pause. */
  hasSkipPrompt?: boolean;
  onBack: () => void;
  onTogglePlay: () => void;
  onSeekBack: () => void;
  onSeekForward: () => void;
  onPrevEpisode?: () => void;
  onNextEpisode?: () => void;
  onApplySkip?: () => void;
  onSelectMenuOption: (option: PlayerMenuOption) => void;
  onSelectEpisode: (episodeId: number) => void;
  onSelectSubtitle: (track: SubtitleTrackInfo | null) => void;
  onSelectExternalPlayer?: (target: ExternalPlayerTarget) => void;
  onPrefsChange: (patch: Partial<PlayerPreferences>) => void;
}

function isCenterButton(id: TvPlayerButtonId, enabled: Set<TvPlayerButtonId>): boolean {
  return centerOrder(enabled).includes(id);
}

function isOptionsButton(
  id: TvPlayerPanelFocus,
): id is (typeof TV_PLAYER_OPTIONS_ORDER)[number] {
  return (TV_PLAYER_OPTIONS_ORDER as readonly TvPlayerPanelFocus[]).includes(id);
}

function centerOrder(enabled: Set<TvPlayerButtonId>): TvPlayerButtonId[] {
  return TV_PLAYER_CENTER_ORDER.filter((id) => id === 'play' || enabled.has(id));
}

function rowOrder(id: TvPlayerButtonId, enabled: Set<TvPlayerButtonId>): TvPlayerButtonId[] {
  if (isOptionsButton(id)) {
    return TV_PLAYER_OPTIONS_ORDER.filter((item) => enabled.has(item));
  }
  return centerOrder(enabled);
}

function nextInRow(
  current: TvPlayerButtonId,
  direction: 1 | -1,
  enabled: Set<TvPlayerButtonId>,
): TvPlayerButtonId {
  const order = rowOrder(current, enabled);
  const idx = order.indexOf(current);
  if (idx < 0) return order[0] ?? 'play';
  const next = (idx + direction + order.length) % order.length;
  return order[next] ?? 'play';
}

function firstEnabledOption(enabled: Set<TvPlayerButtonId>): TvPlayerButtonId | null {
  return TV_PLAYER_OPTIONS_ORDER.find((id) => enabled.has(id)) ?? null;
}

function firstEnabledCenter(enabled: Set<TvPlayerButtonId>): TvPlayerButtonId {
  const order = centerOrder(enabled);
  return order.includes('play') ? 'play' : (order[0] ?? 'play');
}

function buildEnabledButtons(options: UseTvPlayerRemoteOptions): Set<TvPlayerButtonId> {
  const enabled = new Set<TvPlayerButtonId>(['play']);
  if (options.hasPrevEpisode) enabled.add('prev_episode');
  if (options.hasNextEpisode) enabled.add('next_episode');
  if (options.hasDubbing) enabled.add('dubbing');
  if (options.hasQuality) enabled.add('quality');
  if (options.hasConnection) enabled.add('connection');
  if (options.hasDelivery) enabled.add('delivery');
  if (options.hasEpisodes) enabled.add('episodes');
  if (options.hasSubtitles) enabled.add('subtitles');
  enabled.add('fit');
  if (options.hasExternal) enabled.add('external');
  enabled.add('settings');
  return enabled;
}

function overlayItemCount(overlay: TvPlayerOverlay, options: UseTvPlayerRemoteOptions): number {
  if (overlay === 'dubbing') return options.dubbingOptions?.length ?? 0;
  if (overlay === 'quality') return options.qualityOptions?.length ?? 0;
  if (overlay === 'connection') return options.connectionOptions?.length ?? 0;
  if (overlay === 'delivery') return options.deliveryOptions?.length ?? 0;
  if (overlay === 'episodes') return options.episodeNav?.items.length ?? 0;
  if (overlay === 'subtitles') return (options.subtitleTracks?.length ?? 0) + 1;
  if (overlay === 'external') return options.externalPlayers?.length ?? 0;
  if (overlay === 'settings') return 5;
  return 0;
}

function overlayInitialIndex(overlay: TvPlayerOverlay, options: UseTvPlayerRemoteOptions): number {
  if (overlay === 'dubbing' && options.dubbingOptions?.length) {
    const idx = options.dubbingOptions.findIndex((o) => o.selected);
    return idx >= 0 ? idx : 0;
  }
  if (overlay === 'quality' && options.qualityOptions?.length) {
    const idx = options.qualityOptions.findIndex((o) => o.selected);
    return idx >= 0 ? idx : 0;
  }
  if (overlay === 'connection' && options.connectionOptions?.length) {
    const idx = options.connectionOptions.findIndex((o) => o.selected);
    return idx >= 0 ? idx : 0;
  }
  if (overlay === 'delivery' && options.deliveryOptions?.length) {
    const idx = options.deliveryOptions.findIndex((o) => o.selected);
    return idx >= 0 ? idx : 0;
  }
  if (overlay === 'episodes' && options.episodeNav?.items.length) {
    const idx = options.episodeNav.items.findIndex(
      (item) => item.id === options.episodeNav?.currentEpisodeId,
    );
    return idx >= 0 ? idx : 0;
  }
  if (overlay === 'subtitles') {
    if (!options.activeSubtitle) return 0;
    const idx = options.subtitleTracks?.findIndex(
      (track) =>
        track.language === options.activeSubtitle?.language &&
        track.label === options.activeSubtitle?.label,
    );
    return idx != null && idx >= 0 ? idx + 1 : 0;
  }
  if (overlay === 'external' && options.externalPlayers?.length) {
    const pkg = options.prefs.lastExternalPlayerPackage ?? '';
    const idx = options.externalPlayers.findIndex((p) =>
      pkg ? p.packageName === pkg : p.id === 'system',
    );
    return idx >= 0 ? idx : 0;
  }
  return 0;
}

export function useTvPlayerRemote(options: UseTvPlayerRemoteOptions) {
  const [panelVisible, setPanelVisible] = useState(true);
  const [panelFocus, setPanelFocus] = useState<TvPlayerPanelFocus>('play');
  const [overlay, setOverlay] = useState<TvPlayerOverlay>(null);
  const [overlayFocusIndex, setOverlayFocusIndex] = useState(0);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastOverlayNavAtRef = useRef(0);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const enabledButtons = buildEnabledButtons(options);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current != null) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimer();
    if (!optionsRef.current.playing) return;
    hideTimerRef.current = setTimeout(() => {
      setPanelVisible(false);
      setPanelFocus('timeline');
    }, TV_PANEL_HIDE_MS);
  }, [clearHideTimer]);

  const showPanel = useCallback(
    (focus: TvPlayerPanelFocus = 'play') => {
      setPanelVisible(true);
      setPanelFocus(focus);
      scheduleHide();
    },
    [scheduleHide],
  );

  const focusHud = useCallback(
    (focus: TvPlayerPanelFocus) => {
      setPanelVisible(true);
      setPanelFocus(focus);
      scheduleHide();
    },
    [scheduleHide],
  );

  const hidePanel = useCallback(() => {
    clearHideTimer();
    setPanelVisible(false);
    setPanelFocus('play');
  }, [clearHideTimer]);

  const openOverlay = useCallback(
    (next: TvPlayerOverlay) => {
      clearHideTimer();
      setOverlay(next);
      setOverlayFocusIndex(overlayInitialIndex(next, optionsRef.current));
    },
    [clearHideTimer],
  );

  const closeOverlay = useCallback(() => {
    setOverlay(null);
    showPanel(panelFocus === 'timeline' ? 'timeline' : panelFocus);
  }, [panelFocus, showPanel]);

  const activateOverlayItem = useCallback(() => {
    const opts = optionsRef.current;
    if (!overlay) return;
    if (overlay === 'dubbing' && opts.dubbingOptions?.length) {
      const option = opts.dubbingOptions[overlayFocusIndex];
      if (option) {
        opts.onSelectMenuOption(option);
        closeOverlay();
      }
      return;
    }
    if (overlay === 'quality' && opts.qualityOptions?.length) {
      const option = opts.qualityOptions[overlayFocusIndex];
      if (option) {
        opts.onSelectMenuOption(option);
        closeOverlay();
      }
      return;
    }
    if (overlay === 'connection' && opts.connectionOptions?.length) {
      const option = opts.connectionOptions[overlayFocusIndex];
      if (option) {
        opts.onSelectMenuOption(option);
        closeOverlay();
      }
      return;
    }
    if (overlay === 'delivery' && opts.deliveryOptions?.length) {
      const option = opts.deliveryOptions[overlayFocusIndex];
      if (option) {
        opts.onSelectMenuOption(option);
        closeOverlay();
      }
      return;
    }
    if (overlay === 'episodes' && opts.episodeNav?.items.length) {
      const item = opts.episodeNav.items[overlayFocusIndex];
      if (item) {
        opts.onSelectEpisode(item.id);
        closeOverlay();
      }
      return;
    }
    if (overlay === 'subtitles') {
      if (overlayFocusIndex === 0) {
        opts.onSelectSubtitle(null);
        closeOverlay();
        return;
      }
      const track = opts.subtitleTracks?.[overlayFocusIndex - 1];
      if (track) {
        opts.onSelectSubtitle(track);
        closeOverlay();
      }
      return;
    }
    if (overlay === 'external') {
      const target = opts.externalPlayers?.[overlayFocusIndex];
      if (target) {
        opts.onSelectExternalPlayer?.(target);
        closeOverlay();
      }
      return;
    }
    if (overlay === 'settings') {
      const actions = ['rate', 'fit', 'autonext', 'skip_open', 'skip_end'] as const;
      const action = actions[overlayFocusIndex];
      if (!action) return;
      if (action === 'rate') {
        opts.onPrefsChange({ playbackRate: cyclePlaybackRate(opts.prefs.playbackRate) });
      } else if (action === 'fit') {
        opts.onPrefsChange({ videoFit: cycleVideoFit(opts.prefs.videoFit) });
      } else if (action === 'autonext') {
        opts.onPrefsChange({ autoPlayNext: !opts.prefs.autoPlayNext });
      } else if (action === 'skip_open') {
        opts.onPrefsChange({ autoSkipOpening: !opts.prefs.autoSkipOpening });
      } else if (action === 'skip_end') {
        opts.onPrefsChange({ autoSkipEnding: !opts.prefs.autoSkipEnding });
      }
    }
  }, [closeOverlay, overlay, overlayFocusIndex]);

  const activateButton = useCallback(
    (id: TvPlayerButtonId) => {
      const opts = optionsRef.current;
      switch (id) {
        case 'prev_episode':
          opts.onPrevEpisode?.();
          break;
        case 'rprev':
          opts.onSeekBack();
          break;
        case 'play':
          opts.onTogglePlay();
          break;
        case 'rnext':
          opts.onSeekForward();
          break;
        case 'next_episode':
          opts.onNextEpisode?.();
          break;
        case 'dubbing':
          openOverlay('dubbing');
          break;
        case 'quality':
          openOverlay('quality');
          break;
        case 'connection':
          openOverlay('connection');
          break;
        case 'delivery':
          openOverlay('delivery');
          break;
        case 'episodes':
          openOverlay('episodes');
          break;
        case 'subtitles':
          openOverlay('subtitles');
          break;
        case 'fit':
          opts.onPrefsChange({ videoFit: cycleVideoFit(opts.prefs.videoFit) });
          break;
        case 'external':
          openOverlay('external');
          break;
        case 'settings':
          openOverlay('settings');
          break;
      }
      scheduleHide();
    },
    [openOverlay, scheduleHide],
  );

  const handlePanelArrow = useCallback(
    (key: 'up' | 'down' | 'left' | 'right') => {
      const opts = optionsRef.current;
      const enabled = buildEnabledButtons(opts);

      if (panelFocus === 'timeline') {
        if (key === 'left') {
          opts.onSeekBack();
          scheduleHide();
          return;
        }
        if (key === 'right') {
          opts.onSeekForward();
          scheduleHide();
          return;
        }
        if (key === 'down') {
          setPanelFocus(firstEnabledCenter(enabled));
          scheduleHide();
          return;
        }
        if (key === 'up') {
          hidePanel();
          return;
        }
        return;
      }

      const focused = panelFocus;

      if (key === 'up') {
        if (isOptionsButton(focused)) {
          setPanelFocus(firstEnabledCenter(enabled));
        } else if (isCenterButton(focused, enabled)) {
          setPanelFocus('timeline');
        }
        scheduleHide();
        return;
      }

      if (key === 'down') {
        if (isCenterButton(focused, enabled)) {
          const next = firstEnabledOption(enabled);
          if (next) setPanelFocus(next);
        }
        scheduleHide();
        return;
      }

      if (key === 'left' || key === 'right') {
        const direction = key === 'right' ? 1 : -1;
        setPanelFocus(nextInRow(focused, direction, enabled));
        scheduleHide();
      }
    },
    [hidePanel, panelFocus, scheduleHide],
  );

  useEffect(() => {
    if (!options.playing) {
      clearHideTimer();
      return;
    }
    if (panelVisible) scheduleHide();
  }, [clearHideTimer, options.playing, panelVisible, scheduleHide]);

  // When skip first appears, drop chrome focus so OK maps to skip (not stuck next_episode).
  const hadSkipPromptRef = useRef(false);
  useEffect(() => {
    const hasSkip = Boolean(options.hasSkipPrompt);
    const appeared = hasSkip && !hadSkipPromptRef.current;
    hadSkipPromptRef.current = hasSkip;
    if (appeared && !overlay) hidePanel();
  }, [hidePanel, options.hasSkipPrompt, overlay]);

  const lastHwRef = useRef({ type: '', at: 0 });
  const panelVisibleRef = useRef(panelVisible);
  const overlayRef = useRef(overlay);
  const panelFocusRef = useRef(panelFocus);
  panelVisibleRef.current = panelVisible;
  overlayRef.current = overlay;
  panelFocusRef.current = panelFocus;

  const handleHwEvent = useCallback(
    (event: TvHwEvent) => {
      if (event.eventType === 'focus' || event.eventType === 'blur') return;
      // OK key-up must not toggle play again (keydown + onPress + keyup).
      if (isTvPlayerActivationKeyUp(event)) return;
      // Debounce key-down+key-up (or dropped key-up after preventDefault).
      const type = event.eventType;
      const now = Date.now();
      if (type === lastHwRef.current.type && now - lastHwRef.current.at < 90) return;
      lastHwRef.current = { type, at: now };

      const opts = optionsRef.current;
      const overlay = overlayRef.current;
      const panelVisible = panelVisibleRef.current;
      const panelFocus = panelFocusRef.current;

      if (overlay) {
        if (type === 'menu' || type === 'back') {
          closeOverlay();
          return;
        }
        if (type === 'select' || type === 'playPause') {
          activateOverlayItem();
          return;
        }
        const count = overlayItemCount(overlay, opts);
        if (count > 0 && (type === 'down' || type === 'up')) {
          if (now - lastOverlayNavAtRef.current < OVERLAY_NAV_MIN_MS) return;
          lastOverlayNavAtRef.current = now;
          if (type === 'down') {
            setOverlayFocusIndex((idx) => (idx + 1) % count);
          } else {
            setOverlayFocusIndex((idx) => (idx - 1 + count) % count);
          }
        }
        return;
      }

      if (panelVisible) {
        if (type === 'menu' || type === 'back') {
          hidePanel();
          return;
        }
        if (type === 'select' || type === 'playPause') {
          if (isOptionsButton(panelFocus)) {
            activateButton(panelFocus);
            return;
          }
          if (opts.hasSkipPrompt && opts.onApplySkip) {
            opts.onApplySkip();
            hidePanel();
            return;
          }
          if (panelFocus !== 'timeline') {
            activateButton(panelFocus);
            return;
          }
          opts.onTogglePlay();
          showPanel(firstEnabledCenter(buildEnabledButtons(opts)));
          return;
        }
        if (type === 'up' || type === 'down' || type === 'left' || type === 'right') {
          if (panelFocus === 'timeline' && (type === 'left' || type === 'right')) {
            handlePanelArrow(type);
          }
          // Other arrows: native TV focus moves Play ↔ pills.
        }
        return;
      }

      const command = mapHiddenHudKey(type, {
        hasSkipPrompt: Boolean(opts.hasSkipPrompt),
        centerFocus: firstEnabledCenter(buildEnabledButtons(opts)),
      });
      if (!command) return;
      if (command.kind === 'back') {
        opts.onBack();
        return;
      }
      if (command.kind === 'skip') {
        opts.onApplySkip?.();
        hidePanel();
        return;
      }
      if (command.kind === 'togglePlay') {
        opts.onTogglePlay();
        showPanel(command.focus);
        return;
      }
      if (command.kind === 'seekBack') {
        opts.onSeekBack();
        showPanel(command.focus);
        return;
      }
      if (command.kind === 'seekForward') {
        opts.onSeekForward();
        showPanel(command.focus);
        return;
      }
      showPanel(command.focus);
    },
    [
      activateButton,
      activateOverlayItem,
      closeOverlay,
      handlePanelArrow,
      hidePanel,
      showPanel,
    ],
  );

  useTvEventHandlerSafe(handleHwEvent);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (overlay) {
        closeOverlay();
        return true;
      }
      if (panelVisible) {
        hidePanel();
        return true;
      }
      optionsRef.current.onBack();
      return true;
    });
    return () => sub.remove();
  }, [closeOverlay, hidePanel, overlay, panelVisible]);

  return {
    panelVisible,
    panelFocus,
    overlay,
    overlayFocusIndex,
    showPanel,
    hidePanel,
    closeOverlay,
    enabledButtons,
    activateButton,
    focusHud,
    handleHwEvent,
  };
}
