# REF_PACKS_AND_DERIVED – Pack, snapshot e fixture

Versione: 0.1 (bozza)
Data: 2025-11-23
Owner: agente **archivist** (supporto: dev-tooling, coordinator)
Stato: DRAFT – separazione core vs derived

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

- `REF_REPO_SOURCES_OF_TRUTH` per i percorsi canonici dei core da cui rigenerare.
- `REF_TOOLING_AND_CI` per definire script e workflow che producono/validano pack e derived.
- `REF_REPO_MIGRATION_PLAN` per decidere quando archiviare o rigenerare specifici derived.
- Supporto di dev-tooling per standardizzare i comandi di rigenerazione e di coordinator per le priorità.

## Prossimi passi

1. Redigere una tabella dei pack ufficiali e derived con colonne: percorso, tipo (ufficiale/snapshot/fixture/legacy), origine dai core, owner, rischio.
2. Documentare il processo di rigenerazione di `packs/evo_tactics_pack` e verificare se esiste tooling automatizzato o manuale.
3. Inventariare `data/derived/**` specificando quali directory sono fixture di test e quali snapshot legacy da archiviare.
4. Collegare ciascun derived ai test/CI che lo consumano, segnando l’impatto di eventuale rigenerazione.
5. Proporre criteri di deprecazione/archiviazione per pack/derived non più supportati, da attuare nelle patch successive.

---

## Changelog

- 2025-11-23: struttura iniziale separazione core vs derived (archivist).

---

## Inventario per area

### `data/core/**`

| Percorso / file chiave                                           | Relazione di derivazione                                                                         | Lacune note                                                                                                                |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `data/core/species.yaml` + `species/aliases.json`                | Fonte primaria del catalogo specie e mapping alias; atteso come sorgente per pack e fixture.     | Mancano note su release/tag a cui allineare derived e pack; nessuna checklist di validazione pre-rigenerazione.            |
| `data/core/traits/glossary.json`, `traits/biome_pools.json`      | Glossari e pool biomi da cui derivare cataloghi e coperture env-trait.                           | Non è documentato come generare output di copertura (es. `env_traits.json` nel pack) né quali script usarli.               |
| `data/core/biomes.yaml`, `biome_aliases.yaml`                    | Sorgente canonica per biomi e alias; dovrebbe alimentare ecosistemi/foodweb nel pack.            | Assenza di nota sul mapping verso file `data/ecosystems/*.yaml` del pack; non c'è pipeline per garantire sincronizzazione. |
| `data/core/mating.yaml`, `telemetry.yaml`, `game_functions.yaml` | Tabelle core per compatibilità, telemetria e funzioni di gioco.                                  | Nessun consumer dichiarato nei pack/derived; serve mappa utilizzi.                                                         |
| `data/core/missions/skydock_siege.yaml`                          | Missione core che dovrebbe essere referenziata nei report `data/derived/analysis/progression/*`. | Mancano script riproducibili per rigenerare i report progression da questa fonte.                                          |
| `data/core/hud/layout.yaml`                                      | Layout HUD core.                                                                                 | Non è chiaro se sia utilizzato in pack o fixture; assente nota di derivazione.                                             |

### `data/derived/**`

| Percorso / file chiave                                                                                                | Relazione di derivazione                                                                     | Lacune note                                                                                    |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `analysis/trait_coverage_matrix.csv`, `trait_env_mapping.json`, `trait_gap_report.json`, `trait_coverage_report.json` | Dovrebbero essere calcolati da `data/core/traits/**` e specie core per analisi QA.           | Non è documentato lo script di generazione; manca timestamp/owner e legame con i test.         |
| `analysis/progression/skydock_siege_xp*.{csv,json}`                                                                   | Snapshot analitico presumibilmente derivato da `data/core/missions/skydock_siege.yaml`.      | Nessuna procedura per rigenerare i report; rischio divergenza con missione core.               |
| `exports/qa-telemetry-export.json`, `exports/*conversation.json`                                                      | Export conversazioni/telemetria da sessioni QA, probabilmente generate da strumenti esterni. | Origine e formato non documentati; non chiaro se rigenerabili o solo archivi.                  |
| `mock/prod_snapshot/*` (biomes, species, telemetry, mating, packs)                                                    | Snapshot manuale della directory `data/` tramite rsync come fallback deploy.                 | Rigenerazione descritta solo in README con comando rsync; manca versione/controllo integrità.  |
| `test-fixtures/minimal/*`                                                                                             | Dataset sintetico per test frontend (`docs/test-interface`).                                 | Procedura di aggiornamento non documentata; necessaria nota sugli impatti sui test end-to-end. |

### `packs/evo_tactics_pack/**`

| Percorso / file chiave                                                                                             | Relazione di derivazione                                                                                         | Lacune note                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `data/species.yaml`, `data/ecosystems/*.yaml`, `data/foodwebs/*.yaml`, `data/ecosistemi/*.yaml`, `data/npg/*.json` | Dataset pack ufficiale, dovrebbe riflettere core specie/biomi e reti trofiche derivate.                          | Assente regola esplicita di sincronizzazione con `data/core/**`; non chiaro se dati vengono generati da script o curati manualmente. |
| `docs/catalog/*.json` (catalogo, glossary, env_traits)                                                             | Cataloghi per generatori web; `update_evo_pack_catalog.js` arricchisce dati partendo dal pack e meta_ecosistema. | Manca dipendenza dichiarata verso core; non è specificato quando rigenerare rispetto a cambiamenti di traits/biomi core.             |
| `validators/rules/*.py`, `tools/py/*.py`                                                                           | Validator e utilità per specie/ecosistemi/foodweb; `run_all_validators.py` esegue bundle di check.               | Non esiste pipeline documentata che li esegua su build pack; outcome solo in `out/validation/last_report.*` senza contesto.          |
| `out/validation/last_report.{html,json}`                                                                           | Ultima esecuzione validator sul pack.                                                                            | Non è noto quale comando l'abbia prodotto né la data; serve procedura ripetibile.                                                    |
| `tools/config/*.yaml`                                                                                              | Configurazioni per validator/generatori (es. preferenze specie).                                                 | Non legate a versioni core; rischio disallineamento se cambia schema core.                                                           |

---

## Derived rigenerabili e tooling

- `packs/evo_tactics_pack/docs/catalog/*.json` → rigenerabili usando script Node esistenti:
  - `scripts/update_evo_pack_catalog.js` (arricchisce catalogo partendo dai dati del pack e metadati ecosistemi).
  - `scripts/sync_evo_pack_assets.js` (sincronizza asset collegati ai dati del pack).
  - `scripts/build_evo_tactics_pack_dist.mjs` / `scripts/preview_evo_tactics_pack_dist.mjs` (impacchettano il pack per distribuzione/anteprima).
- Validator pack (specie/ecosistemi/foodweb) eseguibili con `packs/evo_tactics_pack/tools/py/run_all_validators.py`; risultato atteso in `out/validation/`.
- Snapshot mock `data/derived/mock/prod_snapshot/*` → rigenerabili manualmente via `rsync -a --exclude 'mock' data/ data/derived/mock/prod_snapshot/` come da README.
- Dataset `data/derived/test-fixtures/minimal` → rigenerazione da definire; necessita script/templating che estragga subset coerente da core (da creare).
- Report `data/derived/analysis/**` (trait coverage/gap, progression) → nessuno script individuato in `scripts/` o `tools/`; servono generatori dedicati (es. `scripts/analysis/trait_coverage` e `scripts/analysis/progression_skydock`) per ridurre rischio divergenza.

---

## Regola standard di rigenerazione (proposta)

1. **Input canonici**: `data/core/**` (specie, traits, biomi, telemetry, missions) + configurazioni `tools/config`/`packs/evo_tactics_pack/tools/config` quando applicabile.
2. **Pre-check**: validare gli input core con validator/schema esistenti (es. `scripts/validate.sh`, `tools/traits/`, validator Py del pack) e bloccare rigenerazione in caso di errori.
3. **Pipeline di derivazione**:
   - a) Generare dataset pack: eseguire script di arricchimento/catalogo (`scripts/update_evo_pack_catalog.js`), poi build/anteprima (`scripts/build_evo_tactics_pack_dist.mjs` o `scripts/preview_evo_tactics_pack_dist.mjs`), infine validator `packs/evo_tactics_pack/tools/py/run_all_validators.py` con output in `packs/evo_tactics_pack/out/validation/`.
   - b) Generare fixture/snapshot: se serve fallback deploy, copiare core → `data/derived/mock/prod_snapshot/` con rsync; per fixture test creare subset riproducibile (script da aggiungere) che esporti pacchetti minimal in `data/derived/test-fixtures/`.
   - c) Generare report analitici: introdurre script dedicati che leggano core (es. traits/missioni) e scrivano in `data/derived/analysis/` con metadati timestamp/owner.
4. **Output**: pack aggiornato (`packs/evo_tactics_pack/data/**` + `docs/catalog/**`), fixture (`data/derived/test-fixtures/**`), snapshot (`data/derived/mock/**`), report (`data/derived/analysis/**`). Ogni output deve includere log di comando e timestamp nel README locale.
5. **Tracciabilità**: registrare comando, versione git e checksum principali nel README di ciascuna cartella derived/pack; allegare report validator in `out/validation/` e linkarlo nella documentazione.
6. **Gate CI**: integrare la pipeline in CI dopo validazione manuale del flusso, facendo fallire build se gli output non sono aggiornati rispetto ai core o se i validator del pack falliscono.
