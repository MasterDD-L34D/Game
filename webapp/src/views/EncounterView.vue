<template>
  <section class="encounter-workspace">
    <header class="encounter-workspace__header">
      <div>
        <h2>Editor encounter</h2>
        <p>Configura template, parametri e slot prima della visualizzazione finale.</p>
      </div>
      <div class="encounter-workspace__summary">
        <PokedexTelemetryBadge label="Seed" :value="summary.seeds" />
        <PokedexTelemetryBadge label="Varianti" :value="summary.variants" />
        <PokedexTelemetryBadge
          label="Warning"
          :value="summary.warnings"
          :tone="summary.warnings ? 'warning' : 'success'"
        />
        <PokedexTelemetryBadge v-if="lastExportMessage" label="Ultimo export" tone="success">
          {{ lastExportMessage }}
        </PokedexTelemetryBadge>
      </div>
    </header>
    <div class="encounter-workspace__grid">
      <EncounterEditor
        v-if="draftEncounter"
        :encounter="draftEncounter"
        :variants="draftEncounter.variants"
        :selected-variant-id="selectedVariantId"
        :metrics-by-variant="metricsByVariant"
        :comparison-selection="comparisonSelection"
        @select-variant="onSelectVariant"
        @update-parameter="onUpdateParameter"
        @update-slot="onUpdateSlot"
        @toggle-comparison="toggleComparison"
      />
      <div class="encounter-workspace__preview" v-if="previewEncounter">
        <EncounterPanel :encounter="previewEncounter" :initial-variant="activeVariantIndex" />
        <EncounterMetricsPanel :metrics="activeMetrics" :suggestions="activeSuggestions" />
      </div>
    </div>
    <VariantComparison
      v-if="draftEncounter"
      :variants="draftEncounter.variants"
      :metrics-by-variant="metricsByVariant"
      :selected-ids="comparisonSelection"
      :parameter-labels="draftEncounter.parameterLabels"
      @toggle="toggleComparison"
      @export="handleExport"
    />
  </section>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import EncounterPanel from '../components/EncounterPanel.vue';
import EncounterEditor from '../components/encounter/EncounterEditor.vue';
import EncounterMetricsPanel from '../components/encounter/EncounterMetricsPanel.vue';
import VariantComparison from '../components/encounter/VariantComparison.vue';
import PokedexTelemetryBadge from '../components/pokedex/PokedexTelemetryBadge.vue';
import { ENCOUNTER_BLUEPRINTS } from '../state/generator/encounters.js';
import { calculateEncounterMetrics, buildEncounterSuggestions } from '../services/encounterMetrics.js';

const props = defineProps({
  encounter: {
    type: Object,
    required: true,
  },
  summary: {
    type: Object,
    required: true,
  },
});

const selectedVariantId = ref(null);
const comparisonSelection = ref([]);
const lastExport = ref(null);

const templateDefinition = computed(() => {
  if (!props.encounter) {
    return null;
  }
  if (props.encounter.templateId) {
    return ENCOUNTER_BLUEPRINTS.find((template) => template.id === props.encounter.templateId) || null;
  }
  return (
    ENCOUNTER_BLUEPRINTS.find((template) => template.name === props.encounter.templateName) || null
  );
});

const draftEncounter = ref(null);

watch(
  () => props.encounter,
  (value) => {
    if (!value) {
      draftEncounter.value = null;
      selectedVariantId.value = null;
      comparisonSelection.value = [];
      return;
    }
    const variants = value.variants?.map((variant) => ({
      id: variant.id,
      summary: variant.summary,
      description: variant.description,
      parameters: reactive({ ...variant.parameters }),
      slots: variant.slots.map((slot) =>
        reactive({
          id: slot.id,
          title: slot.title,
          quantity: slot.quantity,
          species: slot.species.map((specimen) => ({ ...specimen })),
        })
      ),
      warnings: [...(variant.warnings || [])],
      metrics: { ...(variant.metrics || {}) },
    })) || [];
    draftEncounter.value = reactive({
      templateName: value.templateName,
      biomeName: value.biomeName,
      parameterLabels: value.parameterLabels || {},
      variants,
    });
    selectedVariantId.value = variants[0]?.id || null;
    comparisonSelection.value = variants.slice(0, 2).map((variant) => variant.id);
  },
  { immediate: true }
);

const metricsByVariant = computed(() => {
  const record = {};
  if (!draftEncounter.value) {
    return record;
  }
  for (const variant of draftEncounter.value.variants) {
    record[variant.id] = calculateEncounterMetrics(templateDefinition.value, variant);
  }
  return record;
});

const previewEncounter = computed(() => {
  if (!draftEncounter.value) {
    return null;
  }
  return {
    templateName: draftEncounter.value.templateName,
    biomeName: draftEncounter.value.biomeName,
    parameterLabels: draftEncounter.value.parameterLabels,
    variants: draftEncounter.value.variants.map((variant) => ({
      ...variant,
      metrics: {
        ...variant.metrics,
        threat: metricsByVariant.value[variant.id]?.threat || variant.metrics?.threat || { tier: 'T?' },
      },
    })),
  };
});

const activeVariantIndex = computed(() => {
  if (!draftEncounter.value) {
    return 0;
  }
  return draftEncounter.value.variants.findIndex((variant) => variant.id === selectedVariantId.value);
});

const activeVariant = computed(() => {
  if (!draftEncounter.value) {
    return null;
  }
  return draftEncounter.value.variants.find((variant) => variant.id === selectedVariantId.value) || null;
});

const activeMetrics = computed(() => {
  if (!activeVariant.value) {
    return { threat: { tier: 'T?', score: 0 }, rarityMix: { total: 0, counts: {}, distribution: {}, dominant: null } };
  }
  return metricsByVariant.value[activeVariant.value.id];
});

const activeSuggestions = computed(() => buildEncounterSuggestions(activeMetrics.value));

const lastExportMessage = computed(() => {
  if (!lastExport.value) {
    return '';
  }
  return `Esportato ${lastExport.value.variant} → ${lastExport.value.target}`;
});

function onSelectVariant(variantId) {
  selectedVariantId.value = variantId;
}

function onUpdateParameter({ variantId, parameterId, value }) {
  if (!draftEncounter.value) {
    return;
  }
  const variant = draftEncounter.value.variants.find((item) => item.id === variantId);
  if (!variant) {
    return;
  }
  variant.parameters[parameterId] = { ...variant.parameters[parameterId], ...value };
}

function onUpdateSlot({ variantId, slotId, quantity }) {
  if (!draftEncounter.value) {
    return;
  }
  const variant = draftEncounter.value.variants.find((item) => item.id === variantId);
  if (!variant) {
    return;
  }
  const slot = variant.slots.find((item) => item.id === slotId);
  if (!slot) {
    return;
  }
  slot.quantity = quantity;
}

function toggleComparison(variantId) {
  const set = new Set(comparisonSelection.value);
  if (set.has(variantId)) {
    set.delete(variantId);
  } else {
    set.add(variantId);
  }
  comparisonSelection.value = Array.from(set).slice(0, 3);
}

function handleExport({ variantId, target }) {
  if (!draftEncounter.value) {
    return;
  }
  const variant = draftEncounter.value.variants.find((item) => item.id === variantId);
  if (!variant) {
    return;
  }
  lastExport.value = {
    variant: variant.summary,
    target: target === 'pack' ? 'Pack' : 'Encounter Builder',
    timestamp: new Date(),
  };
}
</script>

<style scoped>
.encounter-workspace {
  display: grid;
  gap: 1.5rem;
}

.encounter-workspace__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.encounter-workspace__header h2 {
  margin: 0;
  font-size: 1.45rem;
}

.encounter-workspace__header p {
  margin: 0.35rem 0 0;
  color: var(--pokedex-text-secondary);
}

.encounter-workspace__summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.encounter-workspace__summary .pokedex-telemetry {
  min-width: 130px;
}

.encounter-workspace__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 1.5rem;
}

.encounter-workspace__preview {
  display: grid;
  gap: 1rem;
}

@media (max-width: 1080px) {
  .encounter-workspace__grid {
    grid-template-columns: 1fr;
  }
}
</style>
