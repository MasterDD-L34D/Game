<template>
  <section class="atlas-telemetry" aria-live="polite">
    <header class="atlas-telemetry__header">
      <div>
        <h2>Telemetria Nebula</h2>
        <p class="atlas-telemetry__status" :data-mode="telemetryStatus.mode">
          {{ telemetryStatus.label }} · {{ datasetStatus.label }}
        </p>
      </div>
      <div class="atlas-telemetry__actions">
        <button type="button" @click="refresh">Aggiorna ora</button>
        <button type="button" @click="activateDemo">Modalità demo</button>
      </div>
    </header>

    <p v-if="moduleError" class="atlas-telemetry__error">{{ moduleError }}</p>

    <section v-else class="atlas-telemetry__grid">
      <article class="atlas-telemetry__panel">
        <h3>Riepilogo eventi</h3>
        <ul class="atlas-telemetry__summary">
          <li>
            <span>Eventi totali</span>
            <strong>{{ telemetrySummary.total }}</strong>
          </li>
          <li>
            <span>Eventi aperti</span>
            <strong :data-tone="telemetrySummary.open > 0 ? 'warning' : 'success'">
              {{ telemetrySummary.open }}
            </strong>
          </li>
          <li>
            <span>Priorità alta</span>
            <strong :data-tone="telemetrySummary.highPriority > 0 ? 'critical' : 'neutral'">
              {{ telemetrySummary.highPriority }}
            </strong>
          </li>
          <li>
            <span>Acknowledged</span>
            <strong>{{ telemetrySummary.acknowledged }}</strong>
          </li>
        </ul>
        <p class="atlas-telemetry__updated">Ultimo evento: {{ telemetrySummary.lastEventLabel }}</p>
      </article>

      <article class="atlas-telemetry__panel">
        <h3>Distribuzione readiness</h3>
        <ul class="atlas-telemetry__chips">
          <li v-for="chip in readinessChips" :key="chip.id" :data-tone="chip.tone">
            <span>{{ chip.label }}</span>
            <strong>{{ chip.value }}</strong>
            <small v-if="chip.badge">{{ chip.badge }}</small>
          </li>
        </ul>
      </article>

      <article class="atlas-telemetry__panel atlas-telemetry__panel--chart">
        <header>
          <h3>Copertura QA</h3>
          <span>{{ telemetryCoverageAverage }}%</span>
        </header>
        <SparklineChart :points="coverageStream" color="#4f46e5" />
      </article>

      <article class="atlas-telemetry__panel atlas-telemetry__panel--chart">
        <header>
          <h3>Timeline incidenti</h3>
          <span>7 giorni</span>
        </header>
        <SparklineChart :points="incidentStream" color="#0ea5e9" />
      </article>

      <article class="atlas-telemetry__panel atlas-telemetry__panel--chart">
        <header>
          <h3>High priority</h3>
          <span>Ticket giornalieri</span>
        </header>
        <SparklineChart :points="highPriorityStream" color="#f97316" />
      </article>
    </section>
  </section>
</template>

<script setup>
import { computed } from 'vue';

import SparklineChart from '../../components/metrics/SparklineChart.vue';
import { useNebulaProgressModule } from '../../modules/useNebulaProgressModule';

const moduleState = useNebulaProgressModule();

const datasetStatus = computed(() => {
  const status = moduleState.datasetStatus?.value;
  if (status) {
    return status;
  }
  return { label: 'Dataset live', source: 'remote', demo: false };
});

const telemetryStatus = computed(() => moduleState.telemetryStatus.value);
const moduleError = computed(() => moduleState.error.value?.message || null);

const telemetrySummary = computed(() => moduleState.telemetrySummary.value);
const telemetryCoverageAverage = computed(() => moduleState.telemetryCoverageAverage.value);
const coverageStream = computed(() => moduleState.telemetryStreams.value.coverage);
const incidentStream = computed(() => moduleState.telemetryStreams.value.incidents);
const highPriorityStream = computed(() => moduleState.telemetryStreams.value.highPriority);

const readinessChips = computed(() => {
  const distribution = moduleState.telemetryDistribution.value;
  const status = telemetryStatus.value;
  const dataset = datasetStatus.value;
  const chips = [
    { id: 'success', label: 'Pronte', tone: 'success', value: distribution.success },
    { id: 'warning', label: 'In attesa', tone: 'warning', value: distribution.warning },
    { id: 'neutral', label: 'Neutrali', tone: 'neutral', value: distribution.neutral },
    { id: 'critical', label: 'Bloccate', tone: 'critical', value: distribution.critical },
  ];
  if (status.offline || dataset.source !== 'remote' || dataset.demo) {
    const badge = status.mode === 'mock' ? 'Telemetria demo' : 'Fallback dataset';
    return chips.map((chip) => ({ ...chip, badge }));
  }
  return chips.map((chip) => ({ ...chip, badge: '' }));
});

const refresh = () => moduleState.refresh();
const activateDemo = () => {
  if (typeof moduleState.activateDemoTelemetry === 'function') {
    return moduleState.activateDemoTelemetry();
  }
  return moduleState.refresh();
};
</script>

<style scoped>
.atlas-telemetry {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.atlas-telemetry__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.atlas-telemetry__status {
  font-size: 0.95rem;
  color: #334155;
}

.atlas-telemetry__status[data-mode='fallback'] {
  color: #b45309;
}

.atlas-telemetry__status[data-mode='mock'] {
  color: #6366f1;
}

.atlas-telemetry__actions {
  display: flex;
  gap: 0.75rem;
}

.atlas-telemetry__actions button {
  padding: 0.6rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid transparent;
  background: #1e293b;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.atlas-telemetry__actions button:last-child {
  background: transparent;
  color: #1e293b;
  border-color: rgba(30, 41, 59, 0.2);
}

.atlas-telemetry__error {
  padding: 1rem 1.5rem;
  border-radius: 1rem;
  background: rgba(248, 113, 113, 0.12);
  color: #991b1b;
}

.atlas-telemetry__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1.5rem;
}

.atlas-telemetry__panel {
  padding: 1.5rem;
  border-radius: 1.25rem;
  background: #fff;
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.atlas-telemetry__summary {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: 0.75rem;
}

.atlas-telemetry__summary li {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: #475569;
}

.atlas-telemetry__summary strong {
  font-size: 1.4rem;
  color: #0f172a;
}

.atlas-telemetry__summary strong[data-tone='warning'] {
  color: #b45309;
}

.atlas-telemetry__summary strong[data-tone='critical'] {
  color: #b91c1c;
}

.atlas-telemetry__updated {
  font-size: 0.9rem;
  color: #475569;
}

.atlas-telemetry__chips {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: 0.75rem;
}

.atlas-telemetry__chips li {
  padding: 0.85rem 1rem;
  border-radius: 1rem;
  background: rgba(15, 23, 42, 0.04);
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.25rem;
  align-items: center;
}

.atlas-telemetry__chips li[data-tone='success'] {
  background: rgba(34, 197, 94, 0.14);
}

.atlas-telemetry__chips li[data-tone='warning'] {
  background: rgba(234, 179, 8, 0.16);
}

.atlas-telemetry__chips li[data-tone='critical'] {
  background: rgba(248, 113, 113, 0.18);
}

.atlas-telemetry__chips li strong {
  justify-self: end;
  font-size: 1.2rem;
  color: #0f172a;
}

.atlas-telemetry__chips li small {
  grid-column: 1 / -1;
  font-size: 0.75rem;
  color: #475569;
}

.atlas-telemetry__panel--chart header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.95rem;
  color: #334155;
}
</style>
