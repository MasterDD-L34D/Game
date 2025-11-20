import type {
  TraitDetail,
  TraitEnvironment,
  TraitListItem,
  TraitDataSource,
  TraitValidationIssue,
  TraitIndexEntry,
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
  public validationIssues: TraitValidationIssue[] = [];
  public isValidationLoading = false;
  public validationError: string | null = null;
  public validationChecked = false;
  public validationValid = false;

  static $inject = ['$scope', 'TraitService'];

  constructor(
    private readonly $scope: any,
    private readonly traitService: TraitService,
  ) {}

  private selectedEntry: TraitIndexEntry | null = null;
  private detailHistory: TraitIndexEntry[] = [];
  private historyIndex = -1;
  private validationRequestId = 0;

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
    this.selectedTrait = null;
    this.selectedEntry = null;
    this.resetValidationState();

    try {
      const response = await this.traitService.getTraitById(traitId);
      this.detailSource = response.source;
      this.detailUsingMock = response.usedMock;
      this.setCurrentEntry(response.rawEntry, { resetHistory: true });
      this.validationChecked = false;
      void this.runValidation(this.selectedEntry);
    } catch (error) {
      this.selectedTrait = null;
      this.selectedEntry = null;
      this.detailHistory = [];
      this.historyIndex = -1;
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
    this.selectedEntry = null;
    this.detailHistory = [];
    this.historyIndex = -1;
    this.resetValidationState();
  }

  canUndo(): boolean {
    return this.historyIndex > 0;
  }

  canRedo(): boolean {
    return this.historyIndex >= 0 && this.historyIndex < this.detailHistory.length - 1;
  }

  undo(): void {
    if (!this.canUndo()) {
      return;
    }
    this.historyIndex -= 1;
    const snapshot = this.detailHistory[this.historyIndex];
    this.setCurrentEntry(snapshot);
    this.validationError = null;
    void this.runValidation(this.selectedEntry);
  }

  redo(): void {
    if (!this.canRedo()) {
      return;
    }
    this.historyIndex += 1;
    const snapshot = this.detailHistory[this.historyIndex];
    this.setCurrentEntry(snapshot);
    this.validationError = null;
    void this.runValidation(this.selectedEntry);
  }

  revalidate(): void {
    if (!this.selectedEntry) {
      return;
    }
    this.validationError = null;
    void this.runValidation(this.selectedEntry);
  }

  issueGroups(): {
    severity: TraitValidationIssue['severity'];
    title: string;
    issues: TraitValidationIssue[];
  }[] {
    const severities: TraitValidationIssue['severity'][] = ['error', 'warning', 'suggestion'];
    const labels: Record<TraitValidationIssue['severity'], string> = {
      error: 'Errori',
      warning: 'Avvisi',
      suggestion: 'Suggerimenti',
    };
    return severities
      .map((severity) => ({
        severity,
        title: labels[severity],
        issues: this.validationIssues.filter((issue) => issue.severity === severity),
      }))
      .filter((group) => group.issues.length > 0);
  }

  issueSeverityLabel(severity: TraitValidationIssue['severity']): string {
    if (severity === 'error') {
      return 'Errore';
    }
    if (severity === 'warning') {
      return 'Avviso';
    }
    return 'Suggerimento';
  }

  badgeClass(severity: TraitValidationIssue['severity']): string {
    return `trait-issues__badge trait-issues__badge--${severity}`;
  }

  canApplyFix(issue: TraitValidationIssue): boolean {
    const fix = issue.fix;
    if (!fix) {
      return false;
    }
    const type = typeof fix.type === 'string' ? fix.type.toLowerCase() : 'set';
    if (type !== 'set') {
      return false;
    }
    if (!Object.prototype.hasOwnProperty.call(fix, 'value')) {
      return false;
    }
    if (fix.autoApplicable === false) {
      return false;
    }
    return true;
  }

  applyFix(issue: TraitValidationIssue): void {
    if (!this.selectedEntry || !this.canApplyFix(issue) || !issue.fix) {
      return;
    }
    try {
      const next = this.applySetFix(this.selectedEntry, issue.path, issue.fix.value);
      this.setCurrentEntry(next, { pushHistory: true });
      this.validationError = null;
      void this.runValidation(this.selectedEntry);
    } catch (error) {
      console.error('Impossibile applicare la correzione del tratto:', error);
      this.validationError = 'Impossibile applicare automaticamente la correzione suggerita.';
      this.$scope.$applyAsync();
    }
  }

  formatDisplayPath(issue: TraitValidationIssue): string {
    return issue.displayPath || 'payload';
  }

  hasFixValue(issue: TraitValidationIssue): boolean {
    return Boolean(issue.fix && Object.prototype.hasOwnProperty.call(issue.fix, 'value'));
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

  private setCurrentEntry(
    entry: TraitIndexEntry,
    options: { resetHistory?: boolean; pushHistory?: boolean } = {},
  ): void {
    const snapshot = this.cloneEntry(entry);
    this.selectedEntry = snapshot;
    this.selectedTrait = this.traitService.toTraitDetail(snapshot);
    if (options.resetHistory) {
      this.detailHistory = [this.cloneEntry(snapshot)];
      this.historyIndex = 0;
    } else if (options.pushHistory) {
      this.detailHistory = this.detailHistory.slice(0, this.historyIndex + 1);
      this.detailHistory.push(this.cloneEntry(snapshot));
      this.historyIndex = this.detailHistory.length - 1;
    }
  }

  private cloneEntry(entry: TraitIndexEntry): TraitIndexEntry {
    return JSON.parse(JSON.stringify(entry)) as TraitIndexEntry;
  }

  private resetValidationState(): void {
    this.validationIssues = [];
    this.validationError = null;
    this.validationChecked = false;
    this.validationValid = false;
    this.isValidationLoading = false;
    this.validationRequestId += 1;
  }

  private async runValidation(entry: TraitIndexEntry | null): Promise<void> {
    if (!entry) {
      return;
    }
    const requestId = ++this.validationRequestId;
    this.isValidationLoading = true;
    this.validationError = null;

    try {
      const result = await this.traitService.validateTrait(entry);
      if (this.validationRequestId !== requestId) {
        return;
      }
      this.validationIssues = result.issues;
      this.validationValid = result.valid;
      this.validationChecked = true;
    } catch (error) {
      if (this.validationRequestId !== requestId) {
        return;
      }
      this.validationIssues = [];
      this.validationValid = false;
      if (error instanceof TraitServiceError) {
        if (error.status === 401) {
          this.validationError = 'Non autorizzato ad eseguire la validazione del tratto.';
        } else if (error.status === 404) {
          this.validationError = 'Endpoint di validazione non trovato (404).';
        } else if (error.status === 500) {
          this.validationError = 'Errore interno durante la validazione del tratto (500).';
        } else {
          this.validationError =
            error.message || 'Impossibile completare la validazione del tratto.';
        }
      } else {
        this.validationError = 'Errore imprevisto durante la validazione del tratto.';
      }
      this.validationChecked = true;
    } finally {
      if (this.validationRequestId === requestId) {
        this.isValidationLoading = false;
        this.$scope.$applyAsync();
      }
    }
  }

  private parsePointer(pointer: string): string[] {
    if (!pointer) {
      return [];
    }
    const cleaned = pointer.startsWith('/') ? pointer.slice(1) : pointer;
    if (!cleaned) {
      return [];
    }
    return cleaned.split('/').map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
  }

  private applySetFix(entry: TraitIndexEntry, pointer: string, value: unknown): TraitIndexEntry {
    const segments = this.parsePointer(pointer);
    if (segments.length === 0) {
      throw new Error('Percorso della correzione non valido.');
    }
    const clone = this.cloneEntry(entry);
    let current: any = clone;
    for (let i = 0; i < segments.length - 1; i += 1) {
      const segment = segments[i];
      if (Array.isArray(current)) {
        const index = Number(segment);
        if (!Number.isInteger(index) || index < 0) {
          throw new Error('Indice non valido nella correzione.');
        }
        if (current[index] === undefined) {
          current[index] = {};
        }
        current = current[index];
      } else {
        if (!Object.prototype.hasOwnProperty.call(current, segment) || current[segment] === null) {
          current[segment] = {};
        }
        current = current[segment];
      }
    }
    const lastSegment = segments[segments.length - 1];
    if (Array.isArray(current)) {
      const index = Number(lastSegment);
      if (!Number.isInteger(index) || index < 0) {
        throw new Error('Indice non valido nella correzione.');
      }
      current[index] = value;
    } else {
      current[lastSegment] = value;
    }
    return clone;
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
            <div class="trait-detail__toolbar">
              <button type="button" class="button button--ghost" ng-click="$ctrl.undo()" ng-disabled="!$ctrl.canUndo()">
                Annulla
              </button>
              <button type="button" class="button button--ghost" ng-click="$ctrl.redo()" ng-disabled="!$ctrl.canRedo()">
                Ripristina
              </button>
              <button
                type="button"
                class="button button--secondary"
                ng-click="$ctrl.revalidate()"
                ng-disabled="$ctrl.isValidationLoading"
              >
                Rivalida
              </button>
            </div>
            <section class="trait-detail__section trait-issues">
              <h4>Diagnostica</h4>
              <p
                class="trait-issues__status trait-issues__status--info"
                ng-if="!$ctrl.validationChecked && !$ctrl.isValidationLoading && !$ctrl.validationError"
              >
                Esegui la validazione per analizzare il payload del tratto.
              </p>
              <p class="trait-issues__status trait-issues__status--info" ng-if="$ctrl.isValidationLoading">
                Validazione in corso...
              </p>
              <p
                class="trait-issues__status trait-issues__status--error"
                ng-if="$ctrl.validationError && !$ctrl.isValidationLoading"
              >
                {{ $ctrl.validationError }}
              </p>
              <p
                class="trait-issues__status trait-issues__status--success"
                ng-if="!$ctrl.isValidationLoading && !$ctrl.validationError && $ctrl.validationChecked && !$ctrl.validationIssues.length"
              >
                Nessun problema rilevato sul payload attuale.
              </p>
              <div class="trait-issues__groups" ng-if="$ctrl.validationIssues.length">
                <div class="trait-issues__group" ng-repeat="group in $ctrl.issueGroups() track by group.severity">
                  <h5 class="trait-issues__group-title">{{ group.title }}</h5>
                  <ul class="trait-issues__list">
                    <li class="trait-issues__item" ng-repeat="issue in group.issues track by issue.id">
                      <span ng-class="$ctrl.badgeClass(group.severity)">
                        {{ $ctrl.issueSeverityLabel(group.severity) }}
                      </span>
                      <div class="trait-issues__content">
                        <p class="trait-issues__message">{{ issue.message }}</p>
                        <p class="trait-issues__path">Campo: {{ $ctrl.formatDisplayPath(issue) }}</p>
                        <p class="trait-issues__note" ng-if="issue.fix && issue.fix.note">{{ issue.fix.note }}</p>
                        <p class="trait-issues__note" ng-if="$ctrl.hasFixValue(issue)">
                          Valore suggerito: <code>{{ issue.fix.value | json }}</code>
                        </p>
                      </div>
                      <button
                        type="button"
                        class="button button--ghost trait-issues__action"
                        ng-if="$ctrl.canApplyFix(issue)"
                        ng-click="$ctrl.applyFix(issue)"
                        ng-disabled="$ctrl.isValidationLoading"
                      >
                        Applica fix
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </section>
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
