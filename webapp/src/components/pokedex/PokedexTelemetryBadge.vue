<template>
  <span class="pokedex-telemetry" :data-tone="tone">
    <span class="pokedex-telemetry__label">{{ label }}</span>
    <span class="pokedex-telemetry__value">
      <slot>{{ value }}</slot>
    </span>
  </span>
</template>

<script setup>
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
</script>
