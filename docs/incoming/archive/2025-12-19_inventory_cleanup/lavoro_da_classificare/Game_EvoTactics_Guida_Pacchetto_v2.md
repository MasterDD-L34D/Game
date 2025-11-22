# Guida Operativa & Manuale — Evo Tactics Pack v2
**Data:** 2025-11-05  
**Autore:** Master DD / GPT‑5 Pro (per Progetto Gioco Evo Tactics)

> Questo documento integra **tutto il lavoro** svolto nella conversazione: schema dati dei *trait*,
> traccia di **Senzienza T1–T6**, template di authoring, strumenti (validator, export, merge),
> pipeline CI, convenzioni (UCUM/ENVO/SemVer), più il piano operativo per l’import dei 297 “neuroni”
> ispirati ad *Ancestors: The Humankind Odyssey*. Il **pacchetto non è incluso**: qui trovi **tutto il contenuto**
> necessario (codice e specifiche) per ricostruirlo nel repo.

---

## Indice
1. [Panoramica & Obiettivi](#panoramica--obiettivi)  
2. [Cosa contiene il Pacchetto v2](#cosa-contiene-il-pacchetto-v2)  
3. [Standard e Convenzioni (UCUM, ENVO, SemVer, JSON Schema)](#standard-e-convenzioni)  
4. [Specifiche: Schema Trait (species-agnostico)](#specifiche-schema-trait)  
5. [Specifiche: Catalogo Trait & Glossario](#specifiche-catalogo-trait--glossario)  
6. [Specifiche: Sentience Track T1–T6](#specifiche-sentience-track-t1t6)  
7. [Template di Authoring (blank + esempi)](#template-di-authoring)  
8. [Guida specie/creatura: cosa serve per completare i tratti](#guida-speciecreatura-cosa-serve-per-completare-i-tratti)  
9. [Strumenti: Validator, Export CSV, Seed Merge](#strumenti-validator-export-csv-seed-merge)  
10. [CI: GitHub Actions (validazione)](#ci-github-actions-validazione)  
11. [Migrazione v1.x → v2 (breaking/non-breaking)](#migrazione-v1x--v2)  
12. [Piano operativo: dump 297 neuroni (Ancestors)](#piano-operativo-dump-297-neuroni-ancestors)  
13. [Branch layout & Checklist PR](#branch-layout--checklist-pr)  
14. [Appendice A — JSON Schema completi](#appendice-a--json-schema-completi)  
15. [Appendice B — Trait di esempio](#appendice-b--trait-di-esempio)  
16. [Appendice C — Issue template](#appendice-c--issue-template)  
17. [Riferimenti](#riferimenti)

---

## Panoramica & Obiettivi
- **Obiettivo**: standardizzare definizione, validazione e integrazione dei *trait* (morfologia, sensi,
  abilità, comportamento, cognizione) e della **Senzienza** in gioco, con strumenti ripetibili.  
- **Approccio**: tratti **species-agnostici** (riusabili da più specie) + *hook* di Senzienza T1–T6
  per capacità sociali/cognitive.  
- **Output**: catalogo JSON validato (schema 2020‑12), metriche UCUM, ambienti ENVO, CI GitHub,
  tool CLI (validatore, export, merge), guide e check.

---

## Cosa contiene il Pacchetto v2
**Tutto è riportato in questo documento** per poter ricreare i file nel repo.

- **Schema trait**: `trait_entry.schema.json` (species‑agnostico).  
- **Schema catalogo**: `trait_catalog.schema.json` (intestazione + mappa di trait).  
- **Sentience Track**: `sentience_track.schema.json` + `sentience_track.json` (T1→T6, gating).  
- **Template authoring**: `trait_template.json` (blank) + esempi compilati.  
- **Strumenti**: `trait_template_validator.py`, `export_csv.py`, `seed_merge.py`.  
- **CI**: `.github/workflows/validate_traits.yml`.  
- **Documentazione**: README/Manuale, Branch layout, Checklist operativa.

> Nota: dove il repo ha già file equivalenti, **mantieni le path** proposte e sostituisci i contenuti
con quelli qui riportati.

---

## Standard e Convenzioni
- **JSON Schema Draft 2020‑12** — convalida strutturale dei JSON.  
- **UCUM** — unità per `metrics[].unit` (es. `m`, `s`, `m/s`, `Cel`, `%`, `1`).  
- **ENVO** — ID/URI per biomi, habitat, materiali (in `requisiti_ambientali`).  
- **SemVer 2.0.0** — versioni dei trait e dei pack (MAJOR.MINOR.PATCH).  
- **Nomenclatura** — `trait_code`: preferito `TR-0001`… (quattro cifre); compatibile anche `AAA-TRxx` per legacy.

---

## Specifiche: Schema Trait
> File: `packs/evo_tactics_pack/docs/catalog/trait_entry.schema.json`

```json
{{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/trait_entry.schema.json",
  "title": "Evo Tactics — Trait Entry (species-agnostic)",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "trait_code","label","famiglia_tipologia","fattore_mantenimento_energetico",
    "tier","mutazione_indotta","uso_funzione","spinta_selettiva",
    "sinergie","conflitti","version","versioning"
  ],
  "properties": {
    "trait_code": { "type": "string", "pattern": "^TR-\d{{4}}$" },
    "label": { "type": "string", "minLength": 3 },
    "famiglia_tipologia": { "type": "string" },
    "fattore_mantenimento_energetico": { "type": "string" },
    "tier": { "type": "string", "enum": ["T1","T2","T3","T4","T5","T6"] },
    "slot": { "type": "array", "items": { "type": "string", "pattern": "^[A-Z]$" } },
    "slot_profile": {
      "type": "object", "additionalProperties": false,
      "properties": { "core": { "type": "string" }, "complementare": { "type": "string" } }
    },
    "sinergie": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "conflitti": { "type": "array", "items": { "type": "string", "minLength": 1 } },
    "requisiti_ambientali": {
      "type": "array",
      "items": {
        "type": "object", "additionalProperties": false,
        "properties": {
          "capacita_richieste": { "type": "array", "items": { "type": "string" } },
          "condizioni": { "type": "object", "additionalProperties": false, "properties": { "biome_class": { "type": "string" } } },
          "fonte": { "type": "string" },
          "meta": {
            "type": "object", "additionalProperties": false,
            "properties": { "expansion": { "type": "string" }, "tier": { "type": "string", "enum": ["T1","T2","T3","T4","T5","T6"] }, "notes": { "type": "string" } }
          }
        }
      }
    },
    "mutazione_indotta": { "type": "string" },
    "uso_funzione": { "type": "string" },
    "spinta_selettiva": { "type": "string" },
    "debolezza": { "type": "string" },

    "morph_structure": { "type": "string" },
    "primary_function": { "type": "string" },
    "cryptozoo_name": { "type": "string" },
    "functional_description": { "type": "string" },

    "metrics": {
      "type": "array",
      "items": {
        "type": "object", "additionalProperties": false,
        "required": ["name","value","unit"],
        "properties": {
          "name": { "type": "string" },
          "value": { "type": ["number","string"] },
          "unit": { "type": "string", "description": "UCUM string (es. m/s, Cel, 1)" },
          "conditions": { "type": "string" }
        }
      }
    },

    "metabolic_cost": { "type": "string", "enum": ["Basso","Medio","Alto"] },
    "cost_profile": {
      "type": "object", "additionalProperties": false,
      "properties": { "rest": { "type": "string" }, "burst": { "type": "string" }, "sustained": { "type": "string" } }
    },

    "trigger": { "type": "string" },
    "limits": { "type": "array", "items": { "type": "string" } },

    "ecological_impact": { "type": "string" },
    "output_effects": { "type": "array", "items": { "type": "string" } },

    "testability": { "type": "object", "additionalProperties": false, "properties": { "observable": { "type": "string" }, "scene_prompt": { "type": "string" } } },

    "applicability": {
      "type": "object", "additionalProperties": false,
      "properties": {
        "clades": { "type": "array", "items": { "type": "string" } },
        "envo_terms": { "type": "array", "items": { "type": "string", "pattern": "^http://purl\.obolibrary\.org/obo/ENVO_\d+$" } },
        "notes": { "type": "string" }
      }
    },

    "version": {
      "type": "string",
      "description": "Semantic Versioning 2.0.0",
      "pattern": "^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$"
    },
    "versioning": {
      "type": "object",
      "additionalProperties": false,
      "required": ["created","updated","author"],
      "properties": {
        "created": { "type": "string", "format": "date" },
        "updated": { "type": "string", "format": "date" },
        "author":  { "type": "string" }
      }
    },

    "notes": { "type": "string" },

    "sinergie_pi": {
      "type": "object", "additionalProperties": false,
      "properties": {
        "co_occorrenze": { "type": "array", "items": { "type": "string" } },
        "forme": { "type": "array", "items": { "type": "string" } },
        "tabelle_random": { "type": "array", "items": { "type": "string" } },
        "combo_totale": { "type": "integer", "minimum": 0 }
      }
    }
  }
}}
```

### Nomenclatura e compatibilità
- **trait_code**: preferito `TR-0001…` (compatibile con `AAA-TRxx` legacy).  
- **tier**: esteso a `T1..T6` per allineamento con Senzienza.  
- **metrics.unit**: **UCUM** obbligatorio.  
- **ENVO**: `applicability.envo_terms[]` (URI PURL) **oppure** `requisiti_ambientali[].condizioni.biome_class` (label/ID).

---

## Specifiche: Catalogo Trait & Glossario
> File: `packs/evo_tactics_pack/docs/catalog/trait_catalog.schema.json`

```json
{{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/trait_catalog.schema.json",
  "title": "Evo Tactics — Trait Catalog",
  "type": "object",
  "additionalProperties": false,
  "required": ["schema_version","schema_uri","trait_glossary","traits"],
  "properties": {
    "schema_version": { "type": "string", "minLength": 1 },
    "schema_uri": { "type": "string", "format": "uri-reference" },
    "trait_glossary": { "type": "object", "additionalProperties": { "type": "string" } },
    "traits": {
      "type": "object",
      "additionalProperties": { "$ref": "trait_entry.schema.json" },
      "propertyNames": { "pattern": "^[a-z0-9_]+$" }
    }
  }
}}
```

---

## Specifiche: Sentience Track T1–T6
> File: `packs/evo_tactics_pack/docs/catalog/sentience_track.schema.json` + `sentience_track.json` (esempio)

```json
{{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://example.com/schemas/sentience_track.schema.json",
  "title": "Evo Tactics — Sentience Track",
  "type": "object",
  "required": ["schema_version","track"],
  "properties": {
    "schema_version": {"type": "string"},
    "schema_uri": {"type": "string"},
    "track": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["tier","label","cognitive_profile","example_behaviors"],
        "properties": {
          "tier": {"type": "string", "pattern": "^T[1-6]$"},
          "label": {"type": "string"},
          "cognitive_profile": {"type": "string"},
          "sensory_profile": {"type": "array","items":{"type":"string"}},
          "example_behaviors": {"type": "array","items":{"type":"string"}},
          "gating_traits": {"type":"array","items":{"type":"string"}},
          "conflicts": {"type":"array","items":{"type":"string"}}
        }
      }
    }
  }
}}
```

**Esempio (estratto) `sentience_track.json`:**
```json
{{
  "schema_version": "1.0.0",
  "track": [
    { "tier": "T1", "label": "Senso di Base",
      "cognitive_profile": "Percezioni elementari, riflessi",
      "sensory_profile": ["propriocezione","termocezione","nocicezione"],
      "example_behaviors": ["evita_danno_immediato"],
      "gating_traits": ["TR-0002","TR-0004"], "conflicts": [] },
    { "tier": "T4", "label": "Cooperazione/Empatia",
      "cognitive_profile": "Ruoli, condivisione risorse",
      "sensory_profile": ["olfatto_sociale","vocalizzazioni_coordinative"],
      "example_behaviors": ["turni","difesa_collettiva"],
      "gating_traits": ["empatia_cooperativa"], "conflicts": [] }
  ]
}}
```

---

## Template di Authoring
> File: `packs/evo_tactics_pack/docs/catalog/trait_template.json`

```json
{{
  "trait_code": "TR-XXXX",
  "label": "Nome del tratto",
  "famiglia_tipologia": "Cluster",
  "fattore_mantenimento_energetico": "Basso|Medio|Alto",
  "tier": "T1",
  "slot": [],
  "slot_profile": {"core": "", "complementare": ""},
  "sinergie": [], "conflitti": [], "requisiti_ambientali": [],
  "mutazione_indotta": "", "uso_funzione": "", "spinta_selettiva": "", "debolezza": "",
  "morph_structure": "", "primary_function": "", "cryptozoo_name": "", "functional_description": "",
  "metrics": [], "metabolic_cost": "Basso", "cost_profile": {"rest":"","burst":"","sustained":""},
  "trigger": "", "limits": [], "ecological_impact": "", "output_effects": [],
  "testability": {"observable":"", "scene_prompt":""},
  "applicability": {"clades": [], "envo_terms": [], "notes": ""},
  "version": "0.1.0", "versioning": {"created": "2025-11-05", "updated": "2025-11-05", "author": "Master DD / GPT-5"},
  "notes": "", "sinergie_pi": {"co_occorrenze":[], "forme":[], "tabelle_random":[], "combo_totale":0}
}}
```

---

## Guida specie/creatura: cosa serve per completare i tratti
Per **ogni specie/creatura** fornisci:
1) **Panoramica funzionale** (2 frasi) + *niche statement* (ENVO).  
2) **Elenco trait** (ordinati per *famiglia_tipologia* e *tier*).  
3) **Metriche UCUM** per i trait chiave (range/soglie/condizioni).  
4) **Requisiti ambientali** (ENVO: biome/material/process).  
5) **Sinergie/Conflitti** (con motivazione breve).  
6) **Sentience target** (T1–T6) + *gating* di abilità sociali/cognitive.  
7) **Testability** (observable + scene_prompt).  
8) **Versioning** (SemVer + autore/data).

---

## Strumenti: Validator, Export CSV, Seed Merge
**Validator (`tools/py/trait_template_validator.py`)** — vedi estratto nel testo.  
**Export CSV (`tools/py/export_csv.py`)** — estratto presente.  
**Merge (`tools/py/seed_merge.py`)** — estratto presente.

**Uso rapido:**
```bash
python tools/py/trait_template_validator.py
python tools/py/export_csv.py
python tools/py/seed_merge.py --base packs/.../trait_reference.json --in packs/.../trait_reference.sentience_seed.json --out packs/.../trait_reference.merged.json
```

---

## CI: GitHub Actions (validazione)
> File: `.github/workflows/validate_traits.yml` — vedi sezione dedicata.

---

## Migrazione v1.x → v2
- **tier**: esteso a `T1..T6`; valori v1 restano validi.  
- **trait_code**: normalizza a `TR-0001`; registra alias legacy.  
- **metrics.unit**: migra a UCUM (`°C`→`Cel`, adimensionale→`1`).  
- **ENVO**: preferisci PURL in `applicability.envo_terms[]`; in alternativa `requisiti_ambientali[].condizioni.biome_class`.  
- **versioning**: allinea a SemVer, con date ISO.

---

## Piano operativo: dump 297 neuroni (Ancestors)
**Goal**: `data/ancestors/neurons_dump.json` con campi minimi e mapping ai trait.

**Fasi**: raccolta fonti community → normalizzazione rami → mapping neurone→trait → conflitti/sinergie → QA → export.  
**Accettazione**: copertura ≥95%, 0 duplicati, schema valido.

---

## Branch layout & Checklist PR
**Branch**: `traits/core`, `traits/sentience`, `data/ancestors`, `ci`.  
**Checklist**: schema OK, catalogo valido, docs aggiornati, SemVer bump.

---

## Appendice A — JSON Schema completi
*(Ripeti i tre schema in forma integrale nel repo; vedi sezioni precedenti per i blocchi.)*

## Appendice B — Trait di esempio
*(Propriocezione, Equilibrio vestibolare, Nocicezione, Termocezione, Chemiocezione interna — vedi pacchetto v1.2; adegua codici/UCUM).*

## Appendice C — Issue template
```
---
name: "✨ Richiesta nuovo trait"
about: Proponi un nuovo tratto per il catalogo
title: "[Trait] Titolo sintetico"
labels: ["trait","proposal"]
assignees: []
---
## Nome/Label
## Tier (T1–T6)
## Famiglia/Tipologia
## Descrizione funzionale (1–3 frasi)
## Metriche (UCUM)
## Sinergie/Conflitti
## Requisiti ambientali (ENVO)
## Uso in gioco / Spinta selettiva
## Note
```

---

## Riferimenti
- JSON Schema 2020‑12 — metaschema & guide ufficiali.
- SemVer 2.0.0 — specifica.
- UCUM — specifica e adozione (es. FDA); `Cel` per °C, `1` per adimensionale.
- ENVO — PURL (OBO) per biomi/habitat/materiali.
- Vestibular System (panoramica clinica) — utile per trait di equilibrio.
