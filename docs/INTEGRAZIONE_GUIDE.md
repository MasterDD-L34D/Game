# INTEGRAZIONE GUIDE — EVO TACTICS (PUNTO D’INCONTRO & ROADMAP)

**Data:** 2025-11-10

Questo documento unifica le **guide appena caricate** con gli output di questa conversazione:
schema trait specie-agnostico, Sentience Track T1–T6, strumenti (validator/export/merge), CI,
e il piano di import dei “neuroni” (Ancestors). È pensato come **single-source-of-truth**.

---

## 1) Obiettivo

- Definire un punto di incontro tra la Guida Operativa v2 e i materiali prodotti qui.
- Stabilire regole di convergenza (UCUM/ENVO/Schema JSON/Versioning) e una roadmap attuabile.
- Fornire checklist e branch layout per l’integrazione nel repo **Game**.

---

## 2) Stato Target (SSoT) — struttura file

```
/docs/
  INTEGRAZIONE_GUIDE.md
  trait_reference_manual.md           ← manuale completo (omnibus)
  README_SENTIENCE.md                 ← guida rapida T1–T6
/packs/evo_tactics_pack/docs/catalog/
  trait_entry.schema.json             ← schema singolo trait (2020-12)
  trait_catalog.schema.json           ← schema catalogo + glossary
  trait_reference.json                ← catalogo “master” (traits)
  sentience_track.schema.json         ← schema Sentience Track
  sentience_track.json                ← traccia T1–T6 (gating)
/tools/py/
  trait_template_validator.py         ← validatore + --summary
  export_csv.py                       ← export CSV dei trait
  seed_merge.py                       ← merge seed → master
/.github/workflows/
  validate_traits.yml                 ← CI: jsonschema check
```

### Deviazioni note rispetto alla struttura target

- **Manuale dei tratti**: il contenuto è già presente in capitoli modulari sotto `docs/traits-manuale/`. Per compatibilità il nuovo file `docs/trait_reference_manual.md` funge da indice SSoT senza spostare i capitoli.
- **Sentience Track**: in `packs/evo_tactics_pack/docs/catalog/` mancano ancora `sentience_track.schema.json` e `sentience_track.json`; la guida rapida è disponibile in `docs/README_SENTIENCE.md`.
- **Tooling Python**: `tools/py/trait_template_validator.py` è presente, ma non esistono ancora gli script `export_csv.py` e `seed_merge.py` indicati nella struttura target.

---

## 3) Mappatura campi — “Crypto Template” → Schema canonico

| Crypto Template                         | Schema canonico                       | Note                                                                       |
| --------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------- |
| `trait_code`                            | `trait_code`                          | Normalizza: `TR-0001…` (mantieni alias in `notes`)                         |
| `species_*`                             | **(rimosso)**                         | Trait species-agnostico; il binding specie→trait resta nel catalogo master |
| `level`                                 | `tier (T1–T6)` + `famiglia_tipologia` | Tier = progressione; famiglia = cluster                                    |
| `morph_structure` / `primary_function`  | stessi                                | —                                                                          |
| `functional_description`                | stesso                                | —                                                                          |
| `metrics[]`                             | `metrics[]` (UCUM)                    | Converti unità in UCUM (`m/s`, `Cel`, `ms`, `1`)                           |
| `compatibility{…}`                      | `sinergie`, `conflitti`               | `compatibility` accettato come alias in input                              |
| `metabolic_cost`, `cost_profile`        | stessi                                | —                                                                          |
| `trigger`, `limits[]`                   | stessi                                | —                                                                          |
| `ecological_impact`, `output_effects[]` | stessi                                | —                                                                          |
| `testability{…}`                        | stesso                                | —                                                                          |
| `versioning{…}`                         | `version`(SemVer) + `versioning`      | Aggiungi `version` SemVer                                                  |

**Ambienti:** usare ENVO in `requisiti_ambientali[].condizioni.biome_class` **oppure** `applicability.envo_terms[]`.  
**Senzienza:** usare `sentience_applicability: ["STx"]` o i gate in `sentience_track.json`.

---

## 4) Regole di convergenza

1. Trait **species-agnostici** (niente specie nello schema trait).
2. **UCUM** per tutte le metriche.
3. **ENVO** per biomi/habitat/materiali.
4. **Tier** unificato `T1–T6`; social/language gated da Sentience Track (T≥4).
5. **Versioning**: `version` (SemVer) + `versioning` (autore/date ISO).
6. **Compat legacy**: `compatibility{…}` → trasformato in `sinergie`/`conflitti`.

---

## 5) Passi operativi (repo Game)

**A. Branching**

- `traits/core` — schemi + tool
- `traits/sentience` — Sentience Track + seed
- `data/ancestors` — dump neuroni + mapping
- `ci` — workflow

**B. Schemi**

- Aggiorna/copia `trait_entry.schema.json`, `trait_catalog.schema.json`, `sentience_track.schema.json`.
- Test locale: `python tools/py/trait_template_validator.py --summary`

**C. Catalogo master**

- Normalizza `trait_reference.json` : `trait_code` (TR-0001), UCUM, tier T1–T6, ENVO, testability/limits.

**D. Sentience Track**

- Verifica `gating_traits` presenti in catalogo; controlla conflitti e T\*.

**E. CI**

- Abilita `.github/workflows/validate_traits.yml` con jsonschema 2020-12.

---

## 6) Roadmap (2 sprint)

**Sprint 1 — Fondazioni**

- [ ] Schemi + tool + CI su branch.
- [ ] 20–30 trait core (sensory/motor/social) normalizzati UCUM/ENVO.
- [ ] Pubblica `sentience_track.json`.
- [ ] Documenti: manuale + integrazione.

**Sprint 2 — Contenuti**

- [ ] Import “neuroni” (dump community) con `unlock_trigger` + `effect_short`.
- [ ] Mapping neurone→trait (1:N) documentato.
- [ ] Copertura rami principali (Senses/Communication/Dexterity/Self-Control/Dodge).
- [ ] QA: deduplicate, range metriche, coerenza tier/sentience.

---

## 7) Gate di qualità (PR)

- JSON **validi** (schema entry/catalog/track).
- **UCUM** valido in _tutte_ le metriche.
- **ENVO** presente quando ci sono vincoli ambientali.
- `effect_short`/`effect_mechanics` compilati nei trait giocabili.
- **Sentience gating** coerente (T≥4 per sociale/linguaggio).
- `version` SemVer e `versioning` aggiornati.

---

## 8) Import “Ancestors” (neuroni ~297) — piano sintetico

**Output**: `data/ancestors/neurons_dump.json`  
Campi: `neuron_code`, `branch`, `label`, `unlock_trigger`, `effect_short`, `mapped_traits[]`, `notes`.

**Procedura**: raccolta 2–3 fonti → normalizza branch → mappa neurone→trait → QA → export CSV.

**Accettazione**: copertura ≥95%, 0 duplicati `neuron_code`, schema valido.

---

## 9) Decision log (da confermare)

- `trait_code` finale → `TR-0001` (ok?)
- Range `tier` → `T1–T6` (ok?)
- Alias `compatibility` ammesso per 1 release (ok?)
- Branch release → `traits/sentience@v2` (ok?)

---

## 10) Next actions

- [ ] Aprire branch `traits/core` e `traits/sentience`.
- [ ] Pushare schemi + CI.
- [ ] Normalizzare 10 trait sensoriali (UCUM/ENVO).
- [ ] Pubblicare Sentience Track.
- [ ] Avviare import neuroni (dump + mapping preliminare).
