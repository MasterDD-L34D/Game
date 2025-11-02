import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalizedLoaded,
  type RouteLocationRaw,
  type Router,
  type RouteRecordRaw,
} from 'vue-router';

import { updateNavigationMeta } from '../state/navigationMeta';

const APP_TITLE = 'Evo-Tactics Mission Console';
const enableLegacyRoutes = import.meta.env.VITE_ENABLE_LEGACY_CONSOLE_ROUTES === 'true';

type AsyncViewFactory<T> = (() => Promise<T>) & { preload: () => Promise<T> };

function createLazyView<T>(loader: () => Promise<T>): AsyncViewFactory<T> {
  let promise: Promise<T> | null = null;
  const load = () => {
    if (!promise) {
      promise = loader()
        .then((value) => value)
        .catch((error) => {
          promise = null;
          throw error;
        });
    }
    return promise;
  };
  const factory = (() => load()) as AsyncViewFactory<T>;
  factory.preload = () => load();
  return factory;
}

function warmup(loader: () => Promise<unknown>): Promise<void> {
  try {
    const result = loader();
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      return (result as Promise<unknown>).then(() => undefined).catch(() => undefined);
    }
  } catch {
    // ignorato
  }
  return Promise.resolve();
}

type PrefetchSection = 'flow' | 'nebula' | 'atlas';

const ConsoleLayout = createLazyView(() => import('../layouts/ConsoleLayout.vue'));
const ConsoleHubView = createLazyView(() => import('../views/ConsoleHubView.vue'));
const FlowShellView = createLazyView(() => import('../views/FlowShellView.vue'));
const TraitEditorView = createLazyView(() => import('../views/traits/TraitEditorView.vue'));
const AtlasLayout = createLazyView(() => import('../layouts/AtlasLayout.vue'));
const AtlasOverviewView = createLazyView(() => import('../views/atlas/AtlasOverviewView.vue'));
const AtlasPokedexView = createLazyView(() => import('../views/atlas/AtlasPokedexView.vue'));
const AtlasWorldBuilderView = createLazyView(() => import('../views/atlas/AtlasWorldBuilderView.vue'));
const AtlasEncounterLabView = createLazyView(() => import('../views/atlas/AtlasEncounterLabView.vue'));
const AtlasTelemetryView = createLazyView(() => import('../views/atlas/AtlasTelemetryView.vue'));
const AtlasGeneratorView = createLazyView(() => import('../views/atlas/AtlasGeneratorView.vue'));
const NotFoundView = createLazyView(() => import('../views/NotFound.vue'));

const prefetchedSections = new Set<PrefetchSection>();

const sectionPreloaders: Record<PrefetchSection, () => Promise<void>> = {
  flow: () => warmup(() => FlowShellView.preload()),
  nebula: () =>
    Promise.all([warmup(() => ConsoleHubView.preload()), warmup(() => TraitEditorView.preload())]).then(
      () => undefined,
    ),
  atlas: () =>
    Promise.all([
      warmup(() => AtlasLayout.preload()),
      warmup(() => AtlasOverviewView.preload()),
      warmup(() => AtlasPokedexView.preload()),
      warmup(() => AtlasTelemetryView.preload()),
      warmup(() => AtlasGeneratorView.preload()),
      warmup(() => AtlasWorldBuilderView.preload()),
      warmup(() => AtlasEncounterLabView.preload()),
      warmup(async () => {
        const module = await import('../state/atlasDataset');
        if (typeof module.preloadAtlasDataset === 'function') {
          await module.preloadAtlasDataset();
        }
      }),
    ]).then(() => undefined),
};

function schedulePrefetch(sections: PrefetchSection[]) {
  const targets = sections.filter((section) => !prefetchedSections.has(section));
  if (!targets.length) {
    return;
  }

  const runner = () => {
    targets.forEach((section) => {
      const loader = sectionPreloaders[section];
      if (loader) {
        prefetchedSections.add(section);
        void loader();
      }
    });
  };

  if (typeof window !== 'undefined') {
    const win = window as typeof window & { requestIdleCallback?: (cb: () => void) => number };
    if (typeof win.requestIdleCallback === 'function') {
      win.requestIdleCallback(() => runner());
      return;
    }
    win.setTimeout(() => runner(), 120);
    return;
  }

  runner();
}

type BreadcrumbEntry = {
  key: string;
  label: string;
  to: RouteLocationRaw | null;
  href: string | null;
  current: boolean;
};

function buildBreadcrumbs(to: RouteLocationNormalizedLoaded, router: Router): BreadcrumbEntry[] {
  return to.matched
    .filter((record) => record.meta && record.meta.breadcrumb !== false)
    .map((record, index, array) => {
      const breadcrumbMeta = record.meta?.breadcrumb || {};
      const label =
        breadcrumbMeta.label || record.meta?.title || record.name?.toString() || record.path || '—';
      const target: RouteLocationRaw | null = breadcrumbMeta.to
        ? breadcrumbMeta.to
        : record.name
        ? { name: record.name, params: to.params, query: to.query }
        : record.path
        ? { path: record.path }
        : null;
      const resolved = target ? router.resolve(target) : null;
      return {
        key: record.name?.toString() || record.path || String(index),
        label,
        to: target,
        href: resolved ? resolved.href : null,
        current: index === array.length - 1,
      };
    });
}

type NavigationToken = {
  id: string;
  label: string;
  variant?: string;
  icon?: string;
};

function buildStateTokens(to: RouteLocationNormalizedLoaded): NavigationToken[] {
  const seen = new Set<string>();
  const tokens: NavigationToken[] = [];
  to.matched.forEach((record) => {
    const recordTokens = Array.isArray(record.meta?.stateTokens) ? record.meta.stateTokens : [];
    recordTokens.forEach((token) => {
      const id = token?.id || token?.label;
      if (!id || seen.has(id)) {
        return;
      }
      seen.add(id);
      tokens.push({
        id,
        label: token?.label || id,
        variant: token?.variant,
        icon: token?.icon,
      });
    });
  });
  return tokens;
}

export function createAppRouter({ base, history }: { base?: string; history?: Router['history'] } = {}): Router {
  const resolvedHistory = history || createWebHistory(base ?? import.meta.env.BASE_URL);

  const routes: RouteRecordRaw[] = [
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
            prefetchSections: ['flow', 'atlas', 'nebula'],
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
            prefetchSections: ['atlas'],
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
            prefetchSections: ['flow'],
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
            prefetchSections: ['atlas'],
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

    const sectionsToPrefetch = new Set<PrefetchSection>();
    to.matched.forEach((record) => {
      const recordSections = record.meta?.prefetchSections as PrefetchSection[] | undefined;
      if (!Array.isArray(recordSections)) {
        return;
      }
      recordSections
        .map((section) => section as PrefetchSection)
        .filter((section) => sectionPreloaders[section])
        .forEach((section) => sectionsToPrefetch.add(section));
    });
    if (sectionsToPrefetch.size) {
      schedulePrefetch(Array.from(sectionsToPrefetch));
    }
  });

  return router;
}

const router = createAppRouter();

export default router;
