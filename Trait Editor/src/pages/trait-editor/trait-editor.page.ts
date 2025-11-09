import type { Trait } from '../../types/trait';
import { TraitDataService } from '../../services/trait-data.service';
import { TraitStateService, type TraitUiState } from '../../services/trait-state.service';
import { cloneTrait, synchroniseTraitPresentation } from '../../utils/trait-helpers';

interface TraitFormModel extends Trait {}

class TraitEditorController {
  public trait: Trait | null = null;
  public formModel: TraitFormModel | null = null;
  public ui: TraitUiState = { isLoading: false, status: null, previewTrait: null };

  static $inject = ['$routeParams', '$scope', '$location', '$timeout', 'TraitDataService', 'TraitStateService'];

  constructor(
    private readonly $routeParams: any,
    private readonly $scope: any,
    private readonly $location: any,
    private readonly $timeout: any,
    private readonly dataService: TraitDataService,
    private readonly stateService: TraitStateService,
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

  addSignatureMove(): void {
    if (this.formModel) {
      this.formModel.signatureMoves.push('');
      this.syncFormModel();
      this.propagatePreview();
    }
  }

  removeSignatureMove(index: number): void {
    if (this.formModel) {
      this.formModel.signatureMoves.splice(index, 1);
      this.syncFormModel();
      this.propagatePreview();
    }
  }

  onFormChange(): void {
    this.syncFormModel();
    this.propagatePreview();
  }

  canConfirm(editorForm: any): boolean {
    return Boolean(this.formModel && this.trait && editorForm.$valid && this.isDirty());
  }

  confirm(editorForm: any): void {
    if (!this.formModel || !this.trait || !editorForm.$valid) {
      return;
    }

    const payload = cloneTrait(this.formModel);
    this.stateService.setStatus(null);
    this.stateService.setLoading(true);

    this.dataService
      .saveTrait(payload)
      .then((savedTrait) => {
        this.trait = savedTrait;
        this.formModel = cloneTrait(savedTrait);
        this.stateService.setPreviewTrait(savedTrait);
        this.stateService.setStatus('Modifiche salvate con successo.', 'success');
        this.$timeout(() => this.stateService.setStatus(null), 3000);
        this.$location.path(`/traits/${savedTrait.id}`);
      })
      .catch((error: Error) => {
        console.error('Errore durante il salvataggio del tratto:', error);
        const message =
          error?.message ?? 'Si è verificato un errore imprevisto durante il salvataggio del tratto.';
        this.stateService.setStatus(message, 'error');
      })
      .finally(() => {
        this.stateService.setLoading(false);
      });
  }

  cancel(): void {
    if (!this.trait) {
      this.$location.path('/traits');
      return;
    }

    this.formModel = cloneTrait(this.trait);
    this.stateService.setPreviewTrait(this.trait);
    this.stateService.setStatus(null);
    this.$location.path(`/traits/${this.trait.id}`);
  }

  isDirty(): boolean {
    if (!this.trait || !this.formModel) {
      return false;
    }

    return JSON.stringify(this.trait) !== JSON.stringify(this.formModel);
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
          this.formModel = null;
          this.stateService.setPreviewTrait(null);
          return;
        }

        this.trait = trait;
        this.formModel = cloneTrait(trait);
        this.stateService.setPreviewTrait(trait);
        const lastError = this.dataService.getLastError();
        if (lastError) {
          this.stateService.setStatus('Modifica locale: la sorgente remota non è stata raggiunta.', 'info');
        }
      })
      .catch((error: Error) => {
        console.error('Impossibile caricare il tratto per la modifica:', error);
        this.stateService.setStatus('Non è stato possibile preparare il tratto per la modifica.', 'error');
        this.trait = null;
        this.formModel = null;
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

  private propagatePreview(): void {
    if (this.formModel) {
      this.syncFormModel();
      this.stateService.setPreviewTrait(this.formModel);
    }
  }

  private syncFormModel(): void {
    if (this.formModel) {
      synchroniseTraitPresentation(this.formModel);
    }
  }
}

export const registerTraitEditorPage = (module: any): void => {
  module.component('traitEditor', {
    controller: TraitEditorController,
    controllerAs: '$ctrl',
    template: `
      <section class="page">
        <header class="page__header">
          <div>
            <h1 class="page__title">Editor del tratto</h1>
            <p class="page__subtitle">
              Aggiorna le proprietà del tratto e visualizza un'anteprima dal vivo delle modifiche prima di confermarle.
            </p>
          </div>
          <div class="page__actions">
            <a class="button button--ghost" ng-href="#!/traits/{{ $ctrl.trait?.id ?? '' }}" ng-if="$ctrl.trait">
              Torna al dettaglio
            </a>
            <a class="button button--ghost" ng-href="#!/traits" ng-if="!$ctrl.trait">
              Torna all'elenco
            </a>
          </div>
        </header>

        <div class="status-banner" ng-if="$ctrl.ui.status" ng-class="'status-banner--' + $ctrl.ui.status.variant">
          <span class="status-banner__icon" aria-hidden="true">{{ $ctrl.statusIcon() }}</span>
          <p class="status-banner__text">{{ $ctrl.ui.status.message }}</p>
        </div>

        <div class="loader" ng-if="$ctrl.ui.isLoading">
          <span class="loader__spinner" aria-hidden="true"></span>
          <p class="loader__label">Preparazione dell'editor in corso...</p>
        </div>

        <div class="editor-layout" ng-if="!$ctrl.ui.isLoading && $ctrl.formModel">
          <form name="editorForm" class="trait-form" novalidate ng-submit="$ctrl.confirm(editorForm)">
            <fieldset class="trait-form__section">
              <legend class="trait-form__legend">Informazioni generali</legend>
              <div class="form-field" ng-class="{ 'form-field--invalid': editorForm.name.$invalid && editorForm.name.$touched }">
                <label for="trait-name">Nome</label>
                <input
                  id="trait-name"
                  name="name"
                  type="text"
                  ng-model="$ctrl.formModel.name"
                  ng-change="$ctrl.onFormChange()"
                  required
                  minlength="3"
                />
                <p class="form-field__error" ng-if="editorForm.name.$error.required && editorForm.name.$touched">
                  Il nome è obbligatorio.
                </p>
                <p class="form-field__error" ng-if="editorForm.name.$error.minlength && editorForm.name.$touched">
                  Il nome deve contenere almeno 3 caratteri.
                </p>
              </div>

              <div
                class="form-field"
                ng-class="{ 'form-field--invalid': editorForm.archetype.$invalid && editorForm.archetype.$touched }"
              >
                <label for="trait-archetype">Archetipo</label>
                <input
                  id="trait-archetype"
                  name="archetype"
                  type="text"
                  ng-model="$ctrl.formModel.archetype"
                  ng-change="$ctrl.onFormChange()"
                  required
                />
                <p class="form-field__error" ng-if="editorForm.archetype.$error.required && editorForm.archetype.$touched">
                  L'archetipo è obbligatorio.
                </p>
              </div>

              <div
                class="form-field"
                ng-class="{ 'form-field--invalid': editorForm.playstyle.$invalid && editorForm.playstyle.$touched }"
              >
                <label for="trait-playstyle">Stile di gioco</label>
                <textarea
                  id="trait-playstyle"
                  name="playstyle"
                  rows="3"
                  ng-model="$ctrl.formModel.playstyle"
                  ng-change="$ctrl.onFormChange()"
                  required
                ></textarea>
                <p class="form-field__error" ng-if="editorForm.playstyle.$error.required && editorForm.playstyle.$touched">
                  Lo stile di gioco è obbligatorio.
                </p>
              </div>

              <div
                class="form-field"
                ng-class="{ 'form-field--invalid': editorForm.description.$invalid && editorForm.description.$touched }"
              >
                <label for="trait-description">Descrizione</label>
                <textarea
                  id="trait-description"
                  name="description"
                  rows="4"
                  ng-model="$ctrl.formModel.description"
                  ng-change="$ctrl.onFormChange()"
                  required
                  minlength="10"
                ></textarea>
                <p class="form-field__error" ng-if="editorForm.description.$error.required && editorForm.description.$touched">
                  La descrizione è obbligatoria.
                </p>
                <p class="form-field__error" ng-if="editorForm.description.$error.minlength && editorForm.description.$touched">
                  La descrizione deve contenere almeno 10 caratteri.
                </p>
              </div>
            </fieldset>

            <fieldset class="trait-form__section">
              <legend class="trait-form__legend">Mosse distintive</legend>

              <div class="signature-moves">
                <div
                  class="signature-moves__item"
                  ng-repeat="move in $ctrl.formModel.signatureMoves track by $index"
                  ng-class="{
                    'signature-moves__item--invalid':
                      editorForm['move' + $index].$invalid && editorForm['move' + $index].$touched,
                  }"
                >
                  <label class="signature-moves__label" for="move-{{$index}}">Mossa {{$index + 1}}</label>
                  <div class="signature-moves__controls">
                    <input
                      id="move-{{$index}}"
                      name="move{{$index}}"
                      type="text"
                      ng-model="$ctrl.formModel.signatureMoves[$index]"
                      ng-change="$ctrl.onFormChange()"
                      required
                      minlength="3"
                    />
                    <button type="button" class="button button--icon" ng-click="$ctrl.removeSignatureMove($index)">
                      <span aria-hidden="true">✕</span>
                      <span class="visually-hidden">Rimuovi mossa {{$index + 1}}</span>
                    </button>
                  </div>
                  <p class="form-field__error" ng-if="editorForm['move' + $index].$error.required && editorForm['move' + $index].$touched">
                    La mossa è obbligatoria.
                  </p>
                  <p class="form-field__error" ng-if="editorForm['move' + $index].$error.minlength && editorForm['move' + $index].$touched">
                    La mossa deve contenere almeno 3 caratteri.
                  </p>
                </div>
              </div>

              <button type="button" class="button button--ghost" ng-click="$ctrl.addSignatureMove()">
                Aggiungi mossa
              </button>
            </fieldset>

            <div class="trait-form__actions">
              <button type="submit" class="button" ng-disabled="!$ctrl.canConfirm(editorForm)">
                Conferma modifiche
              </button>
              <button type="button" class="button button--ghost" ng-click="$ctrl.cancel()">
                Annulla
              </button>
            </div>
          </form>

          <aside class="editor-layout__preview">
            <h2 class="editor-layout__title">Anteprima live</h2>
            <trait-preview trait="$ctrl.formModel"></trait-preview>
          </aside>
        </div>
      </section>
    `,
  });
};
