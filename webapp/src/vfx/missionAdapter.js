import { clamp, createDynamicShader } from './dynamicShader.js';

const normalisePhase = (phaseWindow, progress) => {
  if (!phaseWindow) {
    return clamp(progress, 0, 1);
  }
  const { start = 0, end = 1 } = phaseWindow;
  if (end - start <= 0) {
    return clamp(progress, 0, 1);
  }
  const scaled = (progress - start) / (end - start);
  return clamp(scaled, 0, 1);
};

export const buildMissionShader = (missionVfxConfig) => {
  if (!missionVfxConfig) {
    throw new Error('Configurazione VFX missione mancante');
  }

  const { shader_parameters: shaderParameters } = missionVfxConfig;
  if (!shaderParameters) {
    throw new Error('shader_parameters assente nella configurazione missione');
  }

  const shader = createDynamicShader({
    contrastRange: shaderParameters.contrast_range,
    hueShiftRange: shaderParameters.hue_shift_range,
    pulseFrequency: shaderParameters.pulse_frequency,
    saturationBoost: shaderParameters.saturation_boost,
    bloomStrength: shaderParameters.bloom_strength,
  });

  const timeline = missionVfxConfig.timeline ?? [];

  const sampleAtWave = (waveNumber, progress = 0.5) => {
    const entry = timeline.find((item) => item.at_wave === waveNumber);
    if (!entry) {
      return {
        event: 'default',
        uniforms: shader.uniformsForPhase(progress, 1),
        cssVariables: shader.cssVariablesForPhase(progress, 1),
      };
    }
    const eclipseFactor = entry.eclipse_factor ?? 1;
    const phaseProgress = normalisePhase(entry.phase_window, progress);

    const uniforms = shader.uniformsForPhase(phaseProgress, eclipseFactor);
    return {
      event: entry.event,
      eclipseFactor,
      notes: entry.notes,
      uniforms,
      cssVariables: shader.cssVariablesForPhase(phaseProgress, eclipseFactor),
    };
  };

  return {
    shaderId: missionVfxConfig.shader_id,
    palette: missionVfxConfig.palette,
    timeline,
    shader,
    sampleAtWave,
  };
};

