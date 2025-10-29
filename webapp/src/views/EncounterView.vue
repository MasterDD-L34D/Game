<template>
  <section class="flow-view">
    <header class="flow-view__header">
      <h2>Encounter selezionato</h2>
      <p>Seed, varianti e parametri tattici generati finora.</p>
    </header>
    <div class="flow-view__content">
      <EncounterPanel :encounter="encounter" />
      <aside class="flow-view__sidebar">
        <div class="sidebar-card">
          <h3>Metriche</h3>
          <ul>
            <li><strong>{{ summary.seeds }}</strong> seed generati</li>
            <li><strong>{{ summary.variants }}</strong> varianti attive</li>
            <li><strong>{{ summary.warnings }}</strong> warning aperti</li>
          </ul>
        </div>
        <div class="sidebar-card">
          <h3>Prossimi trigger</h3>
          <p>Convalida parametri minaccia e sincronizzazione con canale Publishing.</p>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { toRefs } from 'vue';
import EncounterPanel from '../components/EncounterPanel.vue';

const props = defineProps({
  encounter: {
    type: Object,
    required: true,
  },
  summary: {
    type: Object,
    required: true,
  },
});

const { encounter, summary } = toRefs(props);
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

.flow-view__content {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(220px, 1fr);
  gap: 1.25rem;
}

.flow-view__sidebar {
  display: grid;
  gap: 1rem;
}

.sidebar-card {
  background: rgba(9, 14, 20, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1rem;
  display: grid;
  gap: 0.5rem;
}

.sidebar-card h3 {
  margin: 0;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(240, 244, 255, 0.7);
}

.sidebar-card ul {
  margin: 0;
  padding-left: 1.25rem;
  display: grid;
  gap: 0.35rem;
  color: rgba(240, 244, 255, 0.85);
}

.sidebar-card p {
  margin: 0;
  color: rgba(240, 244, 255, 0.75);
}
</style>
