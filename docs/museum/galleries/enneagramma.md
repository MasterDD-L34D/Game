---
title: Enneagramma — gallery aggregata 3 card
doc_status: draft
doc_owner: agents/repo-archaeologist
workstream: cross-cutting
last_verified: 2026-04-25
source_of_truth: false
language: it
review_cycle_days: 30
tags: [archaeology, museum, enneagramma, gallery]
coverage_runtime: '9/9 archetipi (post feat/p4-ennea-9-of-9-coverage)'
---

# Gallery — Enneagramma (3 card aggregata)

## Narrative collegante

Il dominio Enneagramma in Evo-Tactics ha una storia paradossale: **dataset full shipped, runtime parziale, e codice canonical orfano**. Tre artifact buried (M-002 + M-003 + M-006) sono i pezzi di un puzzle che, riassemblati, sbloccano P4 (MBTI/Ennea) da 🟡 → 🟢 candidato in ~5h totali.

### Timeline (git verified)

```
2025-10-29  6027b180  Add files via upload (MasterDD-L34D)
                        ├── incoming/Ennagramma/{master,dataset,stackings,triadi,varianti,wings}.csv|json
                        └── incoming/enneagramma_mechanics_registry.template.json

2026-04-16  61b20873  feat: P4 Temperamenti MBTI/Ennea (PR #1433)
                        ├── apps/backend/services/enneaEffects.js (93 LOC, mai imported)
                        ├── apps/backend/services/vcScoring.js +computeEnneaArchetypes (6/9)
                        └── data/core/telemetry.yaml ennea_themes (6 archetipi)

2026-04-16  dbf46e44  Bulk Prettier (no semantic change)
                        └── all incoming/ Ennagramma files touched (NO functional update)

2026-04-25  [TODAY]   Excavated → curated → reviewed (this gallery)

2026-04-25  feat/p4-ennea-9-of-9-coverage   Coverage 6/9 → 9/9 archetipi
                        ├── apps/backend/services/enneaEffects.js +Riformatore(1)/Individualista(4)/Lealista(6)
                        ├── data/core/telemetry.yaml +3 ennea_themes (raw-metric trigger)
                        └── tests/services/enneaEffectsWire.test.js +9 test (24/24 verde)
```

### Il puzzle

| Pezzo        | Cosa fa                                                                  | Stato                   | Card                                                 |
| ------------ | ------------------------------------------------------------------------ | ----------------------- | ---------------------------------------------------- |
| **Dataset**  | 9 tipi schema 1.0.0 (id, fear, desire, passion, wings, stress/growth_to) | unintegrated            | [M-003](../cards/enneagramma-dataset-9-types.md)     |
| **Registry** | 16 hook eligibility/trigger/effects schema completo                      | unintegrated            | [M-002](../cards/enneagramma-mechanics-registry.md)  |
| **Effects**  | 142 LOC mappa archetipi → buff combat (**9/9 archetipi** wired runtime)  | wired (post 2026-04-25) | [M-006](../cards/enneagramma-enneaeffects-orphan.md) |

**Sintesi**: hai i dati (M-003), hai gli hook (M-002), hai il consumer (M-006). Mancano 5 righe di `require()` + 50 righe di mapping per chiudere il cerchio.

## Drift docs vs runtime

- **`docs/core/00-SOURCE-OF-TRUTH.md §13.4`** dichiara: "**Operativo P4 completo**"
- **Reality**: `enneaEffects.js` orphan + `vcScoring.js` 6/9 + dataset full unloaded
- Gap = ~50% del runtime claimato

Card M-006 propone correzione SOURCE-OF-TRUTH post-Minimal-wire. Prima del wire: §13.4 dovrebbe leggere "P4 wire pending".

## Skiv link forte (Sprint C ~6h)

Skiv = `Arenavenator vagans` (errante). Due match candidate da dataset:

### Type 5 — L'Osservatore / Investigatore (Centro Mentale)

```yaml
basic_fear: Essere impotenti, incapaci, incompetenti
basic_desire: Competenza e comprensione
passion: Avarizia (ritenzione info)
wing_5w4: The Iconoclast (più solitario, originale)
```

**Voice palette derivata**: stoica, taxonomica, "cataloga la duna, accumula intel pre-engage".

### Type 7 — L'Ottimista / Entusiasta (Centro Mentale)

```yaml
basic_fear: Essere privati, intrappolati nel dolore
basic_desire: Essere soddisfatti e appagati
passion: Gola/gluttonia
wing_7w8: The Realist (più tosto, autoritario)
```

**Voice palette derivata**: caotica, name-drop biome, lista loot.

### Sprint C deliverable

Due voice file YAML + selector via `vcSnapshot.ennea_archetypes[0]`. A/B test in playtest live.

⚠️ **NOT INVENTED**: tritype Skiv (5-3-9? 5-1-2?) NON determinabile da dataset solo. Decision pending user.

## Reuse path consolidato (cross-card)

### Path Single-step Quick (~7-9h totali, RIVISTO post-audit 2026-04-25)

**⚠️ Audit pre-wire scoperta architecture mismatch**: `vcSnapshot` oggi è end-of-session only (NON per-round). `unit.ennea_archetypes` NON popolato sui units. Refactor `buildVcSnapshot` per round-aware mode = pre-req del wire.

1. **vcSnapshot round-aware refactor** (~2-3h, pre-req): `buildVcSnapshot(session, config, { perRound: true })` modalità + caching
2. **M-006 Minimal wire** (~2h): import `enneaEffects.js` in `routes/sessionRoundBridge.js`, hook post-resolveRound + post-vcSnapshot. P4 status verificato 🟡+
3. **M-002 Minimal load** (~3h): registry JSON load + extend `ENNEA_EFFECTS` da hook eligibility map. 6 archetipi → 16 hook coverage

→ P4 🟢 candidato dopo ~7-9h. Skiv Sprint C voice palette dependency unblocked.

**NOT 5h come stima originale** — combat hot path richiede care + regression baseline 307/307 verde mandatory.

### Path Full Integration (~12h totali)

1. M-006 + M-002 wire (5h)
2. **M-003 Moderate** (~5h): convert YAML, vcScoring.js extension 6/9 → 9/9 archetipi
3. **Skiv Sprint C voices** (~6h): 9 voice file YAML + selector + A/B Type 5 vs 7

→ P4 🟢 + Skiv Sprint C closed. Total: ~16h userland-friendly chunks.

## Anti-pattern (NON fare)

- ❌ **NON modificare SOURCE-OF-TRUTH §13.4 prima del wire**: claim "P4 completo" deve essere VERIFIED via integration test, non updated speculativamente
- ❌ **NON copiare pack module** (`packs/evo_tactics_pack/tools/py/modules/personality/enneagram/`) come canonical: pack ha già processato indipendentemente, dual source = drift garantito. Decision OD-009 ✅ RISOLTA via Option 3 hybrid (pack encyclopedia + data/core/ runtime + sync script)
- ❌ **NON inventare tritype Skiv**: dataset non lo determina. User decision o telemetry-driven (post-playtest)
- ❌ **NON fare wire isolato di M-006 senza M-002**: senza registry, coverage resta 6/9. Wire combinato = singolo PR cleaner

## Open decisions (cross-card)

- **OD-009** ✅ RISOLTA: Ennea source canonical = Option 3 hybrid (pack encyclopedia + `data/core/personality/` runtime + sync script)
- **OD-010** ✅ RISOLTA: Skiv voice palette default = skip-via-A/B (implementare Type 5 + Type 7 + telemetry-driven default)
- **OD-future**: tritype Skiv determinabile via telemetry o user choice?

## Sources

- Cards: [M-002](../cards/enneagramma-mechanics-registry.md) + [M-003](../cards/enneagramma-dataset-9-types.md) + [M-006](../cards/enneagramma-enneaeffects-orphan.md)
- Inventory: [excavations/2026-04-25-enneagramma-inventory.md](../excavations/2026-04-25-enneagramma-inventory.md)
- Pillar status: [CLAUDE.md "Pilastri di design"](../../../CLAUDE.md) — P4 🟡
- Drift source: [docs/core/00-SOURCE-OF-TRUTH.md §13.4](../../core/00-SOURCE-OF-TRUTH.md)
- Skiv: [data/core/species/dune_stalker_lifecycle.yaml](../../../data/core/species/dune_stalker_lifecycle.yaml)
- Industry pattern: [Enneagram Institute](https://www.enneagraminstitute.com/) (referenced in pack module README)

## Next actions priority

1. **P0**: M-006 Minimal wire (2h, Skiv Sprint C dependency)
2. **P0**: M-002 Minimal load (3h, coverage 6→16 hooks)
3. **P1**: M-003 Moderate (5h, 9/9 archetipi)
4. **P1**: Skiv Sprint C voice palette A/B (6h, P4 🟢 closed)

Total: ~16h userland-friendly. Suggested handoff: `narrative-design-illuminator` per Skiv voices, `sot-planner` per ADR Ennea integration.
