import { createRouter, createWebHistory } from 'vue-router';
import { updateNavigationMeta } from '../state/navigationMeta.js';

const APP_TITLE = 'Evo-Tactics Mission Console';

const ConsoleHubView = () => import('../views/ConsoleHubView.vue');
const FlowShellView = () => import('../views/FlowShellView.vue');
const AtlasLayout = () => import('../layouts/AtlasLayout.vue');
const AtlasOverviewView = () => import('../views/atlas/AtlasOverviewView.vue');
const AtlasPokedexView = () => import('../views/atlas/AtlasPokedexView.vue');
const AtlasWorldBuilderView = () => import('../views/atlas/AtlasWorldBuilderView.vue');
const AtlasEncounterLabView = () => import('../views/atlas/AtlasEncounterLabView.vue');
const AtlasTelemetryView = () => import('../views/atlas/AtlasTelemetryView.vue');
const AtlasGeneratorView = () => import('../views/atlas/AtlasGeneratorView.vue');
const NotFoundView = () => import('../views/NotFoundView.vue');

function buildBreadcrumbs(to, router) {
  return to.matched
    .filter((record) => record.meta && record.meta.breadcrumb !== false)
    .map((record, index, array) => {
      const breadcrumbMeta = record.meta?.breadcrumb || {};
      const label = breadcrumbMeta.label || record.meta?.title || record.name || record.path || '—';
      const target =
        breadcrumbMeta.to ||
        (record.name
          ? { name: record.name, params: to.params, query: to.query }
          : { path: record.path });
      const resolved = target ? router.resolve(target) : null;
      return {
        key: record.name || record.path || String(index),
        label,
        to: target,
        href: resolved ? resolved.href : null,
        current: index === array.length - 1,
        demo: Boolean(record.meta?.demo),
      };
    });
}

export function createAppRouter({ base, history } = {}) {
  const resolvedHistory = history || createWebHistory(base ?? import.meta.env.BASE_URL);

  const router = createRouter({
    history: resolvedHistory,
    routes: [
      {
        path: '/',
        redirect: { name: 'console-home' },
      },
      {
        path: '/console',
        name: 'console-home',
        component: ConsoleHubView,
        meta: {
          title: 'Mission Console',
          description: 'Hub centrale per il coordinamento dei workflow e dei moduli Nebula.',
          breadcrumb: { label: 'Mission Console' },
        },
      },
      {
        path: '/console/flow',
        name: 'console-flow',
        component: FlowShellView,
        meta: {
          title: 'Workflow Orchestrator',
          description: 'Coordina i passaggi del generatore Nebula e monitora lo stato delle pipeline.',
          breadcrumb: { label: 'Workflow Orchestrator', to: { name: 'console-home' } },
        },
      },
      {
        path: '/console/atlas',
        name: 'console-atlas',
        component: AtlasLayout,
        props: (route) => ({
          isDemo: Boolean(route.meta?.demo),
          isOffline: Boolean(route.meta?.offline),
        }),
        meta: {
          title: 'Nebula Atlas',
          description: 'Panoramica dataset, telemetria e strumenti Atlas.',
          breadcrumb: { label: 'Nebula Atlas', to: { name: 'console-home' } },
          demo: true,
          offline: true,
        },
        redirect: { name: 'console-atlas-overview' },
        children: [
          {
            path: 'overview',
            name: 'console-atlas-overview',
            component: AtlasOverviewView,
            meta: {
              title: 'Atlas · Overview',
              description: 'Stato generale del dataset e sincronizzazioni Nebula.',
              breadcrumb: { label: 'Overview' },
              demo: true,
            },
          },
          {
            path: 'pokedex',
            name: 'console-atlas-pokedex',
            component: AtlasPokedexView,
            meta: {
              title: 'Atlas · Pokédex Nebula',
              description: 'Catalogo delle specie Nebula pronte per la convalida.',
              breadcrumb: { label: 'Pokédex' },
              demo: true,
            },
          },
          {
            path: 'telemetry',
            name: 'console-atlas-telemetry',
            component: AtlasTelemetryView,
            meta: {
              title: 'Atlas · Telemetria',
              description: 'Monitoraggio eventi, readiness e sincronizzazioni QA.',
              breadcrumb: { label: 'Telemetria' },
              demo: true,
            },
          },
          {
            path: 'generator',
            name: 'console-atlas-generator',
            component: AtlasGeneratorView,
            meta: {
              title: 'Atlas · Generatore',
              description: 'Stato e performance del generatore Nebula.',
              breadcrumb: { label: 'Generatore' },
              demo: true,
            },
          },
          {
            path: 'world-builder',
            name: 'console-atlas-world-builder',
            component: AtlasWorldBuilderView,
            meta: {
              title: 'Atlas · World Builder',
              description: 'Setup dei biomi e dei builder per la generazione di mondi.',
              breadcrumb: { label: 'World Builder' },
              demo: true,
            },
          },
          {
            path: 'encounter-lab',
            name: 'console-atlas-encounter-lab',
            component: AtlasEncounterLabView,
            meta: {
              title: 'Atlas · Encounter Lab',
              description: 'Laboratorio per combinare incontri e pattern di missione.',
              breadcrumb: { label: 'Encounter Lab' },
              demo: true,
            },
          },
        ],
      },
      {
        path: '/:pathMatch(.*)*',
        name: 'not-found',
        component: NotFoundView,
        meta: {
          title: 'Pagina non trovata',
          description: 'La risorsa richiesta non è disponibile.',
          breadcrumb: false,
        },
      },
    ],
  });

  router.afterEach((to) => {
    const meta = to.meta || {};
    const resolvedTitle = meta.title ? `${meta.title} · ${APP_TITLE}` : APP_TITLE;
    if (typeof document !== 'undefined' && typeof document.title === 'string') {
      document.title = resolvedTitle;
    }
    updateNavigationMeta({
      title: meta.title || APP_TITLE,
      description: meta.description || '',
      demo: Boolean(meta.demo),
      breadcrumbs: buildBreadcrumbs(to, router),
    });
  });

  return router;
}

const router = createAppRouter();

export default router;
