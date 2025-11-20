import { describe, expect, it, beforeEach, vi } from 'vitest';
import { computed, ref } from 'vue';
import { mount } from '@vue/test-utils';

import AtlasTelemetryView from '../src/views/atlas/AtlasTelemetryView.vue';

const refreshMock = vi.fn();
const activateDemoMock = vi.fn();

vi.mock('../src/modules/useNebulaProgressModule', () => ({
  useNebulaProgressModule: () => ({
    datasetStatus: computed(() => ({
      source: 'remote',
      label: 'Dataset live',
      demo: false,
    })),
    telemetryStatus: computed(() => ({
      mode: 'live',
      label: 'Telemetria live',
      offline: false,
      demo: false,
    })),
    error: computed(() => ({ message: null })),
    telemetrySummary: computed(() => ({
      total: 12,
      open: 3,
      acknowledged: 7,
      highPriority: 2,
      lastEventLabel: 'Aggiornato 5m fa',
    })),
    telemetryStreams: computed(() => ({
      coverage: [62, 68, 74, 81],
      incidents: [1, 0, 2, 1],
      highPriority: [0, 1, 1, 0],
    })),
    telemetryDistribution: computed(() => ({
      success: 5,
      warning: 2,
      neutral: 3,
      critical: 2,
    })),
    telemetryCoverageAverage: computed(() => 78),
    generatorStatus: computed(() => ({
      status: 'success',
      label: 'Generatore online',
      generatedAt: '2035-04-01T12:00:00Z',
    })),
    generatorMetrics: computed(() => ({
      generationTimeMs: 512,
      speciesTotal: 24,
      enrichedSpecies: 16,
      eventTotal: 4,
      datasetSpeciesTotal: 40,
      coverageAverage: 78,
      coreTraits: 48,
      optionalTraits: 22,
      synergyTraits: 12,
    })),
    generatorStreams: computed(() => ({
      generationTime: [420, 480, 512],
      species: [18, 22, 24],
      enriched: [10, 14, 16],
    })),
    refresh: refreshMock,
    activateDemoTelemetry: activateDemoMock,
    loading: ref(false),
    lastUpdated: ref('2035-04-01T12:00:00Z'),
  }),
}));

describe('AtlasTelemetryView', () => {
  beforeEach(() => {
    refreshMock.mockClear();
    activateDemoMock.mockClear();
  });

  it('visualizza metriche principali e consente il refresh manuale', async () => {
    const wrapper = mount(AtlasTelemetryView, {
      global: {
        stubs: {
          SparklineChart: {
            props: ['points'],
            template: '<div class="sparkline-stub">{{ points.join(\',\') }}</div>',
          },
        },
      },
    });

    expect(wrapper.find('h2').text()).toBe('Telemetria Nebula');
    expect(wrapper.text()).toContain('Eventi totali');
    expect(wrapper.text()).toContain('Distribuzione readiness');

    const [refreshButton, demoButton] = wrapper.findAll('button');
    await refreshButton.trigger('click');
    await demoButton.trigger('click');

    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(activateDemoMock).toHaveBeenCalledTimes(1);
    expect(wrapper.html()).toMatchSnapshot();
  });
});
