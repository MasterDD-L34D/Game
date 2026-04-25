---
title: Ancestors Neurons Dump 01B Sanitized — 34 trigger combat (5 rami)
museum_id: M-2026-04-25-004
type: dataset
domain: ancestors
provenance:
  found_at: reports/incoming/ancestors/ancestors_neurons_dump_01B_sanitized.csv
  git_sha_first: e05de5ad
  git_sha_last: e05de5ad
  last_modified: 2025-12-03
  last_author: MasterDD-L34D
  buried_reason: unintegrated
relevance_score: 4
reuse_path: data/core/traits/active_effects.yaml (22 Self-Control trigger as effect_trigger)
related_pillars: [P1, P2, P3]
status: curated
excavated_by: repo-archaeologist
excavated_on: 2026-04-25
last_verified: 2026-04-25
---

# Ancestors Neurons Dump 01B Sanitized — 34 trigger combat

## Summary (30s)

- **34 entry CSV** sanitized, 5 rami coperti (Ambulation / Attack / Dexterity / Dodge / Self-Control), ~11% di 297 neuroni promessi RFC v0.1
- **22 trigger Self-Control** = oro per reaction system (counter / dodge / intercept) — plug-in diretto in `active_effects.yaml`
- **Bridge Ancestors → trait runtime mai creato**: RFC menziona `data/neurons_bridge.csv` mai esistito — questa CSV è l'unica fonte machine-readable sopravvissuta

## What was buried

CSV 34 righe, columns: `ramo`, `codice`, `nome_italiano`, `descrizione`, `trigger_combat`, `effetto_proposto`, `note`.

Distribuzione rami:

| Ramo            | Count | Tipo trigger combat                      |
| --------------- | ----- | ---------------------------------------- |
| Self-Control    | 22    | Reaction (counter, dodge, intercept)     |
| Ambulation (AB) | 5     | Movement modifier (sprint, climb, carry) |
| Dexterity (DX)  | 3     | Aim/equilibrium                          |
| Counterattack   | 4     | Reaction trigger                         |
| Dodge (DO)      | 4     | Reaction trigger                         |

Codici esempio Self-Control:

```csv
CO 01,Pause Reflex,Sospende intent prima di engage,on_engage_choice,timing_window_+1
CO 04,Threat Reframe,Rivaluta target dopo hit,on_take_damage,intent_reroll
CO 22,Discipline Hold,Mantiene formation sotto pressure,on_pressure_tier_up,formation_lock
```

## Why it was buried

- RFC Sentience v0.1 (2025-11-12) prometteva 297 neuroni Ancestors estratti
- Solo 34 sono stati sanitized ed esportati — il resto (263) sono in binary `.zip` referenziati da validation reports MA assenti dal repo
- Branch `ancestors/rfc-sentience-v0.1` mai aperto come PR (`git log -S "ancestors"` --diff-filter=A su feature branches → 0 hit)
- Triage commit `e05de5ad` 2025-12-03 ha aggiunto questa CSV come "01B triage artifacts" → snapshot parziale, mai completato
- Bus factor 1 (solo MasterDD-L34D) + autore non più working su Ancestors

## Why it might still matter

- **Pillar P1 Tattica 🟢**: 22 reaction trigger Self-Control sono extension naturale del sistema reaction già live (intercept + overwatch_shot in `abilityExecutor.js`). +22 trigger = depth tactical
- **Pillar P2 Evoluzione 🟢c**: trait neuroni heritable = base genetica per Spore-core deferred
- **Pillar P3 Specie×Job 🟢c+**: rami Ancestors mappabili a job archetypes (Self-Control → Reformer/Tank, Dexterity → Skirmisher)
- **Sprint B Skiv synergy + defy ~11h**: `defy` counter pattern (PR Skiv #?) può attingere a 4 Counterattack triggers (CA 01-04) per coverage

## Concrete reuse paths

1. **Minimal — 22 Self-Control as effect_trigger (P0, ~5h)**
   - Estendi `data/core/traits/active_effects.yaml` con 22 nuove voci
   - Mapping: `CO ##` → trait id `self_control_<ramo>`
   - `effect_trigger` field già esiste (es. `on_take_damage`, `on_engage_choice`, `on_pressure_tier_up`)
   - Test: `python3 tools/py/game_cli.py validate-datasets`
   - Output: +22 trait reaction-aware in glossary

2. **Moderate — full 34 trigger come trait set (P1, ~10h)**
   - Tutti 5 rami → 34 trait
   - Group by `ramo`: `ancestor_self_control_set`, `ancestor_dexterity_set`, ecc.
   - Schema migration (mancante: `requires_traits`, `pe_cost`)
   - Pass a `sot-planner` per ADR-2026-04-25 "Ancestors trigger set v0.1"

3. **Full — recovery binary 263 neuroni mancanti (P2, ~20h)**
   - User decision: dig su Drive/PR esterni per `.zip` originali (`/tmp/incoming_validation.JMtgZN/...`)
   - Estrarre 9 rami completi (Senses 37 + Ambulation 26 + Brain + Comm + Tools + Settlement + Intelligence)
   - **Decision pending**: revivere full extraction (~15-20h) o lasciare T0-T6 canonical senza basi neuronali (status quo)
   - Pass a `sot-planner` per ADR architectural

## Sources / provenance trail

- Found at: [reports/incoming/ancestors/ancestors_neurons_dump_01B_sanitized.csv:1](../../../reports/incoming/ancestors/ancestors_neurons_dump_01B_sanitized.csv)
- Git history: `e05de5ad` (2025-12-03, MasterDD-L34D, "Add 01B triage artifacts") — single commit
- Bus factor: 1
- Related RFC source: [docs/planning/research/sentience-rfc/RFC_Sentience_Traits_v0.1.md](../../planning/research/sentience-rfc/RFC_Sentience_Traits_v0.1.md) (Card M-2026-04-25-005 candidate)
- Related canonical: [data/core/traits/active_effects.yaml](../../../data/core/traits/active_effects.yaml) (extension target)
- Related validation reports: 30+ `docs/reports/incoming/validation/evo_tactics_ancestors_*` + `ancestors_neurons_*` + `ancestors_integration_pack_*` (Oct/Nov 2025)
- Related canonical (false positive): [docs/guide/README_SENTIENCE.md](../../guide/README_SENTIENCE.md) (T0-T6 ≠ neurons)
- Inventory: [docs/museum/excavations/2026-04-25-ancestors-inventory.md](../excavations/2026-04-25-ancestors-inventory.md)

## Risks / open questions

- ❓ **User decision GRANDE**: revivere full Ancestors (~15-20h estimated) o status quo? Senza decisione, gap 263/297 neuroni resta
- ⚠️ Schema CSV ha column `effetto_proposto` come testo libero, NON normalized. Conversion a `active_effects.yaml` richiede mapping manuale ramo-by-ramo
- ⚠️ Codici Self-Control (CO 01-22) potrebbero collidere con codici esistenti `data/core/affordances.yaml`. Verifica pre-import obbligatoria
- ⚠️ Binary `.zip` referenziati da validation reports → recovery via Drive/PR esterni richiede knowledge transfer userland
- ✅ CSV utf-8 clean spot-check

## Next actions

- **Sprint A/B Skiv kickoff**: 5 trigger Counterattack (CA 01-04) candidate per defy counter pattern
- **OPEN_DECISIONS**: OD-011 ✅ RISOLTA 2026-04-25 — verdict A (22 Self-Control wire ora) + remind autonomous TKT-ANCESTORS-RECOVERY (caccia online 263 neuroni mancanti)
- **Cross-link M-2026-04-25-001**: sentience tiers + neuron triggers = layer combinato P2/P3
