# Routine health sweep -- 3 Evo-Tactics repos (2026-06-09)

Read-only routine-check sweep (lint / format / test / build / typecheck / governance /
schema as applicable per stack). NO fixes, NO commits -- audit only. Run from Ryzen
(DESKTOP-T77TMKT). Mechanism: 3 parallel `general-purpose` health workers (agent-scanner
TEAM_FORMATION first -- no dedicated health-sweep agent existed, reused general-purpose,
anti-shadow-duplicate).

## TL;DR

| Repo            | Verdict     | CI-equivalent gates | Only red                                          |
| --------------- | ----------- | ------------------- | ------------------------------------------------- |
| Game            | WARN-ONLY   | ALL GREEN           | `format:check` 115-file Prettier debt (pre-exist) |
| Game-Database   | WARN-ONLY   | ALL GREEN (static)  | schema-doc `--check` = local CRLF/LF artifact (0 content diff, passes Linux CI) |
| Game-Godot-v2   | GREEN       | ALL GREEN           | 2 benign teardown-race ERROR pairs (tests pass)   |

**No real CI-gating failures in any repo.** Every test/build/lint/schema/governance gate
that CI enforces is green. The 3 "reds" are all known non-blocking artifacts.

---

## Game (C:/dev/Game, main, post-#2681)

| check                              | result | key numbers                                              |
| ---------------------------------- | ------ | -------------------------------------------------------- |
| `npm run format:check`             | FAIL   | 115 files Prettier style debt, exit 1 (pre-existing)     |
| `npm run lint:stack`               | PASS   | exit 0                                                    |
| `npm run schema:lint`              | PASS   | 10/10 evo schemas valid                                  |
| `check_docs_governance --strict`   | PASS   | errors=0, warnings=254, exit 0                            |
| `node --test tests/ai/*.test.js`   | PASS   | 500/500 (baseline >=382 OK)                              |
| `node --test tests/play/biomeChip` | PASS   | 36/36 (the just-merged wounded telegraph)                |
| `npm run build`                    | PASS   | 3 vite/tsc builds green                                  |
| `npm run test:api`                 | PASS   | 3927/3927 pass across 25+ sub-suites, exit 0             |

- ERRORS: none. (test:api `HTTP 500`/`Invalid URL` lines = intentional negative-path in
  `generatorClientFetchCatalog.test.js` hitting fail1/fail2.com -- that test PASSED.)
- WARNINGS: format:check 115 files (pre-existing debt, spans apps/ + docs/ + tools/ + CLAUDE.md);
  schema:lint jsonschema `RefResolver` deprecation x2 (tool-internal); governance warnings=254
  (strict still exit 0); build `runtime-config.js` non-module script notice (build succeeds);
  benign runtime info noise (`[prisma] stub in memoria`, `[auth] nessun provider`).
- SKIPPED: none (all 8 ran in time-box; backend not needed).

## Game-Database (C:/dev/Game-Database, main @ a66a95d, PR #177)

No root package.json. Real scripts in `server/package.json` + `apps/dashboard/package.json`.
No project-level lint/prettier/typecheck script (CLAUDE.md: "non c'e' uno step di lint dedicato").

| check                                  | result            | key numbers                                |
| -------------------------------------- | ----------------- | ------------------------------------------ |
| schema-doc-check (`--check`)           | WARN (local-only) | exit 1 LOCAL; pure CRLF-vs-LF, 0 content diff -> PASS in Linux CI |
| dashboard Vitest (CI `checks` set)     | PASS              | 8 files, 27 tests, ~23s                    |
| dashboard build (`vite build`)         | PASS              | 2944 modules, 3.49s                        |
| `npx prisma validate`                  | PASS              | schema valid, 15 models / 10 enums         |
| backend `npm test` (23 suites)         | SKIP (probe PASS) | DB-backed; no-DB `health.test.js` 3/3 pass |
| `tsc --noEmit` (bonus, NOT a CI gate)  | FAIL (non-gate)   | 94 errors / 32 files -- mostly missing vitest globals in test files |
| search-db / prisma-seed / e2e / import | SKIP              | need Postgres / browser / live servers     |

- ERRORS: none that are real CI gates. schema-doc `--check` failure = committed
  `docs/schema-reference.md` has CRLF, generator emits LF; 580/580 lines differ only by `\r`,
  byte-identical after EOL-normalize. `.gitattributes` `* text=auto` -> Linux CI checks out LF
  -> passes there. Local-Windows working-tree artifact, not a defect.
- WARNINGS: dashboard build chunk-size advisory (index 901.94 kB) + Browserslist 7-months-old;
  tsc 94 errors (not wired in CI -- `describe/it/expect` missing vitest types, `import.meta.env`,
  strict-null in a few .tsx).
- SKIPPED: all Postgres/browser-dependent suites (task forbade starting docker/PG).

## Game-Godot-v2 (C:/dev/Game-Godot-v2)

Env: Godot 4.6.2-stable (at AppData, NOT on PATH; matches CI `GODOT_VERSION 4.6.2`);
gdtoolkit gdlint+gdformat 4.5.0 on PATH; GUT addon present (356 unit scripts).

| check                          | result | key numbers                                       |
| ------------------------------ | ------ | ------------------------------------------------- |
| `gdformat --check` (609 files) | PASS   | 609 unchanged, exit 0                              |
| `gdlint` (609 files)           | PASS   | "no problems found", exit 0                        |
| `godot --headless --import`    | PASS   | exit 0                                             |
| GUT headless (tests/unit)      | PASS   | 3246 tests, 3241 pass / 0 fail, 5 pending, exit 0  |
| static red-flag scan           | PASS   | 0 breakpoint, 0 assert(false), 6 push_error, 6 TODO |
| biome-focus drift gate         | SKIP   | git-diff CI gate, not run read-only               |

- ERRORS (benign, tests still PASS): 2 identical pairs in `tests/unit/test_canvas_transition.gd:38`
  -- GUT `autofree` frees the transition node while `transition_complete.emit()`
  (`scripts/ui/canvas_transition.gd:67`) is still on the stack -> "Object is locked and can't be
  freed". Plus at exit: `ObjectDB instances leaked` / `2 resources still in use` (same teardown
  race). GUT exits 0; no assertion fails.
- WARNINGS: GUT `Warnings 10, Deprecated 6, Orphans 2` -- 6x `wait_frames` deprecated (use
  wait_physics_frames), 2x Float/Int comparison nit, 8x "still has children" teardown notice,
  + intentional product warnings emitted+asserted by tests (promotion tier-gate, sigil empty-action,
  phone_composer vote-ack).
- SKIPPED/UNAVAILABLE: 5 pending GUT tests (Control focus untracked in headless DisplayServer --
  by design, CI same); biome-focus drift gate; tests/integration (CI scopes to tests/unit).

---

## Actionable residue (none blocking)

1. **Godot `canvas_transition.gd:67` free-while-emit race** (top finding). Only real code-level
   ERROR surfaced. Likely test-harness-only (GUT autofree frees mid-emit; real usage doesn't
   free the node during the signal) -- agent verdict cosmetic. Worth a 1-line guard
   (`is_instance_valid` / defer free) if it recurs. NOT confirmed product defect.
2. **Game 115-file Prettier debt** -- a repo-wide `npm run format` would clear it but produces a
   large diff across apps/ + docs/ + tools/; likely intentional-debt territory, own-PR decision.
3. **Game-Database schema-reference.md CRLF** -- harmless on Linux CI; a one-time
   `git add --renormalize` would silence the local-Windows `--check`. Cosmetic.
4. **Game-Database dashboard `tsc` 94 errors** -- not a CI gate (vitest type setup absent under
   raw tsc). Only matters if a `tsc` gate is ever added.
