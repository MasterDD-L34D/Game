import type { Trait } from '../../types/trait';

class TraitPreviewController {
  public trait?: Trait | null;
  public compact = false;

  get hasTrait(): boolean {
    return Boolean(this.trait);
  }
}

export const registerTraitPreviewComponent = (module: any): void => {
  module.component('traitPreview', {
    bindings: {
      trait: '<',
      compact: '<?',
    },
    controller: TraitPreviewController,
    controllerAs: '$ctrl',
    template: `
      <div class="trait-preview" ng-class="{ 'trait-preview--compact': $ctrl.compact }" ng-if="$ctrl.hasTrait">
        <header class="trait-preview__header">
          <div>
            <h2 class="trait-preview__name">{{ $ctrl.trait.name }}</h2>
            <p class="trait-preview__archetype">{{ $ctrl.trait.archetype }}</p>
          </div>
          <span class="trait-preview__tag">Anteprima</span>
        </header>
        <p class="trait-preview__description">{{ $ctrl.trait.description }}</p>
        <dl class="trait-preview__details">
          <div>
            <dt>Stile di gioco</dt>
            <dd>{{ $ctrl.trait.playstyle }}</dd>
          </div>
          <div>
            <dt>Mosse distintive</dt>
            <dd>
              <ul class="trait-preview__moves">
                <li ng-repeat="move in $ctrl.trait.signatureMoves track by $index">{{ move }}</li>
              </ul>
            </dd>
          </div>
        </dl>
      </div>
      <p class="trait-preview__empty" ng-if="!$ctrl.hasTrait">
        Nessun tratto selezionato.
      </p>
    `,
  });
};
