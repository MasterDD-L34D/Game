<template>
  <section class="campaign-progress">
    <header class="campaign-progress__header">
      <div>
        <h2>Progressione campagna</h2>
        <p>
          Monitoraggio continuo del funnel di conversione e della reattività dei canali operativi
          per la campagna in corso.
        </p>
      </div>
      <dl class="campaign-progress__meta">
        <div>
          <dt>Ultimo aggiornamento</dt>
          <dd>{{ formatTimestamp(summary.lastUpdated) }}</dd>
        </div>
        <div>
          <dt>Campagne attive</dt>
          <dd>{{ summary.activeCampaigns }}</dd>
        </div>
      </dl>
    </header>

    <section class="campaign-progress__summary">
      <article class="campaign-progress__card">
        <h3>Lead totali</h3>
        <p class="campaign-progress__value">{{ formatNumber(summary.totalLeads) }}</p>
        <p class="campaign-progress__caption">Totale opportunità raccolte nel periodo</p>
      </article>
      <article class="campaign-progress__card">
        <h3>Tasso di conversione</h3>
        <p class="campaign-progress__value">{{ formatPercent(summary.conversionRate) }}</p>
        <p class="campaign-progress__caption">
          Target: {{ formatPercent(summary.targetConversionRate) }} · {{ conversionDeltaLabel }}
        </p>
      </article>
      <article class="campaign-progress__card">
        <h3>Momentum medio</h3>
        <p class="campaign-progress__value">{{ formatPercent(averageMomentum) }}</p>
        <p class="campaign-progress__caption">Var. media giornaliera sul funnel</p>
      </article>
      <article class="campaign-progress__card">
        <h3>Segmento top</h3>
        <p class="campaign-progress__value">{{ topPerformer?.title ?? '—' }}</p>
        <p class="campaign-progress__caption">Owner: {{ topPerformer?.owner ?? '—' }}</p>
      </article>
    </section>

    <div class="campaign-progress__layout">
      <section class="campaign-progress__panel campaign-progress__panel--funnel">
        <header class="campaign-progress__panel-header">
          <div>
            <h3>Funnel di conversione</h3>
            <p>Analisi dei passaggi dalla scoperta alla fidelizzazione.</p>
          </div>
          <span class="campaign-progress__panel-meta">{{ normalizedFunnel.length }} stadi</span>
        </header>
        <ol class="funnel">
          <li v-for="(stage, index) in normalizedFunnel" :key="stage.id" class="funnel__stage">
            <div class="funnel__bar" :style="{ '--width': stage.width + '%', '--index': index }">
              <strong>{{ stage.label }}</strong>
              <span class="funnel__metric">{{ formatNumber(stage.leads) }} lead</span>
              <span class="funnel__metric">{{ formatPercent(stage.conversionRate) }} conv.</span>
            </div>
            <footer class="funnel__footer">
              <span>Drop-off: {{ formatPercent(stage.dropOffRate) }}</span>
              <span :class="{ 'funnel__delta--up': stage.delta >= 0, 'funnel__delta--down': stage.delta < 0 }">
                {{ stage.delta >= 0 ? '▲' : '▼' }} {{ formatPercent(Math.abs(stage.delta)) }}
              </span>
            </footer>
          </li>
          <li v-if="!normalizedFunnel.length" class="funnel__empty">Nessun dato disponibile.</li>
        </ol>
      </section>

      <section class="campaign-progress__panel campaign-progress__panel--heatmap">
        <header class="campaign-progress__panel-header">
          <div>
            <h3>Heatmap canali</h3>
            <p>Intensità settimanale dei touchpoint attivati per segmento.</p>
          </div>
          <span class="campaign-progress__panel-meta">{{ heatmapMatrix.periods.length }} periodi</span>
        </header>
        <div class="heatmap">
          <table>
            <thead>
              <tr>
                <th>Segmento</th>
                <th v-for="period in heatmapMatrix.periods" :key="period">{{ period }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in heatmapMatrix.rows" :key="row.channel">
                <th scope="row">{{ row.channel }}</th>
                <td
                  v-for="cell in row.cells"
                  :key="cell.period"
                  :style="{ '--intensity': cell.intensity.toFixed(2) }"
                >
                  <span class="heatmap__value">{{ formatPercent(cell.value) }}</span>
                  <small>{{ formatNumber(cell.leads) }} lead</small>
                </td>
              </tr>
              <tr v-if="!heatmapMatrix.rows.length" class="heatmap__empty">
                <td :colspan="heatmapMatrix.periods.length + 1">Nessun canale monitorato.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="highlights.length" class="campaign-progress__panel campaign-progress__panel--highlights">
        <header class="campaign-progress__panel-header">
          <div>
            <h3>Focus e follow-up</h3>
            <p>Azioni prioritarie con ownership definita.</p>
          </div>
          <span class="campaign-progress__panel-meta">{{ highlights.length }} elementi</span>
        </header>
        <ul class="highlights">
          <li v-for="item in highlights" :key="item.id" class="highlights__item">
            <h4>{{ item.title }}</h4>
            <p>{{ item.description }}</p>
            <footer>
              <span class="highlights__owner">Owner: {{ item.owner }}</span>
              <span class="highlights__eta" v-if="item.eta">ETA: {{ item.eta }}</span>
            </footer>
          </li>
        </ul>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface CampaignSummary {
  activeCampaigns: number;
  totalLeads: number;
  conversionRate: number;
  targetConversionRate: number;
  lastUpdated: string;
}

interface FunnelStageInput {
  id: string;
  label: string;
  leads: number;
  conversions: number;
  delta?: number;
}

interface HeatmapInput {
  periods: string[];
  channels: string[];
  values: number[][];
  leads?: number[][];
}

interface HighlightItem {
  id: string;
  title: string;
  description: string;
  owner: string;
  eta?: string;
  momentum?: number;
}

const props = withDefaults(
  defineProps<{
    summary: CampaignSummary;
    funnel: FunnelStageInput[];
    heatmap: HeatmapInput;
    highlights?: HighlightItem[];
  }>(),
  {
    highlights: () => [],
  },
);

const normalizedFunnel = computed(() => {
  const maxLeads = Math.max(0, ...props.funnel.map((stage) => stage.leads));
  return props.funnel.map((stage, index) => {
    const previous = index > 0 ? props.funnel[index - 1] : undefined;
    const dropOffBase = previous ? previous.conversions || previous.leads : 0;
    const dropOffRate = previous && dropOffBase
      ? Math.max(0, 1 - stage.leads / dropOffBase)
      : 0;
    const conversionRate = stage.leads > 0 ? stage.conversions / stage.leads : 0;
    const delta = stage.delta ?? 0;
    return {
      ...stage,
      width: maxLeads > 0 ? Math.max(12, (stage.leads / maxLeads) * 100) : 12,
      dropOffRate,
      conversionRate,
      delta,
    };
  });
});

const averageMomentum = computed(() => {
  if (!props.highlights.length) {
    return 0;
  }
  const values = props.highlights
    .map((item) => item.momentum)
    .filter((value): value is number => typeof value === 'number');
  if (!values.length) {
    return 0;
  }
  const total = values.reduce((acc, value) => acc + value, 0);
  return total / values.length;
});

const heatmapMatrix = computed(() => {
  const { periods, channels, values, leads } = props.heatmap;
  const flattened = values.flat();
  const maxValue = flattened.length ? Math.max(...flattened) : 0;
  const minValue = flattened.length ? Math.min(...flattened) : 0;
  return {
    periods,
    rows: channels.map((channel, rowIndex) => ({
      channel,
      cells: periods.map((period, columnIndex) => {
        const value = values[rowIndex]?.[columnIndex] ?? 0;
        const leadValue = leads?.[rowIndex]?.[columnIndex] ?? 0;
        const intensity = maxValue === minValue ? 0.5 : (value - minValue) / (maxValue - minValue);
        return {
          period,
          value,
          leads: leadValue,
          intensity,
        };
      }),
    })),
  };
});

const conversionDeltaLabel = computed(() => {
  const delta = props.summary.conversionRate - props.summary.targetConversionRate;
  const direction = delta >= 0 ? 'sopra target' : 'sotto target';
  return `${formatPercent(Math.abs(delta))} ${direction}`;
});

const highlights = computed(() => props.highlights);

const topPerformer = computed(() => {
  if (!highlights.value.length) {
    return undefined;
  }
  return [...highlights.value].sort((a, b) => (b.momentum ?? 0) - (a.momentum ?? 0))[0];
});

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number): string {
  return value.toLocaleString('it-IT');
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString('it-IT', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<style scoped>
.campaign-progress {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  background: var(--campaign-surface, #0b101a);
  color: var(--campaign-foreground, #f5f7fb);
  padding: 2rem;
  border-radius: 1.5rem;
  box-shadow: 0 24px 48px rgba(4, 8, 20, 0.35);
}

.campaign-progress__header {
  display: flex;
  justify-content: space-between;
  gap: 2rem;
  align-items: flex-start;
}

.campaign-progress__header h2 {
  margin: 0;
  font-size: 1.75rem;
  letter-spacing: 0.02em;
}

.campaign-progress__header p {
  margin: 0.5rem 0 0;
  max-width: 32rem;
  color: rgba(245, 247, 251, 0.75);
}

.campaign-progress__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, max-content));
  gap: 0.75rem 2.5rem;
  margin: 0;
}

.campaign-progress__meta div {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.campaign-progress__meta dt {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(245, 247, 251, 0.6);
}

.campaign-progress__meta dd {
  margin: 0;
  font-weight: 600;
}

.campaign-progress__summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
  gap: 1rem;
}

.campaign-progress__card {
  background: rgba(18, 25, 40, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 1rem;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.campaign-progress__card h3 {
  margin: 0;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(245, 247, 251, 0.68);
}

.campaign-progress__value {
  margin: 0;
  font-size: 1.8rem;
  font-weight: 600;
}

.campaign-progress__caption {
  margin: 0;
  color: rgba(245, 247, 251, 0.65);
}

.campaign-progress__layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 2.3fr);
  gap: 1.5rem;
  align-items: start;
}

.campaign-progress__panel {
  background: rgba(16, 22, 34, 0.88);
  border-radius: 1.25rem;
  padding: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.campaign-progress__panel--highlights {
  grid-column: span 2;
}

.campaign-progress__panel-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.campaign-progress__panel-header h3 {
  margin: 0;
  font-size: 1.2rem;
}

.campaign-progress__panel-header p {
  margin: 0.35rem 0 0;
  color: rgba(245, 247, 251, 0.65);
}

.campaign-progress__panel-meta {
  font-size: 0.8rem;
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  background: rgba(77, 161, 255, 0.18);
  color: #74b6ff;
  align-self: center;
}

.funnel {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.funnel__stage {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.funnel__bar {
  --base-color: rgba(82, 156, 255, 0.3);
  display: grid;
  grid-template-columns: repeat(3, minmax(0, max-content));
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 0.9rem;
  position: relative;
  background: linear-gradient(
    135deg,
    rgba(82, 156, 255, 0.28),
    rgba(82, 156, 255, 0.08)
  );
  border: 1px solid rgba(82, 156, 255, 0.25);
  overflow: hidden;
}

.funnel__bar::before {
  content: '';
  position: absolute;
  inset: 0;
  transform-origin: left;
  transform: scaleX(calc(var(--width) / 100));
  background: radial-gradient(circle at top left, rgba(82, 156, 255, 0.65), rgba(82, 156, 255, 0.2));
  opacity: 0.85;
  border-radius: inherit;
  z-index: 0;
}

.funnel__bar > * {
  position: relative;
  z-index: 1;
}

.funnel__bar strong {
  font-size: 1.05rem;
}

.funnel__metric {
  font-weight: 600;
}

.funnel__footer {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: rgba(245, 247, 251, 0.75);
}

.funnel__delta--up {
  color: #78ffcc;
}

.funnel__delta--down {
  color: #ff7a85;
}

.funnel__empty {
  text-align: center;
  padding: 1.5rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(245, 247, 251, 0.6);
}

.heatmap table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0.35rem;
}

.heatmap th,
.heatmap td {
  padding: 0.75rem;
  text-align: center;
  border-radius: 0.75rem;
}

.heatmap thead th {
  font-size: 0.85rem;
  color: rgba(245, 247, 251, 0.7);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.heatmap tbody th {
  text-align: left;
  font-weight: 600;
}

.heatmap td {
  background: rgba(98, 105, 140, calc(0.25 + var(--intensity) * 0.65));
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: #f5f7fb;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: center;
  justify-content: center;
}

.heatmap__value {
  font-weight: 600;
}

.heatmap__empty td {
  background: rgba(255, 255, 255, 0.04);
  color: rgba(245, 247, 251, 0.6);
}

.highlights {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
}

.highlights__item {
  background: rgba(22, 30, 46, 0.85);
  border-radius: 1rem;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.highlights__item h4 {
  margin: 0;
  font-size: 1rem;
}

.highlights__item p {
  margin: 0;
  color: rgba(245, 247, 251, 0.7);
}

.highlights__item footer {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: rgba(245, 247, 251, 0.6);
}

@media (max-width: 1180px) {
  .campaign-progress__layout {
    grid-template-columns: 1fr;
  }

  .campaign-progress__panel--highlights {
    grid-column: auto;
  }

  .campaign-progress__header {
    flex-direction: column;
  }

  .campaign-progress__meta {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
