import { inject, type ComputedRef } from 'vue';

type AtlasTotals = {
  species: number;
  biomes: number;
  encounters: number;
};

type AtlasLayoutContext = {
  dataset: Record<string, unknown>;
  totals: AtlasTotals;
  isDemo: ComputedRef<boolean>;
  isOffline: ComputedRef<boolean>;
  title: ComputedRef<string>;
  description: ComputedRef<string>;
  breadcrumbs: ComputedRef<Array<Record<string, unknown>>>;
};

const atlasLayoutKey = Symbol('atlas-layout-context');

export function useAtlasLayout() {
  const context = inject<AtlasLayoutContext | null>(atlasLayoutKey, null);
  if (!context) {
    throw new Error('Atlas layout context non disponibile');
  }
  return context;
}

export { atlasLayoutKey };
