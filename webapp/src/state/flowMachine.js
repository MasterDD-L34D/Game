import { computed, reactive } from 'vue';

const BASE_STEPS = [
  {
    id: 'overview',
    title: 'Overview',
    caption: 'Panoramica del progetto',
    description: 'Riepilogo degli obiettivi e dei vincoli di generazione.',
  },
  {
    id: 'species',
    title: 'Specie',
    caption: 'Curazione faunistica',
    description: 'Selezione e revisione delle specie protagoniste.',
  },
  {
    id: 'biomes',
    title: 'Biomi',
    caption: 'Scenari ecologici',
    description: 'Biomi candidati e condizioni ambientali principali.',
  },
  {
    id: 'encounter',
    title: 'Encounter',
    caption: 'Configurazioni di scontro',
    description: 'Seed, varianti e parametri del combattimento.',
  },
  {
    id: 'publishing',
    title: 'Publishing',
    caption: 'Preparazione artefatti',
    description: 'Pacchetti finali e consegna dei deliverable.',
  },
];

function applyActiveStep(steps, targetIndex) {
  const clamped = Math.max(0, Math.min(targetIndex, steps.length - 1));
  steps.forEach((step, index) => {
    if (index < clamped) {
      step.status = step.status === 'blocked' ? 'blocked' : 'done';
    } else if (index === clamped) {
      step.status = step.status === 'blocked' ? 'blocked' : 'current';
    } else {
      step.status = step.status === 'blocked' ? 'blocked' : 'pending';
    }
  });
  return clamped;
}

export function useGeneratorFlow(options = {}) {
  const { initial = 'overview', stepOverrides = {} } = options;

  const steps = reactive(
    BASE_STEPS.map((step, index) => {
      const override = stepOverrides[step.id] || {};
      const metrics = {
        completed: 0,
        total: 0,
        label: 'Elementi',
        ...override.metrics,
      };
      return {
        ...step,
        ...override,
        index,
        status: 'pending',
        metrics,
        completed: Boolean(metrics.total && metrics.completed >= metrics.total),
        locked: Boolean(override.locked),
      };
    })
  );

  const initialIndex = steps.findIndex((step) => step.id === initial);
  const state = reactive({
    currentIndex: applyActiveStep(steps, initialIndex === -1 ? 0 : initialIndex),
  });

  const currentStep = computed(() => steps[state.currentIndex] || steps[0]);

  const breadcrumb = computed(() => steps.slice(0, state.currentIndex + 1));

  const summary = computed(() => {
    const totalSteps = steps.length;
    const completedSteps = steps.filter((step) => step.status === 'done').length;
    const percent = totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);
    return {
      totalSteps,
      completedSteps,
      percent,
      active: currentStep.value,
    };
  });

  function goTo(stepId) {
    const index = steps.findIndex((step) => step.id === stepId);
    if (index !== -1) {
      state.currentIndex = applyActiveStep(steps, index);
    }
  }

  function next() {
    if (state.currentIndex < steps.length - 1) {
      state.currentIndex = applyActiveStep(steps, state.currentIndex + 1);
    }
  }

  function previous() {
    if (state.currentIndex > 0) {
      state.currentIndex = applyActiveStep(steps, state.currentIndex - 1);
    }
  }

  function updateMetrics(stepId, metrics = {}) {
    const step = steps.find((item) => item.id === stepId);
    if (!step) {
      return;
    }
    const nextMetrics = {
      ...step.metrics,
      ...metrics,
    };
    step.metrics = nextMetrics;
    const total = Number.isFinite(nextMetrics.total) ? nextMetrics.total : 0;
    const completed = Number.isFinite(nextMetrics.completed) ? nextMetrics.completed : 0;
    if (total > 0 && completed >= total) {
      step.completed = true;
      if (steps[state.currentIndex].id !== step.id) {
        step.status = 'done';
      }
    }
  }

  function mark(stepId, status) {
    const step = steps.find((item) => item.id === stepId);
    if (!step) {
      return;
    }
    step.status = status;
    if (status === 'done') {
      step.completed = true;
    }
  }

  return {
    steps,
    currentStep,
    breadcrumb,
    summary,
    goTo,
    next,
    previous,
    updateMetrics,
    mark,
  };
}

export const FLOW_STEPS = BASE_STEPS.map((step) => ({ ...step }));
