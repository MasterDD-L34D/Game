---
title: 'Creature-kit trait mechanics -- engine implementation plan (12 traits, 7 slices)'
date: 2026-06-22
doc_status: draft
doc_owner: claude-code
workstream: combat
last_verified: '2026-06-22'
source_of_truth: false
review_cycle_days: 90
tags: [combat, trait, mechanic, engine, plan, salvage, tdd]
---

# Creature-kit trait mechanics -- engine implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:test-driven-development
> per slice. Steps use checkbox (`- [ ]`) syntax. Each slice = one PR. Slice 1 is
> fully bite-sized; slices 2-7 carry their engine-mapping + acceptance and get
> their own bite-sized steps when reached (progressive elaboration -- the salvage
> roadmap's stated model).

**Goal:** Implement the 12 ratified creature-kit trait mechanics
([spec](../specs/2026-06-22-creature-trait-mechanics-design.md)) as combat-engine
work, TDD against the AI baseline, band-neutral (no sim unit references a new
trait until a creature flips live).

**Architecture:** The combat engine is DATA-DRIVEN. Traits live in
`data/core/traits/active_effects.yaml` as `{applies_to, trigger, effect:{kind,...}}`
and resolve through `apps/backend/services/traitEffects.js`. Status-driven combat
deltas flow producer -> consumer: a status is written to `unit.status[name] = turns`
(by `apply_status` traits or `passiveStatusApplier.js`), read by
`combat/statusModifiers.js#computeStatusModifiers` (returns attack/defense deltas),
and decayed 1/round by the round-model sync in `routes/sessionRoundBridge.js`. New
mechanics extend exactly these three seams plus, where needed, new round-lifecycle
hooks (`roundOrchestrator.js#beginRound` for turn-start, a new end-of-round sweep)
and the ability-dispatch entry (`abilityExecutor.js#executeAbility`).

**Tech Stack:** Node 22, `node --test`, js-yaml, `tools/py/add_trait_stub.py` for
the per-trait DB file (the 5-gate flow), `npm run export:qa` baseline.

---

## Engine seams (reference -- verified 2026-06-22)

| Seam                       | File:symbol                                                          | Role |
| -------------------------- | ------------------------------------------------------------------- | ---- |
| Trait resolver             | `apps/backend/services/traitEffects.js`                             | attack-time (`extra_damage`/`attack_bonus`/`damage_reduction`/`heal`), post-attack (`apply_status`), movement (`buff_stat:move_bonus`) |
| Status consumer            | `apps/backend/services/combat/statusModifiers.js#computeStatusModifiers` | reads `unit.status[name]` -> `{attackDelta, defenseDelta, log}` |
| Passive producer           | `apps/backend/services/combat/passiveStatusApplier.js`             | `action_type:passive` + `apply_status` -> `unit.status[stato]` (WAVE_A 7-status allowlist; extend allowlist for new passive statuses) |
| Round turn-start           | `apps/backend/services/roundOrchestrator.js#beginRound`            | AP refresh, status decay (`unit.statuses` array), bleeding tick |
| Round resolution           | `roundOrchestrator.js#resolveRound`                                | priority queue + reaction injection (attacked/damaged/moved_adjacent/ability_used/healed) |
| Status apply (on-hit)      | `apps/backend/routes/session.js:1346`                              | consumes `status_applies` -> `unit.status[s.stato]` (caps via `STATUS_DURATION_CAPS`) |
| Status decay/sync          | `apps/backend/routes/sessionRoundBridge.js:294-340`               | round-model <-> `unit.status` object-map sync + universal 1/round decay |
| Ability dispatch entry     | `apps/backend/services/abilityExecutor.js#executeAbility` (line 2341) | `{session, actor, body}` -> per-`effect_type` dispatch |

Dual status shape (both live, both handled across the code): `unit.statuses` =
array `[{id,intensity,remaining_turns}]` (round orchestrator); `unit.status` =
object-map `{name: turns}` (statusModifiers / traitEffects / passive applier).
The round-model sync keeps them coherent. New integer statuses ride the object-map
and auto-decay -- no new decay code.

## New engine primitives the 12 mechanics require

- **P1 `inibito` status + ability guard** -- block `action_type:ability` when the
  actor is `inibito` (movement/attack/reactions still work). Consumer = a guard at
  `executeAbility`. [matrice 3]
- **P2 `suppress_ability` kind** -- AoE active (Mode A) that applies `inibito` to
  enemies in a radius. [matrice 3]
- **P3 passive conditional stat auras** via `computeStatusModifiers` extension --
  read new self-statuses for attack/defense/DR deltas. [radici 10, nuclei 8,
  pigmenti 9, lettura_preda 2]
- **P4 `ally_aura_mark`** -- range-based ally buff broadcast. [corteccia 4, nuclei 8]
- **P5 `cleanse_status` kind** -- remove negative statuses (+ heal per cleanse). [filtri 6]
- **P6 `duration_absorb`** -- reduce incoming status durations on apply. [membrane 7]
- **P7 round-state hooks** -- 0-move detection (radici), on-taking-damage reaction
  (corteccia), turn-start terrain heal (membrane/filtri). [10, 4, 7, 6]
- **P8 tile-level timed status** -- `zona_risonante` terrain. [eco_sismico 5]
- **P9 end-of-round adjacency sweep** -- `abbagliato` application. [pigmenti 9]
- **P10 channel-damage tracking** -- adaptive resistance. [tessuti 11]
- **P11 flight grades** -- move-cost + elevation. [adattamento_volo 1]

## Slice sequence (one PR each)

| Slice | Traits / primitive                                                            | New kinds/hooks            | Tier |
| ----- | ----------------------------------------------------------------------------- | -------------------------- | ---- |
| **1** | `inibito` status + ability guard (P1) + matrice Mode B (on-hit apply_status)  | guard (no new effect.kind) | prereq/SMALL |
| 2     | radici_ancora_planare (10) + nuclei intact-state atk (8a) -- passive auras P3 | computeStatusModifiers ext + 0-move | SMALL |
| 3     | `ally_aura_mark` P4 -> corteccia (4) + nuclei weak-point full (8b)            | ally_aura_mark + on-damage hook | SMALL/MED |
| 4     | damage-event pipeline -> artigli_psionici (2) + tessuti (11) + volo I (1)     | source-marked DR + channel + move-cost | MED |
| 5     | `cleanse_status` P5 + `duration_absorb` P6 -> filtri (6) + membrane (7) + volo II/III | cleanse_status + duration_absorb + turn-start terrain | MED |
| 6     | matrice Mode A `suppress_ability` AoE active (3)                              | suppress_ability kind (active) | MED |
| 7     | eco_sismico (5, tile timed-status P8) + pigmenti_aurorali (9, end-of-round sweep P9) | tile layer + round-end sweep | LARGE |

> Sequencing note: the spec presents `inibito` as prereq #1 and lists SMALL-first.
> Slice 1 builds the `inibito` prereq because it is the smallest self-contained new
> hook (one guard reading one status), validates the whole authoring loop
> (engine + active_effects + DB stub + 5 gates + AI baseline) at lowest risk, and
> is reused by slice 6. This is an engineering-sequencing choice inside the ratified
> design (no mechanic changed).

---

## Slice 1 -- `inibito` ability-suppression prereq + matrice Mode B

**Goal:** A unit carrying `inibito > 0` cannot use active abilities (movement,
basic attacks, and reactions still work); `matrice_antimagia` applies `inibito` to
a target on a melee hit. Band-neutral: no sim unit carries `matrice_antimagia`.

**Files:**
- Create: `apps/backend/services/combat/abilitySuppression.js`
- Create: `tests/ai/abilitySuppression.test.js`
- Modify: `apps/backend/services/abilityExecutor.js` (guard at `executeAbility`, line 2341)
- Modify: `data/core/traits/active_effects.yaml` (add `matrice_antimagia`)
- Create (via tool): `data/traits/offensivo/matrice_antimagia.json` + `index.json` + glossary entry

### Task 1.1 -- the pure guard helper

- [ ] **Step 1: Write the failing test** -- `tests/ai/abilitySuppression.test.js`

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { isAbilityInhibited, INIBITO_STATUS } = require('../../apps/backend/services/combat/abilitySuppression');

test('isAbilityInhibited: object-map status.inibito > 0 -> true', () => {
  assert.equal(isAbilityInhibited({ status: { inibito: 2 } }), true);
});
test('isAbilityInhibited: status.inibito 0 or absent -> false', () => {
  assert.equal(isAbilityInhibited({ status: { inibito: 0 } }), false);
  assert.equal(isAbilityInhibited({ status: {} }), false);
  assert.equal(isAbilityInhibited({}), false);
  assert.equal(isAbilityInhibited(null), false);
});
test('isAbilityInhibited: array-shape statuses [{id:inibito,remaining_turns}] -> true', () => {
  assert.equal(isAbilityInhibited({ statuses: [{ id: 'inibito', remaining_turns: 1 }] }), true);
  assert.equal(isAbilityInhibited({ statuses: [{ id: 'inibito', remaining_turns: 0 }] }), false);
});
test('INIBITO_STATUS is the canonical name', () => {
  assert.equal(INIBITO_STATUS, 'inibito');
});
```

- [ ] **Step 2: Run it, verify it fails** -- `node --test tests/ai/abilitySuppression.test.js` -> FAIL (module not found).

- [ ] **Step 3: Implement** -- `apps/backend/services/combat/abilitySuppression.js`

```js
'use strict';
// inibito ability-suppression (spec 2026-06-22-creature-trait-mechanics-design).
// Disables ONLY active abilities (action_type=ability). Movement, basic attacks,
// reactions, and passive trait bonuses still work -> legible. Reads both status
// shapes (object-map unit.status / array unit.statuses) like the rest of combat.
const INIBITO_STATUS = 'inibito';

function isAbilityInhibited(unit) {
  if (!unit || typeof unit !== 'object') return false;
  const st = unit.status;
  if (st && !Array.isArray(st) && Number(st[INIBITO_STATUS]) > 0) return true;
  const arr = Array.isArray(unit.statuses) ? unit.statuses : Array.isArray(st) ? st : null;
  if (arr) {
    for (const s of arr) {
      if (!s) continue;
      if (typeof s === 'string' && s === INIBITO_STATUS) return true;
      if (s.id === INIBITO_STATUS && Number(s.remaining_turns ?? 1) > 0) return true;
    }
  }
  return false;
}

module.exports = { isAbilityInhibited, INIBITO_STATUS };
```

- [ ] **Step 4: Run it, verify it passes** -- `node --test tests/ai/abilitySuppression.test.js` -> PASS.

- [ ] **Step 5: Commit** -- `feat(combat): inibito ability-suppression guard helper (creature-trait slice 1)`

### Task 1.2 -- wire the guard at the ability dispatch entry

- [ ] **Step 1: Add the failing integration test** to `tests/ai/abilitySuppression.test.js`

```js
const { createAbilityExecutor } = require('../../apps/backend/services/abilityExecutor');
test('executeAbility: inibito actor -> ability_blocked, no execution', async () => {
  const exec = createAbilityExecutor({
    performAttack: () => { throw new Error('must not run when inhibited'); },
    buildAttackEvent: () => ({}),
    buildMoveEvent: () => ({}),
    appendEvent: () => {},
    manhattanDistance: () => 1,
  });
  const actor = { id: 'a1', status: { inibito: 1 }, ap: 2, ap_remaining: 2, traits: [] };
  const session = { units: [actor], events: [] };
  const res = await exec.executeAbility({ session, actor, body: { ability_id: 'dash_strike' } });
  assert.equal(res.blocked, true);
  assert.equal(res.reason, 'inibito');
  assert.equal(actor.ap_remaining, 2); // no AP spent
});
```

- [ ] **Step 2: Run it, verify it fails** -- the executor runs / errors instead of returning `{blocked:true}`.

- [ ] **Step 3: Implement** -- at the TOP of `executeAbility({ session, actor, body })` (abilityExecutor.js:2341), before any spec load / AP spend:

```js
const { isAbilityInhibited } = require('./combat/abilitySuppression');
if (isAbilityInhibited(actor)) {
  const blockedEvent = {
    action_type: 'ability',
    actor_id: actor.id,
    effect_type: 'ability_blocked',
    result: 'blocked',
    reason: 'inibito',
    ability_id: (body && body.ability_id) || null,
  };
  if (typeof appendEvent === 'function') appendEvent(session, blockedEvent);
  return { ok: false, blocked: true, reason: 'inibito', event: blockedEvent };
}
```

- [ ] **Step 4: Run it, verify it passes**. Then run the surrounding suites:
  `node --test tests/ai/*.test.js` -> all green (band-neutral: no test unit carries inibito).

- [ ] **Step 5: Commit** -- `feat(combat): block abilities for inibito units at executeAbility entry`

### Task 1.3 -- matrice_antimagia Mode B (on-hit apply inibito) in active_effects.yaml

- [ ] **Step 1: Write the failing test** (append to the test file) -- Mode B applies inibito via the existing `evaluateStatusTraits` path:

```js
const { evaluateStatusTraits } = require('../../apps/backend/services/traitEffects');
test('matrice_antimagia Mode B: melee hit applies inibito to target', () => {
  const registry = {
    matrice_antimagia: {
      applies_to: 'actor',
      trigger: { action_type: 'attack', on_result: 'hit', melee_only: true },
      effect: { kind: 'apply_status', stato: 'inibito', turns: 1, target_side: 'target', log_tag: 'matrice_antimagia' },
    },
  };
  const actor = { id: 'g', traits: ['matrice_antimagia'], position: { x: 0, y: 0 } };
  const target = { id: 't', traits: [], position: { x: 1, y: 0 } };
  const out = evaluateStatusTraits({ registry, actor, target, attackResult: { hit: true, mos: 1 }, killOccurred: false });
  const applied = out.status_applies.find((s) => s.stato === 'inibito');
  assert.ok(applied, 'inibito should be in status_applies');
  assert.equal(applied.target_side, 'target');
  assert.equal(applied.turns, 1);
});
```

- [ ] **Step 2: Run it, verify it passes** -- this uses the EXISTING `apply_status` path; the test pins the active_effects contract (the registry literal mirrors the YAML entry). It should pass against current `traitEffects.js` (no code change). If it fails, the regression is in the resolver, not the data.

- [ ] **Step 3: Add the YAML entry** -- `data/core/traits/active_effects.yaml`, under `traits:` (match an existing `apply_status` entry's shape; offensive trait):

```yaml
  matrice_antimagia:
    id: matrice_antimagia
    label: i18n:traits.matrice_antimagia.label
    tier: 3
    category: offensivo
    applies_to: actor
    trigger:
      action_type: attack
      on_result: hit
      melee_only: true
    effect:
      kind: apply_status
      stato: inibito
      turns: 1
      target_side: target
      log_tag: matrice_antimagia
```

- [ ] **Step 4: Verify the registry loads it** -- `node -e "const{loadActiveTraitRegistry}=require('./apps/backend/services/traitEffects');const r=loadActiveTraitRegistry();console.log(!!r.matrice_antimagia, r.matrice_antimagia&&r.matrice_antimagia.effect.stato)"` -> `true inibito`.

- [ ] **Step 5: Commit** -- `feat(traits): matrice_antimagia Mode B applies inibito on melee hit`

### Task 1.4 -- per-trait DB file through add_trait_stub (the 5-gate flow)

- [ ] **Step 1: Author the stub**
  `python tools/py/add_trait_stub.py matrice_antimagia` (tool reads tier/category from active_effects, writes `data/traits/<dir>/matrice_antimagia.json`, the `index.json.traits` full entry, and a glossary entry if missing). Inspect the tool's `--help` if the id is not auto-resolved; pass category/tier explicitly if required.

- [ ] **Step 2: Run the 5 gates** (the trait "passes the iter" only past all five):
```bash
python tools/lint/trait_schema_gate.py                                  # lenient
python tools/py/trait_template_validator.py                             # STRICT (index coverage, non-empty fields, boolean flags)
node tools/ts/trait_style_check.js --fail-on error 2>/dev/null || node scripts/... # i18n-ref style (find the real entrypoint via package.json "style:check")
python tools/py/report_trait_coverage.py                                # coverage thresholds
npm run export:qa                                                       # QA baseline (reports/trait_baseline.json)
```
  (Resolve the exact validator entrypoints from `package.json` scripts: `style:check`, and the trait coverage/template scripts. The memory note + `2026-06-22-trait-gate-audit.md` list them.)

- [ ] **Step 3: Re-sync the mirror if glossary/catalog changed** -- `npm run sync:evo-pack` (0 diff expected from a per-trait add; commit only if it changed).

- [ ] **Step 4: Run the AI baseline** -- `node --test tests/ai/*.test.js` -> all green.

- [ ] **Step 5: Commit** -- `feat(traits): matrice_antimagia per-trait DB stub (5 gates green)`

### Slice 1 exit criteria

- `node --test tests/ai/*.test.js` green (baseline preserved).
- `npm run format:check` green; `python tools/check_docs_governance.py --registry docs/governance/docs_registry.json --strict` green.
- The 5 trait gates green for `matrice_antimagia`.
- Guard is band-neutral: no sim unit carries `matrice_antimagia` -> `inibito` never set in any existing test/scenario.
- Compensating adversarial review (Codex rate-limited) via `caveman:cavecrew-reviewer` on the diff; P1s fixed.
- Branch pushed, PR opened, NOT self-merged.

---

## Slice 2 -- radici_ancora_planare (10) + nuclei intact-atk (8a)

**Mapping.** Both are passive conditional stat auras read in `computeStatusModifiers`:
- `radicato` self-status: when set, `attackDelta += 1` (actor side) and a flat
  `damage_reduction 3` on the defender side (use the `damage_reduction` post-roll
  channel, not `defenseDelta`, to match the spec "DR3"). Producer: a 0-move detector
  at round resolution (a unit that declared no `move` intent this round gains
  `radicato`); first move costs +1 AP (AP-cost hook); forced-move immunity (a flag
  read by any push/pull). No DR when un-anchored.
- `nucleo_intatto` self-status (default-on for nuclei carriers): `attackDelta += 1`.
  The 2nd-state transitions + ally aura come in slice 3.

**Acceptance:** radicato gives +1 atk / DR3 / forced-move-immune while 0-move;
costs +1 AP on first move; nuclei intact gives +1 atk. AI baseline green; band-neutral.
TDD steps authored when slice reached.

## Slice 3 -- ally_aura_mark (P4) -> corteccia (4) + nuclei weak-point (8b)

**Mapping.** New `ally_aura_mark` mechanism: a carrier broadcasts a single-use or
sustained buff to same-faction allies within range R (manhattan), written as a
self-status on the allies (`coordinamento` for nuclei intact, `risonanza_memetica`
single-use +1 atk for corteccia). corteccia also needs an on-taking-damage reaction
(>=3 dmg -> self `damage_reduction 2` + broadcast). nuclei weak-point: MoS>=5 hit ->
`danno_nucleo` (lose aura, gain DR1); 2nd -> `nucleo_distrutto` (+2 burst) -- model
as status transitions in the damaged-reaction path.

**Acceptance:** allies in range gain the aura; corteccia broadcasts on heavy hit;
nuclei degrades through 2 weak-point hits. Band-neutral. TDD when reached.

## Slice 4 -- artigli_psionici (2) + tessuti (11) + volo I (1)

**Mapping.** artigli: on melee hit, set `lettura_preda_<targetId>` marker on the
actor -> stacking `damage_reduction` (cap 3) that applies ONLY when defending vs that
same target (source-predicate DR in computeStatusModifiers / damage pipeline). tessuti:
on taking >=2 dmg of a channel, set `adattamento_<channel>` -> +15% resist that channel
3 rounds + heal 1 (cap 2 channels) -- runtime resistance delta via `resistanceEngine`.
volo I (Planato): ignore terrain move-cost -- extend `evaluateMovementTraits` /
move-cost calc.

**Acceptance:** per-source DR stacks+caps; channel adaptation grants resist+heal;
flight grade I ignores terrain cost. Band-neutral. TDD when reached.

## Slice 5 -- filtri (6) + membrane (7) + volo II/III

**Mapping.** New `cleanse_status` kind: turn-start (beginRound hook) cleanse 1
bleeding/fracture + heal 1 per cleanse; active (1 AP, 2t cd) cleanse all neg-status
on adjacent ally. New `duration_absorb`: incoming status durations -1 on apply
(hook at session.js:1346 apply site). membrane turn-start terrain heal (adjacent
water/bog). volo II (+ascent, atterraggio_pesante crash-strike), volo III (hover +1
atk / +1 vs melee at altitude).

**Acceptance:** cleanse + heal at turn-start and on the active; durations absorbed;
flight grades II/III. Band-neutral. TDD when reached.

## Slice 6 -- matrice Mode A suppress_ability AoE (3)

**Mapping.** New `suppress_ability` effect.kind, dispatched as an active ability
(2 AP) in `abilityExecutor.js`: apply `inibito 2t` to all enemies within radius 2.
Reuses the slice-1 `inibito` status + guard.

**Acceptance:** the active applies inibito to in-radius enemies; consumed via the
slice-1 guard. Band-neutral. TDD when reached.

## Slice 7 (LARGE) -- eco_sismico (5) + pigmenti_aurorali (9)

**Mapping.** eco_sismico: Phase A reveal pulse (range 4); Phase B `zona_risonante`
tile status (2 rounds) -- a new tile-level timed-status layer on the grid; units
entering get `disorient`; carrier self-immune. pigmenti_aurorali: while HP>=50%,
end-of-round adjacency sweep applies `abbagliato` (-1 atk next) to enemies ending
adjacent; active (1 AP) intensifies to -2 + disorient on attackers; dims as HP drops.
Needs a new end-of-round sweep hook.

**Acceptance:** tile status applies on-enter + decays; end-of-round sweep applies
abbagliato gated by HP. Band-neutral. TDD when reached.

---

## After the 12 mechanics

Phase 3 of the [salvage roadmap](2026-06-22-derived-canon-salvage-roadmap.md):
canonize the 13 ratified creatures (each signature kit now implemented) through the
species pipeline, then the single owner-gated catalog/affinity re-baseline. Residuals
(GAP2 inert traits, stale trace_hashes, CI-wire the guard) tracked in the roadmap +
`docs/reports/2026-06-22-trait-gate-audit.md`.

## Self-review notes

- Spec coverage: all 12 traits + the `inibito` prereq are mapped to a slice (table
  above). The synergy design-note (#12) is emergent from 4/8 (golem), 10+4+9 (treant),
  2+11 (rakshasa), 6+7 (otyugh) landing in their slices -- no separate task.
- Band-neutrality holds for every slice: a new trait fires only when a unit carries
  it, and no sim party / scenario references the new ids until creature canonization
  (Phase 3). The AI baseline therefore stays byte-stable through slices 1-7.
- New effect.kinds (`suppress_ability` slice 6, `cleanse_status` slice 5) are the
  load-bearing additions -> their slices carry extra adversarial review.
