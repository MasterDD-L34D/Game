import { describe, expect, it, vi } from 'vitest';
import { nextTick, ref, computed } from 'vue';
import { mount } from '@vue/test-utils';

const generateSpeciesMock = vi.hoisted(() =>
  vi.fn(async () => ({
    blueprint: { name: 'Specie simulata' },
    validation: {},
    meta: { request_id: 'req-001', endpoint_source: 'remote' },
  }))
);

vi.mock('../src/services/generationOrchestratorService.js', () => ({
  generateSpecies: generateSpeciesMock,
  generateSpeciesBatch: vi.fn(async () => ({ results: [], errors: [] })),
  summariseValidation: vi.fn(() => ({ total: 0, warnings: 0, errors: 0, discarded: 0, corrected: 0 })),
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

import FlowShellView from '../src/views/FlowShellView.vue';

async function flushAsync() {
  await nextTick();
  await Promise.resolve();
  await nextTick();
}

describe('FlowShellView - snapshot refresh', () => {
  it('aggiorna snapshot e metriche dopo la generazione specie', async () => {
    vi.useFakeTimers();
    const originalFetch = global.fetch;
    const initialSnapshot = {
      overview: { completion: { completed: 1, total: 5 } },
      species: { curated: 1, total: 5 },
      biomeSetup: { prepared: 1, total: 2 },
      biomes: [],
      biomeSummary: { validated: 1, pending: 3 },
      encounterSummary: { variants: 1, seeds: 1 },
      qualityRelease: { checks: { qa: { total: 4, passed: 1 } } },
      publishing: { artifactsReady: 0, totalArtifacts: 3 },
      initialSpeciesRequest: { trait_ids: ['alpha'], biome_id: 'forest' },
    };
    const refreshedSnapshot = {
      ...initialSnapshot,
      species: { curated: 2, total: 5 },
      qualityRelease: { checks: { qa: { total: 4, passed: 2 } } },
    };
    const fetchStub = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const payload = url.includes('refresh=1') ? refreshedSnapshot : initialSnapshot;
      return {
        ok: true,
        async json() {
          return JSON.parse(JSON.stringify(payload));
        },
      } as Response;
    });
    global.fetch = fetchStub as unknown as typeof fetch;

    try {
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

      expect(fetchStub).toHaveBeenCalledTimes(1);
      expect(generateSpeciesMock).toHaveBeenCalled();

      const findCardByTitle = (title: string) =>
        wrapper.findAll('.progress-card').find((card) => card.text().includes(title));

      const speciesCard = findCardByTitle('Specie');
      expect(speciesCard).toBeTruthy();
      expect(speciesCard?.text()).toContain('1 / 5');

      const qaCard = findCardByTitle('Quality & Release');
      expect(qaCard).toBeTruthy();
      expect(qaCard?.text()).toContain('1 / 4');

      await vi.advanceTimersByTimeAsync(300);
      await flushAsync();
      await flushAsync();

      expect(fetchStub).toHaveBeenCalledTimes(2);
      const secondCall = fetchStub.mock.calls[1]?.[0];
      const secondUrl = typeof secondCall === 'string'
        ? secondCall
        : secondCall instanceof URL
          ? secondCall.toString()
          : secondCall?.url;
      expect(secondUrl).toContain('refresh=1');

      expect(speciesCard?.text()).toContain('2 / 5');
      expect(qaCard?.text()).toContain('2 / 4');
    } finally {
      global.fetch = originalFetch;
      vi.useRealTimers();
    }
  });
});
