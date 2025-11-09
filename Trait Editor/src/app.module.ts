declare const angular: any;

import { registerTraitLibraryPage } from './pages/trait-library/trait-library.page';
import { registerTraitDataService } from './services/trait-data.service';
import { registerTraitDetailPage } from './pages/trait-detail/trait-detail.page';
import { registerTraitEditorPage } from './pages/trait-editor/trait-editor.page';
import { registerTraitStateService } from './services/trait-state.service';
import { registerTraitPreviewComponent } from './components/trait-preview/trait-preview.component';
import { registerTraitValidationPanelComponent } from './components/trait-validation-panel/trait-validation-panel.component';

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
            redirectTo: '/traits',
          })
          .when('/traits', {
            template: '<trait-library></trait-library>',
            reloadOnUrl: false,
          })
          .when('/traits/:id', {
            template: '<trait-detail></trait-detail>',
            reloadOnUrl: false,
          })
          .when('/traits/:id/edit', {
            template: '<trait-editor></trait-editor>',
            reloadOnUrl: false,
          })
          .otherwise({ redirectTo: '/' });
      },
    ]);

  registerTraitDataService(module);
  registerTraitStateService(module);
  registerTraitLibraryPage(module);
  registerTraitDetailPage(module);
  registerTraitEditorPage(module);
  registerTraitPreviewComponent(module);
  registerTraitValidationPanelComponent(module);

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
