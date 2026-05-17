<template>
  <nav class="flow-breadcrumb" aria-label="Percorso di generazione">
    <ol class="flow-breadcrumb__list">
      <li
        v-for="step in steps"
        :key="step.id"
        class="flow-breadcrumb__item"
      >
        <button
          type="button"
          class="flow-breadcrumb__link"
          :class="{
            'flow-breadcrumb__link--active': step.id === current?.id,
          }"
          :disabled="step.id === current?.id"
          @click="$emit('navigate', step.id)"
        >
          <span class="flow-breadcrumb__index">{{ step.index + 1 }}</span>
          <span class="flow-breadcrumb__label">{{ step.title }}</span>
        </button>
      </li>
    </ol>
  </nav>
</template>

<script setup>
import { toRefs } from 'vue';

const props = defineProps({
  steps: {
    type: Array,
    default: () => [],
  },
  current: {
    type: Object,
    default: null,
  },
});

const { steps, current } = toRefs(props);

defineEmits(['navigate']);
</script>

<style scoped>
.flow-breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: rgba(240, 244, 255, 0.7);
}

.flow-breadcrumb__list {
  display: flex;
  gap: 0.5rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

.flow-breadcrumb__item {
  display: flex;
}

.flow-breadcrumb__link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(15, 21, 32, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 0.35rem 0.9rem;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease, background 0.2s ease;
}

.flow-breadcrumb__link--active,
.flow-breadcrumb__link:disabled {
  cursor: default;
  border-color: rgba(96, 213, 255, 0.65);
  color: #ffffff;
  background: rgba(96, 213, 255, 0.18);
}

.flow-breadcrumb__link:not(:disabled):hover {
  border-color: rgba(96, 213, 255, 0.55);
  color: #ffffff;
}

.flow-breadcrumb__index {
  font-weight: 600;
  letter-spacing: 0.05em;
}

.flow-breadcrumb__label {
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
