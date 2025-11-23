# BIOME_FEATURE_CHECKS.md

Standard di check & dry-run per nuove feature Bioma + Specie + Trait

Questo documento definisce:

- la procedura standard di **check** e **dry-run** per l’integrazione di un nuovo bioma complesso e delle sue specie/trait;
- come usare lo script `tools/traits/check_biome_feature.py`;
- come integrare questi check nelle pipeline agenti e nei merge reali.

---

## 1. Scope

La procedura si applica a QUALSIASI feature che introduca o modifichi:

- un bioma (`data/core/biomes.yaml`, `data/core/biome_aliases.yaml`, `biomes/terraforming_bands.yaml`)
- pool di trait ambientali (`data/core/traits/biome_pools.json`)
- trait ambientali/temporanei (`data/core/traits/glossary.json`, `data/traits/index.json`)
- specie collegate (`data/core/species.yaml`, `data/traits/species_affinity.json`)
- regole di gioco (`data/core/game_functions.yaml`)

---

## 2. Standard CHECK & DRY-RUN (alto livello)

1. **CHECK_SCHEMA_E_SLUG**
   - Validazione JSON/YAML
   - Nessun slug duplicato per biomi/pool/trait/specie/alias

2. **CHECK_COHERENZA_TRAIT_SPECIE_BIOMA**
   - Trait usati ↔ trait definiti
   - Specie ↔ biome_affinity ↔ pool
   - Temp_traits ↔ species_affinity

3. **CHECK_TEST_E_PIPELINE**
   - Lint/test dell’applicazione (npm, pytest, ecc.)
   - Script custom di validazione (vedi `check_biome_feature.py`)

4. **DRY-RUN MERGE**
   - Sequenza patch/commit simulata
   - Report di compatibilità con branch principale

---

## 3. Script di supporto: `tools/traits/check_biome_feature.py`

Lo script esegue una serie di controlli automatici di coerenza per una feature di bioma.

### 3.1 Uso previsto (CLI)

```bash
python tools/traits/check_biome_feature.py --biome frattura_abissale_sinaptica --dry-run

Opzioni generiche:

--biome <slug>: slug del bioma da controllare

--verbose: stampa dettagliata dei controlli

--no-schema: salta controlli schema (se non servono)

--fail-on-warn: tratta i warning come errori
```

### 3.2 Cosa controlla

Lo script effettua (in lettura):

Coerenza trait ↔ pool ↔ specie ↔ bioma

Slug duplicati

Compatibilità minima con schema (se trova i file di schema)

Presenza di tutti i file expected (glossary, index, species_affinity, species, biomes, biome_pools)

### 3.3 Sequenza raccomandata per una nuova feature

- Produrre i draft con la pipeline agenti (SPECIE+BIOMI).
- Derivare un patchset sandbox.
- Applicare patch in branch dedicata (feature/<nome-bioma>).
- Eseguire:

```bash
python tools/traits/check_biome_feature.py --biome <slug> --dry-run
```

- Comandi di lint/test del progetto.
- Se tutto è OK → procedere con PR/merge.

### 3.4 Integrazione con il sistema agenti

Gli agenti coinvolti:

- Coordinator: orchestration della pipeline, richiama i check prima del merge.
- Trait Curator: garantisce che trait/glossary/index siano coerenti.
- Species Curator: valida trait_plan vs pool.
- Biome & Ecosystem Curator: garantisce coerenza tra bioma e pool.
- Dev-Tooling: mantiene check_biome_feature.py, CI e lint.

Gli agenti possono invocare lo script in forma descritta, ad esempio:

"Esegui il check locale:
python tools/traits/check_biome_feature.py --biome frattura_abissale_sinaptica --dry-run"

[ FINE FILE ]
