<template>
  <section class="flow-telemetry" aria-live="polite">
    <header class="flow-telemetry__header">
      <div>
        <h2 class="flow-telemetry__title">QA Telemetry</h2>
        <p class="flow-telemetry__subtitle">Stream orchestratore & metriche snapshot</p>
      </div>
      <span class="flow-telemetry__status" :data-status="statusTone">
        <strong>{{ statusLabel }}</strong>
        <small v-if="lastEventLabel" class="flow-telemetry__status-hint">{{
          lastEventLabel
        }}</small>
        <small v-else-if="streamError" class="flow-telemetry__status-hint">{{ streamError }}</small>
      </span>
    </header>

    <div class="flow-telemetry__badges">
      <EvoGeneDeckTelemetryBadge
        label="Validator warnings"
        :value="metrics.validatorWarnings ?? 0"
        :tone="warningsTone"
      />
      <EvoGeneDeckTelemetryBadge
        label="Fallback attivi"
        :value="metrics.fallbackCount ?? 0"
        :tone="fallbackTone"
      />
      <EvoGeneDeckTelemetryBadge label="Request ID" :tone="metrics.requestId ? 'neutral' : 'muted'">
        <template #default>
          <code class="flow-telemetry__request">{{ metrics.requestId || '—' }}</code>
        </template>
      </EvoGeneDeckTelemetryBadge>
    </div>

    <div class="flow-telemetry__toolbar">
      <button
        type="button"
        class="flow-telemetry__export"
        :disabled="!hasLogs"
        @click="$emit('export-json')"
      >
        Esporta JSON QA
      </button>
      <button
        type="button"
        class="flow-telemetry__export"
        :disabled="!hasLogs"
        @click="$emit('export-csv')"
      >
        Esporta CSV QA
      </button>
      <button
        type="button"
        class="flow-telemetry__refresh"
        :disabled="!canReconnect"
        @click="$emit('refresh-stream')"
      >
        Riconnetti stream
      </button>
    </div>

    <ol class="flow-telemetry__logs">
      <li
        v-for="entry in logs"
        :key="entry.id"
        class="flow-telemetry__log"
        :data-level="entry.level || 'info'"
      >
        <span class="flow-telemetry__time">{{ entry.time }}</span>
        <div class="flow-telemetry__message">
          <strong>{{ entry.scope }}</strong>
          <span>{{ entry.message }}</span>
        </div>
      </li>
      <li v-if="!logs.length" class="flow-telemetry__log flow-telemetry__log--empty">
        <span class="flow-telemetry__time">—</span>
        <div class="flow-telemetry__message">
          <strong>Nessun log QA</strong>
          <span>In attesa di aggiornamenti dal runtime validator.</span>
        </div>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import EvoGeneDeckTelemetryBadge from '../evogene-deck/EvoGeneDeckTelemetryBadge.vue';

type PanelMetrics = {
  validatorWarnings?: number;
  fallbackCount?: number;
  requestId?: string | null;
};

type PanelStreamState = {
  status?: string;
  error?: Error | string | null;
  lastEventAt?: number | null;
  attempts?: number;
};

type PanelLogEntry = {
  id: string;
  level?: string;
  scope?: string;
  message?: string;
  time?: string;
};

const props = defineProps<{
  logs: PanelLogEntry[];
  metrics: PanelMetrics;
  stream: PanelStreamState;
}>();

const emit = defineEmits<{
  (e: 'export-json'): void;
  (e: 'export-csv'): void;
  (e: 'refresh-stream'): void;
}>();

const statusTone = computed(() => {
  const status = (props.stream.status || '').toLowerCase();
  if (status === 'open') return 'success';
  if (status === 'connecting') return 'warning';
  if (status === 'errored') return 'critical';
  if (status === 'unsupported') return 'muted';
  if (status === 'closed') return 'muted';
  return 'neutral';
});

const statusLabel = computed(() => {
  const status = (props.stream.status || '').toLowerCase();
  if (status === 'open') return 'Stream live';
  if (status === 'connecting') return 'Connessione…';
  if (status === 'errored') return 'Stream interrotto';
  if (status === 'unsupported') return 'Stream non supportato';
  if (status === 'closed') return 'Stream chiuso';
  return 'In attesa stream';
});

const warningsTone = computed(() =>
  Number(props.metrics.validatorWarnings) > 0 ? 'warning' : 'success',
);
const fallbackTone = computed(() =>
  Number(props.metrics.fallbackCount) > 0 ? 'warning' : 'neutral',
);

const hasLogs = computed(() => props.logs.length > 0);

const streamError = computed(() => {
  const error = props.stream.error;
  if (!error) {
    return '';
  }
  return error instanceof Error ? error.message : String(error);
});

const lastEventLabel = computed(() => {
  if (!props.stream.lastEventAt || props.stream.lastEventAt <= 0) {
    return '';
  }
  try {
    const date = new Date(props.stream.lastEventAt);
    return `Ultimo evento ${date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })}`;
  } catch (error) {
    return '';
  }
});

const canReconnect = computed(() => {
  const status = (props.stream.status || '').toLowerCase();
  if (status === 'errored') {
    return true;
  }
  if (status === 'closed') {
    return true;
  }
  if (status === 'unsupported') {
    return false;
  }
  return false;
});
</script>

<style scoped>
.flow-telemetry {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  padding: 1.25rem;
  background: linear-gradient(180deg, rgba(9, 26, 41, 0.92) 0%, rgba(5, 16, 27, 0.92) 100%);
  border-left: 1px solid rgba(77, 208, 255, 0.16);
}

.flow-telemetry__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
}

.flow-telemetry__title {
  font-size: 1.1rem;
  margin: 0;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.flow-telemetry__subtitle {
  margin: 0.2rem 0 0;
  font-size: 0.78rem;
  color: rgba(242, 248, 255, 0.75);
  letter-spacing: 0.05em;
}

.flow-telemetry__status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  font-size: 0.82rem;
  text-transform: uppercase;
}

.flow-telemetry__status[data-status='success'] {
  color: rgba(123, 255, 207, 0.9);
}

.flow-telemetry__status[data-status='warning'] {
  color: rgba(255, 208, 77, 0.9);
}

.flow-telemetry__status[data-status='critical'] {
  color: rgba(255, 138, 138, 0.95);
}

.flow-telemetry__status[data-status='muted'] {
  color: rgba(160, 182, 199, 0.7);
}

.flow-telemetry__status-hint {
  display: block;
  font-size: 0.7rem;
  letter-spacing: 0.06em;
}

.flow-telemetry__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.flow-telemetry__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.flow-telemetry__export,
.flow-telemetry__refresh {
  padding: 0.45rem 0.9rem;
  border-radius: 999px;
  border: 1px solid rgba(77, 208, 255, 0.35);
  background: rgba(9, 32, 52, 0.6);
  color: rgba(242, 248, 255, 0.92);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  cursor: pointer;
  transition:
    background 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease;
}

.flow-telemetry__export:disabled,
.flow-telemetry__refresh:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.flow-telemetry__refresh {
  margin-left: auto;
}

.flow-telemetry__logs {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex: 1;
  overflow-y: auto;
}

.flow-telemetry__log {
  display: grid;
  grid-template-columns: 4.5rem 1fr;
  gap: 0.65rem;
  padding: 0.65rem 0.8rem;
  border-radius: 0.8rem;
  background: rgba(10, 34, 54, 0.78);
  border: 1px solid rgba(77, 208, 255, 0.14);
  font-size: 0.85rem;
}

.flow-telemetry__log[data-level='warning'] {
  border-color: rgba(255, 208, 77, 0.3);
}

.flow-telemetry__log[data-level='error'],
.flow-telemetry__log[data-level='critical'] {
  border-color: rgba(255, 107, 120, 0.4);
}

.flow-telemetry__log--empty {
  border-style: dashed;
  border-color: rgba(77, 208, 255, 0.14);
  color: rgba(242, 248, 255, 0.65);
}

.flow-telemetry__time {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(155, 187, 214, 0.92);
}

.flow-telemetry__message {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.flow-telemetry__message strong {
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.flow-telemetry__message span {
  font-size: 0.85rem;
  color: rgba(242, 248, 255, 0.92);
}

.flow-telemetry__request {
  font-size: 0.8rem;
  letter-spacing: 0.04em;
}
</style>
