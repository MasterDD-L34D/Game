<template>
  <PokedexShell :lights="statusLights" :logs="missionLogs">
    <template #header>
      <div class="flow-shell__header-grid">
        <FlowBreadcrumb :steps="breadcrumb" :current="currentStep" @navigate="goToStep" />
        <ProgressTracker :steps="steps" :summary="summary" @navigate="goToStep" />
      </div>
    </template>

    <template #status>
      <div class="pokedex-status-grid">
        <article
          v-for="status in statuses"
          :key="status.id"
          class="pokedex-status-card"
          :data-state="status.state"
        >
          <header class="pokedex-status-card__header">
            <span class="pokedex-status-card__label">{{ status.label }}</span>
            <span v-if="status.loading" class="pokedex-status-card__spinner" aria-hidden="true"></span>
            <PokedexTelemetryBadge
              v-if="status.fallbackLabel"
              label="Modalità"
              :value="status.fallbackLabel"
              :tone="fallbackTone(status.fallbackLabel)"
            />
          </header>
          <p class="pokedex-status-card__message">
            <span v-if="status.loading">{{ status.loadingMessage || 'Caricamento…' }}</span>
            <span v-else-if="status.error">{{ status.errorMessage }}</span>
            <span v-else>{{ status.message }}</span>
          </p>
          <footer v-if="status.canRetry" class="pokedex-status-card__actions">
            <button
              type="button"
              class="pokedex-status-card__retry"
              :disabled="status.loading"
              @click="status.onRetry"
            >
              Riprova
            </button>
          </footer>
        </article>
      </div>
    </template>

    <template #default>
      <div v-if="isLoading" class="flow-shell__placeholder">
        Caricamento orchestratore…
      </div>
      <div v-else-if="loadError" class="flow-shell__placeholder flow-shell__placeholder--error">
        {{ loadError }}
      </div>
      <component v-else :is="activeView" v-bind="activeProps" />
    </template>

    <template #footer>
      <button type="button" class="pokedex-button" :disabled="!canGoBack" @click="goPrevious">
        ← Indietro
      </button>
      <span class="pokedex-step-indicator">{{ currentStep.index + 1 }} / {{ steps.length }}</span>
      <button type="button" class="pokedex-button" :disabled="!canGoForward" @click="goNext">
        Avanti →
      </button>
    </template>

    <template #sidebar>
      <FlowShellTelemetryPanel
        :logs="telemetryLogs"
        :metrics="qaMetrics"
        :stream="telemetryStreamState"
        @export-json="exportTelemetry('json')"
        @export-csv="exportTelemetry('csv')"
        @refresh-stream="refreshTelemetryStream"
      />
    </template>
  </PokedexShell>
</template>

<script setup>
import { computed, onMounted, watch } from 'vue';
import FlowBreadcrumb from '../components/navigation/FlowBreadcrumb.vue';
import ProgressTracker from '../components/navigation/ProgressTracker.vue';
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
import PokedexShell from '../components/pokedex/PokedexShell.vue';
import PokedexTelemetryBadge from '../components/pokedex/PokedexTelemetryBadge.vue';
import FlowShellTelemetryPanel from '../components/flow/FlowShellTelemetryPanel.vue';
import { useClientLogger } from '../services/clientLogger.ts';

const flow = useGeneratorFlow();
const steps = flow.steps;
const breadcrumb = flow.breadcrumb;
const currentStep = flow.currentStep;
const summary = flow.summary;

const logger = useFlowLogger();
const clientLogger = useClientLogger();
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
      orchestratorLogs: telemetryEntries.value,
    };
  }
  if (id === 'publishing') {
    return { publishing: snapshotStore.publishing.value };
  }
  return {};
});

const canGoBack = computed(() => currentStep.value.index > 0);
const canGoForward = computed(() => currentStep.value.index < steps.length - 1);

const isLoading = computed(
  () => snapshotStore.loading.value && !snapshotStore.hasSnapshot.value,
);
const isRefreshing = computed(() => snapshotStore.refreshing.value);

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

function isOfflineError(error) {
  if (!error) {
    return false;
  }
  if (typeof error === 'string') {
    return error === 'errors.network.offline';
  }
  if (error?.message === 'errors.network.offline') {
    return true;
  }
  if (typeof error?.status === 'number' && error.status === 0) {
    return true;
  }
  if (typeof error?.code === 'string' && error.code.toUpperCase() === 'ERR_NETWORK') {
    return true;
  }
  return false;
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
  const snapshotOffline = isOfflineError(snapshotStore.error.value);
  const snapshotStatus = {
    id: 'snapshot',
    label: 'Snapshot',
    loading: snapshotStore.loading.value,
    loadingMessage: isRefreshing.value ? 'Aggiornamento…' : 'Caricamento…',
    error: snapshotStore.error.value,
    errorMessage: normaliseErrorMessage(snapshotStore.error.value),
    message: snapshotOffline
      ? 'Connessione assente'
      : snapshotFallback
        ? 'Snapshot fallback attivo'
        : `Aggiornato ${formatStatusTime(snapshotStore.lastUpdatedAt.value)}`,
    fallbackLabel: snapshotFallback
      ? snapshotStore.fallbackLabel.value || 'fallback'
      : snapshotOffline
        ? 'offline'
        : null,
    canRetry: Boolean(snapshotStore.error.value || snapshotFallback || snapshotOffline),
    onRetry: retrySnapshot,
    state: snapshotStore.error.value
      ? 'error'
      : snapshotStore.loading.value
        ? 'loading'
        : 'ready',
  };

  const speciesFallback = speciesStore.fallbackActive.value;
  const speciesOffline = isOfflineError(speciesStore.error.value);
  const speciesStatus = {
    id: 'species',
    label: 'Specie',
    loading: speciesStore.loading.value,
    loadingMessage: 'Generazione…',
    error: speciesStore.error.value,
    errorMessage: normaliseErrorMessage(speciesStore.error.value),
    message: speciesOffline
      ? 'Connessione assente'
      : speciesStore.blueprint.value?.name
        || (speciesStore.requestId.value ? `Richiesta ${speciesStore.requestId.value}` : 'In attesa richiesta'),
    fallbackLabel: speciesFallback ? 'fallback' : speciesOffline ? 'offline' : null,
    canRetry: Boolean(
      speciesStore.error.value || speciesFallback || speciesOffline || speciesStore.canRetry(),
    ),
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
  const diagnosticsOffline = isOfflineError(traitDiagnosticsStore.error.value);
  const traitStatus = {
    id: 'traitDiagnostics',
    label: 'Trait diagnostics',
    loading: traitDiagnosticsStore.loading.value,
    loadingMessage: 'Aggiornamento…',
    error: traitDiagnosticsStore.error.value,
    errorMessage: normaliseErrorMessage(traitDiagnosticsStore.error.value),
    message: diagnosticsOffline
      ? 'Connessione assente'
      : diagnosticsFallback
        ? 'Trait diagnostics fallback attivo'
        : `Aggiornati ${formatStatusTime(traitDiagnosticsStore.lastUpdatedAt.value)}`,
    fallbackLabel: diagnosticsFallback
      ? traitDiagnosticsStore.fallbackLabel.value || 'fallback'
      : diagnosticsOffline
        ? 'offline'
        : null,
    canRetry: Boolean(traitDiagnosticsStore.error.value || diagnosticsFallback || diagnosticsOffline),
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

const statusLights = computed(() =>
  statuses.value.map((status) => ({
    id: status.id,
    label: status.label,
    state: status.state,
  })),
);

function formatLogTimestamp(timestamp) {
  if (!timestamp) {
    return '—';
  }
  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid timestamp');
    }
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch (error) {
    return String(timestamp).slice(0, 8);
  }
}

const telemetryEntries = computed(() => clientLogger.list());

const telemetryLogs = computed(() =>
  telemetryEntries.value.map((entry, index) => {
    const metaTimestamp =
      entry.meta && typeof entry.meta === 'object' && entry.meta !== null
        ? entry.meta.timestamp
        : undefined;
    const resolvedMetaTimestamp =
      typeof metaTimestamp === 'string' && metaTimestamp.length ? metaTimestamp : null;
    const timestamp = entry.timestamp || resolvedMetaTimestamp || new Date().toISOString();
    return {
      id: entry.id ?? `${entry.event || 'log'}-${index}`,
      level: entry.level || 'info',
      scope: entry.scope || entry.event || 'quality',
      message: entry.message || entry.event || 'Evento registrato',
      timestamp,
      time: formatLogTimestamp(timestamp),
    };
  }),
);

const missionLogs = telemetryLogs;

const telemetryStreamState = computed(() => ({
  status: clientLogger.streamStatus.value,
  error: clientLogger.streamError.value,
  lastEventAt: clientLogger.streamLastEventAt.value,
  attempts: clientLogger.streamAttempts.value,
}));

function countValidatorWarnings(snapshot) {
  const logs = Array.isArray(snapshot?.qualityRelease?.logs) ? snapshot.qualityRelease.logs : [];
  return logs.filter((log) => String(log?.level || '').toLowerCase() === 'warning').length;
}

function extractFallbackCount(snapshot) {
  let total = 0;
  const initialFallback = snapshot?.initialSpeciesRequest?.fallback_trait_ids;
  if (Array.isArray(initialFallback) && initialFallback.length) {
    total += 1;
  }

  const batchEntries = snapshot?.qualityReleaseContext?.speciesBatch?.entries;
  if (Array.isArray(batchEntries)) {
    batchEntries.forEach((entry) => {
      if (Array.isArray(entry?.fallback_trait_ids) && entry.fallback_trait_ids.length) {
        total += 1;
      }
    });
  }

  const suggestionEntries = [];
  if (Array.isArray(snapshot?.suggestions)) {
    snapshot.suggestions.forEach((suggestion) => {
      const payloadEntries = suggestion?.payload?.entries;
      if (Array.isArray(payloadEntries)) {
        payloadEntries.forEach((entry) => suggestionEntries.push(entry));
      }
    });
  }
  suggestionEntries.forEach((entry) => {
    if (entry && typeof entry === 'object') {
      const fallback = entry.fallback_trait_ids;
      if (Array.isArray(fallback) && fallback.length) {
        total += 1;
      }
    }
  });

  const logFallbacks = Array.isArray(snapshot?.qualityRelease?.logs)
    ? snapshot.qualityRelease.logs.filter((log) =>
        String(log?.message || '').toLowerCase().includes('fallback'),
      ).length
    : 0;

  return total + logFallbacks;
}

function resolveSnapshotRequestId(snapshot) {
  if (snapshot?.initialSpeciesRequest?.request_id) {
    return snapshot.initialSpeciesRequest.request_id;
  }
  const batchEntries = snapshot?.qualityReleaseContext?.speciesBatch?.entries;
  if (Array.isArray(batchEntries)) {
    const match = batchEntries.find((entry) => entry?.request_id);
    if (match?.request_id) {
      return match.request_id;
    }
  }
  if (Array.isArray(snapshot?.suggestions)) {
    for (const suggestion of snapshot.suggestions) {
      const entries = suggestion?.payload?.entries;
      if (Array.isArray(entries)) {
        const match = entries.find((entry) => entry?.request_id);
        if (match?.request_id) {
          return match.request_id;
        }
      }
    }
  }
  return null;
}

const qaMetrics = computed(() => {
  const snapshot = snapshotStore.snapshot.value;
  const metrics = snapshot?.qualityRelease?.metrics || {};
  const warningsCandidate = Number(
    metrics.validatorWarnings ?? metrics.validator_warnings ?? metrics.warnings ?? Number.NaN,
  );
  const fallbackCandidate = Number(
    metrics.fallbackCount ?? metrics.fallback_count ?? metrics.fallbacks ?? Number.NaN,
  );
  const warnings = Number.isFinite(warningsCandidate)
    ? warningsCandidate
    : countValidatorWarnings(snapshot);
  const fallbackCount = Number.isFinite(fallbackCandidate)
    ? fallbackCandidate
    : extractFallbackCount(snapshot);
  const requestId =
    metrics.lastRequestId ??
    metrics.requestId ??
    resolveSnapshotRequestId(snapshot) ??
    speciesStore.requestId.value ??
    null;
  return {
    validatorWarnings: warnings,
    fallbackCount,
    requestId,
  };
});

const qaBadgeEntries = computed(() => [
  {
    id: 'validator-warnings',
    label: 'Validator warnings',
    value: qaMetrics.value.validatorWarnings,
  },
  {
    id: 'fallback-count',
    label: 'Fallback attivi',
    value: qaMetrics.value.fallbackCount,
  },
  {
    id: 'request-id',
    label: 'Request ID',
    value: qaMetrics.value.requestId || '—',
  },
]);

let lastBadgeSignature = '';
watch(
  qaBadgeEntries,
  (badges) => {
    const signature = JSON.stringify(badges);
    if (signature === lastBadgeSignature) {
      return;
    }
    lastBadgeSignature = signature;
    clientLogger.logQaBadgeSummary(badges, { scope: 'quality' });
  },
  { deep: true, immediate: true },
);

const logStreamUrl = computed(() => {
  const qualityRelease = snapshotStore.snapshot.value?.qualityRelease || {};
  if (typeof qualityRelease.logStreamUrl === 'string' && qualityRelease.logStreamUrl.trim()) {
    return qualityRelease.logStreamUrl.trim();
  }
  if (qualityRelease.logStream && typeof qualityRelease.logStream.url === 'string') {
    const nested = qualityRelease.logStream.url.trim();
    if (nested) {
      return nested;
    }
  }
  return clientLogger.defaultStreamUrl;
});

watch(
  () => logStreamUrl.value,
  (url) => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!url) {
      clientLogger.disconnectStream();
      return;
    }
    const currentUrl = clientLogger.streamUrl.value;
    if (currentUrl === url && clientLogger.streamStatus.value === 'open') {
      return;
    }
    clientLogger.connectStream({ url, scope: 'quality' });
  },
  { immediate: true },
);

function exportTelemetry(format) {
  if (format === 'csv') {
    clientLogger.exportLogsAsCsv();
  } else {
    clientLogger.exportLogsAsJson();
  }
}

function refreshTelemetryStream() {
  clientLogger.reconnectStream();
}

function fallbackTone(label) {
  if (!label) {
    return 'neutral';
  }
  const normalised = String(label).toLowerCase();
  if (normalised.includes('fallback')) return 'warning';
  if (normalised.includes('offline')) return 'critical';
  if (normalised.includes('demo')) return 'success';
  return 'neutral';
}
</script>

<style scoped>
.flow-shell__header-grid {
  display: grid;
  gap: 1.4rem;
}

.flow-shell__placeholder {
  display: grid;
  place-items: center;
  min-height: 320px;
  border-radius: 1.2rem;
  border: 1px dashed rgba(77, 208, 255, 0.22);
  background: rgba(7, 23, 39, 0.45);
  color: var(--pokedex-text-secondary);
  font-size: 1rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.flow-shell__placeholder--error {
  border-color: rgba(255, 91, 107, 0.45);
  color: rgba(255, 188, 201, 0.92);
}
</style>
