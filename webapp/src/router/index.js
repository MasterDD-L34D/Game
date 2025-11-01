import { createRouter, createWebHistory } from 'vue-router';
import { updateNavigationMeta } from '../state/navigationMeta.js';

const APP_TITLE = 'Evo-Tactics Mission Console';
const enableLegacyRoutes = import.meta.env.VITE_ENABLE_LEGACY_CONSOLE_ROUTES === 'true';

const ConsoleLayout = () => import('../layouts/ConsoleLayout.vue');
const ConsoleHubView = () => import('../views/ConsoleHubView.vue');
const FlowShellView = () => import('../views/FlowShellView.vue');
const TraitEditorView = () => import('../views/traits/TraitEditorView.vue');
const AtlasLayout = () => import('../layouts/AtlasLayout.vue');
const AtlasOverviewView = () => import('../views/atlas/AtlasOverviewView.vue');
const AtlasPokedexView = () => import('../views/atlas/AtlasPokedexView.vue');
const AtlasWorldBuilderView = () => import('../views/atlas/AtlasWorldBuilderView.vue');
const AtlasEncounterLabView = () => import('../views/atlas/AtlasEncounterLabView.vue');
const AtlasTelemetryView = () => import('../views/atlas/AtlasTelemetryView.vue');
const AtlasGeneratorView = () => import('../views/atlas/AtlasGeneratorView.vue');
const NotFoundView = () => import('../views/NotFound.vue');

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
      };
    });
}

function buildStateTokens(to) {
  const seen = new Set();
  const tokens = [];
  to.matched.forEach((record) => {
    const recordTokens = Array.isArray(record.meta?.stateTokens) ? record.meta.stateTokens : [];
    recordTokens.forEach((token) => {
      const id = token.id || token.label;
      if (!id || seen.has(id)) {
        return;
      }
      seen.add(id);
      tokens.push({ id, label: token.label, variant: token.variant, icon: token.icon });
    });
  });
  return tokens;
}

export function createAppRouter({ base, history } = {}) {
  const resolvedHistory = history || createWebHistory(base ?? import.meta.env.BASE_URL);

  const routes = [
    {
      path: '/',
      redirect: { name: 'console-home' },
    },
    {
      path: '/console',
      component: ConsoleLayout,
      meta: {
        breadcrumb: { label: 'Mission Console', to: { name: 'console-home' } },
      },
      children: [
        {
          path: '',
          name: 'console-home',
          component: ConsoleHubView,
          meta: {
            title: 'Mission Console',
            description: 'Hub centrale per il coordinamento dei workflow e dei moduli Nebula.',
            breadcrumb: false,
          },
        },
        {
          path: 'flow',
          name: 'console-flow',
          component: FlowShellView,
          meta: {
            title: 'Workflow Orchestrator',
            description: 'Coordina i passaggi del generatore Nebula e monitora lo stato delle pipeline.',
            breadcrumb: { label: 'Workflow Orchestrator' },
            stateTokens: [
              { id: 'flow-live', label: 'Pipeline live', variant: 'info', icon: '⟳' },
            ],
          },
        },
        {
          path: 'traits/:traitId?',
          name: 'console-traits-editor',
          component: TraitEditorView,
          props: (route) => ({
            traitId: typeof route.params.traitId === 'string' ? route.params.traitId : undefined,
          }),
          meta: {
            title: 'Trait Editor',
            description: 'Editor schema-driven per aggiornare i tratti Nebula.',
            breadcrumb: { label: 'Trait Editor' },
            stateTokens: [
              { id: 'traits-editor', label: 'Dataset live', variant: 'warning', icon: '✎' },
            ],
          },
        },
        {
          path: 'atlas',
          name: 'console-atlas',
          component: AtlasLayout,
          props: (route) => ({
            isDemo: Boolean(route.meta?.demo),
            isOffline: Boolean(route.meta?.offline),
          }),
          meta: {
            title: 'Nebula Atlas',
            description: 'Panoramica dataset, telemetria e strumenti Atlas.',
            breadcrumb: { label: 'Nebula Atlas' },
            demo: true,
            offline: true,
            stateTokens: [
              { id: 'atlas-demo', label: 'Modalità demo', variant: 'info', icon: '◎' },
              { id: 'atlas-offline', label: 'Dataset offline', variant: 'warning', icon: '⚠' },
            ],
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
              },
            },
          ],
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
  ];

  if (enableLegacyRoutes) {
    routes.push(
      { path: '/flow', redirect: { name: 'console-flow' } },
      { path: '/atlas', redirect: { name: 'console-atlas-overview' } },
      { path: '/atlas/overview', redirect: { name: 'console-atlas-overview' } },
      { path: '/atlas/pokedex', redirect: { name: 'console-atlas-pokedex' } },
      { path: '/atlas/telemetry', redirect: { name: 'console-atlas-telemetry' } },
      { path: '/atlas/generator', redirect: { name: 'console-atlas-generator' } },
      { path: '/atlas/world-builder', redirect: { name: 'console-atlas-world-builder' } },
      { path: '/atlas/encounter-lab', redirect: { name: 'console-atlas-encounter-lab' } },
    );
  }

  const router = createRouter({
    history: resolvedHistory,
    routes,
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
      demo: to.matched.some((record) => record.meta?.demo),
      breadcrumbs: buildBreadcrumbs(to, router),
      tokens: buildStateTokens(to),
    });
  });

  return router;
}

const router = createAppRouter();

export default router;
