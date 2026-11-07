<template>
  <span
    class="evogene-deck-telemetry"
    :data-tone="tone"
    role="group"
    :aria-labelledby="labelId"
    :aria-describedby="valueId"
  >
    <span :id="labelId" class="evogene-deck-telemetry__label">{{ label }}</span>
    <span :id="valueId" class="evogene-deck-telemetry__value">
      <slot>{{ value }}</slot>
    </span>
  </span>
</template>

<script setup>
import { useId } from 'vue';

const props = defineProps({
  label: {
    type: String,
    required: true,
  },
  value: {
    type: [String, Number],
    default: '—',
  },
  tone: {
    type: String,
    default: 'neutral',
  },
});

const rawId = useId();
const instanceId = `evogene-deck-telemetry-${rawId}`;
const labelId = `${instanceId}-label`;
const valueId = `${instanceId}-value`;
</script>
