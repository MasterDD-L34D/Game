import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick, ref, computed } from 'vue';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const generateSpeciesMock = vi.hoisted(() =>
  vi.fn(async () => ({
    blueprint: { name: 'Specie simulata' },
    validation: {},
    meta: { request_id: 'req-telemetry', endpoint_source: 'remote' },
  })),
);

vi.mock('../src/services/generationOrchestratorService.js', () => ({
  generateSpecies: generateSpeciesMock,
  generateSpeciesBatch: vi.fn(async () => ({ results: [], errors: [] })),
  summariseValidation: vi.fn(() => ({
    total: 0,
    warnings: 0,
    errors: 0,
    discarded: 0,
    corrected: 0,
  })),
  __testables__: {
    normaliseRequest: (payload: Record<string, unknown> = {}) => payload,
    normaliseBatchEntries: (entries: Array<Record<string, unknown>> = []) => entries,
  },
}));

vi.mock('../src/state/useTraitDiagnostics.js', () => ({
  useTraitDiagnostics: () => {
    const diagnostics = ref<Record<string, unknown>>({});
    const meta = ref<Record<string, unknown>>({});
    const loading = ref(false);
    const error = ref<Error | null>(null);
    const source = ref('remote');
    const fallbackLabel = ref<string | null>(null);
    const lastUpdatedAt = ref<number | null>(null);
    const traitCatalog = computed(() => ({ traits: [], labels: {}, synergyMap: {} }));
    const traitCompliance = computed(() => ({ badges: [], summary: {} }));
    const loadMock = vi.fn(async () => ({}));
    const reloadMock = vi.fn(async () => ({}));
    return {
      traitCatalog,
      traitCompliance,
      diagnostics,
      meta: computed(() => meta.value),
      loading,
      error,
      source,
      fallbackLabel,
      lastUpdatedAt,
      load: loadMock,
      reload: reloadMock,
      state: {},
    };
  },
}));

import * as clientLoggerModule from '../src/services/clientLogger.ts';

class FakeEventSource {
  static instances: FakeEventSource[] = [];

  url: string;

  readyState = 0;

  onopen: ((event: MessageEvent) => void) | null = null;

  onerror: ((event: Event) => void) | null = null;

  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
    queueMicrotask(() => {
      if (typeof MessageEvent === 'function' && this.onopen) {
        this.onopen(new MessageEvent('open'));
      } else if (this.onopen) {
        this.onopen(new Event('open') as MessageEvent);
      }
    });
  }

  close() {
    this.readyState = 2;
  }

  emitMessage(data: unknown) {
    const payload =
      typeof MessageEvent === 'function'
        ? new MessageEvent('message', { data })
        : ({ data, type: 'message' } as MessageEvent);
    this.onmessage?.(payload);
  }

  emitError() {
    const event = new Event('error');
    this.onerror?.(event);
  }

  static reset() {
    FakeEventSource.instances = [];
  }
}

async function flushAsync() {
  await nextTick();
  await Promise.resolve();
  await nextTick();
}

describe('FlowShellView - telemetry panel', () => {
  const snapshotPath = resolve(
    process.cwd(),
    'public/data/flow/snapshots/flow-shell-snapshot.json',
  );
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf-8'));

  const originalFetch = global.fetch;
  const originalEventSource = global.EventSource;
  const originalCreateObjectURL = global.URL.createObjectURL;
  const originalRevokeObjectURL = global.URL.revokeObjectURL;

  beforeEach(() => {
    FakeEventSource.reset();
    global.EventSource = FakeEventSource as unknown as typeof EventSource;
    global.URL.createObjectURL = vi.fn(() => 'blob:qa');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    global.EventSource = originalEventSource;
    global.URL.createObjectURL = originalCreateObjectURL;
    global.URL.revokeObjectURL = originalRevokeObjectURL;
    vi.resetAllMocks();
    vi.useRealTimers();
  });

  it('mostra le metriche QA, riceve log via stream e consente export', async () => {
    vi.useFakeTimers();
    const fetchStub = vi.fn(async () => ({
      ok: true,
      async json() {
        return JSON.parse(JSON.stringify(snapshot));
      },
    }));
    global.fetch = fetchStub as unknown as typeof fetch;

    const { default: FlowShellView } = await import('../src/views/FlowShellView.vue');

    const wrapper = mount(FlowShellView, {
      global: {
        stubs: {
          FlowBreadcrumb: { template: '<nav class="breadcrumb-stub"></nav>' },
          ProgressTracker: (await import('../src/components/layout/ProgressTracker.vue')).default,
          OverviewView: {
            props: ['overview', 'timeline', 'qualityRelease'],
            template: '<section class="overview-stub"></section>',
          },
          SpeciesView: {
            props: [
              'species',
              'status',
              'meta',
              'validation',
              'requestId',
              'loading',
              'error',
              'traitCatalog',
              'traitCompliance',
              'traitDiagnosticsLoading',
              'traitDiagnosticsError',
              'traitDiagnosticsMeta',
            ],
            template: '<section class="species-stub"></section>',
          },
          BiomeSetupView: {
            props: ['config', 'graph', 'validators'],
            template: '<section class="biome-setup-stub"></section>',
          },
          BiomesView: {
            props: ['biomes'],
            template: '<section class="biomes-stub"></section>',
          },
          EncounterView: {
            props: ['encounter', 'summary'],
            template: '<section class="encounter-stub"></section>',
          },
          QualityReleaseView: {
            props: ['snapshot', 'context', 'orchestratorLogs'],
            template: '<section class="quality-stub"></section>',
          },
          PublishingView: {
            props: ['publishing'],
            template: '<section class="publishing-stub"></section>',
          },
        },
      },
    });

    await flushAsync();
    await flushAsync();

    expect(fetchStub).toHaveBeenCalled();
    const streamInstance = FakeEventSource.instances.at(-1);
    expect(streamInstance).toBeTruthy();
    expect(streamInstance?.url).toContain('/api/v1/quality/logs/stream');

    const badgeLabels = wrapper.findAll('.flow-telemetry .evogene-deck-telemetry__label');
    expect(badgeLabels.at(0)?.text()).toContain('Validator warnings');
    const badgeValues = wrapper.findAll('.flow-telemetry .evogene-deck-telemetry__value');
    expect(badgeValues.at(0)?.text()).toContain('1');
    expect(badgeValues.at(1)?.text()).toContain('1');
    expect(badgeValues.at(2)?.text()).toContain('nebula-priority');

    streamInstance?.emitMessage(
      JSON.stringify({
        event: 'validator.warning',
        scope: 'validator',
        level: 'warning',
        message: 'Seed non valido',
        timestamp: '2024-05-18T12:00:00Z',
      }),
    );

    await flushAsync();

    const logRows = wrapper.findAll('.flow-telemetry__log');
    expect(logRows.some((row) => row.text().includes('Seed non valido'))).toBe(true);

    const exportButtons = wrapper.findAll('button.flow-telemetry__export');
    expect(exportButtons).toHaveLength(2);
    const objectUrlSpy = global.URL.createObjectURL as unknown as vi.Mock;
    await exportButtons.at(0)?.trigger('click');
    await flushAsync();
    expect(objectUrlSpy).toHaveBeenCalledTimes(1);
    await exportButtons.at(1)?.trigger('click');
    await flushAsync();
    expect(objectUrlSpy).toHaveBeenCalledTimes(2);

    streamInstance?.emitError();
    await flushAsync();
    const reconnectButton = wrapper.find('button.flow-telemetry__refresh');
    expect(reconnectButton.attributes('disabled')).toBeUndefined();
    await reconnectButton.trigger('click');
    expect(clientLoggerModule.defaultStreamUrl).toBeTruthy();

    wrapper.unmount();
  });
});
