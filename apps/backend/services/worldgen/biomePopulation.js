'use strict';
// =============================================================================
// SPEC-I ER7 -- A9 population tick (RATIFICATO 2026-06-10, opzione A).
//
// L'ecosistema evolve cross-run come STATO DISCRETO per ruolo trofico
// (abundant/stable/depleted -- MAI numeri continui). WARNING museum (worldgen-
// stack card + PCG audit): UO 1997 = mai simulare il foodweb a runtime; pattern
// sani = Rimworld/DF (stato discreto, modifier flat, worldgen frozen in-play).
// Niente equazioni Lotka-Volterra (opzione B scartata).
//
// Avanza SOLO a season-tick (campaign/seasonalEngine.advanceSeason) con regole
// FLAT, deterministiche, monotone entro il tick:
//   - biomeWounded (A13)   -> prey  `depleted`
//   - apexOverhunted (run) -> apex  `depleted`
//   - apex depleted per un intero tick + prey non ferita -> prey `abundant`
//     (trophic release -- il predatore sparito libera la preda; lag di 1 season
//      cosi' il boom NON scatta lo stesso tick della perdita dell'apex)
//   - recovery: un ruolo torna `stable` dopo N season quiete
// Eventi `local_extinction` (ruolo entra in depleted) / `population_boom` (prey
// entra in abundant) = permanentFlags narrativi (Wildermyth pattern LIVE),
// emessi dal caller via campaignStore.recordPermanentFlag.
//
// Consumer = worldgen/foodwebFilter (ruolo depleted escluso dalla spawn
// whitelist, abundant pesato su). Persistence = campaign.biomePopulation
// (pattern campaign.woundedBiomes).
//
// GOVERNANCE: magnitudini RECOVERY_SEASONS / ABUNDANCE_SEASONS / ABUNDANT_WEIGHT_MULT
// (foodwebFilter) RATIFIED as-built 2026-06-11 (N=40 evidence
// docs/reports/2026-06-11-spec-i-er7-population-n40-evidence.md). Flag
// `BIOME_POPULATION_ENABLED` **default ON** (flip 2026-06-11, opt-out '!= false';
// pilot canonico docs/reports/2026-06-11-spec-i-er7-flip-on-pilot-canonical.md =
// effetto combat OUTCOME-NEUTRO con le stat reali, band-safe per costruzione; il
// -0.25 del probe differenziato era artefatto). L'esclusione del ruolo `depleted` =
// conseguenza ecologica INTENZIONALE (segnale composizione branco-rinforzi, A13-like).
// Scope pilota: ER7_PILOT_BIOMES (badlands).
// =============================================================================

const STATES = Object.freeze({
  ABUNDANT: 'abundant',
  STABLE: 'stable',
  DEPLETED: 'depleted',
});

// Ruoli trofici tracciati = quelli che compaiono nei reinforcement pool
// (produttori/decompositori non rinforzano mai -> non tracciati).
const TRACKED_ROLES = Object.freeze(['apex', 'mesopredator', 'prey']);

// RATIFIED 2026-06-11 (N=40): season quiete prima che un ruolo `depleted` recuperi.
const RECOVERY_SEASONS = 2;
// RATIFIED 2026-06-11 (N=40): season prima che una `abundant` decada a `stable`
// (una volta che la causa -- apex depleted -- e' rientrata).
const ABUNDANCE_SEASONS = 2;

// Ruolo colpito da ciascun segnale di run (regola flat, sez. ER7).
const SIGNAL_ROLE = Object.freeze({ apexOverhunted: 'apex', biomeWounded: 'prey' });

// SPEC-I ER7 -- scope del pilota (mirror ER5): un bioma alla volta dietro il gate
// N=40. Single-source: il season-tick (campaign.js) lo itera e il victory-hook
// (session.js) ci gate la scrittura dei segnali, cosi' i biomi fuori scope non
// accumulano apexPressure mai consumati (flag default-ON -- Codex P2 #2763).
const ER7_PILOT_BIOMES = Object.freeze(['badlands']);

/** Un bioma e' nello scope del pilota ER7? (case-sensitive sui biome_id canonici). */
function isPilotBiome(biomeId) {
  return ER7_PILOT_BIOMES.includes(biomeId);
}

function isEnabled() {
  // Default ON post pilot canonico (flip 2026-06-11, pattern ER6 #2725): opt-out
  // esplicito con 'false'.
  return process.env.BIOME_POPULATION_ENABLED !== 'false';
}

/** Fresh population: ogni ruolo tracciato parte `stable`, seasons 0. */
function initBiomePopulation() {
  const pop = {};
  for (const role of TRACKED_ROLES) {
    pop[role] = { state: STATES.STABLE, seasons: 0 };
  }
  return pop;
}

/** Normalizza un population object (clona, completa ruoli mancanti). Pure. */
function _normalize(current) {
  const pop = {};
  for (const role of TRACKED_ROLES) {
    const entry = current && current[role];
    const state =
      entry && Object.values(STATES).includes(entry.state) ? entry.state : STATES.STABLE;
    const seasons = entry && Number.isFinite(Number(entry.seasons)) ? Number(entry.seasons) : 0;
    pop[role] = { state, seasons };
  }
  return pop;
}

/**
 * Avanza la popolazione di UN bioma di un season-tick. Funzione pura: ritorna
 * { population, events }, non muta l'input.
 *
 * @param {object|null|undefined} current population per-bioma (o nuovo)
 * @param {{apexOverhunted?:boolean, biomeWounded?:boolean}} [signals]
 * @returns {{population:object, events:Array<{type:string, role:string}>}}
 */
function advanceBiomePopulation(current, signals = {}) {
  const prev = _normalize(current);
  const next = _normalize(current);
  const events = [];

  const retrig = {};
  for (const [signal, role] of Object.entries(SIGNAL_ROLE)) {
    retrig[role] = !!(signals && signals[signal]);
  }

  // 1) Aging -- ogni ruolo invecchia di una season nel suo stato corrente.
  for (const role of TRACKED_ROLES) {
    next[role].seasons = prev[role].seasons + 1;
  }

  // 2) Depletion (segnali di run). Re-trigger azzera il timer; l'evento
  //    local_extinction scatta SOLO alla transizione (anti-spam).
  for (const role of TRACKED_ROLES) {
    if (!retrig[role]) continue;
    if (prev[role].state !== STATES.DEPLETED) {
      events.push({ type: 'local_extinction', role });
    }
    next[role].state = STATES.DEPLETED;
    next[role].seasons = 0;
  }

  // 3) Recovery -- un ruolo non ri-triggerato torna verso `stable`.
  for (const role of TRACKED_ROLES) {
    if (retrig[role]) continue;
    if (next[role].state === STATES.DEPLETED && next[role].seasons >= RECOVERY_SEASONS) {
      next[role].state = STATES.STABLE;
      next[role].seasons = 0;
    } else if (next[role].state === STATES.ABUNDANT && next[role].seasons >= ABUNDANCE_SEASONS) {
      next[role].state = STATES.STABLE;
      next[role].seasons = 0;
    }
  }

  // 4) Trophic release -- apex depleted per l'INTERO tick (prev E next) libera
  //    la preda non ferita. Il lag (prev.apex depleted) evita il boom lo stesso
  //    tick della perdita apex; il check next.apex evita il boom nel tick in cui
  //    l'apex recupera.
  if (
    prev.apex.state === STATES.DEPLETED &&
    next.apex.state === STATES.DEPLETED &&
    !retrig.prey &&
    next.prey.state !== STATES.DEPLETED
  ) {
    if (next.prey.state !== STATES.ABUNDANT) {
      events.push({ type: 'population_boom', role: 'prey' });
    }
    next.prey.state = STATES.ABUNDANT;
    next.prey.seasons = 0;
  }

  return { population: next, events };
}

/** Ruoli attualmente `depleted` (ordine TRACKED_ROLES). */
function depletedRoles(biomePop) {
  if (!biomePop || typeof biomePop !== 'object') return [];
  return TRACKED_ROLES.filter((role) => biomePop[role] && biomePop[role].state === STATES.DEPLETED);
}

/** Ruoli attualmente `abundant` (ordine TRACKED_ROLES). */
function abundantRoles(biomePop) {
  if (!biomePop || typeof biomePop !== 'object') return [];
  return TRACKED_ROLES.filter((role) => biomePop[role] && biomePop[role].state === STATES.ABUNDANT);
}

module.exports = {
  STATES,
  TRACKED_ROLES,
  RECOVERY_SEASONS,
  ABUNDANCE_SEASONS,
  SIGNAL_ROLE,
  ER7_PILOT_BIOMES,
  isPilotBiome,
  isEnabled,
  initBiomePopulation,
  advanceBiomePopulation,
  depletedRoles,
  abundantRoles,
};
