# Dataset YAML di gioco

Questo documento elenca i dataset archiviati in `data/` e definisce le regole operative per mantenerli coerenti.

## Dataset principali

| File | Chiave radice | Contenuto | Note |
| --- | --- | --- | --- |
| `data/core/biomes.yaml` | `biomes`, `vc_adapt`, `mutations`, `frequencies` | Parametri di difficoltà, adattamenti e tabelle mutazioni per i biomi. | Gli array `t0_table_d12` e `t1_table_d8` rappresentano risultati di dadi e vanno mantenuti ordinati secondo il valore del dado. La struttura del catalogo biomi è descritta in `config/schemas/biome.schema.yaml`. |
| `data/core/mating.yaml` | `compat_forme`, `compat_ennea`, `actions_appeal`, `nest_standards`, `hybrid_rules` | Regolette di compatibilità tra forme MBTI/enneagramma, valutazioni azioni e standard del nido. | Le chiavi MBTI devono rimanere in maiuscolo; le azioni usano snake_case. |
| `data/packs.yaml` | `pi_shop`, `random_general_d20`, `forms` | Tabelledi costo e generazione pacchetti (d20, bias per forma). | Le forme MBTI sono sezioni di secondo livello sotto `forms`. |
| `data/core/telemetry.yaml` | `telemetry`, `indices`, `mbti_axes`, `ennea_themes`, `pe_economy` | Configurazioni per la telemetria in gioco, formule e ponderazioni. | Le formule sono stringhe e devono rispettare la sintassi usata in backend analytics. |
| `data/core/species.yaml` | `catalog`, `global_rules`, `species` | Catalogo delle parti, sinergie e profili di specie giocabili. | Validato da `config/schemas/species.schema.yaml`; i campi `default_parts` e `trait_plan` accettano solo slug definiti nel catalogo. |
| `data/traits/index.json` | `traits` | Catalogo completo dei tratti selezionabili. | Validato da `config/schemas/catalog.schema.json` e `config/schemas/trait.schema.json`. |

## Schemi canonici

Gli schemi JSON/YAML pubblicati in `config/schemas/` fungono da contratto per i dataset condivisi con il team. Ogni schema esplicita le chiavi ammesse, il tipo dei valori e le relazioni più importanti:

* `catalog.schema.json` importa `trait.schema.json` e stabilisce la struttura dei cataloghi di tratti (versionamento, riferimenti al glossario e forma delle entry).
* `biome.schema.yaml` definisce il formato del catalogo biomi, con vincoli su affissi, severità degli hazard e campi narrativi.
* `species.schema.yaml` descrive cataloghi, parti, sinergie e profili di specie, assicurando che slot e riferimenti usino slug canonici.

Gli schemi sono utilizzati direttamente dagli script di audit per convalidare ogni modifica e facilitano l'onboarding dei contributor.

## Regole di naming

* I file YAML devono essere denominati con snake_case (`<nome>.yaml`) e la directory `data/` contiene solo dataset con questa convenzione.
* Ogni chiave di primo livello deve essere in snake_case (ad eccezione di identificatori esterni come tipi MBTI/enneagramma che restano in MAIUSCOLO o includono parentesi).
* Le liste di valori tabellari usano `lower_snake_case` o `CamelCase` solo quando riprendono nomi propri già stabiliti nel design.
* I range di dadi si rappresentano come stringhe `"1-3"` o valori puntuali (`"11"`).

### Slug e identificatori

* Gli slug di tratti, biomi, specie, sinergie e parti usano sempre `lower_snake_case` (`^[a-z0-9_]+$`). Lo stesso formato vale per le chiavi degli slot (`locomotion`, `offense`, ecc.) e per i riferimenti incrociati (`trait_plan`, `default_parts`).
* Gli slot funzionali dei tratti (`slot` nel catalogo) sono lettere maiuscole singole (`A`, `B`, `C`, ...). Usare `slot_profile.core`/`complementare` per specificare l'archetipo tattico e mantenere la corrispondenza con le forme dei pack.
* Gli identificatori di sinergia (`catalog.synergies[].id`, `trait_plan.synergies[]`) e dei contatori (`global_rules.counters_reference[].counter`) adottano lo stesso slugging per garantire lookup deterministici nelle pipeline.

## Formato YAML

* Indentazione con due spazi.
* Le mappe inline (`{chiave: valore}`) sono consentite solo per coppie corte; preferire il formato multilinea quando si superano tre elementi.
* Gli array sono resi con `-` oppure inline se costituiti da stringhe corte.
* Le stringhe con spazi o caratteri speciali vanno racchiuse tra virgolette.

## Validazione automatica

È disponibile lo script `tools/py/validate_datasets.py` per eseguire controlli statici sui file YAML.

```bash
pip install pyyaml
python tools/py/validate_datasets.py
```

Lo script verifica:

1. Che i file YAML in `data/` rispettino le chiavi attese e la struttura base descritta sopra.
2. Che le chiavi MBTI e gli identificatori Enneagramma siano unici.
3. Che i range di dadi in `random_general_d20` siano ordinati e senza sovrapposizioni.
4. Che le formule riportate in `telemetry.yaml` contengano soltanto caratteri ammessi.

Il comando esce con codice diverso da zero se vengono individuati errori, così da integrarsi facilmente in CI o nei controlli pre-commit.

### Audit schema

Lo script `scripts/trait_audit.py` esegue anche la validazione contro gli schemi canonici e genera `reports/schema_validation.json` con l'elenco di errori e warning per ciascun file. Per rigenerare i report:

```bash
python scripts/trait_audit.py
```

Il report JSON riporta, per ogni dataset, lo stato (`ok`, `warning`, `error`) e l'elenco dei problemi rilevati. Viene verificato automaticamente con `python scripts/trait_audit.py --check` durante le review.

### Inventario dataset e duplicati incoming

Per avere una fotografia dello stato dei dataset e individuare eventuali file duplicati in `incoming/` è disponibile lo script `tools/audit/data_health.py`. Il comando seguente produce l'elenco degli errori a terminale e salva un riepilogo strutturato in `reports/data_health_summary.json`:

```bash
python tools/audit/data_health.py --incoming --report reports/data_health_summary.json
```

Il report contiene per ogni regola monitorata:

* percorso relativo, formato e descrizione;
* eventuale `schema_version` rilevata e quella attesa;
* lista di problemi riscontrati (chiavi mancanti, dipendenze assenti, errori di parsing);
* l'elenco dei duplicati trovati nella cartella `incoming/`, utile per ripulire le fonti prima dell'ingestione.

Il campo `status` sintetizza il risultato complessivo (`ok`, `error` o `missing`) e può essere utilizzato dal CI o dagli script editoriali per bloccare la pubblicazione se l'audit fallisce.

## Sincronizzazione con Google Sheet

Per mantenere allineati gli spreadsheet collaborativi con gli YAML:

1. Copia il contenuto di `scripts/driveSync.gs` in un progetto Apps Script collegato alla cartella Drive che contiene i file YAML.
2. Imposta `CONFIG.folderId` e, se desideri, personalizza il prefisso delle tab nel foglio (`CONFIG.sheetNamePrefix`).
3. Esegui manualmente `convertYamlToSheets` per generare la prima versione degli Spreadsheet.
4. Per automatizzare gli aggiornamenti, esegui la funzione `ensureAutoSyncTrigger`. Crea (se mancante) un trigger orario per richiamare `convertYamlToSheets` secondo l'intervallo configurato in `CONFIG.autoSync`.
5. Se serve rimuovere i trigger creati automaticamente, esegui `removeAutoSyncTriggers`.

Quando si modificano i dataset in `data/`, rieseguire la validazione locale prima di lanciare la sincronizzazione verso Google Sheet.
