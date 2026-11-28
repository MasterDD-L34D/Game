import { describe, expect, it, vi } from 'vitest';

import { createAudioService, clampVolume } from '../../../docs/evo-tactics-pack/services/audio.ts';

function createButtonMock() {
  const listeners = new Map<string, (event: unknown) => void>();
  return {
    classList: { toggle: vi.fn() },
    setAttribute: vi.fn(),
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      listeners.set(type, listener);
    },
    trigger: (type: string, event: unknown) => {
      const listener = listeners.get(type);
      if (listener) listener(event);
    },
    textContent: '',
  };
}

function createVolumeMock(initialValue = '50') {
  const listeners = new Map<string, (event: unknown) => void>();
  const mock = {
    value: initialValue,
    addEventListener: (type: string, listener: (event: unknown) => void) => {
      listeners.set(type, listener);
    },
    trigger: (type: string, value: string) => {
      const listener = listeners.get(type);
      if (listener) {
        listener({ target: { value } });
      }
    },
  };
  return mock;
}

describe('audio service', () => {
  it('updates preferences and triggers persistence when controls are used', async () => {
    const preferences = { audioMuted: false, volume: 0.4 };
    const muteButton = createButtonMock();
    const volumeInput = createVolumeMock('40');
    const controls = { hidden: false, setAttribute: vi.fn() };
    const savePreferences = vi.fn();
    const play = vi.fn(() => Promise.resolve());
    const pause = vi.fn();

    const service = createAudioService({
      cues: { rare: 'stub-source' },
      preferences,
      elements: {
        controls,
        mute: muteButton,
        volume: volumeInput,
      },
      loadPreferences: () => ({ audioMuted: false, volume: 0.4 }),
      savePreferences,
      createAudioElement: () => ({ volume: 0.4, currentTime: 0, play, pause }),
      logger: { warn: vi.fn() },
      defaultVolume: 0.4,
    });

    service.setupControls();

    expect(muteButton.classList.toggle).toHaveBeenCalledWith('is-muted', false);
    expect(volumeInput.value).toBe('40');

    muteButton.trigger('click', { preventDefault: vi.fn() });
    expect(preferences.audioMuted).toBe(true);
    expect(savePreferences).toHaveBeenCalledWith({ audioMuted: true, volume: 0.4 });

    volumeInput.trigger('input', '80');
    expect(preferences.volume).toBeCloseTo(0.8, 5);
    expect(preferences.audioMuted).toBe(false);

    volumeInput.trigger('change', volumeInput.value);
    expect(savePreferences).toHaveBeenCalledWith({ audioMuted: false, volume: 0.8 });

    await service.playCue('rare');
    expect(play).toHaveBeenCalled();
    expect(pause).not.toHaveBeenCalled();
  });

  it('hides controls when audio elements cannot be created', () => {
    const preferences = { audioMuted: false, volume: 0.5 };
    const controls = { hidden: false, setAttribute: vi.fn() };

    const service = createAudioService({
      cues: { rare: 'missing' },
      preferences,
      elements: {
        controls,
        mute: null,
        volume: null,
      },
      loadPreferences: () => null,
      savePreferences: () => {},
      createAudioElement: () => null,
      logger: { warn: vi.fn() },
    });

    service.setupControls();
    expect(controls.hidden).toBe(true);
    expect(controls.setAttribute).toHaveBeenCalledWith('aria-hidden', 'true');
  });

  it('clamps volume values within the supported range', () => {
    expect(clampVolume(1.2)).toBe(1);
    expect(clampVolume(-1)).toBe(0);
    expect(clampVolume('0.25')).toBeCloseTo(0.25, 5);
    expect(clampVolume(NaN)).toBe(0.5);
  });
});
