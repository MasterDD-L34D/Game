import type { AtlasRegion } from '../../types';
import { DataStoreService } from '../../services/data-store.service';
import { formatDate } from '../../utils/format-date';

class AtlasController {
  public regions: AtlasRegion[] = [];
  public activeRegion?: AtlasRegion;
  public searchTerm = '';

  static $inject = ['DataStoreService'];

  constructor(private readonly dataStore: DataStoreService) {}

  $onInit(): void {
    this.regions = this.dataStore.getAtlasRegions();
    if (this.regions.length > 0) {
      this.activeRegion = this.regions[0];
    }
  }

  selectRegion(regionId: string): void {
    const region = this.regions.find((item) => item.id === regionId);
    if (region) {
      this.activeRegion = region;
    }
  }

  focusLabel(focus: AtlasRegion['nodes'][number]['focus']): string {
    switch (focus) {
      case 'strategy':
        return 'Strategia';
      case 'technology':
        return 'Tecnologia';
      case 'analysis':
        return 'Analisi';
      case 'field-report':
        return 'Rapporto operativo';
      default:
        return focus;
    }
  }

  filteredNodes(): AtlasRegion['nodes'] {
    if (!this.activeRegion) {
      return [];
    }
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return this.activeRegion.nodes;
    }
    return this.activeRegion.nodes.filter((node) => {
      return (
        node.title.toLowerCase().includes(term) ||
        node.excerpt.toLowerCase().includes(term) ||
        node.focus.toLowerCase().includes(term)
      );
    });
  }

  lastUpdated(value: string): string {
    return formatDate(value);
  }
}

export const registerAtlasPage = (module: any): void => {
  module.component('atlasExplorer', {
    controller: AtlasController,
    controllerAs: '$ctrl',
    template: `
      <section class="page">
        <header class="page__header">
          <div>
            <h1 class="page__title">Atlas Intelligence</h1>
            <p class="page__subtitle">
              Collabora con gli analisti, sfoglia dottrine e cattura insight da condividere con le squadre sul campo.
            </p>
          </div>
          <div class="page__actions">
            <label class="search-field">
              <span class="visually-hidden">Filtra contenuti</span>
              <input
                type="search"
                placeholder="Cerca negli appunti dell'Atlas"
                ng-model="$ctrl.searchTerm"
                class="search-field__input"
              />
            </label>
          </div>
        </header>

        <div class="atlas-layout">
          <aside class="atlas-layout__sidebar">
            <ul class="atlas-regions" role="tablist">
              <li
                ng-repeat="region in $ctrl.regions"
                ng-class="{ 'atlas-regions__item--active': $ctrl.activeRegion && region.id === $ctrl.activeRegion.id }"
                class="atlas-regions__item"
              >
                <button
                  class="atlas-regions__button"
                  type="button"
                  ng-click="$ctrl.selectRegion(region.id)"
                  role="tab"
                  aria-selected="{{ ($ctrl.activeRegion && region.id === $ctrl.activeRegion.id) ? 'true' : 'false' }}"
                >
                  <span class="atlas-regions__name">{{ region.name }}</span>
                  <span class="atlas-regions__description">{{ region.description }}</span>
                </button>
              </li>
            </ul>
          </aside>

          <section class="atlas-layout__content" role="tabpanel">
            <article class="atlas-region" ng-if="$ctrl.activeRegion">
              <header class="atlas-region__header">
                <h2>{{ $ctrl.activeRegion.name }}</h2>
                <p>{{ $ctrl.activeRegion.description }}</p>
              </header>
              <ul class="atlas-nodes">
                <li class="atlas-node" ng-repeat="node in $ctrl.filteredNodes()">
                  <div class="atlas-node__meta">
                    <span class="atlas-node__focus">{{ $ctrl.focusLabel(node.focus) }}</span>
                    <span class="atlas-node__timestamp">Aggiornato {{ $ctrl.lastUpdated(node.lastUpdated) }}</span>
                  </div>
                  <h3 class="atlas-node__title">{{ node.title }}</h3>
                  <p class="atlas-node__excerpt">{{ node.excerpt }}</p>
                </li>
              </ul>
            </article>
            <p class="atlas-empty" ng-if="!$ctrl.activeRegion">
              Nessuna regione Atlas selezionata al momento.
            </p>
          </section>
        </div>
      </section>
    `,
  });
};
