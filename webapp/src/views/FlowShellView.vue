<template>
  <div class="flow-shell">
    <header class="flow-shell__header">
      <FlowBreadcrumb :steps="breadcrumb" :current="currentStep" @navigate="goToStep" />
      <ProgressTracker :steps="steps" :summary="summary" @navigate="goToStep" />
    </header>

    <main class="flow-shell__main">
      <component :is="activeView" v-bind="activeProps" />
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
import { computed } from 'vue';
import FlowBreadcrumb from '../components/layout/FlowBreadcrumb.vue';
import ProgressTracker from '../components/layout/ProgressTracker.vue';
import { useGeneratorFlow } from '../state/flowMachine.js';
import {
  demoSpecies,
  demoBiomes,
  demoEncounter,
  orchestratorSnapshot,
  globalTimeline,
  biomeSynthesisConfig,
  demoBiomeGraph,
  qualityReleaseContext,
} from '../state/demoOrchestration.js';
import OverviewView from './OverviewView.vue';
import SpeciesView from './SpeciesView.vue';
import BiomeSetupView from './BiomeSetupView.vue';
import BiomesView from './BiomesView.vue';
import EncounterView from './EncounterView.vue';
import PublishingView from './PublishingView.vue';
import QualityReleaseView from './QualityReleaseView.vue';

const flow = useGeneratorFlow();

flow.updateMetrics('overview', {
  completed: orchestratorSnapshot.overview.completion.completed,
  total: orchestratorSnapshot.overview.completion.total,
  label: 'Milestone',
});

flow.updateMetrics('species', {
  completed: orchestratorSnapshot.species.curated,
  total: orchestratorSnapshot.species.total,
  label: 'Specie',
});

flow.updateMetrics('biomeSetup', {
  completed: orchestratorSnapshot.biomeSetup.prepared,
  total: orchestratorSnapshot.biomeSetup.total,
  label: 'Preset',
});

flow.updateMetrics('biomes', {
  completed: orchestratorSnapshot.biomes.validated,
  total: orchestratorSnapshot.biomes.validated + orchestratorSnapshot.biomes.pending,
  label: 'Biomi',
});

flow.updateMetrics('encounter', {
  completed: orchestratorSnapshot.encounter.variants,
  total: orchestratorSnapshot.encounter.variants + orchestratorSnapshot.encounter.seeds,
  label: 'Varianti',
});

const qualityChecks = orchestratorSnapshot.qualityRelease.checks || {};
const totalQualityChecks = Object.values(qualityChecks).reduce(
  (acc, item) => acc + (item.total || 0),
  0,
);
const completedQualityChecks = Object.values(qualityChecks).reduce(
  (acc, item) => acc + (item.passed || 0),
  0,
);

flow.updateMetrics('qualityRelease', {
  completed: completedQualityChecks,
  total: totalQualityChecks,
  label: 'Check QA',
});

flow.updateMetrics('publishing', {
  completed: orchestratorSnapshot.publishing.artifactsReady,
  total: orchestratorSnapshot.publishing.totalArtifacts,
  label: 'Artefatti',
});

const steps = flow.steps;
const breadcrumb = flow.breadcrumb;
const currentStep = flow.currentStep;
const summary = flow.summary;

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
    return { overview: orchestratorSnapshot.overview, timeline: globalTimeline.value };
  }
  if (id === 'species') {
    return { species: demoSpecies, status: orchestratorSnapshot.species };
  }
  if (id === 'biomeSetup') {
    return {
      config: biomeSynthesisConfig,
      graph: demoBiomeGraph,
      validators: demoBiomes,
    };
  }
  if (id === 'biomes') {
    return { biomes: demoBiomes };
  }
  if (id === 'encounter') {
    return { encounter: demoEncounter, summary: orchestratorSnapshot.encounter };
  }
  if (id === 'qualityRelease') {
    return {
      snapshot: orchestratorSnapshot.qualityRelease,
      context: qualityReleaseContext,
    };
  }
  if (id === 'publishing') {
    return { publishing: orchestratorSnapshot.publishing };
  }
  return {};
});

const canGoBack = computed(() => currentStep.value.index > 0);
const canGoForward = computed(() => currentStep.value.index < steps.length - 1);

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
