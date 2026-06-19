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
const { listBiomeRoleDemands } = require('../services/coop/ermesExporter');
const { listAlienaSummaries } = require('../services/coop/alienaGenerator');
const { buildPhaseChangePayload } = require('../services/coop/phaseChangePayload');
// #2709 -- REST lifecycle quorum role-aware, stesso self-selecting rule dei
// drain WS (#2707/#2708): l'host conta SOLO se e' il submitter corrente o
// possiede gia' un PG (host-plays); la TV-mirror (mai input) resta esclusa.
const { lifecycleQuorumPids } = require('../services/network/wsSession');
// OD-058 D3 (#2531) -- server-side vcSnapshot replay dal ledger della sessione
// combat linkata (coopStore.linkSession): il debrief coop non e' piu'
// trust-the-host.
const {
  isLedgerReplayEnabled,
  replayDebriefFromLedger,
} = require('../services/coop/vcLedgerReplay');
const { isDeepStrictEqual } = require('node:util');

function createCoopRouter({
  lobby,
  coopStore,
  metaStoreFactory = null,
  prisma = null,
  // OD-058 D3 -- read-only accessor (session router getSessionById) for the
  // linked combat session; absent -> legacy host-payload behavior.
  getCombatSession = null,
} = {}) {
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

  // #2709 -- role-aware REST quorum (mirror WS lifecycleQuorumPids #2707/#2708):
  // host counts only as current submitter or once it owns a PG (host-plays);
  // a TV-mirror host (never inputs) stays out, so players-only rooms advance.
  function quorumPids(room, orch, submitterId = null) {
    if (!room) return [];
    return lifecycleQuorumPids(room, orch, submitterId);
  }

  // B-NEW-1 fix 2026-05-08 — connected (WS-attached) player ids, used by the
  // vote quorums so a disconnected peer doesn't block phase advance. #2709:
  // same role-aware quorum as above, restricted to `connected` peers.
  function connectedQuorumPids(room, orch) {
    if (!room) return [];
    const quorum = new Set(lifecycleQuorumPids(room, orch, null));
    return Array.from(room.players.values())
      .filter((p) => quorum.has(p.id) && p.connected)
      .map((p) => p.id);
  }

  function broadcastCoopState(room, orch) {
    if (!room || typeof room.broadcast !== 'function') return;
    // G1 #2746 — route phase_change through the VERSIONED publisher so the
    // Godot phone accepts the frame (raw broadcast had no `version` key and
    // was dropped as unknown_type -> blank screen). publishEvent version-stamps
    // + ledger-records while broadcasting the same rich payload. Fallback to a
    // raw broadcast only if the room lacks publishEvent (defensive; real Room
    // always has it).
    const phasePayload = buildPhaseChangePayload(orch);
    if (typeof room.publishEvent === 'function') {
      room.publishEvent('phase_change', phasePayload);
    } else {
      room.broadcast({ type: 'phase_change', payload: phasePayload });
    }
    room.broadcast({
      type: 'character_ready_list',
      payload: orch.characterReadyList(quorumPids(room, orch, null)),
    });
    // M18 — tally world votes if in setup phase.
    if (orch.phase === 'world_setup') {
      room.broadcast({
        type: 'world_tally',
        payload: orch.worldTally(quorumPids(room, orch, null), connectedQuorumPids(room, orch)),
      });
    }
    // SPEC-K K-05 — re-surface the Nido next-mission readiness tally while in the hub
    // (keeps phones in sync on any coop-state rebroadcast). Mirror of world_tally.
    if (orch.phase === 'nido') {
      room.broadcast({
        type: 'mission_tally',
        payload: orch.missionReadyTally(
          quorumPids(room, orch, null),
          connectedQuorumPids(room, orch),
        ),
      });
    }
    // GAP-C fase-3 — re-surface an open meta-network route choice (phase-agnostic:
    // gated on open candidates, not a PHASES value). Keeps phones in sync on any
    // coop-state rebroadcast while a route vote is in progress.
    if (Array.isArray(orch.routeCandidates) && orch.routeCandidates.length > 0) {
      room.broadcast({ type: 'route_choice', payload: { candidates: orch.routeCandidates } });
      room.broadcast({
        type: 'route_tally',
        payload: orch.routeTally(quorumPids(room, orch, null), connectedQuorumPids(room, orch)),
      });
    }
    // M19 — debrief ready list if in debrief.
    if (orch.phase === 'debrief') {
      room.broadcast({
        type: 'debrief_ready_list',
        payload: {
          outcome: orch.run?.outcome || 'victory',
          ready_list: orch.debriefReadyList(quorumPids(room, orch, null)),
        },
      });
      room.broadcast({
        type: 'mating_tally',
        payload: orch.matingTally(quorumPids(room, orch, null), connectedQuorumPids(room, orch)),
      });
      // 2026-05-15 Bundle C follow-up — surface per-actor 4-layer psicologico
      // payload to phone clients when host attached it via /coop/combat/end
      // (PR #2269 wire). Each phone composer extracts its local player slice
      // and renders PhoneDebriefView labels (Godot v2 #269+#270).
      // Schema: orch.run.debrief.per_actor[uid] = { sentience_tier,
      // conviction_axis, ennea_archetype }.
      if (orch.run?.debrief && typeof orch.run.debrief === 'object') {
        room.broadcast({
          type: 'debrief_payload',
          payload: orch.run.debrief,
        });
      }
    }
  }

  // 2026-05-20 — readonly diagnostic per onboarding hint (A6 pattern
  // `listStarterBiomas` replicato; gap-fill Explore quick-win discovery).
  // Frontend onboarding HUD può preload role expectation per biome scelto.
  router.get('/coop/role-demands', (_req, res) => {
    const items = listBiomeRoleDemands();
    res.json({ count: items.length, items });
  });

  // 2026-05-20 — readonly diagnostic per onboarding world mood preload
  // (A6 pattern `listBiomeRoleDemands` replicato; gap-fill Explore quick-win
  // discovery). Frontend onboarding HUD può preload aliena_summary_it per
  // biome scelto. Doctrine: surface diegetic summary, mai label "ALIENA".
  router.get('/coop/aliena-summaries', (_req, res) => {
    const items = listAlienaSummaries();
    res.json({ count: items.length, items });
  });

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
        { allPlayerIds: quorumPids(room, orch, playerId) },
      );
      // B-NEW-5 fix 2026-05-08 — skip rebroadcast on idempotent resubmit.
      if (!spec._deduplicated) {
        broadcastCoopState(room, orch);
      }
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
      character_ready_list: room ? orch.characterReadyList(quorumPids(room, orch, null)) : [],
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
        allPlayerIds: quorumPids(room, orch, playerId),
        connectedPlayerIds: connectedQuorumPids(room, orch),
      });
      broadcastCoopState(room, orch);
      return res.json({ phase: orch.phase, tally });
    } catch (err) {
      return res.status(400).json({ error: err.message || 'world_vote_failed' });
    }
  });

  // SPEC-K K-05 — Nido next-mission readiness quorum (device-authority). Each
  // connected player POSTs their ready state; when ALL connected players are ready
  // the run auto-advances out of the Nido (no host action), mirroring the mating
  // connected-quorum auto-resolve. The host fallback is /coop/mission/start below.
  router.post('/coop/mission/ready', (req, res) => {
    const { code, player_id: playerId, player_token: playerToken, ready = true } = req.body || {};
    const auth = authPlayer(code, playerId, playerToken);
    if (!auth) return res.status(403).json({ error: 'player_auth_failed' });
    const { room } = auth;
    const orch = coopStore.get(code);
    if (!orch) return res.status(409).json({ error: 'run_not_started' });
    try {
      const tally = orch.markMissionReady(playerId, {
        ready,
        allPlayerIds: quorumPids(room, orch, playerId),
        connectedPlayerIds: connectedQuorumPids(room, orch),
      });
      let advanced = null;
      if (tally.all_connected_ready) advanced = orch.advanceScenarioOrEnd();
      broadcastCoopState(room, orch);
      return res.json({ phase: orch.phase, tally, advanced });
    } catch (err) {
      return res.status(400).json({ error: err.message || 'mission_ready_failed' });
    }
  });

  // SPEC-K K-05 — host anti-deadlock fallback: the host force-starts the next mission
  // even if not every device marked ready (e.g. an AFK/offline peer).
  router.post('/coop/mission/start', (req, res) => {
    const { code, player_id: playerId, player_token: playerToken } = req.body || {};
    const auth = authPlayer(code, playerId, playerToken);
    if (!auth) return res.status(403).json({ error: 'player_auth_failed' });
    const { room } = auth;
    const orch = coopStore.get(code);
    if (!orch) return res.status(409).json({ error: 'run_not_started' });
    try {
      const result = orch.startMissionFromNido(playerId, { hostId: room.hostId });
      broadcastCoopState(room, orch);
      return res.json({ phase: orch.phase, advance: result.advance });
    } catch (err) {
      return res.status(400).json({ error: err.message || 'mission_start_failed' });
    }
  });

  router.post('/coop/mating/vote', (req, res) => {
    const {
      code,
      player_id: playerId,
      player_token: playerToken,
      pair_id: pairId,
    } = req.body || {};
    const auth = authPlayer(code, playerId, playerToken);
    if (!auth) return res.status(403).json({ error: 'player_auth_failed' });
    const { room } = auth;
    const orch = coopStore.get(code);
    if (!orch) return res.status(409).json({ error: 'run_not_started' });
    try {
      const allPids = quorumPids(room, orch, playerId);
      const connectedPids = connectedQuorumPids(room, orch);
      const tally = orch.voteMating(playerId, pairId, {
        allPlayerIds: allPids,
        connectedPlayerIds: connectedPids,
      });
      broadcastCoopState(room, orch);
      // S22-B Task 8 -- WS parity: roll offspring + broadcast mating_resolved
      // when this vote meets connected-only quorum. Best-effort, additive.
      const winner = orch.resolveMatingWinner(allPids, connectedPids);
      if (winner && metaStoreFactory) {
        const store = metaStoreFactory(winner.campaign_id);
        if (store) {
          // eslint-disable-next-line global-require
          const { resolveCoopMatingOffspring } = require('../services/mating/coopMatingResolver');
          resolveCoopMatingOffspring({
            store,
            prisma,
            campaignId: winner.campaign_id,
            parentAId: winner.parent_a_id,
            parentBId: winner.parent_b_id,
            biomeId: winner.biome_id,
          })
            .then((resolveRes) => {
              room.broadcast({
                type: 'mating_resolved',
                payload: {
                  pair_id: winner.pair_id,
                  offspring: resolveRes.offspring || null,
                  ok: resolveRes.success,
                },
              });
            })
            .catch(() => {});
        }
      }
      return res.json({ phase: orch.phase, tally });
    } catch (err) {
      return res.status(400).json({ error: err.message || 'mating_vote_failed' });
    }
  });

  router.post('/coop/world/confirm', (req, res) => {
    const {
      code,
      host_token: hostToken,
      scenario_id: scenarioId,
      // W5-bb cross-repo (Godot v2 mirror): rich payload inputs.
      biome_id: biomeId,
      form_axes: formAxes,
      run_seed: runSeed,
      trainer_canonical: trainerCanonical,
    } = req.body || {};
    const room = authHost(code, hostToken);
    if (!room) return res.status(403).json({ error: 'host_auth_failed' });
    const orch = coopStore.get(code);
    if (!orch) return res.status(409).json({ error: 'run_not_started' });
    try {
      const result = orch.confirmWorld({
        scenarioId,
        biomeId,
        formAxes,
        runSeed,
        trainerCanonical,
      });
      broadcastCoopState(room, orch);
      // Return session-start payload so host can forward to /api/session/start.
      const startPayload = orch.buildSessionStartPayload();
      const response = {
        scenario_id: result.scenario_id,
        phase: orch.phase,
        session_start_payload: startPayload,
      };
      // W5-bb: surface enriched world (world/ermes/aliena/custode) when
      // biomeId provided. Godot v2 WorldSetupState consumes these fields.
      if (result.enriched_world) {
        Object.assign(response, result.enriched_world);
      }
      return res.json(response);
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
        allPlayerIds: quorumPids(room, orch, playerId),
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

  // F-2 2026-04-25 — host-only escape hatch for stuck character_creation/debrief.
  router.post('/coop/run/force-advance', (req, res) => {
    const { code, host_token: hostToken, reason } = req.body || {};
    const room = authHost(code, hostToken);
    if (!room) return res.status(403).json({ error: 'host_auth_failed' });
    const orch = coopStore.get(code);
    if (!orch) return res.status(409).json({ error: 'run_not_started' });
    try {
      const prevPhase = orch.phase;
      const result = orch.forceAdvance({ reason });
      broadcastCoopState(room, orch);
      return res.json({
        phase: orch.phase,
        previous_phase: prevPhase,
        result,
      });
    } catch (err) {
      return res.status(400).json({ error: err.message || 'force_advance_failed' });
    }
  });

  router.post('/coop/combat/end', (req, res) => {
    // Host notifies combat ended (victory/defeat). MVP: host controls.
    // 2026-05-15 Bundle C follow-up — optional `debrief_payload` carries
    // 4-layer profilo psicologico (per_actor sentience+conviction+ennea) for
    // phone DebriefView parity reveal. Computed by host-side combat resolver
    // via vcScoring.buildVcSnapshot before POST. Back-compat: omit → null.
    const {
      code,
      host_token: hostToken,
      outcome = 'victory',
      xp_earned: xpEarned = 0,
      survivors = [],
      debrief_payload: debriefPayload = null,
      sistema_observations: sistemaObservations = null,
      // Task 5 debrief-recruit producer: optional array of NPC candidates for
      // post-combat recruit (threaded onto run.debrief -> debrief_payload
      // broadcast to phones alongside per_actor). Back-compat: absent -> null.
      recruit_candidates: recruitCandidates = null,
    } = req.body || {};
    const room = authHost(code, hostToken);
    if (!room) return res.status(403).json({ error: 'host_auth_failed' });
    const orch = coopStore.get(code);
    if (!orch) return res.status(409).json({ error: 'run_not_started' });
    try {
      // OD-058 D3 (#2531) -- replay-from-event-log: quando una sessione combat
      // server-side e' linkata (coopStore.linkSession) e il suo ledger ha
      // eventi attribuiti ad attori, il server ricostruisce vcSnapshot +
      // debrief_payload dal PROPRIO ledger (stesso path vcScoring del flusso
      // single: buildVcSnapshot -> vcSnapshotToDebriefPayload) e il payload
      // host viene ignorato (divergenza loggata + surfaced). Fallback host:
      // nessuna sessione linkata / ledger inerte (solo lifecycle, combat
      // client-side Godot) / kill switch COOP_VC_LEDGER_REPLAY=0. Outcome,
      // survivors e xp restano host-reported (Opzione 2: la resolution del
      // combat resta client-side; qui si sposta SOLO la derivazione VC).
      let effectiveDebrief = debriefPayload;
      let debriefSource = debriefPayload ? 'host' : null;
      let hostPayloadDivergent = null;
      if (isLedgerReplayEnabled() && typeof getCombatSession === 'function' && orch.sessionId) {
        try {
          const combatSession = getCombatSession(orch.sessionId);
          if (combatSession) {
            // SPEC-M FP->VC parity con /end (routes/session.js): il branco
            // Form Pulse della run viene idratato nel replay (no-op se vuoto).
            const formPulses =
              typeof coopStore.getFormPulses === 'function'
                ? coopStore.getFormPulses(orch.run?.id)
                : null;
            const replay = replayDebriefFromLedger(combatSession, { formPulses });
            if (replay && replay.actor_events_count > 0) {
              if (debriefPayload) {
                hostPayloadDivergent = !isDeepStrictEqual(debriefPayload, replay.debrief_payload);
                if (hostPayloadDivergent) {
                  console.warn(
                    `[coop] debrief_payload host divergente dal ledger replay (code=${code}, session=${orch.sessionId}) -- server-authoritative`,
                  );
                }
              }
              effectiveDebrief = replay.debrief_payload;
              debriefSource = 'ledger_replay';
            }
          }
        } catch (replayErr) {
          // Best-effort: il replay non blocca MAI la chiusura del combat.
          console.warn(`[coop] ledger replay fallito (code=${code}):`, replayErr.message);
        }
      }
      const result = orch.endCombat({
        outcome,
        xpEarned,
        survivors,
        debriefPayload: effectiveDebrief,
        sistemaObservations,
        recruitCandidates,
      });
      broadcastCoopState(room, orch);
      return res.json({
        phase: orch.phase,
        result,
        // OD-058 D3 -- additive: provenance del debrief ('ledger_replay' |
        // 'host' | null) + divergenza host vs replay (null = non applicabile).
        debrief_source: debriefSource,
        host_payload_divergent: hostPayloadDivergent,
      });
    } catch (err) {
      return res.status(400).json({ error: err.message || 'combat_end_failed' });
    }
  });

  // GAP-C fase-3 — host opens a meta-network route choice. The host (TV) has
  // just called POST /api/campaign/advance and received choice_required +
  // route_choice.candidates (>1 eligible node). This stores them on the
  // orchestrator + broadcasts `route_choice` (the render model) and the initial
  // `route_tally` to phones so they can vote per node_id (route_vote WS intent
  // -> route_tally). The winning node (tally.leading_node_id; tie-break =
  // highest candidate.weight, master-dd Q2) feeds the host's POST
  // /api/campaign/choose { id, node_id }. Flag-gated upstream: when
  // META_NETWORK_ROUTING is OFF, /advance never returns choice_required, so the
  // host never calls this (band-safe, zero campaign-flow change).
  router.post('/coop/route/open', (req, res) => {
    const { code, host_token: hostToken, candidates } = req.body || {};
    const room = authHost(code, hostToken);
    if (!room) return res.status(403).json({ error: 'host_auth_failed' });
    const orch = coopStore.get(code);
    if (!orch) return res.status(409).json({ error: 'run_not_started' });
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ error: 'candidates richiesto (array non vuoto)' });
    }
    try {
      const stored = orch.openRouteChoice(candidates);
      if (stored.length === 0) {
        return res.status(400).json({ error: 'candidates privi di node_id' });
      }
      room.broadcast({ type: 'route_choice', payload: { candidates: stored } });
      room.broadcast({
        type: 'route_tally',
        payload: orch.routeTally(quorumPids(room, orch, null), connectedQuorumPids(room, orch)),
      });
      return res.json({ ok: true, candidates: stored });
    } catch (err) {
      return res.status(400).json({ error: err.message || 'route_open_failed' });
    }
  });

  // SPEC-J sez.5 -- host opens a lethal-consent round. The host (TV), having a
  // lethal-flagged mission, supplies the at-risk player ids (those whose creature
  // participates, SPEC-K 6.4). The server opens the round on the orchestrator +
  // broadcasts the anonymous waiting snapshot (`lethal_consent_open`, F5: counts
  // only). Players then confirm via the `lethal_consent_confirm` WS intent. The
  // round resolves to `granted` only when EVERY at-risk player confirms; anti-
  // deadlock (timeout / delivery-fail) resolves to soft (NON parte lethal).
  router.post('/coop/lethal/open', (req, res) => {
    const {
      code,
      host_token: hostToken,
      at_risk_player_ids: atRisk,
      timeout_ms: timeoutMs,
    } = req.body || {};
    const room = authHost(code, hostToken);
    if (!room) return res.status(403).json({ error: 'host_auth_failed' });
    const orch = coopStore.get(code);
    if (!orch) return res.status(409).json({ error: 'run_not_started' });
    // Codex/coop-validator: empty (or all-non-string) at-risk would trivially
    // grant -> lethal would proceed with NOBODY having confirmed. A lethal
    // mission MUST name its at-risk players; reject otherwise (mirror route/open).
    const ids = Array.isArray(atRisk) ? atRisk.filter((x) => typeof x === 'string' && x) : [];
    if (ids.length === 0) {
      return res
        .status(400)
        .json({ error: 'at_risk_player_ids richiesto (array di id non vuoto)' });
    }
    try {
      // SPEC-J sez.5 trigger-(a): arm the automatic timeout. If no at-risk
      // player responds before timeout_ms the orchestrator resolves the round
      // to soft on its own and invokes onTimeout, which broadcasts the
      // resolution so devices dismiss the waiting UI -- no host action needed
      // ("mai loop bloccato"). The manual confirm (WS) / cancel (REST) paths
      // broadcast themselves, so onTimeout fires ONLY from the timer.
      const snap = orch.openLethalConsent(ids, {
        timeoutMs,
        onTimeout: (consent, outcome) => {
          room.broadcast({ type: 'lethal_consent_resolved', payload: { outcome, consent } });
        },
      });
      room.broadcast({ type: 'lethal_consent_open', payload: snap });
      return res.json({ ok: true, consent: snap });
    } catch (err) {
      return res.status(400).json({ error: err.message || 'lethal_open_failed' });
    }
  });

  // SPEC-J sez.5 -- host aborts a stuck lethal-consent round (deterministic
  // anti-deadlock escape: the always-on TV arbiter can always resolve a round
  // where a player never responds). Resolves the pending round to soft (NON
  // parte lethal) + broadcasts the resolution. Complements the AUTOMATIC timeout
  // timer (sez.5 trigger a, armed at /coop/lethal/open): this is the immediate
  // host-initiated override; the timer is the unattended fallback. Either way,
  // "mai loop bloccato".
  router.post('/coop/lethal/cancel', (req, res) => {
    const { code, host_token: hostToken } = req.body || {};
    const room = authHost(code, hostToken);
    if (!room) return res.status(403).json({ error: 'host_auth_failed' });
    const orch = coopStore.get(code);
    if (!orch) return res.status(409).json({ error: 'run_not_started' });
    const snap = orch.evalLethalConsentTimeout({ deliveryFailed: true });
    if (!snap) return res.status(409).json({ error: 'no_consent_round_open' });
    room.broadcast({
      type: 'lethal_consent_resolved',
      payload: { outcome: orch.lethalConsentOutcome(), consent: snap },
    });
    return res.json({ ok: true, outcome: orch.lethalConsentOutcome(), consent: snap });
  });

  return router;
}

module.exports = { createCoopRouter };
