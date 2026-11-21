---
title: INTEGRAZIONE GUIDE -- EVO TACTICS (PUNTO D'INCONTRO & ROADMAP)
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-06-21
source_of_truth: false
language: it-en
review_cycle_days: 30
---

# INTEGRAZIONE GUIDE -- EVO TACTICS (PUNTO D'INCONTRO & ROADMAP)

**Ultimo allineamento infra:** 2026-06-21

Questo documento unifica le guide trait con il modello dati corrente:
schema trait specie-agnostico, Sentience Track T1-T6, strumenti (validator/export/import),
e il piano di import dei "neuroni" (Ancestors). NON e' un source-of-truth canonical
(`source_of_truth: false`): la dependency-map canonica e' `docs/core/00C-WHERE_TO_USE_WHAT.md`.

---

## 1) Obiettivo

- Definire un punto di incontro tra la Guida Operativa v2 e i materiali prodotti qui.
- Stabilire regole di convergenza (UCUM/ENVO/Schema JSON/Versioning) e una roadmap attuabile.
- Fornire checklist e branch layout per l'integrazione nel repo **Game**.

---

## 2) Struttura file corrente (verificata 2026-06-21)

```
docs/guide/
  INTEGRAZIONE_GUIDE.md
  README_SENTIENCE.md                 -- guida rapida T1-T6
docs/traits/
  trait_reference_manual.md           -- indice del manuale (omnibus)
  manuale/                            -- capitoli modulari (01..06 + README)
packs/evo_tactics_pack/docs/catalog/
  trait_entry.schema.json             -- schema singolo trait (2020-12)
  trait_catalog.schema.json           -- schema catalogo + glossary
  trait_reference.json                -- catalogo "master" (traits)
  trait_glossary.json                 -- glossario pubblicato del pack
tools/py/
  trait_template_validator.py         -- validatore + --summary
  export_trait_taxonomy.py            -- export CSV (reports/trait_index_export.csv)
  report_trait_coverage.py            -- matrice coverage trait x specie
  import_external_traits.py           -- import seed esterni -> draft
```

### Deviazioni note rispetto alla struttura ideale

- **Manuale dei tratti**: i capitoli modulari vivono sotto `docs/traits/manuale/`
  (`01-introduzione.md` .. `06-standalone-trait-editor.md` + `README.md`).
  `docs/traits/trait_reference_manual.md` funge da indice senza spostare i capitoli.
- **Sentience Track**: in `packs/evo_tactics_pack/docs/catalog/` NON esistono ancora
  `sentience_track.schema.json` ne' `sentience_track.json` (backlog). Il seed grezzo
  e' `incoming/sentience_traits_v1.0.yaml`; la guida rapida e' `docs/guide/README_SENTIENCE.md`.
- **CI dedicata**: il workflow `.github/workflows/validate_traits.yml` NON esiste.
  La validazione gira via `tools/py/game_cli.py validate-datasets` (CLI unificata, vedi sez. 5/7)
  e `npm run schema:lint` (AJV su `schemas/evo/`).
- **Tooling Python**: `tools/py/trait_template_validator.py` e' presente.
  - Export CSV (gli ex `export_csv.py` / `seed_merge.py` NON esistono):
    - `python tools/py/export_trait_taxonomy.py` (genera `reports/trait_index_export.csv`).
    - `python tools/py/report_trait_coverage.py --env-traits <env_traits.json> --trait-reference <trait_reference.json> --species-root <dir_specie> --out-json <report.json> --out-csv <matrice.csv>` per la matrice coverage.
  - Merge seed -> catalogo: NON esiste uno script `seed_merge.py` dedicato (backlog).
    - To-do: [ ] **Owner** Data/Tools -- implementare un merge che prenda i draft generati da `python tools/py/import_external_traits.py --appendix-dir docs/appendici --incoming incoming/sentience_traits_v1.0.yaml --output-dir data/traits/_drafts` e li integri in `data/traits/index.json` con deduplicazione e log delle modifiche (definire regole di precedenza draft vs catalogo corrente).

---

## 3) Mappatura campi -- "Crypto Template" -> Schema canonico

| Crypto Template                         | Schema canonico                       | Note                                                                        |
| --------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------- |
| `trait_code`                            | `trait_code`                          | Normalizza: `TR-0001...` (mantieni alias in `notes`)                        |
| `species_*`                             | **(rimosso)**                         | Trait species-agnostico; il binding specie->trait resta nel catalogo master |
| `level`                                 | `tier (T1-T6)` + `famiglia_tipologia` | Tier = progressione; famiglia = cluster                                     |
| `morph_structure` / `primary_function`  | stessi                                | --                                                                          |
| `functional_description`                | stesso                                | --                                                                          |
| `metrics[]`                             | `metrics[]` (UCUM)                    | Converti unita' in UCUM (`m/s`, `Cel`, `ms`, `1`)                           |
| `compatibility{...}`                    | `sinergie`, `conflitti`               | `compatibility` accettato come alias in input                               |
| `metabolic_cost`, `cost_profile`        | stessi                                | --                                                                          |
| `trigger`, `limits[]`                   | stessi                                | --                                                                          |
| `ecological_impact`, `output_effects[]` | stessi                                | --                                                                          |
| `testability{...}`                      | stesso                                | --                                                                          |
| `versioning{...}`                       | `version`(SemVer) + `versioning`      | Aggiungi `version` SemVer                                                   |

**Ambienti:** usare ENVO in `requisiti_ambientali[].condizioni.biome_class` **oppure** `applicability.envo_terms[]` (schema `trait_entry.schema.json` espone gli `envo_terms`).
**Senzienza:** usare `sentience_applicability: ["STx"]`. NB: i gate `sentience_track.json` NON sono ancora pubblicati (vedi sez. 2, backlog).

---

## 4) Regole di convergenza

1. Trait **species-agnostici** (niente specie nello schema trait).
2. **UCUM** per tutte le metriche.
3. **ENVO** per biomi/habitat/materiali.
4. **Tier** unificato `T1-T6`; social/language gated da Sentience Track (T>=4).
5. **Versioning**: `version` (SemVer) + `versioning` (autore/date ISO).
6. **Compat legacy**: `compatibility{...}` -> trasformato in `sinergie`/`conflitti`.

---

## 5) Passi operativi (repo Game)

**A. Branching** (convenzione, allinearsi a `git checkout -b feat/...` su `main`)

- feature trait core -- schemi + tool
- feature sentience -- Sentience Track + seed
- feature ancestors -- dump neuroni + mapping (`data/core/ancestors/`)

**B. Schemi**

- Aggiorna `trait_entry.schema.json`, `trait_catalog.schema.json` (in `packs/evo_tactics_pack/docs/catalog/`).
- Sentience: lo schema `sentience_track.schema.json` e' da creare (backlog, vedi sez. 2).
- Test locale: `python tools/py/trait_template_validator.py --summary`

**C. Catalogo master**

- Normalizza `trait_reference.json`: `trait_code` (TR-0001), UCUM, tier T1-T6, ENVO, testability/limits.

**D. Sentience Track**

- Verifica `gating_traits` presenti in catalogo; controlla conflitti e T\*.

**E. Validazione / CI**

- Locale: `python tools/py/game_cli.py validate-datasets` (CLI unificata) + `npm run schema:lint`.
- Sync pack: `npm run sync:evo-pack` (rigenera il catalogo del pack -- NON editare a mano gli artefatti).
- Una CI dedicata ai trait (`validate_traits.yml`) NON esiste oggi; usare i comandi sopra fino a quando non viene aggiunta.

---

## 6) Roadmap (2 sprint)

**Sprint 1 -- Fondazioni**

- [ ] Schemi + tool + validazione (test locale con `python tools/py/trait_template_validator.py --summary` + `python tools/py/game_cli.py validate-datasets`; export CSV gia' coperti da `export_trait_taxonomy.py` / `report_trait_coverage.py`).
- [ ] 20-30 trait core (sensory/motor/social) normalizzati UCUM/ENVO.
- [ ] Pubblica `sentience_track.json` (oggi assente).
- [ ] Documenti: manuale + integrazione.

**Sprint 2 -- Contenuti**

- [ ] Import "neuroni" (dump community) con `unlock_trigger` + `effect_short` (draft via `python tools/py/import_external_traits.py ...`; merge seed -> catalogo ancora manuale).
- [ ] Mapping neurone->trait (1:N) documentato.
- [ ] Copertura rami principali (Senses/Communication/Dexterity/Self-Control/Dodge).
- [ ] QA: deduplicate, range metriche, coerenza tier/sentience.

---

## 7) Gate di qualita' (PR)

- JSON **validi** (schema entry/catalog/track).
- **UCUM** valido in _tutte_ le metriche.
- **ENVO** presente quando ci sono vincoli ambientali.
- `effect_short`/`effect_mechanics` compilati nei trait giocabili.
- **Sentience gating** coerente (T>=4 per sociale/linguaggio).
- `version` SemVer e `versioning` aggiornati.
- `python tools/py/game_cli.py validate-datasets` + `npm run schema:lint` verdi.

---

## 8) Import "Ancestors" (neuroni ~297) -- piano sintetico

**Output**: `data/core/ancestors/neurons_dump.json`
Campi: `neuron_code`, `branch`, `label`, `unlock_trigger`, `effect_short`, `mapped_traits[]`, `notes`.

**Procedura**: raccolta 2-3 fonti -> normalizza branch -> mappa neurone->trait -> QA -> export CSV.

**Accettazione**: copertura >=95%, 0 duplicati `neuron_code`, schema valido.

---

## 9) Decision log (da confermare)

- `trait_code` finale -> `TR-0001` (ok?)
- Range `tier` -> `T1-T6` (ok?)
- Alias `compatibility` ammesso per 1 release (ok?)
- Pubblicazione Sentience Track (schema + json) -- quando? (ok?)

---

## 10) Next actions

- [ ] Aprire branch feature (trait core / sentience) su `main`.
- [ ] Pushare schemi + validazione locale verde.
- [ ] Normalizzare 10 trait sensoriali (UCUM/ENVO).
- [ ] Pubblicare Sentience Track (schema + json).
- [ ] Avviare import neuroni (dump + mapping preliminare).
