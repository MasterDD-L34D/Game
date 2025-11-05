class GeneratorPageController {
  public tools = ['Builder sequenziale', 'Profiler missione', 'Calcolo risorse'];
}

export const registerGeneratorPage = (module: any): void => {
  module.component('missionGenerator', {
    controller: GeneratorPageController,
    controllerAs: '$ctrl',
    template: `
      <section class="page">
        <header class="page__header">
          <div>
            <h1 class="page__title">Generatore Operativo</h1>
            <p class="page__subtitle">
              Configura missioni con parametri dinamici e salva preset condivisibili con il comando.
            </p>
          </div>
        </header>
        <article class="panel">
          <h2 class="panel__title">Toolkit rapido</h2>
          <ul class="mission-list">
            <li class="mission-card" ng-repeat="tool in $ctrl.tools">
              <div class="mission-card__header">
                <span class="mission-card__codename">{{ tool }}</span>
              </div>
              <p class="mission-card__summary">
                Avvia sequenze guidate per configurare risorse, vincoli e risultati attesi.
              </p>
            </li>
          </ul>
        </article>
      </section>
    `,
  });
};
