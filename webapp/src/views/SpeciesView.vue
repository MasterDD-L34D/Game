<template>
  <section class="species-view">
    <header class="species-view__header">
      <h2>Specie prioritario</h2>
      <p>Curazione attuale e shortlist degli organismi selezionati.</p>
    </header>
    <div class="species-view__layout">
      <SpeciesPanel
        :species="species"
        :meta="meta"
        :validation="validation"
        :trait-catalog="traitCatalog"
        :trait-compliance="traitCompliance"
      />
      <InsightCard
        v-model="activeSidebarTab"
        class="species-view__card"
        icon="🛰"
        title="Orchestrator insight"
        :tabs="sidebarTabs"
      >
        <template #tab-overview>
          <div class="species-view__progress" v-if="telemetryProgress.length">
            <TelemetryProgressBar
              v-for="entry in telemetryProgress"
              :key="entry.id"
              :label="entry.label"
              :current="entry.current"
              :total="entry.total"
              :percent="entry.percent"
              :value="entry.value"
              :description="entry.description"
            />
          </div>
          <p v-else class="species-view__empty">Nessuna telemetria disponibile.</p>
          <div class="species-view__meta" v-if="requestSummary || shortlist.length">
            <dl v-if="requestSummary" class="species-view__request">
              <div>
                <dt>ID orchestrator</dt>
                <dd>{{ requestSummary.id }}</dd>
              </div>
              <div>
                <dt>Bioma</dt>
                <dd>{{ requestSummary.biome }}</dd>
              </div>
              <div>
                <dt>Fallback</dt>
                <dd>{{ requestSummary.fallback }}</dd>
              </div>
            </dl>
            <div v-if="shortlist.length" class="species-view__shortlist">
              <h4>Shortlist</h4>
              <ul>
                <li v-for="item in shortlist" :key="item">{{ item }}</li>
              </ul>
            </div>
          </div>
          <p v-if="errorMessage" class="species-view__error" role="alert">{{ errorMessage }}</p>
        </template>

        <template #tab-synergy>
          <div v-if="synergyHighlights.length" class="species-view__synergy">
            <div v-for="highlight in synergyHighlights" :key="highlight.id" class="species-view__synergy-card">
              <header>
                <TraitChip :label="highlight.label" variant="synergy" />
                <span v-if="highlight.summary">{{ highlight.summary }}</span>
              </header>
              <ul v-if="highlight.items.length">
                <li v-for="traitId in highlight.items" :key="traitId">
                  <TraitChip :label="formatTraitLabel(traitId)" variant="trait" />
                </li>
              </ul>
            </div>
          </div>
          <p v-else class="species-view__empty">Nessuna sinergia registrata nel catalogo.</p>
          <div v-if="traitComplianceBadges.length" class="species-view__compliance">
            <h4>Trait QA snapshot</h4>
            <ul>
              <li v-for="badge in traitComplianceBadges" :key="badge.id">
                <span :data-tone="badge.tone || 'neutral'">{{ badge.label }}</span>
                <strong>{{ badge.value }}</strong>
              </li>
            </ul>
            <p v-if="traitComplianceTimestamp" class="species-view__timestamp">Aggiornato {{ traitComplianceTimestamp }}</p>
          </div>
        </template>

        <template #tab-qa>
          <div class="species-view__qa">
            <header>
              <h4>Validazione runtime</h4>
              <span :data-tone="validationTone">{{ validationDetails.total }} messaggi</span>
            </header>
            <p v-if="validationDetails.total" class="species-view__qa-text">
              Blueprint curato con risultati runtime. Anteprima dei primi tre eventi.
            </p>
            <p v-else class="species-view__qa-text">Nessun messaggio dai validator per l'ultima generazione.</p>
            <ul v-if="validationDetails.total" class="species-view__qa-messages">
              <li v-for="message in validationPreview" :key="message.code || message.message">
                <span :data-level="message.level || message.severity || 'info'">{{ message.level || message.severity || 'info' }}</span>
                <span>{{ message.message }}</span>
              </li>
            </ul>
            <ul v-if="validationDetails.total" class="species-view__qa-counters">
              <li v-if="validationDetails.errors">
                <strong>❗ Errori</strong>
                <span>{{ validationDetails.errors }}</span>
              </li>
              <li v-if="validationDetails.warnings">
                <strong>⚠ Warning</strong>
                <span>{{ validationDetails.warnings }}</span>
              </li>
              <li v-if="validationDetails.corrected">
                <strong>🔧 Correzioni</strong>
                <span>{{ validationDetails.corrected }}</span>
              </li>
              <li v-if="validationDetails.discarded">
                <strong>🗑 Scartati</strong>
                <span>{{ validationDetails.discarded }}</span>
              </li>
            </ul>
            <p v-if="traitDiagnosticsLoading" class="species-view__qa-text">Sincronizzazione della coverage in corso…</p>
            <p v-else-if="traitDiagnosticsErrorMessage" class="species-view__error" role="alert">{{ traitDiagnosticsErrorMessage }}</p>
          </div>
        </template>
      </InsightCard>
    </div>
  </section>
</template>

<script setup>
import { computed, ref, toRefs } from 'vue';
import SpeciesPanel from '../components/SpeciesPanel.vue';
import TraitChip from '../components/shared/TraitChip.vue';
import InsightCard from '../components/shared/InsightCard.vue';
import TelemetryProgressBar from '../components/shared/TelemetryProgressBar.vue';

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

const orchestratorTelemetry = computed(() => meta.value?.telemetry || {});

const telemetryProgress = computed(() => {
  const entries = [];
  if (total.value || curated.value) {
    entries.push({
      id: 'curation',
      label: 'Specie curate',
      current: curated.value,
      total: total.value,
      description: 'Specie confermate su totale orchestrato',
    });
  }
  const coverage = Number.isFinite(orchestratorTelemetry.value?.coverage)
    ? Number(orchestratorTelemetry.value.coverage)
    : coveragePercent.value;
  if (Number.isFinite(coverage)) {
    entries.push({
      id: 'coverage',
      label: 'Copertura shortlist',
      percent: coverage,
      value: `${Math.round(coverage)}%`,
      description: orchestratorTelemetry.value?.coverage_label || 'Allineamento shortlist/curazione',
    });
  }
  const phases = Array.isArray(orchestratorTelemetry.value?.phases)
    ? orchestratorTelemetry.value.phases
    : Array.isArray(orchestratorTelemetry.value?.stages)
      ? orchestratorTelemetry.value.stages
      : [];
  phases.forEach((phase, index) => {
    const percent = Number.isFinite(phase?.percent)
      ? Number(phase.percent)
      : Number.isFinite(phase?.coverage)
        ? Number(phase.coverage)
        : Number.isFinite(phase?.value)
          ? Number(phase.value)
          : 0;
    entries.push({
      id: `phase-${phase?.id || index}`,
      label: phase?.label || phase?.name || `Fase ${index + 1}`,
      percent,
      value: `${Math.round(Math.max(0, percent))}%`,
      description: phase?.summary || phase?.description || '',
    });
  });
  return entries;
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

const traitLabelMap = computed(() => traitCatalog.value?.labels || {});
const traitSynergyMap = computed(() => traitCatalog.value?.synergyMap || {});

const synergyHighlights = computed(() => {
  const entries = [];
  Object.entries(traitSynergyMap.value || {}).forEach(([key, value]) => {
    const list = Array.isArray(value)
      ? value
      : Array.isArray(value?.traits)
        ? value.traits
        : Array.isArray(value?.related)
          ? value.related
          : [];
    entries.push({
      id: key,
      label: traitLabelMap.value[key] || key,
      summary: Array.isArray(value?.summary)
        ? value.summary.join(', ')
        : value?.summary || '',
      items: list,
    });
  });
  return entries.slice(0, 6);
});

function formatTraitLabel(traitId) {
  return traitLabelMap.value[traitId] || traitId;
}

const sidebarTabs = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'synergy', label: 'Sinergie', icon: '🧬' },
  { id: 'qa', label: 'QA', icon: '🧪' },
];

const activeSidebarTab = ref('overview');
</script>

<style scoped>
.species-view {
  display: grid;
  gap: 1.5rem;
}

.species-view__header h2 {
  margin: 0;
  font-size: 1.45rem;
}

.species-view__header p {
  margin: 0.35rem 0 0;
  color: var(--pokedex-text-secondary);
}

.species-view__layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 1.5rem;
}

.species-view__card {
  align-self: start;
}

.species-view__progress {
  display: grid;
  gap: 0.75rem;
}

.species-view__meta {
  display: grid;
  gap: 1rem;
}

.species-view__request {
  margin: 0;
  display: grid;
  gap: 0.45rem;
}

.species-view__request div {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}

.species-view__request dt {
  margin: 0;
  font-size: 0.8rem;
  color: var(--pokedex-text-secondary);
}

.species-view__request dd {
  margin: 0;
  font-weight: 600;
}

.species-view__shortlist {
  display: grid;
  gap: 0.35rem;
}

.species-view__shortlist h4 {
  margin: 0;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--pokedex-text-secondary);
}

.species-view__shortlist ul {
  margin: 0;
  padding-left: 1.1rem;
  display: grid;
  gap: 0.25rem;
  font-size: 0.85rem;
}

.species-view__error {
  margin: 0;
  font-size: 0.8rem;
  color: rgba(255, 135, 135, 0.95);
}

.species-view__empty {
  margin: 0;
  font-size: 0.85rem;
  color: var(--pokedex-text-muted);
}

.species-view__synergy {
  display: grid;
  gap: 0.9rem;
}

.species-view__synergy-card {
  display: grid;
  gap: 0.55rem;
  padding: 0.75rem 0.85rem;
  border-radius: 1rem;
  background: rgba(7, 23, 39, 0.55);
  border: 1px solid rgba(96, 213, 255, 0.18);
}

.species-view__synergy-card header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.species-view__synergy-card header span {
  font-size: 0.75rem;
  color: var(--pokedex-text-secondary);
}

.species-view__synergy-card ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.species-view__compliance {
  display: grid;
  gap: 0.6rem;
}

.species-view__compliance h4 {
  margin: 0;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--pokedex-text-secondary);
}

.species-view__compliance ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.4rem;
}

.species-view__compliance li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.85rem;
}

.species-view__compliance li span {
  color: var(--pokedex-text-secondary);
}

.species-view__compliance li span[data-tone='critical'] {
  color: rgba(255, 135, 135, 0.95);
}

.species-view__compliance li span[data-tone='warning'] {
  color: rgba(255, 210, 130, 0.9);
}

.species-view__compliance li span[data-tone='success'] {
  color: rgba(146, 255, 230, 0.95);
}

.species-view__timestamp {
  margin: 0;
  font-size: 0.75rem;
  color: var(--pokedex-text-secondary);
}

.species-view__qa {
  display: grid;
  gap: 0.75rem;
}

.species-view__qa header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.species-view__qa header h4 {
  margin: 0;
  font-size: 1rem;
}

.species-view__qa header span {
  font-size: 0.8rem;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  background: rgba(96, 213, 255, 0.18);
}

.species-view__qa header span[data-tone='critical'] {
  background: rgba(255, 135, 135, 0.22);
}

.species-view__qa header span[data-tone='warning'] {
  background: rgba(255, 210, 130, 0.22);
}

.species-view__qa header span[data-tone='success'] {
  background: rgba(146, 255, 230, 0.22);
}

.species-view__qa-text {
  margin: 0;
  font-size: 0.85rem;
  color: var(--pokedex-text-secondary);
}

.species-view__qa-messages {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.5rem;
}

.species-view__qa-messages li {
  display: grid;
  gap: 0.35rem;
  padding: 0.55rem 0.7rem;
  border-radius: 0.8rem;
  background: rgba(7, 23, 39, 0.55);
  border: 1px solid rgba(96, 213, 255, 0.18);
}

.species-view__qa-messages li span:first-child {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--pokedex-text-secondary);
}

.species-view__qa-messages li span:first-child[data-level='warning'] {
  color: rgba(255, 210, 130, 0.9);
}

.species-view__qa-messages li span:first-child[data-level='error'] {
  color: rgba(255, 135, 135, 0.95);
}

.species-view__qa-counters {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.35rem;
  font-size: 0.8rem;
}

.species-view__qa-counters li {
  display: flex;
  justify-content: space-between;
}

@media (max-width: 1080px) {
  .species-view__layout {
    grid-template-columns: 1fr;
  }

  .species-view__card {
    order: -1;
  }
}
</style>
