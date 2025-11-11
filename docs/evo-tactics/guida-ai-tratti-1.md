---
title: Evo-Tactics · Guida ai Tratti (Parte 1)
description: Sommario operativo del pacchetto Evo-Tactics Pack v2 con standard specie e tratti, workflow di migrazione e QA.
tags:
  - evo-tactics
  - traits
updated: 2025-11-11
---

# Guida ai Tratti Evo-Tactics · Sommario e Piano Operativo {#evo-guida-ai-tratti-1}

## Introduzione {#evo-guida-ai-tratti-1-introduzione}

Questa guida raccoglie tutto il materiale creato durante la
conversazione e lo organizza in un unico documento operativo per il
**Evo Tactics Pack v2**. Il pacchetto nasce per facilitare la
definizione, la catalogazione e l'uso di creature e tratti
criptozoologici in un ambiente di gioco o simulazione. Questa guida
spiega in modo organico:

- quali sono le specifiche standard (v2) per le schede **Specie** e
  **Tratti**,
- come assegnare nomi coerenti e descrizioni funzionali,
- la procedura consigliata per migrare dati esistenti dalla versione v1
  alla nuova struttura,
- la struttura dei pacchetti forniti (cartelle, file, script di
  validazione),
- come utilizzare gli **ecotipi** per creare varianti locali delle
  specie,
- i passi successivi per integrare e validare i contenuti nel tuo
  repository.

La guida è pensata per essere salvata nella cartella `docs/` del
progetto e offre un punto di partenza unificato per chiunque voglia
contribuire o consultare il database criptozoologico.

## Specifiche standard v2 {#evo-guida-ai-tratti-1-specifiche-standard-v2}

Le schede creatura sono strutturate secondo due schemi JSON (schema
specie e schema tratto). Ogni **Specie** (file in `species/`) deve
contenere i seguenti campi principali:

- **scientific_name**: nome binomiale (*Genus species*) con radici
  greco‑latine coerenti con la firma funzionale.
- **common_names**: uno o due nomi volgari evocativi (es.
  “Viverna‑Elastico”).
- **classification**: classe macro (es. `Mammalia`, `Reptilia`,
  `Artropode`) e descrizione sintetica dell’habitat/ecotopo primario.
- **functional_signature**: 1–2 frasi che descrivono ciò che la specie
  fa “meglio di tutte”, cioè la sua firma operativa (attacco, difesa,
  mobilità, sensi, riproduzione…).
- **visual_description**: 5–8 righe sulla morfologia esterna (forma,
  postura, proporzioni, colori, texture, gesti tipici). Evita termini
  poetici: privilegia l’osservazione e l’azione.
- **risk_profile**: pericolosità su scala 0–3 e vettori (tossine,
  patogeni, onde d’urto…).
- **interactions**: elenco di prede tipiche, predatori, eventuali
  simbiosi/parassitismi (descrivere il patto biologico quando esiste).
- **constraints**: almeno due limitazioni o trade‑off (costi metabolici
  elevati, necessità di ambienti specifici, contromisure note).
- **sentience_index**: indice di senzienza (T0–T5) secondo la scala
  definita nei documenti di riferimento.
- **ecotypes**: etichette delle varianti ecologiche (vedi sezione
  Ecotipi). I dettagli delle varianti sono in file separati sotto
  `ecotypes/`.
- **trait_refs**: array di codici che puntano ai tratti (file in
  `traits/`). Ogni specie deve avere **5–9 tratti totali**, coprendo
  tutti gli assi possibili: **locomozione/manipolazione**,
  **alimentazione/digestione**, **sensi/percezione**,
  **attacco/difesa**, **metabolismo/termo‑respiro**,
  **riproduzione/ciclo vitale**.

Ogni **Tratto** (file in `traits/`) è un elemento atomico e deve
includere:

- **trait_code**: codice univoco `TR-0000` (per il catalogo globale) o
  `SPEC_ABBR-TRxx` (per associare il tratto a una specie). Nel catalogo
  gli stessi tratti possono essere riutilizzati da più specie.
- **label**: denominazione criptozoologica, formata da **sostantivo +
  qualificatore** (2–3 parole). La scrittura segue il Title Case:
  iniziali maiuscole per le parole significative, minuscole per
  preposizioni (“a”, “di”).
- **famiglia_tipologia**: categoria generale (es.
  Difensivo/Termoregolazione, Locomotivo/Balistico,
  Sensoriale/Tatto‑Vibro…).
- **fattore_mantenimento_energetico**: Basso, Medio o Alto, indicativo
  del costo per mantenere il tratto attivo.
- **tier**: T1–T5 (con costo/complessità/impatti crescenti). Tier
  elevati indicano poteri eccezionali con costi metabolici o vincoli
  severi.
- **slot**: elenco opzionale per definire ruoli speciali o
  raggruppamenti (può restare vuoto).
- **sinergie** e **conflitti**: liste di codici trait. I tratti in
  sinergia potenziano le funzioni reciproche; quelli in conflitto non
  possono coesistere.
- **requisiti_ambientali**: condizioni o biome in cui il tratto è
  efficace (campo libero accompagnato da eventuali termini ENVO).
- **mutazione_indotta**: breve frase sull’origine anatomica (es.
  “Ghiandole olocrine ad alta densità”).
- **uso_funzione**: verbo + oggetto che definisce la funzione principale
  (es. “Isolare e galleggiare”).
- **spinta_selettiva**: descrive la pressione evolutiva che ha favorito
  il tratto (predazione, climi estremi, competizione…).
- **metrics**: array di oggetti che misurano la performance del tratto.
  Ogni metrica ha `name`, `value` e `unit` e deve usare simboli **UCUM**
  (es. `m/s`, `J`, `Cel`, `L/min`, `dB·s`). Preferire intervalli o
  ordini di grandezza e indicare le condizioni (aria, acqua,
  temperatura).
- **cost_profile**: costi energetici nelle fasi `rest` (riposo), `burst`
  (scatto breve) e `sustained` (sforzo prolungato).
- **testability**: indica cosa si può osservare per verificare il tratto
  (`observable`) e fornisce uno `scene_prompt` per test narrativi
  ripetibili.
- **applicability**: facoltativo; può elencare cladi biologici e termini
  ENVO.
- **version** e **versioning**: numerazione SemVer (`version`) e
  dettagli (date di creazione/aggiornamento, autore) in `versioning`.

La definizione dei tratti deve evitare ridondanze: ogni tratto deve
essere **atomico**, cioè con una funzione principale chiara e testabile.
Per ogni super‑abilità occorre indicare almeno un limite o contromisura
(raffreddamento, saturazione, schermature, rumore di fondo…).

## Guida allo stile {#evo-guida-ai-tratti-1-guida-allo-stile}

Per rendere il database coerente, si seguono regole precise per nomi e
descrizioni:

1.  **Specie**: il nome scientifico deve essere in corsivo (quando
    pubblicato), con Genus maiuscolo e specie minuscola. Dev’essere
    univoco e coerente con la firma funzionale. L’abbreviazione species
    (per codici trait) è composta dalle tre lettere del Genus più due
    lettere della specie (es. *Elastovaranus hydrus* → `EHY`). I nomi
    volgari devono essere brevi, evocativi e legati alla firma
    funzionale (es. “Ghiotton‑Scudo”).

2.  **Tratti**: la denominazione criptozoologica si compone di un
    sostantivo e un qualificatore. Se i qualificatori sono co‑primari,
    si usa il trattino (es. “Emostatico‑Litico”); se indicano un
    meccanismo, si usa “a” o “di” (es. “Scheletro Idraulico a Pistoni”).
    Utilizzare sempre termini precisi e coerenti (“prensile” al posto di
    “presile”, “cheratinizzato” al posto di “cheratinoso”, ecc.). La
    funzione primaria è scritta come verbo + oggetto e deve essere
    misurabile.

3.  **Descrizioni**: nelle descrizioni funzionali usare 1–3 frasi,
    includendo range numerici realistici con unità UCUM, evitando
    lirismi. Le descrizioni visive delle specie devono fornire
    informazioni sull’aspetto e sui comportamenti tipici senza andare
    troppo nel fantasioso.

4.  **Coerenza interna**: non associare a una specie tratti mutuamente
    esclusivi (es. “cieco totale” insieme a “visione multispettrale”)
    senza giustificarli come stadi o ecotipi. Evitare duplicazioni di
    funzione: se due tratti fanno esattamente la stessa cosa, rivedere
    la definizione.

## Pipeline di migrazione (v1 → v2) {#evo-guida-ai-tratti-1-pipeline-di-migrazione-v1-v2}

Per aggiornare schede esistenti alla versione v2 si consiglia di seguire
questa procedura:

1.  **Mappare i campi**: convertire i vecchi campi nei nuovi (es.
    `categoria` → `famiglia_tipologia`; `costo_energetico` →
    `fattore_mantenimento_energetico`), aggiungendo i campi mancanti
    (`testability`, `cost_profile`, `sinergie`, `conflitti`, etc.).
2.  **Aggiornare unità**: assicurarsi che tutte le metriche usino
    simboli **UCUM** (°C → `Cel`, bpm → `/min`, km/h → m/s). Quando
    necessario convertire i valori.
3.  **Normalizzare i nomi**: adattare le denominazioni dei tratti al
    nuovo stile; ad esempio, “Coda Presile” diventa “Coda Prensile
    Muscolare”; “Idrorepellente” diventa “Pelage Idrorepellente”;
    “Cheratinoso” diventa “Cheratinizzato”.
4.  **Compilare testabilità e costi**: inserire campi `observable`,
    `scene_prompt` e `cost_profile` realistici per ogni tratto.
    Specificare sinergie e conflitti tramite codici.
5.  **Aggiungere versioning**: per ogni file, introdurre la chiave
    `version` (SemVer) e la sezione `versioning` con date e autore.
6.  **Validare**: usare lo script `scripts/validate.sh` che impiega
    `ajv` per convalidare i file contro gli schemi.

Seguendo questa pipeline, le schede esistenti possono essere migrate
senza perdere informazioni e diventando compatibili con gli strumenti
del pacchetto v2.

## Struttura del pacchetto {#evo-guida-ai-tratti-1-struttura-del-pacchetto}

Il pacchetto completo è organizzato in cartelle:

- `docs/` contiene il prontuario delle metriche (UCUM), il manuale
  dell’autore di tratti, una reference dei tratti, questa guida e la
  checklist QA.
- `templates/` include gli schemi JSON (`species.schema.json`,
  `trait.schema.json`) che definiscono la struttura dei file.
- `species/` contiene i file individuali per ogni specie (es.
  `elastovaranus_hydrus.json`), più un `species_catalog.json` che
  indicizza tutte le specie. In questa cartella è stato introdotto anche
  `gulogluteus_scutiger.json` come nuova versione della creatura
  precedentemente nota come “Culocinghiale”; i nomi precedenti sono
  mantenuti tramite alias.
- `traits/` contiene i file dei tratti (`TR-1101.json`, `TR-1201.json`…)
  e un aggregato `traits_aggregate.json` con l’elenco completo. Ogni
  file tratto segue il template v2.
- `ecotypes/` (aggiunto nella versione PLUS) contiene file
  `<genus_species>_ecotypes.json` con le varianti locali (ecotipi),
  ognuna con modifiche alle metriche dei tratti. In
  `species/<genus_species>.json` il campo `ecotypes` elenca solo le
  etichette; i dettagli sono separati.
- `data/aliases/` contiene un file `species_aliases.json` che mappa
  eventuali nomi vecchi o alternativi alle nuove denominazioni (es.
  “Hydrogluteus pinguis” → “Gulogluteus scutiger”).
- `scripts/` ospita `validate.sh`, uno script bash che usa `ajv-cli` per
  validare tutti i file specie e tratti rispetto agli schemi.

Inoltre è presente un file `catalog/master.json` che funge da indice
unificato per tool esterni: oltre a riepilogare specie e tratti,
fornisce statistiche (numero di specie, tratti per classe macro,
breakdown per tier), percorsi agli schemi e un elenco dei tratti
embedded dentro ogni specie.

## Ecotipi e varianti {#evo-guida-ai-tratti-1-ecotipi-e-varianti}

Gli **ecotipi** permettono di declinare una stessa specie in varianti
locali adattate a contesti specifici. Ogni file in `ecotypes/` specifica
per una specie:

- un `id` (es. `EHY-ECO1`),
- un `label` (nome evocativo dell’ecotipo),
- un `biome_class` e eventuali `envo_terms` per definire l’ambiente,
- un array di `trait_adjustments` che contiene modifiche (delta) alle
  metriche dei tratti della specie, specificando il codice tratto, la
  metrica, il delta numerico, l’unità e le note. Ad esempio, l’ecotipo
  “Gole Ventose” per *Elastovaranus hydrus* riduce la velocità del
  proiettile di 10 m/s in aria satura e migliora la tolleranza termica
  di 5 K.

Nel file della specie (`species/<genus_species>.json`), il campo
`ecotypes` deve contenere solo le etichette (“Gole Ventose”, “Letti
Fluviali”); i dettagli dell’ecotipo sono nel file corrispondente in
`ecotypes/`. Per aggiungere un nuovo ecotipo occorre:

1.  Creare un file `<genus_species>_ecotypes.json` se non esiste, oppure
    aggiungere un nuovo oggetto all’array `ecotypes` nel file esistente.
2.  Aggiornare il campo `ecotypes` della specie inserendo l’etichetta.
3.  Definire i `trait_adjustments` coerenti con l’ambiente e le
    pressioni selettive locali.

## Strumenti di validazione e QA {#evo-guida-ai-tratti-1-strumenti-di-validazione-e-qa}

Per garantire la coerenza del database si consiglia di eseguire
regolarmente il controllo di qualità:

- **Validazione JSON**: eseguire `bash scripts/validate.sh` per
  assicurarsi che tutti i file `species/*.json` e `traits/*.json`
  rispettino gli schemi. È necessario avere `ajv-cli` installato
  (installabile con `npm install -g ajv-cli`).
- **UCUM**: verificare che le unità delle metriche siano conformi al
  prontuario UCUM (`Cel` per gradi Celsius, `m/s` per velocità lineare,
  `J` per energia, `dB·s` per dose sonora…).
- **QA Checklist**: seguire la lista di controllo `docs/QA_TRAITS_V2.md`
  che ricorda di compilare testabilità, sinergie/conflitti, versioning,
  ecotipi e alias.

## Prossimi passi e raccomandazioni {#evo-guida-ai-tratti-1-prossimi-passi-e-raccomandazioni}

1.  **Mergiare i pacchetti**: integrare le cartelle `docs/`,
    `templates/`, `species/`, `traits/`, `data/` e `scripts/` nel
    proprio repository. Assicurarsi che `species_catalog.json` e
    `traits_aggregate.json` vengano aggiornati con i nuovi file.
2.  **Aggiornare le schede esistenti**: migrare le specie e i tratti già
    presenti nel database alla struttura v2 seguendo la pipeline di
    migrazione. Per le specie rinominate (es. “Culocinghiale”),
    mantenere gli alias per retro‑compatibilità.
3.  **Espandere con nuovi ecotipi**: utilizzare il formato `ecotypes/`
    per modellare varianti ecologiche e adattamenti locali. Includere
    sempre `envo_terms` per facilitare l’integrazione con ontologie
    ambientali.
4.  **Sviluppare tool di analisi**: con il catalogo unificato
    (`catalog/master.json`) è possibile costruire filtri, ricerche e
    viste personalizzate (ad es. “mostra tutti i tratti tier 4 che
    richiedono un bioma umido”).
5.  **Documentare e versionare**: ogni nuova specie o tratto deve
    includere una versione (`version: "2.0.0"`) e aggiornare
    `versioning.created/updated`. Le modifiche devono essere annotate
    nei commit o nei changelog per facilitare la tracciabilità.

## Conclusione {#evo-guida-ai-tratti-1-conclusione}

Il **Evo Tactics Pack v2** fornisce un sistema coerente, estensibile e
verificabile per la creazione e la gestione di creature criptozoologiche
e dei loro tratti. Seguendo questa guida, gli autori possono uniformare
le schede, evitare ambiguità e mantenere un database sempre validato.
L’aggiunta delle varianti ecologiche (ecotipi) e del catalogo master
consente di adattare rapidamente il materiale a nuovi ambienti narrativi
o di gioco, mantenendo al contempo un forte controllo sulla coerenza
biologica e meccanica.

## Documentazione integrativa del pacchetto {#evo-guida-ai-tratti-1-documentazione-integrativa-del-pacchetto}

Oltre alle specifiche e alle regole descritte sopra, il pacchetto
include tre documenti di supporto che definiscono in dettaglio le
procedure di authoring e validazione dei tratti, nonché le unità di
misura. Poiché questo documento viene distribuito senza il pacchetto
fisico, se ne riassumono qui i contenuti fondamentali, così da non
perdere nessuna informazione essenziale.

### How‑to autore trait (estratto) {#evo-guida-ai-tratti-1-howto-autore-trait-estratto}

La guida rapida per l’autore di tratti fornisce una checklist operativa
per scrivere un nuovo trait in pochi minuti. I punti principali
includono:

- **Naming & codifica**: utilizzare codici `TR-####` univoci, scegliere
  label di 2–4 parole evocative, assegnare una famiglia funzionale
  (`famiglia_tipologia`) e un `tier` coerente con la scala di potenza
  (da T1 a T6).
- **Checklist di compilazione**: definire la funzione (`uso_funzione`),
  la mutazione da cui deriva (`mutazione_indotta`) e la spinta
  selettiva; associare ambienti ENVO (`applicability.envo_terms`) e
  requisiti ambientali; impostare i costi
  (`fattore_mantenimento_energetico`, `cost_profile`), i limiti
  (`limits`) e i trigger di attivazione; definire almeno una metrica
  UCUM (`metrics[{name,value,unit}]`); indicare sinergie e conflitti con
  altri tratti; compilare la testabilità (`observable`, `scene_prompt`);
  chiudere con versioning SemVer e date ISO.
- **Validazione & CI**: è previsto uno script di validazione che
  verifica lo schema JSON, l’uso corretto di UCUM ed ENVO e il rispetto
  del versioning. Prima di aprire una PR è consigliato eseguire il
  validator.

### Guida completa ai trait (estratto) {#evo-guida-ai-tratti-1-guida-completa-ai-trait-estratto}

Questo documento definisce che cos’è un trait (unità atomica riusabile
di funzionalità e morfologia) e descrive in modo approfondito i campi
obbligatori e opzionali. Tra i punti chiave:

- **Dizionario campi**: il trait deve sempre contenere `trait_code`,
  `label`, `famiglia_tipologia`, `fattore_mantenimento_energetico`,
  `tier`, `mutazione_indotta`, `uso_funzione`, `spinta_selettiva`,
  `sinergie`, `version` e `versioning`. Molti altri campi sono opzionali
  ma consigliati (slot, limits, output_effects, testability,
  cost_profile, applicability, requisiti_ambientali...).
- **Tassonomia funzionale**: la guida propone un sistema di cluster come
  `Locomotivo`, `Sensoriale`, `Fisiologico`, `Offensivo`, `Difensivo`,
  `Cognitivo/Sociale`, `Riproduttivo/Spawn`, `Ecologico`, con
  sottocategorie per descrivere in modo preciso la natura di un tratto.
- **Metriche & UCUM**: vengono elencate le unità raccomandate per
  velocità (`m/s`), accelerazione (`m/s2`), energia (`J`), temperatura
  (`Cel`), pressione (`Pa`), dose acustica (`dB·s`), ecc. Si ricorda di
  usare `1` per grandezze adimensionali e di convertire sempre in unità
  SI quando si archiviano i dati.
- **Requisiti ambientali & ENVO**: come associare i tratti a particolari
  biomi tramite l’uso di URI ENVO e compilare `requisiti_ambientali`
  quando sono necessari vincoli aggiuntivi.
- **Costi, limiti, trigger, testabilità**: spiegazione dettagliata su
  come descrivere il costo metabolico, i limiti numerici o temporali, i
  trigger di attivazione e come scrivere una prova pratica per
  verificare il tratto in gioco.
- **Versioning & governance**: uso di SemVer, definizione di
  MAJOR/MINOR/PATCH, importanza dei changelog, e integrazione del
  validator nella CI.

### Prontuario metriche & UCUM (estratto) {#evo-guida-ai-tratti-1-prontuario-metriche-ucum-estratto}

Questa tabella consultiva raggruppa le metriche più comuni per cluster
funzionali e indica le unità UCUM consigliate. Alcuni esempi:

- **Locomotivo**: velocità massima (`m/s`), accelerazione 0–10 (`m/s2`),
  salto verticale (`m`), autonomia di volo (`km`, convertibile in `m`
  per calcoli).
- **Sensoriale**: soglia uditiva (`dB`), banda uditiva massima (`Hz`),
  rilevabilità visiva (`1`), sensibilità magnetica (`T`), sensibilità
  elettrica (`V/m`).
- **Fisiologico**: temperatura del getto (`Cel`), tolleranza termica
  (`K`), metabolic rate (`W/kg`), consumo O₂ (`L/min`), pressione del
  getto (`Pa`).
- **Offensivo**: energia impattiva (`J`), velocità del proiettile
  (`m/s`), tensione di picco (`V`), dose acustica (`dB·s`), area del
  cono (`m2`).
- **Difensivo**: spessore corazza (`mm`), riduzione SPL (`dB`),
  resistenza termica (`K/W`).
- **Cognitivo/Sociale**: indici adimensionali (cohesion, intimidazione),
  tempi di apprendimento (`s`).
- **Riproduttivo/Ecologico**: tasso propaguli (`1/season`), raggio di
  disseminazione (`m`).

Il prontuario include anche una mini‑tabella con i codici UCUM più usati
e note pratiche su come trattare unità non SI (°C → `Cel`, litri → `L`)
e su quando usare valori dimensionless.

## Schede delle specie e dei loro tratti {#evo-guida-ai-tratti-1-schede-delle-specie-e-dei-loro-tratti}

In assenza del pacchetto, questa sezione fornisce una panoramica delle
dieci creature definite nel progetto, con i loro tratti principali. Per
ogni specie vengono indicati il nome scientifico, i nomi volgari, la
classificazione macro, una descrizione sintetica, la firma funzionale e
un elenco dei tratti con struttura morfologica e funzione primaria.

### 1. *Elastovaranus hydrus* — Viverna‑Elastico {#evo-guida-ai-tratti-1-1-elastovaranus-hydrus-vivernaelastico}

**Classificazione:** Reptilia; predatore delle savane calde con gole
rocciose e letti fluviali stagionali.

**Firma funzionale:** rettile predatore estremo che combina un attacco a
lunga gittata con un sistema muscolare e scheletrico idraulico e una
pre‑digestione tossico‑enzimatica.

**Descrizione visiva:** corpo allungato e slanciato, cranio affusolato
con un rostro tubulare; muscolatura accentuata che conferisce un aspetto
massiccio; squame scure dotate di lamelle sensoriali; coda lunga per
equilibrio e spinta; occhi piccoli, color ambra; movimenti fulminei ma
precisi.

**Tratti principali:**

- **Scheletro Idraulico a Pistoni:** ossa cave pressurizzate con fluido
  che amplificano l’allungamento del corpo per trasformare testa e collo
  in una frusta proiettile; funzione primaria: estendere il cranio per
  colpire a distanza.
- **Rostro Emostatico‑Litico:** appendice mascellare tubulare che, come
  un ago, inocula simultaneamente neurotossina, anticoagulanti e enzimi
  digestivi, aspirando poi i tessuti liquefatti; funzione primaria:
  inoculare tossine ed enzimi e aspirare i fluidi.
- **Ipertrofia Muscolare Massiva:** sviluppo muscolare estremo, simile
  al manzo Belgian Blue, che fornisce la potenza necessaria per
  l’attacco proiettile e la retrazione immediata; funzione primaria:
  generare potenza esplosiva per scatti e contrazioni.
- **Ectotermia Dinamica (Sangue Caldo Temporaneo):** vibrazioni
  muscolari controllate che generano calore interno per cacciare in
  ambienti freddi e potenziare l’efficacia delle tossine; funzione
  primaria: aumentare la temperatura corporea e accelerare il
  metabolismo a richiesta.
- **Organi Sismici Cutanei:** squame modificate e organi interni che
  rilevano le vibrazioni del terreno, permettendo all’animale di
  localizzare le prede senza visibilità; funzione primaria: rilevare
  vibrazioni e guidare l’attacco.
- **Autotomia Cauterizzante Accelerata:** capacità di rigenerare
  rapidamente arti e coda persi, minimizzando la perdita di sangue;
  funzione primaria: rigenerare tessuti e sopravvivere a ferite gravi.
- **Setticemia Secolo:** la saliva trasporta ceppi batterici virulenti
  che, se la preda sopravvive all’attacco, la uccidono nelle ore o
  giorni successivi; funzione primaria: garantire la morte differita
  della vittima.
- **Resistenza Toxinologica Endemica:** l’animale è immunizzato ai
  propri veleni e mostra elevata resistenza alla maggior parte delle
  tossine naturali; funzione primaria: proteggersi da
  auto‑intossicazione e tossine altrui.

### 2. *Gulogluteus scutiger* — Ghiotton‑Scudo {#evo-guida-ai-tratti-1-2-gulogluteus-scutiger-ghiottonscudo}

**Classificazione:** Mammalia; onnivoro tassiforme che vive in ambienti
umidi, foreste paludose e argini fluviali.

**Firma funzionale:** grande onnivoro anfibio dotato di pelliccia oleosa
idrorepellente, coda e lingua prensili che fungono da ulteriori arti,
scudo posteriore cheratinizzato per la difesa e digestione
omnicomprensiva.

**Descrizione visiva:** corpo tozzo e massiccio con zampe robuste,
pelliccia scura e lucida che respinge l’acqua, regione gluteale
corazzata in rilievo, coda spessa e muscolosa spesso avvolta attorno a
rami; lingua che si estende come una proboscide; occhi piccoli ma
vivaci.

**Tratti principali:**

- **Pelage Idrorepellente a Cellule Olocrine:** manto fitto e oleoso
  secretato da ghiandole specializzate che garantisce isolamento totale
  dall’acqua e galleggiamento; funzione primaria: isolare e galleggiare.
- **Scudo Gluteale Cheratinizzato:** muscoli glutei estremamente densi
  rivestiti da placche cheratinose/ossee che fungono da scudo passivo
  contro gli attacchi posteriori; funzione primaria: assorbire impatti
  posteriori.
- **Coda Prensile Muscolare con Verticilli Ossei:** coda lunga e robusta
  dotata di vertebre modificate che agisce come quinto arto per
  arrampicarsi e bilanciarsi; funzione primaria: appendere e
  contro‑bilanciare.
- **Rostro Linguale Prensile (Lingua‑Gru):** lingua muscolare e adesiva
  che può estendersi fino alla lunghezza del corpo per afferrare cibo e
  manipolare oggetti; funzione primaria: afferrare e manipolare a lungo
  raggio.
- **Digestione Omicomprensiva con Acidi Iodizzati:** sistema digestivo
  capace di assimilare quasi ogni materia organica, dai vegetali alla
  chitina, grazie ad acidi arricchiti di iodio; funzione primaria:
  digerire qualsiasi biomassa.
- **Flessione Muscolare Ipotalamica:** muscoli a reazione rapida che
  permettono salti verticali e scatti improvvisi ruotando il tronco con
  forza; funzione primaria: effettuare scatti rapidi e salti non
  lineari.
- **Sacche Respiratorie Ossidanti:** organi accessori vascolarizzati che
  rilasciano ossigeno rapidamente, sostenendo sforzi intensi e
  prolungando l’apnea; funzione primaria: rilasciare O₂ rapido per
  sforzi e immersioni.
- **Articolazioni Multiassiali:** giunti a sfera nelle spalle e nelle
  anche che consentono ai quattro arti di ruotare ampiamente,
  facilitando arrampicata e rotazione; funzione primaria: ruotare arti
  per manovre strette.
- **Sensibilità Sismica Profonda:** struttura ossea robusta dotata di
  recettori capaci di rilevare vibrazioni del terreno e individuare
  prede sotterranee; funzione primaria: percepire vibrazioni e minacce.

### 3. *Perfusuas pedes* — Zannapiedi {#evo-guida-ai-tratti-1-3-perfusuas-pedes-zannapiedi}

**Classificazione:** ibrido artropode‑mammifero; predatore parassita che
vive in caverne umide e radure forestali notturne.

**Firma funzionale:** creatura sensibile che cambia sesso nel ciclo
vitale, custodisce le proprie uova in sacchi esterni, utilizza centinaia
di zampe per muoversi ovunque, digerisce estroiettando lo stomaco e si
affida a un ospite senziente per la percezione del mondo.

**Descrizione visiva:** corpo allungato con decine di paia di arti
sottili e muscolosi; chitina scura con riflessi marroni; privo di occhi
visibili; grande appendice boccale; sacchi sulla superficie ventrale;
l’animale spesso trasporta una creatura ospite immobilizzata.

**Tratti principali:**

- **Gonadismo Sequenziale Ermafrodita:** il ciclo riproduttivo prevede
  un cambio di sesso da femmina (incubatrice) a maschio dopo uno o due
  cicli di incubazione; funzione primaria: cambiare sesso per
  massimizzare la fitness riproduttiva.
- **Incubazione Esterna Cistica:** le uova sono custodite in un sacco
  protettivo esterno che si indurisce come una ciste; funzione primaria:
  incubare la prole fuori dal corpo.
- **Locomozione Miriapode Ibrida:** fino a cento paia di arti che
  forniscono trazione estrema e consentono l’arrampicata su qualsiasi
  superficie; funzione primaria: muoversi e arrampicarsi con presa
  totale.
- **Digestione Extracorporea Acida:** lo stomaco viene estroflesso e
  rilascia enzimi corrosivi per liquefare i tessuti della preda prima di
  aspirarli; funzione primaria: liquefare la preda esternamente.
- **Sacche Ipopache Tissutali:** pieghe cutanee lungo i fianchi in cui
  il cacciatore conserva tessuti parzialmente digeriti per il consumo
  futuro; funzione primaria: conservare il cibo digerito.
- **Immunità Virale Ultrastabile:** il sistema immunitario è simile a
  quello dei pipistrelli e consente di coesistere con virus letali senza
  sintomi; funzione primaria: resistere a numerosi patogeni.
- **Sistemi Sensoriali Chimio‑Sonici:** la creatura è cieca, ma utilizza
  sonar ad alta frequenza e spruzzi di profumo controllati per mappare
  l’ambiente; funzione primaria: percepire l’ambiente con sonar e
  feromoni.
- **Appendice da Contatto Super‑Cinetica:** zampa anteriore modificata
  che si muove a velocità esplosiva producendo un’onda d’urto simile
  alla canocchia pavone; funzione primaria: colpire con un pugno a
  cavitazione.
- **Simbiosi da Ostaggio & Dipendenza Bio‑Cognitiva:** l’animale
  mantiene un ospite senziente immobilizzato e nutrito che funge da
  occhi e interprete cognitivo; funzione primaria: ottenere percezioni e
  guida mentale dall’ospite.

### 4. *Terracetus ambulator* — Megattera Terrestre {#evo-guida-ai-tratti-1-4-terracetus-ambulator-megattera-terrestre}

**Classificazione:** Mammalia; erbivoro gigante che vive in pianure
aperte e savane ventilate.

**Firma funzionale:** enorme mammifero terrestre derivato dalle balene
che ha alleggerito lo scheletro per muoversi via terra, usa ciglia
addominali per strisciare, filtra l’aria per nutrirsi e
comunica/disorienta con canti infrasonici.

**Descrizione visiva:** corpo voluminoso, simile a una megattera ma
senza pinne; tessuto spesso, colore grigio; ventre largo e piatto con
file di ciglia che lo spingono sul terreno; grandi sacche polmonari;
testa massiccia con piccole aperture nasali.

**Tratti principali:**

- **Scheletro Pneumatico a Maglie:** ossa estremamente porose riempite
  di aria che riducono il peso corporeo permettendo la locomozione
  terrestre; funzione primaria: alleggerire la massa.
- **Cinghia Iper‑Ciliare:** strisce di pelle sotto la pancia ricoperte
  da milioni di ciglia muscolari che, muovendosi in modo coordinato,
  permettono all’animale di strisciare; funzione primaria: generare
  movimento terrestre.
- **Rete Ghiandolare Filtro‑Polmonare:** sacche polmonari che filtrano
  micro-organismi e polline dall’aria, fornendo nutrienti all’animale;
  funzione primaria: nutrirsi filtrando l’aria.
- **Canto Infrasonico Tattico:** sistema vocale che emette suoni a
  bassissima frequenza per disorientare predatori e comunicare a grande
  distanza; funzione primaria: confondere i predatori e comunicare.
- **Siero Anti‑Gelo Naturale:** sostanze crioproteiche che impediscono
  la formazione di cristalli di ghiaccio nei tessuti, consentendo la
  sopravvivenza in climi estremi; funzione primaria: resistere al gelo.

### 5. *Chemnotela toxica* — Aracnide Alchemico {#evo-guida-ai-tratti-1-5-chemnotela-toxica-aracnide-alchemico}

**Classificazione:** Arthropoda; predatore esperto di chimica, vive in
radure acide e chiome bagnate.

**Firma funzionale:** un artropode gigante dotato di zanne che secernono
acidi capaci di corrodere metalli, tessuti e pietre; produce seta
conduttiva elettrica e salti potenziati da leve idrauliche.

**Descrizione visiva:** corpo robusto, simile a un ragno gigante;
cheliceri prominenti; filiera ingrossata che produce seta lucente; zampe
potenti; colori variabili dal bruno al verde scuro; occhi multipli,
alcuni specializzati per vedere la tensione nelle tele.

**Tratti principali:**

- **Zanne Idracida:** cheliceri dotati di ghiandole che secernono un
  acido capace di sciogliere metalli e tessuti organici; funzione
  primaria: attaccare e digerire chimicamente.
- **Seta Conduttiva Elettrica:** filamenti contenenti nanoparticelle
  metalliche che conducono e immagazzinano cariche elettriche, creando
  trappole che stordiscono le prede; funzione primaria: intrappolare e
  stordire con elettricità.
- **Articolazioni a Leva Idraulica:** giunture delle zampe con camere di
  fluido pressurizzato che amplificano la forza del salto e del colpo;
  funzione primaria: aumentare forza e salto.
- **Filtrazione Osmotica:** sistema renale a multi‑stadio che filtra e
  neutralizza i composti acidi prodotti dall’animale; funzione primaria:
  eliminare tossine.
- **Visione Polarizzata:** occhi specializzati che vedono i pattern di
  polarizzazione della luce, distinguendo la propria seta e rilevando
  fessure; funzione primaria: rilevare tensioni e navigare nelle tele.

### 6. *Proteus plasma* — Mutaforma Cellulare {#evo-guida-ai-tratti-1-6-proteus-plasma-mutaforma-cellulare}

**Classificazione:** organismo primitivo; può essere unicellulare o un
piccolo collettivo di cellule pluripotenti; vive in stagni quieti e
torrenti lenti.

**Firma funzionale:** creatura altamente plastica capace di cambiare
forma, densità e consistenza, muovendosi attraverso fessure
microscopiche, fagocitando qualsiasi materiale organico e riproducendosi
per scissione o fusione.

**Descrizione visiva:** appare come una massa gelatinosa traslucida che
può espandersi o contrarsi; può assumere forme illusorie; in ambienti
ricchi di minerali si ricopre di una pellicola silicea quando entra in
ibernazione; non possiede organi distinti.

**Tratti principali:**

- **Membrana Plastica Continua:** struttura cellulare che permette al
  corpo di cambiare forma, densità e consistenza, passando da liquido a
  solido malleabile; funzione primaria: metamorfosi e adattamento di
  forma.
- **Flusso Ameboide Controllato:** locomozione basata sull’estensione di
  pseudopodi e flussi di citoplasma che consentono di penetrare in
  fessure microscopiche; funzione primaria: penetrare ambienti
  complessi.
- **Fagocitosi Assorbente:** capacità di avvolgere totalmente la preda e
  assorbirne i tessuti direttamente attraverso la membrana; funzione
  primaria: nutrizione onnivora attraverso inglobamento.
- **Moltiplicazione per Fusione/Scissione:** riproduzione tramite
  scissione cellulare o fusione con altre unità, aumentando la massa e
  la complessità; funzione primaria: riprodursi e ripararsi.
- **Cisti di Ibernazione Minerale:** in condizioni avverse si racchiude
  in una cisti protettiva con pareti rigidamente mineralizzate che
  resistono a calore e pressione; funzione primaria: entrare in stasi e
  proteggersi.

### 7. *Soniptera resonans* — Libellula Sonica {#evo-guida-ai-tratti-1-7-soniptera-resonans-libellula-sonica}

**Classificazione:** Insecta; insetto volante di grandi dimensioni che
abita oasi termiche e praterie arbustive.

**Firma funzionale:** utilizza il suono sia come arma sia come difesa,
generando onde ad alta intensità e producendo campi sonori caotici che
confondono i predatori; manovra con eccezionale agilità grazie a
reazioni neurali rapidissime.

**Descrizione visiva:** corpo snello e allungato; ali trasparenti con
venature accentuate che vibrano a frequenze variabili; testa dotata di
grandi occhi composti, adatti a rilevare vibrazioni; colori iridescenti
che cangiano alla luce.

**Tratti principali:**

- **Ali Fono‑Risonanti:** ali con venature strutturate come corde che
  vibrano generando onde sonore da ultrasuono a frequenze udibili;
  funzione primaria: generare suoni e onde d’urto.
- **Onda di Pressione Focalizzata (Cannone Sonico):** capacità di
  focalizzare le onde sonore in un raggio stretto ad alta intensità per
  stordire o ferire; funzione primaria: colpire con onde di pressione.
- **Campo di Interferenza Acustica:** emissione di rumori bianchi
  complessi che mascherano la posizione dell’animale e neutralizzano
  l’ecolocalizzazione dei predatori; funzione primaria: confondere e
  disorientare.
- **Cervello a Bassa Latenza:** sistema nervoso con sinapsi super‑veloci
  che permette manovre fulminee e precisione millimetrica nell’attacco
  sonico; funzione primaria: reazioni rapide e pilotaggio agile.
- **Occhi Cinetici:** organi visivi ottimizzati per rilevare le
  distorsioni dell’aria generate dalle onde sonore e dalle vibrazioni;
  funzione primaria: vedere il suono.

### 8. *Anguis magnetica* — Anguilla Geomagnetica {#evo-guida-ai-tratti-1-8-anguis-magnetica-anguilla-geomagnetica}

**Classificazione:** rettile/pesce serpiforme; vive in estuari torbidi e
lagune tranquille; sfrutta il magnetismo terrestre.

**Firma funzionale:** creatura serpiforme che manipola i campi magnetici
per navigare, generare impulsi che stordiscono le prede e scivolare a
bassa frizione su terra e acqua, nutrendosi di metalli disciolti e
proteggendosi con bozzoli elettromagnetici.

**Descrizione visiva:** corpo lungo e flessuoso ricoperto da scaglie
scure; nessuna pinna evidente; la pelle è leggermente iridescente;
movimento silenzioso; occhi piccoli; comportamenti lenti e furtivi.

**Tratti principali:**

- **Integumento Bipolare:** pelle ricoperta di sensori biologici
  contenenti magnetite che permettono di rilevare le linee di campo
  magnetico per la navigazione; funzione primaria: orientarsi e
  comunicare.
- **Organo Elettrico a Risonanza Magnetica (Elettromagnete Biologico):**
  organo che modifica correnti elettriche interne per creare campi
  magnetici pulsati che interferiscono con i sistemi nervosi delle
  prede; funzione primaria: attaccare a distanza con campi magnetici.
- **Scivolamento Magnetico:** produzione di una bolla magnetica attorno
  al corpo che riduce l’attrito con l’ambiente, permettendo movimenti
  silenziosi su acqua o terra; funzione primaria: muoversi in maniera
  furtiva.
- **Filtro Metallofago:** organo digerente specializzato nell’assorbire
  metalli traccia (ferro, rame) dall’acqua e dal terreno, necessari per
  mantenere la bioelettrogenesi; funzione primaria: nutrirsi di metalli
  essenziali.
- **Bozzolo Magnetico:** capacità di creare un campo magnetico isolante
  che forma un bozzolo protettivo, bloccando tutte le interferenze
  elettromagnetiche esterne; funzione primaria: ibernarsi e schermarsi
  dalle minacce.

### 9. *Umbra alaris* — Uccello Ombra {#evo-guida-ai-tratti-1-9-umbra-alaris-uccello-ombra}

**Classificazione:** Aves; predatore notturno che vive in foreste dense,
canyons ombrosi e ambienti rocciosi.

**Firma funzionale:** volatile furtivo che assorbe quasi tutta la luce
incidente grazie a piume nano‑strutturate, caccia nel buio più completo
utilizzando occhi multi‑spettrali e artigli ipo‑termici, e comunica in
modo quasi invisibile con segnali luminosi di coda.

**Descrizione visiva:** medio grande, corpo snello ma solido; piumaggio
nero opaco; ali silenziose; occhi grandi e lucenti; artigli ricurvi;
coda con penne lunghe e sensibili che si illuminano debolmente durante
la comunicazione.

**Tratti principali:**

- **Vello di Assorbimento Totale:** piumaggio con nano‑strutture che
  assorbono il 99,9% della luce incidente, rendendo l’animale
  praticamente invisibile di notte; funzione primaria: mimetismo
  assoluto.
- **Visione Multi‑Spettrale Amplificata:** occhi capaci di raccogliere
  luce UV, IR e calore corporeo, consentendo di cacciare in assenza di
  luce; funzione primaria: rilevare prede al buio.
- **Motore Biologico Silenzioso:** metabolismo a bassissimo consumo
  energetico che consente lunghi periodi di volo senza fatica e un volo
  quasi totalmente silenzioso; funzione primaria: volare a lungo senza
  farsi sentire.
- **Artigli Ipo‑Termici:** artigli che, al contatto, rilasciano
  rapidamente agenti chimici che provocano un raffreddamento locale e
  shock termico nella preda; funzione primaria: immobilizzare tramite
  shock da freddo.
- **Comunicazione Coda‑Coda Fotonica:** scambio di impulsi luminosi
  tramite le penne della coda senza emettere suono, permettendo
  comunicazione stealth con altri individui; funzione primaria:
  comunicare senza fare rumore.

### 10. *Rupicapra sensoria* — Camoscio Psionico {#evo-guida-ai-tratti-1-10-rupicapra-sensoria-camoscio-psionico}

**Classificazione:** Mammalia; erbivoro montano che vive su cenge
calcaree e dorsali ventose.

**Firma funzionale:** ungulato che ha trasformato le corna in antenne
psioniche e sviluppato una coscienza collettiva; utilizza il campo
mentale per proteggere il branco e condivide energia e sostanze
nutritive con i consimili.

**Descrizione visiva:** simile a un camoscio con corna allungate a forma
di forcella; mantello spesso; zoccoli ampliati con superfici
micro‑adesive; occhi acuti; atteggiamento attento e cooperativo.

**Tratti principali:**

- **Corna Psico‑Conduttive:** corna modificate che agiscono come antenne
  per ricevere e trasmettere segnali psionici a bassa frequenza tra i
  membri del branco; funzione primaria: stabilire una rete telepatica.
- **Coscienza d’Alveare Diffusa:** le menti degli individui si fondono
  in una coscienza collettiva quando sono vicini, aumentando
  l’elaborazione di informazioni e la pianificazione di gruppo; funzione
  primaria: formare una mente alveare.
- **Aura di Dispersione Mentale:** la mente collettiva può generare un
  segnale psionico che provoca confusione o vertigini nei predatori
  vicini; funzione primaria: respingere e confondere i predatori.
- **Metabolismo di Condivisione Energetica:** i membri sani possono
  trasferire riserve energetiche o composti curativi ai membri feriti
  tramite contatto fisico; funzione primaria: curare e sostenere il
  gruppo.
- **Unghie a Micro‑Adesione:** zoccoli con superfici microscopiche
  simili a quelle del geco che permettono adere a pareti lisce e rocce
  verticali; funzione primaria: arrampicarsi con trazione superiore.

## Ecotipi e varianti ecologiche {#evo-guida-ai-tratti-1-ecotipi-e-varianti-ecologiche}

Le creature del **Evo Tactics Pack v2** non sono statiche: ogni specie
può sviluppare varianti locali denominate **ecotipi** quando si adatta a
un bioma o a condizioni ambientali specifiche. Gli ecotipi modificano
alcune metriche dei tratti (ad esempio aumentano la tolleranza al freddo
o riducono la velocità d’attacco) senza cambiare la struttura di base
della specie. Nel pacchetto questi dettagli sono archiviati in file
dedicati all’interno della cartella `ecotypes/`. Qui sotto trovi una
panoramica sintetica delle varianti generate in questa conversazione.

- *Elastovaranus hydrus* dispone di due ecotipi:
- **Gole Ventose** (bioma roccioso): lamelle sismiche più sensibili
  migliorano la rilevazione delle vibrazioni, mentre l’ectotermia
  dinamica è ottimizzata per correnti d’aria fredde.
- **Letti Fluviali** (bioma umido): l’impatto del colpo proiettile è
  smorzato dalla sabbia bagnata e la velocità del rostro è leggermente
  ridotta, ma la creatura resiste meglio all’umidità.
- *Gulogluteus scutiger* presenta varianti come **Chioma Umida** e
  **Forre Umide** che affinano la presa della coda e l’aderenza della
  pelliccia in ambienti ricchi di muschio. In compenso, la corazza e il
  pelo più densi riducono la velocità di corsa su lunga distanza.
- *Perfusuas pedes* evolve ecotipi come **Cavernicolo** (con sacche
  esterne più spesse e apparato miriapode più aderente alle pareti) e
  **Radura Notturna** (con sonar più potente ma sistema immunitario meno
  stabile). Questi aggiustamenti bilanciano la vulnerabilità in ambienti
  aperti e la capacità di arrampicata.
- *Terracetus ambulator* sviluppa **Pianure Ventose** (scheletro più
  leggero per resistere alle raffiche ma ciglia più corte) e
  **Savanicola Notturno** (maggiore resistenza al freddo grazie a un
  siero criogeno potenziato, ma velocità di movimento ridotta su
  superfici sabbiose).
- *Chemnotela toxica* presenta ecotipi come **Radura Acida** (acido più
  potente ma reni più lenti) e **Chioma Elettrofilo** (seta altamente
  conduttiva con un carico elettrico maggiore ma minore quantità
  prodotta), adattandosi a zone con diversa acidità del suolo.
- *Proteus plasma* ha varianti **Stagno Quieto** (cisti di ibernazione
  più rapide e membrane più spesse) e **Torrente Lento** (flusso
  ameboide accelerato ma minor resistenza alla pressione), bilanciando
  la necessità di protezione e movimento.
- *Soniptera resonans* produce ecotipi come **Oasi Termica** (ali più
  larghe e onda di pressione meno intensa ma più estesa) e **Prateria
  Arbustiva** (emissione sonora più direzionale ma minor campo di
  interferenza), ottimizzando attacco e difesa in ambienti differenti.
- *Anguis magnetica* esibisce varianti **Estuario Torbido** (campo
  magnetico pulsato più forte ma scivolamento magnetico meno efficiente)
  e **Laguna Quieta** (bozzolo elettromagnetico più duraturo ma organo
  elettrico meno potente), adattandosi a diverse salinità dell’acqua.
- *Umbra alaris* è rappresentata da ecotipi **Canopy Ombrosa**
  (piumaggio ancora più assorbente e occhi maggiormente sensibili agli
  infrarossi) e **Canyon Notturno** (artigli ipo‑termici più efficaci ma
  consumo energetico maggiore), bilanciando invisibilità e shock
  termico.
- *Rupicapra sensoria* infine sviluppa ecotipi come **Cenge
  Calcarenitiche** (corna più lunghe e potente campo mentale, ma zoccoli
  meno aderenti) e **Dorsali Ventose** (sistema energetico condiviso più
  efficiente ma aura di dispersione ridotta), per far fronte alla
  geologia e al clima delle montagne.

Gli ecotipi arricchiscono la narrazione e la meccanica di gioco,
consentendo di personalizzare le creature e adattarle a nuovi contesti.
Per ogni specie le etichette degli ecotipi sono elencate nel campo
`ecotypes` del file specie, mentre i dettagli e i delta metrici sono nel
file dedicato in `ecotypes/<genus_species>_ecotypes.json`.

## Catalogo master e indici {#evo-guida-ai-tratti-1-catalogo-master-e-indici}

Nel pacchetto v2 è incluso un **catalogo master**
(`catalog/master.json`) che aggrega tutte le specie e tutti i tratti in
un unico documento. Questo file contiene:

- **metadata**: versione del catalogo, data di generazione, unità
  utilizzate (UCUM) e link agli schemi JSON.
- **stats**: conteggi di specie e tratti totali, breakdown per
  macro‑classi e per livelli (tier) dei tratti.
- **species**: per ogni specie vengono riportate le chiavi principali,
  l’elenco dei nomi volgari, le abbreviazioni, i riferimenti ai tratti e
  un sommario incorporato dei tratti (codice, etichetta, funzione, tier,
  metriche principali).
- **traits**: l’intero dizionario dei tratti con tutti i campi definiti
  nel template v2, pronto per essere filtrato o visualizzato da un tool
  esterno.
- **ecotypes_index**: un indice separato (`catalog/ecotypes_index.json`)
  elenca le varianti ecologiche di tutte le specie, associando ciascuna
  etichetta all’id, al file di riferimento e al numero di tratti
  modificati.
- **aliases**: un file `data/aliases/species_aliases.json` permette di
  mantenere compatibilità con nomi precedenti, reindirizzando ad esempio
  `Hydrogluteus pinguis` e `Glutogulo scutatus` verso il nuovo binomiale
  `Gulogluteus scutiger`.

Questa struttura consente al tuo engine di caricare un’unica risorsa
JSON e ottenere tutte le informazioni necessarie per generare creature,
applicare modifiche ecotipiche, costruire filtri o statistiche. È buona
norma aggiornare sempre il catalogo master quando si aggiunge o modifica
una specie o un tratto.

## Uso del pacchetto e prossimi passi {#evo-guida-ai-tratti-1-uso-del-pacchetto-e-prossimi-passi}

Per integrare o espandere il **Evo Tactics Pack v2** nel tuo progetto,
procedi in questo modo:

1.  **Leggi la guida**: consulta questa guida e i documenti integrativi
    per comprendere lo stile di nomenclatura, le specifiche v2 e le best
    practice. Assicurati di avere familiarità con le unità UCUM e con i
    campi obbligatori.
2.  **Convalida i dati**: prima di committare nuove specie o tratti,
    esegui lo script `scripts/validate.sh` per assicurarti che i file
    rispettino gli schemi JSON. Il validatore segnala errori strutturali
    (campi mancanti, unità non conformi, versioning assente).
3.  **Crea nuovi tratti** seguendo la checklist del
    `README_HOWTO_AUTHOR_TRAIT.md`. Scegli codici univoci, definisci le
    metriche e indica sinergie/conflitti. Ricorda di descrivere sempre
    trigger, limiti, costi e testabilità.
4.  **Definisci nuove specie** partendo dalla firma funzionale. Scegli
    un binomiale coerente e un nome volgare evocativo. Compila i campi
    descrittivi e assicurati che i tratti coprano tutti gli assi
    funzionali. Se necessario, introduci ecotipi per ambienti diversi.
5.  **Aggiorna i cataloghi**: dopo aver creato o modificato file,
    aggiorna `species_catalog.json`, `traits_aggregate.json` e il
    `catalog/master.json` (puoi generarlo via script). Aggiorna anche
    l’indice degli ecotipi se ne aggiungi di nuovi.
6.  **Documenta e condividi**: per ogni aggiunta, scrivi un changelog o
    una nota in `versioning` con la data e la motivazione. Questo aiuta
    altri autori a comprendere l’evoluzione del pacchetto.

Seguendo questi passi e facendo riferimento costante alla guida, potrai
espandere il bestiario in modo coerente, mantenendo la compatibilità con
l’ecosistema Evo Tactics e offrendo ai giocatori o agli utilizzatori un
universo criptozoologico ricco, strutturato e bilanciato.
