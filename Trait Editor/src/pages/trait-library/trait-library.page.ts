import type { Trait } from '../../types/trait';
import { TraitDataService } from '../../services/trait-data.service';

class TraitLibraryController {
  public traits: Trait[] = [];
  public filter = '';
  public selectedArchetype = 'all';
  public isLoading = false;

  static $inject = ['TraitDataService'];

  constructor(private readonly dataService: TraitDataService) {}

  $onInit(): void {
    this.isLoading = true;
    this.dataService
      .getTraits()
      .then((traits) => {
        this.traits = traits;
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  archetypes(): string[] {
    const set = new Set<string>(this.traits.map((trait) => trait.archetype));
    return ['all', ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }

  filteredTraits(): Trait[] {
    const term = this.filter.trim().toLowerCase();
    return this.traits.filter((trait) => {
      const matchesArchetype =
        this.selectedArchetype === 'all' || trait.archetype === this.selectedArchetype;
      const matchesTerm =
        !term ||
        trait.name.toLowerCase().includes(term) ||
        trait.description.toLowerCase().includes(term) ||
        trait.playstyle.toLowerCase().includes(term);
      return matchesArchetype && matchesTerm;
    });
  }
}

export const registerTraitLibraryPage = (module: any): void => {
  module.component('traitLibrary', {
    controller: TraitLibraryController,
    controllerAs: '$ctrl',
    template: `
      <section class="page">
        <header class="page__header">
          <div>
            <h1 class="page__title">Libreria dei tratti</h1>
            <p class="page__subtitle">
              Conosci gli operatori, abbina i loro punti di forza e personalizza la composizione della squadra.
            </p>
          </div>
          <div class="page__actions traits-controls">
            <label class="search-field">
              <span class="visually-hidden">Filtra tratti</span>
              <input
                type="search"
                placeholder="Cerca per nome o stile di gioco"
                ng-model="$ctrl.filter"
                class="search-field__input"
                ng-disabled="$ctrl.isLoading"
              />
            </label>
            <label class="select-field">
              <span class="visually-hidden">Filtra per archetipo</span>
              <select ng-model="$ctrl.selectedArchetype" class="select-field__input" ng-disabled="$ctrl.isLoading">
                <option ng-repeat="archetype in $ctrl.archetypes()" ng-value="archetype">
                  {{ archetype === 'all' ? 'Tutti gli archetipi' : archetype }}
                </option>
              </select>
            </label>
          </div>
        </header>

        <section class="traits-grid" ng-if="!$ctrl.isLoading">
          <article class="trait-card" ng-repeat="trait in $ctrl.filteredTraits()">
            <header class="trait-card__header">
              <h2 class="trait-card__name">{{ trait.name }}</h2>
              <span class="trait-card__archetype">{{ trait.archetype }}</span>
            </header>
            <p class="trait-card__description">{{ trait.description }}</p>
            <dl class="trait-card__details">
              <div>
                <dt>Stile di gioco</dt>
                <dd>{{ trait.playstyle }}</dd>
              </div>
              <div>
                <dt>Mosse distintive</dt>
                <dd>
                  <ul class="trait-card__moves">
                    <li ng-repeat="move in trait.signatureMoves">{{ move }}</li>
                  </ul>
                </dd>
              </div>
            </dl>
          </article>
          <p class="traits-empty" ng-if="!$ctrl.filteredTraits().length">
            Nessun tratto corrisponde ai filtri selezionati.
          </p>
        </section>
        <p class="traits-empty" ng-if="$ctrl.isLoading">Caricamento dei tratti in corso...</p>
      </section>
    `,
  });
};
