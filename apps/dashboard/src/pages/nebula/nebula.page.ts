import type { NebulaMilestone } from '../../types';
import { DataStoreService } from '../../services/data-store.service';

class NebulaController {
  public milestones: NebulaMilestone[] = [];

  static $inject = ['DataStoreService'];

  constructor(private readonly dataStore: DataStoreService) {}

  $onInit(): void {
    this.milestones = this.dataStore.getNebulaMilestones();
  }

  statusLabel(status: NebulaMilestone['status']): string {
    switch (status) {
      case 'on-track':
        return 'In linea';
      case 'blocked':
        return 'Bloccato';
      case 'monitor':
        return 'Monitorare';
      default:
        return status;
    }
  }

  statusClass(status: NebulaMilestone['status']): string {
    switch (status) {
      case 'on-track':
        return 'milestone__status milestone__status--success';
      case 'blocked':
        return 'milestone__status milestone__status--alert';
      case 'monitor':
      default:
        return 'milestone__status milestone__status--warning';
    }
  }

  progressStyle(progress: number): Record<string, string> {
    return { width: `${Math.min(Math.max(progress, 0), 100)}%` };
  }
}

export const registerNebulaPage = (module: any): void => {
  module.component('nebulaConsole', {
    controller: NebulaController,
    controllerAs: '$ctrl',
    template: `
      <section class="page">
        <header class="page__header">
          <div>
            <h1 class="page__title">Nebula Initiatives</h1>
            <p class="page__subtitle">
              Allinea i progressi infrastrutturali e anticipa gli impatti delle anomalie sulle missioni future.
            </p>
          </div>
        </header>

        <section class="nebula-grid">
          <article class="milestone" ng-repeat="milestone in $ctrl.milestones">
            <header class="milestone__header">
              <h2 class="milestone__title">{{ milestone.title }}</h2>
              <span class="milestone__owner">Responsabile: {{ milestone.owner }}</span>
            </header>
            <p class="milestone__summary">{{ milestone.summary }}</p>
            <dl class="milestone__details">
              <div>
                <dt>Stato</dt>
                <dd><span ng-class="$ctrl.statusClass(milestone.status)">{{ $ctrl.statusLabel(milestone.status) }}</span></dd>
              </div>
              <div>
                <dt>ETA</dt>
                <dd>{{ milestone.eta }}</dd>
              </div>
            </dl>
            <div class="milestone__progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="{{ milestone.progress }}">
              <div class="milestone__progress-bar" ng-style="$ctrl.progressStyle(milestone.progress)"></div>
              <span class="milestone__progress-value">{{ milestone.progress }}%</span>
            </div>
            <div class="milestone__dependencies">
              <h3>Dipendenze cruciali</h3>
              <ul>
                <li ng-repeat="dependency in milestone.dependencies">{{ dependency }}</li>
              </ul>
            </div>
          </article>
        </section>
      </section>
    `,
  });
};
