# ALIENA Enforcement Layer -- Design

- Status: APPROVED (design), plan next
- Date: 2026-05-29
- Scope: Game backend (`apps/backend/services/combat`)
- Relates: §21 ALIENA diagnostic pipeline SHIPPED (scorer + biomeSpawnBias hook + reinforcementSpawner + telemetry endpoint #2420). This is the deferred "enforcement layer" (handoff #5).

## Context

§21 shipped a pure DIAGNOSTIC scorer `scoreAlienaCoherence(entry, biomeConfig, opts) -> {aggregate 0..1, sub_scores}` (`services/authorial/alienaCoherence.js`). It runs inside `applyBiomeBias` (`services/combat/biomeSpawnBias.js`) via the opt-in `emitAlienaCoherence` callback and feeds the telemetry buffer drained by `GET /api/session/:id/aliena-telemetry`. No enforcement: coherence is observed, never acted on.

`applyBiomeBias` builds `outPool` by mapping each pool entry to `{ ...entry, weight: baseWeight * boost, _biome_bias }` (line ~241). The spawn loop in `reinforcementSpawner.tick` then `pickPoolEntry` selects weighted-randomly. The code already foreshadows this work (comment line ~255: "Future enforcement layer must explicitly choose which [coherence vs weight signal]").

## Constraint that shaped the design

Threshold tuning is DATA-BLOCKED (need collected telemetry to set a sane cutoff). The chosen mechanism (weight modulation with a continuous `strength` knob) **dissolves that block**: there is no hard threshold to calibrate -- ship `strength=0` (off), tune `strength` continuously later from telemetry. Ship the MACHINERY, default-OFF.

## Decision (approved)

**Mechanism = weight modulation (soft), strength-knob, no threshold.**
Rejected: hard veto/filter (empty-pool risk + needs a threshold = data-blocked); configurable veto|weight mode (YAGNI -- 2 code paths, ship the safe one).

## Design

### Config

`encounter.reinforcement_policy.aliena_enforcement = { enabled: false, strength: 0 }`

- Default-OFF: absent, or `enabled !== true`, or `strength <= 0` → exact current behavior (byte-identical spawns).
- `strength` clamped to `[0, 1]`.

### Mechanism

Per spawn-pool entry, after the existing biome-bias `boost` is computed, modulate the final weight by an ALIENA coherence factor:

```
factor = 1 - strength * (1 - aggregate)        // aggregate = scoreAlienaCoherence(entry, biomeConfig, {canonicalPool}).aggregate
weight = baseWeight * boost * factor
```

- `strength = 0` → `factor = 1` → unchanged (off).
- `strength = 1` → `factor = aggregate` → fully coupled (incoherent entry ~0 weight = soft-veto; coherent = unchanged).
- `0 < strength < 1` → partial down-weight of incoherent entries.
- `factor` floored at a tiny epsilon (e.g. `>= 0.0001`) so no entry weight becomes exactly 0 (avoids an all-zero pool when every entry is incoherent + strength=1; weighted-random still has a valid distribution).

### Hook point (single file, additive)

`applyBiomeBias(pool, biomeConfig, opts)`:

- New `opts.alienaEnforcement = { strength }` (only passed when active).
- Inside the existing `outPool = pool.map(entry => {...})`, after `boost` is finalized and before/at the return, when `opts.alienaEnforcement` with `strength > 0`: compute `aggregate` via `scoreAlienaCoherence(entry, biomeConfig, {canonicalPool: opts.canonicalPool})`, derive `factor`, set `weight = baseWeight * boost * factor`, and attach `_aliena_enforcement = { strength, aggregate, factor }` to the entry for telemetry.
- When no `alienaEnforcement` / `strength <= 0`: `weight = baseWeight * boost` unchanged (current path).

`reinforcementSpawner.tick`:

- Read `policy.aliena_enforcement`. When `enabled === true && strength > 0`, pass `alienaEnforcement: { strength }` (+ `canonicalPool: pool`) into the `applyBiomeBias` call at the spawn-selection site (`pickPoolEntry` path, line ~85 `applyBiomeBias(eligible, biomeConfig)`). Otherwise unchanged.
- Note: the existing diagnostic pre-pass (`emitAlienaPoolSnapshot`, opt-in via `aliena_coherence_telemetry`) is independent and untouched.

### Telemetry

When enforcement active, the per-entry `_aliena_enforcement.factor` is available on selected spawns; include `enforcement_factor` (+ strength) in the existing ALIENA telemetry sample so tuning is data-informed (which strength suppressed which entries). Best-effort, never blocks.

### Error handling

All scorer calls best-effort try/catch (mirror the existing diagnostic block) -- a scorer failure degrades to `factor = 1` (no modulation), never blocks or throws into the spawn path.

## Testing

- `biomeSpawnBias` units: `strength=0` (or absent) → weights byte-identical to baseline (no-op proof); `strength=1` → low-aggregate entry down-weighted vs high-aggregate, both `> 0` (epsilon floor); `factor` formula correctness at strength 0/0.5/1; scorer-throw → factor 1 (graceful).
- `reinforcementSpawner` integration: `aliena_enforcement` absent/disabled → spawn distribution identical to current (golden); enabled+strength=1 → incoherent entries spawn rarer (statistical over seeded RNG).
- Scorer (`alienaCoherence.js`) UNTOUCHED.

## Deferred (YAGNI / data-driven)

- `strength` value tuning (data-driven post-telemetry-collection) -- ships at 0.
- Hard veto mode + conditional-event-trigger mechanism (SoT §21 alternatives) -- not built; weight modulation covers the enforcement intent.

## Open items (for the plan)

- Confirm the exact `applyBiomeBias` call site in `reinforcementSpawner` that drives REAL spawn selection (line ~85 `applyBiomeBias(eligible, biomeConfig)`) vs the diagnostic pre-pass -- enforcement must modulate the REAL selection path, not just the telemetry pre-pass.
