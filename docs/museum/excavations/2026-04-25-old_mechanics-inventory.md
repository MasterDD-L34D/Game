---
title: Excavate inventory — old_mechanics (2026-04-25)
doc_status: draft
doc_owner: agents/repo-archaeologist
workstream: cross-cutting
last_verified: 2026-04-25
source_of_truth: false
language: it
review_cycle_days: 30
tags: [archaeology, museum, old_mechanics, deprecated]
---

# Excavate — old_mechanics

**Mode**: `excavate --domain old_mechanics` · **Run**: 2026-04-25 · **Agent**: repo-archaeologist (INTJ-A excavate)

## Summary (3 bullet)

- **8 artifact** sepolti veri trovati. Mix di scouting (`recon_meccaniche.json`), schema event hooks (`engine_events.schema.json`), trait swarm-staging mai promosso (`magnetic_rift_resonance.yaml`), Python rules engine deprecato (10 files), GDD pre-pillars + design map archived. Zero already-canonical false positives.
- **Skiv link CONFERMATO**: `magnetic_rift_resonance` (T2 trait, biome `atollo_ossidiana`, status `telepatic_link`) si plug-in direttamente in **biomeResonance.js** (PR #1785 shipped Sprint B Skiv) come tier-extension. Score 4/5. Sprint A reuse*path concreto: `apps/backend/services/combat/biomeResonance.js`. Bonus: `engine_events.schema.json` enneagram hooks pattern (`on*\*` regex) può servire per Skiv synergy event bus (Sprint B PR #1772 wired sinergie).
- **DEPRECATED Python rules**: 10 files `services/rules/` formalmente deprecated (`ADR-2026-04-19-kill-python-rules-engine.md`). Phase 2 freeze + Phase 3 removal pending. Maggior parte già porting Node (`apps/backend/services/combat/{resistanceEngine,objectiveEvaluator,reinforcementSpawner}.js` shipped). Resta `master_dm.py` REPL come orfano + `round_orchestrator.py` (rimpiazzato da `roundOrchestrator.js`).

---

## Inventory

| #   | Title                                     | found_at                                                                                                                                                                                | last_touch | git_sha (last) | author        | buried_reason | score                                             | candidate_curation                       |
| --- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------------- | ------------- | ------------- | ------------------------------------------------- | ---------------------------------------- |
| 1   | Recon meccaniche scouting                 | [incoming/recon_meccaniche.json](../../../incoming/recon_meccaniche.json)                                                                                                               | 2026-04-16 | dbf46e44       | MasterDD-L34D | unintegrated  | 2/5 (age:0.3, pillar:0, reuse:0, mentions:1)      | NO (low yield, scouting only)            |
| 2   | Personality module enneagram v1.0         | [incoming/personality_module.v1.json](../../../incoming/personality_module.v1.json)                                                                                                     | 2026-04-16 | dbf46e44       | MasterDD-L34D | unintegrated  | 4/5 (age:0.3, pillar:1[P4], reuse:1, mentions:0)  | YES — P4 MBTI 🟡 boost                   |
| 3   | Magnetic rift resonance (swarm trait)     | [incoming/swarm-candidates/traits/magnetic_rift_resonance.yaml](../../../incoming/swarm-candidates/traits/magnetic_rift_resonance.yaml)                                                 | 2026-04-24 | aa82d67f       | MasterDD-L34D | deferred      | 4/5 (age:0, pillar:2[P3+P6], reuse:1, mentions:0) | YES — Skiv Sprint A biomeResonance       |
| 4   | Engine events schema (enneagram hooks)    | [incoming/engine_events.schema.json](../../../incoming/engine_events.schema.json)                                                                                                       | 2026-04-16 | dbf46e44       | MasterDD-L34D | unintegrated  | 3/5 (age:0.3, pillar:1[P4], reuse:1, mentions:0)  | MAYBE — synergy event bus                |
| 5   | Python rules engine (10 files deprecated) | [services/rules/DEPRECATED.md](../../../services/rules/DEPRECATED.md)                                                                                                                   | 2026-04-19 | 4eef2098       | MasterDD-L34D | superseded    | 2/5 (age:0.2, pillar:0, reuse:0, mentions:1)      | NO — mostly ported Node, removal pending |
| 6   | Enneagramma mechanics registry template   | [incoming/enneagramma_mechanics_registry.template.json](../../../incoming/enneagramma_mechanics_registry.template.json)                                                                 | 2026-04-16 | dbf46e44       | MasterDD-L34D | unintegrated  | 3/5 (age:0.3, pillar:1[P4], reuse:0, mentions:0)  | MAYBE — template only                    |
| 7   | GDD baseline pre-pillars                  | [docs/archive/gdd-baseline/GDD_v1_baseline.md](../../../docs/archive/gdd-baseline/GDD_v1_baseline.md)                                                                                   | 2026-04-16 | ed074ae6       | MasterDD-L34D | superseded    | 2/5 (age:0.3, pillar:0, reuse:0, mentions:0)      | NO (historical_ref)                      |
| 8   | Integrated design map 2026-04-20          | [docs/archive/concept-explorations/2026-04/handoff/2026-04-20-integrated-design-map.md](../../../docs/archive/concept-explorations/2026-04/handoff/2026-04-20-integrated-design-map.md) | 2026-04-20 | de321c95       | MasterDD-L34D | abandoned     | 3/5 (age:0.2, pillar:1, reuse:1, mentions:0)      | MAYBE — 11 lacune residue indexed        |

---

## Top 3 candidati per curation immediata

### 🥇 #3 magnetic_rift_resonance.yaml — score 4/5

**Reason**: PR #1720 (`feat(swarm): first integration staging`) ha staged trait ma MAI promosso. Schema completo (tier T2, trigger biome+ability, effect telepatic_link 5 turni, narrative hook + testability). **Skiv Sprint A direct fit**: il sistema biomeResonance (PR #1785) supporta tier ladder; `atollo_ossidiana` non esiste in `data/core/biomes.yaml` ma può essere derivato da biome con `magnetic_field_strength` flag.

**Reuse path Minimal (~2h)**: aggiungi biome `atollo_ossidiana` placeholder + 1 trait reference in `data/core/traits/active_effects.yaml`. Map T2 → biomeResonance tier_2.

**Risk**: serve `magnetic_sensitivity` + `rift_attunement` requires_traits (entrambi mai catalogati). Decision: stub 2 trait base in glossary OR scope-down a self-contained.

### 🥈 #2 personality_module.v1.json — score 4/5

**Reason**: dataset enneagrammico completo 9 tipi × wings + center + passion + virtue + stress_to/growth_to mappature. **P4 (MBTI/Ennea) status 🟡** — Ennea zero runtime. 770 righe schema-grade JSON. ADR-2026-04-23 (Q52 P2) menziona `vcScoring.js` espone solo MBTI.

**Reuse path Minimal (~3h)**: 9 enneagram-type cards lookup table in `apps/backend/services/aiPolicy/` per intent priors (Ennea-aware policy selection).

**Risk**: serve linkage MBTI×Ennea (es. INTJ-5w4 vs INTJ-1w9). Out-of-scope per Skiv ma boost P4.

### 🥉 #4 engine_events.schema.json — score 3/5

**Reason**: schema 21 righe per event hooks (`on_*` regex pattern + aliases + payload_shape). Pattern già usato implicitamente da `synergyDetector.js` (PR #1772). Formalizzazione schema = Skiv Sprint B synergy event bus standardization.

**Reuse path Minimal (~1h)**: registra schema in `packages/contracts/schemas/engine_events.schema.json`, AJV validate emit di synergy/biome resonance events.

**Risk**: schema oggi è solo enneagram-focused (`payload_shape` vuoto). Dovrà generalizzare.

---

## False positives flagged (NON curare)

| Item                                                   | Reason skip                                                                                                                                                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `magnetic_rift_resonance.yaml` recipient checks        | NON in `data/core/` né `apps/backend/`. Verified via `grep` — NO false positive. Curation legittima.                                                                                                                |
| `services/rules/resolver.py` + `round_orchestrator.py` | DEPRECATED + porting Node già shipped: `apps/backend/services/combat/resistanceEngine.js` (M6-#1) + `roundOrchestrator.js` (ADR-2026-04-16). NON curare il Python sepolto, è già "rimpiazzato in canonical attivo". |
| `services/rules/grid.py` + `trait_effects.py`          | Ported a `apps/backend/services/grid/hexGrid.js` + `apps/backend/services/combat/abilityExecutor.js` rispettivamente. Skip.                                                                                         |
| `incoming/recon_meccaniche.json` (#1)                  | Scouting esterno (Item-generator + Drive boo enneagramma). Bassa actionability. Conserva in inventory ma NO card.                                                                                                   |
| `GDD_v1_baseline.md` (#7)                              | Già marcato `doc_status: historical_ref`. Pillars-era pre-superseded. Skip.                                                                                                                                         |

**Cross-check canonical complete**:

- `grep recon|engine_events|personality_module apps/backend/` → ZERO match (no false positive)
- `grep magnetic_rift_resonance data/core apps/backend/` → ZERO match (truly buried)
- `grep ossidiana data/core/biomes.yaml` → ZERO (biome assumed but not exists)

---

## Skiv Sprint A/B link analysis

**Sprint A (resolver + biome ~7h)**:

- ✅ #3 magnetic_rift_resonance → biomeResonance.js extension (tier T2 + atollo_ossidiana stub)
- 🟡 #6 enneagramma_mechanics_registry → Ennea event hooks per resolver (deferred Sprint C)

**Sprint B (synergy + defy ~11h)**:

- ✅ #4 engine_events schema → standardize synergyDetector emit format
- 🟡 #2 personality_module → Ennea-aware defy/synergy intent priors (Sprint C scope)

**Sprint C (voices + diary ~11h)**:

- ✅ #2 personality_module → narrative voice cards per Ennea type (9 archetipi)
- ✅ #6 enneagramma_mechanics_registry → diary event taxonomy

---

## Suggested next-step

```bash
invoke repo-archaeologist --mode curate --target incoming/swarm-candidates/traits/magnetic_rift_resonance.yaml
# Atteso output: docs/museum/cards/old_mechanics-magnetic-rift-resonance.md (Dublin Core)
# + MUSEUM.md entry "Old mechanics" sezione + 🏆 Top relevance (score 4/5)
# + Skiv Sprint A reuse_path Minimal/Moderate/Full ranked
```

Secondaria: `--target incoming/personality_module.v1.json` per P4 Ennea boost (chiude gap 🟡 → 🟡+).

---

## Provenance trail (this excavation)

- Probes: 18 bash (ls/git log/grep) + 5 Read targeted (recon, personality, magnetic, DEPRECATED.md, integrated-design-map)
- Git pickaxe: `git log -S "recon|swarm|personality_module"` → 3 hit chains tracciate
- Cross-check: `apps/backend/services/combat/` (10 files) vs `services/rules/` (10 files Python) → mappa porting verificata
- Budget: ~15 min (entro target 15-20 min)
