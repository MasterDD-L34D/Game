# Evo Tactics Pack MongoDB
- **Repository**: /workspace/Game
- **Tecnologie principali**: MongoDB + Python (migrazioni/seed) + Node.js (servizi runtime)

## Obiettivo e dominio
- **Descrizione sintetica**: Datastore per cataloghi e telemetria del pacchetto Evo Tactics, usato da generatori di biomi/specie e servizi live per sessioni di gioco.
- **Entità chiave**:
  - `biomes`: manifest, profili e connessioni ecosistemiche dei biomi.
  - `species`: anagrafiche specie/eventi con attributi di bilanciamento e telemetria.
  - `traits`: glossario tratti con metadati ambientali e riferimenti di bilanciamento.
  - `biome_pools`: pool tematici di tratti, clima e ruoli per sintetizzare biomi giocabili.
  - `sessions`: sessioni di gioco/simulazioni con stato, riferimenti a bioma/specie.
  - `activity_logs`: stream eventi granulari correlati alle sessioni.

## Schema
| Entità | Campi principali | Relazioni |
| ------ | ---------------- | --------- |
| `biomes` | `_id`, `label`, `network_id`, `profile` (manifest/foodweb), `connections[]`, `generated_at`, `source_path`. Indici su `network_id`, `connections.to`. | Riferita da `species.biomes` (N:M) e `sessions.biome_id` (1:N). |
| `species` | `_id`, `display_name`, `biomes[]`, `flags.*`, `balance.*`, `playable_unit`, `morphotype`, `spawn_rules`, `environment_affinity`, `derived_from_environment`, `telemetry`, `last_synced_at`. Indici su `biomes`, `flags.*`, `playable_unit`+`balance.encounter_role`. | `biomes` → `biomes._id` (N:M); suggerimenti tratti → `traits._id`; `sessions.primary_species_id`, `activity_logs.subject_id`. |
| `traits` | `_id`, `labels`, `descriptions`, `reference` (tier/slot/usage), `environment_recommendations[]`, `source` (versioni/updated_at). Indici su `reference.tier` e `reference.slot`. | Referenziata da specie (`derived_from_environment.*`) e `sessions.loadout.traits`; `activity_logs.subject_id`. |
| `biome_pools` | `_id`, `label`, `summary`, `climate_tags[]`, `size.{min,max}`, `hazard.*`, `ecology.biome_type`, `traits.core[]/support[]`, `role_templates[]`, `metadata.schema_version/updated_at`. Indici su `hazard.severity`, `climate_tags`, `role_templates.role`, `traits.core`. | `ecology.biome_type` → `biomes._id`; tratti core/support e preferiti → `traits._id`; consumata da `catalog` e `biomeSynthesizer` per generare configurazioni. |
| `sessions` | `_id`, `pack_id`, `status`, `player_id`, `biome_id`, `primary_species_id`, `seed_version`, `started_at`, `ended_at`, `summary`, `metadata`. Indici su `status`+`started_at`, `player_id`, `pack_id`+`status`. | `biome_id` → `biomes._id`; `primary_species_id` → `species._id`; collegamento 1:N con `activity_logs.session_id`; eventuale `summary.telemetry_snapshot_id` verso analytics. |
| `activity_logs` | `_id`, `session_id`, `timestamp`, `event_type`, `subject_type`, `subject_id`, `payload`, `pack_id`, `metadata`. Indici su `session_id`+`timestamp`, `event_type`, `pack_id`+`subject_id`. | `session_id` → `sessions._id`; `subject_id` → `species`/`traits`/`biomes` a seconda di `subject_type`. |

## Processi di popolamento
- **Seed o migrazioni**: Migrazioni Python in `migrations/evo_tactics_pack/*.py` applicate via `python3 scripts/db/run_migrations.py up --config <file>`; changelog salvato in `evo_schema_migrations`. Seed con `python3 scripts/db/seed_evo_generator.py --config <file>` che upserta biomi, specie, tratti e biome pools dai cataloghi.
- **Strumenti di import**: Script Bash `ops/mongodb/apply.sh <env|config> [--skip-seed]` automatizza migrazioni (`run_migrations.py up/status`) e seed (`seed_evo_generator.py`), leggendo configurazioni JSON (es. `config/mongodb.dev.json`).

## Dati sorgente per import
- **Sorgenti disponibili**: Cataloghi JSON generati in `packs/evo_tactics_pack/docs/catalog/` (es. `catalog_data.json`, `species/*.json`, `trait_glossary.json`, `trait_reference.json`, `env_traits.json`, `data/core/traits/biome_pools.json`).
- **Formato e struttura**: Documenti JSON con chiavi `id`/`_id`, metadata e campi nested (manifest, bilanciamenti, regole ambientali). `catalog_data.json` contiene ecosistemi, connessioni e timestamp `generated_at`; directory `species/` fornisce singoli record specie.
- **Campi obbligatori e mapping**: Script di seed imposta `_id` da `id`, normalizza `generated_at`/`last_synced_at`, fonde glossario e reference trait e associa raccomandazioni ambientali (`env_traits.rules[*].suggest.traits`). Connessioni biomi mappate da `ecosistema.connessioni` su `connections[]`.
- **Note operative**: Le sorgenti vanno rigenerate prima del seed; il flag `--dry-run` stampa conteggi senza scrivere. Config JSON può definire `seed.dryRun` per ambienti sensibili.

## Sicurezza e audit
- **Tracciamento utenti**: `activity_logs` conserva metadata (`pack_id`, `request_id`, `platform`) per audit sessioni; `sessions.summary.telemetry_snapshot_id` collega a snapshot analytics. Backup/restore schedulati via `mongodump`/`mongorestore` con retention (giornalieri 7g, settimanali 6 settimane).
- **Permessi/ruoli**: URI e database risolti tramite variabili segrete (`MONGODB_DEV_URI`, `MONGODB_PROD_URI`, ecc.); accesso produzione limitato a SRE/referenti, CI usa service account dedicati. Applicazione richiede `MONGO_URL`/`MONGO_DB_NAME` (o alias) per connessione.

## Note operative
- **Prerequisiti**: Python 3 con `pymongo`, Node.js con pacchetto `mongodb` per servizi runtime, accesso a cluster MongoDB.
- **Comandi utili**:
  - `python3 scripts/db/run_migrations.py <up|down|status> --config config/mongodb.dev.json`
  - `python3 scripts/db/seed_evo_generator.py --config config/mongodb.dev.json [--dry-run]`
  - `ops/mongodb/apply.sh dev` (o `prod`) per pipeline completa.
- **Variabili d'ambiente**: `MONGO_URL`, `MONGO_DB_NAME`/`MONGO_DB`, `MONGODB_URI`, `MONGO_URI`, `MONGODB_DEV_URI`, `MONGODB_DEV_DB`, `MONGODB_PROD_URI`, `MONGODB_PROD_DB`, opzionale `MONGO_MAX_POOL_SIZE` e `seed.dryRun` da config.

## Questioni aperte / TODO
- Definire collezioni analytics per `summary.telemetry_snapshot_id` e policy TTL su log attività (menzionata come opzionale).
- Documentare eventuali strategie di rigenerazione cataloghi prima del seed e controllo versioni (`seed_version`).
