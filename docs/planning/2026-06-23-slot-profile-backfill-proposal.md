---
title: 'slot_profile backfill -- 69 traits, derivation rule + proposed map (master-dd ratify)'
date: 2026-06-23
doc_status: draft
doc_owner: claude-code
workstream: dataset-pack
last_verified: '2026-06-23'
source_of_truth: false
review_cycle_days: 90
tags: [trait, schema, slot_profile, backfill, ratify]
---

# slot_profile backfill -- derivation rule + proposed map

**I draft, you ratify.** This proposes how to fill the missing `slot_profile`
design field on 69 non-ancestor traits. The `core` half has a deterministic,
evidence-backed rule (apply directly). The `complementare` half cannot be derived
from existing data -- it needs master-dd ratification of the proposed map below.
No catalog writes happen until the `complementare` map is approved.

## Context

- `config/schemas/trait.schema.json` `$defs/slot_profile` requires both `core` and
  `complementare` (trimmed strings, `additionalProperties: false`).
- `tools/lint/trait_schema_gate.py` checks the design block
  (`tier` / `famiglia_tipologia` / `slot_profile`) for every entry in files with a
  top-level `traits` dict (i.e. `data/traits/index.json`). On `index.json` the
  missing-field result is a SOFT WARN (rc=0) -- it does NOT block CI.
- Post PR #3019 the gate's `ancestor_` exemption is RETIRED (the namespace was
  migrated to native ids in #3001), so these WARNs are now unfiltered.
- Current state (origin/main `6fb411b3`): 297 traits, 0 `ancestor_`,
  **69 miss only `slot_profile`** (`tier` + `famiglia_tipologia` present on all).

## Rule 1 -- `core` (DETERMINISTIC, apply directly)

Evidence: for **all 228/228** traits that already have `slot_profile`,
`core` == the trait's category folder under `data/traits/<folder>/`. Zero exceptions.
So `core` for the 69 = their category folder:

| category folder               | # of the 69 | core value                    |
| ----------------------------- | ----------- | ----------------------------- |
| `cognitivo`                   | 3           | `cognitivo`                   |
| `difensivo`                   | 2           | `difensivo`                   |
| `fisiologico`                 | 14          | `fisiologico`                 |
| `frattura_abissale_sinaptica` | 26          | `frattura_abissale_sinaptica` |
| `nervoso`                     | 3           | `nervoso`                     |
| `offensivo`                   | 4           | `offensivo`                   |
| `sensoriale`                  | 7           | `sensoriale`                  |
| `strategia`                   | 10          | `strategia`                   |

## Rule 2 -- `complementare` (PROPOSED, needs ratify)

`complementare` is NOT mechanically derivable: all 31 `famiglia_tipologia` values of
the 69 traits have ZERO overlap with the 228 that already carry `slot_profile`, so
there is no precedent to copy. Among the existing 228, `complementare` tracks the
second token of `famiglia_tipologia` for ~76/82 families (6 are ambiguous), so the
proposed DEFAULT below = slug(second token of `famiglia_tipologia`). Rows flagged
(!) need a human call (the family's second token is weak/verbose or the first token
denotes duration, not function).

| famiglia_tipologia            | #   | proposed `complementare` | flag                                       |
| ----------------------------- | --- | ------------------------ | ------------------------------------------ |
| `Ambiente/Supporto`           | 1   | `supporto`               |                                            |
| `Analisi/Sensori Planctonici` | 1   | `sensori_planctonici`    | (!) verbose -- confirm/shorten             |
| `Comportamentale/Istinto`     | 10  | `istinto`                |                                            |
| `Controllo/Memoria`           | 1   | `memoria`                |                                            |
| `Difensivo/Protezione`        | 2   | `protezione`             |                                            |
| `Difesa/Antistatico`          | 1   | `antistatico`            |                                            |
| `Difesa/Elettrico`            | 2   | `elettrico`              |                                            |
| `Difesa/Foschia`              | 1   | `foschia`                |                                            |
| `Difesa/Magnetico`            | 1   | `magnetico`              |                                            |
| `Difesa/Pressione`            | 1   | `pressione`              |                                            |
| `Fisiologico/Morfologia`      | 14  | `morfologia`             |                                            |
| `Mentale/Cognizione`          | 3   | `cognizione`             |                                            |
| `Mobilità/Logistica`          | 1   | `logistica`              |                                            |
| `Neurologico/Sistema nervoso` | 3   | `sistema_nervoso`        | (!) verbose -- confirm/shorten             |
| `Offensivo/Assorbimento`      | 1   | `assorbimento`           |                                            |
| `Offensivo/Illuminazione`     | 1   | `illuminazione`          |                                            |
| `Risonanza/Crepuscolo`        | 1   | `crepuscolo`             |                                            |
| `Sensore/Gravitazionale`      | 1   | `gravitazionale`         |                                            |
| `Sensoriale/Percezione`       | 7   | `percezione`             |                                            |
| `Supporto/Anomalia`           | 1   | `anomalia`               |                                            |
| `Supporto/Copia`              | 1   | `copia`                  |                                            |
| `Supporto/Energetico`         | 1   | `energetico`             |                                            |
| `Supporto/Risonanza`          | 2   | `risonanza`              |                                            |
| `Supporto/Sensore`            | 1   | `sensore`                |                                            |
| `Supporto/Sequenziamento`     | 1   | `sequenziamento`         |                                            |
| `Temporaneo/Difesa`           | 1   | `difesa`                 | (!) 1st token = duration; confirm function |
| `Temporaneo/Memoria`          | 1   | `memoria`                | (!) 1st token = duration; confirm function |
| `Temporaneo/Risonanza`        | 1   | `risonanza`              | (!) 1st token = duration; confirm function |
| `Temporaneo/Scarica`          | 1   | `scarica`                | (!) 1st token = duration; confirm function |
| `Temporaneo/Traslazione`      | 1   | `traslazione`            | (!) 1st token = duration; confirm function |
| `Traumatico/Offesa`           | 4   | `offesa`                 |                                            |

## Application plan (after `complementare` ratified)

1. For each of the 69 index entries, add `slot_profile: {core: <folder>, complementare: <ratified>}`.
2. Mirror into the matching per-trait file `data/traits/<folder>/<id>.json` where present
   (keep index and per-trait in sync).
3. Verify: `python tools/lint/trait_schema_gate.py --check data/traits/index.json` -> 0 WARN;
   JSON-schema validate each touched entry against `$defs/slot_profile`.
4. One PR, dataset-pack workstream; no runtime/code change (pure design metadata).

## Appendix -- the 69 traits, grouped by family (proposed assignment)

### `Ambiente/Supporto` -> complementare `supporto`

- `coralli_sinaptici_fotofase` (core `frattura_abissale_sinaptica`)

### `Analisi/Sensori Planctonici` -> complementare `sensori_planctonici`

- `sensori_planctonici` (core `frattura_abissale_sinaptica`)

### `Comportamentale/Istinto` -> complementare `istinto`

- `canto_di_richiamo` (core `strategia`)
- `ferocia` (core `strategia`)
- `intimidatore` (core `strategia`)
- `legame_di_branco` (core `strategia`)
- `marchio_predatorio` (core `strategia`)
- `midollo_iperattivo` (core `strategia`)
- `spirito_combattivo` (core `strategia`)
- `spore_paniche` (core `strategia`)
- `sussurro_psichico` (core `strategia`)
- `voce_imperiosa` (core `strategia`)

### `Controllo/Memoria` -> complementare `memoria`

- `nebbia_mnesica` (core `frattura_abissale_sinaptica`)

### `Difensivo/Protezione` -> complementare `protezione`

- `corteccia_memetica` (core `difensivo`)
- `pelli_cave` (core `difensivo`)

### `Difesa/Antistatico` -> complementare `antistatico`

- `secrezioni_antistatiche` (core `frattura_abissale_sinaptica`)

### `Difesa/Elettrico` -> complementare `elettrico`

- `membrane_fotoconvoglianti` (core `frattura_abissale_sinaptica`)
- `squame_diffusori_ionici` (core `frattura_abissale_sinaptica`)

### `Difesa/Foschia` -> complementare `foschia`

- `placca_diffusione_foschia` (core `frattura_abissale_sinaptica`)

### `Difesa/Magnetico` -> complementare `magnetico`

- `corazze_ferro_magnetico` (core `frattura_abissale_sinaptica`)

### `Difesa/Pressione` -> complementare `pressione`

- `placche_pressioniche` (core `frattura_abissale_sinaptica`)

### `Fisiologico/Morfologia` -> complementare `morfologia`

- `aculei_velenosi` (core `fisiologico`)
- `aura_glaciale` (core `fisiologico`)
- `cuore_in_furia` (core `fisiologico`)
- `denti_seghettati` (core `fisiologico`)
- `filtri_bioattivi` (core `fisiologico`)
- `membrane_osmotiche` (core `fisiologico`)
- `pelle_elastomera` (core `fisiologico`)
- `pelli_anti_ustione` (core `fisiologico`)
- `pelli_fitte` (core `fisiologico`)
- `sensori_sismici` (core `fisiologico`)
- `tela_appiccicosa` (core `fisiologico`)
- `tentacoli_uncinati` (core `fisiologico`)
- `tessuti_adattivi` (core `fisiologico`)
- `zampe_radianti` (core `fisiologico`)

### `Mentale/Cognizione` -> complementare `cognizione`

- `artigli_psionici` (core `cognitivo`)
- `cervello_predittivo` (core `cognitivo`)
- `mente_lucida` (core `cognitivo`)

### `Mobilità/Logistica` -> complementare `logistica`

- `filamenti_guidalampo` (core `frattura_abissale_sinaptica`)

### `Neurologico/Sistema nervoso` -> complementare `sistema_nervoso`

- `matrice_antimagia` (core `nervoso`)
- `nuclei_di_controllo` (core `nervoso`)
- `risonanza_magnetica` (core `nervoso`)

### `Offensivo/Assorbimento` -> complementare `assorbimento`

- `spicole_canalizzatrici` (core `frattura_abissale_sinaptica`)

### `Offensivo/Illuminazione` -> complementare `illuminazione`

- `impulsi_bioluminescenti` (core `frattura_abissale_sinaptica`)

### `Risonanza/Crepuscolo` -> complementare `crepuscolo`

- `lobi_risonanti_crepuscolo` (core `frattura_abissale_sinaptica`)

### `Sensore/Gravitazionale` -> complementare `gravitazionale`

- `bioantenne_gravitiche` (core `frattura_abissale_sinaptica`)

### `Sensoriale/Percezione` -> complementare `percezione`

- `equilibrio_vestibolare` (core `sensoriale`)
- `nocicezione` (core `sensoriale`)
- `pigmenti_aurorali` (core `sensoriale`)
- `propriocezione` (core `sensoriale`)
- `senso_magnetico` (core `sensoriale`)
- `sintonia_magnetica` (core `sensoriale`)
- `termocezione` (core `sensoriale`)

### `Supporto/Anomalia` -> complementare `anomalia`

- `emettitori_voidsong` (core `frattura_abissale_sinaptica`)

### `Supporto/Copia` -> complementare `copia`

- `ghiandole_mnemoniche` (core `frattura_abissale_sinaptica`)

### `Supporto/Energetico` -> complementare `energetico`

- `emolinfa_conducente` (core `frattura_abissale_sinaptica`)

### `Supporto/Risonanza` -> complementare `risonanza`

- `camere_risonanza_abyssal` (core `frattura_abissale_sinaptica`)
- `filamenti_echo` (core `frattura_abissale_sinaptica`)

### `Supporto/Sensore` -> complementare `sensore`

- `nodi_sinaptici_superficiali` (core `frattura_abissale_sinaptica`)

### `Supporto/Sequenziamento` -> complementare `sequenziamento`

- `organi_metacronici` (core `frattura_abissale_sinaptica`)

### `Temporaneo/Difesa` -> complementare `difesa`

- `pelle_piezo_satura` (core `frattura_abissale_sinaptica`)

### `Temporaneo/Memoria` -> complementare `memoria`

- `riverbero_memetico` (core `frattura_abissale_sinaptica`)

### `Temporaneo/Risonanza` -> complementare `risonanza`

- `canto_risonante` (core `frattura_abissale_sinaptica`)

### `Temporaneo/Scarica` -> complementare `scarica`

- `scintilla_sinaptica` (core `frattura_abissale_sinaptica`)

### `Temporaneo/Traslazione` -> complementare `traslazione`

- `vortice_nera_flash` (core `frattura_abissale_sinaptica`)

### `Traumatico/Offesa` -> complementare `offesa`

- `arco_voltaico` (core `offensivo`)
- `martello_osseo` (core `offensivo`)
- `pungiglione_paralizzante` (core `offensivo`)
- `scarica_ionica` (core `offensivo`)
