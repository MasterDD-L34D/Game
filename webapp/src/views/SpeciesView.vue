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
        <div class="sidebar-card">
          <h3>Stato curazione</h3>
          <p><strong>{{ curated }}</strong> specie curate su <strong>{{ total }}</strong> candidate.</p>
        </div>
        <div class="sidebar-card">
          <h3>Shortlist</h3>
          <ul>
            <li v-for="item in shortlist" :key="item">{{ item }}</li>
          </ul>
        </div>
        <div class="sidebar-card" v-if="requestSummary">
          <h3>Richiesta orchestrator</h3>
          <p><strong>ID:</strong> {{ requestSummary.id }}</p>
          <p><strong>Bioma:</strong> {{ requestSummary.biome }}</p>
          <p><strong>Fallback:</strong> {{ requestSummary.fallback }}</p>
        </div>
        <div class="sidebar-card sidebar-card--info" v-if="validationDetails.total">
          <h3>Validazione runtime</h3>
          <p><strong>Messaggi:</strong> {{ validationDetails.total }}</p>
          <p v-if="validationDetails.warnings"><strong>Warning:</strong> {{ validationDetails.warnings }}</p>
          <p v-if="validationDetails.corrected">Blueprint corretto dai validator.</p>
          <p v-if="validationDetails.discarded">Elementi scartati: {{ validationDetails.discarded }}</p>
          <ul class="sidebar-card__validation">
            <li v-for="message in validationPreview" :key="message.code || message.message">
              <span class="sidebar-card__badge" :data-level="message.level || 'info'">{{ message.level || 'info' }}</span>
              <span class="sidebar-card__text">{{ message.message }}</span>
            </li>
          </ul>
        </div>
        <div class="sidebar-card sidebar-card--info" v-else>
          <h3>Validazione runtime</h3>
          <p>Nessun messaggio dai validator per l'ultima generazione.</p>
        </div>
        <div class="sidebar-card sidebar-card--loading" v-if="loading">
          <p>Generazione specie in corso…</p>
        </div>
        <div class="sidebar-card sidebar-card--info" v-else-if="traitDiagnosticsLoading">
          <h3>Trait QA</h3>
          <p>Sincronizzazione della coverage in corso…</p>
        </div>
        <div class="sidebar-card sidebar-card--error" v-else-if="traitDiagnosticsErrorMessage">
          <h3>Trait QA</h3>
          <p>{{ traitDiagnosticsErrorMessage }}</p>
        </div>
        <div class="sidebar-card sidebar-card--qa" v-else-if="traitComplianceBadges.length">
          <h3>Trait QA</h3>
          <ul class="sidebar-card__badges">
            <li v-for="badge in traitComplianceBadges" :key="badge.id">
              <span class="sidebar-card__badge-label" :data-tone="badge.tone || 'neutral'">{{ badge.label }}</span>
              <span class="sidebar-card__badge-value">{{ badge.value }}</span>
            </li>
          </ul>
          <p v-if="traitComplianceTimestamp" class="sidebar-card__meta">Aggiornato {{ traitComplianceTimestamp }}</p>
        </div>
        <div class="sidebar-card sidebar-card--error" v-if="errorMessage">
          <h3>Errore orchestrator</h3>
          <p>{{ errorMessage }}</p>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed, toRefs } from 'vue';
import SpeciesPanel from '../components/SpeciesPanel.vue';

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
  color: rgba(240, 244, 255, 0.7);
}

.flow-view__content {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(220px, 1fr);
  gap: 1.25rem;
}

.flow-view__sidebar {
  display: grid;
  gap: 1rem;
}

.sidebar-card {
  background: rgba(9, 14, 20, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1rem;
  display: grid;
  gap: 0.5rem;
}

.sidebar-card h3 {
  margin: 0;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(240, 244, 255, 0.7);
}

.sidebar-card p {
  margin: 0;
  color: #f0f4ff;
}

.sidebar-card ul {
  margin: 0;
  padding-left: 1.25rem;
  color: rgba(240, 244, 255, 0.8);
  display: grid;
  gap: 0.25rem;
}

.sidebar-card__badges {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.4rem;
}

.sidebar-card__badges li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.sidebar-card__badge-label {
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: rgba(240, 244, 255, 0.12);
}

.sidebar-card__badge-label[data-tone='success'] {
  background: rgba(46, 204, 113, 0.22);
  color: #c9ffde;
}

.sidebar-card__badge-label[data-tone='warning'] {
  background: rgba(241, 196, 15, 0.2);
  color: #ffe7a3;
}

.sidebar-card__badge-label[data-tone='critical'] {
  background: rgba(231, 76, 60, 0.22);
  color: #ffd0d0;
}

.sidebar-card__badge-value {
  font-weight: 600;
  font-size: 0.85rem;
}

.sidebar-card__meta {
  margin: 0.35rem 0 0;
  font-size: 0.75rem;
  color: rgba(240, 244, 255, 0.65);
}

.sidebar-card--qa {
  border: 1px solid rgba(39, 121, 255, 0.25);
  background: rgba(14, 24, 40, 0.7);
}

.sidebar-card--info {
  border-color: rgba(96, 213, 255, 0.22);
}

.sidebar-card--loading {
  border-style: dashed;
  color: rgba(240, 244, 255, 0.7);
}

.sidebar-card--error {
  border-color: rgba(244, 96, 96, 0.4);
  background: rgba(244, 96, 96, 0.12);
  color: rgba(255, 210, 210, 0.95);
}

.sidebar-card__validation {
  list-style: none;
  margin: 0.25rem 0 0;
  padding: 0;
  display: grid;
  gap: 0.35rem;
}

.sidebar-card__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.2rem;
  padding: 0.15rem 0.4rem;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.65rem;
  margin-right: 0.5rem;
  background: rgba(96, 213, 255, 0.15);
  color: #61d5ff;
}

.sidebar-card__badge[data-level='warning'] {
  background: rgba(244, 196, 96, 0.18);
  color: #f4c460;
}

.sidebar-card__badge[data-level='error'] {
  background: rgba(244, 96, 96, 0.2);
  color: #ff7f7f;
}

.sidebar-card__text {
  display: inline-block;
  color: rgba(240, 244, 255, 0.82);
  font-size: 0.9rem;
}
</style>
