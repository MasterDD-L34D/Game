# Template dati trait

Questo documento descrive la struttura canonica dei trait archiviati in
`data/traits`. Il template è definito dallo schema JSON condiviso in
`config/schemas/trait.schema.json` ed è applicato sia ai file singoli sia
all'indice aggregato `data/traits/index.json`.

Guida operativa completa: [docs/traits_scheda_operativa.md](traits_scheda_operativa.md).

Gli obiettivi principali del template sono:

- garantire un set minimo di campi obbligatori e coerenti fra tutte le
  tipologie;
- isolare le sezioni opzionali così da espandere il modello senza rompere le
  pipeline esistenti;
- documentare esempi rappresentativi per ogni macro-tipologia;
- allineare label e descrizioni al [glossario centralizzato](../data/core/traits/glossary.json)
  così che gli script di sincronizzazione possano propagare automaticamente i
  testi approvati nelle localizzazioni.

> **Nota:** prima di aprire una PR assicurati che ogni nuovo trait sia presente
> nel glossario (`data/core/traits/glossary.json`) con almeno `label_it`,
> `label_en`, `description_it` e `description_en`. Il flusso dettagliato è
> descritto in [docs/catalog/trait_reference.md](catalog/trait_reference.md).

## Schema base obbligatorio

Il blocco sottostante riassume i campi obbligatori. Tutti i valori devono
rispettare le regole indicate e sono validati automaticamente dal comando
`python tools/py/trait_template_validator.py`.

| Campo                             | Tipo          | Vincoli principali                                   | Descrizione                                                              |
| --------------------------------- | ------------- | ---------------------------------------------------- | ------------------------------------------------------------------------ |
| `id`                              | string        | `^[a-z0-9_]+$`, deve coincidere con il nome del file | Identificatore canonico.                                                 |
| `label`                           | string        | non vuota                                            | Nome visualizzato (deve avere controparte nel glossario/localizzazioni). |
| `famiglia_tipologia`              | string        | non vuota (`Macro/Sub-tipo`)                         | Cluster funzionale.                                                      |
| `fattore_mantenimento_energetico` | string        | non vuota                                            | Costo narrativo/energetico.                                              |
| `tier`                            | string        | `T1`…`T6`                                            | Gradino di progressione.                                                 |
| `slot`                            | array[string] | ciascun elemento `^[A-Z]$`, array vuoto consentito   | Slot occupati.                                                           |
| `sinergie`                        | array[string] | elementi `^[a-z0-9_]+$`                              | Trait compatibili.                                                       |
| `conflitti`                       | array[string] | elementi `^[a-z0-9_]+$`                              | Trait incompatibili.                                                     |
| `data_origin`                     | string        | `^[a-z0-9_]+$`                                       | Fonte editoriale/glossario (es. `controllo_psionico`).                   |
| `mutazione_indotta`               | string        | non vuota                                            | Sintesi dell'adattamento.                                                |
| `uso_funzione`                    | string        | non vuota                                            | Funzione in gioco.                                                       |
| `spinta_selettiva`                | string        | non vuota                                            | Motivazione evolutiva/tattica.                                           |

Quando un campo testuale viene introdotto (es. `description`), ricordati di
aggiungerlo al glossario e di eseguire `python scripts/sync_trait_locales.py`
per riflettere la modifica nelle localizzazioni.

### Scheletro minimo

```json
{
  "id": "example_trait",
  "label": "Example Trait",
  "famiglia_tipologia": "Offensivo/Assalto",
  "fattore_mantenimento_energetico": "Basso (Passivo)",
  "tier": "T1",
  "slot": [],
  "sinergie": [],
  "conflitti": [],
  "data_origin": "controllo_psionico",
  "mutazione_indotta": "Descrizione sintetica.",
  "uso_funzione": "Uso principale.",
  "spinta_selettiva": "Motivazione principale."
}
```

## Sezioni opzionali

| Campo/Blocco           | Dettagli                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `slot_profile`         | Oggetto con chiavi obbligatorie `core` e `complementare`. Descrive la specializzazione primaria e secondaria del tratto.                                                             |
| `requisiti_ambientali` | Array di vincoli contestuali. Ogni elemento include `condizioni.biome_class`, la sorgente (`fonte`) e facoltativamente `capacita_richieste` e `meta` (`expansion`, `tier`, `notes`). |
| `biome_tags`           | Array di biomi affini (stringhe `^[a-z0-9_]+$`) usati per indicare ambienti secondari o sinergie narrative.                                                                          |
| `usage_tags`           | Array di tag tattici (`scout`, `breaker`, `tank`, ecc.) normalizzati (`^[a-z0-9_]+$`) per filtri UI e analytics.                                                                     |
| `completion_flags`     | Oggetto di flag booleani (es. `has_biome`, `has_species_link`) per tracciare rapidamente lacune editoriali.                                                                          |
| `debolezza`            | Stringa opzionale per limiti intrinseci o vulnerabilità.                                                                                                                             |
| `sinergie_pi`          | Oggetto con `co_occorrenze`, `forme`, `tabelle_random`, `combo_totale`. Serve per gli strumenti di pianificazione PI.                                                                |

> **Ricorda:** assegna sempre `data_origin` utilizzando gli slug pubblicati nel glossario editoriale (`docs/editorial/trait_sources.json`). Lo script `python tools/py/normalize_trait_style.py` può aggiornare i file esistenti, ma i trait nuovi devono già riferirsi alla sorgente corretta prima della PR.

### Sezioni annidate

```json
{
  "slot_profile": {
    "core": "offensivo",
    "complementare": "assalto"
  },
  "biome_tags": ["laguna_bioreattiva", "foresta_miceliale"],
  "requisiti_ambientali": [
    {
      "condizioni": { "biome_class": "foresta_acida" },
      "fonte": "env_to_traits",
      "meta": {
        "expansion": "coverage_q4_2025",
        "tier": "T1",
        "notes": "Contestualizza il debutto narrativo."
      }
    }
  ],
  "usage_tags": ["scout"],
  "data_origin": "coverage_q4_2025",
  "completion_flags": {
    "has_biome": true,
    "has_species_link": false
  },
  "debolezza": "Indicazioni su trade-off o limiti.",
  "sinergie_pi": {
    "co_occorrenze": [],
    "forme": [],
    "tabelle_random": [],
    "combo_totale": 0
  }
}
```

## Riepilogo dei campi per tipologia

Lo script `tools/py/collect_trait_fields.py` genera il file
`reports/trait_fields_by_type.json`, che riporta per ogni tipologia
(`famiglia_tipologia`) il numero di trait e l'elenco dei campi attualmente in
uso. È utile per controllare quando nuove proprietà vengono introdotte in una
sola sezione.

Esempio estratto:

```json
{
  "Offensivo/Assalto": {
    "trait_count": 9,
    "fields": [
      "conflitti",
      "debolezza",
      "famiglia_tipologia",
      "fattore_mantenimento_energetico",
      "id",
      "label",
      "mutazione_indotta",
      "requisiti_ambientali",
      "sinergie",
      "sinergie_pi",
      "slot",
      "slot_profile",
      "spinta_selettiva",
      "tier",
      "uso_funzione"
    ]
  }
}
```

Rigenerare il riepilogo dopo ogni modifica sostanziale:

```bash
python tools/py/collect_trait_fields.py -o reports/trait_fields_by_type.json
```

## Esempi per macro-tipologia

La tabella seguente collega ogni macro-tipologia a un trait reale nel
repository. Tutti gli esempi rispettano lo schema base e includono le sezioni
opzionali quando rilevanti.

| Macro-tipologia | Sottotipi disponibili                                                         | Trait di esempio (ID — Label)                                                  | Percorso                                                        | Uso/funzione                                                                           |
| --------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Difesa          | Strutturale, Termoregolazione                                                 | `armatura_pietra_planare` — Armatura di Pietra Planare                         | `data/traits/difesa/armatura_pietra_planare.json`               | Offre schermatura massiva e ancoraggio durante le aperture dimensionali.               |
| Digestivo       | Alimentare, Escretorio, Metabolico                                            | `filamenti_digestivi_compattanti` — Filamento materiali digeriti               | `data/traits/digestivo/filamenti_digestivi_compattanti.json`    | Espulsione compatta e ordinata di scorie.                                              |
| Escretorio      | Psichico                                                                      | `spore_psichiche_silenziate` — Spora Psichica Silenziosa                       | `data/traits/escretorio/spore_psichiche_silenziate.json`        | Indurre uno stato di confusione o letargia negli individui vicini.                     |
| Esplorazione    | Tattico                                                                       | `pathfinder` — Pathfinder                                                      | `data/traits/strategia/pathfinder.json`                         | Ottimizza esplorazione e controllo mappe multi-bioma.                                  |
| Flessibile      | Generico                                                                      | `random` — Trait Random                                                        | `data/traits/strategia/random.json`                             | Slot jolly per testing o pareggiare budget PI quando serve varietà.                    |
| Idrostatico     | Locomotorio                                                                   | `sacche_galleggianti_ascensoriali` — Sacche galleggianti ascensoriali          | `data/traits/idrostatico/sacche_galleggianti_ascensoriali.json` | Controllo preciso della profondità e del movimento verticale.                          |
| Locomotorio     | Adattivo, Difensivo, Mobilità, Predatorio, Prensile, Supporto                 | `ali_ioniche` — Ali Ioniche                                                    | `data/traits/locomotorio/ali_ioniche.json`                      | Ottimizza scatti direzionali e transizioni rapide fra livelli verticali.               |
| Metabolico      | Difensivo, Resilienza                                                         | `circolazione_bifasica_palude` — Circolazione Bifasica di Palude               | `data/traits/metabolico/circolazione_bifasica_palude.json`      | Gestisce due circuiti circolatori per filtrare veleni e mantenere prestazioni elevate. |
| Mobilità        | Cinetico                                                                      | `zampe_a_molla` — Zampe a Molla                                                | `data/traits/locomotorio/zampe_a_molla.json`                    | Dash esplosivi per mantenere il ritmo di ingaggio o disimpegno.                        |
| Nervoso         | Omeostatico                                                                   | `sonno_emisferico_alternato` — Dormire con solo metà cervello alla volta       | `data/traits/nervoso/sonno_emisferico_alternato.json`           | Vigilanza continua pur garantendo riposo.                                              |
| Offensivo       | Assalto, Chimico, Cinetico, Controllo                                         | `antenne_flusso_mareale` — Antenne Flusso Mareale                              | `data/traits/offensivo/antenne_flusso_mareale.json`             | Aumenta penetrazione e burst durante finestre di vulnerabilità.                        |
| Respiratorio    | Aerobico, Osmoregolazione, Propulsivo, Protezione, Termoregolazione           | `branchie_osmotiche_salmastra` — Branchie Osmotiche Salmastre                  | `data/traits/respiratorio/branchie_osmotiche_salmastra.json`    | Bilancia sali e tossine sfruttando microvalvole controllate psionicamente.             |
| Riproduttivo    | Locomotorio                                                                   | `nucleo_ovomotore_rotante` — Uovo rotaia, uovo grande e uova piccole dentro... | `data/traits/riproduttivo/nucleo_ovomotore_rotante.json`        | Organo motorio rotante per spostamenti rapidi in assetto riproduttivo.                 |
| Sensoriale      | Alimentare, Analitico, Navigazione, Nervoso, Offensivo, Supporto, Visivo      | `ali_fulminee` — Ali Fulminee                                                  | `data/traits/sensoriale/ali_fulminee.json`                      | Amplifica percezioni multi-spettro e fornisce orientamento tattile immediato.          |
| Simbiotico      | Comunicazione, Cooperativo, Difensivo, Nervoso, Nutrizione, Supporto, Utility | `antenne_reagenti` — Antenne Reagenti                                          | `data/traits/simbiotico/antenne_reagenti.json`                  | Stabilizza reti simbiotiche e trasferimenti enzimo-elettrotonici.                      |
| Strategico      | Psionico, Tattico                                                             | `antenne_microonde_cavernose` — Antenne Microonde Cavernose                    | `data/traits/strategia/antenne_microonde_cavernose.json`        | Sblocca pattern predittivi per trappole e imboscate coordinate.                        |
| Strutturale     | Adattivo, Difensivo, Locomotorio, Omeostatico, Sensoriale                     | `antenne_tesla` — Antenne Tesla                                                | `data/traits/strutturale/antenne_tesla.json`                    | Regola densità e flessibilità per sopportare cambi repentini.                          |
| Supporto        | Coordinativo, Difesa, Empatico, Logistico                                     | `antenne_eco_turbina` — Antenne Eco Turbina                                    | `data/traits/supporto/antenne_eco_turbina.json`                 | Distribuisce riserve e modulazioni ritmiche per mantenere coesione.                    |
| Tegumentario    | Difensivo, Energetico, Idratazione                                            | `ali_membrana_sonica` — Ali Membrana Sonica                                    | `data/traits/difensivo/ali_membrana_sonica.json`                | Crea rivestimenti adattivi contro agenti ostili e bombardamenti ambientali.            |

## Strumenti di validazione

- `python tools/py/trait_template_validator.py` — valida tutti i file in
  `data/traits` e l'indice `index.json` rispetto allo schema aggiornato.
  Utilizzare `--summary` per stampare il riepilogo dei campi per tipologia.
- `python tools/py/collect_trait_fields.py -o reports/trait_fields_by_type.json`
  — aggiorna il report dei campi utilizzato per la documentazione e per il
  monitoraggio delle variazioni.

Integrare entrambi i comandi nella pipeline di sviluppo riduce il rischio di
incongruenze tra tipologie e assicura che ogni nuovo tratto rispetti il template
stabilito.
