// FASE 1 T1.3 — Browser sync spectator harness.
//
// Complementa tests/smoke/ai-driven-sim.js (driver puro WS+REST senza
// browser) catturando screenshot canvas + grid-signature lato browser su
// ogni evento WS `phase_change`. Output per-run dir contiene PNG +
// signature JSON + manifest, per visual regression vs baseline futuri.
//
// Tooling: Playwright chromium (headless). Razionale: repo già installa
// `playwright` + `@playwright/test` come dev dep usata in
// tools/ts/tests/playwright/phone/*.spec.ts. Helper canvasGrid esistente
// (tools/ts/tests/playwright/phone/lib/canvasGrid.ts) viene mirrorato in
// JS plain dentro il page.evaluate per evitare import TypeScript /
// transpile dependency. Chrome MCP scartato (richiede extension manuale,
// non CI-friendly).
//
// Goal:
//   1. Apre 1+ contesti chromium (host TV + N spectator phone).
//   2. Subscribe ai broadcast `phase_change` via hook su window.__evoLobbyBridge
//      OR via WS proxy diretto Node-side (fallback se hook fallisce).
//   3. Ad ogni transizione: screenshot full-page + grid-signature 4x4
//      RGBA del canvas TV (host) e del DOM phone (spectator).
//   4. End-of-run: scrive manifest.json (timeline phase + path screenshot
//      + signature) + JSONL telemetria parallela ad ai-driven-sim.
//
// Usage:
//   TUNNEL=https://<host>.trycloudflare.com node tests/smoke/browser-sync-spectator.js
//
// Env opzionali:
//   BROWSER_SYNC_LOG_DIR=/tmp/browser-sync-runs
//   BROWSER_SYNC_HEADLESS=true        (false per debug visuale)
//   BROWSER_SYNC_PLAYERS=1            (n spectator phone aggiuntivi)
//   BROWSER_SYNC_MAX_ROUNDS=10
//   BROWSER_SYNC_SCENARIO=enc_tutorial_01
//   BROWSER_SYNC_GRID_ROWS=4
//   BROWSER_SYNC_GRID_COLS=4
//   BROWSER_SYNC_HOST_PATH=/index.html      (TV canvas)
//   BROWSER_SYNC_PHONE_PATH=/lobby.html     (spectator composer)
//   BROWSER_SYNC_PHASE_TIMEOUT_MS=60000     (max wait per phase change)
//
// Cross-ref:
//   tests/smoke/ai-driven-sim.js (twin harness REST/WS without browser)
//   tools/ts/tests/playwright/phone/lib/canvasGrid.ts (grid sampler logic)
//   tools/sim/visual-baseline-compare.js (diff utility)
//   docs/playtest/2026-05-09-fase1-t1-3-browser-sync-handoff.md
//
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const TUNNEL = process.env.TUNNEL;
if (!TUNNEL) {
  console.error('FATAL: set TUNNEL=https://<host>.trycloudflare.com');
  process.exit(2);
}

const LOG_DIR = process.env.BROWSER_SYNC_LOG_DIR || '/tmp/browser-sync-runs';
const HEADLESS = String(process.env.BROWSER_SYNC_HEADLESS || 'true') !== 'false';
const PLAYERS = Math.max(0, Number(process.env.BROWSER_SYNC_PLAYERS || 1));
const MAX_ROUNDS = Math.max(1, Number(process.env.BROWSER_SYNC_MAX_ROUNDS || 10));
const SCENARIO_ID = String(process.env.BROWSER_SYNC_SCENARIO || 'enc_tutorial_01');
const GRID_ROWS = Math.max(1, Number(process.env.BROWSER_SYNC_GRID_ROWS || 4));
const GRID_COLS = Math.max(1, Number(process.env.BROWSER_SYNC_GRID_COLS || 4));
const HOST_PATH = String(process.env.BROWSER_SYNC_HOST_PATH || '/index.html');
const PHONE_PATH = String(process.env.BROWSER_SYNC_PHONE_PATH || '/lobby.html');
const PHASE_TIMEOUT_MS = Math.max(
  5_000,
  Number(process.env.BROWSER_SYNC_PHASE_TIMEOUT_MS || 60_000),
);

const RUN_TS = new Date().toISOString().replace(/[:.]/g, '-');
const RUN_DIR = path.join(LOG_DIR, `run-${RUN_TS}`);
const SCREENSHOT_DIR = path.join(RUN_DIR, 'screenshots');
const SIGNATURES_DIR = path.join(RUN_DIR, 'signatures');
const MANIFEST_PATH = path.join(RUN_DIR, 'manifest.json');
const JSONL_PATH = path.join(RUN_DIR, 'telemetry.jsonl');

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
fs.mkdirSync(SIGNATURES_DIR, { recursive: true });

const logStream = fs.createWriteStream(JSONL_PATH, { flags: 'a' });
function log(kind, payload) {
  const entry = { ts: Date.now(), kind, ...payload };
  logStream.write(JSON.stringify(entry) + '\n');
}

// Resolve playwright from main repo node_modules (worktree has none).
// Cross-PC: master path è C:/Users/VGit/Desktop/Game; fallback PWD/node_modules
// per ambienti CI con install root diverso.
function resolvePlaywright() {
  const candidates = [
    path.resolve(__dirname, '..', '..', 'node_modules', 'playwright'),
    path.resolve(process.cwd(), 'node_modules', 'playwright'),
    'C:/Users/VGit/Desktop/Game/node_modules/playwright',
  ];
  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) {
        return require(c);
      }
    } catch {
      // try next
    }
  }
  throw new Error(
    `playwright not resolvable. Install at repo root or set NODE_PATH. Tried: ${candidates.join(', ')}`,
  );
}

// Mirror tools/ts/tests/playwright/phone/lib/canvasGrid.ts in plain JS,
// so we can pass it to page.evaluate without TS transpile. Returns NxM
// grid of RGBA averages + isEmpty flag per cell.
const SAMPLE_GRID_FN = `
function sampleCanvasGrid(canvasSelector, rows, cols, emptyThreshold) {
  emptyThreshold = emptyThreshold == null ? 5 : emptyThreshold;
  var canvas = document.querySelector(canvasSelector);
  if (!canvas) return { error: 'selector_not_found', selector: canvasSelector };
  if (canvas.width === 0 || canvas.height === 0) {
    return { error: 'zero_dim', width: canvas.width, height: canvas.height };
  }
  var cellW = Math.floor(canvas.width / cols);
  var cellH = Math.floor(canvas.height / rows);
  var shadow = document.createElement('canvas');
  shadow.width = canvas.width;
  shadow.height = canvas.height;
  var sctx = shadow.getContext('2d');
  if (!sctx) return { error: 'no_2d_ctx' };
  try {
    sctx.drawImage(canvas, 0, 0);
  } catch (err) {
    return { error: 'drawimage_failed', message: String(err && err.message) };
  }
  var grid = [];
  for (var row = 0; row < rows; row += 1) {
    var rowArr = [];
    for (var col = 0; col < cols; col += 1) {
      var x = col * cellW;
      var y = row * cellH;
      var data = sctx.getImageData(x, y, cellW, cellH).data;
      var sumR = 0, sumG = 0, sumB = 0, sumA = 0;
      var pixelCount = data.length / 4;
      for (var i = 0; i < data.length; i += 4) {
        sumR += data[i]; sumG += data[i + 1]; sumB += data[i + 2]; sumA += data[i + 3];
      }
      var avgR = sumR / pixelCount;
      var avgG = sumG / pixelCount;
      var avgB = sumB / pixelCount;
      var avgA = sumA / pixelCount;
      rowArr.push({
        avg: { r: avgR, g: avgG, b: avgB, a: avgA },
        width: cellW,
        height: cellH,
        isEmpty: (avgR + avgG + avgB) < emptyThreshold && avgA < emptyThreshold,
      });
    }
    grid.push(rowArr);
  }
  return { ok: true, canvasWidth: canvas.width, canvasHeight: canvas.height, grid: grid };
}
`;

// Hook installer: subscribes to window.__evoLobbyBridge phase_change events
// (lobbyBridge.js exposes _currentPhase). Falls back to polling that field
// + observing client.on hook. Registers a queue on window.__phaseEvents that
// the harness drains via page.evaluate.
const INSTALL_PHASE_HOOK_FN = `
(function installPhaseHook() {
  if (window.__phaseEvents) return; // idempotent
  window.__phaseEvents = [];
  // Strategy 1: poll _currentPhase on lobby bridge each 200ms — works on
  // both host and player roles since lobbyBridge updates it on phase_change.
  var lastPhase = null;
  function tick() {
    var bridge = window.__evoLobbyBridge || window.evoLobbyBridge || null;
    var phase = (bridge && bridge._currentPhase) || null;
    if (phase && phase !== lastPhase) {
      lastPhase = phase;
      window.__phaseEvents.push({ ts: Date.now(), phase: phase, source: 'bridge_poll' });
    }
  }
  window.__phaseHookInterval = setInterval(tick, 200);
  tick();
})();
`;

async function snapshotPhase(ctx, role, label, phase, idx) {
  const tag = `${idx.toString().padStart(2, '0')}-${phase}-${role}-${label}`;
  const pngPath = path.join(SCREENSHOT_DIR, `${tag}.png`);
  const sigPath = path.join(SIGNATURES_DIR, `${tag}.json`);
  let canvasSig = null;
  let pngBytes = 0;
  try {
    // Brief stabilization wait for animations.
    await ctx.page.waitForTimeout(400);
    await ctx.page.screenshot({ path: pngPath, fullPage: false });
    pngBytes = fs.statSync(pngPath).size;
    // Sample canvas grid for whichever canvas selector exists. TV (host)
    // index.html mounts <canvas id="board" /> via main.js; phone lobby may
    // not have a canvas at all (DOM composer). In that case sig=null is
    // legitimate, and visual diff falls back to PNG-only.
    canvasSig = await ctx.page.evaluate(
      ({ rows, cols, sampleFn }) => {
        // eslint-disable-next-line no-eval
        eval(sampleFn);
        var selectors = ['canvas#board', 'canvas', '#canvas'];
        for (var i = 0; i < selectors.length; i += 1) {
          var probe = document.querySelector(selectors[i]);
          if (probe) {
            // eslint-disable-next-line no-undef
            return sampleCanvasGrid(selectors[i], rows, cols, 5);
          }
        }
        return { error: 'no_canvas_found', tried: selectors };
      },
      { rows: GRID_ROWS, cols: GRID_COLS, sampleFn: SAMPLE_GRID_FN },
    );
    fs.writeFileSync(sigPath, JSON.stringify(canvasSig, null, 2));
  } catch (err) {
    log('snapshot_error', { role, label, phase, message: err?.message });
  }
  log('snapshot', {
    role,
    label,
    phase,
    png: path.relative(RUN_DIR, pngPath),
    signature: path.relative(RUN_DIR, sigPath),
    png_bytes: pngBytes,
    canvas_sig_ok: !!(canvasSig && canvasSig.ok),
    canvas_sig_error: canvasSig && canvasSig.error ? canvasSig.error : null,
  });
  return { tag, pngPath, sigPath, canvasSig };
}

async function drainPhaseEvents(page) {
  return await page.evaluate(() => {
    const out = window.__phaseEvents ? window.__phaseEvents.slice() : [];
    if (window.__phaseEvents) window.__phaseEvents.length = 0;
    return out;
  });
}

(async () => {
  console.log(`Browser sync run → ${RUN_DIR}`);
  console.log(`Tunnel: ${TUNNEL}`);
  console.log(
    `Players: 1 host + ${PLAYERS} spectator | Scenario: ${SCENARIO_ID} | Max rounds: ${MAX_ROUNDS}`,
  );
  console.log(`Headless: ${HEADLESS} | Grid: ${GRID_ROWS}x${GRID_COLS}`);

  log('config', {
    tunnel: TUNNEL,
    headless: HEADLESS,
    players: PLAYERS,
    max_rounds: MAX_ROUNDS,
    scenario: SCENARIO_ID,
    grid_rows: GRID_ROWS,
    grid_cols: GRID_COLS,
    host_path: HOST_PATH,
    phone_path: PHONE_PATH,
  });

  const playwright = resolvePlaywright();
  const browser = await playwright.chromium.launch({ headless: HEADLESS });

  const contexts = [];
  const manifest = {
    run_id: RUN_TS,
    tunnel: TUNNEL,
    started_at: new Date().toISOString(),
    config: {
      players: PLAYERS,
      scenario: SCENARIO_ID,
      max_rounds: MAX_ROUNDS,
      grid: { rows: GRID_ROWS, cols: GRID_COLS },
      host_path: HOST_PATH,
      phone_path: PHONE_PATH,
    },
    timeline: [],
  };

  try {
    // --- bootstrap lobby via REST (mirror ai-driven-sim) ---
    const create = await fetch(`${TUNNEL}/api/lobby/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ host_name: 'BrowserSyncHost' }),
    }).then((r) => r.json());
    const code = create.code;
    const hostToken = create.host_token;
    log('lobby_create', { code, host_id: create.host_id });
    console.log(`Lobby code: ${code}`);
    manifest.lobby_code = code;

    const playerJoins = [];
    for (let i = 0; i < PLAYERS; i += 1) {
      const j = await fetch(`${TUNNEL}/api/lobby/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, player_name: `BrowserSpec${i + 1}` }),
      }).then((r) => r.json());
      playerJoins.push(j);
    }

    // --- launch host TV browser ---
    const hostCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const hostPage = await hostCtx.newPage();
    hostPage.on('console', (m) => log('console', { role: 'host', text: m.text(), kind: m.type() }));
    hostPage.on('pageerror', (e) => log('pageerror', { role: 'host', message: e.message }));
    const hostUrl = `${TUNNEL}${HOST_PATH}?code=${code}&token=${encodeURIComponent(hostToken)}&role=host`;
    log('navigate', { role: 'host', url: hostUrl });
    await hostPage.goto(hostUrl, { waitUntil: 'load', timeout: 30_000 }).catch((err) => {
      log('navigate_error', { role: 'host', message: err.message });
    });
    await hostPage.evaluate(INSTALL_PHASE_HOOK_FN);
    contexts.push({ role: 'host', label: 'tv', ctx: hostCtx, page: hostPage });

    // --- launch player spectator browsers ---
    for (let i = 0; i < playerJoins.length; i += 1) {
      const p = playerJoins[i];
      const pCtx = await browser.newContext({ viewport: { width: 414, height: 896 } });
      const pPage = await pCtx.newPage();
      pPage.on('console', (m) =>
        log('console', { role: 'player', label: `p${i + 1}`, text: m.text(), kind: m.type() }),
      );
      pPage.on('pageerror', (e) =>
        log('pageerror', { role: 'player', label: `p${i + 1}`, message: e.message }),
      );
      const pUrl = `${TUNNEL}${PHONE_PATH}?code=${code}&player_id=${p.player_id}&token=${encodeURIComponent(p.player_token)}&role=player`;
      log('navigate', { role: 'player', label: `p${i + 1}`, url: pUrl });
      await pPage.goto(pUrl, { waitUntil: 'load', timeout: 30_000 }).catch((err) => {
        log('navigate_error', { role: 'player', label: `p${i + 1}`, message: err.message });
      });
      await pPage.evaluate(INSTALL_PHASE_HOOK_FN);
      contexts.push({ role: 'player', label: `p${i + 1}`, ctx: pCtx, page: pPage });
    }

    // --- initial snapshot (lobby) before any phase transition ---
    let snapIdx = 0;
    for (const c of contexts) {
      await snapshotPhase(c, c.role, c.label, 'init', snapIdx);
    }
    snapIdx += 1;
    manifest.timeline.push({ idx: 0, phase: 'init', captured_at: new Date().toISOString() });

    // --- drive coop run + watch phase events on host bridge ---
    // Trigger run/start via REST then poll host bridge phase queue. We do
    // NOT replicate full ai-driven-sim flow here — that's the twin harness.
    // T1.3 scope = SYNC OBSERVATION while a session runs. To allow standalone
    // execution we kick a minimal coop start so the harness is self-contained
    // for smoke; richer scenarios should run ai-driven-sim concurrently.
    log('coop_run_start', { scenario: SCENARIO_ID });
    await fetch(`${TUNNEL}/api/coop/run/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        host_token: hostToken,
        scenario_stack: [SCENARIO_ID],
        skip_onboarding: true,
      }),
    }).catch((err) => log('coop_run_start_error', { message: err.message }));

    // Poll loop: drain phase events from host page each 500ms; on every
    // unique phase change, snapshot ALL contexts. Stop after PHASE_TIMEOUT_MS
    // of inactivity OR when we observe a terminal phase (ended/debrief).
    const seenPhases = new Set(['init']);
    let lastEventAt = Date.now();
    const TERMINAL_PHASES = new Set(['ended', 'debrief']);
    let terminalSeen = false;

    while (Date.now() - lastEventAt < PHASE_TIMEOUT_MS && !terminalSeen) {
      await new Promise((r) => setTimeout(r, 500));
      // Drain host first (canonical broadcast source); player events should
      // mirror but we capture them too for sync verification.
      for (const c of contexts) {
        let drained = [];
        try {
          drained = await drainPhaseEvents(c.page);
        } catch (err) {
          log('drain_error', { role: c.role, label: c.label, message: err?.message });
          continue;
        }
        for (const ev of drained) {
          log('phase_event', { role: c.role, label: c.label, phase: ev.phase, source: ev.source });
          if (!seenPhases.has(ev.phase)) {
            seenPhases.add(ev.phase);
            lastEventAt = Date.now();
            console.log(`  phase_change: ${ev.phase} (observer: ${c.role}/${c.label})`);
            // Snapshot ALL contexts on every UNIQUE phase change, regardless
            // of which observer caught it first.
            for (const target of contexts) {
              await snapshotPhase(target, target.role, target.label, ev.phase, snapIdx);
            }
            manifest.timeline.push({
              idx: snapIdx,
              phase: ev.phase,
              observer: `${c.role}/${c.label}`,
              captured_at: new Date().toISOString(),
            });
            snapIdx += 1;
            if (TERMINAL_PHASES.has(ev.phase)) {
              terminalSeen = true;
              break;
            }
          }
        }
        if (terminalSeen) break;
      }
    }

    if (!terminalSeen) {
      console.log(
        `  (no terminal phase seen — timed out waiting after ${PHASE_TIMEOUT_MS}ms idle)`,
      );
    }

    // Final snapshot — capture whatever DOM state we ended on.
    for (const c of contexts) {
      await snapshotPhase(c, c.role, c.label, 'final', snapIdx);
    }
    manifest.timeline.push({ idx: snapIdx, phase: 'final', captured_at: new Date().toISOString() });
    manifest.phases_observed = Array.from(seenPhases);
    manifest.terminal_seen = terminalSeen;
    manifest.ended_at = new Date().toISOString();
  } catch (err) {
    console.error('HARNESS FAIL:', err);
    log('fatal', { message: err?.message, stack: err?.stack });
    manifest.error = { message: err?.message, stack: err?.stack };
  } finally {
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
    log('manifest_written', { path: MANIFEST_PATH });

    // Cleanup browser contexts.
    for (const c of contexts) {
      try {
        await c.page.evaluate(() => {
          if (window.__phaseHookInterval) clearInterval(window.__phaseHookInterval);
        });
      } catch {
        // page may already be closed
      }
      try {
        await c.ctx.close();
      } catch {
        // ignore
      }
    }
    try {
      await browser.close();
    } catch {
      // ignore
    }

    logStream.end();

    // Aggregate report.
    console.log(`\n=== Run summary ===`);
    console.log(`Run dir: ${RUN_DIR}`);
    console.log(`Manifest: ${MANIFEST_PATH}`);
    console.log(`Telemetry: ${JSONL_PATH}`);
    console.log(`Phases observed: ${(manifest.phases_observed || []).join(' → ')}`);
    console.log(`Snapshots: ${manifest.timeline.length} timeline entries`);
    if (manifest.error) {
      console.log(`Error: ${manifest.error.message}`);
      process.exit(1);
    }
    process.exit(manifest.terminal_seen ? 0 : 2);
  }
})().catch((err) => {
  console.error('UNCAUGHT:', err);
  try {
    logStream.end();
  } catch {
    // ignore
  }
  process.exit(2);
});
