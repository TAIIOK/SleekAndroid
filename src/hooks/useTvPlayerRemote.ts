import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler } from 'react-native';

import type { PlayerEpisodeNav, PlayerMenuOption } from '@/components/player/types';
import {
  TV_PANEL_HIDE_MS,
  TV_PLAYER_OPTIONS_ORDER,
  TV_PLAYER_TRANSPORT_ORDER,
  type TvPlayerButtonId,
  type TvPlayerOverlay,
  type TvPlayerPanelFocus,
} from '@/components/player/tv/tvPlayerTypes';
import { useTvEventHandlerSafe } from '@/lib/tvEventHandler';
import { cyclePlaybackRate, cycleVideoFit, type PlayerPreferences } from '@/lib/playerPreferences';

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
  hasDubbing: boolean;
  hasQuality: boolean;
  hasConnection: boolean;
  hasDelivery: boolean;
  hasEpisodes: boolean;
  hasPrevEpisode: boolean;
  hasNextEpisode: boolean;
  onBack: () => void;
  onTogglePlay: () => void;
  onSeekBack: () => void;
  onSeekForward: () => void;
  onPrevEpisode?: () => void;
  onNextEpisode?: () => void;
  onSelectMenuOption: (option: PlayerMenuOption) => void;
  onSelectEpisode: (episodeId: number) => void;
  onPrefsChange: (patch: Partial<PlayerPreferences>) => void;
}

function isTransportButton(id: TvPlayerButtonId): boolean {
  return TV_PLAYER_TRANSPORT_ORDER.includes(id);
}

function isOptionsButton(id: TvPlayerButtonId): boolean {
  return TV_PLAYER_OPTIONS_ORDER.includes(id);
}

function rowOrder(id: TvPlayerButtonId, enabled: Set<TvPlayerButtonId>): TvPlayerButtonId[] {
  const source = isOptionsButton(id) ? TV_PLAYER_OPTIONS_ORDER : TV_PLAYER_TRANSPORT_ORDER;
  return source.filter((item) => enabled.has(item));
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

function firstEnabledTransport(enabled: Set<TvPlayerButtonId>): TvPlayerButtonId {
  return TV_PLAYER_TRANSPORT_ORDER.find((id) => enabled.has(id)) ?? 'play';
}

function buildEnabledButtons(options: UseTvPlayerRemoteOptions): Set<TvPlayerButtonId> {
  const enabled = new Set<TvPlayerButtonId>(['rprev', 'play', 'rnext']);
  if (options.hasPrevEpisode) enabled.add('prev_episode');
  if (options.hasNextEpisode) enabled.add('next_episode');
  if (options.hasDubbing) enabled.add('dubbing');
  if (options.hasQuality) enabled.add('quality');
  if (options.hasConnection) enabled.add('connection');
  if (options.hasDelivery) enabled.add('delivery');
  if (options.hasEpisodes) enabled.add('episodes');
  enabled.add('fit');
  enabled.add('settings');
  return enabled;
}

function overlayItemCount(overlay: TvPlayerOverlay, options: UseTvPlayerRemoteOptions): number {
  if (overlay === 'dubbing') return options.dubbingOptions?.length ?? 0;
  if (overlay === 'quality') return options.qualityOptions?.length ?? 0;
  if (overlay === 'connection') return options.connectionOptions?.length ?? 0;
  if (overlay === 'delivery') return options.deliveryOptions?.length ?? 0;
  if (overlay === 'episodes') return options.episodeNav?.items.length ?? 0;
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
  return 0;
}

export function useTvPlayerRemote(options: UseTvPlayerRemoteOptions) {
  const [panelVisible, setPanelVisible] = useState(false);
  const [panelFocus, setPanelFocus] = useState<TvPlayerPanelFocus>('timeline');
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
    (focus: TvPlayerPanelFocus = 'timeline') => {
      setPanelVisible(true);
      setPanelFocus(focus);
      scheduleHide();
    },
    [scheduleHide],
  );

  const hidePanel = useCallback(() => {
    clearHideTimer();
    setPanelVisible(false);
    setPanelFocus('timeline');
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
        case 'fit':
          opts.onPrefsChange({ videoFit: cycleVideoFit(opts.prefs.videoFit) });
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
          setPanelFocus(firstEnabledTransport(enabled));
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
          setPanelFocus('play');
        } else if (isTransportButton(focused)) {
          setPanelFocus('timeline');
        }
        scheduleHide();
        return;
      }

      if (key === 'down') {
        if (isTransportButton(focused)) {
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
    }
  }, [clearHideTimer, options.playing]);

  useTvEventHandlerSafe((event) => {
    if (event.eventType === 'focus' || event.eventType === 'blur') return;
    // rn-tvos Android may emit key-down + key-up; handle key-up only.
    if (event.eventKeyAction != null && event.eventKeyAction !== 1) return;

    const opts = optionsRef.current;
    const type = event.eventType;

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
        const now = Date.now();
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

    if (type === 'menu' || type === 'back') {
      if (panelVisible) {
        hidePanel();
        return;
      }
      opts.onBack();
      return;
    }

    if (type === 'select' || type === 'playPause') {
      if (panelVisible && panelFocus !== 'timeline') {
        activateButton(panelFocus);
        return;
      }
      opts.onTogglePlay();
      scheduleHide();
      return;
    }

    if (panelVisible) {
      if (type === 'up' || type === 'down' || type === 'left' || type === 'right') {
        handlePanelArrow(type);
      }
      return;
    }

    if (type === 'left') opts.onSeekBack();
    else if (type === 'right') opts.onSeekForward();
    else if (type === 'up' || type === 'down') showPanel('timeline');
  });

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
  };
}
