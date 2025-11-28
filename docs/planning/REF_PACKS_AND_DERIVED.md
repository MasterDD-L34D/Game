# REF_PACKS_AND_DERIVED – Pack, snapshot e fixture

Versione: 0.5
Data: 2025-12-30
Owner: agente **archivist** (supporto: dev-tooling, coordinator)
Stato: PATCHSET-00 PROPOSTA – separazione core vs derived

---

## Obiettivi

- Mappare pack ufficiali, snapshot e fixture (`packs/**`, `data/derived/**`, `examples/`, eventuali layout legacy) e definirne lo stato di derivazione dai core.
- Stabilire regole per la rigenerazione dei pack a partire dai core, compresi i requisiti di tooling e validazione.
- Identificare duplicati o asset legacy da archiviare per ridurre il rischio di regressioni.

## Stato attuale

- `packs/evo_tactics_pack` è considerato pack ufficiale ma non è documentato se e come venga rigenerato automaticamente dai core.
- `data/derived/**` contiene snapshot/mock/fixture senza un catalogo unico che ne spieghi scopo, data di origine e rischio di divergenza.
- Alcuni esempi o report potrebbero contenere layout pack legacy non tracciati.
- Non esiste una policy documentata per collegare i derived ai test/CI o per marcarli come deprecati.

## Rischi

- Derived non allineati ai core possono introdurre incoerenze nei test o nei pack distribuiti.
- Rigenerazioni manuali senza checklist possono rompere compatibilità con CI o con gli schemi ALIENA/UCUM.
- Pack legacy non etichettati possono essere riutilizzati erroneamente come sorgente di verità.

## Dipendenze

- `REF_REPO_SOURCES_OF_TRUTH` per i percorsi canonici dei core da cui rigenerare (cross-link reciproco attivo).
- `REF_TOOLING_AND_CI` per definire script e workflow che producono/validano pack e derived.
- `REF_REPO_MIGRATION_PLAN` per decidere quando archiviare o rigenerare specifici derived.
- Supporto di dev-tooling per standardizzare i comandi di rigenerazione e di coordinator per le priorità.

## Prerequisiti (patchset)

- **PATCHSET-01A – Catalogo incoming**: fornisce l'inventario dei sorgenti core da usare come input per rigenerare pack e fixture.
- **PATCHSET-02A – Tooling di validazione**: abilita la modalità report/gate dei validator (pack e core) da eseguire prima e dopo la derivazione.

## Mappa sintetica core → derived/pack (gap noti)

| Ambito                      | Input core canonico                                                                                                        | Output/derivati mirati                                                                                                                                | Script/tool dichiarati                                                                                                                                         | Gap da chiudere                                                                                 |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `data/core/**`              | Specie (`data/core/species.yaml`), biomi (`data/core/biomes.yaml`), trait (`data/core/traits/*.json`), missioni/telemetria | Pack dataset (`packs/evo_tactics_pack/data/**`), cataloghi pack (`packs/evo_tactics_pack/docs/catalog/*.json`), fixture/mock (`data/derived/mock/**`) | `scripts/update_evo_pack_catalog.js`, `scripts/sync_evo_pack_assets.js`, `packs/evo_tactics_pack/tools/py/derive_*`, `scripts/build_evo_tactics_pack_dist.mjs` | Manca sync automatica core→pack; fixture `data/derived/test-fixtures/minimal` senza generatore. |
| `data/derived/**`           | Core + parametri QA                                                                                                        | Report analitici (`data/derived/analysis/**`), snapshot (`data/derived/mock/**`), export (`data/derived/exports/**`)                                  | `rsync` per `mock/prod_snapshot`; nessun tool consolidato per `analysis/**`                                                                                    | Script assenti per coverage/progression; export QA non tracciati da workflow.                   |
| `packs/evo_tactics_pack/**` | Core + configurazioni pack                                                                                                 | Dataset pack, cataloghi, validator output (`out/validation/*`)                                                                                        | `packs/evo_tactics_pack/tools/py/run_all_validators.py`, tool Python `derive_*`, build/preview script `.mjs`                                                   | Pipeline ufficiale non orchestraita; validator non legati a gating CI (dip. 02A).               |

## Generatori e checksum attesi (core → derived/pack)

| Ambito                                    | Input canonico (vedi `REF_REPO_SOURCES_OF_TRUTH`)                                                                                 | Tool/script dichiarati                                                                                                                                         | Output/dir interessati                                                                  | Tracciabilità e checksum attesi                                                           |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Allineamento dataset pack                 | `data/core/species.yaml`, `data/core/biomes.yaml`, `data/core/traits/*.json`, `data/core/telemetry.yaml`, `data/core/mating.yaml` | (gap) Script di sync core→pack da definire; validazione con `packs/evo_tactics_pack/tools/py/run_all_validators.py`                                            | `packs/evo_tactics_pack/data/**`, `packs/evo_tactics_pack/out/validation/last_report.*` | Log comando + sha256 degli output validator in README pack; note su commit sorgente core. |
| Cataloghi e asset pack                    | Pack già allineato al core + ecosistemi/foodweb derivati                                                                          | `scripts/update_evo_pack_catalog.js`, `scripts/sync_evo_pack_assets.js`, `scripts/build_evo_tactics_pack_dist.mjs`/`scripts/preview_evo_tactics_pack_dist.mjs` | `packs/evo_tactics_pack/docs/catalog/*.json`, distribuzione pack                        | README `docs/catalog` con checksum JSON/asset generati e timestamp script/commit usato.   |
| Derived analitici (coverage/progressione) | Trait/specie/missioni core (`data/core/traits/**`, `data/core/species.yaml`, `data/core/missions/*.yaml`)                         | (gap) generatori dedicati da aggiungere (`scripts/analysis/trait_coverage_*`, `scripts/analysis/progression_skydock_*`)                                        | `data/derived/analysis/**`                                                              | README locale con comando, commit core e sha256 dei file `{csv,json,yaml}` prodotti.      |
| Snapshot/mock                             | `data/core/**` + pack per fallback deploy                                                                                         | `rsync -a --exclude 'mock' data/ data/derived/mock/prod_snapshot/`                                                                                             | `data/derived/mock/prod_snapshot/**`                                                    | Manifest/sha256 aggiornato in README della directory snapshot dopo ogni copia.            |

**Esito verifica percorsi**: i path canonici indicati sopra e in `REF_REPO_SOURCES_OF_TRUTH` risultano univoci (`data/core/**`, `packs/evo_tactics_pack/**`, `data/derived/**`); nessuna ambiguità o duplicato rilevato nelle directory attuali.

## Prerequisiti di governance

- Owner umano assegnato per il mantenimento di PATCHSET-00 e responsabile dell’allineamento pack/core.
- Branch dedicati per testare rigenerazioni e validazioni dei pack prima di ogni merge su `main`.
- Tracciamento in `logs/agent_activity.md` di esecuzioni, approvazioni e changelog pack/derived.

---

## Changelog

- 2025-12-30: versione 0.5 – intestazione aggiornata al report v0.5, confermata la separazione core/derived e la numerazione 01A–03B senza modifiche al perimetro.
- 2025-12-17: versione 0.3 – design completato per PATCHSET-00, perimetro documentazione confermato, numerazione 01A–03B bloccata con richiamo fasi GOLDEN_PATH e prerequisiti di governance (owner umano, branch dedicati, logging su `logs/agent_activity.md`).
- 2025-11-23: versione 0.1 – struttura iniziale separazione core vs derived (archivist).
- 2025-11-23: versione 0.2 – prime tabelle di inventario e regola base di rigenerazione (archivist).
- 2025-11-24: versione 0.3 – inventario ampliato con file/dir chiave, mappa tooling per ogni step e collegamento ai prerequisiti 01A/02A (archivist).

---

## Inventario per area

### `data/core/**`

| Percorso / file chiave                                                               | Relazione di derivazione                                                                                     | Lacune note                                                                                                                                        |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `data/core/species.yaml` + `data/core/species/aliases.json`                          | Fonte primaria del catalogo specie e mapping alias; atteso come sorgente per pack e fixture.                 | Mancano note su release/tag a cui allineare derived/pack; nessuna checklist di validazione pre-rigenerazione.                                      |
| `data/core/traits/glossary.json`, `data/core/traits/biome_pools.json`                | Glossari e pool biomi da cui derivare cataloghi (pack docs/catalog) e coperture env-trait.                   | Non è documentato come generare output di copertura (es. `docs/catalog/env_traits.json` del pack) né quali script usare.                           |
| `data/core/biomes.yaml`, `data/core/biome_aliases.yaml`                              | Sorgente canonica per biomi e alias; dovrebbe alimentare ecosistemi/foodweb nel pack.                        | Assenza di nota sul mapping verso `packs/evo_tactics_pack/data/ecosystems/*.yaml` e `data/foodwebs/*.yaml`; pipeline di sincronizzazione mancante. |
| `data/core/mating.yaml`, `data/core/telemetry.yaml`, `data/core/game_functions.yaml` | Tabelle core per compatibilità, telemetria e funzioni di gioco; servono per snapshot/mock e validatori pack. | Non esiste mappa utilizzi nei derived; necessario dichiarare consumer (CI, pack, report).                                                          |
| `data/core/missions/skydock_siege.yaml`                                              | Missione core che dovrebbe alimentare i report `data/derived/analysis/progression/*`.                        | Manca script riproducibile per rigenerare i report progression da questa fonte.                                                                    |
| `data/core/hud/layout.yaml`                                                          | Layout HUD core.                                                                                             | Non è chiaro se sia utilizzato in pack o fixture; assente nota di derivazione.                                                                     |

### `data/derived/**`

| Percorso / file chiave                                                                                                                                    | Relazione di derivazione                                                                                               | Lacune note                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `data/derived/analysis/trait_coverage_matrix.csv`, `trait_env_mapping.json`, `trait_coverage_report.json`, `trait_gap_report.json`, `trait_baseline.yaml` | Dovrebbero essere calcolati da `data/core/traits/**` (più specie core) per analisi QA di copertura/gap.                | Script di generazione non documentato; mancano timestamp/owner e collegamento ai test.         |
| `data/derived/analysis/progression/skydock_siege_xp*.{csv,json}`                                                                                          | Snapshot analitico presumibilmente derivato da `data/core/missions/skydock_siege.yaml`.                                | Nessuna procedura per rigenerare i report; rischio divergenza con missione core.               |
| `data/derived/exports/qa-telemetry-export.json`, `data/derived/exports/*conversation.json`                                                                | Export conversazioni/telemetria da sessioni QA, probabilmente generate da strumenti esterni.                           | Origine e formato non documentati; non chiaro se rigenerabili o solo archivi.                  |
| `data/derived/mock/prod_snapshot/*` (biomes, species, telemetry, mating, packs)                                                                           | Snapshot manuale della directory `data/` tramite rsync come fallback deploy.                                           | Rigenerazione descritta solo in README con comando rsync; manca versione/controllo integrità.  |
| `data/derived/test-fixtures/minimal/*`                                                                                                                    | Dataset sintetico per test frontend (`docs/test-interface`); dovrebbe essere estratto in modo deterministico dai core. | Procedura di aggiornamento non documentata; necessaria nota sugli impatti sui test end-to-end. |

### `packs/evo_tactics_pack/**`

| Percorso / file chiave                                                                                                                    | Relazione di derivazione                                                                                                 | Lacune note                                                                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| `packs/evo_tactics_pack/data/species.yaml`, `data/ecosystems/*.yaml`, `data/foodwebs/*.yaml`, `data/ecosistemi/*.yaml`, `data/npg/*.json` | Dataset pack ufficiale, dovrebbe riflettere core specie/biomi e reti trofiche derivate.                                  | Assente regola esplicita di sincronizzazione con `data/core/**`; non chiaro se dati vengono generati da script o curati manualmente. |
| `packs/evo_tactics_pack/docs/catalog/*.json` (catalogo, glossary, env_traits)                                                             | Cataloghi per generatori web; `scripts/update_evo_pack_catalog.js` arricchisce dati partendo dal pack e meta ecosistema. | Manca dipendenza dichiarata verso i core; non è specificato quando rigenerare rispetto a cambiamenti di traits/biomi core.           |
| `packs/evo_tactics_pack/tools/py/derive_env_traits_v1_0.py`, `derive_crossbiome_traits_v1_0.py`                                           | Script Python per derivare set di trait ambientali/cross-biome a partire dal pack/core.                                  | Assenza di pipeline ufficiale che li esegua prima di build/catalog; log di esecuzione non tracciati.                                 |
| `packs/evo_tactics_pack/validators/rules/*.py`, `packs/evo_tactics_pack/tools/py/run_all_validators.py`                                   | Validator specie/ecosistemi/foodweb; `run_all_validators.py` esegue bundle di check con output in `out/validation/`.     | Non esiste pipeline documentata che li esegua su build pack; outcome solo in `out/validation/last_report.*` senza contesto.          |
| `packs/evo_tactics_pack/out/validation/last_report.{html,json}`                                                                           | Ultima esecuzione validator sul pack.                                                                                    | Non è noto quale comando l'abbia prodotta né la data; serve procedura ripetibile.                                                    |
| `packs/evo_tactics_pack/tools/config/*.yaml`                                                                                              | Configurazioni per validator/generatori (es. preferenze specie).                                                         | Non legate a versioni core; rischio disallineamento se cambia schema core.                                                           |

---

## Derived rigenerabili e tooling

- `packs/evo_tactics_pack/docs/catalog/*.json` → rigenerabili usando script Node esistenti:
  - `scripts/update_evo_pack_catalog.js` (arricchisce catalogo partendo dai dati del pack e metadati ecosistemi).
  - `scripts/sync_evo_pack_assets.js` (sincronizza asset collegati ai dati del pack).
  - `scripts/build_evo_tactics_pack_dist.mjs` / `scripts/preview_evo_tactics_pack_dist.mjs` (impacchettano il pack per distribuzione/anteprima).
- Validator pack (specie/ecosistemi/foodweb) eseguibili con `packs/evo_tactics_pack/tools/py/run_all_validators.py`; risultato atteso in `packs/evo_tactics_pack/out/validation/`.
- Snapshot mock `data/derived/mock/prod_snapshot/*` → rigenerabili manualmente via `rsync -a --exclude 'mock' data/ data/derived/mock/prod_snapshot/` come da README.
- Dataset `data/derived/test-fixtures/minimal` → rigenerazione da definire; necessita script/templating che estragga subset coerente da core (da creare).
- Report `data/derived/analysis/**` (trait coverage/gap, progression) → nessuno script individuato in `scripts/` o `tools/`; servono generatori dedicati (es. `scripts/analysis/trait_coverage` e `scripts/analysis/progression_skydock`) per ridurre rischio divergenza.

---

## Regola standard di rigenerazione (proposta)

1. **Input canonici**: `data/core/**` (specie, traits, biomi, telemetry, missions) + configurazioni `tools/config`/`packs/evo_tactics_pack/tools/config` quando applicabile (dipendenza PATCHSET-01A per catalogo completo).
2. **Pre-check**: validare gli input core con validator/schema esistenti (`scripts/validate.sh`, `scripts/validate-dataset.cjs`, validator Python del pack in modalità report-only – PATCHSET-02A) e bloccare rigenerazione in caso di errori.
3. **Pipeline di derivazione** (input core → output pack/fixture), con script/tool esistenti:
   - a) **Allineare dataset pack** da core → `packs/evo_tactics_pack/data/**`: _gap_ (manca script di sync core→pack; oggi manuale).
   - b) **Derivare trait/env cross-biome** → `packs/evo_tactics_pack/tools/py/derive_env_traits_v1_0.py`, `derive_crossbiome_traits_v1_0.py`: script esistenti ma non orchestrati in pipeline.
   - c) **Arricchire catalogo pack** → `scripts/update_evo_pack_catalog.js` (usa dati pack + meta ecosistemi) e `scripts/sync_evo_pack_assets.js` (asset correlati).
   - d) **Build/anteprima distributivo** → `scripts/build_evo_tactics_pack_dist.mjs` o `scripts/preview_evo_tactics_pack_dist.mjs`.
   - e) **Validator pack** → `packs/evo_tactics_pack/tools/py/run_all_validators.py` (esegue regole in `validators/rules/`); output in `out/validation/` (Prereq PATCHSET-02A per gating CI).
   - f) **Fixture/snapshot** → `rsync` per `data/derived/mock/prod_snapshot/` (fallback deploy); _gap_ per generare dataset sintetici `data/derived/test-fixtures/minimal/` da core.
   - g) **Report analitici** (`data/derived/analysis/**`) → _gap_ totale: servono script dedicati per trait coverage e progression.
4. **Output**: pack aggiornato (`packs/evo_tactics_pack/data/**` + `docs/catalog/**`), fixture (`data/derived/test-fixtures/**`), snapshot (`data/derived/mock/**`), report (`data/derived/analysis/**`). Ogni output deve includere log di comando e timestamp nel README locale.
5. **Tracciabilità**: registrare comando, versione git e checksum principali nel README di ciascuna cartella derived/pack; allegare report validator in `out/validation/` e linkarlo nella documentazione.
6. **Gate CI**: integrare la pipeline in CI dopo validazione manuale del flusso, facendo fallire build se gli output non sono aggiornati rispetto ai core o se i validator del pack falliscono (allineato con PATCHSET-02A).
