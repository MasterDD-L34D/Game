interface NavigationLink {
  label: string;
  route: string;
  description: string;
  icon: string;
}

class NavigationController {
  public current?: string;
  public isOpen?: boolean;
  public onToggle?: () => void;
  public topLinks: NavigationLink[] = [
    {
      label: 'Generatore',
      route: '/generator',
      description: 'Crea scenari procedurali e parametri operativi.',
      icon: '⚙️',
    },
    {
      label: 'Mission Control',
      route: '/mission-control',
      description: 'Coordinamento strategico e autorizzazioni istantanee.',
      icon: '🛰️',
    },
    {
      label: 'Mission Console',
      route: '/mission-console',
      description: 'Quadro sinottico delle operazioni in tempo reale.',
      icon: '🖥️',
    },
    {
      label: 'Ecosystem Pack',
      route: '/ecosystem-pack',
      description: 'Risorse, moduli e pacchetti di estensione.',
      icon: '🧩',
    },
  ];
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
      isOpen: '<',
      onToggle: '&',
    },
    controller: NavigationController,
    controllerAs: '$ctrl',
    template: `
      <nav
        id="mission-console-navigation"
        class="navigation"
        ng-class="{ 'navigation--open': $ctrl.isOpen }"
        role="navigation"
        aria-label="Primary"
      >
        <div class="navigation__header">
          <button
            class="navigation__menu-button"
            type="button"
            ng-click="$ctrl.toggleMenu()"
            aria-expanded="{{ $ctrl.isOpen ? 'true' : 'false' }}"
            aria-controls="mission-console-navigation"
          >
            <span class="visually-hidden">Toggle menu</span>
            <span aria-hidden="true">{{ $ctrl.isOpen ? '✕' : '☰' }}</span>
          </button>
          <div class="navigation__brand">
            <span class="navigation__title">Evo-Tactics Console</span>
            <span class="navigation__subtitle">Mission Control</span>
          </div>
        </div>
        <ul class="navigation__topbar" role="menubar">
          <li
            class="navigation__topbar-item"
            ng-repeat="topLink in $ctrl.topLinks"
            ng-class="{ 'navigation__topbar-item--active': $ctrl.isActive(topLink.route) }"
          >
            <button
              class="navigation__topbar-link"
              ng-class="{ 'navigation__topbar-link--active': $ctrl.isActive(topLink.route) }"
              type="button"
              ng-click="$ctrl.handleLinkClick(topLink.route)"
              aria-label="{{ topLink.label }}"
              role="menuitem"
            >
              <span class="navigation__topbar-icon" aria-hidden="true">{{ topLink.icon }}</span>
              <span class="navigation__topbar-text">{{ topLink.label }}</span>
            </button>
          </li>
        </ul>
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
