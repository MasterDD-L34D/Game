---
title: 'Session handoff -- SPEC-F B4 FC1 resync (returning Custode additive merge) (2026-07-01 cont)'
date: 2026-07-01
sprint: spec-f-b4-and-residuals
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-07-01'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [evo-tactics, spec-f, custode, resync, b4, fc1, ambassador, handoff, security]
---

# Session handoff -- 2026-07-01 cont (SPEC-F B4 FC1 resync)

## TL;DR

- Continuation of the SPEC-F B4 arc (prior:
  `2026-07-01-session-handoff-spec-f-auth-isolation.md` +
  `2026-07-01-session-handoff-spec-f-import.md`). Master-dd chose (AskUserQuestion,
  recon-first) the **FC1 resync** lane over Option C (forbidden-path) / Tier-2 batch.
- **`POST /api/skiv/resync` BUILT + MERGED** (#3144 `802c004e`): the additive,
  home-authoritative merge of a RETURNING Custode. **Closes the buildable half of
  SPEC-F acceptance #4** (import #3135 handled the create half). Flag-less,
  band-neutral, reversible, no forbidden-path.
- **1 real Codex P1 caught + fixed** (nested-PII leak) PAST a "CLEAN" adversarial
  Workflow verdict + green CI -- the recurring lesson: a CLEAN/green is not proof.

## PR merged (1)

| PR                                                       | Scope                                                        | SHA        |
| -------------------------------------------------------- | ------------------------------------------------------------ | ---------- |
| [#3144](https://github.com/MasterDD-L34D/Game/pull/3144) | SPEC-F B4 -- POST /skiv/resync (returning Custode add merge) | `802c004e` |

## Cosa e' cambiato

### POST /api/skiv/resync (companion.js) + store.resyncCompanionState

- FC1 Opt-A (ratified ADR-2026-04-27) **home-authoritative**: the two additive
  arrays (`crossbreed_history`, `voice_diary_portable`) APPEND external entries
  (deduped via canonical-JSON, then FIFO cap 10 / 5); EVERY other field
  (`progression`/`cabinet`/`mutations`/`aspect`/`mbti`/`species`/`biome`) = HOME.
  Only the two arrays are pulled off the card -> incoming PII / non-whitelist top
  keys never reach home.
- **404-on-missing** (a RETURN requires an existing home) -- the inverse of
  import's 409-on-present. 200 (update) not 201.
- Reuse: `resyncCompanionState` hands the merged state to `saveCompanionState`, so
  the re-cap + server-side re-sign + persist are byte-identical to a normal save;
  the lineage exists (`isNewLineage=false`) so no cap-eviction of another Nido. New
  pure `appendDeduped()` helper.
- Route mirrors `/import`: rate-limit-first (own 10/h budget), `Array.isArray` card
  hygiene, signature-verify, `lineageExists()` hydrates the persisted row so
  404/merge hold across a restart too.

### Trust ceiling (FC4-A, unchanged)

Signature = transport integrity, NOT authenticity (public sha256, no server
secret) -> a griefer can forge a valid sig + append to a KNOWN lineage_id; blast
radius is bounded by the FIFO cap + dedup + rate-limit. Adversarial owner-binding
(only the owner may resync) needs a persisted per-Nido owner = Option C (Prisma
migration, owner-gated). Same ratified ceiling as the rest of SPEC-F.

## Findings (Codex, both engaged)

- **P1 (real, fixed) -- nested-PII leak.** The top-level whitelist keeps the WHOLE
  `crossbreed_history` / `voice_diary_portable` array but does NOT recurse, so a
  validly-signed card can smuggle nested PII (`partner_card_url`, `session_id`,
  `_notes`, `email`) INSIDE an item -> it persists + leaks via share/history for a
  known lineage_id. resync's append-to-existing makes this reachable on an owned
  lineage that import's 409 blocked. Fix = ROOT in the shared `saveCompanionState`:
  new `sanitizeItems()` enforces the PER-ITEM schema whitelist
  (`CROSSBREED_ITEM_FIELDS` / `VOICE_DIARY_ITEM_FIELDS`, mirroring the
  `additionalProperties:false` item schemas) -> covers import + promote + resync in
  one place (ponytail fix-the-shared-hole, mirrors the #3135 sibling-fix). resync
  also sanitizes the incoming arrays BEFORE dedup. +1 regression test.
- **P2 (pre-existing, tracked) -- post-restart hydrate returns a partial home.**
  `persistAsync` writes only 6 columns, so `species_id`/`biome_id`/`progression`
  are NEVER durable and are already lost at the first restart regardless of resync
  (import/promote/share exhibit the same truncation). Documented in the route
  JSDoc; tracked in `TKT-PERSISTENCE-LAYER`. A full fix = persist-all-fields =
  owner-gated Option C. No code change.

## Verification

- 100/100 SPEC-F suites (skivCustode + companion + store unit), route glob 76/76,
  AI baseline **567/567**, prettier + governance clean.
- Adversarial 3-lens Workflow (security / spec-fidelity / correctness,
  refute-by-default + verify): returned CLEAN -- yet Codex found the P1. **Green /
  CLEAN is not proof; verify the actual claim, not the verdict.**
- Forbidden-path clean: `apps/backend/**` + `tests/**` only. No new deps.

## Blockers residui (owner / coordination -- B4 buildable is DRAINED)

- [ ] **B4 live-run unit injection** (session.js roster consumes the
      `spawn_descriptor`) = the parallel W5/form-pulse lane -> coordinate, not
      autonomous.
- [ ] **B4 durable crossbreed cooldown** -- needs a `packages/contracts` schema
      field (forbidden-path, master-dd).
- [ ] **SPEC-F per-Nido auth Option C** -- durable `nidoId` Prisma column +
      startup owner-index rehydrate (forbidden-path, owner sign-off).
- [ ] **P2 persistence truncation** (TKT-PERSISTENCE-LAYER) -- persist all
      whitelist fields (JSON blob column / wider schema) = owner-gated.

## Next entry point

1. **First action**: choose a lane -- (a) surface a `packages/contracts`/Prisma
   proposal for Option C or durable cooldown (both owner-gated, STOP + ask), (b) a
   Tier-2 owner-decision batch (closeout sez.2 + register), or (c) join the
   W5/form-pulse lane (coordinate first).
2. **Reference**: this handoff + `project_spec_f_crossbreed` (memory, FC1 resync
   entry) + closeout sez.6bis (B4 slices drained) + the residual-gate register.

## Lessons (this session)

- **A CLEAN adversarial-review verdict + green CI are not proof.** The 3-lens
  Workflow returned zero findings; Codex then found a real P1 (nested-PII) and a
  real P2. Verify the actual claim/harness, not the verdict (extends
  `lesson_codex_ratelimit_audit_compensating`).
- **Fix the shared hole, not the reported caller.** The nested-PII leak was filed
  against resync but the root was `saveCompanionState`'s non-recursive whitelist;
  fixing it there closed the same latent hole on import + promote (ponytail
  root-cause; mirrors the #3135 hydrate-guard sibling-fix).
- **A per-field privacy boundary must recurse.** A top-level whitelist that keeps a
  whole array does not sanitize the array items -- enforce the item schema too.

## Memory (aggiornate questa sessione)

- `project_spec_f_crossbreed` (FC1 resync #3144 + the nested-PII P1 lesson).
- `MEMORY.md` index (SPEC-F line updated).
