# Evo-Tactics · Ecosystem Pack v1.7

Build: 2025-10-25

Questo pacchetto raccoglie i biomi "Badlands", "Foresta Temperata", "Deserto Caldo" e "Cryosteppe" con:

- dataset YAML completi (`data/`) per bioma, ecosistema, foodweb e specie;
- registri di supporto (`tools/config/`) allineati agli schema `v1.7`;
- catalogo HTML statico (`docs/catalog/`) pronto per essere servito dalla radice del repository;
- tooling Python dedicato (`tools/py/`) per convalidare l'intero pack in modo ripetibile.

Tutti i percorsi sono repo-relativi (`packs/evo_tactics_pack/...`) così da funzionare sia in locale sia nei workflow CI.

## Validazione rapida

Usa il comando del CLI condiviso per eseguire l'intera suite del pack (produce anche i report aggiornati):

```bash
python tools/py/game_cli.py validate-ecosystem-pack \
  --json-out packs/evo_tactics_pack/out/validation/last_report.json \
  --html-out packs/evo_tactics_pack/out/validation/last_report.html
```

Il comando richiama internamente `packs/evo_tactics_pack/tools/py/run_all_validators.py`, che:

1. Valida network/ecosistemi (`validate_ecosistema_v2_0.py`, `validate_cross_foodweb_v1_0.py`).
2. Esegue i controlli bioma, specie e foodweb (`validate_bioma_v1_1.py`, `validate_species_v1_7.py`, `validate_foodweb_v1_0.py`).
3. Lancia gli script estesi presenti in `tools/py/ext_v1_5/` con prefissi `validate`/`check`.

Ogni comando viene riportato in `out/validation/last_report.(json|html)` insieme allo stato (codice d'uscita, log).

Per esecuzioni ad hoc puoi chiamare direttamente lo script del pack:

```bash
python packs/evo_tactics_pack/tools/py/run_all_validators.py \
  --json-out packs/evo_tactics_pack/out/validation/last_report.json \
  --html-out packs/evo_tactics_pack/out/validation/last_report.html
```

## Rigenerazione e log

- Pipeline completa: `python scripts/evo_pack_pipeline.py --core-root data/core --pack-root packs/evo_tactics_pack --with-analysis --with-minimal-fixture --log-activity` (sync core→pack, derive env/cross-biome, cataloghi, dist, validator, derived deterministici e log).
- Modalità sync+validator: `python scripts/evo_pack_pipeline.py --core-root data/core --pack-root packs/evo_tactics_pack --sync-validate-only --log-activity --log-tag PIPELINE-EVO-PACK-2026-06-03` (aggiorna `data/**` con `core_root`, esegue validator, genera `out/validation/core_sync.sha256` con checksum e commit).
- Ultima esecuzione: `logs/agent_activity.md` → `[PIPELINE-EVO-PACK-2026-06-03]` (commit `c5ff16277fbd1d74af07a081d7373a61e8cd7880`; checksum `0018c5acd3794140d13a9e9bcd1f32fb570cd21b1629726eeb2d35e3cc99a0e4` in `out/validation/core_sync.sha256`; report validator aggiornati in `out/validation/last_report.{json,html}`).
- Derivati correlati: `packs/evo_tactics_pack/out/patches/**` (env/cross-biome), `data/derived/analysis/manifest.json`, `data/derived/test-fixtures/minimal/manifest.json` con checksum tracciati.

## Dataset NPG reattivi

- L'array JSON principale è in `tools/py/vtt/npg_pack.json` e descrive bioma, ruolo, specie, loadout e ricompense di ogni NPG.
- Lo schema di riferimento è `tools/py/schema/npg_schema.json` (replicato in `docs/npg_schema.json` per la consultazione rapida).

Per verificare che il pacchetto rimanga coerente con lo schema, esegui:

```bash
python packs/evo_tactics_pack/tools/py/ext_v1_5/validate_package.py
```

## Struttura del pack

```
packs/evo_tactics_pack/
├─ data/
│  ├─ ecosystems/                # *.biome.yaml, *.ecosystem.yaml, manifest, meta network
│  ├─ foodwebs/                  # foodweb per bioma (repo-relativi)
│  ├─ species/                   # specie compatibili con schema v1.7
│  └─ registries.yaml            # reference condivise
├─ docs/
│  └─ catalog/                   # landing + pagine bioma con asset repo-relativi
├─ tools/
│  ├─ config/                    # validator_config + registries
│  └─ py/                        # validator, generatori e script ext_v1_5
└─ out/
   └─ validation/                # report generati dal workflow CLI/CI
```

## Integrazione con il repository principale

- Il comando `validate-ecosystem-pack` è incluso nello stesso CLI (`tools/py/game_cli.py`) usato per gli altri dataset.
- `tools/py/validate_datasets.py` richiama automaticamente il validator del pack, così il report globale segnala eventuali errori.
- La CI (`.github/workflows/ci.yml`) esegue sia `validate-datasets` sia `validate-ecosystem-pack`, garantendo copertura automatica.
- Il catalogo statico e gli asset puntano ai dati locali, quindi possono essere pubblicati senza rewrite dalla root del pack.

Per ulteriori dettagli sugli script estesi e sugli schema consulta i file sorgente in `tools/py/` e le definizioni YAML all'interno di `data/`.
