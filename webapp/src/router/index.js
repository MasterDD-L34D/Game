import { defineAsyncComponent } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { updateNavigationMeta } from '../state/navigationMeta.js';

const APP_TITLE = 'Evo-Tactics Mission Console';

const FlowShellView = defineAsyncComponent(() => import('../views/FlowShellView.vue'));
const NebulaAtlasView = defineAsyncComponent(() => import('../views/NebulaAtlasView.vue'));
const AtlasLayout = defineAsyncComponent(() => import('../layouts/AtlasLayout.vue'));
const AtlasPokedexView = defineAsyncComponent(() => import('../views/atlas/AtlasPokedexView.vue'));
const AtlasWorldBuilderView = defineAsyncComponent(() => import('../views/atlas/AtlasWorldBuilderView.vue'));
const AtlasEncounterLabView = defineAsyncComponent(() => import('../views/atlas/AtlasEncounterLabView.vue'));

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
        name: 'workflow',
        component: FlowShellView,
        meta: {
          title: 'Workflow Orchestrator',
          description: 'Coordina i passaggi del generatore Nebula e monitora lo stato delle pipeline.',
          breadcrumb: { label: 'Workflow Orchestrator' },
          demo: false,
        },
      },
      {
        path: '/nebula-atlas',
        name: 'nebula-atlas',
        component: NebulaAtlasView,
        meta: {
          title: 'Nebula Atlas Overview',
          description: 'Monitoraggio dataset e telemetria Nebula con fallback in modalità demo.',
          breadcrumb: { label: 'Nebula Atlas Overview' },
          demo: true,
        },
      },
      {
        path: '/atlas',
        name: 'atlas',
        component: AtlasLayout,
        props: (route) => ({
          isDemo: Boolean(route.meta?.demo),
          isOffline: Boolean(route.meta?.offline),
        }),
        meta: {
          title: 'Nebula Atlas',
          description: 'Esplora il dataset Nebula Atlas e le sue sottosezioni operative.',
          breadcrumb: { label: 'Nebula Atlas', to: { name: 'nebula-atlas' } },
          demo: true,
          offline: true,
        },
        children: [
          {
            path: '',
            redirect: { name: 'atlas-pokedex' },
          },
          {
            path: 'pokedex',
            name: 'atlas-pokedex',
            component: AtlasPokedexView,
            meta: {
              title: 'Atlas · Pokédex Nebula',
              description: 'Catalogo delle specie Nebula pronte per la convalida.',
              breadcrumb: { label: 'Pokédex Nebula' },
              demo: true,
            },
          },
          {
            path: 'world-builder',
            name: 'atlas-world-builder',
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
            name: 'atlas-encounter-lab',
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
        redirect: { name: 'workflow' },
        meta: {
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
