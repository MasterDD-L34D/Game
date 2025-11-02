<template>
  <section
    v-if="overlay"
    class="smart-hud-overlay"
    :data-overlay-id="overlay.id"
    aria-live="polite"
  >
    <header class="smart-hud-overlay__header">
      <div class="smart-hud-overlay__title">
        <h2>{{ overlay.title }}</h2>
        <p v-if="overlay.description">{{ overlay.description }}</p>
      </div>
      <div
        class="smart-hud-overlay__threshold"
        :data-severity="thresholdBadge.severity"
        role="status"
      >
        <span class="smart-hud-overlay__threshold-label">{{ thresholdBadge.label }}</span>
        <strong class="smart-hud-overlay__threshold-value">{{ thresholdBadge.value }}</strong>
        <p class="smart-hud-overlay__threshold-description">{{ thresholdBadge.description }}</p>
      </div>
    </header>

    <div class="smart-hud-overlay__body">
      <div class="smart-hud-overlay__main">
        <dl v-if="filtersEntries.length" class="smart-hud-overlay__filters">
          <template v-for="entry in filtersEntries" :key="entry.key">
            <dt>{{ entry.label }}</dt>
            <dd>{{ entry.value }}</dd>
          </template>
        </dl>

        <ul v-if="overlay.panels?.length" class="smart-hud-overlay__panels">
          <li v-for="panel in overlay.panels" :key="panel.id" :data-panel-type="panel.type">
            <strong>{{ panel.source ?? panel.id }}</strong>
            <span v-if="panel.format" class="smart-hud-overlay__format">{{ panel.format }}</span>
          </li>
        </ul>

        <section
          v-if="timeline.length"
          class="smart-hud-overlay__timeline"
          aria-label="Alert timeline"
        >
          <h3>Ultimi alert</h3>
          <ol>
            <li v-for="event in timeline" :key="event.id" class="smart-hud-overlay__timeline-event">
              <div class="smart-hud-overlay__timeline-meta">
                <time v-if="event.timestamp" :dateTime="event.timestamp">{{
                  formatTimestamp(event.timestamp)
                }}</time>
              </div>
              <div class="smart-hud-overlay__timeline-content">
                <strong>{{ event.title }}</strong>
                <p>{{ event.description }}</p>
              </div>
            </li>
          </ol>
        </section>
      </div>

      <aside class="smart-hud-overlay__aside">
        <canvas
          ref="canvasRef"
          class="smart-hud-overlay__canvas"
          :width="canvasSize.width"
          :height="canvasSize.height"
          role="img"
          aria-label="Smart risk overlay canvas"
        />

        <article v-if="contextMetrics.length" class="smart-hud-overlay__context-card">
          <header>
            <h3>Context metrics</h3>
            <p v-if="summary?.generatedAt">
              Ultimo aggiornamento {{ formatTimestamp(summary.generatedAt) }}
            </p>
          </header>
          <ul class="smart-hud-overlay__context-metrics">
            <li
              v-for="metric in contextMetrics"
              :key="metric.id"
              :data-trend="metric.trend ?? 'stable'"
            >
              <span class="smart-hud-overlay__metric-label">{{ metric.label }}</span>
              <strong class="smart-hud-overlay__metric-value">{{ metric.value }}</strong>
            </li>
          </ul>
        </article>
      </aside>
    </div>

    <footer class="smart-hud-overlay__footer" v-if="error">
      <p role="alert">Impossibile aggiornare i dati live (fallback offline attivo).</p>
    </footer>
  </section>
  <section v-else class="smart-hud-overlay smart-hud-overlay--empty">
    <header>
      <h2>HUD Smart Alerts</h2>
      <p>Impossibile trovare un overlay compatibile con la missione selezionata.</p>
    </header>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch, watchEffect } from 'vue';

import contextCardAsset from '../../../../assets/hud/overlay/context-card.svg';
import timelineAsset from '../../../../assets/hud/overlay/mock-timeline.svg';
import { useHudOverlayModule } from '../../../modules/useHudOverlayModule';

interface Props {
  missionId?: string;
  missionTag?: string;
  overlayId?: string;
  state?: ReturnType<typeof useHudOverlayModule>;
}

const props = defineProps<Props>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const fallbackAssets = [contextCardAsset, timelineAsset].filter(Boolean) as string[];
const localModule = ref<ReturnType<typeof useHudOverlayModule> | null>(null);

if (!props.state) {
  localModule.value = useHudOverlayModule({
    missionId: props.missionId,
    missionTag: props.missionTag,
    overlayId: props.overlayId ?? 'smart-risk-alerts',
    autoRefresh: false,
  });
}

const module = computed(() => props.state ?? localModule.value!);

const overlay = computed(() => module.value?.overlay.value ?? null);
const thresholds = computed(
  () =>
    module.value?.thresholds.value ?? {
      weighted: 0,
      clear: 0,
      consecutiveBelow: 0,
    },
);
const timeline = computed(() => module.value?.timeline.value ?? []);
const contextMetrics = computed(() => module.value?.contextMetrics.value ?? []);
const summary = computed(() => module.value?.summary.value ?? null);
const error = computed(() => module.value?.error.value ?? null);

watch(
  () => [props.missionId, props.missionTag],
  ([missionId, missionTag]) => {
    module.value?.setMission(missionId, missionTag);
  },
);

const filtersEntries = computed(() => {
  const entries = overlay.value?.filters ?? {};
  return Object.entries(entries)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({
      key,
      label: key.replace(/_/g, ' '),
      value: Array.isArray(value) ? value.join(', ') : String(value),
    }));
});

const thresholdBadge = computed(() => {
  const spec = overlay.value?.threshold_badge;
  const label = spec?.label ?? 'Soglia risk index';
  const thresholdValue = thresholds.value.weighted;
  const severity =
    spec?.severity ?? (thresholdValue >= 0.65 ? 'high' : thresholdValue >= 0.6 ? 'medium' : 'low');
  const badgeValue = spec?.value ?? `${Math.round(thresholdValue * 100)}%`;
  const description =
    spec?.description ??
    `Clear a ${Math.round(thresholds.value.clear * 100)}% · consecutive below ${thresholds.value.consecutiveBelow}`;
  return { label, severity, value: badgeValue, description };
});

const canvasSize = computed(() => ({
  width: overlay.value?.panels?.length ? 360 : 320,
  height: overlay.value?.panels?.length ? 220 : 180,
}));

const assetCandidates = computed(() => {
  const overlayAsset = overlay.value?.canvas_asset;
  const contextAsset = overlay.value?.context_card?.asset;
  const timelineAssetUrl = overlay.value?.timeline?.asset;
  const assets = [overlayAsset, contextAsset, timelineAssetUrl, ...fallbackAssets];
  return assets.filter(
    (candidate): candidate is string => typeof candidate === 'string' && candidate.length > 0,
  );
});

function formatTimestamp(timestamp: string): string {
  try {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return timestamp;
    }
    return date.toLocaleString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  } catch (error_) {
    return timestamp;
  }
}

function drawCanvas(asset: string | undefined) {
  const canvas = canvasRef.value;
  if (!canvas) {
    return;
  }
  const context = canvas.getContext('2d');
  if (!context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#0f172a';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#38bdf8';
  context.font = 'bold 14px "Inter", system-ui, sans-serif';
  context.fillText(overlay.value?.title ?? 'Smart Risk Alerts', 16, 28);

  if (!asset) {
    context.fillStyle = '#facc15';
    context.fillText('Nessun asset disponibile', 16, canvas.height - 24);
    return;
  }

  const image = new Image();
  image.referrerPolicy = 'no-referrer';
  image.onload = () => {
    const availableWidth = canvas.width - 32;
    const availableHeight = canvas.height - 64;
    let width = image.width;
    let height = image.height;
    if (width > availableWidth) {
      const ratio = availableWidth / width;
      width *= ratio;
      height *= ratio;
    }
    if (height > availableHeight) {
      const ratio = availableHeight / height;
      width *= ratio;
      height *= ratio;
    }
    const x = (canvas.width - width) / 2;
    const y = 48 + (availableHeight - height) / 2;
    context.drawImage(image, x, y, width, height);
  };
  image.onerror = () => {
    context.fillStyle = '#f87171';
    context.fillText('Impossibile caricare asset HUD', 16, canvas.height - 24);
  };
  image.src = asset;
}

watchEffect(() => {
  drawCanvas(assetCandidates.value[0]);
});

onMounted(() => {
  if (!props.state) {
    void module.value?.refresh();
  }
});
</script>

<style scoped>
.smart-hud-overlay {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding: 1.5rem;
  background: radial-gradient(circle at top left, rgba(56, 189, 248, 0.08), rgba(15, 23, 42, 0.95));
  color: #f8fafc;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 18px;
  max-width: 960px;
  font-family:
    'Inter',
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}

.smart-hud-overlay__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.smart-hud-overlay__title h2 {
  margin: 0;
  font-size: 1.5rem;
  letter-spacing: 0.04em;
}

.smart-hud-overlay__title p {
  margin: 0.25rem 0 0;
  color: rgba(226, 232, 240, 0.82);
}

.smart-hud-overlay__threshold {
  padding: 0.75rem 1rem;
  border-radius: 12px;
  min-width: 180px;
  text-align: right;
  background: rgba(148, 163, 184, 0.12);
  border: 1px solid transparent;
}

.smart-hud-overlay__threshold[data-severity='low'] {
  border-color: rgba(94, 234, 212, 0.5);
}

.smart-hud-overlay__threshold[data-severity='medium'] {
  border-color: rgba(250, 204, 21, 0.55);
}

.smart-hud-overlay__threshold[data-severity='high'] {
  border-color: rgba(248, 113, 113, 0.65);
}

.smart-hud-overlay__threshold-label {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  opacity: 0.7;
}

.smart-hud-overlay__threshold-value {
  font-size: 1.5rem;
  line-height: 1.2;
}

.smart-hud-overlay__threshold-description {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
  color: rgba(226, 232, 240, 0.76);
}

.smart-hud-overlay__body {
  display: grid;
  grid-template-columns: 1fr minmax(280px, 320px);
  gap: 1.5rem;
}

.smart-hud-overlay__main {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.smart-hud-overlay__filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.5rem 1rem;
  margin: 0;
}

.smart-hud-overlay__filters dt {
  font-size: 0.75rem;
  text-transform: uppercase;
  opacity: 0.7;
}

.smart-hud-overlay__filters dd {
  margin: 0;
  font-weight: 600;
}

.smart-hud-overlay__panels {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.75rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

.smart-hud-overlay__panels li {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 12px;
  padding: 0.85rem;
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.smart-hud-overlay__format {
  font-size: 0.75rem;
  color: rgba(148, 163, 184, 0.9);
}

.smart-hud-overlay__timeline {
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 14px;
  padding: 1rem 1.25rem;
}

.smart-hud-overlay__timeline h3 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  letter-spacing: 0.02em;
}

.smart-hud-overlay__timeline ol {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.smart-hud-overlay__timeline-event {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 0.75rem;
  align-items: start;
}

.smart-hud-overlay__timeline-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  opacity: 0.8;
}

.smart-hud-overlay__timeline-content strong {
  display: block;
  font-size: 0.95rem;
  margin-bottom: 0.2rem;
}

.smart-hud-overlay__timeline-content p {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(226, 232, 240, 0.78);
}

.smart-hud-overlay__aside {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.smart-hud-overlay__canvas {
  width: 100%;
  border-radius: 16px;
  border: 1px solid rgba(56, 189, 248, 0.35);
  background: rgba(15, 23, 42, 0.75);
}

.smart-hud-overlay__context-card {
  border-radius: 14px;
  border: 1px solid rgba(94, 234, 212, 0.25);
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, rgba(13, 148, 136, 0.25), rgba(15, 23, 42, 0.85));
}

.smart-hud-overlay__context-card header {
  margin-bottom: 0.75rem;
}

.smart-hud-overlay__context-card h3 {
  margin: 0 0 0.25rem;
  font-size: 1rem;
}

.smart-hud-overlay__context-card p {
  margin: 0;
  font-size: 0.8rem;
  color: rgba(226, 232, 240, 0.7);
}

.smart-hud-overlay__context-metrics {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 0.6rem;
}

.smart-hud-overlay__context-metrics li {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  border-radius: 10px;
  background: rgba(15, 23, 42, 0.55);
  border: 1px solid rgba(148, 163, 184, 0.25);
}

.smart-hud-overlay__context-metrics li[data-trend='up'] {
  border-color: rgba(94, 234, 212, 0.65);
}

.smart-hud-overlay__context-metrics li[data-trend='down'] {
  border-color: rgba(248, 113, 113, 0.65);
}

.smart-hud-overlay__metric-label {
  font-size: 0.85rem;
  color: rgba(226, 232, 240, 0.8);
}

.smart-hud-overlay__metric-value {
  font-size: 1.1rem;
  font-variant-numeric: tabular-nums;
}

.smart-hud-overlay__footer {
  font-size: 0.85rem;
  color: rgba(248, 113, 113, 0.85);
}

.smart-hud-overlay--empty {
  border: 1px dashed rgba(148, 163, 184, 0.4);
  border-radius: 18px;
  padding: 1.5rem;
  background: rgba(15, 23, 42, 0.3);
  color: rgba(226, 232, 240, 0.75);
}

.smart-hud-overlay--empty h2 {
  margin: 0 0 0.5rem;
}
</style>
