<template>
  <div class="trait-filter-panel">
    <div class="trait-filter-panel__group">
      <h4>Filtra tratti core</h4>
      <ul>
        <li v-for="trait in coreOptions" :key="trait">
          <label>
            <input type="checkbox" :value="trait" :checked="model.core.includes(trait)" @change="toggleTrait('core', trait, $event)" />
            {{ trait }}
          </label>
        </li>
      </ul>
    </div>
    <div class="trait-filter-panel__group" v-if="derivedOptions.length">
      <h4>Filtra tratti derivati</h4>
      <ul>
        <li v-for="trait in derivedOptions" :key="trait">
          <label>
            <input
              type="checkbox"
              :value="trait"
              :checked="model.derived.includes(trait)"
              @change="toggleTrait('derived', trait, $event)"
            />
            {{ trait }}
          </label>
        </li>
      </ul>
    </div>
  </div>
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
  modelValue: {
    type: Object,
    default: () => ({ core: [], derived: [] }),
  },
});

const emit = defineEmits(['update:modelValue']);

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

.trait-filter-panel__group h4 {
  margin: 0 0 0.25rem;
  font-size: 0.85rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
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
}
</style>
