<template>
  <section class="flow-view">
    <header class="flow-view__header">
      <h2>Publishing & Deliverable</h2>
      <p>Stato di confezionamento dei materiali e canali di uscita.</p>
    </header>
    <div class="flow-view__grid">
      <article class="flow-card">
        <h3 class="flow-card__title">Artefatti</h3>
        <p class="flow-card__body">
          {{ publishing.artifactsReady }} asset pronti su {{ publishing.totalArtifacts }} previsti.
        </p>
      </article>
      <article class="flow-card">
        <h3 class="flow-card__title">Canali</h3>
        <ul>
          <li v-for="channel in publishing.channels" :key="channel">{{ channel }}</li>
        </ul>
      </article>
      <article class="flow-card flow-card--action">
        <h3 class="flow-card__title">Prossime azioni</h3>
        <p class="flow-card__body">Coordinare il QA narrativo e validare la sincronizzazione media.</p>
      </article>
    </div>
  </section>
</template>

<script setup>
import { toRefs } from 'vue';

const props = defineProps({
  publishing: {
    type: Object,
    required: true,
  },
});

const { publishing } = toRefs(props);
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

.flow-card--action {
  border-color: rgba(87, 202, 138, 0.55);
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

.flow-card ul {
  margin: 0;
  padding-left: 1.25rem;
  color: rgba(240, 244, 255, 0.85);
  display: grid;
  gap: 0.25rem;
}
</style>
