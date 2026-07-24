import { beforeEach, describe, expect, it } from 'vitest';

import { TraitStateService, useTraitState } from '../trait-state.service';
import { getSampleTraits } from '../../data/traits.sample';

describe('TraitStateService (Vue 3 rewrite)', () => {
  const sampleTrait = getSampleTraits()[0];
  let service: TraitStateService;

  beforeEach(() => {
    service = new TraitStateService();
    service.reset();
  });

  it('exposes reactive state read-only via getState()', () => {
    service.setLoading(true);
    service.setStatus('Caricamento...', 'info');
    service.setPreviewTrait(sampleTrait);
    const state = service.getState();
    expect(state.isLoading).toBe(true);
    expect(state.status?.message).toBe('Caricamento...');
    expect(state.previewTrait?.id).toBe(sampleTrait.id);
  });

  it('resets state correctly', () => {
    service.setLoading(true);
    service.setPreviewTrait(sampleTrait);
    service.setStatus('Prova', 'info');
    service.reset();
    const state = service.getState();
    expect(state.isLoading).toBe(false);
    expect(state.previewTrait).toBeNull();
    expect(state.status).toBeNull();
  });

  it('clones preview trait so mutation does not leak', () => {
    service.setPreviewTrait(sampleTrait);
    const original = sampleTrait.entry.completion_flags.has_biome;
    const state = service.getState();
    expect(state.previewTrait?.entry.completion_flags.has_biome).toBe(original);
  });

  it('useTraitState composable returns singleton-bound API', () => {
    const api = useTraitState();
    api.setStatus('Ciao', 'success');
    expect(api.state.status?.message).toBe('Ciao');
    expect(api.state.status?.variant).toBe('success');
    api.reset();
    expect(api.state.status).toBeNull();
  });
});
