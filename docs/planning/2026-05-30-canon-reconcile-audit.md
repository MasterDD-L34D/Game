---
title: 'CANON-RECONCILE audit + Wave3 bestiary unify (Option 1)'
workstream: worldgen
category: planning
doc_status: active
doc_owner: claude-code
last_verified: '2026-05-30'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [planning, wave3, canon-reconcile, species, catalog, bestiary]
---

# CANON-RECONCILE audit + bestiary unify (Wave 3, 2026-05-30)

Ticket: **TKT-SPECIE-CANON-RECONCILE** (Wave 3 del gap-resolution plan).
Decisione master-dd (Eduardo): **Option 1 -- UNIRE** i due bestiari in un unico canon.

## Audit -- il vero quadro (ground-truth, non plan-table)

Il piano diceva "85 schede specie vs 53 SoT". Falso framing: le 85 file in
`packs/evo_tactics_pack/data/species/<biome>/` NON sono 85 specie.

| categoria        | n   | cos'e'                                     |
| ---------------- | --- | ------------------------------------------ |
| `*-trait-keeper` | 38  | contenitori tratti per-bioma -- NON specie |
| `evento-*`       | 4   | eventi ecologici -- NON specie             |
| creature reali   | 43  | le creature che gli scenari usano davvero  |

Confronto vero: **43 creature gameplay vs 53 canon** -- due mondi di naming quasi
disgiunti (**1 sola** sovrapposizione: `dune_stalker`).

- **Canon (53)** = `data/core/species/species_catalog.json`. Bestiario di design ricco
  (nome scientifico, classificazione, descrizioni, interazioni). `biome_affinity` 53/53,
  lifecycle 15/53, trait_refs 37/53. MA 52/53 senza scheda combat-usabile.
- **Gameplay (43)** = pack YAML per-bioma. 23/43 adapter-ready (hanno threat_tier +
  role_trofico); le altre incomplete.
- Correzione anti-stale: il piano diceva "32 specie senza biome_affinity" -> **falso
  oggi** (53/53 ce l'hanno). TKT-SPECIE-BIOME quasi chiuso.

## Pipeline reality (load-bearing)

`species_catalog.json` e' un **artefatto di merge** le cui sorgenti originali stanno in
`/tmp/...` (effimere, perse). Il regen-from-scratch e' morto; il file e' editato in-place
da tool di polish (`apply_biome_affinity.py`, `apply_phase3_polish_d5_d6.py`). Quindi la
promozione = append in-place via script, NON rigenerazione.

Contratto entry (enforced da `tests/api/envelope-b-data-integrity.test.js`): 14 chiavi
richieste presenti + `sentience_index` in `/^T[0-6]$/` + count per-`source` + guardia
hard `total_species`.

## Esecuzione -- unify a 2 strati

**Strato 1 (questo PR) -- STRUTTURA.** Script `tools/etl/promote_gameplay_to_canon.py`:
promuove le creature gameplay nel canon come entry STRUTTURALI (id/bioma/ruolo/threat/
morfotipo mappati) con i campi design ricchi lasciati come STUB flaggati
(`_promote_stub: true`, `_todo_fields: [...]`, `source: gameplay-promote`).

Scope promosso (**22 creature**), i biomi gameplay multi-specie:

| bioma             | n   |
| ----------------- | --- |
| badlands          | 7   |
| cryosteppe        | 6   |
| deserto_caldo     | 4   |
| foresta_temperata | 5   |

Catalogo **53 -> 75**. La base canon 53 e' **invariata** (test lo verifica).

**Esclusi di proposito** (decisione, non dimenticanza):

- `rovine_planari` (10) -- **D6 LOCKED** = nuovo contenuto, gate separato (richiede
  authoring D&D-style + threat_tier/role assenti).
- `tutorial` generici (apex-predatore / guardiano-_ / predone-_) -- placeholder di ruolo
  per scenari, NON specie disegnate. Restano scenario-local.
- biomi a 1-creatura (thin) -- YAGNI: promuovere quando quel bioma entra nel gameplay.

**Strato 2 (incrementale, NON questo PR) -- CONTENUTO.** Authoring dei campi design
(scientific_name, classification, functional_signature, visual_description, interactions,
constraints, trait_refs, lifecycle) per le 22 entry, bioma per bioma. Trovabili via
`source == 'gameplay-promote'` o `_promote_stub == true`. Delegabile a writer/swarm.

## Controlli (tutti verdi)

- `tests/api/envelope-b-data-integrity.test.js` aggiornato (75; base-53 invariata;
  batch 22 tutte `_promote_stub`; allow `gameplay-promote` lifecycle null).
- Sweep consumer catalogo: **JS 112/112**, **python 64/64**.
- Regression D4 risolta: `suggest_biome_affinity.load_catalog` ora esclude
  `gameplay-promote` (stub non sono ground-truth per l'euristica biome -- stesso spirito
  anti-self-poisoning del filtro D4-provenance). suggest 20/20, apply 26/26.

## Follow-up aperti

- **Strato 2 authoring** delle 22 stub (incrementale, YAGNI per bioma gameplay-touched).
- **D6** rovine_planari (10) -- gate separato.
- **Pulizia** dei 38 `*-trait-keeper` + 4 `evento-*` fuori da `species/` (non-specie
  nella cartella sbagliata) -- cleanup separato.
- 6 creature non-promosse con solo `threat_tier` mancante = fix veloce se servono in
  combat (vedi audit).
