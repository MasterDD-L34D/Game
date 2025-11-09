import type { Trait, TraitRequirement, TraitSpeciesAffinity } from '../../types/trait';
import { TraitDataService } from '../../services/trait-data.service';
import { TraitStateService, type TraitUiState } from '../../services/trait-state.service';
import { cloneTrait, mergeTrait, synchroniseTraitPresentation } from '../../utils/trait-helpers';

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
      this.onFormChange();
    }
  }

  removeSignatureMove(index: number): void {
    if (this.formModel) {
      this.formModel.signatureMoves.splice(index, 1);
      this.onFormChange();
    }
  }

  onLabelChange(): void {
    if (!this.formModel) {
      return;
    }

    this.formModel.name = this.formModel.entry.label;
    this.onFormChange();
  }

  addSlot(): void {
    if (this.formModel) {
      this.formModel.entry.slot.push('');
      this.onFormChange();
    }
  }

  removeSlot(index: number): void {
    if (this.formModel) {
      this.formModel.entry.slot.splice(index, 1);
      this.onFormChange();
    }
  }

  addUsageTag(): void {
    if (this.formModel) {
      this.formModel.entry.usage_tags.push('');
      this.onFormChange();
    }
  }

  removeUsageTag(index: number): void {
    if (this.formModel) {
      this.formModel.entry.usage_tags.splice(index, 1);
      this.onFormChange();
    }
  }

  addConflict(): void {
    if (this.formModel) {
      this.formModel.entry.conflitti.push('');
      this.onFormChange();
    }
  }

  removeConflict(index: number): void {
    if (this.formModel) {
      this.formModel.entry.conflitti.splice(index, 1);
      this.onFormChange();
    }
  }

  addBiomeTag(): void {
    if (this.formModel) {
      this.formModel.entry.biome_tags.push('');
      this.onFormChange();
    }
  }

  removeBiomeTag(index: number): void {
    if (this.formModel) {
      this.formModel.entry.biome_tags.splice(index, 1);
      this.onFormChange();
    }
  }

  addSynergyPiCoOccurrence(): void {
    if (this.formModel) {
      this.formModel.entry.sinergie_pi.co_occorrenze.push('');
      this.onFormChange();
    }
  }

  removeSynergyPiCoOccurrence(index: number): void {
    if (this.formModel) {
      this.formModel.entry.sinergie_pi.co_occorrenze.splice(index, 1);
      this.onFormChange();
    }
  }

  addSynergyPiForm(): void {
    if (this.formModel) {
      this.formModel.entry.sinergie_pi.forme.push('');
      this.onFormChange();
    }
  }

  removeSynergyPiForm(index: number): void {
    if (this.formModel) {
      this.formModel.entry.sinergie_pi.forme.splice(index, 1);
      this.onFormChange();
    }
  }

  addSynergyPiRandomTable(): void {
    if (this.formModel) {
      this.formModel.entry.sinergie_pi.tabelle_random.push('');
      this.onFormChange();
    }
  }

  removeSynergyPiRandomTable(index: number): void {
    if (this.formModel) {
      this.formModel.entry.sinergie_pi.tabelle_random.splice(index, 1);
      this.onFormChange();
    }
  }

  addSpeciesAffinity(): void {
    if (this.formModel) {
      this.formModel.entry.species_affinity.push({ roles: [''], species_id: '', weight: 0 });
      this.onFormChange();
    }
  }

  removeSpeciesAffinity(index: number): void {
    if (this.formModel) {
      this.formModel.entry.species_affinity.splice(index, 1);
      this.onFormChange();
    }
  }

  addSpeciesAffinityRole(index: number): void {
    if (this.formModel) {
      const affinity = this.formModel.entry.species_affinity[index];
      if (affinity) {
        affinity.roles.push('');
        this.onFormChange();
      }
    }
  }

  removeSpeciesAffinityRole(index: number, roleIndex: number): void {
    if (this.formModel) {
      const affinity = this.formModel.entry.species_affinity[index];
      if (affinity) {
        affinity.roles.splice(roleIndex, 1);
        this.onFormChange();
      }
    }
  }

  addRequirement(): void {
    if (this.formModel) {
      this.formModel.entry.requisiti_ambientali.push({
        capacita_richieste: [''],
        condizioni: {},
        fonte: '',
        meta: {},
      });
      this.onFormChange();
    }
  }

  removeRequirement(index: number): void {
    if (this.formModel) {
      this.formModel.entry.requisiti_ambientali.splice(index, 1);
      this.onFormChange();
    }
  }

  addRequirementCapability(index: number): void {
    if (this.formModel) {
      const requirement = this.formModel.entry.requisiti_ambientali[index];
      if (requirement) {
        requirement.capacita_richieste.push('');
        this.onFormChange();
      }
    }
  }

  removeRequirementCapability(index: number, capabilityIndex: number): void {
    if (this.formModel) {
      const requirement = this.formModel.entry.requisiti_ambientali[index];
      if (requirement) {
        requirement.capacita_richieste.splice(capabilityIndex, 1);
        this.onFormChange();
      }
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

    const payload = mergeTrait(this.trait, this.formModel);
    synchroniseTraitPresentation(payload);
    this.stateService.setStatus(null);
    this.stateService.setLoading(true);

    this.dataService
      .saveTrait(payload)
      .then((savedTrait) => {
        this.trait = savedTrait;
        this.formModel = this.prepareFormModel(savedTrait);
        this.stateService.setPreviewTrait(this.formModel);
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

    this.formModel = this.prepareFormModel(this.trait);
    this.stateService.setPreviewTrait(this.formModel);
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
        this.formModel = this.prepareFormModel(trait);
        this.stateService.setPreviewTrait(this.formModel);
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

  private prepareFormModel(trait: Trait): TraitFormModel {
    const model = this.ensureCollections(cloneTrait(trait));
    return synchroniseTraitPresentation(model);
  }

  private ensureCollections(model: TraitFormModel): TraitFormModel {
    model.signatureMoves = Array.isArray(model.signatureMoves) ? [...model.signatureMoves] : [];
    const entry = model.entry;
    entry.label = entry.label ?? model.name;
    entry.slot_profile = { ...entry.slot_profile };
    entry.slot = Array.isArray(entry.slot) ? [...entry.slot] : [];
    entry.usage_tags = Array.isArray(entry.usage_tags) ? [...entry.usage_tags] : [];
    entry.conflitti = Array.isArray(entry.conflitti) ? [...entry.conflitti] : [];
    entry.biome_tags = Array.isArray(entry.biome_tags) ? [...entry.biome_tags] : [];
    entry.completion_flags = { ...entry.completion_flags };
    entry.sinergie = Array.isArray(entry.sinergie) ? [...entry.sinergie] : [];
    entry.sinergie_pi = {
      co_occorrenze: Array.isArray(entry.sinergie_pi.co_occorrenze)
        ? [...entry.sinergie_pi.co_occorrenze]
        : [],
      combo_totale: Number.isFinite(entry.sinergie_pi.combo_totale)
        ? entry.sinergie_pi.combo_totale
        : 0,
      forme: Array.isArray(entry.sinergie_pi.forme) ? [...entry.sinergie_pi.forme] : [],
      tabelle_random: Array.isArray(entry.sinergie_pi.tabelle_random)
        ? [...entry.sinergie_pi.tabelle_random]
        : [],
    };
    entry.species_affinity = Array.isArray(entry.species_affinity)
      ? entry.species_affinity.map((affinity) => this.normaliseSpeciesAffinity(affinity))
      : [];
    entry.requisiti_ambientali = Array.isArray(entry.requisiti_ambientali)
      ? entry.requisiti_ambientali.map((requirement) => this.normaliseRequirement(requirement))
      : [];

    return model;
  }

  private normaliseSpeciesAffinity(affinity: TraitSpeciesAffinity): TraitSpeciesAffinity {
    return {
      species_id: affinity.species_id,
      weight: affinity.weight,
      roles: Array.isArray(affinity.roles) ? [...affinity.roles] : [],
    };
  }

  private normaliseRequirement(requirement: TraitRequirement): TraitRequirement {
    return {
      capacita_richieste: Array.isArray(requirement.capacita_richieste)
        ? [...requirement.capacita_richieste]
        : [],
      condizioni: requirement.condizioni ? { ...requirement.condizioni } : {},
      fonte: requirement.fonte,
      meta: requirement.meta ? { ...requirement.meta } : {},
    };
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
              <legend class="trait-form__legend">Indice e classificazione</legend>

              <div
                class="form-field"
                ng-class="{ 'form-field--invalid': editorForm.entryLabel.$invalid && editorForm.entryLabel.$touched }"
              >
                <label for="trait-label">Label indice</label>
                <input
                  id="trait-label"
                  name="entryLabel"
                  type="text"
                  ng-model="$ctrl.formModel.entry.label"
                  ng-change="$ctrl.onLabelChange()"
                  required
                />
                <p class="form-field__error" ng-if="editorForm.entryLabel.$error.required && editorForm.entryLabel.$touched">
                  Il label è obbligatorio.
                </p>
              </div>

              <div
                class="form-field"
                ng-class="{ 'form-field--invalid': editorForm.entryTier.$invalid && editorForm.entryTier.$touched }"
              >
                <label for="trait-tier">Tier</label>
                <input
                  id="trait-tier"
                  name="entryTier"
                  type="text"
                  ng-model="$ctrl.formModel.entry.tier"
                  ng-change="$ctrl.onFormChange()"
                  required
                />
                <p class="form-field__error" ng-if="editorForm.entryTier.$error.required && editorForm.entryTier.$touched">
                  Il tier è obbligatorio.
                </p>
              </div>

              <div class="form-field-group">
                <div class="form-field">
                  <label for="slot-core">Slot core</label>
                  <input
                    id="slot-core"
                    name="slotCore"
                    type="text"
                    ng-model="$ctrl.formModel.entry.slot_profile.core"
                    ng-change="$ctrl.onFormChange()"
                    required
                  />
                </div>
                <div class="form-field">
                  <label for="slot-complementare">Slot complementare</label>
                  <input
                    id="slot-complementare"
                    name="slotComplementare"
                    type="text"
                    ng-model="$ctrl.formModel.entry.slot_profile.complementare"
                    ng-change="$ctrl.onFormChange()"
                    required
                  />
                </div>
              </div>
            </fieldset>

            <fieldset class="trait-form__section">
              <legend class="trait-form__legend">Slot e tag</legend>

              <div class="signature-moves">
                <div
                  class="signature-moves__item"
                  ng-repeat="slot in $ctrl.formModel.entry.slot track by $index"
                >
                  <label class="signature-moves__label" for="slot-{{$index}}">Slot {{$index + 1}}</label>
                  <div class="signature-moves__controls">
                    <input
                      id="slot-{{$index}}"
                      name="slot{{$index}}"
                      type="text"
                      ng-model="$ctrl.formModel.entry.slot[$index]"
                      ng-change="$ctrl.onFormChange()"
                      required
                    />
                    <button type="button" class="button button--icon" ng-click="$ctrl.removeSlot($index)">
                      <span aria-hidden="true">✕</span>
                      <span class="visually-hidden">Rimuovi slot {{$index + 1}}</span>
                    </button>
                  </div>
                </div>
              </div>

              <button type="button" class="button button--ghost" ng-click="$ctrl.addSlot()">
                Aggiungi slot
              </button>

              <div class="signature-moves">
                <div
                  class="signature-moves__item"
                  ng-repeat="tag in $ctrl.formModel.entry.usage_tags track by $index"
                >
                  <label class="signature-moves__label" for="tag-{{$index}}">Tag {{$index + 1}}</label>
                  <div class="signature-moves__controls">
                    <input
                      id="tag-{{$index}}"
                      name="tag{{$index}}"
                      type="text"
                      ng-model="$ctrl.formModel.entry.usage_tags[$index]"
                      ng-change="$ctrl.onFormChange()"
                      required
                    />
                    <button type="button" class="button button--icon" ng-click="$ctrl.removeUsageTag($index)">
                      <span aria-hidden="true">✕</span>
                      <span class="visually-hidden">Rimuovi tag {{$index + 1}}</span>
                    </button>
                  </div>
                </div>
              </div>

              <button type="button" class="button button--ghost" ng-click="$ctrl.addUsageTag()">
                Aggiungi tag
              </button>
            </fieldset>

            <fieldset class="trait-form__section">
              <legend class="trait-form__legend">Flag di completamento</legend>

              <div class="form-field form-field--checkbox">
                <label>
                  <input
                    type="checkbox"
                    ng-model="$ctrl.formModel.entry.completion_flags.has_biome"
                    ng-change="$ctrl.onFormChange()"
                  />
                  Bioma definito
                </label>
              </div>
              <div class="form-field form-field--checkbox">
                <label>
                  <input
                    type="checkbox"
                    ng-model="$ctrl.formModel.entry.completion_flags.has_data_origin"
                    ng-change="$ctrl.onFormChange()"
                  />
                  Origine dati presente
                </label>
              </div>
              <div class="form-field form-field--checkbox">
                <label>
                  <input
                    type="checkbox"
                    ng-model="$ctrl.formModel.entry.completion_flags.has_species_link"
                    ng-change="$ctrl.onFormChange()"
                  />
                  Collegamento specie
                </label>
              </div>
              <div class="form-field form-field--checkbox">
                <label>
                  <input
                    type="checkbox"
                    ng-model="$ctrl.formModel.entry.completion_flags.has_usage_tags"
                    ng-change="$ctrl.onFormChange()"
                  />
                  Tag d'uso definiti
                </label>
              </div>
            </fieldset>

            <fieldset class="trait-form__section">
              <legend class="trait-form__legend">Contestualizzazione</legend>

              <div class="form-field">
                <label for="trait-data-origin">Origine dati</label>
                <input
                  id="trait-data-origin"
                  name="dataOrigin"
                  type="text"
                  ng-model="$ctrl.formModel.entry.data_origin"
                  ng-change="$ctrl.onFormChange()"
                  required
                />
              </div>

              <div class="form-field">
                <label for="trait-weakness">Debolezza</label>
                <textarea
                  id="trait-weakness"
                  name="weakness"
                  rows="3"
                  ng-model="$ctrl.formModel.entry.debolezza"
                  ng-change="$ctrl.onFormChange()"
                ></textarea>
              </div>

              <div class="form-field">
                <label for="trait-mutation">Mutazione indotta</label>
                <textarea
                  id="trait-mutation"
                  name="mutation"
                  rows="3"
                  ng-model="$ctrl.formModel.entry.mutazione_indotta"
                  ng-change="$ctrl.onFormChange()"
                ></textarea>
              </div>

              <div class="form-field">
                <label for="trait-energy">Fattore di mantenimento energetico</label>
                <input
                  id="trait-energy"
                  name="energyFactor"
                  type="text"
                  ng-model="$ctrl.formModel.entry.fattore_mantenimento_energetico"
                  ng-change="$ctrl.onFormChange()"
                />
              </div>

              <div class="signature-moves">
                <div
                  class="signature-moves__item"
                  ng-repeat="conflict in $ctrl.formModel.entry.conflitti track by $index"
                >
                  <label class="signature-moves__label" for="conflict-{{$index}}">Conflitto {{$index + 1}}</label>
                  <div class="signature-moves__controls">
                    <input
                      id="conflict-{{$index}}"
                      name="conflict{{$index}}"
                      type="text"
                      ng-model="$ctrl.formModel.entry.conflitti[$index]"
                      ng-change="$ctrl.onFormChange()"
                    />
                    <button type="button" class="button button--icon" ng-click="$ctrl.removeConflict($index)">
                      <span aria-hidden="true">✕</span>
                      <span class="visually-hidden">Rimuovi conflitto {{$index + 1}}</span>
                    </button>
                  </div>
                </div>
              </div>
              <button type="button" class="button button--ghost" ng-click="$ctrl.addConflict()">
                Aggiungi conflitto
              </button>

              <div class="signature-moves">
                <div
                  class="signature-moves__item"
                  ng-repeat="tag in $ctrl.formModel.entry.biome_tags track by $index"
                >
                  <label class="signature-moves__label" for="biome-tag-{{$index}}">Biome tag {{$index + 1}}</label>
                  <div class="signature-moves__controls">
                    <input
                      id="biome-tag-{{$index}}"
                      name="biomeTag{{$index}}"
                      type="text"
                      ng-model="$ctrl.formModel.entry.biome_tags[$index]"
                      ng-change="$ctrl.onFormChange()"
                    />
                    <button type="button" class="button button--icon" ng-click="$ctrl.removeBiomeTag($index)">
                      <span aria-hidden="true">✕</span>
                      <span class="visually-hidden">Rimuovi biome tag {{$index + 1}}</span>
                    </button>
                  </div>
                </div>
              </div>
              <button type="button" class="button button--ghost" ng-click="$ctrl.addBiomeTag()">
                Aggiungi biome tag
              </button>
            </fieldset>

            <fieldset class="trait-form__section">
              <legend class="trait-form__legend">Sinergie approfondite</legend>

              <div class="form-field">
                <label for="combo-totale">Combo totale</label>
                <input
                  id="combo-totale"
                  name="comboTotale"
                  type="number"
                  min="0"
                  ng-model="$ctrl.formModel.entry.sinergie_pi.combo_totale"
                  ng-change="$ctrl.onFormChange()"
                />
              </div>

              <div class="signature-moves">
                <div
                  class="signature-moves__item"
                  ng-repeat="item in $ctrl.formModel.entry.sinergie_pi.co_occorrenze track by $index"
                >
                  <label class="signature-moves__label" for="co-occur-{{$index}}">Co-occorrenza {{$index + 1}}</label>
                  <div class="signature-moves__controls">
                    <input
                      id="co-occur-{{$index}}"
                      name="coOccorrenza{{$index}}"
                      type="text"
                      ng-model="$ctrl.formModel.entry.sinergie_pi.co_occorrenze[$index]"
                      ng-change="$ctrl.onFormChange()"
                    />
                    <button type="button" class="button button--icon" ng-click="$ctrl.removeSynergyPiCoOccurrence($index)">
                      <span aria-hidden="true">✕</span>
                      <span class="visually-hidden">Rimuovi co-occorrenza {{$index + 1}}</span>
                    </button>
                  </div>
                </div>
              </div>
              <button type="button" class="button button--ghost" ng-click="$ctrl.addSynergyPiCoOccurrence()">
                Aggiungi co-occorrenza
              </button>

              <div class="signature-moves">
                <div
                  class="signature-moves__item"
                  ng-repeat="forma in $ctrl.formModel.entry.sinergie_pi.forme track by $index"
                >
                  <label class="signature-moves__label" for="forma-{{$index}}">Forma {{$index + 1}}</label>
                  <div class="signature-moves__controls">
                    <input
                      id="forma-{{$index}}"
                      name="forma{{$index}}"
                      type="text"
                      ng-model="$ctrl.formModel.entry.sinergie_pi.forme[$index]"
                      ng-change="$ctrl.onFormChange()"
                    />
                    <button type="button" class="button button--icon" ng-click="$ctrl.removeSynergyPiForm($index)">
                      <span aria-hidden="true">✕</span>
                      <span class="visually-hidden">Rimuovi forma {{$index + 1}}</span>
                    </button>
                  </div>
                </div>
              </div>
              <button type="button" class="button button--ghost" ng-click="$ctrl.addSynergyPiForm()">
                Aggiungi forma
              </button>

              <div class="signature-moves">
                <div
                  class="signature-moves__item"
                  ng-repeat="table in $ctrl.formModel.entry.sinergie_pi.tabelle_random track by $index"
                >
                  <label class="signature-moves__label" for="random-table-{{$index}}">Tabella casuale {{$index + 1}}</label>
                  <div class="signature-moves__controls">
                    <input
                      id="random-table-{{$index}}"
                      name="randomTable{{$index}}"
                      type="text"
                      ng-model="$ctrl.formModel.entry.sinergie_pi.tabelle_random[$index]"
                      ng-change="$ctrl.onFormChange()"
                    />
                    <button type="button" class="button button--icon" ng-click="$ctrl.removeSynergyPiRandomTable($index)">
                      <span aria-hidden="true">✕</span>
                      <span class="visually-hidden">Rimuovi tabella {{$index + 1}}</span>
                    </button>
                  </div>
                </div>
              </div>
              <button type="button" class="button button--ghost" ng-click="$ctrl.addSynergyPiRandomTable()">
                Aggiungi tabella
              </button>
            </fieldset>

            <fieldset class="trait-form__section">
              <legend class="trait-form__legend">Affinità di specie</legend>

              <div class="nested-list" ng-repeat="affinity in $ctrl.formModel.entry.species_affinity track by $index">
                <div class="nested-list__header">
                  <h3 class="nested-list__title">Affinità {{$index + 1}}</h3>
                  <button type="button" class="button button--ghost" ng-click="$ctrl.removeSpeciesAffinity($index)">
                    Rimuovi
                  </button>
                </div>
                <div class="form-field">
                  <label for="species-id-{{$index}}">Specie</label>
                  <input
                    id="species-id-{{$index}}"
                    name="species{{$index}}"
                    type="text"
                    ng-model="affinity.species_id"
                    ng-change="$ctrl.onFormChange()"
                    required
                  />
                </div>
                <div class="form-field">
                  <label for="species-weight-{{$index}}">Peso</label>
                  <input
                    id="species-weight-{{$index}}"
                    name="speciesWeight{{$index}}"
                    type="number"
                    step="0.01"
                    ng-model="affinity.weight"
                    ng-change="$ctrl.onFormChange()"
                  />
                </div>
                <div class="signature-moves">
                  <div class="signature-moves__item" ng-repeat="role in affinity.roles track by $index">
                    <label
                      class="signature-moves__label"
                      for="species-role-{{$parent.$index}}-{{$index}}"
                    >
                      Ruolo {{$index + 1}}
                    </label>
                    <div class="signature-moves__controls">
                      <input
                        id="species-role-{{$parent.$index}}-{{$index}}"
                        name="speciesRole{{$parent.$index}}{{$index}}"
                        type="text"
                        ng-model="affinity.roles[$index]"
                        ng-change="$ctrl.onFormChange()"
                      />
                      <button
                        type="button"
                        class="button button--icon"
                        ng-click="$ctrl.removeSpeciesAffinityRole($parent.$index, $index)"
                      >
                        <span aria-hidden="true">✕</span>
                        <span class="visually-hidden">Rimuovi ruolo {{$index + 1}}</span>
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  class="button button--ghost"
                  ng-click="$ctrl.addSpeciesAffinityRole($index)"
                >
                  Aggiungi ruolo
                </button>
              </div>

              <button type="button" class="button button--ghost" ng-click="$ctrl.addSpeciesAffinity()">
                Aggiungi affinità di specie
              </button>
            </fieldset>

            <fieldset class="trait-form__section">
              <legend class="trait-form__legend">Requisiti ambientali</legend>

              <div class="nested-list" ng-repeat="requirement in $ctrl.formModel.entry.requisiti_ambientali track by $index">
                <div class="nested-list__header">
                  <h3 class="nested-list__title">Requisito {{$index + 1}}</h3>
                  <button type="button" class="button button--ghost" ng-click="$ctrl.removeRequirement($index)">
                    Rimuovi
                  </button>
                </div>
                <div class="form-field">
                  <label for="requirement-source-{{$index}}">Fonte</label>
                  <input
                    id="requirement-source-{{$index}}"
                    name="requirementSource{{$index}}"
                    type="text"
                    ng-model="requirement.fonte"
                    ng-change="$ctrl.onFormChange()"
                  />
                </div>
                <div class="signature-moves">
                  <div
                    class="signature-moves__item"
                    ng-repeat="capability in requirement.capacita_richieste track by $index"
                  >
                    <label
                      class="signature-moves__label"
                      for="capability-{{$parent.$index}}-{{$index}}"
                    >
                      Capacità {{$index + 1}}
                    </label>
                    <div class="signature-moves__controls">
                      <input
                        id="capability-{{$parent.$index}}-{{$index}}"
                        name="capability{{$parent.$index}}{{$index}}"
                        type="text"
                        ng-model="requirement.capacita_richieste[$index]"
                        ng-change="$ctrl.onFormChange()"
                      />
                      <button
                        type="button"
                        class="button button--icon"
                        ng-click="$ctrl.removeRequirementCapability($parent.$index, $index)"
                      >
                        <span aria-hidden="true">✕</span>
                        <span class="visually-hidden">Rimuovi capacità {{$index + 1}}</span>
                      </button>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  class="button button--ghost"
                  ng-click="$ctrl.addRequirementCapability($index)"
                >
                  Aggiungi capacità
                </button>
                <div class="form-field">
                  <label for="requirement-biome-{{$index}}">Classe di bioma</label>
                  <input
                    id="requirement-biome-{{$index}}"
                    name="requirementBiome{{$index}}"
                    type="text"
                    ng-model="requirement.condizioni.biome_class"
                    ng-change="$ctrl.onFormChange()"
                  />
                </div>
                <div class="form-field">
                  <label for="requirement-meta-expansion-{{$index}}">Meta - Espansione</label>
                  <input
                    id="requirement-meta-expansion-{{$index}}"
                    name="requirementMetaExpansion{{$index}}"
                    type="text"
                    ng-model="requirement.meta.expansion"
                    ng-change="$ctrl.onFormChange()"
                  />
                </div>
                <div class="form-field">
                  <label for="requirement-meta-tier-{{$index}}">Meta - Tier</label>
                  <input
                    id="requirement-meta-tier-{{$index}}"
                    name="requirementMetaTier{{$index}}"
                    type="text"
                    ng-model="requirement.meta.tier"
                    ng-change="$ctrl.onFormChange()"
                  />
                </div>
                <div class="form-field">
                  <label for="requirement-meta-notes-{{$index}}">Meta - Note</label>
                  <textarea
                    id="requirement-meta-notes-{{$index}}"
                    name="requirementMetaNotes{{$index}}"
                    rows="2"
                    ng-model="requirement.meta.notes"
                    ng-change="$ctrl.onFormChange()"
                  ></textarea>
                </div>
              </div>

              <button type="button" class="button button--ghost" ng-click="$ctrl.addRequirement()">
                Aggiungi requisito
              </button>
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
