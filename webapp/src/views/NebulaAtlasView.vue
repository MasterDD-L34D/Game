<template>
  <section class="nebula-atlas-view">
    <aside v-if="telemetryStatus.offline" class="nebula-atlas-view__banner" role="status">
      <div>
        <h2>Modalità demo attiva</h2>
        <p>
          Il dataset statico {{ datasetInfo.title }} è disponibile offline mentre la telemetria live è
          temporaneamente sospesa. I grafici mostrano una sincronizzazione mock per mantenere la console operativa.
        </p>
        <p class="nebula-atlas-view__banner-meta">
          Origine dati: <strong>{{ datasetInfo.sourceLabel }}</strong>
        </p>
      </div>
      <div class="nebula-atlas-view__banner-actions">
        <button type="button" class="nebula-atlas-view__banner-button" @click="refresh">
          Riprova sincronizzazione
        </button>
        <button type="button" class="nebula-atlas-view__banner-button" @click="activateDemo">
          Forza telemetria demo
        </button>
      </div>
    </aside>

    <NebulaProgressModule
      :header="moduleState.header"
      :cards="moduleState.cards"
      :timeline-entries="moduleState.timelineEntries"
      :evolution-matrix="moduleState.evolutionMatrix"
      :share="moduleState.share"
      :telemetry-status="moduleState.telemetryStatus.value"
    />

    <section class="nebula-atlas-view__live" aria-live="polite">
      <header class="nebula-atlas-view__live-header">
        <div>
          <h3>Telemetria live</h3>
          <p>Indicatori dal generatore Nebula combinati con il dataset atlas.</p>
        </div>
        <div class="nebula-atlas-view__status">
          <span class="nebula-atlas-view__badge" :data-tone="statusTone">{{ statusLabel }}</span>
          <small>Ultimo sync: {{ statusMeta }}</small>
        </div>
      </header>

      <div v-if="moduleError" class="nebula-atlas-view__error" role="status">
        {{ moduleError.message }}
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
            <li
              v-for="chip in readinessChips"
              :key="chip.id"
              :data-tone="chip.tone"
              :data-mode="chip.demo ? 'demo' : 'live'"
            >
              <div class="nebula-atlas-view__chip-label">
                <span>{{ chip.label }}</span>
                <small v-if="chip.demo">{{ chip.badge }}</small>
              </div>
              <strong>{{ chip.value }}</strong>
            </li>
          </ul>
        </div>

        <div class="nebula-atlas-view__chart" aria-label="Copertura QA">
          <header>
            <h4>Copertura QA media</h4>
            <span>{{ moduleState.telemetryCoverageAverage }}%</span>
          </header>
          <SparklineChart :points="coverageStream" color="#61d5ff" :variant="chartVariant" />
        </div>

        <div class="nebula-atlas-view__chart" aria-label="Incidenti telemetria">
          <header>
            <h4>Incidenti ultimi 7 giorni</h4>
            <span>{{ incidentStream.reduce((acc, value) => acc + value, 0) }}</span>
          </header>
          <SparklineChart :points="incidentStream" color="#ff6982" :variant="chartVariant" />
        </div>

        <div class="nebula-atlas-view__chart" aria-label="High priority">
          <header>
            <h4>High priority</h4>
            <span>{{ highPriorityStream.reduce((acc, value) => acc + value, 0) }}</span>
          </header>
          <SparklineChart :points="highPriorityStream" color="#f4c060" :variant="chartVariant" />
        </div>

        <div class="nebula-atlas-view__generator" aria-label="Telemetria generatore">
          <header>
            <div>
              <h4>Generatore Nebula</h4>
              <small>{{ generatorSourceLabel }}</small>
            </div>
            <span class="nebula-atlas-view__badge" :data-tone="generatorTone">{{ generatorStatusLabel }}</span>
          </header>

          <p class="nebula-atlas-view__generator-meta">Ultima run: {{ generatorRunLabel }}</p>

          <div class="nebula-atlas-view__metrics nebula-atlas-view__metrics--generator">
            <article
              v-for="card in generatorCards"
              :key="card.id"
              class="nebula-atlas-view__metric"
              :data-tone="card.tone"
            >
              <h4>{{ card.label }}</h4>
              <strong>{{ card.value }}</strong>
              <small v-if="card.meta">{{ card.meta }}</small>
            </article>
          </div>

          <div class="nebula-atlas-view__generator-charts">
            <div class="nebula-atlas-view__chart" aria-label="Tempo generazione">
              <header>
                <h4>Tempo generazione</h4>
                <span>{{ generatorMetrics.generationTimeMs ?? '—' }} ms</span>
              </header>
              <SparklineChart
                :points="generatorStreams.generationTime"
                color="#7c5cff"
                :variant="chartVariant"
              />
            </div>
            <div class="nebula-atlas-view__chart" aria-label="Specie generate">
              <header>
                <h4>Specie generate</h4>
                <span>{{ generatorMetrics.speciesTotal }}</span>
              </header>
              <SparklineChart
                :points="generatorStreams.species"
                color="#4ade80"
                :variant="chartVariant"
              />
            </div>
            <div class="nebula-atlas-view__chart" aria-label="Blueprint arricchiti">
              <header>
                <h4>Blueprint arricchiti</h4>
                <span>{{ generatorMetrics.enrichedSpecies }}</span>
              </header>
              <SparklineChart
                :points="generatorStreams.enriched"
                color="#ff99cc"
                :variant="chartVariant"
              />
            </div>
          </div>
        </div>
      </div>

      <footer class="nebula-atlas-view__footer">
        <span>{{ lastEventLabel }}</span>
        <div class="nebula-atlas-view__controls">
          <button type="button" class="nebula-atlas-view__refresh" @click="refresh">Aggiorna ora</button>
          <button type="button" class="nebula-atlas-view__refresh" @click="activateDemo">Carica mock</button>
        </div>
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

const datasetInfo = computed(() => {
  const header = moduleState.header.value || {};
  const summary = moduleState.telemetrySummary.value;
  return {
    title: header.title || 'Nebula Atlas Dataset',
    summary: header.summary || '',
    sourceLabel: summary.sourceLabel,
  };
});

const telemetryStatus = computed(() => moduleState.telemetryStatus.value);
const moduleError = computed(() => moduleState.error.value);
const lastEventLabel = computed(() => moduleState.telemetrySummary.value.lastEventLabel);

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
  const status = telemetryStatus.value;
  const chips = [
    { id: 'success', label: 'Pronte', tone: 'success', value: distribution.success },
    { id: 'warning', label: 'In attesa', tone: 'warning', value: distribution.warning },
    { id: 'neutral', label: 'Neutrali', tone: 'neutral', value: distribution.neutral },
    { id: 'critical', label: 'Bloccate', tone: 'critical', value: distribution.critical },
  ];
  if (status.offline) {
    const badge = status.mode === 'fallback' ? 'Offline fallback' : 'Offline demo';
    return chips.map((chip) => ({ ...chip, demo: true, badge }));
  }
  return chips.map((chip) => ({ ...chip, demo: false, badge: '' }));
});

const coverageStream = computed(() => moduleState.telemetryStreams.value.coverage);
const incidentStream = computed(() => moduleState.telemetryStreams.value.incidents);
const highPriorityStream = computed(() => moduleState.telemetryStreams.value.highPriority);

const generatorStatusState = computed(() => {
  const status = moduleState.generatorStatus?.value;
  if (!status) {
    return {
      status: 'unknown',
      label: 'Generatore non disponibile',
      generatedAt: null,
      updatedAt: null,
      sourceLabel: 'Generator telemetry offline',
    };
  }
  return status;
});

const generatorMetrics = computed(() => {
  const metrics = moduleState.generatorMetrics?.value;
  if (!metrics) {
    return {
      generationTimeMs: null,
      speciesTotal: 0,
      enrichedSpecies: 0,
      eventTotal: 0,
      datasetSpeciesTotal: 0,
      coverageAverage: 0,
      coreTraits: 0,
      optionalTraits: 0,
      synergyTraits: 0,
      expectedCoreTraits: 0,
    };
  }
  return metrics;
});

const generatorStreams = computed(() => {
  const streams = moduleState.generatorStreams?.value;
  if (!streams) {
    return { generationTime: [], species: [], enriched: [] };
  }
  return streams;
});

function formatRunTimestamp(timestamp) {
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
    second: '2-digit',
  }).format(date);
}

const generatorStatusLabel = computed(() => generatorStatusState.value.label);
const generatorRunLabel = computed(() => formatRunTimestamp(generatorStatusState.value.generatedAt || generatorStatusState.value.updatedAt));
const generatorSourceLabel = computed(() => generatorStatusState.value.sourceLabel);

const generatorTone = computed(() => {
  const status = generatorStatusState.value.status;
  if (status === 'success') {
    return 'success';
  }
  if (status === 'warning' || status === 'degraded') {
    return 'warning';
  }
  if (status === 'unknown') {
    return 'neutral';
  }
  return 'offline';
});

const generatorCards = computed(() => {
  const metrics = generatorMetrics.value;
  const coverage = typeof metrics.coverageAverage === 'number' ? metrics.coverageAverage : 0;
  const datasetTotal = metrics.datasetSpeciesTotal || 0;
  return [
    { id: 'species-total', label: 'Specie totali', value: metrics.speciesTotal, tone: 'neutral' },
    {
      id: 'enriched',
      label: 'Blueprint arricchiti',
      value: metrics.enrichedSpecies,
      tone: metrics.enrichedSpecies >= datasetTotal ? 'success' : 'warning',
      meta: datasetTotal ? `Target ${datasetTotal}` : '',
    },
    {
      id: 'events',
      label: 'Eventi runtime',
      value: metrics.eventTotal,
      tone: metrics.eventTotal > 0 ? 'warning' : 'success',
    },
    {
      id: 'coverage',
      label: 'Copertura atlas',
      value: `${coverage}%`,
      tone: coverage >= 75 ? 'success' : 'neutral',
    },
  ];
});

const statusTone = computed(() => {
  if (moduleState.loading.value) {
    return 'neutral';
  }
  if (telemetryStatus.value.offline) {
    return 'offline';
  }
  return moduleState.telemetrySummary.value.open > 0 ? 'warning' : 'success';
});

const statusLabel = computed(() => {
  if (moduleState.loading.value) {
    return 'Aggiornamento…';
  }
  if (telemetryStatus.value.offline) {
    return telemetryStatus.value.label;
  }
  return moduleState.telemetrySummary.value.lastEventLabel;
});

const statusMeta = computed(() => {
  const summary = moduleState.telemetrySummary.value;
  const base = summary.updatedAt ? summary.updatedAt : '—';
  return summary.isDemo ? `${base} · ${summary.sourceLabel}` : base;
});

const chartVariant = computed(() => telemetryStatus.value.variant);

const refresh = () => moduleState.refresh();
const activateDemo = () => {
  if (typeof moduleState.activateDemoTelemetry === 'function') {
    return moduleState.activateDemoTelemetry();
  }
  return moduleState.refresh();
};
</script>

<style scoped>
.nebula-atlas-view {
  display: grid;
  gap: 2.5rem;
}

.nebula-atlas-view__banner {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1.5rem;
  padding: 1.75rem 2rem;
  border-radius: 1.25rem;
  border: 1px solid rgba(255, 209, 102, 0.25);
  background: rgba(255, 209, 102, 0.12);
  color: #ffe3a6;
}

.nebula-atlas-view__banner h2 {
  margin: 0 0 0.5rem;
  font-size: 1.35rem;
}

.nebula-atlas-view__banner-meta {
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.85;
}

.nebula-atlas-view__banner-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.nebula-atlas-view__banner-button {
  padding: 0.65rem 1.1rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 209, 102, 0.45);
  background: rgba(16, 19, 32, 0.6);
  color: #ffecc2;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease;
}

.nebula-atlas-view__banner-button:hover {
  background: rgba(16, 19, 32, 0.8);
  transform: translateY(-1px);
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
  background: rgba(74, 222, 128, 0.18);
  color: #4ade80;
}

.nebula-atlas-view__badge[data-tone='offline'] {
  background: rgba(255, 153, 204, 0.18);
  color: #ff99cc;
}

.nebula-atlas-view__badge[data-tone='neutral'] {
  background: rgba(148, 163, 184, 0.18);
  color: #94a3b8;
}

.nebula-atlas-view__error {
  padding: 1rem 1.25rem;
  border-radius: 0.85rem;
  background: rgba(255, 105, 130, 0.1);
  border: 1px solid rgba(255, 105, 130, 0.35);
  color: #ff99aa;
}

.nebula-atlas-view__grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
}

.nebula-atlas-view__metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: 1rem;
}

.nebula-atlas-view__metrics--generator {
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
}

.nebula-atlas-view__metric {
  background: rgba(14, 20, 32, 0.8);
  border-radius: 0.95rem;
  padding: 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  border: 1px solid rgba(97, 213, 255, 0.12);
}

.nebula-atlas-view__metric[data-tone='warning'] {
  border-color: rgba(244, 192, 96, 0.35);
}

.nebula-atlas-view__metric[data-tone='success'] {
  border-color: rgba(74, 222, 128, 0.35);
}

.nebula-atlas-view__metric[data-tone='critical'] {
  border-color: rgba(255, 105, 130, 0.4);
}

.nebula-atlas-view__readiness {
  background: rgba(14, 20, 32, 0.8);
  border-radius: 0.95rem;
  padding: 1.15rem;
  border: 1px solid rgba(97, 213, 255, 0.18);
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.nebula-atlas-view__readiness ul {
  list-style: none;
  display: grid;
  gap: 0.65rem;
  padding: 0;
  margin: 0;
}

.nebula-atlas-view__readiness li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.75rem;
  background: rgba(5, 8, 13, 0.75);
  border: 1px solid rgba(97, 213, 255, 0.14);
}

.nebula-atlas-view__readiness li[data-mode='demo'] {
  border-style: dashed;
}

.nebula-atlas-view__chip-label {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.nebula-atlas-view__readiness li[data-tone='success'] {
  border-color: rgba(74, 222, 128, 0.25);
}

.nebula-atlas-view__readiness li[data-tone='warning'] {
  border-color: rgba(244, 192, 96, 0.25);
}

.nebula-atlas-view__readiness li[data-tone='critical'] {
  border-color: rgba(255, 105, 130, 0.25);
}

.nebula-atlas-view__chart {
  background: rgba(14, 20, 32, 0.8);
  border-radius: 0.95rem;
  padding: 1.15rem;
  border: 1px solid rgba(97, 213, 255, 0.18);
  display: grid;
  gap: 0.75rem;
}

.nebula-atlas-view__generator {
  grid-column: 1 / -1;
  display: grid;
  gap: 1.5rem;
  background: rgba(12, 16, 26, 0.85);
  border-radius: 1rem;
  border: 1px solid rgba(124, 92, 255, 0.25);
  padding: 1.5rem;
}

.nebula-atlas-view__generator > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.nebula-atlas-view__generator h4 {
  margin: 0;
}

.nebula-atlas-view__generator small {
  opacity: 0.7;
}

.nebula-atlas-view__generator-meta {
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.85;
}

.nebula-atlas-view__generator-charts {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
}

.nebula-atlas-view__chart header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.nebula-atlas-view__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.nebula-atlas-view__controls {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.nebula-atlas-view__refresh {
  padding: 0.55rem 1.1rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(97, 213, 255, 0.45);
  background: rgba(6, 12, 21, 0.75);
  color: #c9e7ff;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease;
}

.nebula-atlas-view__refresh:hover {
  background: rgba(6, 12, 21, 0.95);
  transform: translateY(-1px);
}
</style>
