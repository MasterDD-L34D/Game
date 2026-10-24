# ALIENA Coherence Diagnostic Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** §21 runtime-layer gap (SoT vault): wire ALIENA principles into runtime decisions as a DIAGNOSTIC telemetry layer (NO enforcement, NO block). Computes a 3D "ALIENA coherence score" for spawn decisions; exposed via session events for playtest visibility.

**Architecture:** Pure scorer module (`apps/backend/services/authorial/alienaCoherence.js`) with 3 sub-scores: `plausibilita` (species fits biome's authored pool) + `coerenza_eco` (reuse existing `biomeMatchScore` from `biomeSpawnBias.js`) + `ancoraggio_narrativo` (species has narrative_hooks/lore_ref). Weighted aggregate. Hook into `biomeSpawnBias.applyBiomeBias` (post-decision) to emit `aliena_coherence` telemetry per spawn pick. Best-effort, additive, never blocks the spawn decision.

**Tech Stack:** Node.js (CommonJS), `node:test` + `node:assert/strict`. Tests in `tests/api/`.

---

## Design (start-values, master-dd confirmed 2026-05-28 in-session)

- **3D scorer**: `plausibilita` 0.40 + `coerenza_eco` 0.40 + `ancoraggio_narrativo` 0.20.
- **Hook**: `biomeSpawnBias.js` (canonical biome→species pool decision surface).
- **Mode**: DIAGNOSTIC (additive telemetry), NO enforcement (no block, no re-roll).
- **Lock**: start-values per L-069 pattern; playtest tunes weights/formulas post-data.

### Sub-score formulas (start-values)

1. **plausibilita** ∈ [0,1]: 1.0 if entry is in the biome's canonical pool (loaded via `biomePoolLoader`), 0.5 if entry has at least 1 role_template match (`matchRoleTemplate` truthy), 0.0 otherwise.
2. **coerenza_eco** ∈ [0,1]: direct `biomeMatchScore(entry, biomeConfig)` from `biomeSpawnBias.js` (existing 0..1 affix-match score).
3. **ancoraggio_narrativo** ∈ [0,1]: 1.0 if entry has non-empty `narrative_hooks` array OR `lore_ref` string OR `narrative_tag`. 0.5 default (no data = neutral, no penalty). Authoring-only fields (originality/giustificazioni/comunicazione from rubrica) SKIPPED at runtime per ALIENA appendice §rubrica.

### Aggregate

`score = 0.40·plausibilita + 0.40·coerenza_eco + 0.20·ancoraggio_narrativo` (clamp01). Sub-scores returned alongside for diagnostics.

---

## Verified seams

- `apps/backend/services/combat/biomeSpawnBias.js`: exports `applyBiomeBias(pool, biomeConfig, opts)`, `biomeMatchScore(unit, biomeConfig) → 0..1`, `matchRoleTemplate(entry, roleTemplates) → {matched, role, tier, primary}`.
- `apps/backend/services/combat/biomePoolLoader.js`: loads biome→species pools (canonical authored).
- Game canonical doc: `docs/appendici/ALIENA_documento_integrato.md` (active, 6-pillar A.L.I.E.N.A. method + 5-criterion rubrica).
- vault SoT §21 (post PR #208): "🟡 PARZIALE (doc canon + data-level OK; runtime layer gap)". This PR addresses the runtime-layer gap diagnostically.

## Gotchas

- Branch `feat/aliena-coherence-diagnostic` ALREADY checked out. Verify `git branch --show-current` before each commit. Game `main` is commit-blocked (husky).
- CI test glob: `tests/api/`. tdd-guard active (one-test-at-a-time / Option B Bash heredoc after RED).
- Commits: lowercase conventional + trailers `Coding-Agent: claude-opus-4.7` + `Trace-Id: <node -e "console.log(crypto.randomUUID())">`. No `Co-Authored-By`. `git add` ONLY listed files (never -A — 42 untracked exist).
- husky pre-commit prettier reformat = fine.
- **Best-effort discipline**: scorer must NEVER throw. Hook integration must NEVER block spawn (try/catch around scorer call).
- **No enforcement**: never modify the spawn pool/decision based on score. Telemetry-only.

## File Structure

| File                                                 | Responsibility                                                                | Action |
| ---------------------------------------------------- | ----------------------------------------------------------------------------- | ------ |
| `apps/backend/services/authorial/alienaCoherence.js` | Pure 3D scorer + aggregate; depends on biomeSpawnBias for eco sub-score       | Create |
| `apps/backend/services/combat/biomeSpawnBias.js`     | Hook: emit `aliena_coherence` per-entry telemetry post-decision (best-effort) | Modify |
| `tests/api/alienaCoherence.test.js`                  | Pure scorer tests (3 sub-scores + aggregate + edge cases) + hook integration  | Create |

---

## Task 1: Pure scorer module

- [ ] **Step 1: Write failing test** — `tests/api/alienaCoherence.test.js`:

```js
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  scoreAlienaCoherence,
  ALIENA_WEIGHTS,
} = require('../../apps/backend/services/authorial/alienaCoherence');

test('aliena scorer: full plausibilita + eco + narrative = 1.0 aggregate', () => {
  const entry = {
    id: 'dune_stalker',
    tags: ['desert', 'sand'],
    role: 'apex',
    narrative_hooks: ['hunt-pattern'],
  };
  const biomeConfig = {
    id: 'dune',
    affixes: ['sabbia'],
    role_templates: [{ role: 'apex', tier: 'T2', primary: true }],
  };
  const canonicalPool = [{ id: 'dune_stalker' }];
  const r = scoreAlienaCoherence(entry, biomeConfig, { canonicalPool });
  assert.ok(r.aggregate > 0.95, `expected ~1.0, got ${r.aggregate}`);
  assert.equal(r.sub_scores.plausibilita, 1.0);
  assert.ok(r.sub_scores.coerenza_eco > 0);
  assert.equal(r.sub_scores.ancoraggio_narrativo, 1.0);
});

test('aliena scorer: empty entry returns aggregate baseline (no throw)', () => {
  const r = scoreAlienaCoherence({}, {}, {});
  assert.ok(Number.isFinite(r.aggregate));
  assert.ok(r.aggregate >= 0 && r.aggregate <= 1);
});

test('aliena scorer: weights export matches design (0.4/0.4/0.2)', () => {
  assert.equal(ALIENA_WEIGHTS.plausibilita, 0.4);
  assert.equal(ALIENA_WEIGHTS.coerenza_eco, 0.4);
  assert.equal(ALIENA_WEIGHTS.ancoraggio_narrativo, 0.2);
});

test('aliena scorer: out-of-pool no-role entry → plausibilita 0', () => {
  const entry = { id: 'random_creature', tags: [] };
  const biomeConfig = { id: 'dune', affixes: ['sabbia'], role_templates: [] };
  const r = scoreAlienaCoherence(entry, biomeConfig, { canonicalPool: [{ id: 'other' }] });
  assert.equal(r.sub_scores.plausibilita, 0);
});

test('aliena scorer: pool miss + role match → plausibilita 0.5', () => {
  const entry = { id: 'wandering_apex', tags: [], role: 'apex' };
  const biomeConfig = {
    id: 'dune',
    affixes: [],
    role_templates: [{ role: 'apex', tier: 'T2', primary: true }],
  };
  const r = scoreAlienaCoherence(entry, biomeConfig, { canonicalPool: [{ id: 'other' }] });
  assert.equal(r.sub_scores.plausibilita, 0.5);
});

test('aliena scorer: no narrative data → ancoraggio_narrativo 0.5 neutral', () => {
  const entry = { id: 'plain', tags: ['desert'] };
  const biomeConfig = { id: 'dune', affixes: ['sabbia'] };
  const r = scoreAlienaCoherence(entry, biomeConfig, {});
  assert.equal(r.sub_scores.ancoraggio_narrativo, 0.5);
});
```

- [ ] **Step 2: Run RED** — `node --test tests/api/alienaCoherence.test.js` → FAIL (module not found).

- [ ] **Step 3: Implement** — create `apps/backend/services/authorial/alienaCoherence.js`:

```js
// §21 ALIENA runtime DIAGNOSTIC layer — pure scorer.
//
// Computes a 3-dimensional ALIENA coherence score (0..1) for runtime
// decisions (start: spawn). Sub-scores adapted from ALIENA appendice rubrica
// (docs/appendici/ALIENA_documento_integrato.md) — runtime-relevant pillars
// only (plausibilita + coerenza eco-morfo-culturale + ancoraggio narrativo).
// Authoring-only criteria (originalita/giustificazioni/comunicazione) skipped.
//
// DIAGNOSTIC mode: no enforcement, no block. Caller emits telemetry.
// Start-values per L-069 pattern; lock = playtest data.
//
// Authority: vault SoT §21 (runtime-layer gap) + ALIENA appendice integrato.
'use strict';

const biomeSpawnBias = require('../combat/biomeSpawnBias');

const ALIENA_WEIGHTS = Object.freeze({
  plausibilita: 0.4,
  coerenza_eco: 0.4,
  ancoraggio_narrativo: 0.2,
});

function clamp01(x) {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function _scorePlausibilita(entry, biomeConfig, canonicalPool) {
  if (!entry || !entry.id) return 0;
  const pool = Array.isArray(canonicalPool) ? canonicalPool : [];
  const inPool = pool.some((p) => p && p.id === entry.id);
  if (inPool) return 1.0;
  const roleTemplates = (biomeConfig && biomeConfig.role_templates) || [];
  try {
    const m = biomeSpawnBias.matchRoleTemplate(entry, roleTemplates);
    if (m && m.matched) return 0.5;
  } catch {
    /* best-effort: missing data → 0 */
  }
  return 0;
}

function _scoreCoerenzaEco(entry, biomeConfig) {
  try {
    const s = biomeSpawnBias.biomeMatchScore(entry, biomeConfig);
    return clamp01(s);
  } catch {
    return 0;
  }
}

function _scoreAncoraggioNarrativo(entry) {
  if (!entry) return 0.5;
  const hooks = Array.isArray(entry.narrative_hooks) ? entry.narrative_hooks : null;
  if (hooks && hooks.length > 0) return 1.0;
  if (typeof entry.lore_ref === 'string' && entry.lore_ref) return 1.0;
  if (typeof entry.narrative_tag === 'string' && entry.narrative_tag) return 1.0;
  return 0.5; // neutral baseline (no narrative data = no penalty, no boost)
}

/**
 * Score an entry's ALIENA coherence vs a biome decision context.
 * @param {object} entry — spawn pool entry (id, tags, role, narrative_*)
 * @param {object} biomeConfig — biome (id, affixes, role_templates)
 * @param {object} [opts] — { canonicalPool: [{id}] }
 * @returns {{aggregate:number, sub_scores:{plausibilita,coerenza_eco,ancoraggio_narrativo}, weights:object}}
 */
function scoreAlienaCoherence(entry, biomeConfig, opts = {}) {
  const canonicalPool = opts.canonicalPool || [];
  const p = clamp01(_scorePlausibilita(entry, biomeConfig, canonicalPool));
  const e = clamp01(_scoreCoerenzaEco(entry, biomeConfig));
  const n = clamp01(_scoreAncoraggioNarrativo(entry));
  const aggregate = clamp01(
    p * ALIENA_WEIGHTS.plausibilita +
      e * ALIENA_WEIGHTS.coerenza_eco +
      n * ALIENA_WEIGHTS.ancoraggio_narrativo,
  );
  return {
    aggregate: Math.round(aggregate * 10000) / 10000,
    sub_scores: {
      plausibilita: Math.round(p * 10000) / 10000,
      coerenza_eco: Math.round(e * 10000) / 10000,
      ancoraggio_narrativo: Math.round(n * 10000) / 10000,
    },
    weights: ALIENA_WEIGHTS,
  };
}

module.exports = { scoreAlienaCoherence, ALIENA_WEIGHTS };
```

- [ ] **Step 4: Run GREEN** — `node --test tests/api/alienaCoherence.test.js` → all 6 PASS.

- [ ] **Step 5: Commit** — `git add apps/backend/services/authorial/alienaCoherence.js tests/api/alienaCoherence.test.js` + commit `feat(authorial): ALIENA 3D coherence scorer (diagnostic, no enforcement)` + trailers.

---

## Task 2: Hook into biomeSpawnBias.applyBiomeBias (telemetry emit)

- [ ] **Step 1: Append failing test** — to `tests/api/alienaCoherence.test.js`:

```js
const { applyBiomeBias } = require('../../apps/backend/services/combat/biomeSpawnBias');

test('hook: applyBiomeBias emits aliena_coherence telemetry per entry (opt-in)', () => {
  const pool = [
    { id: 'dune_stalker', weight: 1.0, tags: ['desert', 'sand'], role: 'apex' },
    { id: 'random', weight: 1.0, tags: [] },
  ];
  const biomeConfig = {
    id: 'dune',
    affixes: ['sabbia'],
    role_templates: [{ role: 'apex', tier: 'T2', primary: true }],
  };
  const telemetry = [];
  const out = applyBiomeBias(pool, biomeConfig, {
    canonicalPool: [{ id: 'dune_stalker' }],
    emitAlienaCoherence: (event) => telemetry.push(event),
  });
  assert.equal(out.length, pool.length, 'pool length unchanged (no enforcement)');
  assert.equal(telemetry.length, pool.length, 'telemetry emitted per entry');
  const dune = telemetry.find((t) => t.entry_id === 'dune_stalker');
  assert.ok(dune.aggregate > 0.7, 'dune_stalker has high coherence');
  const random = telemetry.find((t) => t.entry_id === 'random');
  assert.ok(random.aggregate < 0.5, 'random has low coherence');
});

test('hook: no emitAlienaCoherence callback → no telemetry, no throw (back-compat)', () => {
  const pool = [{ id: 'x', weight: 1.0 }];
  const out = applyBiomeBias(pool, { id: 'dune', affixes: [] });
  assert.equal(out.length, 1);
});
```

- [ ] **Step 2: Run RED** — fail (no `canonicalPool`/`emitAlienaCoherence` in opts).

- [ ] **Step 3: Wire into `biomeSpawnBias.applyBiomeBias`** — add a best-effort post-bias telemetry block. After the existing weight adjustments loop (locate the `return pool` or final pool computation), insert (before return):

```js
// §21 ALIENA diagnostic — emit per-entry coherence telemetry. Opt-in via
// opts.emitAlienaCoherence callback. Best-effort: never throws, never blocks.
if (typeof opts.emitAlienaCoherence === 'function') {
  try {
    const { scoreAlienaCoherence } = require('../authorial/alienaCoherence');
    for (const entry of pool) {
      try {
        const score = scoreAlienaCoherence(entry, biomeConfig, {
          canonicalPool: opts.canonicalPool || [],
        });
        opts.emitAlienaCoherence({
          entry_id: entry.id,
          biome_id: biomeConfig && biomeConfig.id,
          aggregate: score.aggregate,
          sub_scores: score.sub_scores,
        });
      } catch {
        /* best-effort per-entry; never blocks */
      }
    }
  } catch {
    /* best-effort whole-block */
  }
}
```

- [ ] **Step 4: Run GREEN** — `node --test tests/api/alienaCoherence.test.js` → all 8 PASS.

- [ ] **Step 5: Full-suite regression** — `node --test tests/api/*.test.js` → 0 fail.

- [ ] **Step 6: Commit** — `feat(authorial): wire ALIENA coherence telemetry into biomeSpawnBias (diagnostic)` + trailers. `git add apps/backend/services/combat/biomeSpawnBias.js tests/api/alienaCoherence.test.js`.

---

## Task 3: PR + review + merge

- [ ] Push + PR with body explaining diagnostic-only scope + start-value weights (L-069-lockable). update-branch → CI green → squash merge.

## Self-Review

- 3D scorer (plausibilita/coerenza_eco/ancoraggio_narrativo) weighted 0.4/0.4/0.2 per master-dd 2026-05-28 confirm.
- DIAGNOSTIC ONLY: pool/weights NEVER modified by scorer; pool count unchanged (verified by test).
- Best-effort: scorer + hook wrapped in try/catch; never throws, never blocks spawn.
- Opt-in: hook fires ONLY when `opts.emitAlienaCoherence` callback provided. Existing callers unaffected (back-compat test).
- Reuses existing `biomeMatchScore` + `matchRoleTemplate` from `biomeSpawnBias.js` (no formula re-impl).

## Deferred (out of scope)

- Wire `emitAlienaCoherence` callback at the actual caller site (`reinforcementSpawner` / encounter generation) to forward telemetry to session.events. This is a separate wire — diagnostic infrastructure ships here, live consumption follows.
- Additional hooks (rewardOffer, cross_events) — single-hook MVP.
- Score lock via playtest (L-069 pattern).
- Promotion to enforcement layer (Option B from session AskUserQuestion) = future decision.
