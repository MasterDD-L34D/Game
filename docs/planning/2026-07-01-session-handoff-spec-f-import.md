---
title: 'Session handoff -- SPEC-F B4 import slice (foreign card -> ambassador) (2026-07-01 cont)'
date: 2026-07-01
sprint: spec-f-b4-and-residuals
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-07-01'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [evo-tactics, spec-f, custode, import, b4, ambassador, handoff, security]
---

# Session handoff -- 2026-07-01 cont (SPEC-F B4 import)

## TL;DR

- **1 PR merged, 0 open.** Continuation of the SPEC-F B4 arc (prior session:
  `2026-07-01-session-handoff-tkt-p6-tier1-spec-f-b4.md`, PRs #3124-#3131).
- Lane chosen via AskUserQuestion (recon-first): the prompt tentatively favored
  **per-Nido AUTH isolation**, but a 4-file recon proved that lane is
  **owner/forbidden-path** (store partition needs a `nido_id` schema field in
  `packages/contracts` + a Nido-identity model = design-call). `POST /skiv/import`
  was the clean autonomous slice instead -- master-dd confirmed.
- **`POST /api/skiv/import` BUILT + MERGED** (#3135 `2b28da13`): import a signed
  foreign card as a permanent ambassador. Closes **SPEC-F acceptance #4**.
- Adversarial 3-lens Workflow (security / spec-fidelity / correctness) + Codex
  sweep. 1 Codex **P1 (real)** caught + fixed (cross-restart overwrite).

## PR merged (1)

| PR                                                       | Scope                                                       | SHA        | Note                                             |
| -------------------------------------------------------- | ----------------------------------------------------------- | ---------- | ------------------------------------------------ |
| [#3135](https://github.com/MasterDD-L34D/Game/pull/3135) | SPEC-F B4 -- POST /skiv/import (foreign card -> ambassador) | `2b28da13` | 2 commits: import + Codex P1 hydrate fix. 47/47. |

## Cosa e' cambiato

### POST /api/skiv/import (companion.js)

- Body `{ card }` = the `GET /skiv/share?format=json` output of another Nido.
- Steps: **rate-limit first** (10/h per IP, every attempt incl. garbage counts) ->
  **signature-verify** (`signatureFor(card)` == card sig; 400 else) -> lineage_id
  required -> **FC1 home-authoritative refuse-overwrite** (409) -> persist via
  `saveCompanionState` (whitelist-only drops PII, re-signs server-side, cap-10 FIFO).
- **FC4-A** (ratified 2026-06-08): accept on valid signature + rate-limit, no
  allowlist. The sig detects **corruption, not forgery** (public sha256, no server
  secret) -- so rate-limit + refuse-overwrite + whitelist are the real guards.
- Band-neutral (no combat/session/N=40), **no flag, reversible, no forbidden-path**
  (only `apps/backend/` + `tests/`; `packages/contracts` untouched).
- DRY: the 3 inline rate-limiters collapsed to a `makeRateLimiter()` factory.

## Findings (1 P1, fixed)

- **#3135 Codex P1 (real, verified vs source) -- cross-restart overwrite.** Prod
  wires the store with Prisma (`app.js`). `getCompanionState` reads the in-memory
  Map ONLY, but `saveCompanionState` **Prisma-upserts**. After a restart, a
  persisted ambassador row is absent from memory -> a client `lineage_id` slips the
  memory-only refuse-overwrite guard and **overwrites the persisted row** (violates
  FC1). Fix: new `lineageExists()` = **hydrateAsync-then-check**, wired into BOTH
  the import AND promote guards (the same pre-existing hole shipped in #3131 promote
  -> ponytail root-cause, fix the sibling too). No-op for in-memory stores; a
  hydrate failure degrades to same-process only, never blocks a valid write. +2
  cross-restart regression tests via a persistent-store stub.
- 3-lens adversarial review also confirmed a P3 (rate-limit ordering -> moved
  rate-limit first so garbage counts) + applied an `Array.isArray` card guard
  (#3131 boundary-hygiene, not exploitable but pattern-consistent).

## Blockers residui (owner / coordination -- unchanged, tutti DEFER)

- [ ] **SPEC-F per-Nido AUTH isolation** -- the whole SPEC-F surface is
      unauthenticated + the companion store is a process-global singleton keyed by
      lineage_id (cap-10 global). Full fix = per-Nido/per-user partition = needs a
      `nido_id` field on the schema (`packages/contracts` forbidden-path) + a
      Nido-identity model + JWT wiring (`middleware/auth.js` exists,
      honor-when-configured-else-open). Owner design-call. The recurring gap (hit by
      eviction-grief + cross-lineage/cross-restart overwrite; mitigated per-case by
      rate-limit + refuse-overwrite + hydrate).
- [ ] **B4 live-run unit injection** (session.js roster consumes the
      `spawn_descriptor`) = touches session.js = the parallel W5/form-pulse lane ->
      coordinate, not autonomous.
- [ ] **B4 durable crossbreed cooldown** -- needs a `packages/contracts` schema
      field (forbidden-path, master-dd). In-memory today (per-process).
- [ ] **Residual-gate leftovers** (from #3126): B5 TR-200x metrics (owner balance
      content), B3 canon-stopwords re-scope (owner), Tier-2 owner-decisions.

## Next entry point

1. **First action**: choose a lane -- (a) a Tier-2 owner-decision batch (closeout
   sez.2 + register), (b) join the W5/form-pulse lane (owned by the parallel session
   -- coordinate first), or (c) surface a `packages/contracts`/design proposal for
   per-Nido auth or durable cooldown (both owner-gated).
2. **Reference**: this handoff + `project_spec_f_crossbreed` (memory) + the closeout
   master plan sez.6/6bis + the residual-gate register.
3. **Note**: SPEC-F B4 buildable slices are now DRAINED (closeout sez.6bis) -- all
   remaining B4 residues are owner/coordination-gated.

## Piani toccati (collegamenti)

- Close-out master plan (sez.6bis added -- B4 buildable drained):
  `docs/planning/2026-06-29-closeout-master-plan.md`.
- SPEC-F design (B4 import sez.6, FC4-A trust, acceptance #4):
  `docs/design/evo-tactics-custode-portable-framework.md`.
- Prior session lineage: `docs/planning/2026-07-01-session-handoff-tkt-p6-tier1-spec-f-b4.md`.
- Residual-gate register (per-gate view): `docs/planning/2026-06-23-residual-gate-register.md`.

## Lessons (this session)

- **A memory-only existence/overwrite guard is a LIE on a write-through store.**
  `getCompanionState` reads memory; `saveCompanionState` upserts to Prisma -> across
  a restart the guard is blind to persisted rows. Hydrate the persisted row before
  the check (`lineageExists` = hydrateAsync-then-check). Fix the sibling caller too
  (promote had the identical hole).
- **Recon before trusting a lane recommendation.** The prompt favored auth-isolation;
  the recon showed it is owner/forbidden-path (store partition = contracts schema) and
  import was the clean buildable slice. Marker = hypothesis, git/source = truth.
- **Untrusted body hardening (continued from #3131).** Rate-limit first so garbage
  counts; `Array.isArray` on every object-typed body field; never route a client key
  into a keyed store-write without an existence/overwrite guard.

## Memory (aggiornate questa sessione)

- `project_spec_f_crossbreed` (import slice #3135 + the hydrate-guard P1 lesson).
- `lesson_durable_test_must_hydrate` (extended: memory-only guard = LIE on write-through).
- `MEMORY.md` index (compacted under limit + SPEC-F line updated).
