# Guida Evo Tactics Pack v2: sommario e piano operativo

## Accesso rapido

- [Scheda operativa dei trait](./traits_scheda_operativa.md)
- [Guida autore tratti](README_HOWTO_AUTHOR_TRAIT.md)
- [Template dati dei tratti](./traits_template.md)
- [Scala di senzienza (T0–T5)](README_SENTIENCE.md)
- [Aggregato tratti Evo](../data/external/evo/traits/traits_aggregate.json)
- [Catalogo specie Evo](../data/external/evo/species/species_catalog.json)

## Introduzione

Questa guida raccoglie tutto il materiale creato durante la conversazione e lo organizza in un unico documento operativo per il Evo Tactics Pack v2. Il pacchetto nasce per facilitare la definizione, la catalogazione e l'uso di creature e tratti criptozoologici in un ambiente di gioco o simulazione. Questa guida spiega in modo organico:

- quali sono le specifiche standard (v2) per le schede Specie e Tratti,
- come assegnare nomi coerenti e descrizioni funzionali,
- la procedura consigliata per migrare dati esistenti dalla versione v1 alla nuova struttura,
- la struttura dei pacchetti forniti (cartelle, file, script di validazione),
- come utilizzare gli ecotipi per creare varianti locali delle specie,
- i passi successivi per integrare e validare i contenuti nel tuo repository.

La guida è pensata per essere salvata nella cartella `docs/` del progetto e offre un punto di partenza unificato per chiunque voglia contribuire o consultare il database criptozoologico.

---

## Compatibilità Evo Pack v2

Per integrare i tratti provenienti da pacchetti Evo con il repository ufficiale, consulta la mappa di allineamento campi e le regole di naming in `docs/traits_evo_pack_alignment.md`. Il documento spiega come convertire i codici `TR-xxxx` in `id` snake_case, come impostare `label` i18n e come usare il flusso combinato glossario → file trait → validazioni (`trait_template_validator`, `collect_trait_fields`, `sync_trait_locales`, `validate.sh`/`ajv`).

> **Box riepilogo conversione `trait_code` → `id`/`label`**
>
> - Flusso: aggiorna il glossario (`data/core/traits/glossary.json`), crea/aggiorna il file del tratto con `id` snake_case e riferimenti `label` i18n, poi lancia i validator/sync (`trait_template_validator`, `collect_trait_fields`, `sync_trait_locales`).
> - Naming: `trait_code` Evo diventa `id` snake_case coerente con il label (nome file JSON); il `label` del tratto punta a `i18n:traits.<id>.label` (e viene valorizzato nel glossario).
> - Esempio minimo: `trait_code` `TR-0420` “Vortice Termico” → `id` `vortice_termico`; `label` nel file tratto: `i18n:traits.vortice_termico.label`; i campi `label_it`/`label_en` sono nel glossario.
> - Riferimento completo alle regole e agli esempi in [docs/traits_evo_pack_alignment.md](./traits_evo_pack_alignment.md) per evitare ambiguità di naming.

---

## Specifiche standard v2

> **Box campi obbligatori (repository ufficiale)**
>
> - **id**: snake_case allineato al nome file JSON e derivato dal `trait_code` (es. `TR-0420` → `vortice_termico`).
> - **label**: puntare sempre a `i18n:traits.<id>.label` (la stringa localizzata sta nei file i18n/glossario, non nel tratto).
> - **data_origin**: usare solo gli slug ufficiali (vedi tabella in `docs/traits_evo_pack_alignment.md`).
> - **mutazione_indotta**, **uso_funzione**, **spinta_selettiva**: frasi brevi e misurabili, obbligatorie per ogni tratto.
> - **sinergie**/**conflitti**: liste di `id` (non `trait_code`) per la compatibilità interna.
> - Altri campi obbligatori: `famiglia_tipologia`, `fattore_mantenimento_energetico`, `tier`, `slot`, `sinergie`/`conflitti`, `mutazione_indotta`, `uso_funzione`, `spinta_selettiva`.
> - Schema e definizioni canoniche: seguire `docs/traits_evo_pack_alignment.md` e la [scheda operativa dei trait](./traits_scheda_operativa.md), che rimane la fonte canonica dei requisiti minimi.
>
> **Box campi opzionali/consigliati (Evo Pack v2)**
>
> - **metrics** (UCUM): consigliate per descrivere prestazioni e range; non sono obbligatorie per l'import in `data/traits/*.json`.
> - **cost_profile**: suggerito per indicare i costi energetici (`rest`/`burst`/`sustained`).
> - **testability**: raccomandato per fornire `observable` e `scene_prompt`, utile nei pacchetti ma non richiesto dai validator del repository.
>
> **Esempio mappatura `trait_code` → `id`/`label`**
>
> - `trait_code` `TR-0420` "Vortice Termico" → `id` `vortice_termico`; `label` nel file tratto: `i18n:traits.vortice_termico.label`.
> - Nota: nel repository il file JSON deve usare `id`/`label` i18n; `trait_code` serve solo come alias di riferimento.

Le schede creatura sono strutturate secondo due schemi JSON (schema specie e schema tratto). Ogni Specie (file in `species/`) deve contenere i seguenti campi principali:

- **scientific_name**: nome binomiale (_Genus species_) con radici greco-latine coerenti con la firma funzionale.
- **common_names**: uno o due nomi volgari evocativi (es. “Viverna-Elastico”).
- **classification**: classe macro (es. _Mammalia, Reptilia, Arthropoda_) e descrizione sintetica dell’habitat/ecotopo primario.
- **functional_signature**: 1–2 frasi che descrivono ciò che la specie fa “meglio di tutte”, cioè la sua firma operativa (attacco, difesa, mobilità, sensi, riproduzione…).
- **visual_description**: 5–8 righe sulla morfologia esterna (forma, postura, proporzioni, colori, texture, gesti tipici). Evita termini poetici: privilegia l’osservazione e l’azione.
- **risk_profile**: pericolosità su scala 0–3 e vettori (tossine, patogeni, onde d’urto…).
- **interactions**: elenco di prede tipiche, predatori, eventuali simbiosi/parassitismi (descrivere il patto biologico quando esiste).
- **constraints**: almeno due limitazioni o trade-off (costi metabolici elevati, necessità di ambienti specifici, contromisure note).
- **sentience_index**: indice di senzienza (T0–T5) secondo la scala definita nei [documenti di riferimento](README_SENTIENCE.md).
- **ecotypes**: etichette delle varianti ecologiche (vedi sezione _Ecotipi_). I dettagli delle varianti sono in file separati sotto `ecotypes/`.
- **trait_refs**: array di codici che puntano ai tratti (file in `traits/`). Ogni specie deve avere 5–9 tratti totali, coprendo tutti gli assi possibili:
  - locomozione/manipolazione
  - alimentazione/digestione
  - sensi/percezione
  - attacco/difesa
  - metabolismo/termo-respiro
  - riproduzione/ciclo vitale

Ogni Tratto (file in `traits/`) è un elemento atomico e deve includere:

- **trait_code**: codice univoco `TR-0000` (per il catalogo globale) o `SPEC_ABBR-TRxx` (per associare il tratto a una specie). Nel catalogo gli stessi tratti possono essere riutilizzati da più specie.
- **label**: denominazione criptozoologica, formata da sostantivo + qualificatore (2–3 parole). La scrittura segue il _Title Case_ (iniziali maiuscole per le parole significative, minuscole per preposizioni come “a”, “di”).
- **famiglia_tipologia**: categoria generale (es. Difensivo/Termoregolazione, Locomotivo/Balistico, Sensoriale/Tatto-Vibro…).
- **fattore_mantenimento_energetico**: _Basso, Medio_ o _Alto_, indicativo del costo per mantenere il tratto attivo.
- **tier**: T1–T5 (con costo/complessità/impatti crescenti). Tier elevati indicano poteri eccezionali con costi metabolici o vincoli severi.
- **slot**: elenco opzionale per definire ruoli speciali o raggruppamenti (può restare vuoto).
- **sinergie** e **conflitti**: liste di codici trait. I tratti in sinergia potenziano le funzioni reciproche; quelli in conflitto non possono coesistere. Nel pack puoi indicare `trait_code` con alias `id`, ma nei JSON del repository vanno usati solo gli `id` snake_case (vedi tabella di mapping in [docs/traits_evo_pack_alignment.md](./traits_evo_pack_alignment.md)).
  - **Esempio sinergie/conflitti (pack → repo)**: `sinergie: ["TR-0421" (alias: condotto_laminare)]`, `conflitti: ["TR-0502" (alias: ipertermia_cronica)]` nel pack diventano `sinergie: ["condotto_laminare"]`, `conflitti: ["ipertermia_cronica"]` nei file del repository.
- **requisiti_ambientali**: condizioni o biome in cui il tratto è efficace (campo libero accompagnato da eventuali termini ENVO).
- **mutazione_indotta**: breve frase sull’origine anatomica (es. “Ghiandole olocrine ad alta densità”).
- **uso_funzione**: verbo + oggetto che definisce la funzione principale (es. “Isolare e galleggiare”).
- **spinta_selettiva**: descrive la pressione evolutiva che ha favorito il tratto (predazione, climi estremi, competizione…).
- **metrics**: array di oggetti che misurano la performance del tratto. Ogni metrica ha `name`, `value` e `unit` e deve usare simboli UCUM (es. `m/s`, `J`, `Cel`, `L/min`, `dB·s`). Preferire intervalli o ordini di grandezza e indicare le condizioni (aria, acqua, temperatura).
- **cost_profile**: costi energetici nelle fasi `rest` (riposo), `burst` (scatto breve) e `sustained` (sforzo prolungato).
- **testability**: indica cosa si può osservare per verificare il tratto (`observable`) e fornisce uno `scene_prompt` per test narrativi ripetibili.
- **applicability**: facoltativo; può elencare cladi biologici e termini ENVO.
- **version** e **versioning**: numerazione SemVer (`version`) e dettagli (date di creazione/aggiornamento, autore) in `versioning`.

> **Promemoria alias `trait_code` vs `id` (repo Game)**
>
> - Nei file del pacchetto puoi includere `trait_code` come alias (es. `TR-0420`), ma nei JSON del repository ufficiale devi usare `id` snake_case e `label` puntato a `i18n:traits.<id>.label`.
> - Il campo `trait_code` resta utile per il pack e per i riferimenti cross-doc (inclusi gli alias mostrati negli esempi qui sotto), mentre i validator del repo si aspettano sempre `id`/`label` i18n.
> - Suggerimento operativo: tieni entrambi i valori nel pack (`trait_code` + alias `id`) ma, quando porti i dati nel repository Game, compila le chiavi con `id` e `label` i18n (non con `trait_code`).

La definizione dei tratti deve evitare ridondanze: ogni tratto deve essere atomico, cioè con una funzione principale chiara e testabile. Per ogni super-abilità occorre indicare almeno un limite o contromisura (raffreddamento, saturazione, schermature, rumore di fondo…).

---

## Guida allo stile

Per rendere il database coerente, si seguono regole precise per nomi e descrizioni:

### Specie

- Il nome scientifico deve essere in corsivo (quando pubblicato), con _Genus_ maiuscolo e specie minuscola.
- Dev’essere univoco e coerente con la firma funzionale.
- L’abbreviazione `species` (per codici trait) è composta dalle tre lettere del _Genus_ più due lettere della specie (es. _Elastovaranus hydrus_ → `EHY`).
- I nomi volgari devono essere brevi, evocativi e legati alla firma funzionale (es. “Ghiotton-Scudo”).

### Tratti

- La denominazione criptozoologica si compone di un sostantivo e un qualificatore.
- Se i qualificatori sono co-primari, si usa il trattino (es. “Emostatico-Litico”).
- Se indicano un meccanismo, si usa “a” o “di” (es. “Scheletro Idraulico a Pistoni”).
- Utilizzare sempre termini precisi e coerenti (“prensile” al posto di “presile”, “cheratinizzato” al posto di “cheratinoso”, ecc.).
- La funzione primaria è scritta come verbo + oggetto e deve essere misurabile.

### Descrizioni

- Nelle descrizioni funzionali usare 1–3 frasi, includendo range numerici realistici con unità UCUM, evitando lirismi.
- Le descrizioni visive delle specie devono fornire informazioni sull’aspetto e sui comportamenti tipici senza andare troppo nel fantasioso.

### Coerenza interna

- Non associare a una specie tratti mutuamente esclusivi (es. “cieco totale” insieme a “visione multispettrale”) senza giustificarli come stadi o ecotipi.
- Evitare duplicazioni di funzione: se due tratti fanno esattamente la stessa cosa, rivedere la definizione.

---

## Pipeline di migrazione (v1 → v2)

Per aggiornare schede esistenti alla versione v2 si consiglia di seguire questa procedura:

1. **Mappare i campi**
   Convertire i vecchi campi nei nuovi (es. `categoria` → `famiglia_tipologia`; `costo_energetico` → `fattore_mantenimento_energetico`), aggiungendo i campi mancanti (`sinergie`, `conflitti`, ecc.). Nei pacchetti Evo è consigliato integrare anche `metrics`, `cost_profile` e `testability`, ma non sono necessari per l'import nei JSON finali in `data/traits/*.json` (requisiti minimi sempre nella [scheda operativa](./traits_scheda_operativa.md)).

2. **Aggiornare unità**  
   Assicurarsi che tutte le metriche usino simboli UCUM (`°C` → `Cel`, `bpm` → `/min`, `km/h` → `m/s`). Quando necessario convertire i valori.

3. **Normalizzare i nomi**  
   Adattare le denominazioni dei tratti al nuovo stile; ad esempio:
   - “Coda Presile” → “Coda Prensile Muscolare”
   - “Idrorepellente” → “Pelage Idrorepellente”
   - “Cheratinoso” → “Cheratinizzato”.

4. **Compilare testabilità e costi**  
   Inserire campi `observable`, `scene_prompt` e `cost_profile` realistici per ogni tratto. Specificare sinergie e conflitti tramite codici.

5. **Aggiungere versioning**  
   Per ogni file, introdurre la chiave `version` (SemVer) e la sezione `versioning` con date e autore.

6. **Validare**  
   Usare lo script `scripts/validate.sh` che impiega `ajv` per convalidare i file contro gli schemi.

Seguendo questa pipeline, le schede esistenti possono essere migrate senza perdere informazioni e diventando compatibili con gli strumenti del pacchetto v2.

### Validazione nel repository Game

Nel repository Game i controlli vanno eseguiti con la toolchain Python, che copre sia struttura dati sia glossari/localizzazioni:

- `python tools/py/trait_template_validator.py ...`
- `python tools/py/collect_trait_fields.py ...`
- `python scripts/sync_trait_locales.py ...`

Ricorrere a `scripts/validate.sh`/`ajv` solo per validare pacchetti esterni; per i file che entrano in repository usare i comandi Python sopra.

---

## Struttura del pacchetto

Il pacchetto completo è organizzato in cartelle:

- `docs/` contiene:
  - il prontuario delle metriche (UCUM),
  - il manuale dell’autore di tratti,
  - una reference dei tratti,
  - questa guida,
  - la checklist QA.

- `templates/` include gli schemi JSON:
  - `species.schema.json`
  - `trait.schema.json`  
    che definiscono la struttura dei file.

- `species/` contiene i file individuali per ogni specie (es. `elastovaranus_hydrus.json`), più un `species_catalog.json` che indicizza tutte le specie.  
  In questa cartella è stato introdotto anche `gulogluteus_scutiger.json` come nuova versione della creatura precedentemente nota come “Culocinghiale”; i nomi precedenti sono mantenuti tramite alias.

- `traits/` contiene i file dei tratti (`TR-1101.json`, `TR-1201.json`…) e un aggregato `traits_aggregate.json` con l’elenco completo. Ogni file tratto segue il template v2.

- `ecotypes/` (aggiunto nella versione PLUS) contiene file `<genus_species>_ecotypes.json` con le varianti locali (ecotipi), ognuna con modifiche alle metriche dei tratti.  
  In `species/<genus_species>.json` il campo `ecotypes` elenca solo le etichette; i dettagli sono separati.

- `data/aliases/` contiene un file `species_aliases.json` che mappa eventuali nomi vecchi o alternativi alle nuove denominazioni (es. “Hydrogluteus pinguis” → “Gulogluteus scutiger”).

- `scripts/` ospita `validate.sh`, uno script bash che usa `ajv-cli` per validare tutti i file specie e tratti rispetto agli schemi.

Inoltre è presente un file `catalog/master.json` che funge da indice unificato per tool esterni: oltre a riepilogare specie e tratti, fornisce:

- statistiche (numero di specie, tratti per classe macro, breakdown per tier),
- percorsi agli schemi,
- un elenco dei tratti embedded dentro ogni specie.

---

## Ecotipi e varianti

Gli ecotipi permettono di declinare una stessa specie in varianti locali adattate a contesti specifici. Ogni file in `ecotypes/` specifica per una specie:

- un `id` (es. `EHY-ECO1`),
- un `label` (nome evocativo dell’ecotipo),
- un `biome_class` e eventuali `envo_terms` per definire l’ambiente,
- un array di `trait_adjustments` che contiene modifiche (delta) alle metriche dei tratti della specie, specificando:
  - il codice tratto,
  - la metrica,
  - il delta numerico,
  - l’unità,
  - le note.

Esempio: l’ecotipo “Gole Ventose” per _Elastovaranus hydrus_ riduce la velocità del proiettile di 10 m/s in aria satura e migliora la tolleranza termica di 5 K.

Nel file della specie (`species/<genus_species>.json`), il campo `ecotypes` deve contenere solo le etichette (“Gole Ventose”, “Letti Fluviali”); i dettagli dell’ecotipo sono nel file corrispondente in `ecotypes/`. Per aggiungere un nuovo ecotipo occorre:

1. Creare un file `<genus_species>_ecotypes.json` se non esiste, oppure aggiungere un nuovo oggetto all’array `ecotypes` nel file esistente.
2. Aggiornare il campo `ecotypes` della specie inserendo l’etichetta.
3. Definire i `trait_adjustments` coerenti con l’ambiente e le pressioni selettive locali.

---

## Strumenti di validazione e QA

Per garantire la coerenza del database si consiglia di eseguire regolarmente il controllo di qualità:

- **Validazione nel repo Game**
  Per i pacchetti integrati direttamente in questo repository utilizzare i tre comandi principali (da lanciare nella root del repo) che coprono schema, campi e localizzazioni:
  - `python tools/py/trait_template_validator.py ...`
  - `python tools/py/collect_trait_fields.py ...`
  - `python scripts/sync_trait_locales.py ...`

  Seguono i wrapper dettagliati nella [Checklist di validazione automatica in `docs/traits_scheda_operativa.md`](traits_scheda_operativa.md#checklist-di-validazione-automatica-comandi-rapidi).

- **Validazione per pacchetti esterni**
  Per pacchetti distribuiti fuori dal repo Game (ad esempio contributi terzi o bundle separati) si può usare facoltativamente `scripts/validate.sh` che invoca `ajv-cli`. Preferirlo quando:
  - il pacchetto deve essere validato in un ambiente dove gli strumenti Python non sono disponibili,
  - serve una verifica rapida e self-contained contro gli schemi JSON senza dipendere dalla struttura del repo.

- **UCUM**
  Verificare che le unità delle metriche siano conformi al prontuario UCUM (`Cel` per gradi Celsius, `m/s` per velocità lineare, `J` per energia, `dB·s` per dose sonora…).

- **QA Checklist**
  Seguire la lista di controllo `qa/QA_TRAITS_V2.md` che ricorda di compilare:
  - testabilità,
  - sinergie/conflitti,
  - versioning,
  - ecotipi,
  - alias.

---

## Prossimi passi e raccomandazioni

- **Mergiare i pacchetti**  
  Integrare le cartelle `docs/`, `templates/`, `species/`, `traits/`, `data/` e `scripts/` nel proprio repository.  
  Assicurarsi che `species_catalog.json` e `traits_aggregate.json` vengano aggiornati con i nuovi file.

- **Aggiornare le schede esistenti**  
  Migrare le specie e i tratti già presenti nel database alla struttura v2 seguendo la pipeline di migrazione.  
  Per le specie rinominate (es. “Culocinghiale”), mantenere gli alias per retro-compatibilità.

- **Espandere con nuovi ecotipi**  
  Utilizzare il formato `ecotypes/` per modellare varianti ecologiche e adattamenti locali.  
  Includere sempre `envo_terms` per facilitare l’integrazione con ontologie ambientali.

- **Sviluppare tool di analisi**  
  Con il catalogo unificato (`catalog/master.json`) è possibile costruire filtri, ricerche e viste personalizzate (ad es. “mostra tutti i tratti tier 4 che richiedono un bioma umido”).

- **Documentare e versionare**  
  Ogni nuova specie o tratto deve includere una versione (`version: "2.0.0"`) e aggiornare `versioning.created/updated`.  
  Le modifiche devono essere annotate nei commit o nei changelog per facilitare la tracciabilità.

---

## Conclusione

Il Evo Tactics Pack v2 fornisce un sistema coerente, estensibile e verificabile per la creazione e la gestione di creature criptozoologiche e dei loro tratti. Seguendo questa guida, gli autori possono:

- uniformare le schede,
- evitare ambiguità,
- mantenere un database sempre validato.

L’aggiunta delle varianti ecologiche (ecotipi) e del catalogo master consente di adattare rapidamente il materiale a nuovi ambienti narrativi o di gioco, mantenendo al contempo un forte controllo sulla coerenza biologica e meccanica.

---

## Documentazione integrativa del pacchetto

Oltre alle specifiche e alle regole descritte sopra, il pacchetto include tre documenti di supporto che definiscono in dettaglio:

- le procedure di authoring dei tratti,
- la validazione,
- le unità di misura.

Poiché questo documento viene distribuito senza il pacchetto fisico, se ne riassumono qui i contenuti fondamentali, così da non perdere nessuna informazione essenziale.

### How-to autore trait (estratto)

La guida rapida per l’autore di tratti fornisce una checklist operativa per scrivere un nuovo trait in pochi minuti. I punti principali includono:

- **Naming & codifica**
  - utilizzare codici `TR-####` univoci,
  - scegliere label di 2–4 parole evocative,
  - assegnare una famiglia funzionale (`famiglia_tipologia`),
  - assegnare un `tier` coerente con la scala di potenza (da T1 a T6).

- **Checklist di compilazione**
  - definire la funzione (`uso_funzione`),
  - definire la mutazione da cui deriva (`mutazione_indotta`),
  - definire la spinta selettiva (`spinta_selettiva`),
  - associare ambienti ENVO (`applicability.envo_terms`) e requisiti ambientali,
  - impostare i costi (`fattore_mantenimento_energetico`, `cost_profile`),
  - definire i limiti (`limits`) e i trigger di attivazione,
  - definire almeno una metrica UCUM (`metrics[{name,value,unit}]`),
  - indicare sinergie e conflitti con altri tratti (`sinergie`, `conflitti`),
  - compilare la testabilità (`observable`, `scene_prompt`),
  - chiudere con `versioning` SemVer e date ISO.

- **Validazione & CI**
  - previsto uno script di validazione che verifica:
    - lo schema JSON,
    - l’uso corretto di UCUM ed ENVO,
    - il rispetto del versioning.  
      Prima di aprire una PR è consigliato eseguire il validator.

### Guida completa ai trait (estratto)

Questo documento definisce che cos’è un trait (unità atomica riusabile di funzionalità e morfologia) e descrive in modo approfondito i campi obbligatori e opzionali. Tra i punti chiave:

- **Dizionario campi**
  - il trait deve sempre contenere:
    - `trait_code`,
    - `label`,
    - `famiglia_tipologia`,
    - `fattore_mantenimento_energetico`,
    - `tier`,
    - `mutazione_indotta`,
    - `uso_funzione`,
    - `spinta_selettiva`,
    - `sinergie`,
    - `version`,
    - `versioning`.
  - altri campi sono opzionali ma consigliati (`slot`, `limits`, `output_effects`, `testability`, `cost_profile`, `applicability`, `requisiti_ambientali`...).

- **Tassonomia funzionale**
  - sistema di cluster:
    - Locomotivo
    - Sensoriale
    - Fisiologico
    - Offensivo
    - Difensivo
    - Cognitivo/Sociale
    - Riproduttivo/Spawn
    - Ecologico  
      con sottocategorie per descrivere in modo preciso la natura di un tratto.

- **Metriche & UCUM**
  - vengono elencate le unità raccomandate per:
    - velocità (`m/s`),
    - accelerazione (`m/s2`),
    - energia (`J`),
    - temperatura (`Cel`),
    - pressione (`Pa`),
    - dose acustica (`dB·s`), ecc.
  - si ricorda di usare `1` per grandezze adimensionali
  - convertire sempre in unità SI quando si archiviano i dati.

- **Requisiti ambientali & ENVO**
  - associare i tratti a particolari biomi tramite:
    - uso di URI ENVO,
    - compilazione di `requisiti_ambientali` quando sono necessari vincoli aggiuntivi.

- **Costi, limiti, trigger, testabilità**
  - descrivere:
    - costo metabolico,
    - limiti numerici o temporali,
    - trigger di attivazione,
    - prova pratica per verificare il tratto in gioco.

- **Versioning & governance**
  - uso di SemVer,
  - definizione di MAJOR/MINOR/PATCH,
  - importanza dei changelog,
  - integrazione del validator nella CI.

### Prontuario metriche & UCUM (estratto)

Questa tabella consultiva raggruppa le metriche più comuni per cluster funzionali e indica le unità UCUM consigliate. Alcuni esempi:

- **Locomotivo**
  - velocità massima (`m/s`),
  - accelerazione 0–10 (`m/s2`),
  - salto verticale (`m`),
  - autonomia di volo (`km`, convertibile in `m` per calcoli).

- **Sensoriale**
  - soglia uditiva (`dB`),
  - banda uditiva massima (`Hz`),
  - rilevabilità visiva (`1`),
  - sensibilità magnetica (`T`),
  - sensibilità elettrica (`V/m`).

- **Fisiologico**
  - temperatura del getto (`Cel`),
  - tolleranza termica (`K`),
  - metabolic rate (`W/kg`),
  - consumo O₂ (`L/min`),
  - pressione del getto (`Pa`).

- **Offensivo**
  - energia impattiva (`J`),
  - velocità del proiettile (`m/s`),
  - tensione di picco (`V`),
  - dose acustica (`dB·s`),
  - area del cono (`m2`).

- **Difensivo**
  - spessore corazza (`mm`),
  - riduzione SPL (`dB`),
  - resistenza termica (`K/W`).

- **Cognitivo/Sociale**
  - indici adimensionali (`cohesion`, `intimidazione`),
  - tempi di apprendimento (`s`).

- **Riproduttivo/Ecologico**
  - tasso propaguli (`1/season`),
  - raggio di disseminazione (`m`).

Il prontuario include anche:

- una mini-tabella con i codici UCUM più usati,
- note pratiche su:
  - come trattare unità non SI (`°C` → `Cel`, litri → `L`),
  - quando usare valori _dimensionless_.

---

## Schede delle specie e dei loro tratti

In assenza del pacchetto, questa sezione fornisce una panoramica delle dieci creature definite nel progetto, con i loro tratti principali.  
Per ogni specie vengono indicati:

- il nome scientifico,
- i nomi volgari,
- la classificazione macro,
- una descrizione sintetica,
- la firma funzionale,
- un elenco dei tratti con struttura morfologica e funzione primaria.

### 1. _Elastovaranus hydrus_ — Viverna-Elastico

- **Classificazione**: Reptilia; predatore delle savane calde con gole rocciose e letti fluviali stagionali.
- **Firma funzionale**: rettile predatore estremo che combina un attacco a lunga gittata con un sistema muscolare e scheletrico idraulico e una pre-digestione tossico-enzimatica.
- **Descrizione visiva**: corpo allungato e slanciato, cranio affusolato con un rostro tubulare; muscolatura accentuata che conferisce un aspetto massiccio; squame scure dotate di lamelle sensoriali; coda lunga per equilibrio e spinta; occhi piccoli, color ambra; movimenti fulminei ma precisi.

**Tratti principali:**

- **Scheletro Idraulico a Pistoni**  
  Ossa cave pressurizzate con fluido che amplificano l’allungamento del corpo per trasformare testa e collo in una frusta proiettile.  
  _Funzione primaria_: estendere il cranio per colpire a distanza.

- **Rostro Emostatico-Litico**  
  Appendice mascellare tubulare che, come un ago, inocula simultaneamente neurotossina, anticoagulanti e enzimi digestivi, aspirando poi i tessuti liquefatti.  
  _Funzione primaria_: inoculare tossine ed enzimi e aspirare i fluidi.

- **Ipertrofia Muscolare Massiva**  
  Sviluppo muscolare estremo, simile al manzo Belgian Blue, che fornisce la potenza necessaria per l’attacco proiettile e la retrazione immediata.  
  _Funzione primaria_: generare potenza esplosiva per scatti e contrazioni.

- **Ectotermia Dinamica (Sangue Caldo Temporaneo)**  
  Vibrazioni muscolari controllate che generano calore interno per cacciare in ambienti freddi e potenziare l’efficacia delle tossine.  
  _Funzione primaria_: aumentare la temperatura corporea e accelerare il metabolismo a richiesta.

- **Organi Sismici Cutanei**  
  Squame modificate e organi interni che rilevano le vibrazioni del terreno, permettendo all’animale di localizzare le prede senza visibilità.  
  _Funzione primaria_: rilevare vibrazioni e guidare l’attacco.

- **Autotomia Cauterizzante Accelerata**  
  Capacità di rigenerare rapidamente arti e coda persi, minimizzando la perdita di sangue.  
  _Funzione primaria_: rigenerare tessuti e sopravvivere a ferite gravi.

- **Setticemia Secolo**  
  La saliva trasporta ceppi batterici virulenti che, se la preda sopravvive all’attacco, la uccidono nelle ore o giorni successivi.  
  _Funzione primaria_: garantire la morte differita della vittima.

- **Resistenza Toxinologica Endemica**  
  L’animale è immunizzato ai propri veleni e mostra elevata resistenza alla maggior parte delle tossine naturali.  
  _Funzione primaria_: proteggersi da auto-intossicazione e tossine altrui.

---

### 2. _Gulogluteus scutiger_ — Ghiotton-Scudo

- **Classificazione**: Mammalia; onnivoro tassiforme che vive in ambienti umidi, foreste paludose e argini fluviali.
- **Firma funzionale**: grande onnivoro anfibio dotato di pelliccia oleosa idrorepellente, coda e lingua prensili che fungono da ulteriori arti, scudo posteriore cheratinizzato per la difesa e digestione omnicomprensiva.
- **Descrizione visiva**: corpo tozzo e massiccio con zampe robuste, pelliccia scura e lucida che respinge l’acqua, regione gluteale corazzata in rilievo, coda spessa e muscolosa spesso avvolta attorno a rami; lingua che si estende come una proboscide; occhi piccoli ma vivaci.

**Tratti principali:**

- **Pelage Idrorepellente a Cellule Olocrine**  
  Manto fitto e oleoso secretato da ghiandole specializzate che garantisce isolamento totale dall’acqua e galleggiamento.  
  _Funzione primaria_: isolare e galleggiare.

- **Scudo Gluteale Cheratinizzato**  
  Muscoli glutei estremamente densi rivestiti da placche cheratinose/ossee che fungono da scudo passivo contro gli attacchi posteriori.  
  _Funzione primaria_: assorbire impatti posteriori.

- **Coda Prensile Muscolare con Verticilli Ossei**  
  Coda lunga e robusta dotata di vertebre modificate che agisce come quinto arto per arrampicarsi e bilanciarsi.  
  _Funzione primaria_: appendere e contro-bilanciare.

- **Rostro Linguale Prensile (Lingua-Gru)**  
  Lingua muscolare e adesiva che può estendersi fino alla lunghezza del corpo per afferrare cibo e manipolare oggetti.  
  _Funzione primaria_: afferrare e manipolare a lungo raggio.

- **Digestione Omicomprensiva con Acidi Iodizzati**  
  Sistema digestivo capace di assimilare quasi ogni materia organica, dai vegetali alla chitina, grazie ad acidi arricchiti di iodio.  
  _Funzione primaria_: digerire qualsiasi biomassa.

- **Flessione Muscolare Ipotalamica**  
  Muscoli a reazione rapida che permettono salti verticali e scatti improvvisi ruotando il tronco con forza.  
  _Funzione primaria_: effettuare scatti rapidi e salti non lineari.

- **Sacche Respiratorie Ossidanti**  
  Organi accessori vascolarizzati che rilasciano ossigeno rapidamente, sostenendo sforzi intensi e prolungando l’apnea.  
  _Funzione primaria_: rilasciare O₂ rapido per sforzi e immersioni.

- **Articolazioni Multiassiali**  
  Giunti a sfera nelle spalle e nelle anche che consentono ai quattro arti di ruotare ampiamente, facilitando arrampicata e rotazione.  
  _Funzione primaria_: ruotare arti per manovre strette.

- **Sensibilità Sismica Profonda**  
  Struttura ossea robusta dotata di recettori capaci di rilevare vibrazioni del terreno e individuare prede sotterranee.  
  _Funzione primaria_: percepire vibrazioni e minacce.

---

### 3. _Perfusuas pedes_ — Zannapiedi

- **Classificazione**: ibrido artropode-mammifero; predatore parassita che vive in caverne umide e radure forestali notturne.
- **Firma funzionale**: creatura sensibile che cambia sesso nel ciclo vitale, custodisce le proprie uova in sacchi esterni, utilizza centinaia di zampe per muoversi ovunque, digerisce estroiettando lo stomaco e si affida a un ospite senziente per la percezione del mondo.
- **Descrizione visiva**: corpo allungato con decine di paia di arti sottili e muscolosi; chitina scura con riflessi marroni; privo di occhi visibili; grande appendice boccale; sacchi sulla superficie ventrale; l’animale spesso trasporta una creatura ospite immobilizzata.

**Tratti principali:**

- **Gonadismo Sequenziale Ermafrodita**  
  Il ciclo riproduttivo prevede un cambio di sesso da femmina (incubatrice) a maschio dopo uno o due cicli di incubazione.  
  _Funzione primaria_: cambiare sesso per massimizzare la fitness riproduttiva.

- **Incubazione Esterna Cistica**  
  Le uova sono custodite in un sacco protettivo esterno che si indurisce come una ciste.  
  _Funzione primaria_: incubare la prole fuori dal corpo.

- **Locomozione Miriapode Ibrida**  
  Fino a cento paia di arti che forniscono trazione estrema e consentono l’arrampicata su qualsiasi superficie.  
  _Funzione primaria_: muoversi e arrampicarsi con presa totale.

- **Digestione Extracorporea Acida**  
  Lo stomaco viene estroflesso e rilascia enzimi corrosivi per liquefare i tessuti della preda prima di aspirarli.  
  _Funzione primaria_: liquefare la preda esternamente.

- **Sacche Ipopache Tissutali**  
  Pieghe cutanee lungo i fianchi in cui il cacciatore conserva tessuti parzialmente digeriti per il consumo futuro.  
  _Funzione primaria_: conservare il cibo digerito.

- **Immunità Virale Ultrastabile**  
  Il sistema immunitario è simile a quello dei pipistrelli e consente di coesistere con virus letali senza sintomi.  
  _Funzione primaria_: resistere a numerosi patogeni.

- **Sistemi Sensoriali Chimio-Sonici**  
  La creatura è cieca, ma utilizza sonar ad alta frequenza e spruzzi di profumo controllati per mappare l’ambiente.  
  _Funzione primaria_: percepire l’ambiente con sonar e feromoni.

- **Appendice da Contatto Super-Cinetica**  
  Zampa anteriore modificata che si muove a velocità esplosiva producendo un’onda d’urto simile alla canocchia pavone.  
  _Funzione primaria_: colpire con un pugno a cavitazione.

- **Simbiosi da Ostaggio & Dipendenza Bio-Cognitiva**  
  L’animale mantiene un ospite senziente immobilizzato e nutrito che funge da occhi e interprete cognitivo.  
  _Funzione primaria_: ottenere percezioni e guida mentale dall’ospite.

---

### 4. _Terracetus ambulator_ — Megattera Terrestre

- **Classificazione**: Mammalia; erbivoro gigante che vive in pianure aperte e savane ventilate.
- **Firma funzionale**: enorme mammifero terrestre derivato dalle balene che ha alleggerito lo scheletro per muoversi via terra, usa ciglia addominali per strisciare, filtra l’aria per nutrirsi e comunica/disorienta con canti infrasonici.
- **Descrizione visiva**: corpo voluminoso, simile a una megattera ma senza pinne; tessuto spesso, colore grigio; ventre largo e piatto con file di ciglia che lo spingono sul terreno; grandi sacche polmonari; testa massiccia con piccole aperture nasali.

**Tratti principali:**

- **Scheletro Pneumatico a Maglie**  
  Ossa estremamente porose riempite di aria che riducono il peso corporeo permettendo la locomozione terrestre.  
  _Funzione primaria_: alleggerire la massa.

- **Cinghia Iper-Ciliare**  
  Strisce di pelle sotto la pancia ricoperte da milioni di ciglia muscolari che, muovendosi in modo coordinato, permettono all’animale di strisciare.  
  _Funzione primaria_: generare movimento terrestre.

- **Rete Ghiandolare Filtro-Polmonare**  
  Sacche polmonari che filtrano micro-organismi e polline dall’aria, fornendo nutrienti all’animale.  
  _Funzione primaria_: nutrirsi filtrando l’aria.

- **Canto Infrasonico Tattico**  
  Sistema vocale che emette suoni a bassissima frequenza per disorientare predatori e comunicare a grande distanza.  
  _Funzione primaria_: confondere i predatori e comunicare.

- **Siero Anti-Gelo Naturale**  
  Sostanze crioproteiche che impediscono la formazione di cristalli di ghiaccio nei tessuti, consentendo la sopravvivenza in climi estremi.  
  _Funzione primaria_: resistere al gelo.

---

### 5. _Chemnotela toxica_ — Aracnide Alchemico

- **Classificazione**: Arthropoda; predatore esperto di chimica, vive in radure acide e chiome bagnate.
- **Firma funzionale**: artropode gigante dotato di zanne che secernono acidi capaci di corrodere metalli, tessuti e pietre; produce seta conduttiva elettrica e salti potenziati da leve idrauliche.
- **Descrizione visiva**: corpo robusto, simile a un ragno gigante; cheliceri prominenti; filiera ingrossata che produce seta lucente; zampe potenti; colori variabili dal bruno al verde scuro; occhi multipli, alcuni specializzati per vedere la tensione nelle tele.

**Tratti principali:**

- **Zanne Idracida**  
  Cheliceri dotati di ghiandole che secernono un acido capace di sciogliere metalli e tessuti organici.  
  _Funzione primaria_: attaccare e digerire chimicamente.

- **Seta Conduttiva Elettrica**  
  Filamenti contenenti nanoparticelle metalliche che conducono e immagazzinano cariche elettriche, creando trappole che stordiscono le prede.  
  _Funzione primaria_: intrappolare e stordire con elettricità.

- **Articolazioni a Leva Idraulica**  
  Giunture delle zampe con camere di fluido pressurizzato che amplificano la forza del salto e del colpo.  
  _Funzione primaria_: aumentare forza e salto.

- **Filtrazione Osmotica**  
  Sistema renale a multi-stadio che filtra e neutralizza i composti acidi prodotti dall’animale.  
  _Funzione primaria_: eliminare tossine.

- **Visione Polarizzata**  
  Occhi specializzati che vedono i pattern di polarizzazione della luce, distinguendo la propria seta e rilevando fessure.  
  _Funzione primaria_: rilevare tensioni e navigare nelle tele.

---

### 6. _Proteus plasma_ — Mutaforma Cellulare

- **Classificazione**: organismo primitivo; può essere unicellulare o un piccolo collettivo di cellule pluripotenti; vive in stagni quieti e torrenti lenti.
- **Firma funzionale**: creatura altamente plastica capace di cambiare forma, densità e consistenza, muovendosi attraverso fessure microscopiche, fagocitando qualsiasi materiale organico e riproducendosi per scissione o fusione.
- **Descrizione visiva**: appare come una massa gelatinosa traslucida che può espandersi o contrarsi; può assumere forme illusorie; in ambienti ricchi di minerali si ricopre di una pellicola silicea quando entra in ibernazione; non possiede organi distinti.

**Tratti principali:**

- **Membrana Plastica Continua**  
  Struttura cellulare che permette al corpo di cambiare forma, densità e consistenza, passando da liquido a solido malleabile.  
  _Funzione primaria_: metamorfosi e adattamento di forma.

- **Flusso Ameboide Controllato**  
  Locomozione basata sull’estensione di pseudopodi e flussi di citoplasma che consentono di penetrare in fessure microscopiche.  
  _Funzione primaria_: penetrare ambienti complessi.

- **Fagocitosi Assorbente**  
  Capacità di avvolgere totalmente la preda e assorbirne i tessuti direttamente attraverso la membrana.  
  _Funzione primaria_: nutrizione onnivora attraverso inglobamento.

- **Moltiplicazione per Fusione/Scissione**  
  Riproduzione tramite scissione cellulare o fusione con altre unità, aumentando la massa e la complessità.  
  _Funzione primaria_: riprodursi e ripararsi.

- **Cisti di Ibernazione Minerale**  
  In condizioni avverse si racchiude in una cisti protettiva con pareti rigidamente mineralizzate che resistono a calore e pressione.  
  _Funzione primaria_: entrare in stasi e proteggersi.

---

### 7. _Soniptera resonans_ — Libellula Sonica

- **Classificazione**: Insecta; insetto volante di grandi dimensioni che abita oasi termiche e praterie arbustive.
- **Firma funzionale**: utilizza il suono sia come arma sia come difesa, generando onde ad alta intensità e producendo campi sonori caotici che confondono i predatori; manovra con eccezionale agilità grazie a reazioni neurali rapidissime.
- **Descrizione visiva**: corpo snello e allungato; ali trasparenti con venature accentuate che vibrano a frequenze variabili; testa dotata di grandi occhi composti, adatti a rilevare vibrazioni; colori iridescenti che cangiano alla luce.

**Tratti principali:**

- **Ali Fono-Risonanti**  
  Ali con venature strutturate come corde che vibrano generando onde sonore da ultrasuono a frequenze udibili.  
  _Funzione primaria_: generare suoni e onde d’urto.

- **Onda di Pressione Focalizzata (Cannone Sonico)**  
  Capacità di focalizzare le onde sonore in un raggio stretto ad alta intensità per stordire o ferire.  
  _Funzione primaria_: colpire con onde di pressione.

- **Campo di Interferenza Acustica**  
  Emissione di rumori bianchi complessi che mascherano la posizione dell’animale e neutralizzano l’ecolocalizzazione dei predatori.  
  _Funzione primaria_: confondere e disorientare.

- **Cervello a Bassa Latenza**  
  Sistema nervoso con sinapsi super-veloci che permette manovre fulminee e precisione millimetrica nell’attacco sonico.  
  _Funzione primaria_: reazioni rapide e pilotaggio agile.

- **Occhi Cinetici**  
  Organi visivi ottimizzati per rilevare le distorsioni dell’aria generate dalle onde sonore e dalle vibrazioni.  
  _Funzione primaria_: vedere il suono.

---

### 8. _Anguis magnetica_ — Anguilla Geomagnetica

- **Classificazione**: rettile/pesce serpiforme; vive in estuari torbidi e lagune tranquille; sfrutta il magnetismo terrestre.
- **Firma funzionale**: creatura serpiforme che manipola i campi magnetici per navigare, generare impulsi che stordiscono le prede e scivolare a bassa frizione su terra e acqua, nutrendosi di metalli disciolti e proteggendosi con bozzoli elettromagnetici.
- **Descrizione visiva**: corpo lungo e flessuoso ricoperto da scaglie scure; nessuna pinna evidente; la pelle è leggermente iridescente; movimento silenzioso; occhi piccoli; comportamenti lenti e furtivi.

**Tratti principali:**

- **Integumento Bipolare**  
  Pelle ricoperta di sensori biologici contenenti magnetite che permettono di rilevare le linee di campo magnetico per la navigazione.  
  _Funzione primaria_: orientarsi e comunicare.

- **Organo Elettrico a Risonanza Magnetica (Elettromagnete Biologico)**  
  Organo che modifica correnti elettriche interne per creare campi magnetici pulsati che interferiscono con i sistemi nervosi delle prede.  
  _Funzione primaria_: attaccare a distanza con campi magnetici.

- **Scivolamento Magnetico**  
  Produzione di una bolla magnetica attorno al corpo che riduce l’attrito con l’ambiente, permettendo movimenti silenziosi su acqua o terra.  
  _Funzione primaria_: muoversi in maniera furtiva.

- **Filtro Metallofago**  
  Organo digerente specializzato nell’assorbire metalli traccia (ferro, rame) dall’acqua e dal terreno, necessari per mantenere la bioelettrogenesi.  
  _Funzione primaria_: nutrirsi di metalli essenziali.

- **Bozzolo Magnetico**  
  Capacità di creare un campo magnetico isolante che forma un bozzolo protettivo, bloccando tutte le interferenze elettromagnetiche esterne.  
  _Funzione primaria_: ibernarsi e schermarsi dalle minacce.

---

### 9. _Umbra alaris_ — Uccello Ombra

- **Classificazione**: Aves; predatore notturno che vive in foreste dense, canyons ombrosi e ambienti rocciosi.
- **Firma funzionale**: volatile furtivo che assorbe quasi tutta la luce incidente grazie a piume nano-strutturate, caccia nel buio più completo utilizzando occhi multi-spettrali e artigli ipo-termici, e comunica in modo quasi invisibile con segnali luminosi di coda.
- **Descrizione visiva**: medio grande, corpo snello ma solido; piumaggio nero opaco; ali silenziose; occhi grandi e lucenti; artigli ricurvi; coda con penne lunghe e sensibili che si illuminano debolmente durante la comunicazione.

**Tratti principali:**

- **Vello di Assorbimento Totale**  
  Piumaggio con nano-strutture che assorbono il 99,9% della luce incidente, rendendo l’animale praticamente invisibile di notte.  
  _Funzione primaria_: mimetismo assoluto.

- **Visione Multi-Spettrale Amplificata**  
  Occhi capaci di raccogliere luce UV, IR e calore corporeo, consentendo di cacciare in assenza di luce.  
  _Funzione primaria_: rilevare prede al buio.

- **Motore Biologico Silenzioso**  
  Metabolismo a bassissimo consumo energetico che consente lunghi periodi di volo senza fatica e un volo quasi totalmente silenzioso.  
  _Funzione primaria_: volare a lungo senza farsi sentire.

- **Artigli Ipo-Termici**  
  Artigli che, al contatto, rilasciano rapidamente agenti chimici che provocano un raffreddamento locale e shock termico nella preda.  
  _Funzione primaria_: immobilizzare tramite shock da freddo.

- **Comunicazione Coda-Coda Fotonica**  
  Scambio di impulsi luminosi tramite le penne della coda senza emettere suono, permettendo comunicazione stealth con altri individui.  
  _Funzione primaria_: comunicare senza fare rumore.

---

### 10. _Rupicapra sensoria_ — Camoscio Psionico

- **Classificazione**: Mammalia; erbivoro montano che vive su cenge calcaree e dorsali ventose.
- **Firma funzionale**: ungulato che ha trasformato le corna in antenne psioniche e sviluppato una coscienza collettiva; utilizza il campo mentale per proteggere il branco e condivide energia e sostanze nutritive con i consimili.
- **Descrizione visiva**: simile a un camoscio con corna allungate a forma di forcella; mantello spesso; zoccoli ampliati con superfici micro-adesive; occhi acuti; atteggiamento attento e cooperativo.

**Tratti principali:**

- **Corna Psico-Conduttive**  
  Corna modificate che agiscono come antenne per ricevere e trasmettere segnali psionici a bassa frequenza tra i membri del branco.  
  _Funzione primaria_: stabilire una rete telepatica.

- **Coscienza d’Alveare Diffusa**  
  Le menti degli individui si fondono in una coscienza collettiva quando sono vicini, aumentando l’elaborazione di informazioni e la pianificazione di gruppo.  
  _Funzione primaria_: formare una mente alveare.

- **Aura di Dispersione Mentale**  
  La mente collettiva può generare un segnale psionico che provoca confusione o vertigini nei predatori vicini.  
  _Funzione primaria_: respingere e confondere i predatori.

- **Metabolismo di Condivisione Energetica**  
  I membri sani possono trasferire riserve energetiche o composti curativi ai membri feriti tramite contatto fisico.  
  _Funzione primaria_: curare e sostenere il gruppo.

- **Unghie a Micro-Adesione**  
  Zoccoli con superfici microscopiche simili a quelle del geco che permettono aderire a pareti lisce e rocce verticali.  
  _Funzione primaria_: arrampicarsi con trazione superiore.

---

## Ecotipi e varianti ecologiche

Le creature del Evo Tactics Pack v2 non sono statiche: ogni specie può sviluppare varianti locali denominate **ecotipi** quando si adatta a un bioma o a condizioni ambientali specifiche. Gli ecotipi modificano alcune metriche dei tratti (ad esempio aumentano la tolleranza al freddo o riducono la velocità d’attacco) senza cambiare la struttura di base della specie.

Nel pacchetto questi dettagli sono archiviati in file dedicati all’interno della cartella `ecotypes/`. Qui sotto trovi una panoramica sintetica delle varianti generate in questa conversazione.

- _Elastovaranus hydrus_ dispone di due ecotipi:
  - **Gole Ventose** (bioma roccioso): lamelle sismiche più sensibili migliorano la rilevazione delle vibrazioni, mentre l’ectotermia dinamica è ottimizzata per correnti d’aria fredde.
  - **Letti Fluviali** (bioma umido): l’impatto del colpo proiettile è smorzato dalla sabbia bagnata e la velocità del rostro è leggermente ridotta, ma la creatura resiste meglio all’umidità.

- _Gulogluteus scutiger_ presenta varianti come:
  - **Chioma Umida**
  - **Forre Umide**  
    che affinano la presa della coda e l’aderenza della pelliccia in ambienti ricchi di muschio. In compenso, la corazza e il pelo più densi riducono la velocità di corsa su lunga distanza.

- _Perfusuas pedes_ evolve ecotipi come:
  - **Cavernicolo** (sacche esterne più spesse e apparato miriapode più aderente alle pareti)
  - **Radura Notturna** (sonar più potente ma sistema immunitario meno stabile).  
    Questi aggiustamenti bilanciano la vulnerabilità in ambienti aperti e la capacità di arrampicata.

- _Terracetus ambulator_ sviluppa:
  - **Pianure Ventose** (scheletro più leggero per resistere alle raffiche ma ciglia più corte),
  - **Savanicola Notturno** (maggiore resistenza al freddo grazie a un siero criogeno potenziato, ma velocità di movimento ridotta su superfici sabbiose).

- _Chemnotela toxica_ presenta ecotipi come:
  - **Radura Acida** (acido più potente ma reni più lenti),
  - **Chioma Elettrofilo** (seta altamente conduttiva con un carico elettrico maggiore ma minore quantità prodotta),  
    adattandosi a zone con diversa acidità del suolo.

- _Proteus plasma_ ha varianti:
  - **Stagno Quieto** (cisti di ibernazione più rapide e membrane più spesse),
  - **Torrente Lento** (flusso ameboide accelerato ma minor resistenza alla pressione),  
    bilanciando la necessità di protezione e movimento.

- _Soniptera resonans_ produce ecotipi come:
  - **Oasi Termica** (ali più larghe e onda di pressione meno intensa ma più estesa),
  - **Prateria Arbustiva** (emissione sonora più direzionale ma minor campo di interferenza),  
    ottimizzando attacco e difesa in ambienti differenti.

- _Anguis magnetica_ esibisce varianti:
  - **Estuario Torbido** (campo magnetico pulsato più forte ma scivolamento magnetico meno efficiente),
  - **Laguna Quieta** (bozzolo elettromagnetico più duraturo ma organo elettrico meno potente),  
    adattandosi a diverse salinità dell’acqua.

- _Umbra alaris_ è rappresentata da ecotipi:
  - **Canopy Ombrosa** (piumaggio ancora più assorbente e occhi maggiormente sensibili agli infrarossi),
  - **Canyon Notturno** (artigli ipo-termici più efficaci ma consumo energetico maggiore),  
    bilanciando invisibilità e shock termico.

- _Rupicapra sensoria_ sviluppa ecotipi come:
  - **Cenge Calcarenitiche** (corna più lunghe e potente campo mentale, ma zoccoli meno aderenti),
  - **Dorsali Ventose** (sistema energetico condiviso più efficiente ma aura di dispersione ridotta),  
    per far fronte alla geologia e al clima delle montagne.

Gli ecotipi arricchiscono la narrazione e la meccanica di gioco, consentendo di personalizzare le creature e adattarle a nuovi contesti.

Per ogni specie:

- le etichette degli ecotipi sono elencate nel campo `ecotypes` del file specie,
- i dettagli e i delta metrici sono nel file dedicato in `ecotypes/<genus_species>_ecotypes.json`.

---

## Catalogo master e indici

Nel pacchetto v2 è incluso un **catalogo master** (`catalog/master.json`) che aggrega tutte le specie e tutti i tratti in un unico documento.

Questo file contiene:

- **metadata**:
  - versione del catalogo,
  - data di generazione,
  - unità utilizzate (UCUM),
  - link agli schemi JSON.
- **stats**:
  - conteggi di specie e tratti totali,
  - breakdown per macro-classi,
  - breakdown per livelli (tier) dei tratti.
- **species**:
  - per ogni specie le chiavi principali,
  - l’elenco dei nomi volgari,
  - le abbreviazioni,
  - i riferimenti ai tratti,
  - un sommario incorporato dei tratti (codice, etichetta, funzione, tier, metriche principali).
- **traits**:
  - l’intero dizionario dei tratti con tutti i campi definiti nel template v2, pronto per essere filtrato o visualizzato da un tool esterno.
- **ecotypes_index**:
  - un indice separato (`catalog/ecotypes_index.json`) che elenca le varianti ecologiche di tutte le specie,
  - associa ciascuna etichetta a:
    - `id`,
    - file di riferimento,
    - numero di tratti modificati.
- **aliases**:
  - un file `data/aliases/species_aliases.json` permette di mantenere compatibilità con nomi precedenti,
  - es. “Hydrogluteus pinguis” e “Glutogulo scutatus” → “Gulogluteus scutiger”.

Questa struttura consente al tuo engine di:

- caricare un’unica risorsa JSON,
- ottenere tutte le informazioni necessarie per:
  - generare creature,
  - applicare modifiche ecotipiche,
  - costruire filtri o statistiche.

È buona norma aggiornare sempre il catalogo master quando si aggiunge o modifica una specie o un tratto.

---

## Uso del pacchetto e prossimi passi

Per integrare o espandere il Evo Tactics Pack v2 nel tuo progetto, procedi in questo modo:

1. **Leggi la guida**  
   Consulta questa guida e i documenti integrativi per comprendere:
   - lo stile di nomenclatura,
   - le specifiche v2,
   - le best practice.  
     Assicurati di avere familiarità con:
   - le unità UCUM,
   - i campi obbligatori.

2. **Convalida i dati**  
   Prima di committare nuove specie o tratti:
   - esegui lo script `scripts/validate.sh`,
   - verifica che i file rispettino gli schemi JSON.  
     Il validatore segnala:
   - errori strutturali (campi mancanti, unità non conformi, versioning assente).

3. **Crea nuovi tratti**  
   Segui la checklist del `README_HOWTO_AUTHOR_TRAIT.md`:
   - scegli codici univoci,
   - definisci le metriche,
   - indica sinergie/conflitti,
   - descrivi sempre trigger, limiti, costi e testabilità.

4. **Definisci nuove specie**  
   Partendo dalla firma funzionale:
   - scegli un binomiale coerente e un nome volgare evocativo,
   - compila i campi descrittivi,
   - assicurati che i tratti coprano tutti gli assi funzionali.  
     Se necessario introduci ecotipi per ambienti diversi.

5. **Aggiorna i cataloghi**  
   Dopo aver creato o modificato file:
   - aggiorna `species_catalog.json`,
   - aggiorna `traits_aggregate.json`,
   - rigenera `catalog/master.json` (via script),
   - aggiorna anche l’indice degli ecotipi se ne aggiungi di nuovi.

6. **Documenta e condividi**  
   Per ogni aggiunta:
   - scrivi un changelog o una nota in `versioning` con la data e la motivazione,
   - questo aiuta altri autori a comprendere l’evoluzione del pacchetto.

Seguendo questi passi e facendo riferimento costante alla guida, potrai espandere il bestiario in modo coerente, mantenendo la compatibilità con l’ecosistema Evo Tactics e offrendo ai giocatori/universo un ambiente criptozoologico ricco, strutturato e bilanciato.

---

## Integrazione con lo schema canonico e la Track di Senzienza (v2.1)

Negli ultimi aggiornamenti del progetto Evo Tactics, oltre allo schema v2 per specie e tratti descritto in questa guida, è stato introdotto:

- uno **schema canonico unificato** che rende i tratti completamente _species-agnostici_,
- una **Sentience Track** che regola l’accesso ai poteri sociali e cognitivi.

Questa sezione riassume i punti chiave dell’integrazione.

### Stato target e struttura file (SSoT)

Il _single-source-of-truth_ (SSoT) per Evo Tactics prevede una struttura di repository suddivisa in:

- **documentazione**,
- **pacchetti**,
- **strumenti**.

In particolare:

- `docs/INTEGRAZIONE_GUIDE.md` descrive il punto di convergenza tra la guida operativa v2 e i materiali canonici, offrendo una roadmap per la migrazione (vedi “Roadmap” più avanti).
- `docs/trait_reference_manual.md` fornirà una versione omnibus della guida ai trait, con:
  - dizionario campi,
  - tassonomia,
  - esempi estesi.  
    È un’estensione della presente guida.
- `docs/README_SENTIENCE.md` introdurrà la Sentience Track T1–T6, un sistema di _gating_ che stabilisce a quale livello di coscienza (da T1 a T6) una creatura deve accedere per sbloccare tratti sociali e cognitivi avanzati.

Nella cartella `packs/evo_tactics_pack/docs/catalog/` saranno conservati:

- gli schemi JSON:
  - `trait_entry.schema.json`,
  - `trait_catalog.schema.json`,
  - `sentience_track.schema.json`,
- il catalogo dei tratti (`trait_reference.json`),
- la pista di sentienza (`sentience_track.json`).

Gli strumenti Python (`tools/py/`) conterranno script per:

- validare (`trait_template_validator.py`),
- esportare CSV (`export_csv.py`),
- fondere i seed dei tratti (`seed_merge.py`).

Le workflow CI (`.github/workflows/`) garantiranno che ogni PR validi i JSON secondo gli schemi (es. `validate_traits.yml`).

### Mappatura e regole di convergenza

Le regole di convergenza tra il Crypto Template usato finora e lo schema canonico sono le seguenti:

- **Trait species-agnostici**  
  Nei file dei tratti non compare più alcun riferimento diretto alla specie (`species_*` viene rimosso).  
  L’associazione specie → trait è gestita solo nel catalogo master (`trait_refs`).  
  Questo facilita:
  - il riuso dei tratti da più creature,
  - allinea il design a uno standard modulare.

- **UCUM obbligatorio**  
  per tutte le metriche, e **ENVO** per habitat e condizioni ambientali.  
  La sezione sulla mappatura campi (vedi più sopra) rimane valida; assicurati di:
  - convertire ogni unità in UCUM (`m/s`, `Cel`, `Pa`, etc.),
  - usare i termini ENVO con URI PURL.

- **Tier T1–T6**  
  Il campo `level` viene sostituito da `tier`, esteso a sei livelli.  
  I tratti sociali, linguistici o tecnologici di livello T4–T6 possono essere sbloccati solo da creature con indice di senzienza adeguato (vedi Track di Senzienza).

- **Versioning canonico**  
  Ogni tratto richiede:
  - `version` in formato SemVer,
  - sezione `versioning{created, updated, author}`.  
    I cambiamenti MAJOR devono essere accompagnati da un changelog;  
    i cambiamenti MINOR e PATCH rispettano la retro-compatibilità.

- **Compat legacy**  
  Per una release di transizione è ammesso l’uso del campo `compatibility` come alias di `sinergie/conflitti`; questo verrà deprecato nella release successiva.

### Sentience Track T1–T6

La Sentience Track è un sistema parallelo che definisce il livello di coscienza di una creatura su una scala da:

- **T1**: reattivo/primordiale
- a **T6**: pienamente sociale, linguistico e tecnologico.

Ogni tratto può specificare una `sentience_applicability` che indica a partire da quale livello di senzienza è disponibile.

Alcune capacità (es. tratti sociali, tratti di comunicazione complessa) sono _gateate_ e possono essere acquisite solo se l’indice di senzienza della specie soddisfa il requisito.

La versione canonicamente descritta nel file `sentience_track.json` fornisce linee guida su:

- quali categorie funzionali richiedono gating (ad esempio, _social/language_ → T≥4).

### Passi operativi per la migrazione

Per integrare i dati esistenti nel nuovo schema canonico:

1. **Normalizzare i tratti**
   - rimuovere qualsiasi riferimento alla specie dai file trait,
   - mappare `level` → `tier` (T1–T6),
   - convertire unità in UCUM,
   - assicurarsi che gli habitat usino ENVO,
   - aggiornare i campi `sinergie` e `conflitti` secondo i codici corretti,
   - aggiungere `version` e `versioning` se non presenti.

2. **Aggiornare il catalogo master**
   - creare/aggiornare `trait_reference.json`,
   - includere tutti i tratti esistenti in formato canonico,
   - ogni entry deve includere:
     - `trait_code`,
     - `label`,
     - `tier`,
     - `metrics`,
     - altri campi richiesti.

3. **Introdurre la Sentience Track**
   - aggiungere `sentience_track.json` con la definizione dei livelli T1–T6 e i gate associati,
   - aggiornare i tratti sociali/cognitivi affinché indichino `sentience_applicability` appropriata.

4. **Branching e CI**
   - creare branch dedicati (`traits/core`, `traits/sentience`) per separare gli schemi e i seed,
   - configurare la pipeline CI (`validate_traits.yml`) affinché esegua il validator sugli _entry_ e sul catalogo.

5. **Importare gli “Ancestors”**
   - se previsto, importare circa 297 neuroni (antiche capacità) da file esterni,
   - ogni neurone sarà mappato a uno o più tratti,
   - il piano sintetico prevede:
     - raccolta,
     - normalizzazione,
     - mapping,
     - QA di questi neuroni entro il secondo sprint di sviluppo.

### Roadmap e gate di qualità

Il progetto prevede due sprint:

- **Sprint 1 — Fondazioni**
  - definire e caricare gli schemi, gli strumenti e la CI,
  - normalizzare i primi 20–30 tratti _core_ con UCUM/ENVO,
  - creare la Sentience Track,
  - aggiornare la documentazione.

- **Sprint 2 — Contenuti**
  - importare i neuroni,
  - mapparli a tratti,
  - completare le coperture sensoriali e locomotorie principali,
  - verificare che tutti i tratti abbiano:
    - sinergie/conflitti coerenti,
    - un tier appropriato.

I **gate di qualità** da rispettare in ogni PR includono:

- validità JSON secondo gli schemi,
- uso corretto di UCUM ed ENVO,
- versioning SemVer,
- gating di senzienza consistente,
- assenza di conflitti o duplicati,
- testabilità compilata.

---

## Come applicarlo nel repo Game

Per integrare nuovi tratti o pacchetti in questo repository, segui il [flusso operativo end-to-end](traits_scheda_operativa.md#box-flusso-operativo-end-to-end): prepara tassonomia e glossario, compila il file usando il [template dati](traits_template.md), valida schema e contenuti con i comandi della [checklist automatica](traits_scheda_operativa.md#checklist-di-validazione-automatica-comandi-rapidi), sincronizza le localizzazioni e chiudi la PR riportando gli esiti QA.

## Conclusioni e prospettive

Questa integrazione amplia l’universo Evo Tactics in direzione di un sistema:

- modulare,
- riusabile,
- governato da standard aperti.

La separazione dei tratti dalla specie, l’introduzione della pista di senzienza e la convergenza verso un _single-source-of-truth_:

- facilitano la collaborazione tra autori,
- migliorano la coerenza narrativa,
- preparano il terreno per future espansioni (come l’import dei “Ancestors”).

Continuando a seguire le linee guida qui presentate potrai contribuire a un database vivente che supporta sia la narrazione che il gameplay, integrando:

- nuove creature,
- ecotipi,
- tratti,
- percorsi di evoluzione cognitiva.
