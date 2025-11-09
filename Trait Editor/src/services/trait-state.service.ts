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

const INITIAL_STATE: TraitUiState = {
  isLoading: false,
  status: null,
  previewTrait: null,
};

export class TraitStateService {
  private state: TraitUiState = { ...INITIAL_STATE };

  static $inject = ['$rootScope'];

  constructor(private readonly $rootScope: any) {}

  subscribe(scope: any, callback: (state: TraitUiState) => void): void {
    callback(this.snapshot());
    const deregister = this.$rootScope.$on('traitStateChanged', () => {
      callback(this.snapshot());
    });

    scope.$on('$destroy', deregister);
  }

  setLoading(isLoading: boolean): void {
    this.state.isLoading = isLoading;
    this.broadcast();
  }

  setStatus(message: string | null, variant: TraitStatus['variant'] = 'info'): void {
    this.state.status = message ? { message, variant } : null;
    this.broadcast();
  }

  setPreviewTrait(trait: Trait | null): void {
    this.state.previewTrait = trait ? cloneTrait(trait) : null;
    this.broadcast();
  }

  reset(): void {
    this.state = { ...INITIAL_STATE };
    this.broadcast();
  }

  private broadcast(): void {
    this.$rootScope.$broadcast('traitStateChanged');
  }

  private snapshot(): TraitUiState {
    return {
      isLoading: this.state.isLoading,
      status: this.state.status ? { ...this.state.status } : null,
      previewTrait: this.state.previewTrait ? cloneTrait(this.state.previewTrait) : null,
    };
  }

}

export const registerTraitStateService = (module: any): void => {
  module.service('TraitStateService', TraitStateService);
};
