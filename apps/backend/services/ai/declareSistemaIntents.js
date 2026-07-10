// ADR-2026-04-16 PR 3 di N — declareSistemaIntents.
//
// Rifattorizzazione del sistemaTurnRunner per il round model:
// invece di eseguire sequenzialmente attack/move mutando lo state e
// consumando AP in un loop, produce una lista di **intents** da passare
// al round orchestrator via `declareIntent`.
//
// Uso tipico nel round flow (wiring futuro in session.js):
//   const { createDeclareSistemaIntents } = require('./declareSistemaIntents');
//   const declare = createDeclareSistemaIntents({
//     pickLowestHpEnemy,
//     stepTowards,
//     manhattanDistance,
//     gridSize: GRID_SIZE,
//   });
//   const { intents, decisions } = declare(session);
//   for (const { unit_id, action } of intents) {
//     session.roundState = orchestrator.declareIntent(
//       session.roundState, unit_id, action,
//     ).nextState;
//   }
//
// Il modulo e' **puro**: non tocca session.units, non muta AP, non
// emette eventi, non scrive su disco. Lavora sulla shape legacy
// session.units (hp scalare, position {x,y}, ecc.) perche' e' quello
// che selectAiPolicy da policy.js si aspetta. L'adattamento allo
// shape del round orchestrator avviene nel chiamante (session.js
// PR 4 scope).
//
// Semantica "un intent per round per unit":
// Nel round model ogni unit dichiara al massimo un'azione principale
// per round. Il loop AP del vecchio sistemaTurnRunner (2 azioni per
// turno se AP pieno) non ha equivalente diretto: il round successivo
// permettera' la seconda azione. Questo riduce la "pressione"
// dell'AI a round pieni ma mantiene fairness (2 round SIS = 2 azioni,
// stesso throughput di 1 turno SIS vecchio). Eventuali upgrade
// (multi-action intents) sono PR futura.

const {
  selectAiPolicy,
  stepAway,
  DEFAULT_ATTACK_RANGE,
  loadAiConfig,
  losClearForAi,
} = require('./policy');
const { selectAiPolicyUtility } = require('./utilityBrain');
const { stepToRegainLos } = require('../combat/losReposition');
const { occupiedSetFromUnits } = require('../combat/occupancy');
const { createApLedger } = require('../combat/apLedger');
const { ARCHETYPE_VULN_CHANNEL } = require('../../routes/sessionConstants');
// A2 (TKT-PRESSURE-TIER-ENCOUNTER): per-encounter pressure_tier_floor mirror.
// sessionHelpers owns the single effectivePressure SoT (flag-gated, default OFF).
// No circular hazard: sessionHelpers requires ./policy, not this module.
const { effectivePressure } = require('../../routes/sessionHelpers');

// K4 Approach B — commit-window anti-flip guard helpers.
// Detect direction reversal (oscillation) between consecutive utility-brain
// move decisions and force previous intent for `commit_window` turns.
// Reduces 2-unit kite cycles where score gradient flips faster than
// additive stickiness can compensate (ref PR #2147 negative result).
function _moveDirection(from, to) {
  if (!from || !to) return null;
  const dx = (Number(to.x) || 0) - (Number(from.x) || 0);
  const dy = (Number(to.y) || 0) - (Number(from.y) || 0);
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'E' : 'W';
  return dy > 0 ? 'S' : 'N';
}

function _isOppositeDir(a, b) {
  return (
    (a === 'N' && b === 'S') ||
    (a === 'S' && b === 'N') ||
    (a === 'E' && b === 'W') ||
    (a === 'W' && b === 'E')
  );
}

function _detectFlip(actor, newIntent, newDirection) {
  const lastKind = actor.last_action_type;
  const lastDir = actor.last_move_direction;
  if (!lastKind) return false;
  // Action-kind reversal approach<->retreat
  if (lastKind === 'retreat' && newIntent === 'approach') return true;
  if ((lastKind === 'move' || lastKind === 'approach') && newIntent === 'retreat') return true;
  // Direction reversal during consecutive moves (covers approach->approach with
  // opposite direction as well — that's the canonical 1-tile kite oscillation)
  if (
    lastDir &&
    newDirection &&
    _isOppositeDir(lastDir, newDirection) &&
    (newIntent === 'approach' || newIntent === 'retreat')
  ) {
    return true;
  }
  return false;
}

// M6-Z: pick canale attacco che sfrutta vuln del target basato su archetype.
// Fallback "fisico" default se target senza archetype o archetype adattivo.
function pickExploitChannel(target) {
  if (!target || !target.resistance_archetype) return 'fisico';
  const vuln = ARCHETYPE_VULN_CHANNEL[target.resistance_archetype];
  return vuln || 'fisico';
}

// Sistema pressure tier → max intents per round (AI War pattern).
// Mirror dei tier definiti in packs/.../sistema_pressure.yaml e in
// sessionHelpers.SISTEMA_PRESSURE_TIERS. Definito qui per evitare
// dipendenza circolare con sessionHelpers.
// Rebalance 2026-04-17 post-playtest human: Master reporting "solo 1 SIS muove"
// in T1 tutorial_02 era troppo passivo. Tutti tier +1 intent (tranne Calm che
// resta 1 per preservare tutorial_01 "gentle start"). Cap Apex sale a 4 per
// BOSS scenari (tutorial_05) dove Sistema deve sentirsi minaccia vera.
const PRESSURE_TIER_INTENT_CAP = [
  { threshold: 0, intents_per_round: 1 }, // Calm (tutorial_01 only)
  { threshold: 25, intents_per_round: 2 }, // Alert (tutorial_02 baseline)
  { threshold: 50, intents_per_round: 3 }, // Escalated (tutorial_03 baseline)
  { threshold: 75, intents_per_round: 3 }, // Critical (tutorial_04 baseline)
  { threshold: 95, intents_per_round: 4 }, // Apex (tutorial_05 BOSS baseline)
];

// D4 threat-dial roster-scaling (spec docs/planning/2026-07-06-sistema-intents-
// roster-scaling-spec.md, feed grid-ratify 2026-07-06 "Limite di modello"): the
// global per-round dial does not scale with the Sistema roster, so on big
// boards "more enemies" = LESS per-unit pressure (2/13 = 15% active). Flag
// default OFF; values PROPOSED (SDMG), flip owner-gated post N=40.
function isIntentsRosterScalingEnabled() {
  return process.env.SISTEMA_INTENTS_ROSTER_SCALING_ENABLED === 'true';
}

// Hard ceiling for the scaled cap: keeps Sistema below the party's 8
// actions/round (4 units x 2 AP) and bounds the telegraph UI load.
const INTENTS_ABS_CAP = 6;

// FALSIFYING EXPERIMENT (owner-authorized 2026-07-10, flag default OFF).
// The WR 1.0 ceiling of every N=40 ratify is attributed by the docs to the
// AI-vs-AI driver. It is not: the cap above is an invariant that keeps Sistema
// under the party's action budget, and it runs in the real game too (callers:
// routes/session.js, routes/sessionRoundBridge.js). Flag ON = every alive
// Sistema unit declares its intent (the per-unit AP ledger already exists,
// session.js validates against actor.ap_remaining); the global cap no longer
// gates emission. Flag OFF -> byte-identical, band-neutral.
//
// SCOPE (declared): ON emits 1 intent per unit, NOT 2 actions/unit like the
// party. Half the gap -- the half measurable without touching multi-action
// resolution. This is a probe, not a balance proposal: the telegraph UI load
// (the cap's second, legitimate reason) is NOT addressed here.
function isPerUnitActionsEnabled() {
  return process.env.SISTEMA_PER_UNIT_ACTIONS_ENABLED === 'true';
}

// Retreat gate (spec sistema-symmetry sez. 4.3): utilityBrain deve rispettare
// la stessa retreat_hp_pct che il path rule-based onora gia' (misurato: 44/45
// ritirate vengono da UTILITY_AI che la ignora). Nessun knob nuovo: soglia =
// profiles.<ai_profile>.overrides.retreat_hp_pct, fallback config base.
// Default OFF -> byte-identical.
function isRetreatGateEnabled() {
  return process.env.SISTEMA_RETREAT_GATE_ENABLED === 'true';
}

// Per-unit AP declaration (spec sistema-symmetry sez. 4.2): ogni unita' Sistema
// dichiara fino al SUO budget (ap_remaining ?? ap), mirror del PG. L'addebito a
// risoluzione e il refill per-round esistono GIA' per il Sistema (bridge resolve
// loop + applyApRefill, nessun filtro fazione -- verificato 2026-07-10): questo
// flag chiude l'unico buco, l'affordability alla dichiarazione. Il cap globale
// resta per la PRESENTAZIONE telegraph (spec sez. 4.4, gradino successivo,
// non in questo branch). Default OFF.
function isPerUnitApEnabled() {
  return process.env.SISTEMA_PER_UNIT_AP_ENABLED === 'true';
}

// Divisor K: one intent per K alive Sistema units (activation ~1/K on big
// rosters). Env-tunable for probe A/B; invalid values fall back to 3.
const ROSTER_K_DEFAULT = 3;
function rosterScalingK() {
  const k = Number(process.env.SISTEMA_INTENTS_ROSTER_K);
  return Number.isInteger(k) && k >= 1 ? k : ROSTER_K_DEFAULT;
}

// A2: optional `floor` (encounter.pressure_tier_floor) raises the effective
// pressure before the cap lookup. flag OFF / floor unset -> identical to pre-A2.
// Roster-scaling: optional `aliveSistema` raises the cap to ceil(alive/K) with
// the pressure tier as FLOOR (small rosters identical even at flag ON) and
// INTENTS_ABS_CAP as ceiling. Flag OFF / arg absent/invalid -> tier cap only.
function intentsCapForPressure(pressure, floor, aliveSistema) {
  const p = effectivePressure(pressure, floor);
  let cap = PRESSURE_TIER_INTENT_CAP[0].intents_per_round;
  for (const t of PRESSURE_TIER_INTENT_CAP) {
    if (p >= t.threshold) cap = t.intents_per_round;
  }
  if (!isIntentsRosterScalingEnabled()) return cap;
  const alive = Number(aliveSistema);
  if (!Number.isFinite(alive) || alive <= 0) return cap;
  const scaled = Math.ceil(alive / rosterScalingK());
  return Math.min(Math.max(cap, scaled), INTENTS_ABS_CAP);
}

// M1 ADR-2026-05-18 -- true only when a high-threat PG is CURRENTLY on the field
// (present in session.units AND alive). units_observed accumulates across
// encounters, so it MUST be intersected with the live roster -- otherwise a
// past killer biases unrelated future battles (codex P1 #2363).
function computePersistentHighThreat(session) {
  const observed = (session && session.sistema_state && session.sistema_state.units_observed) || {};
  const units = Array.isArray(session && session.units) ? session.units : [];
  for (const u of units) {
    if (!u || u.controlled_by !== 'player') continue;
    if (u.hp != null && u.hp <= 0) continue; // dead -> not on the field
    const rec = observed[u.id];
    if (rec && rec.threat_level === 'high') return true;
  }
  return false;
}

// SPEC-Q M-4 (L2/P5 Sistema legibility) -- hidden evolving-tactic reveal.
// QF3-A (ratified 2026-06-08): a Sistema unit's *evolving cross-encounter*
// tactic is hidden until a use-threshold reveals it diegetically (delivery =
// ALIENA, SPEC-H consumer). Default threshold 3 ("es. dopo 3 usi", SPEC-Q sez.7)
// -- a knob pending master-dd ratify; flip is owner-gated.
const DEFAULT_HIDDEN_ABILITY_THRESHOLD = 3;

/**
 * Pure detector for hidden-ability reveals. Reads (never mutates) session.units
 * and an optional config { enabled, defaultThreshold }. Returns reveal records;
 * [] unless BOTH the flag is on (config.enabled) AND a Sistema unit carries an
 * `hidden_ability` descriptor whose accumulated cross-encounter `uses` has met
 * its threshold. This NEVER produces or alters an intent -- the WEGO telegraph
 * invariant (intra-round intents visible pre-commit) is preserved by construction,
 * and encounters with no descriptor are 100% unaffected (band-neutral).
 *
 * @param session { units: [{ controlled_by, hidden_ability?: { id, uses, reveal_threshold?, revealed?, label_it? } }] }
 * @param config  { enabled?: boolean, defaultThreshold?: number }
 * @returns Array<{ unit_id, ability_id, uses, threshold, tier, label_it, doctrine }>
 */
function detectHiddenAbilityReveals(session, config) {
  const cfg = config || {};
  if (!cfg.enabled) return [];
  if (!session || !Array.isArray(session.units)) return [];
  const defaultThreshold = Number.isFinite(Number(cfg.defaultThreshold))
    ? Number(cfg.defaultThreshold)
    : DEFAULT_HIDDEN_ABILITY_THRESHOLD;
  const reveals = [];
  for (const actor of session.units) {
    if (!actor || actor.controlled_by !== 'sistema') continue;
    const ha = actor.hidden_ability;
    if (!ha || typeof ha !== 'object' || !ha.id) continue;
    if (ha.revealed === true) continue; // caller persists revealed -> no double reveal
    const threshold = Number.isFinite(Number(ha.reveal_threshold))
      ? Number(ha.reveal_threshold)
      : defaultThreshold;
    const uses = Number(ha.uses) || 0;
    if (uses < threshold) continue; // pre-threshold: tactic stays hidden, intent stays generic
    reveals.push({
      unit_id: actor.id,
      ability_id: ha.id,
      uses,
      threshold,
      tier: 'public', // the REVEAL is public TV+device (SPEC-Q sez.10); pre-reveal ability = secret
      label_it: typeof ha.label_it === 'string' ? ha.label_it : null,
      doctrine: 'cross_encounter', // QF3-A: evolving cross-incontro tactic only
    });
  }
  return reveals;
}

function createDeclareSistemaIntents(deps) {
  const {
    pickLowestHpEnemy,
    stepTowards,
    manhattanDistance,
    gridSize = 6,
    useUtilityAi = false, // global fallback; per-actor override via aiProfiles + actor.ai_profile
    aiProfiles = null, // { profiles: { aggressive: { use_utility_brain: true, ... }, ... } } — from ai_profiles.yaml (ADR-2026-04-17 Q-001 T3.1)
    difficultyProfile = {}, // { selection: 'argmax'|'weighted_top3'|'random', noise: 0-1 }
    computeThreatIndex, // AI War pattern: optional, injected from threatAssessment.js
    threatConfig, // override per threat thresholds (from ai_intent_scores.yaml → threat)
    hiddenAbilityReveal = null, // SPEC-Q M-4 { enabled, defaultThreshold } -- flag OFF default
  } = deps || {};

  // Unica autorita' dei costi AP (spec sez. 4.1). Il declare-side prezza e gata
  // con gli stessi resolver che la risoluzione usa per addebitare: un ap_cost
  // calcolato qui a mano divergerebbe dall'addebito server-side non appena il
  // move smette di essere un passo singolo (budget-v2 multi-tile) o l'attore
  // porta un move_bonus_bonus.
  const apLedger = createApLedger({ manhattanDistance, gridSize });

  /**
   * Resolve Utility AI flag per-actor (ADR-2026-04-17 gradual rollout).
   * Priorità: profile.use_utility_brain (se aiProfiles loaded + actor.ai_profile) → useUtilityAi global.
   */
  function resolveUseUtilityBrain(actor) {
    if (aiProfiles && aiProfiles.profiles && actor && actor.ai_profile) {
      const profile = aiProfiles.profiles[actor.ai_profile];
      if (profile && typeof profile.use_utility_brain === 'boolean') {
        return profile.use_utility_brain;
      }
    }
    return useUtilityAi;
  }

  if (typeof pickLowestHpEnemy !== 'function') {
    throw new Error('createDeclareSistemaIntents: pickLowestHpEnemy is required');
  }
  if (typeof stepTowards !== 'function') {
    throw new Error('createDeclareSistemaIntents: stepTowards is required');
  }
  if (typeof manhattanDistance !== 'function') {
    throw new Error('createDeclareSistemaIntents: manhattanDistance is required');
  }

  /**
   * Dichiara intents per tutte le unita' SIS-controlled vive nella session.
   *
   * Non muta la session. Ritorna:
   *   {
   *     intents: [{ unit_id, action }],          // ready per declareIntent
   *     decisions: [{ unit_id, rule, intent, reason? }], // log + debug
   *   }
   *
   * L'ordine di emissione e' deterministico: segue session.units
   * (stesso ordine di iterazione del runner legacy).
   */
  return function declareSistemaIntents(session) {
    if (!session || !Array.isArray(session.units)) {
      return { intents: [], decisions: [], reveals: [] };
    }
    // Rectangular bounds for non-square grid_sized boards (stepAway accepts
    // { width, height }; a bare number keeps the legacy square behavior).
    const effectiveGrid = session.grid?.width
      ? { width: session.grid.width, height: session.grid.height || session.grid.width }
      : gridSize;

    // AI War pattern: compute threat context once per round
    const threatCtx =
      typeof computeThreatIndex === 'function' ? computeThreatIndex(session, threatConfig) : null;

    // M1 ADR-2026-05-18 Option B pilot -- surface persistent high-threat to the
    // legacy policy (selectAiPolicy reads threatCtx). Only fires when a
    // high-threat PG is alive on the current field (codex P1 #2363 fix).
    // Back-compat: absent sistema_state -> false -> baseline behavior.
    if (threatCtx) {
      threatCtx.persistent_high_threat = computePersistentHighThreat(session);
    }

    // AI War pattern: pressure-driven intent cap.
    // Tier piu' alto (player vincente) → SIS dichiara piu' intents.
    // Calm: 1 intent/round, Critical/Apex: 3.
    // A2: per-encounter pressure_tier_floor (flag OFF -> no-op = back-compat).
    // D4 roster-scaling: alive Sistema count (reinforcements included as they
    // spawn) raises the cap to ceil(alive/K) when the flag is ON; tier = floor.
    const aliveSistema = session.units.filter(
      (u) => u && u.controlled_by === 'sistema' && Number(u.hp || 0) > 0,
    ).length;
    const intentsCap = intentsCapForPressure(
      session.sistema_pressure,
      session.pressure_tier_floor,
      aliveSistema,
    );
    // Read at call-time (not module-load) so the probe can toggle per-run.
    const perUnitActions = isPerUnitActionsEnabled();
    const perUnitAp = isPerUnitApEnabled();
    // Retreat gate: flag e config-base (fallback soglia) hoistati per-call,
    // non per-actor -- nessuno dei due cambia dentro il loop attori.
    const retreatGateOn = isRetreatGateEnabled();
    const retreatGateBaseCfg = retreatGateOn ? loadAiConfig() : null;

    const intents = [];
    const decisions = [];
    let intentsEmitted = 0;

    // AI War pattern — decentralized unit AI: conflict resolution.
    // No global planner. Ogni unit sceglie il proprio target indipendentemente;
    // un post-pass qui garantisce che due SIS non sprechino focus-fire stackando
    // sullo stesso PG quando altri PG sono vulnerabili. Primo arrivato (ordine
    // session.units) keep, altri ri-pickano escludendo target gia' presi.
    const takenTargetIds = new Set();

    // Helper inline: ripicka target escludendo IDs gia' presi.
    // Mantenuto inline per non allargare l'API pubblica di pickLowestHpEnemy.
    // Phase A status-awareness: a parità di HP (±2 PT), preferisce target debuffati
    // (slowed/disorient/chilled/marked riducono efficacia del target).
    function hasDebuffStatus(unit) {
      const s = unit?.status;
      if (!s) return false;
      return (
        Number(s.slowed) > 0 ||
        Number(s.disorient) > 0 ||
        Number(s.chilled) > 0 ||
        Number(s.marked) > 0
      );
    }
    function pickTargetExcluding(actor, excludeSet) {
      const actorFaction = actor.controlled_by;
      const candidates = session.units.filter(
        (u) =>
          u &&
          u.id !== actor.id &&
          u.hp > 0 &&
          u.controlled_by !== actorFaction &&
          !excludeSet.has(u.id),
      );
      if (!candidates.length) return null;
      return candidates.reduce((best, c) => {
        if (!best) return c;
        const hpDiff = c.hp - best.hp;
        if (Math.abs(hpDiff) > 2) return hpDiff < 0 ? c : best;
        if (hasDebuffStatus(c) && !hasDebuffStatus(best)) return c;
        if (!hasDebuffStatus(c) && hasDebuffStatus(best)) return best;
        return hpDiff < 0 ? c : best;
      }, null);
    }

    // Slot-2 (spec sez. 4.2, mirror lookahead2): dopo il primo intent, se il
    // budget regge, dichiara un attack SOLO se il target e' in gittata dalla
    // posizione VIRTUALE post-move e la LOS e' libera da li'. Niente re-run
    // della policy: deterministico, nessuna mutazione (il modulo resta puro),
    // nessuna interazione col commit-window (bookkeeping invariato).
    function declareSecondAttack(ctx) {
      const {
        actor,
        target,
        policy,
        virtualPos,
        remaining,
        intents,
        decisions,
        takenTargetIds,
        session,
      } = ctx;
      if (remaining < 1) return 0;
      if (!target || Number(target.hp || 0) <= 0) return 0;
      const range = actor.attack_range ?? DEFAULT_ATTACK_RANGE;
      if (manhattanDistance(virtualPos, target.position) > range) return 0;
      // LOS senza l'attore: virtualPos e' la cella post-move ma l'attore e'
      // ancora nella cella VECCHIA dentro session.units -- con units_block_los
      // ON (dormant) il suo stesso corpo si auto-bloccherebbe la linea.
      const unitsSansActor = session.units.filter((u) => u && u.id !== actor.id);
      if (!losClearForAi(session.grid, virtualPos, target.position, unitsSansActor)) return 0;
      const action = {
        id: `sis-attack2-${actor.id}`,
        type: 'attack',
        actor_id: actor.id,
        target_id: target.id,
        ability_id: null,
        ap_cost: 1,
        channel: pickExploitChannel(target),
        damage_dice: deps._damageDice || { count: 1, sides: 6, modifier: 2 },
        source_ia_rule: `${policy.rule}_AP2`,
      };
      intents.push({ unit_id: actor.id, action });
      takenTargetIds.add(target.id);
      decisions.push({
        unit_id: actor.id,
        rule: `${policy.rule}_AP2`,
        intent: 'attack',
        target_id: target.id,
      });
      return 1;
    }

    for (const actor of session.units) {
      if (!actor) continue;
      if (actor.controlled_by !== 'sistema') continue;
      if (Number(actor.hp || 0) <= 0) continue;
      if (!perUnitActions && !perUnitAp && intentsEmitted >= intentsCap) {
        decisions.push({
          unit_id: actor.id,
          rule: 'PRESSURE_CAP',
          intent: 'skip',
          reason: `pressure cap raggiunto (${intentsEmitted}/${intentsCap})`,
        });
        continue;
      }

      // Budget AP dell'attore (solo flag ON; OFF -> percorso invariato).
      // NaN-guard: con ap sporco (non numerico) ogni confronto di budget a
      // valle sarebbe false -> NaN passerebbe tutti i gate come budget
      // illimitato. Non-finito -> 0 (fail-closed).
      const rawAp = Number(actor.ap_remaining != null ? actor.ap_remaining : actor.ap || 0);
      const apBudget = perUnitAp ? (Number.isFinite(rawAp) ? rawAp : 0) : Infinity;
      if (perUnitAp && apBudget < 1) {
        decisions.push({
          unit_id: actor.id,
          rule: 'NO_AP',
          intent: 'skip',
          reason: `ap esauriti (${apBudget})`,
        });
        continue;
      }

      // iter5 aggro_pull (taunt): se actor ha status.aggro_locked attivo,
      // forza target = aggro_source (vivo). Override pickLowestHpEnemy.
      let target = null;
      let aggroOverride = false;
      const aggroLocked = Number(actor.status?.aggro_locked) || 0;
      const aggroSource = actor.aggro_source;
      if (aggroLocked > 0 && aggroSource) {
        const lock = (session.units || []).find(
          (u) => u && u.id === aggroSource && Number(u.hp) > 0,
        );
        if (lock) {
          target = lock;
          aggroOverride = true;
        }
      }
      if (!target) target = pickLowestHpEnemy(session, actor);
      // Se gia' preso da altro SIS, ri-pick escludendo i presi.
      // Fall back al pick originale solo se non ci sono alternative.
      // Aggro override IGNORA il taken-set (taunt forza il bersaglio).
      if (!aggroOverride && target && takenTargetIds.has(target.id)) {
        const alt = pickTargetExcluding(actor, takenTargetIds);
        if (alt) target = alt;
      }
      if (!target) {
        decisions.push({
          unit_id: actor.id,
          rule: 'NO_TARGET',
          intent: 'skip',
          reason: 'no enemy alive',
        });
        continue;
      }

      // Select policy: Utility AI (per-actor via ai_profile.use_utility_brain) or legacy rules
      const actorUseUtility = resolveUseUtilityBrain(actor);
      let policy;
      if (actorUseUtility) {
        // K4 stickiness — merge per-profile stickiness_weight (and
        // optional direction weight) into the difficultyProfile passed
        // to selectAction. ai_profiles.yaml entry can declare:
        //   <profile>:
        //     stickiness_weight: 0.15
        //     stickiness_direction_weight: 0.075   (optional, defaults to half)
        // Profile fallback to base difficultyProfile (zero stickiness).
        let stickyDifficulty = difficultyProfile;
        if (aiProfiles && aiProfiles.profiles && actor && actor.ai_profile) {
          const prof = aiProfiles.profiles[actor.ai_profile];
          if (prof) {
            const sw = prof.stickiness_weight;
            const sdw = prof.stickiness_direction_weight;
            if (typeof sw === 'number' || typeof sdw === 'number') {
              stickyDifficulty = {
                ...difficultyProfile,
                ...(typeof sw === 'number' ? { stickiness_weight: sw } : {}),
                ...(typeof sdw === 'number' ? { stickiness_direction_weight: sdw } : {}),
              };
            }
          }
        }
        // M1 ADR-2026-05-18 Option B -- surface persistent high-threat to the
        // Utility AI path too (was dropped here; legacy path at selectAiPolicy
        // below already reads threatCtx). Without this, M1's defensive overlay
        // went inert for any Sistema unit running a use_utility_brain profile.
        // Retreat gate: sopra soglia la ritirata esce dalle azioni legali.
        let retreatGated = false;
        if (retreatGateOn) {
          const gateProf =
            aiProfiles && aiProfiles.profiles && actor.ai_profile
              ? aiProfiles.profiles[actor.ai_profile]
              : null;
          const gateOverrides = (gateProf && gateProf.overrides) || {};
          const threshold = Number(
            gateOverrides.retreat_hp_pct ?? retreatGateBaseCfg.LOW_HP_RETREAT_THRESHOLD,
          );
          const hpRatio =
            Number(actor.max_hp) > 0 ? Number(actor.hp || 0) / Number(actor.max_hp) : 1;
          retreatGated = hpRatio > threshold;
        }
        const utilityState = {
          persistent_high_threat: !!(threatCtx && threatCtx.persistent_high_threat),
          retreat_gated: retreatGated,
        };
        policy = selectAiPolicyUtility(actor, target, utilityState, stickyDifficulty);
      } else {
        policy = selectAiPolicy(actor, target, null, threatCtx);
      }

      // K4 Approach B — commit-window anti-flip guard. Reads
      // `commit_window` (turns) from ai_profiles.yaml profile entry.
      // When > 0:
      //   - if a guard window is open (actor.commit_window_remaining > 0),
      //     force the saved intent for this turn and decrement;
      //   - else, detect intent/direction flip vs last committed action
      //     and, if flipped, force previous intent for `commit_window` turns
      //     (anti-oscillation lock).
      // commit_window=2 → reverse-flip ignored, last intent commits 2 turns.
      if (aiProfiles && aiProfiles.profiles && actor.ai_profile) {
        const prof = aiProfiles.profiles[actor.ai_profile];
        const cw = prof ? Number(prof.commit_window) || 0 : 0;
        if (cw > 0) {
          const remaining = Number(actor.commit_window_remaining) || 0;
          if (remaining > 0 && actor.commit_window_intent) {
            policy = { rule: 'COMMIT_WINDOW', intent: actor.commit_window_intent };
            actor.commit_window_remaining = remaining - 1;
          } else if (actor.last_action_type) {
            const candidatePos =
              policy.intent === 'retreat'
                ? stepAway(actor.position, target.position, effectiveGrid)
                : policy.intent === 'approach'
                  ? stepTowards(actor.position, target.position, effectiveGrid)
                  : null;
            const candidateDir = candidatePos ? _moveDirection(actor.position, candidatePos) : null;
            if (_detectFlip(actor, policy.intent, candidateDir)) {
              const lastIntent =
                actor.last_action_type === 'attack'
                  ? 'attack'
                  : actor.last_action_type === 'retreat'
                    ? 'retreat'
                    : 'approach';
              policy = { rule: 'COMMIT_WINDOW_FLIP', intent: lastIntent };
              // Apply for cw turns total INCLUDING this one — store cw-1.
              actor.commit_window_remaining = Math.max(0, cw - 1);
              actor.commit_window_intent = lastIntent;
            }
          }
        }
      }

      const distance = manhattanDistance(actor.position, target.position);

      // Fallback cornered: stessa logica di sistemaTurnRunner. Se
      // REGOLA_002 e' attiva ma il retreat e' bloccato (step fallisce
      // o unit cornered), cade back a REGOLA_001 (attack se in range,
      // approach altrimenti).
      if (policy.intent === 'retreat') {
        const range = actor.attack_range ?? DEFAULT_ATTACK_RANGE;
        const canRetreat = stepAway(actor.position, target.position, effectiveGrid) !== null;
        if (!canRetreat) {
          policy =
            distance <= range
              ? { rule: 'REGOLA_001', intent: 'attack' }
              : { rule: 'REGOLA_001', intent: 'approach' };
        }
      }

      // COMBAT_LOS_ENABLED (default ON since the 2026-07-06 flip, opt-out 'false'): an AI cannot attack a target it cannot see.
      // Downgrade attack -> approach so a blocked AI advances to gain line of sight
      // instead of shooting through a blocker. Flag OFF -> losClearForAi()===true -> no-op.
      // Placed AFTER the commit-window guard and the cornered retreat fallback so LOS
      // has the final say on any path that could produce 'attack', but BEFORE the
      // intent is consumed into intents/decisions below.
      if (
        policy &&
        policy.intent === 'attack' &&
        !losClearForAi(session.grid, actor.position, target.position, session.units)
      ) {
        const occupied = occupiedSetFromUnits(session.units, { excludeId: actor.id });
        // Reposition to regain LOS on the CHOSEN target specifically (keep engaging
        // it, do not switch enemies) -- pass only [target]. null -> plain approach.
        // Owner default 2026-07-06 (ratify N=40, docs/research/2026-07-06-los-flip-
        // ratify-n40.md: step-vs-budget = NO outcome separation, budget pays pace
        // only): prod runs the shipped greedy step (budget 1). The multi-tile
        // lookahead stays available to probes via opts.budget / REPOSITION_MODE.
        const reposition = stepToRegainLos(actor, [target], session.grid, {
          occupied,
          budget: 1,
        });
        policy = {
          ...policy,
          intent: 'approach',
          rule: `${policy.rule || 'REGOLA'}_LOS_BLOCKED`,
          reposition_to: reposition || undefined,
        };
      }

      // intent='skip' non genera nessun intent: l'unit resta ferma.
      // Viene comunque tracciato in decisions per debug.
      if (policy.intent === 'skip') {
        decisions.push({
          unit_id: actor.id,
          rule: policy.rule,
          intent: 'skip',
          reason: `stato emotivo — ${policy.rule}`,
        });
        continue;
      }

      if (policy.intent === 'attack') {
        // Attack intent minimale. Il campo damage_dice e' un default
        // portabile: il resolver (placeholder in PR 2, reale in PR 4)
        // puo' override via i trait/stats dell'actor. Il field
        // `source_ia_rule` e' metadata per la UI/log.
        // M6-Z: canale exploit target.resistance_archetype (enemy AI smart).
        const action = {
          id: `sis-attack-${actor.id}`,
          type: 'attack',
          actor_id: actor.id,
          target_id: target.id,
          ability_id: null,
          ap_cost: 1,
          channel: pickExploitChannel(target),
          damage_dice: deps._damageDice || { count: 1, sides: 6, modifier: 2 },
          source_ia_rule: policy.rule,
        };
        intents.push({ unit_id: actor.id, action });
        intentsEmitted++;
        // Decentralized conflict resolution: mark target come preso cosi'
        // il prossimo SIS nel loop evita lo stack.
        takenTargetIds.add(target.id);
        decisions.push({
          unit_id: actor.id,
          rule: policy.rule,
          intent: 'attack',
          target_id: target.id,
          aggro_override: aggroOverride || undefined,
          // RCA aggressive timeout (docs/research/2026-05-09-aggressive-profile-calibration.md):
          // surface utility brain score + per-consideration breakdown when
          // policy comes from selectAiPolicyUtility. Undefined for legacy
          // rule-based selectAiPolicy — JSON.stringify drops, no payload bloat.
          score: policy.score,
          breakdown: policy.breakdown,
        });
        if (perUnitAp) {
          intentsEmitted += declareSecondAttack({
            actor,
            target,
            policy,
            virtualPos: actor.position,
            remaining: apBudget - 1,
            intents,
            decisions,
            takenTargetIds,
            session,
          });
        }
        continue;
      }

      // intent='approach' o 'retreat' → move
      const positionFrom = { ...actor.position };
      // `reposition_to` is set by the LOS-downgrade block above when a one-tile step
      // reopens a firing line on the target; undefined -> plain approach (stepTowards).
      const nextPos =
        policy.intent === 'retreat'
          ? stepAway(actor.position, target.position, effectiveGrid)
          : policy.reposition_to || stepTowards(actor.position, target.position, effectiveGrid);

      if (!nextPos || (nextPos.x === positionFrom.x && nextPos.y === positionFrom.y)) {
        decisions.push({
          unit_id: actor.id,
          rule: policy.rule,
          intent: 'skip',
          reason:
            policy.intent === 'retreat'
              ? `cannot retreat — cornered near ${target.id}`
              : `cannot approach ${target.id}`,
        });
        continue;
      }

      // Overlap guard: se la cella e' occupata da un'altra unit viva,
      // niente intent (no-op). Il controllo stretto avviene anche nel
      // resolver reale PR 4, ma lo facciamo early per evitare intent
      // invalidi nella pending_intents list.
      const blocker = session.units.find(
        (u) =>
          u.id !== actor.id &&
          Number(u.hp || 0) > 0 &&
          u.position &&
          u.position.x === nextPos.x &&
          u.position.y === nextPos.y,
      );
      if (blocker) {
        decisions.push({
          unit_id: actor.id,
          rule: policy.rule,
          intent: 'skip',
          reason: `blocked by ${blocker.id} at (${nextPos.x},${nextPos.y})`,
        });
        continue;
      }

      const moveAction = {
        id: `sis-move-${actor.id}`,
        type: 'move',
        actor_id: actor.id,
        target_id: null,
        ability_id: null,
        // Prezzo server-authoritative dal ledger: max(1, dist - move_bonus_bonus),
        // lo STESSO resolver che la risoluzione ricalcola per addebitare. Con
        // stepTowards/stepAway (1 casella) vale 1 come prima; un budget-v2
        // multi-tile o un move_bonus_bonus rendono la differenza osservabile.
        // Il campo resta load-bearing anche a valle: buildMoveEvent lo pubblica
        // come ap_spent e il resolver display lo deduce senza ricalcolare, quindi
        // deve gia' portare il costo vero.
        ap_cost: apLedger.resolveMoveApCost(actor, positionFrom, nextPos),
        channel: null,
        move_to: { x: nextPos.x, y: nextPos.y },
        position_from: positionFrom,
        source_ia_rule: policy.rule,
      };
      if (perUnitAp && !apLedger.canAfford(actor, [], moveAction)) {
        decisions.push({
          unit_id: actor.id,
          rule: 'NO_AP',
          intent: 'skip',
          reason: `move cost ${moveAction.ap_cost} > budget ${apBudget}`,
        });
        continue;
      }
      intents.push({ unit_id: actor.id, action: moveAction });
      intentsEmitted++;
      decisions.push({
        unit_id: actor.id,
        rule: policy.rule,
        intent: policy.intent, // 'approach' o 'retreat'
        target_id: target.id,
        move_to: nextPos,
        aggro_override: aggroOverride || undefined,
        score: policy.score,
        breakdown: policy.breakdown,
      });
      if (perUnitAp) {
        intentsEmitted += declareSecondAttack({
          actor,
          target,
          policy,
          virtualPos: nextPos,
          remaining: apBudget - moveAction.ap_cost,
          intents,
          decisions,
          takenTargetIds,
          session,
        });
      }
    }

    // SPEC-Q M-4 -- reveal records emitted OFF THE SIDE (never touches intents).
    // WEGO invariant: intra-round intents above are unchanged by reveal logic.
    const reveals = detectHiddenAbilityReveals(session, hiddenAbilityReveal);

    return { intents, decisions, reveals };
  };
}

module.exports = {
  createDeclareSistemaIntents,
  computePersistentHighThreat,
  intentsCapForPressure,
  isIntentsRosterScalingEnabled,
  isPerUnitActionsEnabled,
  isRetreatGateEnabled,
  isPerUnitApEnabled,
  INTENTS_ABS_CAP,
  detectHiddenAbilityReveals,
  DEFAULT_HIDDEN_ABILITY_THRESHOLD,
};
