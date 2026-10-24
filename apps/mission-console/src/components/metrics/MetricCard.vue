<template>
  <article class="metric-card" :class="[`metric-card--${state}`]">
    <header class="metric-card__header">
      <div>
        <p v-if="caption" class="metric-card__caption">{{ caption }}</p>
        <h3 class="metric-card__title">{{ title }}</h3>
      </div>
      <div class="metric-card__status" v-if="statusLabel || tokens.length">
        <StateToken
          v-if="statusLabel"
          :label="statusLabel"
          :variant="statusVariant"
          :icon="statusIcon"
        />
        <StateToken
          v-for="token in tokens"
          :key="token.id"
          :label="token.label"
          :variant="token.variant"
          :icon="token.icon"
          compact
        />
      </div>
    </header>
    <p v-if="description" class="metric-card__description">{{ description }}</p>
    <div v-if="value" class="metric-card__value">{{ value }}</div>
    <dl v-if="metrics.length" class="metric-card__metrics">
      <div v-for="metric in metrics" :key="metric.label">
        <dt>{{ metric.label }}</dt>
        <dd>{{ metric.value }}</dd>
      </div>
    </dl>
    <slot></slot>
  </article>
</template>

<script setup>
import { computed } from 'vue';

import StateToken from './StateToken.vue';

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  caption: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  value: {
    type: [String, Number],
    default: '',
  },
  statusLabel: {
    type: String,
    default: '',
  },
  statusVariant: {
    type: String,
    default: 'info',
  },
  statusIcon: {
    type: String,
    default: '',
  },
  state: {
    type: String,
    default: 'default',
  },
  tokens: {
    type: Array,
    default: () => [],
  },
  metrics: {
    type: Array,
    default: () => [],
  },
});

const metrics = computed(() => props.metrics);
const tokens = computed(() => props.tokens);
const value = computed(() => (props.value === 0 ? '0' : props.value));
</script>

<style scoped>
.metric-card {
  background: rgba(15, 23, 42, 0.75);
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 1.25rem;
  padding: 1.1rem;
  display: grid;
  gap: 0.75rem;
  color: #e2e8f0;
  min-height: 160px;
}

.metric-card--success {
  border-color: rgba(74, 222, 128, 0.45);
}

.metric-card--warning {
  border-color: rgba(251, 191, 36, 0.5);
}

.metric-card--danger {
  border-color: rgba(248, 113, 113, 0.5);
}

.metric-card__header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;
}

.metric-card__caption {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(226, 232, 240, 0.65);
}

.metric-card__title {
  margin: 0.25rem 0 0;
  font-size: 1.15rem;
}

.metric-card__status {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.4rem;
}

.metric-card__description {
  margin: 0;
  color: rgba(226, 232, 240, 0.75);
  line-height: 1.5;
}

.metric-card__value {
  font-size: clamp(1.75rem, 4vw, 2.4rem);
  font-weight: 700;
  letter-spacing: 0.04em;
}

.metric-card__metrics {
  display: grid;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
}

.metric-card__metrics div {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}

.metric-card__metrics dt {
  font-size: 0.8rem;
  color: rgba(203, 213, 225, 0.75);
}

.metric-card__metrics dd {
  margin: 0;
  font-weight: 600;
}
</style>
