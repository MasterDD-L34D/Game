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
    const apCost = Number(action.ap_cost || 0);
    const apAvail = Number(actor.ap_remaining != null ? actor.ap_remaining : actor.ap || 0);
    const pendingForActor = ((session.roundState && session.roundState.pending_intents) || [])
      .filter((i) => String(i.unit_id || '') === String(actorId))
      .reduce((sum, i) => sum + Number((i.action && i.action.ap_cost) || 0), 0);
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
    for (const roundUnit of session.roundState.units) {
      const sessionUnit = (session.units || []).find((u) => String(u.id) === String(roundUnit.id));
      if (!sessionUnit) continue;
      if (!sessionUnit.status) sessionUnit.status = {};
      if (!sessionUnit.status_intensity) sessionUnit.status_intensity = {};

      // 1. Rimuovi status dal dict legacy che non sono più nello roundState
      //    (decaied to 0 o rimossi). `statuses` array è source-of-truth post-orchestrator.
      const liveIds = new Set(
        (roundUnit.statuses || []).filter((s) => Number(s.remaining_turns) > 0).map((s) => s.id),
      );
      for (const id of Object.keys(sessionUnit.status)) {
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
  }

  function placeholderResolveAction(state, action, _catalog, _rng) {
    const next = JSON.parse(JSON.stringify(state));
    const actorId = String(action.actor_id || '');
    const targetId = action.target_id ? String(action.target_id) : null;
    const actor = next.units.find((u) => u.id === actorId);
    if (actor && actor.ap) {
      actor.ap.current = Math.max(0, Number(actor.ap.current || 0) - Number(action.ap_cost || 0));
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
        capturedResults.beastBondReactions = Array.isArray(res.beast_bond_reactions)
          ? res.beast_bond_reactions
          : [];
        // Pilastro 5: focus_fire combo. Se altri player hanno gia' colpito lo
        // stesso target in questo round, +1 dmg al secondo/terzo attacco.
        // Fix flake (iter6): combo metadata esposta anche su hit con damage=0
        // (parry completo, cap damage). Bonus_applied=0 ma is_combo=true.
        const comboInfo = detectFocusFireCombo(session, actor, target);
        if (res.result && res.result.hit && comboInfo.is_combo) {
          let applied = 0;
          if (res.damageDealt > 0) {
            const extra = comboInfo.bonus_damage;
            const hpNow = Number(target.hp || 0);
            applied = Math.min(extra, hpNow);
            if (applied > 0) {
              target.hp = hpNow - applied;
              capturedResults.damageDealt = res.damageDealt + applied;
              if (session.damage_taken) {
                session.damage_taken[target.id] = (session.damage_taken[target.id] || 0) + applied;
              }
              if (target.hp <= 0 && !capturedResults.killOccurred) {
                capturedResults.killOccurred = true;
              }
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
            const extra = synergyInfo.bonus_damage;
            const hpNow = Number(target.hp || 0);
            appliedSyn = Math.min(extra, hpNow);
            if (appliedSyn > 0) {
              target.hp = hpNow - appliedSyn;
              capturedResults.damageDealt =
                Number(capturedResults.damageDealt || res.damageDealt) + appliedSyn;
              if (session.damage_taken) {
                session.damage_taken[target.id] =
                  (session.damage_taken[target.id] || 0) + appliedSyn;
              }
              if (target.hp <= 0 && !capturedResults.killOccurred) {
                capturedResults.killOccurred = true;
              }
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
      (actor.ap_remaining ?? actor.ap) - Number(roundAction.ap_cost || 1),
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
    const result = resolveRoundPure(cur, null, rng, realResolveAction);
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

    return {
      hazardEvents,
      bleedingEvents,
      enneaEvents,
      terrainDecayEvents,
      alphaEvents,
      thoughtEvents,
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
            (actor.ap_remaining ?? actor.ap) - Number(action.ap_cost || 1),
          );

          let combo = null;
          let synergy = null;
          if (!isSis) {
            const comboInfo = detectFocusFireCombo(session, actor, target);
            if (res.result && res.result.hit && comboInfo.is_combo && res.damageDealt > 0) {
              const extra = comboInfo.bonus_damage;
              const hpNow = Number(target.hp || 0);
              const applied = Math.min(extra, hpNow);
              if (applied > 0) {
                target.hp = hpNow - applied;
                res.damageDealt = res.damageDealt + applied;
                if (session.damage_taken) {
                  session.damage_taken[target.id] =
                    (session.damage_taken[target.id] || 0) + applied;
                }
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
              const extra = synergyInfo.bonus_damage;
              const hpNow = Number(target.hp || 0);
              appliedSyn = Math.min(extra, hpNow);
              if (appliedSyn > 0) {
                target.hp = hpNow - appliedSyn;
                res.damageDealt = res.damageDealt + appliedSyn;
                if (session.damage_taken) {
                  session.damage_taken[target.id] =
                    (session.damage_taken[target.id] || 0) + appliedSyn;
                }
              }
            }
            synergy = { ...synergyInfo, bonus_applied: appliedSyn };
            recordSynergyFire(session, actor, target, synergyInfo, appliedSyn);
          }

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
          actor.position = { x: dest.x, y: dest.y };
          actor.ap_remaining = Math.max(
            0,
            (actor.ap_remaining ?? actor.ap) - Number(action.ap_cost || 1),
          );
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
          (actor.ap_remaining ?? actor.ap) - Number(action.ap_cost || 1),
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
      }
      return { nextState: next, turnLogEntry };
    };

    return { resolveFn, iaActions, playerActions, kills };
  }

  async function postResolveKills(session, kills) {
    for (const { actor, target, event } of kills) {
      await emitKillAndAssists(session, actor, target, event);
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

  // ────────────────────────────────────────────────────────────────
  // Legacy turn/end wrapper (flag-on)
  // ────────────────────────────────────────────────────────────────

  async function handleTurnEndViaRound(session) {
    // Reset tracker combo a fine round: archivia last_round_combos come
    // previous_round_combos (letto dal debrief) e pulisce la lista attacchi.
    resetRoundAttackTracker(session);
    // Skiv ticket #2: reset synergy cooldown + archivia last_round_synergies.
    resetRoundSynergyTracker(session);
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
            (actor.ap_remaining ?? actor.ap) - Number(action.ap_cost || 1),
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
          actor.position = { x: dest.x, y: dest.y };
          actor.ap_remaining = Math.max(
            0,
            (actor.ap_remaining ?? actor.ap) - Number(action.ap_cost || 1),
          );
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
          (actor.ap_remaining ?? actor.ap) - Number(action.ap_cost || 1),
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
      }
      return { nextState: next, turnLogEntry };
    };

    const result = resolveRoundPure(session.roundState, null, rng, realResolveAction);
    session.roundState = result.nextState;
    syncStatusesFromRoundState(session);

    await persistEvents(session);
    session.turn += 1;
    sgBeginTurnAll(session);

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
    const reinforcementResult = reinforcementTick(session, session.encounter);
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
    const encClassForLimit =
      session.encounter_class || session.encounter?.encounter_class || 'standard';
    const turnLimitExceeded = isTurnLimitExceeded(session.turn, encClassForLimit);
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
          const result = resolveRoundPure(session.roundState, null, rng, placeholderResolveAction);
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

        const { hazardEvents, bleedingEvents } = await applyEndOfRoundSideEffects(session);

        session.roundState = adaptSessionToRoundState(session);
        session.roundState = roundOrchestrator.beginRound(session.roundState).nextState;

        const { intents: sisIntents, decisions: sisDecisions } = declareSistemaIntents(session);
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

        // Validate player intent against session state (range/AP/target/etc).
        // SIS intents bypassano (generati da declareSistemaIntents già validato).
        const actor = (session.units || []).find((u) => u.id === actorId);
        if (actor && actor.controlled_by === 'player') {
          const validationError = validatePlayerIntent(session, actorId, action);
          if (validationError) {
            return res.status(400).json({
              error: validationError.message,
              code: validationError.code,
            });
          }
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
        const result = resolveRoundPure(session.roundState, null, rng, resolveFn);
        session.roundState = result.nextState;
        syncStatusesFromRoundState(session);

        await postResolveKills(session, kills);
        await persistEvents(session);
        session.turn += 1;
        sgBeginTurnAll(session);

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
        const reinforcementResult = reinforcementTick(session, session.encounter);
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
        const result = resolveRoundPure(session.roundState, null, rng, placeholderResolveAction);
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
