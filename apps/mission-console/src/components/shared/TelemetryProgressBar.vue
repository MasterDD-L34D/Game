<template>
  <div
    class="telemetry-progress"
    role="progressbar"
    :aria-valuenow="Math.round(displayPercent)"
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <div class="telemetry-progress__header">
      <span class="telemetry-progress__label">{{ label }}</span>
      <span class="telemetry-progress__value">{{ displayValue }}</span>
    </div>
    <div class="telemetry-progress__bar">
      <div
        class="telemetry-progress__fill"
        :style="{ width: `${Math.min(100, Math.max(displayPercent, 0))}%` }"
      />
    </div>
    <p v-if="description" class="telemetry-progress__description">{{ description }}</p>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  current: {
    type: Number,
    default: null,
  },
  total: {
    type: Number,
    default: null,
  },
  percent: {
    type: Number,
    default: null,
  },
  value: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
});

const displayPercent = computed(() => {
  if (typeof props.percent === 'number' && Number.isFinite(props.percent)) {
    return props.percent;
  }
  if (typeof props.current === 'number' && typeof props.total === 'number' && props.total > 0) {
    return (props.current / props.total) * 100;
  }
  return 0;
});

const displayValue = computed(() => {
  if (props.value) {
    return props.value;
  }
  if (props.current != null && props.total != null) {
    return `${props.current} / ${props.total}`;
  }
  return `${Math.round(displayPercent.value)}%`;
});
</script>

<style scoped>
.telemetry-progress {
  display: grid;
  gap: 0.35rem;
}

.telemetry-progress__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.85rem;
}

.telemetry-progress__label {
  color: var(--evogene-deck-text-secondary);
}

.telemetry-progress__value {
  font-weight: 600;
  color: var(--evogene-deck-text-primary);
}

.telemetry-progress__bar {
  position: relative;
  height: 0.55rem;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(96, 213, 255, 0.18);
}

.telemetry-progress__fill {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  background: linear-gradient(90deg, rgba(96, 213, 255, 0.7), rgba(161, 255, 212, 0.7));
  border-radius: inherit;
  transition: width 0.3s ease;
}

.telemetry-progress__description {
  margin: 0;
  font-size: 0.75rem;
  color: var(--evogene-deck-text-muted);
}
</style>
