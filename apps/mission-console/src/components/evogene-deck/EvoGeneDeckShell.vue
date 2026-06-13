<template>
  <div class="evogene-deck-shell">
    <div class="evogene-deck-shell__frame">
      <div class="evogene-deck-shell__inner">
        <div
          class="evogene-deck-shell__lights"
          role="group"
          aria-label="Indicatori di stato EvoGene Deck"
        >
          <span
            v-for="light in indicatorLights"
            :key="light.id"
            class="evogene-deck-light"
            :data-state="light.state"
            :data-label="light.label"
            role="status"
            :aria-label="light.ariaLabel"
          ></span>
        </div>

        <div class="evogene-deck-shell__content">
          <header class="evogene-deck-shell__header">
            <slot name="header"></slot>
          </header>

          <section v-if="$slots.status" class="evogene-deck-shell__status">
            <slot name="status"></slot>
          </section>

          <main class="evogene-deck-shell__main">
            <slot></slot>
          </main>

          <footer v-if="$slots.footer" class="evogene-deck-shell__footer">
            <slot name="footer"></slot>
          </footer>
        </div>

        <aside class="evogene-deck-shell__logs" aria-live="polite" aria-label="Registro missione">
          <slot name="sidebar">
            <div class="evogene-deck-logs">
              <header class="evogene-deck-logs__header">
                <span class="evogene-deck-logs__title">Mission Log</span>
                <span class="evogene-deck-logs__count">{{ previewLogs.length }}</span>
              </header>
              <ol class="evogene-deck-logs__feed">
                <li
                  v-for="entry in previewLogs"
                  :key="entry.id"
                  class="evogene-deck-logs__entry"
                  :data-level="entry.level"
                >
                  <span class="evogene-deck-logs__timestamp">{{ entry.time }}</span>
                  <p class="evogene-deck-logs__message">
                    <strong>{{ entry.scope }}</strong>
                    <span>{{ entry.message }}</span>
                  </p>
                </li>
                <li
                  v-if="!previewLogs.length"
                  class="evogene-deck-logs__entry evogene-deck-logs__entry--empty"
                >
                  <span class="evogene-deck-logs__timestamp">—</span>
                  <p class="evogene-deck-logs__message">
                    <strong>Nessun log</strong>
                    <span>In attesa dei segnali dell'orchestratore…</span>
                  </p>
                </li>
              </ol>
            </div>
          </slot>
        </aside>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  lights: {
    type: Array,
    default: () => [],
  },
  logs: {
    type: Array,
    default: () => [],
  },
  logLimit: {
    type: Number,
    default: 10,
  },
});

const stateLabels = {
  ready: 'operativo',
  success: 'operativo',
  loading: 'in caricamento',
  pending: 'in attesa',
  idle: 'in attesa',
  warning: 'attenzione',
  caution: 'attenzione',
  error: 'errore',
  critical: 'errore critico',
  blocked: 'bloccato',
  offline: 'offline',
};

const indicatorLights = computed(() =>
  props.lights.map((light, index) => {
    const state = String(light.state ?? 'idle').toLowerCase();
    const label = light.label ?? String(light.id ?? index + 1);
    const stateLabel = stateLabels[state] ?? state;
    return {
      id: light.id ?? index,
      label,
      state,
      ariaLabel: `${label}: ${stateLabel}`,
    };
  }),
);

const previewLogs = computed(() =>
  props.logs.slice(0, props.logLimit).map((entry, index) => ({
    id: entry.id ?? `${entry.level || 'info'}-${index}`,
    level: entry.level || 'info',
    scope: entry.scope || 'Flow',
    message: entry.message || entry.event || 'Evento registrato',
    time: formatTimestamp(entry.timestamp),
  })),
);

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return '—';
  }
  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid timestamp');
    }
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch (error) {
    return String(timestamp).slice(0, 8);
  }
}
</script>

<style scoped>
.evogene-deck-logs__entry--empty {
  border-style: dashed;
  border-color: rgba(77, 208, 255, 0.14);
  color: rgba(242, 248, 255, 0.65);
}
</style>
