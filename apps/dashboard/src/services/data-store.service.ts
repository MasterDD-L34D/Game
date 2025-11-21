import {
  atlasRegions,
  dashboardMetrics,
  eventLog,
  missions,
  nebulaMilestones,
  speciesBiomeLinks,
  taxonomyBiomes,
  taxonomySpecies,
  traits,
} from '../data/sample-data';
import type {
  AtlasRegion,
  DashboardMetric,
  EventLog,
  Mission,
  NebulaMilestone,
  SpeciesBiomeLink,
  Trait,
} from '../types';

export class DataStoreService {
  private readonly apiBaseUrl: string | null;
  private readonly apiUser: string | null;
  private readonly useMockApi: boolean;

  constructor() {
    const apiBaseCandidate =
      (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
      (import.meta.env.VITE_API_BASE as string | undefined) ||
      '';
    const trimmedBase = apiBaseCandidate.trim().replace(/\/$/, '');
    this.apiBaseUrl = trimmedBase || null;
    this.apiUser =
      typeof import.meta.env.VITE_API_USER === 'string'
        ? import.meta.env.VITE_API_USER.trim() || null
        : null;
    const apiMode = ((import.meta.env.VITE_API_MODE as string | undefined) || '').toLowerCase();
    this.useMockApi = apiMode === 'mock' || !this.apiBaseUrl;
  }

  getMissions(): Mission[] {
    return missions.map((mission) => ({ ...mission }));
  }

  getMissionById(missionId: string): Mission | undefined {
    return missions.find((mission) => mission.id === missionId);
  }

  getEventLog(limit?: number): EventLog[] {
    const entries = eventLog.slice().sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));
    if (typeof limit === 'number') {
      return entries.slice(0, limit);
    }
    return entries;
  }

  getAtlasRegions(): AtlasRegion[] {
    return atlasRegions.map((region) => ({
      ...region,
      nodes: region.nodes.map((node) => ({ ...node })),
    }));
  }

  getTraits(): Trait[] {
    return traits.map((trait) => ({ ...trait, signatureMoves: [...trait.signatureMoves] }));
  }

  getNebulaMilestones(): NebulaMilestone[] {
    return nebulaMilestones.map((milestone) => ({
      ...milestone,
      dependencies: [...milestone.dependencies],
    }));
  }

  getDashboardMetrics(): DashboardMetric[] {
    return dashboardMetrics.map((metric) => ({ ...metric }));
  }

  getMissionStatusSummary(): Record<string, number> {
    return this.getMissions().reduce<Record<string, number>>((acc, mission) => {
      const count = acc[mission.status] ?? 0;
      acc[mission.status] = count + 1;
      return acc;
    }, {});
  }

  async getSpeciesBiomeLinks(): Promise<SpeciesBiomeLink[]> {
    const fallback = (): SpeciesBiomeLink[] =>
      speciesBiomeLinks.map((entry) => ({
        ...entry,
        species:
          entry.species ||
          taxonomySpecies.find((species) => species.id === entry.speciesId) ||
          null,
        biome: entry.biome || taxonomyBiomes.find((biome) => biome.id === entry.biomeId) || null,
      }));

    if (!this.shouldUseApi()) {
      return fallback();
    }

    try {
      const response = await this.fetchFromApi('/api/species-biomes');
      if (!response.ok) {
        throw new Error(`API species-biomes risponde ${response.status}`);
      }
      const payload = await response.json();
      const links = Array.isArray(payload?.links) ? payload.links : [];
      if (!links.length) {
        return fallback();
      }
      return links.map((entry: SpeciesBiomeLink) => ({
        ...entry,
        species: entry.species || null,
        biome: entry.biome || null,
      }));
    } catch (error) {
      console.warn(
        'Impossibile caricare relazioni specie-biomi dal backend, uso dataset locale',
        error,
      );
      return fallback();
    }
  }

  private shouldUseApi(): boolean {
    return Boolean(this.apiBaseUrl) && !this.useMockApi;
  }

  private buildApiUrl(path: string): string {
    if (!this.apiBaseUrl) {
      throw new Error('API base URL non configurata');
    }
    const suffix = path.startsWith('/') ? path : `/${path}`;
    return `${this.apiBaseUrl}${suffix}`;
  }

  private async fetchFromApi(path: string, init?: RequestInit): Promise<Response> {
    const headers: Record<string, string> = { ...(init?.headers as Record<string, string>) };
    if (this.apiUser) {
      headers['X-User'] = this.apiUser;
    }
    const target = this.buildApiUrl(path);
    return fetch(target, {
      ...init,
      headers,
    });
  }
}

export const registerDataStoreService = (module: any): void => {
  module.service('DataStoreService', DataStoreService);
};
