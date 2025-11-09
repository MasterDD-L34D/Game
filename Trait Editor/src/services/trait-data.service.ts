import {
  TRAIT_DATA_ENDPOINT,
  fetchTraitsFromMonorepo,
  getSampleTraits,
} from '../data/traits.sample';
import type { Trait } from '../types/trait';
import { cloneTrait, cloneTraits, synchroniseTraitPresentation } from '../utils/trait-helpers';

export const FALLBACK_CACHE_TTL_MS = 60_000;

type TraitCacheSource = 'remote' | 'fallback' | 'mock';

interface TraitCacheEntry {
  traits: Trait[];
  source: TraitCacheSource;
  timestamp: number;
}

export class TraitDataService {
  private cache: TraitCacheEntry | null = null;
  private fallbackExpiry: number | null = null;
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

  getTraits(options?: { forceRemote?: boolean }): Promise<Trait[]> {
    const forceRemote = options?.forceRemote ?? false;

    if (this.cache && this.isCacheUsable(forceRemote)) {
      return this.$q.resolve(cloneTraits(this.cache.traits));
    }

    return this.$q.when(this.loadTraits()).then((traits) => cloneTraits(traits));
  }

  refreshTraitsFromRemote(): Promise<Trait[]> {
    return this.getTraits({ forceRemote: true });
  }

  invalidateCache(): void {
    this.cache = null;
    this.fallbackExpiry = null;
  }

  getCacheSource(): TraitCacheSource | null {
    return this.cache?.source ?? null;
  }

  isUsingFallback(): boolean {
    return this.cache?.source === 'fallback';
  }

  getTraitById(id: string): Promise<Trait | null> {
    return this.getTraits().then((traits) => {
      const trait = traits.find((item) => item.id === id);
      return trait ? cloneTrait(trait) : null;
    });
  }

  saveTrait(updatedTrait: Trait): Promise<Trait> {
    const traitCopy = cloneTrait(updatedTrait);
    synchroniseTraitPresentation(traitCopy);

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
        this.updateLocalCache(traitCopy);
        return cloneTrait(traitCopy);
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

  private async loadTraits(): Promise<Trait[]> {
    if (!this.useRemoteSource) {
      return this.updateCache(getSampleTraits(), 'mock');
    }

    try {
      const endpoint = this.endpointOverride ?? TRAIT_DATA_ENDPOINT;
      const traits = await fetchTraitsFromMonorepo(endpoint);
      this.lastError = null;
      return this.updateCache(traits, 'remote');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.lastError = err;
      const fallback = getSampleTraits();
      return this.updateCache(fallback, 'fallback');
    }
  }

  private updateCache(traits: Trait[], source: TraitCacheSource): Trait[] {
    const canonical = cloneTraits(traits);
    this.cache = {
      traits: canonical,
      source,
      timestamp: Date.now(),
    };
    this.fallbackExpiry = source === 'fallback' ? Date.now() + FALLBACK_CACHE_TTL_MS : null;
    return cloneTraits(this.cache.traits);
  }

  private updateLocalCache(trait: Trait): void {
    if (!this.cache) {
      const source: TraitCacheSource = this.useRemoteSource ? 'remote' : 'mock';
      this.cache = { traits: [cloneTrait(trait)], source, timestamp: Date.now() };
      this.fallbackExpiry = source === 'fallback' ? Date.now() + FALLBACK_CACHE_TTL_MS : null;
      return;
    }

    const updated = cloneTrait(trait);
    const index = this.cache.traits.findIndex((item) => item.id === updated.id);
    if (index >= 0) {
      this.cache.traits.splice(index, 1, updated);
    } else {
      this.cache.traits.push(updated);
    }
    this.cache.timestamp = Date.now();
    if (this.cache.source === 'fallback') {
      this.fallbackExpiry = Date.now() + FALLBACK_CACHE_TTL_MS;
    }
  }

  private isCacheUsable(forceRemote: boolean): boolean {
    if (!this.cache) {
      return false;
    }

    if (forceRemote) {
      return false;
    }

    if (this.cache.source === 'fallback') {
      if (this.fallbackExpiry === null) {
        return false;
      }
      return Date.now() <= this.fallbackExpiry;
    }

    return true;
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
