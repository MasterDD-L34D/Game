import type { Trait } from '../../types/trait';
import { TraitDataService } from '../../services/trait-data.service';
import { TraitStateService, type TraitUiState } from '../../services/trait-state.service';

class TraitDetailController {
  public trait: Trait | null = null;
  public ui: TraitUiState = { isLoading: false, status: null, previewTrait: null };

  static $inject = ['$routeParams', '$scope', 'TraitDataService', 'TraitStateService', '$location'];

  constructor(
    private readonly $routeParams: any,
    private readonly $scope: any,
    private readonly dataService: TraitDataService,
    private readonly stateService: TraitStateService,
    private readonly $location: any,
  ) {}

  $onInit(): void {
    this.stateService.subscribe(this.$scope, (state) => {
      this.ui = state;
    });

    const { id } = this.$routeParams;
    this.loadTrait(id);
  }

  $onDestroy(): void {
    this.stateService.setPreviewTrait(null);
    this.stateService.setLoading(false);
    this.stateService.setStatus(null);
  }

  goToEditor(): void {
    if (this.trait) {
      this.$location.path(`/traits/${this.trait.id}/edit`);
    }
  }

  private loadTrait(id: string): void {
    this.stateService.setStatus(null);
    this.stateService.setLoading(true);

    this.dataService
      .getTraitById(id)
      .then((trait) => {
        if (!trait) {
          this.stateService.setStatus('Il tratto richiesto non è stato trovato.', 'error');
          this.trait = null;
          this.stateService.setPreviewTrait(null);
          return;
        }

        this.trait = trait;
        this.stateService.setPreviewTrait(trait);
        const lastError = this.dataService.getLastError();
        if (lastError) {
          this.stateService.setStatus('Dati caricati da backup locale a causa di un problema di rete.', 'info');
        }
      })
      .catch((error: Error) => {
        console.error('Impossibile caricare il tratto richiesto:', error);
        this.stateService.setStatus('Non è stato possibile recuperare i dettagli del tratto selezionato.', 'error');
        this.trait = null;
        this.stateService.setPreviewTrait(null);
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
}

export const registerTraitDetailPage = (module: any): void => {
  module.component('traitDetail', {
    controller: TraitDetailController,
    controllerAs: '$ctrl',
    template: `
      <section class="page">
        <header class="page__header">
          <div>
            <h1 class="page__title">Dettaglio tratto</h1>
            <p class="page__subtitle">
              Analizza le caratteristiche complete di un tratto e decidi se modificarlo o tornare all'elenco.
            </p>
          </div>
          <div class="page__actions">
            <a class="button button--ghost" ng-href="#!/traits">Torna all'elenco</a>
            <button class="button" type="button" ng-click="$ctrl.goToEditor()" ng-disabled="!$ctrl.trait">
              Modifica tratto
            </button>
          </div>
        </header>

        <div class="status-banner" ng-if="$ctrl.ui.status" ng-class="'status-banner--' + $ctrl.ui.status.variant">
          <span class="status-banner__icon" aria-hidden="true">{{ $ctrl.statusIcon() }}</span>
          <p class="status-banner__text">{{ $ctrl.ui.status.message }}</p>
        </div>

        <div class="loader" ng-if="$ctrl.ui.isLoading">
          <span class="loader__spinner" aria-hidden="true"></span>
          <p class="loader__label">Caricamento del tratto in corso...</p>
        </div>

        <trait-preview trait="$ctrl.trait" ng-if="!$ctrl.ui.isLoading"></trait-preview>
      </section>
    `,
  });
};
