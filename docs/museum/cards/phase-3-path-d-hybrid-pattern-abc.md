---
title: 'Phase 3 Path D HYBRID — Pattern A+B+C heuristic enrichment (reusable methodology)'
museum_id: M-2026-05-15-001
type: methodology_pattern
domain: data-enrichment-quality-gates
provenance:
  found_at: tools/etl/enrich_species_heuristic.py + ADR-2026-05-15
  git_sha_first: c157553
  git_sha_last: HEAD
  last_modified: 2026-05-15
  last_author: claude-code (autoresearch-subagent + master-dd verdict approve)
  buried_reason: discovered-via-completism-need
relevance_score: 5
reuse_path: 'Industry-pattern templating methodology for any data-enrichment task with master-dd review gate. Apply to: trait_plan placeholder fill, biome encounter generators, mutation lore composition, dialog generation.'
related_pillars: [P3, P4]
related_adr: [ADR-2026-05-15]
related_pr: [PR #2271]
status: curated
excavated_by: claude-code (gap audit + autoresearch subagent collab 2026-05-15)
excavated_on: 2026-05-15
last_verified: 2026-05-15
---

# Phase 3 Path D HYBRID — Pattern A+B+C heuristic enrichment

## Summary (30s)

- **Problem**: 38 species in catalog v0.4.x had 3 rich fields VUOTI (`visual_description`, `interactions.symbiosis`, `constraints`). Master-dd narrative composition pure stimato **10-15h brutale** single-bottleneck.
- **Solution**: Path D HYBRID — Claude tag-driven heuristic engine (Pattern A+B+C) + master-dd polish review ONLY (-55% master-dd load). User requested "completismo da game reale" — quality narrative content, NON AI auto-fill lorem-ipsum.
- **Result**: visual 94.7% + constraints 100% + symbiosis 47% derived heuristic + 5% ecology-mutualism + \_provenance audit trail 100% per future master-dd review queue.
- **Reusable**: pattern applicabile a qualsiasi data-enrichment task con quality gate.

## What was buried

Catalog v0.4.x post Phase 1+2 ETL absorb (53 species single SOT) ha 38 legacy entries con rich fields vuoti (functional_signature + visual_description + risk_profile + interactions + constraints). Master-dd narrative pure approach = brutale bottleneck.

Autoresearch subagent identified 3 industry-proven patterns directly mappable to existing Evo-Tactics canonical data structure:

### Pattern A — Caves of Qud tag-driven generative descriptions

Source: [Freehold Games dev blog 2019, "Procedurally Generating History in Caves of Qud"](https://www.gamedeveloper.com/design/procedurally-generating-history-in-caves-of-qud).

**Approach**: each creature has anatomical tag set (`{horns, scales, bioluminescent}`) → description engine composes prose from tag-to-phrase mappings. Output is generative but tag-deterministic → QA-checkable.

**Evo-Tactics adapt**:

- `default_parts` (locomotion + offense + defense + senses) + `clade_tag` + `biome_affinity` → template engine
- `PART_PHRASE_MAP`: 28 slot.part → italian sensory phrase
- `CLADE_PHRASE_MAP`: clade → opener ("Predatore apicale")
- `BIOME_AMBIENT_MAP`: biome → ambient context ("delle savane aperte")
- Compose 2-3 sentence italian sensory description
- Coverage: **36/38 (94.7%)** visual_description

### Pattern B — Dwarf Fortress ecology projection

Source: [Tarn Adams Bay 12 forums + "Threetoe stories"](http://www.bay12games.com/dwarves/dev_now.html).

**Approach**: foodweb graph is SOT — descriptive interactions sono **derived projection** non hand-written.

**Evo-Tactics adapt**:

- Existing `packs/evo_tactics_pack/data/foodwebs/*.yaml` edges (predator/prey type) → cross-lookup species_id
- Pattern B foodweb: covers 15 Pack v2 (legacy 38 fuori scope)
- Pattern B clade+biome heuristic fallback: Apex(4) > Threat(3) > Bridge(2) > Support(1) tier rank, same-biome species cross-pollination (cap 3 each)
- Anti-fabrication: skip se biome NULL o <2 same-biome species
- Coverage: predates_on 2.6% (1/38, conservative)

### Pattern C — RimWorld backstory framework constraints

Source: [RimWorld Wiki "Backstory" + Ludeon devblogs](https://rimworldwiki.com/wiki/Backstory).

**Approach**: backstories composte da chunk pool con **trait constraint** (`brawler → cannot use ranged`). Constraints derive da meccanica, non da fiction.

**Evo-Tactics adapt**:

- `sentience_index` + `default_parts` + `risk_profile.vectors` rule library
- 22 CONSTRAINT_RULES: predicate → italian phrase
- Sentience T0/T1 → "stimoli immediati"
- Locomotion burrower → "inefficace su roccia compatta"
- Offense electric_pulse → "scarica inefficace atmosfera secca"
- Clade Bridge/Support/Threat T3-T4/Playable → context-specific
- Coverage: **38/38 (100%)** constraints

## Quality safeguards (anti-fabrication)

### `_provenance` audit trail

Each enriched field tagged in catalog entry `_provenance` dict:

- `heuristic-pattern-A-tag-driven`
- `heuristic-pattern-B-foodweb` | `heuristic-pattern-B-clade-biome`
- `heuristic-pattern-C-mechanical`
- `heuristic-ecology-mutualism`
- `heuristic-clade-keystone` | `heuristic-clade-bridge`
- `default-clade-nonkeystone` (legitimate empty fallback)
- `needs-master-dd` (anti-fabrication gate)

Master-dd review queue: `tools/py/review_phase3.py --field visual_description --filter heuristic` → batch review accept/edit/reject.

### Anti-fabrication gate

Pattern B foodweb miss → empty + `_provenance: needs-master-dd` flag. **MAI fabricate predator-prey senza source canonical** (foodweb YAML o ecology block).

Test gate snapshot: `tests/test_phase3_path_d_tools.py` (17 tests):

- Pattern A insufficient data → empty string (no hallucination)
- Pattern B cross-biome filter
- Pattern C predicate deterministic
- Integration coverage gates ≥85% visual, ≥70% constraints

## Why it might still matter

### Pillar match

- **P3 Identità Specie × Job** 🟢 candidato HARD: 53/53 single SOT enforced + rich descriptions reduce schema drift technical debt
- **P4 Temperamenti** 🟢 candidato HARD: sentience_index + clade_tag + constraint coverage enable 4-layer psicologico runtime
- Pattern reusable per altri domini enrichment (trait_plan, biome encounters, dialog)

### Reusable methodology checklist

1. **Identify canonical data sources** existing in repo (default_parts, clade_tag, biome_affinity, ecology, foodweb)
2. **Map industry-proven patterns** to existing data (Caves of Qud tag-driven, DF ecology, RimWorld constraints)
3. **Tag-phrase mapping library** (PART_PHRASE_MAP etc.) with italian sensory-canonical voice
4. **Rule library** with predicate → phrase (predicate functions for deterministic eval)
5. **\_provenance audit trail** per-field origin tracking
6. **Anti-fabrication gates**: skip + flag needs-master-dd quando data insufficient
7. **Test coverage**: snapshot test patterns + integration coverage thresholds
8. **Review queue tool**: filter-by-provenance batch master-dd polish

### Effort impact

- **Pure narrative master-dd**: ~10-15h brutale single-author bottleneck
- **Path D HYBRID**: Claude 8h autonomous + master-dd 5-6.5h polish = **-55% master-dd load**
- **Time-to-ship Phase 3**: defer indefinitely → 1 session autonomous + future master-dd polish queue

## Concrete reuse paths

1. **Trait placeholder fill** (similar problem): `sp_*` placeholder species have TR-1101..TR-2005 trait_refs not yet defined. Apply Pattern A+C with trait-pattern phrase library + master-dd review queue.

2. **Biome encounter generators**: empty narrative beats post-encounter. Apply Pattern A tag-driven from biome.hazards + species.role_trofico.

3. **Mutation lore composition**: 30 mutations in `data/core/mutations/mutation_catalog.yaml` lack lore. Apply Pattern A+C from mutation trigger type + effect category.

4. **Dialog generation**: NPC dialog stubs. Apply Pattern A from MBTI axis + Ennea archetype + context.

5. **Cross-bioma event narratives**: 3 cross_events.yaml have description gap. Apply Pattern A+B from source biome.

## Sources / provenance trail

- ADR: [`docs/adr/ADR-2026-05-15-species-catalog-schema-fork-resolution.md`](../../adr/ADR-2026-05-15-species-catalog-schema-fork-resolution.md)
- Implementation: [`tools/etl/enrich_species_heuristic.py`](../../../tools/etl/enrich_species_heuristic.py) — Pattern A+B+C engine (~700 LOC post Path D extension)
- Tests: [`tests/test_phase3_path_d_tools.py`](../../../tests/test_phase3_path_d_tools.py) — 17 tests coverage
- Review queue: [`tools/py/review_phase3.py`](../../../tools/py/review_phase3.py)
- Catalog output: [`data/core/species/species_catalog.json`](../../../data/core/species/species_catalog.json) v0.4.x
- Subagent autoresearch report: in-conversation 2026-05-15 (75k tokens, 38 tool uses, 234s)
- Caves of Qud reference: Freehold Games 2019
- Dwarf Fortress reference: Tarn Adams Bay 12 forums
- RimWorld reference: Ludeon backstory framework

## Risks / open questions

- ⚠️ Master-dd review queue burnout if 36 visual_description batch all in 1 session → schedule 4-5 sessions × 8-10 species per batch
- ⚠️ Pattern A italian voice consistency vs Skiv canonical (`docs/skiv/CANONICAL.md`) — master-dd polish reconcile
- ⚠️ Foodweb scope expansion needed per Pattern B legacy 38 coverage → master-dd Sprint M14+ ecological design
- ✅ Anti-fabrication gate proven: 38/38 entries con \_provenance audit trail

## Cross-card relations

- [`M-2026-05-13-001 promotions-orphan-claim-discarded`](promotions-orphan-claim-discarded.md) — companion lesson Explore agent sub-dir heuristic miss
- [`mating_nido-engine-orphan`](mating_nido-engine-orphan.md) revived state — companion FULL CLOSURE pattern

## Anti-pattern reinforcement

Aggiungere a CLAUDE.md §"⚖ No anticipated judgment / completionist-preserve":

> **Pattern Path D HYBRID** (2026-05-15 lesson): per data-enrichment task con master-dd narrative gap, NON skip a "defer indefinitely" né AI lorem-ipsum auto-fill. Apply industry-pattern templating (Caves of Qud + Dwarf Fortress + RimWorld) + \_provenance audit trail + master-dd polish review queue. Saves -55% master-dd load while preserving quality canonical voice.

## Next actions

- [x] Pattern A+B+C engine shipped autonomous (PR #2271 commit `93359ca` + extensions)
- [x] Test coverage 17/17 (commit `58558ce`)
- [x] CONSTRAINT_RULES 100% coverage extension (commit `58558ce`)
- [x] Ecology-mutualism symbiosis fix (this session)
- [x] Museum card curation (this card)
- [ ] Master-dd polish queue session schedule (4-5 batches × 8-10 species visual review)
- [ ] Apply methodology to TKT-ECO-Z6 mutations UI standalone modal narrative
- [ ] Apply methodology to NPC dialog generation (Sprint M14+)
