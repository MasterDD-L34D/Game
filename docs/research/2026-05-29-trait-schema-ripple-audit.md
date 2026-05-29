---
title: 'ADR-2026-05-29 trait schema canonization -- schema-ripple audit (RECON-04a)'
date: 2026-05-29
type: research
status: live
workstream: traits
language: it
related:
  - docs/adr/ADR-2026-05-29-trait-schema-canonization.md
  - docs/research/2026-05-26-fase1-schema-ripple-audit.md
---

# Trait schema canonization -- ripple audit (RECON-04a methodology)

## 0. Scopo

Gate G1 SCHEMA-RIPPLE (ADR-2026-05-29 sezione D): ogni edit allo schema dei file canon (`data/core/traits/glossary.json`, `data/traits/index.json`, `data/core/traits/biome_pools.json`, `data/core/traits/active_effects.yaml`) deve verificare che i servizi downstream non rompano sul bump `schema_version` 1.0 -> 2.0. Se zero coupling negativo -> bump additivo ripple-safe.

Negative-confirmation evidence pre TKT-CL-04 contract test.

## 1. Metodo

Replica `docs/research/2026-05-26-fase1-schema-ripple-audit.md`:

- READ-ONLY grep cross-codebase sui consumer backend.
- Pattern schema-field: `schema_version | trait_glossary | sources.trait_reference`.
- Pattern coupling-largo: per-servizio file-count mention.

## 2. Target verificati (path empirici, esistono)

| Servizio | Path | Esiste |
|---|---|---|
| traitRepository | `apps/backend/services/traitRepository.js` | SI |
| traitEffects | `apps/backend/services/traitEffects.js` (+3 ref) | SI |
| biomePoolLoader | `apps/backend/services/combat/biomePoolLoader.js` | SI |
| biomeSpawnBias | `apps/backend/services/combat/biomeSpawnBias.js` (+4 ref) | SI |
| formPackRecommender | `apps/backend/services/forms/formPackRecommender.js` (+1 ref) | SI |
| catalog | `apps/backend/services/catalog.js` (+34 ref cross-cutting) | SI |
| report | `apps/backend/report.js` (+9 ref) | SI |
| beastBondReaction | `apps/backend/services/combat/beastBondReaction.js` (+2 ref) | SI |
| coop/biomeAdapter | `apps/backend/services/coop/biomeAdapter.js` | SI |

## 3. Findings

### 3.1 Coupling consumer trait schema diretto

| Path | Linee | Pattern | Verdict |
|---|---|---|---|
| `apps/backend/services/traitRepository.js:571` | `schema_version: '2.0', trait_glossary: 'data/core/traits/glossary.json'` | HARDCODED 2.0 in output index.json | **VERDE**: il repository GIA emette 2.0. Drift inverso (doc 1.0 vs runtime 2.0) sanato dal bump. |
| `apps/backend/services/traitRepository.js:954` | `typeof legacyIndex.schema_version === 'string'` | Legge schema_version come stringa generica | VERDE: tolerante a entrambi 1.0 e 2.0 stringa. |
| `apps/backend/services/coop/biomeAdapter.js:115` | `(k) => k !== 'version' && k !== 'schema_version' && !k.startsWith('_')` | Filter iteration esplicitamente skip-aware | VERDE: il bump non rompe l'iter pool. |

### 3.2 Coupling indiretto (schema_version generico, NON trait-specific)

Altri consumer citano `schema_version` ma per schema distinti dal trait:

- `campaign/campaignLoader.js` -> campaign schema.
- `mutations/mutationCatalogLoader.js` -> mutation_catalog schema.
- `lineage/mutationsLoader.js` -> lineage schema.
- `narrative/enneaVoice.js` -> ennea voice schema.
- `skiv/companionStateStore.js` -> companion state schema (CURRENT 0.2.x).
- `catalog.js:86-101` -> manifestMetadata passthrough generico.

Nessuno di questi consuma `data/core/traits/glossary.json` o `data/traits/index.json` con expectations specifiche su `schema_version`. Tutti sono ortogonali al trait schema bump.

### 3.3 Active_effects `version: 1` legacy field

Grep `version.*active_effects` su `apps/backend` -> 0 hit. Nessun consumer legge esplicitamente `version: 1` da `active_effects.yaml`. Il field e' decorativo. ADR mantiene 1 release per back-compat overcaution; rimozione safe TKT successivo.

## 4. Verdict

**G1 ripple SAFE per ADR-2026-05-29 schema bump 1.0 -> 2.0**:

1. `traitRepository.js` emette gia 2.0 hardcoded -> il bump documenta lo stato reale (drift inverso sanato).
2. `biomeAdapter.js` filter skip-aware sui field schema.
3. Tutti gli altri `schema_version` ref sono per schema distinti dal trait, ortogonali.
4. Nessun consumer legge esplicitamente `version: 1` di active_effects.yaml.

Bump additivo + nuovi field `schema_version_previous` / `schema_bumped_at` / `schema_bumped_ref` = pure additive su top-level dict. Zero modifiche per-entry trait. Zero rename. Zero rimosse.

**Implicazione**: TKT-CL-04 contract test puo' procedere. Nessun fix downstream necessario pre-merge.

## 5. Anti-pattern guard reinforced

- Pre-commit hook (`tools/lint/trait_schema_gate.py`) blocca regressioni `schema_version != 2.0` su future write canon.
- Tier-Ancestor policy (prefix `ancestor_` skippa design check) evita falsi positivi sui 297 reference identity-only.
- Design block missing su index.json e' WARN-only (Tier-Backlog 26 entries `frattura_abissale_sinaptica` tolerated); HARD su per-trait file `data/traits/<cat>/<slug>.json` (--strict-design promote-to-hard se future TKT vuole enforce).

## 6. Conclusione

- G1 ripple SAFE.
- TKT-CL-02 schema gate + bump shipped: pre-commit hook live + 9 test pytest tutti PASS + smoke canon 4 file exit 0.
- Procedo TKT-CL-04 contract test (6 test mirror pattern `tests/api/mutations.cost-charging-contract.test.js`).

---

**END RIPPLE AUDIT ADR-2026-05-29 -- 2026-05-29.**
