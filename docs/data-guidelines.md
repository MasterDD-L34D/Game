# Dataset YAML di gioco

Questo documento elenca i dataset archiviati in `data/` e definisce le regole operative per mantenerli coerenti.

## Dataset principali

| File | Chiave radice | Contenuto | Note |
| --- | --- | --- | --- |
| `data/biomes.yaml` | `biomes`, `vc_adapt`, `mutations`, `frequencies` | Parametri di difficoltà, adattamenti e tabelle mutazioni per i biomi. | Gli array `t0_table_d12` e `t1_table_d8` rappresentano risultati di dadi e vanno mantenuti ordinati secondo il valore del dado. |
| `data/mating.yaml` | `compat_forme`, `compat_ennea`, `actions_appeal`, `nest_standards`, `hybrid_rules` | Regolette di compatibilità tra forme MBTI/enneagramma, valutazioni azioni e standard del nido. | Le chiavi MBTI devono rimanere in maiuscolo; le azioni usano snake_case. |
| `data/packs.yaml` | `pi_shop`, `random_general_d20`, `forms` | Tabelledi costo e generazione pacchetti (d20, bias per forma). | Le forme MBTI sono sezioni di secondo livello sotto `forms`. |
| `data/telemetry.yaml` | `telemetry`, `indices`, `mbti_axes`, `ennea_themes`, `pe_economy` | Configurazioni per la telemetria in gioco, formule e ponderazioni. | Le formule sono stringhe e devono rispettare la sintassi usata in backend analytics. |

## Regole di naming

* I file YAML devono essere denominati con snake_case (`<nome>.yaml`) e la directory `data/` contiene solo dataset con questa convenzione.
* Ogni chiave di primo livello deve essere in snake_case (ad eccezione di identificatori esterni come tipi MBTI/enneagramma che restano in MAIUSCOLO o includono parentesi).
* Le liste di valori tabellari usano `lower_snake_case` o `CamelCase` solo quando riprendono nomi propri già stabiliti nel design.
* I range di dadi si rappresentano come stringhe `"1-3"` o valori puntuali (`"11"`).

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

## Sincronizzazione con Google Sheet

Per mantenere allineati gli spreadsheet collaborativi con gli YAML:

1. Copia il contenuto di `scripts/driveSync.gs` in un progetto Apps Script collegato alla cartella Drive che contiene i file YAML.
2. Imposta `CONFIG.folderId` e, se desideri, personalizza il prefisso delle tab nel foglio (`CONFIG.sheetNamePrefix`).
3. Esegui manualmente `convertYamlToSheets` per generare la prima versione degli Spreadsheet.
4. Per automatizzare gli aggiornamenti, esegui la funzione `ensureAutoSyncTrigger`. Crea (se mancante) un trigger orario per richiamare `convertYamlToSheets` secondo l'intervallo configurato in `CONFIG.autoSync`.
5. Se serve rimuovere i trigger creati automaticamente, esegui `removeAutoSyncTriggers`.

Quando si modificano i dataset in `data/`, rieseguire la validazione locale prima di lanciare la sincronizzazione verso Google Sheet.
