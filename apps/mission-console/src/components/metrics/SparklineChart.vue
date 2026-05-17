<template>
  <figure v-if="points.length" :class="['sparkline', variantClass]">
    <svg
      :viewBox="`0 0 ${viewBoxWidth} ${viewBoxHeight}`"
      role="img"
      preserveAspectRatio="none"
      :aria-labelledby="`${titleId} ${summaryId}`"
    >
      <title :id="titleId">{{ summaryLabelText }}</title>
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
    <figcaption :id="summaryId" class="sparkline__summary">
      <span>{{ summaryDisplay.min }}</span>
      <span>{{ summaryDisplay.max }}</span>
      <span>{{ summaryDisplay.latest }}</span>
      <span>{{ summaryDisplay.trend }}</span>
    </figcaption>
  </figure>
  <div v-else :class="['sparkline', 'sparkline--empty', variantClass]" role="status" aria-live="polite">
    <span class="visually-hidden">Nessuna telemetria disponibile</span>
  </div>
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
  summaryLabel: {
    type: String,
    default: 'Andamento metriche',
  },
});

let chartInstance = 0;
const instanceId = `sparkline-${++chartInstance}`;
const summaryId = `${instanceId}-summary`;
const titleId = `${instanceId}-title`;

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

const lastValue = computed(() => {
  if (!validPoints.value.length) {
    return null;
  }
  return validPoints.value[validPoints.value.length - 1];
});

const summaryStats = computed(() => {
  if (!validPoints.value.length) {
    return null;
  }
  const min = Math.min(...validPoints.value);
  const max = Math.max(...validPoints.value);
  const latest = lastValue.value;
  const previous = validPoints.value.length > 1 ? validPoints.value[validPoints.value.length - 2] : latest;
  const trendRaw = latest - previous;
  const average = validPoints.value.reduce((sum, value) => sum + value, 0) / validPoints.value.length;
  return {
    min,
    max,
    latest,
    trendRaw,
    average,
  };
});

const numberFormatter = new Intl.NumberFormat('it-IT', {
  maximumFractionDigits: 1,
});

const summaryDisplay = computed(() => {
  if (!summaryStats.value) {
    return {
      min: 'Min: –',
      max: 'Max: –',
      latest: 'Ultimo: –',
      trend: 'Trend: nessun dato',
    };
  }
  const { min, max, latest, trendRaw, average } = summaryStats.value;
  const trendLabel = trendRaw === 0 ? 'Trend: stabile' : trendRaw > 0
      ? `Trend: +${numberFormatter.format(trendRaw)}`
      : `Trend: ${numberFormatter.format(trendRaw)}`;
  return {
    min: `Min: ${numberFormatter.format(min)}`,
    max: `Max: ${numberFormatter.format(max)}`,
    latest: `Ultimo: ${numberFormatter.format(latest)} (media ${numberFormatter.format(average)})`,
    trend: trendLabel,
  };
});

const summaryLabelText = computed(() => {
  if (!summaryStats.value) {
    return `${props.summaryLabel}: nessun dato disponibile`;
  }
  const { min, max, latest, trendRaw } = summaryStats.value;
  const trendLabel = trendRaw === 0 ? 'stabile' : trendRaw > 0 ? `in aumento di ${numberFormatter.format(trendRaw)}` : `in calo di ${numberFormatter.format(Math.abs(trendRaw))}`;
  return `${props.summaryLabel}: minimo ${numberFormatter.format(min)}, massimo ${numberFormatter.format(max)}, ultimo valore ${numberFormatter.format(latest)}, andamento ${trendLabel}.`;
});
</script>

<style scoped>
.sparkline {
  width: 100%;
  display: grid;
  gap: 0.35rem;
}

.sparkline svg {
  width: 100%;
  height: 48px;
  display: block;
}

.sparkline__summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.sparkline--empty {
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  min-height: 48px;
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
