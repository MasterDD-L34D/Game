<template>
  <section class="flow-view">
    <header class="flow-view__header">
      <h2>Specie prioritario</h2>
      <p>Curazione attuale e shortlist degli organismi selezionati.</p>
    </header>
    <div class="flow-view__content">
      <SpeciesPanel :species="species" />
      <aside class="flow-view__sidebar">
        <div class="sidebar-card">
          <h3>Stato curazione</h3>
          <p><strong>{{ curated }}</strong> specie curate su <strong>{{ total }}</strong> candidate.</p>
        </div>
        <div class="sidebar-card">
          <h3>Shortlist</h3>
          <ul>
            <li v-for="item in shortlist" :key="item">{{ item }}</li>
          </ul>
        </div>
      </aside>
    </div>
  </section>
</template>

<script setup>
import { computed, toRefs } from 'vue';
import SpeciesPanel from '../components/SpeciesPanel.vue';

const props = defineProps({
  species: {
    type: Object,
    required: true,
  },
  status: {
    type: Object,
    required: true,
  },
});

const { species, status } = toRefs(props);
const curated = computed(() => status.value.curated || 0);
const total = computed(() => status.value.total || 0);
const shortlist = computed(() => status.value.shortlist || []);
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

.sidebar-card p {
  margin: 0;
  color: #f0f4ff;
}

.sidebar-card ul {
  margin: 0;
  padding-left: 1.25rem;
  color: rgba(240, 244, 255, 0.8);
  display: grid;
  gap: 0.25rem;
}
</style>
