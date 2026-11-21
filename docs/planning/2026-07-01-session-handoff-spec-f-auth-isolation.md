---
title: 'Session handoff -- SPEC-F per-Nido auth isolation (Option A + D) (2026-07-01 cont)'
date: 2026-07-01
sprint: spec-f-b4-and-residuals
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-07-01'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [evo-tactics, spec-f, custode, auth, isolation, nido, security, handoff, jwt]
---

# Session handoff -- 2026-07-01 cont (SPEC-F per-Nido auth isolation)

## TL;DR

- Continuation of the SPEC-F B4 arc (import handoff:
  `2026-07-01-session-handoff-spec-f-import.md`). Master-dd chose the recurring
  **per-Nido auth isolation** gap as the lane; a recon (4-finder workflow) + batched
  design-calls (AskUserQuestion) ratified an incremental, flag-OFF build.
- **The per-Nido auth lane is now Option A (cap) + Option D (gate) DONE**, both
  flag-OFF/reversible. Only **Option C** (durable `nidoId` Prisma migration =
  forbidden-path) remains, owner-gated.
- Also fixed a real **anti-pattern #10**: the entire `tests/routes/**` SPEC-F suite
  (import + isolation + gate, incl. the flag-OFF byte-identical guards) was
  **CI-orphaned** -- now wired into `run-test-api.cjs`.

## PR merged (this lane)

| PR                                                       | Scope                                                           | SHA        |
| -------------------------------------------------------- | --------------------------------------------------------------- | ---------- |
| [#3138](https://github.com/MasterDD-L34D/Game/pull/3138) | per-Nido isolation Option A (in-memory per-owner cap, flag-OFF) | `aa1983bb` |
| [#3140](https://github.com/MasterDD-L34D/Game/pull/3140) | Option D JWT write-gate + wire tests/routes into CI             | `61a7594e` |

(Earlier this session: #3135 import `2b28da13`, #3137 docs `b1218a2e`.)

## The gap + the recon

The companion store is a process-global singleton keyed by `lineage_id`; the cap-10
is **global with FIFO**, so Player B saving an 11th companion silently evicts Player
A's oldest -- cross-tenant data destruction (hit 3x this arc: eviction-grief,
cross-lineage overwrite, cross-restart overwrite). "Nido" is not a first-class
entity; `player_id` is the durable request-available id; the JWT middleware exists
(`middleware/auth.js`) but `/api/skiv/*` is unwired (open).

**Design-calls ratified (master-dd, all recommended):** owner = `player_id` + JWT sub
override / reads = public-tier (no gating, share_url precedent) / durable = **defer
Option C**.

## Option A -- in-memory per-owner cap (#3138)

- Flag `SPEC_F_NIDO_ISOLATION_ENABLED` (OFF = global cap + per-IP rate-limit,
  byte-identical). ON: the store scopes the cap **per-owner** via an in-memory
  `ownerLineages` index (`saveCompanionState(state, { owner, isolate })`), so an
  owner's (cap+1)th add evicts THAT owner's oldest, never another Nido's.
- **2 security findings caught past a "CLEAN" 3-lens review** (the verifier only
  tested the object-`player_id` collapse, missing the string variant):
  - **rotation-bypass**: a per-owner rate-limit keyed by a self-asserted `player_id`
    lets a griefer rotate distinct id strings for a fresh 10/h budget each -> unbounded
    flood. Fix: rate-limit per-owner **only when JWT-trusted**; self-asserted stays
    per-IP (`deriveOwner` -> `{ id, trusted }`, `rateKey` gates on `owner.trusted`).
  - **Codex P2 ownerless-eviction**: a write with no owner fell to the global FIFO ->
    evicted an owned Nido -> dropping `player_id` bypassed isolation. Fix: ownerless
    writes go to a shared `ANON_BUCKET` (evicts only anon). `deriveOwner`
    string-validates `player_id` (an object never becomes a Map/rate key).
- **Trust ceiling (documented):** with self-asserted `player_id` the cap isolation is
  **cooperative** (honest clients stop colliding; a griefer who knows a target id can
  target it). Adversarial safety needs JWT -- the crypto guarantee is the sub, not the
  id string. Warm-state only (resets on restart).

## Option D -- JWT write-gate (#3140)

- Flag `SPEC_F_WRITE_AUTH_ENABLED` (OFF = writes open, byte-identical). ON: applies the
  shared `createAuthHandlers().authenticate` (same as `routes/traits.js`) to the **3
  WRITE routes** (promote/import/crossbreed-confirm) -- NOT the public GET reads, NOT
  crossbreed-propose. When `AUTH_SECRET` is set -> enforce a valid JWT (401 else) ->
  `req.auth.userId` (sub) becomes the **trusted owner** -> the isolation cap +
  rate-limit key on the crypto-bound sub, closing the spoof/rotation ceiling.
- **Codex P2**: `createAuthHandlers()` falls back to the shared
  `TRAIT_EDITOR_TOKEN`/`TRAITS_API_TOKEN` when set but `AUTH_SECRET` is not -> would gate
  SPEC-F writes with the static trait-editor token (wrong credential + no per-player
  sub). Fix: `createAuthHandlers({ legacyToken: null })` = **JWT-only**.
- **anti-pattern #10 fix (review P1):** `tests/routes/**` was CI-orphaned (no glob in
  `scripts/run-test-api.cjs`); wired `node --test tests/routes/*.test.js`, which
  retroactively CI-covers the #3135/#3138 route tests too.

## How to flip (owner)

Full adversarial-safe per-Nido isolation in prod = **both** flags ON
(`SPEC_F_NIDO_ISOLATION_ENABLED=true` + `SPEC_F_WRITE_AUTH_ENABLED=true`) **and**
`AUTH_SECRET` configured (so writes require a JWT and the sub is the trusted owner).
Enabling isolation alone = cooperative (honest-client) isolation. Enabling the gate
requires clients to send JWTs (breaking change for unauthenticated write clients) --
stage it when the client (Godot phone) sends tokens.

## Blockers residui (owner / coordination)

- [ ] **Option C -- durable per-Nido cap** (persisted `nidoId` on the Prisma
      `SkivCompanionState` + rehydrate the owner index) -> cap survives a restart.
      Additive nullable column, but a **Prisma migration = forbidden-path**, owner-gated.
      Option A's warm-state cap resets on restart until this lands.
- [ ] **B4 FC1 resync** (returning-home additive merge) -- the other buildable B4 slice
      (import currently 409-refuse-overwrites; no additive merge).
- [ ] **B4 live-run unit injection** (session.js roster) = the W5/form-pulse lane.
- [ ] **B4 durable crossbreed cooldown** (contracts schema field, forbidden-path).
- [ ] Residual-gate leftovers (B5 TR-200x metrics, B3 stopwords, Tier-2 owner batch).

## Next entry point

1. **First action**: choose a lane -- (a) Option C durable `nidoId` (needs a
   `packages/contracts`/Prisma migration sign-off), (b) FC1 resync (recon-first for
   autonomy vs the W5 lane), or (c) a Tier-2 owner-decision batch.
2. **Reference**: this handoff + `project_spec_f_crossbreed` (memory, Option A + D
   entries) + the closeout master plan sez.6bis + the residual-gate register.

## Lessons (this session)

- **Don't trust a review "CLEAN" or a green CI.** The isolation review returned CLEAN,
  yet the rotation-bypass (verifier tested the wrong variant) and the CI-orphan (the
  route tests never ran in CI) were both real. Verify the actual claim/harness, not the
  verdict.
- **A per-owner key from self-asserted input is spoofable.** Cap isolation can be
  cooperative, but any adversarial guarantee (rate-limit, ownership) must key on a
  crypto-bound identity (JWT sub), not a client-supplied string. Gate ownerless writes
  to an isolated bucket; never let dropping the id field fall back to a global evict.
- **JWT-only means JWT-only.** `createAuthHandlers()` silently accepts a legacy shared
  token; disable it (`legacyToken: null`) when a per-user identity is required.
- **CI-orphaned tests are invisible failures.** A new test dir needs a glob in the
  harness or it "passes" by never running (anti-pattern #10).

## Memory (aggiornate questa sessione)

- `project_spec_f_crossbreed` (import #3135 + isolation A #3138 + gate D #3140 + the
  security lessons).
- `MEMORY.md` index (compacted under limit; SPEC-F line = full B4 + auth A/D).
