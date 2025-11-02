import { computed, onMounted, ref, type Ref } from 'vue';
import { parse as parseYaml } from 'yaml';

import fallbackSummary from '../data/hud/smartRiskOverlayFallback.json';
import { createLogger } from '../utils/logger';

const logger = createLogger('hud.overlay');

const DEFAULT_THRESHOLD = 0.6;
const DEFAULT_CLEAR_THRESHOLD = 0.58;
const DEFAULT_CONSECUTIVE_BELOW = 2;

export type HudOverlayAlertStatus = 'raised' | 'acknowledged' | 'cleared' | 'filtered';

export interface HudOverlayAlertSummary {
  alertId: string;
  missionId?: string;
  missionTag?: string;
  status: HudOverlayAlertStatus;
  turn?: number;
  weightedIndex?: number;
  timeLowHpTurns?: number;
  timestamp?: string;
  ackRecipients?: string[];
  filterName?: string;
}

export interface HudOverlayMetricsSummary {
  ackRate?: number;
  filterRatio?: number;
  cohesion?: Record<string, number>;
  supportActions?: Record<string, number>;
}

export interface HudOverlaySummaryPayload {
  generatedAt?: string;
  alerts?: HudOverlayAlertSummary[];
  metrics?: HudOverlayMetricsSummary;
}

export interface HudOverlayFilterSpec {
  weighted_index_threshold?: number;
  clear_threshold?: number;
  consecutive_below?: number;
  [key: string]: unknown;
}

export interface HudOverlayPanelSpec {
  id: string;
  type: string;
  source?: string;
  format?: string;
}

export interface HudOverlayContextMetricSpec {
  id: string;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
}

export interface HudOverlayContextCardSpec {
  title: string;
  summary?: string;
  asset?: string;
  metrics?: HudOverlayContextMetricSpec[];
}

export interface HudOverlayTimelineSpec {
  title?: string;
  asset?: string;
  events?: Array<{
    id: string;
    title: string;
    description?: string;
    timestamp?: string;
    icon?: string;
  }>;
}

export interface HudOverlaySpec {
  id: string;
  title: string;
  description?: string;
  filters?: HudOverlayFilterSpec;
  panels?: HudOverlayPanelSpec[];
  mission_tags?: Array<{ tag: string; missions?: string[] }>;
  threshold_badge?: {
    label: string;
    value: string | number;
    severity?: 'low' | 'medium' | 'high';
    description?: string;
  };
  canvas_asset?: string;
  context_card?: HudOverlayContextCardSpec;
  timeline?: HudOverlayTimelineSpec;
}

interface HudLayoutConfig {
  overlays?: HudOverlaySpec[];
}

export interface HudOverlayThresholds {
  weighted: number;
  clear: number;
  consecutiveBelow: number;
}

export interface HudOverlayTimelineEvent {
  id: string;
  title: string;
  description?: string;
  timestamp?: string;
  icon?: string;
}

export interface HudOverlayContextMetric {
  id: string;
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'stable';
}

export interface HudOverlayModuleState {
  overlay: Ref<HudOverlaySpec | null>;
  thresholds: Ref<HudOverlayThresholds>;
  timeline: Ref<HudOverlayTimelineEvent[]>;
  contextMetrics: Ref<HudOverlayContextMetric[]>;
  summary: Ref<HudOverlaySummaryPayload | null>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
}

export interface UseHudOverlayOptions {
  missionId?: string;
  missionTag?: string;
  overlayId?: string;
  summaryUrl?: string | null;
  autoRefresh?: boolean;
}

function parseLayout(): HudLayoutConfig {
  try {
    const rawLayout = (import.meta.env as Record<string, unknown>).__HUD_LAYOUT__ as
      | HudLayoutConfig
      | undefined;
    if (rawLayout && typeof rawLayout === 'object') {
      return rawLayout;
    }
  } catch (error) {
    logger.warn('hud.overlay.layout.env_failed', { error });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/consistent-type-imports
    const layoutSource = import.meta.glob('../../data/core/hud/layout.yaml', {
      as: 'raw',
      eager: true,
    }) as Record<string, string>;
    const raw = Object.values(layoutSource)[0];
    if (raw) {
      return parseYaml(raw) as HudLayoutConfig;
    }
  } catch (error) {
    logger.error('hud.overlay.layout.load_failed', { error });
  }

  return { overlays: [] };
}

const parsedLayout = parseLayout();

function matchesOverlay(spec: HudOverlaySpec, missionTag?: string, missionId?: string): boolean {
  if (!spec.mission_tags || spec.mission_tags.length === 0) {
    return true;
  }

  return spec.mission_tags.some((entry) => {
    if (missionTag && entry.tag === missionTag) {
      return true;
    }
    if (missionId && Array.isArray(entry.missions)) {
      return entry.missions.includes(missionId);
    }
    return false;
  });
}

function selectOverlaySpec(
  layout: HudLayoutConfig,
  overlayId?: string,
  missionTag?: string,
  missionId?: string,
): HudOverlaySpec | null {
  if (!Array.isArray(layout.overlays) || layout.overlays.length === 0) {
    return null;
  }

  if (overlayId) {
    const explicit = layout.overlays.find((candidate) => candidate.id === overlayId);
    if (explicit) {
      return explicit;
    }
  }

  const match = layout.overlays.find((candidate) =>
    matchesOverlay(candidate, missionTag, missionId),
  );
  return match ?? layout.overlays[0];
}

function normaliseThresholds(filters?: HudOverlayFilterSpec): HudOverlayThresholds {
  const weighted =
    typeof filters?.weighted_index_threshold === 'number'
      ? filters.weighted_index_threshold
      : DEFAULT_THRESHOLD;
  const clear =
    typeof filters?.clear_threshold === 'number'
      ? filters.clear_threshold
      : DEFAULT_CLEAR_THRESHOLD;
  const consecutiveBelow =
    typeof filters?.consecutive_below === 'number'
      ? filters.consecutive_below
      : DEFAULT_CONSECUTIVE_BELOW;
  return { weighted, clear, consecutiveBelow };
}

function formatPercent(value: number | undefined, fractionDigits = 0): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return '—';
  }
  return `${(value * 100).toFixed(fractionDigits)}%`;
}

function createTimeline(summary: HudOverlaySummaryPayload | null): HudOverlayTimelineEvent[] {
  if (!summary?.alerts || summary.alerts.length === 0) {
    return [];
  }

  return summary.alerts.slice(0, 4).map((entry) => {
    const { alertId, status, turn, missionTag, weightedIndex, timestamp } = entry;
    const labelParts = [status.toUpperCase()];
    if (typeof weightedIndex === 'number') {
      labelParts.push(formatPercent(weightedIndex, 0));
    }
    if (typeof turn === 'number') {
      labelParts.push(`turn ${turn}`);
    }
    const title = labelParts.join(' · ');
    const missionLabel = missionTag ? missionTag.toUpperCase() : entry.missionId;
    const description = missionLabel ? `${missionLabel} — ${alertId}` : alertId;
    return {
      id: `${alertId}:${status}:${turn ?? 'n/a'}`,
      title,
      description,
      timestamp,
    };
  });
}

function resolveTopMetric(
  values: Record<string, number> | undefined,
): { key: string; value: number } | null {
  if (!values) {
    return null;
  }
  return (
    Object.entries(values)
      .filter(([, value]) => typeof value === 'number' && !Number.isNaN(value))
      .sort((a, b) => b[1] - a[1])[0] ?? null
  );
}

function createContextMetrics(summary: HudOverlaySummaryPayload | null): HudOverlayContextMetric[] {
  if (!summary?.metrics) {
    return [];
  }

  const result: HudOverlayContextMetric[] = [];
  const { ackRate, filterRatio, cohesion, supportActions } = summary.metrics;

  const topCohesion = resolveTopMetric(cohesion);
  if (topCohesion && typeof topCohesion.key === 'string') {
    result.push({
      id: `cohesion:${topCohesion.key}`,
      label: `Cohesion · ${topCohesion.key.toUpperCase()}`,
      value: formatPercent(topCohesion.value, 0),
      trend: topCohesion.value >= 0.78 ? 'up' : 'stable',
    });
  } else if (topCohesion) {
    const key = String(topCohesion.key ?? 'n/a');
    result.push({
      id: `cohesion:${key}`,
      label: `Cohesion · ${key}`,
      value: formatPercent(topCohesion.value, 0),
      trend: topCohesion.value >= 0.78 ? 'up' : 'stable',
    });
  }

  const topSupport = resolveTopMetric(supportActions);
  if (topSupport && typeof topSupport.key === 'string') {
    result.push({
      id: `support:${topSupport.key}`,
      label: `Support actions · ${topSupport.key.toUpperCase()}`,
      value: `${topSupport.value}`,
      trend: topSupport.value >= 15 ? 'up' : 'stable',
    });
  } else if (topSupport) {
    const key = String(topSupport.key ?? 'n/a');
    result.push({
      id: `support:${key}`,
      label: `Support actions · ${key}`,
      value: `${topSupport.value}`,
      trend: topSupport.value >= 15 ? 'up' : 'stable',
    });
  }

  if (typeof ackRate === 'number') {
    result.push({
      id: 'ack-rate',
      label: 'Ack rate',
      value: `${(ackRate * 100).toFixed(0)}%`,
      trend: ackRate >= 0.9 ? 'up' : 'stable',
    });
  }

  if (typeof filterRatio === 'number') {
    result.push({
      id: 'filter-ratio',
      label: 'Filter ratio',
      value: `${(filterRatio * 100).toFixed(0)}%`,
      trend: filterRatio > 0.25 ? 'down' : 'stable',
    });
  }

  return result;
}

function normaliseSummary(payload: unknown): HudOverlaySummaryPayload | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const typed = payload as HudOverlaySummaryPayload;
  const alerts = Array.isArray(typed.alerts)
    ? typed.alerts
        .filter(
          (entry): entry is HudOverlayAlertSummary =>
            !!entry && typeof entry === 'object' && typeof entry.alertId === 'string',
        )
        .map((entry) => ({
          ...entry,
          ackRecipients: Array.isArray(entry.ackRecipients)
            ? entry.ackRecipients.filter((value): value is string => typeof value === 'string')
            : undefined,
        }))
    : [];

  const metrics =
    typed.metrics && typeof typed.metrics === 'object' ? { ...typed.metrics } : undefined;
  if (metrics?.cohesion) {
    metrics.cohesion = Object.fromEntries(
      Object.entries(metrics.cohesion)
        .filter(([, value]) => typeof value === 'number')
        .map(([key, value]) => [key, value as number]),
    );
  }
  if (metrics?.supportActions) {
    metrics.supportActions = Object.fromEntries(
      Object.entries(metrics.supportActions)
        .filter(([, value]) => typeof value === 'number')
        .map(([key, value]) => [key, value as number]),
    );
  }

  return {
    generatedAt: typeof typed.generatedAt === 'string' ? typed.generatedAt : undefined,
    alerts,
    metrics,
  };
}

export function useHudOverlayModule(options: UseHudOverlayOptions = {}): HudOverlayModuleState & {
  refresh: () => Promise<void>;
  setMission: (missionId?: string, missionTag?: string) => void;
} {
  const missionIdRef: Ref<string | undefined> = ref(options.missionId);
  const missionTagRef: Ref<string | undefined> = ref(options.missionTag);
  const overlayRef = ref<HudOverlaySpec | null>(
    selectOverlaySpec(parsedLayout, options.overlayId, missionTagRef.value, missionIdRef.value),
  );
  const thresholdsRef = ref<HudOverlayThresholds>(normaliseThresholds(overlayRef.value?.filters));
  const summaryRef = ref<HudOverlaySummaryPayload | null>(normaliseSummary(fallbackSummary));
  const loading = ref(true);
  const error = ref<string | null>(null);

  const refresh = async () => {
    loading.value = true;
    const summaryUrl =
      options.summaryUrl ?? `${import.meta.env.BASE_URL ?? '/'}data/hud/smart_risk_overlay.json`;
    try {
      const response = await fetch(summaryUrl, { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error(`Impossibile caricare summary HUD (${response.status})`);
      }
      const json = await response.json();
      const parsed = normaliseSummary(json);
      if (!parsed) {
        throw new Error('Formato summary HUD non valido');
      }
      summaryRef.value = parsed;
      error.value = null;
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause);
      summaryRef.value = normaliseSummary(fallbackSummary);
      logger.warn('hud.overlay.summary.fallback', { cause });
    } finally {
      loading.value = false;
    }
  };

  if (options.autoRefresh !== false) {
    onMounted(() => {
      void refresh();
    });
  }

  const updateOverlay = () => {
    overlayRef.value = selectOverlaySpec(
      parsedLayout,
      options.overlayId,
      missionTagRef.value,
      missionIdRef.value,
    );
    thresholdsRef.value = normaliseThresholds(overlayRef.value?.filters);
  };

  const setMission = (missionId?: string, missionTag?: string) => {
    missionIdRef.value = missionId;
    missionTagRef.value = missionTag;
    updateOverlay();
  };

  updateOverlay();

  const timeline = computed(() => createTimeline(summaryRef.value));
  const contextMetrics = computed(() => createContextMetrics(summaryRef.value));

  return {
    overlay: computed(() => overlayRef.value),
    thresholds: computed(() => thresholdsRef.value),
    timeline,
    contextMetrics,
    summary: computed(() => summaryRef.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    refresh,
    setMission,
  };
}
