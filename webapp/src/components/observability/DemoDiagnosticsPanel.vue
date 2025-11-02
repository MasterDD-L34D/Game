<template>
  <section v-if="enabled" class="demo-diagnostics" aria-live="polite" aria-label="Diagnostica demo">
    <header class="demo-diagnostics__header">
      <div>
        <h3>Diagnostica demo</h3>
        <p>Monitoraggio locale di richieste, fallback e osservabilità core.</p>
      </div>
      <ul class="demo-diagnostics__summary" aria-label="Statistiche richieste">
        <li>
          <span class="demo-diagnostics__summary-label">Totali</span>
          <span class="demo-diagnostics__summary-value">{{ fetchSummary.total }}</span>
        </li>
        <li>
          <span class="demo-diagnostics__summary-label">Fallback</span>
          <span class="demo-diagnostics__summary-value">{{ fetchSummary.fallback }}</span>
        </li>
        <li>
          <span class="demo-diagnostics__summary-label">Errori</span>
          <span class="demo-diagnostics__summary-value">{{ fetchSummary.failures }}</span>
        </li>
        <li>
          <span class="demo-diagnostics__summary-label">Pendenti</span>
          <span class="demo-diagnostics__summary-value">{{ fetchSummary.pending }}</span>
        </li>
      </ul>
    </header>

    <div class="demo-diagnostics__grid">
      <section class="demo-diagnostics__section" aria-label="Richieste recenti">
        <header>
          <h4>Richieste</h4>
          <p>Ultimi tentativi di fetch con fallback e durata.</p>
        </header>
        <ol class="demo-diagnostics__list">
          <li v-for="entry in recentFetches" :key="entry.id" :data-status="entry.status">
            <div class="demo-diagnostics__list-header">
              <span class="demo-diagnostics__badge">{{ entry.method }}</span>
              <span class="demo-diagnostics__list-title" :title="entry.url">{{ entry.url }}</span>
            </div>
            <p class="demo-diagnostics__meta">
              <span>{{ describeFetch(entry) }}</span>
              <span>⏱ {{ formatDuration(entry) }}</span>
              <span>🕒 {{ formatTimestamp(entry) }}</span>
            </p>
            <p v-if="entry.error" class="demo-diagnostics__error">{{ entry.error }}</p>
            <p v-else class="demo-diagnostics__message">{{ entry.message }}</p>
          </li>
          <li v-if="!recentFetches.length" class="demo-diagnostics__empty">Nessuna richiesta registrata</li>
        </ol>
      </section>

      <section class="demo-diagnostics__section" aria-label="Metriche browser">
        <header>
          <h4>Metriche</h4>
          <p>Core Web Vitals e performance recenti inviati/localizzati.</p>
        </header>
        <ol class="demo-diagnostics__list">
          <li v-for="metric in recentMetrics" :key="metric.id">
            <div class="demo-diagnostics__list-header">
              <span class="demo-diagnostics__badge demo-diagnostics__badge--metric">{{ metric.name }}</span>
              <span class="demo-diagnostics__list-value">{{ formatMetricValue(metric.value) }}</span>
            </div>
            <p class="demo-diagnostics__meta">
              <span v-if="metric.rating">Valutazione: {{ metric.rating }}</span>
              <span v-if="metric.delta !== undefined">Δ {{ metric.delta.toFixed(2) }}</span>
              <span>🕒 {{ formatTime(metric.timestamp) }}</span>
            </p>
            <p v-if="metric.navigationType" class="demo-diagnostics__message">Navigation: {{ metric.navigationType }}</p>
          </li>
          <li v-if="!recentMetrics.length" class="demo-diagnostics__empty">Metriche non ancora disponibili</li>
        </ol>
      </section>

      <section class="demo-diagnostics__section" aria-label="Log principali">
        <header>
          <h4>Log</h4>
          <p>Errori e warning recenti dal client logger.</p>
        </header>
        <ol class="demo-diagnostics__list">
          <li v-for="log in recentLogs" :key="log.id">
            <div class="demo-diagnostics__list-header">
              <span class="demo-diagnostics__badge" :data-level="log.level">{{ log.level }}</span>
              <span class="demo-diagnostics__list-title">{{ log.scope }}</span>
              <span class="demo-diagnostics__list-value">{{ formatTime(log.timestamp) }}</span>
            </div>
            <p class="demo-diagnostics__message">{{ log.message }}</p>
          </li>
          <li v-if="!recentLogs.length" class="demo-diagnostics__empty">Nessun log critico registrato</li>
        </ol>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { FetchDiagnostic } from '../../observability/diagnosticsStore';
import { useDiagnosticsStore } from '../../observability/diagnosticsStore';

const { enabled, fetches, fetchSummary, metrics, logs } = useDiagnosticsStore();

const recentFetches = computed(() => fetches.value.slice(0, 5));
const recentMetrics = computed(() => metrics.value.slice(0, 6));
const recentLogs = computed(() => logs.value.slice(0, 6));

function formatDuration(entry: FetchDiagnostic): string {
  if (entry.durationMs === null || Number.isNaN(entry.durationMs)) {
    return '—';
  }
  if (entry.durationMs > 1000) {
    return `${(entry.durationMs / 1000).toFixed(1)}s`;
  }
  return `${Math.max(0, Math.round(entry.durationMs))}ms`;
}

function formatTimestamp(entry: FetchDiagnostic): string {
  const date = entry.completedAt || entry.startedAt;
  return formatTime(date);
}

function describeFetch(entry: FetchDiagnostic): string {
  if (entry.status === 'fallback') {
    return 'Fallback attivato';
  }
  if (entry.status === 'error') {
    return 'Richiesta fallita';
  }
  if (entry.status === 'success') {
    return entry.source === 'remote' ? 'Risposta remota' : 'Risposta locale';
  }
  return 'In corso';
}

function formatMetricValue(value: number): string {
  if (!Number.isFinite(value)) {
    return 'n/d';
  }
  if (Math.abs(value) >= 1000) {
    return `${value.toFixed(0)}`;
  }
  return value.toFixed(2);
}

function formatTime(value: number): string {
  const date = new Date(value);
  return date.toLocaleTimeString('it-IT', { hour12: false });
}
</script>

<style scoped>
.demo-diagnostics {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem 1.75rem;
  border-radius: 1.5rem;
  background: rgba(15, 23, 42, 0.04);
  border: 1px solid rgba(37, 99, 235, 0.18);
}

.demo-diagnostics__header {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1.25rem;
  align-items: center;
}

.demo-diagnostics__header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.demo-diagnostics__header p {
  margin: 0.35rem 0 0;
  color: rgba(15, 23, 42, 0.7);
}

.demo-diagnostics__summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 0.75rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

.demo-diagnostics__summary-label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: rgba(15, 23, 42, 0.55);
}

.demo-diagnostics__summary-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1d4ed8;
}

.demo-diagnostics__grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}

.demo-diagnostics__section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1rem;
  border-radius: 1rem;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.08);
}

.demo-diagnostics__section header h4 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}

.demo-diagnostics__section header p {
  margin: 0.35rem 0 0;
  font-size: 0.9rem;
  color: rgba(15, 23, 42, 0.6);
}

.demo-diagnostics__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.9rem;
}

.demo-diagnostics__list-header {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: baseline;
}

.demo-diagnostics__list-title {
  flex: 1;
  min-width: 0;
  font-weight: 600;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.demo-diagnostics__list-value {
  font-weight: 700;
  color: #0f172a;
}

.demo-diagnostics__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  font-size: 0.8rem;
  color: rgba(15, 23, 42, 0.65);
  margin: 0.25rem 0 0;
}

.demo-diagnostics__message {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
  color: rgba(15, 23, 42, 0.7);
}

.demo-diagnostics__error {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
  color: #b91c1c;
  font-weight: 600;
}

.demo-diagnostics__empty {
  padding: 0.75rem;
  border-radius: 0.75rem;
  background: rgba(15, 23, 42, 0.05);
  text-align: center;
  color: rgba(15, 23, 42, 0.6);
}

.demo-diagnostics__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.15rem 0.55rem;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.12);
  color: #1d4ed8;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.demo-diagnostics__badge[data-level='error'] {
  background: rgba(220, 38, 38, 0.15);
  color: #b91c1c;
}

.demo-diagnostics__badge[data-level='warn'],
.demo-diagnostics__badge[data-level='warning'] {
  background: rgba(234, 179, 8, 0.18);
  color: #92400e;
}

.demo-diagnostics__badge--metric {
  background: rgba(16, 185, 129, 0.18);
  color: #0f766e;
}

.demo-diagnostics__list li[data-status='fallback'] .demo-diagnostics__badge {
  background: rgba(16, 185, 129, 0.2);
  color: #047857;
}

.demo-diagnostics__list li[data-status='error'] .demo-diagnostics__badge {
  background: rgba(220, 38, 38, 0.18);
  color: #b91c1c;
}

.demo-diagnostics__list li[data-status='pending'] .demo-diagnostics__badge {
  background: rgba(234, 179, 8, 0.2);
  color: #92400e;
}

@media (max-width: 720px) {
  .demo-diagnostics {
    padding: 1.25rem;
  }
}
</style>
