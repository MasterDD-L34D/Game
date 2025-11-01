<template>
  <section class="flow-view">
    <header class="flow-view__header">
      <h2>Specie prioritario</h2>
      <p>Curazione attuale e shortlist degli organismi selezionati.</p>
    </header>
    <div class="flow-view__content">
      <SpeciesPanel
        :species="species"
        :meta="meta"
        :validation="validation"
        :trait-catalog="traitCatalog"
        :trait-compliance="traitCompliance"
      />
      <aside class="flow-view__sidebar">
        <PokedexSpeciesCard title="Stato curazione" icon="🧬" tone="success">
          <div class="flow-view__metrics">
            <PokedexTelemetryBadge label="Curate" :value="curated" tone="success" />
            <PokedexTelemetryBadge label="Candidate" :value="total" tone="warning" />
            <PokedexTelemetryBadge label="Copertura" :value="`${coveragePercent}%`" tone="success" />
          </div>
        </PokedexSpeciesCard>

        <PokedexSpeciesCard title="Shortlist" icon="📋">
          <ul class="pokedex-card__list">
            <li v-if="!shortlist.length">Nessuna shortlist disponibile.</li>
            <li v-for="item in shortlist" :key="item">{{ item }}</li>
          </ul>
        </PokedexSpeciesCard>

        <PokedexSpeciesCard v-if="requestSummary" title="Richiesta orchestrator" icon="🛰">
          <ul class="pokedex-card__list">
            <li><strong>ID:</strong> {{ requestSummary.id }}</li>
            <li><strong>Bioma:</strong> {{ requestSummary.biome }}</li>
            <li><strong>Fallback:</strong> {{ requestSummary.fallback }}</li>
          </ul>
        </PokedexSpeciesCard>

        <PokedexSpeciesCard :tone="validationTone" title="Validazione runtime" icon="🧪">
          <template #badge>
            <PokedexTelemetryBadge label="Messaggi" :value="validationDetails.total" :tone="validationTone" />
          </template>
          <template v-if="validationDetails.total">
            <p class="flow-view__text">Blueprint curato con risultati runtime.</p>
            <ul class="pokedex-card__badge-list">
              <li v-if="validationDetails.errors" class="pokedex-card__badge-item">
                <span class="pokedex-card__badge-label" data-tone="critical">Errori</span>
                <span class="pokedex-card__badge-value">{{ validationDetails.errors }}</span>
              </li>
              <li v-if="validationDetails.warnings" class="pokedex-card__badge-item">
                <span class="pokedex-card__badge-label" data-tone="warning">Warning</span>
                <span class="pokedex-card__badge-value">{{ validationDetails.warnings }}</span>
              </li>
              <li v-if="validationDetails.corrected" class="pokedex-card__badge-item">
                <span class="pokedex-card__badge-label" data-tone="success">Correzioni</span>
                <span class="pokedex-card__badge-value">{{ validationDetails.corrected }}</span>
              </li>
              <li v-if="validationDetails.discarded" class="pokedex-card__badge-item">
                <span class="pokedex-card__badge-label" data-tone="critical">Scartati</span>
                <span class="pokedex-card__badge-value">{{ validationDetails.discarded }}</span>
              </li>
            </ul>
            <ul class="flow-view__validation">
              <li v-for="message in validationPreview" :key="message.code || message.message">
                <span class="flow-view__validation-badge" :data-level="message.level || 'info'">{{
                  message.level || 'info'
                }}</span>
                <span>{{ message.message }}</span>
              </li>
            </ul>
          </template>
          <p v-else class="flow-view__text">Nessun messaggio dai validator per l'ultima generazione.</p>
        </PokedexSpeciesCard>

        <PokedexSpeciesCard v-if="loading" tone="warning" title="Generazione" icon="⏳">
          <p class="flow-view__text">Generazione specie in corso…</p>
        </PokedexSpeciesCard>
        <PokedexSpeciesCard v-else-if="traitDiagnosticsLoading" tone="warning" title="Trait QA" icon="📡">
          <p class="flow-view__text">Sincronizzazione della coverage in corso…</p>
        </PokedexSpeciesCard>
        <PokedexSpeciesCard
          v-else-if="traitDiagnosticsErrorMessage"
          tone="critical"
          title="Trait QA"
          icon="⚠"
        >
          <p class="flow-view__text">{{ traitDiagnosticsErrorMessage }}</p>
        </PokedexSpeciesCard>
        <PokedexSpeciesCard v-else-if="traitComplianceBadges.length" title="Trait QA" icon="🛰">
          <ul class="pokedex-card__badge-list">
            <li v-for="badge in traitComplianceBadges" :key="badge.id" class="pokedex-card__badge-item">
              <span class="pokedex-card__badge-label" :data-tone="badge.tone || 'neutral'">{{ badge.label }}</span>
              <span class="pokedex-card__badge-value">{{ badge.value }}</span>
            </li>
          </ul>
          <p v-if="traitComplianceTimestamp" class="flow-view__meta">Aggiornato {{ traitComplianceTimestamp }}</p>
        </PokedexSpeciesCard>

        <PokedexSpeciesCard v-if="errorMessage" tone="critical" title="Errore orchestrator" icon="🚨">
          <p class="flow-view__text">{{ errorMessage }}</p>
        </PokedexSpeciesCard>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed, toRefs } from 'vue';
import SpeciesPanel from '../components/SpeciesPanel.vue';
import PokedexSpeciesCard from '../components/pokedex/PokedexSpeciesCard.vue';
import PokedexTelemetryBadge from '../components/pokedex/PokedexTelemetryBadge.vue';

const props = defineProps({
  species: {
    type: Object,
    default: null,
  },
  status: {
    type: Object,
    required: true,
  },
  meta: {
    type: Object,
    default: () => ({}),
  },
  validation: {
    type: Object,
    default: () => ({ messages: [], discarded: [], corrected: null }),
  },
  requestId: {
    type: [String, null],
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: [String, Object, null],
    default: null,
  },
  traitCatalog: {
    type: Object,
    default: () => ({ traits: [], labels: {}, synergyMap: {} }),
  },
  traitCompliance: {
    type: Object,
    default: () => ({ badges: [], summary: {}, generatedAt: null }),
  },
  traitDiagnosticsLoading: {
    type: Boolean,
    default: false,
  },
  traitDiagnosticsError: {
    type: [String, Object, null],
    default: null,
  },
  traitDiagnosticsMeta: {
    type: Object,
    default: () => ({}),
  },
});

const {
  species,
  status,
  meta,
  validation,
  requestId,
  loading,
  error,
  traitCatalog,
  traitCompliance,
  traitDiagnosticsLoading,
  traitDiagnosticsError,
  traitDiagnosticsMeta,
} = toRefs(props);

const curated = computed(() => status.value.curated || 0);
const total = computed(() => status.value.total || 0);
const shortlist = computed(() => status.value.shortlist || []);

const coveragePercent = computed(() => {
  if (!total.value) {
    return 0;
  }
  return Math.min(100, Math.round((curated.value / total.value) * 100));
});

const requestSummary = computed(() => {
  const request = meta.value || {};
  const id = requestId.value || request.request_id || request.requestId;
  const biome = request.biome_id || request.biomeId || '—';
  const fallback = request.fallback_used === undefined
    ? 'Non calcolato'
    : request.fallback_used
      ? 'Attivato'
      : 'Non utilizzato';
  if (!id && biome === '—' && fallback === 'Non calcolato') {
    return null;
  }
  return {
    id: id || '—',
    biome,
    fallback,
  };
});

const validationMessages = computed(() => {
  const messages = Array.isArray(validation.value?.messages) ? validation.value.messages : [];
  return messages.filter(Boolean);
});

const validationDetails = computed(() => {
  const messages = validationMessages.value;
  const warnings = messages.filter((message) => (message.level || message.severity) === 'warning').length;
  const errors = messages.filter((message) => (message.level || message.severity) === 'error').length;
  const discarded = Array.isArray(validation.value?.discarded) ? validation.value.discarded.length : 0;
  const corrected = validation.value?.corrected ? 1 : 0;
  return {
    total: messages.length,
    warnings,
    errors,
    discarded,
    corrected,
  };
});

const validationPreview = computed(() => validationMessages.value.slice(0, 3));

const validationTone = computed(() => {
  if (validationDetails.value.errors) {
    return 'critical';
  }
  if (validationDetails.value.warnings) {
    return 'warning';
  }
  if (validationDetails.value.total) {
    return 'success';
  }
  return 'neutral';
});

const errorMessage = computed(() => {
  if (!error.value) {
    return '';
  }
  if (typeof error.value === 'string') {
    return error.value;
  }
  if (error.value && typeof error.value.message === 'string') {
    return error.value.message;
  }
  return String(error.value);
});

const traitComplianceBadges = computed(() => {
  const badges = Array.isArray(traitCompliance.value?.badges) ? traitCompliance.value.badges : [];
  return badges.filter(Boolean);
});

const traitComplianceTimestamp = computed(() => {
  const generatedAt = traitCompliance.value?.generatedAt || traitDiagnosticsMeta.value?.fetched_at;
  if (!generatedAt) {
    return '';
  }
  const date = new Date(generatedAt);
  if (Number.isNaN(date.getTime())) {
    return generatedAt;
  }
  return new Intl.DateTimeFormat('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
});

const traitDiagnosticsErrorMessage = computed(() => {
  if (!traitDiagnosticsError.value) {
    return '';
  }
  if (typeof traitDiagnosticsError.value === 'string') {
    return traitDiagnosticsError.value;
  }
  if (typeof traitDiagnosticsError.value.message === 'string') {
    return traitDiagnosticsError.value.message;
  }
  return String(traitDiagnosticsError.value);
});
</script>

<style scoped>
.flow-view {
  display: grid;
  gap: 1.5rem;
}

.flow-view__header h2 {
  margin: 0;
  font-size: 1.45rem;
}

.flow-view__header p {
  margin: 0.35rem 0 0;
  color: var(--pokedex-text-secondary);
}

.flow-view__content {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(260px, 1fr);
  gap: 1.5rem;
}

.flow-view__sidebar {
  display: grid;
  gap: 1rem;
}

.flow-view__metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.flow-view__text {
  margin: 0;
  font-size: 0.85rem;
  color: var(--pokedex-text-primary);
}

.flow-view__meta {
  margin: 0.4rem 0 0;
  font-size: 0.75rem;
  color: var(--pokedex-text-secondary);
}

.flow-view__validation {
  list-style: none;
  margin: 0.75rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.45rem;
}

.flow-view__validation li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--pokedex-text-primary);
}

.flow-view__validation-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.2rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.65rem;
  background: rgba(77, 208, 255, 0.18);
  color: var(--pokedex-info);
}

.flow-view__validation-badge[data-level='warning'] {
  background: rgba(255, 200, 87, 0.22);
  color: rgba(255, 241, 198, 0.92);
}

.flow-view__validation-badge[data-level='error'] {
  background: rgba(255, 91, 107, 0.22);
  color: rgba(255, 219, 228, 0.95);
}

@media (max-width: 1080px) {
  .flow-view__content {
    grid-template-columns: 1fr;
  }
}
</style>
