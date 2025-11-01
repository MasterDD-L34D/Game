import { describe, expect, it } from 'vitest';

import { buildMissionShader, createDynamicShader } from '../../webapp/src/vfx/index.js';

const missionVfxMock = {
  shader_id: 'eclipse_dynamics',
  palette: {
    base: '#121629',
    highlight: '#f2d27a',
    accent: '#43c7ff',
  },
  shader_parameters: {
    contrast_range: [0.35, 1.05],
    hue_shift_range: [-18, 22],
    pulse_frequency: 0.65,
    saturation_boost: 0.18,
    bloom_strength: [0.24, 0.6],
  },
  timeline: [
    {
      event: 'umbra-entry',
      at_wave: 4,
      eclipse_factor: 0.55,
      phase_window: { start: 0.15, end: 0.75 },
    },
    {
      event: 'umbra-peak',
      at_wave: 5,
      eclipse_factor: 0.88,
      phase_window: { start: 0.35, end: 0.9 },
    },
  ],
};

describe('dynamic shader uniforms', () => {
  it('stabilises uniforms along the eclipse curve', () => {
    const shader = createDynamicShader({
      contrastRange: [0.35, 1.05],
      hueShiftRange: [-18, 22],
      pulseFrequency: 0.65,
      saturationBoost: 0.18,
      bloomStrength: [0.24, 0.6],
    });

    const uniforms = shader.uniformsForPhase(0.64, 0.82);
    expect(uniforms).toMatchInlineSnapshot(`
{
  "bloom": 0.565,
  "contrast": 0.675,
  "glowStrength": 0.608,
  "hueShift": 11.2,
  "intensity": 0.64,
  "pulse": 0.803,
  "saturation": 1.188,
}
`);
  });
});

describe('mission shader adapter', () => {
  it('derives css variables snapshot for the peak wave', () => {
    const adapter = buildMissionShader(missionVfxMock);
    const sample = adapter.sampleAtWave(5, 0.76);
    expect(sample.cssVariables).toMatchInlineSnapshot(`
{
  "--fx-bloom": "0.529",
  "--fx-contrast": "0.778",
  "--fx-glow-strength": "0.654",
  "--fx-hue-shift": "14.509deg",
  "--fx-intensity": "0.745",
  "--fx-pulse": "0.607",
  "--fx-saturation": "1.189",
}
`);
    expect(sample.uniforms.glowStrength).toBeCloseTo(0.654, 3);
    expect(sample.event).toBe('umbra-peak');
    expect(adapter.shaderId).toBe('eclipse_dynamics');
  });
});

