// Session round bridge — extracted from session.js for token optimization.
//
// Factory createRoundBridge(deps) takes closure-scoped dependencies from
// createSessionRouter and returns all round-model functions:
//   - roundModelGuard(req, res) -> bool
//   - adaptSessionToRoundState(session) -> roundState
//   - ensureRoundState(session) -> roundState
//   - placeholderResolveAction(state, action, catalog, rng) -> {nextState, turnLogEntry}
//   - handleLegacyAttackViaRound({session, actor, target, requestedCapPt}) -> response
//   - handleTurnEndViaRound(session) -> response
//   - mountRoundEndpoints(router) -> void (mounts 4 round routes)
//
// All functions use DI via deps — no direct closure references.

'use strict';

const {
  createRoundOrchestrator,
  resolveRound: resolveRoundPure,
  PHASE_PLANNING,
  PHASE_COMMITTED,
  PHASE_RESOLVED,
} = require('../services/roundOrchestrator');
const {
  publicSessionView,
  facingFromMove,
  applyPressureDelta,
  PRESSURE_DELTAS,
  applyApRefill,
} = require('./sessionHelpers');
const {
  detectFocusFireCombo,
  recordAttackForCombo,
  resetRoundAttackTracker,
} = require('../services/squadCoordination');
const {
  detectSynergyTrigger,
  recordSynergyFire,
  resetRoundSynergyTracker,
} = require('../services/combat/synergyDetector');
const { tick: reinforcementTick } = require('../services/combat/reinforcementSpawner');
const { applyStressWaveTick } = require('../services/combat/stressWave');
// TKT-PLAYTEST-SEED (P2): per-session RNG scoping for combat round resolution.
// Installs session.combatRng around each (synchronous) resolveRoundPure so a
// seeded calibration session's stream is isolated from concurrent sessions.
const { runWithSeed, makeHolderRng } = require('../services/combat/pseudoRng');
const { evaluateObjective } = require('../services/combat/objectiveEvaluator');
const { tick: missionTimerTick } = require('../services/combat/missionTimer');
// 2026-04-26: wire isTurnLimitExceeded (damage_curves.yaml soft cap per encounter_class).
// Distinto da missionTimer (encounter-declared opt-in); soft cap si applica a ogni session.
const { isTurnLimitExceeded } = require('../services/balance/damageCurves');
const { buildThreatPreview } = require('../services/ai/threatPreview');
// Status engine extension (2026-04-25 audit P0).
const { applyTurnRegen } = require('../services/combat/statusModifiers');
// Sprint Spore Moderate (ADR-2026-04-26 §S6) — Path A 2026-04-27.
// Adapter (hazard immunity, defender) + alpha (affinity grant, actor) consumers.
const {
  applyHazardImmunity: applyArchetypeHazardImmunity,
  computeAlphaAffinityGrant: computeArchetypeAlphaGrant,
} = require('../services/combat/archetypePassives');
// OD-026 — Skiv echolocation pulse telemetry seam. The senseReveal helper
// (apps/backend/services/combat/senseReveal.js) derives revealed-tile coords
// for an actor with a `default_parts.senses: [echolocation]` entry. Wired
// here at the post-attack seam so a REAL attack by an echolocating actor
// emits a `skiv_pulse_fired` event into session.events (analyzer OD-026
// atlas). Lazy require with graceful fallback — a missing/broken module
// must never block combat resolution.
let _senseReveal = null;
try {
  // eslint-disable-next-line global-require
  _senseReveal = require('../services/combat/senseReveal');
} catch (_err) {
  _senseReveal = null;
}

// Telepatic-link reveal pipe (2026-04-25 audit follow-up). Lazy-loaded with
// graceful fallback so missing module never blocks /round/begin-planning.
let computeTelepathicReveal = null;
try {
  // eslint-disable-next-line global-require
  ({ computeTelepathicReveal } = require('../services/combat/telepathicReveal'));
} catch (_err) {
  computeTelepathicReveal = null;
}

function createRoundBridge(deps) {
  const {
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
    gridSize,
    defaultAttackRange,
    // Sprint 6 (P4 Disco Tier S #9): bucket accessor for end-of-round
    // Thought Cabinet research tick. Optional — bridge no-ops gracefully
    // when missing so older callers keep working.
    getCabinetBucket = null,
  } = deps;

  // V5 SG lifecycle helper (ADR-2026-04-26): reset earn-per-turn counter
  // su tutte le unit vive dopo ogni round advance.
  function sgBeginTurnAll(session) {
    try {
      const sgTracker = require('../services/combat/sgTracker');
      for (const u of session.units || []) {
        if (u && u.hp > 0) sgTracker.beginTurn(u);
      }
    } catch {
      /* sgTracker optional */
    }
    // Creature-trait kit (trait 12): re-anchor radici carriers at each round start
    // (mirrors the filtri/pigmenti slice wires). A move during the round breaks the
    // anchor. Best-effort, band-neutral (no live unit carries radici_ancora_planare).
    try {
      const { applyAnchorAtActivation } = require('../services/combat/anchorState');
      for (const u of session.units || []) {
        if (u && u.hp > 0) applyAnchorAtActivation(u);
      }
    } catch {
      /* anchor module optional */
    }
  }

  // Validates a player intent action against current session state.
  // Returns null if valid, { code, message } on rejection.
  function validatePlayerIntent(session, actorId, action) {
    if (!action || typeof action !== 'object') {
      return { code: 'INVALID_ACTION', message: 'action deve essere object' };
    }
    const actor = (session.units || []).find((u) => u.id === actorId);
    if (!actor) {
      return { code: 'NO_ACTOR', message: `actor "${actorId}" non trovato` };
    }
    if (Number(actor.hp || 0) <= 0) {
      return { code: 'ACTOR_DEAD', message: `actor "${actorId}" è KO (hp ${actor.hp})` };
    }
    // P1-3 hardening (session-debugger review): sum pending intents already
    // declared for this actor in current round. Prima validava solo nuovo
    // intent contro actor.ap_remaining → multi-intent exploit via curl bypass
    // client Wave 8N budget check (2 attack ap_cost=2 cada, actor.ap=3: backend
    // accettava entrambi singolarmente, resolveFn scalava -1 cada = consumo
    // 2 AP invece di 4 richiesti).
    // 2026-07 hardening: the sum uses resolveIntentApCost (server-authoritative for
    // attack/ability), so declaring ap_cost:0/negative no longer bypasses the gate.
    // Keep in lockstep with apLedger.canAfford (extraction follow-up: rewire onto the ledger).
    const apCost = resolveIntentApCost(actor, action);
    const apAvail = Number(actor.ap_remaining != null ? actor.ap_remaining : actor.ap || 0);
    const pendingForActor = ((session.roundState && session.roundState.pending_intents) || [])
      .filter((i) => String(i.unit_id || '') === String(actorId))
      .reduce((sum, i) => sum + resolveIntentApCost(actor, i && i.action), 0);
    const totalProposed = pendingForActor + apCost;
    if (totalProposed > apAvail) {
      return {
        code: 'AP_INSUFFICIENT',
        message: `AP insufficienti: costo totale ${totalProposed} (pending ${pendingForActor} + nuovo ${apCost}), disponibili ${apAvail}`,
      };
    }

    if (action.type === 'attack') {
      if (!action.target_id) {
        return { code: 'NO_TARGET', message: 'attack richiede target_id' };
      }
      const target = (session.units || []).find((u) => u.id === String(action.target_id));
      if (!target) {
        return { code: 'TARGET_NOT_FOUND', message: `target "${action.target_id}" non trovato` };
      }
      if (Number(target.hp || 0) <= 0) {
        return {
          code: 'TARGET_DEAD',
          message: `target "${action.target_id}" è KO`,
        };
      }
      if (actor.controlled_by && target.controlled_by === actor.controlled_by) {
        return {
          code: 'FRIENDLY_FIRE',
          message: `non puoi attaccare un alleato (${target.controlled_by})`,
        };
      }
      if (typeof manhattanDistance === 'function') {
        const dist = manhattanDistance(actor.position, target.position);
        const range = actor.attack_range ?? defaultAttackRange ?? 1;
        if (dist > range) {
          return {
            code: 'OUT_OF_RANGE',
            message: `target fuori range (distanza ${dist} > range ${range})`,
          };
        }
      }
    } else if (action.type === 'move') {
      const dest = action.move_to;
      if (
        !dest ||
        typeof dest.x !== 'number' ||
        typeof dest.y !== 'number' ||
        !Number.isFinite(dest.x) ||
        !Number.isFinite(dest.y)
      ) {
        return { code: 'NO_DEST', message: 'move richiede move_to {x,y} numeriche' };
      }
      const size = gridSize || 6;
      if (dest.x < 0 || dest.x >= size || dest.y < 0 || dest.y >= size) {
        return {
          code: 'OUT_OF_GRID',
          message: `posizione (${dest.x},${dest.y}) fuori griglia ${size}x${size}`,
        };
      }
      if (typeof manhattanDistance === 'function') {
        const dist = manhattanDistance(actor.position, dest);
        // Ennea Esploratore(7) move_bonus consumer: estende il budget di move
        // di N celle oltre AP disponibili. Bonus consumato qui, non scalato
        // dall'ap_cost in resolveFn — valido solo per move action, non altre.
        const moveBudget = apAvail + Math.max(0, Number(actor.move_bonus_bonus || 0));
        if (dist > moveBudget) {
          return {
            code: 'MOVE_TOO_FAR',
            message: `move di ${dist} celle richiede ${dist} AP (disponibili ${apAvail}${
              actor.move_bonus_bonus ? ` +${actor.move_bonus_bonus} bonus` : ''
            })`,
          };
        }
      }
      const blocker = (session.units || []).find(
        (u) =>
          u.id !== actor.id &&
          Number(u.hp || 0) > 0 &&
          u.position &&
          u.position.x === dest.x &&
          u.position.y === dest.y,
      );
      if (blocker) {
        return {
          code: 'CELL_OCCUPIED',
          message: `cella (${dest.x},${dest.y}) occupata da ${blocker.id}`,
        };
      }
    }
    // type === 'skip' or other → no validation
    return null;
  }

  // Authz precheck for the player-facing round routes (security fix 2026-07-05).
  // The HTTP round endpoints (/declare-intent, /declare-reaction, /clear-intent,
  // /undo-action) are the client surface; only player-controlled units may be
  // driven from a client. SISTEMA (AI/enemy) intents are authored server-side by
  // declareSistemaIntents, so a request naming a non-player actor is illegitimate
  // (CWE-284 / CWE-639 IDOR). Returns null when allowed, else { status, body }.
  function requirePlayerActor(session, actorId, { requireAlive = true } = {}) {
    const actor = (session.units || []).find((u) => u.id === actorId);
    if (!actor) {
      return { status: 404, body: { error: `actor "${actorId}" non trovato`, code: 'NO_ACTOR' } };
    }
    if (actor.controlled_by !== 'player') {
      return {
        status: 403,
        body: {
          error: `actor "${actorId}" non e' controllato dal player`,
          code: 'ACTOR_NOT_OWNED',
        },
      };
    }
    if (requireAlive && Number(actor.hp || 0) <= 0) {
      return {
        status: 400,
        body: { error: `actor "${actorId}" e' KO (hp ${actor.hp})`, code: 'ACTOR_DEAD' },
      };
    }
    return null;
  }

  // AP cost authority (resolveMoveApCost / resolveActionApCost /
  // resolveIntentApCost / isValidGridDest) -- extracted to apLedger (spec
  // docs/superpowers/specs/2026-07-10-sistema-symmetry-design.md sez. 4.1).
  // Load-bearing comments (anti-double-charge, OWASP A04 hardening) live with
  // the code there now.
  const { resolveMoveApCost, resolveActionApCost, resolveIntentApCost, isValidGridDest } =
    require('../services/combat/apLedger').createApLedger({ manhattanDistance, gridSize });

  // ────────────────────────────────────────────────────────────────
  // Guards + adapters
  // ────────────────────────────────────────────────────────────────

  // M17: roundModelGuard removed. Round endpoints always active.
  // USE_ROUND_MODEL flag no longer checked (default true since M16).

  function adaptSessionToRoundState(session) {
    const units = (session.units || []).map((u) => {
      const statusObj = u.status || {};
      // M5-#5 (P0-F audit): intensity preservation. Precedente `intensity: 1`
      // hardcoded faceva collassare il panic penalty calcolo a intensity*2 = 2
      // sempre, perdendo stack. Leggi da status_intensity parallel dict quando
      // presente, default 1 (backward compat per session pre-M5-#5).
      const intensityMap = u.status_intensity || {};
      const statuses = [];
      for (const [id, turns] of Object.entries(statusObj)) {
        if (Number(turns) > 0) {
          const intensity = Number(intensityMap[id]) || 1;
          statuses.push({ id, intensity, remaining_turns: Number(turns) });
        }
      }
      return {
        id: String(u.id),
        controlled_by: u.controlled_by || null,
        hp: {
          current: Number(u.hp || 0),
          max: Number(u.max_hp || u.hp || 0),
        },
        ap: {
          current: Number(u.ap_remaining != null ? u.ap_remaining : u.ap || 0),
          max: Number(u.ap || 0),
        },
        reactions: { current: 1, max: 1 },
        initiative: Number(u.initiative || 0),
        tier: Number(u.tier || 1),
        stress: Number(u.stress || 0),
        statuses,
        reaction_cooldown_remaining: Number(u.reaction_cooldown_remaining || 0),
      };
    });
    return {
      session_id: session.session_id,
      turn: Number(session.turn || 1),
      round_phase: null,
      pending_intents: [],
      units,
      log: [],
    };
  }

  function ensureRoundState(session) {
    if (!session.roundState) {
      session.roundState = adaptSessionToRoundState(session);
    }
    return session.roundState;
  }

  // M5-#5 (P0-F audit): reverse adapter roundState → session.
  // Il roundOrchestrator muta status array (id/intensity/remaining_turns)
  // durante decay + status_applies, ma senza back-sync le mutazioni restavano
  // solo in session.roundState (effimero), non nel session.units canonical
  // (dict `status` consumato da legacy session.js:1369-1374 decay tick).
  // Questo helper propaga lo state finale roundState → session.units[].status
  // (dict `status` + parallel `status_intensity` per preservare stack).
  // Chiamato dopo ogni operazione orchestrator che può mutare statuses
  // (resolveRound, commitRound hosting status_applies, addStatus eventuali).
  function syncStatusesFromRoundState(session) {
    if (!session || !session.roundState || !Array.isArray(session.roundState.units)) {
      return;
    }

    const unitsById = new Map();
    for (const u of session.units || []) {
      const k = String(u.id);
      if (!unitsById.has(k)) unitsById.set(k, u);
    }

    for (const roundUnit of session.roundState.units) {
      const sessionUnit = unitsById.get(String(roundUnit.id));
      if (!sessionUnit) continue;
      if (!sessionUnit.status) sessionUnit.status = {};
      if (!sessionUnit.status_intensity) sessionUnit.status_intensity = {};

      // 1. Rimuovi status dal dict legacy che non sono più nello roundState
      //    (decaied to 0 o rimossi). `statuses` array è source-of-truth post-orchestrator.
      //    OD-058 D3: le chiavi PERSISTENTI (wounds V2 + legacy wounded_perma) NON
      //    sono effetti round-tracked -- esenti dal wipe (il rebuild le cancellava).
      const liveIds = new Set(
        (roundUnit.statuses || []).filter((s) => Number(s.remaining_turns) > 0).map((s) => s.id),
      );
      // Creature-trait slice 2+3: the nuclei_di_controllo weak-point states are durable
      // (the broken/destroyed nucleus does not heal between rounds, the intact one is
      // sustained) -> exempt from the round wipe like wounds. Without this, danno_nucleo/
      // nucleo_distrutto would be wiped the round after the break and the passive refresh
      // would re-intact it. coordinamento (slice 3 ally aura) is producer-managed
      // (allyAuraMark clears+rebroadcasts each refresh) -> exempt so it survives the
      // mid-round wipe until the round-end recompute.
      const PERSISTENT_STATUS_KEYS = new Set([
        'wounds',
        'wounded_perma',
        'nucleo_intatto',
        'danno_nucleo',
        'nucleo_distrutto',
        'coordinamento',
        // Creature-trait slice 7: abbagliato (pigmenti dazzle) is set at end-of-round and
        // read by the enemy's next attack -> wipe-exempt; it rides a high TTL vs the decay
        // and is removed by consumeAbbagliato on that attack (single-use).
        'abbagliato',
        // Creature-trait kit (trait 12): ancorato (radici anchor DR2) is set at round
        // start (producer) and held for the whole round unless a move breaks it ->
        // wipe-exempt so the mid-round status sync cannot clear a standing carrier's DR.
        // (PERSISTENT guards the WIPE, not the decay loop; the producer re-sets DR2 each
        // round so no decay applies -- slice-7 pigmenti lesson.)
        'ancorato',
      ]);
      for (const id of Object.keys(sessionUnit.status)) {
        if (PERSISTENT_STATUS_KEYS.has(id)) continue;
        if (!liveIds.has(id)) {
          delete sessionUnit.status[id];
          delete sessionUnit.status_intensity[id];
        }
      }

      // 2. Scrivi (create/update) status attivi dall'array into dict.
      for (const s of roundUnit.statuses || []) {
        const turns = Number(s.remaining_turns);
        if (turns > 0) {
          sessionUnit.status[s.id] = turns;
          sessionUnit.status_intensity[s.id] = Number(s.intensity) || 1;
        }
      }
    }

    // TKT-ORPHAN-MORALE + TKT-D4-ENRICH (#2533): re-apply statuses that
    // performAttack stashed during this resolve — morale (panic/rage), GAP-1
    // on_hit_status (trait_mechanics) and SPRINT_018 apply_status trait
    // effects all share this drain channel. The loop above rebuilds
    // unit.status from the orchestrator's tracked array and would otherwise
    // wipe anything set mid-attack; draining here gives every attack resolver
    // (player + AI + legacy) consistent behavior in one place, and the next
    // adaptSessionToRoundState promotes the re-applied keys to tracked
    // orchestrator statuses (universal decay included). Best-effort; never
    // blocks the round.
    if (Array.isArray(session._pendingStatusApplies) && session._pendingStatusApplies.length) {
      let applyMoraleStatus = null;
      try {
        ({ applyMoraleStatus } = require('../services/combat/morale'));
      } catch {
        applyMoraleStatus = null;
      }
      if (applyMoraleStatus) {
        for (const pending of session._pendingStatusApplies) {
          const u = unitsById.get(String(pending.unit_id));
          if (u && Number(u.hp) > 0) applyMoraleStatus(u, pending.status, pending.duration);
        }
      }
      session._pendingStatusApplies = [];
    }
  }

  function placeholderResolveAction(state, action, _catalog, _rng) {
    const next = JSON.parse(JSON.stringify(state));
    const actorId = String(action.actor_id || '');
    const targetId = action.target_id ? String(action.target_id) : null;
    const actor = next.units.find((u) => u.id === actorId);
    if (actor && actor.ap) {
      actor.ap.current = Math.max(
        0,
        Number(actor.ap.current || 0) - resolveActionApCost(actor, action),
      );
    }
    let damageApplied = 0;
    let healingApplied = 0;
    if (action.type === 'attack' && targetId) {
      const target = next.units.find((u) => u.id === targetId);
      if (target && target.hp) {
        damageApplied = 3;
        target.hp.current = Math.max(0, Number(target.hp.current || 0) - damageApplied);
      }
    } else if (action.type === 'heal' && targetId) {
      const target = next.units.find((u) => u.id === targetId);
      if (target && target.hp) {
        const missing = Number(target.hp.max || 0) - Number(target.hp.current || 0);
        healingApplied = Math.max(0, Math.min(3, missing));
        target.hp.current = Number(target.hp.current || 0) + healingApplied;
      }
    }
    const turnLogEntry = {
      turn: Number(next.turn || 1),
      action: { ...action },
      damage_applied: damageApplied,
      healing_applied: healingApplied,
    };
    (next.log = next.log || []).push(turnLogEntry);
    return { nextState: next, turnLogEntry };
  }

  // ────────────────────────────────────────────────────────────────
  // Legacy attack wrapper (flag-on)
  // ────────────────────────────────────────────────────────────────

  async function handleLegacyAttackViaRound({
    session,
    actor,
    target,
    requestedCapPt,
    channel = null,
  }) {
    const roundAction = {
      id: `legacy-attack-${actor.id}-${session.action_counter}`,
      type: 'attack',
      actor_id: actor.id,
      target_id: target.id,
      ability_id: null,
      ap_cost: 1,
      channel: typeof channel === 'string' && channel.length > 0 ? channel : null,
      damage_dice: { count: 1, sides: 6, modifier: 2 },
    };

    const capturedResults = {
      result: null,
      evaluation: null,
      damageDealt: 0,
      killOccurred: false,
      parry: null,
      terrainReaction: null,
      positional: null,
    };

    const realResolveAction = (state, action, _catalog, _rng) => {
      const next = JSON.parse(JSON.stringify(state));
      if (action.type === 'attack' && action.target_id) {
        // M6-#1b: passa action per channel routing in performAttack
        const res = performAttack(session, actor, target, action);
        capturedResults.result = res.result;
        capturedResults.evaluation = res.evaluation;
        capturedResults.damageDealt = res.damageDealt;
        capturedResults.killOccurred = res.killOccurred;
        capturedResults.parry = res.parry;
        capturedResults.intercept = res.intercept || null;
        capturedResults.bondReaction = res.bond_reaction || null;
        capturedResults.terrainReaction = res.terrain_reaction || null;
        capturedResults.positional = res.positional || null;
        // TKT-D4-ENRICH (#2533): surface the status producers in the wrapped
        // result (probe/telemetry need the applied list; it was dropped here).
        capturedResults.onHitStatus = res.on_hit_status || null;
        capturedResults.statusApplies = Array.isArray(res.status_applies) ? res.status_applies : [];
        capturedResults.beastBondReactions = Array.isArray(res.beast_bond_reactions)
          ? res.beast_bond_reactions
          : [];
        // V5 shared_hp_pool (Codex #2542 P2): re-split a bonus through the pool
        // RIGHT AFTER it lands, BEFORE the next bonus block reads target.hp — else a
        // pooled target floored to 0 by focus_fire makes synergy read 0 and skip its
        // stackable bonus. No-op for non-pool targets (applySharedHpPool -> null).
        // V5 shared_hp_pool (Codex #2542 P2): apply a focus_fire/synergy bonus with
        // its FULL value through the pool, so a low-HP pooled member doesn't starve
        // the bonus (the bonded partner absorbs the overflow) and each stacked bonus
        // reads pool-restored HP. Pre-credit the full bonus to damage_taken; the pool
        // reconciles it (-extra + actual) when pooled, else fall back to the solo
        // clamp (undo the over-credit). Returns the damage that actually landed.
        const applyBonusThroughPool = (extra) => {
          if (!(extra > 0)) return 0;
          const hpNow = Number(target.hp || 0);
          if (hpNow <= 0) return 0;
          const soloApplied = Math.min(extra, hpNow);
          if (session.damage_taken) {
            session.damage_taken[target.id] = (session.damage_taken[target.id] || 0) + extra;
          }
          target.hp = hpNow - soloApplied; // tentative solo; the pool overrides when pooled
          let pr = null;
          try {
            pr = require('../services/combat/symbiontBond').applySharedHpPool(
              session,
              target,
              extra,
              hpNow,
            );
          } catch {
            /* symbiont bond optional */
          }
          if (pr) {
            capturedResults.killOccurred = Number(target.hp) <= 0;
            return extra;
          }
          if (session.damage_taken) {
            session.damage_taken[target.id] = Math.max(
              0,
              (session.damage_taken[target.id] || 0) - extra + soloApplied,
            );
          }
          if (Number(target.hp) <= 0 && !capturedResults.killOccurred) {
            capturedResults.killOccurred = true;
          }
          return soloApplied;
        };
        // Pilastro 5: focus_fire combo. Se altri player hanno gia' colpito lo
        // stesso target in questo round, +1 dmg al secondo/terzo attacco.
        // Fix flake (iter6): combo metadata esposta anche su hit con damage=0
        // (parry completo, cap damage). Bonus_applied=0 ma is_combo=true.
        const comboInfo = detectFocusFireCombo(session, actor, target);
        if (res.result && res.result.hit && comboInfo.is_combo) {
          let applied = 0;
          if (res.damageDealt > 0) {
            applied = applyBonusThroughPool(comboInfo.bonus_damage);
            if (applied > 0) {
              capturedResults.damageDealt = res.damageDealt + applied;
            }
          }
          capturedResults.combo = { ...comboInfo, bonus_applied: applied };
        }
        recordAttackForCombo(session, actor, target, comboInfo);
        // Skiv ticket #2: synergy combo (`echo_backstab` & co.). Indipendente
        // dal focus_fire — può sommarsi nello stesso attacco. Cooldown 1/round.
        const synergyInfo = detectSynergyTrigger(session, actor, target);
        if (res.result && res.result.hit && synergyInfo.triggered) {
          let appliedSyn = 0;
          if (res.damageDealt > 0) {
            appliedSyn = applyBonusThroughPool(synergyInfo.bonus_damage);
            if (appliedSyn > 0) {
              capturedResults.damageDealt =
                Number(capturedResults.damageDealt || res.damageDealt) + appliedSyn;
            }
          }
          capturedResults.synergy = { ...synergyInfo, bonus_applied: appliedSyn };
          recordSynergyFire(session, actor, target, synergyInfo, appliedSyn);
        }
        for (const uOrch of next.units) {
          const uLegacy = session.units.find((u) => u.id === uOrch.id);
          if (uLegacy) {
            if (uOrch.hp) {
              uOrch.hp.current = Number(uLegacy.hp || 0);
              uOrch.hp.max = Number(uLegacy.max_hp || uLegacy.hp || 0);
            }
            if (uOrch.ap) {
              uOrch.ap.current = Number(
                uLegacy.ap_remaining != null ? uLegacy.ap_remaining : uLegacy.ap || 0,
              );
              uOrch.ap.max = Number(uLegacy.ap || 0);
            }
          }
        }
        const turnLogEntry = {
          turn: Number(next.turn || 1),
          action: { ...action },
          damage_applied: Number(res.damageDealt || 0),
          roll: res.result.roll,
          mos: res.result.mos,
          pt_gained: res.result.pt,
          hit: res.result.hit,
          die: res.result.die,
        };
        (next.log = next.log || []).push(turnLogEntry);
        return { nextState: next, turnLogEntry };
      }
      return placeholderResolveAction(state, action, _catalog, _rng);
    };

    actor.ap_remaining = Math.max(
      0,
      (actor.ap_remaining ?? actor.ap) - resolveActionApCost(actor, roundAction),
    );
    const hpBefore = target.hp;
    const targetPositionAtAttack = { ...target.position };

    session.roundState = adaptSessionToRoundState(session);
    let cur = session.roundState;
    if (cur.round_phase !== PHASE_PLANNING) {
      cur = roundOrchestrator.beginRound(cur).nextState;
    }
    cur = roundOrchestrator.declareIntent(cur, actor.id, roundAction).nextState;
    cur = roundOrchestrator.commitRound(cur).nextState;
    const result = runWithSeed(session.combatRng, () =>
      resolveRoundPure(cur, null, rng, realResolveAction),
    );
    session.roundState = result.nextState;
    syncStatusesFromRoundState(session);

    // Sprint 6 (2026-04-27): apply Beast Bond mutations AFTER sync. Rationale:
    // syncStatusesFromRoundState clears any unit.status keys not tracked by
    // the round orchestrator's `statuses` array — applying the buff inside
    // performAttack would be wiped immediately. Re-resolve the holder by id
    // (capturedResults.beastBondReactions stores reaction descriptors only).
    if (
      Array.isArray(capturedResults.beastBondReactions) &&
      capturedResults.beastBondReactions.length > 0
    ) {
      try {
        const beastBondReaction = require('../services/combat/beastBondReaction');
        const inflated = capturedResults.beastBondReactions
          .map((r) => {
            const holder = (session.units || []).find((u) => String(u.id) === String(r.holder_id));
            if (!holder || Number(holder.hp) <= 0) return null;
            return {
              holder_id: r.holder_id,
              holder,
              trait_id: r.trait_id,
              effect: {
                atk_delta: r.atk_delta,
                def_delta: r.def_delta,
                duration: r.duration,
              },
              log_tag: r.log_tag,
            };
          })
          .filter(Boolean);
        beastBondReaction.applyBeastBondReactions(inflated);
      } catch (err) {
        // Non-blocking: bond apply failure must never break combat.
        // eslint-disable-next-line no-console
        console.warn('[beast-bond apply] skipped:', err && err.message ? err.message : err);
      }
    }

    // Guard: if round queue skipped the action (actor/target dead mid-resolve),
    // capturedResults.result is null. Build a minimal event + return miss.
    if (capturedResults.result) {
      const event = buildAttackEvent({
        session,
        actor,
        target,
        result: capturedResults.result,
        evaluation: capturedResults.evaluation,
        damageDealt: capturedResults.damageDealt,
        hpBefore,
        targetPositionAtAttack,
        terrainReaction: capturedResults.terrainReaction,
        positional: capturedResults.positional,
      });
      if (capturedResults.parry) event.parry = capturedResults.parry;
      if (capturedResults.intercept) event.intercept = capturedResults.intercept;
      if (capturedResults.bondReaction) event.bond_reaction = capturedResults.bondReaction;
      if (
        Array.isArray(capturedResults.beastBondReactions) &&
        capturedResults.beastBondReactions.length > 0
      ) {
        event.beast_bond_reactions = capturedResults.beastBondReactions;
      }
      if (requestedCapPt > 0) {
        event.cost = { cap_pt: requestedCapPt };
        consumeCapPt(session, requestedCapPt);
      }
      await appendEvent(session, event);
      // OD-026 — Skiv echolocation pulse. If the attacking actor carries an
      // echolocation sense (default_parts.senses) and is not on cooldown,
      // the REAL senseReveal mechanic derives revealed tiles around the
      // attacked target. When ≥1 tile is revealed we emit a
      // `skiv_pulse_fired` event into session.events (analyzer OD-026
      // atlas) + mark the 2-round cooldown. target_biome_id is sourced from
      // REAL session biome state (session.biome_id || encounter biome) — no
      // hardcoded constant. No fabrication: emitted ONLY when getRevealedTiles
      // actually returns tiles for a real attack. Defensive: any failure is
      // swallowed so the pulse seam can never break combat.
      if (_senseReveal && typeof _senseReveal.getRevealedTiles === 'function') {
        try {
          const currentRound = Number(
            (session.roundState && session.roundState.round) || session.turn || 0,
          );
          // Real grid bounds (mirror session.js _gw/_gh pattern). Falls back
          // to the scalar gridSize dep, else undefined → getRevealedTiles
          // treats bounds as Infinity (no clamp) which is safe.
          const gw =
            (session.grid && Number(session.grid.width)) ||
            (typeof gridSize === 'number' ? gridSize : undefined);
          const gh =
            (session.grid && Number(session.grid.height)) ||
            (typeof gridSize === 'number' ? gridSize : undefined);
          const world = {
            currentRound,
            width: Number.isFinite(gw) ? gw : undefined,
            height: Number.isFinite(gh) ? gh : undefined,
          };
          const revealed = _senseReveal.getRevealedTiles(actor, target, world);
          if (Array.isArray(revealed) && revealed.length > 0) {
            const biomeId =
              session.biome_id || (session.encounter && session.encounter.biome_id) || '';
            await appendEvent(session, {
              ts: new Date().toISOString(),
              session_id: session.session_id,
              action_type: 'skiv_pulse_fired',
              actor_id: actor.id,
              target_biome_id: biomeId,
              revealed_tiles: revealed.length,
              turn: session.turn,
              trait_effects: [],
            });
            _senseReveal.markCooldown(actor, currentRound);
          }
        } catch (err) {
          // Non-blocking: pulse telemetry must never break combat.
          // eslint-disable-next-line no-console
          console.warn('[od026 skiv-pulse] skipped:', err && err.message ? err.message : err);
        }
      }
      // iter4: emit reaction_trigger event quando intercept fires.
      if (capturedResults.intercept) {
        const reactionEvent = {
          ts: new Date().toISOString(),
          session_id: session.session_id,
          actor_id: capturedResults.intercept.interceptor_id,
          action_type: 'reaction_trigger',
          ability_id: capturedResults.intercept.ability_id,
          trigger: 'ally_attacked_adjacent',
          target_id: capturedResults.intercept.interceptor_id,
          original_target_id: capturedResults.intercept.target_id,
          attacker_id: capturedResults.intercept.attacker_id,
          turn: session.turn,
          damage_rerouted: capturedResults.intercept.damage_rerouted,
          interceptor_hp_before: capturedResults.intercept.interceptor_hp_before,
          interceptor_hp_after: capturedResults.intercept.interceptor_hp_after,
          interceptor_killed: capturedResults.intercept.interceptor_killed,
          trait_effects: [],
        };
        await appendEvent(session, reactionEvent);
        // iter6 follow-up #1: emit kill chain quando interceptor muore per
        // reroute damage. Killer = original attacker (chi ha tirato il danno),
        // target = interceptor. Assist da damage_taken history standard.
        if (
          capturedResults.intercept.interceptor_killed &&
          capturedResults.intercept.interceptor_unit
        ) {
          await emitKillAndAssists(
            session,
            actor,
            capturedResults.intercept.interceptor_unit,
            reactionEvent,
          );
        }
      }
      // Sprint 7 Beast Bond — emit reaction_trigger event for traceability.
      if (capturedResults.bondReaction) {
        const br = capturedResults.bondReaction;
        const bondEvent = {
          ts: new Date().toISOString(),
          session_id: session.session_id,
          actor_id: br.ally_id,
          action_type: 'reaction_trigger',
          ability_id: `bond:${br.bond_id}`,
          trigger: br.type === 'shield_ally' ? 'bond_ally_hit' : 'bond_ally_attacked',
          target_id: br.type === 'counter_attack' ? br.attacker_id : br.ally_id,
          original_target_id: br.type === 'shield_ally' ? br.target_id : null,
          attacker_id: br.type === 'counter_attack' ? br.attacker_id : null,
          turn: session.turn,
          bond_id: br.bond_id,
          bond_type: br.type,
          damage_absorbed: br.damage_absorbed || 0,
          damage_dealt: br.damage_dealt || 0,
          ally_hp_before: br.ally_hp_before || null,
          ally_hp_after: br.ally_hp_after || null,
          ally_killed: !!br.ally_killed,
          attacker_killed: !!br.attacker_killed,
          trait_effects: [],
        };
        await appendEvent(session, bondEvent);
        // Kill chain when counter_attack KOs attacker. Killer = bonded ally
        // who fired the counter; victim = original attacker.
        if (br.type === 'counter_attack' && br.attacker_killed && actor) {
          const allyUnit = (session.units || []).find((u) => u && u.id === br.ally_id);
          if (allyUnit) {
            await emitKillAndAssists(session, allyUnit, actor, bondEvent);
          }
        }
      }
      // Trait-bond stat buff (complement to Sprint 7 above): emit
      // beast_bond_triggered raw events. One per ally that gained the buff
      // (visibile via VC scoring + UI tooltip). Different action_type from
      // bondReaction's reaction_trigger so log consumers can disambiguate.
      if (
        Array.isArray(capturedResults.beastBondReactions) &&
        capturedResults.beastBondReactions.length > 0
      ) {
        for (const reaction of capturedResults.beastBondReactions) {
          await appendEvent(session, {
            ts: new Date().toISOString(),
            session_id: session.session_id,
            action_type: 'beast_bond_triggered',
            actor_id: actor.id,
            actor_species: actor.species,
            ally_id: reaction.holder_id,
            trait_id: reaction.trait_id,
            atk_delta: reaction.atk_delta,
            def_delta: reaction.def_delta,
            duration: reaction.duration,
            log_tag: reaction.log_tag,
            turn: session.turn,
            trait_effects: [],
          });
        }
      }
      if (capturedResults.killOccurred) {
        await emitKillAndAssists(session, actor, target, event);
        await emitPoolCounterpartKo(session, actor, target, event);
        // Sistema pressure (AI War pattern — sistema_pressure.yaml §deltas):
        //   player KO sistema  → +pg_kills_sis  (pressure sale)
        //   sistema KO player  → +sg_pg_down    (pressure cala, Sistema si placa)
        if (typeof session.sistema_pressure === 'number') {
          if (actor.controlled_by === 'player' && target.controlled_by === 'sistema') {
            session.sistema_pressure = applyPressureDelta(
              session.sistema_pressure,
              PRESSURE_DELTAS.pg_kills_sis,
            );
          } else if (actor.controlled_by === 'sistema' && target.controlled_by === 'player') {
            session.sistema_pressure = applyPressureDelta(
              session.sistema_pressure,
              PRESSURE_DELTAS.sg_pg_down,
            );
          }
        }
      }
    }

    const r = capturedResults.result || {};
    const ev = capturedResults.evaluation || {};
    return {
      roll: r.roll || 0,
      mos: r.mos || 0,
      result: r.hit ? 'hit' : 'miss',
      pt: r.pt || 0,
      damage_dealt: capturedResults.damageDealt,
      target_hp: target.hp,
      trait_effects: ev.trait_effects || [],
      cap_pt_used: session.cap_pt_used,
      cap_pt_max: session.cap_pt_max,
      actor_position: { ...actor.position },
      target_position: targetPositionAtAttack,
      parry: capturedResults.parry,
      intercept: capturedResults.intercept || null,
      bond_reaction: capturedResults.bondReaction || null,
      combo: capturedResults.combo || null,
      synergy: capturedResults.synergy || null,
      terrain_reaction: capturedResults.terrainReaction || null,
      beast_bond_reactions: Array.isArray(capturedResults.beastBondReactions)
        ? capturedResults.beastBondReactions
        : [],
      on_hit_status: capturedResults.onHitStatus || null,
      status_applies: Array.isArray(capturedResults.statusApplies)
        ? capturedResults.statusApplies
        : [],
      state: publicSessionView(session),
      round_wrapper: true,
      round_phase: result.nextState.round_phase,
    };
  }

  // ────────────────────────────────────────────────────────────────
  // End-of-round side effects (hazard + bleeding + AP reset + status decay)
  // Helper estratto: usato sia da handleTurnEndViaRound sia da /round/begin-planning.
  // ────────────────────────────────────────────────────────────────

  async function applyEndOfRoundSideEffects(session) {
    const hazardEvents = [];
    if (Array.isArray(session.hazard_tiles) && session.hazard_tiles.length > 0) {
      for (const unit of session.units) {
        if (!unit || Number(unit.hp || 0) <= 0) continue;
        const hazard = session.hazard_tiles.find(
          (h) =>
            Number(h.x) === Number(unit.position?.x) && Number(h.y) === Number(unit.position?.y),
        );
        if (!hazard) continue;
        const baseDmg = Number(hazard.damage) || 1;
        // Sprint Spore Moderate §S6 — adapter_plus hazard immunity (Path A).
        // Defender-side passive: damage source = hazard tile → dmg = 0 quando
        // unit._archetype_passives include archetype_adapter_plus_hazard.
        // Back-compat: zero behavior change quando passive assente.
        const immunity = applyArchetypeHazardImmunity(baseDmg, unit);
        const dmg = immunity.damage;
        const hpBefore = unit.hp;
        unit.hp = Math.max(0, unit.hp - dmg);
        if (dmg > 0) {
          session.damage_taken[unit.id] = (session.damage_taken[unit.id] || 0) + dmg;
        }
        await appendEvent(session, {
          ts: new Date().toISOString(),
          session_id: session.session_id,
          action_type: 'hazard',
          actor_id: hazard.type || 'hazard',
          target_id: unit.id,
          turn: session.turn,
          damage_dealt: dmg,
          result: immunity.immune ? 'immune' : 'hit',
          hp_before: hpBefore,
          hp_after: unit.hp,
          hazard_type: hazard.type || 'unknown',
          position: { x: hazard.x, y: hazard.y },
          ...(immunity.immune
            ? { trait_effects: [{ token: 'archetype_adapter_plus_hazard', immune: true }] }
            : {}),
        });
        hazardEvents.push({
          unit_id: unit.id,
          hazard_type: hazard.type,
          damage: dmg,
          hp_after: unit.hp,
          killed: unit.hp === 0,
          ...(immunity.immune ? { immune: true } : {}),
        });
      }
    }

    const bleedingEvents = [];
    for (const unit of session.units) {
      if (!unit || !unit.status || Number(unit.hp || 0) <= 0) continue;
      const bleedTurns = Number(unit.status.bleeding) || 0;
      if (bleedTurns <= 0) continue;
      const dmg = 1;
      const hpBefore = unit.hp;
      unit.hp = Math.max(0, unit.hp - dmg);
      session.damage_taken[unit.id] = (session.damage_taken[unit.id] || 0) + dmg;
      await appendEvent(session, {
        ts: new Date().toISOString(),
        session_id: session.session_id,
        action_type: 'bleeding',
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
    }

    // Burning tick (2 PT/turno, più severo di bleeding)
    for (const unit of session.units) {
      if (!unit || !unit.status || Number(unit.hp || 0) <= 0) continue;
      const burnTurns = Number(unit.status.burning) || 0;
      if (burnTurns <= 0) continue;
      const dmg = 2;
      const hpBefore = unit.hp;
      unit.hp = Math.max(0, unit.hp - dmg);
      session.damage_taken[unit.id] = (session.damage_taken[unit.id] || 0) + dmg;
      await appendEvent(session, {
        ts: new Date().toISOString(),
        session_id: session.session_id,
        action_type: 'burning',
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
    }

    // Sprint 13 — Status engine wave A: passive ancestor refresh.
    // Re-apply passive ancestor statuses BEFORE regen + decay. Catches new
    // traits gained mid-encounter (mating offspring/recruit/evolve) and
    // refreshes existing entries so the universal decay loop can never
    // tick a passive trait below 1 in normal play. Idempotent: max-policy
    // (won't overwrite a higher remaining count). Best-effort.
    try {
      const { applyPassiveAncestorsToRoster } = require('../services/combat/passiveStatusApplier');
      // Lazy-load registry: traitEffects.loadActiveTraitRegistry caches.
      const { loadActiveTraitRegistry } = require('../services/traitEffects');
      const registry = loadActiveTraitRegistry();
      applyPassiveAncestorsToRoster(session.units || [], registry);
    } catch {
      // best-effort: don't block round-end if registry/applier missing
    }

    // Creature-trait slice 3: recompute the nuclei_di_controllo coordinamento ally
    // aura from current positions (clear-then-rebroadcast). Runs AFTER the passive
    // refresh so nucleo_intatto is current. Keeps coordinated allies accurate as
    // units move / nuclei break. Best-effort, band-neutral (no sim carrier).
    try {
      const { refreshNucleiCoordinamento } = require('../services/combat/allyAuraMark');
      refreshNucleiCoordinamento(session.units || []);
    } catch {
      // best-effort: don't block round-end if the aura producer is missing
    }

    // Creature-trait slice 5: filtri_bioattivi bio-filter -- once-per-round passive
    // cleanse of 1 bleeding + 1 fracture + heal 1 per cleanse (object-map). Run at
    // end-of-round so the carrier starts the next round cleaner ("turn-start" realized
    // as once-per-round). Best-effort, band-neutral (no sim unit carries the trait).
    try {
      const { applyTurnStartCleanse } = require('../services/combat/filtriBioattivi');
      for (const unit of session.units || []) {
        applyTurnStartCleanse(unit);
      }
    } catch {
      // best-effort: don't block round-end if the filter module is missing
    }

    // membrane_osmotiche terrain-heal: a living carrier adjacent (4-neighbour) to a
    // water/bog tile heals 1 at end-of-round. Reads the grid.terrain_features the move
    // terrain-cost substrate (#3012) now carries onto session.grid. Best-effort,
    // band-neutral (no sim unit carries the trait AND no grid places a water tile).
    try {
      const { applyTerrainHeal } = require('../services/combat/membraneOsmotiche');
      const { terrainAtFromFeatures } = require('../services/combat/moveCost');
      const terrainAt = terrainAtFromFeatures(session.grid?.terrain_features || []);
      for (const unit of session.units || []) {
        applyTerrainHeal(unit, { terrainAt });
      }
    } catch {
      // best-effort: don't block round-end if the membrane/terrain module is missing
    }

    // Creature-trait slice 7: pigmenti_aurorali glow -- while a carrier is HP>=50%,
    // dazzle (abbagliato, -1 atk next) the enemies ending adjacent. End-of-round sweep.
    // Best-effort, band-neutral (no sim unit carries the trait).
    try {
      const { applyEndRoundGlow } = require('../services/combat/pigmentiAurorali');
      const roster = session.units || [];
      for (const carrier of roster) {
        applyEndRoundGlow({ carrier, units: roster });
      }
    } catch {
      // best-effort: don't block round-end if the glow module is missing
    }

    // eco_sismico: expire `zona_risonante` (and any other) tile-statuses whose TTL has
    // passed. Band-neutral: nothing stamps a zone in combat yet, so the store is empty.
    try {
      const { decayTileStatuses } = require('../services/combat/ecoSismico');
      if (session.grid) decayTileStatuses(session.grid, Number(session.turn || 0));
    } catch {
      // best-effort: don't block round-end if the eco module is missing
    }

    // Status engine extension: HP regen ticks (`fed` + `healing`).
    // Applied AFTER bleeding (KO units skipped automatically) and BEFORE
    // universal status decay so the last live tick still produces regen.
    const regenEvents = [];
    for (const unit of session.units) {
      if (!unit) continue;
      const ticks = applyTurnRegen(unit);
      for (const tick of ticks) {
        await appendEvent(session, {
          ts: new Date().toISOString(),
          session_id: session.session_id,
          action_type: 'regen',
          actor_id: unit.id,
          actor_species: unit.species,
          actor_job: unit.job,
          target_id: unit.id,
          turn: session.turn,
          damage_dealt: -tick.amount,
          result: 'heal',
          hp_before: tick.hp_before,
          hp_after: tick.hp_after,
          status_source: tick.status,
          trait_effects: [],
        });
        regenEvents.push(tick);
      }
    }

    for (const unit of session.units) {
      if (!unit) continue;
      // Skiv #5: applyApRefill centralises fracture + defy_penalty handling.
      applyApRefill(unit);
      if (unit.status) {
        for (const key of Object.keys(unit.status)) {
          const v = Number(unit.status[key]);
          if (v > 0) unit.status[key] = v - 1;
        }
        // Ability executor: quando status[<stat>_buff] scade (=0),
        // azzera actor[<stat>_bonus]. Evita leak tra round.
        for (const key of Object.keys(unit.status)) {
          if (!key.endsWith('_buff')) continue;
          if (Number(unit.status[key]) > 0) continue;
          const stat = key.slice(0, -'_buff'.length);
          const bonusKey = `${stat}_bonus`;
          if (unit[bonusKey] !== undefined) unit[bonusKey] = 0;
        }
        // Shield ability: status.shield_buff scaduto → azzera shield_hp.
        if (
          unit.status.shield_buff !== undefined &&
          Number(unit.status.shield_buff) <= 0 &&
          unit.shield_hp
        ) {
          unit.shield_hp = 0;
        }
      }
    }

    // P4 Ennea effects wire (post-OD audit, branch feat/p4-ennea-effects-wire).
    // Applica buff/debuff per archetipi Ennea triggerati nel VC snapshot.
    // Lazy-required + try/catch non-blocking: errori loggati, mai propagati.
    // Skip round 1 (no events accumulated → empty per_actor).
    const enneaEvents = [];
    if (Number(session?.turn || 0) > 1) {
      try {
        const { buildVcSnapshot, loadTelemetryConfig } = require('../services/vcScoring');
        const { resolveEnneaEffects, applyEnneaToStatus } = require('../services/enneaEffects');
        // Cache telemetry config per-bridge-instance: YAML I/O 1x.
        if (!applyEndOfRoundSideEffects._telemetryCfg) {
          applyEndOfRoundSideEffects._telemetryCfg = loadTelemetryConfig();
        }
        const cfg = applyEndOfRoundSideEffects._telemetryCfg;
        const snapshot = buildVcSnapshot(session, cfg);
        const perActor = (snapshot && snapshot.per_actor) || {};
        for (const unit of session.units) {
          if (!unit) continue;
          const actorData = perActor[unit.id];
          if (!actorData || !Array.isArray(actorData.ennea_archetypes)) continue;
          const triggered = actorData.ennea_archetypes
            .filter((a) => a && a.triggered)
            .map((a) => a.id);
          if (triggered.length === 0) continue;
          const effects = resolveEnneaEffects(triggered);
          if (effects.length === 0) continue;
          const { applied, skipped } = applyEnneaToStatus(unit, effects);
          if (applied.length === 0 && skipped.length === 0) continue;
          await appendEvent(session, {
            ts: new Date().toISOString(),
            session_id: session.session_id,
            action_type: 'ennea_effects',
            actor_id: unit.id,
            actor_species: unit.species,
            actor_job: unit.job,
            target_id: unit.id,
            turn: session.turn,
            damage_dealt: 0,
            result: 'buff',
            ennea_applied: applied,
            ennea_skipped: skipped,
            triggered_archetypes: triggered,
            automatic: true,
          });
          enneaEvents.push({
            unit_id: unit.id,
            applied,
            skipped,
            triggered,
          });
        }
      } catch (err) {
        // Non-blocking: log + continue. VC snapshot OR telemetry config errors
        // must never break round flow. Surface in console.warn for ops audit.
        // eslint-disable-next-line no-console
        console.warn('[ennea-wire] failed:', err && err.message ? err.message : err);
      }
    }

    // 2026-05-10 TKT-MUT-AUTO-TRIGGER Phase 3+4 wire (ADR-2026-05-10).
    // Per-unit per-round mutation trigger evaluator. Hybrid auto-acquire
    // policy (Q3 verdict): tier 1 auto-applied to applied_mutations,
    // tier 2-3 pushed to unlocked_mutations (player-confirm pending).
    // Surface via raw event log mutation_unlock + CLI debug log.
    // Non-blocking: catalog load errors NON rompono round flow.
    try {
      // eslint-disable-next-line global-require
      const { evaluateAndApply } = require('../services/combat/mutationTriggerEvaluator');
      for (const unit of session.units) {
        if (!unit || Number(unit.hp || 0) <= 0) continue;
        evaluateAndApply(unit, session);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[mutation-trigger] wire failed:', err && err.message ? err.message : err);
    }

    // Sprint Spore Moderate §S6 — alpha_plus affinity grant (Path A 2026-04-27).
    // Actor-side passive: per ogni unit con archetype_alpha_plus_aff1, count
    // alleati adiacenti (manhattan=1, stesso controlled_by, vivi). Scrive
    // unit.alpha_aff_grant_last (consumable da meta NPG layer downstream) e
    // emette event analytics. Back-compat: zero behavior change quando passive
    // assente (count = 0 → skip event).
    const alphaEvents = [];
    for (const unit of session.units) {
      if (!unit || Number(unit.hp || 0) <= 0) continue;
      const grant = computeArchetypeAlphaGrant(unit, session.units);
      if (grant <= 0) {
        unit.alpha_aff_grant_last = 0;
        continue;
      }
      unit.alpha_aff_grant_last = grant;
      await appendEvent(session, {
        ts: new Date().toISOString(),
        session_id: session.session_id,
        action_type: 'alpha_affinity_grant',
        actor_id: unit.id,
        actor_species: unit.species,
        actor_job: unit.job,
        target_id: unit.id,
        turn: session.turn,
        damage_dealt: 0,
        result: 'grant',
        affinity_grant: grant,
        trait_effects: [{ token: 'archetype_alpha_plus_aff1', grant }],
      });
      alphaEvents.push({ unit_id: unit.id, grant });
    }

    // M14-A 2026-04-25 — Triangle Strategy terrain reactions tile state decay.
    // Decrement ttl for every active tile. ttl <= 0 → revert to 'normal' state
    // (or delete entry to keep map sparse). Non-blocking; missing map skipped.
    const terrainDecayEvents = [];
    if (session && session.tile_state_map && typeof session.tile_state_map === 'object') {
      for (const key of Object.keys(session.tile_state_map)) {
        const cur = session.tile_state_map[key];
        if (!cur || typeof cur !== 'object') {
          delete session.tile_state_map[key];
          continue;
        }
        if (cur.type === 'normal') {
          delete session.tile_state_map[key];
          continue;
        }
        const ttl = Number(cur.ttl) || 0;
        if (ttl <= 1) {
          terrainDecayEvents.push({
            key,
            prev_state: cur.type,
            new_state: 'normal',
          });
          delete session.tile_state_map[key];
        } else {
          cur.ttl = ttl - 1;
        }
      }
    }

    // Sprint 6 (P4 Disco Tier S #9): Thought Cabinet round-based cooldown.
    // Decrement cost_remaining for every researching thought across all units
    // in this session by 1 round. Promoted thoughts (cost_remaining == 0)
    // auto-internalize and apply passive bonuses to their unit live.
    // Non-blocking: missing bucket / loader errors logged + ignored so round
    // flow stays untouched.
    const thoughtEvents = [];
    if (typeof getCabinetBucket === 'function') {
      try {
        // eslint-disable-next-line global-require
        const {
          tickAllResearch,
          passiveBonuses: thoughtPassiveBonuses,
        } = require('../services/thoughts/thoughtCabinet');
        // eslint-disable-next-line global-require
        const { updateThoughtPassives } = require('../services/thoughts/thoughtPassiveApply');
        const bucket = getCabinetBucket(session.session_id);
        const promotions = tickAllResearch(bucket, 1);
        for (const { unit_id, promoted } of promotions) {
          if (promoted.length === 0) continue;
          const state = bucket.get(unit_id);
          if (!state) continue;
          const passives = thoughtPassiveBonuses(state);
          const unit = (session.units || []).find((u) => u && u.id === unit_id);
          if (unit) updateThoughtPassives(unit, passives.bonus, passives.cost);
          for (const thoughtId of promoted) {
            await appendEvent(session, {
              ts: new Date().toISOString(),
              session_id: session.session_id,
              action_type: 'thought_internalized',
              actor_id: unit_id,
              actor_species: unit?.species,
              actor_job: unit?.job,
              target_id: unit_id,
              turn: session.turn,
              damage_dealt: 0,
              result: 'unlock',
              thought_id: thoughtId,
              passive_bonus: passives.bonus,
              passive_cost: passives.cost,
              automatic: true,
            });
            thoughtEvents.push({ unit_id, thought_id: thoughtId });
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[thought-tick] failed:', err && err.message ? err.message : err);
      }
    }

    // TKT-ORPHAN-CUMSTATE (Phase 7 wire 2026-05-22): populate per-unit
    // cumulative_ally_adjacent_turns + cumulative_trait_active at end of round so
    // mutationTriggerEvaluator's cumulative-kind triggers actually fire. The engine
    // (cumulativeStateTracker, built 2026-05-11) was orphan: consumer read fields
    // nobody wrote -> cumulative-trigger mutations never fired. Surface = mutations
    // now trigger (player-visible). Best-effort; never blocks the round.
    try {
      const { updateCumulativeState } = require('../services/combat/cumulativeStateTracker');
      for (const unit of session.units) {
        if (!unit || Number(unit.hp || 0) <= 0) continue;
        updateCumulativeState(unit, session, {});
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[cumulative-state] failed:', err && err.message ? err.message : err);
    }

    // TKT-ORPHAN-MORALE (panic contagion): when a team is already routing
    // (>= PANIC_CONTAGION_THRESHOLD living units panicked), each still-steady ally
    // rolls the status_panic_high morale check (morale.js) — panic can spread.
    // High threshold keeps it a rout amplifier, not a first-panic cascade.
    // Best-effort; never blocks the round.
    try {
      const { checkMorale } = require('../services/combat/morale');
      const PANIC_CONTAGION_THRESHOLD = 3;
      const moraleRng = makeHolderRng(session.combatRng);
      const teams = {};
      for (const unit of session.units) {
        if (!unit || Number(unit.hp || 0) <= 0) continue;
        const team = unit.controlled_by || unit.team || 'players';
        if (!teams[team]) teams[team] = { panicked: 0, steady: [] };
        if (unit.status && Number(unit.status.panic) > 0) teams[team].panicked += 1;
        else teams[team].steady.push(unit);
      }
      for (const group of Object.values(teams)) {
        if (group.panicked < PANIC_CONTAGION_THRESHOLD) continue;
        for (const unit of group.steady) {
          const res = checkMorale(unit, 'status_panic_high', { rng: moraleRng });
          if (res && res.triggered && res.status) {
            // eslint-disable-next-line no-await-in-loop
            await appendEvent(session, {
              action_type: 'morale',
              actor_id: unit.id,
              target_id: unit.id,
              turn: session.turn,
              result: res.status,
              morale_event: 'status_panic_high',
              morale_score: res.score,
              morale_threshold: res.threshold,
              duration: res.duration,
            });
          }
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[morale-contagion] failed:', err && err.message ? err.message : err);
    }

    // TKT-JOB-PHASEC B5 minion_resurrect_chance (bm_r6 capstone) — runs LAST, after
    // all damage ticks have finalized this round's deaths. Revives dead minions whose
    // living owner has the perk (one roll per minion); emit the revive events.
    // Seeded RNG (Codex #2547 P2): applyEndOfRoundSideEffects runs in async code
    // AFTER runWithSeed restored the global stream, so — like the other async roll
    // sites here (morale L~1208) — the revive roll must draw from the per-session
    // holder, not the bridge-level `rng`, to stay deterministic for seeded playtests.
    const resurrectEvents = require('../services/combat/minionRuntime').applyMinionResurrect(
      session,
      makeHolderRng(session.combatRng),
    );
    for (const ev of resurrectEvents) {
      await appendEvent(session, {
        ts: new Date().toISOString(),
        session_id: session.session_id,
        action_type: 'minion_resurrect',
        actor_id: ev.owner_id,
        target_id: ev.minion_id,
        turn: session.turn,
        result: 'revived',
        hp_after: ev.hp_after,
        trait_effects: [],
      });
    }

    // OD-024 engine #2 (D6): stamina/fatica accrue-or-decay per unit at round end
    // (flag-gated). The move-tally accumulator was filled during the round; resolve it
    // to +1 (sprint) or decay, and reset. Default OFF = no-op no-touch.
    try {
      const stamina = require('../services/combat/staminaFatigue');
      if (stamina.isFatigueEnabled()) {
        for (const unit of session.units || []) {
          if (!unit) continue;
          stamina.accrueOrDecay(unit);
        }
      }
    } catch {
      /* stamina optional; never block round end */
    }

    return {
      hazardEvents,
      bleedingEvents,
      enneaEvents,
      terrainDecayEvents,
      alphaEvents,
      thoughtEvents,
      resurrectEvents,
    };
  }

  // ────────────────────────────────────────────────────────────────
  // Unified round resolver (player + SIS in same round)
  // Usato dal flow simultaneo /round/begin-planning → /declare-intent* → /commit-round.
  // Handle sia player-controlled che sistema-controlled intents nello stesso resolve pass.
  // ────────────────────────────────────────────────────────────────

  function buildUnifiedRoundResolver(session) {
    const iaActions = [];
    const playerActions = [];
    const kills = [];

    const resolveFn = (state, action, _catalog, _rng) => {
      const next = JSON.parse(JSON.stringify(state));
      const actorId = String(action.actor_id || '');
      const actor = session.units.find((u) => u.id === actorId);
      if (!actor) {
        return { nextState: next, turnLogEntry: { action, skipped: 'no_actor' } };
      }
      const isSis = actor.controlled_by === 'sistema';
      const bucket = isSis ? iaActions : playerActions;
      const faction = isSis ? 'sistema' : 'player';
      const turnLogEntry = {
        turn: Number(next.turn || 1),
        action: { ...action },
        damage_applied: 0,
      };

      if (action.type === 'attack' && action.target_id) {
        const target = session.units.find((u) => u.id === String(action.target_id));
        if (!target || target.hp <= 0) {
          turnLogEntry.skipped = 'target_dead';
          bucket.push({
            actor: faction,
            unit_id: actorId,
            type: 'skip',
            reason: 'target_dead',
            ia_rule: action.source_ia_rule,
          });
        } else {
          const hpBefore = target.hp;
          const targetPosAtk = { ...target.position };
          // M6-#1b: passa action per channel routing
          const res = performAttack(session, actor, target, action);
          actor.ap_remaining = Math.max(
            0,
            (actor.ap_remaining ?? actor.ap) - resolveActionApCost(actor, action),
          );

          let combo = null;
          let synergy = null;
          // V5 shared_hp_pool (Codex #2542 P2): apply a bonus with its FULL value
          // through the pool (a low-HP pooled member doesn't starve it; the partner
          // absorbs the overflow) + each stacked bonus reads pool-restored HP.
          // Pre-credit the full bonus to damage_taken; the pool reconciles it when
          // pooled, else fall back to the solo clamp. Returns the damage that landed.
          // (This path detects kills via target.hp <= 0 below, so no killOccurred.)
          const applyBonusThroughPool = (extra) => {
            if (!(extra > 0)) return 0;
            const hpNow = Number(target.hp || 0);
            if (hpNow <= 0) return 0;
            const soloApplied = Math.min(extra, hpNow);
            if (session.damage_taken) {
              session.damage_taken[target.id] = (session.damage_taken[target.id] || 0) + extra;
            }
            target.hp = hpNow - soloApplied;
            let pr = null;
            try {
              pr = require('../services/combat/symbiontBond').applySharedHpPool(
                session,
                target,
                extra,
                hpNow,
              );
            } catch {
              /* symbiont bond optional */
            }
            if (pr) return extra;
            if (session.damage_taken) {
              session.damage_taken[target.id] = Math.max(
                0,
                (session.damage_taken[target.id] || 0) - extra + soloApplied,
              );
            }
            return soloApplied;
          };
          if (!isSis) {
            const comboInfo = detectFocusFireCombo(session, actor, target);
            if (res.result && res.result.hit && comboInfo.is_combo && res.damageDealt > 0) {
              const applied = applyBonusThroughPool(comboInfo.bonus_damage);
              if (applied > 0) {
                res.damageDealt = res.damageDealt + applied;
              }
              combo = { ...comboInfo, bonus_applied: applied };
            }
            recordAttackForCombo(session, actor, target, comboInfo);
          }
          // Skiv ticket #2: synergy fires for any actor (player + sistema)
          // se la specie ha le parts richieste. Cooldown 1/round per actor.
          const synergyInfo = detectSynergyTrigger(session, actor, target);
          if (res.result && res.result.hit && synergyInfo.triggered) {
            let appliedSyn = 0;
            if (res.damageDealt > 0) {
              appliedSyn = applyBonusThroughPool(synergyInfo.bonus_damage);
              if (appliedSyn > 0) {
                res.damageDealt = res.damageDealt + appliedSyn;
              }
            }
            synergy = { ...synergyInfo, bonus_applied: appliedSyn };
            recordSynergyFire(session, actor, target, synergyInfo, appliedSyn);
          }
          // (shared_hp_pool re-split now runs inline per-bonus above — Codex #2542 P2.)

          const event = buildAttackEvent({
            session,
            actor,
            target,
            result: res.result,
            evaluation: res.evaluation,
            damageDealt: res.damageDealt,
            hpBefore,
            targetPositionAtAttack: targetPosAtk,
            terrainReaction: res.terrain_reaction || null,
            positional: res.positional || null,
          });
          if (isSis) {
            event.actor_id = 'sistema';
            event.actor_species = actor.species;
            event.actor_job = actor.job;
            event.ia_rule = action.source_ia_rule;
            event.ia_controlled_unit = actor.id;
          }
          if (res.parry) event.parry = res.parry;
          session.events.push(event);
          session.action_counter++;

          turnLogEntry.damage_applied = res.damageDealt;
          turnLogEntry.roll = res.result.roll;
          turnLogEntry.hit = res.result.hit;

          if (target.hp <= 0) {
            kills.push({ actor, target, event });
          }

          bucket.push({
            actor: faction,
            unit_id: actorId,
            type: 'attack',
            target: target.id,
            die: res.result.die,
            roll: res.result.roll,
            mos: res.result.mos,
            result: res.result.hit ? 'hit' : 'miss',
            pt: res.result.pt,
            damage_dealt: res.damageDealt,
            trait_effects: res.evaluation.trait_effects,
            actor_position: { ...actor.position },
            target_position: targetPosAtk,
            ia_rule: action.source_ia_rule,
            parry: res.parry,
            combo,
            synergy,
          });
        }
      } else if (action.type === 'move' && action.move_to) {
        const dest = action.move_to;
        const positionFrom = { ...actor.position };
        const blocker = session.units.find(
          (u) =>
            u.id !== actor.id && u.hp > 0 && u.position.x === dest.x && u.position.y === dest.y,
        );
        if (blocker) {
          bucket.push({
            actor: faction,
            unit_id: actorId,
            type: 'skip',
            reason: `blocked by ${blocker.id} at (${dest.x},${dest.y})`,
            position_from: positionFrom,
            position_to: positionFrom,
            ia_rule: action.source_ia_rule,
          });
          turnLogEntry.skipped = 'blocked';
        } else {
          // Server-authoritative move cost: ignore client action.ap_cost, charge
          // real distance (minus move_bonus). Computed before the position write.
          const moveApCost = resolveMoveApCost(actor, positionFrom, dest);
          actor.position = { x: dest.x, y: dest.y };
          actor.ap_remaining = Math.max(0, (actor.ap_remaining ?? actor.ap) - moveApCost);
          const newFacing = facingFromMove(positionFrom, actor.position);
          if (newFacing) actor.facing = newFacing;
          const event = buildMoveEvent({ session, actor, positionFrom });
          if (isSis) {
            event.actor_id = 'sistema';
            event.ia_rule = action.source_ia_rule;
            event.ia_controlled_unit = actor.id;
          }
          session.events.push(event);
          session.action_counter++;
          bucket.push({
            actor: faction,
            unit_id: actorId,
            type: 'move',
            target: action.target_id || null,
            position_from: positionFrom,
            position_to: { ...actor.position },
            ia_rule: action.source_ia_rule,
          });
        }
      } else {
        actor.ap_remaining = Math.max(
          0,
          (actor.ap_remaining ?? actor.ap) - resolveActionApCost(actor, action),
        );
      }

      const uOrch = next.units.find((u) => u.id === actorId);
      if (uOrch) {
        if (uOrch.hp) {
          uOrch.hp.current = Number(actor.hp || 0);
          uOrch.hp.max = Number(actor.max_hp || actor.hp || 0);
        }
        if (uOrch.ap) {
          uOrch.ap.current = Number(
            actor.ap_remaining != null ? actor.ap_remaining : actor.ap || 0,
          );
        }
      }
      if (action.type === 'attack' && action.target_id) {
        const tgtLegacy = session.units.find((u) => u.id === String(action.target_id));
        const tgtOrch = next.units.find((u) => u.id === String(action.target_id));
        if (tgtLegacy && tgtOrch && tgtOrch.hp) {
          tgtOrch.hp.current = Number(tgtLegacy.hp || 0);
        }
        // V5 shared_hp_pool (Codex #2542 P1): a pool hit also mutates the bonded
        // counterpart's HP, but this path syncs only actor+target back to
        // roundState. Sync the counterpart too (harmless no-op if it didn't change)
        // so its roundState HP isn't stale for later intents / UI / end-of-round.
        const partnerId =
          tgtLegacy && ((tgtLegacy._bond && tgtLegacy._bond.partner_id) || tgtLegacy._bonded_by);
        if (partnerId) {
          const cpLegacy = session.units.find((u) => u.id === partnerId);
          const cpOrch = next.units.find((u) => u.id === partnerId);
          if (cpLegacy && cpOrch && cpOrch.hp) {
            cpOrch.hp.current = Number(cpLegacy.hp || 0);
          }
        }
      }
      return { nextState: next, turnLogEntry };
    };

    return { resolveFn, iaActions, playerActions, kills };
  }

  // V5 shared_hp_pool (Codex #2542 P2): when a pool both-KO drops the struck
  // target AND its bonded counterpart to 0 in one hit, the counterpart death is
  // otherwise silent (kill plumbing only tracks `target`). Surface it: emit a
  // kill/assist + pressure delta for the counterpart too. The living-members gate
  // in applySharedHpPool guarantees the counterpart was alive pre-hit, so a 0-HP
  // counterpart here means it died THIS hit. Mirrors the interceptor_killed chain.
  async function emitPoolCounterpartKo(session, actor, target, event) {
    if (!target) return null;
    const partnerId = (target._bond && target._bond.partner_id) || target._bonded_by || null;
    if (!partnerId) return null;
    const cp = (session.units || []).find((u) => u && u.id === partnerId);
    // Codex #2542 P2: emit ONLY when applySharedHpPool actually pool-KO'd this cp
    // this hit (the `_pool_both_ko` flag) — NOT for any bonded unit at 0. A
    // dual_bond secondary (not pooled) or an already-dead symbiont must not emit
    // a spurious extra kill/assist + pressure.
    if (!cp || !cp._pool_both_ko || cp._pool_ko_emitted) return null;
    cp._pool_ko_emitted = true;
    delete cp._pool_both_ko;
    await emitKillAndAssists(session, actor, cp, event);
    if (typeof session.sistema_pressure === 'number') {
      if (actor.controlled_by === 'player' && cp.controlled_by === 'sistema') {
        session.sistema_pressure = applyPressureDelta(
          session.sistema_pressure,
          PRESSURE_DELTAS.pg_kills_sis,
        );
      } else if (actor.controlled_by === 'sistema' && cp.controlled_by === 'player') {
        session.sistema_pressure = applyPressureDelta(
          session.sistema_pressure,
          PRESSURE_DELTAS.sg_pg_down,
        );
      }
    }
    return cp;
  }

  async function postResolveKills(session, kills) {
    for (const { actor, target, event } of kills) {
      await emitKillAndAssists(session, actor, target, event);
      const poolCp = await emitPoolCounterpartKo(session, actor, target, event);
      if (typeof session.sistema_pressure === 'number') {
        if (actor.controlled_by === 'player' && target.controlled_by === 'sistema') {
          session.sistema_pressure = applyPressureDelta(
            session.sistema_pressure,
            PRESSURE_DELTAS.pg_kills_sis,
          );
        } else if (actor.controlled_by === 'sistema' && target.controlled_by === 'player') {
          session.sistema_pressure = applyPressureDelta(
            session.sistema_pressure,
            PRESSURE_DELTAS.sg_pg_down,
          );
        }
      }
      // TKT-ORPHAN-MORALE (wire): morale check on ally death. Logic extracted
      // to services/combat/moraleOnKill (pure, unit-tested). When a unit is
      // killed, its LIVING adjacent same-team allies make a morale check ->
      // panic (or rarely rage). Best-effort; never blocks the kill flow.
      try {
        const { moraleEventsForKill } = require('../services/combat/moraleOnKill');
        // Includes the pool counterpart on a shared_hp_pool both-KO (Codex #2542)
        // so its adjacent allies also make a morale check, not just the target's.
        for (const victim of [target, poolCp].filter(Boolean)) {
          const moraleEvents = moraleEventsForKill(victim, session.units, {
            sessionId: session.session_id,
            turn: session.turn,
            // Codex #2450 P1: keep the post-kill morale d20 inside the session RNG
            // (this path runs after runWithSeed restored the global stream).
            rng: makeHolderRng(session.combatRng),
          });
          for (const mEv of moraleEvents) {
            // eslint-disable-next-line no-await-in-loop
            await appendEvent(session, mEv);
          }
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[morale] failed:', err && err.message ? err.message : err);
      }
    }
  }

  // ────────────────────────────────────────────────────────────────
  // Legacy turn/end wrapper (flag-on)
  // ────────────────────────────────────────────────────────────────

  async function handleTurnEndViaRound(session) {
    // Reset tracker combo a fine round: archivia last_round_combos come
    // previous_round_combos (letto dal debrief) e pulisce la lista attacchi.
    resetRoundAttackTracker(session);
    // Skiv ticket #2: reset synergy cooldown + archivia last_round_synergies.
    resetRoundSynergyTracker(session);
    // PT pool (26-ECONOMY §PT) is per-round: clear every unit's technique points at
    // the round boundary (lazy-require, non-blocking). Earned again next round.
    try {
      const ptTracker = require('../services/combat/ptTracker');
      for (const u of session.units || []) ptTracker.resetRound(u);
    } catch {
      /* ptTracker optional */
    }
    session.roundState = adaptSessionToRoundState(session);

    const { hazardEvents, bleedingEvents } = await applyEndOfRoundSideEffects(session);

    session.roundState = adaptSessionToRoundState(session);
    session.roundState = roundOrchestrator.beginRound(session.roundState).nextState;

    const { intents, decisions } = declareSistemaIntents(session);

    // Telemetry B (TKT-04): persist AI decisions per-round per abilitare
    // distribuzione intent analisi (docs/playtest/2026-04-17-*).
    for (const decision of decisions) {
      const actor = session.units.find((u) => u.id === decision.unit_id);
      await appendEvent(session, {
        action_type: 'ai_intent',
        turn: session.turn,
        actor_id: decision.unit_id,
        target_id: decision.target_id ?? null,
        damage_dealt: 0,
        result: decision.intent || 'unknown',
        position_from: actor?.position ?? null,
        position_to: null,
        rule: decision.rule ?? null,
        intent: decision.intent ?? null,
        reason: decision.reason ?? null,
        tier: actor?.tier ?? null,
        automatic: true,
      });
    }

    let cur = session.roundState;
    for (const { unit_id, action } of intents) {
      cur = roundOrchestrator.declareIntent(cur, unit_id, action).nextState;
    }
    session.roundState = cur;
    session.roundState = roundOrchestrator.commitRound(session.roundState).nextState;

    const iaActions = [];
    const realResolveAction = (state, action, _catalog, _rng) => {
      const next = JSON.parse(JSON.stringify(state));
      const actorId = String(action.actor_id || '');
      const actor = session.units.find((u) => u.id === actorId);
      if (!actor) {
        return { nextState: next, turnLogEntry: { action, skipped: 'no_actor' } };
      }
      let turnLogEntry = {
        turn: Number(next.turn || 1),
        action: { ...action },
        damage_applied: 0,
      };

      if (action.type === 'attack' && action.target_id) {
        const target = session.units.find((u) => u.id === String(action.target_id));
        if (!target || target.hp <= 0) {
          turnLogEntry.skipped = 'target_dead';
          iaActions.push({
            actor: 'sistema',
            unit_id: actorId,
            type: 'skip',
            reason: 'target_dead',
            ia_rule: action.source_ia_rule,
          });
        } else {
          const hpBefore = target.hp;
          const targetPosAtk = { ...target.position };
          // M6-#1b: passa action per channel routing
          const res = performAttack(session, actor, target, action);
          actor.ap_remaining = Math.max(
            0,
            (actor.ap_remaining ?? actor.ap) - resolveActionApCost(actor, action),
          );
          const event = buildAttackEvent({
            session,
            actor,
            target,
            result: res.result,
            evaluation: res.evaluation,
            damageDealt: res.damageDealt,
            hpBefore,
            targetPositionAtAttack: targetPosAtk,
            terrainReaction: res.terrain_reaction || null,
            positional: res.positional || null,
          });
          event.actor_id = 'sistema';
          event.actor_species = actor.species;
          event.actor_job = actor.job;
          event.ia_rule = action.source_ia_rule;
          event.ia_controlled_unit = actor.id;
          if (res.parry) event.parry = res.parry;
          session.events.push(event);
          session.action_counter++;
          turnLogEntry.damage_applied = res.damageDealt;
          turnLogEntry.roll = res.result.roll;
          turnLogEntry.hit = res.result.hit;
          iaActions.push({
            actor: 'sistema',
            unit_id: actorId,
            type: 'attack',
            target: target.id,
            die: res.result.die,
            roll: res.result.roll,
            mos: res.result.mos,
            result: res.result.hit ? 'hit' : 'miss',
            pt: res.result.pt,
            damage_dealt: res.damageDealt,
            trait_effects: res.evaluation.trait_effects,
            actor_position: { ...actor.position },
            target_position: targetPosAtk,
            ia_rule: action.source_ia_rule,
            parry: res.parry,
          });
          // K4 commit-window state — track last committed action kind so
          // declareSistemaIntents flip detector has data next round.
          actor.last_action_type = 'attack';
          actor.last_move_direction = null;
        }
      } else if (action.type === 'move' && action.move_to) {
        const dest = action.move_to;
        const positionFrom = { ...actor.position };
        const blocker = session.units.find(
          (u) =>
            u.id !== actor.id && u.hp > 0 && u.position.x === dest.x && u.position.y === dest.y,
        );
        if (blocker) {
          iaActions.push({
            actor: 'sistema',
            unit_id: actorId,
            type: 'skip',
            reason: `blocked by ${blocker.id} at (${dest.x},${dest.y})`,
            position_from: positionFrom,
            position_to: positionFrom,
            ia_rule: action.source_ia_rule,
          });
          turnLogEntry.skipped = 'blocked';
        } else {
          // Server-authoritative move cost (mirror of the unified path): charge
          // real distance (minus move_bonus), not the intent's ap_cost field.
          const moveApCost = resolveMoveApCost(actor, positionFrom, dest);
          actor.position = { x: dest.x, y: dest.y };
          actor.ap_remaining = Math.max(0, (actor.ap_remaining ?? actor.ap) - moveApCost);
          const newFacing = facingFromMove(positionFrom, actor.position);
          if (newFacing) actor.facing = newFacing;
          const event = buildMoveEvent({ session, actor, positionFrom });
          event.actor_id = 'sistema';
          event.ia_rule = action.source_ia_rule;
          event.ia_controlled_unit = actor.id;
          session.events.push(event);
          session.action_counter++;
          iaActions.push({
            actor: 'sistema',
            unit_id: actorId,
            type: 'move',
            target: action.target_id || null,
            position_from: positionFrom,
            position_to: { ...actor.position },
            ia_rule: action.source_ia_rule,
          });
          // K4 commit-window state — derive committed move kind from
          // source_ia_rule (REGOLA_002 = retreat, COMMIT_WINDOW* = forced
          // last intent, else REGOLA_001 = approach/move). Direction
          // recomputed from actual position delta, not facing (facing may
          // differ in edge cases like dy>=dx ties).
          const rule = action.source_ia_rule || '';
          let kind = 'move';
          if (rule === 'REGOLA_002') kind = 'retreat';
          else if (rule === 'COMMIT_WINDOW' || rule === 'COMMIT_WINDOW_FLIP') {
            kind = actor.commit_window_intent === 'retreat' ? 'retreat' : 'move';
          }
          actor.last_action_type = kind;
          const dxDir = actor.position.x - positionFrom.x;
          const dyDir = actor.position.y - positionFrom.y;
          if (dxDir !== 0 || dyDir !== 0) {
            if (Math.abs(dxDir) >= Math.abs(dyDir)) {
              actor.last_move_direction = dxDir > 0 ? 'E' : 'W';
            } else {
              actor.last_move_direction = dyDir > 0 ? 'S' : 'N';
            }
          }
        }
      } else {
        actor.ap_remaining = Math.max(
          0,
          (actor.ap_remaining ?? actor.ap) - resolveActionApCost(actor, action),
        );
      }

      const uOrch = next.units.find((u) => u.id === actorId);
      if (uOrch) {
        if (uOrch.hp) {
          uOrch.hp.current = Number(actor.hp || 0);
          uOrch.hp.max = Number(actor.max_hp || actor.hp || 0);
        }
        if (uOrch.ap) {
          uOrch.ap.current = Number(
            actor.ap_remaining != null ? actor.ap_remaining : actor.ap || 0,
          );
        }
      }
      if (action.type === 'attack' && action.target_id) {
        const tgtLegacy = session.units.find((u) => u.id === String(action.target_id));
        const tgtOrch = next.units.find((u) => u.id === String(action.target_id));
        if (tgtLegacy && tgtOrch && tgtOrch.hp) {
          tgtOrch.hp.current = Number(tgtLegacy.hp || 0);
        }
        // V5 shared_hp_pool (Codex #2542 P1): a pool hit also mutates the bonded
        // counterpart's HP, but this path syncs only actor+target back to
        // roundState. Sync the counterpart too (harmless no-op if it didn't change)
        // so its roundState HP isn't stale for later intents / UI / end-of-round.
        const partnerId =
          tgtLegacy && ((tgtLegacy._bond && tgtLegacy._bond.partner_id) || tgtLegacy._bonded_by);
        if (partnerId) {
          const cpLegacy = session.units.find((u) => u.id === partnerId);
          const cpOrch = next.units.find((u) => u.id === partnerId);
          if (cpLegacy && cpOrch && cpOrch.hp) {
            cpOrch.hp.current = Number(cpLegacy.hp || 0);
          }
        }
      }
      return { nextState: next, turnLogEntry };
    };

    const result = runWithSeed(session.combatRng, () =>
      resolveRoundPure(session.roundState, null, rng, realResolveAction),
    );
    session.roundState = result.nextState;
    syncStatusesFromRoundState(session);

    await persistEvents(session);
    session.turn += 1;
    sgBeginTurnAll(session);
    applyStressWaveTick(session); // SPEC-I ER6 (flag-gated, default OFF)

    // Round decay (AI War pattern — sistema_pressure.yaml §deltas.round_decay):
    // pressure cala di 1 per round senza eventi di victory/defeat.
    // Escape valve per non lasciare SIS in stato "Apex" dopo picchi isolati.
    //
    // QW1 (M-018): biome hostile (diff_base > 2) aggiunge pressure_mult positivo
    // su round end. Net delta = round_decay (-1) + pressure_mult. Savana 0+(-1)=-1
    // (decay normale); abisso_vulcanico +3+(-1)=+2 (escalation lenta diegetica).
    if (typeof session.sistema_pressure === 'number') {
      session.sistema_pressure = applyPressureDelta(
        session.sistema_pressure,
        PRESSURE_DELTAS.round_decay,
      );
      const biomeTick = Number(session.biome_modifiers?.pressure_mult || 0);
      if (biomeTick !== 0) {
        session.sistema_pressure = applyPressureDelta(session.sistema_pressure, biomeTick);
      }
    }

    // ADR-2026-04-19 + 04-20 wiring (feature flag OFF by default).
    // session.encounter undefined → both modules return no-op.
    // Codex #2450 P1: reinforcement pool pick draws from the session RNG too.
    // SPEC-I ER6: consume the one-shot overrun bonus armed by stressWave.
    const stresswaveBonus = Number(session._stresswaveOverrunBonus) || 0;
    if (stresswaveBonus) session._stresswaveOverrunBonus = 0;
    const reinforcementResult = reinforcementTick(session, session.encounter, {
      rng: makeHolderRng(session.combatRng),
      budgetBonus: stresswaveBonus,
    });
    for (const rec of reinforcementResult.spawned || []) {
      if (rec.skipped) continue;
      await appendEvent(session, {
        action_type: 'reinforcement_spawn',
        turn: session.turn,
        actor_id: rec.spawned_unit_id,
        target_id: null,
        damage_dealt: 0,
        result: 'spawned',
        position_from: null,
        position_to: rec.spawn_tile,
        unit_id: rec.unit_id,
        wave_index: rec.wave_index,
        tier_at_spawn: rec.tier_at_spawn,
        automatic: true,
      });
    }

    // M13 P6 (ADR-2026-04-24) — mission timer tick. Feature flag OFF unless
    // encounter declares mission_timer.enabled. Expired → emits event +
    // side_effects (pressure escalate / spawn wave / outcome defeat handled
    // by caller via timer_state in response).
    const timerResult = missionTimerTick(session, session.encounter);
    if (timerResult.warning) {
      await appendEvent(session, {
        action_type: 'mission_timer_warning',
        turn: session.turn,
        actor_id: null,
        target_id: null,
        damage_dealt: 0,
        result: 'warning',
        remaining_turns: timerResult.remaining_turns,
        turn_limit: timerResult.turn_limit,
        automatic: true,
      });
    }
    if (timerResult.expired && timerResult.action) {
      await appendEvent(session, {
        action_type: 'mission_timer_expired',
        turn: session.turn,
        actor_id: null,
        target_id: null,
        damage_dealt: 0,
        result: timerResult.action,
        turn_limit: timerResult.turn_limit,
        side_effects: timerResult.side_effects || {},
        automatic: true,
      });
      // Apply side_effects: escalate pressure inline (caller-safe).
      if (timerResult.action === 'escalate_pressure') {
        const delta = Number(timerResult.side_effects?.pressure_delta) || 0;
        if (delta && typeof session.sistema_pressure === 'number') {
          session.sistema_pressure = applyPressureDelta(session.sistema_pressure, delta);
        }
      }
    }

    const objectiveResult = evaluateObjective(session, session.encounter);

    // 2026-04-26: soft turn-limit defeat (damage_curves.yaml turn_limit_defeat per class).
    // Indipendente da missionTimer (opt-in encounter feature). Forza outcome=defeat se turn≥limit.
    // 2026-05-20 L-069 iter3: scenarioId passthrough enables scenario_overrides
    // turn_limit_defeat_override (e.g. hardcore_06 null disable per convert defeat→timeout).
    const encClassForLimit =
      session.encounter_class || session.encounter?.encounter_class || 'standard';
    const scenarioIdForLimit = session.encounter?.id || null;
    const turnLimitExceeded = isTurnLimitExceeded(
      session.turn,
      encClassForLimit,
      null,
      scenarioIdForLimit,
    );
    if (turnLimitExceeded && !objectiveResult.failed && !objectiveResult.completed) {
      objectiveResult.failed = true;
      objectiveResult.reason = `turn_limit_defeat:${encClassForLimit}`;
      await appendEvent(session, {
        action_type: 'turn_limit_defeat',
        turn: session.turn,
        actor_id: null,
        target_id: null,
        damage_dealt: 0,
        result: 'defeat',
        encounter_class: encClassForLimit,
        automatic: true,
      });
    }

    // Co-op hand-off (ADR-2026-04-16 §2, addendum 2026-07-05): il round
    // sistema e' completamente risolto e inizia una nuova planning phase
    // player (ordine libero, vincolo = AP budget). Nessuna singola unit
    // attiva durante il planning: null, non l'id stantio ereditato da /start.
    session.active_unit = null;

    return {
      session_id: session.session_id,
      turn: session.turn,
      active_unit: session.active_unit,
      ia_actions: iaActions,
      ia_action: iaActions[0] || null,
      side_effects: bleedingEvents,
      hazard_events: hazardEvents,
      state: publicSessionView(session),
      round_wrapper: true,
      round_phase: session.roundState.round_phase,
      round_decisions: decisions,
      reinforcement_spawned: reinforcementResult.spawned || [],
      objective_state: objectiveResult,
      mission_timer: timerResult,
    };
  }

  // ────────────────────────────────────────────────────────────────
  // Round endpoint routes (mounted by session.js)
  // ────────────────────────────────────────────────────────────────

  // Timer enforcement: auto-commit quando planning_deadline_ms scade.
  // Map di timers attivi per session_id, cancellati a commit/resolve.
  const planningTimers = new Map();

  function startPlanningTimer(session) {
    const deadline = session.roundState && session.roundState.planning_deadline_ms;
    if (!deadline || deadline <= 0) return;
    // Cancel existing timer
    const existing = planningTimers.get(session.session_id);
    if (existing) clearTimeout(existing);
    const timerId = setTimeout(() => {
      planningTimers.delete(session.session_id);
      // Auto-commit: se ancora in planning, committa + resolve
      if (session.roundState && session.roundState.round_phase === PHASE_PLANNING) {
        try {
          session.roundState = roundOrchestrator.commitRound(session.roundState).nextState;
          const result = runWithSeed(session.combatRng, () =>
            resolveRoundPure(session.roundState, null, rng, placeholderResolveAction),
          );
          session.roundState = result.nextState;
          syncStatusesFromRoundState(session);
        } catch (_e) {
          // Timer auto-commit failed silently (state may have changed)
        }
      }
    }, Number(deadline));
    planningTimers.set(session.session_id, timerId);
  }

  function cancelPlanningTimer(sessionId) {
    const existing = planningTimers.get(sessionId);
    if (existing) {
      clearTimeout(existing);
      planningTimers.delete(sessionId);
    }
  }

  function mountRoundEndpoints(router) {
    // Round simultaneo: apre la planning phase, applica side effects fine-round
    // (hazard + bleeding + AP reset + status decay), fa dichiarare intents SIS
    // in parallelo ai player. Client poi chiama /declare-intent per ogni player
    // unit, infine /commit-round (con auto_resolve=true per risolvere in un colpo).
    router.post('/round/begin-planning', async (req, res, next) => {
      try {
        const sessionId = req.body && req.body.session_id;
        const { error, session } = resolveSession(sessionId);
        if (error) return res.status(error.status).json(error.body);

        resetRoundAttackTracker(session);
        resetRoundSynergyTracker(session);
        // PT pool (26-ECONOMY §PT) resets per-round at the planning boundary.
        try {
          const ptTracker = require('../services/combat/ptTracker');
          for (const u of session.units || []) ptTracker.resetRound(u);
        } catch {
          /* ptTracker optional */
        }

        const { hazardEvents, bleedingEvents } = await applyEndOfRoundSideEffects(session);

        session.roundState = adaptSessionToRoundState(session);
        session.roundState = roundOrchestrator.beginRound(session.roundState).nextState;

        const {
          intents: sisIntents,
          decisions: sisDecisions,
          reveals: sisReveals = [],
        } = declareSistemaIntents(session);
        let cur = session.roundState;
        for (const { unit_id, action } of sisIntents) {
          cur = roundOrchestrator.declareIntent(cur, unit_id, action).nextState;
        }
        session.roundState = cur;

        startPlanningTimer(session);

        await persistEvents(session);

        // M8 Plan-Reveal P0 (ADR-2026-04-18): UI threat preview payload.
        // SIS intents normalizzati in {actor_id, intent_type, intent_icon,
        // target_id, threat_tiles} consumati dal frontend render.js +
        // main.js tooltip. Empty array se nessun SIS intent.
        const threatPreview = buildThreatPreview(session);

        // Telepatic-link reveal (2026-04-25 follow-up): per-actor enemy
        // intent foresight when status.telepatic_link active. Additive
        // field: empty array if no actor has the status. Wrapped try/catch
        // so reveal pipe failure never blocks round planning.
        let revealedIntents = [];
        if (typeof computeTelepathicReveal === 'function') {
          try {
            revealedIntents = computeTelepathicReveal(session);
          } catch (_err) {
            revealedIntents = [];
          }
        }

        res.json({
          session_id: session.session_id,
          turn: session.turn,
          round_phase: session.roundState.round_phase,
          pending_intents: session.roundState.pending_intents,
          sistema_decisions: sisDecisions,
          sistema_intents_count: sisIntents.length,
          // SPEC-Q M-4: hidden evolving-tactic reveals (QF3-A). Empty unless the
          // SISTEMA_HIDDEN_ABILITY_REVEAL flag is on AND a Sistema unit hit its
          // threshold. Consumed by the ALIENA/Godot surface (SPEC-H/SPEC-K).
          sistema_reveals: sisReveals,
          threat_preview: threatPreview,
          revealed_intents: revealedIntents,
          hazard_events: hazardEvents,
          side_effects: bleedingEvents,
          state: publicSessionView(session),
        });
      } catch (err) {
        next(err);
      }
    });

    router.post('/declare-intent', (req, res, next) => {
      try {
        const { session_id: sessionId, actor_id: actorId, action } = req.body || {};
        const { error, session } = resolveSession(sessionId);
        if (error) return res.status(error.status).json(error.body);
        if (!actorId || typeof actorId !== 'string') {
          return res.status(400).json({ error: 'actor_id richiesto (string)' });
        }
        if (!action || typeof action !== 'object') {
          return res
            .status(400)
            .json({ error: "action richiesto (object con campi 'type', 'actor_id', ...)" });
        }

        // Actor-ownership authz (security fix): only a player-controlled, live unit
        // may be driven from a client. SIS intents are authored server-side by
        // declareSistemaIntents and never flow through this route, so a non-player
        // actor here is illegitimate -- reject before any state mutation. This also
        // guarantees validatePlayerIntent (range/AP/bounds) always runs for the
        // actors the route accepts, closing the OUT_OF_GRID teleport bypass.
        const ownershipError = requirePlayerActor(session, actorId, { requireAlive: true });
        if (ownershipError) {
          return res.status(ownershipError.status).json(ownershipError.body);
        }
        const validationError = validatePlayerIntent(session, actorId, action);
        if (validationError) {
          return res.status(400).json({
            error: validationError.message,
            code: validationError.code,
          });
        }

        const state = ensureRoundState(session);
        let current = state;
        if (current.round_phase !== PHASE_PLANNING) {
          current = roundOrchestrator.beginRound(current).nextState;
          // Start planning timer if deadline configured
          session.roundState = current;
          startPlanningTimer(session);
        }
        const { nextState } = roundOrchestrator.declareIntent(current, actorId, action);
        session.roundState = nextState;
        res.json({
          session_id: session.session_id,
          round_phase: nextState.round_phase,
          pending_intents: nextState.pending_intents,
        });
      } catch (err) {
        if (err && /round_phase|unit_id/.test(String(err.message || ''))) {
          return res.status(400).json({ error: err.message });
        }
        next(err);
      }
    });

    // SPEC-C reaction wiring: expose the existing orchestrator declareReaction
    // (engine was LIVE, route was DEAD). Mirrors /declare-intent; the engine
    // validates phase + trigger event + payload type + predicates + cooldown.
    router.post('/declare-reaction', (req, res, next) => {
      try {
        const {
          session_id: sessionId,
          actor_id: actorId,
          reaction_trigger: reactionTrigger,
          reaction_payload: reactionPayload,
        } = req.body || {};
        const { error, session } = resolveSession(sessionId);
        if (error) return res.status(error.status).json(error.body);
        if (!actorId || typeof actorId !== 'string') {
          return res.status(400).json({ error: 'actor_id richiesto (string)' });
        }
        if (!reactionTrigger || typeof reactionTrigger !== 'object') {
          return res
            .status(400)
            .json({ error: "reaction_trigger richiesto (object con campo 'event')" });
        }
        if (!reactionPayload || typeof reactionPayload !== 'object') {
          return res
            .status(400)
            .json({ error: "reaction_payload richiesto (object con campo 'type')" });
        }

        // Actor-ownership authz (security fix): reactions may only be declared for
        // player-controlled, live units. SIS reactions are engine-driven.
        const ownershipError = requirePlayerActor(session, actorId, { requireAlive: true });
        if (ownershipError) {
          return res.status(ownershipError.status).json(ownershipError.body);
        }

        const state = ensureRoundState(session);
        let current = state;
        if (current.round_phase !== PHASE_PLANNING) {
          current = roundOrchestrator.beginRound(current).nextState;
          session.roundState = current;
          startPlanningTimer(session);
        }
        const { nextState } = roundOrchestrator.declareReaction(
          current,
          actorId,
          reactionPayload,
          reactionTrigger,
        );
        session.roundState = nextState;
        res.json({
          session_id: session.session_id,
          round_phase: nextState.round_phase,
          pending_intents: nextState.pending_intents,
        });
      } catch (err) {
        if (
          err &&
          /round_phase|unit_id|reaction|predicate|cooldown_rounds/.test(String(err.message || ''))
        ) {
          return res.status(400).json({ error: err.message });
        }
        next(err);
      }
    });

    router.post('/clear-intent/:actorId', (req, res, next) => {
      try {
        const sessionId = (req.body && req.body.session_id) || req.query.session_id;
        const actorId = req.params.actorId;
        const { error, session } = resolveSession(sessionId);
        if (error) return res.status(error.status).json(error.body);
        if (!session.roundState) {
          return res
            .status(400)
            .json({ error: 'roundState non inizializzato (chiama prima /declare-intent)' });
        }
        // Actor-ownership authz (security fix): a client may only clear intents for
        // its own player units, never server-authored SIS intents. Alive not
        // required -- a stale intent of a just-KO'd player unit stays clearable.
        const ownershipError = requirePlayerActor(session, actorId, { requireAlive: false });
        if (ownershipError) {
          return res.status(ownershipError.status).json(ownershipError.body);
        }
        const { nextState } = roundOrchestrator.clearIntent(session.roundState, actorId);
        session.roundState = nextState;
        res.json({
          session_id: session.session_id,
          round_phase: nextState.round_phase,
          pending_intents: nextState.pending_intents,
        });
      } catch (err) {
        next(err);
      }
    });

    // Bundle B.2 — Tactical Breach Wizards Undo libero (2026-04-27).
    // POP last main intent for actor (LIFO). Reactions preserved.
    // Restricted to PHASE_PLANNING: undo dopo commit-round → 409.
    // Empty stack → 200 no-op (idempotent UX).
    router.post('/undo-action', (req, res, next) => {
      try {
        const body = req.body || {};
        const sessionId = body.session_id;
        const actorId = body.actor_id;
        const { error, session } = resolveSession(sessionId);
        if (error) return res.status(error.status).json(error.body);
        if (!actorId || typeof actorId !== 'string') {
          return res.status(400).json({ error: 'actor_id richiesto (string)' });
        }
        if (!session.roundState) {
          return res
            .status(400)
            .json({ error: 'roundState non inizializzato (chiama prima /declare-intent)' });
        }
        // Actor-ownership authz (security fix): undo only a client's own player
        // intents, never server-authored SIS intents.
        const ownershipError = requirePlayerActor(session, actorId, { requireAlive: false });
        if (ownershipError) {
          return res.status(ownershipError.status).json(ownershipError.body);
        }
        const phase = session.roundState.round_phase;
        if (phase !== PHASE_PLANNING) {
          return res.status(409).json({
            error: `undo-action consentita solo in planning phase (corrente: '${phase}')`,
            code: 'UNDO_PHASE_INVALID',
            round_phase: phase,
          });
        }
        const pending = Array.isArray(session.roundState.pending_intents)
          ? session.roundState.pending_intents
          : [];
        // Trova ultimo main intent (non reaction) per actorId. LIFO pop.
        let popIdx = -1;
        for (let i = pending.length - 1; i >= 0; i -= 1) {
          const it = pending[i];
          if (!it) continue;
          if (String(it.unit_id || '') !== String(actorId)) continue;
          if (it.reaction_trigger) continue; // skip reactions
          popIdx = i;
          break;
        }
        if (popIdx === -1) {
          // No-op: stack vuoto per actor o solo reactions.
          return res.json({
            session_id: session.session_id,
            round_phase: phase,
            pending_intents: pending,
            popped: null,
          });
        }
        const popped = pending[popIdx];
        const nextPending = pending.slice(0, popIdx).concat(pending.slice(popIdx + 1));
        session.roundState = {
          ...session.roundState,
          pending_intents: nextPending,
        };
        res.json({
          session_id: session.session_id,
          round_phase: session.roundState.round_phase,
          pending_intents: nextPending,
          popped,
        });
      } catch (err) {
        next(err);
      }
    });

    router.post('/commit-round', async (req, res, next) => {
      try {
        const body = req.body || {};
        const sessionId = body.session_id;
        const autoResolve = body.auto_resolve === true;
        const { error, session } = resolveSession(sessionId);
        if (error) return res.status(error.status).json(error.body);
        if (!session.roundState) {
          return res
            .status(400)
            .json({ error: 'roundState non inizializzato (chiama prima /declare-intent)' });
        }
        cancelPlanningTimer(session.session_id);
        const { nextState: committed } = roundOrchestrator.commitRound(session.roundState);
        session.roundState = committed;

        if (!autoResolve) {
          return res.json({
            session_id: session.session_id,
            round_phase: committed.round_phase,
            pending_intents: committed.pending_intents,
          });
        }

        // auto_resolve=true: risolve round in simultanea usando unified resolver
        const { resolveFn, iaActions, playerActions, kills } = buildUnifiedRoundResolver(session);
        const result = runWithSeed(session.combatRng, () =>
          resolveRoundPure(session.roundState, null, rng, resolveFn),
        );
        session.roundState = result.nextState;
        syncStatusesFromRoundState(session);

        await postResolveKills(session, kills);
        await persistEvents(session);
        session.turn += 1;
        sgBeginTurnAll(session);
        applyStressWaveTick(session); // SPEC-I ER6 (flag-gated, default OFF)

        if (typeof session.sistema_pressure === 'number') {
          session.sistema_pressure = applyPressureDelta(
            session.sistema_pressure,
            PRESSURE_DELTAS.round_decay,
          );
          // QW1 (M-018) — biome pressure tick (commit-round path).
          const biomeTick = Number(session.biome_modifiers?.pressure_mult || 0);
          if (biomeTick !== 0) {
            session.sistema_pressure = applyPressureDelta(session.sistema_pressure, biomeTick);
          }
        }

        // ADR-2026-04-19 + 04-20 wiring (commit-round path).
        // Graceful no-op if session.encounter undefined.
        // Codex #2450 P1: reinforcement pool pick draws from the session RNG too.
        // SPEC-I ER6: consume the one-shot overrun bonus armed by stressWave.
        const stresswaveBonus = Number(session._stresswaveOverrunBonus) || 0;
        if (stresswaveBonus) session._stresswaveOverrunBonus = 0;
        const reinforcementResult = reinforcementTick(session, session.encounter, {
          rng: makeHolderRng(session.combatRng),
          budgetBonus: stresswaveBonus,
        });
        for (const rec of reinforcementResult.spawned || []) {
          if (rec.skipped) continue;
          await appendEvent(session, {
            action_type: 'reinforcement_spawn',
            turn: session.turn,
            actor_id: rec.spawned_unit_id,
            target_id: null,
            damage_dealt: 0,
            result: 'spawned',
            position_from: null,
            position_to: rec.spawn_tile,
            unit_id: rec.unit_id,
            wave_index: rec.wave_index,
            tier_at_spawn: rec.tier_at_spawn,
            automatic: true,
          });
        }

        // M13 P6 — mission timer tick (commit-round path).
        const timerResult = missionTimerTick(session, session.encounter);
        if (timerResult.warning) {
          await appendEvent(session, {
            action_type: 'mission_timer_warning',
            turn: session.turn,
            actor_id: null,
            target_id: null,
            damage_dealt: 0,
            result: 'warning',
            remaining_turns: timerResult.remaining_turns,
            turn_limit: timerResult.turn_limit,
            automatic: true,
          });
        }
        if (timerResult.expired && timerResult.action) {
          await appendEvent(session, {
            action_type: 'mission_timer_expired',
            turn: session.turn,
            actor_id: null,
            target_id: null,
            damage_dealt: 0,
            result: timerResult.action,
            turn_limit: timerResult.turn_limit,
            side_effects: timerResult.side_effects || {},
            automatic: true,
          });
          if (timerResult.action === 'escalate_pressure') {
            const delta = Number(timerResult.side_effects?.pressure_delta) || 0;
            if (delta && typeof session.sistema_pressure === 'number') {
              session.sistema_pressure = applyPressureDelta(session.sistema_pressure, delta);
            }
          }
        }

        const objectiveResult = evaluateObjective(session, session.encounter);

        return res.json({
          session_id: session.session_id,
          turn: session.turn,
          round_phase: session.roundState.round_phase,
          resolution_queue: result.resolutionQueue,
          turn_log_entries: result.turnLogEntries,
          reactions_triggered: result.reactionsTriggered,
          skipped: result.skipped,
          player_actions: playerActions,
          ia_actions: iaActions,
          reinforcement_spawned: reinforcementResult.spawned || [],
          objective_state: objectiveResult,
          mission_timer: timerResult,
          state: publicSessionView(session),
        });
      } catch (err) {
        if (err && /round_phase/.test(String(err.message || ''))) {
          return res.status(400).json({ error: err.message });
        }
        next(err);
      }
    });

    router.post('/resolve-round', (req, res, next) => {
      try {
        const sessionId = req.body && req.body.session_id;
        const { error, session } = resolveSession(sessionId);
        if (error) return res.status(error.status).json(error.body);
        if (!session.roundState) {
          return res
            .status(400)
            .json({ error: 'roundState non inizializzato (chiama prima /declare-intent)' });
        }
        const result = runWithSeed(session.combatRng, () =>
          resolveRoundPure(session.roundState, null, rng, placeholderResolveAction),
        );
        session.roundState = result.nextState;
        syncStatusesFromRoundState(session);
        res.json({
          session_id: session.session_id,
          round_phase: result.nextState.round_phase,
          turn_log_entries: result.turnLogEntries,
          resolution_queue: result.resolutionQueue,
          reactions_triggered: result.reactionsTriggered,
          skipped: result.skipped,
          units: result.nextState.units,
        });
      } catch (err) {
        if (err && /round_phase/.test(String(err.message || ''))) {
          return res.status(400).json({ error: err.message });
        }
        next(err);
      }
    });

    // SPEC-C G5: expose previewRound as the v2 server preview (engine was LIVE,
    // route DEAD). Non-canonical estimate via a NEUTRAL rng (expected outcome,
    // never the round's real combatRng per G5) and NON-MUTATING -- the engine
    // clones internally and the route never persists session.roundState.
    router.post('/preview-round', (req, res, next) => {
      try {
        const sessionId = req.body && req.body.session_id;
        const { error, session } = resolveSession(sessionId);
        if (error) return res.status(error.status).json(error.body);
        if (!session.roundState) {
          return res
            .status(400)
            .json({ error: 'roundState non inizializzato (chiama prima /declare-intent)' });
        }
        const result = roundOrchestrator.previewRound(
          session.roundState,
          null,
          () => 0.5,
          placeholderResolveAction,
        );
        res.json({
          session_id: session.session_id,
          preview: true,
          round_phase: result.nextState.round_phase,
          turn_log_entries: result.turnLogEntries,
          resolution_queue: result.resolutionQueue,
          reactions_triggered: result.reactionsTriggered,
          skipped: result.skipped,
          units: result.nextState.units,
        });
      } catch (err) {
        if (err && /round_phase/.test(String(err.message || ''))) {
          return res.status(400).json({ error: err.message });
        }
        next(err);
      }
    });
  }

  return {
    adaptSessionToRoundState,
    ensureRoundState,
    placeholderResolveAction,
    handleLegacyAttackViaRound,
    handleTurnEndViaRound,
    mountRoundEndpoints,
    // TKT-08: expose timer cleanup for /end teardown.
    // Auto-commit timers on planning-phase sessions otherwise outlive
    // session.delete and accumulate in Node timer queue across batch runs.
    cancelPlanningTimer,
  };
}

module.exports = { createRoundBridge };
