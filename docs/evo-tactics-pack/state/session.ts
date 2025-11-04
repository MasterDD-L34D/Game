/**
 * @typedef {object} ExportStateOptions
 * @property {Array<{id?: string | null}>} [manifestPresets]
 * @property {boolean} [initialPdfSupported]
 */

/**
 * @typedef {object} SessionStateOptions
 * @property {string[]} [defaultActivityTones]
 * @property {Array<{id?: string | null}>} [manifestPresets]
 * @property {boolean} [initialPdfSupported]
 * @property {string} [defaultBriefingText]
 * @property {string} [defaultHookText]
 */

/**
 * @typedef {ReturnType<typeof createExportState>} ExportState
 */

/**
 * @typedef {ReturnType<typeof createComposerState>} ComposerState
 */

/**
 * @typedef {ReturnType<typeof createHistoryState>} HistoryState
 */

/**
 * @typedef {ReturnType<typeof createSessionState>} SessionState
 */

/**
 * @param {ExportStateOptions} [options]
 * @returns {ExportState}
 */
export function createExportState(options = {}) {
  const { manifestPresets = [], initialPdfSupported = false } = options;
  return {
    presetId: manifestPresets[0]?.id ?? null,
    checklist: new Map(),
    dossierTemplate: null,
    pdfSupported: initialPdfSupported,
    pdfSupportNotified: false,
  };
}

/**
 * @returns {ComposerState}
 */
export function createComposerState() {
  return {
    constraints: {
      minSynergy: 45,
      preferredRoles: new Set(),
    },
    combinedPresets: [],
    suggestions: [],
    metrics: {
      radar: [],
      heatmap: [],
    },
    roleStats: new Map(),
  };
}

/**
 * @returns {HistoryState}
 */
export function createHistoryState() {
  return [];
}

/**
 * @param {SessionStateOptions} [options]
 * @returns {SessionState}
 */
export function createSessionState(options = {}) {
  const {
    defaultActivityTones = [],
    manifestPresets = [],
    initialPdfSupported = false,
    defaultBriefingText = '',
    defaultHookText = '',
  } = options;

  return {
    data: null,
    traitRegistry: null,
    traitReference: null,
    traitGlossary: null,
    traitsIndex: new Map(),
    traitDetailsIndex: new Map(),
    traitGlossaryIndex: new Map(),
    hazardRegistry: null,
    hazardsIndex: new Map(),
    activityLog: [],
    activityFilters: {
      query: '',
      tones: new Set(defaultActivityTones),
      tags: new Set(),
      pinnedOnly: false,
    },
    activityTagCounts: new Map(),
    metrics: {
      averageRollIntervalMs: null,
      rerollCount: 0,
      uniqueSpecies: 0,
      filterProfileReuses: 0,
      roleUsage: new Map(),
    },
    lastFilters: { flags: [], roles: [], tags: [] },
    pick: {
      ecosystem: {},
      biomes: [],
      species: {},
      seeds: [],
      exportSlug: null,
    },
    cardState: {
      pinned: new Map(),
      squad: new Map(),
      comparison: new Map(),
      locks: {
        biomes: new Set(),
        species: new Set(),
      },
    },
    exportState: createExportState({ manifestPresets, initialPdfSupported }),
    filterProfiles: [],
    history: createHistoryState(),
    preferences: {
      audioMuted: false,
      volume: 0.75,
    },
    api: {
      base: null,
    },
    lastGenerationMeta: null,
    narrative: {
      missionBriefing: defaultBriefingText,
      narrativeHook: defaultHookText,
      rare: false,
      reason: null,
      recommendations: [],
    },
    composer: createComposerState(),
  };
}
