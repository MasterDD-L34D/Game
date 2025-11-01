<template>
  <section class="progress-tracker">
    <header class="progress-tracker__header">
      <div>
        <h1 class="progress-tracker__title">Orchestrazione generazione</h1>
        <p class="progress-tracker__subtitle">
          Stato globale · {{ summary.completedSteps }} / {{ summary.totalSteps }} fasi completate
        </p>
      </div>
      <div class="progress-tracker__chip">
        <span class="progress-tracker__chip-label">{{ summary.active?.title }}</span>
        <span class="progress-tracker__chip-value">{{ summary.percent }}%</span>
      </div>
    </header>

    <div
      class="progress-tracker__bar"
      role="progressbar"
      :aria-valuenow="summary.percent"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div class="progress-tracker__bar-fill" :style="{ width: `${summary.percent}%` }"></div>
    </div>

    <div class="progress-tracker__cards">
      <article
        v-for="step in steps"
        :key="step.id"
        class="progress-card"
        :class="[
          `progress-card--${step.status}`,
          { 'progress-card--active': step.id === summary.active?.id },
        ]"
      >
        <header class="progress-card__header">
          <div>
            <p class="progress-card__caption">{{ step.caption }}</p>
            <h2 class="progress-card__title">{{ step.title }}</h2>
          </div>
          <button type="button" class="progress-card__status" @click="$emit('navigate', step.id)">
            <StateToken :label="statusLabel(step.status)" :variant="statusVariant(step.status)" compact />
            <span class="progress-card__index">#{{ step.index + 1 }}</span>
          </button>
        </header>
        <p class="progress-card__description">{{ step.description }}</p>
        <dl v-if="step.metrics.total" class="progress-card__metrics">
          <div>
            <dt>{{ step.metrics.label || 'Elementi' }}</dt>
            <dd>{{ step.metrics.completed }} / {{ step.metrics.total }}</dd>
          </div>
          <div>
            <dt>Completezza</dt>
            <dd>{{ completionPercent(step.metrics) }}%</dd>
          </div>
        </dl>
      </article>
    </div>
  </section>
</template>

<script setup>
import { toRefs } from 'vue';

import StateToken from '../metrics/StateToken.vue';

const props = defineProps({
  steps: {
    type: Array,
    default: () => [],
  },
  summary: {
    type: Object,
    default: () => ({ totalSteps: 0, completedSteps: 0, percent: 0, active: null }),
  },
});

const { steps, summary } = toRefs(props);

defineEmits(['navigate']);

const statusMap = {
  done: { label: 'Completo', variant: 'success' },
  current: { label: 'In corso', variant: 'info' },
  pending: { label: 'In attesa', variant: 'neutral' },
  blocked: { label: 'Bloccato', variant: 'danger' },
};

const statusLabel = (status) => (statusMap[status] || statusMap.pending).label;
const statusVariant = (status) => (statusMap[status] || statusMap.pending).variant;

const completionPercent = (metrics) => {
  const total = Number.isFinite(metrics.total) ? metrics.total : 0;
  const completed = Number.isFinite(metrics.completed) ? metrics.completed : 0;
  if (!total) {
    return 0;
  }
  return Math.min(100, Math.round((completed / total) * 100));
};
</script>

<style scoped>
.progress-tracker {
  background: rgba(6, 11, 18, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 1.5rem;
  display: grid;
  gap: 1.25rem;
  color: #f0f4ff;
}

.progress-tracker__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.progress-tracker__title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
}

.progress-tracker__subtitle {
  margin: 0.35rem 0 0;
  color: rgba(240, 244, 255, 0.7);
  font-size: 0.95rem;
}

.progress-tracker__chip {
  background: rgba(96, 213, 255, 0.15);
  border: 1px solid rgba(96, 213, 255, 0.4);
  border-radius: 12px;
  padding: 0.5rem 0.9rem;
  display: grid;
  gap: 0.25rem;
  justify-items: end;
  min-width: 140px;
}

.progress-tracker__chip-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.progress-tracker__chip-value {
  font-size: 1.4rem;
  font-weight: 700;
}

.progress-tracker__bar {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 999px;
  overflow: hidden;
  height: 0.75rem;
  position: relative;
}

.progress-tracker__bar-fill {
  background: linear-gradient(90deg, #61d5ff 0%, #9f7bff 100%);
  height: 100%;
  border-radius: inherit;
  transition: width 0.3s ease;
}

.progress-tracker__cards {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.progress-card {
  background: rgba(10, 15, 22, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1rem;
  display: grid;
  gap: 0.75rem;
  min-height: 180px;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.progress-card--active {
  border-color: rgba(96, 213, 255, 0.7);
  transform: translateY(-2px);
}

.progress-card--done {
  border-color: rgba(87, 202, 138, 0.6);
}

.progress-card--blocked {
  border-color: rgba(244, 96, 96, 0.6);
}

.progress-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.progress-card__caption {
  margin: 0;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(240, 244, 255, 0.65);
}

.progress-card__title {
  margin: 0.25rem 0 0;
  font-size: 1.1rem;
}

.progress-card__status {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
  background: transparent;
  border: none;
  color: inherit;
  cursor: pointer;
  padding: 0;
}

.progress-card__status:hover {
  filter: brightness(1.05);
}

.progress-card__status:focus-visible {
  outline: 2px solid rgba(96, 213, 255, 0.55);
  outline-offset: 2px;
}

.progress-card__status:disabled {
  cursor: default;
  opacity: 0.6;
}

.progress-card__index {
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.progress-card__description {
  margin: 0;
  color: rgba(240, 244, 255, 0.75);
  line-height: 1.5;
}

.progress-card__metrics {
  display: grid;
  gap: 0.6rem;
  margin: 0;
  padding: 0.5rem 0 0;
}

.progress-card__metrics div {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.progress-card__metrics dt {
  font-size: 0.8rem;
  color: rgba(240, 244, 255, 0.65);
}

.progress-card__metrics dd {
  margin: 0;
  font-weight: 600;
}
</style>
