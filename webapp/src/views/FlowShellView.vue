<template>
  <div class="flow-shell">
    <header class="flow-shell__header">
      <FlowBreadcrumb :steps="breadcrumb" :current="currentStep" @navigate="goToStep" />
      <ProgressTracker :steps="steps" :summary="summary" @navigate="goToStep" />
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
import { useFlowOrchestrator } from '../state/flowOrchestratorStore.js';
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

const orchestrator = useFlowOrchestrator();

onMounted(() => {
  orchestrator.bootstrap().catch(() => {
    // l'errore viene già gestito all'interno dello store
  });
});

watch(
  () => orchestrator.metrics.value,
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
    return { overview: orchestrator.overview.value, timeline: orchestrator.timeline.value };
  }
  if (id === 'species') {
    return {
      species: orchestrator.speciesBlueprint.value,
      status: orchestrator.speciesStatus.value,
      meta: orchestrator.speciesMeta.value,
      validation: orchestrator.speciesValidation.value,
      requestId: orchestrator.speciesRequestId.value,
      loading: orchestrator.loadingSpecies.value,
      error: orchestrator.speciesError.value,
    };
  }
  if (id === 'biomeSetup') {
    return {
      config: orchestrator.biomeSetup.value?.config || {},
      graph: orchestrator.biomeSetup.value?.graph || {},
      validators: orchestrator.biomeSetup.value?.validators || orchestrator.biomes.value,
    };
  }
  if (id === 'biomes') {
    return { biomes: orchestrator.biomes.value };
  }
  if (id === 'encounter') {
    return { encounter: orchestrator.encounter.value, summary: orchestrator.encounterSummary.value };
  }
  if (id === 'qualityRelease') {
    return {
      snapshot: orchestrator.qualityRelease.value,
      context: orchestrator.qualityContext.value,
      orchestratorLogs: orchestrator.logs.value,
    };
  }
  if (id === 'publishing') {
    return { publishing: orchestrator.publishing.value };
  }
  return {};
});

const canGoBack = computed(() => currentStep.value.index > 0);
const canGoForward = computed(() => currentStep.value.index < steps.length - 1);

const isLoading = computed(
  () => orchestrator.loadingSnapshot.value || orchestrator.loadingSpecies.value,
);

const loadError = computed(() => {
  const error = orchestrator.error.value || orchestrator.speciesError.value;
  if (!error) {
    return '';
  }
  return error.message || String(error);
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
