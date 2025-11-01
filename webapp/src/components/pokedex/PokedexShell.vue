<template>
  <div class="pokedex-shell">
    <div class="pokedex-shell__frame">
      <div class="pokedex-shell__inner">
        <div class="pokedex-shell__lights">
          <span
            v-for="light in indicatorLights"
            :key="light.id"
            class="pokedex-light"
            :data-state="light.state"
            :data-label="light.label"
          ></span>
        </div>

        <div class="pokedex-shell__content">
          <header class="pokedex-shell__header">
            <slot name="header"></slot>
          </header>

          <section v-if="$slots.status" class="pokedex-shell__status">
            <slot name="status"></slot>
          </section>

          <main class="pokedex-shell__main">
            <slot></slot>
          </main>

          <footer v-if="$slots.footer" class="pokedex-shell__footer">
            <slot name="footer"></slot>
          </footer>
        </div>

        <aside class="pokedex-shell__logs" aria-live="polite">
          <slot name="sidebar">
            <div class="pokedex-logs">
              <header class="pokedex-logs__header">
                <span class="pokedex-logs__title">Mission Log</span>
                <span class="pokedex-logs__count">{{ previewLogs.length }}</span>
              </header>
              <ol class="pokedex-logs__feed">
                <li
                  v-for="entry in previewLogs"
                  :key="entry.id"
                  class="pokedex-logs__entry"
                  :data-level="entry.level"
                >
                  <span class="pokedex-logs__timestamp">{{ entry.time }}</span>
                  <p class="pokedex-logs__message">
                    <strong>{{ entry.scope }}</strong>
                    <span>{{ entry.message }}</span>
                  </p>
                </li>
                <li v-if="!previewLogs.length" class="pokedex-logs__entry pokedex-logs__entry--empty">
                  <span class="pokedex-logs__timestamp">—</span>
                  <p class="pokedex-logs__message">
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

const indicatorLights = computed(() =>
  props.lights.map((light, index) => ({
    id: light.id ?? index,
    label: light.label ?? String(light.id ?? index + 1),
    state: light.state ?? 'idle',
  })),
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
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch (error) {
    return String(timestamp).slice(0, 8);
  }
}
</script>

<style scoped>
.pokedex-logs__entry--empty {
  border-style: dashed;
  border-color: rgba(77, 208, 255, 0.14);
  color: rgba(242, 248, 255, 0.65);
}
</style>
