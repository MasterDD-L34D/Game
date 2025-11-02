import { onCLS, onFID, onINP, onLCP, onTTFB, type Metric } from 'web-vitals';
import { readEnvString } from '../services/apiEndpoints.js';
import { recordMetricDiagnostic, type MetricDiagnosticPayload } from './diagnosticsStore.ts';

type MetricsFlag = 'auto' | 'enabled' | 'disabled';

type MetricEnvelope = {
  kind: 'web-vital' | 'performance';
  name: string;
  value: number;
  rating?: string;
  delta?: number;
  navigationType?: string;
  timestamp: number;
  details?: Record<string, unknown>;
};

function normaliseFlag(value: string | undefined, fallback: MetricsFlag): MetricsFlag {
  if (!value) {
    return fallback;
  }
  const normalised = value.trim().toLowerCase();
  if (['enabled', 'true', '1', 'on', 'yes'].includes(normalised)) {
    return 'enabled';
  }
  if (['disabled', 'false', '0', 'off', 'no'].includes(normalised)) {
    return 'disabled';
  }
  if (normalised === 'auto') {
    return 'auto';
  }
  return fallback;
}

const metricsFlag = normaliseFlag(readEnvString('VITE_OBSERVABILITY_METRICS'), 'auto');
const defaultMetricsEnabled = typeof window !== 'undefined';
const metricsEnabled = metricsFlag === 'enabled' || (metricsFlag === 'auto' && defaultMetricsEnabled);

const metricsEndpoint = readEnvString('VITE_OBSERVABILITY_METRICS_ENDPOINT');
const metricsStorageKey = readEnvString('VITE_OBSERVABILITY_METRICS_STORAGE_KEY') || 'nebula:observability:metrics';

let isInstalled = false;

function transmitMetrics(envelope: MetricEnvelope): void {
  if (!metricsEnabled) {
    return;
  }
  const payload = JSON.stringify({
    ...envelope,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  });
  if (metricsEndpoint) {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const sent = navigator.sendBeacon(metricsEndpoint, payload);
        if (sent) {
          return;
        }
      }
    } catch (error) {
      // Ignore beacon errors and fall back to fetch/local storage
    }
    if (typeof fetch === 'function') {
      try {
        void fetch(metricsEndpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: payload,
          keepalive: true,
          mode: 'no-cors',
        });
        return;
      } catch (error) {
        // Ignore fetch errors and persist locally
      }
    }
  }
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }
  try {
    const existingRaw = window.localStorage.getItem(metricsStorageKey);
    const entries: MetricEnvelope[] = existingRaw ? JSON.parse(existingRaw) : [];
    entries.unshift(envelope);
    if (entries.length > 50) {
      entries.length = 50;
    }
    window.localStorage.setItem(metricsStorageKey, JSON.stringify(entries));
  } catch (error) {
    // Ignore storage errors
  }
}

function recordMetric(kind: MetricEnvelope['kind'], payload: MetricDiagnosticPayload & { rating?: string; delta?: number; navigationType?: string }) {
  const diagnosticPayload: MetricDiagnosticPayload = {
    ...payload,
    name: payload.name,
    value: payload.value,
    rating: payload.rating,
    delta: payload.delta,
    navigationType: payload.navigationType,
  };
  recordMetricDiagnostic(diagnosticPayload);
  transmitMetrics({
    kind,
    name: payload.name,
    value: payload.value,
    rating: payload.rating,
    delta: payload.delta,
    navigationType: payload.navigationType,
    timestamp: payload.timestamp ?? Date.now(),
    details: payload.details,
  });
}

function reportWebVital(metric: Metric): void {
  recordMetric('web-vital', {
    id: metric.id,
    name: metric.name,
    value: Number(metric.value || 0),
    rating: metric.rating,
    delta: metric.delta,
    navigationType: metric.navigationType,
    entries: Array.isArray(metric.entries) ? metric.entries.length : undefined,
    details: metric.entries?.map((entry) => ({
      name: entry.name,
      startTime: entry.startTime,
      duration: entry.duration,
    })),
    timestamp: Date.now(),
  });
}

function reportPerformanceEntry(entry: PerformanceEntry): void {
  const details: Record<string, unknown> = {
    name: entry.name,
    entryType: entry.entryType,
    startTime: entry.startTime,
    duration: entry.duration,
  };
  if ('initiatorType' in entry) {
    details.initiatorType = (entry as PerformanceResourceTiming).initiatorType;
  }
  if ('transferSize' in entry && typeof (entry as PerformanceResourceTiming).transferSize === 'number') {
    details.transferSize = (entry as PerformanceResourceTiming).transferSize;
  }
  recordMetric('performance', {
    name: `performance:${entry.entryType}`,
    value: entry.duration,
    details,
    timestamp: Date.now(),
  });
}

function observePerformanceEntries(): void {
  if (typeof PerformanceObserver !== 'function') {
    return;
  }
  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        if (entry.entryType === 'resource') {
          const resourceEntry = entry as PerformanceResourceTiming;
          if (!['fetch', 'xmlhttprequest', 'script', 'link'].includes(resourceEntry.initiatorType || '')) {
            return;
          }
        }
        reportPerformanceEntry(entry);
      });
    });
    observer.observe({ type: 'resource', buffered: true });
    observer.observe({ type: 'navigation', buffered: true });
  } catch (error) {
    // Ignore observer errors
  }
}

function captureInitialNavigationTimings(): void {
  if (typeof performance === 'undefined' || typeof performance.getEntriesByType !== 'function') {
    return;
  }
  try {
    const navigationEntries = performance.getEntriesByType('navigation');
    navigationEntries.forEach((entry) => reportPerformanceEntry(entry));
  } catch (error) {
    // Ignore navigation capture errors
  }
}

export function installPerformanceMetrics(): void {
  if (isInstalled || !metricsEnabled || typeof window === 'undefined') {
    return;
  }
  isInstalled = true;
  captureInitialNavigationTimings();
  observePerformanceEntries();
  const vitalsListeners = [onCLS, onFID, onLCP, onINP, onTTFB];
  vitalsListeners.forEach((listener) => {
    try {
      listener(reportWebVital);
    } catch (error) {
      // Ignore registration errors for individual listeners
    }
  });
}

