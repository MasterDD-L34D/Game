<template>
  <section class="variant-comparison">
    <header>
      <h3>Confronto varianti</h3>
      <p>Seleziona fino a tre varianti per confrontarle fianco a fianco ed esportarle.</p>
    </header>
    <ul class="variant-comparison__selector">
      <li v-for="variant in variants" :key="variant.id">
        <label>
          <input
            type="checkbox"
            :value="variant.id"
            :checked="selectedIds.includes(variant.id)"
            @change="toggleVariant(variant.id)"
          />
          <span>{{ variant.summary }}</span>
          <small>{{ metricsByVariant[variant.id]?.threat?.tier || 'T?' }}</small>
        </label>
      </li>
    </ul>
    <div v-if="selectedVariants.length" class="variant-comparison__grid">
      <article v-for="variant in selectedVariants" :key="variant.id" class="comparison-card">
        <header>
          <h4>{{ variant.summary }}</h4>
          <span class="comparison-card__badge">{{ metricsByVariant[variant.id]?.threat?.tier || 'T?' }}</span>
        </header>
        <p class="comparison-card__description">{{ variant.description }}</p>
        <section class="comparison-card__metrics">
          <h5>Metriche</h5>
          <ul>
            <li>
              <strong>Minaccia:</strong>
              <span>{{ metricsByVariant[variant.id]?.threat?.score.toFixed(2) }}</span>
            </li>
            <li>
              <strong>Rarità dominante:</strong>
              <span>{{ rarityDominant(metricsByVariant[variant.id]) }}</span>
            </li>
          </ul>
        </section>
        <section class="comparison-card__parameters">
          <h5>Parametri</h5>
          <ul>
            <li
              v-for="(parameter, parameterId) in variant.parameters"
              :key="parameterId"
            >
              {{ parameterLabel(parameterId) }}: <strong>{{ parameter.label }}</strong>
            </li>
          </ul>
        </section>
        <footer class="comparison-card__actions">
          <button type="button" @click="exportVariant(variant.id, 'pack')">Esporta nel pack</button>
          <button type="button" @click="exportVariant(variant.id, 'builder')">Invia a Encounter Builder</button>
        </footer>
      </article>
    </div>
    <p v-else class="variant-comparison__empty">Seleziona almeno una variante da confrontare.</p>
  </section>
</template>

<script setup>
import { computed } from 'vue';

const emits = defineEmits(['toggle', 'export']);

const props = defineProps({
  variants: {
    type: Array,
    default: () => [],
  },
  metricsByVariant: {
    type: Object,
    default: () => ({}),
  },
  selectedIds: {
    type: Array,
    default: () => [],
  },
  parameterLabels: {
    type: Object,
    default: () => ({}),
  },
});

const selectedVariants = computed(() =>
  props.variants.filter((variant) => props.selectedIds.includes(variant.id))
);

function toggleVariant(variantId) {
  emits('toggle', variantId);
}

function exportVariant(variantId, target) {
  emits('export', { variantId, target });
}

function rarityDominant(metrics) {
  if (!metrics?.rarityMix?.dominant) {
    return '—';
  }
  const label = metrics.rarityMix.dominant;
  const percent = metrics.rarityMix.distribution[label];
  return percent ? `${label} (${percent}%)` : label;
}

function parameterLabel(parameterId) {
  return props.parameterLabels?.[parameterId] || parameterId;
}
</script>

<style scoped>
.variant-comparison {
  margin-top: 2rem;
  background: rgba(5, 8, 13, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1.5rem;
  display: grid;
  gap: 1.25rem;
}

.variant-comparison header {
  display: grid;
  gap: 0.35rem;
}

.variant-comparison header h3 {
  margin: 0;
  font-size: 1.15rem;
}

.variant-comparison header p {
  margin: 0;
  color: rgba(240, 244, 255, 0.7);
}

.variant-comparison__selector {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.variant-comparison__selector label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(9, 14, 20, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  cursor: pointer;
}

.variant-comparison__selector small {
  color: rgba(240, 244, 255, 0.6);
}

.variant-comparison__grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.comparison-card {
  display: grid;
  gap: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 1rem;
  background: rgba(8, 12, 18, 0.9);
}

.comparison-card header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
}

.comparison-card h4 {
  margin: 0;
  font-size: 1rem;
}

.comparison-card__badge {
  background: rgba(96, 213, 255, 0.18);
  border: 1px solid rgba(96, 213, 255, 0.45);
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
}

.comparison-card__description {
  margin: 0;
  color: rgba(240, 244, 255, 0.65);
}

.comparison-card__metrics,
.comparison-card__parameters {
  display: grid;
  gap: 0.35rem;
}

.comparison-card__metrics h5,
.comparison-card__parameters h5 {
  margin: 0;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(240, 244, 255, 0.6);
}

.comparison-card__metrics ul,
.comparison-card__parameters ul {
  margin: 0;
  padding-left: 1rem;
  display: grid;
  gap: 0.25rem;
}

.comparison-card__actions {
  display: flex;
  gap: 0.5rem;
}

.comparison-card__actions button {
  flex: 1;
  background: rgba(9, 14, 20, 0.85);
  border: 1px solid rgba(96, 213, 255, 0.4);
  border-radius: 10px;
  padding: 0.45rem 0.6rem;
  color: inherit;
  cursor: pointer;
}

.variant-comparison__empty {
  margin: 0;
  color: rgba(240, 244, 255, 0.6);
}
</style>
