// TKT-P2 Brigandine seasonal — Phase A engine.
//
// Reference: docs/planning/2026-05-11-big-items-scope-tickets-bundle.md §5
// (TKT-P2-BRIGANDINE-SEASONAL). Master-dd verdict A4 PROMUOVI priorità M14
// (override OD-015 deferred verdict).
//
// Museum cards consulted (museum-first protocol):
//   - M-2026-04-26-012 Worldgen Stack 4-livelli (bioma→ecosistema→foodweb→network)
//     — seasonal modifiers compatible con biome layer (resource_yield / hazard).
//   - M-2026-04-26-014 Cross-bioma event propagation (validator-time logic,
//     zero runtime) — seasonal events_log additive primitive.
//   - M-2026-04-25-005 Magnetic Rift Resonance (swarm trait T2, biome resonance)
//     — recruit_pool modifier suggerito per season-biome interactions (Phase B).
//
// Pattern reference: Brigandine seasonal macro-loop (Organization Phase ↔ Battle
// Phase, 4-season cycle = 1 year, multi-year campaign). Pivot rispetto a
// `campaignEngine.js` (chapter-based linear/branching): seasonalEngine modella
// macro-loop ciclico time-based, complementare e non in conflict.
//
// Phase A scope (THIS PR):
//   - State shape + pure functions (initialState/advancePhase/advanceSeason)
//   - Phase metadata (organization vs battle restrictions + actions)
//   - Season modifiers POC (resource_yield, encounter_rate, hazard, recruit_pool)
//   - events_log primitive (append-only)
//   - Zero I/O, zero side-effect su esterni
//
// Phase B (defer): sample seasons YAML content data/core/campaign/seasons/*.yaml
// Phase C (defer): apps/backend/routes/campaign.js seasonal endpoints
// Phase D (defer): UI surface frontend HUD season indicator + organization actions
//
// === State shape ===
//
//   {
//     current_phase: 'organization' | 'battle',
//     current_season: 'spring' | 'summer' | 'autumn' | 'winter',
//     current_year: number (1..N, monotone increment),
//     phase_turn: number (0..M, reset on phase change),
//     season_index: number (0..3, 0=spring 1=summer 2=autumn 3=winter),
//     events_log: Array<{ year, season, phase, type, payload, t }>
//   }
//
// === Transition rules ===
//
//   organization → battle: stesso season, phase_turn reset 0
//   battle → organization: avanza season (potenzialmente year+1), phase_turn reset
//
// Quindi 1 anno = 4 stagioni × 2 fasi = 8 transizioni totali per ciclo annuo.

'use strict';

const SEASONS = ['spring', 'summer', 'autumn', 'winter'];
const PHASES = ['organization', 'battle'];

// Phase metadata — label, available actions, restrictions.
const PHASE_SPECS = {
  organization: {
    label: 'Organization Phase',
    description: 'Recruit, train, equip, deploy. No combat.',
    actions: ['recruit', 'train', 'equip', 'deploy'],
    combat_enabled: false,
  },
  battle: {
    label: 'Battle Phase',
    description: 'Tactical encounters. Recruitment locked.',
    actions: ['engage', 'retreat', 'reinforce'],
    combat_enabled: true,
  },
};

// Season modifiers (POC values per Phase A spec).
// Phase B will load these da data/core/campaign/seasons/*.yaml.
const SEASON_MODIFIERS = {
  spring: {
    resource_yield: 1.2,
    encounter_rate: 0.9,
    hazard: 'flood',
    recruit_pool: +1,
  },
  summer: {
    resource_yield: 1.0,
    encounter_rate: 1.1,
    hazard: 'drought',
    recruit_pool: 0,
  },
  autumn: {
    resource_yield: 1.1,
    encounter_rate: 1.0,
    hazard: 'storm',
    recruit_pool: 0,
  },
  winter: {
    resource_yield: 0.7,
    encounter_rate: 1.3,
    hazard: 'frost',
    recruit_pool: -1,
  },
};

/**
 * Baseline state: year 1, spring, organization phase, no events.
 */
function initialState() {
  return {
    current_phase: 'organization',
    current_season: 'spring',
    current_year: 1,
    phase_turn: 0,
    season_index: 0,
    events_log: [],
  };
}

/**
 * Advance phase organization → battle (same season) OR battle → organization
 * + next season. Pure: returns new state, does not mutate input.
 */
function advancePhase(state) {
  if (!state || !PHASES.includes(state.current_phase)) {
    throw new Error('advancePhase: invalid state.current_phase');
  }
  if (state.current_phase === 'organization') {
    return {
      ...state,
      current_phase: 'battle',
      phase_turn: 0,
      events_log: [...(state.events_log || [])],
    };
  }
  // battle → organization + next season
  return advanceSeasonInternal({
    ...state,
    current_phase: 'organization',
    phase_turn: 0,
    events_log: [...(state.events_log || [])],
  });
}

/**
 * Internal helper — advance season index, wrap to next year when crossing winter.
 */
function advanceSeasonInternal(state) {
  const nextIndex = (state.season_index + 1) % SEASONS.length;
  const wrappedYear = nextIndex === 0 ? state.current_year + 1 : state.current_year;
  return {
    ...state,
    season_index: nextIndex,
    current_season: SEASONS[nextIndex],
    current_year: wrappedYear,
  };
}

/**
 * Public: advance season directly (bypass phase). Returns new state.
 * Used per test + future scenarios (es. skip season via narrative event).
 */
function advanceSeason(state) {
  if (!state) {
    throw new Error('advanceSeason: invalid state');
  }
  return advanceSeasonInternal({
    ...state,
    events_log: [...(state.events_log || [])],
  });
}

/**
 * Get phase metadata for current state.
 */
function getCurrentPhaseSpec(state) {
  if (!state || !PHASE_SPECS[state.current_phase]) {
    return null;
  }
  return { ...PHASE_SPECS[state.current_phase] };
}

/**
 * Get season modifiers for a season key. Returns frozen copy.
 */
function getSeasonModifiers(season) {
  if (!SEASON_MODIFIERS[season]) {
    return null;
  }
  return { ...SEASON_MODIFIERS[season] };
}

/**
 * Append event to log. Pure: returns new state with extended log.
 * Event shape: { type, payload? }. Engine adds year/season/phase/t context.
 */
function appendEvent(state, event) {
  if (!state) {
    throw new Error('appendEvent: invalid state');
  }
  if (!event || typeof event !== 'object' || !event.type) {
    throw new Error('appendEvent: event must have a type');
  }
  const enriched = {
    year: state.current_year,
    season: state.current_season,
    phase: state.current_phase,
    type: event.type,
    payload: event.payload ?? null,
    t: (state.events_log || []).length,
  };
  return {
    ...state,
    events_log: [...(state.events_log || []), enriched],
  };
}

module.exports = {
  SEASONS,
  PHASES,
  PHASE_SPECS,
  SEASON_MODIFIERS,
  initialState,
  advancePhase,
  advanceSeason,
  getCurrentPhaseSpec,
  getSeasonModifiers,
  appendEvent,
};
