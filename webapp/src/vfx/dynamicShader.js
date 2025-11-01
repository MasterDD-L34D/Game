const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const lerp = (range, t) => {
  const [start, end] = range;
  return start + (end - start) * t;
};

const formatNumber = (value) => Number.parseFloat(value.toFixed(3));

const formatCssNumber = (value) => formatNumber(value).toString();

export const createDynamicShader = (parameters) => {
  const {
    contrastRange = [0.45, 1.1],
    hueShiftRange = [-12, 18],
    pulseFrequency = 0.5,
    saturationBoost = 0.15,
    bloomStrength = [0.25, 0.6],
  } = parameters ?? {};

  if (!Array.isArray(contrastRange) || contrastRange.length !== 2) {
    throw new Error('contrastRange deve contenere due valori numerici');
  }
  if (!Array.isArray(hueShiftRange) || hueShiftRange.length !== 2) {
    throw new Error('hueShiftRange deve contenere due valori numerici');
  }

  const bloomRange = Array.isArray(bloomStrength) && bloomStrength.length === 2 ? bloomStrength : [0.3, 0.55];

  const uniformsForPhase = (phaseProgress, eclipseFactor = 1) => {
    const intensity = clamp(phaseProgress, 0, 1);
    const eclipse = clamp(eclipseFactor, 0, 1);
    const eased = 1 - Math.cos((Math.PI * intensity) / 2);
    const hueSample = (intensity + eclipse) / 2;
    const pulse = Math.sin(Math.PI * (intensity * pulseFrequency + eclipse * 0.35));

    const contrast = lerp(contrastRange, eased);
    const hueShift = lerp(hueShiftRange, hueSample);
    const saturation = 1 + saturationBoost * eclipse + 0.05 * pulse;
    const bloom = lerp(bloomRange, (pulse + 1) / 2);
    const glowStrength = (contrast * 0.55 + bloom * 0.45) * (0.85 + eclipse * 0.15);

    return {
      intensity: formatNumber(intensity),
      contrast: formatNumber(contrast),
      hueShift: formatNumber(hueShift),
      pulse: formatNumber(pulse),
      saturation: formatNumber(saturation),
      bloom: formatNumber(bloom),
      glowStrength: formatNumber(glowStrength),
    };
  };

  const cssVariablesForPhase = (phaseProgress, eclipseFactor = 1) => {
    const uniforms = uniformsForPhase(phaseProgress, eclipseFactor);
    return {
      '--fx-intensity': formatCssNumber(uniforms.intensity),
      '--fx-contrast': formatCssNumber(uniforms.contrast),
      '--fx-hue-shift': `${formatCssNumber(uniforms.hueShift)}deg`,
      '--fx-pulse': formatCssNumber(uniforms.pulse),
      '--fx-saturation': formatCssNumber(uniforms.saturation),
      '--fx-bloom': formatCssNumber(uniforms.bloom),
      '--fx-glow-strength': formatCssNumber(uniforms.glowStrength),
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
    },
  };
};

export { clamp, lerp };

