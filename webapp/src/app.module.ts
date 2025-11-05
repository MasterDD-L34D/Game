declare const angular: any;
import { registerNavigationComponent } from './components/navigation/navigation.component';
import { registerDashboardPage } from './pages/dashboard/dashboard.page';
import { registerAtlasPage } from './pages/atlas/atlas.page';
import { registerTraitsPage } from './pages/traits/traits.page';
import { registerNebulaPage } from './pages/nebula/nebula.page';
import { registerDataStoreService } from './services/data-store.service';

class AppRootController {
  public isMenuVisible = false;
  public currentRoute = '/';

  static $inject = ['$rootScope', '$location'];

  constructor(
    private readonly $rootScope: any,
    private readonly $location: any,
  ) {}

  $onInit(): void {
    this.currentRoute = this.normalisePath(this.$location.path());
    this.$rootScope.$on('$routeChangeSuccess', () => {
      this.currentRoute = this.normalisePath(this.$location.path());
      this.isMenuVisible = false;
    });
  }

  toggleMenu(): void {
    this.isMenuVisible = !this.isMenuVisible;
  }

  private normalisePath(path: string): string {
    if (!path || path === '') {
      return '/';
    }
    return path.startsWith('/') ? path : `/${path}`;
  }
}

export function registerAppModule(): any {
  const module = angular
    .module('missionConsoleApp', ['ngRoute', 'ngSanitize', 'ngAnimate'])
    .config([
      '$routeProvider',
      '$locationProvider',
      ($routeProvider: any, $locationProvider: any) => {
        $locationProvider.hashPrefix('');

        $routeProvider
          .when('/', {
            template: '<mission-dashboard></mission-dashboard>',
            reloadOnUrl: false,
          })
          .when('/atlas', {
            template: '<atlas-explorer></atlas-explorer>',
          })
          .when('/traits', {
            template: '<trait-library></trait-library>',
          })
          .when('/nebula', {
            template: '<nebula-console></nebula-console>',
          })
          .otherwise({ redirectTo: '/' });
      },
    ]);

  registerDataStoreService(module);
  registerNavigationComponent(module);
  registerDashboardPage(module);
  registerAtlasPage(module);
  registerTraitsPage(module);
  registerNebulaPage(module);

  module.component('appRoot', {
    controller: AppRootController,
    template: `
      <div class="app-shell" ng-class="{ 'app-shell--menu-open': $ctrl.isMenuVisible }">
        <button
          class="app-shell__menu-toggle"
          type="button"
          ng-click="$ctrl.toggleMenu()"
          aria-controls="mission-console-navigation"
          aria-expanded="{{ $ctrl.isMenuVisible ? 'true' : 'false' }}"
        >
          <span class="visually-hidden">Apri il menù Evo-Tactics Console</span>
          <span aria-hidden="true">☰</span>
        </button>
        <mission-console-navigation
          current="$ctrl.currentRoute"
          is-open="$ctrl.isMenuVisible"
          on-toggle="$ctrl.toggleMenu()"
        ></mission-console-navigation>
        <div
          class="app-shell__overlay"
          ng-class="{ 'app-shell__overlay--visible': $ctrl.isMenuVisible }"
          ng-click="$ctrl.toggleMenu()"
          aria-hidden="true"
        ></div>
        <main class="app-shell__content" ng-view></main>
      </div>
    `,
  });

  return module;
}
