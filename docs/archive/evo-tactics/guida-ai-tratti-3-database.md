---
title: Evo-Tactics · Guida Database Tratti
description: Integrazione del pacchetto Evo-Tactics nel Game Database con focus su import, migrazioni e tassonomia.
tags:
  - evo-tactics
  - traits
  - database
archived: true
updated: 2025-11-11
---

# Guida Evo-Tactics per Game-Database {#evo-guida-ai-tratti-3-database}

## Introduzione {#evo-guida-ai-tratti-3-database-introduzione}

Questa guida fornisce una panoramica completa di **Evo Tactics Pack v2**
e spiega come integrare la tassonomia criptozoologica nel repository
**Game‑Database**. Il pacchetto Evo Tactics non verrà distribuito come
archivio, quindi questa guida funge da _single source of truth_:
contiene tutte le informazioni necessarie per definire specie, tratti,
ecotipi ed importare i cataloghi direttamente nel database. È pensata
per essere posizionata nella cartella `docs/` del progetto (ad es.
`docs/evo‑tactics‑guide.md`) e per essere letta da sviluppatori che
lavorano sia sul backend (Prisma/PostgreSQL) sia sulla dashboard.

### Cosa troverai in questa guida {#evo-guida-ai-tratti-3-database-cosa-troverai-in-questa-guida}

1.  **Specifiche v2** per specie e tratti: struttura delle schede JSON,
    campi obbligatori e opzionali.
2.  **Regole di nomenclatura e stile**: come formare i nomi binomiali,
    le denominazioni dei tratti, le funzioni primarie e le descrizioni.
3.  **Procedura di migrazione v1→v2**: come aggiornare eventuali dati
    legacy ai nuovi schemi, con conversione di unità secondo UCUM e
    normalizzazione dei campi.
4.  **Struttura del pacchetto**: organizzazione delle cartelle
    (`species/`, `traits/`, `ecotypes/`, `docs/`, `templates/`) e
    strumenti di validazione.
5.  **Ecotipi e varianti**: come definire varianti locali delle specie
    (es. “Gole Ventose” per _Elastovaranus hydrus_) e come codificarne i
    delta rispetto ai tratti base.
6.  **Integrare il catalogo nel database**: indicazioni per utilizzare
    gli script di import (`npm run evo:import`) e aggiornare la
    tassonomia senza pacchetti esterni.
7.  **Roadmap operativa**: consigli pratici per inserire i nuovi
    documenti nel repository, aggiornare la documentazione esistente
    (`docs/evo-import.md`, `README.md`) e sfruttare i nuovi strumenti di
    validazione.

Se hai lavorato con la versione originale dell’Evo Tactics Pack, questa
guida ti mostrerà come migrare i dati al nuovo formato e come
organizzare una libreria di documenti autosufficiente.

## Standard v2 per specie e tratti {#evo-guida-ai-tratti-3-database-standard-v2-per-specie-e-tratti}

Il pacchetto v2 definisce due schemi JSON (Draft 2020‑12) per
rappresentare **Specie** e **Tratti** in maniera strutturata e
riusabile. Di seguito vengono riassunti i campi più importanti; per un
riferimento completo vedi gli schemi in `templates/species.schema.json`
e `templates/trait.schema.json`.

### Schema specie (`species/<genus_species>.json`) {#evo-guida-ai-tratti-3-database-schema-specie-species-genus-species-json}

Ogni file di specie deve includere almeno:

- `scientific_name`: nome binomiale in corsivo (_Genus species_), con
  radici greco‑latine coerenti con la “firma funzionale”.
  L’abbreviazione a tre lettere (`EHY` per _Elastovaranus hydrus_) viene
  usata per i codici dei tratti.
- `common_names`: uno o due nomi volgari evocativi (es.
  “Viverna‑Elastico”, “Ghiotton‑Scudo”).
- `classification`: macroclasse (`Mammalia`, `Reptilia`, `Artropode`…) e
  habitat/ecotopo principale.
- `functional_signature`: 1–2 frasi operative che descrivono ciò che la
  specie fa meglio (ad es. “attacco a proiettile con inoculazione
  multipla” per _Elastovaranus hydrus_).
- `visual_description`: breve descrizione dell’aspetto (5–8 righe) con
  forma, posture, proporzioni, colori, texture e gesti tipici.
- `risk_profile`: pericolosità (0–3) e vettori (tossine, patogeni, onde
  d’urto, ecc.).
- `interactions`: prede, predatori, eventuali simbiosi/parassitismi; i
  patti biologici devono essere descritti.
- `constraints`: almeno due limitazioni o trade‑off (costi metabolici
  elevati, necessità di ambienti specifici, vulnerabilità a
  contromisure).
- `sentience_index`: livello di senzienza da T0 a T5 (o T6 nelle
  espansioni future) secondo la [scala di riferimento](../README_SENTIENCE.md).
- `ecotypes`: array di etichette delle varianti ecologiche; i dettagli
  sono separati in `ecotypes/<genus_species>_ecotypes.json`.
- `trait_refs`: array di codici tratto (5–9 tratti) che coprono gli
  assi: locomozione/manipolazione, alimentazione/digestione,
  sensi/percezione, attacco/difesa, metabolismo/termoregolazione,
  riproduzione/ciclo vitale.

### Schema tratto (`traits/TR-XXXX.json`) {#evo-guida-ai-tratti-3-database-schema-tratto-traits-tr-xxxx-json}

Ogni tratto è un’unità atomica riutilizzabile e include:

- `trait_code`: codice univoco `TR-0000` (per il catalogo generale) o
  `SPEC_ABBR-TRxx` se referenziato da una singola specie.
- `label`: denominazione criptozoologica in forma “Sostantivo +
  Qualificatore” (es. “Scudo Gluteale Cheratinizzato”).
- `famiglia_tipologia`: cluster funzionale (Difensivo/Corazza,
  Sensoriale/Tatto‑Vibro, Locomotivo/Balistico…).
- `fattore_mantenimento_energetico`: Basso/Medio/Alto, indicativo del
  costo metabolico per mantenere il tratto.
- `tier`: da T1 a T5 (o T6) per indicare potenza/complessità crescente.
- `sinergie` e `conflitti`: liste di codici trait con cui il tratto
  collabora o si esclude.
- `requisiti_ambientali` e `applicability.envo_terms`: condizioni
  ambientali (biome_class) e URI ENVO se applicabili.
- `mutazione_indotta`, `uso_funzione`, `spinta_selettiva`: breve
  descrizione della morfologia, della funzione primaria (verbo +
  oggetto) e della pressione selettiva.
- `metrics`: array di metriche con nome, valore e unità UCUM (m/s, J,
  Cel, Pa, dB·s, ecc.). Preferisci intervalli o ordini di grandezza e
  indica le condizioni di misura.
- `cost_profile`: costi energetici a riposo (`rest`), in scatto
  (`burst`) e in sforzo prolungato (`sustained`).
- `testability`: include `observable` (che cosa si può misurare) e
  `scene_prompt` (una breve istruzione per test narrativi).
- `version` e `versioning`: versione SemVer (es. “2.0.0”) e dettagli
  sulle date di creazione e aggiornamento, con l’autore.

Tutti i campi opzionali (slot, output_effects, notes, etc.) possono
essere utilizzati per arricchire la definizione, ma è fondamentale che
la funzione primaria resti chiara e che il tratto sia atomico.

### Regole di naming e stile {#evo-guida-ai-tratti-3-database-regole-di-naming-e-stile}

- **Binomiale** in corsivo; Genus maiuscolo e specie minuscola. Deve
  essere univoco e riflettere la firma funzionale.
- **Denominazioni criptozoologiche**: Sostantivo + Qualificatore (2–3
  parole). Maiuscole per le parole significative; minuscole per
  preposizioni (“a”, “di”). Quando i qualificatori sono co‑primari,
  usare il trattino (“Emostatico‑Litico”); quando indicano un
  meccanismo, usare “a”/“di” (“Scheletro Idraulico a Pistoni”).
- **Funzione primaria**: verbo + oggetto, testabile e misurabile (es.
  “Inoculare tossine ed enzimi”).
- **Descrizioni**: 1–3 frasi per i tratti con numeri e unità UCUM; 5–8
  righe per la specie. Evitare aggettivi poetici; privilegiare l’azione
  e la meccanica osservabile.
- Evitare tratti mutuamente esclusivi nella stessa specie senza
  giustificazioni (es. cieco totale + visione multispettrale).
- Evitare ridondanze: ogni tratto deve avere una singola funzione
  principale.

## Migrazione dai dati v1 {#evo-guida-ai-tratti-3-database-migrazione-dai-dati-v1}

Se esistono già schede v1 in repository interni, è necessario
normalizzarle secondo lo schema v2 prima di importarle in Game‑Database.
I passaggi consigliati sono:

1.  **Mappare i campi**: convertire i vecchi campi (“categoria”,
    “costo_energetico”… ) nei nuovi campi (`famiglia_tipologia`,
    `fattore_mantenimento_energetico`, etc.).
2.  **Aggiornare le unità**: sostituire unità non UCUM (°C → `Cel`, bpm
    → `/min`, km/h → `m/s`), convertendo i valori quando necessario.
3.  **Normalizzare i nomi**: uniformare le denominazioni secondo le
    regole (es. “Presile” → “Prensile”, “Cheratinoso” →
    “Cheratinizzato”).
4.  **Compilare costi e testabilità**: aggiungere `cost_profile`,
    `testability` e definire sinergie/conflitti per ogni tratto.
5.  **Popolare versioni**: aggiungere `version` (es. “2.0.0”) e
    `versioning.created/updated`.
6.  **Aggiungere ecotipi**: se appropriato, definire varianti ecologiche
    in `ecotypes/<genus_species>_ecotypes.json` e annotare i delta sui
    tratti.
7.  **Eseguire la validazione**: utilizzare lo script di validazione
    (vedi sezione successiva) per assicurarsi che tutti i file siano
    conformi agli schemi.

## Struttura del pacchetto {#evo-guida-ai-tratti-3-database-struttura-del-pacchetto}

Il pacchetto v2 è organizzato come segue:

- **docs/** – manuali di supporto (`../appendici/prontuario_metriche_ucum.md`,
  `../README_HOWTO_AUTHOR_TRAIT.md`, `traits_reference.md`) e questa guida.
  Servono come riferimento perpetuo quando il pacchetto fisico non è
  disponibile.
- **templates/** – contiene gli schemi JSON (`species.schema.json` e
  `trait.schema.json`). Sono fondamentali per validare i file e generare
  modelli.
- **species/** – un file JSON per ciascuna specie (es.
  `elastovaranus_hydrus.json`), più `species_catalog.json` che indicizza
  tutte le specie. Qui è stato introdotto il file
  `gulogluteus_scutiger.json` (renamed) e un file di alias in
  `data/aliases/species_aliases.json` per mantenere compatibilità con
  vecchie denominazioni.
- **traits/** – file JSON singoli per i tratti (`TR-1101.json`,
  `TR-1201.json`…) e un aggregato `traits_aggregate.json`. Ogni tratto è
  indipendente e può essere referenziato da più specie.
- **ecotypes/** – cartella dove risiedono i file
  `<genus_species>_ecotypes.json`. Ogni ecotipo definisce modifiche
  (delta) alle metriche dei tratti per un particolare ambiente (es.
  “Gole Ventose”, “Letti Fluviali”). Il file
  `species/<genus_species>.json` elenca solo le etichette degli ecotipi;
  i dettagli sono qui.
- **data/aliases/** – mappa le denominazioni vecchie alle nuove (es.
  `Hydrogluteus pinguis` → `Gulogluteus scutiger`), permettendo di
  mantenere retro‑compatibilità nelle API.
- **catalog/master.json** – indice unificato che aggrega tutte le specie
  e i tratti con campi chiave, e fornisce statistiche e metadati per i
  tool di ricerca.
- **scripts/** – `validate.sh` (script bash per `ajv`) e eventuali
  script per generare o aggiornare i cataloghi.

## Ecotipi e varianti {#evo-guida-ai-tratti-3-database-ecotipi-e-varianti}

Le varianti ecologiche (“ecotipi”) permettono di adattare una specie
alle caratteristiche di un ambiente specifico. Ogni ecotipo ha un
proprio identificatore (`SPEC- ECO1`, `SPEC-ECO2`) e contiene un array
di `trait_adjustments`, ognuno dei quali definisce quale metrica di un
tratto viene modificata, di quanto (`delta`) e in quale unità. Ad
esempio:

    {
      "id": "EHY-ECO1",
      "label": "Gole Ventose",
      "biome_class": "terrestre_roccioso",
      "trait_adjustments": [
        {
          "trait_code": "TR-1105",
          "metric": "soglia_udito",
          "delta": -3,
          "unit": "dB",
          "notes": "Lamelle ottimizzate su roccia secca"
        },
        {
          "trait_code": "TR-1104",
          "metric": "tolleranza_termica",
          "delta": +5,
          "unit": "K",
          "notes": "Termogenesi efficiente in correnti d'aria"
        }
      ]
    }

Tali file permettono al database di generare on‑the‑fly varianti delle
specie senza duplicare l’intera scheda. Nella tua applicazione puoi
caricare `ecotypes/<genus_species>_ecotypes.json`, applicare i delta su
`species/<genus_species>.json` e ottenere la versione localizzata della
creatura.

## Importazione e validazione nel Game‑Database {#evo-guida-ai-tratti-3-database-importazione-e-validazione-nel-gamedatabase}

Il repository Game‑Database fornisce script per importare i cataloghi
della tassonomia nel database via Prisma/PostgreSQL. L’uso tipico è
descritto in `docs/evo-import.md`. Con il pacchetto v2 integrato come
libreria di documenti, puoi procedere come segue:

1.  **Clona o copia** la cartella `species/`, `traits/`, `ecotypes/` e
    `catalog/` in una directory del tuo progetto Game‑Database (es.
    `static/evo_tactics/`).
2.  **Configura** `server/scripts/ingest/evo-import.config.json` per
    puntare ai nuovi percorsi (species, traits, biomes, ecosystems). Se
    stai usando il Single Source of Truth, basta definire la cartella
    principale del pacchetto.
3.  **Esegui l’importazione**:

<!-- -->

    cd server
    npm run evo:import -- --repo ../static/evo_tactics --dry-run
    # se tutto è corretto
    npm run evo:import -- --repo ../static/evo_tactics

Lo script `import-taxonomy.js` leggerà i file JSON/YAML/CSV dalla
directory specificata, normalizzerà le entità e eseguirà gli upsert in
Prisma. Il dry‑run è utile per verificare i conteggi prima di scrivere
sul database.

1.  **Verifica la dashboard**: dopo l’import, avvia la dashboard
    (`npm run dev` nelle rispettive cartelle) e controlla le tabelle
    _Trait_, _Biome_, _Species_ ed _Ecosystem_. Le nuove entità
    dovrebbero comparire con slug coerenti, descrizioni e relazioni.

2.  **Esecuzione periodica**: se aggiorni i cataloghi (es. aggiungi un
    nuovo tratto), ripeti l’import con `npm run evo:import` (senza
    `--dry-run`). Grazie agli upsert, lo script è idempotente e
    aggiornerà solo le entità modificate.

## Roadmap per l’integrazione dei documenti {#evo-guida-ai-tratti-3-database-roadmap-per-lintegrazione-dei-documenti}

1.  **Aggiungi questa guida** al repository: crea un nuovo file
    `docs/evo-tactics-guide.md` e incolla l’intero contenuto di questo
    documento. Aggiorna `README.md` includendo un link alla guida e
    spiegando che il pacchetto non viene più distribuito come archivio,
    ma è consultabile direttamente dal repository.
2.  **Aggiorna** `docs/evo-import.md` (se presente) per rimuovere
    riferimenti a pacchetti esterni e indicare che la tassonomia viene
    caricata da file statici (species, traits, ecotypes) nel progetto.
3.  **Aggiungi gli schemi e gli script di validazione**: copia la
    cartella `templates/` e lo script `scripts/validate.sh` nel
    repository. Aggiorna la pipeline CI per eseguire
    `bash scripts/validate.sh` e assicurarti che tutte le definizioni
    siano valide prima dei merge.
4.  **Sposta i dati**: crea una directory (es. `static/evo_tactics/`)
    che contenga `species/`, `traits/`, `ecotypes/`, `catalog/`,
    `data/aliases/` e i documenti di supporto (prontuario UCUM, manuali
    traits, reference). Non servono pacchetti compressi; tutto resta
    accessibile via git.
5.  **Pulisci pacchetti legacy**: se nel repository erano presenti zip,
    mjs o script di deploy per l’Evo Tactics Pack, valuta se rimuoverli
    o archiviarli in `deprecated/`. La nuova libreria di documenti li
    sostituisce completamente.

## Conclusione {#evo-guida-ai-tratti-3-database-conclusione}

Integrando questa guida e i documenti collegati, il repository
**Game‑Database** può gestire la tassonomia Evo Tactics senza bisogno di
pacchetti esterni. Le specifiche v2 garantiscono coerenza, estensibilità
e facilità di validazione, mentre gli ecotipi offrono flessibilità
nell’adattare le specie a diversi ambienti. Seguendo la roadmap
operativa, potrai aggiornare la documentazione, importare i nuovi dati e
assicurarti che la dashboard e le API riflettano correttamente la ricca
biodiversità del tuo universo di gioco.
