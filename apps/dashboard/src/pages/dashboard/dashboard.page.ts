import type { DashboardMetric, EventLog, Mission, SpeciesBiomeLink } from '../../types';
import { formatDate } from '../../utils/format-date';
import { DataStoreService } from '../../services/data-store.service';

type MissionBadge = 'planned' | 'in-progress' | 'completed' | 'at-risk';

class DashboardController {
  public missions: Mission[] = [];
  public metrics: DashboardMetric[] = [];
  public events: EventLog[] = [];
  public statusSummary: Record<string, number> = {};
  public speciesBiomes: SpeciesBiomeLink[] = [];
  public speciesBiomeLoading = false;
  public speciesBiomeError: string | null = null;

  static $inject = ['DataStoreService'];

  constructor(private readonly dataStore: DataStoreService) {}

  $onInit(): void {
    this.missions = this.dataStore.getMissions();
    this.metrics = this.dataStore.getDashboardMetrics();
    this.events = this.dataStore.getEventLog(4);
    this.statusSummary = this.dataStore.getMissionStatusSummary();
    this.loadSpeciesBiomes();
  }

  missionBadgeClass(status: MissionBadge): string {
    switch (status) {
      case 'planned':
        return 'mission-card__status mission-card__status--planned';
      case 'in-progress':
        return 'mission-card__status mission-card__status--active';
      case 'completed':
        return 'mission-card__status mission-card__status--complete';
      case 'at-risk':
        return 'mission-card__status mission-card__status--risk';
      default:
        return 'mission-card__status';
    }
  }

  eventImpactBadge(impact: EventLog['impact']): string {
    switch (impact) {
      case 'high':
        return 'event-log__impact event-log__impact--high';
      case 'medium':
        return 'event-log__impact event-log__impact--medium';
      case 'low':
      default:
        return 'event-log__impact event-log__impact--low';
    }
  }

  formatTimestamp(value: string): string {
    return formatDate(value);
  }

  private loadSpeciesBiomes(): void {
    this.speciesBiomeLoading = true;
    this.dataStore
      .getSpeciesBiomeLinks()
      .then((links) => {
        this.speciesBiomes = links;
        this.speciesBiomeError = null;
      })
      .catch((error: unknown) => {
        console.warn('Errore caricamento relazioni specie/biomi', error);
        this.speciesBiomes = [];
        this.speciesBiomeError = 'Impossibile caricare le relazioni specie/biomi';
      })
      .finally(() => {
        this.speciesBiomeLoading = false;
      });
  }
}

export const registerDashboardPage = (module: any): void => {
  module.component('missionDashboard', {
    controller: DashboardController,
    controllerAs: '$ctrl',
    template: `
      <section class="page">
        <header class="page__header">
          <div>
            <h1 class="page__title">Mission Console</h1>
            <p class="page__subtitle">
              Monitor readiness, react to anomaly fluctuations, and keep operators synchronised across theatres.
            </p>
          </div>
          <dl class="status-summary">
            <div class="status-summary__item">
              <dt>In corso</dt>
              <dd>{{ $ctrl.statusSummary['in-progress'] || 0 }}</dd>
            </div>
            <div class="status-summary__item">
              <dt>Pianificate</dt>
              <dd>{{ $ctrl.statusSummary['planned'] || 0 }}</dd>
            </div>
            <div class="status-summary__item">
              <dt>Rischio</dt>
              <dd>{{ $ctrl.statusSummary['at-risk'] || 0 }}</dd>
            </div>
            <div class="status-summary__item">
              <dt>Completate</dt>
              <dd>{{ $ctrl.statusSummary['completed'] || 0 }}</dd>
            </div>
          </dl>
        </header>

        <section class="dashboard-grid">
          <article class="panel panel--metrics">
            <h2 class="panel__title">Indicatori operativi</h2>
            <ul class="metric-grid">
              <li class="metric-grid__item" ng-repeat="metric in $ctrl.metrics">
                <span class="metric-grid__label">{{ metric.label }}</span>
                <span class="metric-grid__value">{{ metric.value }}</span>
                <span
                  class="metric-grid__trend"
                  ng-class="{
                    'metric-grid__trend--up': metric.trend === 'up',
                    'metric-grid__trend--down': metric.trend === 'down'
                  }"
                >
                  {{ metric.change }}
                </span>
              </li>
            </ul>
          </article>

          <article class="panel panel--missions">
            <h2 class="panel__title">Missioni prioritarie</h2>
            <ul class="mission-list">
              <li class="mission-card" ng-repeat="mission in $ctrl.missions | limitTo:3">
                <div class="mission-card__header">
                  <span class="mission-card__codename">{{ mission.codename }}</span>
                  <span ng-class="$ctrl.missionBadgeClass(mission.status)" class="mission-card__status-text">
                    {{ mission.status === 'in-progress' ? 'In corso' : mission.status === 'completed' ? 'Completata' : mission.status === 'planned' ? 'Pianificata' : 'Attenzione' }}
                  </span>
                </div>
                <p class="mission-card__summary">{{ mission.summary }}</p>
                <dl class="mission-card__meta">
                  <div>
                    <dt>Comando</dt>
                    <dd>{{ mission.lead }}</dd>
                  </div>
                  <div>
                    <dt>Unità</dt>
                    <dd>{{ mission.operators.join(', ') }}</dd>
                  </div>
                  <div>
                    <dt>Ultimo aggiornamento</dt>
                    <dd>{{ $ctrl.formatTimestamp(mission.lastUpdated) }}</dd>
                  </div>
                </dl>
                <div class="mission-card__actions">
                  <h3>Azioni imminenti</h3>
                  <ul>
                    <li ng-repeat="action in mission.upcomingActions">{{ action }}</li>
                  </ul>
                </div>
              </li>
            </ul>
          </article>

          <article class="panel panel--events">
            <h2 class="panel__title">Registro eventi</h2>
            <ul class="event-log">
              <li class="event-log__item" ng-repeat="entry in $ctrl.events">
                <div class="event-log__time">{{ $ctrl.formatTimestamp(entry.timestamp) }}</div>
                <div class="event-log__content">
                  <span class="event-log__category">{{ entry.category }}</span>
                  <p class="event-log__description">{{ entry.description }}</p>
                </div>
                <span class="event-log__impact-badge" ng-class="$ctrl.eventImpactBadge(entry.impact)">
                  {{ entry.impact }}
                </span>
              </li>
            </ul>
          </article>

          <article class="panel panel--relations">
            <h2 class="panel__title">Specie ↔ Biomi (Prisma)</h2>
            <p class="panel__subtitle">
              Preferenza per backend live via VITE_API_BASE_URL; fallback automatico su dataset mock.
            </p>
            <div class="panel__placeholder" ng-if="$ctrl.speciesBiomeLoading">
              Caricamento relazioni specie/biomi…
            </div>
            <div class="panel__placeholder" ng-if="!$ctrl.speciesBiomeLoading && !$ctrl.speciesBiomes.length">
              Nessuna relazione disponibile al momento.
            </div>
            <ul class="mission-list mission-list--compact" ng-if="!$ctrl.speciesBiomeLoading && $ctrl.speciesBiomes.length">
              <li class="mission-card" ng-repeat="link in $ctrl.speciesBiomes | limitTo:4">
                <div class="mission-card__header">
                  <span class="mission-card__codename">{{ link.species?.name || link.speciesId }}</span>
                  <span class="mission-card__status mission-card__status--planned">
                    {{ link.strength || 'associazione' }}
                  </span>
                </div>
                <p class="mission-card__summary">
                  Habitat prioritario: {{ link.biome?.name || link.biomeId }}
                </p>
                <dl class="mission-card__meta">
                  <div>
                    <dt>Biome ID</dt>
                    <dd>{{ link.biome?.id || link.biomeId }}</dd>
                  </div>
                  <div>
                    <dt>Specie ID</dt>
                    <dd>{{ link.species?.id || link.speciesId }}</dd>
                  </div>
                </dl>
              </li>
            </ul>
            <p class="panel__subtitle" ng-if="$ctrl.speciesBiomeError">{{ $ctrl.speciesBiomeError }}</p>
          </article>
        </section>
      </section>
    `,
  });
};
