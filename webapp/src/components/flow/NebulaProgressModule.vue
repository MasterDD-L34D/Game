<template>
  <section class="nebula-progress">
    <header class="nebula-progress__header">
      <div>
        <p class="nebula-progress__label">Dataset · {{ header.datasetId }}</p>
        <h2>{{ header.title }}</h2>
        <p class="nebula-progress__summary">{{ header.summary }}</p>
      </div>
      <dl class="nebula-progress__meta">
        <div>
          <dt>Release window</dt>
          <dd>{{ header.releaseWindow }}</dd>
        </div>
        <div>
          <dt>Curator</dt>
          <dd>{{ header.curator }}</dd>
        </div>
      </dl>
    </header>

    <div class="nebula-progress__cards">
      <article
        v-for="card in cards"
        :key="card.id"
        class="nebula-progress__card"
        :data-tone="card.tone"
      >
        <h3>{{ card.title }}</h3>
        <p>{{ card.body }}</p>
        <div v-if="card.progress !== undefined" class="nebula-progress__bar">
          <div class="nebula-progress__bar-fill" :style="{ width: `${Math.min(Math.max(card.progress, 0), 100)}%` }"></div>
        </div>
      </article>
    </div>

    <div class="nebula-progress__grid">
      <NebulaProgressTimeline :entries="timelineEntries" />
      <section class="nebula-progress__telemetry" :data-mode="telemetryStatus.offline ? 'demo' : 'live'">
        <header>
          <h3>Progress bar evolutiva</h3>
          <p>Telemetria &amp; readiness sincronizzate con orchestrator.</p>
          <span
            v-if="telemetryStatus.offline"
            class="nebula-progress__badge nebula-progress__badge--demo"
            data-tone="offline"
          >
            {{ telemetryStatus.label }}
          </span>
        </header>
        <ul>
          <li v-for="entry in evolutionMatrix" :key="entry.id" :data-mode="entry.telemetryMode === 'live' ? 'live' : 'demo'">
            <header class="nebula-progress__telemetry-header">
              <span class="nebula-progress__species">{{ entry.name }}</span>
              <span class="nebula-progress__badge" :data-tone="entry.readinessTone">
                {{ entry.stage }} · {{ entry.readiness }}
              </span>
              <span
                v-if="entry.telemetryMode !== 'live'"
                class="nebula-progress__badge nebula-progress__badge--demo"
                data-tone="offline"
              >
                Demo
              </span>
            </header>
            <SparklineChart
              :points="entry.telemetryHistory"
              :color="sparklineColor(entry.readinessTone)"
              :variant="entry.telemetryMode !== 'live' ? 'demo' : 'live'"
            />
            <div class="nebula-progress__evolution">
              <div class="nebula-progress__evolution-fill" :style="{ width: `${entry.telemetryCoverage}%` }"></div>
              <span class="nebula-progress__evolution-label">{{ entry.telemetryLabel }}</span>
            </div>
            <footer class="nebula-progress__telemetry-footer">
              <span>{{ entry.telemetryTimestamp }}</span>
              <span>Owner: {{ entry.telemetryOwner }}</span>
            </footer>
          </li>
        </ul>
      </section>
    </div>

    <footer class="nebula-progress__share">
      <button type="button" @click="copyEmbed">Copia snippet Canvas</button>
      <button type="button" @click="downloadJson">Export JSON</button>
      <output v-if="shareStatus" role="status">{{ shareStatus }}</output>
    </footer>
  </section>
</template>

<script setup>
import { ref } from 'vue';
import NebulaProgressTimeline from './NebulaProgressTimeline.vue';
import SparklineChart from '../shared/SparklineChart.vue';

const props = defineProps({
  header: {
    type: Object,
    required: true,
  },
  cards: {
    type: Array,
    default: () => [],
  },
  timelineEntries: {
    type: Array,
    default: () => [],
  },
  evolutionMatrix: {
    type: Array,
    default: () => [],
  },
  share: {
    type: Object,
    required: true,
  },
  telemetryStatus: {
    type: Object,
    default: () => ({ mode: 'live', offline: false, label: 'Telemetry live', variant: 'live' }),
  },
});

const shareStatus = ref('');
let shareTimeout = null;

function setShareStatus(message) {
  shareStatus.value = message;
  clearTimeout(shareTimeout);
  shareTimeout = setTimeout(() => {
    shareStatus.value = '';
  }, 2500);
}

function fallbackCopy(text) {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', 'readonly');
  textArea.style.position = 'absolute';
  textArea.style.left = '-9999px';
  document.body.appendChild(textArea);
  textArea.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch (error) {
    copied = false;
  }
  document.body.removeChild(textArea);
  return copied;
}

async function copyEmbed() {
  const snippet = props.share.embedSnippet;
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(snippet);
      setShareStatus('Snippet copiato!');
      return;
    }
  } catch (error) {
    // fallback gestito sotto
  }
  if (fallbackCopy(snippet)) {
    setShareStatus('Snippet copiato!');
  } else {
    setShareStatus('Impossibile copiare automaticamente');
  }
}

function downloadJson() {
  const blob = new Blob([props.share.json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `nebula-progress-${props.share.datasetId}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  setShareStatus('Export JSON generato');
}

function sparklineColor(tone) {
  if (tone === 'success') {
    return '#73ffce';
  }
  if (tone === 'warning') {
    return '#f4c060';
  }
  if (tone === 'critical') {
    return '#ff6982';
  }
  return '#61d5ff';
}
</script>

<style scoped>
.nebula-progress {
  display: grid;
  gap: 1.5rem;
  background: radial-gradient(circle at top left, rgba(97, 213, 255, 0.08), transparent 55%),
    radial-gradient(circle at bottom right, rgba(159, 123, 255, 0.08), transparent 45%),
    rgba(5, 8, 13, 0.85);
  padding: 2rem;
  border-radius: 24px;
  border: 1px solid rgba(97, 213, 255, 0.25);
}

.nebula-progress__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  flex-wrap: wrap;
}

.nebula-progress__label {
  margin: 0;
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(224, 237, 255, 0.6);
}

.nebula-progress__header h2 {
  margin: 0.35rem 0;
  font-size: 1.6rem;
}

.nebula-progress__summary {
  margin: 0;
  color: rgba(224, 237, 255, 0.75);
  max-width: 36rem;
}

.nebula-progress__meta {
  display: grid;
  gap: 0.5rem;
  margin: 0;
}

.nebula-progress__meta div {
  display: grid;
  gap: 0.15rem;
}

.nebula-progress__meta dt {
  font-size: 0.75rem;
  text-transform: uppercase;
  color: rgba(224, 237, 255, 0.55);
}

.nebula-progress__meta dd {
  margin: 0;
  font-weight: 600;
}

.nebula-progress__cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.nebula-progress__card {
  background: rgba(10, 15, 24, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1rem;
  display: grid;
  gap: 0.75rem;
  min-height: 160px;
}

.nebula-progress__card[data-tone='success'] {
  border-color: rgba(115, 255, 206, 0.45);
}

.nebula-progress__card[data-tone='warning'] {
  border-color: rgba(255, 196, 96, 0.5);
}

.nebula-progress__card[data-tone='blocker'] {
  border-color: rgba(255, 105, 130, 0.6);
}

.nebula-progress__card[data-tone='objective'] {
  border-color: rgba(97, 213, 255, 0.45);
}

.nebula-progress__card h3 {
  margin: 0;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(224, 237, 255, 0.7);
}

.nebula-progress__card p {
  margin: 0;
  font-size: 1rem;
  color: #f0f4ff;
}

.nebula-progress__bar {
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.nebula-progress__bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #61d5ff, #9f7bff);
}

.nebula-progress__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
}

.nebula-progress__telemetry {
  background: rgba(10, 15, 22, 0.65);
  border: 1px solid rgba(159, 123, 255, 0.35);
  border-radius: 16px;
  padding: 1.25rem;
  display: grid;
  gap: 1rem;
}

.nebula-progress__telemetry[data-mode='demo'] {
  border-color: rgba(244, 192, 96, 0.4);
  background: rgba(10, 15, 22, 0.55);
}

.nebula-progress__telemetry header h3 {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.95rem;
}

.nebula-progress__telemetry header p {
  margin: 0.25rem 0 0;
  color: rgba(224, 237, 255, 0.7);
}

.nebula-progress__telemetry ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1.25rem;
}

.nebula-progress__telemetry-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.nebula-progress__telemetry li[data-mode='demo'] {
  border: 1px dashed rgba(244, 192, 96, 0.35);
  border-radius: 14px;
  padding: 1rem;
}

.nebula-progress__species {
  font-size: 1.05rem;
  font-weight: 600;
}

.nebula-progress__badge {
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  font-size: 0.75rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid transparent;
}

.nebula-progress__badge[data-tone='offline'] {
  border-color: rgba(244, 192, 96, 0.5);
  color: rgba(255, 232, 198, 0.95);
  background: rgba(244, 192, 96, 0.12);
}

.nebula-progress__badge--demo {
  font-size: 0.68rem;
  letter-spacing: 0.08em;
}

.nebula-progress__badge[data-tone='success'] {
  border-color: rgba(115, 255, 206, 0.45);
  color: rgba(180, 255, 230, 0.9);
}

.nebula-progress__badge[data-tone='warning'] {
  border-color: rgba(255, 196, 96, 0.5);
  color: rgba(255, 223, 170, 0.95);
}

.nebula-progress__badge[data-tone='critical'] {
  border-color: rgba(255, 105, 130, 0.6);
  color: rgba(255, 190, 200, 0.95);
}

.nebula-progress__evolution {
  position: relative;
  height: 0.75rem;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  overflow: hidden;
  margin-top: 0.5rem;
}

.nebula-progress__evolution-fill {
  height: 100%;
  background: linear-gradient(90deg, #61d5ff 0%, #9f7bff 50%, #ff6f91 100%);
}

.nebula-progress__evolution-label {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  color: rgba(12, 18, 28, 0.9);
  font-weight: 600;
}

.nebula-progress__telemetry-footer {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: rgba(224, 237, 255, 0.6);
  margin-top: 0.4rem;
}

.nebula-progress__share {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.nebula-progress__share button {
  background: rgba(9, 14, 20, 0.85);
  border: 1px solid rgba(97, 213, 255, 0.45);
  color: #f0f4ff;
  padding: 0.65rem 1.15rem;
  border-radius: 999px;
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.nebula-progress__share button:hover {
  background: rgba(97, 213, 255, 0.18);
}

.nebula-progress__share output {
  font-size: 0.8rem;
  color: rgba(224, 237, 255, 0.8);
}
</style>
