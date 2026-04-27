---
title: 'Biodiversità Connessa — Bundle canonical + drift validator (runbook)'
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-27
source_of_truth: false
language: it
review_cycle_days: 30
---

# Biodiversità Connessa — Bundle canonical + drift validator

> **Sprint v3.5 — 2026-04-27.** Runbook unico per generare il bundle canonical
> della biodiversità (network + ecosistemi + foodweb + species + biomi) e
> validare il drift tra le 3 viste del dominio: **Game runtime** (`data/core/`),
> **catalog publishing** (`packs/evo_tactics_pack/docs/catalog/`), **Game-Database CMS**.

## 1. Perché esiste

Audit doc V2 inspect 2026-04-27 ha rivelato che le tre viste del dominio biodiversità
non sono isomorfe:

| Vista              | Sorgente                                                | Esempio drift                                                              |
| ------------------ | ------------------------------------------------------- | -------------------------------------------------------------------------- |
| Game runtime       | `data/core/biomes.yaml`, `data/core/species.yaml`       | 40 biomi runtime, schema heterogeneo (`vc_adapt`, `mutations`)             |
| Catalog publishing | `packs/evo_tactics_pack/docs/catalog/catalog_data.json` | Generato da pack, può essere stale (es. manca `ROVINE_PLANARI` 2026-04-19) |
| Game-Database CMS  | Repo sibling, Prisma + Postgres                         | Schema diverso (taxonomy CMS), import build-time via `evo:import`          |

Senza un bundle canonical intermedio, **non c'è un singolo file su cui agganciare
i tre repo** → drift silente, regressioni rilevate solo a run-time.

Riferimento: [`EVO_FINAL_DESIGN_GAME_DATABASE_SYNC.md`](../planning/EVO_FINAL_DESIGN_GAME_DATABASE_SYNC.md)
e [`EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md`](../planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md).

## 2. Architettura

```
data/core/biomes.yaml           ┐
data/core/species.yaml          │
data/ecosystems/*.yaml          │
packs/.../ecosystems/network/   │   export_biodiversity_bundle.py
packs/.../foodwebs/*.yaml       │   ─────────────────────────────▶  out/bio/biodiversity_bundle.json
packs/.../species/<biome>/*.yaml│                                   (snapshot_id sha256, schema 1.0.0)
packs/.../ecosystems/*.yaml     ┘
                                                                    │
                                                                    │ validate_bio_sync.py
                                                                    ▼
                              packs/.../catalog/catalog_data.json ──┴──▶ drift report
                                                                          (errors / warnings)
```

- **Source authority A2** (vedi authority map): solo i source YAML sono "verità".
- **Bundle = vista derivata canonical**, additive, non modifica i source.
- **Schema canonical**: [`schemas/evo/biodiversity_bundle.schema.json`](../../schemas/evo/biodiversity_bundle.schema.json).

## 3. Generazione bundle

### Comando

```bash
python tools/py/export_biodiversity_bundle.py
# Output di default: out/bio/biodiversity_bundle.json
```

### Opzioni

| Flag       | Default                            | Effetto                                                        |
| ---------- | ---------------------------------- | -------------------------------------------------------------- |
| `--out`    | `out/bio/biodiversity_bundle.json` | Path output JSON.                                              |
| `--strict` | off                                | Exit 1 su missing source / drift cross-source. Da usare in CI. |

### Determinismo

`snapshot_id` = primi 16 char di `sha256(payload_normalizzato)` — esclude
`generated_at` per evitare diff falso-positivi tra invocazioni.

Verifica determinismo:

```bash
python tools/py/export_biodiversity_bundle.py
SHA1=$(jq -r .snapshot_id out/bio/biodiversity_bundle.json)
python tools/py/export_biodiversity_bundle.py
SHA2=$(jq -r .snapshot_id out/bio/biodiversity_bundle.json)
test "$SHA1" = "$SHA2" && echo "deterministic OK"
```

## 4. Drift validator

### Comando

```bash
python tools/py/validate_bio_sync.py
# Confronta bundle vs catalog
```

### Opzioni

| Flag        | Default                                                 | Effetto                                       |
| ----------- | ------------------------------------------------------- | --------------------------------------------- |
| `--bundle`  | `out/bio/biodiversity_bundle.json`                      | Path bundle.                                  |
| `--catalog` | `packs/evo_tactics_pack/docs/catalog/catalog_data.json` | Path catalog publishing (vista CMS-friendly). |
| `--strict`  | off                                                     | Exit 1 anche su warnings (oltre che errors).  |

### Cross-check eseguiti

1. **Network nodes** — `bundle.network.nodes[].id` ↔ `catalog.ecosistema.biomi[].network_id`.
2. **Edges count** — `bundle.network.edges` count ↔ `catalog.ecosistema.connessioni` count.
3. **Ecosystems id mapping** — `bundle.ecosystems[].id` ↔ `catalog.biomi[].network_id`.
4. **Bridge species sanity** — ogni `bridge_species_map[].species_id` deve esistere in `bundle.species`.
5. **Biome label coverage** — warn su `biome_profile` catalog non presenti in `bundle.biomes`.

### Exit codes

- `0` — sync OK
- `1` — drift detected (errors, oppure warnings se `--strict`)
- `2` — setup error (file mancanti, parse error)

## 5. Runbook tipico

### Pre-PR (developer locale)

```bash
# Step 1: rigenera bundle dopo modifiche a data/core/* o packs/.../ecosystems
python tools/py/export_biodiversity_bundle.py --strict

# Step 2: valida drift contro catalog corrente
python tools/py/validate_bio_sync.py
```

Se step 2 segnala drift:

- Controlla se il catalog è stale → `npm run sync:evo-pack` (rigenera catalog publishing).
- Re-run step 1 + step 2.

### Cross-repo Game ↔ Game-Database (post-merge)

Dopo `npm run sync:evo-pack` lato Game (vedi [`EVO_FINAL_DESIGN_GAME_DATABASE_SYNC.md §4`](../planning/EVO_FINAL_DESIGN_GAME_DATABASE_SYNC.md#4-flusso-operativo-consigliato-oggi)):

```bash
# 1. Bundle canonical aggiornato
python tools/py/export_biodiversity_bundle.py --strict

# 2. Drift vs catalog (deve essere clean post sync:evo-pack)
python tools/py/validate_bio_sync.py --strict

# 3. Lato Game-Database
cd /path/to/Game-Database
npm run evo:import --dry-run
npm run evo:import
```

### CI gate (suggerito)

- Job non-bloccante: `python tools/py/validate_bio_sync.py` (warn-only).
- Job bloccante (post-stabilizzazione): `--strict` mode in pre-merge.

## 6. Schema bundle (sintesi)

Vedi schema completo: [`schemas/evo/biodiversity_bundle.schema.json`](../../schemas/evo/biodiversity_bundle.schema.json).

Top-level required:

- `schema_version` (const `"1.0.0"`)
- `generated_at` (ISO-8601)
- `snapshot_id` (sha256 prefix 12+ hex)
- `network` — `{id, label, nodes[], edges[]}`
- `ecosystems` — array di `{id, biome_id, label, source_path, ...}`
- `foodwebs` — array di `{biome_slug, nodes[], edges[]}`
- `species` — array species lite `{id, label, biome_id, source_path}`
- `biomes` — array biomi runtime `{id, label, diff_base?}`

Top-level optional:

- `cross_events` — propagation events
- `bridge_species_map` — specie ponte multi-bioma
- `manifests` — counters + source files list

## 7. Vincoli operativi

- **NO modifica diretta** dei source di `data/core/` o `packs/`. Il bundle è
  vista derivata read-only. Qualsiasi cambio dati va al source di pertinenza
  (vedi [Source Authority Map A2](../planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md)).
- **UTF-8 esplicito**: encoding `utf-8`, `ensure_ascii=False`, `indent=2`.
  Test `test_bundle_utf8_no_mojibake` fallisce se reintrodotto mojibake `Ã`.
- **Non commiti `out/bio/`**: directory in `.gitignore` (build artifact).

## 8. Test

```bash
PYTHONPATH=tools/py pytest tests/scripts/test_biodiversity_bundle.py -v
```

Copertura: 6 test (determinism, schema shape, drift catch, UTF-8, missing bundle).

## 9. Documenti correlati

- [`schemas/evo/biodiversity_bundle.schema.json`](../../schemas/evo/biodiversity_bundle.schema.json) — schema canonical.
- [`EVO_FINAL_DESIGN_GAME_DATABASE_SYNC.md`](../planning/EVO_FINAL_DESIGN_GAME_DATABASE_SYNC.md) — regole cross-repo.
- [`EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md`](../planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md) — A2 = core data wins su drift.
- [`ADR-2026-04-14-game-database-topology`](../adr/ADR-2026-04-14-game-database-topology.md) — perché Game-Database NON è runtime.
