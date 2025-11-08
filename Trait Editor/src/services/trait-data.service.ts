import { TRAIT_DATA_ENDPOINT, getSampleTraits, resolveTraitSource } from '../data/traits.sample';
import type { Trait } from '../types/trait';

export class TraitDataService {
  private cache: Trait[] | null = null;
  private readonly useRemoteSource: boolean;
  private readonly endpointOverride?: string;
  private lastError: Error | null = null;

  static $inject = ['$q'];

  constructor(private readonly $q: any) {
    const source = (import.meta.env.VITE_TRAIT_DATA_SOURCE ?? '').toLowerCase();
    this.useRemoteSource = source === 'remote';

    const endpoint = import.meta.env.VITE_TRAIT_DATA_URL;
    if (typeof endpoint === 'string' && endpoint.trim().length > 0) {
      this.endpointOverride = endpoint.trim();
    }
  }

  getTraits(): Promise<Trait[]> {
    if (this.cache) {
      return this.$q.resolve(this.cloneTraits(this.cache));
    }

    return this.$q
      .when(resolveTraitSource(this.useRemoteSource, this.endpointOverride))
      .then((traits) => {
        this.cache = traits;
        this.lastError = null;
        return this.cloneTraits(traits);
      })
      .catch((error) => {
        console.error('Impossibile caricare i tratti:', error);
        this.lastError = error instanceof Error ? error : new Error(String(error));
        const fallback = getSampleTraits();
        this.cache = fallback;
        return this.cloneTraits(fallback);
      });
  }

  getTraitById(id: string): Promise<Trait | null> {
    return this.getTraits().then((traits) => {
      const trait = traits.find((item) => item.id === id);
      return trait ? this.cloneTrait(trait) : null;
    });
  }

  saveTrait(updatedTrait: Trait): Promise<Trait> {
    const traitCopy = this.cloneTrait(updatedTrait);

    const persist = async (): Promise<void> => {
      if (!this.useRemoteSource) {
        return;
      }

      const endpoint = this.endpointOverride ?? TRAIT_DATA_ENDPOINT;
      const target = this.buildRemoteMutationEndpoint(endpoint, traitCopy.id);

      if (!target) {
        throw new Error('Endpoint remoto non configurato per il salvataggio dei tratti.');
      }

      if (typeof fetch !== 'function') {
        throw new Error('Fetch API non disponibile per completare il salvataggio remoto.');
      }

      const response = await fetch(target, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(traitCopy),
      });

      if (!response.ok) {
        throw new Error(`Il salvataggio remoto è fallito con stato ${response.status}.`);
      }
    };

    return this.$q
      .when(persist())
      .then(() => {
        this.lastError = null;
        if (!this.cache) {
          this.cache = [traitCopy];
        } else {
          const index = this.cache.findIndex((trait) => trait.id === traitCopy.id);
          if (index >= 0) {
            this.cache.splice(index, 1, traitCopy);
          } else {
            this.cache.push(traitCopy);
          }
        }
        return this.cloneTrait(traitCopy);
      })
      .catch((error: Error) => {
        const err = error instanceof Error ? error : new Error(String(error));
        this.lastError = err;
        return this.$q.reject(err);
      });
  }

  getLastError(): Error | null {
    return this.lastError;
  }

  private cloneTraits(traits: Trait[]): Trait[] {
    return traits.map((trait) => ({ ...trait, signatureMoves: [...trait.signatureMoves] }));
  }

  private cloneTrait(trait: Trait): Trait {
    return { ...trait, signatureMoves: [...trait.signatureMoves] };
  }

  private buildRemoteMutationEndpoint(baseEndpoint: string, id: string): string | null {
    if (!baseEndpoint || typeof baseEndpoint !== 'string') {
      return null;
    }

    if (baseEndpoint.endsWith('/')) {
      return `${baseEndpoint}${id}`;
    }

    if (baseEndpoint.endsWith('.json')) {
      return baseEndpoint.replace(/\/[^/]*$/, `/${id}.json`);
    }

    return `${baseEndpoint}/${id}`;
  }
}

export const registerTraitDataService = (module: any): void => {
  module.service('TraitDataService', TraitDataService);
};
