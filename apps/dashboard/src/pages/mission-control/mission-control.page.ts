class MissionControlPageController {
  public signals = [
    {
      title: 'Allineamento squadre',
      description: 'Aggiorna i team con nuove priorità operative e turni.',
    },
    {
      title: 'Allocazione vettori',
      description: 'Gestisci asset aerei, orbitali e terrestri in tempo reale.',
    },
    {
      title: 'Protocollo emergenze',
      description: "Esegui procedure accelerate quando l'anomalia supera la soglia.",
    },
  ];
}

export const registerMissionControlPage = (module: any): void => {
  module.component('missionControl', {
    controller: MissionControlPageController,
    controllerAs: '$ctrl',
    template: `
      <section class="page">
        <header class="page__header">
          <div>
            <h1 class="page__title">Mission Control</h1>
            <p class="page__subtitle">
              Coordina squadre e asset mantenendo la situazione tattica sempre sotto osservazione.
            </p>
          </div>
        </header>
        <section class="dashboard-grid">
          <article class="panel panel--missions">
            <h2 class="panel__title">Azioni prioritarie</h2>
            <ul class="mission-list">
              <li class="mission-card" ng-repeat="signal in $ctrl.signals">
                <div class="mission-card__header">
                  <span class="mission-card__codename">{{ signal.title }}</span>
                </div>
                <p class="mission-card__summary">{{ signal.description }}</p>
              </li>
            </ul>
          </article>
        </section>
      </section>
    `,
  });
};
