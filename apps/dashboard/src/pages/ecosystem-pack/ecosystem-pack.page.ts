class EcosystemPackPageController {
  public packages = [
    {
      name: 'Pack Strategico',
      summary: 'Bundle di moduli per operazioni multi-teatro.',
    },
    {
      name: 'Pack Biomi',
      summary: 'Nuove mappe ambientali e variabili climatiche.',
    },
    {
      name: 'Pack Supporto AI',
      summary: 'Assistenti predittivi e routine automatizzate.',
    },
  ];
}

export const registerEcosystemPackPage = (module: any): void => {
  module.component('ecosystemPack', {
    controller: EcosystemPackPageController,
    controllerAs: '$ctrl',
    template: `
      <section class="page">
        <header class="page__header">
          <div>
            <h1 class="page__title">Ecosystem Pack</h1>
            <p class="page__subtitle">
              Espandi il sistema con pacchetti modulari certificati dal comando centrale.
            </p>
          </div>
        </header>
        <article class="panel panel--missions">
          <h2 class="panel__title">Pacchetti disponibili</h2>
          <ul class="mission-list">
            <li class="mission-card" ng-repeat="pack in $ctrl.packages">
              <div class="mission-card__header">
                <span class="mission-card__codename">{{ pack.name }}</span>
              </div>
              <p class="mission-card__summary">{{ pack.summary }}</p>
            </li>
          </ul>
        </article>
      </section>
    `,
  });
};
