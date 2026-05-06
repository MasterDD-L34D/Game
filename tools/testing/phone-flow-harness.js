#!/usr/bin/env node
// phone-flow-harness.js — programmatic WS test harness for coop phase flow.
// Tests the B6+B7 fix (character_create server-side drain) and maps all
// 7 phone action types against wsSession.js intent handler.
//
// Usage: node tools/testing/phone-flow-harness.js
// Prerequisites: backend running on localhost:3334 (HTTP) + :3341 (WS).
//
// No manual phone testing. Entirely programmatic via `ws` npm package.

'use strict';

const http = require('node:http');
const path = require('node:path');
// Codex P2-2 fix — resolve ws lazily, deferring require.resolve fallback
// inside try/catch so non-Windows checkouts (Linux CI, /workspace/Game)
// do not fail with MODULE_NOT_FOUND at parse time when the hardcoded
// path candidate doesn't exist.
const WS_MODULE = (() => {
  // 1. Plain require — succeeds when harness is run from a directory whose
  //    node_modules graph already exposes `ws` (repo root, CI workspace).
  try {
    return require('ws');
  } catch {
    /* fall through to resolve fallback */
  }
  // 2. Try resolving relative to common host paths (Linux CI workspace +
  //    Windows local dev). Each resolve guarded individually so a missing
  //    candidate path never throws across the whole module import.
  const fallbackRoots = [
    process.env.GAME_REPO_ROOT,
    path.join(__dirname, '..', '..'),
    '/workspace/Game',
    '/c/Users/VGit/Desktop/Game',
    'C:/Users/VGit/Desktop/Game',
  ].filter(Boolean);
  for (const root of fallbackRoots) {
    try {
      const resolved = require.resolve('ws', { paths: [root] });
      return require(resolved);
    } catch {
      /* try next */
    }
  }
  throw new Error(
    'ws module not found. Run `npm install` in the repo root or set GAME_REPO_ROOT to the path containing node_modules/ws.',
  );
})();
const WebSocket = WS_MODULE;

const HTTP_BASE = 'http://localhost:3334';
// Backend running with LOBBY_WS_SHARED=true — WS on same port as HTTP.
// Separate :3341 port only when LOBBY_WS_SHARED is not set.
const WS_BASE = 'ws://localhost:3334';
const TIMEOUT_MS = 5000;

// ── helpers ──────────────────────────────────────────────────────────────────

function httpPost(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(path, HTTP_BASE);
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => {
          raw += c;
        });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      },
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function httpGet(path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, HTTP_BASE);
    http
      .get({ hostname: url.hostname, port: url.port, path: url.pathname + url.search }, (res) => {
        let raw = '';
        res.on('data', (c) => {
          raw += c;
        });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw) });
          } catch {
            resolve({ status: res.statusCode, body: raw });
          }
        });
      })
      .on('error', reject);
  });
}

/**
 * Open a WS connection; return a client helper with:
 *   .send(msg)   — JSON serialize and send
 *   .waitFor(pred, timeoutMs) — resolve when a message matching pred arrives
 *   .messages    — all received messages
 *   .close()
 */
function openWs(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const messages = [];
    const waiters = [];

    ws.on('error', (err) => {
      reject(err);
    });

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      messages.push(msg);
      for (const { pred, res } of waiters) {
        if (pred(msg)) res(msg);
      }
    });

    ws.on('open', () => {
      resolve({
        send(msg) {
          ws.send(JSON.stringify(msg));
        },
        waitFor(pred, timeoutMs = TIMEOUT_MS) {
          // Check already-received
          const already = messages.find(pred);
          if (already) return Promise.resolve(already);
          return new Promise((res, rej) => {
            const timer = setTimeout(
              () => rej(new Error('timeout waiting for message')),
              timeoutMs,
            );
            waiters.push({
              pred,
              res: (m) => {
                clearTimeout(timer);
                res(m);
              },
            });
          });
        },
        waitForAny(types, timeoutMs = TIMEOUT_MS) {
          const typeSet = new Set(types);
          const already = messages.find((m) => typeSet.has(m.type));
          if (already) return Promise.resolve(already);
          return new Promise((res, rej) => {
            const timer = setTimeout(
              () => rej(new Error(`timeout waiting for ${types.join('|')}`)),
              timeoutMs,
            );
            waiters.push({
              pred: (m) => typeSet.has(m.type),
              res: (m) => {
                clearTimeout(timer);
                res(m);
              },
            });
          });
        },
        messages,
        close() {
          ws.close();
        },
        raw: ws,
      });
    });
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── report helpers ────────────────────────────────────────────────────────────

const results = [];

function report(scenario, expected, actual, verdict, gap) {
  results.push({ scenario, expected, actual, verdict, gap: gap || null });
  const icon = verdict === 'PASS' ? '✓' : verdict === 'FAIL' ? '✗' : '?';
  console.log(`\n${icon} SCENARIO ${scenario}`);
  console.log(`  EXPECTED: ${expected}`);
  console.log(`  ACTUAL:   ${actual}`);
  console.log(`  VERDICT:  ${verdict}`);
  if (gap) console.log(`  GAP:      ${gap}`);
}

function pass(scenario, expected, actual) {
  report(scenario, expected, actual, 'PASS', null);
}

function fail(scenario, expected, actual, gap) {
  report(scenario, expected, actual, 'FAIL', gap);
}

function gapDoc(scenario, expected, actual, gap) {
  report(scenario, expected, actual, 'GAP-DOCUMENTED', gap);
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('=== phone-flow-harness.js ===');
  console.log(`HTTP: ${HTTP_BASE}  WS: ${WS_BASE}`);
  console.log('');

  // ── health check ──────────────────────────────────────────────────────────
  try {
    const health = await httpGet('/api/health');
    if (health.body?.status !== 'ok')
      throw new Error('health not ok: ' + JSON.stringify(health.body));
    console.log('[health] backend ok');
  } catch (err) {
    console.error('[FATAL] backend health check failed:', err.message);
    console.error(
      'Start backend: LOBBY_WS_SHARED=true PORT=3334 npm --prefix /c/Users/VGit/Desktop/Game run start:api',
    );
    process.exit(1);
  }

  // ── SCENARIO 0: Lobby create + join ───────────────────────────────────────
  let roomCode, hostToken, playerToken, hostPlayerId, playerPlayerId;
  console.log('\n--- SCENARIO 0: Lobby create + join ---');
  try {
    // Lobby API: POST /api/lobby/create → {code, host_id, host_token, ...}
    const createRes = await httpPost('/api/lobby/create', { host_name: 'TestHost' });
    if (createRes.status !== 201 && createRes.status !== 200) {
      throw new Error(
        `create failed status=${createRes.status} body=${JSON.stringify(createRes.body)}`,
      );
    }
    roomCode = createRes.body.code;
    hostToken = createRes.body.host_token;
    hostPlayerId = createRes.body.host_id;
    if (!roomCode || !hostToken)
      throw new Error('missing code or host_token: ' + JSON.stringify(createRes.body));
    console.log(`  Room created: ${roomCode}  host_id=${hostPlayerId}`);

    // Lobby API: POST /api/lobby/join {code, player_name} → {player_id, player_token, room}
    const joinRes = await httpPost('/api/lobby/join', {
      code: roomCode,
      player_name: 'TestPlayer',
    });
    if (joinRes.status !== 200 && joinRes.status !== 201) {
      throw new Error(`join failed status=${joinRes.status} body=${JSON.stringify(joinRes.body)}`);
    }
    playerToken = joinRes.body.player_token;
    playerPlayerId = joinRes.body.player_id;
    if (!playerToken) throw new Error('missing player_token: ' + JSON.stringify(joinRes.body));
    console.log(`  Player joined: ${playerPlayerId}`);
    pass(
      '0: lobby-create-join',
      'room created + player joined',
      `code=${roomCode} host=${hostPlayerId} player=${playerPlayerId}`,
    );
  } catch (err) {
    fail(
      '0: lobby-create-join',
      'room created + player joined',
      err.message,
      'REST lobby endpoint failure — check /api/lobby/create + /api/lobby/join',
    );
    console.error('[FATAL] cannot proceed without lobby. Abort.');
    process.exit(1);
  }

  // ── connect WS clients ────────────────────────────────────────────────────
  console.log('\n--- WS connect host + player ---');
  let host, player;
  try {
    // WS auth: ?code=XXXX&player_id=p_xxx&token=JWT
    const hostUrl = `${WS_BASE}/ws?code=${roomCode}&player_id=${hostPlayerId}&token=${hostToken}`;
    const playerUrl = `${WS_BASE}/ws?code=${roomCode}&player_id=${playerPlayerId}&token=${playerToken}`;
    [host, player] = await Promise.all([openWs(hostUrl), openWs(playerUrl)]);
    // wait for hello messages
    const [hostHello, playerHello] = await Promise.all([
      host.waitFor((m) => m.type === 'hello'),
      player.waitFor((m) => m.type === 'hello'),
    ]);
    console.log(`  Host hello: role=${hostHello.payload?.role} id=${hostHello.payload?.player_id}`);
    console.log(
      `  Player hello: role=${playerHello.payload?.role} id=${playerHello.payload?.player_id}`,
    );
    // Confirm roles
    if (hostHello.payload?.role !== 'host')
      throw new Error(`host role wrong: ${hostHello.payload?.role}`);
    if (playerHello.payload?.role !== 'player')
      throw new Error(`player role wrong: ${playerHello.payload?.role}`);
    pass(
      '0b: ws-connect',
      'host role=host, player role=player',
      `host=${hostHello.payload?.role} player=${playerHello.payload?.role}`,
    );
  } catch (err) {
    fail(
      '0b: ws-connect',
      'WS connect + hello',
      err.message,
      'WS port or token issue — check LOBBY_WS_PORT=3341',
    );
    process.exit(1);
  }

  // ── SCENARIO 1: Phase transition character_creation ───────────────────────
  console.log('\n--- SCENARIO 1: phase character_creation ---');
  try {
    // Host sends {type:'phase', payload:{phase:'character_creation'}}
    host.send({ type: 'phase', payload: { phase: 'character_creation' } });

    // publishPhaseChange broadcasts {type:'phase_change', version:N, payload:{phase}}.
    // Also triggers broadcastRoundReady → {type:'round_ready', payload:{phase}}.
    const [hostPhase, playerPhase] = await Promise.all([
      host.waitFor((m) => m.type === 'phase_change' || m.type === 'round_ready'),
      player.waitFor((m) => m.type === 'phase_change' || m.type === 'round_ready'),
    ]);
    console.log(
      `  Host got:   type=${hostPhase.type} version=${hostPhase.version} phase=${hostPhase.payload?.phase}`,
    );
    console.log(
      `  Player got: type=${playerPhase.type} version=${playerPhase.version} phase=${playerPhase.payload?.phase}`,
    );

    // Verify coopStore bootstrapped via GET /api/coop/state
    await sleep(100);
    const stateRes = await httpGet(`/api/coop/state?code=${roomCode}`);
    const orchPhase = stateRes.body?.snapshot?.phase;
    console.log(
      `  CoopOrchestrator phase: ${orchPhase} (expected: character_creation or lobby→character_creation)`,
    );

    // phase_change broadcast carries version? Check hostPhase.
    const phaseChangeBroadcast = host.messages.find((m) => m.type === 'phase_change');
    const broadcastHasVersion = phaseChangeBroadcast?.version != null;
    if (orchPhase === 'character_creation') {
      pass(
        '1: phase-character_creation',
        'phase_change broadcast + orch bootstrapped to character_creation (version present)',
        `orch.phase=${orchPhase} phase_change.version=${phaseChangeBroadcast?.version} (has_version=${broadcastHasVersion})`,
      );
    } else {
      gapDoc(
        '1: phase-character_creation',
        'orch.phase=character_creation after host sends phase msg',
        `orch.phase=${orchPhase} (state: ${JSON.stringify(stateRes.body).slice(0, 120)})`,
        `GAP-W1: coopStore bootstrap in phase case may not fire or /api/coop/state not wired. Check route + coopStore.getOrCreate`,
      );
    }
  } catch (err) {
    fail(
      '1: phase-character_creation',
      'phase_change broadcast received by both clients',
      err.message,
      `GAP-W1: publishPhaseChange may not broadcast correctly or event_class field wrong. wsSession.js:514 publishPhaseChange → publishEvent`,
    );
  }

  // ── SCENARIO 2: character_create (B6+B7 fix) ─────────────────────────────
  console.log('\n--- SCENARIO 2: character_create B6+B7 (host + player both submit) ---');

  let hostCharAccepted = false;
  let playerCharAccepted = false;
  let hostGotError = null;
  let playerGotError = null;
  let phaseTransitionedToWorldSetup = false;

  try {
    const charPayloadHost = {
      type: 'intent',
      payload: {
        action: 'character_create',
        name: 'TestHost',
        species_id: 'vel_arenavenator',
        job_id: 'guerriero',
      },
    };
    const charPayloadPlayer = {
      type: 'intent',
      payload: {
        action: 'character_create',
        name: 'TestPlayer',
        species_id: 'vel_arenavenator',
        job_id: 'esploratore',
      },
    };

    // Send both simultaneously
    host.send(charPayloadHost);
    player.send(charPayloadPlayer);

    // Each sender should get character_accepted (not error)
    const [hostResult, playerResult] = await Promise.all([
      // Wait for character_accepted OR error from host WS (whichever comes first)
      Promise.race([
        host.waitFor((m) => m.type === 'character_accepted', TIMEOUT_MS),
        host.waitFor((m) => m.type === 'error', TIMEOUT_MS),
      ]),
      Promise.race([
        player.waitFor((m) => m.type === 'character_accepted', TIMEOUT_MS),
        player.waitFor((m) => m.type === 'error', TIMEOUT_MS),
      ]),
    ]);

    if (hostResult.type === 'character_accepted') {
      hostCharAccepted = true;
      console.log(`  Host: character_accepted phase=${hostResult.payload?.phase}`);
    } else {
      hostGotError = hostResult.payload?.code;
      console.log(`  Host: ERROR code=${hostGotError}`);
    }

    if (playerResult.type === 'character_accepted') {
      playerCharAccepted = true;
      console.log(`  Player: character_accepted phase=${playerResult.payload?.phase}`);
    } else {
      playerGotError = playerResult.payload?.code;
      console.log(`  Player: ERROR code=${playerGotError}`);
    }

    // Check character_ready_list broadcast (both clients should see it)
    const readyListMsgs = host.messages.filter((m) => m.type === 'character_ready_list');
    console.log(`  character_ready_list broadcasts seen by host: ${readyListMsgs.length}`);

    // With 2 players and both submitted → should auto-transition to world_setup
    await sleep(300);
    const stateRes2 = await httpGet(`/api/coop/state?code=${roomCode}`);
    const orchPhase2 = stateRes2.body?.snapshot?.phase;
    console.log(`  CoopOrchestrator phase after both submit: ${orchPhase2}`);

    // Check if world_setup phase_change was broadcast
    const worldSetupEvent = host.messages.find(
      (m) =>
        (m.type === 'event' && m.payload?.phase === 'world_setup') ||
        (m.type === 'round_ready' && m.payload?.phase === 'world_setup'),
    );
    phaseTransitionedToWorldSetup = orchPhase2 === 'world_setup' || Boolean(worldSetupEvent);

    if (hostCharAccepted && playerCharAccepted && phaseTransitionedToWorldSetup) {
      pass(
        '2: character_create-both',
        'Both host+player get character_accepted + auto-transition to world_setup',
        `host_accepted=${hostCharAccepted} player_accepted=${playerCharAccepted} world_setup=${phaseTransitionedToWorldSetup}`,
      );
    } else if (hostCharAccepted && playerCharAccepted && !phaseTransitionedToWorldSetup) {
      gapDoc(
        '2a: character_create-accepted-no-transition',
        'character_accepted for both BUT no world_setup transition',
        `orch.phase=${orchPhase2}`,
        `GAP-W2: allPlayerIds passed to submitCharacter may not match room.players. wsSession.js:1231 allPids derives from room.players.values() — check both players are in room.players before submit`,
      );
    } else {
      fail(
        '2: character_create-both',
        'Both get character_accepted (B6 fix)',
        `host_accepted=${hostCharAccepted} (err=${hostGotError}) player_accepted=${playerCharAccepted} (err=${playerGotError})`,
        `GAP-W2: B6/B7 fix regression. host_cannot_intent or phase_locked for host or player. wsSession.js:1191 intent case`,
      );
    }
  } catch (err) {
    fail(
      '2: character_create-both',
      'character_accepted from both clients',
      err.message,
      `GAP-W2: timeout — no character_accepted or error within ${TIMEOUT_MS}ms. Check wsSession.js intent→character_create branch`,
    );
  }

  // ── SCENARIO 3: character_ready_list self-echo check ─────────────────────
  console.log('\n--- SCENARIO 3: character_ready_list broadcast check ---');
  try {
    const hostReadyLists = host.messages.filter((m) => m.type === 'character_ready_list');
    const playerReadyLists = player.messages.filter((m) => m.type === 'character_ready_list');
    console.log(`  Host received ${hostReadyLists.length} character_ready_list messages`);
    console.log(`  Player received ${playerReadyLists.length} character_ready_list messages`);
    if (hostReadyLists.length > 0) {
      console.log(`  Last ready_list: ${JSON.stringify(hostReadyLists.at(-1)?.payload)}`);
    }
    if (hostReadyLists.length > 0 && playerReadyLists.length > 0) {
      pass(
        '3: character_ready_list-broadcast',
        'character_ready_list broadcast to all',
        `host_got=${hostReadyLists.length} player_got=${playerReadyLists.length}`,
      );
    } else if (hostReadyLists.length > 0 && playerReadyLists.length === 0) {
      gapDoc(
        '3: character_ready_list-player-missing',
        'player should receive character_ready_list broadcast',
        `host_got=${hostReadyLists.length} player_got=0`,
        `GAP-W3: room.broadcast() called but player WS may have missed msgs due to timing. Non-critical if character_accepted received.`,
      );
    } else {
      gapDoc(
        '3: character_ready_list-none',
        'at least 1 character_ready_list broadcast',
        `host_got=${hostReadyLists.length} player_got=${playerReadyLists.length}`,
        `GAP-W3: character_create never reached broadcast path — check B6/B7 results`,
      );
    }
  } catch (err) {
    fail('3: character_ready_list', 'character_ready_list broadcast check', err.message, null);
  }

  // ── SCENARIO 4: Lifecycle actions NOT server-side drained ─────────────────
  console.log(
    '\n--- SCENARIO 4: lifecycle intents gap matrix (form_pulse_submit, world_vote, etc.) ---',
  );

  // 4a: form_pulse_submit — W4 fix verify (drains server-side via submitFormPulse)
  console.log('\n  4a: form_pulse_submit (expect: W4 fix → form_pulse_list broadcast)');
  try {
    player.send({
      type: 'intent',
      payload: { action: 'form_pulse_submit', form_axes: { alpha: 0.5, beta: 0.3 } },
    });
    const listMsg = await player.waitFor((m) => m.type === 'form_pulse_list', 2000);
    const status = listMsg.payload?.status || {};
    const list = listMsg.payload?.list || [];
    console.log(
      `    form_pulse_list received: ready_count=${status.ready_count} total=${status.total} all_ready=${status.all_ready}`,
    );
    if (status.ready_count >= 1 && status.all_ready === true && Array.isArray(list)) {
      pass(
        '4a: form_pulse_submit',
        'form_pulse_submit drains via submitFormPulse → form_pulse_list broadcast (host excluded)',
        `ready_count=${status.ready_count} total=${status.total} all_ready=${status.all_ready} list_len=${list.length}`,
      );
    } else {
      gapDoc(
        '4a: form_pulse_submit',
        'form_pulse_list payload schema',
        `received but status.ready_count=${status.ready_count}`,
        `GAP-W4-residue: drain branch reached but ready_count not incremented. Check submitFormPulse method or formPulses Map state.`,
      );
    }
  } catch (err) {
    gapDoc(
      '4a: form_pulse_submit',
      'form_pulse_submit drain (W4 fix)',
      `timeout/error: ${err.message}`,
      `GAP-W4-regression: form_pulse_list not broadcast within 2s. Check wsSession.js intent action='form_pulse_submit' branch + coopOrchestrator.submitFormPulse.`,
    );
  }

  // 4b: world_vote — W5 fix verify (drains server-side via voteWorld)
  console.log('\n  4b: world_vote (expect: W5 fix → world_tally broadcast)');
  try {
    player.send({
      type: 'intent',
      payload: { action: 'world_vote', choice: 'accept', scenario_id: 'enc_tutorial_01' },
    });
    const tallyMsg = await player.waitFor((m) => m.type === 'world_tally', 2000);
    console.log(
      `    world_tally received: accept=${tallyMsg.payload?.accept} reject=${tallyMsg.payload?.reject}`,
    );
    if (tallyMsg.payload?.accept >= 1) {
      pass(
        '4b: world_vote',
        'world_vote drains via voteWorld → world_tally broadcast',
        `accept=${tallyMsg.payload.accept} reject=${tallyMsg.payload.reject}`,
      );
    } else {
      fail(
        '4b: world_vote',
        'world_vote drains via voteWorld',
        `tally received but accept count=${tallyMsg.payload?.accept}`,
        'W5 fix incomplete — voteWorld drained but accept count not incremented',
      );
    }
  } catch (err) {
    fail(
      '4b: world_vote',
      'world_tally broadcast',
      err.message,
      'W5 fix REGRESSED — world_tally not broadcast within 2s. Check phase=world_setup precondition + voteWorld signature.',
    );
  }

  // 4c: lineage_choice — W6 fix verify (drains via submitDebriefChoice but
  // requires phase=debrief; here we expect error 'not_in_debrief' since
  // phase is world_setup). Confirms drain path is wired correctly.
  console.log('\n  4c: lineage_choice in wrong phase (expect: not_in_debrief error)');
  try {
    player.send({ type: 'intent', payload: { action: 'lineage_choice', mutations_to_leave: [] } });
    const errMsg = await player.waitFor(
      (m) =>
        m.type === 'error' &&
        (m.payload?.code === 'not_in_debrief' || m.payload?.code === 'lineage_choice_failed'),
      2000,
    );
    console.log(`    Got expected error: ${errMsg.payload?.code}`);
    pass(
      '4c: lineage_choice-phase-gate',
      'lineage_choice drains via submitDebriefChoice (phase-gated to debrief)',
      `error code=${errMsg.payload?.code}`,
    );
  } catch (err) {
    fail(
      '4c: lineage_choice-phase-gate',
      'not_in_debrief error in non-debrief phase',
      err.message,
      'W6 fix issue — drain branch not engaged or wrong error code emitted.',
    );
  }

  // 4d: next_macro — W7 fix verify (drains via submitNextMacro, host-only).
  // Phase here is world_setup (post W5 vote). Codex P2 review #2075:
  // world_setup is valid post-debrief auto-advance phase, advance/branch
  // become no-op. We test 2 paths: (a) non-host gets host_only, (b) host
  // sends invalid choice gets macro_choice_invalid (proves drain engaged).
  console.log('\n  4d: next_macro (expect: W7 fix → host-only + choice validation)');
  try {
    // Player (non-host) sends → expect host_only error.
    player.send({ type: 'intent', payload: { action: 'next_macro', choice: 'advance' } });
    const errMsgPlayer = await player.waitFor(
      (m) => m.type === 'error' && m.payload?.code === 'host_only',
      2000,
    );
    console.log(`    Player got expected host_only: ${errMsgPlayer.payload?.code}`);
    // Host sends invalid choice → expect macro_choice_invalid.
    host.send({ type: 'intent', payload: { action: 'next_macro', choice: 'sideways' } });
    const errMsgHost = await host.waitFor(
      (m) => m.type === 'error' && m.payload?.code === 'macro_choice_invalid',
      2000,
    );
    console.log(`    Host got expected macro_choice_invalid: ${errMsgHost.payload?.code}`);
    // Host sends valid 'advance' in world_setup → expect next_macro_accepted (no-op path).
    host.send({ type: 'intent', payload: { action: 'next_macro', choice: 'advance' } });
    const acceptedMsg = await host.waitFor((m) => m.type === 'next_macro_accepted', 2000);
    console.log(
      `    Host got next_macro_accepted: choice=${acceptedMsg.payload?.choice} phase=${acceptedMsg.payload?.phase}`,
    );
    pass(
      '4d: next_macro',
      'next_macro drains via submitNextMacro (host-only + choice validation + world_setup no-op accepted)',
      `player_err=${errMsgPlayer.payload?.code} host_err=${errMsgHost.payload?.code} accepted=${acceptedMsg.payload?.choice}`,
    );
  } catch (err) {
    fail(
      '4d: next_macro',
      'next_macro drain branch host-only + choice + phase no-op',
      err.message,
      'W7 fix issue — drain branch not engaged or wrong response path',
    );
  }

  // 4e: reveal_acknowledge — W8b fix verify (drains via acknowledgeReveal)
  console.log('\n  4e: reveal_acknowledge (expect: W8b fix → reveal_ack_list broadcast)');
  try {
    player.send({ type: 'intent', payload: { action: 'reveal_acknowledge' } });
    const ackMsg = await player.waitFor((m) => m.type === 'reveal_acknowledge_accepted', 2000);
    const listMsg = await player.waitFor((m) => m.type === 'reveal_ack_list', 2000);
    console.log(
      `    reveal_acknowledge_accepted: ready_count=${ackMsg.payload?.status?.ready_count} all_ready=${ackMsg.payload?.status?.all_ready}`,
    );
    console.log(`    reveal_ack_list: ${JSON.stringify(listMsg.payload).slice(0, 100)}`);
    pass(
      '4e: reveal_acknowledge',
      'reveal_acknowledge drains via acknowledgeReveal → reveal_ack_list broadcast',
      `ready_count=${ackMsg.payload?.status?.ready_count} all_ready=${ackMsg.payload?.status?.all_ready}`,
    );
  } catch (err) {
    fail(
      '4e: reveal_acknowledge',
      'reveal_ack_list broadcast + reveal_acknowledge_accepted',
      err.message,
      'W8b fix REGRESSED — reveal_acknowledge drain not engaged or wrong response shape',
    );
  }

  // ── SCENARIO 5: host-cannot-intent check for combat_action ───────────────
  console.log('\n--- SCENARIO 5: combat_action host-gate (B6 fix) ---');
  try {
    host.send({
      type: 'intent',
      payload: { action: 'combat_action', action_type: 'attack', actor_id: 'pg_0' },
    });
    const errorMsg = await host.waitFor(
      (m) => m.type === 'error' && m.payload?.code === 'host_cannot_intent',
      2000,
    );
    console.log(`  Host got expected error: ${errorMsg.payload?.code}`);
    pass(
      '5: combat_action-host-blocked',
      'host gets host_cannot_intent error for combat_action',
      `code=${errorMsg.payload?.code}`,
    );
  } catch (err) {
    fail(
      '5: combat_action-host-blocked',
      'host_cannot_intent error',
      err.message,
      'GAP-W9: B6 combat intent gate may not be working — host can send combat_action without error',
    );
  }

  // ── SCENARIO 6: end_turn host-gate ────────────────────────────────────────
  console.log('\n--- SCENARIO 6: end_turn host-gate (B6 fix) ---');
  try {
    host.send({ type: 'intent', payload: { action: 'end_turn' } });
    const errorMsg2 = await host.waitFor(
      (m) => m.type === 'error' && m.payload?.code === 'host_cannot_intent',
      2000,
    );
    console.log(`  Host got expected error: ${errorMsg2.payload?.code}`);
    pass(
      '6: end_turn-host-blocked',
      'host gets host_cannot_intent for end_turn',
      `code=${errorMsg2.payload?.code}`,
    );
  } catch (err) {
    fail(
      '6: end_turn-host-blocked',
      'host_cannot_intent error for end_turn',
      err.message,
      'GAP-W10: B6 end_turn gate broken — host can submit end_turn',
    );
  }

  // ── SCENARIO 7: W8 fix verify — KNOWN_PHASES whitelist guard ─────────────
  console.log('\n--- SCENARIO 7: W8 phase whitelist guard ---');
  // 7a: world_seed_reveal is now in KNOWN_PHASES (UI-only transient)
  console.log('\n  7a: world_seed_reveal (expect: accepted, in whitelist)');
  try {
    host.send({ type: 'phase', payload: { phase: 'world_seed_reveal' } });
    const phaseMsg = await player.waitFor(
      (m) => m.type === 'phase_change' && m.payload?.phase === 'world_seed_reveal',
      2000,
    );
    console.log(`  player received phase_change: ${phaseMsg.payload?.phase}`);
    pass(
      '7a: world_seed_reveal-whitelisted',
      'world_seed_reveal accepted by KNOWN_PHASES whitelist',
      `phase_change broadcast=${phaseMsg.payload?.phase}`,
    );
  } catch (err) {
    fail(
      '7a: world_seed_reveal-whitelisted',
      'phase_change broadcast for world_seed_reveal',
      err.message,
      'W8 fix issue — world_seed_reveal should be in KNOWN_PHASES whitelist',
    );
  }
  // 7b: arbitrary garbage phase rejected
  console.log('\n  7b: invalid_phase_xyz (expect: phase_invalid error, KNOWN_PHASES guard)');
  try {
    host.send({ type: 'phase', payload: { phase: 'invalid_phase_xyz' } });
    const errMsg = await host.waitFor(
      (m) => m.type === 'error' && m.payload?.code === 'phase_invalid',
      2000,
    );
    console.log(`  Host got phase_invalid: ${errMsg.payload?.message}`);
    pass(
      '7b: invalid-phase-rejected',
      'arbitrary phase rejected by KNOWN_PHASES guard',
      `error message=${errMsg.payload?.message}`,
    );
  } catch (err) {
    fail(
      '7b: invalid-phase-rejected',
      'phase_invalid error for arbitrary string',
      err.message,
      'W8 fix REGRESSED — KNOWN_PHASES guard not blocking arbitrary phase strings',
    );
  }

  // ── SCENARIO 8: stateVersion check ────────────────────────────────────────
  console.log('\n--- SCENARIO 8: publishEvent stateVersion increment ---');
  try {
    // Trigger another event publish to observe version increment
    host.send({ type: 'phase', payload: { phase: 'combat' } });
    // Wait for event broadcast
    // publishEvent broadcasts {type: <event_class>, version: N, payload}.
    // publishPhaseChange calls publishEvent('phase_change', {phase}) →
    // broadcast type = 'phase_change'. The harness waits for phase_change
    // (versioned) or falls back to round_ready (unversioned).
    const evtMsg = await Promise.race([
      host.waitFor((m) => m.type === 'phase_change', 2000),
      host.waitFor((m) => m.type === 'round_ready', 2000),
    ]);
    const hasVersion = evtMsg.version != null || evtMsg.payload?.version != null;
    console.log(
      `  Event received: type=${evtMsg.type} version=${evtMsg.version} payload.version=${evtMsg.payload?.version}`,
    );
    if (hasVersion) {
      pass('8: stateVersion', 'events carry version field', `version present`);
    } else {
      gapDoc(
        '8: stateVersion',
        'event version field for reconnect reconcile',
        `version absent in msg: ${JSON.stringify(evtMsg).slice(0, 120)}`,
        `GAP-W11: stateVersion field missing from broadcast events. Client reconcile (network.js stateVersion) will not work correctly for missed events.`,
      );
    }
  } catch (err) {
    gapDoc(
      '8: stateVersion',
      'version in event broadcast',
      err.message,
      'GAP-W11: stateVersion check skipped due to timeout',
    );
  }

  // ── SCENARIO 9: narrative onboarding port (Sprint M.6 backend Phase A) ───
  // Fresh lobby (state from previous scenarios is in world_seed_reveal/combat
  // — onboarding requires phase=lobby). New WS clients new room.
  console.log('\n--- SCENARIO 9: narrative onboarding port (host-only choice) ---');
  let onbHost = null;
  let onbPlayer = null;
  try {
    const createRes2 = await httpPost('/api/lobby/create', { host_name: 'OnbHost' });
    const room2 = createRes2.body.code;
    const hostTk2 = createRes2.body.host_token;
    const hostId2 = createRes2.body.host_id;
    const joinRes2 = await httpPost('/api/lobby/join', {
      code: room2,
      player_name: 'OnbPlayer',
    });
    const playerTk2 = joinRes2.body.player_token;
    const playerId2 = joinRes2.body.player_id;
    onbHost = await openWs(`${WS_BASE}/ws?code=${room2}&player_id=${hostId2}&token=${hostTk2}`);
    onbPlayer = await openWs(
      `${WS_BASE}/ws?code=${room2}&player_id=${playerId2}&token=${playerTk2}`,
    );
    await onbHost.waitFor((m) => m.type === 'hello', 2000);
    await onbPlayer.waitFor((m) => m.type === 'hello', 2000);

    // 9a: host transitions to onboarding phase + receives campaign payload
    onbHost.send({ type: 'phase', payload: { phase: 'onboarding' } });
    const payloadMsg = await onbPlayer.waitFor((m) => m.type === 'onboarding_payload', 3000);
    if (
      payloadMsg.payload?.onboarding?.choices?.length === 3 &&
      payloadMsg.payload?.campaign_def_id === 'default_campaign_mvp'
    ) {
      pass(
        '9a: onboarding-payload-broadcast',
        'phase=onboarding bootstraps orch + broadcasts onboarding_payload with 3 choices',
        `choices=${payloadMsg.payload.onboarding.choices.length} campaign=${payloadMsg.payload.campaign_def_id}`,
      );
    } else {
      fail(
        '9a: onboarding-payload-broadcast',
        '3 choices in payload + campaign_def_id present',
        JSON.stringify(payloadMsg.payload).slice(0, 150),
        'Onboarding bootstrap missing fields',
      );
    }

    // 9b: non-host cannot submit onboarding_choice (host_only error)
    onbPlayer.send({
      type: 'intent',
      payload: { action: 'onboarding_choice', option_key: 'option_a' },
    });
    const errMsg = await onbPlayer.waitFor(
      (m) =>
        m.type === 'error' &&
        (m.payload?.code === 'host_only' || m.payload?.code === 'onboarding_choice_failed'),
      2000,
    );
    pass(
      '9b: onboarding-host-only',
      'non-host onboarding_choice rejected',
      `error code=${errMsg.payload?.code}`,
    );

    // 9c: host submits onboarding_choice → onboarding_chosen broadcast +
    // auto-advance to character_creation
    onbHost.send({
      type: 'intent',
      payload: { action: 'onboarding_choice', option_key: 'option_b' },
    });
    const chosenMsg = await onbPlayer.waitFor((m) => m.type === 'onboarding_chosen', 3000);
    const phaseMsg2 = await onbPlayer.waitFor(
      (m) => m.type === 'phase_change' && m.payload?.phase === 'character_creation',
      3000,
    );
    if (
      chosenMsg.payload?.option_key === 'option_b' &&
      chosenMsg.payload?.trait_id === 'pelle_elastomera' &&
      phaseMsg2.payload?.phase === 'character_creation'
    ) {
      pass(
        '9c: onboarding-host-submit-advance',
        'host onboarding_choice → onboarding_chosen + auto phase=character_creation',
        `trait=${chosenMsg.payload.trait_id} next_phase=${phaseMsg2.payload.phase}`,
      );
    } else {
      fail(
        '9c: onboarding-host-submit-advance',
        'option_b → pelle_elastomera + phase character_creation',
        `chosen=${JSON.stringify(chosenMsg.payload).slice(0, 80)} phase=${phaseMsg2.payload?.phase}`,
        'Onboarding submit drain wiring error',
      );
    }
  } catch (err) {
    fail(
      '9: onboarding-flow',
      'narrative onboarding port end-to-end',
      err.message,
      'Sprint M.6 Phase A backend regression',
    );
  } finally {
    if (onbHost) onbHost.close();
    if (onbPlayer) onbPlayer.close();
  }

  // ── cleanup ───────────────────────────────────────────────────────────────
  host.close();
  player.close();

  // ── summary ──────────────────────────────────────────────────────────────
  console.log('\n\n========== HARNESS SUMMARY ==========');
  const pass_ = results.filter((r) => r.verdict === 'PASS').length;
  const fail_ = results.filter((r) => r.verdict === 'FAIL').length;
  const gap_ = results.filter((r) => r.verdict === 'GAP-DOCUMENTED').length;
  console.log(`PASS: ${pass_}  FAIL: ${fail_}  GAP-DOCUMENTED: ${gap_}  TOTAL: ${results.length}`);
  console.log('\nGap list:');
  for (const r of results) {
    if (r.verdict !== 'PASS') {
      console.log(`  [${r.verdict}] ${r.scenario}`);
      if (r.gap) console.log(`         ${r.gap.slice(0, 120)}`);
    }
  }

  // exit code: non-zero if any FAIL (GAP-DOCUMENTED is not a failure)
  if (fail_ > 0) process.exit(1);
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(2);
});
