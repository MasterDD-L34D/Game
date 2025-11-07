import { getSampleTraits, resolveTraitSource } from '../data/traits.sample';
import type { Trait } from '../types/trait';

export class TraitDataService {
  private cache: Trait[] | null = null;
  private readonly useRemoteSource: boolean;
  private readonly endpointOverride?: string;

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
        return this.cloneTraits(traits);
      })
      .catch((error) => {
        console.error('Impossibile caricare i tratti:', error);
        const fallback = getSampleTraits();
        this.cache = fallback;
        return this.cloneTraits(fallback);
      });
  }

  private cloneTraits(traits: Trait[]): Trait[] {
    return traits.map((trait) => ({ ...trait, signatureMoves: [...trait.signatureMoves] }));
  }
}

export const registerTraitDataService = (module: any): void => {
  module.service('TraitDataService', TraitDataService);
};
