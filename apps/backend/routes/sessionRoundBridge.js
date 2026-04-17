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
} = require('./sessionHelpers');
const {
  detectFocusFireCombo,
  recordAttackForCombo,
  resetRoundAttackTracker,
} = require('../services/squadCoordination');

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
  } = deps;

  // ────────────────────────────────────────────────────────────────
  // Guards + adapters
  // ────────────────────────────────────────────────────────────────

  // M17: roundModelGuard removed. Round endpoints always active.
  // USE_ROUND_MODEL flag no longer checked (default true since M16).

  function adaptSessionToRoundState(session) {
    const units = (session.units || []).map((u) => {
      const statusObj = u.status || {};
      const statuses = [];
      for (const [id, turns] of Object.entries(statusObj)) {
        if (Number(turns) > 0) {
          statuses.push({ id, intensity: 1, remaining_turns: Number(turns) });
        }
      }
      return {
        id: String(u.id),
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

  async function handleLegacyAttackViaRound({ session, actor, target, requestedCapPt }) {
    const roundAction = {
      id: `legacy-attack-${actor.id}-${session.action_counter}`,
      type: 'attack',
      actor_id: actor.id,
      target_id: target.id,
      ability_id: null,
      ap_cost: 1,
      channel: null,
      damage_dice: { count: 1, sides: 6, modifier: 2 },
    };

    const capturedResults = {
      result: null,
      evaluation: null,
      damageDealt: 0,
      killOccurred: false,
      parry: null,
    };

    const realResolveAction = (state, action, _catalog, _rng) => {
      const next = JSON.parse(JSON.stringify(state));
      if (action.type === 'attack' && action.target_id) {
        const res = performAttack(session, actor, target);
        capturedResults.result = res.result;
        capturedResults.evaluation = res.evaluation;
        capturedResults.damageDealt = res.damageDealt;
        capturedResults.killOccurred = res.killOccurred;
        capturedResults.parry = res.parry;
        // Pilastro 5: focus_fire combo. Se altri player hanno gia' colpito lo
        // stesso target in questo round, +1 dmg al secondo/terzo attacco.
        const comboInfo = detectFocusFireCombo(session, actor, target);
        if (res.result && res.result.hit && comboInfo.is_combo && res.damageDealt > 0) {
          const extra = comboInfo.bonus_damage;
          const hpNow = Number(target.hp || 0);
          const applied = Math.min(extra, hpNow);
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
          capturedResults.combo = { ...comboInfo, bonus_applied: applied };
        }
        recordAttackForCombo(session, actor, target, comboInfo);
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

    actor.ap_remaining = Math.max(0, (actor.ap_remaining ?? actor.ap) - 1);
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
      });
      if (capturedResults.parry) event.parry = capturedResults.parry;
      if (requestedCapPt > 0) {
        event.cost = { cap_pt: requestedCapPt };
        consumeCapPt(session, requestedCapPt);
      }
      await appendEvent(session, event);
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
      combo: capturedResults.combo || null,
      state: publicSessionView(session),
      round_wrapper: true,
      round_phase: result.nextState.round_phase,
    };
  }

  // ────────────────────────────────────────────────────────────────
  // Legacy turn/end wrapper (flag-on)
  // ────────────────────────────────────────────────────────────────

  async function handleTurnEndViaRound(session) {
    // Reset tracker combo a fine round: archivia last_round_combos come
    // previous_round_combos (letto dal debrief) e pulisce la lista attacchi.
    resetRoundAttackTracker(session);
    session.roundState = adaptSessionToRoundState(session);

    // Hazard tiles: applica danno a unita' che terminano il turno su tile pericolosi.
    // Es. enc_tutorial_03 fumarole. Skip se nessun hazard configurato.
    const hazardEvents = [];
    if (Array.isArray(session.hazard_tiles) && session.hazard_tiles.length > 0) {
      for (const unit of session.units) {
        if (!unit || Number(unit.hp || 0) <= 0) continue;
        const hazard = session.hazard_tiles.find(
          (h) =>
            Number(h.x) === Number(unit.position?.x) && Number(h.y) === Number(unit.position?.y),
        );
        if (!hazard) continue;
        const dmg = Number(hazard.damage) || 1;
        const hpBefore = unit.hp;
        unit.hp = Math.max(0, unit.hp - dmg);
        session.damage_taken[unit.id] = (session.damage_taken[unit.id] || 0) + dmg;
        await appendEvent(session, {
          ts: new Date().toISOString(),
          session_id: session.session_id,
          action_type: 'hazard',
          actor_id: hazard.type || 'hazard',
          target_id: unit.id,
          turn: session.turn,
          damage_dealt: dmg,
          result: 'hit',
          hp_before: hpBefore,
          hp_after: unit.hp,
          hazard_type: hazard.type || 'unknown',
          position: { x: hazard.x, y: hazard.y },
        });
        hazardEvents.push({
          unit_id: unit.id,
          hazard_type: hazard.type,
          damage: dmg,
          hp_after: unit.hp,
          killed: unit.hp === 0,
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

    for (const unit of session.units) {
      if (!unit) continue;
      const fractureActive = Number(unit.status?.fracture) > 0;
      unit.ap_remaining = fractureActive ? Math.min(1, unit.ap) : unit.ap;
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

    session.roundState = adaptSessionToRoundState(session);
    session.roundState = roundOrchestrator.beginRound(session.roundState).nextState;

    const { intents, decisions } = declareSistemaIntents(session);

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
          const res = performAttack(session, actor, target);
          actor.ap_remaining = Math.max(0, (actor.ap_remaining ?? actor.ap) - 1);
          const event = buildAttackEvent({
            session,
            actor,
            target,
            result: res.result,
            evaluation: res.evaluation,
            damageDealt: res.damageDealt,
            hpBefore,
            targetPositionAtAttack: targetPosAtk,
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
          actor.ap_remaining = Math.max(0, (actor.ap_remaining ?? actor.ap) - 1);
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
        }
      } else {
        actor.ap_remaining = Math.max(0, (actor.ap_remaining ?? actor.ap) - 1);
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

    await persistEvents(session);
    session.turn += 1;

    // Round decay (AI War pattern — sistema_pressure.yaml §deltas.round_decay):
    // pressure cala di 1 per round senza eventi di victory/defeat.
    // Escape valve per non lasciare SIS in stato "Apex" dopo picchi isolati.
    if (typeof session.sistema_pressure === 'number') {
      session.sistema_pressure = applyPressureDelta(
        session.sistema_pressure,
        PRESSURE_DELTAS.round_decay,
      );
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

    router.post('/commit-round', (req, res, next) => {
      try {
        const sessionId = req.body && req.body.session_id;
        const { error, session } = resolveSession(sessionId);
        if (error) return res.status(error.status).json(error.body);
        if (!session.roundState) {
          return res
            .status(400)
            .json({ error: 'roundState non inizializzato (chiama prima /declare-intent)' });
        }
        cancelPlanningTimer(session.session_id);
        const { nextState } = roundOrchestrator.commitRound(session.roundState);
        session.roundState = nextState;
        res.json({
          session_id: session.session_id,
          round_phase: nextState.round_phase,
          pending_intents: nextState.pending_intents,
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
  };
}

module.exports = { createRoundBridge };
