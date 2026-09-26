<template>
  <section class="trait-filter-panel" aria-label="Filtri tratti">
    <fieldset class="trait-filter-panel__group">
      <legend>Filtra tratti core</legend>
      <ul role="list">
        <li v-for="trait in coreOptions" :key="trait">
          <label :class="{ 'trait-filter-panel__option--highlight': highlightSet.has(trait) }">
            <input
              type="checkbox"
              :value="trait"
              :checked="model.core.includes(trait)"
              @change="toggleTrait('core', trait, $event)"
            />
            {{ formatLabel(trait) }}
          </label>
        </li>
      </ul>
    </fieldset>
    <fieldset class="trait-filter-panel__group" v-if="derivedOptions.length">
      <legend>Filtra tratti derivati</legend>
      <ul role="list">
        <li v-for="trait in derivedOptions" :key="trait">
          <label :class="{ 'trait-filter-panel__option--highlight': highlightSet.has(trait) }">
            <input
              type="checkbox"
              :value="trait"
              :checked="model.derived.includes(trait)"
              @change="toggleTrait('derived', trait, $event)"
            />
            {{ formatLabel(trait) }}
          </label>
        </li>
      </ul>
    </fieldset>
  </section>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  coreOptions: {
    type: Array,
    default: () => [],
  },
  derivedOptions: {
    type: Array,
    default: () => [],
  },
  labels: {
    type: Object,
    default: () => ({}),
  },
  highlight: {
    type: Array,
    default: () => [],
  },
  modelValue: {
    type: Object,
    default: () => ({ core: [], derived: [] }),
  },
});

const emit = defineEmits(['update:modelValue']);

const labelMap = computed(() => props.labels || {});
const highlightSet = computed(() => new Set(props.highlight || []));

const model = computed({
  get() {
    return {
      core: Array.isArray(props.modelValue.core) ? props.modelValue.core : [],
      derived: Array.isArray(props.modelValue.derived) ? props.modelValue.derived : [],
    };
  },
  set(value) {
    emit('update:modelValue', value);
  },
});

function formatLabel(trait) {
  if (!trait) {
    return '';
  }
  const label = labelMap.value?.[trait];
  if (label && label !== trait) {
    return `${trait} · ${label}`;
  }
  return trait;
}

function toggleTrait(bucket, trait, event) {
  const checked = event?.target?.checked;
  const next = {
    core: [...model.value.core],
    derived: [...model.value.derived],
  };
  const target = next[bucket];
  const index = target.indexOf(trait);
  if (checked && index === -1) {
    target.push(trait);
  } else if (!checked && index !== -1) {
    target.splice(index, 1);
  }
  model.value = next;
}
</script>

<style scoped>
.trait-filter-panel {
  display: grid;
  gap: 0.75rem;
}

.trait-filter-panel__group {
  border: 1px solid var(--color-border-subtle);
  border-radius: 0.75rem;
  padding: 0.75rem 0.9rem;
}

.trait-filter-panel__group legend {
  font-size: 0.85rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  margin-bottom: 0.35rem;
  color: var(--color-text-secondary);
  padding: 0 0.35rem;
}

.trait-filter-panel__group ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.25rem;
}

.trait-filter-panel__group label {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.trait-filter-panel__option--highlight {
  background: rgba(122, 196, 255, 0.18);
  border-radius: 6px;
  padding: 0.2rem 0.35rem;
}
</style>
