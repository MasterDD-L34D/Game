import { reactive, readonly, type DeepReadonly } from 'vue';
import type { Trait } from '../types/trait';
import { cloneTrait } from '../utils/trait-helpers';

export interface TraitStatus {
  message: string;
  variant: 'info' | 'error' | 'success';
}

export interface TraitUiState {
  isLoading: boolean;
  status: TraitStatus | null;
  previewTrait: Trait | null;
}

// TKT-C1 — Vue 3 rebuild: replace AngularJS $rootScope.$broadcast with native
// Vue reactivity. Singleton reactive state used across composables + components.
const state = reactive<TraitUiState>({
  isLoading: false,
  status: null,
  previewTrait: null,
});

export class TraitStateService {
  getState(): DeepReadonly<TraitUiState> {
    return readonly(state) as DeepReadonly<TraitUiState>;
  }

  setLoading(isLoading: boolean): void {
    state.isLoading = isLoading;
  }

  setStatus(message: string | null, variant: TraitStatus['variant'] = 'info'): void {
    state.status = message ? { message, variant } : null;
  }

  setPreviewTrait(trait: Trait | null): void {
    state.previewTrait = trait ? cloneTrait(trait) : null;
  }

  reset(): void {
    state.isLoading = false;
    state.status = null;
    state.previewTrait = null;
  }
}

// Composable accessor — pattern Vue idiomatic per consumer .vue components.
const singleton = new TraitStateService();

export function useTraitState(): {
  state: DeepReadonly<TraitUiState>;
  setLoading: (v: boolean) => void;
  setStatus: (msg: string | null, variant?: TraitStatus['variant']) => void;
  setPreviewTrait: (t: Trait | null) => void;
  reset: () => void;
} {
  return {
    state: singleton.getState(),
    setLoading: (v: boolean) => singleton.setLoading(v),
    setStatus: (msg: string | null, variant?: TraitStatus['variant']) =>
      singleton.setStatus(msg, variant),
    setPreviewTrait: (t: Trait | null) => singleton.setPreviewTrait(t),
    reset: () => singleton.reset(),
  };
}
