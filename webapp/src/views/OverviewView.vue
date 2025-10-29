<template>
  <section class="flow-view">
    <header class="flow-view__header">
      <h2>Snapshot operativo</h2>
      <p>Coordinamento attuale del workflow narrativo.</p>
    </header>
    <div class="flow-view__grid">
      <article class="flow-card" v-for="objective in objectives" :key="objective">
        <h3 class="flow-card__title">Obiettivo</h3>
        <p class="flow-card__body">{{ objective }}</p>
      </article>
      <article class="flow-card flow-card--warning" v-for="blocker in blockers" :key="blocker">
        <h3 class="flow-card__title">Bloccante</h3>
        <p class="flow-card__body">{{ blocker }}</p>
      </article>
      <article class="flow-card flow-card--progress">
        <h3 class="flow-card__title">Allineamento timeline</h3>
        <p class="flow-card__body">{{ timeline.label }}</p>
        <div class="flow-card__progress">
          <div class="flow-card__progress-bar" :style="{ width: `${timeline.percent}%` }"></div>
        </div>
        <small>{{ completion.completed }} su {{ completion.total }} milestone confermate</small>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed, toRefs } from 'vue';

const props = defineProps({
  overview: {
    type: Object,
    required: true,
  },
  timeline: {
    type: Object,
    required: true,
  },
});

const { overview, timeline } = toRefs(props);
const completion = computed(() => overview.value.completion || { completed: 0, total: 0 });
const blockers = computed(() => overview.value.blockers || []);
const objectives = computed(() => overview.value.objectives || []);
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

.flow-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.flow-card {
  background: rgba(9, 14, 20, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1rem;
  display: grid;
  gap: 0.5rem;
}

.flow-card--warning {
  border-color: rgba(244, 196, 96, 0.55);
  background: rgba(244, 196, 96, 0.12);
}

.flow-card--progress {
  border-color: rgba(96, 213, 255, 0.4);
}

.flow-card__title {
  margin: 0;
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  color: rgba(240, 244, 255, 0.65);
}

.flow-card__body {
  margin: 0;
  font-size: 1rem;
  color: #f0f4ff;
}

.flow-card__progress {
  height: 0.5rem;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  overflow: hidden;
}

.flow-card__progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #61d5ff 0%, #9f7bff 100%);
}

small {
  color: rgba(240, 244, 255, 0.6);
}
</style>
