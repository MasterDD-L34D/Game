import { test, expect, type Page } from '@playwright/test';
import WebSocket from 'ws';

// Phone WS multi-client phase-flow smoke (Tier 1 functional gate
// 2026-05-07 cutover handoff).
//
// Drives full phase machine via raw WS clients (1 host + 1 player) to
// catch B5–B10 regression bundle without requiring master-dd hardware
// retry. Replaces the canvas-driven hardware loop as the autonomous
// functional gate.
//
// Phase flow exercised:
//   lobby
//   → onboarding (host single-choice identity)
//   → character_creation (player submits PG)
//   → world_setup
//   → combat
//   → debrief
//   → next_macro retreat → ended
//
// Asserts:
//   1. NO `error/unknown_type` toast for ANY broadcast event observed
//      across either socket (B6/B9/B10 regression).
//   2. `phase_change` versioned event reaches BOTH host + player on
//      every transition with monotonic `version` field (B5).
//   3. Host preserved (host_id + role=host) after onboarding /
//      character_creation transitions (B7).
//   4. Player non-host transitions exit lobby → onboarding then arrive
//      at character_creation (B8).
//   5. `world_tally` broadcast handled cleanly when player votes
//      world_setup (B9).
//   6. `world_vote_accepted` ACK reaches voter only (host phone path
//      stays clean of unknown_type) (B10).
//
// Cross-ref:
//   - tests/api/phaseChangeBroadcast.test.js  (B5 11 test, WS shape)
//   - tools/ts/tests/playwright/phone/phone-multi.spec.ts (REST baseline)
//   - apps/backend/services/network/wsSession.js (wsSession + KNOWN_PHASES)
//   - apps/backend/services/coop/coopOrchestrator.js (PHASES + transitions)
//   - docs/playtest/2026-05-05-phone-smoke-results.md

const PHONE_PATH = '/phone/';
const DEFAULT_AWAIT_MS = 5_000;

type LobbyCreateResponse = {
  code: string;
  host_id: string;
  host_token: string;
  campaign_id: string | null;
  max_players: number;
};

type LobbyJoinResponse = {
  player_id: string;
  player_token: string;
};

type WsMessage = {
  type: string;
  payload?: any;
  version?: number;
  ts?: number;
};

interface WsHandle {
  ws: WebSocket;
  buf: WsMessage[];
  errors: WsMessage[];
  /** Wait for a message matching predicate; rejects on timeout. */
  waitFor: (predicate: (m: WsMessage) => boolean, timeoutMs?: number) => Promise<WsMessage>;
  /** Resolves after the WS handshake completes. */
  ready: Promise<void>;
  send: (msg: any) => void;
  close: () => void;
}

async function createLobby(page: Page, hostName: string): Promise<LobbyCreateResponse> {
  const response = await page.request.post('/api/lobby/create', {
    data: { host_name: hostName },
    headers: { 'Content-Type': 'application/json' },
  });
  expect(response.ok(), `lobby create failed: ${response.status()}`).toBeTruthy();
  return (await response.json()) as LobbyCreateResponse;
}

async function joinLobby(page: Page, code: string, playerName: string): Promise<LobbyJoinResponse> {
  const response = await page.request.post('/api/lobby/join', {
    data: { code, player_name: playerName },
    headers: { 'Content-Type': 'application/json' },
  });
  expect(response.ok(), `lobby join failed: ${response.status()}`).toBeTruthy();
  return (await response.json()) as LobbyJoinResponse;
}

function deriveWsBase(httpBase: string): string {
  // Default Playwright baseURL is http://localhost:3334 — phone HTML5
  // is served from same Express server with LOBBY_WS_SHARED=true on
  // path /ws, so just swap protocol.
  if (httpBase.startsWith('https://')) return 'wss://' + httpBase.slice('https://'.length);
  if (httpBase.startsWith('http://')) return 'ws://' + httpBase.slice('http://'.length);
  return httpBase;
}

function openWs(
  baseUrl: string,
  params: { code: string; player_id: string; token: string },
): WsHandle {
  const wsBase = deriveWsBase(baseUrl);
  const url =
    wsBase.replace(/\/$/, '') +
    `/ws?code=${encodeURIComponent(params.code)}&player_id=${encodeURIComponent(params.player_id)}&token=${encodeURIComponent(params.token)}`;
  const ws = new WebSocket(url);
  const buf: WsMessage[] = [];
  const errors: WsMessage[] = [];
  const waiters: Array<{
    predicate: (m: WsMessage) => boolean;
    resolve: (m: WsMessage) => void;
    reject: (e: Error) => void;
  }> = [];

  ws.on('message', (raw) => {
    let msg: WsMessage | null = null;
    try {
      msg = JSON.parse(raw.toString()) as WsMessage;
    } catch {
      return;
    }
    if (!msg || typeof msg.type !== 'string') return;
    buf.push(msg);
    if (msg.type === 'error') {
      errors.push(msg);
    }
    for (const w of waiters.slice()) {
      if (w.predicate(msg)) {
        const idx = waiters.indexOf(w);
        if (idx >= 0) waiters.splice(idx, 1);
        w.resolve(msg);
      }
    }
  });

  const ready = new Promise<void>((resolve, reject) => {
    ws.once('open', () => resolve());
    ws.once('error', (err) => reject(err));
  });

  function waitFor(
    predicate: (m: WsMessage) => boolean,
    timeoutMs: number = DEFAULT_AWAIT_MS,
  ): Promise<WsMessage> {
    for (const m of buf) {
      if (predicate(m)) return Promise.resolve(m);
    }
    return new Promise((resolve, reject) => {
      const waiter = { predicate, resolve, reject };
      const timer = setTimeout(() => {
        const idx = waiters.indexOf(waiter);
        if (idx >= 0) waiters.splice(idx, 1);
        reject(
          new Error(
            `timeout waiting for ws message (${timeoutMs}ms). Recent buf: ` +
              JSON.stringify(buf.slice(-5).map((m) => m.type)),
          ),
        );
      }, timeoutMs);
      waiter.resolve = (m: WsMessage | PromiseLike<WsMessage>) => {
        clearTimeout(timer);
        resolve(m);
      };
      waiters.push(waiter);
    });
  }

  function send(msg: any): void {
    ws.send(JSON.stringify(msg));
  }

  function close(): void {
    try {
      ws.close();
    } catch {
      // noop
    }
  }

  return { ws, buf, errors, waitFor, ready, send, close };
}

async function setupRoom(
  page: Page,
  baseUrl: string,
  opts: { extraPlayers?: number } = {},
): Promise<{
  lobby: LobbyCreateResponse;
  joined: LobbyJoinResponse;
  extras: Array<{ joined: LobbyJoinResponse; ws: WsHandle }>;
  hostWs: WsHandle;
  playerWs: WsHandle;
}> {
  const lobby = await createLobby(page, 'PWHostFlow');
  const joined = await joinLobby(page, lobby.code, 'PWPlayerFlow');
  const extras: Array<{ joined: LobbyJoinResponse; ws: WsHandle }> = [];
  for (let i = 0; i < (opts.extraPlayers || 0); i += 1) {
    const ej = await joinLobby(page, lobby.code, `PWPlayerExtra${i + 1}`);
    extras.push({
      joined: ej,
      ws: openWs(baseUrl, {
        code: lobby.code,
        player_id: ej.player_id,
        token: ej.player_token,
      }),
    });
  }
  const hostWs = openWs(baseUrl, {
    code: lobby.code,
    player_id: lobby.host_id,
    token: lobby.host_token,
  });
  const playerWs = openWs(baseUrl, {
    code: lobby.code,
    player_id: joined.player_id,
    token: joined.player_token,
  });
  await Promise.all([hostWs.ready, playerWs.ready, ...extras.map((e) => e.ws.ready)]);
  // Drain initial hello on every socket.
  await Promise.all([
    hostWs.waitFor((m) => m.type === 'hello'),
    playerWs.waitFor((m) => m.type === 'hello'),
    ...extras.map((e) => e.ws.waitFor((m) => m.type === 'hello')),
  ]);
  return { lobby, joined, extras, hostWs, playerWs };
}

function assertNoUnknownType(handle: WsHandle, label: string): void {
  const offenders = handle.errors.filter(
    (e) => e?.payload?.code === 'unknown_type' || e?.payload?.message === 'unknown_type',
  );
  expect(
    offenders,
    `${label}: unknown_type errors observed. payloads=` + JSON.stringify(offenders),
  ).toEqual([]);
}

function getBaseUrl(page: Page): string {
  // Playwright populates baseURL via use.baseURL config. page.context().request
  // doesn't expose it directly, so derive from the current page URL.
  const base = page.url();
  // page.url() may be 'about:blank' before navigation — fall back to env.
  if (base && base.startsWith('http')) {
    const u = new URL(base);
    return `${u.protocol}//${u.host}`;
  }
  return process.env.PHONE_BASE_URL || 'http://localhost:3334';
}

test.describe('phone smoke — WS phase-flow multi-client', () => {
  test('B5 + B7: host phase=onboarding broadcasts versioned phase_change to all peers', async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(PHONE_PATH, { waitUntil: 'domcontentloaded' });
    const base = getBaseUrl(page);

    const { lobby, hostWs, playerWs } = await setupRoom(page, base);

    try {
      hostWs.send({ type: 'phase', payload: { phase: 'onboarding' } });
      const [hostMsg, playerMsg] = await Promise.all([
        hostWs.waitFor((m) => m.type === 'phase_change' && m.payload?.phase === 'onboarding'),
        playerWs.waitFor((m) => m.type === 'phase_change' && m.payload?.phase === 'onboarding'),
      ]);

      // B5: versioned event with monotonic numeric version.
      expect(typeof hostMsg.version, 'phase_change must carry numeric version').toBe('number');
      expect(hostMsg.version!).toBeGreaterThanOrEqual(1);
      expect(hostMsg.version, 'broadcast atomicity: host == player version').toBe(
        playerMsg.version,
      );

      // B7: host preserved post-onboarding (room snapshot via REST).
      const list = await page.request.get('/api/lobby/list');
      const json = (await list.json()) as {
        rooms: Array<{
          code: string;
          host_id: string;
          players: Array<{ id: string; role: string }>;
        }>;
      };
      const room = json.rooms.find((r) => r.code === lobby.code);
      expect(room, 'room visible post-onboarding').toBeDefined();
      expect(room!.host_id, 'B7: host_id preserved').toBe(lobby.host_id);
      const hostPlayer = room!.players.find((p) => p.id === lobby.host_id);
      expect(hostPlayer!.role, 'B7: host role preserved').toBe('host');

      assertNoUnknownType(hostWs, 'host (B5+B7)');
      assertNoUnknownType(playerWs, 'player (B5+B7)');
    } finally {
      hostWs.close();
      playerWs.close();
      await ctx.close();
    }
  });

  test('B5 + B8: full phase advance lobby → character_creation → world_setup, host preserved, player exits lobby cleanly', async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(PHONE_PATH, { waitUntil: 'domcontentloaded' });
    const base = getBaseUrl(page);

    const { lobby, joined, hostWs, playerWs } = await setupRoom(page, base);

    try {
      // 1. Host transitions to character_creation (skips onboarding for
      //    simpler flow; bootstraps coopOrchestrator inline per FU4).
      hostWs.send({ type: 'phase', payload: { phase: 'character_creation' } });
      const ccHost = await hostWs.waitFor(
        (m) => m.type === 'phase_change' && m.payload?.phase === 'character_creation',
      );
      const ccPlayer = await playerWs.waitFor(
        (m) => m.type === 'phase_change' && m.payload?.phase === 'character_creation',
      );
      expect(ccHost.version, 'monotonic across peers').toBe(ccPlayer.version);

      // 2. Player submits character → ACK received. Note: wsSession's
      //    `intent character_create` path passes ALL room player ids
      //    (including host) as `allPlayerIds`, so a single-player room
      //    has expected.size=2 and orch stays in character_creation
      //    until host also "submits" — which the phone-only flow never
      //    does. This is by design (host = arbiter). Phase transition
      //    to world_setup is driven by the host's `phase` msg.
      playerWs.send({
        type: 'intent',
        payload: {
          action: 'character_create',
          name: 'Skiv',
          species_id: 'dune_stalker',
          form_id: 'form_dune_stalker',
          job_id: 'guerriero',
        },
      });
      const ack = await playerWs.waitFor((m) => m.type === 'character_accepted');
      expect(ack.payload?.spec?.player_id, 'character spec carries player_id').toBe(
        joined.player_id,
      );
      expect(ack.payload?.spec?.form_id, 'innata trait grant + form_id preserved').toBe(
        'form_dune_stalker',
      );

      // 3. Host drives phase=world_setup explicitly (canonical phone
      //    flow per FU4: host owns phase transitions via WS `phase` msg).
      hostWs.send({ type: 'phase', payload: { phase: 'world_setup' } });
      const wsHost = await hostWs.waitFor(
        (m) => m.type === 'phase_change' && m.payload?.phase === 'world_setup',
      );
      const wsPlayer = await playerWs.waitFor(
        (m) => m.type === 'phase_change' && m.payload?.phase === 'world_setup',
      );

      // B5 monotonic across both transitions:
      expect(wsHost.version!).toBeGreaterThan(ccHost.version!);
      expect(wsHost.version).toBe(wsPlayer.version);

      // B8: player exits lobby — phone composer event_received subscribes
      // to phase_change and swap_mode. From the spec POV we assert both
      // transitions reached the player socket without error.
      assertNoUnknownType(hostWs, 'host (B5+B8 flow)');
      assertNoUnknownType(playerWs, 'player (B5+B8 flow)');

      // B7 again: host_id preserved post-character_creation transition.
      const list = await page.request.get('/api/lobby/list');
      const json = (await list.json()) as {
        rooms: Array<{ code: string; host_id: string }>;
      };
      const room = json.rooms.find((r) => r.code === lobby.code);
      expect(room!.host_id, 'B7: host_id preserved post-character_creation').toBe(lobby.host_id);
    } finally {
      hostWs.close();
      playerWs.close();
      await ctx.close();
    }
  });

  test('B9 + B10: world_tally broadcast on player vote + world_vote_accepted ACK to voter only (no unknown_type on host)', async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(PHONE_PATH, { waitUntil: 'domcontentloaded' });
    const base = getBaseUrl(page);

    const { lobby, hostWs, playerWs } = await setupRoom(page, base);

    try {
      // Drive: lobby → character_creation → submit char → world_setup.
      hostWs.send({ type: 'phase', payload: { phase: 'character_creation' } });
      await playerWs.waitFor(
        (m) => m.type === 'phase_change' && m.payload?.phase === 'character_creation',
      );
      playerWs.send({
        type: 'intent',
        payload: {
          action: 'character_create',
          name: 'Skiv',
          species_id: 'dune_stalker',
          form_id: 'form_dune_stalker',
          job_id: 'guerriero',
        },
      });
      await playerWs.waitFor((m) => m.type === 'character_accepted');

      // Force-advance orch from character_creation → world_setup via
      // host-only REST escape hatch (F-2 2026-04-25). Required because
      // wsSession's `intent character_create` path uses room player ids
      // (including host) as allPlayerIds, so 1-player rooms cannot
      // auto-advance via submitCharacter alone (host = arbiter, never
      // submits a character). Mirrors the host phone composer behavior
      // when player count < expected and master-dd hits "Force advance".
      const advanceRes = await page.request.post('/api/coop/run/force-advance', {
        data: { code: lobby.code, host_token: lobby.host_token, reason: 'pw_smoke' },
        headers: { 'Content-Type': 'application/json' },
      });
      expect(advanceRes.ok(), 'force-advance must succeed').toBeTruthy();
      // force-advance does broadcastCoopState which sends `phase_change`
      // type=phase_change with payload.phase but NO version field
      // (broadcasted via room.broadcast, not publishPhaseChange).
      // Drain it from both sockets to keep buf clean.
      await playerWs.waitFor(
        (m) => m.type === 'phase_change' && m.payload?.phase === 'world_setup',
      );

      // Codex P2: drain pre-vote world_tally from both bufs. force-advance →
      // broadcastCoopState emits world_tally on phase=world_setup transition
      // (apps/backend/routes/coop.js:43-59). Without drain, waitFor below
      // would match the stale phase-entry tally (no voter list) instead of
      // the post-vote tally. Regression where vote stops broadcasting tally
      // would still pass the predicate. Drain ensures we assert ONLY the
      // tally generated by the world_vote intent.
      hostWs.buf.splice(
        0,
        hostWs.buf.length,
        ...hostWs.buf.filter((m) => m.type !== 'world_tally'),
      );
      playerWs.buf.splice(
        0,
        playerWs.buf.length,
        ...playerWs.buf.filter((m) => m.type !== 'world_tally'),
      );

      // Player votes world setup. Should:
      //   1. Broadcast `world_tally` to ALL peers (B9).
      //   2. Emit `world_vote_accepted` ACK directly to voter only (B10).
      const scenarioId = 'enc_tutorial_01';
      playerWs.send({
        type: 'intent',
        payload: {
          action: 'world_vote',
          scenario_id: scenarioId,
          choice: 'accept',
        },
      });

      // B9: BOTH peers must see world_tally broadcast (post-vote, drained).
      const [hostTally, playerTally] = await Promise.all([
        hostWs.waitFor((m) => m.type === 'world_tally'),
        playerWs.waitFor((m) => m.type === 'world_tally'),
      ]);
      expect(hostTally.payload, 'host sees tally payload').toBeDefined();
      expect(playerTally.payload, 'player sees tally payload').toBeDefined();

      // B10: voter (player) gets `world_vote_accepted` ACK; host does
      // NOT receive it as ACK is targeted (socket.send vs broadcast).
      const ack = await playerWs.waitFor((m) => m.type === 'world_vote_accepted');
      expect(ack.payload?.tally, 'ACK carries tally snapshot').toBeDefined();

      // Codex P2: explicit host-side negative assertion. If server regresses
      // from socket.send → broadcast for ACK, host would also see it but
      // current spec would still pass (only player wait succeeds). Drain
      // window: sleep 250ms post-player-ACK to let any erroneous host ACK
      // arrive, then assert host buf is clean of `world_vote_accepted`.
      await new Promise((r) => setTimeout(r, 250));
      expect(
        hostWs.buf.some((m) => m.type === 'world_vote_accepted'),
        'host MUST NOT receive world_vote_accepted (targeted ACK only)',
      ).toBe(false);

      // Crucial: host phone path receives world_tally without an
      // unknown_type error chaser. Pre-fix Godot host emitted toast on
      // world_tally because composer didn't recognize the type.
      // From server side we can only assert no `error/unknown_type` was
      // pushed back — phone-side composer mapping is covered by the
      // companion phone-multi.spec.ts + Godot smoke.
      assertNoUnknownType(hostWs, 'host (B9+B10)');
      assertNoUnknownType(playerWs, 'player (B9+B10)');
    } finally {
      hostWs.close();
      playerWs.close();
      await ctx.close();
    }
  });

  test('B5 monotonic version across 3 transitions (lobby → char_creation → world_setup → combat)', async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(PHONE_PATH, { waitUntil: 'domcontentloaded' });
    const base = getBaseUrl(page);

    const { hostWs, playerWs } = await setupRoom(page, base);

    try {
      const versions: number[] = [];
      const phaseSeq = ['character_creation', 'world_setup', 'combat'];
      for (const phase of phaseSeq) {
        hostWs.send({ type: 'phase', payload: { phase } });
        const msg = await playerWs.waitFor(
          (m) => m.type === 'phase_change' && m.payload?.phase === phase,
        );
        expect(typeof msg.version).toBe('number');
        versions.push(msg.version!);
      }
      for (let i = 1; i < versions.length; i += 1) {
        expect(
          versions[i],
          `monotonic violation: v[${i}]=${versions[i]} <= v[${i - 1}]=${versions[i - 1]}`,
        ).toBeGreaterThan(versions[i - 1]);
      }

      assertNoUnknownType(hostWs, 'host (monotonic)');
      assertNoUnknownType(playerWs, 'player (monotonic)');
    } finally {
      hostWs.close();
      playerWs.close();
      await ctx.close();
    }
  });

  test('B6 regression guard: unrecognized intent action does NOT trigger unknown_type on bystanders', async ({
    browser,
  }) => {
    // B6 forensic: pre-fix any non-host intent in non-planning phase
    // returned `error/unknown_type` to sender AND the host phone displayed
    // the same code via misrouted toast. This test asserts that an
    // unrecognized lifecycle intent (e.g. fabricated action name) is at
    // worst rejected on the SENDER socket and NEVER reaches bystander
    // (host) as an unknown_type error.
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(PHONE_PATH, { waitUntil: 'domcontentloaded' });
    const base = getBaseUrl(page);

    const { hostWs, playerWs } = await setupRoom(page, base);

    try {
      // Move to character_creation (legitimate phase).
      hostWs.send({ type: 'phase', payload: { phase: 'character_creation' } });
      await playerWs.waitFor(
        (m) => m.type === 'phase_change' && m.payload?.phase === 'character_creation',
      );

      // Player sends a fabricated intent action. Server defensive
      // fallback (line ~1599-1600 wsSession.js) calls pushIntent which
      // relays to host as `intent` payload — NOT as unknown_type error.
      playerWs.send({
        type: 'intent',
        payload: { action: 'fabricated_action_zzz_b6_guard' },
      });

      // Allow event loop tick for any error chasers.
      await new Promise((r) => setTimeout(r, 200));

      // B6: host MUST NOT see unknown_type. (Sender may or may not — we
      // assert the bystander invariant which is the regression target.)
      assertNoUnknownType(hostWs, 'host (B6 fabricated action bystander)');

      // Also: a TOP-level unknown msg.type should still emit unknown_type
      // to the SENDER but never broadcast it. Verify the sender path.
      playerWs.send({ type: 'b6_fake_top_level_zzz', payload: {} });
      const senderErr = await playerWs.waitFor(
        (m) => m.type === 'error' && m.payload?.code === 'unknown_type',
      );
      expect(senderErr.payload?.code).toBe('unknown_type');

      // Host still sees no unknown_type after sender's bogus top-level msg.
      await new Promise((r) => setTimeout(r, 100));
      assertNoUnknownType(hostWs, 'host (B6 top-level bogus)');
    } finally {
      hostWs.close();
      playerWs.close();
      await ctx.close();
    }
  });

  test('B5 boundary: invalid phase rejected with phase_invalid (no broadcast leak)', async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(PHONE_PATH, { waitUntil: 'domcontentloaded' });
    const base = getBaseUrl(page);

    const { hostWs, playerWs } = await setupRoom(page, base);

    try {
      // Sniff player for any spurious phase_change.
      let leaked = false;
      const sniffer = (m: WsMessage) => {
        if (m.type === 'phase_change' && m.payload?.phase === 'bogus_phase_b5_zzz') {
          leaked = true;
        }
      };
      playerWs.ws.on('message', (raw) => {
        try {
          sniffer(JSON.parse(raw.toString()));
        } catch {
          // noop
        }
      });

      hostWs.send({ type: 'phase', payload: { phase: 'bogus_phase_b5_zzz' } });
      const err = await hostWs.waitFor(
        (m) => m.type === 'error' && m.payload?.code === 'phase_invalid',
      );
      expect(err.payload?.message, 'error mentions phase_not_whitelisted').toMatch(
        /phase_not_whitelisted/,
      );

      await new Promise((r) => setTimeout(r, 100));
      expect(leaked, 'invalid phase MUST NOT broadcast').toBe(false);
      assertNoUnknownType(playerWs, 'player (B5 invalid phase)');
    } finally {
      hostWs.close();
      playerWs.close();
      await ctx.close();
    }
  });

  test('Combat → debrief → ended e2e: endCombat REST + next_macro retreat closes run', async ({
    browser,
  }) => {
    // Closes ~20% Tier 1 coverage gap flagged by phase-flow-ws spec author.
    // Validates full lifecycle tail: combat phase → host POST /api/coop/combat/end
    // (broadcastCoopState debrief) → host WS intent next_macro retreat →
    // orch.submitNextMacro → next_macro_committed broadcast + next_macro_accepted
    // ACK host-only + publishPhaseChange('ended') versioned.
    //
    // Pre-fix W7 (phone smoke 2026-05-06) phone host emitted next_macro
    // intent + Godot host silent drop, run stuck post-debrief. wsSession
    // line 1554-1596 added server-side drain. This spec locks the contract.
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(PHONE_PATH, { waitUntil: 'domcontentloaded' });
    const base = getBaseUrl(page);

    const { lobby, hostWs, playerWs } = await setupRoom(page, base);

    try {
      // Advance orch state machine via REST (NOT WS phase intents — those
      // only update room.publishPhaseChange broadcast layer, NOT
      // coopOrchestrator.phase). Sequence required for endCombat (which
      // throws `not_in_combat` if orch.phase !== 'combat'):
      //   1. WS phase=character_creation auto-bootstraps orch via
      //      coopStore.getOrCreate + orch.startRun (line 1650-1655 wsSession.js)
      //   2. force-advance: character_creation → world_setup
      //   3. world/confirm: world_setup → combat (orch._setPhase line 314)
      //   4. combat/end: combat → debrief
      hostWs.send({ type: 'phase', payload: { phase: 'character_creation' } });
      await playerWs.waitFor(
        (m) => m.type === 'phase_change' && m.payload?.phase === 'character_creation',
      );

      const advRes = await page.request.post('/api/coop/run/force-advance', {
        data: { code: lobby.code, host_token: lobby.host_token, reason: 'pw_smoke_e2e' },
        headers: { 'Content-Type': 'application/json' },
      });
      expect(advRes.ok(), 'force-advance char_creation→world_setup').toBeTruthy();

      const confirmRes = await page.request.post('/api/coop/world/confirm', {
        data: {
          code: lobby.code,
          host_token: lobby.host_token,
          scenario_id: 'enc_tutorial_01',
        },
        headers: { 'Content-Type': 'application/json' },
      });
      expect(confirmRes.ok(), 'world/confirm world_setup→combat').toBeTruthy();
      // Drain phase_change broadcasts from advance + confirm
      await playerWs.waitFor(
        (m) => m.type === 'phase_change' && m.payload?.phase === 'combat',
      );

      // Combat → debrief via REST host-only (apps/backend/routes/coop.js:247).
      const endRes = await page.request.post('/api/coop/combat/end', {
        data: {
          code: lobby.code,
          host_token: lobby.host_token,
          outcome: 'victory',
          xp_earned: 50,
        },
        headers: { 'Content-Type': 'application/json' },
      });
      expect(endRes.ok(), 'POST /api/coop/combat/end must succeed').toBeTruthy();
      const endJson = (await endRes.json()) as { phase: string; result?: unknown };
      expect(endJson.phase, 'orch.endCombat transitions to debrief').toBe('debrief');

      // broadcastCoopState path (room.broadcast type=phase_change, NO version)
      // — verify both peers see the debrief phase entry.
      await Promise.all([
        hostWs.waitFor(
          (m) => m.type === 'phase_change' && m.payload?.phase === 'debrief',
        ),
        playerWs.waitFor(
          (m) => m.type === 'phase_change' && m.payload?.phase === 'debrief',
        ),
      ]);

      // Drain pre-end next_macro_accepted noise if any (defensive).
      hostWs.buf.splice(
        0,
        hostWs.buf.length,
        ...hostWs.buf.filter(
          (m) => m.type !== 'next_macro_committed' && m.type !== 'next_macro_accepted',
        ),
      );
      playerWs.buf.splice(
        0,
        playerWs.buf.length,
        ...playerWs.buf.filter(
          (m) => m.type !== 'next_macro_committed' && m.type !== 'next_macro_accepted',
        ),
      );

      // Host commits next_macro retreat → run ends. wsSession line 1554-1596:
      //   1. orch.submitNextMacro({choice:'retreat'}) → phase='ended'
      //   2. room.broadcast next_macro_committed (ALL peers)
      //   3. socket.send next_macro_accepted (host ONLY, targeted ACK)
      //   4. room.publishPhaseChange('ended') (versioned event)
      hostWs.send({
        type: 'intent',
        payload: { action: 'next_macro', choice: 'retreat' },
      });

      // 1+2: BOTH peers receive next_macro_committed (broadcast).
      const [hostCommit, playerCommit] = await Promise.all([
        hostWs.waitFor((m) => m.type === 'next_macro_committed'),
        playerWs.waitFor((m) => m.type === 'next_macro_committed'),
      ]);
      expect(hostCommit.payload?.choice, 'commit choice = retreat').toBe('retreat');
      expect(playerCommit.payload?.phase, 'commit announces phase=ended').toBe('ended');

      // 3: host receives next_macro_accepted ACK targeted (socket.send).
      const ack = await hostWs.waitFor((m) => m.type === 'next_macro_accepted');
      expect(ack.payload?.choice).toBe('retreat');
      expect(ack.payload?.phase).toBe('ended');

      // Negative: player MUST NOT receive ACK (regression catch if server
      // changes socket.send → broadcast for ACK).
      await new Promise((r) => setTimeout(r, 250));
      expect(
        playerWs.buf.some((m) => m.type === 'next_macro_accepted'),
        'player MUST NOT receive next_macro_accepted (host-only ACK)',
      ).toBe(false);

      // 4: versioned phase_change('ended') broadcast.
      await playerWs.waitFor(
        (m) =>
          m.type === 'phase_change' &&
          m.payload?.phase === 'ended' &&
          typeof m.version === 'number',
      );

      // No stray unknown_type cascade from any combat→debrief→ended event.
      assertNoUnknownType(hostWs, 'host (combat→debrief→ended)');
      assertNoUnknownType(playerWs, 'player (combat→debrief→ended)');
    } finally {
      hostWs.close();
      playerWs.close();
      await ctx.close();
    }
  });

  // Iter3 hardware-equivalent agent + browser smoke (post ADR-2026-05-05
  // ACCEPTED Phase A 2026-05-07). Replicates 3 master-dd hardware checklist
  // items at functional layer with documented fidelity gaps:
  //
  //   Item 1 RTT cross-device WAN:    ~80% fidelity (env-gated TUNNEL_URL)
  //   Item 2 Combat 5R p95 mobile:    ~70% fidelity (WS RTT proxy)
  //   Item 3 Airplane 30s reconnect:  ~90% fidelity (WS close/reopen within grace)
  //
  // Physical residue not covered: LTE-vs-WiFi delta, touch capacitive sensor,
  // iOS Safari render path, OS-level airplane vs browser-level network kill.
  //
  // Cross-ref:
  //   - docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md §3 trigger 3
  //   - docs/playtest/2026-05-07-master-dd-validation-10min-checklist.md
  //   - docs/playtest/AGENT_DRIVEN_WORKFLOW.md Pattern A/B
  //   - docs/planning/2026-05-07-cutover-handoff-alternative-qa.md (philosophy)

  test('Iter3 item 3 — host disconnect+reconnect within 90s grace preserves host_id', async ({
    browser,
  }) => {
    // Simulates airplane mode 30s by closing host WS, waiting, reopening
    // with same host_token. Within DEFAULT_HOST_TRANSFER_GRACE_MS (90s)
    // host preserved, no host_transferred fired, room.closed stays false.
    //
    // Fidelity: ~90% — WS-layer close-reopen exercises identical reconnect
    // codepath as mobile browser tab background OS network kill. Residue:
    // OS-level network event ordering may differ from clean WS close.
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(PHONE_PATH, { waitUntil: 'domcontentloaded' });
    const base = getBaseUrl(page);
    const { lobby, joined, hostWs, playerWs } = await setupRoom(page, base);

    try {
      // Sanity: host preserved baseline
      const beforeList = await page.request
        .get('/api/lobby/list')
        .then((r) => r.json() as Promise<{ rooms: Array<{ code: string; closed: boolean; host_id: string }> }>);
      const beforeRoom = beforeList.rooms.find((r) => r.code === lobby.code);
      expect(beforeRoom?.closed).toBe(false);
      expect(beforeRoom?.host_id).toBe(lobby.host_id);

      // Simulate airplane: close host WS abruptly (no graceful close handshake)
      hostWs.ws.terminate();

      // Wait 30s — well within 90s grace window. Player should see
      // player_disconnected broadcast.
      const disc = await playerWs.waitFor(
        (m) => m.type === 'player_disconnected' && m.payload?.player_id === lobby.host_id,
        15_000,
      );
      expect(disc.type).toBe('player_disconnected');

      await new Promise((r) => setTimeout(r, 30_000));

      // Mid-grace state check: host_id MUST still be the original host
      const midList = await page.request
        .get('/api/lobby/list')
        .then((r) => r.json() as Promise<{ rooms: Array<{ code: string; closed: boolean; host_id: string }> }>);
      const midRoom = midList.rooms.find((r) => r.code === lobby.code);
      expect(midRoom?.closed, 'room MUST stay open during grace').toBe(false);
      expect(midRoom?.host_id, 'host preserved within 30s of 90s grace').toBe(
        lobby.host_id,
      );

      // Reconnect host WS with same token (mimics phone OS toggling airplane off)
      const reconnectedHost = openWs(base, {
        code: lobby.code,
        player_id: lobby.host_id,
        token: lobby.host_token,
      });
      try {
        await reconnectedHost.ready;
        await reconnectedHost.waitFor((m) => m.type === 'hello', 10_000);

        // Player MUST see player_connected for original host_id (reconnect signal)
        await playerWs.waitFor(
          (m) => m.type === 'player_connected' && m.payload?.player_id === lobby.host_id,
          10_000,
        );

        // Final: NO host_transferred fired during the entire window
        const transferFired = playerWs.buf.some((m) => m.type === 'host_transferred');
        expect(transferFired, 'host_transferred MUST NOT fire within grace window').toBe(
          false,
        );

        const afterList = await page.request
          .get('/api/lobby/list')
          .then((r) => r.json() as Promise<{ rooms: Array<{ code: string; closed: boolean; host_id: string }> }>);
        const afterRoom = afterList.rooms.find((r) => r.code === lobby.code);
        expect(afterRoom?.host_id, 'host_id stable post-reconnect').toBe(lobby.host_id);
      } finally {
        reconnectedHost.close();
      }
    } finally {
      hostWs.close();
      playerWs.close();
      await ctx.close();
    }
  });

  test('Iter3 item 2 — WS RTT p95 baseline (proxy for 5R combat p95)', async ({
    browser,
  }) => {
    // Sample WS roundtrip p95 via N=20 phase-change broadcast cycles.
    // Each cycle: host send `phase` intent → player receives versioned
    // `phase_change` event. Measure delta between send timestamp and recv.
    //
    // Fidelity: ~70% — captures server message processing + WS broadcast
    // latency. Does NOT capture mobile touch sensor, iOS Safari render
    // pipeline, or LTE radio wake. Real 5R combat p95 master-dd reads from
    // phone DevTools console `[telemetry] p95_ms` requires phone-side touch
    // capture. This test = SERVER-side p95 baseline; mobile multiplier
    // applied empirically from past sessions (~+30-80ms touch+render).
    //
    // Threshold: p95 < 200ms (matches master-dd CONDITIONAL gate item 2).
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(PHONE_PATH, { waitUntil: 'domcontentloaded' });
    const base = getBaseUrl(page);
    const { hostWs, playerWs } = await setupRoom(page, base);

    try {
      // Bootstrap orch via character_creation phase
      hostWs.send({ type: 'phase', payload: { phase: 'character_creation' } });
      await playerWs.waitFor(
        (m) => m.type === 'phase_change' && m.payload?.phase === 'character_creation',
      );

      // Sample N=20 phase-change cycles. Alternate world_setup ↔ character_creation
      // (both whitelisted phases, no orch state-machine side effects).
      // Drain ALL phase_change from buf before each cycle to guarantee fresh
      // RTT measurement (buf scan match would resolve instantly on stale).
      const samples: number[] = [];
      const phases = ['world_setup', 'character_creation'];
      for (let i = 0; i < 20; i += 1) {
        const phase = phases[i % phases.length]!;
        // Drain stale phase_change from BOTH bufs before send
        playerWs.buf.splice(
          0,
          playerWs.buf.length,
          ...playerWs.buf.filter((m) => m.type !== 'phase_change'),
        );
        hostWs.buf.splice(
          0,
          hostWs.buf.length,
          ...hostWs.buf.filter((m) => m.type !== 'phase_change'),
        );
        const sent = Date.now();
        hostWs.send({ type: 'phase', payload: { phase } });
        const msg = await playerWs.waitFor(
          (m) =>
            m.type === 'phase_change' &&
            m.payload?.phase === phase &&
            typeof m.version === 'number',
          5_000,
        );
        const recvDelta = Date.now() - sent;
        if (recvDelta >= 0 && msg) samples.push(recvDelta);
      }

      expect(samples.length, 'collected at least 15 valid samples').toBeGreaterThanOrEqual(
        15,
      );

      // p95 calculation
      samples.sort((a, b) => a - b);
      const p95Idx = Math.floor(samples.length * 0.95);
      const p95 = samples[p95Idx]!;
      const median = samples[Math.floor(samples.length / 2)]!;
      const max = samples[samples.length - 1]!;

      // Threshold matches master-dd CONDITIONAL gate item 2
      // PASS < 100ms / CONDITIONAL 100-200ms / ABORT > 200ms
      expect(
        p95,
        `WS RTT p95=${p95}ms median=${median}ms max=${max}ms over N=${samples.length} (server-side baseline, mobile add ~30-80ms)`,
      ).toBeLessThan(200);
    } finally {
      hostWs.close();
      playerWs.close();
      await ctx.close();
    }
  });

  test('Iter3 item 1 — Cloudflare tunnel WAN RTT (env-gated, skip if TUNNEL_URL unset)', async ({
    browser,
  }) => {
    // Item 1 cross-device RTT real WAN: master-dd checklist requires 2
    // phone over LTE → Cloudflare edge → Express :3334. Functional
    // equivalent at ~80% fidelity: 2 browser contexts via Cloudflare
    // Quick Tunnel public URL (NOT localhost). Tunnel adds geographic
    // edge hop matching real LTE flow.
    //
    // Residue ~20%: LTE radio wake latency, mobile browser TCP slow-start,
    // capacitive touch event latency. Run on real phone for last-mile
    // signal post-cutover monitoring window.
    //
    // Test gates on env: skip if PHONE_BASE_URL doesn't include
    // 'trycloudflare.com'. Run via:
    //   TARGET_URL=https://<random>.trycloudflare.com npm run test:phone:smoke
    const phoneBaseUrl = process.env.PHONE_BASE_URL || 'http://localhost:3334';
    const isTunnel = phoneBaseUrl.includes('trycloudflare.com');
    test.skip(
      !isTunnel,
      'Tunnel WAN RTT test requires PHONE_BASE_URL pointing at *.trycloudflare.com — run via deploy-quick.sh',
    );

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(PHONE_PATH, { waitUntil: 'domcontentloaded' });
    const base = getBaseUrl(page);
    const { hostWs, playerWs } = await setupRoom(page, base);

    try {
      hostWs.send({ type: 'phase', payload: { phase: 'character_creation' } });
      await playerWs.waitFor(
        (m) => m.type === 'phase_change' && m.payload?.phase === 'character_creation',
      );

      // N=10 cross-tunnel WAN samples
      const samples: number[] = [];
      const phases = ['world_setup', 'character_creation'];
      for (let i = 0; i < 10; i += 1) {
        const phase = phases[i % phases.length]!;
        const sent = Date.now();
        hostWs.send({ type: 'phase', payload: { phase } });
        const msg = await playerWs.waitFor(
          (m) => m.type === 'phase_change' && m.payload?.phase === phase,
          10_000,
        );
        const recvDelta = Date.now() - sent;
        if (recvDelta > 0) samples.push(recvDelta);
        const idx = playerWs.buf.indexOf(msg);
        if (idx >= 0) playerWs.buf.splice(idx, 1);
      }

      samples.sort((a, b) => a - b);
      const p95Idx = Math.floor(samples.length * 0.95);
      const p95 = samples[p95Idx]!;

      // CF tunnel WAN threshold: real master-dd hardware ~150-300ms.
      // Tunnel-only baseline ~50-150ms (no mobile radio wake).
      expect(
        p95,
        `Tunnel WAN RTT p95=${p95}ms over N=${samples.length}. Real phone +30-80ms touch/render + LTE radio wake.`,
      ).toBeLessThan(500);
    } finally {
      hostWs.close();
      playerWs.close();
      await ctx.close();
    }
  });
});
