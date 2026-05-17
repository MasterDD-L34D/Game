<template>
  <section class="encounter-editor">
    <header class="encounter-editor__header">
      <h3>Editor step-by-step</h3>
      <nav class="encounter-editor__steps" aria-label="Editor encounter">
        <button
          v-for="(step, index) in steps"
          :key="step.id"
          type="button"
          class="encounter-editor__step"
          :class="{ 'encounter-editor__step--active': index === activeStep }"
          @click="activeStep = index"
        >
          <span class="encounter-editor__step-index">{{ index + 1 }}</span>
          <span class="encounter-editor__step-label">{{ step.label }}</span>
        </button>
      </nav>
    </header>

    <div class="encounter-editor__content">
      <section v-if="steps[activeStep]?.id === 'variant'" class="encounter-editor__panel">
        <h4>Seleziona una variante</h4>
        <p>Scegli la variante da configurare o aggiungila al confronto laterale.</p>
        <ul class="variant-list">
          <li v-for="variant in variants" :key="variant.id">
            <article
              class="variant-card"
              :class="{ 'variant-card--active': variant.id === selectedVariantId }"
              @click="selectVariant(variant.id)"
            >
              <header>
                <h5>{{ variant.summary }}</h5>
                <span class="variant-card__badge">{{ metricsByVariant[variant.id]?.threat?.tier || 'T?' }}</span>
              </header>
              <p>{{ variant.description }}</p>
              <footer class="variant-card__footer">
                <span>{{ variant.slots.length }} slot</span>
                <button
                  type="button"
                  class="variant-card__action"
                  @click.stop="emit('toggle-comparison', variant.id)"
                >
                  {{ comparisonSelection.includes(variant.id) ? 'Rimuovi dal confronto' : 'Confronta' }}
                </button>
              </footer>
            </article>
          </li>
        </ul>
      </section>

      <section v-else-if="steps[activeStep]?.id === 'parameters'" class="encounter-editor__panel">
        <h4>Configura parametri</h4>
        <p>Modifica densità, cadenza e altri parametri per vedere l'impatto immediato.</p>
        <div v-if="activeVariant" class="parameter-grid">
          <div
            v-for="(options, parameterId) in parameterOptions"
            :key="parameterId"
            class="parameter-grid__item"
          >
            <label :for="`parameter-${parameterId}`">{{ parameterLabel(parameterId) }}</label>
            <select
              :id="`parameter-${parameterId}`"
              v-model="parameterSelections[parameterId]"
              @change="onParameterChange(parameterId)"
            >
              <option v-for="option in options" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <small>{{ options.find((option) => option.value === parameterSelections[parameterId])?.summary }}</small>
          </div>
        </div>
        <p v-else>Nessuna variante selezionata.</p>
      </section>

      <section v-else class="encounter-editor__panel">
        <h4>Gestisci slot e quantità</h4>
        <p>Regola la composizione tattica prima di passare alla visualizzazione finale.</p>
        <div v-if="activeVariant" class="slot-table">
          <div v-for="slot in activeVariant.slots" :key="slot.id" class="slot-table__row">
            <div class="slot-table__info">
              <h5>{{ slot.title }}</h5>
              <span>{{ slot.species.length }} specie selezionate</span>
            </div>
            <div class="slot-table__controls">
              <label :for="`slot-${slot.id}`">Quantità</label>
              <input
                :id="`slot-${slot.id}`"
                type="number"
                min="0"
                :value="slot.quantity"
                @input="onSlotQuantity(slot.id, $event.target.value)"
              />
            </div>
          </div>
        </div>
        <p v-else>Nessuna variante selezionata.</p>
      </section>
    </div>

    <footer class="encounter-editor__footer">
      <button type="button" :disabled="activeStep === 0" @click="goPrevious">Indietro</button>
      <button type="button" :disabled="activeStep >= steps.length - 1" @click="goNext">Avanti</button>
    </footer>
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';

const emits = defineEmits([
  'select-variant',
  'update-parameter',
  'update-slot',
  'toggle-comparison',
]);

const props = defineProps({
  encounter: {
    type: Object,
    required: true,
  },
  variants: {
    type: Array,
    default: () => [],
  },
  selectedVariantId: {
    type: String,
    default: null,
  },
  metricsByVariant: {
    type: Object,
    default: () => ({}),
  },
  comparisonSelection: {
    type: Array,
    default: () => [],
  },
});

const steps = [
  { id: 'variant', label: 'Variante' },
  { id: 'parameters', label: 'Parametri' },
  { id: 'slots', label: 'Slot' },
];

const activeStep = ref(0);

watch(
  () => props.selectedVariantId,
  () => {
    if (!props.selectedVariantId && props.variants.length) {
      emits('select-variant', props.variants[0].id);
    }
  },
  { immediate: true }
);

const activeVariant = computed(() =>
  props.variants.find((variant) => variant.id === props.selectedVariantId) || props.variants[0] || null
);

const parameterSelections = reactive({});

watch(
  activeVariant,
  (variant) => {
    if (!variant) {
      return;
    }
    for (const key of Object.keys(parameterSelections)) {
      delete parameterSelections[key];
    }
    for (const [parameterId, value] of Object.entries(variant.parameters || {})) {
      parameterSelections[parameterId] = value.value;
    }
  },
  { immediate: true }
);

const parameterOptions = computed(() => {
  const registry = new Map();
  for (const variant of props.variants) {
    for (const [parameterId, value] of Object.entries(variant.parameters || {})) {
      if (!registry.has(parameterId)) {
        registry.set(parameterId, new Map());
      }
      registry
        .get(parameterId)
        .set(value.value, { value: value.value, label: value.label, summary: value.summary || '' });
    }
  }
  const entries = {};
  for (const [parameterId, map] of registry.entries()) {
    entries[parameterId] = Array.from(map.values());
  }
  return entries;
});

function parameterLabel(parameterId) {
  return props.encounter.parameterLabels?.[parameterId] || parameterId;
}

function selectVariant(variantId) {
  emits('select-variant', variantId);
}

function onParameterChange(parameterId) {
  if (!activeVariant.value) {
    return;
  }
  const value = parameterOptions.value[parameterId]?.find(
    (option) => option.value === parameterSelections[parameterId]
  );
  if (!value) {
    return;
  }
  emits('update-parameter', {
    variantId: activeVariant.value.id,
    parameterId,
    value,
  });
}

function onSlotQuantity(slotId, nextValue) {
  if (!activeVariant.value) {
    return;
  }
  const quantity = Number.parseInt(nextValue, 10);
  if (Number.isNaN(quantity) || quantity < 0) {
    return;
  }
  emits('update-slot', {
    variantId: activeVariant.value.id,
    slotId,
    quantity,
  });
}

function goPrevious() {
  activeStep.value = Math.max(0, activeStep.value - 1);
}

function goNext() {
  activeStep.value = Math.min(steps.length - 1, activeStep.value + 1);
}
</script>

<style scoped>
.encounter-editor {
  background: rgba(6, 10, 15, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1.5rem;
  display: grid;
  gap: 1.25rem;
}

.encounter-editor__header {
  display: grid;
  gap: 0.75rem;
}

.encounter-editor__header h3 {
  margin: 0;
  font-size: 1.1rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(240, 244, 255, 0.75);
}

.encounter-editor__steps {
  display: flex;
  gap: 0.5rem;
}

.encounter-editor__step {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.75rem;
  border-radius: 10px;
  background: rgba(9, 14, 20, 0.85);
  border: 1px solid transparent;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.encounter-editor__step:hover {
  border-color: rgba(96, 213, 255, 0.35);
}

.encounter-editor__step--active {
  border-color: rgba(96, 213, 255, 0.6);
  transform: translateY(-1px);
}

.encounter-editor__step-index {
  font-weight: 700;
  background: rgba(96, 213, 255, 0.15);
  border-radius: 999px;
  width: 1.6rem;
  height: 1.6rem;
  display: grid;
  place-items: center;
}

.encounter-editor__step-label {
  font-size: 0.9rem;
}

.encounter-editor__panel {
  display: grid;
  gap: 0.75rem;
}

.encounter-editor__panel h4 {
  margin: 0;
  font-size: 1rem;
}

.encounter-editor__panel p {
  margin: 0;
  color: rgba(240, 244, 255, 0.7);
}

.variant-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.75rem;
}

.variant-card {
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 0.9rem;
  background: rgba(7, 11, 16, 0.9);
  display: grid;
  gap: 0.5rem;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.variant-card:hover {
  border-color: rgba(96, 213, 255, 0.35);
}

.variant-card--active {
  border-color: rgba(96, 213, 255, 0.75);
  transform: translateY(-1px);
}

.variant-card header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.75rem;
}

.variant-card h5 {
  margin: 0;
  font-size: 1rem;
}

.variant-card__badge {
  background: rgba(159, 123, 255, 0.2);
  border: 1px solid rgba(159, 123, 255, 0.45);
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.variant-card p {
  margin: 0;
  color: rgba(240, 244, 255, 0.65);
}

.variant-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: rgba(240, 244, 255, 0.65);
}

.variant-card__action {
  background: none;
  border: 1px solid rgba(96, 213, 255, 0.4);
  border-radius: 999px;
  padding: 0.25rem 0.75rem;
  color: inherit;
  cursor: pointer;
}

.parameter-grid {
  display: grid;
  gap: 1rem;
}

.parameter-grid__item {
  display: grid;
  gap: 0.35rem;
  background: rgba(8, 12, 18, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 0.75rem;
}

.parameter-grid__item label {
  font-size: 0.9rem;
  font-weight: 600;
}

.parameter-grid__item select {
  background: rgba(3, 6, 10, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 0.4rem 0.5rem;
  color: inherit;
}

.parameter-grid__item small {
  color: rgba(240, 244, 255, 0.55);
}

.slot-table {
  display: grid;
  gap: 0.75rem;
}

.slot-table__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(8, 12, 18, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  padding: 0.75rem;
  gap: 1rem;
}

.slot-table__info {
  display: grid;
  gap: 0.2rem;
}

.slot-table__info h5 {
  margin: 0;
  font-size: 0.95rem;
}

.slot-table__info span {
  color: rgba(240, 244, 255, 0.6);
}

.slot-table__controls {
  display: grid;
  gap: 0.25rem;
}

.slot-table__controls label {
  font-size: 0.85rem;
  color: rgba(240, 244, 255, 0.6);
}

.slot-table__controls input {
  width: 5rem;
  background: rgba(3, 6, 10, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 0.35rem 0.5rem;
  color: inherit;
}

.encounter-editor__footer {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}

.encounter-editor__footer button {
  flex: 1;
  background: rgba(9, 14, 20, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 0.55rem 0.75rem;
  color: inherit;
  cursor: pointer;
}

.encounter-editor__footer button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
