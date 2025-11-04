/**
 * @template {Element} T
 * @param {Document | DocumentFragment | Element} root
 * @param {string} selector
 * @returns {T | null}
 */
function query(root, selector) {
  return root.querySelector(selector);
}

/**
 * @template {Element} T
 * @param {Document | DocumentFragment | Element} root
 * @param {string} selector
 * @returns {T[]}
 */
function queryAll(root, selector) {
  return Array.from(root.querySelectorAll(selector));
}

/**
 * @param {Document | DocumentFragment | Element} root
 * @param {string} id
 * @returns {HTMLElement | null}
 */
function byId(root, id) {
  if ('getElementById' in root && typeof root.getElementById === 'function') {
    return root.getElementById(id);
  }
  if (typeof CSS !== 'undefined' && CSS.escape) {
    return root.querySelector(`#${CSS.escape(id)}`);
  }
  return root.querySelector(`#${id.replace(/(["'\\])/g, '\\$1')}`);
}

/**
 * @typedef {ReturnType<typeof resolveGeneratorElements>} GeneratorElements
 */

/**
 * @typedef {ReturnType<typeof resolveAnchorUi>} AnchorUiElements
 */

export function resolveGeneratorElements(root = document) {
  return {
    form: byId(root, 'generator-form'),
    flags: byId(root, 'flags'),
    roles: byId(root, 'roles'),
    tags: byId(root, 'tags'),
    filtersHint: byId(root, 'generator-filters-hint'),
    nBiomi: byId(root, 'nBiomi'),
    biomeGrid: byId(root, 'biome-grid'),
    traitGrid: byId(root, 'trait-grid'),
    seedGrid: byId(root, 'seed-grid'),
    status: byId(root, 'generator-status'),
    summaryContainer: byId(root, 'generator-summary'),
    summaryCounts: {
      biomes: query(root, '[data-summary="biomes"]'),
      species: query(root, '[data-summary="species"]'),
      seeds: query(root, '[data-summary="seeds"]'),
    },
    narrativePanel: byId(root, 'generator-narrative'),
    narrativeBriefing: query(root, '[data-narrative="briefing"]'),
    narrativeHook: query(root, '[data-narrative="hook"]'),
    narrativeInsightPanel: byId(root, 'generator-insight-panel'),
    narrativeInsightEmpty: byId(root, 'generator-insight-empty'),
    narrativeInsightList: byId(root, 'generator-insight-list'),
    briefingPanel: byId(root, 'generator-briefing-panel'),
    hookPanel: byId(root, 'generator-hook-panel'),
    audioControls: byId(root, 'generator-audio-controls'),
    audioMute: byId(root, 'generator-audio-mute'),
    audioVolume: byId(root, 'generator-audio-volume'),
    profilePanel: byId(root, 'generator-profiles'),
    profileSlots: byId(root, 'generator-profile-slots'),
    profileEmpty: byId(root, 'generator-profile-empty'),
    composerPanel: byId(root, 'generator-composer'),
    composerPresetList: byId(root, 'generator-composer-presets'),
    composerPresetEmpty: byId(root, 'generator-composer-presets-empty'),
    composerSuggestions: byId(root, 'generator-composer-suggestions'),
    composerSuggestionsEmpty: byId(root, 'generator-composer-suggestions-empty'),
    composerRoleToggles: byId(root, 'generator-composer-role-toggles'),
    composerSynergySlider: byId(root, 'generator-composer-synergy'),
    composerSynergyValue: byId(root, 'generator-composer-synergy-value'),
    composerRadarCanvas: byId(root, 'generator-synergy-radar'),
    composerHeatmap: byId(root, 'generator-role-heatmap'),
    comparePanel: byId(root, 'generator-compare-panel'),
    compareList: byId(root, 'generator-compare-list'),
    compareEmpty: byId(root, 'generator-compare-empty'),
    compareChartContainer: byId(root, 'generator-compare-chart'),
    compareCanvas: byId(root, 'generator-compare-canvas'),
    compareFallback: byId(root, 'generator-compare-fallback'),
    pinnedList: byId(root, 'generator-pinned-list'),
    pinnedEmpty: byId(root, 'generator-pinned-empty'),
    flowMapList: byId(root, 'generator-flow-map-list'),
    flowNodes: queryAll(root, '[data-flow-node]'),
    historyPanel: byId(root, 'generator-history'),
    historyList: byId(root, 'generator-history-list'),
    historyEmpty: byId(root, 'generator-history-empty'),
    lastAction: byId(root, 'generator-last-action'),
    logList: byId(root, 'generator-log'),
    logEmpty: byId(root, 'generator-log-empty'),
    activitySearch: byId(root, 'activity-search'),
    activityTagFilter: byId(root, 'activity-tags'),
    activityPinnedOnly: byId(root, 'activity-pinned-only'),
    activityToneToggles: queryAll(root, '[data-activity-tone]'),
    activityReset: query(root, '[data-action="reset-activity-filters"]'),
    exportMeta: byId(root, 'generator-export-meta'),
    exportList: byId(root, 'generator-export-list'),
    exportEmpty: byId(root, 'generator-export-empty'),
    exportActions: byId(root, 'generator-export-actions'),
    exportPreset: byId(root, 'generator-export-preset'),
    exportPresetStatus: byId(root, 'generator-export-preset-status'),
    exportPreview: byId(root, 'generator-export-preview'),
    exportPreviewEmpty: byId(root, 'generator-preview-empty'),
    exportPreviewJson: byId(root, 'generator-preview-json'),
    exportPreviewYaml: byId(root, 'generator-preview-yaml'),
    exportPreviewJsonDetails: byId(root, 'generator-preview-json-details'),
    exportPreviewYamlDetails: byId(root, 'generator-preview-yaml-details'),
    dossierPreview: byId(root, 'generator-dossier-preview'),
    dossierEmpty: byId(root, 'generator-dossier-empty'),
    insightsPanel: byId(root, 'generator-insights-panel'),
    insightsEmpty: byId(root, 'generator-insights-empty'),
    insightsList: byId(root, 'generator-insights-list'),
    kpi: {
      averageRoll: query(root, '[data-kpi="avg-roll"]'),
      rerollCount: query(root, '[data-kpi="reroll-count"]'),
      uniqueSpecies: query(root, '[data-kpi="unique-species"]'),
      profileReuses: query(root, '[data-kpi="profile-reuse"]'),
    },
  };
}

export function resolveAnchorUi(root = document) {
  return {
    root: query(root, '[data-anchor-root]'),
    anchors: queryAll(root, '[data-anchor-target]'),
    panels: queryAll(root, '[data-panel]'),
    breadcrumbTargets: queryAll(root, '[data-anchor-breadcrumb]'),
    minimapContainers: queryAll(root, '[data-anchor-minimap]'),
    overlay: query(root, '[data-codex-overlay]'),
    codexToggles: queryAll(root, '[data-codex-toggle]'),
    codexClosers: queryAll(root, '[data-codex-close]'),
  };
}
