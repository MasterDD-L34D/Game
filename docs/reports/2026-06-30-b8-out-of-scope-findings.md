---
title: "B8 -- finding fuori scope (repoint species.yaml)"
doc_status: active
doc_owner: platform-docs
workstream: ops-qa
last_verified: 2026-06-30
source_of_truth: false
language: it
review_cycle_days: 90
---

# B8 -- finding fuori scope (repoint species.yaml)

> Tracking-doc dei finding emersi durante **B8 parte 2** (repoint dei 3 script
> DEGRADED che leggevano `data/core/species.yaml`, rimosso in #2271) ma **fuori
> dallo scope** del repoint stesso. Stato: **tracciati, NON fixati** (per ora).
> Parent: `docs/planning/2026-06-29-closeout-master-plan.md` riga B8.
> Fix B8 pt2: commit `fd7f41c3` (generator.py / build-idea-taxonomy.js /
> validate_datasets.py + drop stale `generated_at` in data_health.py + test
> `tests/test_species_catalog_repoint_b8.py`).

## Contesto

B8 = repoint dei reader di `data/core/species.yaml` (rimosso #2271) verso il SoT
canonico `data/core/species/species_catalog.json` (lista `catalog`, loader
`tools/py/lib/species_loader.py`). Inventario B8 = **7 script**: 4 BROKEN
(crash / falso-missing, fix in PR #3075) + 3 DEGRADED (perdono le specie in
silenzio, fix in pt2 `fd7f41c3`). I finding sotto sono uscititi dal verify ma NON
appartengono al repoint species.yaml -> tracciati a parte per non gonfiare la PR.

## F1 -- `build-idea-taxonomy.js` degradato anche su biomes / traits / gameFunctions

**Severita**: media (artefatto pubblico stale; nessun crash). **Ticket**:
`TKT-B8-IDEATAX-MULTISRC`.

`scripts/build-idea-taxonomy.js` legge dataset multipli ai path PRE-split
(`data/`), ma il canon e' sotto `data/core/`:

| collector       | path letto dallo script         | path reale            | esito |
|-----------------|---------------------------------|-----------------------|-------|
| `collectBiomes` | `data/biomes.yaml`              | `data/core/biomes.yaml` | 0 biomi |
| `collectTraits` | `data/traits/glossary.json`     | `data/core/traits/glossary.json` | 0 trait |
| `collectGameFunctions` | `data/game_functions.yaml` | `data/core/game_functions.yaml` | 0 funzioni |

`readYaml` / `readJson` ingoiano ENOENT -> `{}` -> liste vuote in silenzio
(stesso pattern dello species reader fixato in pt2). NON e' lo stesso driver di
#2271 (qui i file esistono, sono solo a `data/core/`).

**Evidenza** -- l'artefatto tracked `docs/public/idea-taxonomy.json` (committed)
ha `biomes:18 traits:31 gameFunctions:6 species:28` perche' generato da una
versione PRECEDENTE dello script (sorgenti `data/core/*`, separatori `/`). Lo
script ATTUALE produce `biomes:0 traits:0 gameFunctions:0`.

**Decisione presa in pt2**: l'artefatto `docs/public/idea-taxonomy.json` e'
stato **lasciato a HEAD** (NON rigenerato). Rigenerarlo ora con lo script
attuale avrebbe (a) azzerato biomes/traits/functions, (b) flippato i path a
backslash Windows (`data\core\...`) = regressione + churn cross-platform.

**Fix proposto**: repoint i 3 collector a `data/core/biomes.yaml`,
`data/core/traits/glossary.json`, `data/core/game_functions.yaml`, poi
rigenerare l'artefatto su ambiente posix/clean (separatori `/`). Aggiungere una
guard test (anti silent-zero) come per lo species reader.

## F2 -- `validate_species_ecology` fatale vs documentato warn-only

**Severita**: bassa (latente; 0 errori oggi). **Ticket**:
`TKT-B8-ECOLOGY-FATAL`.

Dopo il repoint del pt2, il cross-ref validator ADR-2026-05-02
(`tools/py/validate_datasets.py`) gira davvero (prima era no-op: 0 entry). Il
docstring (`:526-527`) dice che l'asimmetria bidirezionale e' **warn-only
durante la backfill phase** ("logged via stderr but not fatal"), ma il codice
(`:680-685`) la appende a `errors` -> **fatale** (`validate-datasets` exit 1).

Oggi inerte: sul catalog reale il validator ritorna **0 errori**, quindi nessun
impatto. Ma e' un landmine: un futuro edit al catalog con asimmetria
prey/prey_of romperebbe la CI `dataset-checks` contraddicendo l'intento
documentato.

**Fix proposto** (scegliere uno, owner-gated): allineare il codice al docstring
(separare le violazioni bidirezionali in un canale warn-only finche' dura la
backfill), oppure aggiornare il docstring a "fatal" se la policy e' cambiata.

## Note (NON nuovi ticket)

- **N1 -- `data_health.py` species.yaml rule (Missing file `data/core/species.yaml`)**:
  NON e' un finding nuovo. Era la rule del set **4 BROKEN** gia' inventariata in
  B8 (riga closeout "data_health.py:124+:201"), risolta da **PR #3075**
  (`fab8f87f`, MERGED su `origin/main` 2026-06-30: la rule punta ora al catalog).
  Nessun ticket nuovo. NB: #3075 NON ha toccato la riga `generated_at` di
  `trait_coverage_report.json` (line 70), che resta il fix di questa B8 pt2.
- **N2 -- inventario B8 potenzialmente incompleto** (needs-audit, P3). **Ticket**:
  `TKT-B8-READER-SWEEP`. Oltre ai 7 script B8, altri reference a `species.yaml`
  esistono. Triage rapido:
  - **con fallback catalog** (via `species_loader`, probabilmente OK):
    `export_biodiversity_bundle.py`, `normalize_species_style.py`,
    `report_evo_species_ecosystem.py`, `seed_lifecycle_stubs.py`,
    `seed_skiv_saga.py`.
  - **ETL che COSTRUISCE il catalog** (species.yaml come sorgente, by-design):
    `merge_pack_v2_species.py`, `apply_interoception_traits.py`.
  - **senza fallback, NON in inventario B8** (candidati degradati da auditare):
    `scripts/generate_minimal_fixture.py`, `scripts/trait_orphan_assign_wave_0_1.py`,
    `scripts/dev_redirect_server.py`.
  Sweep separato; nessun fix qui.
