/// <reference types="vitest" />
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

let elements: ReturnType<typeof createStubElements>;
let anchorUi: ReturnType<typeof createAnchorUi>;
const canvasContextStub = {
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fillText: vi.fn(),
  closePath: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  setLineDash: vi.fn(),
  createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
};
let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
let originalScrollIntoView: typeof Element.prototype.scrollIntoView;
let originalFocus: typeof HTMLElement.prototype.focus;

const stubCatalog = {
  species: [
    {
      id: 'synthetic-hunter',
      display_name: 'Predatore sintetico',
      role_trofico: 'predatore_apex',
      functional_tags: ['criogenico', 'tempesta'],
      flags: { apex: true, threat: true },
    },
  ],
  biomi: [
    {
      id: 'frozen-ridge',
      label: 'Cresta ghiacciata',
      hazard: { severity: 'medium' },
      traits: { ids: ['cryostasis'] },
      manifest: { species_counts: { apex: 1, keystone: 0, bridge: 0, threat: 0, event: 0 } },
      metrics: { zoneCount: 3 },
      species: [
        {
          id: 'frost-scale',
          display_name: 'Scala glaciale',
          role_trofico: 'predatore_secondario',
          functional_tags: ['criogenico'],
          flags: { threat: true },
          biomes: ['frozen-ridge'],
        },
      ],
    },
  ],
  ecosistema: { biomi: [{ id: 'baseline', label: 'Bioma base' }] },
  traits: {},
};

const fetchTraitRegistry = vi.fn(async () => ({
  data: { rules: [] },
  url: null,
  fromFallback: false,
}));
const fetchTraitReference = vi.fn(async () => ({
  data: { traits: {}, trait_glossary: null },
  url: null,
  fromFallback: false,
}));
const fetchTraitGlossary = vi.fn(async () => ({
  data: { traits: {} },
  url: null,
  fromFallback: false,
}));
const fetchHazardRegistry = vi.fn(async () => ({
  data: { hazards: {} },
  url: null,
  fromFallback: false,
}));
const fetchSpecies = vi.fn(async () => ({ data: [], url: null, fromFallback: false }));

vi.mock('../../../docs/evo-tactics-pack/ui/elements.ts', () => ({
  resolveGeneratorElements: () => elements,
  resolveAnchorUi: () => anchorUi,
}));

vi.mock('../../../docs/evo-tactics-pack/pack-data.js', () => {
  const candidates = ['https://example.test/packs/evo_tactics_pack/'];
  const buildContext = () => ({
    resolvedBase: candidates[0],
    docsBase: `${candidates[0]}docs/`,
    catalogUrl: `${candidates[0]}docs/catalog/catalog_data.json`,
    apiBase: null,
  });
  const buildResult = () => ({ data: { ...stubCatalog }, context: buildContext() });
  return {
    PACK_PATH: 'packs/evo_tactics_pack/',
    getPackRootCandidates: () => [...candidates],
    loadPackCatalog: vi.fn(async () => buildResult()),
    manualLoadCatalog: vi.fn(async () => buildResult()),
  };
});

vi.mock('../../../services/api/generatorClient.ts', () => ({
  fetchTraitRegistry,
  fetchTraitReference,
  fetchTraitGlossary,
  fetchHazardRegistry,
  fetchSpecies,
}));

vi.mock('../../../services/export/dossier.ts', () => ({
  loadDossierTemplate: vi.fn(async () => '<div>Dossier</div>'),
  generateDossierDocument: vi.fn(async () => ({ sections: [] })),
  generateDossierHtml: vi.fn(async () => '<article></article>'),
  generateDossierPdfBlob: vi.fn(async () => new Blob()),
  buildPressKitMarkdown: vi.fn(async () => '# Press kit'),
  generatePresetFileContents: vi.fn(async () => new Map()),
}));

vi.mock('../../../docs/evo-tactics-pack/views/parameters.js', () => ({
  setup: vi.fn((state, els, deps) => {
    deps?.setupFilterChangeHandlers?.(state, els);
    deps?.attachProfileHandlers?.(state, els);
    deps?.setupExportControls?.(state, els);
  }),
  render: vi.fn(),
}));

const noopViewModule = () => ({ setup: vi.fn(), render: vi.fn() });
vi.mock('../../../docs/evo-tactics-pack/views/traits.js', () => noopViewModule());
vi.mock('../../../docs/evo-tactics-pack/views/biomes.js', () => noopViewModule());
vi.mock('../../../docs/evo-tactics-pack/views/seeds.js', () => noopViewModule());
vi.mock('../../../docs/evo-tactics-pack/views/composer.js', () => noopViewModule());
vi.mock('../../../docs/evo-tactics-pack/views/insights.js', () => noopViewModule());

describe('docs generator — browser integration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    document.body.innerHTML = '';
    elements = createStubElements();
    anchorUi = createAnchorUi();

    globalThis.CSS = globalThis.CSS || { escape: (value: string) => String(value) };
    (globalThis as unknown as { fetch: typeof fetch }).fetch = vi.fn(async () => {
      throw new Error('fetch unavailable in tests');
    });

    originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = vi.fn(() => canvasContextStub);

    originalScrollIntoView = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = vi.fn();

    originalFocus = HTMLElement.prototype.focus;
    HTMLElement.prototype.focus = vi.fn();

    globalThis.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as typeof IntersectionObserver;

    globalThis.requestAnimationFrame = (callback: FrameRequestCallback) =>
      setTimeout(() => callback(performance.now()), 0);
    globalThis.cancelAnimationFrame = (handle: number) => clearTimeout(handle);

    Object.assign(window, {
      Chart: vi.fn(() => ({ destroy: vi.fn(), data: { datasets: [] }, update: vi.fn() })),
      JSZip: class {
        folder() {
          return this;
        }
        file() {
          return this;
        }
        async generateAsync() {
          return new Uint8Array();
        }
      },
      html2pdf: {
        from() {
          return this;
        },
        set() {
          return this;
        },
        save: vi.fn(),
        outputPdf: vi.fn(),
      },
    });
  });

  afterEach(() => {
    document.body.innerHTML = '';
    delete (window as { EvoPack?: unknown }).EvoPack;
    HTMLCanvasElement.prototype.getContext = originalGetContext;
    Element.prototype.scrollIntoView = originalScrollIntoView;
    HTMLElement.prototype.focus = originalFocus;
    vi.restoreAllMocks();
  });

  it('initialises the global generator state', async () => {
    await import('../../../docs/evo-tactics-pack/generator.js');
    await tick();

    const generator = (window as { EvoPack?: { generator?: { state: unknown } } }).EvoPack
      ?.generator;
    expect(generator?.state).toBeDefined();
    expect(generator?.state).toMatchObject({
      activityLog: expect.any(Array),
      preferences: { audioMuted: false, volume: 0.75 },
    });
    expect(Array.isArray(generator?.state?.activityLog)).toBe(true);
  });

  it('updates filters when multiselect change events fire', async () => {
    await import('../../../docs/evo-tactics-pack/generator.js');
    await tick();

    const flagButton = elements.flags.querySelector(
      '[data-multiselect-option]',
    ) as HTMLButtonElement;
    expect(flagButton).toBeTruthy();

    flagButton.click();

    const state = (window as { EvoPack?: { generator?: { state: any } } }).EvoPack?.generator
      ?.state;
    expect(state?.lastFilters?.flags).toEqual(['apex']);
    expect(elements.filtersHint.textContent).toContain('Filtri attivi');
  });

  it('falls back to local biome synthesis when the remote worker is unavailable', async () => {
    const globalWithFetch = globalThis as { fetch?: typeof fetch };
    const originalFetch = globalWithFetch.fetch;
    const fetchMock = vi
      .fn(() => Promise.reject(new Error('biome worker unavailable')))
      .mockName('fetch') as unknown as typeof fetch;
    globalWithFetch.fetch = fetchMock;

    try {
      await import('../../../docs/evo-tactics-pack/generator.js');
      await tick();
      await tick();

      const generator = (
        window as {
          EvoPack?: { generator?: { state: { activityLog: any[]; pick: any } } };
        }
      ).EvoPack?.generator;
      expect(generator).toBeDefined();

      const rollButton = document.createElement('button');
      rollButton.type = 'button';
      rollButton.dataset.action = 'roll-ecos';
      elements.form?.appendChild(rollButton);

      rollButton.click();
      await tick();
      await tick();

      const state = generator?.state as {
        activityLog: Array<{ action?: string; message?: string }>;
        pick: { biomes: Array<{ synthetic?: boolean }> };
      };
      expect(state?.activityLog.some((entry) => entry?.action === 'roll-ecos-fallback')).toBe(true);
      expect(state?.pick.biomes.length).toBeGreaterThan(0);
      expect(state.pick.biomes.every((biome) => biome.synthetic === true)).toBe(true);
    } finally {
      globalWithFetch.fetch = originalFetch;
    }
  });
});

function createStubElements() {
  const root = document.createElement('div');
  root.id = 'generator-test-root';
  document.body.appendChild(root);

  const create = <K extends keyof HTMLElementTagNameMap>(tag: K) => {
    const node = document.createElement(tag);
    root.appendChild(node);
    return node;
  };

  const form = create('form');
  form.id = 'generator-form';

  const flags = create('div');
  const roles = create('div');
  const tags = create('div');

  const filtersHint = create('p');
  filtersHint.id = 'generator-filters-hint';

  const nBiomi = create('input');
  nBiomi.id = 'nBiomi';
  nBiomi.setAttribute('type', 'number');
  nBiomi.value = '2';

  const summaryContainer = create('section');
  summaryContainer.id = 'generator-summary';

  const summaryCounts = {
    biomes: document.createElement('span'),
    species: document.createElement('span'),
    seeds: document.createElement('span'),
  };
  summaryCounts.biomes.dataset.summary = 'biomes';
  summaryCounts.species.dataset.summary = 'species';
  summaryCounts.seeds.dataset.summary = 'seeds';
  summaryContainer.append(summaryCounts.biomes, summaryCounts.species, summaryCounts.seeds);

  const makeButton = (label = '') => {
    const button = create('button');
    button.type = 'button';
    button.textContent = label;
    return button;
  };

  const audioControls = create('div');
  const audioMute = makeButton('mute');
  const audioVolume = create('input');
  audioVolume.setAttribute('type', 'range');

  const profileSlots = create('div');

  const composerSynergySlider = create('input');
  composerSynergySlider.setAttribute('type', 'range');
  composerSynergySlider.value = '45';
  const composerSynergyValue = create('span');

  const composerRadarCanvas = create('canvas');
  const composerHeatmap = create('div');
  const compareCanvas = create('canvas');

  const compareList = create('ul');
  const pinnedList = create('ul');
  const flowMapList = create('ul');
  const historyList = create('ul');
  const logList = create('ul');

  const activitySearch = create('input');
  activitySearch.setAttribute('type', 'search');
  const activityTagFilter = document.createElement('select');
  root.appendChild(activityTagFilter);
  const activityPinnedOnly = create('input');
  activityPinnedOnly.setAttribute('type', 'checkbox');

  const activityToneToggles = [makeButton('info'), makeButton('warn')];
  activityToneToggles.forEach((button, index) => {
    button.dataset.activityTone = index === 0 ? 'info' : 'warn';
  });

  const activityReset = makeButton('reset');
  activityReset.dataset.action = 'reset-activity-filters';

  const exportPreset = document.createElement('select');
  root.appendChild(exportPreset);
  const exportPreviewJson = create('pre');
  const exportPreviewYaml = create('pre');
  const exportPreviewJsonDetails = create('details');
  const exportPreviewYamlDetails = create('details');
  const dossierPreview = create('div');

  const flowNode = create('div');
  flowNode.dataset.flowNode = 'onboarding';
  const flowNodes = [flowNode];

  const toneContainer = create('div');
  toneContainer.append(...activityToneToggles);

  const kpi = {
    averageRoll: create('span'),
    rerollCount: create('span'),
    uniqueSpecies: create('span'),
    profileReuses: create('span'),
  };

  const filters = {
    form,
    flags,
    roles,
    tags,
    filtersHint,
    nBiomi,
    biomeGrid: create('div'),
    traitGrid: create('div'),
    seedGrid: create('div'),
    status: create('p'),
    summaryContainer,
    summaryCounts,
    narrativePanel: create('section'),
    narrativeBriefing: create('p'),
    narrativeHook: create('p'),
    narrativeInsightPanel: create('section'),
    narrativeInsightEmpty: create('div'),
    narrativeInsightList: create('ul'),
    briefingPanel: create('section'),
    hookPanel: create('section'),
    audioControls,
    audioMute,
    audioVolume,
    profilePanel: create('section'),
    profileSlots,
    profileEmpty: create('div'),
    composerPanel: create('section'),
    composerPresetList: create('ul'),
    composerPresetEmpty: create('div'),
    composerSuggestions: create('ul'),
    composerSuggestionsEmpty: create('div'),
    composerRoleToggles: create('div'),
    composerSynergySlider,
    composerSynergyValue,
    composerRadarCanvas,
    composerHeatmap,
    comparePanel: create('section'),
    compareList,
    compareEmpty: create('div'),
    compareChartContainer: create('div'),
    compareCanvas,
    compareFallback: create('div'),
    pinnedList,
    pinnedEmpty: create('div'),
    flowMapList,
    flowNodes,
    historyPanel: create('section'),
    historyList,
    historyEmpty: create('div'),
    lastAction: create('p'),
    logList,
    logEmpty: create('div'),
    activitySearch,
    activityTagFilter,
    activityPinnedOnly,
    activityToneToggles,
    activityReset,
    exportMeta: create('div'),
    exportList: create('ul'),
    exportEmpty: create('div'),
    exportActions: create('div'),
    exportPreset,
    exportPresetStatus: create('p'),
    exportPreview: create('div'),
    exportPreviewEmpty: create('div'),
    exportPreviewJson,
    exportPreviewYaml,
    exportPreviewJsonDetails,
    exportPreviewYamlDetails,
    dossierPreview,
    dossierEmpty: create('div'),
    insightsPanel: create('section'),
    insightsEmpty: create('div'),
    insightsList: create('ul'),
    kpi,
  } as const;

  return filters;
}

function createAnchorUi() {
  const root = document.createElement('div');
  root.dataset.anchorRoot = 'true';
  document.body.appendChild(root);

  const anchor = document.createElement('a');
  anchor.dataset.anchorTarget = 'parameters';
  anchor.href = '#generator-parameters';
  document.body.appendChild(anchor);

  const panel = document.createElement('section');
  panel.dataset.panel = 'parameters';
  document.body.appendChild(panel);

  const breadcrumb = document.createElement('button');
  breadcrumb.dataset.anchorBreadcrumb = 'parameters';
  document.body.appendChild(breadcrumb);

  const minimap = document.createElement('div');
  minimap.dataset.anchorMinimap = 'parameters';
  document.body.appendChild(minimap);

  const toggle = document.createElement('button');
  toggle.dataset.codexToggle = 'true';
  document.body.appendChild(toggle);

  const closer = document.createElement('button');
  closer.dataset.codexClose = 'true';
  const overlay = document.createElement('div');
  overlay.dataset.codexOverlay = 'true';
  overlay.appendChild(closer);
  document.body.appendChild(overlay);

  return {
    root,
    anchors: [anchor],
    panels: [panel],
    breadcrumbTargets: [breadcrumb],
    minimapContainers: [minimap],
    overlay,
    codexToggles: [toggle],
    codexClosers: [closer],
  } as const;
}

async function tick() {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}
