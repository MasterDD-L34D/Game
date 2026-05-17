---
name: trait-lint
description: Cross-validate trait definitions across glossary, active_effects, trait_mechanics, and Game-Database
user_invocable: true
---

# Trait Lint

Cross-check trait consistency across all sources of truth.

## Steps

### 1. Load trait sources

Read these files (use targeted reads):

- `data/core/traits/active_effects.yaml` — canonical trait registry (A2)
- `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml` — combat balance values
- `data/core/traits/glossary.json` — labels IT/EN + descriptions
- `packs/evo_tactics_pack/docs/catalog/trait_glossary.json` — export for Game-Database
- `packs/evo_tactics_pack/docs/catalog/trait_reference.json` — rich trait data

Extract slug lists from each.

### 2. Cross-reference

Build sets:

- `A` = slugs in active_effects.yaml
- `M` = slugs in trait_mechanics.yaml
- `G` = slugs in glossary.json
- `C` = slugs in trait_glossary.json (catalog export)
- `R` = slugs in trait_reference.json

Check:

- `A \ G` = active traits missing from glossary (labels needed)
- `M \ A` = mechanics defined but trait not in active_effects (orphan mechanics)
- `A \ M` = active traits without combat mechanics (may be intentional for non-combat traits)
- `G \ C` = glossary entries not in catalog export (sync:evo-pack needed?)
- `R \ G` = reference entries not in glossary

### 3. Hardcoded trait check

```bash
grep -rn "artigli_sette_vie\|coda_frusta_cinetica\|scheletro_idro_regolante\|criostasi_adattiva" services/rules/ apps/backend/routes/session*.js apps/backend/services/ --include="*.js" --include="*.py" | grep -v "fallback\|test\|comment\|#"
```

Only the hardcoded fallback set in generation orchestrator is acceptable. Any other occurrence = violation.

### 4. Type consistency

For traits in both active_effects and mechanics:

- Does the dataType match? (NUMERIC in glossary but TEXT in mechanics?)
- Range min/max consistent?

### 5. Produce report

```
## Trait Lint Report

| Check | Count | Status |
|-------|-------|--------|
| Active traits | N | — |
| With mechanics | N | 🟢/🟡 |
| With glossary labels | N | 🟢/🟡 |
| In catalog export | N | 🟢/🟡 |
| Orphan mechanics | N | 🟢/🔴 |
| Missing glossary | N | 🟢/🔴 |
| Hardcoded in code | N | 🟢/🔴 |
| Type mismatches | N | 🟢/🔴 |

### Orphan mechanics (in mechanics but not active_effects)
<list slugs>

### Missing glossary labels
<list slugs>

### Hardcoded violations
<list with file:line>
```

### 6. Suggest fixes

- Missing glossary → "Add to glossary.json then run sync:evo-pack"
- Orphan mechanics → "Remove from trait_mechanics.yaml or add to active_effects.yaml"
- Catalog drift → "Run npm run sync:evo-pack"
