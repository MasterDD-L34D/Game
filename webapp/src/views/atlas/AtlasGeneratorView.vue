<template>
  <section class="atlas-generator" aria-live="polite">
    <header class="atlas-generator__header">
      <div>
        <h2>Generatore Nebula</h2>
        <p class="atlas-generator__status" :data-tone="generatorStatus.status">
          {{ generatorStatus.label }}
        </p>
        <p class="atlas-generator__meta">
          Ultima run: {{ generatorRunLabel }} · Dataset: {{ generatorMetrics.datasetSpeciesTotal }} specie
        </p>
      </div>
      <div class="atlas-generator__actions">
        <button type="button" @click="refresh">Aggiorna stato</button>
      </div>
    </header>

    <p v-if="moduleError" class="atlas-generator__error">{{ moduleError }}</p>

    <section v-else class="atlas-generator__grid">
      <article class="atlas-generator__panel">
        <h3>Metriche principali</h3>
        <ul>
          <li>
            <span>Specie generate</span>
            <strong>{{ generatorMetrics.speciesTotal }}</strong>
          </li>
          <li>
            <span>Blueprint arricchiti</span>
            <strong>{{ generatorMetrics.enrichedSpecies }}</strong>
          </li>
          <li>
            <span>Copertura media</span>
            <strong>{{ generatorMetrics.coverageAverage }}%</strong>
          </li>
          <li>
            <span>Eventi telemetria</span>
            <strong>{{ generatorMetrics.eventTotal }}</strong>
          </li>
        </ul>
      </article>

      <article class="atlas-generator__panel">
        <h3>Distribuzione tratti</h3>
        <div class="atlas-generator__traits">
          <div>
            <span>Core traits</span>
            <strong>{{ generatorMetrics.coreTraits }}</strong>
          </div>
          <div>
            <span>Optional</span>
            <strong>{{ generatorMetrics.optionalTraits }}</strong>
          </div>
          <div>
            <span>Synergy</span>
            <strong>{{ generatorMetrics.synergyTraits }}</strong>
          </div>
        </div>
      </article>

      <article class="atlas-generator__panel atlas-generator__panel--chart">
        <header>
          <h3>Tempo di generazione</h3>
          <span>{{ generatorMetrics.generationTimeMs ? `${generatorMetrics.generationTimeMs}ms` : 'N/D' }}</span>
        </header>
        <SparklineChart :points="generatorStreams.generationTime" color="#6366f1" />
      </article>

      <article class="atlas-generator__panel atlas-generator__panel--chart">
        <header>
          <h3>Specie per ciclo</h3>
          <span>{{ generatorMetrics.speciesTotal }}</span>
        </header>
        <SparklineChart :points="generatorStreams.species" color="#0ea5e9" />
      </article>

      <article class="atlas-generator__panel atlas-generator__panel--chart">
        <header>
          <h3>Blueprint arricchiti</h3>
          <span>{{ generatorMetrics.enrichedSpecies }}</span>
        </header>
        <SparklineChart :points="generatorStreams.enriched" color="#f59e0b" />
      </article>
    </section>
  </section>
</template>

<script setup>
import { computed } from 'vue';

import SparklineChart from '../../components/shared/SparklineChart.vue';
import { useNebulaProgressModule } from '../../modules/useNebulaProgressModule';

const moduleState = useNebulaProgressModule();

const generatorStatus = computed(() => moduleState.generatorStatus.value);
const generatorMetrics = computed(() => moduleState.generatorMetrics.value);
const generatorStreams = computed(() => moduleState.generatorStreams.value);
const moduleError = computed(() => moduleState.error.value?.message || null);

const generatorRunLabel = computed(() => {
  const status = generatorStatus.value;
  const timestamp = status.generatedAt || status.updatedAt;
  if (!timestamp) {
    return 'N/D';
  }
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }
  return new Intl.DateTimeFormat('it-IT', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
});

const refresh = () => moduleState.refresh();
</script>

<style scoped>
.atlas-generator {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.atlas-generator__header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.atlas-generator__status {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
}

.atlas-generator__status[data-tone='warning'],
.atlas-generator__status[data-tone='degraded'] {
  color: #b45309;
}

.atlas-generator__status[data-tone='critical'],
.atlas-generator__status[data-tone='offline'] {
  color: #b91c1c;
}

.atlas-generator__meta {
  margin-top: 0.35rem;
  color: #475569;
  font-size: 0.95rem;
}

.atlas-generator__actions button {
  padding: 0.6rem 1rem;
  border-radius: 0.75rem;
  background: #0f172a;
  color: #fff;
  border: none;
  cursor: pointer;
  font-weight: 600;
}

.atlas-generator__error {
  padding: 1rem 1.5rem;
  border-radius: 1rem;
  background: rgba(248, 113, 113, 0.12);
  color: #991b1b;
}

.atlas-generator__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1.5rem;
}

.atlas-generator__panel {
  padding: 1.5rem;
  border-radius: 1.25rem;
  background: #fff;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.atlas-generator__panel ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: 0.75rem;
  color: #475569;
}

.atlas-generator__panel ul li {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.atlas-generator__panel ul strong {
  font-size: 1.3rem;
  color: #0f172a;
}

.atlas-generator__traits {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: 0.75rem;
  color: #475569;
}

.atlas-generator__traits strong {
  font-size: 1.3rem;
  color: #0f172a;
}

.atlas-generator__panel--chart header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.95rem;
  color: #334155;
}
</style>
