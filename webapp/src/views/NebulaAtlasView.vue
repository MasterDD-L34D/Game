<template>
  <section class="nebula-atlas-view">
    <NebulaProgressModule
      :header="moduleState.header"
      :cards="moduleState.cards"
      :timeline-entries="moduleState.timelineEntries"
      :evolution-matrix="moduleState.evolutionMatrix"
      :share="moduleState.share"
    />

    <section class="nebula-atlas-view__live" aria-live="polite">
      <header class="nebula-atlas-view__live-header">
        <div>
          <h3>Telemetria live</h3>
          <p>Indicatori dal generatore Nebula combinati con il dataset atlas.</p>
        </div>
        <div class="nebula-atlas-view__status">
          <span v-if="moduleState.loading" class="nebula-atlas-view__badge">Aggiornamento…</span>
          <span v-else class="nebula-atlas-view__badge" :data-tone="statusTone">{{ statusLabel }}</span>
          <small>Ultimo sync: {{ moduleState.telemetrySummary.updatedAt ? moduleState.telemetrySummary.updatedAt : '—' }}</small>
        </div>
      </header>

      <div v-if="moduleState.error" class="nebula-atlas-view__error" role="status">
        {{ moduleState.error.message }}
      </div>

      <div class="nebula-atlas-view__grid" v-else>
        <div class="nebula-atlas-view__metrics">
          <article v-for="card in summaryCards" :key="card.id" class="nebula-atlas-view__metric" :data-tone="card.tone">
            <h4>{{ card.label }}</h4>
            <strong>{{ card.value }}</strong>
          </article>
        </div>

        <div class="nebula-atlas-view__readiness">
          <h4>Readiness branchi</h4>
          <ul>
            <li v-for="chip in readinessChips" :key="chip.id" :data-tone="chip.tone">
              <span>{{ chip.label }}</span>
              <strong>{{ chip.value }}</strong>
            </li>
          </ul>
        </div>

        <div class="nebula-atlas-view__chart" aria-label="Copertura QA">
          <header>
            <h4>Copertura QA media</h4>
            <span>{{ moduleState.telemetryCoverageAverage }}%</span>
          </header>
          <SparklineChart :points="coverageStream" color="#61d5ff" />
        </div>

        <div class="nebula-atlas-view__chart" aria-label="Incidenti telemetria">
          <header>
            <h4>Incidenti ultimi 7 giorni</h4>
            <span>{{ incidentStream.reduce((acc, value) => acc + value, 0) }}</span>
          </header>
          <SparklineChart :points="incidentStream" color="#ff6982" />
        </div>

        <div class="nebula-atlas-view__chart" aria-label="High priority">
          <header>
            <h4>High priority</h4>
            <span>{{ highPriorityStream.reduce((acc, value) => acc + value, 0) }}</span>
          </header>
          <SparklineChart :points="highPriorityStream" color="#f4c060" />
        </div>
      </div>

      <footer class="nebula-atlas-view__footer">
        <span>{{ moduleState.telemetrySummary.lastEventLabel }}</span>
        <button type="button" class="nebula-atlas-view__refresh" @click="refresh">Aggiorna ora</button>
      </footer>
    </section>
  </section>
</template>

<script setup>
import { computed } from 'vue';
import NebulaProgressModule from '../components/flow/NebulaProgressModule.vue';
import SparklineChart from '../components/shared/SparklineChart.vue';
import { useNebulaProgressModule } from '../modules/useNebulaProgressModule';

const moduleState = useNebulaProgressModule();

const summaryCards = computed(() => {
  const summary = moduleState.telemetrySummary.value;
  return [
    { id: 'total', label: 'Eventi totali', value: summary.total, tone: 'neutral' },
    { id: 'open', label: 'Eventi aperti', value: summary.open, tone: summary.open > 0 ? 'warning' : 'success' },
    { id: 'high', label: 'Priorità alta', value: summary.highPriority, tone: summary.highPriority > 0 ? 'critical' : 'neutral' },
    { id: 'ack', label: 'Acknowledged', value: summary.acknowledged, tone: 'success' },
  ];
});

const readinessChips = computed(() => {
  const distribution = moduleState.telemetryDistribution.value;
  return [
    { id: 'success', label: 'Pronte', tone: 'success', value: distribution.success },
    { id: 'warning', label: 'In attesa', tone: 'warning', value: distribution.warning },
    { id: 'neutral', label: 'Neutrali', tone: 'neutral', value: distribution.neutral },
    { id: 'critical', label: 'Bloccate', tone: 'critical', value: distribution.critical },
  ];
});

const coverageStream = computed(() => moduleState.telemetryStreams.value.coverage);
const incidentStream = computed(() => moduleState.telemetryStreams.value.incidents);
const highPriorityStream = computed(() => moduleState.telemetryStreams.value.highPriority);

const statusTone = computed(() => (moduleState.telemetrySummary.value.open > 0 ? 'warning' : 'success'));
const statusLabel = computed(() =>
  moduleState.loading.value ? 'Aggiornamento…' : moduleState.telemetrySummary.value.lastEventLabel,
);

const refresh = () => moduleState.refresh();
</script>

<style scoped>
.nebula-atlas-view {
  display: grid;
  gap: 2.5rem;
}

.nebula-atlas-view__live {
  background: rgba(5, 8, 13, 0.9);
  border: 1px solid rgba(97, 213, 255, 0.35);
  border-radius: 20px;
  padding: 2rem;
  color: #e6f3ff;
  display: grid;
  gap: 2rem;
}

.nebula-atlas-view__live-header {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.nebula-atlas-view__status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.4rem;
}

.nebula-atlas-view__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.25rem 0.85rem;
  font-size: 0.85rem;
  background: rgba(97, 213, 255, 0.18);
  color: #61d5ff;
}

.nebula-atlas-view__badge[data-tone='warning'] {
  background: rgba(244, 192, 96, 0.18);
  color: #f4c060;
}

.nebula-atlas-view__badge[data-tone='success'] {
  background: rgba(115, 255, 206, 0.18);
  color: #73ffce;
}

.nebula-atlas-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
}

.nebula-atlas-view__metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 1rem;
}

.nebula-atlas-view__metric {
  padding: 1.25rem;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.65);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: 1px solid rgba(97, 213, 255, 0.18);
}

.nebula-atlas-view__metric[data-tone='warning'] {
  border-color: rgba(244, 192, 96, 0.35);
}

.nebula-atlas-view__metric[data-tone='critical'] {
  border-color: rgba(255, 105, 130, 0.4);
}

.nebula-atlas-view__metric[data-tone='success'] {
  border-color: rgba(115, 255, 206, 0.35);
}

.nebula-atlas-view__metric h4 {
  margin: 0;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(230, 243, 255, 0.75);
}

.nebula-atlas-view__metric strong {
  font-size: 1.8rem;
}

.nebula-atlas-view__readiness {
  padding: 1.5rem;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(97, 213, 255, 0.18);
}

.nebula-atlas-view__readiness h4 {
  margin: 0 0 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.85rem;
  color: rgba(230, 243, 255, 0.75);
}

.nebula-atlas-view__readiness ul {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.nebula-atlas-view__readiness li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: rgba(230, 243, 255, 0.05);
  border: 1px solid rgba(97, 213, 255, 0.12);
}

.nebula-atlas-view__readiness li[data-tone='warning'] {
  border-color: rgba(244, 192, 96, 0.25);
}

.nebula-atlas-view__readiness li[data-tone='critical'] {
  border-color: rgba(255, 105, 130, 0.35);
}

.nebula-atlas-view__readiness li[data-tone='success'] {
  border-color: rgba(115, 255, 206, 0.3);
}

.nebula-atlas-view__chart {
  padding: 1.5rem;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(97, 213, 255, 0.18);
  display: grid;
  gap: 1rem;
}

.nebula-atlas-view__chart header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 1rem;
}

.nebula-atlas-view__chart h4 {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.85rem;
  color: rgba(230, 243, 255, 0.75);
}

.nebula-atlas-view__chart span {
  font-weight: 600;
  color: rgba(230, 243, 255, 0.9);
}

.nebula-atlas-view__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  font-size: 0.9rem;
  color: rgba(230, 243, 255, 0.7);
}

.nebula-atlas-view__refresh {
  background: linear-gradient(135deg, #61d5ff, #9f7bff);
  border: none;
  color: #05080d;
  font-weight: 600;
  padding: 0.5rem 1.5rem;
  border-radius: 999px;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.nebula-atlas-view__refresh:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(97, 213, 255, 0.35);
}

.nebula-atlas-view__error {
  padding: 1rem 1.5rem;
  border-radius: 12px;
  background: rgba(255, 105, 130, 0.15);
  border: 1px solid rgba(255, 105, 130, 0.35);
  color: #ffd5de;
}
</style>
