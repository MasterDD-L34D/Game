declare const angular: any;

import { registerTraitLibraryPage } from './pages/trait-library/trait-library.page';
import { registerTraitDataService } from './services/trait-data.service';

export function registerAppModule(): any {
  const module = angular
    .module('traitEditorApp', ['ngRoute', 'ngAnimate', 'ngSanitize'])
    .config([
      '$routeProvider',
      '$locationProvider',
      ($routeProvider: any, $locationProvider: any) => {
        $locationProvider.hashPrefix('');

        $routeProvider
          .when('/', {
            template: '<trait-library></trait-library>',
            reloadOnUrl: false,
          })
          .otherwise({ redirectTo: '/' });
      },
    ]);

  registerTraitDataService(module);
  registerTraitLibraryPage(module);

  module.component('appRoot', {
    template: `
      <div class="app-shell">
        <header class="app-shell__header">
          <h1 class="app-shell__title">Trait Editor</h1>
          <p class="app-shell__subtitle">
            Anteprima indipendente della libreria tratti con mock locali o dataset condivisi.
          </p>
        </header>
        <main class="app-shell__content">
          <div class="app-shell__viewport" ng-view></div>
        </main>
      </div>
    `,
  });

  return module;
}
