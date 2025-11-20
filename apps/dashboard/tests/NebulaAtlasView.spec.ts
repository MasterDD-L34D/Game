import { describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import NebulaAtlasView from '../src/views/NebulaAtlasView.vue';

function createFetchStub() {
  return vi.fn(async () => ({
    ok: true,
    async json() {
      return {
        dataset: {
          id: 'nebula-test',
          title: 'Nebula Test',
          summary: 'Dataset di test per la vista live.',
          releaseWindow: 'Test Window',
          curator: 'Unit Test',
          species: [
            {
              id: 'species-1',
              name: 'Specie Test',
              readiness: 'Pronto',
              telemetry: {
                coverage: 0.82,
                lastValidation: '2024-05-18T08:00:00Z',
                curatedBy: 'QA Core',
              },
            },
          ],
        },
        telemetry: {
          summary: {
            totalEvents: 6,
            openEvents: 2,
            acknowledgedEvents: 4,
            highPriorityEvents: 1,
            lastEventAt: '2024-05-18T10:30:00Z',
          },
          coverage: {
            average: 78,
            history: [60, 70, 80],
            distribution: { success: 3, warning: 1, neutral: 1, critical: 0 },
          },
          incidents: {
            timeline: [
              { date: '2024-05-12', total: 1, highPriority: 0 },
              { date: '2024-05-13', total: 2, highPriority: 1 },
              { date: '2024-05-14', total: 1, highPriority: 0 },
            ],
          },
          updatedAt: '2024-05-18T10:45:00Z',
          sample: [],
        },
        generator: {
          status: 'success',
          label: 'Generatore online',
          generatedAt: '2024-05-18T10:40:00Z',
          updatedAt: '2024-05-18T10:46:00Z',
          sourceLabel: 'Generator telemetry',
          metrics: {
            generationTimeMs: 420,
            speciesTotal: 12,
            enrichedSpecies: 8,
            eventTotal: 3,
            datasetSpeciesTotal: 6,
            coverageAverage: 78,
            coreTraits: 24,
            optionalTraits: 11,
            synergyTraits: 8,
            expectedCoreTraits: 22,
          },
          streams: {
            generationTime: [300, 340, 360, 390, 410, 420],
            species: [6, 7, 8, 9, 11, 12],
            enriched: [3, 4, 5, 6, 7, 8],
          },
        },
      };
    },
  })) as unknown as typeof fetch;
}

describe('NebulaAtlasView', () => {
  it('renderizza indicatori live e snapshot coerente', async () => {
    const originalFetch = global.fetch;
    const fetchStub = createFetchStub();
    global.fetch = fetchStub;
    const dateSpy = vi
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2024-05-18T11:00:00Z').getTime());

    try {
      const wrapper = mount(NebulaAtlasView, {
        global: {
          stubs: {
            NebulaProgressModule: {
              template: '<section class="stub-progress">progress</section>',
            },
            SparklineChart: {
              props: ['points'],
              template: '<div class="sparkline-stub">{{ points.join(",") }}</div>',
            },
          },
        },
      });

      await nextTick();
      await Promise.resolve();
      await nextTick();
      await Promise.resolve();
      expect(wrapper.text()).toContain('Telemetria live');
      expect(wrapper.text()).toContain('Generatore Nebula');
      expect(wrapper.text()).toContain('LIVE');
      expect(wrapper.html()).toMatchSnapshot();
      expect(fetchStub).toHaveBeenCalled();
      wrapper.unmount();
    } finally {
      global.fetch = originalFetch;
      dateSpy.mockRestore();
    }
  });
});
