---
title: 'Agent-driven playtest workflow — canonical pattern post 2026-05-07'
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: 2026-05-07
source_of_truth: true
language: it
review_cycle_days: 30
related:
  - docs/playtest/2026-05-07-phone-smoke-bundle-rca.md
  - docs/playtest/2026-05-07-master-dd-validation-10min-checklist.md
  - docs/playtest/2026-05-07-phone-smoke-harness-automated-coverage.md
  - docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md
tags: [playtest, workflow, automation, agent, browser-mcp, canonical]
---

# Agent-driven playtest workflow — canonical (2026-05-07)

Default workflow per playtest co-op multiplayer state-machine bugs. Master-dd hands-on hardware solo per physical-only residue.

**Validated**: sessione 2026-05-07 ha catturato + fixato 3 bug runtime (B6 toast `[unknown_type]`, B7 host kicked, B8 player non-host stuck) end-to-end via 2-tab Chrome MCP simulation in ~3h, **senza phone hands-on**. Pattern legacy "ship + master-dd retest + debug + ship + retest" = 5-10x slower + screenshot-transcription-error-prone.

## Decision matrix — quale path

| Bug type                                   |   Browser-automatable   | Mobile hardware required |
| ------------------------------------------ | :---------------------: | :----------------------: |
| Phase transition / state machine           |           ✅            |                          |
| Defer guards / event ordering              |           ✅            |                          |
| Broadcast handler / `[unknown_type]` toast |           ✅            |                          |
| Host transfer / room lifecycle             |           ✅            |                          |
| WS reconnect logic                         | ✅ via DevTools offline |                          |
| Multi-client coordination (4+ players)     |      ✅ N-context       |                          |
| Visual regression UI                       |     ✅ canvas-grid      |                          |
| API surface (REST + WS event)              |   ✅ curl + JS fetch    |                          |
| Stale build / cache invalidation           |    ✅ mtime+git log     |                          |
| **Real WAN RTT geographic LTE**            |                         |            ✅            |
| **Touch p95 mobile fingertip**             |                         |            ✅            |
| **Airplane hardware + WS pause**           |                         |            ✅            |
| **Device thermal/memory throttling**       |                         |            ✅            |

## Pattern A — Browser MCP smoke (current sessione 2026-05-07)

### Pre-flight

```bash
# 1. Worktree-isolated branch per fix
cd /c/Users/VGit/Desktop/Game-Godot-v2 && git worktree add ...

# 2. Force rebuild dist (post PR #206 = default-on)
./tools/web/build_web.sh --mode=phone

# 3. Re-mount in Game/ public/phone/
cp -R dist/web/. /c/Users/VGit/Desktop/Game/apps/backend/public/phone/

# 4. Tunnel up via desktop launcher
# Double-click C:\Users\VGit\Desktop\Evo-Phone-Validation.bat
# → Cloudflare ephemeral URL https://<random>.trycloudflare.com
```

### Drive

```
1. mcp__Claude_in_Chrome__tabs_context_mcp createIfEmpty=true
2. browser_batch [navigate tab1 phone URL, wait 18s splash, screenshot]
3. browser_batch [click Nome field, key 'E','d','d','y' singoli, click Crea, screenshot]
4. tabs_create_mcp (Tab 2 player)
5. browser_batch [navigate tab2 ?room=XXXX deep-link, wait, fill name, click Unisciti]
6. browser_batch [click "Inizia mondo (host)", wait, screenshot tab1+tab2]
7. Verify: NO toast `[unknown_type]`, phase advance entrambi, host preserved
```

### Forensic

- `curl https://<tunnel>/api/lobby/list` → JSON state canonical
- `mcp__Claude_in_Chrome__javascript_tool fetch('/api/...')` → bypass Godot HTTPClient
- `read_console_messages` regex pattern → push_warning + browser errors
- `read_network_requests` urlPattern → HTTP layer trace

### Lock bug

Write failing test PRE-fix at logic layer:

- Composer state (`tests/unit/test_phone_composer_view_*.gd`)
- WS handler dispatch (`tests/api/*.test.js`)
- Defer guard (vedi PR #205 esempio)

Confirm test FAIL pre-fix → fix code → confirm PASS → 4-gate DoD locked.

## Pattern B — Playwright multi-context (recommended next adoption)

**Migration target**: replace 2-tab Chrome MCP dance con structured fixtures.

### Why

- N-tab → N-context (single browser, isolated cookies/storage/session per client)
- Deterministic CI gate (run pre-merge, no master-dd)
- Replays via `playwright codegen` + `--debug` step-through
- Scales 4-8 phone simultanei single process

### Setup ([playwright.dev](https://playwright.dev/))

```bash
npm i -D @playwright/test
npx playwright install chromium
```

`tests/e2e/phone-multi.spec.ts` template:

```typescript
import { test, expect, BrowserContext } from '@playwright/test';

test('lobby create+join+phase advance smoke', async ({ browser }) => {
  const tunnelUrl = process.env.TUNNEL_URL ?? 'http://localhost:3334';
  const hostCtx: BrowserContext = await browser.newContext();
  const playerCtx: BrowserContext = await browser.newContext();

  const host = await hostCtx.newPage();
  await host.goto(`${tunnelUrl}/phone/`);
  await host.waitForFunction(() => /* godot loaded */ true, { timeout: 30000 });
  // ... drive Crea Stanza → grab code

  const player = await playerCtx.newPage();
  await player.goto(`${tunnelUrl}/phone/?room=${code}`);
  // ... drive Unisciti

  // Assert via JS fetch state canonical
  const lobby = await host.evaluate(async () => (await fetch('/api/lobby/list')).json());
  expect(lobby.rooms[0].closed).toBe(false);
  expect(lobby.rooms[0].host_id).toBe(hostId);
});
```

Run: `npx playwright test tests/e2e/phone-multi.spec.ts`.

## Pattern C — Artillery WebSocket load test

**Use case**: pre-merge gate `lobbyService` host-transfer grace 90s + B5 phase_change broadcast under load.

`tests/load/lobby-flood.yml`:

```yaml
config:
  target: 'wss://<tunnel>/ws'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - engine: ws
    flow:
      - send: '{"type":"hello","player_token":"..."}'
      - wait: 5
      - send: '{"type":"action","payload":{...}}'
```

Run: `npx artillery run tests/load/lobby-flood.yml`.

## Pattern D — Wesnoth-style AI vs AI nightly fairness

**Use case**: regression gate Sprint M9 P6 fairness — N=1000 encounter scripted AI head-to-head, CSV win-rate diff vs golden, alert su >5% drift.

`scripts/playtest/sim_vs_sim_nightly.py` template (combat sim Node engine wrapper):

```python
import subprocess, json, csv
ARCHETYPES = ['aggressive', 'cautious', 'opportunist']
SCENARIOS = ['hardcore-06', 'sprint-m4-base', 'skiv-ambition']
RESULTS = []
for s in SCENARIOS:
    for a1 in ARCHETYPES:
        for a2 in ARCHETYPES:
            wins = run_n(scenario=s, ai1=a1, ai2=a2, n=1000)
            RESULTS.append({'scenario': s, 'ai1': a1, 'ai2': a2, 'win_rate': wins})
# Compare vs reports/golden/win_rates.csv → alert if drift > 5%
```

GitHub Actions cron `0 3 * * *` UTC.

## Mobile residue (master-dd hands-on)

Solo:

| Item                             | Why hardware-only                                                      | Frequency                                        |
| -------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------ |
| Real WAN RTT geographic          | LTE → CF edge → backend (vs localhost roundtrip)                       | Per ADR cutover, post-major-network-change       |
| Touch p95 mobile                 | Capacitive sensor + iOS Safari render path differs from desktop cursor | Pre Phase A cutover, every quarter               |
| Airplane hardware + WS pause     | Mobile browser tab background pause OS-level (no DevTools equivalent)  | Pre demo userland                                |
| Device thermal/memory throttling | Sustained combat 5R+ on mid-tier phone                                 | Pre demo + when adding sprite/VFX heavy features |

**Master-dd checklist 3-item physical** ([docs/playtest/2026-05-07-master-dd-validation-10min-checklist.md](docs/playtest/2026-05-07-master-dd-validation-10min-checklist.md)) resta canonical per Phase A cutover gate. Tutto altro = pattern A/B/C/D agent-driven.

## Anti-pattern code-smell

- ❌ "Ship and master-dd retest" senza unit test repro pre-fix
- ❌ Screenshot upload come primary forensic
- ❌ Phone-in-hand come default validation gate per state machine bug
- ❌ "WAN richiesto per repro" senza tentare browser tunnel + DevTools network throttle
- ❌ Skip browser MCP perché "non è phone reale" — la maggior parte dei bug emerge identico
- ❌ Single-tab Chrome MCP per multiplayer bug (serve 2+ context per repro)

## Adoption roadmap (kill-60 ranked)

| #   | Tool                                |                                                        Effort                                                        | Sprint target                                           |
| --- | ----------------------------------- | :------------------------------------------------------------------------------------------------------------------: | ------------------------------------------------------- |
| 1   | Playwright multi-context            |                                                       low ~3h                                                        | Sprint successivo                                       |
| 2   | Artillery WS scenarios              |                                                       low ~2h                                                        | Sprint successivo                                       |
| 3   | canvas-grid Playwright addon        |                                                       low ~1h                                                        | Sprint successivo (visual regression Skiv pulse)        |
| 4   | gamestudio-subagents profile mining |                                                       low ~1h                                                        | Sprint successivo                                       |
| 5   | PlayGodot full integration          | **high ~20-40h** ⚠️ requires custom Godot fork build (scons C++ + cross-platform maintenance), see PR #2110 research | Post Phase A cutover, master-dd verdict 2026-05-08 keep |
| 6   | GodotTestDriver in-engine           |        **med ~10-15h** ⚠️ requires C# enable + GDScript-C# bridge ergonomics overhead, see PR #2110 research         | Post Phase A cutover, master-dd verdict 2026-05-08 keep |
| 7   | Wesnoth AI vs AI nightly            |                                                       med ~6h                                                        | Sprint M9+ fairness gate                                |
| -   | TITAN academic LLM agent testers    |                                                         high                                                         | **SKIP** solo-dev overkill                              |
| -   | Riot Vanguard enterprise QA         |                                                         high                                                         | **SKIP** enterprise scale                               |

## Cross-ref

- [docs/playtest/2026-05-07-phone-smoke-bundle-rca.md](docs/playtest/2026-05-07-phone-smoke-bundle-rca.md) — sessione canonical che ha validato pattern
- [docs/playtest/2026-05-07-master-dd-validation-10min-checklist.md](docs/playtest/2026-05-07-master-dd-validation-10min-checklist.md) — physical residue checklist
- [docs/playtest/2026-05-07-phone-smoke-harness-automated-coverage.md](docs/playtest/2026-05-07-phone-smoke-harness-automated-coverage.md) — harness 17 test (Node 11 + GUT 6)
- Memory file: [`feedback_agent_browser_playtest_pattern.md`](~/.claude/projects/C--Users-VGit-Desktop-Game/memory/feedback_agent_browser_playtest_pattern.md)

## External references

- [Playwright](https://playwright.dev/)
- [PlayGodot](https://github.com/Randroids-Dojo/PlayGodot)
- [GodotTestDriver](https://github.com/chickensoft-games/GodotTestDriver)
- [Artillery WebSocket Testing](https://www.thegreenreport.blog/articles/websocket-testing-essentials-strategies-and-code-for-real-time-apps/websocket-testing-essentials-strategies-and-code-for-real-time-apps.html)
- [TITAN — LLM Agent Game Testing](https://arxiv.org/html/2509.22170v1)
- [GamingAgent (lmgame-org)](https://github.com/lmgame-org/GamingAgent)
- [gamestudio-subagents](https://github.com/pamirtuna/gamestudio-subagents)
- [canvas-grid Playwright](https://dev.to/fonzi/testing-html5-canvas-with-canvasgrid-and-playwright-5h4c)
- [Wesnoth AI](https://wiki.wesnoth.org/Wesnoth_AI)
- [Game Testing Frameworks 2025 review](https://generalistprogrammer.com/tutorials/game-testing-frameworks-complete-automation-guide-2025)
