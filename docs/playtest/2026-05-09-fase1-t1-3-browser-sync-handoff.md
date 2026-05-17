---
title: FASE 1 T1.3 — browser sync spectator harness handoff
workstream: ops-qa
doc_status: active
doc_owner: master-dd
last_verified: 2026-05-09
source_of_truth: true
language: it
---

# FASE 1 T1.3 — Browser sync spectator harness

Twin-harness di `tests/smoke/ai-driven-sim.js`. Quello driver pilota sessione via WS+REST puro (zero browser); questo apre 1+ contesti chromium reali (host TV + N spectator phone) e cattura **screenshot canvas + grid signature** ad ogni evento WS `phase_change`. Output combinato fornisce visual regression detector deterministico.

## Tooling — scelta motivata

- **Playwright chromium headless** ✅ scelto.
- **Chrome MCP (`mcp__Claude_in_Chrome__*`)** ❌ scartato.

Motivazione (1 frase): Playwright è già dev-dep installata (`C:/Users/VGit/Desktop/Game/node_modules/playwright`), CI-friendly, headless di default; Chrome MCP richiede extension manuale + Chrome user-profile, non eseguibile in pipeline e accoppiato a sessione interattiva.

## Deliverables

| File                                                          | Ruolo                                 | Linee |
| ------------------------------------------------------------- | ------------------------------------- | ----- |
| `tests/smoke/browser-sync-spectator.js`                       | Harness principale (driver + capture) | ~280  |
| `tools/sim/visual-baseline-compare.js`                        | Util baseline / diff (CLI 3 modi)     | ~210  |
| `docs/playtest/2026-05-09-fase1-t1-3-browser-sync-handoff.md` | Questo doc                            | —     |

## Architettura capture

```
tests/smoke/browser-sync-spectator.js
├── resolvePlaywright()        cross-PC node_modules walk
├── INSTALL_PHASE_HOOK_FN      installato in ogni page (poll 200ms su window.__evoLobbyBridge._currentPhase, push su window.__phaseEvents queue)
├── SAMPLE_GRID_FN             mirror plain-JS di tools/ts/.../canvasGrid.ts (no TS transpile)
├── snapshotPhase(ctx, role, label, phase, idx)
│   ├── full-page PNG → screenshots/<idx>-<phase>-<role>-<label>.png
│   └── canvas grid signature → signatures/<idx>-<phase>-<role>-<label>.json
├── poll loop drainPhaseEvents() ogni 500ms su tutti i context
└── manifest.json end-of-run con timeline
```

**Fonte truth phase**: `apps/play/src/lobbyBridge.js` line 552 + 557 imposta `bridge._currentPhase` al ricevere il payload WS `phase_change`. La hook polla quel campo invece di intercettare il WS — più robusto contro race condition e indipendente da socket reconnection.

**Grid signature**: 4×4 RGBA (default) catturato via `getImageData` su shadow canvas (drawImage roundtrip per supportare WebGL contexts come Godot HTML5). 64 numeri totali per cella (16 cell × 4 channel) — diff cheap senza dep PNG decoder.

## Run instructions

### Prerequisiti

```bash
# Backend live + tunnel (mirror ai-driven-sim setup)
PORT=3334 nohup node apps/backend/index.js > /tmp/backend.log 2>&1 &
cloudflared tunnel --url http://localhost:3334
# → copia https://<host>.trycloudflare.com
```

### Comando standard

```bash
TUNNEL=https://<host>.trycloudflare.com \
  node tests/smoke/browser-sync-spectator.js
```

### Env vars

| Var                             | Default                  | Note                                                |
| ------------------------------- | ------------------------ | --------------------------------------------------- |
| `TUNNEL`                        | (required)               | https tunnel URL                                    |
| `BROWSER_SYNC_LOG_DIR`          | `/tmp/browser-sync-runs` | Output root                                         |
| `BROWSER_SYNC_HEADLESS`         | `true`                   | `false` per debug visuale (vede browser realtime)   |
| `BROWSER_SYNC_PLAYERS`          | `1`                      | N spectator phone aggiuntivi                        |
| `BROWSER_SYNC_MAX_ROUNDS`       | `10`                     | (riservato, attualmente non drive-in turn loop)     |
| `BROWSER_SYNC_SCENARIO`         | `enc_tutorial_01`        | passato a `/api/coop/run/start`                     |
| `BROWSER_SYNC_GRID_ROWS`        | `4`                      | Grid signature rows                                 |
| `BROWSER_SYNC_GRID_COLS`        | `4`                      | Grid signature cols                                 |
| `BROWSER_SYNC_HOST_PATH`        | `/index.html`            | TV canvas entrypoint                                |
| `BROWSER_SYNC_PHONE_PATH`       | `/lobby.html`            | Spectator composer entrypoint                       |
| `BROWSER_SYNC_PHASE_TIMEOUT_MS` | `60000`                  | Idle timeout fra due phase change prima di chiudere |

### Output

```
/tmp/browser-sync-runs/run-2026-05-09T...Z/
├── manifest.json              run_id + tunnel + config + timeline
├── telemetry.jsonl            ts + kind (snapshot|phase_event|console|...)
├── screenshots/
│   ├── 00-init-host-tv.png
│   ├── 00-init-player-p1.png
│   ├── 01-character_creation-host-tv.png
│   ├── 01-character_creation-player-p1.png
│   └── ...
└── signatures/
    ├── 00-init-host-tv.json   { ok, canvasWidth, canvasHeight, grid: [[{avg, isEmpty}]] }
    └── ...
```

## Workflow baseline + regressione

### 1. Cattura baseline (dopo run "good")

```bash
node tools/sim/visual-baseline-compare.js \
  --baseline /tmp/browser-sync-runs/run-2026-05-09T... \
  --scenario enc_tutorial_01
# → tools/sim/baselines/enc_tutorial_01/<phase>-<role>-<label>.json
```

### 2. Confronto run vs baseline

```bash
node tools/sim/visual-baseline-compare.js \
  --compare-baseline /tmp/browser-sync-runs/run-2026-05-09T...later \
  --scenario enc_tutorial_01 \
  --threshold 30
# → diff-vs-baseline-enc_tutorial_01.md dentro la run dir
# Exit 0 = tutto PASS; exit 1 = almeno una FAIL/MISSING
```

### 3. Confronto run-vs-run (diff symmetric)

```bash
node tools/sim/visual-baseline-compare.js \
  --compare /tmp/browser-sync-runs/run-A /tmp/browser-sync-runs/run-B
```

### Threshold semantics

- Metric: **mean RGBA L1 distance per cell** (somma |Δr|+|Δg|+|Δb|+|Δa| ÷ N celle).
- Default `30` ≈ tollera leggera variazione font rendering / antialiasing TV vs phone, ma cattura cambio palette / canvas blank / viewport shift.
- Tuning: alzare a `60` se baseline include splash screen Godot animato; abbassare a `10` per regression smoke critica.

## Integrazione con `tools/sim/batch-ai-runner.js`

**Status attuale**: harness standalone. Non c'è ancora flag `--with-spectator` in `batch-ai-runner.js`.

**Possibile integration pattern (next iteration)**:

1. `batch-ai-runner.js` aggiunge flag `--browser-sync` che, per ogni worker `ai-driven-sim`, spawna in parallelo `browser-sync-spectator.js` con `BROWSER_SYNC_LOG_DIR` puntato alla stessa run subdir.
2. `ai-driven-sim` fa join sulla stessa lobby code (passandolo via env condiviso).
3. Aggregato CSV/MD include colonna `visual_diff_status` (PASS/FAIL vs baseline scenario corrente).

**Effort stimato**: ~1-2h per chip dedicato. Out-of-scope T1.3 — flagged per next session.

## Constraints rispettati

- Zero modifiche a `.github/workflows/`, `migrations/`, `packages/contracts/`, `services/generation/`.
- Zero modifiche a `apps/backend/services/ai/declareSistemaIntents.js` o `apps/backend/routes/sessionRoundBridge.js` (just-merged PR #2149).
- Reuse `tools/ts/tests/playwright/phone/lib/canvasGrid.ts` logic mirrorato in plain JS (no TS transpile dependency in harness).
- Zero nuovi npm package — usa Playwright già installato + node native `fs`/`fetch`.
- Codice in inglese, commenti italiani.

## Known gaps

1. **Auto-drive del flow**: T1.3 osserva passivamente `phase_change` events ma non guida la sessione oltre `coop/run/start`. Per testare full lifecycle (lobby → debrief → ended) serve eseguire `ai-driven-sim.js` in parallelo (stessa lobby code via env) o estendere browser-sync con player AI inline. **Scope next iteration**.
2. **Phone composer canvas**: `/lobby.html` è DOM-only (no `<canvas>`). Grid signature ritorna `error: no_canvas_found` per spectator phone — campiona solo PNG full-page. Comportamento atteso, documentato nel manifest `canvas_sig_error`.
3. **WS proxy fallback**: se `window.__evoLobbyBridge` non viene esposto (build fa tree-shake), la hook polling non vede phase events. Fallback Node-side WS proxy non ancora implementato — task next iteration.
4. **Animation timing**: `waitForTimeout(400)` post phase change è euristico. Animazioni > 400ms (es. CT bar lookahead) possono catturare frame intermedio. Tuning suggerito post-baseline run reale.
5. **No pixel-level PNG diff**: `pixelmatch`/`pngjs` non installati. Grid signature cattura regressioni lorde (palette, layout, blank canvas); micro-regression intra-cell richiederebbe nuova dep. Out-of-scope auto-mode.

## Smoke validation (this session)

**Status**: ⏸ blocked — backend non bootable in sandbox sessione corrente.

**Repro comando per next session** (master-dd o agent successivo):

```bash
# 1. Worktree → main mirror per node_modules access
cd C:/Users/VGit/Desktop/Game/

# 2. Boot backend + tunnel
PORT=3334 nohup node apps/backend/index.js > /tmp/backend.log 2>&1 &
cloudflared tunnel --url http://localhost:3334 > /tmp/tunnel.log 2>&1 &
sleep 5
TUNNEL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/tunnel.log | head -1)
echo "TUNNEL=$TUNNEL"

# 3. Run harness (3 phase change attesi: lobby → onboarding → character_creation)
TUNNEL=$TUNNEL \
  BROWSER_SYNC_HEADLESS=true \
  BROWSER_SYNC_PLAYERS=1 \
  BROWSER_SYNC_PHASE_TIMEOUT_MS=30000 \
  node tests/smoke/browser-sync-spectator.js

# 4. Verifica output
ls /tmp/browser-sync-runs/run-*/screenshots/
cat /tmp/browser-sync-runs/run-*/manifest.json | head -30
```

**Atteso**:

- ≥4 PNG (init host + init player + ≥1 phase host + ≥1 phase player).
- `manifest.timeline` con ≥3 entry.
- Exit code 0 se terminal_seen, 2 altrimenti (timeout senza errore fatale).

## Verification artifacts

- `node --check tests/smoke/browser-sync-spectator.js` ✅ syntax OK
- `node --check tools/sim/visual-baseline-compare.js` ✅ syntax OK
- `node --test tests/ai/*.test.js` — non eseguito in worktree (no node_modules); previsto verde su main (zero touch a apps/backend o tests/ai/).
- `npx prettier --check` — da eseguire post-mirror su main repo path.

## Next iteration scope

| Ticket | Descrizione                                                              | Effort |
| ------ | ------------------------------------------------------------------------ | ------ |
| T1.3.b | Hook fallback Node-side WS proxy (se bridge tree-shaked)                 | ~1h    |
| T1.3.c | Flag `--with-spectator` in `batch-ai-runner.js`                          | ~1-2h  |
| T1.3.d | Driver inline (non-passive) — sostituire dependency a ai-driven-sim      | ~3-4h  |
| T1.3.e | Aggiungere pngjs/pixelmatch (richiede grant) per pixel diff fine-grained | ~1h    |
| T1.3.f | Baseline canonical scenarios (enc_tutorial_01 + 2 boss) committed repo   | ~30min |

## Cross-ref

- `tests/smoke/ai-driven-sim.js` — twin harness REST/WS sintetico
- `tools/sim/batch-ai-runner.js` — parallel sim spawner
- `tools/ts/tests/playwright/phone/lib/canvasGrid.ts` — sampler canonical
- `tools/ts/tests/playwright/phone/canvas-visual.spec.ts` — Playwright spec esistente (Tier 1 #3, PR #2095)
- `tools/ts/tests/playwright/phone/phase-flow-ws.spec.ts` — phase machine multi-context (PR #2097)
- `apps/play/src/lobbyBridge.js` — fonte truth `_currentPhase`
- `apps/backend/services/network/wsSession.js` — `KNOWN_PHASES` set + `publishPhaseChange`
- `docs/playtest/2026-05-09-fase1-ai-driven-sim-harness.md` — T1.1 + T1.2 doc
- `docs/playtest/2026-05-09-fase2-batch-ai-runner.md` — T2.1 doc
- ADR-2026-05-07 auto-merge L3 (cascade pattern compatibile)
