const __vite__mapDeps = (
  i,
  m = __vite__mapDeps,
  d = m.f ||
    (m.f = [
      './ConsoleLayout-DlzuoKJm.js',
      './atlas-CH8HkhBa.js',
      './flow-Denzei7K.js',
      './flow-RgsO4VOs.css',
      './atlas-BqUO8nWC.css',
      './ConsoleLayout-CDhkElz3.css',
      './nebula-CRDtC5Lv.js',
      './nebula-DsBaIT7I.css',
      './NotFound-LDPnfSmb.js',
      './NotFound-B5_ol9Z3.css',
    ]),
) => i.map((i) => d[i]);
import {
  _ as Z,
  c as I,
  k as f,
  x as V,
  l as d,
  m as E,
  u as p,
  F as M,
  n as F,
  R as U,
  V as j,
  q as A,
  a7 as _e,
  j as B,
  S as Ge,
  w as Ye,
  a8 as He,
  a9 as Je,
  U as Qe,
  p as Ke,
  a4 as Ue,
  a5 as je,
  aa as Xe,
  ab as Ze,
  ac as et,
  ad as tt,
  ae as v,
  af as at,
  C as S,
  ag as nt,
  ah as rt,
} from './atlas-CH8HkhBa.js';
import { a as ee, c as it } from './flow-Denzei7K.js';
(function () {
  const t = document.createElement('link').relList;
  if (t && t.supports && t.supports('modulepreload')) return;
  for (const n of document.querySelectorAll('link[rel="modulepreload"]')) r(n);
  new MutationObserver((n) => {
    for (const i of n)
      if (i.type === 'childList')
        for (const o of i.addedNodes) o.tagName === 'LINK' && o.rel === 'modulepreload' && r(o);
  }).observe(document, { childList: !0, subtree: !0 });
  function a(n) {
    const i = {};
    return (
      n.integrity && (i.integrity = n.integrity),
      n.referrerPolicy && (i.referrerPolicy = n.referrerPolicy),
      n.crossOrigin === 'use-credentials'
        ? (i.credentials = 'include')
        : n.crossOrigin === 'anonymous'
          ? (i.credentials = 'omit')
          : (i.credentials = 'same-origin'),
      i
    );
  }
  function r(n) {
    if (n.ep) return;
    n.ep = !0;
    const i = a(n);
    fetch(n.href, i);
  }
})();
const ot = ['aria-label'],
  st = ['aria-label'],
  lt = { class: 'app-breadcrumbs__list', role: 'list' },
  ct = ['data-current', 'aria-current'],
  ut = { key: 1, class: 'app-breadcrumbs__current', 'aria-current': 'page' },
  dt = { class: 'app-breadcrumbs__meta' },
  pt = { key: 0, class: 'app-breadcrumbs__description' },
  mt = ['aria-label'],
  ft = {
    __name: 'AppBreadcrumbs',
    props: {
      items: { type: Array, default: () => [] },
      description: { type: String, default: '' },
      tokens: { type: Array, default: () => [] },
    },
    setup(e) {
      const t = e,
        a = I(() =>
          t.items.map((s, c) => ({
            key: s.key ?? `${s.label}-${c}`,
            label: s.label,
            to: s.to,
            current: !!s.current,
          })),
        ),
        r = I(() => t.description),
        n = I(() => t.tokens),
        i = I(() => a.value.length > 0 || !!r.value || n.value.length > 0),
        { t: o } = ee();
      return (s, c) =>
        i.value
          ? (d(),
            f(
              'section',
              { key: 0, class: 'app-breadcrumbs', 'aria-label': p(o)('breadcrumbs.sectionLabel') },
              [
                a.value.length
                  ? (d(),
                    f(
                      'nav',
                      {
                        key: 0,
                        class: 'app-breadcrumbs__nav',
                        'aria-label': p(o)('breadcrumbs.navLabel'),
                      },
                      [
                        E('ol', lt, [
                          (d(!0),
                          f(
                            M,
                            null,
                            F(
                              a.value,
                              (l) => (
                                d(),
                                f(
                                  'li',
                                  {
                                    key: l.key,
                                    class: 'app-breadcrumbs__item',
                                    'data-current': l.current,
                                    role: 'listitem',
                                    'aria-current': l.current ? 'page' : void 0,
                                  },
                                  [
                                    l.current
                                      ? (d(), f('span', ut, A(l.label), 1))
                                      : (d(),
                                        U(
                                          p(_e),
                                          {
                                            key: 0,
                                            to: l.to,
                                            class: 'app-breadcrumbs__link',
                                            'aria-label': p(o)('breadcrumbs.goTo', {
                                              label: l.label,
                                            }),
                                          },
                                          {
                                            default: j(() => [E('span', null, A(l.label), 1)]),
                                            _: 2,
                                          },
                                          1032,
                                          ['to', 'aria-label'],
                                        )),
                                  ],
                                  8,
                                  ct,
                                )
                              ),
                            ),
                            128,
                          )),
                        ]),
                      ],
                      8,
                      st,
                    ))
                  : V('', !0),
                E('div', dt, [
                  r.value ? (d(), f('p', pt, A(r.value), 1)) : V('', !0),
                  n.value.length
                    ? (d(),
                      f(
                        'ul',
                        {
                          key: 1,
                          class: 'app-breadcrumbs__tokens',
                          'aria-label': p(o)('breadcrumbs.contextState'),
                          role: 'list',
                        },
                        [
                          (d(!0),
                          f(
                            M,
                            null,
                            F(
                              n.value,
                              (l) => (
                                d(),
                                f('li', { key: l.id }, [
                                  B(
                                    Ge,
                                    { label: l.label, variant: l.variant, icon: l.icon },
                                    null,
                                    8,
                                    ['label', 'variant', 'icon'],
                                  ),
                                ])
                              ),
                            ),
                            128,
                          )),
                        ],
                        8,
                        mt,
                      ))
                    : V('', !0),
                ]),
              ],
              8,
              ot,
            ))
          : V('', !0);
    },
  },
  vt = Z(ft, [['__scopeId', 'data-v-53114ea6']]),
  bt = {
    title: 'Evo-Tactics Mission Console',
    nav: {
      ariaLabel: 'Main sections',
      missionConsole: 'Mission Console',
      workflow: 'Workflow Orchestrator',
      traits: 'Trait Editor',
      atlas: 'Nebula Atlas',
    },
    languageSelector: { label: 'Language', options: { it: 'Italian', en: 'English' } },
  },
  ht = {
    sectionLabel: 'Page context',
    navLabel: 'Application path',
    contextState: 'Context state',
    goTo: 'Go to {label}',
  },
  gt = {
    nebulaProgress: {
      header: {
        datasetLabel: 'Dataset · {datasetId}',
        releaseWindow: 'Release window',
        curator: 'Curator',
      },
      telemetry: {
        title: 'Evolution progress bar',
        description: 'Telemetry & readiness synchronized with the orchestrator.',
        demoBadge: 'Demo',
        summaryLabel: 'Telemetry {name}',
        owner: 'Owner: {owner}',
        statusLive: 'Telemetry live',
        statusDemo: 'Telemetry in demo mode',
        offlineAnnouncement: '{label}.',
        offlineAnnouncementWithEntries: '{label}. Demo dataset for {entries}.',
        demoAnnouncement: 'Demo telemetry active for {entries}.',
      },
      actions: {
        copyCanvas: 'Copy Canvas snippet',
        exportJson: 'Export JSON',
        copySuccess: 'Snippet copied!',
        copyFailure: 'Unable to copy automatically',
        exportSuccess: 'JSON export generated',
      },
    },
  },
  _t = {
    consoleHub: {
      hero: {
        title: 'Mission Console',
        body: 'Manage the Nebula lifecycle orchestrating generation, QA and monitoring from dedicated modules.',
      },
      grid: {
        ariaLabel: 'Primary areas',
        flow: {
          title: 'Workflow Orchestrator',
          description: 'Sequence species generation, validation and publishing steps.',
          cta: 'Open flow →',
        },
        traits: {
          title: 'Trait Editor',
          description: 'Edit canonical traits with real-time schema validation.',
          cta: 'Open editor →',
        },
        atlas: {
          title: 'Nebula Atlas',
          description: 'Browse datasets, telemetry and dedicated lab tools.',
          cta: 'Go to Atlas →',
        },
        telemetry: {
          title: 'Live telemetry',
          description: 'Monitor QA events, readiness and generator syncs.',
          cta: 'Open dashboard →',
        },
        generator: {
          title: 'Nebula generator',
          description: 'Check status, metrics and species generation trends.',
          cta: 'View metrics →',
        },
      },
    },
    notFound: {
      tag: 'Error 404',
      title: 'Page not found',
      body: 'The resource you are looking for has been moved or is no longer available within the mission console.',
      cta: 'Back to console',
    },
    biomes: {
      tabs: { grid: 'Biomes', validators: 'Validators' },
      cards: {
        orchestrator: 'Orchestrator status',
        traits: 'Traits & affinities',
        hazards: 'Key hazards',
      },
      actions: { resetFilters: 'Reset filters' },
      metrics: {
        readiness: 'Readiness',
        riskLabel: 'Risk {value}',
        activeBiomes: 'Active biomes',
        readinessCoverage: 'Readiness coverage',
        riskAverage: 'Average risk',
        activeFilters: 'Active filters',
      },
      validator: {
        feedTitle: 'Runtime validator feed',
        feedDescription: 'Cross-monitoring of all anomalies.',
      },
      fallbacks: { hazard: 'Hazard n/a' },
    },
    species: {
      header: {
        title: 'Priority species',
        body: 'Current curation and shortlist of selected organisms.',
      },
      sidebar: {
        title: 'Orchestrator insight',
        tabs: { overview: 'Overview', synergy: 'Synergy', qa: 'QA' },
        emptyTelemetry: 'No telemetry available.',
        request: {
          id: 'Orchestrator ID',
          biome: 'Biome',
          fallback: 'Fallback',
          fallbackStates: { unknown: 'Not calculated', enabled: 'Enabled', disabled: 'Not used' },
        },
        shortlist: 'Shortlist',
        emptySynergy: 'No synergy recorded in the catalogue.',
        compliance: { title: 'Trait QA snapshot', updated: 'Updated {timestamp}' },
        telemetry: {
          curated: {
            label: 'Curated species',
            description: 'Confirmed species over orchestrated total',
          },
          coverage: {
            label: 'Shortlist coverage',
            descriptionFallback: 'Shortlist/curation alignment',
          },
          phaseFallback: 'Phase {index}',
        },
        qa: {
          title: 'Runtime validation',
          messages: '{count} messages',
          intro: 'Curated blueprint with runtime results. Preview of the first three events.',
          empty: 'No validator messages for the last generation.',
          counters: {
            errors: '❗ Errors',
            warnings: '⚠ Warnings',
            corrected: '🔧 Corrected',
            discarded: '🗑 Discarded',
          },
          syncing: 'Synchronising coverage…',
        },
      },
      errors: { generic: '{message}' },
    },
  },
  yt = { app: bt, breadcrumbs: ht, components: gt, views: _t },
  Et = {
    title: 'Evo-Tactics Mission Console',
    nav: {
      ariaLabel: 'Sezioni principali',
      missionConsole: 'Mission Console',
      workflow: 'Workflow Orchestrator',
      traits: 'Trait Editor',
      atlas: 'Nebula Atlas',
    },
    languageSelector: { label: 'Lingua', options: { it: 'Italiano', en: 'Inglese' } },
  },
  Tt = {
    sectionLabel: 'Contestualizzazione pagina',
    navLabel: 'Percorso applicazione',
    contextState: 'Stato contesto',
    goTo: 'Vai a {label}',
  },
  wt = {
    nebulaProgress: {
      header: {
        datasetLabel: 'Dataset · {datasetId}',
        releaseWindow: 'Release window',
        curator: 'Curator',
      },
      telemetry: {
        title: 'Progress bar evolutiva',
        description: 'Telemetria & readiness sincronizzate con orchestrator.',
        demoBadge: 'Demo',
        summaryLabel: 'Telemetria {name}',
        owner: 'Owner: {owner}',
        statusLive: 'Telemetria live',
        statusDemo: 'Telemetria in modalità demo',
        offlineAnnouncement: '{label}.',
        offlineAnnouncementWithEntries: '{label}. Dataset demo per {entries}.',
        demoAnnouncement: 'Telemetria demo attiva per {entries}.',
      },
      actions: {
        copyCanvas: 'Copia snippet Canvas',
        exportJson: 'Export JSON',
        copySuccess: 'Snippet copiato!',
        copyFailure: 'Impossibile copiare automaticamente',
        exportSuccess: 'Export JSON generato',
      },
    },
  },
  St = {
    consoleHub: {
      hero: {
        title: 'Mission Console',
        body: 'Gestisci il ciclo di vita di Nebula orchestrando generazione, QA e monitoraggio dai moduli dedicati.',
      },
      grid: {
        ariaLabel: 'Aree principali',
        flow: {
          title: 'Workflow Orchestrator',
          description: 'Sequenzia i passaggi di generazione specie, validazione e publishing.',
          cta: 'Apri flusso →',
        },
        traits: {
          title: 'Trait Editor',
          description: 'Modifica i tratti canonici con validazione schema in tempo reale.',
          cta: 'Apri editor →',
        },
        atlas: {
          title: 'Nebula Atlas',
          description: 'Consulta dataset, telemetria e strumenti di laboratorio dedicati.',
          cta: "Vai all'Atlas →",
        },
        telemetry: {
          title: 'Telemetria live',
          description: 'Monitoraggio eventi QA, readiness e sincronizzazioni generator.',
          cta: 'Apri dashboard →',
        },
        generator: {
          title: 'Generatore Nebula',
          description: 'Controlla stato, metriche e trend di generazione delle specie.',
          cta: 'Consulta metriche →',
        },
      },
    },
    notFound: {
      tag: 'Errore 404',
      title: 'Pagina non trovata',
      body: "La risorsa che stai cercando è stata spostata oppure non è più disponibile all'interno della console missione.",
      cta: 'Torna alla console',
    },
    biomes: {
      tabs: { grid: 'Biomi', validators: 'Validatori' },
      cards: {
        orchestrator: 'Stato orchestrator',
        traits: 'Tratti & affinità',
        hazards: 'Hazard principali',
      },
      actions: { resetFilters: 'Reset filtri' },
      metrics: {
        readiness: 'Readiness',
        riskLabel: 'Rischio {value}',
        activeBiomes: 'Biomi attivi',
        readinessCoverage: 'Copertura readiness',
        riskAverage: 'Rischio medio',
        activeFilters: 'Filtri attivi',
      },
      validator: {
        feedTitle: 'Feed validator runtime',
        feedDescription: 'Monitoraggio incrociato di tutte le anomalie.',
      },
      fallbacks: { hazard: 'Hazard n/d' },
    },
    species: {
      header: {
        title: 'Specie prioritario',
        body: 'Curazione attuale e shortlist degli organismi selezionati.',
      },
      sidebar: {
        title: 'Orchestrator insight',
        tabs: { overview: 'Panoramica', synergy: 'Sinergia', qa: 'QA' },
        emptyTelemetry: 'Nessuna telemetria disponibile.',
        request: {
          id: 'ID orchestrator',
          biome: 'Bioma',
          fallback: 'Fallback',
          fallbackStates: {
            unknown: 'Non calcolato',
            enabled: 'Attivato',
            disabled: 'Non utilizzato',
          },
        },
        shortlist: 'Shortlist',
        emptySynergy: 'Nessuna sinergia registrata nel catalogo.',
        compliance: { title: 'Trait QA snapshot', updated: 'Aggiornato {timestamp}' },
        telemetry: {
          curated: {
            label: 'Specie curate',
            description: 'Specie confermate su totale orchestrato',
          },
          coverage: {
            label: 'Copertura shortlist',
            descriptionFallback: 'Allineamento shortlist/curazione',
          },
          phaseFallback: 'Fase {index}',
        },
        qa: {
          title: 'Validazione runtime',
          messages: '{count} messaggi',
          intro: 'Blueprint curato con risultati runtime. Anteprima dei primi tre eventi.',
          empty: "Nessun messaggio dai validator per l'ultima generazione.",
          counters: {
            errors: '❗ Errori',
            warnings: '⚠ Warning',
            corrected: '🔧 Correzioni',
            discarded: '🗑 Scartati',
          },
          syncing: 'Sincronizzazione della coverage in corso…',
        },
      },
      errors: { generic: '{message}' },
    },
  },
  At = { app: Et, breadcrumbs: Tt, components: wt, views: St },
  ye = 'mission-console:locale',
  re = 'it',
  Lt = 'en',
  It = [
    { code: 'it', name: 'Italiano' },
    { code: 'en', name: 'English' },
  ],
  Ct = { en: yt, it: At };
function Rt() {
  var a, r, n;
  if (typeof window > 'u') return re;
  const e = window.localStorage.getItem(ye);
  if (e && (e === 'it' || e === 'en')) return e;
  const t =
    ((r = (a = window.navigator) == null ? void 0 : a.languages) == null ? void 0 : r[0]) ||
    ((n = window.navigator) == null ? void 0 : n.language);
  if (t) {
    if (t.toLowerCase().startsWith('it')) return 'it';
    if (t.toLowerCase().startsWith('en')) return 'en';
  }
  return re;
}
function Ot() {
  const e = Rt(),
    t = it({ legacy: !1, locale: e, fallbackLocale: Lt, messages: Ct });
  if (typeof window < 'u') {
    const { locale: a } = t.global;
    Ye(
      a,
      (r) => {
        ((r === 'it' || r === 'en') && window.localStorage.setItem(ye, r),
          typeof document < 'u' && document.documentElement.setAttribute('lang', r));
      },
      { immediate: !0 },
    );
  }
  return t;
}
const Pt = { class: 'language-selector' },
  kt = { class: 'language-selector__label' },
  Nt = ['value', 'aria-label'],
  Vt = ['value'],
  zt = {
    __name: 'LanguageSelector',
    setup(e) {
      const { locale: t, t: a } = ee(),
        r = I(() => It.map((i) => i.code));
      function n(i) {
        var s;
        const o = (s = i.target) == null ? void 0 : s.value;
        o && r.value.includes(o) && (t.value = o);
      }
      return (i, o) => (
        d(),
        f('label', Pt, [
          E('span', kt, A(p(a)('app.languageSelector.label')), 1),
          E(
            'select',
            {
              class: 'language-selector__control',
              value: p(t),
              onChange: n,
              'aria-label': p(a)('app.languageSelector.label'),
            },
            [
              (d(!0),
              f(
                M,
                null,
                F(
                  r.value,
                  (s) => (
                    d(),
                    f(
                      'option',
                      { key: s, value: s },
                      A(p(a)(`app.languageSelector.options.${s}`)),
                      9,
                      Vt,
                    )
                  ),
                ),
                128,
              )),
            ],
            40,
            Nt,
          ),
        ])
      );
    },
  },
  Bt = Z(zt, [['__scopeId', 'data-v-68f6f1bf']]),
  Dt = { class: 'app-shell' },
  Mt = { class: 'app-shell__header' },
  Ft = { class: 'app-shell__header-top' },
  xt = { class: 'app-shell__title' },
  $t = ['aria-label'],
  qt = { class: 'app-shell__main' },
  Wt = {
    __name: 'App',
    setup(e) {
      const t = He(),
        { breadcrumbs: a, description: r, tokens: n } = Je(),
        { t: i } = ee(),
        o = I(() => {
          const s = t.name;
          return [
            {
              name: 'console-home',
              to: { name: 'console-home' },
              label: i('app.nav.missionConsole'),
              active: s === 'console-home',
            },
            {
              name: 'console-flow',
              to: { name: 'console-flow' },
              label: i('app.nav.workflow'),
              active: s === 'console-flow',
            },
            {
              name: 'console-traits-editor',
              to: { name: 'console-traits-editor' },
              label: i('app.nav.traits'),
              active: s ? String(s).startsWith('console-traits-editor') : !1,
            },
            {
              name: 'console-atlas',
              to: { name: 'console-atlas-overview' },
              label: i('app.nav.atlas'),
              active: s ? String(s).startsWith('console-atlas') : !1,
            },
          ];
        });
      return (s, c) => (
        d(),
        f('div', Dt, [
          E('header', Mt, [
            E('div', Ft, [E('h1', xt, A(p(i)('app.title')), 1), B(Bt)]),
            E(
              'nav',
              { class: 'app-shell__nav', 'aria-label': p(i)('app.nav.ariaLabel') },
              [
                (d(!0),
                f(
                  M,
                  null,
                  F(
                    o.value,
                    (l) => (
                      d(),
                      U(
                        p(_e),
                        {
                          key: l.name,
                          to: l.to,
                          class: Ke([
                            'app-shell__nav-link',
                            { 'app-shell__nav-link--active': l.active },
                          ]),
                          'aria-current': l.active ? 'page' : void 0,
                        },
                        { default: j(() => [Qe(A(l.label), 1)]), _: 2 },
                        1032,
                        ['to', 'class', 'aria-current'],
                      )
                    ),
                  ),
                  128,
                )),
              ],
              8,
              $t,
            ),
            B(vt, { items: p(a), description: p(r), tokens: p(n) }, null, 8, [
              'items',
              'description',
              'tokens',
            ]),
          ]),
          E('main', qt, [
            B(p(Ze), null, {
              default: j((l) => [(d(), U(Ue(l.Component), je(Xe(l.route.props || {})), null, 16))]),
              _: 1,
            }),
          ]),
        ])
      );
    },
  },
  Gt = Z(Wt, [['__scopeId', 'data-v-709bae55']]),
  Y = 'Evo-Tactics Mission Console';
function g(e) {
  let t = null;
  const a = () => t ?? (t = e()),
    r = () => a();
  return ((r.preload = () => a()), r);
}
function _(e) {
  try {
    const t = e();
    if (t && typeof t.then == 'function') return t.then(() => {}).catch(() => {});
  } catch {}
  return Promise.resolve();
}
const Yt = g(() =>
    v(
      () => import('./ConsoleLayout-DlzuoKJm.js'),
      __vite__mapDeps([0, 1, 2, 3, 4, 5]),
      import.meta.url,
    ),
  ),
  Ee = g(() =>
    v(
      () => import('./nebula-CRDtC5Lv.js').then((e) => e.C),
      __vite__mapDeps([6, 1, 2, 3, 4, 7]),
      import.meta.url,
    ),
  ),
  Te = g(() =>
    v(
      () => import('./flow-Denzei7K.js').then((e) => e.F),
      __vite__mapDeps([2, 1, 4, 3]),
      import.meta.url,
    ),
  ),
  we = g(() =>
    v(
      () => import('./nebula-CRDtC5Lv.js').then((e) => e.T),
      __vite__mapDeps([6, 1, 2, 3, 4, 7]),
      import.meta.url,
    ),
  ),
  Se = g(() =>
    v(
      () => import('./atlas-CH8HkhBa.js').then((e) => e.aj),
      __vite__mapDeps([1, 2, 3, 4]),
      import.meta.url,
    ),
  ),
  Ae = g(() =>
    v(
      () => import('./atlas-CH8HkhBa.js').then((e) => e.ak),
      __vite__mapDeps([1, 2, 3, 4]),
      import.meta.url,
    ),
  ),
  Le = g(() =>
    v(
      () => import('./atlas-CH8HkhBa.js').then((e) => e.al),
      __vite__mapDeps([1, 2, 3, 4]),
      import.meta.url,
    ),
  ),
  Ie = g(() =>
    v(
      () => import('./atlas-CH8HkhBa.js').then((e) => e.am),
      __vite__mapDeps([1, 2, 3, 4]),
      import.meta.url,
    ),
  ),
  Ce = g(() =>
    v(
      () => import('./atlas-CH8HkhBa.js').then((e) => e.an),
      __vite__mapDeps([1, 2, 3, 4]),
      import.meta.url,
    ),
  ),
  Re = g(() =>
    v(
      () => import('./atlas-CH8HkhBa.js').then((e) => e.ao),
      __vite__mapDeps([1, 2, 3, 4]),
      import.meta.url,
    ),
  ),
  Oe = g(() =>
    v(
      () => import('./atlas-CH8HkhBa.js').then((e) => e.ap),
      __vite__mapDeps([1, 2, 3, 4]),
      import.meta.url,
    ),
  ),
  Ht = g(() =>
    v(() => import('./NotFound-LDPnfSmb.js'), __vite__mapDeps([8, 1, 2, 3, 4, 9]), import.meta.url),
  ),
  ie = new Set(),
  Pe = {
    flow: () => _(() => Te.preload()),
    nebula: () => Promise.all([_(() => Ee.preload()), _(() => we.preload())]).then(() => {}),
    atlas: () =>
      Promise.all([
        _(() => Se.preload()),
        _(() => Ae.preload()),
        _(() => Le.preload()),
        _(() => Re.preload()),
        _(() => Oe.preload()),
        _(() => Ie.preload()),
        _(() => Ce.preload()),
        _(async () => {
          const e = await v(
            () => import('./atlas-CH8HkhBa.js').then((t) => t.ai),
            __vite__mapDeps([1, 2, 3, 4]),
            import.meta.url,
          );
          typeof e.preloadAtlasDataset == 'function' && (await e.preloadAtlasDataset());
        }),
      ]).then(() => {}),
  };
function Jt(e) {
  const t = e.filter((r) => !ie.has(r));
  if (!t.length) return;
  const a = () => {
    t.forEach((r) => {
      const n = Pe[r];
      n && (ie.add(r), n());
    });
  };
  if (typeof window < 'u') {
    const r = window;
    if (typeof r.requestIdleCallback == 'function') {
      r.requestIdleCallback(() => a());
      return;
    }
    r.setTimeout(() => a(), 120);
    return;
  }
  a();
}
function Qt(e, t) {
  return e.matched
    .filter((a) => a.meta && a.meta.breadcrumb !== !1)
    .map((a, r, n) => {
      var l, u, m, T;
      const i = ((l = a.meta) == null ? void 0 : l.breadcrumb) || {},
        o =
          i.label ||
          ((u = a.meta) == null ? void 0 : u.title) ||
          ((m = a.name) == null ? void 0 : m.toString()) ||
          a.path ||
          '—',
        s = i.to
          ? i.to
          : a.name
            ? { name: a.name, params: e.params, query: e.query }
            : a.path
              ? { path: a.path }
              : null,
        c = s ? t.resolve(s) : null;
      return {
        key: ((T = a.name) == null ? void 0 : T.toString()) || a.path || String(r),
        label: o,
        to: s,
        href: c ? c.href : null,
        current: r === n.length - 1,
      };
    });
}
function Kt(e) {
  const t = new Set(),
    a = [];
  return (
    e.matched.forEach((r) => {
      var i;
      (Array.isArray((i = r.meta) == null ? void 0 : i.stateTokens)
        ? r.meta.stateTokens
        : []
      ).forEach((o) => {
        const s = (o == null ? void 0 : o.id) || (o == null ? void 0 : o.label);
        !s ||
          t.has(s) ||
          (t.add(s),
          a.push({
            id: s,
            label: (o == null ? void 0 : o.label) || s,
            variant: o == null ? void 0 : o.variant,
            icon: o == null ? void 0 : o.icon,
          }));
      });
    }),
    a
  );
}
function Ut({ base: e, history: t } = {}) {
  const a = t || et(e ?? './'),
    n = tt({
      history: a,
      routes: [
        { path: '/', redirect: { name: 'console-home' } },
        {
          path: '/console',
          component: Yt,
          meta: { breadcrumb: { label: 'Mission Console', to: { name: 'console-home' } } },
          children: [
            {
              path: '',
              name: 'console-home',
              component: Ee,
              meta: {
                title: 'Mission Console',
                description: 'Hub centrale per il coordinamento dei workflow e dei moduli Nebula.',
                breadcrumb: !1,
                prefetchSections: ['flow', 'atlas', 'nebula'],
              },
            },
            {
              path: 'flow',
              name: 'console-flow',
              component: Te,
              meta: {
                title: 'Workflow Orchestrator',
                description:
                  'Coordina i passaggi del generatore Nebula e monitora lo stato delle pipeline.',
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
              component: we,
              props: (i) => ({
                traitId: typeof i.params.traitId == 'string' ? i.params.traitId : void 0,
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
              component: Se,
              props: (i) => {
                var o, s;
                return {
                  isDemo: !!((o = i.meta) != null && o.demo),
                  isOffline: !!((s = i.meta) != null && s.offline),
                };
              },
              meta: {
                title: 'Nebula Atlas',
                description: 'Panoramica dataset, telemetria e strumenti Atlas.',
                breadcrumb: { label: 'Nebula Atlas' },
                demo: !0,
                offline: !0,
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
                  component: Ae,
                  meta: {
                    title: 'Atlas · Overview',
                    description: 'Stato generale del dataset e sincronizzazioni Nebula.',
                    breadcrumb: { label: 'Overview' },
                  },
                },
                {
                  path: 'evogene-deck',
                  name: 'console-atlas-evogene-deck',
                  component: Le,
                  meta: {
                    title: 'Atlas · EvoGene Deck Nebula',
                    description: 'Catalogo delle specie Nebula pronte per la convalida.',
                    breadcrumb: { label: 'EvoGene Deck' },
                  },
                },
                {
                  path: 'telemetry',
                  name: 'console-atlas-telemetry',
                  component: Re,
                  meta: {
                    title: 'Atlas · Telemetria',
                    description: 'Monitoraggio eventi, readiness e sincronizzazioni QA.',
                    breadcrumb: { label: 'Telemetria' },
                  },
                },
                {
                  path: 'generator',
                  name: 'console-atlas-generator',
                  component: Oe,
                  meta: {
                    title: 'Atlas · Generatore',
                    description: 'Stato e performance del generatore Nebula.',
                    breadcrumb: { label: 'Generatore' },
                  },
                },
                {
                  path: 'world-builder',
                  name: 'console-atlas-world-builder',
                  component: Ie,
                  meta: {
                    title: 'Atlas · World Builder',
                    description: 'Setup dei biomi e dei builder per la generazione di mondi.',
                    breadcrumb: { label: 'World Builder' },
                  },
                },
                {
                  path: 'encounter-lab',
                  name: 'console-atlas-encounter-lab',
                  component: Ce,
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
          component: Ht,
          meta: {
            title: 'Pagina non trovata',
            description: 'La risorsa richiesta non è disponibile.',
            breadcrumb: !1,
          },
        },
      ],
    });
  return (
    n.afterEach((i) => {
      const o = i.meta || {},
        s = o.title ? `${o.title} · ${Y}` : Y;
      (typeof document < 'u' && typeof document.title == 'string' && (document.title = s),
        at({
          title: o.title || Y,
          description: o.description || '',
          demo: i.matched.some((l) => {
            var u;
            return (u = l.meta) == null ? void 0 : u.demo;
          }),
          breadcrumbs: Qt(i, n),
          tokens: Kt(i),
        }));
      const c = new Set();
      (i.matched.forEach((l) => {
        var m;
        const u = (m = l.meta) == null ? void 0 : m.prefetchSections;
        Array.isArray(u) &&
          u
            .map((T) => T)
            .filter((T) => Pe[T])
            .forEach((T) => c.add(T));
      }),
        c.size && Jt(Array.from(c)));
    }),
    n
  );
}
const ke = Ut();
let oe = !1;
function jt(e, t) {
  if (!e) return t;
  const a = e.trim().toLowerCase();
  return ['enabled', 'true', '1', 'on', 'yes'].includes(a)
    ? 'enabled'
    : ['disabled', 'false', '0', 'off', 'no'].includes(a)
      ? 'disabled'
      : t;
}
function H(e, t) {
  const a = S(e);
  if (!a) return t;
  const r = Number.parseFloat(a);
  return Number.isFinite(r) ? Math.min(Math.max(r, 0), 1) : t;
}
async function Xt(e, t) {
  if (
    oe ||
    typeof window > 'u' ||
    jt(S('VITE_OBSERVABILITY_ERROR_REPORTING'), 'disabled') === 'disabled'
  )
    return;
  const r = S('VITE_OBSERVABILITY_ERROR_REPORTING_DSN');
  if (!r) return;
  oe = !0;
  const n = S('VITE_OBSERVABILITY_ENVIRONMENT') || 'production',
    i = S('VITE_OBSERVABILITY_RELEASE'),
    o = H('VITE_OBSERVABILITY_TRACES_SAMPLE_RATE', 0),
    s = H('VITE_OBSERVABILITY_REPLAYS_SESSION_SAMPLE_RATE', 0),
    c = H('VITE_OBSERVABILITY_REPLAYS_ERROR_SAMPLE_RATE', 0.1),
    l = await v(() => import('./index-BgEtvOv1.js'), [], import.meta.url);
  l.init({
    app: e,
    dsn: r,
    environment: n,
    release: i || void 0,
    integrations: (u) => {
      const m = [...u];
      return (
        typeof l.browserTracingIntegration == 'function' &&
          m.push(l.browserTracingIntegration({ router: t })),
        typeof l.replayIntegration == 'function' &&
          (s > 0 || c > 0) &&
          m.push(l.replayIntegration({ stickySession: !0, maskAllInputs: !1 })),
        m
      );
    },
    tracesSampleRate: o,
    replaysSessionSampleRate: s,
    replaysOnErrorSampleRate: c,
    beforeSend(u) {
      if (u && u.request && u.request.headers) {
        const m = u.request.headers;
        (delete m.authorization, delete m.cookie);
      }
      return u;
    },
  });
}
var X,
  w,
  P,
  Ne,
  x,
  Ve = -1,
  L = function (e) {
    addEventListener(
      'pageshow',
      function (t) {
        t.persisted && ((Ve = t.timeStamp), e(t));
      },
      !0,
    );
  },
  te = function () {
    var e =
      self.performance &&
      performance.getEntriesByType &&
      performance.getEntriesByType('navigation')[0];
    if (e && e.responseStart > 0 && e.responseStart < performance.now()) return e;
  },
  q = function () {
    var e = te();
    return (e && e.activationStart) || 0;
  },
  b = function (e, t) {
    var a = te(),
      r = 'navigate';
    return (
      Ve >= 0
        ? (r = 'back-forward-cache')
        : a &&
          (document.prerendering || q() > 0
            ? (r = 'prerender')
            : document.wasDiscarded
              ? (r = 'restore')
              : a.type && (r = a.type.replace(/_/g, '-'))),
      {
        name: e,
        value: t === void 0 ? -1 : t,
        rating: 'good',
        delta: 0,
        entries: [],
        id: 'v4-'.concat(Date.now(), '-').concat(Math.floor(8999999999999 * Math.random()) + 1e12),
        navigationType: r,
      }
    );
  },
  R = function (e, t, a) {
    try {
      if (PerformanceObserver.supportedEntryTypes.includes(e)) {
        var r = new PerformanceObserver(function (n) {
          Promise.resolve().then(function () {
            t(n.getEntries());
          });
        });
        return (r.observe(Object.assign({ type: e, buffered: !0 }, a || {})), r);
      }
    } catch {}
  },
  h = function (e, t, a, r) {
    var n, i;
    return function (o) {
      t.value >= 0 &&
        (o || r) &&
        ((i = t.value - (n || 0)) || n === void 0) &&
        ((n = t.value),
        (t.delta = i),
        (t.rating = (function (s, c) {
          return s > c[1] ? 'poor' : s > c[0] ? 'needs-improvement' : 'good';
        })(t.value, a)),
        e(t));
    };
  },
  ae = function (e) {
    requestAnimationFrame(function () {
      return requestAnimationFrame(function () {
        return e();
      });
    });
  },
  k = function (e) {
    document.addEventListener('visibilitychange', function () {
      document.visibilityState === 'hidden' && e();
    });
  },
  W = function (e) {
    var t = !1;
    return function () {
      t || (e(), (t = !0));
    };
  },
  C = -1,
  se = function () {
    return document.visibilityState !== 'hidden' || document.prerendering ? 1 / 0 : 0;
  },
  $ = function (e) {
    document.visibilityState === 'hidden' &&
      C > -1 &&
      ((C = e.type === 'visibilitychange' ? e.timeStamp : 0), Zt());
  },
  le = function () {
    (addEventListener('visibilitychange', $, !0), addEventListener('prerenderingchange', $, !0));
  },
  Zt = function () {
    (removeEventListener('visibilitychange', $, !0),
      removeEventListener('prerenderingchange', $, !0));
  },
  ne = function () {
    return (
      C < 0 &&
        ((C = se()),
        le(),
        L(function () {
          setTimeout(function () {
            ((C = se()), le());
          }, 0);
        })),
      {
        get firstHiddenTime() {
          return C;
        },
      }
    );
  },
  N = function (e) {
    document.prerendering
      ? addEventListener(
          'prerenderingchange',
          function () {
            return e();
          },
          !0,
        )
      : e();
  },
  ce = [1800, 3e3],
  ea = function (e, t) {
    ((t = t || {}),
      N(function () {
        var a,
          r = ne(),
          n = b('FCP'),
          i = R('paint', function (o) {
            o.forEach(function (s) {
              s.name === 'first-contentful-paint' &&
                (i.disconnect(),
                s.startTime < r.firstHiddenTime &&
                  ((n.value = Math.max(s.startTime - q(), 0)), n.entries.push(s), a(!0)));
            });
          });
        i &&
          ((a = h(e, n, ce, t.reportAllChanges)),
          L(function (o) {
            ((n = b('FCP')),
              (a = h(e, n, ce, t.reportAllChanges)),
              ae(function () {
                ((n.value = performance.now() - o.timeStamp), a(!0));
              }));
          }));
      }));
  },
  ue = [0.1, 0.25],
  ta = function (e, t) {
    ((t = t || {}),
      ea(
        W(function () {
          var a,
            r = b('CLS', 0),
            n = 0,
            i = [],
            o = function (c) {
              (c.forEach(function (l) {
                if (!l.hadRecentInput) {
                  var u = i[0],
                    m = i[i.length - 1];
                  n && l.startTime - m.startTime < 1e3 && l.startTime - u.startTime < 5e3
                    ? ((n += l.value), i.push(l))
                    : ((n = l.value), (i = [l]));
                }
              }),
                n > r.value && ((r.value = n), (r.entries = i), a()));
            },
            s = R('layout-shift', o);
          s &&
            ((a = h(e, r, ue, t.reportAllChanges)),
            k(function () {
              (o(s.takeRecords()), a(!0));
            }),
            L(function () {
              ((n = 0),
                (r = b('CLS', 0)),
                (a = h(e, r, ue, t.reportAllChanges)),
                ae(function () {
                  return a();
                }));
            }),
            setTimeout(a, 0));
        }),
      ));
  },
  ze = 0,
  J = 1 / 0,
  z = 0,
  aa = function (e) {
    e.forEach(function (t) {
      t.interactionId &&
        ((J = Math.min(J, t.interactionId)),
        (z = Math.max(z, t.interactionId)),
        (ze = z ? (z - J) / 7 + 1 : 0));
    });
  },
  Be = function () {
    return X ? ze : performance.interactionCount || 0;
  },
  na = function () {
    'interactionCount' in performance ||
      X ||
      (X = R('event', aa, { type: 'event', buffered: !0, durationThreshold: 0 }));
  },
  y = [],
  D = new Map(),
  De = 0,
  ra = function () {
    var e = Math.min(y.length - 1, Math.floor((Be() - De) / 50));
    return y[e];
  },
  ia = [],
  oa = function (e) {
    if (
      (ia.forEach(function (n) {
        return n(e);
      }),
      e.interactionId || e.entryType === 'first-input')
    ) {
      var t = y[y.length - 1],
        a = D.get(e.interactionId);
      if (a || y.length < 10 || e.duration > t.latency) {
        if (a)
          e.duration > a.latency
            ? ((a.entries = [e]), (a.latency = e.duration))
            : e.duration === a.latency &&
              e.startTime === a.entries[0].startTime &&
              a.entries.push(e);
        else {
          var r = { id: e.interactionId, latency: e.duration, entries: [e] };
          (D.set(r.id, r), y.push(r));
        }
        (y.sort(function (n, i) {
          return i.latency - n.latency;
        }),
          y.length > 10 &&
            y.splice(10).forEach(function (n) {
              return D.delete(n.id);
            }));
      }
    }
  },
  Me = function (e) {
    var t = self.requestIdleCallback || self.setTimeout,
      a = -1;
    return ((e = W(e)), document.visibilityState === 'hidden' ? e() : ((a = t(e)), k(e)), a);
  },
  de = [200, 500],
  sa = function (e, t) {
    'PerformanceEventTiming' in self &&
      'interactionId' in PerformanceEventTiming.prototype &&
      ((t = t || {}),
      N(function () {
        var a;
        na();
        var r,
          n = b('INP'),
          i = function (s) {
            Me(function () {
              s.forEach(oa);
              var c = ra();
              c && c.latency !== n.value && ((n.value = c.latency), (n.entries = c.entries), r());
            });
          },
          o = R('event', i, {
            durationThreshold: (a = t.durationThreshold) !== null && a !== void 0 ? a : 40,
          });
        ((r = h(e, n, de, t.reportAllChanges)),
          o &&
            (o.observe({ type: 'first-input', buffered: !0 }),
            k(function () {
              (i(o.takeRecords()), r(!0));
            }),
            L(function () {
              ((De = Be()),
                (y.length = 0),
                D.clear(),
                (n = b('INP')),
                (r = h(e, n, de, t.reportAllChanges)));
            })));
      }));
  },
  pe = [2500, 4e3],
  Q = {},
  la = function (e, t) {
    ((t = t || {}),
      N(function () {
        var a,
          r = ne(),
          n = b('LCP'),
          i = function (c) {
            (t.reportAllChanges || (c = c.slice(-1)),
              c.forEach(function (l) {
                l.startTime < r.firstHiddenTime &&
                  ((n.value = Math.max(l.startTime - q(), 0)), (n.entries = [l]), a());
              }));
          },
          o = R('largest-contentful-paint', i);
        if (o) {
          a = h(e, n, pe, t.reportAllChanges);
          var s = W(function () {
            Q[n.id] || (i(o.takeRecords()), o.disconnect(), (Q[n.id] = !0), a(!0));
          });
          (['keydown', 'click'].forEach(function (c) {
            addEventListener(
              c,
              function () {
                return Me(s);
              },
              { once: !0, capture: !0 },
            );
          }),
            k(s),
            L(function (c) {
              ((n = b('LCP')),
                (a = h(e, n, pe, t.reportAllChanges)),
                ae(function () {
                  ((n.value = performance.now() - c.timeStamp), (Q[n.id] = !0), a(!0));
                }));
            }));
        }
      }));
  },
  me = [800, 1800],
  ca = function e(t) {
    document.prerendering
      ? N(function () {
          return e(t);
        })
      : document.readyState !== 'complete'
        ? addEventListener(
            'load',
            function () {
              return e(t);
            },
            !0,
          )
        : setTimeout(t, 0);
  },
  ua = function (e, t) {
    t = t || {};
    var a = b('TTFB'),
      r = h(e, a, me, t.reportAllChanges);
    ca(function () {
      var n = te();
      n &&
        ((a.value = Math.max(n.responseStart - q(), 0)),
        (a.entries = [n]),
        r(!0),
        L(function () {
          ((a = b('TTFB', 0)), (r = h(e, a, me, t.reportAllChanges))(!0));
        }));
    });
  },
  O = { passive: !0, capture: !0 },
  da = new Date(),
  fe = function (e, t) {
    w || ((w = t), (P = e), (Ne = new Date()), xe(removeEventListener), Fe());
  },
  Fe = function () {
    if (P >= 0 && P < Ne - da) {
      var e = {
        entryType: 'first-input',
        name: w.type,
        target: w.target,
        cancelable: w.cancelable,
        startTime: w.timeStamp,
        processingStart: w.timeStamp + P,
      };
      (x.forEach(function (t) {
        t(e);
      }),
        (x = []));
    }
  },
  pa = function (e) {
    if (e.cancelable) {
      var t = (e.timeStamp > 1e12 ? new Date() : performance.now()) - e.timeStamp;
      e.type == 'pointerdown'
        ? (function (a, r) {
            var n = function () {
                (fe(a, r), o());
              },
              i = function () {
                o();
              },
              o = function () {
                (removeEventListener('pointerup', n, O),
                  removeEventListener('pointercancel', i, O));
              };
            (addEventListener('pointerup', n, O), addEventListener('pointercancel', i, O));
          })(t, e)
        : fe(t, e);
    }
  },
  xe = function (e) {
    ['mousedown', 'keydown', 'touchstart', 'pointerdown'].forEach(function (t) {
      return e(t, pa, O);
    });
  },
  ve = [100, 300],
  ma = function (e, t) {
    ((t = t || {}),
      N(function () {
        var a,
          r = ne(),
          n = b('FID'),
          i = function (c) {
            c.startTime < r.firstHiddenTime &&
              ((n.value = c.processingStart - c.startTime), n.entries.push(c), a(!0));
          },
          o = function (c) {
            c.forEach(i);
          },
          s = R('first-input', o);
        ((a = h(e, n, ve, t.reportAllChanges)),
          s &&
            (k(
              W(function () {
                (o(s.takeRecords()), s.disconnect());
              }),
            ),
            L(function () {
              var c;
              ((n = b('FID')),
                (a = h(e, n, ve, t.reportAllChanges)),
                (x = []),
                (P = -1),
                (w = null),
                xe(addEventListener),
                (c = i),
                x.push(c),
                Fe());
            })));
      }));
  };
function fa(e, t) {
  if (!e) return t;
  const a = e.trim().toLowerCase();
  return ['enabled', 'true', '1', 'on', 'yes'].includes(a)
    ? 'enabled'
    : ['disabled', 'false', '0', 'off', 'no'].includes(a)
      ? 'disabled'
      : a === 'auto'
        ? 'auto'
        : t;
}
const be = fa(S('VITE_OBSERVABILITY_METRICS'), 'auto'),
  va = typeof window < 'u',
  $e = be === 'enabled' || (be === 'auto' && va),
  K = S('VITE_OBSERVABILITY_METRICS_ENDPOINT'),
  he = S('VITE_OBSERVABILITY_METRICS_STORAGE_KEY') || 'nebula:observability:metrics';
let ge = !1;
function ba(e) {
  if (!$e) return;
  const t = JSON.stringify({
    ...e,
    userAgent: typeof navigator < 'u' ? navigator.userAgent : 'unknown',
  });
  if (K) {
    try {
      if (
        typeof navigator < 'u' &&
        typeof navigator.sendBeacon == 'function' &&
        navigator.sendBeacon(K, t)
      )
        return;
    } catch {}
    if (typeof fetch == 'function')
      try {
        fetch(K, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: t,
          keepalive: !0,
          mode: 'no-cors',
        });
        return;
      } catch {}
  }
  if (!(typeof window > 'u' || typeof window.localStorage > 'u'))
    try {
      const a = window.localStorage.getItem(he),
        r = a ? JSON.parse(a) : [];
      (r.unshift(e),
        r.length > 50 && (r.length = 50),
        window.localStorage.setItem(he, JSON.stringify(r)));
    } catch {}
}
function qe(e, t) {
  const a = {
    ...t,
    name: t.name,
    value: t.value,
    rating: t.rating,
    delta: t.delta,
    navigationType: t.navigationType,
  };
  (nt(a),
    ba({
      kind: e,
      name: t.name,
      value: t.value,
      rating: t.rating,
      delta: t.delta,
      navigationType: t.navigationType,
      timestamp: t.timestamp ?? Date.now(),
      details: t.details,
    }));
}
function ha(e) {
  var t;
  qe('web-vital', {
    id: e.id,
    name: e.name,
    value: Number(e.value || 0),
    rating: e.rating,
    delta: e.delta,
    navigationType: e.navigationType,
    entries: Array.isArray(e.entries) ? e.entries.length : void 0,
    details:
      (t = e.entries) == null
        ? void 0
        : t.map((a) => ({ name: a.name, startTime: a.startTime, duration: a.duration })),
    timestamp: Date.now(),
  });
}
function We(e) {
  const t = { name: e.name, entryType: e.entryType, startTime: e.startTime, duration: e.duration };
  ('initiatorType' in e && (t.initiatorType = e.initiatorType),
    'transferSize' in e && typeof e.transferSize == 'number' && (t.transferSize = e.transferSize),
    qe('performance', {
      name: `performance:${e.entryType}`,
      value: e.duration,
      details: t,
      timestamp: Date.now(),
    }));
}
function ga() {
  if (typeof PerformanceObserver == 'function')
    try {
      const e = new PerformanceObserver((t) => {
        t.getEntries().forEach((a) => {
          if (a.entryType === 'resource') {
            const r = a;
            if (!['fetch', 'xmlhttprequest', 'script', 'link'].includes(r.initiatorType || ''))
              return;
          }
          We(a);
        });
      });
      (e.observe({ type: 'resource', buffered: !0 }),
        e.observe({ type: 'navigation', buffered: !0 }));
    } catch {}
}
function _a() {
  if (!(typeof performance > 'u' || typeof performance.getEntriesByType != 'function'))
    try {
      performance.getEntriesByType('navigation').forEach((t) => We(t));
    } catch {}
}
function ya() {
  if (ge || !$e || typeof window > 'u') return;
  ((ge = !0),
    _a(),
    ga(),
    [ta, ma, la, sa, ua].forEach((t) => {
      try {
        t(ha);
      } catch {}
    }));
}
const G = rt(Gt),
  Ea = Ot();
G.use(ke);
G.use(Ea);
typeof window < 'u' &&
  (ya(),
  Xt(G, ke).catch((e) => {
    console.warn('[observability] inizializzazione error reporting fallita', e);
  }));
G.mount('#app');
