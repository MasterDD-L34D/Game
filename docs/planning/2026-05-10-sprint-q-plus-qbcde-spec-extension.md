---
title: 'Sprint Q+ Q.B+Q.C+Q.D+Q.E Spec Extension — Full Pipeline Pre-Stage'
date: 2026-05-10
type: planning
status: live
workstream: cross-cutting
slug: 2026-05-10-sprint-q-plus-qbcde-spec-extension
tags: [sprint-q-plus, q-3, q-4, q-5, q-6, q-7, q-8, q-9, q-10, q-11, q-12, prestage, completionist]
author: claude-autonomous
---

# Sprint Q+ Q.B+Q.C+Q.D+Q.E Spec Extension — 2026-05-10

Pre-stage doc-only extension a Q.A bundle (PR #2189). 8 ticket spec residue ready cascade autonomous post-Phase-B-accept (target 2026-05-14).

**Anti-pattern guard**: NO code ship pre-Phase-B-accept. Doc-only spec = additive + reversibile.

## Q.B — Backend Engine (~4.5h cumulative)

### Q-3 — `propagateLineage` engine + MUTATION_LIST canonical (~2h)

#### Path canonical

- `apps/backend/services/lineage/propagateLineage.js` (NEW)
- `data/core/mutations/canonical_list.yaml` (NEW)

#### MUTATION_LIST YAML structure

```yaml
# data/core/mutations/canonical_list.yaml
schema_version: '1.0.0'
mutations:
  armatura_residua:
    label_it: 'Armatura Residua'
    effect_kind: passive_buff
    stat: defense_mod
    amount: 1
    duration: permanent
    description_it: 'Tessuto coriaceo persistente da generazione precedente. +1 defense_mod permanente.'

  tendine_rapide:
    label_it: 'Tendine Rapide'
    effect_kind: passive_buff
    stat: attack_range
    amount: 1
    duration: permanent
    description_it: 'Fibre muscolari ottimizzate per velocità. +1 attack_range permanente.'

  cuore_doppio:
    label_it: 'Cuore Doppio'
    effect_kind: passive_buff
    stat: hp_max
    amount_pct: 15
    duration: permanent
    description_it: 'Sistema circolatorio ridondante. +15% hp_max permanente.'

  vista_predatore:
    label_it: 'Vista Predatore'
    effect_kind: conditional_buff
    stat: attack_mod
    amount: 1
    condition: target_status_panicked
    duration: permanent
    description_it: 'Acuità sensoriale specializzata. +1 attack_mod vs panicked permanente.'

  lingua_chimica:
    label_it: 'Lingua Chimica'
    effect_kind: on_hit_apply_status
    status_id: disorient
    duration: 1
    cooldown: 2
    description_it: 'Saliva neurotossica. Applica disorient 1t on hit (cooldown 2t).'

  memoria_ferita:
    label_it: 'Memoria Ferita'
    effect_kind: conditional_buff
    stat: attack_mod
    amount: 1
    condition: target_trait_id_eq_previous_wounded_source
    duration: permanent
    description_it: 'Marchio epigenetico del trauma genitoriale. +1 attack_mod vs trait_id sorgente ferita parent.'
```

#### `propagateLineage.js` engine

```js
// apps/backend/services/lineage/propagateLineage.js
'use strict';

const { v4: uuidv4 } = require('uuid');
const { loadMutationsCanonical } = require('./mutationsLoader');
const { offspringStore } = require('./offspringStore'); // Q-2 Prisma adapter

/**
 * Propagate lineage from parents → offspring entry. Pure function +
 * Prisma write-through via offspringStore.
 *
 * @param {object} params
 * @param {string} params.sessionId - Session origin del mating event.
 * @param {object} params.parentA - { id, lineage_id?, trait_inherited?, biome_origin? }
 * @param {object} params.parentB - { id, lineage_id?, trait_inherited?, biome_origin? }
 * @param {string[]} params.mutations - Array 1-3 mutation IDs canonical (user choice from MUTATION_LIST).
 * @returns {Promise<object>} Offspring entry contract `lineage_ritual.schema.json`.
 */
async function propagateLineage({ sessionId, parentA, parentB, mutations }) {
  // Validate mutations against canonical list.
  const canonical = loadMutationsCanonical();
  for (const m of mutations) {
    if (!canonical.mutations[m]) {
      throw new Error(`mutation '${m}' not in canonical_list.yaml`);
    }
  }
  if (mutations.length < 1 || mutations.length > 3) {
    throw new Error(`mutations.length must be 1-3, got ${mutations.length}`);
  }

  // Lineage ID propagation: existing parent chain OR new lineage.
  const lineageId = parentA.lineage_id || parentB.lineage_id || uuidv4();

  // Trait inherited dal parent dominante (default: union both, dedup, max 6).
  const inheritedSet = new Set([
    ...(parentA.trait_inherited || []),
    ...(parentB.trait_inherited || []),
  ]);
  const traitInherited = Array.from(inheritedSet).slice(0, 6);

  // Biome origin: parentA priority (TBD master-dd Q-3 review).
  const biomeOrigin = parentA.biome_origin || parentB.biome_origin || null;

  const offspring = {
    id: uuidv4(),
    session_id: sessionId,
    lineage_id: lineageId,
    parent_a_id: parentA.id,
    parent_b_id: parentB.id,
    mutations,
    trait_inherited: traitInherited,
    biome_origin: biomeOrigin,
    born_at: new Date().toISOString(),
  };

  // Persist via offspringStore (Q-2 Prisma + in-memory fallback).
  await offspringStore.create(offspring);

  return offspring;
}

module.exports = { propagateLineage };
```

#### Master-dd review checkpoints Q-3

- [ ] `lineage_id` propagation rule (parentA OR parentB priority OR random) acceptable?
- [ ] `trait_inherited` union+dedup max 6 cap reasonable? Alt = parent dominante full inherit
- [ ] `biome_origin` priority parentA fallback parentB OR encounter biome current?
- [ ] Mutation amount validation strict (1-3) o flexible (0-3 = no mutation possible)?

### Q-4 — HTTP API `/api/v1/lineage/legacy-ritual` JWT (~1h)

#### Path canonical

- `apps/backend/routes/lineage.js` (NEW)
- `apps/backend/middleware/auth.js` (existing, JWT shared)

#### Endpoint contract

**POST `/api/v1/lineage/legacy-ritual`**

- Auth: required (JWT existing cross-stack)
- Body: `{ session_id, parent_a_id, parent_b_id, mutations: [string, 1-3] }`
- Response 201: `lineage_ritual.schema.json` payload (Q-1 Schema)
- Response 400: validation error (mutations invalid, parent FK miss, etc.)
- Response 401: auth missing
- Response 500: propagateLineage throw (offspringStore failure)

**GET `/api/v1/lineage/:lineage_id/chain`**

- Auth: required
- Response 200: `{ lineage_id, offspring: [Offspring[]] }` chain ordered `born_at ASC`
- Response 404: lineage_id not found

#### Route impl

```js
// apps/backend/routes/lineage.js
'use strict';

const { Router } = require('express');
const { propagateLineage } = require('../services/lineage/propagateLineage');
const { offspringStore } = require('../services/lineage/offspringStore');
const { requireAuth } = require('../middleware/auth');

function createLineageRouter() {
  const router = Router();

  router.post('/legacy-ritual', requireAuth(), async (req, res) => {
    try {
      const { session_id, parent_a_id, parent_b_id, mutations } = req.body;
      // FK lookup: parent must exist in UnitProgression.
      const offspring = await propagateLineage({
        sessionId: session_id,
        parentA: { id: parent_a_id },
        parentB: { id: parent_b_id },
        mutations,
      });
      return res.status(201).json(offspring);
    } catch (err) {
      if (
        err.message.includes('not in canonical_list') ||
        err.message.includes('mutations.length')
      ) {
        return res.status(400).json({ error: err.message });
      }
      return res.status(500).json({ error: err.message });
    }
  });

  router.get('/:lineage_id/chain', requireAuth(), async (req, res) => {
    const chain = await offspringStore.getByLineageId(req.params.lineage_id);
    if (!chain || chain.length === 0) {
      return res.status(404).json({ error: 'lineage_id not found' });
    }
    return res.json({ lineage_id: req.params.lineage_id, offspring: chain });
  });

  return router;
}

module.exports = { createLineageRouter };
```

#### Master-dd review checkpoints Q-4

- [ ] Endpoint path naming `/api/v1/lineage/...` vs `/api/lineage/...` (semver versioning policy)?
- [ ] POST 201 vs 200 response status (REST canonical 201 for resource creation)
- [ ] GET chain limit pagination needed (long lineages 10+ generations)?
- [ ] Auth role-based (any reviewer/editor/admin) o per-session ownership check?

### Q-5 — `evaluateChoiceRitual` cross-stack contract (~1.5h)

#### Path canonical

- `apps/backend/services/ambition/evaluateChoiceRitual.js` (existing, EXTEND)
- `apps/backend/services/lineage/lineageRitualBridge.js` (NEW)

#### Contract bridge

`evaluateChoiceRitual` quando user choice ritual = `legacy_ritual_offspring` → trigger `lineageRitualBridge.invoke({ session_id, choice })`:

1. Lookup parents via `computeMatingEligibles(session)`
2. Surface MUTATION_LIST 6 canonical → user 3-choice (frontend)
3. POST `/api/v1/lineage/legacy-ritual` con mutations user-selected
4. Emit raw event `{ action_type: 'legacy_ritual', offspring_id, lineage_id, mutations }` per VC scoring + Skiv-Pulverator alleanza arc tracker

#### Master-dd review checkpoints Q-5

- [ ] Bridge contract surface (fire-and-forget vs await response)?
- [ ] VC scoring signal weight for `legacy_ritual` action (default 0 vs custom)?
- [ ] Emit event timing: post-201 OR optimistic pre-201?

## Q.C — Cross-Repo Sync OD-022 Bundle (~7-9h cumulative)

### Q-6 — evo-swarm `canonical_ref` field swarm-side (~2-3h)

#### Path cross-repo

- `evo-swarm/swarm/co02_validation.py` (existing, EXTEND)
- `evo-swarm/swarm/distillations/run_N/*.json` (output schema delta)

#### Schema delta

Ogni claim swarm output JSON aggiunge `canonical_ref` field con path Game/ canonical:

```json
{
  "claim": "dune_stalker biome_affinity = abisso_vulcanico",
  "confidence": 0.85,
  "canonical_ref": "data/core/species.yaml#dune_stalker.biome_affinity",
  "verified_via": "co02_validation.canonical_grep"
}
```

#### Master-dd review checkpoints Q-6

- [ ] Field name `canonical_ref` vs `source_path` vs `evidence_link`?
- [ ] Path format anchored (file#field) vs URL absolute?
- [ ] Required vs optional (`canonical_ref` mandatory each claim or only verifiable)?

### Q-7 — `tools/py/swarm_canonical_validator.py` (~3-4h)

#### Path canonical

- `tools/py/swarm_canonical_validator.py` (existing skeleton PR #2129, IMPLEMENT)
- `tools/py/test_swarm_canonical_validator.py` (NEW)

#### Implementation pattern (skeleton ready PR #2129)

```python
# tools/py/swarm_canonical_validator.py — IMPLEMENT 6 stub functions
import yaml
from pathlib import Path

GATE_THRESHOLD = 0.30  # >30% hallucination ratio = reject merge

def parse_swarm_output(path: Path) -> list[dict]:
    """Parse evo-swarm distillation JSON output → list of claims."""
    # Implementation: json.load + extract claim entries

def resolve_canonical_ref(ref: str) -> tuple[Path, str]:
    """Resolve `data/core/species.yaml#dune_stalker.biome_affinity` → (file, field_path)."""
    # Implementation: split('#') + Path lookup

def verify_claim(claim: dict, repo_root: Path) -> dict:
    """Verify claim.canonical_ref exists + claim value matches canonical YAML."""
    # Implementation: yaml.safe_load + dict traversal + assert match

def compute_hallucination_ratio(claims: list[dict]) -> float:
    """Ratio falsifiable claims that fail verification / total verifiable."""
    # Implementation: count failed / count total

def emit_verification_table(claims: list[dict], output: Path) -> None:
    """Write Markdown table claim/canonical_ref/verified status to docs/research/."""
    # Implementation: format claims → Markdown table

def main(distillation_path: Path, repo_root: Path) -> int:
    """Exit 0 if hallucination ratio <30%, exit 1 otherwise. Emit table."""
    claims = parse_swarm_output(distillation_path)
    verified = [verify_claim(c, repo_root) for c in claims]
    ratio = compute_hallucination_ratio(verified)
    emit_verification_table(verified, repo_root / 'docs/research/swarm_validation_latest.md')
    return 0 if ratio < GATE_THRESHOLD else 1
```

#### Test corpus

15 test cases skeleton PR #2129 spec doc covered. Implementation valida:

- 5 verified (canonical match)
- 5 hallucinated (canonical mismatch)
- 3 missing canonical_ref (skip verification)
- 2 ambiguous canonical_ref (warn only, no fail)

#### Master-dd review checkpoints Q-7

- [ ] GATE_THRESHOLD 0.30 (30%) acceptable? Alt = stricter 0.20 OR lenient 0.50
- [ ] Verification depth: exact match vs fuzzy (Levenshtein <= 2)?
- [ ] Output format: Markdown table only OR JSON sidecar per CI consumption?

### Q-8 — Pipeline integration ETL hallucination ratio gate (~2h)

#### Path cross-repo

- `evo-swarm/.github/workflows/distillation.yml` (EXTEND, forbidden path swarm-side)
- `Game/.github/workflows/swarm-validation.yml` (NEW Game-side, forbidden path master-dd grant)

#### Workflow integration

```yaml
# Game/.github/workflows/swarm-validation.yml
name: Swarm Validation

on:
  pull_request:
    paths:
      - 'docs/research/2026-*-evo-swarm-*-distillation.md'
  workflow_dispatch:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Install deps
        run: pip install pyyaml
      - name: Run validator
        run: python tools/py/swarm_canonical_validator.py \
          --distillation docs/research/$(ls docs/research | grep "evo-swarm.*distillation" | tail -1) \
          --repo-root . \
          --gate-threshold 0.30
      - name: Comment PR with verification table
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const table = fs.readFileSync('docs/research/swarm_validation_latest.md', 'utf8');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `## Swarm Canonical Validation\n\n${table}`
            });
```

#### Master-dd review checkpoints Q-8

- [ ] Trigger paths: only distillation docs OR all docs/research/?
- [ ] Block merge se exit 1 OR comment-only?
- [ ] Cross-repo cron sync swarm-side trigger?

## Q.D — Frontend Surface (~4h cumulative)

### Q-9 — DebriefView lineage panel extension Game/ (~2h)

#### Path canonical

- `apps/play/src/debriefPanel.js` (existing, EXTEND new section)
- `apps/play/src/lineagePanel.js` (existing dal Sprint 12 mating wire, REUSE)

#### UI surface delta

Post-mating debrief panel section "Lineage Ritual":

```html
<div id="db-legacy-ritual-section" class="db-section">
  <h3>🌀 Rituale Eredità</h3>
  <div id="db-legacy-ritual-mutations">
    <!-- 6 mutation cards canonical → user select 3 -->
  </div>
  <button id="db-legacy-ritual-confirm" disabled>Conferma 3 mutazioni</button>
</div>
```

JS interaction:

```js
// apps/play/src/legacyRitualPanel.js (NEW)
import { fetchMutationsCanonical, postLegacyRitual } from './lineageApi.js';

export async function renderLegacyRitual({ sessionId, parentA, parentB }) {
  const mutations = await fetchMutationsCanonical();
  const selected = new Set();
  // Render 6 mutation cards, click toggle selected (max 3)
  // On 3 selected, enable confirm button
  // On confirm: POST /api/v1/lineage/legacy-ritual + render result offspring
}
```

#### Master-dd review checkpoints Q-9

- [ ] Mutation card visual (icon + name + description tooltip)?
- [ ] Reroll mutations option (3 per session) o lock-in?
- [ ] Skip ritual option (no offspring spawned this session)?

### Q-10 — Godot v2 LegacyRitualPanel.gd parity wire (~2h)

#### Path cross-repo Godot v2

- `Game-Godot-v2/scripts/ui/legacy_ritual_panel.gd` (existing N.7 spec, IMPLEMENT)
- `Game-Godot-v2/scripts/lifecycle/lineage_merge_service.gd:42` (existing 77 LOC LIVE, EXTEND)

#### GDScript parity Q-9

```gdscript
# scripts/ui/legacy_ritual_panel.gd
extends Panel

const MUTATION_LIST_PATH = "res://data/core/mutations/canonical_list.yaml"

@onready var mutation_cards: Array = []
var selected_mutations: Array = []

func _ready():
  load_mutations()
  setup_card_grid()

func load_mutations():
  var file = FileAccess.open(MUTATION_LIST_PATH, FileAccess.READ)
  var yaml_text = file.get_as_text()
  var parsed = YAML.parse(yaml_text)  # or custom parser
  for mutation_id in parsed.mutations:
    var spec = parsed.mutations[mutation_id]
    create_mutation_card(mutation_id, spec)

func _on_mutation_card_pressed(mutation_id: String):
  if mutation_id in selected_mutations:
    selected_mutations.erase(mutation_id)
  elif selected_mutations.size() < 3:
    selected_mutations.append(mutation_id)
  $ConfirmButton.disabled = selected_mutations.size() != 3

func _on_confirm_pressed():
  var bridge = get_node("/root/LineageRitualBridge")
  bridge.submit_ritual(selected_mutations)
```

#### Master-dd review checkpoints Q-10

- [ ] YAML parser Godot-side: native asset_loader OR custom converter?
- [ ] Visual style consistent con DebriefView Game/ (cross-stack design system)?
- [ ] LineageRitualBridge AutoLoad OR scene-level instance?

## Q.E — Test + Closure (~2.5h cumulative)

### Q-11 — Test E2E lineage chain merge cross-encounter (~1.5h)

#### Path canonical

- `tests/api/lineageRitual.test.js` (NEW Node test runner)
- `tests/scenarios/lineage_chain_e2e.yaml` (NEW scenario fixture)

#### E2E scenario

```js
// tests/api/lineageRitual.test.js
test('lineage chain cross-encounter: encounter1 mating → encounter2 offspring inherits', async (t) => {
  const sid1 = await startSession();
  await playEncounter1ToVictory(sid1);
  const eligibles = await getMatingEligibles(sid1);
  assert.ok(eligibles.length >= 1);

  const ritual1 = await postLegacyRitual({
    session_id: sid1,
    parent_a_id: eligibles[0].pair[0].id,
    parent_b_id: eligibles[0].pair[1].id,
    mutations: ['armatura_residua', 'tendine_rapide', 'cuore_doppio'],
  });
  assert.equal(ritual1.mutations.length, 3);
  const lineage_id_first = ritual1.lineage_id;

  // Encounter 2: spawn offspring same lineage chain.
  const sid2 = await startSession();
  await playEncounter2WithLineage(sid2, lineage_id_first);
  const ritual2 = await postLegacyRitual({
    session_id: sid2,
    parent_a_id: ritual1.id, // offspring of ritual1 = parent in ritual2
    parent_b_id: someOther.id,
    mutations: ['memoria_ferita'],
  });

  // Verify lineage chain preserved.
  assert.equal(ritual2.lineage_id, lineage_id_first);
  const chain = await getLineageChain(lineage_id_first);
  assert.equal(chain.offspring.length, 2);
  assert.deepEqual(
    chain.offspring.map((o) => o.id),
    [ritual1.id, ritual2.id],
  );
});
```

#### Master-dd review checkpoints Q-11

- [ ] Test isolation: mock Prisma OR real DB integration test?
- [ ] Coverage scenario: success path only OR include failure cases (parent not eligible, mutations invalid)?

### Q-12 — Closure docs + museum card + ADR + handoff (~1h)

#### Deliverables

1. **ADR-2026-05-XX-sprint-q-plus-lineage-merge-shipped.md** — Sprint Q+ closure ADR
2. **Museum card M-2026-05-XX-NNN-lineage-merge-canonical.md** — pattern reuse
3. **Closure handoff doc** — Sprint Q+ retrospettiva + post-Q+ next steps
4. **CLAUDE.md sprint context update** — pillar deltas P2 🟢++ + P5 🟢++

#### Pillar deltas anticipated

| Pilastro                | Pre-Q+ |                    Post-Q+                     |
| ----------------------- | :----: | :--------------------------------------------: |
| P2 Evoluzione emergente |  🟢++  |  🟢ⁿ (lineage chain visible cross-encounter)   |
| P5 Co-op vs Sistema     |   🟢   | 🟢++ (Skiv-Pulverator alleanza arc completion) |

## Cumulative Sprint Q+ effort post-Phase-B-accept

| Stage                        | Tickets     |   Effort    |            Status            |
| ---------------------------- | ----------- | :---------: | :--------------------------: |
| Q.A — Schema + Migration     | Q-1+Q-2     |     ~3h     |     Spec ready PR #2189      |
| Q.B — Backend Engine         | Q-3+Q-4+Q-5 |    ~4.5h    |      Spec ready THIS PR      |
| Q.C — Cross-Repo Sync OD-022 | Q-6+Q-7+Q-8 |    ~7-9h    |      Spec ready THIS PR      |
| Q.D — Frontend Surface       | Q-9+Q-10    |     ~4h     |      Spec ready THIS PR      |
| Q.E — Test + Closure         | Q-11+Q-12   |    ~2.5h    |      Spec ready THIS PR      |
| **Total**                    | 12 ticket   | **~21-23h** | **Full pipeline spec ready** |

## Master-dd review burden estimate

| Stage                          | Review effort | Trigger                            |
| ------------------------------ | :-----------: | ---------------------------------- |
| Q-1 schema (forbidden path)    |   ~10-15min   | Day 8 §13.3 commit                 |
| Q-2 migration (forbidden path) |   ~10-15min   | post Q-1 ship                      |
| Q-3 design call                |   ~5-10min    | post Q-2 ship                      |
| Q-4 design call                |   ~5-10min    | post Q-3 ship                      |
| Q-6 swarm coord                |   ~10-15min   | post Q-5 ship                      |
| Q-10 Godot v2                  |   ~5-10min    | post Q-9 ship                      |
| **Total cumulative**           | **~45-70min** | **Across 4-5 sessioni autonomous** |

## Cross-references

- [docs/planning/2026-05-10-sprint-q-plus-qa-prestage-bundle.md](2026-05-10-sprint-q-plus-qa-prestage-bundle.md) Q.A spec PR #2189
- [docs/planning/2026-05-10-sprint-q-plus-full-scope-codification.md](2026-05-10-sprint-q-plus-full-scope-codification.md) FULL scope codification
- [ADR-2026-05-05 §13](../adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md#13-phase-b-accept-stub--pending-master-dd-verdict-2026-05-14) Phase B accept stub
- [docs/research/2026-05-08-od-022-validator-pre-design.md](../research/2026-05-08-od-022-validator-pre-design.md) OD-022 validator skeleton

## Caveat anticipated judgment (CLAUDE.md)

Spec doc Q-3 → Q-12 = Claude autonomous design pre-master-dd review. Ship code = post-Day-8 Phase B accept gated. Spec preservato archive read-only se reject.

## Notes

- **Effort spec doc bundle this PR**: ~1h Claude autonomous (architecture continuation Q.A spec PR #2189).
- **Total Sprint Q+ post-stage effort**: spec doc + planning + cross-stack mapping = ~3h × 2 PR (Q.A + Q.B-Q.E) = ~6h total pre-stage work.
- **Code execution effort post-Phase-B-accept**: ~21-23h (full pipeline) + ~45-70min master-dd review window.
- **Total wall-clock pre-Sprint-closure**: ~22-24h cumulative ~5-6 sessioni autonomous + 1 master-dd Day 8 verdict commit.
