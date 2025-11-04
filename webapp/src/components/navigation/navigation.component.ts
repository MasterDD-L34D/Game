interface NavigationLink {
  label: string;
  route: string;
  description: string;
  icon: string;
}

class NavigationController {
  public current?: string;
  public onToggle?: () => void;
  public links: NavigationLink[] = [
    {
      label: 'Dashboard',
      route: '/',
      description: 'Mission readiness, latest intel, and console heartbeat.',
      icon: 'dashboard',
    },
    {
      label: 'Atlas',
      route: '/atlas',
      description: 'Knowledge base for theatres, doctrine, and strategic insight.',
      icon: 'layers',
    },
    {
      label: 'Traits',
      route: '/traits',
      description: 'Operator archetypes, strengths, and recommended deployment.',
      icon: 'users',
    },
    {
      label: 'Nebula',
      route: '/nebula',
      description: 'Initiatives, upgrade tracks, and anomaly stabilisation work.',
      icon: 'pulse',
    },
  ];

  static $inject = ['$location'];

  constructor(private readonly $location: any) {}

  handleLinkClick(route: string): void {
    this.$location.path(route);
    this.onToggle?.();
  }

  toggleMenu(): void {
    this.onToggle?.();
  }

  isActive(route: string): boolean {
    if (!this.current) {
      return route === '/';
    }
    return this.current === route;
  }
}

export const registerNavigationComponent = (module: any): void => {
  module.component('missionConsoleNavigation', {
    bindings: {
      current: '<',
      onToggle: '&',
    },
    controller: NavigationController,
    controllerAs: '$ctrl',
    template: `
      <nav class="navigation" role="navigation" aria-label="Primary">
        <div class="navigation__header">
          <button class="navigation__menu-button" type="button" ng-click="$ctrl.toggleMenu()">
            <span class="visually-hidden">Toggle menu</span>
            &#9776;
          </button>
          <div class="navigation__brand">
            <span class="navigation__title">Evo-Tactics Console</span>
            <span class="navigation__subtitle">Mission Control</span>
          </div>
        </div>
        <ul class="navigation__list">
          <li
            class="navigation__item"
            ng-repeat="link in $ctrl.links"
            ng-class="{ 'navigation__item--active': $ctrl.isActive(link.route) }"
          >
            <button
              class="navigation__link"
              type="button"
              ng-click="$ctrl.handleLinkClick(link.route)"
              aria-label="{{ link.label }}"
            >
              <span class="navigation__icon" aria-hidden="true">{{ link.icon }}</span>
              <span class="navigation__text">
                <span class="navigation__label">{{ link.label }}</span>
                <span class="navigation__description">{{ link.description }}</span>
              </span>
            </button>
          </li>
        </ul>
      </nav>
    `,
  });
};
