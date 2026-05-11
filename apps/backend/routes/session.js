// SPRINT_001 fase 3 + SPRINT_002 fase 1-4 + SPRINT_003 fase 0-3 — engine minimo giocabile.
//
// Espone 6 route sotto /api/session/*:
//   POST /start     crea sessione (units custom o default), griglia 6x6
//   GET  /state     ritorna stato corrente (units, turn, grid, active_unit)
//   POST /action    risolve attack o move (d20 + trait effects + fairness cap)
//   POST /turn/end  passa il turno; se tocca al sistema, esegue REGOLA_001
//   POST /end       chiude sessione e finalizza il log su disco
//   GET  /:id/vc    snapshot VC on-demand (SPRINT_003 fase 3)
//
// Lo stato sessione vive in memoria (Map session_id -> session). Il log
// degli eventi viene appeso a `logs/session_YYYYMMDD_HHMMSS.json` ad
// ogni azione e finalizzato a /end.
//
// d20 (GDD v0.1 "Sistema Dadi Ibrido"):
//   roll = d20 + mod_caratteristica
//   mos  = roll - dc_difesa
//   hit  = mos >= 0
//   pt   = 0
//   if hit:
//     if die in [15..19]: pt += 1
//     if die == 20:       pt += 2
//     pt += floor(mos / 5)
//
// Trait engine (SPRINT_002 fase 2): dopo la risoluzione base, i trait
// dell'attore e del target vengono valutati dal registry in
// data/core/traits/active_effects.yaml e possono modificare il danno
// finale + aggiungere voci in trait_effects per il log.
//
// Sistema IA (SPRINT_002 fase 3): REGOLA_001 in engine/sistema_rules.md.
// Le unita' con controlled_by === 'sistema' sono pilotate dall'IA
// quando il turno scatta al loro id tramite POST /turn/end.

const path = require('node:path');
const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const { Router } = require('express');

const {
  loadActiveTraitRegistry,
  evaluateAttackTraits,
  evaluateStatusTraits,
  evaluateMovementTraits,
} = require('../services/traitEffects');
const { loadFairnessConfig, checkCapPtBudget, consumeCapPt } = require('../services/fairnessCap');
const { loadTelemetryConfig, buildVcSnapshot } = require('../services/vcScoring');
// P4 Thought Cabinet: Phase 1 (threshold unlock) + Phase 2 (research → internalize).
const {
  evaluateThoughts: evaluateMbtiThoughts,
  createCabinetState,
  startResearch: startThoughtResearch,
  tickResearch: tickThoughtResearch,
  forgetThought: forgetThoughtFn,
  passiveBonuses: thoughtPassiveBonuses,
  snapshotCabinet,
  mergeUnlocked,
  describeThought,
} = require('../services/thoughts/thoughtCabinet');
// Skiv ticket #4: biome resonance reduces research cost when species
// biome_affinity matches session.biome_id. Looked up at the route layer
// because thoughtCabinet engine stays YAML-agnostic about species data.
const {
  hasResonance: hasBiomeResonance,
  computeResonanceTier,
} = require('../services/combat/biomeResonance');
// Skiv ticket #1: Thought Cabinet resolver wire — apply passive stats on
// internalize/forget transitions. Reads cabinet snapshot deltas, mutates
// unit.attack_mod / defense_dc / hp_max etc per effect_bonus / effect_cost.
const { updateThoughtPassives } = require('../services/thoughts/thoughtPassiveApply');
// Skiv ticket #3: Inner Voices — 24 Disco Elysium-style diegetic whispers
// (4 MBTI axes × 2 directions × 3 tiers). Pure evaluator, no combat effects.
const { evaluateVoiceTriggers, describeVoice } = require('../services/narrative/innerVoice');
// SPRINT_010 (issue #2): IA estratta in modulo dedicato.
// Le funzioni decisionali (selectAiPolicy, stepAway) vivono in services/ai/policy.js,
// l'orchestratore del turno (createSistemaTurnRunner) in services/ai/sistemaTurnRunner.js.
// DEFAULT_ATTACK_RANGE e' ora autoritativo in policy.js (usato sia qui che dall'IA).
const { DEFAULT_ATTACK_RANGE } = require('../services/ai/policy');
const { createSistemaTurnRunner } = require('../services/ai/sistemaTurnRunner');
const { createDeclareSistemaIntents } = require('../services/ai/declareSistemaIntents');
const { loadAiProfiles } = require('../services/ai/aiProfilesLoader');
const { computeThreatIndex } = require('../services/ai/threatAssessment');
const { createAbilityExecutor } = require('../services/abilityExecutor');
const reactionEngine = require('../services/reactionEngine');
// Sprint 7 Beast Bond (AncientBeast Tier S #6 residuo) — species-pair passive
// reactions post damage. Loader soft-fails when YAML missing (no-op silent).
const bondReactionTrigger = require('../services/combat/bondReactionTrigger');
// Trait-bond stat buff (complement to bondReactionTrigger above) — per-creature
// trait fires on actor's attack, grants buff to bonded ally holders. Different
// trigger semantics: ATTACK-time (not damage-time), STAT BUFF (not damage redirect).
const beastBondReaction = require('../services/combat/beastBondReaction');
// Status engine extension (2026-04-25 audit P0): wire 7 ancestor statuses
// (linked/fed/healing/attuned/sensed/telepatic_link/frenzy) runtime-active.
const { computeStatusModifiers } = require('../services/combat/statusModifiers');

// Audit 2026-04-25 sera (balance-auditor): cap totale duration per status
// type previene "sustained rage" durante kill chain (13 trait on_kill rage
// sources). Re-apply via Math.max(current, turns) → cap via Math.min(MAX, ...).
// Default rage/frenzy cap 5 turn (peer ferocia 3-turn variants caps + 2 round
// max combat momentum). panic/stunned/confused inherit short caps (3-4)
// per design intent. Status non listati → no cap (unchanged behavior).
const STATUS_DURATION_CAPS = {
  rage: 5,
  frenzy: 5,
  panic: 4,
  stunned: 3,
  confused: 3,
  bleeding: 5,
  marked: 2,
  slowed: 3,
  burning: 3,
  chilled: 2,
  disoriented: 1,
};
// M7-#2 Phase B: damage scaling curves runtime (ADR-2026-04-20).
const {
  loadDamageCurves,
  getEncounterClass,
  applyEnemyDamageMultiplier,
  shouldEnrageBoss,
  getEnrageModBonus,
} = require('../services/balance/damageCurves');
// M11 pilot (ADR-2026-04-21c, issue #1674) — trait environmental costs.
// Applica penalty/bonus biome-specific a unit basato su trait set × biome_id.
// Pilot 4×3: thermal_armor, zampe_a_molla, pelle_elastomera, denti_seghettati
// × savana, caverna_risonante, rovine_planari.
const { loadTraitEnvironmentalCosts, applyBiomeTraitCosts } = require('../services/traitEffects');
// QW1 (M-018 worldgen card): biome diff_base + stress_modifiers → runtime
// pressure / enemy HP. Same encounter on savana vs abisso_vulcanico now
// produces different numbers, not just different texture.
const { getBiomeModifiers, applyEnemyHpMultiplier } = require('../services/combat/biomeModifiers');
// M6-#1 (ADR-2026-04-19 + spike 2026-04-19): Node native resistance engine.
// Applica channel-specific resist/vuln su damage pre-hp. Evidence spike:
// 84.6% → 20% win rate hardcore-06 con flat 50% resist (leva confermata).
const {
  loadSpeciesResistances,
  applyResistance,
  computeUnitResistances,
  DEFAULT_SPECIES_RESISTANCES_PATH,
} = require('../services/combat/resistanceEngine');

// Extracted modules — constants + pure helpers (token optimization).
// See sessionConstants.js and sessionHelpers.js for the extracted code.
const {
  GRID_SIZE,
  DEFAULT_HP,
  DEFAULT_AP,
  DEFAULT_MOD,
  DEFAULT_DC,
  DEFAULT_GUARDIA,
  DEFAULT_INITIATIVE,
  DEFAULT_FACING,
  VALID_FACINGS,
  JOB_INITIATIVE,
  JOB_STATS,
  ASSIST_WINDOW_TURNS,
} = require('./sessionConstants');
const {
  rollD20,
  clampPosition,
  normaliseUnit,
  buildDefaultUnits,
  normaliseUnitsPayload,
  resolveAttack,
  timestampStamp,
  publicSessionView,
  buildTurnOrder,
  nextUnitId,
  manhattanDistance,
  pickLowestHpEnemy,
  stepTowards,
  isBackstab,
  attackQuadrant,
  computePositionalDamage,
  facingFromMove,
  predictCombat,
  applyApRefill,
} = require('./sessionHelpers');
// Skiv ticket #5 (Sprint B): Defy verb — player counter-pressure agency.
const { applyDefy: applyDefyAction, DEFY_SG_COST } = require('../services/combat/defyEngine');
const { createRoundBridge } = require('./sessionRoundBridge');
// M13 P3 Phase B — progression perks apply + runtime passive damage bonus.
const {
  applyProgressionToUnits,
  computePerkDamageBonus,
} = require('../services/progression/progressionApply');
// Sprint Spore Moderate (ADR-2026-04-26 §S6) — archetype passive consumers.
// DR-1 (defender) + sight+2 (actor). Init+2 lives in roundOrchestrator.
const {
  applyDamageReduction: applyArchetypeDR,
  effectiveAttackRange: archetypeEffectiveRange,
} = require('../services/combat/archetypePassives');
// M14-A 2026-04-25 — Triangle Strategy terrain reactions wire (post damage step).
// Lazy require + try/catch in call sites: missing module never breaks combat.
const {
  reactTile: terrainReactTile,
  ELEMENTS: TERRAIN_ELEMENTS,
} = require('../services/combat/terrainReactions');

// TKT-P6 — Rewind safety valve (snapshot pre-action + rewind endpoint).
const {
  snapshotSession,
  rewindSession,
  resetRewind,
  rewindStateSummary,
} = require('../services/combat/rewindBuffer');

// TKT-M15 — Promotion engine (FFT-style class advancement).
const { evaluatePromotion, applyPromotion } = require('../services/progression/promotionEngine');

// Italian channel → terrainReactions element mapping. Action.channel is the
// canonical attack channel string ("fuoco", "ghiaccio", ...). Only mapped
// channels trigger reactions; everything else (fisico, perforante, ...) skips.
const CHANNEL_TO_ELEMENT = {
  fuoco: 'fire',
  fire: 'fire',
  ghiaccio: 'ice',
  ice: 'ice',
  acqua: 'water',
  water: 'water',
  elettrico: 'lightning',
  folgore: 'lightning',
  lightning: 'lightning',
};

function tileKey(pos) {
  if (!pos) return null;
  const x = Number(pos.x);
  const y = Number(pos.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return `${x},${y}`;
}

// ADR-2026-04-16: round-based combat model migration. PR 2 di N —
// endpoint stubs dietro feature flag USE_ROUND_MODEL. Il modulo e'
// completamente isolato (PR #1387), esposto qui solo come dipendenza
// delle nuove route /declare-intent, /clear-intent/:id, /commit-round,
// /resolve-round. Il flusso legacy (/action, /turn/end) e' intatto.
const {
  createRoundOrchestrator,
  resolveRound: resolveRoundPure,
  PHASE_PLANNING,
  PHASE_COMMITTED,
  PHASE_RESOLVED,
} = require('../services/roundOrchestrator');

// Feature flag: l'intera superficie round-based e' disabilitata se
// Constants + pure helpers extracted to sessionConstants.js + sessionHelpers.js
// (imported above). Only createSessionRouter closure remains inline.

function createSessionRouter(options = {}) {
  const router = Router();
  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  const logsDir = options.logsDir || path.join(repoRoot, 'logs');
  const rng = typeof options.rng === 'function' ? options.rng : Math.random;
  const traitRegistry = options.traitRegistry || loadActiveTraitRegistry();
  const fairnessConfig = options.fairnessConfig || loadFairnessConfig();
  const telemetryConfig = options.telemetryConfig || loadTelemetryConfig();
  // M6-#1: species resistances data caricato una volta a session-router init.
  // Override path via env GAME_SPECIES_RESISTANCES_PATH o options.
  // Failure soft: null se file mancante → no channel resistance applicata.
  let speciesResistancesData = null;
  try {
    const srPath =
      options.speciesResistancesPath ||
      process.env.GAME_SPECIES_RESISTANCES_PATH ||
      DEFAULT_SPECIES_RESISTANCES_PATH;
    speciesResistancesData = loadSpeciesResistances(srPath);
  } catch (err) {
    console.warn(
      `[session] species_resistances.yaml non caricato (${err.message}). Channel resistance disabilitata.`,
    );
  }

  const sessions = new Map();
  let activeSessionId = null;

  // Telemetry helper — append JSONL entry to logs/telemetry_YYYYMMDD.jsonl.
  // Same schema as POST /telemetry (ts, session_id, player_id, type, payload)
  // but fired server-side for auto-instrumented events (tutorial_start/complete
  // funnel — ref telemetry-viz-illuminator agent P0 #2).
  async function appendTelemetryEvent({ session_id, player_id, type, payload }) {
    try {
      const now = new Date();
      const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');
      const telemetryPath = path.join(logsDir, `telemetry_${yyyymmdd}.jsonl`);
      const entry = {
        ts: now.toISOString(),
        session_id: session_id || null,
        player_id: player_id || null,
        type: type || 'unknown',
        payload: payload ?? null,
      };
      await fs.mkdir(logsDir, { recursive: true });
      await fs.appendFile(telemetryPath, JSON.stringify(entry) + '\n', 'utf8');
    } catch {
      // Non-blocking telemetry — never crash session on write failure.
    }
  }

  // Pattern matcher per tutorial scenario IDs (funnel analysis input).
  const TUTORIAL_SCENARIO_RE = /^enc_tutorial_\d+/;
  function isTutorialScenario(scenarioId) {
    return typeof scenarioId === 'string' && TUTORIAL_SCENARIO_RE.test(scenarioId);
  }

  // V5 SG lifecycle helper: reset per-turn earn counter su tutte le unit vive.
  // Invocato dopo ogni session.turn += 1 (4 sites: advanceThroughAiTurns,
  // /action early-end fallback, sessionRoundBridge round flow x2).
  function sgBeginTurnAll(session) {
    try {
      const sgTracker = require('../services/combat/sgTracker');
      for (const u of session.units || []) {
        if (u && u.hp > 0) sgTracker.beginTurn(u);
      }
    } catch {
      /* sgTracker optional */
    }
  }
  // P4 Thought Cabinet: sessionId -> Map<unitId, CabinetState>.
  // Phase 1 discovered ids live in `state.unlocked`; Phase 2 tracks research +
  // internalized slots for Disco Elysium-style passive effects.
  const thoughtsStore = new Map();
  // Skiv #3 Inner Voices: sessionId -> Map<unitId, Set<voiceId>>.
  const voicesStore = new Map();

  function getCabinetBucket(sessionId) {
    let bucket = thoughtsStore.get(sessionId);
    if (!bucket) {
      bucket = new Map();
      thoughtsStore.set(sessionId, bucket);
    }
    return bucket;
  }

  function getOrCreateCabinet(sessionId, unitId) {
    const bucket = getCabinetBucket(sessionId);
    let state = bucket.get(unitId);
    if (!state) {
      state = createCabinetState();
      bucket.set(unitId, state);
    }
    return { bucket, state };
  }

  function getVoicesHeard(sessionId, unitId) {
    let bucket = voicesStore.get(sessionId);
    if (!bucket) {
      bucket = new Map();
      voicesStore.set(sessionId, bucket);
    }
    let set = bucket.get(unitId);
    if (!set) {
      set = new Set();
      bucket.set(unitId, set);
    }
    return set;
  }

  function newSessionId() {
    return crypto.randomUUID();
  }

  function resolveSession(rawId) {
    const sessionId = rawId || activeSessionId;
    if (!sessionId) {
      return {
        error: {
          status: 400,
          body: { error: 'Nessuna sessione attiva. Chiama prima POST /api/session/start' },
        },
      };
    }
    const session = sessions.get(sessionId);
    if (!session) {
      return { error: { status: 404, body: { error: `Sessione ${sessionId} non trovata` } } };
    }
    return { session };
  }

  async function persistEvents(session) {
    if (!session.logFilePath) return;
    await fs.mkdir(path.dirname(session.logFilePath), { recursive: true });
    await fs.writeFile(session.logFilePath, `${JSON.stringify(session.events, null, 2)}\n`, 'utf8');
  }

  async function appendEvent(session, event) {
    // SPRINT_003 fase 0: action_index monotono per-sessione, utile per
    // ordinare deterministicamente gli eventi in VC scoring senza
    // dipendere dal timestamp (che puo' avere granularita' ms uguali).
    event.action_index = session.action_counter++;
    // B4 pattern: distingue azioni player da trigger automatici sistema
    // (bleed tick, status expiry, kill check). Default false.
    if (event.automatic === undefined) event.automatic = false;
    session.events.push(event);
    await persistEvents(session);
  }

  // SPRINT_021: Parata reattiva — design doc 10-SISTEMA_TATTICO.md riga 20.
  // Quando un target viene colpito, se ha guardia > 0 e non e' stunned,
  // tira un d20 reattivo. Successo se d20 + guardia >= PARRY_DC.
  // Effetto: damage −1 (minimo 0) + +1 PT difensivo tracciato.
  // Guardia decrementa di 1 ogni parata riuscita (mitigazione cumulativa).
  const PARRY_DC = 12;
  function rollParry(target) {
    if (!target || target.hp <= 0) return null;
    const guardia = Number(target.guardia) || 0;
    if (guardia <= 0) return null;
    // Target stordito non puo' parare
    if (target.status && Number(target.status.stunned) > 0) return null;
    const die = Math.floor(rng() * 20) + 1;
    const total = die + guardia;
    const success = total >= PARRY_DC;
    return {
      die,
      guardia_used: guardia,
      total,
      dc: PARRY_DC,
      success,
      damage_delta: success ? -1 : 0,
      pt_defensive: success ? 1 : 0,
    };
  }

  function performAttack(session, actor, target, action = null) {
    // M7-#2 Phase B: boss enrage check. Se actor è boss tier + HP < threshold
    // per encounter class → temporary mod bonus (non-persistente).
    // Identificazione boss: id contains "_boss" OR actor.tier === 'boss'.
    let enrageApplied = false;
    let enrageModBonus = 0;
    try {
      const actorIsBoss =
        (actor && typeof actor.id === 'string' && /_boss\b/.test(actor.id)) ||
        actor?.tier === 'boss';
      if (actorIsBoss && session?.encounter_class) {
        if (shouldEnrageBoss(actor, session.encounter_class)) {
          enrageModBonus = getEnrageModBonus();
          if (enrageModBonus > 0) {
            actor.mod = Number(actor.mod || 0) + enrageModBonus;
            enrageApplied = true;
          }
        }
      }
    } catch (err) {
      // non-blocking: se curves missing, no enrage
    }

    // Status engine extension: stack 7 ancestor statuses on top of ability
    // bonuses for this resolveAttack call only (revert post). Mirrors the
    // enrage pattern above to avoid persistent leak into actor.attack_mod_bonus
    // (owned by the ability executor + clearExpiredBonuses decay).
    let statusMods = { attackDelta: 0, defenseDelta: 0, log: [] };
    try {
      statusMods = computeStatusModifiers(actor, target, session.units || []);
      if (statusMods.attackDelta !== 0) {
        actor.attack_mod_bonus = Number(actor.attack_mod_bonus || 0) + statusMods.attackDelta;
      }
      if (statusMods.defenseDelta !== 0) {
        target.defense_mod_bonus = Number(target.defense_mod_bonus || 0) + statusMods.defenseDelta;
      }
    } catch (err) {
      // non-blocking: malformed status payload should never break combat
      statusMods = { attackDelta: 0, defenseDelta: 0, log: [] };
    }

    // Sprint 1 §I (2026-04-27) — Wesnoth time-of-day modifier (Tier S #5).
    // Applies attack_mod + damage_mod based on actor.alignment vs encounter.time_of_day.
    // Mirrors statusMods pattern (per-attack delta + revert post).
    let timeMods = { attack_mod: 0, damage_mod: 0, log: '' };
    try {
      const { getTimeModifier } = require('../services/combat/timeOfDayModifier');
      const timeOfDay = session?.encounter?.time_of_day || session?.time_of_day || 'day';
      timeMods = getTimeModifier(actor, timeOfDay);
      if (timeMods.attack_mod !== 0) {
        actor.attack_mod_bonus = Number(actor.attack_mod_bonus || 0) + timeMods.attack_mod;
      }
    } catch (err) {
      timeMods = { attack_mod: 0, damage_mod: 0, log: '' };
    }

    // Sprint 1 §II (2026-04-27) — AI War Defender's advantage (Tier S #10).
    // +1 attack_mod for SIS-defender vs player attacker. Asymmetric pattern.
    // Stack with statusMods + timeMods (all per-attack delta).
    let defenderAdv = { active: false, bonus: 0, reason: '' };
    try {
      const { getDefenderAdvantage } = require('../services/combat/defenderAdvantageModifier');
      // Note: terrainCover passed as null — full terrain integration TBD next sprint.
      defenderAdv = getDefenderAdvantage(actor, target, null);
      if (defenderAdv.active && defenderAdv.bonus !== 0) {
        // Defender bonus applies to TARGET's defense_mod_bonus (raises CD).
        // Pattern: target = AI defender, attacker = player → CD goes up.
        target.defense_mod_bonus = Number(target.defense_mod_bonus || 0) + defenderAdv.bonus;
      }
    } catch (err) {
      defenderAdv = { active: false, bonus: 0, reason: '' };
    }

    // Sprint 2 §I (2026-04-27) — Subnautica habitat lifecycle modifier (Tier A #9).
    // biome_affinity_per_stage YAML in data/core/species/<id>_lifecycle.yaml.
    // Phase preferred biome → +1 atk +1 def. Non-affine → -1 def. Apex/legacy = free roam.
    // Mirrors timeMods+defenderAdv pattern (per-attack delta + revert post).
    let biomeAffActor = { attack_mod: 0, defense_mod: 0, affinity: 'unknown', log: '' };
    let biomeAffTarget = { attack_mod: 0, defense_mod: 0, affinity: 'unknown', log: '' };
    try {
      const { getBiomeAffinityModifier } = require('../services/species/biomeAffinity');
      const encounterBiome =
        session?.encounter?.biome_id || session?.encounter?.biome || session?.biome_id || null;
      if (encounterBiome) {
        biomeAffActor = getBiomeAffinityModifier(actor, encounterBiome);
        biomeAffTarget = getBiomeAffinityModifier(target, encounterBiome);
        if (biomeAffActor.attack_mod !== 0) {
          actor.attack_mod_bonus = Number(actor.attack_mod_bonus || 0) + biomeAffActor.attack_mod;
        }
        // Target's own biome affinity affects its defense (defender ecology bonus).
        if (biomeAffTarget.defense_mod !== 0) {
          target.defense_mod_bonus =
            Number(target.defense_mod_bonus || 0) + biomeAffTarget.defense_mod;
        }
      }
    } catch (err) {
      biomeAffActor = { attack_mod: 0, defense_mod: 0, affinity: 'unknown', log: '' };
      biomeAffTarget = { attack_mod: 0, defense_mod: 0, affinity: 'unknown', log: '' };
    }

    // Chilled: -1 attack_mod_bonus per turno (freddo rallenta riflessi). Per-attack, revert post.
    const chilledPenalty = Number(actor.status?.chilled) > 0 ? 1 : 0;
    if (chilledPenalty > 0) {
      actor.attack_mod_bonus = Number(actor.attack_mod_bonus || 0) - chilledPenalty;
    }
    // Disoriented: -2 attack_mod_bonus (confusione sensoriale, dura 1 turno). Per-attack, revert post.
    const disorientedPenalty = Number(actor.status?.disoriented) > 0 ? 2 : 0;
    if (disorientedPenalty > 0) {
      actor.attack_mod_bonus = Number(actor.attack_mod_bonus || 0) - disorientedPenalty;
    }

    const result = resolveAttack({ actor, target, rng });
    const evaluation = evaluateAttackTraits({
      registry: traitRegistry,
      actor,
      target,
      attackResult: result,
      allUnits: session.units || [],
    });

    // Revert enrage bonus post-attack (non-persistente, solo per questo hit)
    if (enrageApplied) {
      actor.mod = Number(actor.mod || 0) - enrageModBonus;
    }
    // Sprint 1 — Revert time-of-day + defender advantage (per-attack, non-persistent).
    if (timeMods.attack_mod !== 0) {
      actor.attack_mod_bonus = Number(actor.attack_mod_bonus || 0) - timeMods.attack_mod;
    }
    if (defenderAdv.active && defenderAdv.bonus !== 0) {
      target.defense_mod_bonus = Number(target.defense_mod_bonus || 0) - defenderAdv.bonus;
    }
    // Sprint 2 — Revert biome affinity deltas (per-attack, non-persistent).
    if (biomeAffActor.attack_mod !== 0) {
      actor.attack_mod_bonus = Number(actor.attack_mod_bonus || 0) - biomeAffActor.attack_mod;
    }
    if (biomeAffTarget.defense_mod !== 0) {
      target.defense_mod_bonus = Number(target.defense_mod_bonus || 0) - biomeAffTarget.defense_mod;
    }
    // Revert status engine deltas (per-attack, non-persistente).
    if (statusMods.attackDelta !== 0) {
      actor.attack_mod_bonus = Number(actor.attack_mod_bonus || 0) - statusMods.attackDelta;
    }
    if (statusMods.defenseDelta !== 0) {
      target.defense_mod_bonus = Number(target.defense_mod_bonus || 0) - statusMods.defenseDelta;
    }
    // Revert chilled attack penalty (per-attack, non-persistente).
    if (chilledPenalty > 0) {
      actor.attack_mod_bonus = Number(actor.attack_mod_bonus || 0) + chilledPenalty;
    }
    // Revert disoriented attack penalty (per-attack, non-persistente).
    if (disorientedPenalty > 0) {
      actor.attack_mod_bonus = Number(actor.attack_mod_bonus || 0) + disorientedPenalty;
    }
    let damageDealt = 0;
    let killOccurred = false;
    let adjacencyBonus = 0;
    let rageBonus = 0;
    let markedBonus = 0;
    let backstabBonus = 0;
    let wasBackstab = false;
    let panicTriggered = false;
    let parryResult = null;
    let interceptResult = null;
    let bondReactionResult = null;
    let terrainReactionResult = null;
    // M14-A residuo close (TKT-09 2026-04-26): surface positional info
    // (elevation_delta + multiplier) on performAttack return so callers can
    // emit `elevation_multiplier` field for log/telemetry consumers.
    let positionalInfo = null;
    if (result.hit) {
      const baseDamage = 1 + result.pt;
      // SPRINT_007 fase 1 (issue #4): bonus damage +1 quando l'attaccante
      // e' strettamente adiacente al bersaglio (Manhattan == 1). Incentiva
      // la scelta tattica di entrare in mischia anche se skirmisher/ranger
      // hanno range superiore.
      const attackDist = manhattanDistance(actor.position, target.position);
      if (attackDist === 1) {
        adjacencyBonus = 1;
      }
      // SPRINT_013 (issue #10): bonus rage — se l'attaccante e' in stato
      // rage, +1 damage in aggiunta al bonus adiacenza.
      if (actor.status && Number(actor.status.rage) > 0) {
        rageBonus = 1;
      }
      // Phase A marked: target marcato → +1 dmg al prossimo attaccante, mark consumato.
      if (target.status && Number(target.status.marked) > 0) {
        markedBonus = 1;
        target.status.marked = 0;
      }
      // SPRINT_022: bonus backstab — se l'actor attacca dalle spalle del
      // target (posizione dietro il suo facing), +1 damage. Cumulativo con
      // adjacency e rage. Inoltre: un backstab BYPASSA la parata (sorpresa).
      wasBackstab = isBackstab(actor, target);
      if (wasBackstab) {
        backstabBonus = 1;
      }
      // SPRINT_021: parata reattiva. SPRINT_022: saltata se backstab.
      parryResult = wasBackstab ? null : rollParry(target);
      const parryDelta = parryResult && parryResult.success ? parryResult.damage_delta : 0;
      // M13 P3 Phase B — perk passive damage bonus (5 tags live).
      const perkBonus = computePerkDamageBonus(actor, target, {
        units: session.units || [],
        isFirstStrike: !actor._first_strike_used,
      });
      const adjusted =
        baseDamage +
        evaluation.damage_modifier +
        adjacencyBonus +
        rageBonus +
        markedBonus +
        backstabBonus +
        perkBonus.bonus +
        parryDelta;
      // M14-B 2026-04-25 — Triangle Strategy positional multiplier wire.
      // Elevation delta >=1 → +30% dmg; flank → +15%; rear bonus already
      // covered by legacy backstabBonus (rearMultiplier stays 0 to avoid
      // double-apply). When unit.elevation/facing missing, multiplier = 1
      // → zero behavior change vs pre-M14-B.
      const positional = computePositionalDamage({
        actor,
        target,
        baseDamage: Math.max(0, adjusted),
      });
      damageDealt = positional.damage;
      positionalInfo = {
        multiplier: Number(positional.multiplier) || 1,
        elevation_delta: Number(positional.elevation_delta) || 0,
        elevation_multiplier: (positional.parts && Number(positional.parts.elevation)) || 1,
        flank_multiplier: (positional.parts && Number(positional.parts.flank)) || 1,
        quadrant: positional.quadrant || 'front',
      };
      if (perkBonus.applied.some((p) => p.tag === 'first_strike_bonus')) {
        actor._first_strike_used = true;
      }
      // M6-#1 (ADR-2026-04-19): applica channel resistance post damage.
      // Resolve target.resistances lazy: computa da resistance_archetype +
      // trait_ids al primo hit (cache su target._resistances).
      // Channel da action.channel (client-provided) o default "fisico".
      // Se speciesResistancesData null (file mancante) → no-op.
      if (speciesResistancesData && damageDealt > 0) {
        if (!Array.isArray(target._resistances)) {
          const traitResists = [];
          for (const tid of Array.isArray(target.traits) ? target.traits : []) {
            const entry = traitRegistry && traitRegistry[tid];
            if (entry && Array.isArray(entry.resistances)) {
              for (const r of entry.resistances) traitResists.push(r);
            }
          }
          target._resistances = computeUnitResistances(
            target.resistance_archetype || null,
            speciesResistancesData,
            traitResists,
          );
        }
        // M6-#1b: channel routing dinamico via action.channel (post refactor
        // performAttack firma accetta `action` param). Fallback "fisico"
        // quando action è null (overwatch lambda) o channel assente.
        const channel =
          (action && typeof action.channel === 'string' && action.channel) || 'fisico';
        damageDealt = applyResistance(damageDealt, target._resistances, channel);
      }
      // Consuma guardia solo se parata riuscita (mitigazione cumulativa)
      if (parryResult && parryResult.success) {
        target.guardia = Math.max(0, Number(target.guardia) - 1);
      }
      // Ability shield (energy_barrier): assorbi damage da target.shield_hp
      // prima di applicarlo a HP. Status target.status.shield_buff tracking
      // duration; al decay roundBridge azzera shield_hp.
      if (Number(target.shield_hp) > 0 && damageDealt > 0) {
        const absorbed = Math.min(Number(target.shield_hp), damageDealt);
        target.shield_hp = Math.max(0, Number(target.shield_hp) - absorbed);
        damageDealt = Math.max(0, damageDealt - absorbed);
        target.shield_absorbed_last = absorbed;
      }
      // Sprint Spore Moderate (ADR-2026-04-26 §S6) — archetype tank_plus DR-1.
      // Defender-side passive: -1 damage unconditional su ogni colpo subito,
      // min 0 floor. Applied DOPO shield absorption (shield = ablative HP,
      // DR = innate mitigation). Back-compat: zero behavior change quando
      // target._archetype_passives non include archetype_tank_plus_dr1.
      if (damageDealt > 0) {
        const drResult = applyArchetypeDR(damageDealt, target);
        if (drResult.reduced > 0) {
          damageDealt = drResult.damage;
          target.archetype_dr_last = drResult.reduced;
        }
      }
      // SPRINT_003 fase 0: traccia damage_taken cumulativo per unita'.
      // Lo stato e' in memoria (non nel log) — VC scoring lo ricalcola
      // dagli eventi per restare stateless.
      session.damage_taken[target.id] = (session.damage_taken[target.id] || 0) + damageDealt;
      // V5 SG earn (ADR-2026-04-26 Opzione C mixed): accumulate dealt+taken.
      if (damageDealt > 0) {
        try {
          const sgTracker = require('../services/combat/sgTracker');
          sgTracker.accumulate(actor, { damage_dealt: damageDealt });
          sgTracker.accumulate(target, { damage_taken: damageDealt });
        } catch {
          /* sgTracker optional */
        }
      }
      target.hp = Math.max(0, target.hp - damageDealt);
      if (target.hp === 0) {
        killOccurred = true;
      }
      // Sprint α (Hard West 2 pattern): bravado AP refill su chain-kill player.
      // Solo player (asimmetria risk/reward); cap actor.ap. Lazy require.
      // Opt-in via BRAVADO_ENABLED=true (default OFF per back-compat con
      // tutorial AP budget tests). Activation deferred a calibration sprint
      // (segue pattern LOBBY_WS_ENABLED M11).
      if (killOccurred && process.env.BRAVADO_ENABLED === 'true') {
        try {
          const { onKillRefill } = require('../services/combat/bravado');
          const bravadoRes = onKillRefill(actor, target);
          if (bravadoRes.refilled > 0) {
            actor.bravado_refill_last = bravadoRes.refilled;
          }
        } catch {
          /* bravado optional */
        }
      }
      // iter4 reaction engine: intercept reroute damage da target a alleato
      // adiacente con `intercept` armed. Restore target.hp + transfer to interceptor.
      if (damageDealt > 0) {
        interceptResult = reactionEngine.triggerOnDamage(session, actor, target, damageDealt);
        if (interceptResult) {
          killOccurred = false; // target survived
          panicTriggered = false; // panic non si applica se danno deviato
        }
      }
      // Sprint 7 Beast Bond — species-pair passive reaction post damage.
      // Skip when intercept already fired (target didn't take the hit, the
      // interceptor did — bond pre-empted by intercept armed reaction).
      if (damageDealt > 0 && !interceptResult) {
        bondReactionResult = bondReactionTrigger.triggerBondReaction(
          session,
          actor,
          target,
          damageDealt,
          {
            performAttack: (allyUnit, attackerUnit) =>
              performAttack(session, allyUnit, attackerUnit, null),
          },
        );
        if (bondReactionResult) {
          if (bondReactionResult.type === 'shield_ally') {
            // Target restored by half damage absorbed → killOccurred reset
            // when target was put exactly to 0 by this attack and absorb
            // brought it back to >0. panicTriggered re-eval already happened
            // pre-bond via target.hp gate; preserve original.
            if (target.hp > 0) {
              killOccurred = false;
            }
          }
        }
      }
      // SPRINT_013 (issue #10): trigger panic nel target se subisce un
      // colpo critico (MoS >= 8). Il target non e' ancora morto (target.hp
      // potrebbe essere a 0 ma panic su un'unita' KO e' innocuo). Applica
      // 2 turni di panic.
      if (result.mos >= 8 && target.status && target.hp > 0) {
        target.status.panic = Math.max(Number(target.status.panic) || 0, 2);
        panicTriggered = true;
      }

      // M14-A: terrain reaction post damage step (additive, non-blocking).
      // action.channel ("fuoco"/"ghiaccio"/...) maps to terrainReactions element.
      // Only fires for mapped channels; tile state mutated in session.tile_state_map.
      // Burst damage from reaction (e.g. steam_burst, electrify) applied to target
      // if still alive. Result attached to performAttack return for caller emit.
      try {
        const channel = (action && typeof action.channel === 'string' && action.channel) || null;
        const element = channel ? CHANNEL_TO_ELEMENT[channel.toLowerCase()] : null;
        const key = tileKey(target.position);
        if (element && key && TERRAIN_ELEMENTS.includes(element)) {
          if (!session.tile_state_map || typeof session.tile_state_map !== 'object') {
            session.tile_state_map = {};
          }
          const prev = session.tile_state_map[key] || null;
          const reaction = terrainReactTile(prev, { element, actor_id: actor.id });
          // Persist tile state mutation (mkState always returns object).
          session.tile_state_map[key] = reaction.nextState;
          terrainReactionResult = {
            position: { x: Number(target.position.x), y: Number(target.position.y) },
            prev_state: prev ? prev.type : 'normal',
            new_state: reaction.nextState.type,
            source_channel: channel,
            element,
            burst_damage: Number(reaction.burstDamage) || 0,
            effects: Array.isArray(reaction.effects) ? reaction.effects.slice() : [],
          };
          // Apply burst damage to occupant (still alive) — feeds back into HP.
          if (terrainReactionResult.burst_damage > 0 && target.hp > 0) {
            const burst = terrainReactionResult.burst_damage;
            target.hp = Math.max(0, target.hp - burst);
            damageDealt += burst;
            session.damage_taken[target.id] = (session.damage_taken[target.id] || 0) + burst;
            if (target.hp === 0) {
              killOccurred = true;
            }
          }
        }
      } catch (err) {
        // Non-blocking: malformed tile state must never break combat.
        // eslint-disable-next-line no-console
        console.warn('[terrain-reaction] skipped:', err && err.message ? err.message : err);
      }
    }

    // Sprint Y Spore Moderate (ADR-2026-04-26 §S5) — lineage propagation hook.
    // Quando target muore (killOccurred) E aveva applied_mutations[], propaga
    // le sue mutation nel pool lineage (species, biome) per inheritance da
    // future creature dello stesso species_id nello stesso biome.
    // Pure side-effect: pool in-memory, no errori bloccano combat.
    if (
      killOccurred &&
      Array.isArray(target.applied_mutations) &&
      target.applied_mutations.length > 0
    ) {
      try {
        const { propagateLineage } = require('../services/generation/lineagePropagator');
        const speciesId = target.species_id || target.species || null;
        const biomeId = session.biome_id || null;
        if (speciesId && biomeId) {
          propagateLineage(target, speciesId, biomeId);
        }
      } catch (err) {
        // Non-blocking: lineage failure must never break combat.
        // eslint-disable-next-line no-console
        console.warn('[lineage-propagator] skipped:', err && err.message ? err.message : err);
      }
    }

    // SPRINT_018: valuta i trait di tipo apply_status (ferocia, intimidatore,
    // stordimento) DOPO l'applicazione del danno, cosi' i trigger possono
    // dipendere da killOccurred. Il risultato muta actor.status /
    // target.status (se vivi) e i trait_effects del log.
    let statusApplies = [];
    if (result.hit) {
      const statusEval = evaluateStatusTraits({
        registry: traitRegistry,
        actor,
        target,
        attackResult: result,
        killOccurred,
        allUnits: session.units || [],
      });
      // Merge dei trait_effects di status nel risultato evaluation
      if (Array.isArray(statusEval.trait_effects)) {
        evaluation.trait_effects = (evaluation.trait_effects || []).concat(
          statusEval.trait_effects,
        );
      }
      // Status engine extension: surface status modifier log (linked,
      // sensed, attuned, frenzy, telepatic_link) under trait_effects so
      // observability surface is unified.
      if (Array.isArray(statusMods.log) && statusMods.log.length > 0) {
        const synthetic = statusMods.log.map((entry) => ({
          trait: `status:${entry.status}`,
          triggered: true,
          effect: { kind: 'status_modifier', side: entry.side, detail: entry.effect },
        }));
        evaluation.trait_effects = (evaluation.trait_effects || []).concat(synthetic);
      }
      statusApplies = statusEval.status_applies || [];
      for (const s of statusApplies) {
        const unit = s.target_side === 'actor' ? actor : target;
        if (!unit || unit.hp <= 0 || !unit.status) continue;
        const current = Number(unit.status[s.stato]) || 0;
        // Audit 2026-04-25 sera (balance-auditor): kill chain re-apply rage
        // pattern → sustained rage durante kill streak. Cap totale per status
        // type previene "permanent rage" scenario in late combat.
        // Frenzy (PR #1822) stesso pattern, stesso cap.
        const cap = STATUS_DURATION_CAPS[s.stato];
        const merged = Math.max(current, s.turns);
        unit.status[s.stato] = cap !== undefined ? Math.min(cap, merged) : merged;
      }
    }

    // Sprint 6 (2026-04-27) — Beast Bond reaction trigger (AncientBeast Tier
    // S #6 residuo). Pure read-only scan: detect which allies of the actor
    // (same controlled_by, alive, within Manhattan range, species filter)
    // would receive the bond. Mutations (attack_mod_bonus, status[*_buff])
    // are applied by the round bridge AFTER syncStatusesFromRoundState so
    // the orchestrator does not wipe them as untracked statuses. Fires on
    // hit OR miss (tactical "ally engaged" signal). Non-blocking.
    let beastBondReactions = [];
    try {
      const detected = beastBondReaction.checkBeastBondReactions(
        actor,
        session.units || [],
        traitRegistry || {},
      );
      beastBondReactions = detected.map((r) => ({
        holder_id: r.holder_id,
        trait_id: r.trait_id,
        atk_delta: r.effect.atk_delta,
        def_delta: r.effect.def_delta,
        duration: r.effect.duration,
        log_tag: r.log_tag,
      }));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[beast-bond] skipped:', err && err.message ? err.message : err);
      beastBondReactions = [];
    }

    return {
      result,
      evaluation,
      damageDealt,
      killOccurred,
      adjacencyBonus,
      rageBonus,
      backstabBonus,
      wasBackstab,
      panicTriggered,
      status_applies: statusApplies,
      parry: parryResult,
      intercept: interceptResult,
      bond_reaction: bondReactionResult,
      terrain_reaction: terrainReactionResult,
      positional: positionalInfo,
      biome_affinity: {
        actor: biomeAffActor.affinity,
        target: biomeAffTarget.affinity,
      },
      beast_bond_reactions: beastBondReactions,
    };
  }

  async function emitKillAndAssists(session, killer, target, attackEvent) {
    // SPRINT_003 fase 0: emette un evento `kill` + 0..N eventi `assist`
    // dopo un attacco che porta target.hp a 0. Gli assist vengono dati
    // alle unita' che hanno inflitto >=1 damage_dealt al target nella
    // finestra di ASSIST_WINDOW_TURNS turni precedenti (escluso killer).
    const killTurn = session.turn;
    const assistorIds = new Set();
    // Parti da -2 perche' -1 e' l'evento attack appena appeso.
    for (let i = session.events.length - 2; i >= 0; i -= 1) {
      const ev = session.events[i];
      if (!ev || typeof ev.turn !== 'number') continue;
      if (killTurn - ev.turn > ASSIST_WINDOW_TURNS) break;
      if (ev.action_type !== 'attack') continue;
      if (ev.target_id !== target.id) continue;
      if (ev.result !== 'hit') continue;
      if (Number(ev.damage_dealt) < 1) continue;
      if (ev.actor_id === killer.id) continue;
      if (
        attackEvent.ia_controlled_unit &&
        ev.ia_controlled_unit === attackEvent.ia_controlled_unit
      ) {
        // Evento IA precedente dello stesso unit controllato dal sistema.
        continue;
      }
      assistorIds.add(ev.actor_id);
    }

    const killEvent = {
      ts: new Date().toISOString(),
      session_id: session.session_id,
      action_type: 'kill',
      automatic: true,
      actor_id: attackEvent.actor_id, // puo' essere 'sistema' per IA
      actor_species: killer.species,
      actor_job: killer.job,
      target_id: target.id,
      turn: killTurn,
      killing_blow: {
        die: attackEvent.die,
        roll: attackEvent.roll,
        mos: attackEvent.mos,
        pt: attackEvent.pt,
        damage_dealt: attackEvent.damage_dealt,
      },
    };
    if (attackEvent.ia_rule) killEvent.ia_rule = attackEvent.ia_rule;
    if (attackEvent.ia_controlled_unit)
      killEvent.ia_controlled_unit = attackEvent.ia_controlled_unit;
    await appendEvent(session, killEvent);

    for (const assistorId of assistorIds) {
      const assistUnit = session.units.find((u) => u.id === assistorId);
      const assistEvent = {
        ts: new Date().toISOString(),
        session_id: session.session_id,
        action_type: 'assist',
        actor_id: assistorId,
        actor_species: assistUnit?.species || 'unknown',
        actor_job: assistUnit?.job || 'unknown',
        target_id: target.id,
        killer_id: attackEvent.actor_id,
        turn: killTurn,
        window_turns: ASSIST_WINDOW_TURNS,
      };
      await appendEvent(session, assistEvent);
    }
  }

  function buildAttackEvent({
    session,
    actor,
    target,
    result,
    evaluation,
    damageDealt,
    hpBefore,
    targetPositionAtAttack,
    terrainReaction,
    positional,
  }) {
    const event = {
      ts: new Date().toISOString(),
      session_id: session.session_id,
      actor_id: actor.id,
      actor_species: actor.species,
      actor_job: actor.job,
      action_type: 'attack',
      target_id: target.id,
      // SPRINT_003 fase 0: turn + ap_spent + target_position_at_attack
      turn: session.turn,
      ap_spent: 1,
      target_position_at_attack: targetPositionAtAttack || { ...target.position },
      die: result.die,
      roll: result.roll,
      dc: result.dc,
      mos: result.mos,
      result: result.hit ? 'hit' : 'miss',
      pt: result.pt,
      damage_dealt: damageDealt,
      trait_effects: evaluation.trait_effects,
      target_hp_before: hpBefore,
      target_hp_after: target.hp,
      position_from: { ...actor.position },
      position_to: { ...actor.position },
    };
    // M14-A: surface terrain reaction on attack event for round log + clients.
    if (terrainReaction && terrainReaction.new_state !== terrainReaction.prev_state) {
      event.terrain_reaction = terrainReaction;
    }
    // M14-A residuo (TKT-09 2026-04-26): surface elevation/positional multiplier
    // su attack event SOLO se delta != 0 (rumor reduction — front+same-elev = 1.0
    // dominante, log gets noisy se sempre presente). Telemetry consumers (Atlas
    // live, calibration harness) si aspettano i campi solo quando rilevanti.
    if (
      positional &&
      ((Number(positional.elevation_delta) || 0) !== 0 ||
        (Number(positional.multiplier) || 1) !== 1)
    ) {
      event.elevation_multiplier = Number(positional.elevation_multiplier) || 1;
      event.elevation_delta = Number(positional.elevation_delta) || 0;
      event.positional_multiplier = Number(positional.multiplier) || 1;
      if (positional.quadrant && positional.quadrant !== 'front') {
        event.attack_quadrant = positional.quadrant;
      }
    }
    return event;
  }

  function buildMoveEvent({ session, actor, positionFrom }) {
    // SPRINT_008 (issue #7): ap_spent = distanza Manhattan reale del move,
    // non piu' flat 1. Usato dal log + dalla telemetria per capire il
    // costo effettivo.
    const dist = manhattanDistance(positionFrom, actor.position);
    return {
      ts: new Date().toISOString(),
      session_id: session.session_id,
      actor_id: actor.id,
      actor_species: actor.species,
      actor_job: actor.job,
      action_type: 'move',
      turn: session.turn,
      ap_spent: dist || 1,
      position_from: positionFrom,
      position_to: { ...actor.position },
      trait_effects: [],
    };
  }

  // SPRINT_010 (issue #2): runSistemaTurn e' estratto in services/ai/sistemaTurnRunner.js.
  // Qui lo costruiamo via factory iniettando le dipendenze del router
  // (performAttack, buildAttackEvent, buildMoveEvent, emitKillAndAssists,
  // appendEvent, pickLowestHpEnemy, manhattanDistance, stepTowards).
  // Policy decisionale (selectAiPolicy, stepAway) vive in services/ai/policy.js.
  const runSistemaTurn = createSistemaTurnRunner({
    pickLowestHpEnemy,
    manhattanDistance,
    stepTowards,
    performAttack,
    buildAttackEvent,
    buildMoveEvent,
    emitKillAndAssists,
    appendEvent,
    gridSize: GRID_SIZE,
  });

  // PR 5 (ADR-2026-04-16 M5b): declareSistemaIntents factory wirato al
  // closure session.js. Produce intents pure (nessuna mutazione) per
  // tutte le unita' SIS-controlled. Usato solo quando USE_ROUND_MODEL
  // e' attivo nel wrapper /turn/end legacy.
  //
  // ADR-2026-04-17 Q-001 T3.1: ai_profiles.yaml caricato al boot. Flag
  // `use_utility_brain` per-profile controlla attivazione Utility AI
  // (gradual rollout). Default global `useUtilityAi=false` fallback.
  const aiProfiles = loadAiProfiles();
  const declareSistemaIntents = createDeclareSistemaIntents({
    pickLowestHpEnemy,
    stepTowards,
    manhattanDistance,
    gridSize: GRID_SIZE,
    aiProfiles,
    // AI War pattern: inject threat index computation. Allows declareSistemaIntents
    // to factor escalation tier (passive/normal/aggressive/critical) into intent
    // selection. See apps/backend/services/ai/threatAssessment.js + audit
    // 2026-05-07 (orphan engine wire).
    computeThreatIndex,
  });

  // Round bridge factory — all round-model functions live in sessionRoundBridge.js.
  // Orchestrator created here (needs rng from closure) with no-op resolveAction;
  // the bridge injects real resolveAction per-request via resolveRoundPure.
  const roundOrchestrator = createRoundOrchestrator({
    resolveAction: (state) => ({
      nextState: JSON.parse(JSON.stringify(state)),
      turnLogEntry: { damage_applied: 0, healing_applied: 0 },
    }),
    defaultRng: rng,
  });
  const roundBridge = createRoundBridge({
    performAttack,
    buildAttackEvent,
    buildMoveEvent,
    emitKillAndAssists,
    appendEvent,
    persistEvents,
    consumeCapPt,
    declareSistemaIntents,
    roundOrchestrator,
    rng,
    resolveSession,
    manhattanDistance,
    gridSize: GRID_SIZE,
    defaultAttackRange: DEFAULT_ATTACK_RANGE,
    // Sprint 6 (P4 Disco Tier S #9): bridge ticks every research timer
    // by 1 round inside applyEndOfRoundSideEffects.
    getCabinetBucket,
  });
  const { handleLegacyAttackViaRound, handleTurnEndViaRound } = roundBridge;

  // FRICTION #4 MVP (playtest 2026-04-17): ability executor.
  // POST /api/session/action con action_type='ability' → executor dispatcher
  // (move_attack, attack_move, buff, heal; altri effect_type = 501).
  const abilityExecutor = createAbilityExecutor({
    performAttack,
    buildAttackEvent,
    buildMoveEvent,
    appendEvent,
    manhattanDistance,
    gridSize: GRID_SIZE,
    rng,
  });

  // SPRINT_020: helper riutilizzabile che avanza attraverso tutti i turni
  // IA non-player fino a fermarsi su un player vivo (o nessuno). Ritorna
  // { iaActions, bleedingEvents } accumulati dall'intera catena. Usato
  // sia da /start (se la prima unita' e' un SIS) sia da /turn/end (dopo
  // che il player ha finito).
  async function advanceThroughAiTurns(session) {
    const iaActions = [];
    const bleedingEvents = [];

    const applyBleeding = async (unit) => {
      if (!unit || !unit.status || unit.hp <= 0) return;
      const bleedTurns = Number(unit.status.bleeding) || 0;
      if (bleedTurns <= 0) return;
      const dmg = 1;
      const hpBefore = unit.hp;
      unit.hp = Math.max(0, unit.hp - dmg);
      session.damage_taken[unit.id] = (session.damage_taken[unit.id] || 0) + dmg;
      await appendEvent(session, {
        ts: new Date().toISOString(),
        session_id: session.session_id,
        action_type: 'bleeding',
        automatic: true,
        actor_id: unit.id,
        actor_species: unit.species,
        actor_job: unit.job,
        target_id: unit.id,
        turn: session.turn,
        damage_dealt: dmg,
        result: 'hit',
        hp_before: hpBefore,
        hp_after: unit.hp,
        bleeding_remaining: bleedTurns - 1,
        trait_effects: [],
      });
      bleedingEvents.push({
        unit_id: unit.id,
        damage: dmg,
        hp_after: unit.hp,
        killed: unit.hp === 0,
      });
    };
    const applyBurning = async (unit) => {
      if (!unit || !unit.status || unit.hp <= 0) return;
      const burnTurns = Number(unit.status.burning) || 0;
      if (burnTurns <= 0) return;
      const dmg = 2;
      const hpBefore = unit.hp;
      unit.hp = Math.max(0, unit.hp - dmg);
      session.damage_taken[unit.id] = (session.damage_taken[unit.id] || 0) + dmg;
      await appendEvent(session, {
        ts: new Date().toISOString(),
        session_id: session.session_id,
        action_type: 'burning',
        automatic: true,
        actor_id: unit.id,
        actor_species: unit.species,
        actor_job: unit.job,
        target_id: unit.id,
        turn: session.turn,
        damage_dealt: dmg,
        result: 'hit',
        hp_before: hpBefore,
        hp_after: unit.hp,
        burning_remaining: burnTurns - 1,
        trait_effects: [],
      });
      bleedingEvents.push({
        unit_id: unit.id,
        damage: dmg,
        hp_after: unit.hp,
        killed: unit.hp === 0,
      });
    };
    const resetAp = (unit) => {
      // Skiv #5: applyApRefill centralises fracture + defy_penalty handling.
      applyApRefill(unit);
    };
    const decrement = (unit) => {
      if (!unit || !unit.status) return;
      for (const key of Object.keys(unit.status)) {
        const v = Number(unit.status[key]);
        if (v > 0) unit.status[key] = v - 1;
      }
    };

    let safety = (session.units || []).length + 1;
    while (safety > 0) {
      safety -= 1;
      const actor = session.units.find((u) => u.id === session.active_unit);
      if (!actor || actor.controlled_by !== 'sistema' || actor.hp <= 0) break;
      await applyBleeding(actor);
      if (actor.hp > 0) await applyBurning(actor);
      if (actor.hp > 0) {
        resetAp(actor);
        const actions = await runSistemaTurn(session);
        if (Array.isArray(actions)) iaActions.push(...actions);
      }
      decrement(actor);
      const nextId = nextUnitId(session);
      session.active_unit = nextId;
      session.turn += 1;
      sgBeginTurnAll(session);
    }

    return { iaActions, bleedingEvents };
  }

  router.post('/start', async (req, res, next) => {
    try {
      const sessionId = newSessionId();
      const now = new Date();
      const logFilePath = path.join(logsDir, `session_${timestampStamp(now)}.json`);

      // M16 P0-1 (ADR coop-mvp-spec): if `characters` array provided, convert
      // each character → unit with owner_id = player_id. Enemies from scenario
      // appended via req.body.units. Both coexist: characters first, then
      // units (scenario enemies) appended.
      let characterUnits = [];
      if (Array.isArray(req.body?.characters) && req.body.characters.length > 0) {
        const { characterToUnit } = require('../services/coop/coopOrchestrator');
        characterUnits = req.body.characters
          .map((ch, idx) => characterToUnit(ch, { index: idx }))
          .filter(Boolean);
      }
      const scenarioUnits = normaliseUnitsPayload(req.body?.units);
      // If character path used, filter out any default player units from
      // scenarioUnits to avoid duplicates (keep only sistema-controlled).
      let units;
      if (characterUnits.length > 0) {
        const scenarioEnemies = scenarioUnits.filter((u) => u && u.controlled_by === 'sistema');
        units = [...normaliseUnitsPayload(characterUnits), ...scenarioEnemies];
      } else {
        units = scenarioUnits;
      }

      // Q-001 T2.3 PR-3: applica difficulty profile scaling (opt-in, default normal)
      const requestedProfile =
        typeof req.body?.difficulty_profile === 'string'
          ? req.body.difficulty_profile.trim()
          : 'normal';
      let difficultyProfileMeta = null;
      try {
        const { getDifficultyConfig } = require('../../../services/difficulty/loader');
        const { applyPlayerProfile } = require('../../../services/difficulty/difficultyCalculator');
        const diffCfg = getDifficultyConfig();
        if (diffCfg.player_difficulty_profiles[requestedProfile]) {
          const mockEncounter = {
            waves: [{ units: units.map((u) => ({ species: u.id, count: 1, tier: 'base' })) }],
          };
          const scaled = applyPlayerProfile(mockEncounter, requestedProfile, diffCfg);
          difficultyProfileMeta = scaled._difficultyProfile;

          // Applica enemy_hp_multiplier + player_hp_multiplier a units SIS vs player
          const hpMultEnemy = difficultyProfileMeta.enemy_hp_multiplier || 1.0;
          const hpMultPlayer = difficultyProfileMeta.player_hp_multiplier || 1.0;
          units = units.map((u) => {
            if (!u) return u;
            const isSis = u.controlled_by === 'sistema';
            const mult = isSis ? hpMultEnemy : hpMultPlayer;
            if (mult === 1.0) return u;
            const newMax = Math.round(Number(u.max_hp || u.hp || 10) * mult);
            return { ...u, hp: newMax, max_hp: newMax };
          });
        }
      } catch {
        // best-effort: se config non carica, skip profile scaling
      }

      // M11 pilot (ADR-2026-04-21c, issue #1674): apply biome environmental
      // trait costs. Legge biome_id da req.body (top-level) con fallback
      // req.body.encounter?.biome_id. Pilot scope 4 trait × 3 biomi = 12 cell.
      // Session-scoped compute (no Prisma persistence).
      const biomeIdRaw = req.body?.biome_id || req.body?.encounter?.biome_id || null;
      let biomeCostsLog = [];
      if (biomeIdRaw) {
        try {
          const biomeCostsRegistry = loadTraitEnvironmentalCosts();
          if (biomeCostsRegistry && biomeCostsRegistry.trait_costs) {
            units = units.map((u) => {
              if (!u) return u;
              const clone = { ...u };
              const applied = applyBiomeTraitCosts(clone, biomeIdRaw, biomeCostsRegistry);
              if (applied && applied.length) {
                biomeCostsLog.push({ unit_id: clone.id, applied });
              }
              return clone;
            });
          }
        } catch (err) {
          console.warn('[trait-env-costs] apply failed:', err.message);
        }
      }

      // QW1 (M-018) — biome diff_base + stress_modifiers → runtime knobs.
      // Compute once per session. Safe defaults if biome_id missing/unknown
      // (no-op multipliers, zero pressure bonus). Enemy HP scaled here so
      // downstream pipeline (objectives, balance) reads the modulated values.
      const biomeModifiers = getBiomeModifiers(biomeIdRaw);
      if (biomeModifiers.hp_mult !== 1.0) {
        applyEnemyHpMultiplier(units, biomeModifiers.hp_mult);
      }

      // M13 P3 Phase B — apply progression perks (effectiveStats + passives).
      // Mutates player units in-place: stat bonuses applied, _perk_passives
      // + _perk_ability_mods attached for runtime lookup. No-op se unit
      // non registrato in progressionStore. campaign_id da req.body opzionale.
      let progressionApplied = [];
      try {
        const campaignIdForProgression = req.body?.campaign_id || null;
        const res = applyProgressionToUnits(units, { campaignId: campaignIdForProgression });
        progressionApplied = res.applied || [];
      } catch (err) {
        console.warn('[progression] apply failed:', err.message);
      }

      // Sprint Y Spore Moderate (ADR-2026-04-26 §S5) — lineage inheritance.
      // Per ogni unit nuova in (species, biome), eredita 1-2 mutation random
      // dal pool propagato (creature precedenti morte stesso species/biome).
      // Idempotent: skip unit con applied_mutations già presenti (no doppia
      // ereditarietà). Pure read da pool in-memory, fallisce silenziosamente.
      let lineageInherited = [];
      try {
        const { inheritFromLineage } = require('../services/generation/lineagePropagator');
        for (const unit of units) {
          if (!unit || typeof unit !== 'object') continue;
          // Skip se già ha mutation (es. preserve da PG persistente).
          if (Array.isArray(unit.applied_mutations) && unit.applied_mutations.length > 0) continue;
          const speciesId = unit.species_id || unit.species || null;
          if (!speciesId || !biomeIdRaw) continue;
          const result = inheritFromLineage(unit, speciesId, biomeIdRaw, unit.lineage_id || null);
          if (result && Array.isArray(result.inherited) && result.inherited.length > 0) {
            // Apply inherited mutation_ids → unit.applied_mutations (free grant).
            unit.applied_mutations = [...(unit.applied_mutations || []), ...result.inherited];
            lineageInherited.push({
              unit_id: unit.id || null,
              inherited: result.inherited,
              species_id: speciesId,
              biome_id: biomeIdRaw,
            });
          }
        }
      } catch (err) {
        console.warn('[lineage] inherit failed:', err.message);
      }

      // M7-#2 Phase B: apply damage scaling curves per encounter class.
      // Lo YAML damage_curves.yaml definisce enemy_damage_multiplier per class.
      // Encounter senza class dichiarato → fallback "standard" (1.2x).
      // Idempotente: se class=tutorial (multiplier 1.0) no-op.
      let encounterClassUsed = null;
      try {
        const curves = loadDamageCurves();
        if (curves) {
          const encCls = getEncounterClass(req.body, curves);
          encounterClassUsed = encCls;
          units = units.map((u) => {
            if (!u) return u;
            if (u.controlled_by !== 'sistema') return u;
            const clone = { ...u };
            applyEnemyDamageMultiplier(clone, encCls, curves);
            return clone;
          });
        }
      } catch (err) {
        console.warn('[damage-curves] apply failed:', err.message);
      }

      // ADR-2026-04-17: grid auto-scale basato su deployed PG count (party.yaml)
      let gridW = GRID_SIZE;
      let gridH = GRID_SIZE;
      try {
        const { gridSizeFor, getModulation } = require('../../../services/party/loader');
        const requestedModulation = req.body?.modulation;
        let deployedCount = units.filter((u) => u && u.controlled_by === 'player').length;
        if (requestedModulation) {
          const preset = getModulation(requestedModulation);
          if (preset) deployedCount = preset.deployed;
        }
        const [gw, gh] = gridSizeFor(deployedCount);
        gridW = gw;
        gridH = gh;
      } catch {
        // fallback GRID_SIZE default
      }

      // SPRINT_020: calcola turn_order via iniziativa descending.
      const turnOrder = buildTurnOrder(units);
      const firstActiveId = turnOrder[0] || null;
      // Telemetry B (TKT-01/02): scenario_id + pressure_start persistiti per
      // abilitare sweep riproducibile via script (docs/playtest/2026-04-17-*).
      const scenarioId = req.body?.scenario_id ?? null;
      const pressureStart = Number.isFinite(Number(req.body?.pressure_start))
        ? Number(req.body.pressure_start)
        : null;
      // 2026-04-26 (PCG G1 fix): encounter YAML loader opt-in.
      // Se body.encounter_id passato + YAML trovato → popola encounter payload.
      // Sblocca: objectiveEvaluator non-elim + biomeSpawnBias initial waves + conditions.
      // Non override se body.encounter già fornito (preserve scenario JS flow).
      let encounterPayload = req.body?.encounter ?? null;
      const encounterIdFromBody = req.body?.encounter_id;
      if (!encounterPayload && encounterIdFromBody) {
        try {
          const { loadEncounter } = require('../services/combat/encounterLoader');
          const loaded = loadEncounter(encounterIdFromBody);
          if (loaded) encounterPayload = loaded;
        } catch (err) {
          console.warn('[session/start] encounterLoader failed:', err.message);
        }
      }

      // Sprint 13 — Status engine wave A: passive ancestor wire.
      // Scan unit.traits, set unit.status[stato] for the 7 canonical Wave A
      // statuses (linked/fed/healing/attuned/sensed/telepatic_link/frenzy).
      // Producer side; consumers in apps/backend/services/combat/statusModifiers.js
      // (computeStatusModifiers + applyTurnRegen) already wired. Best-effort.
      let passiveStatusApplied = [];
      try {
        const {
          applyPassiveAncestorsToRoster,
        } = require('../services/combat/passiveStatusApplier');
        passiveStatusApplied = applyPassiveAncestorsToRoster(units, traitRegistry);
      } catch (err) {
        console.warn('[passive-status] apply failed:', err.message);
      }

      const session = {
        session_id: sessionId,
        scenario_id: scenarioId,
        // M7-#2 Phase B: persist encounter class per enrage check runtime
        encounter_class: encounterClassUsed || 'standard',
        pressure_start: pressureStart,
        pressure: pressureStart,
        turn: 1,
        active_unit: firstActiveId,
        turn_order: turnOrder,
        turn_index: 0,
        units,
        // Q-001 T2.4: snapshot iniziale per replay (deep copy, immutable)
        units_snapshot_initial: JSON.parse(JSON.stringify(units)),
        grid: { width: gridW, height: gridH },
        logFilePath,
        events: [],
        created_at: now.toISOString(),
        // SPRINT_003 fase 0: contatori in-memory per log esteso + VC.
        action_counter: 0,
        damage_taken: {},
        // SPRINT_003 fase 1: fairness cap PT per-sessione.
        cap_pt_used: 0,
        cap_pt_max: fairnessConfig.cap_pt_max,
        // AI War pattern (2026-04-17): single escalation dial 0..100.
        // Gate SIS intent pool + reinforcement budget via computeSistemaTier().
        // Updated da roundOrchestrator/session handlers su victory/KO events.
        // Scenario può impostare pressure_start (tutorial_02=25, 03=50, 04=75, 05=95).
        // QW1 (M-018): hostile biome aggiunge pressure_initial_bonus (savana 0,
        // abisso_vulcanico +15). Cap 0..100 preserved.
        sistema_pressure: Math.max(
          0,
          Math.min(
            100,
            (Number(req.body?.sistema_pressure_start) || 0) +
              Number(biomeModifiers.pressure_initial_bonus || 0),
          ),
        ),
        // Hazard tiles dal scenario (es. enc_tutorial_03 fumarole).
        // Lista {x, y, damage, type}. Applicato a fine turno via
        // applyHazardDamage in handleTurnEndViaRound.
        hazard_tiles: Array.isArray(req.body?.hazard_tiles) ? req.body.hazard_tiles : [],
        // M14-A 2026-04-25 — Triangle Strategy terrain reactions tile state map.
        // Keyed by `${x},${y}` (orthogonal grid; future hex axial keys diff).
        // State shape: { type: 'normal'|'fire'|'ice'|'water'|'electrified',
        //               ttl: int, source_actor: id|null }
        // Decay 1/round in applyEndOfRoundSideEffects; mutated in performAttack
        // post damage when action.channel maps to a known element.
        tile_state_map: {},
        // Q-001 T2.3: difficulty profile scaling metadata (null se profile invalid)
        _difficultyProfile: difficultyProfileMeta,
        // ADR-2026-04-19 + 04-20: encounter payload per reinforcementSpawner + objectiveEvaluator.
        // 2026-04-26: anche YAML-loaded via encounter_id (PCG G1 wire).
        encounter: encounterPayload,
        // M11 pilot (ADR-2026-04-21c): biome_id + log trait env deltas applicati.
        biome_id: biomeIdRaw,
        biome_costs_log: biomeCostsLog,
        // QW1 (M-018): runtime knobs derivati da biomes.yaml diff_base +
        // hazard.stress_modifiers. Esposto via /api/session/state per debug
        // + future UI hint. Consumed da round bridge (pressure_mult tick) e
        // applicato in applyEnemyHpMultiplier sopra (hp_mult).
        biome_modifiers: biomeModifiers,
      };
      // V5 SG lifecycle: encounter start reset (ADR-2026-04-26).
      // Optional restore: `req.body.initial_sg = { unit_id: pool }` lets
      // save-load + integration tests seed SG after the encounter zero-pass.
      // A-residual #1 (2026-04-27): tutorial player units start with SG=1
      // so first ability con cost SG è immediately disponibile (UX onboard).
      try {
        const sgTracker = require('../services/combat/sgTracker');
        for (const u of session.units || []) sgTracker.resetEncounter(u);
        const initialSg = req.body?.initial_sg;
        if (initialSg && typeof initialSg === 'object') {
          for (const [uid, pool] of Object.entries(initialSg)) {
            const unit = (session.units || []).find((u) => u && u.id === uid);
            if (!unit) continue;
            const value = Math.max(0, Math.min(3, Math.floor(Number(pool) || 0)));
            unit.sg = value;
          }
        } else if (isTutorialScenario(scenarioId)) {
          // Tutorial onboard: player units start with SG=1.
          for (const u of session.units || []) {
            if (u && u.controlled_by === 'player' && u.hp > 0) {
              u.sg = 1;
            }
          }
        }
      } catch {
        /* sgTracker optional */
      }
      sessions.set(sessionId, session);
      activeSessionId = sessionId;
      await fs.mkdir(logsDir, { recursive: true });
      await fs.writeFile(logFilePath, '[]\n', 'utf8');
      // Funnel telemetry auto-log (agent telemetry-viz-illuminator P0 #2).
      // Tutorial session_start → tutorial_start event (non-blocking).
      if (isTutorialScenario(scenarioId)) {
        appendTelemetryEvent({
          session_id: sessionId,
          player_id: null,
          type: 'tutorial_start',
          payload: {
            scenario_id: scenarioId,
            encounter_class: encounterClassUsed || 'standard',
            party_size: units.filter((u) => u.controlled_by === 'player').length,
          },
        }).catch(() => {});
      }
      await appendEvent(session, {
        action_type: 'session_start',
        turn: 0,
        actor_id: null,
        target_id: null,
        damage_dealt: 0,
        result: 'ok',
        position_from: null,
        position_to: null,
        scenario_id: scenarioId,
        pressure: pressureStart,
        units_count: units.length,
        player_count: units.filter((u) => u.controlled_by === 'player').length,
        sistema_count: units.filter((u) => u.controlled_by === 'sistema').length,
        automatic: true,
      });
      // 2026-04-26 P1 — Pathfinder XP budget audit log su session start.
      // Best-effort + lazy require: missing module non blocca session creation.
      // Audit out_of_band -> warn console (future: telemetry event).
      try {
        const { auditEncounter } = require('../services/balance/xpBudget');
        const partySize = units.filter((u) => u.controlled_by === 'player').length;
        const audit = auditEncounter(session.encounter, partySize);
        if (
          audit &&
          audit.status &&
          !['in_band', 'no_encounter', 'no_budget_config'].includes(audit.status)
        ) {
          console.warn(
            `[xpBudget audit] session=${sessionId} class=${audit.encounter_class} ` +
              `party=${audit.party_size} budget=${audit.budget} used=${audit.used} ` +
              `ratio=${audit.ratio} status=${audit.status}`,
          );
        }
      } catch {
        // xpBudget optional
      }
      // SPRINT_020: se la prima unita' in ordine di iniziativa e' un SIS,
      // esegui immediatamente i suoi turni (e di eventuali successivi SIS)
      // fino a fermarsi al primo player. Il frontend riceve gia' lo stato
      // post-AI-phase, pronto per l'input del giocatore.
      const pre = await advanceThroughAiTurns(session);
      res.json({
        session_id: sessionId,
        state: publicSessionView(session),
        log_file: logFilePath,
        // Se e' scattata la fase IA iniziale (raro ma possibile), esponila
        // cosi' il frontend puo' loggare gli eventi in ordine.
        ia_actions: pre.iaActions,
        side_effects: pre.bleedingEvents,
        // Sprint Y Spore Moderate §S5 — lineage inheritance grants additivi.
        // Array per-unit con mutation_ids ereditati da pool propagato.
        // Empty se nessuna lineage propagation precedente o no match.
        lineage_inherited: lineageInherited,
      });
    } catch (err) {
      next(err);
    }
  });

  router.get('/state', (req, res) => {
    const { error, session } = resolveSession(req.query?.session_id);
    if (error) return res.status(error.status).json(error.body);
    res.json(publicSessionView(session));
  });

  // Sprint 9 (Surface-DEAD #5): objective HUD surface.
  // Espone objective config corrente + valutazione live (live-tick) per HUD
  // top-bar. Surface DEAD pre-Sprint 9: encounter.objective + objective_state
  // erano calcolati dal bridge ma non esposti al client.
  //
  // Risposta:
  //   { encounter_id, encounter_label_it, objective: {type, config}, evaluation: {completed, failed, progress, reason, outcome?} }
  //
  // Ritorna 404 se sessione non trovata, oggetto vuoto-coerente se la session
  // non ha encounter.objective (es. tutorial legacy senza objective field).
  router.get('/:id/objective', (req, res, next) => {
    try {
      const { error, session } = resolveSession(req.params.id);
      if (error) return res.status(error.status).json(error.body);
      const encounter = session.encounter || {};
      const objective = encounter.objective || null;
      let evaluation = null;
      if (objective && objective.type) {
        try {
          // Lazy require — evaluator non blocca path principale.
          // eslint-disable-next-line global-require
          const { evaluateObjective } = require('../services/combat/objectiveEvaluator');
          evaluation = evaluateObjective(session, encounter);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn('[objective-route] evaluator failed:', err && err.message);
          evaluation = null;
        }
      }
      res.json({
        session_id: session.session_id,
        encounter_id: encounter.id || null,
        encounter_label_it: encounter.label_it || null,
        objective,
        evaluation,
      });
    } catch (err) {
      next(err);
    }
  });

  // Halfway lesson (decision surfacing): pre-combat prediction.
  // Ritorna hit%, crit%, fumble%, avg MoS, avg PT per un attacco
  // actor → target senza eseguirlo. Il client mostra questi numeri
  // per rendere la tattica leggibile (P1).
  router.post('/predict', (req, res) => {
    const body = req.body || {};
    const { error, session } = resolveSession(body.session_id);
    if (error) return res.status(error.status).json(error.body);

    const actor = session.units.find((u) => u.id === body.actor_id);
    if (!actor) {
      return res.status(400).json({ error: `actor_id "${body.actor_id}" non trovato` });
    }
    const target = session.units.find((u) => u.id === body.target_id);
    if (!target) {
      return res.status(400).json({ error: `target_id "${body.target_id}" non trovato` });
    }

    const prediction = predictCombat(actor, target);
    res.json({
      actor_id: actor.id,
      target_id: target.id,
      ...prediction,
    });
  });

  router.post('/action', async (req, res, next) => {
    try {
      const body = req.body || {};
      const { error, session } = resolveSession(body.session_id);
      if (error) return res.status(error.status).json(error.body);

      const actor = session.units.find((u) => u.id === body.actor_id);
      if (!actor) {
        return res.status(400).json({ error: `actor_id "${body.actor_id}" non trovato` });
      }

      // SPRINT_003 fase 1: fairness cap PT hard enforcement.
      // Se il body include cost.cap_pt >= 1, verifica che non superi
      // session.cap_pt_max. Rifiuta con 400 senza mutare stato ne'
      // scrivere eventi (FAIRNESS_CAP_001 in engine/sistema_rules.md).
      const requestedCapPt = Number(body.cost?.cap_pt || 0);
      const capCheck = checkCapPtBudget(session, requestedCapPt, fairnessConfig);
      if (!capCheck.ok) {
        return res.status(400).json({
          error: 'cap_pt_max exceeded',
          cap_pt_used: capCheck.used,
          cap_pt_max: capCheck.max,
          requested: capCheck.requested,
        });
      }

      const actionType = body.action_type;

      // TKT-P6 — Snapshot pre-action state for potential rewind.
      // Only player-controlled actor actions push snapshots (sistema AI
      // actions are deterministic given seed, no rewind UX needed). Skip when
      // session._rewind_disabled flag set (PvP / replay modes).
      if (actor.controlled_by === 'player' && !session._rewind_disabled) {
        try {
          snapshotSession(session);
        } catch {
          // best-effort: never block action on snapshot failure
        }
      }

      if (actionType === 'attack') {
        const targetId = body.target_id || body.target;
        const target = session.units.find((u) => u.id === targetId);
        if (!target) {
          return res.status(400).json({ error: `target "${targetId}" non trovato` });
        }
        if ((target.hp ?? 0) <= 0) {
          return res
            .status(400)
            .json({ error: `target "${targetId}" gia' abbattuto (hp ${target.hp ?? 0})` });
        }
        if ((actor.ap_remaining ?? 0) < 1) {
          return res
            .status(400)
            .json({ error: 'AP insufficienti per attaccare (termina il turno)' });
        }
        const attackDist = manhattanDistance(actor.position, target.position);
        // Sprint Spore Moderate (ADR-2026-04-26 §S6) — archetype scout_plus
        // sight+2: estende attack_range effettivo +2 se actor ha passive.
        // Back-compat: zero delta quando _archetype_passives assente.
        const baseRange = actor.attack_range ?? DEFAULT_ATTACK_RANGE;
        const range = archetypeEffectiveRange(actor, baseRange);
        if (attackDist > range) {
          return res.status(400).json({
            error: `bersaglio fuori range (distanza ${attackDist} > range ${range})`,
          });
        }

        // M17 (ADR-2026-04-16): round flow is the only attack path.
        // Legacy sequential attack code removed. handleLegacyAttackViaRound
        // executes performAttack inside a round cycle (planning → commit →
        // resolve) and returns a legacy-compat response shape.
        // M14-A: optional `channel` body field propagates to performAttack
        // for terrain reactions + channel resistances.
        const wrapped = await handleLegacyAttackViaRound({
          session,
          actor,
          target,
          requestedCapPt,
          channel: typeof body.channel === 'string' ? body.channel : null,
        });
        // iter6 follow-up #3: aggro_warning per player units. Player con
        // status.aggro_locked > 0 + aggro_source attivo che attacca un target
        // diverso da source riceve warning informativo (no enforcement,
        // libertà tattica preservata). PG taunted = "dovresti attaccare X"
        // ma può comunque scegliere altro.
        if (
          actor.controlled_by === 'player' &&
          Number(actor.status?.aggro_locked) > 0 &&
          actor.aggro_source &&
          actor.aggro_source !== target.id
        ) {
          wrapped.aggro_warning = {
            actor_id: actor.id,
            forced_target: actor.aggro_source,
            attacked_target: target.id,
            note: 'taunted: ignoring forced target (no enforcement on player)',
          };
        }
        return res.json(wrapped);
      }

      if (actionType === 'move') {
        const dest = body.position;
        if (
          !dest ||
          typeof dest.x !== 'number' ||
          typeof dest.y !== 'number' ||
          !Number.isFinite(dest.x) ||
          !Number.isFinite(dest.y)
        ) {
          return res.status(400).json({ error: 'position { x, y } numerica richiesta per move' });
        }
        const _gw = session.grid?.width || GRID_SIZE;
        const _gh = session.grid?.height || GRID_SIZE;
        if (dest.x < 0 || dest.x >= _gw || dest.y < 0 || dest.y >= _gh) {
          return res.status(400).json({ error: `posizione fuori griglia (${_gw}x${_gh})` });
        }
        if ((actor.ap_remaining ?? 0) < 1) {
          return res
            .status(400)
            .json({ error: 'AP insufficienti per muoversi (termina il turno)' });
        }
        const dist = manhattanDistance(actor.position, dest);
        // SPRINT_008 (issue #7): AP cost per move = distanza Manhattan,
        // non piu' flat 1. Muoverti per N celle costa N AP. Cosi' con
        // ap=2 hai veramente un trade-off: o 1 cella + 1 attacco, o 2 celle
        // e basta, o 2 attacchi. Il validation e' ora contro ap_remaining
        // anziche' actor.ap (max) — cosi' possiamo fare piu' move nello
        // stesso turno solo se abbiamo AP residui sufficienti.
        // buff_stat move_bonus (ancestor locomotion traits) reduces AP cost.
        const movTraits = evaluateMovementTraits({ registry: traitRegistry, actor });
        const apCost = Math.max(1, dist - movTraits.move_bonus);
        if (apCost > (actor.ap_remaining ?? 0)) {
          return res.status(400).json({
            error: `AP insufficienti per muoversi di ${dist} celle (ap residui: ${actor.ap_remaining ?? 0})`,
          });
        }
        // SPRINT_005 fase 1: niente overlap. Una cella occupata da un'altra
        // unita' viva blocca il movimento (rifiuto 400, niente consumo AP).
        const blocker = session.units.find(
          (u) =>
            u.id !== actor.id && u.hp > 0 && u.position.x === dest.x && u.position.y === dest.y,
        );
        if (blocker) {
          return res
            .status(400)
            .json({ error: `casella (${dest.x},${dest.y}) occupata da ${blocker.id}` });
        }
        actor.ap_remaining = Math.max(0, (actor.ap_remaining ?? actor.ap) - apCost);
        const positionFrom = { ...actor.position };
        actor.position = { x: dest.x, y: dest.y };
        // SPRINT_022: auto-facing sul movimento. L'unita' "guarda" nella
        // direzione in cui si e' mossa. Se dx==0 e dy==0 (impossibile
        // dato il check dist > 0) non cambia niente.
        const newFacing = facingFromMove(positionFrom, actor.position);
        if (newFacing) actor.facing = newFacing;
        const event = buildMoveEvent({ session, actor, positionFrom });
        if (movTraits.trait_effects.length > 0) {
          event.trait_effects = movTraits.trait_effects;
        }
        // SPRINT_003 fase 1: il costo cap_pt si applica anche al move
        // se passato nel body (utile per abilita' movimento potenziato).
        if (requestedCapPt > 0) {
          event.cost = { cap_pt: requestedCapPt };
          consumeCapPt(session, requestedCapPt);
        }
        await appendEvent(session, event);
        // iter4 reaction engine: overwatch_shot fires se enemy con reaction
        // armed ha il mover in attack_range post-move.
        const overwatchResult = reactionEngine.triggerOnMove(
          session,
          actor,
          positionFrom,
          (overwatchUnit, mover) => performAttack(session, overwatchUnit, mover),
        );
        if (overwatchResult) {
          await appendEvent(session, {
            ts: new Date().toISOString(),
            session_id: session.session_id,
            actor_id: overwatchResult.overwatch_id,
            action_type: 'reaction_trigger',
            ability_id: overwatchResult.ability_id,
            trigger: 'enemy_moves_in_range',
            target_id: overwatchResult.mover_id,
            turn: session.turn,
            from_position: overwatchResult.from_position,
            to_position: overwatchResult.to_position,
            die: overwatchResult.die,
            roll: overwatchResult.roll,
            mos: overwatchResult.mos,
            result: overwatchResult.hit ? 'hit' : 'miss',
            damage_dealt: overwatchResult.damage_dealt,
            mover_hp_before: overwatchResult.mover_hp_before,
            mover_hp_after: overwatchResult.mover_hp_after,
            mover_killed: overwatchResult.mover_killed,
            damage_step_mod: overwatchResult.damage_step_mod,
            trait_effects: [],
          });
        }
        return res.json({
          ok: true,
          actor_id: actor.id,
          position: actor.position,
          position_from: positionFrom,
          facing: actor.facing,
          cap_pt_used: session.cap_pt_used,
          cap_pt_max: session.cap_pt_max,
          overwatch: overwatchResult,
          state: publicSessionView(session),
        });
      }

      // 2026-04-26 P0 quick-win — FFT Wait action (Tier S donor pattern).
      // Player rinuncia all'azione corrente in cambio di +1 initiative_bonus
      // sul prossimo round (defer turn, riprendi prima next round).
      // Costa AP rimanenti (mette a 0) ma NON consuma PT/PP.
      // Cost zero: pure tactical timing tool, no resource trade.
      // Source: docs/research/2026-04-26-tier-s-extraction-matrix.md (FFT)
      if (actionType === 'wait') {
        const apBefore = Number(actor.ap_remaining ?? actor.ap ?? 0);
        if (apBefore <= 0) {
          return res
            .status(400)
            .json({ error: 'wait richiede almeno 1 AP rimanente (turno gia consumato)' });
        }
        actor.ap_remaining = 0;
        // Initiative bonus persistente fino a next round_clear (decay manuale via roundOrchestrator).
        actor.initiative_bonus_next_round = Number(actor.initiative_bonus_next_round || 0) + 1;
        await appendEvent(session, {
          ts: new Date().toISOString(),
          session_id: session.session_id,
          actor_id: actor.id,
          actor_species: actor.species,
          actor_job: actor.job,
          action_type: 'wait',
          turn: session.turn,
          ap_spent: apBefore,
          ap_before: apBefore,
          ap_after: 0,
          initiative_bonus_next_round: actor.initiative_bonus_next_round,
          trait_effects: [],
        });
        return res.json({
          ok: true,
          actor_id: actor.id,
          ap_remaining: 0,
          initiative_bonus_next_round: actor.initiative_bonus_next_round,
          state: publicSessionView(session),
        });
      }

      // SPRINT_022: nuova azione 'turn' per ruotare senza muoversi.
      // Costa 0 AP (libera, come reazione) — cosi' il giocatore puo'
      // riposizionarsi visivamente a fine turno per prevenire backstab
      // senza pagare un costo meccanico.
      if (actionType === 'turn') {
        const rawFacing = body.facing ? String(body.facing).toUpperCase() : null;
        if (!VALID_FACINGS.has(rawFacing)) {
          return res.status(400).json({
            error: `facing invalido: "${body.facing}". Atteso N/S/E/W`,
          });
        }
        const oldFacing = actor.facing;
        actor.facing = rawFacing;
        await appendEvent(session, {
          ts: new Date().toISOString(),
          session_id: session.session_id,
          actor_id: actor.id,
          actor_species: actor.species,
          actor_job: actor.job,
          action_type: 'turn',
          turn: session.turn,
          ap_spent: 0,
          facing_from: oldFacing,
          facing_to: rawFacing,
          trait_effects: [],
        });
        return res.json({
          ok: true,
          actor_id: actor.id,
          facing: actor.facing,
          facing_from: oldFacing,
          state: publicSessionView(session),
        });
      }

      if (actionType === 'ability') {
        const result = await abilityExecutor.executeAbility({ session, actor, body });
        const payload = { ...result.body };
        if (result.status === 200) {
          payload.state = publicSessionView(session);
          payload.cap_pt_used = session.cap_pt_used;
          payload.cap_pt_max = session.cap_pt_max;
        }
        return res.status(result.status).json(payload);
      }

      // Sprint α (XCOM 2 pattern) — pin_down action_type. Costa 1 AP attacker,
      // imposta target.status.pinned = 2 (-2 attack penalty consumed in
      // resolveAttack via getPinPenalty). Decay automatico via universal
      // sessionRoundBridge status loop.
      if (actionType === 'pin_down') {
        const targetId = body.target_id || body.target;
        const target = session.units.find((u) => u.id === targetId);
        if (!target) {
          return res.status(400).json({ error: `target "${targetId}" non trovato` });
        }
        const { applyPinDown } = require('../services/combat/pinDown');
        const r = applyPinDown(actor, target);
        if (!r.ok) {
          return res.status(400).json({ error: `pin_down failed: ${r.reason}` });
        }
        await appendEvent(session, {
          ts: new Date().toISOString(),
          session_id: session.session_id,
          actor_id: actor.id,
          actor_species: actor.species,
          actor_job: actor.job,
          action_type: 'pin_down',
          target_id: target.id,
          turn: session.turn,
          ap_spent: 1,
          pinned_turns: r.pinned_turns,
          trait_effects: [],
        });
        return res.json({
          ok: true,
          actor_id: actor.id,
          target_id: target.id,
          ap_remaining: r.ap_remaining,
          pinned_turns: r.pinned_turns,
          state: publicSessionView(session),
        });
      }

      return res.status(400).json({
        error: `action_type sconosciuto: "${actionType}" (atteso "attack", "move", "turn", "ability" o "pin_down")`,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/turn/end', async (req, res, next) => {
    try {
      const body = req.body || {};
      const { error, session } = resolveSession(body.session_id);
      if (error) return res.status(error.status).json(error.body);

      // M17 (ADR-2026-04-16): round flow is the only /turn/end path.
      // Legacy sequential turn code removed. handleTurnEndViaRound
      // handles bleeding, AP reset, status decay, declareSistemaIntents,
      // commit, resolve, and returns legacy-compat response shape.
      const wrapped = await handleTurnEndViaRound(session);
      return res.json(wrapped);
    } catch (err) {
      next(err);
    }
  });

  // ───────────────────────────────────────────────────────────────
  // POST /round/execute — batch round resolver (Fase 1 SoT-alignment).
  //
  // Accetta TUTTI gli intents player di un round + opzionale AI auto-declare
  // + risolve in una singola richiesta. Allineato al round model canonico
  // (ADR-2026-04-15): internamente usa gli stessi dispatcher di /action
  // (performAttack, abilityExecutor, move handler) in ordine di dichiarazione,
  // seguito da AI turn end se ai_auto=true.
  //
  // Body:
  //   {
  //     session_id: string,
  //     player_intents: [
  //       { actor_id, action: { type: 'attack'|'move'|'ability', ...} },
  //       ...
  //     ],
  //     ai_auto?: boolean (default true),
  //     preview_only?: boolean (default false)  // MVP: not implemented, reserved
  //   }
  //
  // AP budget validato cumulativamente per actor PRIMA del dispatch:
  // Σ ap_cost ≤ ap_remaining → 400 violations se superato.
  // ───────────────────────────────────────────────────────────────
  function estimateApCost(action, actor) {
    if (!action) return 0;
    if (action.type === 'attack') return 1;
    if (action.type === 'move') {
      const dest = action.position;
      if (!dest || !actor || !actor.position) return 1;
      return manhattanDistance(actor.position, dest);
    }
    if (action.type === 'ability') {
      try {
        const { findAbility } = require('../services/abilityExecutor');
        const ab = findAbility(action.ability_id);
        return ab ? Number(ab.cost_ap || 0) : 0;
      } catch {
        return 0;
      }
    }
    if (action.type === 'turn' || action.type === 'skip') return 0;
    return 0;
  }

  // Canonical priority (ADR-2026-04-15):
  // priority = unit.initiative + action_speed - status_penalty
  // action_speed: defend/parry +2, attack 0, ability -1, move -2
  // status_penalty: panic 2×intensity, disorient 1×intensity
  const ACTION_SPEED_TABLE = {
    defend: 2,
    parry: 2,
    attack: 0,
    ability: -1,
    heal: -1,
    move: -2,
    turn: 0,
    skip: 0,
  };

  function computeIntentPriority(actor, action) {
    const base = Number(actor?.initiative || 0);
    const speed =
      typeof ACTION_SPEED_TABLE[action?.type] === 'number' ? ACTION_SPEED_TABLE[action.type] : 0;
    let penalty = 0;
    if (actor?.status) {
      const panic = Number(actor.status.panic) || 0;
      const disorient = Number(actor.status.disorient) || 0;
      penalty = panic * 2 + disorient;
    }
    return base + speed - penalty;
  }

  router.post('/round/execute', async (req, res, next) => {
    try {
      const body = req.body || {};
      const { error, session } = resolveSession(body.session_id);
      if (error) return res.status(error.status).json(error.body);

      const playerIntents = Array.isArray(body.player_intents) ? body.player_intents : [];
      const aiAuto = body.ai_auto !== false;
      const usePriorityQueue = body.priority_queue === true;

      // Validazione intent + AP cumulativo per actor.
      const apByUnit = {};
      const violations = [];
      const normalized = [];
      for (let i = 0; i < playerIntents.length; i += 1) {
        const raw = playerIntents[i];
        if (!raw || !raw.actor_id || !raw.action) {
          violations.push({ index: i, error: 'intent richiede actor_id + action' });
          continue;
        }
        const actor = session.units.find((u) => u.id === raw.actor_id);
        if (!actor) {
          violations.push({ index: i, actor_id: raw.actor_id, error: 'actor non trovato' });
          continue;
        }
        if (Number(actor.hp) <= 0) {
          violations.push({
            index: i,
            actor_id: raw.actor_id,
            error: 'actor morto',
          });
          continue;
        }
        const cost = estimateApCost(raw.action, actor);
        apByUnit[raw.actor_id] = (apByUnit[raw.actor_id] || 0) + cost;
        if (apByUnit[raw.actor_id] > Number(actor.ap_remaining ?? actor.ap ?? 0)) {
          violations.push({
            index: i,
            actor_id: raw.actor_id,
            error: `AP budget superato: Σ ${apByUnit[raw.actor_id]} > ${actor.ap_remaining ?? actor.ap ?? 0}`,
            requested: apByUnit[raw.actor_id],
            available: Number(actor.ap_remaining ?? actor.ap ?? 0),
          });
          continue;
        }
        normalized.push({ index: i, actor, raw });
      }
      if (violations.length > 0) {
        return res.status(400).json({
          error: 'AP budget or intent validation failed',
          violations,
        });
      }

      // Canonical priority queue (opt-in via priority_queue: true):
      // - Mescola player intents + AI intents (se ai_auto) in una sola coda
      // - Calcola priority per ogni intent (initiative + action_speed - penalty)
      // - Sort stable: priority desc, originalIdx asc (preserva ordine per-actor)
      // - Dispatch in priority order
      // - End-of-round ticks via handleTurnEndViaRound(ai_auto=false path impossibile,
      //   fallback: skip AI declare by emptying sistema_pending_intents)
      let dispatchQueue = normalized.map((n) => ({
        actor: n.actor,
        raw: n.raw,
        source: 'player',
        priority: computeIntentPriority(n.actor, n.raw.action),
        originalIdx: n.index,
      }));

      if (usePriorityQueue && aiAuto) {
        try {
          const { intents: aiIntents } = declareSistemaIntents(session);
          for (let i = 0; i < aiIntents.length; i += 1) {
            const aiIntent = aiIntents[i];
            const actor = session.units.find((u) => u.id === aiIntent.unit_id);
            if (!actor) continue;
            const actionType = aiIntent.action?.type || 'skip';
            const action =
              actionType === 'move' && aiIntent.action.move_to
                ? { type: 'move', position: aiIntent.action.move_to }
                : actionType === 'attack'
                  ? { type: 'attack', target_id: aiIntent.action.target_id }
                  : { type: actionType };
            dispatchQueue.push({
              actor,
              raw: { actor_id: actor.id, action },
              source: 'ai',
              priority: computeIntentPriority(actor, action),
              originalIdx: 10000 + i,
            });
          }
        } catch (_aiErr) {
          // AI intent generation failed — continue with player only
        }
      }

      if (usePriorityQueue) {
        dispatchQueue.sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority;
          if (a.actor.id !== b.actor.id)
            return String(a.actor.id).localeCompare(String(b.actor.id));
          return a.originalIdx - b.originalIdx;
        });
      }

      // Dispatch in declared/priority order.
      const results = [];
      const eventsCountBefore = session.events.length;
      for (const { actor, raw } of dispatchQueue) {
        if (Number(actor.hp) <= 0) {
          results.push({ actor_id: actor.id, skipped: 'actor_dead_mid_round' });
          continue;
        }
        const action = raw.action;
        if (action.type === 'attack') {
          const target = session.units.find((u) => u.id === action.target_id);
          if (!target || Number(target.hp) <= 0) {
            results.push({
              actor_id: actor.id,
              skipped: 'target_dead_or_missing',
              target_id: action.target_id,
            });
            continue;
          }
          const range = Number(actor.attack_range) || DEFAULT_ATTACK_RANGE;
          if (manhattanDistance(actor.position, target.position) > range) {
            results.push({
              actor_id: actor.id,
              skipped: 'target_out_of_range',
              target_id: action.target_id,
            });
            continue;
          }
          const wrapped = await handleLegacyAttackViaRound({
            session,
            actor,
            target,
            requestedCapPt: 0,
          });
          results.push({ actor_id: actor.id, action_type: 'attack', result: wrapped });
        } else if (action.type === 'move') {
          const dest = action.position;
          const _gw2 = session.grid?.width || GRID_SIZE;
          const _gh2 = session.grid?.height || GRID_SIZE;
          if (
            !dest ||
            typeof dest.x !== 'number' ||
            typeof dest.y !== 'number' ||
            dest.x < 0 ||
            dest.x >= _gw2 ||
            dest.y < 0 ||
            dest.y >= _gh2
          ) {
            results.push({ actor_id: actor.id, skipped: 'invalid_position' });
            continue;
          }
          const blocker = session.units.find(
            (u) =>
              u.id !== actor.id && u.hp > 0 && u.position.x === dest.x && u.position.y === dest.y,
          );
          if (blocker) {
            results.push({
              actor_id: actor.id,
              skipped: 'cell_occupied',
              blocker_id: blocker.id,
            });
            continue;
          }
          const dist = manhattanDistance(actor.position, dest);
          actor.ap_remaining = Math.max(0, (actor.ap_remaining ?? actor.ap) - dist);
          const positionFrom = { ...actor.position };
          actor.position = { x: dest.x, y: dest.y };
          const newFacing = facingFromMove(positionFrom, actor.position);
          if (newFacing) actor.facing = newFacing;
          const moveEvent = buildMoveEvent({ session, actor, positionFrom });
          await appendEvent(session, moveEvent);
          const overwatchResult = reactionEngine.triggerOnMove(
            session,
            actor,
            positionFrom,
            (overwatchUnit, mover) => performAttack(session, overwatchUnit, mover),
          );
          if (overwatchResult) {
            await appendEvent(session, {
              ts: new Date().toISOString(),
              session_id: session.session_id,
              actor_id: overwatchResult.overwatch_id,
              action_type: 'reaction_trigger',
              ability_id: overwatchResult.ability_id,
              trigger: 'enemy_moves_in_range',
              target_id: overwatchResult.mover_id,
              turn: session.turn,
              from_position: overwatchResult.from_position,
              to_position: overwatchResult.to_position,
              die: overwatchResult.die,
              roll: overwatchResult.roll,
              mos: overwatchResult.mos,
              result: overwatchResult.hit ? 'hit' : 'miss',
              damage_dealt: overwatchResult.damage_dealt,
              mover_hp_before: overwatchResult.mover_hp_before,
              mover_hp_after: overwatchResult.mover_hp_after,
              mover_killed: overwatchResult.mover_killed,
              damage_step_mod: overwatchResult.damage_step_mod,
              trait_effects: [],
            });
          }
          results.push({
            actor_id: actor.id,
            action_type: 'move',
            result: {
              position_from: positionFrom,
              position_to: { ...actor.position },
              overwatch: overwatchResult,
            },
          });
        } else if (action.type === 'ability') {
          const dispatch = await abilityExecutor.executeAbility({
            session,
            actor,
            body: action,
          });
          results.push({
            actor_id: actor.id,
            action_type: 'ability',
            status: dispatch.status,
            result: dispatch.body,
          });
        } else if (action.type === 'turn') {
          const rawFacing = action.facing ? String(action.facing).toUpperCase() : null;
          if (VALID_FACINGS.has(rawFacing)) {
            actor.facing = rawFacing;
            results.push({ actor_id: actor.id, action_type: 'turn', facing: rawFacing });
          } else {
            results.push({ actor_id: actor.id, skipped: 'invalid_facing' });
          }
        } else if (action.type === 'skip') {
          results.push({ actor_id: actor.id, action_type: 'skip' });
        } else {
          results.push({
            actor_id: actor.id,
            skipped: `unknown action type: ${action.type}`,
          });
        }
      }

      // AI auto-declare: usa handleTurnEndViaRound (bleeding + hazard +
      // status decay + AI intents + commit + resolve).
      // Con priority_queue=true, AI intents sono già dispatched nel queue,
      // quindi saltiamo handleTurnEndViaRound (no double-dispatch).
      let aiResult = null;
      if (aiAuto && !usePriorityQueue) {
        aiResult = await handleTurnEndViaRound(session);
      } else if (usePriorityQueue) {
        // End-of-round ticks minimali: bleeding + status decay + AP reset + turn++.
        // NO AI declare (già fatto via priority queue).
        for (const unit of session.units) {
          if (!unit || Number(unit.hp) <= 0) continue;
          // Bleeding tick
          const bleedTurns = Number(unit.status?.bleeding) || 0;
          if (bleedTurns > 0) {
            unit.hp = Math.max(0, Number(unit.hp) - 1);
            if (session.damage_taken) {
              session.damage_taken[unit.id] = (session.damage_taken[unit.id] || 0) + 1;
            }
          }
          // Burning tick (2 PT/turno)
          const burnTurns = Number(unit.status?.burning) || 0;
          if (burnTurns > 0 && unit.hp > 0) {
            unit.hp = Math.max(0, Number(unit.hp) - 2);
            if (session.damage_taken) {
              session.damage_taken[unit.id] = (session.damage_taken[unit.id] || 0) + 2;
            }
          }
          // Status engine extension: HP regen ticks (`fed`/`healing`) before decay.
          try {
            const {
              applyTurnRegen: _applyTurnRegen,
            } = require('../services/combat/statusModifiers');
            _applyTurnRegen(unit);
          } catch {
            /* status regen optional */
          }
          // AP reset (Skiv #5: applyApRefill handles fracture + defy_penalty)
          applyApRefill(unit);
          // Status decay + bonus clear
          if (unit.status) {
            for (const key of Object.keys(unit.status)) {
              const v = Number(unit.status[key]);
              if (v > 0) unit.status[key] = v - 1;
            }
            for (const key of Object.keys(unit.status)) {
              if (!key.endsWith('_buff') && !key.endsWith('_debuff')) continue;
              if (Number(unit.status[key]) > 0) continue;
              const stat = key.replace(/_buff$|_debuff$/, '');
              const bonusKey = `${stat}_bonus`;
              if (unit[bonusKey] !== undefined) unit[bonusKey] = 0;
            }
            if (
              unit.status.shield_buff !== undefined &&
              Number(unit.status.shield_buff) <= 0 &&
              unit.shield_hp
            ) {
              unit.shield_hp = 0;
            }
          }
        }
        session.turn += 1;
        sgBeginTurnAll(session);
      }

      const eventsEmitted = session.events.slice(eventsCountBefore);

      return res.json({
        round: session.turn,
        results,
        ai_result: aiResult,
        priority_queue_used: usePriorityQueue,
        events_emitted_count: eventsEmitted.length,
        events: eventsEmitted,
        ap_consumed: apByUnit,
        state: publicSessionView(session),
      });
    } catch (err) {
      next(err);
    }
  });

  // Skiv ticket #5 (Sprint B 2/2): Defy verb. Player counter-pressure agency.
  // Body: { session_id, actor_id }. Validates SG ≥ DEFY_SG_COST + actor is
  // player-controlled + alive + pressure > 0; on success spends 2 SG, drops
  // sistema_pressure by DEFY_PRESSURE_RELIEF (clamped at 0), and sets
  // actor.status.defy_penalty so the actor refills with -1 AP next turn.
  router.post('/defy', async (req, res, next) => {
    try {
      const body = req.body || {};
      const { error, session } = resolveSession(body.session_id);
      if (error) return res.status(error.status).json(error.body);
      const actor = session.units.find((u) => u.id === body.actor_id);
      if (!actor) {
        return res.status(400).json({ error: 'actor_not_found', actor_id: body.actor_id || null });
      }
      const outcome = applyDefyAction(actor, session);
      if (!outcome.ok) {
        return res
          .status(409)
          .json({ error: outcome.error, detail: outcome.detail || null, actor_id: actor.id });
      }
      // Append narrative event for HUD/debrief consumption.
      const event = {
        event_type: 'defy',
        actor_id: actor.id,
        turn: Number(session.turn || 0),
        sg_before: outcome.before.sg,
        sg_after: outcome.after.sg,
        pressure_before: outcome.before.pressure,
        pressure_after: outcome.after.pressure,
        relief: outcome.relief,
        sg_cost: outcome.cost.sg,
        ap_penalty_next_turn: outcome.cost.ap_next_turn,
      };
      if (Array.isArray(session.events)) session.events.push(event);
      res.json({
        session_id: session.session_id,
        actor_id: actor.id,
        ...outcome,
        state: publicSessionView(session),
      });
    } catch (err) {
      next(err);
    }
  });

  // TKT-P6 — Rewind safety valve endpoint.
  // POST /api/session/:id/rewind — restore most recent snapshot, decrement
  // rewind budget. Returns 409 when budget exhausted or buffer empty.
  router.post('/:id/rewind', (req, res, next) => {
    try {
      const { error, session } = resolveSession(req.params.id);
      if (error) return res.status(error.status).json(error.body);
      const result = rewindSession(session);
      if (!result.ok) {
        return res.status(409).json({
          error: 'rewind_unavailable',
          reason: result.reason,
          budget_remaining: result.budget_remaining ?? 0,
          rewind: rewindStateSummary(session),
        });
      }
      // Append rewind audit event (forward-only log).
      try {
        if (Array.isArray(session.events)) {
          session.events.push({
            action_type: 'rewind',
            turn: session.turn,
            actor_id: null,
            target_id: null,
            damage_dealt: 0,
            result: 'ok',
            position_from: null,
            position_to: null,
            budget_remaining: result.budget_remaining,
            automatic: false,
          });
        }
      } catch {
        /* event log best-effort */
      }
      return res.json({
        session_id: session.session_id,
        rewind: {
          rewound: true,
          budget_remaining: result.budget_remaining,
          snapshots_remaining: result.snapshots_remaining,
        },
        state: publicSessionView(session),
      });
    } catch (err) {
      next(err);
    }
  });

  // TKT-M15 — Promotion engine endpoints.
  //
  // GET /api/session/:id/promotion-eligibility — return all units' promotion
  // eligibility computed from session.events log.
  // POST /api/session/:id/promote — accept promotion for a unit (player choice).
  //   body: { unit_id, target_tier }
  //   200: { unit_id, applied_tier, deltas }
  //   400: { error, details }
  //   404: unknown session OR unit
  router.get('/:id/promotion-eligibility', (req, res, next) => {
    try {
      const { error, session } = resolveSession(req.params.id);
      if (error) return res.status(error.status).json(error.body);
      const playerUnits = (session.units || []).filter((u) => u && u.controlled_by === 'player');
      const eligibility = playerUnits.map((u) => ({
        unit_id: u.id,
        ...evaluatePromotion(u, session.events || []),
      }));
      res.json({
        session_id: session.session_id,
        eligibility,
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/:id/promote', (req, res, next) => {
    try {
      const { error, session } = resolveSession(req.params.id);
      if (error) return res.status(error.status).json(error.body);
      const body = req.body || {};
      const unitId = body.unit_id;
      const targetTier = body.target_tier;
      if (!unitId || !targetTier) {
        return res.status(400).json({
          error: 'missing_fields',
          required: ['unit_id', 'target_tier'],
        });
      }
      const unit = (session.units || []).find((u) => u && u.id === unitId);
      if (!unit) {
        return res.status(404).json({ error: 'unit_not_found', unit_id: unitId });
      }
      // Gate: must be eligible.
      const eligibility = evaluatePromotion(unit, session.events || []);
      if (!eligibility.eligible || eligibility.next_tier !== targetTier) {
        return res.status(400).json({
          error: 'not_eligible',
          eligibility,
        });
      }
      const result = applyPromotion(unit, targetTier);
      if (!result.ok) {
        return res.status(400).json({ error: result.error || 'apply_failed', details: result });
      }
      // Append promotion event to log (forward audit trail).
      try {
        if (Array.isArray(session.events)) {
          session.events.push({
            action_type: 'promotion',
            turn: session.turn || 0,
            actor_id: unitId,
            target_id: null,
            damage_dealt: 0,
            result: 'ok',
            position_from: null,
            position_to: null,
            target_tier: targetTier,
            previous_tier: result.previous_tier,
            automatic: false,
          });
        }
      } catch {
        /* event log best-effort */
      }
      res.json({
        session_id: session.session_id,
        unit_id: unitId,
        ...result,
        state: publicSessionView(session),
      });
    } catch (err) {
      next(err);
    }
  });

  router.post('/end', async (req, res, next) => {
    try {
      const body = req.body || {};
      const { error, session } = resolveSession(body.session_id);
      if (error) return res.status(error.status).json(error.body);
      // TKT-P6 — reset rewind buffer + budget on combat end (next encounter
      // starts fresh budget).
      try {
        resetRewind(session);
      } catch {
        /* best-effort */
      }
      // Telemetry B (TKT-03/05): compute outcome + VC snapshot, persist
      // session_end event prima della finalizzazione.
      const sistemaAlive = session.units.filter(
        (u) => u.controlled_by === 'sistema' && (u.hp ?? 0) > 0,
      ).length;
      const playerAlive = session.units.filter(
        (u) => u.controlled_by === 'player' && (u.hp ?? 0) > 0,
      ).length;
      // ADR-2026-04-20: objective evaluator prende precedenza su elimination
      // fallback quando encounter.objective.type è definito.
      let objectiveFinal = null;
      if (session.encounter && session.encounter.objective) {
        try {
          const { evaluateObjective } = require('../services/combat/objectiveEvaluator');
          objectiveFinal = evaluateObjective(session, session.encounter);
        } catch {
          // best-effort — non blocca fine sessione
        }
      }
      let outcome;
      if (objectiveFinal && objectiveFinal.outcome) {
        outcome = objectiveFinal.outcome;
      } else if (sistemaAlive === 0 && playerAlive > 0) outcome = 'win';
      else if (playerAlive === 0 && sistemaAlive > 0) outcome = 'wipe';
      else if (playerAlive === 0 && sistemaAlive === 0) outcome = 'draw';
      else outcome = 'abandon';
      // VC snapshot + debrief computed pre-delete so response carries final state
      // (harness scripts no longer need a separate GET /:id/vc before /end).
      // Normalize session.outcome from local outcome variable BEFORE buildDebriefSummary —
      // the function gates PE→PI conversion + mating_eligibles on session.outcome === 'victory'.
      // Local outcome here is 'win'/'wipe'/'draw'/'abandon' (or objective.outcome 'victory'/etc.).
      // Map 'win' → 'victory' to match downstream gate; preserve other values verbatim.
      session.outcome = outcome === 'win' ? 'victory' : outcome;
      let vcSnapshot = null;
      let debrief = null;
      try {
        vcSnapshot = buildVcSnapshot(session, telemetryConfig);
        const { computeSessionPE, buildDebriefSummary } = require('../services/rewardEconomy');
        const peResult = computeSessionPE(vcSnapshot, {
          // 2026-04-26: encounter_class è canonical (tutorial/standard/hardcore/etc.); session.difficulty legacy fallback
          difficulty: session.encounter_class || session.difficulty || 'standard',
        });
        debrief = buildDebriefSummary(session, vcSnapshot, peResult);
      } catch {
        // vc + debrief are best-effort — don't block session end
      }
      await appendEvent(session, {
        action_type: 'session_end',
        turn: session.turn,
        actor_id: null,
        target_id: null,
        damage_dealt: 0,
        result: outcome,
        position_from: null,
        position_to: null,
        scenario_id: session.scenario_id || null,
        outcome,
        pressure_start: session.pressure_start ?? null,
        pressure_end: session.pressure ?? null,
        player_alive: playerAlive,
        sistema_alive: sistemaAlive,
        vc_aggregate: vcSnapshot?.aggregate ?? null,
        vc_mbti: vcSnapshot?.mbti ?? null,
        vc_ennea: vcSnapshot?.ennea ?? null,
        automatic: true,
      });
      // Funnel telemetry auto-log (agent telemetry-viz-illuminator P0 #2).
      // Tutorial session_end → tutorial_complete event con outcome (non-blocking).
      if (isTutorialScenario(session.scenario_id)) {
        appendTelemetryEvent({
          session_id: session.session_id,
          player_id: null,
          type: 'tutorial_complete',
          payload: {
            scenario_id: session.scenario_id,
            outcome,
            turns: session.turn,
            player_alive: playerAlive,
            sistema_alive: sistemaAlive,
          },
        }).catch(() => {});
      }
      await persistEvents(session);
      const eventsCount = session.events.length;
      const logFile = session.logFilePath;
      // TKT-08: cancel any pending auto-commit timer prima di delete session.
      // Senza questo, i timer setTimeout accumulati in planningTimers Map
      // mantengono closure refs alla session anche post-delete (callback
      // no-op grazie al guard, ma timer queue cresce N×runs in batch).
      try {
        if (typeof roundBridge.cancelPlanningTimer === 'function') {
          roundBridge.cancelPlanningTimer(session.session_id);
        }
      } catch {
        /* defensive: never block /end on teardown */
      }
      sessions.delete(session.session_id);
      // P4 Thought Cabinet: release per-session unlock cache on teardown.
      // Prevents linear memory growth over process lifetime (Codex review #1702).
      thoughtsStore.delete(session.session_id);
      // Skiv #3: Inner Voices store cleanup.
      voicesStore.delete(session.session_id);
      if (activeSessionId === session.session_id) {
        activeSessionId = null;
      }
      res.json({
        session_id: session.session_id,
        finalized: true,
        log_file: logFile,
        events_count: eventsCount,
        outcome,
        objective_state: objectiveFinal,
        vc_snapshot: vcSnapshot,
        debrief,
      });
    } catch (err) {
      next(err);
    }
  });

  // SPRINT_003 fase 3: VC snapshot on-demand. Registrato DOPO tutte le
  // route statiche (/start, /state, /action, /turn/end, /end) per
  // evitare che resolveSession('state') venga intercettato dal pattern
  // /:id/vc. Non muta stato, non persistenze.
  router.get('/:id/vc', (req, res, next) => {
    try {
      const { error, session } = resolveSession(req.params.id);
      if (error) return res.status(error.status).json(error.body);
      const snapshot = buildVcSnapshot(session, telemetryConfig);
      // OD-013 Path A: additive `mbti_revealed` per-actor (Disco Elysium pacing).
      // Lazy-import + try/catch non-blocking: se fallisce snapshot resta intatto.
      try {
        const { buildMbtiRevealedMap } = require('../services/mbtiSurface');
        const revealedMap = buildMbtiRevealedMap(snapshot);
        if (snapshot && snapshot.per_actor) {
          for (const [uid, entry] of Object.entries(snapshot.per_actor)) {
            if (revealedMap[uid]) entry.mbti_revealed = revealedMap[uid];
          }
        }
      } catch {
        /* ignore: shape resta legacy */
      }
      res.json(snapshot);
    } catch (err) {
      next(err);
    }
  });

  // TKT-MUSEUM-SKIV-VOICES — Ennea voice palette selector endpoint.
  // GET /:id/voice?actor=<unit_id>&beat=<beat_id>[&seed=<int>]
  // Ritorna la voice line per il primo archetype Ennea triggered (Type 5/7
  // attualmente supportati) e l'attore richiesto. Emette session event
  // ennea_voice_type_used in modo additive (non muta stato di combat).
  router.get('/:id/voice', (req, res, next) => {
    try {
      const { error, session } = resolveSession(req.params.id);
      if (error) return res.status(error.status).json(error.body);
      const actorId = String(req.query.actor || '').trim();
      const beatId = String(req.query.beat || '').trim();
      if (!actorId || !beatId) {
        return res.status(400).json({ error: 'missing_actor_or_beat' });
      }
      const snapshot = buildVcSnapshot(session, telemetryConfig);
      const actorVc = snapshot?.per_actor?.[actorId];
      if (!actorVc) return res.status(404).json({ error: 'actor_not_found' });
      const {
        selectEnneaVoice,
        buildEnneaVoiceTelemetryEvent,
      } = require('../../../services/narrative/narrativeEngine');
      let rand = Math.random;
      const seed = req.query.seed;
      if (seed !== undefined && seed !== '') {
        const n = Number(seed);
        if (Number.isFinite(n)) {
          // Mulberry32 deterministic per smoke E2E + replay determinism.
          let s = Math.floor(n) >>> 0;
          rand = () => {
            s = (s + 0x6d2b79f5) >>> 0;
            let t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
          };
        }
      }
      const selection = selectEnneaVoice(actorVc.ennea_archetypes || [], beatId, { rand });
      if (!selection) {
        return res.json({
          session_id: session.session_id,
          actor_id: actorId,
          beat_id: beatId,
          voice: null,
        });
      }
      const event = buildEnneaVoiceTelemetryEvent(actorId, selection, {
        turn: session.turn || null,
      });
      if (event && Array.isArray(session.events)) {
        session.events.push(event);
      }
      return res.json({
        session_id: session.session_id,
        actor_id: actorId,
        beat_id: beatId,
        voice: selection,
      });
    } catch (err) {
      next(err);
    }
  });

  // P4: PF_session endpoint — personality form projection on-demand.
  router.get('/:id/pf', (req, res, next) => {
    try {
      const { error, session } = resolveSession(req.params.id);
      if (error) return res.status(error.status).json(error.body);
      const snapshot = buildVcSnapshot(session, telemetryConfig);
      const { loadForms, computePfSession } = require('../services/personalityProjection');
      let formsData;
      try {
        formsData = loadForms();
      } catch {
        formsData = { forms: {} };
      }
      const pfResult = {};
      for (const [unitId, actorVc] of Object.entries(snapshot.per_actor || {})) {
        pfResult[unitId] = computePfSession(actorVc, formsData);
      }
      // OD-013 Path A: piggyback mbti_revealed nel PF response (additive).
      let mbtiRevealed = null;
      try {
        const { buildMbtiRevealedMap } = require('../services/mbtiSurface');
        mbtiRevealed = buildMbtiRevealedMap(snapshot);
      } catch {
        mbtiRevealed = null;
      }
      const payload = { session_id: session.session_id, pf_session: pfResult };
      if (mbtiRevealed) payload.mbti_revealed = mbtiRevealed;
      res.json(payload);
    } catch (err) {
      next(err);
    }
  });

  // P4 Thought Cabinet: on-demand evaluation. Reads current VC snapshot per
  // actor, crosses mbti_axes against 18 YAML thoughts, cumulatively unlocks
  // into in-memory CabinetState. Response carries Phase 1 keys (unlocked,
  // newly) + Phase 2 additive keys (researching, internalized, slots_max,
  // slots_used, passive_bonus, passive_cost).
  router.get('/:id/thoughts', (req, res, next) => {
    try {
      const { error, session } = resolveSession(req.params.id);
      if (error) return res.status(error.status).json(error.body);
      const snapshot = buildVcSnapshot(session, telemetryConfig);
      const perActor = {};
      for (const [unitId, actorVc] of Object.entries(snapshot.per_actor || {})) {
        const axes = actorVc && actorVc.mbti_axes ? actorVc.mbti_axes : null;
        const { state } = getOrCreateCabinet(session.session_id, unitId);
        const { newly } = evaluateMbtiThoughts(axes, state.unlocked);
        mergeUnlocked(state, newly);
        const snap = snapshotCabinet(state);
        const passives = thoughtPassiveBonuses(state);
        const actor = (session.units || []).find((u) => u && u.id === unitId);
        const tierInfo =
          actor && session.biome_id
            ? computeResonanceTier(actor.species, session.biome_id, actor.archetype || null)
            : { tier: 'none', label_it: '', discount: 0 };
        // Skiv #3: Inner Voices — evaluate 24 Disco-style whispers per actor.
        const voicesHeard = getVoicesHeard(session.session_id, unitId);
        const { heard, newly_heard } = evaluateVoiceTriggers(axes, voicesHeard);
        for (const id of newly_heard) voicesHeard.add(id);
        perActor[unitId] = {
          ...snap,
          newly,
          passive_bonus: passives.bonus,
          passive_cost: passives.cost,
          resonance_tier: tierInfo.tier,
          resonance_label: tierInfo.label_it,
          voices_heard: heard,
          newly_heard,
        };
      }
      res.json({ session_id: session.session_id, per_actor: perActor });
    } catch (err) {
      next(err);
    }
  });

  // P4 Phase 2 — begin research on an unlocked thought (Disco Elysium
  // internalization). Body: { unit_id, thought_id, mode? }. Fails if the
  // thought is not unlocked, already researching/internalized, or cabinet
  // has no free slot (slots_max=8 by default — Sprint 6 round-mode cap).
  //
  // Sprint 6 (P4 Disco Tier S #9): mode defaults to 'rounds' so research
  // ticks per end-of-round in applyEndOfRoundSideEffects (T1 → 3 rounds,
  // T2 → 6, T3 → 9). Pass mode='encounters' for legacy encounter-pace.
  router.post('/:id/thoughts/research', (req, res, next) => {
    try {
      const { error, session } = resolveSession(req.params.id);
      if (error) return res.status(error.status).json(error.body);
      const { unit_id, thought_id } = req.body || {};
      if (!unit_id || !thought_id) {
        return res.status(400).json({ error: 'unit_id e thought_id obbligatori' });
      }
      const mode = req.body?.mode === 'encounters' ? 'encounters' : 'rounds';
      const { state } = getOrCreateCabinet(session.session_id, unit_id);
      const actor = (session.units || []).find((u) => u && u.id === unit_id);
      const tierInfo =
        actor && session.biome_id
          ? computeResonanceTier(actor.species, session.biome_id, actor.archetype || null)
          : { tier: 'none', label_it: '', discount: 0 };
      const outcome = startThoughtResearch(state, thought_id, {
        encounter: req.body?.encounter ?? null,
        round: Number.isFinite(session?.turn) ? session.turn : null,
        resonance: tierInfo.discount > 0,
        mode,
      });
      if (!outcome.ok) {
        return res.status(409).json({ error: outcome.error, thought_id });
      }
      res.json({
        session_id: session.session_id,
        unit_id,
        thought_id,
        cost_total: outcome.cost_total,
        base_cost: outcome.base_cost,
        scaled_cost: outcome.scaled_cost,
        mode: outcome.mode,
        resonance_applied: outcome.resonance_applied,
        resonance_tier: tierInfo.tier,
        resonance_label: tierInfo.label_it,
        cabinet: snapshotCabinet(state),
      });
    } catch (err) {
      next(err);
    }
  });

  // P4 Phase 2 — forget a researching or internalized thought to free a
  // slot. Body: { unit_id, thought_id }. Symmetric with research.
  router.post('/:id/thoughts/forget', (req, res, next) => {
    try {
      const { error, session } = resolveSession(req.params.id);
      if (error) return res.status(error.status).json(error.body);
      const { unit_id, thought_id } = req.body || {};
      if (!unit_id || !thought_id) {
        return res.status(400).json({ error: 'unit_id e thought_id obbligatori' });
      }
      const { state } = getOrCreateCabinet(session.session_id, unit_id);
      const outcome = forgetThoughtFn(state, thought_id);
      if (!outcome.ok) {
        return res.status(409).json({ error: outcome.error, thought_id });
      }
      // Recompute passives post-forget and re-apply to live unit stats.
      const postPassives = thoughtPassiveBonuses(state);
      const unit = (session.units || []).find((u) => u && u.id === unit_id);
      if (unit) updateThoughtPassives(unit, postPassives.bonus, postPassives.cost);
      res.json({
        session_id: session.session_id,
        unit_id,
        thought_id,
        freed_from: outcome.freed_from,
        cabinet: snapshotCabinet(state),
      });
    } catch (err) {
      next(err);
    }
  });

  // P4 Phase 2 — advance research timers. Body: { delta?: 1, unit_ids?: [] }.
  // Decrements cost_remaining for every researching thought on the listed
  // units (all units if `unit_ids` omitted); thoughts hitting 0 are
  // promoted to internalized. Intended to be called on encounter/campaign
  // advance by the caller; round orchestrator stays untouched.
  router.post('/:id/thoughts/tick', (req, res, next) => {
    try {
      const { error, session } = resolveSession(req.params.id);
      if (error) return res.status(error.status).json(error.body);
      const delta = Number.isFinite(req.body?.delta) ? req.body.delta : 1;
      const unitIds = Array.isArray(req.body?.unit_ids) ? req.body.unit_ids : null;
      const bucket = getCabinetBucket(session.session_id);
      const perActor = {};
      const iterable = unitIds
        ? unitIds.map((id) => [id, bucket.get(id)]).filter(([, v]) => v)
        : Array.from(bucket.entries());
      for (const [unitId, state] of iterable) {
        const { promoted } = tickThoughtResearch(state, delta);
        const passives = thoughtPassiveBonuses(state);
        // Wire passives into live unit stats when thoughts are internalized.
        if (promoted.length > 0) {
          const unit = (session.units || []).find((u) => u && u.id === unitId);
          if (unit) updateThoughtPassives(unit, passives.bonus, passives.cost);
        }
        perActor[unitId] = {
          ...snapshotCabinet(state),
          promoted,
          passive_bonus: passives.bonus,
          passive_cost: passives.cost,
        };
      }
      res.json({ session_id: session.session_id, delta, per_actor: perActor });
    } catch (err) {
      next(err);
    }
  });

  // Skiv Goal 3 — Thoughts ritual choice (P4 agency, Disco extension on top
  // of #1966). When a unit has unlocked thoughts ready for internalization,
  // returns top-N candidates ranked by vcSnapshot mbti_axes match strength
  // (distance from threshold + tier weight). Each candidate includes a
  // voice line preview pulled from inner_voices.yaml (#1945) when available,
  // so the player can hear *which* voice ascends pre-internalization.
  // Query: ?unit_id=<id>&top=3 (default top=3, max 5).
  router.get('/:id/thoughts/candidates', (req, res, next) => {
    try {
      const { error, session } = resolveSession(req.params.id);
      if (error) return res.status(error.status).json(error.body);
      const unitId = req.query.unit_id;
      if (!unitId) return res.status(400).json({ error: 'unit_id obbligatorio' });
      const topRaw = Number.parseInt(req.query.top, 10);
      const top = Number.isFinite(topRaw) ? Math.min(5, Math.max(1, topRaw)) : 3;
      const snapshot = buildVcSnapshot(session, telemetryConfig);
      const actorVc = snapshot.per_actor?.[unitId] || null;
      const axes = actorVc && actorVc.mbti_axes ? actorVc.mbti_axes : null;
      const { state } = getOrCreateCabinet(session.session_id, unitId);
      // Refresh unlocked set against current axes (mirror /thoughts behavior).
      const { newly } = evaluateMbtiThoughts(axes, state.unlocked);
      mergeUnlocked(state, newly);
      // Build candidate list: unlocked AND not internalized AND not researching.
      const eligible = [];
      for (const id of state.unlocked) {
        if (state.internalized.has(id)) continue;
        if (state.researching.has(id)) continue;
        const entry = describeThought(id);
        if (!entry) continue;
        const axisData = axes ? axes[entry.axis] : null;
        const axisValue = axisData && typeof axisData.value === 'number' ? axisData.value : 0.5;
        const threshold = Number.isFinite(entry.threshold) ? entry.threshold : 0.5;
        // Match strength: how far past threshold the actor is, normalized 0..1.
        // direction='high' rewards values above threshold; 'low' rewards below.
        let strength = 0;
        if (entry.direction === 'high') strength = Math.max(0, axisValue - threshold);
        else if (entry.direction === 'low') strength = Math.max(0, threshold - axisValue);
        // Tier weight: T1=1, T2=1.5, T3=2 (deeper thoughts = higher score base).
        const tier = Number.isFinite(entry.tier) ? entry.tier : 1;
        const tierWeight = 1 + (tier - 1) * 0.5;
        const score = strength * tierWeight;
        // Voice line preview: pick a voice from inner_voices.yaml that matches
        // the same axis+direction (any tier <= entry.tier, prefer matching tier).
        let voicePreview = null;
        try {
          // Iterate all voices, find best match same axis+direction.
          // (Simple linear scan across 24 voices is cheap.)
          const voicesYaml = require('../services/narrative/innerVoice');
          const cat = voicesYaml.loadVoices ? voicesYaml.loadVoices() : null;
          if (cat && cat.voices) {
            let best = null;
            let bestTierDelta = Infinity;
            for (const [vid, v] of Object.entries(cat.voices)) {
              if (v.axis !== entry.axis) continue;
              if (v.direction !== entry.direction) continue;
              const delta = Math.abs((v.tier || 1) - tier);
              if (delta < bestTierDelta) {
                bestTierDelta = delta;
                best = describeVoice(vid, cat);
              }
            }
            if (best) {
              voicePreview = {
                id: best.id,
                voice_it: best.voice_it || best.flavor_it || null,
                tier: best.tier || 1,
                pole_letter: best.pole_letter || null,
              };
            }
          }
        } catch {
          /* voice preview optional */
        }
        eligible.push({
          thought_id: id,
          axis: entry.axis,
          direction: entry.direction,
          pole_letter: entry.pole_letter || null,
          tier,
          title_it: entry.title_it || id,
          flavor_it: entry.flavor_it || '',
          effect_hint_it: entry.effect_hint_it || '',
          effect_bonus: entry.effect_bonus || {},
          effect_cost: entry.effect_cost || {},
          axis_value: axisValue,
          threshold,
          match_strength: Number(strength.toFixed(3)),
          score: Number(score.toFixed(3)),
          voice_preview: voicePreview,
        });
      }
      // Rank by score desc, tiebreaker tier desc.
      eligible.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return b.tier - a.tier;
      });
      const candidates = eligible.slice(0, top);
      res.json({
        session_id: session.session_id,
        unit_id: unitId,
        top,
        total_eligible: eligible.length,
        candidates,
      });
    } catch (err) {
      next(err);
    }
  });

  // Q-001 T2.3 PR-3: List available difficulty profiles.
  router.get('/difficulty/profiles', (req, res, next) => {
    try {
      const { getDifficultyConfig } = require('../../../services/difficulty/loader');
      const cfg = getDifficultyConfig();
      const profiles = cfg.player_difficulty_profiles || {};
      const list = Object.entries(profiles).map(([id, profile]) => ({
        id,
        label_it: profile.label_it,
        label_en: profile.label_en,
        description_it: profile.description_it,
        description_en: profile.description_en,
        enemy_count_multiplier: profile.enemy_count_multiplier,
        enemy_hp_multiplier: profile.enemy_hp_multiplier,
        enemy_damage_multiplier: profile.enemy_damage_multiplier,
        player_hp_multiplier: profile.player_hp_multiplier,
      }));
      res.json({ profiles: list, default: 'normal' });
    } catch (err) {
      next(err);
    }
  });

  // Q-001 T2.4 PR-2: Match replay from event log (read-only).
  // Espone session.events + metadata per replay engine/UI download.
  // Schema: packages/contracts/schemas/replay.schema.json
  router.get('/:id/replay', (req, res, next) => {
    try {
      const { error, session } = resolveSession(req.params.id);
      if (error) return res.status(error.status).json(error.body);
      const events = Array.isArray(session.events) ? session.events : [];
      const turnsPlayed = events.reduce((m, e) => Math.max(m, Number(e?.turn) || 0), 0);
      res.json({
        session_id: session.session_id,
        started_at: session.created_at || null,
        ended_at: session.ended_at || null,
        result: session.result || null,
        events,
        units_snapshot_initial: session.units_snapshot_initial || null,
        meta: {
          turns_played: turnsPlayed,
          events_count: events.length,
          export_version: 1,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  // ────────────────────────────────────────────────────────────────
  // Telemetry batch endpoint — playtest readiness instrumentation
  // ────────────────────────────────────────────────────────────────
  //
  // POST /api/session/telemetry
  //   body: { session_id?, player_id?, events: [{ ts, type, payload }] }
  //   → append-only JSONL su logs/telemetry_YYYYMMDD.jsonl
  //   → Pattern Rainbow Six Siege "Unfun matrix": capture ui_error,
  //     input_latency_ms, client_fps, confusion signals
  //
  // Schema event payload libero; validation soft su top-level.
  router.post('/telemetry', async (req, res, next) => {
    try {
      const { session_id, player_id, events } = req.body || {};
      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ error: 'events array richiesto (non-empty)' });
      }
      if (events.length > 200) {
        return res.status(413).json({ error: 'batch >200 eventi — split richiesto' });
      }
      const now = new Date();
      const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');
      const logDir = path.join(process.cwd(), 'logs');
      try {
        await fs.mkdir(logDir, { recursive: true });
      } catch {
        /* dir exists */
      }
      const logPath = path.join(logDir, `telemetry_${yyyymmdd}.jsonl`);
      const lines = events
        .map((ev) => {
          const entry = {
            ts: ev?.ts || now.toISOString(),
            session_id: session_id || null,
            player_id: player_id || null,
            type: ev?.type || 'unknown',
            payload: ev?.payload ?? null,
          };
          return JSON.stringify(entry);
        })
        .join('\n');
      await fs.appendFile(logPath, lines + '\n', 'utf8');
      res.json({ ok: true, appended: events.length, log_path: path.basename(logPath) });
    } catch (err) {
      next(err);
    }
  });

  // ────────────────────────────────────────────────────────────────
  // Round-based combat endpoints (ADR-2026-04-16, PR 2 di N)
  // ────────────────────────────────────────────────────────────────
  //
  // Le 4 route qui sotto abilitano il nuovo modello round-based
  // (shared-planning → commit → resolve) descritto in
  // ADR-2026-04-16-session-engine-round-migration.md e implementato

  // Round endpoints mounted from sessionRoundBridge.js (token optimization).
  roundBridge.mountRoundEndpoints(router);

  return router;
}

module.exports = {
  createSessionRouter,
  resolveAttack,
  rollD20,
  buildDefaultUnits,
  normaliseUnit,
  GRID_SIZE,
};
