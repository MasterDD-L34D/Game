---
title: 'Session handoff -- SPEC-F FC1 resync + Tier-2 owner-batch recon + O8 schema (2026-07-01 closeout)'
date: 2026-07-01
sprint: spec-f-b4-and-residuals
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-07-01'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags:
  [
    evo-tactics,
    spec-f,
    custode,
    resync,
    tier2,
    closeout,
    resistance-archetype,
    handoff,
    forbidden-path,
  ]
---

# Session handoff -- 2026-07-01 (FC1 resync + Tier-2 batch + O8 closeout)

## TL;DR

- Sessione a due tratti: (1) chiuso **SPEC-F B4 FC1 resync** (l'ultimo slice buildable
  autonomo di acceptance #4); (2) su scelta master-dd, drenato il **Tier-2
  owner-decision batch** -- che il recon ha trovato quasi tutto gia' fatto (marker
  stale) tranne **O8** (`resistance_archetype` schema).
- **3 PR merged** (FC1 resync + 2 doc-sync) + **1 PR aperta owner-gated** (O8
  forbidden-path, aspetta il manual merge di master-dd).
- Metodo costante: recon-first via Workflow multi-finder (git=verita'), adversarial
  review + Codex sweep su ogni PR, AskUserQuestion per ogni design-call /
  forbidden-path.

## PR (questa sessione)

| PR                                                       | Cosa                                                  | SHA / stato       |
| -------------------------------------------------------- | ----------------------------------------------------- | ----------------- |
| [#3144](https://github.com/MasterDD-L34D/Game/pull/3144) | SPEC-F B4 FC1 resync (`POST /skiv/resync`)            | `802c004e` MERGED |
| [#3145](https://github.com/MasterDD-L34D/Game/pull/3145) | doc-sync FC1 (handoff + closeout 6bis + registry)     | `13ddda19` MERGED |
| [#3148](https://github.com/MasterDD-L34D/Game/pull/3148) | doc-hygiene Tier-2 (marker -> git + note O8)          | `721c30a1` MERGED |
| [#3147](https://github.com/MasterDD-L34D/Game/pull/3147) | O8 `resistance_archetype` enum (`packages/contracts`) | **OPEN** owner    |

## Tratto 1 -- FC1 resync (acceptance #4 buildable half CLOSED)

- `POST /api/skiv/resync` + `store.resyncCompanionState` + `appendDeduped`. FC1
  Opt-A home-authoritative: external `crossbreed_history`/`voice_diary_portable`
  APPEND (dedup + FIFO cap); ogni altro campo = HOME. 404-on-missing (RETURN, inverso
  di import 409). Reuse `saveCompanionState` (no eviction). Flag-less, band-neutral,
  reversibile.
- **Codex P1 (nested-PII)**: la whitelist top-level non ricorre -> una card firmata
  puo' smuggle PII dentro un item -> leak via share. Fix ROOT in `saveCompanionState`
  (`sanitizeItems()` per-item schema whitelist) -> copre import+promote+resync.
- **Codex P2** = truncation persistence-layer pre-esistente (6 colonne persistite),
  tracked TKT-PERSISTENCE-LAYER, no code.
- Dettaglio: [`2026-07-01-session-handoff-spec-f-fc1-resync.md`](2026-07-01-session-handoff-spec-f-fc1-resync.md).

## Tratto 2 -- Tier-2 owner-batch (recon -> DRENATO) + O8

- Recon Workflow (4-finder, ground-truth su `origin/main`, anti-pattern #19): il batch
  era quasi tutto gia' chiuso -- **marker STALE**. Verificato DONE: O1 #3098 / O2 #3076
  / O5 #3097 / I1 #3071 (non #3067) / I2 / I7 #3073. O7 GAP2-next = **defer affermato**.
- **O8 `resistance_archetype`** = unica vera owner-decision: enum canonico
  `[adattivo, bioelettrico, corazzato, psionico, termico]` formalizzato in
  `packages/contracts/schemas/species.schema.json` (chiude il workaround
  `additionalProperties:true` dove un archetipo typo cadeva silent al default =
  resistenze sbagliate). Additive/optional; dry-run **107/107 valori gia' canonici**
  (0 rotture); +3 test enum CI-wired (`tests/api/contracts-species-archetype.test.js`).
  Firma forbidden-path via AskUserQuestion (2-step: direzione + diff esatto).
- Dettaglio marker: closeout sez.1B **DELTA 2026-07-01**.

## Piani toccati / completati (collegamenti)

- Close-out master plan (sez.6bis B4 slices drained + sez.1B DELTA Tier-2):
  [`2026-06-29-closeout-master-plan.md`](2026-06-29-closeout-master-plan.md).
- Residual-gate register (row 119 export/import/promote/resync DONE):
  [`2026-06-23-residual-gate-register.md`](2026-06-23-residual-gate-register.md).
- SPEC-F design (FC1 :172-181, FC4-A trust, acceptance #4):
  [`docs/design/evo-tactics-custode-portable-framework.md`](../design/evo-tactics-custode-portable-framework.md).
- BACKLOG: TKT-SALVAGE-A2 (O8) entry aggiornata (schema-field -> PR #3147) +
  TKT-PERSISTENCE-LAYER (Codex P2 residue) + SPEC-F Option C.
- Handoff FC1: [`2026-07-01-session-handoff-spec-f-fc1-resync.md`](2026-07-01-session-handoff-spec-f-fc1-resync.md).

## Residui (owner / coordination) -- entry point prossima sessione

1. **Merge O8 [PR #3147](https://github.com/MasterDD-L34D/Game/pull/3147)** -- mani
   master-dd (forbidden-path `packages/contracts`, no auto-merge L3). Dopo: per-species
   non-default archetype assignments = design pass.
2. **Option C durable per-Nido cap** -- persist `nidoId`/owner su Prisma
   `SkivCompanionState` + rehydrate owner-index a startup (Prisma migration =
   forbidden-path, owner sign-off). Sblocca anche parte di TKT-PERSISTENCE-LAYER I3.
3. **TKT-PERSISTENCE-LAYER** -- persist-all-fields (Codex P2 FC1 truncation) + durable
   crossbreed cooldown (contracts) + I3/I4. Workstream dedicato.
4. **O7 GAP2-next block-4** -- solo se re-open (opzionale, deferred).
5. **Coordinamento lane W5/form-pulse** (sessione parallela): NON toccare `session.js`,
   `apps/backend/services/imprint/*`, `services/identity/brancoTraitProducer.js`,
   `tools/sim/*`, `moveCost`. La B4 live-run unit injection vive li'.

## Lessons (questa sessione)

- **Un verdetto adversarial-Workflow "CLEAN" + CI verde NON sono prova.** Il mio recon
  3-lens su FC1 resync ha dato CLEAN; Codex ha poi trovato 2 finding reali (nested-PII
  P1 + truncation P2). Verify the claim/harness, non il verdetto.
- **Fix the shared hole, non il caller segnalato.** Il leak nested-PII era filed su
  resync ma la radice era `saveCompanionState` non-ricorsiva -> fix li' chiude anche
  import+promote (ponytail root-cause).
- **Marker = ipotesi, git = verita' (anti-pattern #19).** Il Tier-2 batch sembrava 10
  decisioni aperte; il recon ha mostrato 8/10 gia' fatte. Un recon-finder ha anche
  citato un PR-ref plausibile-ma-sbagliato (I1 #3067 vs #3071) -> Codex `git -S` l'ha
  beccato. Verifica ogni PR-ref contro `git log -S`.
- **Forbidden-path = STOP + firma sul diff esatto.** O8 tocca `packages/contracts`:
  AskUserQuestion 2-step (direzione + diff), dry-run 0-rotture prima del commit, PR
  dedicata a manual merge master-dd. Mai self-merge forbidden-path.

## Memory aggiornate

- `project_spec_f_crossbreed` (FC1 resync #3144 + nested-PII P1 lesson).
- `project_closeout_master_plan` (cont-6: Tier-2 recon + O8).
- `MEMORY.md` index (SPEC-F line).
- `lesson_durable_test_must_hydrate` (gia' esteso).
