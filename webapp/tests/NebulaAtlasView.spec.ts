import { describe, expect, it, beforeEach, vi } from 'vitest';
import { computed, ref } from 'vue';
import { mount } from '@vue/test-utils';

import NebulaAtlasView from '../src/views/NebulaAtlasView.vue';

const refreshMock = vi.fn();
const activateMock = vi.fn();

vi.mock('../src/modules/useNebulaProgressModule', () => ({
  useNebulaProgressModule: () => ({
    header: computed(() => ({
      datasetId: 'atlas-demo',
      title: 'Nebula Atlas Demo',
      summary: 'Dataset statico per QA',
      releaseWindow: 'Q4 · 2035',
      curator: 'Team Nebula',
    })),
    cards: computed(() => []),
    timelineEntries: computed(() => []),
    evolutionMatrix: computed(() => []),
    share: computed(() => ({})),
    telemetrySummary: computed(() => ({
      total: 128,
      open: 4,
      acknowledged: 92,
      highPriority: 2,
      lastEventAt: null,
      lastEventLabel: 'Sync mock 15m fa',
      updatedAt: '2035-04-01T12:00:00Z',
      mode: 'mock',
      isDemo: true,
      sourceLabel: 'Telemetria offline · demo',
    })),
    telemetryStreams: computed(() => ({
      coverage: [60, 72, 88],
      incidents: [2, 1, 0],
      highPriority: [1, 1, 0],
    })),
    telemetryDistribution: computed(() => ({
      success: 8,
      warning: 2,
      neutral: 1,
      critical: 0,
    })),
    telemetryCoverageAverage: computed(() => 82),
    telemetryStatus: computed(() => ({
      mode: 'mock',
      offline: true,
      variant: 'demo',
      label: 'Telemetria offline · demo',
    })),
    generatorStatus: computed(() => ({
      status: 'mock',
      label: 'Generatore offline · demo',
      generatedAt: null,
      updatedAt: '2035-04-01T12:00:00Z',
      sourceLabel: 'Generator telemetry offline',
    })),
    generatorMetrics: computed(() => ({
      generationTimeMs: 512,
      speciesTotal: 18,
      enrichedSpecies: 12,
      eventTotal: 2,
      datasetSpeciesTotal: 20,
      coverageAverage: 82,
      coreTraits: 44,
      optionalTraits: 22,
      synergyTraits: 10,
      expectedCoreTraits: 28,
    })),
    generatorStreams: computed(() => ({
      generationTime: [280, 340, 420],
      species: [10, 14, 18],
      enriched: [6, 9, 12],
    })),
    loading: computed(() => false),
    error: computed(() => null),
    lastUpdated: ref('2035-04-01T12:00:00Z'),
    refresh: refreshMock,
    activateDemoTelemetry: activateMock,
  }),
}));

describe('NebulaAtlasView', () => {
  beforeEach(() => {
    refreshMock.mockClear();
    activateMock.mockClear();
  });

  function mountView() {
    return mount(NebulaAtlasView, {
      global: {
        stubs: {
          NebulaProgressModule: {
            template: '<div data-test="progress-stub"></div>',
          },
          SparklineChart: {
            template: '<div class="sparkline-chart"></div>',
          },
        },
      },
    });
  }

  it('mostra il banner demo e genera uno snapshot stabile', () => {
    const wrapper = mountView();
    expect(wrapper.find('.nebula-atlas-view__banner').exists()).toBe(true);
    expect(wrapper.html()).toMatchSnapshot();
  });

  it('espone i controlli manuali di sincronizzazione', async () => {
    const wrapper = mountView();
    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBeGreaterThan(0);

    for (const button of buttons) {
      await button.trigger('click');
    }

    expect(refreshMock).toHaveBeenCalledTimes(2);
    expect(activateMock).toHaveBeenCalledTimes(2);
  });
});
