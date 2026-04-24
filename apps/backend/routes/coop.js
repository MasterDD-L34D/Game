// M17 — Co-op REST endpoints (character creation MVP).
// ADR coop-mvp-spec.md §2.7 user stories.
//
// Endpoints:
//   POST /api/coop/run/start              (host — starts a run in a room)
//   POST /api/coop/character/create        (player — submit char spec)
//   GET  /api/coop/state?code=ABCD         (any — inspect phase + characters)
//   POST /api/coop/world/confirm           (host — pick scenario, move to combat)
//   POST /api/coop/debrief/choice          (player — submit debrief choice)

'use strict';

const express = require('express');

function createCoopRouter({ lobby, coopStore } = {}) {
  if (!lobby) throw new Error('createCoopRouter: lobby required');
  if (!coopStore) throw new Error('createCoopRouter: coopStore required');
  const router = express.Router();

  function authHost(roomCode, hostToken) {
    if (!roomCode || !hostToken) return null;
    const room = lobby.getRoom(roomCode);
    if (!room) return null;
    const host = room.getPlayer?.(room.hostId);
    if (!host || host.token !== hostToken) return null;
    return room;
  }

  function authPlayer(roomCode, playerId, playerToken) {
    if (!roomCode || !playerId || !playerToken) return null;
    const room = lobby.getRoom(roomCode);
    if (!room) return null;
    const p = room.authenticate?.(playerId, playerToken);
    return p ? { room, player: p } : null;
  }

  function allPlayerIds(room) {
    return Array.from(room.players.values())
      .filter((p) => p.id !== room.hostId && p.role !== 'host')
      .map((p) => p.id);
  }

  function broadcastCoopState(room, orch) {
    if (!room || typeof room.broadcast !== 'function') return;
    room.broadcast({
      type: 'phase_change',
      payload: {
        phase: orch.phase,
        round: orch.run?.currentIndex ?? 0,
        scenario: orch.run?.scenarioStack?.[orch.run.currentIndex] || null,
      },
    });
    room.broadcast({
      type: 'character_ready_list',
      payload: orch.characterReadyList(allPlayerIds(room)),
    });
    // M18 — tally world votes if in setup phase.
    if (orch.phase === 'world_setup') {
      room.broadcast({
        type: 'world_tally',
        payload: orch.worldTally(allPlayerIds(room)),
      });
    }
  }

  router.post('/coop/run/start', (req, res) => {
    const { code, host_token: hostToken, scenario_stack: scenarioStack } = req.body || {};
    const room = authHost(code, hostToken);
    if (!room) return res.status(403).json({ error: 'host_auth_failed' });
    try {
      const orch = coopStore.getOrCreate(code);
      const run = orch.startRun({ scenarioStack });
      broadcastCoopState(room, orch);
      return res.status(201).json({
        run_id: run.id,
        phase: orch.phase,
        scenario_stack: run.scenarioStack,
      });
    } catch (err) {
      return res.status(400).json({ error: err.message || 'run_start_failed' });
    }
  });

  router.post('/coop/character/create', (req, res) => {
    const {
      code,
      player_id: playerId,
      player_token: playerToken,
      name,
      form_id,
      species_id,
      job_id,
    } = req.body || {};
    const auth = authPlayer(code, playerId, playerToken);
    if (!auth) return res.status(403).json({ error: 'player_auth_failed' });
    const { room } = auth;
    const orch = coopStore.get(code);
    if (!orch) return res.status(409).json({ error: 'run_not_started' });
    try {
      const spec = orch.submitCharacter(
        playerId,
        { name, form_id, species_id, job_id },
        { allPlayerIds: allPlayerIds(room) },
      );
      broadcastCoopState(room, orch);
      return res.status(201).json({
        character: spec,
        phase: orch.phase,
        ready_count: orch.characters.size,
      });
    } catch (err) {
      return res.status(400).json({ error: err.message || 'character_create_failed' });
    }
  });

  router.get('/coop/state', (req, res) => {
    const code = req.query.code;
    const orch = code ? coopStore.get(code) : null;
    if (!orch) return res.status(404).json({ error: 'coop_state_not_found' });
    const room = lobby.getRoom(code);
    return res.json({
      snapshot: orch.snapshot(),
      character_ready_list: room ? orch.characterReadyList(allPlayerIds(room)) : [],
    });
  });

  router.post('/coop/world/vote', (req, res) => {
    const {
      code,
      player_id: playerId,
      player_token: playerToken,
      scenario_id: scenarioId,
      accept = true,
    } = req.body || {};
    const auth = authPlayer(code, playerId, playerToken);
    if (!auth) return res.status(403).json({ error: 'player_auth_failed' });
    const { room } = auth;
    const orch = coopStore.get(code);
    if (!orch) return res.status(409).json({ error: 'run_not_started' });
    try {
      const tally = orch.voteWorld(playerId, {
        scenarioId,
        accept,
        allPlayerIds: allPlayerIds(room),
      });
      broadcastCoopState(room, orch);
      return res.json({ phase: orch.phase, tally });
    } catch (err) {
      return res.status(400).json({ error: err.message || 'world_vote_failed' });
    }
  });

  router.post('/coop/world/confirm', (req, res) => {
    const { code, host_token: hostToken, scenario_id: scenarioId } = req.body || {};
    const room = authHost(code, hostToken);
    if (!room) return res.status(403).json({ error: 'host_auth_failed' });
    const orch = coopStore.get(code);
    if (!orch) return res.status(409).json({ error: 'run_not_started' });
    try {
      const result = orch.confirmWorld({ scenarioId });
      broadcastCoopState(room, orch);
      // Return session-start payload so host can forward to /api/session/start.
      const startPayload = orch.buildSessionStartPayload();
      return res.json({
        scenario_id: result.scenario_id,
        phase: orch.phase,
        session_start_payload: startPayload,
      });
    } catch (err) {
      return res.status(400).json({ error: err.message || 'world_confirm_failed' });
    }
  });

  router.post('/coop/debrief/choice', (req, res) => {
    const { code, player_id: playerId, player_token: playerToken, choice } = req.body || {};
    const auth = authPlayer(code, playerId, playerToken);
    if (!auth) return res.status(403).json({ error: 'player_auth_failed' });
    const { room } = auth;
    const orch = coopStore.get(code);
    if (!orch) return res.status(409).json({ error: 'run_not_started' });
    try {
      const result = orch.submitDebriefChoice(playerId, choice, {
        allPlayerIds: allPlayerIds(room),
      });
      broadcastCoopState(room, orch);
      return res.json({
        phase: orch.phase,
        result: result || { pending: true },
      });
    } catch (err) {
      return res.status(400).json({ error: err.message || 'debrief_failed' });
    }
  });

  router.post('/coop/combat/end', (req, res) => {
    // Host notifies combat ended (victory/defeat). MVP: host controls.
    const {
      code,
      host_token: hostToken,
      outcome = 'victory',
      xp_earned: xpEarned = 0,
      survivors = [],
    } = req.body || {};
    const room = authHost(code, hostToken);
    if (!room) return res.status(403).json({ error: 'host_auth_failed' });
    const orch = coopStore.get(code);
    if (!orch) return res.status(409).json({ error: 'run_not_started' });
    try {
      const result = orch.endCombat({ outcome, xpEarned, survivors });
      broadcastCoopState(room, orch);
      return res.json({ phase: orch.phase, result });
    } catch (err) {
      return res.status(400).json({ error: err.message || 'combat_end_failed' });
    }
  });

  return router;
}

module.exports = { createCoopRouter };
