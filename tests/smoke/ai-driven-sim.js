// FASE 1 T1.1 + T1.2 — AI-driven WS+REST end-to-end smoke harness.
//
// Drives the full state machine on a live backend (lobby → onboarding skip
// → character_creation → world_setup vote+confirm → combat round loop →
// debrief lineage_choice → ended) without any human input. Player units
// are AI-piloted via a minimal closest-enemy + attack policy so the
// combat phase advances even on a single-player smoke. Sistema (enemy)
// units are auto-driven server-side by `services/ai/sistemaTurnRunner`,
// so this script only needs to satisfy the player-turn slot.
//
// Telemetry (T1.2): every WS event + REST round-trip is appended to
// /tmp/ai-sim-runs/<timestamp>.jsonl. Aggregate report printed at end.
//
// Usage:
//   TUNNEL=https://<host>.trycloudflare.com node tests/smoke/ai-driven-sim.js
//
// Optional env:
//   AI_SIM_PLAYERS=2          (extra player count, default 1 = host+1)
//   AI_SIM_MAX_ROUNDS=15
//   AI_SIM_LOG_DIR=/tmp/ai-sim-runs
//   AI_SIM_SCENARIO=enc_tutorial_01
//   AI_SIM_SISTEMA_PROFILE=aggressive   (FASE 2: ai_profiles.yaml key —
//                                        aggressive | balanced | cautious;
//                                        injected on every enemy unit
//                                        via actor.ai_profile field so
//                                        declareSistemaIntents.js picks
//                                        the matching utility brain
//                                        config)
//   AI_SIM_SEED=12345                   (FASE 2: deterministic seed
//                                        forwarded as run_seed to
//                                        coopOrchestrator.confirmWorld
//                                        + scenario_id stamp; reproduces
//                                        identical sim across batch
//                                        replays for SPRT bookkeeping)
//   AI_SIM_RUN_LABEL=aggro_v_balanced   (FASE 2: tag for batch runner
//                                        aggregate filtering)
//
// Cross-ref:
//   docs/playtest/2026-05-09-browser-smoke-iter5-chrome-mcp.md
//   apps/backend/services/ai/policy.js (Sistema policy reused server-side)
//
'use strict';

const WebSocket = require('ws');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const TUNNEL = process.env.TUNNEL;
if (!TUNNEL) {
  console.error('FATAL: set TUNNEL=https://<host>.trycloudflare.com');
  process.exit(2);
}
// Cloudflare tunnel collapses HTTP (3334) + WS (3341) onto a single
// hostname; CI direct-localhost mode keeps them split. Allow explicit
// override via AI_SIM_WS_URL (full ws:// URL ending in /ws). Default:
// derive from TUNNEL by swapping scheme.
const WS_URL =
  process.env.AI_SIM_WS_URL || TUNNEL.replace('https:', 'wss:').replace('http:', 'ws:') + '/ws';
if (!/^wss?:\/\//.test(WS_URL)) {
  console.error(
    `FATAL: WS_URL must start with ws:// or wss:// (got "${WS_URL}"). ` +
      `Verify AI_SIM_WS_URL override or TUNNEL scheme.`,
  );
  process.exit(2);
}
const EXTRA_PLAYERS = Math.max(0, Number(process.env.AI_SIM_PLAYERS || 1));
const MAX_ROUNDS = Math.max(1, Number(process.env.AI_SIM_MAX_ROUNDS || 15));
const SCENARIO_ID = String(process.env.AI_SIM_SCENARIO || 'enc_tutorial_01');
const LOG_DIR = process.env.AI_SIM_LOG_DIR || '/tmp/ai-sim-runs';
const SISTEMA_PROFILE = String(process.env.AI_SIM_SISTEMA_PROFILE || 'balanced');
const RUN_SEED = process.env.AI_SIM_SEED ? Number(process.env.AI_SIM_SEED) : null;
const RUN_LABEL = String(process.env.AI_SIM_RUN_LABEL || '');
// 2026-05-10 — opt-in YAML scenario loader.
// Default false → synthetic 2-enemy fallback (cron baseline preserved).
// True → load docs/planning/encounters/<scenario_id>.yaml + spawn dynamic
// enemies from wave_id=1 (port of tools/py/batch_calibrate_non_elim.py
// encounter_to_units). Sblocca real diversity sweep × tutorial 02 +
// hardcore_reinf_01 + capture/escort/survival/savana/caverna/frattura.
const LOAD_YAML = process.env.AI_SIM_LOAD_YAML === '1';
const ENCOUNTER_DIR = path.resolve(__dirname, '../../docs/planning/encounters');

fs.mkdirSync(LOG_DIR, { recursive: true });
const RUN_TS = new Date().toISOString().replace(/[:.]/g, '-');
const LOG_PATH = path.join(LOG_DIR, `run-${RUN_TS}.jsonl`);
const logStream = fs.createWriteStream(LOG_PATH, { flags: 'a' });
function log(kind, payload) {
  const entry = { ts: Date.now(), kind, ...payload };
  logStream.write(JSON.stringify(entry) + '\n');
}

async function postJson(path, body) {
  const t0 = Date.now();
  const r = await fetch(TUNNEL + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  log('rest', { method: 'POST', path, status: r.status, dur_ms: Date.now() - t0 });
  return { status: r.status, body: data };
}
async function getJson(path) {
  const t0 = Date.now();
  const r = await fetch(TUNNEL + path);
  const data = await r.json().catch(() => ({}));
  log('rest', { method: 'GET', path, status: r.status, dur_ms: Date.now() - t0 });
  return { status: r.status, body: data };
}

function attachWs(label, code, playerId, token) {
  const url = `${WS_URL}?code=${code}&player_id=${playerId}&token=${encodeURIComponent(token)}`;
  const ws = new WebSocket(url);
  ws.on('message', (raw) => {
    try {
      const m = JSON.parse(raw.toString());
      log('ws', { label, type: m.type, payload: m.payload, version: m.version });
    } catch {
      // ignore non-JSON
    }
  });
  return new Promise((res, rej) => {
    ws.once('open', () => {
      log('ws_open', { label });
      res({
        ws,
        send: (p) => ws.send(JSON.stringify({ type: 'intent', payload: p })),
        sendPhase: (p) => ws.send(JSON.stringify({ type: 'phase', payload: { phase: p } })),
      });
    });
    ws.once('error', (err) => {
      log('ws_error', { label, message: err?.message });
      rej(err);
    });
    setTimeout(() => rej(new Error(`ws_timeout:${label}`)), 8000);
  });
}

// Manhattan distance helper (mirror of policy.js manhattanDistance).
function dist(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// Player-side AI policy (minimal closest-enemy attack). Picks the alive
// sistema target with smallest Manhattan distance; if in range attacks,
// otherwise emits a single-tile move toward the target. Never spends
// cap_pt to keep fairness budget intact.
function selectPlayerAction(actor, units) {
  const enemies = units.filter((u) => u.controlled_by === 'sistema' && (u.hp ?? 0) > 0);
  if (enemies.length === 0) return null;
  const target = enemies.sort(
    (a, b) => dist(actor.position, a.position) - dist(actor.position, b.position),
  )[0];
  const range = actor.attack_range || 1;
  if (dist(actor.position, target.position) <= range && (actor.ap_remaining ?? 0) >= 1) {
    return { action_type: 'attack', target_id: target.id };
  }
  // Step one tile closer (clamped to grid bounds).
  const dx = Math.sign(target.position.x - actor.position.x);
  const dy = Math.sign(target.position.y - actor.position.y);
  // Prefer larger axis to match Manhattan reduction.
  const stepX =
    Math.abs(target.position.x - actor.position.x) >=
    Math.abs(target.position.y - actor.position.y);
  const target_position = stepX
    ? { x: actor.position.x + dx, y: actor.position.y }
    : { x: actor.position.x, y: actor.position.y + dy };
  return { action_type: 'move', target_position };
}

// 2026-05-10 — YAML scenario loader (opt-in via AI_SIM_LOAD_YAML=1).
// Port da tools/py/batch_calibrate_non_elim.py:encounter_to_units.
// Carica docs/planning/encounters/<scenario_id>.yaml, parsa wave_id=1
// (turn_trigger=0), espande units per count, applica tier→stat table
// (base/elite/apex). Ritorna {enemies, grid_size, modulation, objective_type}
// per session/start payload completo.
//
// Codex P2 #1 fix (2026-05-10) — pass `body.modulation` derivato da YAML
// grid_size così backend gridSizeFor riceve deployedCount allineato e
// alloca grid abbastanza grande per spawn points YAML (es. enc_tutorial_02
// 8x8 → modulation trio_mid deployed=6 → 8x8 grid; 10x10 → duo_hardcore
// deployed=8 → 10x10).
//
// Codex P2 #2 fix (2026-05-10) — whitelist objective types supportati
// da questo loader. enc_escort_01 (escort) richiede materializzare unit
// `objective.escort_target`; enc_capture_01 (capture_point) richiede
// occupare tile capture point per N turni; entrambi richiedono player
// AI policy estesa. Initial sweep limitato a elimination + survival
// (objectiveEvaluator built-in handling, completion measurable da player
// damage output). Future scope: extend buildEnemiesFromYaml a spawn
// escort target + extend selectPlayerAction a capture-point camp.
//
// IMPORTANT: keeps profile injection da AI_SIM_SISTEMA_PROFILE override
// (master profile sweep) ma rispetta `ai_profile` per-unit YAML come
// fallback se override non set OR allow per-wave granular control via
// AI_SIM_USE_YAML_PROFILE=1 opt-in (deferred future).
const SUPPORTED_OBJECTIVE_TYPES = new Set(['elimination', 'survival']);

function pickModulationForGrid(gridSize) {
  // Map YAML grid edge → preset deployed count compatibile con
  // services/party/loader.js gridSizeFor (deployed_1_4=6x6,
  // deployed_5_6=8x8, deployed_7_8=10x10).
  const edge = Math.max(gridSize?.[0] || 6, gridSize?.[1] || 6);
  if (edge >= 9) return 'duo_hardcore'; // deployed=8 → 10x10
  if (edge >= 7) return 'trio_mid'; // deployed=6 → 8x8
  return 'solo'; // deployed=4 → 6x6
}

function buildEnemiesFromYaml(scenarioId, profileOverride) {
  const yamlPath = path.join(ENCOUNTER_DIR, `${scenarioId}.yaml`);
  if (!fs.existsSync(yamlPath)) {
    throw new Error(`yaml_missing:${yamlPath}`);
  }
  const raw = fs.readFileSync(yamlPath, 'utf-8');
  const parsed = yaml.load(raw);
  if (!parsed || !Array.isArray(parsed.waves) || parsed.waves.length === 0) {
    throw new Error(`yaml_invalid_waves:${scenarioId}`);
  }
  const objectiveType = parsed.objective?.type || 'elimination';
  if (!SUPPORTED_OBJECTIVE_TYPES.has(objectiveType)) {
    throw new Error(`yaml_unsupported_objective:${objectiveType}`);
  }
  // Pick wave with smallest turn_trigger (initial spawn).
  const sortedWaves = [...parsed.waves].sort(
    (a, b) => (a.turn_trigger || 0) - (b.turn_trigger || 0),
  );
  const wave1 = sortedWaves[0];
  const spawnPoints = wave1.spawn_points || [[0, 0]];
  const tierToHp = { base: 7, elite: 10, apex: 14 };
  const tierToMod = { base: 1, elite: 2, apex: 4 };
  const enemies = [];
  let spIdx = 0;
  for (const unitDef of wave1.units || []) {
    const tier = unitDef.tier || 'base';
    const count = unitDef.count || 1;
    const species = unitDef.species || 'predoni_nomadi';
    const yamlProfile = unitDef.ai_profile || 'aggressive';
    for (let i = 0; i < count; i += 1) {
      const pos = spawnPoints[spIdx % spawnPoints.length];
      spIdx += 1;
      enemies.push({
        id: `sis_${enemies.length + 1}`,
        name: species,
        controlled_by: 'sistema',
        hp: tierToHp[tier] || 7,
        max_hp: tierToHp[tier] || 7,
        ap_remaining: 2,
        ap_max: 2,
        attack_range: 1,
        damage: { min: 1, max: 3 },
        defense: tierToMod[tier] || 1,
        position: { x: pos[0], y: pos[1] },
        species_id: species,
        mbti_type: 'aggressive',
        ai_profile: profileOverride || yamlProfile,
      });
    }
  }
  return {
    enemies,
    grid_size: parsed.grid_size || [8, 8],
    modulation: pickModulationForGrid(parsed.grid_size),
    objective_type: objectiveType,
  };
}

// Synthetic Sistema scenario units (enc_tutorial_01-equivalent baseline)
// so the smoke harness does not need to load YAML scenarios. Keeps the
// driver self-contained + easily inspectable.
//
// FASE 2 — every enemy unit carries `ai_profile` referencing
// ai_profiles.yaml key. declareSistemaIntents.js + sistemaTurnRunner
// resolve per-unit profile (aggressive | balanced | cautious) and apply
// utility-brain overrides. Default `balanced` matches v0.2.0 fallback.
function buildScenarioEnemies() {
  return [
    {
      id: 'sis_01',
      name: 'Razziatore',
      controlled_by: 'sistema',
      hp: 8,
      max_hp: 8,
      ap_remaining: 2,
      ap_max: 2,
      attack_range: 1,
      damage: { min: 1, max: 3 },
      defense: 1,
      position: { x: 5, y: 5 },
      species_id: 'razziatore',
      mbti_type: 'aggressive',
      ai_profile: SISTEMA_PROFILE,
    },
    {
      id: 'sis_02',
      name: 'Pulverator',
      controlled_by: 'sistema',
      hp: 10,
      max_hp: 10,
      ap_remaining: 2,
      ap_max: 2,
      attack_range: 1,
      damage: { min: 2, max: 4 },
      defense: 2,
      position: { x: 4, y: 5 },
      species_id: 'pulverator',
      mbti_type: 'defensive',
      ai_profile: SISTEMA_PROFILE,
    },
  ];
}

function logSection(title) {
  console.log(`\n=== ${title} ===`);
  log('section', { title });
}

// RCA aggressive timeout (docs/research/2026-05-09-aggressive-profile-calibration.md):
// extract Sistema AI decisions from /turn/end response (round_decisions array
// emitted by handleTurnEndViaRound in sessionRoundBridge.js). One JSONL line
// per Sistema unit per round documenting:
//   - rule (UTILITY_AI / REGOLA_001 / REGOLA_002 / NO_TARGET / PRESSURE_CAP / STATO_*)
//   - intent (attack / approach / retreat / skip)
//   - target_id, score (utility brain), breakdown (per-consideration scores)
//   - reason (skip cause: cornered / blocked / no enemy alive / stunned)
// Distinguishes H1 (utility picks retreat, scoring issue), H2 (stepTowards
// returns null, pathfinding issue), H3 (threat ctx null, injection issue).
function logSistemaDecisions(round, body) {
  if (!body || !Array.isArray(body.round_decisions)) return;
  for (const d of body.round_decisions) {
    log('sistema_decision', {
      round,
      unit_id: d.unit_id,
      rule: d.rule || null,
      intent: d.intent || null,
      target_id: d.target_id ?? null,
      score: typeof d.score === 'number' ? d.score : null,
      breakdown: Array.isArray(d.breakdown) ? d.breakdown : null,
      reason: d.reason || null,
      move_to: d.move_to || null,
      aggro_override: d.aggro_override || false,
    });
  }
}

(async () => {
  console.log(`AI sim run → ${LOG_PATH}`);
  console.log(`Tunnel: ${TUNNEL}`);
  console.log(
    `Players: 1 host + ${EXTRA_PLAYERS} extra | Scenario: ${SCENARIO_ID} | Max rounds: ${MAX_ROUNDS}`,
  );
  console.log(
    `Sistema profile: ${SISTEMA_PROFILE}${RUN_SEED !== null ? ` | seed: ${RUN_SEED}` : ''}${RUN_LABEL ? ` | label: ${RUN_LABEL}` : ''}`,
  );
  log('config', {
    tunnel: TUNNEL,
    extra_players: EXTRA_PLAYERS,
    scenario: SCENARIO_ID,
    max_rounds: MAX_ROUNDS,
    sistema_profile: SISTEMA_PROFILE,
    run_seed: RUN_SEED,
    run_label: RUN_LABEL,
    load_yaml: LOAD_YAML,
  });

  // --- bootstrap lobby ---
  logSection('bootstrap lobby');
  const create = await postJson('/api/lobby/create', { host_name: 'AiHost' });
  const code = create.body.code;
  const hostId = create.body.host_id;
  const hostToken = create.body.host_token;
  console.log(`code=${code} hostId=${hostId}`);

  const players = [];
  for (let i = 0; i < EXTRA_PLAYERS; i += 1) {
    const j = await postJson('/api/lobby/join', { code, player_name: `AiPlayer${i + 1}` });
    players.push({ id: j.body.player_id, token: j.body.player_token, name: `AiPlayer${i + 1}` });
  }

  // --- bootstrap coop run (skip onboarding) ---
  logSection('coop run/start skip_onboarding');
  await postJson('/api/coop/run/start', {
    code,
    host_token: hostToken,
    scenario_stack: [SCENARIO_ID],
    skip_onboarding: true,
  });

  // --- character_creation for all players ---
  logSection('character_creation');
  const wsHost = await attachWs('HOST', code, hostId, hostToken);
  const wsExtras = [];
  for (const p of players)
    wsExtras.push({ ...p, ...(await attachWs(p.name, code, p.id, p.token)) });
  await new Promise((r) => setTimeout(r, 600));

  wsHost.send({
    action: 'character_create',
    name: 'Skiv',
    species_id: 'umbra_alaris',
    job_id: 'custode',
  });
  for (let i = 0; i < wsExtras.length; i += 1) {
    const p = wsExtras[i];
    p.send({
      action: 'character_create',
      name: `AiChar${i + 1}`,
      species_id: i % 2 === 0 ? 'dune_stalker' : 'anguis_magnetica',
      job_id: i % 2 === 0 ? 'guerriero' : 'tessitore',
    });
  }
  await new Promise((r) => setTimeout(r, 1500));

  // --- world_setup vote + confirm ---
  logSection('world_setup vote + confirm');
  wsHost.send({ action: 'world_vote', choice: 'accept' });
  for (const p of wsExtras) p.send({ action: 'world_vote', choice: 'accept' });
  await new Promise((r) => setTimeout(r, 800));

  wsHost.send({
    action: 'world_confirm',
    scenario_id: SCENARIO_ID,
    run_seed: RUN_SEED,
  });
  await new Promise((r) => setTimeout(r, 1500));

  // --- pull session_start_payload via REST world/confirm idempotent (already
  // confirmed; orch.confirmWorld throws on second call → use coop/state +
  // build payload locally from characters).
  const stateRes = await getJson(`/api/coop/state?code=${code}`);
  const characters = stateRes.body.snapshot?.characters || [];
  console.log(`Coop phase post-confirm: ${stateRes.body.snapshot?.phase}`);

  // --- session/start ---
  logSection('session/start');
  let enemies;
  let yamlMeta = null;
  try {
    if (LOAD_YAML) {
      const loaded = buildEnemiesFromYaml(SCENARIO_ID, SISTEMA_PROFILE);
      enemies = loaded.enemies;
      yamlMeta = loaded;
    } else {
      enemies = buildScenarioEnemies();
    }
  } catch (err) {
    console.error('YAML scenario load failed:', err.message, '— falling back synthetic');
    log('yaml_fallback', { scenario: SCENARIO_ID, error: err.message });
    enemies = buildScenarioEnemies();
    yamlMeta = null;
  }
  const startBody = {
    characters,
    units: enemies,
    scenario_id: SCENARIO_ID,
    // 2026-05-10 — pass encounter_id when YAML mode so backend
    // encounterLoader populates objective + biomeSpawnBias + conditions
    // (see apps/backend/routes/session.js:1473). Without this, non-elim
    // objectives never trigger objectiveEvaluator.
    ...(LOAD_YAML && yamlMeta ? { encounter_id: SCENARIO_ID } : {}),
    // Codex P2 #1 fix — force party-loader gridSizeFor a allocare grid
    // adeguata a YAML grid_size via modulation preset matching deployed
    // count → 8x8 (trio_mid) / 10x10 (duo_hardcore). Senza questo, default
    // 2-player worker = 6x6 grid, sistema spawn (7,7) etc fuori board.
    ...(yamlMeta ? { modulation: yamlMeta.modulation } : {}),
  };
  const start = await postJson('/api/session/start', startBody);
  if (start.status !== 200 && start.status !== 201) {
    console.error('session/start failed:', start.status, start.body);
    process.exit(3);
  }
  const sessionId = start.body.session_id || start.body.id;
  console.log(`session_id=${sessionId}`);

  // --- combat round loop ---
  logSection('combat round loop');
  let rounds = 0;
  let outcome = null;
  while (rounds < MAX_ROUNDS) {
    rounds += 1;
    const stRes = await getJson(`/api/session/state?session_id=${sessionId}`);
    const st = stRes.body;
    const units = st.units || [];
    const players = units.filter((u) => u.controlled_by === 'player' && (u.hp ?? 0) > 0);
    const enemies = units.filter((u) => u.controlled_by === 'sistema' && (u.hp ?? 0) > 0);

    log('round', {
      round: rounds,
      players: players.length,
      enemies: enemies.length,
      active_unit: st.active_unit,
    });
    // FASE 2.x RCA validation — capture sistema decisions delta per
    // round. session events tail includes Sistema actions with ia_rule
    // + actor_id='sistema'. Filter to ia_rule so post-run jq validates
    // H1 (utility brain retreat picks) vs H2 (move blocked pathfinding)
    // vs H3 (threat passivity). Tail 30 covers ~3-4 sistema actions
    // per round.
    if (Array.isArray(st.events)) {
      for (const ev of st.events) {
        if (ev?.actor_id === 'sistema' || ev?.ia_rule) {
          log('sistema_decision', {
            round: rounds,
            unit_id: ev.ia_controlled_unit || null,
            ia_rule: ev.ia_rule || null,
            action_type: ev.action_type || ev.type || null,
            target_id: ev.target_id || ev.target || null,
            position_from: ev.position_from || null,
            position_to: ev.position_to || null,
            damage_dealt: ev.damage_dealt || null,
            event_ts: ev.ts || null,
          });
        }
      }
    }

    if (enemies.length === 0) {
      outcome = 'victory';
      break;
    }
    if (players.length === 0) {
      outcome = 'defeat';
      break;
    }

    const activeId = st.active_unit;
    const activeUnit = units.find((u) => u.id === activeId);
    if (!activeUnit) {
      console.warn(`round ${rounds}: no active_unit`);
      break;
    }

    if (activeUnit.controlled_by === 'sistema') {
      // Server-side sistemaTurnRunner should have advanced the turn already
      // (via /turn/end). Force /turn/end to nudge if stuck.
      const teRes = await postJson('/api/session/turn/end', { session_id: sessionId });
      logSistemaDecisions(rounds, teRes.body);
      continue;
    }

    // Player turn — pick action via minimal AI policy.
    const action = selectPlayerAction(activeUnit, units);
    if (!action) {
      // No valid target — end turn.
      const teRes = await postJson('/api/session/turn/end', { session_id: sessionId });
      logSistemaDecisions(rounds, teRes.body);
      continue;
    }

    const actBody = {
      session_id: sessionId,
      actor_id: activeUnit.id,
      ...action,
    };
    const actT0 = Date.now();
    const actRes = await postJson('/api/session/action', actBody);
    // Envelope A A2 — map the action REST round-trip duration onto a
    // command_latency_ms field for attack-type actions so the playtest #2
    // analyzer Performance section (M.7 p95 gate) draws from real sim
    // latency. Non-attack actions still log without latency (analyzer only
    // reads command_latency_ms where > 0). Backward-compatible: existing
    // balance summary counts `player_action` kind regardless of new field.
    const playerActionEntry = {
      round: rounds,
      actor: activeUnit.id,
      action: action.action_type,
      status: actRes.status,
    };
    if (action.action_type === 'attack') {
      playerActionEntry.command_latency_ms = Date.now() - actT0;
    }
    log('player_action', playerActionEntry);

    // End turn after single action (player AP=2 default; second action
    // optional — keep simple, end turn).
    const teRes = await postJson('/api/session/turn/end', { session_id: sessionId });
    logSistemaDecisions(rounds, teRes.body);
  }

  if (!outcome && rounds >= MAX_ROUNDS) outcome = 'timeout';
  console.log(`\nCombat outcome: ${outcome} after ${rounds} rounds`);
  log('combat_outcome', { outcome, rounds });

  // --- end session + capture VC scoring before close ---
  logSection('session/end + VC capture');
  // T1.2 telemetry — pull VC scoring + objective state pre-close so the
  // JSONL holds full balance metrics for downstream analyzers.
  const vcRes = await getJson(`/api/session/${sessionId}/vc`);
  // Envelope A A2 — capture the FULL 4-layer per_actor profile from the
  // GET /:id/vc snapshot (apps/backend/services/vcScoring.js buildVcSnapshot
  // shape: { session_id, per_actor: { <uid>: { mbti_type, mbti_axes,
  // ennea_archetypes:[{id,triggered}], conviction_axis:{utility,liberty,
  // morality}, sentience:{tier} } }, meta }). The telemetry-bridge maps
  // this directly to the analyzer `vc_snapshot` event (P4 Temperamenti:
  // MBTI / Ennea / Conviction / Sentience layers). Field names mirror the
  // real response — no fabrication; absent layers stay absent.
  const vcSnapshot = vcRes.body || {};
  const vcPerActor = vcSnapshot.per_actor || {};
  // Legacy top-level mbti/ennea kept for backward compat with any older
  // batch aggregator that read vc_capture.mbti / .ennea directly.
  const legacyMbti = vcSnapshot.mbti || vcSnapshot.scoring?.mbti || null;
  const legacyEnnea = vcSnapshot.ennea || vcSnapshot.scoring?.ennea || null;
  log('vc_capture', {
    ok: vcRes.status === 200,
    mbti: legacyMbti,
    ennea: legacyEnnea,
    per_actor: vcPerActor,
  });
  const actorCount = Object.keys(vcPerActor).length;
  console.log(`VC per_actor captured: ${actorCount} actor(s)`);
  if (actorCount > 0) {
    const first = Object.values(vcPerActor)[0];
    console.log(
      `VC sample actor: mbti=${first?.mbti_type} sentience=${first?.sentience?.tier} ` +
        `conviction=${JSON.stringify(first?.conviction_axis)}`,
    );
  }
  // TODO(Envelope A — A2 promotion): the headless smoke flow closes the
  // session before debrief and does not currently drive a job promotion
  // (promotionEngine.js is invoked via the coop debrief path, host-only,
  // not reachable from this single-worker harness without a larger
  // refactor of the debrief/lineage choreography). Promotion telemetry
  // (P3 Identità) is therefore NOT emitted yet — analyzer P3 stays 🔴 on
  // synthetic-only data until a future envelope wires the debrief
  // promotion capture. Intentionally NOT faking promotion events.
  await postJson('/api/session/end', { session_id: sessionId });
  // Coop endCombat is host-only; emulate via coopOrchestrator state poll.
  // For sim purposes we rely on session.events VICTORY/DEFEAT to drive
  // orch.endCombat externally OR we just close the session and skip the
  // debrief phase (sim main goal = combat reachable).

  // --- WS phase=debrief host (B-NEW-1-bis sync orch) ---
  logSection('host phase=debrief WS intent');
  wsHost.sendPhase('debrief');
  await new Promise((r) => setTimeout(r, 1000));

  // --- lineage choice: host + extras ---
  logSection('lineage_choice');
  wsHost.send({ action: 'lineage_choice', mutations_to_leave: [] });
  for (const p of wsExtras) p.send({ action: 'lineage_choice', mutations_to_leave: [] });
  await new Promise((r) => setTimeout(r, 1500));

  const finalRes = await getJson(`/api/coop/state?code=${code}`);
  const finalPhase = finalRes.body.snapshot?.phase;
  console.log(`\nFinal coop phase: ${finalPhase}`);
  log('final_phase', { phase: finalPhase });

  // --- cleanup ---
  wsHost.ws.close();
  for (const p of wsExtras) p.ws.close();
  await new Promise((r) => setTimeout(r, 500));
  await postJson('/api/lobby/close', { code, host_token: hostToken });

  // --- aggregate report ---
  logSection('aggregate report');
  logStream.end();
  const lines = fs.readFileSync(LOG_PATH, 'utf8').split('\n').filter(Boolean);
  const events = lines.map((l) => JSON.parse(l));
  const restCalls = events.filter((e) => e.kind === 'rest').length;
  const wsEvents = events.filter((e) => e.kind === 'ws').length;
  const playerActions = events.filter((e) => e.kind === 'player_action').length;
  const sistemaDecisions = events.filter((e) => e.kind === 'sistema_decision');
  const intentDist = sistemaDecisions.reduce((acc, e) => {
    acc[e.intent || 'unknown'] = (acc[e.intent || 'unknown'] || 0) + 1;
    return acc;
  }, {});
  const ruleDist = sistemaDecisions.reduce((acc, e) => {
    acc[e.rule || 'unknown'] = (acc[e.rule || 'unknown'] || 0) + 1;
    return acc;
  }, {});
  const phaseChanges = events.filter((e) => e.kind === 'ws' && e.type === 'phase_change');
  const totalDuration = events.length > 0 ? events[events.length - 1].ts - events[0].ts : 0;

  console.log(
    `Run log: ${LOG_PATH} (${lines.length} entries, ${(totalDuration / 1000).toFixed(1)}s wall)`,
  );
  console.log(`REST calls: ${restCalls}`);
  console.log(`WS events: ${wsEvents}`);
  console.log(`Player AI actions: ${playerActions}`);
  console.log(`Sistema decisions: ${sistemaDecisions.length}`);
  console.log(`  intent dist: ${JSON.stringify(intentDist)}`);
  console.log(`  rule dist:   ${JSON.stringify(ruleDist)}`);
  console.log(`Combat outcome: ${outcome} (${rounds} rounds)`);
  console.log(`Phase progression: ${phaseChanges.map((e) => e.payload?.phase).join(' → ')}`);
  console.log(`Final phase: ${finalPhase}`);

  process.exit(finalPhase === 'ended' ? 0 : 1);
})().catch((err) => {
  console.error('SIM FAIL:', err);
  log('fatal', { message: err?.message, stack: err?.stack });
  logStream.end();
  process.exit(2);
});
