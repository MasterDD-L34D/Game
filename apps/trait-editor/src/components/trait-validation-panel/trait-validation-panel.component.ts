import type {
  TraitValidationAutoFix,
  TraitValidationIssue,
  TraitValidationResult,
  TraitValidationSeverity,
} from '../../types/trait-validation';

class TraitValidationPanelController {
  public result: TraitValidationResult | null = null;
  public isLoading = false;
  public error: string | null = null;
  public canUndo = false;
  public onApplyFix?: (locals: { fix: TraitValidationAutoFix }) => void;
  public onUndo?: () => void;

  get hasResult(): boolean {
    return Boolean(this.result);
  }

  get hasIssues(): boolean {
    return Boolean(this.result && this.result.issues.length > 0);
  }

  get showEmptyState(): boolean {
    return this.hasResult && !this.isLoading && !this.error && !this.hasIssues;
  }

  summaryItems(): Array<{ label: string; value: number; severity: TraitValidationSeverity }> {
    if (!this.result) {
      return [];
    }

    return [
      { label: 'Errori', value: this.result.summary.errors, severity: 'error' },
      { label: 'Warning', value: this.result.summary.warnings, severity: 'warning' },
      { label: 'Suggerimenti', value: this.result.summary.suggestions, severity: 'suggestion' },
    ];
  }

  severityIcon(severity: TraitValidationSeverity): string {
    if (severity === 'error') {
      return '⛔';
    }

    if (severity === 'warning') {
      return '⚠️';
    }

    return '💡';
  }

  applyFix(fix: TraitValidationAutoFix): void {
    if (this.onApplyFix) {
      this.onApplyFix({ fix });
    }
  }

  undoLastFix(): void {
    if (this.onUndo) {
      this.onUndo();
    }
  }

  issueTrack(issue: TraitValidationIssue): string {
    return issue.id;
  }

  fixTrack(fix: TraitValidationAutoFix): string {
    return fix.id;
  }
}

export const registerTraitValidationPanelComponent = (module: any): void => {
  module.component('traitValidationPanel', {
    bindings: {
      result: '<',
      isLoading: '<',
      error: '<',
      canUndo: '<',
      onApplyFix: '&',
      onUndo: '&',
    },
    controller: TraitValidationPanelController,
    controllerAs: '$ctrl',
    template: `
      <section class="validation-panel">
        <header class="validation-panel__header">
          <h2 class="validation-panel__title">Validazione</h2>
          <ul class="validation-panel__summary" ng-if="$ctrl.hasResult">
            <li
              class="validation-panel__summary-item"
              ng-repeat="item in $ctrl.summaryItems() track by item.severity"
              ng-class="'validation-panel__summary-item--' + item.severity"
            >
              <span class="validation-panel__summary-label">{{ item.label }}</span>
              <span class="validation-panel__summary-value">{{ item.value }}</span>
            </li>
          </ul>
        </header>

        <p class="validation-panel__message" ng-if="$ctrl.isLoading">
          Validazione in corso...
        </p>

        <p class="validation-panel__message validation-panel__message--error" ng-if="$ctrl.error && !$ctrl.isLoading">
          {{ $ctrl.error }}
        </p>

        <p class="validation-panel__message" ng-if="$ctrl.showEmptyState">
          Nessun problema rilevato.
        </p>

        <ul class="validation-panel__issues" ng-if="$ctrl.hasIssues">
          <li
            class="validation-issue"
            ng-repeat="issue in $ctrl.result.issues track by $ctrl.issueTrack(issue)"
            ng-class="'validation-issue--' + issue.severity"
          >
            <div class="validation-issue__summary">
              <span class="validation-issue__icon" aria-hidden="true">{{ $ctrl.severityIcon(issue.severity) }}</span>
              <div class="validation-issue__content">
                <p class="validation-issue__message">{{ issue.message }}</p>
                <p class="validation-issue__meta" ng-if="issue.code || issue.path">
                  <span ng-if="issue.code">Codice: {{ issue.code }}</span>
                  <span ng-if="issue.code && issue.path"> · </span>
                  <span ng-if="issue.path">Percorso: {{ issue.path }}</span>
                </p>
              </div>
            </div>

            <ul class="validation-issue__fixes" ng-if="issue.autoFixes.length">
              <li class="validation-issue__fix" ng-repeat="fix in issue.autoFixes track by $ctrl.fixTrack(fix)">
                <div class="validation-issue__fix-content">
                  <p class="validation-issue__fix-label">{{ fix.label }}</p>
                  <p class="validation-issue__fix-description" ng-if="fix.description">{{ fix.description }}</p>
                </div>
                <button type="button" class="button button--ghost" ng-click="$ctrl.applyFix(fix)">
                  Applica
                </button>
              </li>
            </ul>
          </li>
        </ul>

        <button
          type="button"
          class="button button--ghost validation-panel__undo"
          ng-if="$ctrl.canUndo"
          ng-click="$ctrl.undoLastFix()"
        >
          Annulla ultima correzione
        </button>
      </section>
    `,
  });
};
