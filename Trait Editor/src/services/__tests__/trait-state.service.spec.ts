import { beforeEach, describe, expect, it } from 'vitest';

import { TraitStateService } from '../trait-state.service';
import { getSampleTraits } from '../../data/traits.sample';

const createRootScope = () => {
  const listeners: Array<() => void> = [];
  return {
    $broadcast: (event: string) => {
      if (event === 'traitStateChanged') {
        listeners.forEach((callback) => callback());
      }
    },
    $on: (event: string, callback: () => void) => {
      if (event === 'traitStateChanged') {
        listeners.push(callback);
        return () => {
          const index = listeners.indexOf(callback);
          if (index >= 0) {
            listeners.splice(index, 1);
          }
        };
      }

      return () => undefined;
    },
  };
};

const createScope = () => ({
  $on: (_event: string, _handler: () => void) => () => undefined,
});

describe('TraitStateService', () => {
  const sampleTrait = getSampleTraits()[0];
  let rootScope: ReturnType<typeof createRootScope>;
  let service: TraitStateService;

  beforeEach(() => {
    rootScope = createRootScope();
    service = new TraitStateService(rootScope as any);
  });

  it('delivers independent preview snapshots to subscribers', () => {
    const firstScope = createScope();
    const snapshots: any[] = [];
    service.subscribe(firstScope as any, (state) => snapshots.push(state));

    service.setPreviewTrait(sampleTrait);
    expect(snapshots).toHaveLength(2);

    const preview = snapshots[1].previewTrait;
    expect(preview).not.toBeNull();
    preview!.entry.completion_flags.has_biome = !preview!.entry.completion_flags.has_biome;

    const secondScope = createScope();
    let latest: any = null;
    service.subscribe(secondScope as any, (state) => {
      latest = state;
    });

    expect(latest.previewTrait?.entry.completion_flags.has_biome).toBe(
      sampleTrait.entry.completion_flags.has_biome,
    );
  });

  it('resets preview and loading state correctly', () => {
    const scope = createScope();
    let latest: any = null;
    service.subscribe(scope as any, (state) => {
      latest = state;
    });

    service.setLoading(true);
    service.setPreviewTrait(sampleTrait);
    service.setStatus('Prova', 'info');

    service.reset();

    expect(latest.isLoading).toBe(false);
    expect(latest.previewTrait).toBeNull();
    expect(latest.status).toBeNull();
  });
});
