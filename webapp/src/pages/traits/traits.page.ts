import type {
  TraitDetail,
  TraitEnvironment,
  TraitListItem,
  TraitDataSource,
} from '../../app/models/traits';
import { TraitService, TraitServiceError } from '../../app/services/trait.service';

class TraitsController {
  public traits: TraitListItem[] = [];
  public filter = '';
  public selectedCoreRole = 'all';
  public isListLoading = false;
  public listError: string | null = null;
  public listEnvironment: TraitEnvironment = 'dev';
  public listSource: TraitDataSource = 'mock';
  public usingMockData = false;
  public selectedTrait: TraitDetail | null = null;
  public selectedTraitId: string | null = null;
  public isDetailLoading = false;
  public detailError: string | null = null;
  public detailStatus?: number;
  public detailSource: TraitDataSource | null = null;
  public detailUsingMock = false;

  static $inject = ['$scope', 'TraitService'];

  constructor(private readonly $scope: any, private readonly traitService: TraitService) {}

  $onInit(): void {
    void this.loadTraits();
  }

  roles(): string[] {
    const set = new Set<string>(this.traits.map((trait) => trait.coreRole));
    const roles = Array.from(set).sort((a, b) => a.localeCompare(b, 'it'));
    return ['all', ...roles];
  }

  filteredTraits(): TraitListItem[] {
    const term = this.filter.trim().toLowerCase();
    return this.traits.filter((trait) => {
      const matchesRole =
        this.selectedCoreRole === 'all' || trait.coreRole === this.selectedCoreRole;
      const matchesTerm = !term || trait.searchText.includes(term);
      return matchesRole && matchesTerm;
    });
  }

  reload(): void {
    void this.loadTraits();
  }

  async openTrait(traitId: string): Promise<void> {
    if (!traitId) {
      return;
    }

    this.selectedTraitId = traitId;
    this.isDetailLoading = true;
    this.detailError = null;
    this.detailStatus = undefined;
    this.detailSource = null;
    this.detailUsingMock = false;

    try {
      const response = await this.traitService.getTraitById(traitId);
      this.selectedTrait = response.trait;
      this.detailSource = response.source;
      this.detailUsingMock = response.usedMock;
    } catch (error) {
      this.selectedTrait = null;
      if (error instanceof TraitServiceError) {
        this.detailStatus = error.status;
        if (error.status === 404) {
          this.detailError = 'Tratto non trovato (404).';
        } else if (error.status === 500) {
          this.detailError = 'Errore interno del server (500).';
        } else {
          this.detailError = error.message || 'Impossibile caricare il dettaglio del tratto.';
        }
      } else {
        this.detailError = 'Errore imprevisto durante il caricamento del tratto.';
      }
    } finally {
      this.isDetailLoading = false;
      this.$scope.$applyAsync();
    }
  }

  closeTrait(): void {
    this.selectedTrait = null;
    this.selectedTraitId = null;
    this.detailError = null;
    this.detailStatus = undefined;
    this.detailSource = null;
    this.detailUsingMock = false;
  }

  private async loadTraits(): Promise<void> {
    this.isListLoading = true;
    this.listError = null;
    try {
      const response = await this.traitService.listTraits();
      this.traits = response.traits;
      this.listEnvironment = response.environment;
      this.listSource = response.source;
      this.usingMockData = response.usedMock;
    } catch (error) {
      this.traits = [];
      if (error instanceof TraitServiceError) {
        if (error.status === 404) {
          this.listError = 'Indice dei tratti non trovato (404).';
        } else if (error.status === 500) {
          this.listError = 'Errore interno del server durante il caricamento dei tratti (500).';
        } else {
          this.listError = error.message || 'Impossibile recuperare i tratti.';
        }
      } else {
        this.listError = 'Errore imprevisto durante il caricamento dei tratti.';
      }
    } finally {
      this.isListLoading = false;
      this.$scope.$applyAsync();
    }
  }
}

export const registerTraitsPage = (module: any): void => {
  module.component('traitLibrary', {
    controller: TraitsController,
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
              />
            </label>
            <label class="select-field">
              <span class="visually-hidden">Filtra per ruolo core</span>
              <select ng-model="$ctrl.selectedCoreRole" class="select-field__input">
                <option ng-repeat="role in $ctrl.roles()" ng-value="role">
                  {{ role === 'all' ? 'Tutti i ruoli' : role }}
                </option>
              </select>
            </label>
          </div>
        </header>

        <section class="traits-status" ng-if="$ctrl.listError">
          <p class="traits-status__message traits-status__message--error">
            {{ $ctrl.listError }}
          </p>
          <button type="button" class="button button--secondary" ng-click="$ctrl.reload()">
            Riprova
          </button>
        </section>

        <section class="traits-status" ng-if="$ctrl.isListLoading && !$ctrl.listError">
          <p class="traits-status__message">Caricamento dei tratti in corso...</p>
        </section>

        <section
          class="traits-status traits-status--warning"
          ng-if="!$ctrl.listError && $ctrl.usingMockData"
        >
          <p class="traits-status__message">
            Stai visualizzando dati mock per la libreria tratti (ambiente: {{ $ctrl.listEnvironment }}).
          </p>
        </section>

        <section
          class="traits-status traits-status--info"
          ng-if="!$ctrl.listError && !$ctrl.usingMockData"
        >
          <p class="traits-status__message">
            Fonte dati: {{ $ctrl.listSource }} · Ambiente: {{ $ctrl.listEnvironment }}
          </p>
        </section>

        <section class="trait-detail" ng-if="$ctrl.selectedTrait || $ctrl.isDetailLoading || $ctrl.detailError">
          <header class="trait-detail__header">
            <h2 class="trait-detail__title">Dettagli tratto</h2>
            <button type="button" class="button button--ghost" ng-click="$ctrl.closeTrait()">
              Chiudi
            </button>
          </header>
          <div class="trait-detail__body" ng-if="$ctrl.isDetailLoading">
            <p>Caricamento del tratto in corso...</p>
          </div>
          <div class="trait-detail__body" ng-if="$ctrl.detailError && !$ctrl.isDetailLoading">
            <p class="trait-detail__error">{{ $ctrl.detailError }}</p>
          </div>
          <div class="trait-detail__body" ng-if="$ctrl.selectedTrait && !$ctrl.isDetailLoading">
            <h3 class="trait-detail__name">{{ $ctrl.selectedTrait.label }}</h3>
            <p class="trait-detail__summary">{{ $ctrl.selectedTrait.function }}</p>
            <dl class="trait-detail__meta">
              <div>
                <dt>Tier</dt>
                <dd>{{ $ctrl.selectedTrait.tier }}</dd>
              </div>
              <div>
                <dt>Famiglia</dt>
                <dd>{{ $ctrl.selectedTrait.family }}</dd>
              </div>
              <div>
                <dt>Ruolo core</dt>
                <dd>{{ $ctrl.selectedTrait.coreRole }}</dd>
              </div>
              <div>
                <dt>Ruolo complementare</dt>
                <dd>{{ $ctrl.selectedTrait.complementaryRole }}</dd>
              </div>
              <div>
                <dt>Origine dati</dt>
                <dd>{{ $ctrl.selectedTrait.dataOrigin }}</dd>
              </div>
              <div>
                <dt>Energia</dt>
                <dd>{{ $ctrl.selectedTrait.energyMaintenance }}</dd>
              </div>
            </dl>
            <section class="trait-detail__section">
              <h4>Uso tattico</h4>
              <p>{{ $ctrl.selectedTrait.function }}</p>
            </section>
            <section class="trait-detail__section">
              <h4>Spinta selettiva</h4>
              <p>{{ $ctrl.selectedTrait.selectivePressure }}</p>
            </section>
            <section class="trait-detail__section">
              <h4>Mutazione indotta</h4>
              <p>{{ $ctrl.selectedTrait.mutation }}</p>
            </section>
            <section class="trait-detail__section">
              <h4>Punti deboli</h4>
              <p>{{ $ctrl.selectedTrait.weakness }}</p>
            </section>
            <section class="trait-detail__section" ng-if="$ctrl.selectedTrait.usageTags.length">
              <h4>Tag operativi</h4>
              <ul class="trait-detail__tags">
                <li ng-repeat="tag in $ctrl.selectedTrait.usageTags track by tag">{{ tag }}</li>
              </ul>
            </section>
            <section class="trait-detail__section" ng-if="$ctrl.selectedTrait.synergies.length">
              <h4>Sinergie</h4>
              <ul class="trait-detail__list">
                <li ng-repeat="item in $ctrl.selectedTrait.synergies track by item">{{ item }}</li>
              </ul>
            </section>
            <section class="trait-detail__section" ng-if="$ctrl.selectedTrait.conflicts.length">
              <h4>Conflitti</h4>
              <ul class="trait-detail__list">
                <li ng-repeat="item in $ctrl.selectedTrait.conflicts track by item">{{ item }}</li>
              </ul>
            </section>
            <section class="trait-detail__section" ng-if="$ctrl.selectedTrait.biomeTags && $ctrl.selectedTrait.biomeTags.length">
              <h4>Biome</h4>
              <ul class="trait-detail__tags">
                <li ng-repeat="tag in $ctrl.selectedTrait.biomeTags track by tag">{{ tag }}</li>
              </ul>
            </section>
            <section class="trait-detail__section" ng-if="$ctrl.selectedTrait.requirements.length">
              <h4>Requisiti ambientali</h4>
              <ul class="trait-detail__requirements">
                <li ng-repeat="req in $ctrl.selectedTrait.requirements track by $index">
                  <strong>{{ req.condizioni.biome_class || 'Condizione' }}:</strong>
                  <span>{{ req.meta?.notes || 'Richiede condizioni specifiche.' }}</span>
                </li>
              </ul>
            </section>
            <footer class="trait-detail__footer" ng-if="$ctrl.detailSource">
              <p>
                Fonte dettaglio: {{ $ctrl.detailSource }}
                <span ng-if="$ctrl.detailUsingMock">(mock)</span>
              </p>
            </footer>
          </div>
        </section>

        <section class="traits-grid" ng-if="!$ctrl.listError && !$ctrl.isListLoading">
          <article class="trait-card" ng-repeat="trait in $ctrl.filteredTraits() track by trait.id">
            <header class="trait-card__header">
              <div class="trait-card__titles">
                <h2 class="trait-card__name">{{ trait.label }}</h2>
                <p class="trait-card__meta">
                  <span class="trait-card__tier">Tier {{ trait.tier }}</span>
                  <span class="trait-card__family">{{ trait.family }}</span>
                </p>
              </div>
              <div class="trait-card__roles">
                <span class="trait-card__role trait-card__role--core">{{ trait.coreRole }}</span>
                <span class="trait-card__role trait-card__role--complementary">
                  {{ trait.complementaryRole }}
                </span>
              </div>
            </header>
            <p class="trait-card__description">{{ trait.summary }}</p>
            <ul class="trait-card__tags" ng-if="trait.usageTags.length">
              <li ng-repeat="tag in trait.usageTags track by tag">{{ tag }}</li>
            </ul>
            <footer class="trait-card__footer">
              <button type="button" class="button button--secondary" ng-click="$ctrl.openTrait(trait.id)">
                Dettagli
              </button>
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
