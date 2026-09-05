---
title: 'T3 species lore proposal — 2 candidate species per T3 trait residue closure'
date: 2026-05-11
type: proposal
workstream: dataset-pack
owner: master-dd
status: accepted
related_files:
  - data/core/species.yaml
  - data/core/species_expansion.yaml
  - data/core/traits/active_effects.yaml
  - data/traits/sensoriale/antenne_plasmatiche_tempesta.json
  - data/traits/offensivo/circolazione_supercritica.json
related:
  - docs/research/2026-05-10-trait-orphan-audit-batch-review.md
  - docs/research/2026-05-10-trait-orphan-a-keep-assignment-proposal.md
---

# T3 species lore proposal — chiusura residuo 2 trait T3 orphan

## Status

**ACCEPTED 2026-05-11** — master-dd verdict batch 11-decisioni explicit Opt 1 (Verdict A): ship Candidate 1 + Candidate 2 entrambi (2 nuove species T3 in roster). Tier T3 confermato. `circolazione_supercritica` tier T1 → T3 audit correction confermata.

Implementation cascade in successor PR (`feat/t3-species-2-candidate-ship`). Vedi sezione "SHIPPED" alla fine.

**Original status**: PROPOSED 2026-05-11.

## Scope

Closure residuo post-trait orphan ASSIGN-A waves 0-7 (94/91 effective, vedi `docs/planning/2026-05-10-notte-trait-orphan-full-closure-handoff.md`):

- 2 trait T3 categorizzati **A-keep** (content backlog, assign next species wave) ma **non assegnati** in waves 0-7 perché richiedono species T3-capable slot lore-faithful, non disponibili nel roster current.
- T3 slot scarcity audit 2026-05-10: roster T3-tier species sparso (3 entries in `data/core/species.yaml` line 547+835+868) vs trait T3+ pool ricco → mismatch coverage.
- Riferimento museum card [M-2026-04-26-001 Voidling Bound](docs/museum/cards/voidling_bound_six_patterns.md) score 4/5 — pattern "rarity-gated class T2/T3 exclusive" applicabile.

## 2 trait T3 residual

### `antenne_plasmatiche_tempesta`

- **Tier**: T3 (audit row 144)
- **Family**: fisiologico / sensoriale
- **Effect kind**: `extra_damage`
- **Biome class**: `cicloni_psionici`
- **Energy cost**: alto (canalizzazione costante plasma atmosferico)
- **Semantic narrative**: "Occhi di tempesta permanenti che concentrano elettricità e onde psioniche" (`data/traits/sensoriale/antenne_plasmatiche_tempesta.json`).
- **Sinergie già definite**: `carapace_luminiscente_abissale`, `focus_frazionato`, `risonanza_di_branco`, `sinapsi_coraline_polifoniche`.
- **HUD/Forma**: `HUD:Fulcro_Tempesta`, `Forma:Tempestarii`.
- **Sentience hook**: T3 = consapevole intenzionale, controllo psionico esplicito.

### `circolazione_supercritica`

- **Tier**: T3 (audit row 150) — NB metadata in `data/traits/offensivo/circolazione_supercritica.json` marca T1, ma audit canonical doc 2026-05-10 e contesto lore (apply_status rage + circolazione iper-pressurizzata) sono coerenti con T3. **Discrepanza pendente master-dd: confermare canonical T3 o downgrade T1.**
- **Family**: comportamentale / offensivo / assalto
- **Effect kind**: `apply_status` (rage)
- **Biome class**: `abisso_vulcanico`
- **Energy cost**: basso (passivo)
- **Semantic narrative**: circolazione supercritica ottimizza operazioni offensive in abisso vulcanico — pressione cardiovascolare oltre soglia critica trigger rage controllato.
- **Sinergie già definite**: `coda_frusta_cinetica`, `sangue_piroforico`.
- **Sentience hook**: T3 = controllo conscio dello shift fisiologico rage.

## Candidate species lore stub

### Candidate 1 — `tempestarius_psionicus` (host `antenne_plasmatiche_tempesta`)

- **Genus**: Tempestarius (canonical Latin per styleguide `00E-NAMING_STYLEGUIDE.md`)
- **Epithet**: psionicus
- **Clade tag**: Apex (storm-channeler apex predator) — alternativa Bridge se master-dd preferisce nicchia keystone.
- **Sentience tier**: T3
- **Display name IT**: "Maestro della Tempesta"
- **Display name EN**: "Storm Master"
- **Biome affinity**: `cicloni_psionici` (primary) + `redspur-mesa` (secondary, tempesta orografica)
- **Lore beat 1-pager**:
  > Vive nelle aree dove i cicloni psionici si auto-sostengono per anni. Le antenne plasmatiche raccolgono la carica statica del fronte tempestoso e la canalizzano in scariche mirate. Quando il branco attraversa il fulcro della tempesta, comunica via risonanza sinaptica con sciami_larve_neurali (sinergia esistente roster).
- **trait_plan stub**:
  ```yaml
  core:
    - antenne_plasmatiche_tempesta # T3 anchor (this proposal)
    - sensori_geomagnetici # navigation tempesta
    - carapace_luminiscente_abissale # sinergia esistente
  optional:
    - focus_frazionato # sinergia esistente
    - risonanza_di_branco # sinergia esistente
    - sinapsi_coraline_polifoniche # sinergia esistente
  synergies:
    - tattiche_di_branco
  ```
- **Effort impl**: ~30min lore + 30min validator coverage + smoke.

### Candidate 2 — `magmocardium_furens` (host `circolazione_supercritica`)

- **Genus**: Magmocardium (cuore di magma, canonical Latin)
- **Epithet**: furens (furioso, accusativo lore-faithful per rage status)
- **Clade tag**: Threat (apex assault predator)
- **Sentience tier**: T3 (gated master-dd canonical conferma — vedi discrepanza sopra)
- **Display name IT**: "Cuore Furente"
- **Display name EN**: "Magma Heart"
- **Biome affinity**: `abisso_vulcanico` (primary) + `ferrous-badlands` (secondary, lava-cooled flats)
- **Lore beat 1-pager**:
  > Predatore d'abisso vulcanico, vive vicino alle bocche idrotermali profonde. La pressione cardiovascolare sopra-critica trigger uno stato di rage controllato — l'animale shift da pattern conserve-energy a burst-assault in <1 turno. Caccia in coppia (no pack), affonda lamelle_shear nelle prede a temperatura inferiore.
- **trait_plan stub**:
  ```yaml
  core:
    - circolazione_supercritica # T3 anchor (this proposal)
    - sangue_piroforico # sinergia esistente
    - coda_frusta_cinetica # sinergia esistente
  optional:
    - ferocia # behavioral pair rage
    - lamelle_shear # offensivo abisso
    - midollo_iperattivo # T2 rage chain
  synergies:
    - focus_frazionato # apex coordination
  ```
- **Effort impl**: ~30min lore + 30min validator coverage + smoke.

### Alternative — Candidate 3-merge `psionofusio_atroxˤ` (host both traits)

- **Concept**: singola species T3 apex che eredita storm-channeling + supercritical-circulation come dual-trait core. Lore stretch: cardiologia plasmica unisce tempesta esterna + pressione interna in un singolo pattern di caccia.
- **Pro**: chiude 2 trait residual con 1 species (efficienza roster) + spinta selettiva narrativa unica (rara consilience).
- **Con**: lore-stretch (biome cicloni_psionici vs abisso_vulcanico = ecosystem ortogonale) → richiede world-building bridge esplicito (es. "tempeste vulcaniche di crateri esposti a alta atmosfera").
- **Verdict default**: rejected unless master-dd flags single-species preference.

## Acceptance criteria

- Master-dd seleziona uno tra:
  - **Verdict A**: ship Candidate 1 + Candidate 2 entrambi (2 nuove species T3 in roster, residuo trait chiuso).
  - **Verdict B**: ship solo Candidate 1 (chiude `antenne_plasmatiche_tempesta`, lascia `circolazione_supercritica` per future wave o downgrade T1).
  - **Verdict C**: ship solo Candidate 2 (chiude `circolazione_supercritica`, lascia `antenne_plasmatiche_tempesta` per future wave).
  - **Verdict D**: ship Candidate 3-merge (single species dual-trait).
  - **Verdict E**: reject all (mantieni 2 trait residual, downgrade priorità o tier).
- **Trait tier discrepanza**: master-dd conferma `circolazione_supercritica` canonical tier T3 vs T1 (audit doc vs trait JSON metadata).
- **Schema location**: master-dd decide `species.yaml` (canonical curated) vs `species_expansion.yaml` (expansion roster) per le nuove entries — gated da ADR-2026-05-11 species_expansion migration verdict (PR #2230 MERGED).

## Scope di questo PR

**Pure proposta lore stub** — NO data changes a yaml/json. Master-dd verdict gate canonical.

Post-verdict, spawn implementation ticket scoped (~1-2h totale per Candidate 1 + 2 + validator coverage + smoke) in successor PR.

## References

- `docs/research/2026-05-10-trait-orphan-audit-batch-review.md` — audit canonical 91 trait orphan + categorization A/B/C
- `docs/research/2026-05-10-trait-orphan-a-keep-assignment-proposal.md` — A-keep wave assignment proposal
- `docs/planning/2026-05-10-notte-trait-orphan-full-closure-handoff.md` — Wave 7 ASSIGN-A closure context
- `data/core/00E-NAMING_STYLEGUIDE.md` — Latin genus/epithet styleguide
- `data/traits/sensoriale/antenne_plasmatiche_tempesta.json` — trait JSON spec
- `data/traits/offensivo/circolazione_supercritica.json` — trait JSON spec
- `data/core/species.yaml` lines 547, 835, 868 — current T3 roster (3 entries)
- ADR-2026-05-11 species_expansion canonical migration — schema location gating decision

---

**Master-dd verdict gate**: questa proposta è PROPOSED. Procedere a IMPLEMENTATION solo dopo verdict esplicito A / B / C / D / E + canonical tier conferma `circolazione_supercritica`.

---

## SHIPPED 2026-05-11 — Verdict A (Candidate 1 + 2 both ship)

Master-dd verdict batch 11-decisioni explicit:

- **A1 verdict**: ship Candidate 1 (`sp_tempestarius_psionicus`) + Candidate 2 (`sp_magmocardium_furens`) entrambi.
- **Tier confermato**: T3 entrambi.
- **circolazione_supercritica tier T1 → T3**: audit canonical correction confermata (JSON metadata fix shipped same PR).

**Implementation PR**: `feat/t3-species-2-candidate-ship` — branch ship to main 2026-05-11.

**Files modificati**:

- `data/core/species_expansion.yaml` — append `sp_tempestarius_psionicus` + `sp_magmocardium_furens` entries con schema canonical `trait_plan` + parallel `morph_slots` per backwards compat (ADR-2026-05-11 Path B variant).
- `data/traits/offensivo/circolazione_supercritica.json` — tier T1 → T3 (2 occorrenze: line 19 meta.tier + line 39 root tier).

**Trait residue chiusi**:

- `antenne_plasmatiche_tempesta` (T3 sensoriale) → assigned to `sp_tempestarius_psionicus` (core slot).
- `circolazione_supercritica` (T3 offensivo) → assigned to `sp_magmocardium_furens` (core slot).

**Trait orphan A-keep ASSIGN-A coverage post-ship**: 94/91 → **96/91** effective (2 trait T3 residual closed).

**Pillar delta**: P3 Identità Specie × Job 🟢ⁿ confermato + roster T3 (3 entries pre) → 5 entries post-ship (incremento +66% T3 roster size).
