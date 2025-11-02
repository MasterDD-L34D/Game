const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const lerp = (range, t) => {
  const [start, end] = range;
  return start + (end - start) * t;
};

const formatNumber = (value) => Number.parseFloat(value.toFixed(3));

const formatCssNumber = (value) => formatNumber(value).toString();

const defaultGammaRange = [0.9, 1.08];

const normaliseRange = (range, fallback) =>
  Array.isArray(range) && range.length === 2 ? range : fallback;

const buildGlowResolver = (config) => {
  if (typeof config === 'function') {
    return (context) => Boolean(config(context));
  }
  if (config == null) {
    return () => true;
  }
  if (typeof config === 'boolean') {
    return () => config;
  }
  if (typeof config === 'object') {
    const {
      default: defaultValue = true,
      minContrast,
      maxGamma,
      maxPulse,
      min_contrast,
      max_gamma,
      max_pulse,
    } = config;
    const resolvedMinContrast = typeof minContrast === 'number' ? minContrast : min_contrast;
    const resolvedMaxGamma = typeof maxGamma === 'number' ? maxGamma : max_gamma;
    const resolvedMaxPulse = typeof maxPulse === 'number' ? maxPulse : max_pulse;
    return (context) => {
      if (typeof resolvedMinContrast === 'number' && context.contrast < resolvedMinContrast) {
        return false;
      }
      if (typeof resolvedMaxGamma === 'number' && context.gamma > resolvedMaxGamma) {
        return false;
      }
      if (typeof resolvedMaxPulse === 'number' && Math.abs(context.pulse) > resolvedMaxPulse) {
        return false;
      }
      return Boolean(defaultValue);
    };
  }
  return () => true;
};

const formatCssFlag = (value) => (value ? '1' : '0');

export const createDynamicShader = (parameters) => {
  const {
    contrastRange = [0.45, 1.1],
    hueShiftRange = [-12, 18],
    pulseFrequency = 0.5,
    saturationBoost = 0.15,
    bloomStrength = [0.25, 0.6],
    gammaRange: gammaRangeInput,
    glowToggle,
  } = parameters ?? {};

  if (!Array.isArray(contrastRange) || contrastRange.length !== 2) {
    throw new Error('contrastRange deve contenere due valori numerici');
  }
  if (!Array.isArray(hueShiftRange) || hueShiftRange.length !== 2) {
    throw new Error('hueShiftRange deve contenere due valori numerici');
  }

  const bloomRange = normaliseRange(bloomStrength, [0.3, 0.55]);
  const gammaRange = normaliseRange(gammaRangeInput, defaultGammaRange);
  const resolveGlow = buildGlowResolver(glowToggle);

  const uniformsForPhase = (phaseProgress, eclipseFactor = 1, overrides = {}) => {
    const intensity = clamp(phaseProgress, 0, 1);
    const eclipse = clamp(eclipseFactor, 0, 1);
    const eased = 1 - Math.cos((Math.PI * intensity) / 2);
    const hueSample = (intensity + eclipse) / 2;
    const pulse = Math.sin(Math.PI * (intensity * pulseFrequency + eclipse * 0.35));

    const contrast = lerp(contrastRange, eased);
    const hueShift = lerp(hueShiftRange, hueSample);
    const saturation = 1 + saturationBoost * eclipse + 0.05 * pulse;
    const bloom = lerp(bloomRange, (pulse + 1) / 2);
    const gammaBlend = clamp(intensity * 0.65 + eclipse * 0.35, 0, 1);
    const gammaBase = lerp(gammaRange, gammaBlend);
    const gamma = clamp(overrides.gamma ?? gammaBase, gammaRange[0], gammaRange[1]);

    const glowContext = {
      intensity,
      eclipse,
      contrast,
      gamma,
      pulse,
    };
    const glowEnabled = overrides.glowEnabled ?? resolveGlow(glowContext);
    const glowStrength = glowEnabled
      ? (contrast * 0.55 + bloom * 0.45) * (0.85 + eclipse * 0.15)
      : 0;

    return {
      intensity: formatNumber(intensity),
      contrast: formatNumber(contrast),
      hueShift: formatNumber(hueShift),
      pulse: formatNumber(pulse),
      saturation: formatNumber(saturation),
      bloom: formatNumber(bloom),
      gamma: formatNumber(gamma),
      glowStrength: formatNumber(glowStrength),
      glowEnabled,
    };
  };

  const cssVariablesForPhase = (phaseProgress, eclipseFactor = 1, overrides = {}) => {
    const uniforms = uniformsForPhase(phaseProgress, eclipseFactor, overrides);
    return {
      '--fx-intensity': formatCssNumber(uniforms.intensity),
      '--fx-contrast': formatCssNumber(uniforms.contrast),
      '--fx-hue-shift': `${formatCssNumber(uniforms.hueShift)}deg`,
      '--fx-pulse': formatCssNumber(uniforms.pulse),
      '--fx-saturation': formatCssNumber(uniforms.saturation),
      '--fx-bloom': formatCssNumber(uniforms.bloom),
      '--fx-gamma': formatCssNumber(uniforms.gamma),
      '--fx-glow-strength': formatCssNumber(uniforms.glowStrength),
      '--fx-glow-enabled': formatCssFlag(uniforms.glowEnabled),
    };
  };

  return {
    uniformsForPhase,
    cssVariablesForPhase,
    parameters: {
      contrastRange: [...contrastRange],
      hueShiftRange: [...hueShiftRange],
      pulseFrequency,
      saturationBoost,
      bloomStrength: [...bloomRange],
      gammaRange: [...gammaRange],
      glowToggle: glowToggle ?? true,
    },
  };
};

export { clamp, lerp };
