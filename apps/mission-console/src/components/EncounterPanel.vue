<template>
  <section class="encounter-panel" v-if="encounter">
    <header class="encounter-panel__header">
      <div class="encounter-panel__title-block">
        <h2 class="encounter-panel__title">{{ encounter.templateName }}</h2>
        <p class="encounter-panel__summary">{{ activeSeed.summary }}</p>
      </div>
      <div class="encounter-panel__meta">
        <span class="encounter-panel__badge">{{ activeSeed.metrics.threat.tier }}</span>
        <span class="encounter-panel__biome">{{ encounter.biomeName }}</span>
      </div>
    </header>

    <div v-if="hasVariants" class="encounter-panel__variant-selector">
      <label class="encounter-panel__variant-label" for="encounter-variant">Scenario</label>
      <select
        id="encounter-variant"
        class="encounter-panel__variant-select"
        v-model="selectedVariant"
        data-testid="variant-select"
      >
        <option v-for="(variant, index) in encounter.variants" :key="variant.id" :value="index">
          {{ variantLabel(variant, index) }}
        </option>
      </select>
    </div>

    <article class="encounter-panel__description">
      <p>{{ activeSeed.description }}</p>
    </article>

    <section class="encounter-panel__slots">
      <h3>Composizione</h3>
      <ul class="encounter-panel__slot-list">
        <li v-for="slot in activeSeed.slots" :key="slot.id" class="encounter-panel__slot">
          <header>
            <h4>{{ slot.title }} <span class="encounter-panel__slot-qty">× {{ slot.quantity }}</span></h4>
          </header>
          <ul class="encounter-panel__specimen-list">
            <li v-for="specimen in slot.species" :key="specimen.id">
              <span class="encounter-panel__specimen-name">{{ specimen.display_name }}</span>
              <small class="encounter-panel__specimen-role">{{ specimen.role_trofico }}</small>
            </li>
          </ul>
        </li>
      </ul>
    </section>

    <section v-if="activeSeed.parametersList.length" class="encounter-panel__parameters">
      <h3>Parametri</h3>
      <dl>
        <div v-for="parameter in activeSeed.parametersList" :key="parameter.id">
          <dt>{{ parameter.label }}</dt>
          <dd>{{ parameter.value.label }}</dd>
        </div>
      </dl>
    </section>

    <section v-if="activeSeed.warnings.length" class="encounter-panel__warnings">
      <h3>Avvisi</h3>
      <ul>
        <li v-for="warning in activeSeed.warnings" :key="warning.code + warning.slot">
          {{ formatWarning(warning) }}
        </li>
      </ul>
    </section>
  </section>
  <section v-else class="encounter-panel encounter-panel--empty">
    <p>Nessun encounter generato.</p>
  </section>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  encounter: {
    type: Object,
    default: null,
  },
  initialVariant: {
    type: Number,
    default: 0,
  },
});

const selectedVariant = ref(props.initialVariant);

watch(
  () => props.encounter,
  () => {
    selectedVariant.value = props.initialVariant;
  }
);

watch(
  () => props.initialVariant,
  (value) => {
    selectedVariant.value = value;
  }
);

const hasVariants = computed(() => (props.encounter?.variants?.length || 0) > 1);

const normalizedVariants = computed(() => {
  if (!props.encounter) {
    return [];
  }
  const base = props.encounter.variants || [props.encounter.seed || props.encounter];
  return base.map((variant) => ({
    ...variant,
    metrics: variant.metrics || { threat: { tier: 'T?' } },
    parametersList: Object.entries(variant.parameters || {}).map(([id, value]) => ({
      id,
      label: props.encounter.parameterLabels?.[id] || id,
      value,
    })),
    warnings: variant.warnings || [],
  }));
});

const activeSeed = computed(() => {
  const index = Math.min(Math.max(selectedVariant.value, 0), normalizedVariants.value.length - 1);
  return normalizedVariants.value[index] || {
    summary: '',
    description: '',
    slots: [],
    metrics: { threat: { tier: 'T?' } },
    parametersList: [],
    warnings: [],
  };
});

const encounter = computed(() => {
  if (!props.encounter) {
    return null;
  }
  return {
    templateName: props.encounter.templateName || props.encounter.template_id || 'Encounter',
    biomeName: props.encounter.biomeName || props.encounter.biome?.name || props.encounter.biome?.id || 'Biome sconosciuto',
    variants: normalizedVariants.value,
  };
});

function variantLabel(variant, index) {
  const parameterText = variant.parametersList
    .map((item) => `${item.label}: ${item.value.label}`)
    .join(' · ');
  if (parameterText) {
    return `${index + 1}. ${parameterText}`;
  }
  return `${index + 1}. Configurazione`;
}

function formatWarning(warning) {
  if (warning.slot) {
    return `${warning.code} (${warning.slot})`;
  }
  return warning.code;
}
</script>

<style scoped>
.encounter-panel {
  background: #0a0d12;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 1.5rem;
  color: #f0f4ff;
  display: grid;
  gap: 1.25rem;
}

.encounter-panel__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 0.75rem;
}

.encounter-panel__title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
}

.encounter-panel__summary {
  margin: 0.25rem 0 0;
  color: rgba(240, 244, 255, 0.82);
}

.encounter-panel__meta {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.encounter-panel__badge {
  background: rgba(231, 76, 60, 0.2);
  border: 1px solid rgba(231, 76, 60, 0.4);
  border-radius: 999px;
  padding: 0.3rem 0.75rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.encounter-panel__biome {
  color: rgba(240, 244, 255, 0.75);
  font-size: 0.9rem;
}

.encounter-panel__variant-selector {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.encounter-panel__variant-label {
  font-size: 0.85rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: rgba(240, 244, 255, 0.65);
}

.encounter-panel__variant-select {
  background: rgba(10, 15, 22, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  color: inherit;
  padding: 0.4rem 0.6rem;
}

.encounter-panel__description p {
  margin: 0;
  line-height: 1.6;
}

.encounter-panel__slots {
  background: rgba(10, 15, 22, 0.6);
  padding: 1rem;
  border-radius: 10px;
}

.encounter-panel__slots h3 {
  margin: 0 0 0.75rem;
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.encounter-panel__slot-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.75rem;
}

.encounter-panel__slot h4 {
  margin: 0;
  font-size: 1.05rem;
}

.encounter-panel__slot-qty {
  font-size: 0.9rem;
  color: rgba(240, 244, 255, 0.7);
}

.encounter-panel__specimen-list {
  margin: 0.35rem 0 0;
  padding-left: 1.1rem;
  color: rgba(240, 244, 255, 0.85);
  display: grid;
  gap: 0.15rem;
}

.encounter-panel__specimen-name {
  font-weight: 600;
}

.encounter-panel__specimen-role {
  margin-left: 0.35rem;
  color: rgba(240, 244, 255, 0.6);
}

.encounter-panel__parameters,
.encounter-panel__warnings {
  background: rgba(10, 15, 22, 0.6);
  padding: 1rem;
  border-radius: 10px;
}

.encounter-panel__parameters h3,
.encounter-panel__warnings h3 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.encounter-panel__parameters dl {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.5rem 1rem;
  margin: 0;
}

.encounter-panel__parameters dt {
  font-weight: 600;
  color: rgba(240, 244, 255, 0.75);
}

.encounter-panel__parameters dd {
  margin: 0;
  font-size: 0.95rem;
}

.encounter-panel__warnings ul {
  margin: 0;
  padding-left: 1.2rem;
}

.encounter-panel--empty {
  text-align: center;
  color: rgba(240, 244, 255, 0.6);
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 2rem;
}
</style>
