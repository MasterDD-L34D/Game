import type { Trait } from '../../types/trait';
import { TraitDataService } from '../../services/trait-data.service';
import { TraitStateService, type TraitUiState } from '../../services/trait-state.service';

class TraitLibraryController {
  public traits: Trait[] = [];
  public filter = '';
  public selectedArchetype = 'all';
  public ui: TraitUiState = { isLoading: false, status: null, previewTrait: null };

  static $inject = ['$scope', 'TraitDataService', 'TraitStateService'];

  constructor(
    private readonly $scope: any,
    private readonly dataService: TraitDataService,
    private readonly stateService: TraitStateService,
  ) {}

  $onInit(): void {
    this.stateService.subscribe(this.$scope, (state) => {
      this.ui = state;
    });

    this.stateService.setLoading(true);
    this.stateService.setStatus(null);
    this.dataService
      .getTraits()
      .then((traits) => {
        this.traits = traits;
        const lastError = this.dataService.getLastError();
        if (lastError) {
          this.stateService.setStatus('Dati caricati da backup locale a causa di un problema di rete.', 'info');
        }
      })
      .catch((error: Error) => {
        console.error('Errore durante il caricamento dei tratti:', error);
        this.stateService.setStatus('Impossibile recuperare la libreria tratti in questo momento.', 'error');
      })
      .finally(() => {
        this.stateService.setLoading(false);
      });
  }

  statusIcon(): string {
    const status = this.ui.status;
    if (!status) {
      return '';
    }

    if (status.variant === 'error') {
      return '⚠️';
    }

    if (status.variant === 'success') {
      return '✅';
    }

    return 'ℹ️';
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
                ng-disabled="$ctrl.ui.isLoading"
              />
            </label>
            <label class="select-field">
              <span class="visually-hidden">Filtra per archetipo</span>
              <select ng-model="$ctrl.selectedArchetype" class="select-field__input" ng-disabled="$ctrl.ui.isLoading">
                <option ng-repeat="archetype in $ctrl.archetypes()" ng-value="archetype">
                  {{ archetype === 'all' ? 'Tutti gli archetipi' : archetype }}
                </option>
              </select>
            </label>
          </div>
        </header>

        <div class="status-banner" ng-if="$ctrl.ui.status" ng-class="'status-banner--' + $ctrl.ui.status.variant">
          <span class="status-banner__icon" aria-hidden="true">{{ $ctrl.statusIcon() }}</span>
          <p class="status-banner__text">{{ $ctrl.ui.status.message }}</p>
        </div>

        <div class="loader" ng-if="$ctrl.ui.isLoading">
          <span class="loader__spinner" aria-hidden="true"></span>
          <p class="loader__label">Caricamento dei tratti in corso...</p>
        </div>

        <section class="traits-grid" ng-if="!$ctrl.ui.isLoading">
          <article class="trait-card" ng-repeat="trait in $ctrl.filteredTraits()">
            <header class="trait-card__header">
              <h2 class="trait-card__name">
                <a class="trait-card__link" ng-href="#!/traits/{{ trait.id }}">{{ trait.name }}</a>
              </h2>
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
            <footer class="trait-card__footer">
              <a class="button button--ghost" ng-href="#!/traits/{{ trait.id }}">Dettagli</a>
              <a class="button" ng-href="#!/traits/{{ trait.id }}/edit">Modifica</a>
            </footer>
          </article>
          <p class="traits-empty" ng-if="!$ctrl.filteredTraits().length">
            Nessun tratto corrisponde ai filtri selezionati.
          </p>
        </section>
      </section>
    `,
  });
};
