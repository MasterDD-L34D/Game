import type { App } from 'vue';
import type { Router } from 'vue-router';
import { readEnvString } from '../services/apiEndpoints.js';

type ErrorReportingFlag = 'enabled' | 'disabled';

let installed = false;

function normaliseFlag(value: string | undefined, fallback: ErrorReportingFlag): ErrorReportingFlag {
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
  return fallback;
}

function parseSampleRate(key: string, fallback: number): number {
  const raw = readEnvString(key);
  if (!raw) {
    return fallback;
  }
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(Math.max(parsed, 0), 1);
}

export async function installErrorReporting(app: App, router: Router): Promise<void> {
  if (installed || typeof window === 'undefined') {
    return;
  }
  const flag = normaliseFlag(readEnvString('VITE_OBSERVABILITY_ERROR_REPORTING'), 'disabled');
  if (flag === 'disabled') {
    return;
  }
  const dsn = readEnvString('VITE_OBSERVABILITY_ERROR_REPORTING_DSN');
  if (!dsn) {
    return;
  }
  installed = true;
  const environment = readEnvString('VITE_OBSERVABILITY_ENVIRONMENT') || import.meta.env.MODE;
  const release = readEnvString('VITE_OBSERVABILITY_RELEASE');
  const tracesSampleRate = parseSampleRate('VITE_OBSERVABILITY_TRACES_SAMPLE_RATE', 0);
  const sessionSampleRate = parseSampleRate('VITE_OBSERVABILITY_REPLAYS_SESSION_SAMPLE_RATE', 0);
  const errorSampleRate = parseSampleRate('VITE_OBSERVABILITY_REPLAYS_ERROR_SAMPLE_RATE', 0.1);

  const sentry = await import('@sentry/vue');

  sentry.init({
    app,
    dsn,
    environment,
    release: release || undefined,
    integrations: (integrations) => {
      const resolved = [...integrations];
      if (typeof sentry.browserTracingIntegration === 'function') {
        resolved.push(sentry.browserTracingIntegration({ router }));
      }
      if (typeof sentry.replayIntegration === 'function' && (sessionSampleRate > 0 || errorSampleRate > 0)) {
        resolved.push(
          sentry.replayIntegration({
            stickySession: true,
            maskAllInputs: false,
          }),
        );
      }
      return resolved;
    },
    tracesSampleRate,
    replaysSessionSampleRate: sessionSampleRate,
    replaysOnErrorSampleRate: errorSampleRate,
    beforeSend(event) {
      if (event && event.request && event.request.headers) {
        const headers = event.request.headers as Record<string, unknown>;
        delete headers['authorization'];
        delete headers['cookie'];
      }
      return event;
    },
  });
}

