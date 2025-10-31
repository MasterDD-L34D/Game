<template>
  <svg
    v-if="points.length"
    :class="['sparkline', variantClass]"
    :viewBox="`0 0 ${viewBoxWidth} ${viewBoxHeight}`"
    role="img"
    aria-label="Andamento metriche"
    preserveAspectRatio="none"
  >
    <polyline
      class="sparkline__line"
      :points="polylinePoints"
      fill="none"
      :stroke="color"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
      stroke-linejoin="round"
      :stroke-dasharray="variant === 'demo' ? '6 6' : undefined"
    />
    <circle
      v-if="lastPoint"
      class="sparkline__pivot"
      :cx="lastPoint.x"
      :cy="lastPoint.y"
      :r="strokeWidth * 1.2"
      :fill="color"
    />
  </svg>
  <div v-else :class="['sparkline', 'sparkline--empty', variantClass]" aria-hidden="true"></div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  points: {
    type: Array,
    default: () => [],
  },
  color: {
    type: String,
    default: '#61d5ff',
  },
  strokeWidth: {
    type: Number,
    default: 2,
  },
  variant: {
    type: String,
    default: 'live',
  },
});

const viewBoxHeight = 40;

const variantClass = computed(() => (props.variant === 'demo' ? 'sparkline--demo' : ''));

const validPoints = computed(() =>
  (props.points || [])
    .map((value) => (Number.isFinite(value) ? Number(value) : 0))
    .filter((value) => Number.isFinite(value))
);

const viewBoxWidth = computed(() => Math.max((validPoints.value.length - 1) * 24, 24));

const normalizedPoints = computed(() => {
  if (!validPoints.value.length) {
    return [];
  }
  const min = Math.min(...validPoints.value, 0);
  const max = Math.max(...validPoints.value, 100);
  const span = max - min || 1;
  return validPoints.value.map((value, index) => {
    const x = (index / Math.max(validPoints.value.length - 1, 1)) * viewBoxWidth.value;
    const y = viewBoxHeight - ((value - min) / span) * viewBoxHeight;
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
  });
});

const polylinePoints = computed(() => normalizedPoints.value.map((point) => `${point.x},${point.y}`).join(' '));

const lastPoint = computed(() => {
  if (!normalizedPoints.value.length) {
    return null;
  }
  return normalizedPoints.value[normalizedPoints.value.length - 1];
});
</script>

<style scoped>
.sparkline {
  width: 100%;
  height: 48px;
  display: block;
}

.sparkline--empty {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
}

.sparkline__line {
  filter: drop-shadow(0 0 4px rgba(97, 213, 255, 0.4));
}

.sparkline__pivot {
  stroke: rgba(5, 8, 13, 0.8);
  stroke-width: 1.25;
}

.sparkline--demo .sparkline__line {
  filter: drop-shadow(0 0 4px rgba(244, 192, 96, 0.35));
}

.sparkline--demo .sparkline__pivot {
  stroke: rgba(5, 8, 13, 0.6);
  opacity: 0.85;
}
</style>
