---
title: BIOME_FEATURE_CHECKS.md
doc_status: draft
doc_owner: backend-team
workstream: backend
last_verified: 2026-06-21
source_of_truth: false
language: it-en
review_cycle_days: 30
---

# BIOME_FEATURE_CHECKS.md

Standard di check & dry-run per nuove feature Bioma + Specie + Trait

Questo documento definisce:

- la procedura standard di **check** e **dry-run** per l'integrazione di un nuovo bioma complesso e delle sue specie/trait;
- come usare lo script `tools/traits/check_biome_feature.py` (con i suoi limiti attuali, vedi §3.5);
- come integrare questi check con i validator canonici e nei merge reali.

---

## 1. Scope

La procedura si applica a QUALSIASI feature che introduca o modifichi:

- un bioma (`data/core/biomes.yaml`, `data/core/biome_aliases.yaml`, `biomes/terraforming_bands.yaml`)
- pool di trait ambientali (`data/core/traits/biome_pools.json`)
- trait ambientali/temporanei (`data/core/traits/glossary.json`, `data/core/traits/active_effects.yaml`, `data/traits/index.json`)
- ecosistemi del pack (`packs/evo_tactics_pack/data/ecosystems/`)
- specie collegate -- file per-specie `data/core/species/*.yaml` + catalogo `data/core/species/species_catalog.json` (il monolite `data/core/species.yaml` e' stato RIMOSSO, #2271) + `data/traits/species_affinity.json`
- regole di gioco (`data/core/game_functions.yaml`)

> Canon-enforcement: i file specie derivati NON si editano mai a mano (regenerate-or-die). Per cambi specie usa la pipeline di generazione, non patch dirette su `species_catalog.json`.

---

## 2. Standard CHECK & DRY-RUN (alto livello)

1. **CHECK_SCHEMA_E_SLUG**
   - Validazione JSON/YAML (schema `schemas/evo/` via `npm run schema:lint`)
   - Nessun slug duplicato per biomi/pool/trait/specie/alias

2. **CHECK_COERENZA_TRAIT_SPECIE_BIOMA**
   - Trait usati <-> trait definiti (`glossary.json` + `active_effects.yaml` + `index.json`)
   - Specie <-> biome_affinity <-> pool
   - Temp_traits <-> species_affinity

3. **CHECK_TEST_E_PIPELINE**
   - Validator dataset canonici (vedi §4)
   - Script custom di coerenza (vedi `check_biome_feature.py`, §3)

4. **DRY-RUN MERGE**
   - Sequenza patch/commit simulata
   - Report di compatibilita' con branch principale

---

## 3. Script di supporto: `tools/traits/check_biome_feature.py`

Lo script esegue una serie di controlli automatici di coerenza per una feature di bioma.
Lavora in sola lettura (`--dry-run` e' decorativo: lo script non modifica mai file).

### 3.1 Uso previsto (CLI)

```bash
python tools/traits/check_biome_feature.py --biome frattura_abissale_sinaptica --dry-run --verbose
```

Opzioni effettive (vedi `argparse` nello script):

- `--biome <slug>` (obbligatorio): slug del bioma da controllare
- `--dry-run`: flag decorativo, no-op (lo script non scrive comunque)
- `--verbose`: stampa dettagliata dei controlli

> Nota: le vecchie opzioni `--no-schema` e `--fail-on-warn` documentate in passato NON esistono nello script corrente.

### 3.2 Cosa controlla

Lo script effettua (in lettura):

- Esistenza del bioma in `data/core/biomes.yaml`
- Pool di trait che citano il bioma in `data/core/traits/biome_pools.json`
- Coerenza trait usati (pool + trait_plan specie) <-> trait definiti in `glossary.json` / `index.json`
- Specie con `biome_affinity == <slug>`
- Coerenza `species_affinity.json` (warning per associazioni incoerenti)

### 3.3 File letti dallo script

- `data/core/biomes.yaml`
- `data/core/biome_aliases.yaml`
- `data/core/traits/biome_pools.json`
- `data/core/traits/glossary.json`
- `data/traits/index.json`
- `data/traits/species_affinity.json`
- `data/core/species.yaml` (**percorso STALE -- vedi §3.5**)

### 3.4 Sequenza raccomandata per una nuova feature

- Produrre i draft con la pipeline agenti (SPECIE+BIOMI), vedi `docs/pipelines/PIPELINE_TEMPLATES.md`.
- Derivare un patchset sandbox.
- Applicare patch in branch dedicata (`feature/<nome-bioma>`).
- Eseguire i validator canonici (§4) PIU' lo script di coerenza:

```bash
python tools/traits/check_biome_feature.py --biome <slug> --dry-run --verbose
```

- Eseguire lint/test del progetto (`npm run schema:lint`, `pytest`, `node --test ...`).
- Se tutto e' OK -> procedere con PR/merge.

### 3.5 LIMITE NOTO (stage specie rotto)

Lo script carica ancora il monolite rimosso `data/core/species.yaml` (riga `species_path`).
Dopo la rimozione del monolite (#2271 -> per-specie `data/core/species/*.yaml` + `species_catalog.json`),
il caricamento fallisce con `File YAML mancante: .../data/core/species.yaml` e lo script termina con
exit code 1 PRIMA di eseguire i check bioma/pool. **Finche' lo script non punta a `species_catalog.json`,
lo stage di coverage specie e' non operativo.** Per la coerenza specie<->bioma affidati ai validator
canonici di §4 (che leggono il layout corrente). La fix dello script e' tracciata come follow-up
(fuori scope di questo doc; lo script NON e' un file di doc).

---

## 4. Validator canonici (layout corrente)

Da preferire allo script custom per i merge reali -- leggono il layout per-specie/catalog:

```bash
# Validazione dataset core (specie/biomi/trait)
python3 tools/py/game_cli.py validate-datasets

# Validazione ecosystem pack (con report)
python3 tools/py/game_cli.py validate-ecosystem-pack \
  --json-out out/validation/pack.json --html-out out/validation/pack.html

# Lint schema YAML (schemas/evo/)
npm run schema:lint

# Sync catalogo/asset pack dopo cambi dataset
npm run sync:evo-pack

# Trace-hash dataset + metadati biome synthesizer
pytest tests/scripts/test_trace_hashes.py
node --test tests/services/biomeSynthesizerMetadata.test.js
```

> Cambiando un dataset in `data/core/` rigenera i mock E ri-esegui la suite backend, non solo il validator toccato.

---

## 5. Integrazione con il sistema agenti

Gli agenti coinvolti (profili Codex, `agents/agents_index.json`):

- **Coordinator**: orchestration della pipeline, richiama i check prima del merge.
- **Trait Curator**: garantisce che trait/glossary/index siano coerenti.
- **Species Curator**: valida trait_plan vs pool (su layout per-specie).
- **Biome & Ecosystem Curator**: garantisce coerenza tra bioma e pool.
- **Dev-Tooling**: mantiene `check_biome_feature.py`, validator, CI e lint.

Esempio invocazione da un agente:

> "Esegui i validator canonici poi il check locale:
> `python3 tools/py/game_cli.py validate-datasets`
> `python tools/traits/check_biome_feature.py --biome frattura_abissale_sinaptica --dry-run --verbose`"

[ FINE FILE ]
