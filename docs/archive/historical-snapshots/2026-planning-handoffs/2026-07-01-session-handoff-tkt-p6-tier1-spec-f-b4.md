---
title: 'Session handoff -- TKT-P6 gate + Tier-1 reconciliation + SPEC-F B4 arc (2026-07-01)'
date: 2026-07-01
sprint: spec-f-b4-and-residuals
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-07-01'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [evo-tactics, spec-f, tkt-p6, trait-orphan, residual, closeout, handoff, b4, offspring]
---

# Session handoff -- 2026-07-01 (TKT-P6 gate + Tier-1 recon + SPEC-F B4)

## TL;DR

- **5 PR merged, 0 open.** Started on the trait-orphan / Form-Pulse v2 program; the
  form-pulse lane was owned by a PARALLEL session (W5 sim-harness), so this session
  stayed strictly OUT of that lane and drained the adjacent residuals.
- **TKT-P6 17 non-combat trait orphans RESOLVED** via an existence-faithful 2-tier gate
  (no fabricated combat mechanics).
- **Tier-1 CLOSE-NOW residuals reconciled**: a 6-finder recon proved ALL of them are
  stale-done / dormant / owner-gated (not autonomous-buildable) -- additive record so
  neither session re-derives them.
- **SPEC-F B4 arc BUILT end-to-end** (3 slices): card/qr export + offspring->ambassador
  promote (ritual) + crossbreed-offspring promote (descriptor + genome map).
- Every PR: recon-first + adversarial pre-merge review (Workflow) + Codex swept
  (reply+resolve). 6 real findings caught+fixed (2 of them security P1/P2).

## PR mergiati (5)

| PR                                                       | Scope                                                                           | SHA        | Note                                              |
| -------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------- | ------------------------------------------------- |
| [#3124](https://github.com/MasterDD-L34D/Game/pull/3124) | check_missing_traits 2-tier existence gate (TKT-P6 17 non-combat orphans)       | `bdc01015` | +Codex P2 (combat-strict JSON) +review P3 (.YAML) |
| [#3126](https://github.com/MasterDD-L34D/Game/pull/3126) | closeout sez.6 -- Tier-1 residual reconciliation (recon 6-finder, git-verified) | `3b35d9d1` | doc-only, additive                                |
| [#3128](https://github.com/MasterDD-L34D/Game/pull/3128) | SPEC-F B4 slice 1 -- card + qr export on /skiv/share                            | `df67dabc` | +Codex P2 (QR=share_url per ADR:110)              |
| [#3129](https://github.com/MasterDD-L34D/Game/pull/3129) | SPEC-F B4 slice 2 -- promote offspring -> ambassador (+ spawn_descriptor)       | `b3a1037b` | +rate-limit parity +Codex P2 (crossbreed scope)   |
| [#3131](https://github.com/MasterDD-L34D/Game/pull/3131) | SPEC-F B4 -- promotable crossbreed offspring (descriptor + genome map)          | `1c582b67` | +P1 crash fix +P2 overwrite fix                   |

## Cosa e' cambiato (milestone)

### TKT-P6 17 non-combat trait orphans -- RESOLVED (#3124)

- `check_missing_traits` was flagging 17 species trait_refs as "missing" because it used
  `active_effects.yaml` (the COMBAT resolver) as its single existence reference -- but all
  17 are NON-combat and already exist in the canonical **glossary** (label+lore IT/EN).
- Verdetto master-dd (AskUserQuestion) = **existence 2-tier gate**: Tier-1 FAIL = phantom
  (trait in NO registry); Tier-2 WARN = in glossary but not combat-resolvable (the 17) OR
  species with no trait_refs (the 29). `--combat-strict` restores the legacy combat audit.
  `default --strict` now exits 0 honestly. Aligns the advisory tool to the CI guard
  `speciesTraitReferences.test.js` (already glossary-based). +footgun fix (`--species`
  append-default) + loader case-insensitive.
- 🔑 the gate is NOT CI-wired + nothing imports it (advisory); did NOT force combat
  (fabrication -- the #3118 verify rejected that). 29 no-trait species = owner-gated WARN.

### Tier-1 residual reconciliation (#3126)

- 6-finder recon ground-truthed every Tier-1 CLOSE-NOW candidate vs origin/main:
  **B1** trait-slices = STALE-DONE (eco_sismico #3027) / **B8** species repoint = DONE
  (#3075/#3079/#3078) / **X2** nightly regression = CLOSED (#3094) / **B7** keeper-validator
  = dormant / **B5** jsonschema-shadow = only TR-200x metrics open (owner content) / **B3**
  canon-stopwords = owner re-scope. **0 Tier-1 residuals are truly autonomous-buildable.**
- Additive sez.6 to the closeout master plan (does NOT rewrite master-dd's rows).

### SPEC-F B4 arc (#3128 / #3129 / #3131)

- **Slice 1 (card/qr export)**: `GET /skiv/share?format=card|qr` -- pure projections of the
  signed whitelist card (`companionCardExport.js`). `format=qr` encodes the public
  **share_url** (ADR-2026-04-27 :110; Codex-corrected from an inline base64url blob).
  Read-only, band-neutral, no flag (mirrors dossier #2856).
- **Slice 2 (promote)**: `POST /skiv/offspring/:id/promote` -- persists an offspring as an
  ambassador companion card (reuses `saveCompanionState` + cap-10 FIFO) + returns a thin
  `spawn_descriptor` (unit-half genome; live-run injection = session.js = DEFERRED). FC3
  explicit / species from body (no forbidden-path) / rate-limit 10/h parity.
- **Crossbreed-promote (#3131)**: crossbreed offspring were NOT promotable (not persisted +
  different shape + campaign-vs-session scoping). Verdetti master-dd:
  **promote-from-descriptor** (`body.offspring`) + genome map (`env_mutation+hybrid_fusions
-> mutations`, `tier_bonus_traits+gene_slots -> cabinet.unlocked`). New pure
  `resolveOffspringGenome` normalizes both shapes.

## Findings (6 real, all fixed)

- #3124: Codex P2 (combat-strict + JSON reference = false-green audit) + review P3 (`.YAML`
  suffix crash on case-sensitive loader).
- #3128: Codex P2 (QR must encode the public share_url per ADR, not an inline blob).
- #3129: rate-limit parity (promote was unguarded while its sibling crossbreed write is
  rate-limited) + Codex P2 (crossbreed-scope documented).
- #3131: 🔴 **P1 (Codex) process crash** -- `...(hybrid_fusions||[])` spread on a truthy
  non-iterable from unauthenticated `body.offspring` -> unhandled rejection. 🔴 **P2
  (review) overwrite** -- client `lineage_id` -> keyed store-write could clobber another
  lineage's ambassador. Both live-verified + fixed (Array.isArray on every spread + route
  try/catch; 409 refuse-overwrite).

## Blockers residui (owner / coordination -- tutti DEFER, verdetto default this session)

- [ ] **SPEC-F per-Nido AUTH isolation** -- the whole SPEC-F surface is unauthenticated +
      the companion store is a process-global singleton. Hit TWICE this session (eviction
      grief, cross-lineage overwrite); mitigated per-case (rate-limit, refuse-overwrite) but
      the full fix = per-Nido/per-user isolation = cross-cutting owner workstream.
- [ ] **SPEC-F B4 live-run unit injection** (session.js roster) -- the `spawn_descriptor` is
      the bridge; wiring it into a live run touches session.js = the PARALLEL form-pulse/W5
      lane -> coordinate / defer.
- [ ] **POST /skiv/import** (foreign card) -- separate slice, same trust territory.
- [ ] **B4 durable crossbreed cooldown** -- needs a `packages/contracts` schema field
      (forbidden-path, master-dd).
- [ ] **Residual-gate leftovers** (from #3126): B5 TR-200x metrics (owner balance content),
      B3 canon-stopwords re-scope (owner), Tier-2 owner-decisions batch.

## Next entry point

1. **First action**: choose a lane -- (a) SPEC-F per-Nido auth isolation (the recurring
   security gap), (b) POST /skiv/import, (c) the form-pulse/W5 lane joins (owned by the
   parallel session -- coordinate), or (d) a Tier-2 owner-decision batch.
2. **Reference**: this handoff + `project_spec_f_crossbreed` +
   `project_missing_trait_combat_mechanics` (memory) + the closeout master plan sez.6.
3. **Estimated effort**: auth-isolation = M-L (cross-cutting); /skiv/import = M.

## Piani completati / toccati (collegamenti)

- TKT-P6 trait-orphan closure -- `docs/planning/2026-06-22-tkt-p6-b-resolution-status.md`
  (the 17 non-combat residue is now gate-resolved; the earlier B-defer subset was #2953-2969).
- Close-out master plan (Tier-1 reconciliation, sez.6 added):
  `docs/planning/2026-06-29-closeout-master-plan.md`.
- Residual-gate register (per-gate view): `docs/planning/2026-06-23-residual-gate-register.md`.
- SPEC-F design (B4 export + offspring->playable): `docs/design/evo-tactics-custode-portable-framework.md`.
- Start-of-session lineage: `docs/planning/2026-07-01-session-handoff.md` (form-pulse v2 + 12 trait mechanics).

## Lessons (this session)

- **Check the ADR before resolving a "ratified" design-call**: the QR payload was flagged
  as an open design-call by recon; I resolved it inline (base64url) instead of reading
  ADR:110 (which says share_url). Codex caught it.
- **Untrusted body descriptor hardening**: (1) `Array.isArray` on EVERY spread (I guarded
  gene_slots/tier_bonus_traits but missed hybrid_fusions -> crash); (2) never route a
  client-supplied key into a keyed store-write without an existence/overwrite guard.
- **Verify-first kills stale markers**: the closeout Tier-1 "autonomous" list was largely
  stale (B1/B8/X2 done, B7 dormant) -- a 6-finder recon avoided rebuilding them.
- **Marker=hypothesis, git=truth** applied to `check_missing_traits` (advisory, not CI-wired)
  and to the crossbreed offspring shape (different from the ritual record).

## Memory (aggiornate questa sessione)

- `project_spec_f_crossbreed` (B4 slices 1/2 + crossbreed-promote + the 2 security lessons).
- `project_missing_trait_combat_mechanics` (17 non-combat orphans resolved via 2-tier gate).
- `MEMORY.md` index (both lines updated).
