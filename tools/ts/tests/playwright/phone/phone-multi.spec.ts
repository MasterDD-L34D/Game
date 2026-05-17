import { test, expect, type BrowserContext, type Page } from '@playwright/test';

// Phone multi-context smoke (Tier 1 adoption post 2026-05-07 RCA).
//
// Replaces ad-hoc 2-tab Chrome MCP dance with structured fixtures.
// Each test spawns N isolated browser contexts simulating phones,
// drives Godot HTML5 canvas via JS-side fetch + page-eval, asserts
// state machine via API curl + lobby/list snapshot.
//
// CRITICAL: Godot HTML5 canvas does NOT expose DOM — input simulation
// must use JS bridge OR direct API calls. Strategy:
//  - Lobby create/join: hit REST /api/lobby/{create,join} via page.request
//  - Phase advance: WebSocket message via JS injection
//  - Verify state: poll /api/lobby/list JSON
//
// Cross-ref:
//  - docs/playtest/AGENT_DRIVEN_WORKFLOW.md Pattern B
//  - docs/playtest/2026-05-07-phone-smoke-bundle-rca.md (B6+B7+B8 forensic)
//  - PR #205 B8 fix unit test test_phone_composer_view_nonhost_transition.gd

const PHONE_PATH = '/phone/';

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

type LobbyListResponse = {
  rooms: Array<{
    code: string;
    host_id: string;
    closed: boolean;
    state_version: number;
    players: Array<{ id: string; name: string; role: 'host' | 'player'; connected: boolean }>;
  }>;
  count: number;
};

async function createLobby(
  page: Page,
  hostName: string,
): Promise<LobbyCreateResponse> {
  const response = await page.request.post('/api/lobby/create', {
    data: { host_name: hostName },
    headers: { 'Content-Type': 'application/json' },
  });
  expect(response.ok(), `lobby create failed: ${response.status()}`).toBeTruthy();
  return (await response.json()) as LobbyCreateResponse;
}

async function joinLobby(
  page: Page,
  code: string,
  playerName: string,
): Promise<LobbyJoinResponse> {
  const response = await page.request.post('/api/lobby/join', {
    data: { code, player_name: playerName },
    headers: { 'Content-Type': 'application/json' },
  });
  expect(response.ok(), `lobby join failed: ${response.status()}`).toBeTruthy();
  return (await response.json()) as LobbyJoinResponse;
}

async function getLobbyList(page: Page): Promise<LobbyListResponse> {
  const response = await page.request.get('/api/lobby/list');
  expect(response.ok(), `lobby list failed: ${response.status()}`).toBeTruthy();
  return (await response.json()) as LobbyListResponse;
}

async function spawnPhoneContext(
  browser: import('@playwright/test').Browser,
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext();
  const page = await context.newPage();
  // Navigate to phone HTML5 to establish same-origin for /api/* requests
  // (Godot HTML5 served same-origin per LOBBY_WS_SHARED=true mode).
  await page.goto(PHONE_PATH, { waitUntil: 'domcontentloaded' });
  return { context, page };
}

test.describe('phone smoke — lobby lifecycle', () => {
  test('host create + player join = room intact + host preserved', async ({
    browser,
  }) => {
    // Spawn 2 isolated contexts (host + player phone surrogate).
    const host = await spawnPhoneContext(browser);
    const player = await spawnPhoneContext(browser);

    try {
      const created = await createLobby(host.page, 'PWHost');
      expect(created.code).toMatch(/^[A-Z]{4}$/);
      expect(created.host_id).toMatch(/^p_[a-f0-9]+$/);

      const joined = await joinLobby(player.page, created.code, 'PWPlayer');
      expect(joined.player_id).toMatch(/^p_[a-f0-9]+$/);

      const lobby = await getLobbyList(host.page);
      const room = lobby.rooms.find((r) => r.code === created.code);
      expect(room, `room ${created.code} present`).toBeDefined();
      expect(room!.closed, 'B7 regression check: room not closed').toBe(false);
      expect(room!.host_id, 'B7 regression check: host_id preserved').toBe(
        created.host_id,
      );
      expect(room!.players.length).toBe(2);
      const hostPlayer = room!.players.find((p) => p.id === created.host_id);
      expect(hostPlayer!.role, 'B7 regression check: host role preserved').toBe('host');
      expect(
        room!.players.find((p) => p.id === joined.player_id)!.role,
      ).toBe('player');
    } finally {
      await host.context.close();
      await player.context.close();
    }
  });

  test('B5 baseline: state_version field present + numeric on fresh lobby', async ({
    browser,
  }) => {
    // Baseline check that state_version field is exposed by /api/lobby/list
    // and is a non-negative integer. Full B5 phase_change broadcast wire
    // (host phase intent → state_version increment + versioned event to
    // all peers) covered by Node harness tests/api/phaseChangeBroadcast.test.js
    // (11 test, requires WS connection + host token).
    //
    // Playwright spec stays at REST-surface invariants + multi-client lobby
    // composition. WS-level state machine = Node harness territory.
    const host = await spawnPhoneContext(browser);
    try {
      const created = await createLobby(host.page, 'PWHostPhase');
      const lobby = await getLobbyList(host.page);
      const room = lobby.rooms.find((r) => r.code === created.code);
      expect(room, 'room created visible in list').toBeDefined();
      expect(typeof room!.state_version).toBe('number');
      expect(room!.state_version).toBeGreaterThanOrEqual(0);
    } finally {
      await host.context.close();
    }
  });
});

test.describe('phone smoke — multi-client scaling', () => {
  test('4 contexts join same lobby = max_players honored', async ({ browser }) => {
    const host = await spawnPhoneContext(browser);
    const players: Array<{ context: BrowserContext; page: Page }> = [];
    try {
      const created = await createLobby(host.page, 'PWHostMax');
      for (let i = 0; i < 3; i += 1) {
        const p = await spawnPhoneContext(browser);
        players.push(p);
        await joinLobby(p.page, created.code, `PWPlayer${i + 1}`);
      }

      const lobby = await getLobbyList(host.page);
      const room = lobby.rooms.find((r) => r.code === created.code);
      expect(room!.players.length).toBe(4);
      expect(room!.host_id).toBe(created.host_id);
      expect(room!.closed).toBe(false);
    } finally {
      await host.context.close();
      await Promise.all(players.map((p) => p.context.close()));
    }
  });
});
