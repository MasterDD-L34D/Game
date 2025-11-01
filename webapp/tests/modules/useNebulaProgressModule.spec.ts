import { describe, expect, it, vi } from 'vitest';
import { defineComponent, nextTick } from 'vue';
import { mount } from '@vue/test-utils';

import { useNebulaProgressModule } from '../../src/modules/useNebulaProgressModule';
import { atlasDataset as staticDataset } from '../../src/state/atlasDataset';

const flushAsync = async () => {
  await Promise.resolve();
  await Promise.resolve();
  await nextTick();
};

describe('useNebulaProgressModule', () => {
  it("usa l'endpoint aggregato legacy quando i segmenti sono assenti", async () => {
    const aggregateDataset = JSON.parse(JSON.stringify(staticDataset));
    aggregateDataset.id = 'nebula-legacy-live';

    const aggregatePayload = {
      dataset: aggregateDataset,
      telemetry: {
        updatedAt: '2024-06-01T12:00:00Z',
        summary: {
          totalEvents: 12,
          openEvents: 3,
          acknowledgedEvents: 9,
          highPriorityEvents: 2,
          lastEventAt: '2024-06-01T11:45:00Z',
        },
        coverage: {
          average: 88,
          history: [70, 75, 82, 88],
          distribution: { success: 6, warning: 3, neutral: 1, critical: 0 },
        },
        incidents: {
          timeline: [
            { date: '2024-05-30', total: 2, highPriority: 1 },
            { date: '2024-05-31', total: 1, highPriority: 0 },
          ],
        },
      },
      generator: {
        status: 'online',
        label: 'Generator live',
        generatedAt: '2024-06-01T11:40:00Z',
        updatedAt: '2024-06-01T11:50:00Z',
        sourceLabel: 'Live generator',
        metrics: {
          generationTimeMs: 42000,
          speciesTotal: 18,
          enrichedSpecies: 12,
          eventTotal: 3,
          datasetSpeciesTotal: aggregateDataset.species.length,
          coverageAverage: 88,
          coreTraits: 36,
          optionalTraits: 24,
          synergyTraits: 12,
          expectedCoreTraits: 30,
        },
        streams: {
          generationTime: [32, 28, 30],
          species: [6, 6, 6],
          enriched: [4, 4, 4],
        },
      },
    };

    const fetchMock = vi.fn(async (input: string | URL, init?: Record<string, unknown>) => {
      expect(input).toBe('/api/nebula/atlas');
      expect(init).toEqual({ cache: 'no-store' });
      return {
        ok: true,
        status: 200,
        json: async () => aggregatePayload,
      } as any;
    });

    let moduleInstance: ReturnType<typeof useNebulaProgressModule> | null = null;
    const wrapper = mount(
      defineComponent({
        name: 'NebulaModuleHarness',
        setup() {
          moduleInstance = useNebulaProgressModule(
            {},
            {
              endpoint: '/api/nebula/atlas',
              fetcher: fetchMock,
              allowFallback: false,
              pollIntervalMs: 0,
            },
          );
          return () => null;
        },
      }),
    );

    await flushAsync();
    if (moduleInstance?.loading.value) {
      await flushAsync();
    }
    while (moduleInstance?.loading.value) {
      await flushAsync();
    }

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(moduleInstance).not.toBeNull();
    expect(moduleInstance!.datasetStatus.value).toEqual(
      expect.objectContaining({ source: 'remote', offline: false, demo: false }),
    );
    expect(moduleInstance!.share.value.datasetId).toBe('nebula-legacy-live');
    expect(moduleInstance!.telemetryStatus.value).toEqual(
      expect.objectContaining({ mode: 'live', offline: false }),
    );
    expect(moduleInstance!.generatorStatus.value).toEqual(
      expect.objectContaining({ status: 'online', label: 'Generator live' }),
    );

    await wrapper.unmount();
  });

  it('ripiega sul dataset statico quando il payload remoto è malformato', async () => {
    const fetchMock = vi.fn(async (input: string | URL, init?: Record<string, unknown>) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/v1/atlas/dataset') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ dataset: { foo: 'bar' } }),
        } as any;
      }
      if (url === '/api/v1/atlas/telemetry' || url === '/api/v1/atlas/generator') {
        return { ok: false, status: 404, json: async () => ({}) } as any;
      }
      if (url === '/api/v1/atlas') {
        return { ok: false, status: 500, json: async () => ({}) } as any;
      }
      if (url === '/data/nebula/atlas.json') {
        return {
          ok: true,
          status: 200,
          json: async () => ({ dataset: JSON.parse(JSON.stringify(staticDataset)) }),
        } as any;
      }
      if (url === '/data/nebula/telemetry.json') {
        return { ok: false, status: 404, json: async () => ({}) } as any;
      }
      throw new Error(`unexpected url ${url}`);
    });

    let moduleInstance: ReturnType<typeof useNebulaProgressModule> | null = null;
    const wrapper = mount(
      defineComponent({
        name: 'NebulaModuleFallbackHarness',
        setup() {
          moduleInstance = useNebulaProgressModule(
            {},
            {
              fetcher: fetchMock,
              allowFallback: true,
              pollIntervalMs: 0,
            },
          );
          return () => null;
        },
      }),
    );

    await flushAsync();

    expect(fetchMock).toHaveBeenCalled();
    expect(moduleInstance).not.toBeNull();
    expect(moduleInstance!.datasetStatus.value.source).not.toBe('remote');
    expect(moduleInstance!.share.value.datasetId).toBe(staticDataset.id);
    await wrapper.unmount();
  });
});

