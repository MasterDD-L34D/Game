<template>
  <div class="flow-shell">
    <header class="flow-shell__header">
      <FlowBreadcrumb :steps="breadcrumb" :current="currentStep" @navigate="goToStep" />
      <ProgressTracker :steps="steps" :summary="summary" @navigate="goToStep" />
      <section class="flow-shell__status-bar">
        <article
          v-for="status in statuses"
          :key="status.id"
          class="status-card"
          :data-state="status.state"
        >
          <header class="status-card__header">
            <span class="status-card__label">{{ status.label }}</span>
            <span
              v-if="status.fallbackLabel"
              class="status-card__badge"
              :data-variant="status.fallbackLabel"
            >
              {{ status.fallbackLabel }}
            </span>
          </header>
          <p class="status-card__message">
            <span v-if="status.loading">Caricamento…</span>
            <span v-else-if="status.error">{{ status.errorMessage }}</span>
            <span v-else>{{ status.message }}</span>
          </p>
          <footer v-if="status.canRetry" class="status-card__actions">
            <button
              type="button"
              class="status-card__retry"
              :disabled="status.loading"
              @click="status.onRetry"
            >
              Riprova
            </button>
          </footer>
        </article>
      </section>
    </header>

    <main class="flow-shell__main">
      <div v-if="isLoading" class="flow-shell__placeholder">
        Caricamento orchestratore…
      </div>
      <div v-else-if="loadError" class="flow-shell__placeholder flow-shell__placeholder--error">
        {{ loadError }}
      </div>
      <component v-else :is="activeView" v-bind="activeProps" />
    </main>

    <footer class="flow-shell__footer">
      <button type="button" class="flow-shell__nav" :disabled="!canGoBack" @click="goPrevious">
        ← Indietro
      </button>
      <span class="flow-shell__step-indicator">{{ currentStep.index + 1 }} / {{ steps.length }}</span>
      <button type="button" class="flow-shell__nav" :disabled="!canGoForward" @click="goNext">
        Avanti →
      </button>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue';
import FlowBreadcrumb from '../components/layout/FlowBreadcrumb.vue';
import ProgressTracker from '../components/layout/ProgressTracker.vue';
import { useGeneratorFlow } from '../state/flowMachine.js';
import { useFlowLogger } from '../state/useFlowLogger.js';
import { useSnapshotLoader } from '../state/useSnapshotLoader.js';
import { useSpeciesGenerator } from '../state/useSpeciesGenerator.js';
import { useTraitDiagnostics } from '../state/useTraitDiagnostics.js';
import OverviewView from './OverviewView.vue';
import SpeciesView from './SpeciesView.vue';
import BiomeSetupView from './BiomeSetupView.vue';
import BiomesView from './BiomesView.vue';
import EncounterView from './EncounterView.vue';
import PublishingView from './PublishingView.vue';
import QualityReleaseView from './QualityReleaseView.vue';

const flow = useGeneratorFlow();
const steps = flow.steps;
const breadcrumb = flow.breadcrumb;
const currentStep = flow.currentStep;
const summary = flow.summary;

const logger = useFlowLogger();
const snapshotStore = useSnapshotLoader({ logger });
const speciesStore = useSpeciesGenerator({ logger });
const traitDiagnosticsStore = useTraitDiagnostics({ logger });

async function runInitialSpecies({ force = false } = {}) {
  const request = snapshotStore.snapshot.value?.initialSpeciesRequest || {};
  if (Array.isArray(request?.trait_ids) && request.trait_ids.length) {
    try {
      await speciesStore.runSpecies(request, { force });
    } catch (error) {
      // lo stato di errore è gestito nello store specie
    }
  }
}

onMounted(async () => {
  try {
    await snapshotStore.fetchSnapshot();
    await runInitialSpecies();
  } catch (error) {
    // l'errore viene esposto nel relativo stato
  }
  try {
    await traitDiagnosticsStore.load();
  } catch (error) {
    // lo stato qualità gestisce l'errore
  }
});

let lastInitialSignature = '';
watch(
  () => snapshotStore.snapshot.value?.initialSpeciesRequest,
  (request) => {
    if (!request || !Array.isArray(request.trait_ids) || !request.trait_ids.length) {
      lastInitialSignature = '';
      return;
    }
    const signature = JSON.stringify({
      trait_ids: [...request.trait_ids].sort(),
      fallback_trait_ids: Array.isArray(request.fallback_trait_ids)
        ? [...request.fallback_trait_ids].sort()
        : [],
      biome_id: request.biome_id || null,
      seed: request.seed ?? null,
    });
    if (signature !== lastInitialSignature) {
      lastInitialSignature = signature;
      runInitialSpecies();
    }
  },
  { deep: true },
);

watch(
  () => snapshotStore.metrics.value,
  (metrics) => {
    if (!metrics) {
      return;
    }
    Object.entries(metrics).forEach(([stepId, metric]) => {
      if (metric && typeof metric === 'object') {
        flow.updateMetrics(stepId, metric);
      }
    });
  },
  { immediate: true, deep: true },
);

const viewMap = {
  overview: OverviewView,
  species: SpeciesView,
  biomeSetup: BiomeSetupView,
  biomes: BiomesView,
  encounter: EncounterView,
  qualityRelease: QualityReleaseView,
  publishing: PublishingView,
};

const activeView = computed(() => viewMap[currentStep.value.id] || OverviewView);

const activeProps = computed(() => {
  const id = currentStep.value.id;
  if (id === 'overview') {
    return {
      overview: snapshotStore.overview.value,
      timeline: snapshotStore.timeline.value,
      qualityRelease: snapshotStore.qualityRelease.value,
    };
  }
  if (id === 'species') {
    return {
      species: speciesStore.blueprint.value,
      status: snapshotStore.speciesStatus.value,
      meta: speciesStore.meta.value,
      validation: speciesStore.validation.value,
      requestId: speciesStore.requestId.value,
      loading: speciesStore.loading.value,
      error: speciesStore.error.value,
      traitCatalog: traitDiagnosticsStore.traitCatalog.value,
      traitCompliance: traitDiagnosticsStore.traitCompliance.value,
      traitDiagnosticsLoading: traitDiagnosticsStore.loading.value,
      traitDiagnosticsError: traitDiagnosticsStore.error.value,
      traitDiagnosticsMeta: traitDiagnosticsStore.meta.value,
    };
  }
  if (id === 'biomeSetup') {
    return {
      config: snapshotStore.biomeSetup.value?.config || {},
      graph: snapshotStore.biomeSetup.value?.graph || {},
      validators: snapshotStore.biomeSetup.value?.validators || snapshotStore.biomes.value,
    };
  }
  if (id === 'biomes') {
    return { biomes: snapshotStore.biomes.value };
  }
  if (id === 'encounter') {
    return { encounter: snapshotStore.encounter.value, summary: snapshotStore.encounterSummary.value };
  }
  if (id === 'qualityRelease') {
    return {
      snapshot: snapshotStore.qualityRelease.value,
      context: snapshotStore.qualityContext.value,
      orchestratorLogs: logger.logs.value,
    };
  }
  if (id === 'publishing') {
    return { publishing: snapshotStore.publishing.value };
  }
  return {};
});

const canGoBack = computed(() => currentStep.value.index > 0);
const canGoForward = computed(() => currentStep.value.index < steps.length - 1);

const isLoading = computed(() => snapshotStore.loading.value);

function normaliseErrorMessage(error) {
  if (!error) {
    return '';
  }
  if (typeof error === 'string') {
    return error;
  }
  if (typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }
  return 'errors.generic';
}

function formatStatusTime(timestamp) {
  if (!timestamp) {
    return '—';
  }
  try {
    return new Date(timestamp).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  } catch (error) {
    return '—';
  }
}

const loadError = computed(() => normaliseErrorMessage(snapshotStore.error.value));

const retrySnapshot = async () => {
  try {
    await snapshotStore.fetchSnapshot({ force: true, refresh: true });
    await runInitialSpecies({ force: true });
  } catch (error) {
    // error surfaced nello stato snapshot
  }
};

const retrySpecies = async () => {
  try {
    if (speciesStore.canRetry()) {
      await speciesStore.retry({ force: true });
    } else {
      await runInitialSpecies({ force: true });
    }
  } catch (error) {
    // error surfaced nello stato specie
  }
};

const retryTraitDiagnostics = async () => {
  try {
    await traitDiagnosticsStore.reload();
  } catch (error) {
    // error surfaced nello stato quality
  }
};

const statuses = computed(() => {
  const snapshotFallback = snapshotStore.source.value === 'fallback';
  const snapshotStatus = {
    id: 'snapshot',
    label: 'Snapshot',
    loading: snapshotStore.loading.value,
    error: snapshotStore.error.value,
    errorMessage: normaliseErrorMessage(snapshotStore.error.value),
    message: snapshotFallback
      ? 'Snapshot fallback attivo'
      : `Aggiornato ${formatStatusTime(snapshotStore.lastUpdatedAt.value)}`,
    fallbackLabel: snapshotFallback ? snapshotStore.fallbackLabel.value || 'fallback' : null,
    canRetry: Boolean(snapshotStore.error.value || snapshotFallback),
    onRetry: retrySnapshot,
    state: snapshotStore.error.value
      ? 'error'
      : snapshotStore.loading.value
        ? 'loading'
        : 'ready',
  };

  const speciesFallback = speciesStore.fallbackActive.value;
  const speciesStatus = {
    id: 'species',
    label: 'Specie',
    loading: speciesStore.loading.value,
    error: speciesStore.error.value,
    errorMessage: normaliseErrorMessage(speciesStore.error.value),
    message: speciesStore.blueprint.value?.name
      || (speciesStore.requestId.value ? `Richiesta ${speciesStore.requestId.value}` : 'In attesa richiesta'),
    fallbackLabel: speciesFallback ? 'fallback' : null,
    canRetry: Boolean(speciesStore.error.value || speciesFallback || speciesStore.canRetry()),
    onRetry: retrySpecies,
    state: speciesStore.error.value
      ? 'error'
      : speciesStore.loading.value
        ? 'loading'
        : speciesStore.blueprint.value
          ? 'ready'
          : 'idle',
  };

  const diagnosticsFallback = traitDiagnosticsStore.source.value === 'fallback';
  const traitStatus = {
    id: 'traitDiagnostics',
    label: 'Trait diagnostics',
    loading: traitDiagnosticsStore.loading.value,
    error: traitDiagnosticsStore.error.value,
    errorMessage: normaliseErrorMessage(traitDiagnosticsStore.error.value),
    message: diagnosticsFallback
      ? 'Trait diagnostics fallback attivo'
      : `Aggiornati ${formatStatusTime(traitDiagnosticsStore.lastUpdatedAt.value)}`,
    fallbackLabel: diagnosticsFallback
      ? traitDiagnosticsStore.fallbackLabel.value || 'fallback'
      : null,
    canRetry: Boolean(traitDiagnosticsStore.error.value || diagnosticsFallback),
    onRetry: retryTraitDiagnostics,
    state: traitDiagnosticsStore.error.value
      ? 'error'
      : traitDiagnosticsStore.loading.value
        ? 'loading'
        : 'ready',
  };

  return [snapshotStatus, speciesStatus, traitStatus];
});

const goToStep = (stepId) => flow.goTo(stepId);
const goNext = () => flow.next();
const goPrevious = () => flow.previous();
</script>

<style scoped>
.flow-shell {
  display: grid;
  gap: 1.5rem;
  padding: 2rem;
  background: radial-gradient(circle at top left, rgba(96, 213, 255, 0.08), transparent 55%),
    radial-gradient(circle at bottom right, rgba(159, 123, 255, 0.08), transparent 45%),
    #05080d;
  min-height: 100vh;
  color: #f0f4ff;
}

.flow-shell__header {
  display: grid;
  gap: 1.25rem;
}

.flow-shell__status-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.status-card {
  display: grid;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(8, 12, 21, 0.65);
  box-shadow: inset 0 0 0 1px rgba(120, 164, 255, 0.08);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.status-card[data-state='error'] {
  border-color: rgba(244, 96, 96, 0.6);
  box-shadow: inset 0 0 0 1px rgba(244, 96, 96, 0.25);
}

.status-card[data-state='loading'] {
  border-color: rgba(96, 213, 255, 0.4);
  box-shadow: inset 0 0 0 1px rgba(96, 213, 255, 0.18);
}

.status-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.status-card__label {
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(240, 244, 255, 0.85);
}

.status-card__badge {
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  background: rgba(255, 215, 0, 0.12);
  color: rgba(255, 215, 0, 0.8);
}

.status-card__badge[data-variant='demo'] {
  background: rgba(96, 213, 255, 0.15);
  color: rgba(96, 213, 255, 0.9);
}

.status-card__message {
  font-size: 0.9rem;
  color: rgba(240, 244, 255, 0.82);
  min-height: 1.5rem;
}

.status-card__actions {
  display: flex;
  justify-content: flex-start;
}

.status-card__retry {
  border: none;
  border-radius: 6px;
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  background: rgba(96, 213, 255, 0.15);
  color: rgba(96, 213, 255, 0.9);
  cursor: pointer;
}

.status-card__retry:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.flow-shell__main {
  display: grid;
}

.flow-shell__placeholder {
  display: grid;
  place-items: center;
  min-height: 320px;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: rgba(240, 244, 255, 0.75);
  background: rgba(5, 8, 13, 0.6);
  font-size: 1.05rem;
  letter-spacing: 0.02em;
}

.flow-shell__placeholder--error {
  border-color: rgba(244, 96, 96, 0.45);
  color: rgba(255, 180, 180, 0.9);
}

.flow-shell__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.flow-shell__nav {
  background: rgba(9, 14, 20, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 0.6rem 1.1rem;
  color: inherit;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.flow-shell__nav:hover:enabled {
  border-color: rgba(96, 213, 255, 0.6);
  transform: translateY(-1px);
}

.flow-shell__nav:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.flow-shell__step-indicator {
  font-size: 0.95rem;
  color: rgba(240, 244, 255, 0.7);
}
</style>
