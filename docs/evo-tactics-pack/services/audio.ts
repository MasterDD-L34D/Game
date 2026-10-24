import { StoredPreferences } from './storage.ts';

type AudioLogger = {
  warn?: (...args: unknown[]) => void;
};

type AudioElementLike = {
  volume: number;
  currentTime: number;
  play?: () => void | Promise<void>;
  pause?: () => void;
  preload?: string;
};

type AudioElementFactory = (src: string) => AudioElementLike | null;

type ClassListLike = {
  toggle?: (className: string, force?: boolean) => void;
};

type EventListenerLike = (event: unknown) => void;

type EventTargetLike = {
  addEventListener?: (type: string, listener: EventListenerLike) => void;
};

type ButtonElementLike = EventTargetLike & {
  classList?: ClassListLike;
  setAttribute?: (name: string, value: string) => void;
  textContent?: string;
};

type InputElementLike = EventTargetLike & {
  value: string;
};

type ControlsElementLike = {
  hidden?: boolean;
  setAttribute?: (name: string, value: string) => void;
};

export interface AudioControlElements {
  controls?: ControlsElementLike | null;
  mute?: ButtonElementLike | null;
  volume?: InputElementLike | null;
}

export interface AudioPreferencesState {
  audioMuted: boolean;
  volume: number;
}

export interface AudioCueFactoryOptions {
  cues?: Record<string, string>;
  createAudioElement?: AudioElementFactory;
  logger?: AudioLogger;
  initialVolume?: number;
}

export interface AudioCueFactory {
  ensure(key: string): AudioElementLike | null;
  setVolume(volume: number): void;
}

export interface AudioServiceOptions {
  cues?: Record<string, string>;
  preferences: AudioPreferencesState;
  elements?: AudioControlElements;
  loadPreferences?: () => StoredPreferences;
  savePreferences?: (preferences: StoredPreferences) => void;
  createAudioElement?: AudioElementFactory;
  logger?: AudioLogger;
  defaultVolume?: number;
}

export interface AudioService {
  applyPreferences(): void;
  playCue(key: string): void;
  setupControls(): void;
  restorePreferences(): void;
}

export const RARE_CUE_SOURCE =
  'data:audio/wav;base64,UklGRiYfAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQIfAAAAALwL+hZBISMqQTFONhM5d' +
  'DlsNxEzkSwzJFAaUg+wA+j3dezU4XfYw9AKy4rH' +
  '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' +
  'Wug=';

export const DEFAULT_AUDIO_CUES = {
  rare: RARE_CUE_SOURCE,
} as const;

export function clampVolume(value: unknown, fallback = 0.5): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  if (numeric < 0) return 0;
  if (numeric > 1) return 1;
  return numeric;
}

function defaultCreateAudioElement(
  src: string,
  initialVolume: number,
  logger?: AudioLogger,
): AudioElementLike | null {
  if (typeof Audio === 'undefined') {
    return null;
  }
  try {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.volume = clampVolume(initialVolume);
    return audio as unknown as AudioElementLike;
  } catch (error) {
    logger?.warn?.('Impossibile inizializzare il cue audio', error);
    return null;
  }
}

export function createAudioCueFactory(options: AudioCueFactoryOptions = {}): AudioCueFactory {
  const { cues = {}, createAudioElement, logger, initialVolume = 0.5 } = options;
  const cache = new Map<string, AudioElementLike>();
  const factory: AudioElementFactory =
    createAudioElement ?? ((src) => defaultCreateAudioElement(src, initialVolume, logger));

  return {
    ensure(key: string) {
      if (!key) return null;
      if (cache.has(key)) {
        return cache.get(key) ?? null;
      }
      const src = cues[key];
      if (!src) return null;
      try {
        const element = factory(src);
        if (!element) {
          return null;
        }
        if (typeof element.volume === 'number') {
          element.volume = clampVolume(initialVolume);
        }
        cache.set(key, element);
        return element;
      } catch (error) {
        logger?.warn?.('Impossibile inizializzare il cue audio', error);
        return null;
      }
    },
    setVolume(volume: number) {
      const target = clampVolume(volume);
      cache.forEach((audio) => {
        try {
          audio.volume = target;
        } catch (error) {
          logger?.warn?.('Impossibile aggiornare il volume del cue audio', error);
        }
      });
    },
  };
}

export function createAudioService(options: AudioServiceOptions): AudioService {
  const {
    cues = DEFAULT_AUDIO_CUES,
    preferences,
    elements = {},
    loadPreferences,
    savePreferences,
    createAudioElement,
    logger,
    defaultVolume = 0.5,
  } = options;

  const cueFactory = createAudioCueFactory({
    cues,
    createAudioElement,
    logger,
    initialVolume: defaultVolume,
  });

  const controlElements: AudioControlElements = {
    controls: elements.controls ?? null,
    mute: elements.mute ?? null,
    volume: elements.volume ?? null,
  };

  function persist() {
    savePreferences?.({
      audioMuted: Boolean(preferences.audioMuted),
      volume: clampVolume(preferences.volume, defaultVolume),
    });
  }

  function applyPreferences() {
    const muted = Boolean(preferences.audioMuted);
    const volume = clampVolume(preferences.volume, defaultVolume);
    preferences.volume = volume;

    cueFactory.setVolume(muted ? 0 : volume);

    const muteButton = controlElements.mute;
    if (muteButton?.classList?.toggle) {
      muteButton.classList.toggle('is-muted', muted);
    }
    muteButton?.setAttribute?.('aria-pressed', muted ? 'true' : 'false');
    if (typeof muteButton?.textContent === 'string') {
      muteButton.textContent = muted ? '🔇 Audio disattivato' : '🔈 Audio attivo';
    }

    const volumeInput = controlElements.volume;
    if (volumeInput) {
      const targetValue = String(Math.round(volume * 100));
      if (volumeInput.value !== targetValue) {
        volumeInput.value = targetValue;
      }
    }
  }

  function playCue(key: string) {
    const audio = cueFactory.ensure(key);
    if (!audio) return;
    const volume = clampVolume(preferences.volume, defaultVolume);
    if (preferences.audioMuted || volume <= 0) {
      if (typeof audio.pause === 'function') {
        try {
          audio.pause();
        } catch (error) {
          logger?.warn?.('Impossibile mettere in pausa il cue audio', error);
        }
      }
      return;
    }
    try {
      audio.currentTime = 0;
      audio.volume = volume;
      const playback = audio.play?.();
      if (playback && typeof (playback as Promise<void>).catch === 'function') {
        (playback as Promise<void>).catch((error) => {
          if (!error || (error as { name?: string }).name === 'NotAllowedError') {
            return;
          }
          logger?.warn?.('Riproduzione audio non riuscita', error);
        });
      }
    } catch (error) {
      logger?.warn?.(`Impossibile riprodurre il cue audio ${key}`, error);
    }
  }

  function setupControls() {
    const supported = Boolean(cueFactory.ensure('rare'));
    const controls = controlElements.controls;
    if (!supported) {
      if (controls) {
        controls.hidden = true;
        controls.setAttribute?.('aria-hidden', 'true');
      }
      return;
    }
    if (controls) {
      controls.hidden = false;
      controls.setAttribute?.('aria-hidden', 'false');
    }

    const muteButton = controlElements.mute;
    if (muteButton?.addEventListener) {
      muteButton.addEventListener('click', (event) => {
        const evt = event as { preventDefault?: () => void };
        evt?.preventDefault?.();
        const nextMuted = !preferences.audioMuted;
        preferences.audioMuted = nextMuted;
        if (!nextMuted && clampVolume(preferences.volume, defaultVolume) <= 0) {
          preferences.volume = defaultVolume;
        }
        applyPreferences();
        persist();
      });
    }

    const volumeInput = controlElements.volume;
    if (volumeInput?.addEventListener) {
      const handleVolume = (value: unknown) => {
        const numeric = clampVolume(Number(value) / 100, defaultVolume);
        preferences.volume = numeric;
        if (numeric > 0 && preferences.audioMuted) {
          preferences.audioMuted = false;
        }
        if (numeric === 0) {
          preferences.audioMuted = true;
        }
        applyPreferences();
      };

      volumeInput.addEventListener('input', (event) => {
        const target =
          (event as { target?: { value?: string } }).target?.value ?? volumeInput.value;
        handleVolume(target);
      });

      volumeInput.addEventListener('change', () => {
        persist();
      });
    }

    applyPreferences();
  }

  function restorePreferences() {
    const stored = loadPreferences?.();
    if (stored && typeof stored === 'object') {
      if (typeof stored.audioMuted === 'boolean') {
        preferences.audioMuted = stored.audioMuted;
      }
      if (typeof stored.volume === 'number') {
        preferences.volume = clampVolume(stored.volume, defaultVolume);
      }
    }
    applyPreferences();
  }

  return {
    applyPreferences,
    playCue,
    setupControls,
    restorePreferences,
  };
}
