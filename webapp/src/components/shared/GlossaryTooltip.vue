<template>
  <span class="glossary-tooltip">
    <slot />
    <span v-if="props.description" class="glossary-tooltip__bubble">{{ props.description }}</span>
  </span>
</template>

<script setup>
const props = defineProps({
  description: {
    type: String,
    default: '',
  },
});
</script>

<style scoped>
.glossary-tooltip {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.glossary-tooltip__bubble {
  position: absolute;
  bottom: calc(100% + 0.35rem);
  left: 50%;
  transform: translateX(-50%);
  max-width: 220px;
  padding: 0.45rem 0.6rem;
  border-radius: 0.6rem;
  background: rgba(7, 23, 39, 0.95);
  color: var(--pokedex-text-primary);
  font-size: 0.75rem;
  line-height: 1.25;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
  border: 1px solid rgba(96, 213, 255, 0.25);
  z-index: 2;
}

.glossary-tooltip:hover .glossary-tooltip__bubble,
.glossary-tooltip:focus-within .glossary-tooltip__bubble {
  opacity: 1;
}
</style>
