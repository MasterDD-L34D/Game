# Catalogo giochi e moduli di Evo‑Tactics

Questo documento riassume le principali componenti ludiche del progetto **Evo‑Tactics**.  Il gioco non è composto da titoli separati ma da diversi *moduli* e sistemi che interagiscono fra loro per creare un’esperienza tattica profonda.  Ogni sezione descrive il funzionamento, le motivazioni di design e i riferimenti ai documenti interni.

## Loop di missione

Il cuore di Evo‑Tactics è una serie di missioni cooperative da giocare in sessioni di ~90 minuti【495301925749946†L2-L7】.  Ogni missione segue un **loop** definito:

1. **Briefing** – presentazione degli obiettivi e del contesto narrativo.
2. **Setup Squadra** – selezione delle Forme/Job e distribuzione dei Punti Intuizione (PI); i giocatori assegnano tratti e attrezzature in base alla strategia e al budget【495301925749946†L37-L42】.
3. **Incursione** – esplorazione della mappa procedurale con risoluzione tramite TV/d20 (test su d20, clock di eventi e macro‑azioni attraverso la companion app)【495301925749946†L30-L35】.
4. **Eventi dinamici** – incontri procedurali influenzati dal bioma e dal ruolo trofico delle specie; può verificarsi un evento climatico (Tempesta Ferrosa, Seme d’Uragano, Ondata Termica, Brina Tempestosa) che modifica le regole temporaneamente.
5. **Debriefing** – risoluzione dei contratti, assegnazione delle ricompense e salvataggio della telemetria.
6. **Fase Nido** – gestione della base, mutazioni e ricerca; le scelte effettuate alimentano i sistemi di progressione (livello squadra, prestigio delle Forme, reputazione delle fazioni e indice di StressWave)【495301925749946†L24-L28】.

## Sistema Tri‑Sorgente

Durante o al termine di alcuni incontri i giocatori ricevono un set di tre **carte** (più un’opzione *Skip*) da cui scegliere.  Il sistema **Tri‑Sorgente** integra tre fonti di informazione:

* **Roll** – un tiro di dado o una tabella di bioma decide l’origine del premio (equipaggiamento, tratti, risorse).
* **Personalità** – il profilo MBTI/Enneagramma del giocatore o del gruppo influenza la tipologia di carte proposte (ad esempio tratti empatici per personalità diplomatiche).
* **Azioni recenti** – la telemetria delle azioni compiute (aggressive, esplorative, altruistiche) modifica le probabilità di certe ricompense.

La pipeline calcola un punteggio `score(c)` per ogni carta sommando una base di rarità e contributi ponderati di roll, personalità e azioni, aggiungendo bonus di sinergia e penalità per duplicati o esclusioni【224127250928734†L2-L27】.  Questo sistema permette di offrire scelte significative senza sovraccaricare il giocatore e di mantenere la varietà controllata.

## Ecosistemi e foodweb

Oltre alle missioni, Evo‑Tactics include un *metagioco* di gestione degli ecosistemi.  Ogni bioma (Badlands, Foresta Temperata, Deserto Caldo, Cryosteppe, ecc.) contiene specie con ruoli trofici definiti (predatori, ingegneri, dispersori, minacce, eventi).  I giocatori influenzano l’equilibrio spostando specie, affrontando minacce o innescando eventi.  La **sinergia** fra tratti e ruoli è regolata da tabelle YAML che definiscono i core traits e quelli opzionali per ogni specie【868398707807469†L10-L17】.  Il *foodweb* viene utilizzato anche nella generazione procedurale delle missioni e nelle prove di progressione, permettendo di simulare catene alimentari credibili.

## Sistema TV/d20 e companion app

La risoluzione delle azioni è affidata a un **d20** con bande di successo/fallimento, supportato da un clock per gli eventi a tempo【495301925749946†L30-L35】.  Una **companion app** consente di gestire il draft delle Forme, eseguire macro‑azioni (rush, evacuazione, interfaccia), visualizzare la telemetria in tempo reale e comunicare fra i giocatori【495301925749946†L30-L35】.  L’app funge anche da repository per i tratti e le risorse, permettendo di trasferire dati nel GDD e di alimentare la pipeline di validazione.

## Jobs e tratti

I personaggi giocabili (Forme) appartengono a **famiglie di job** (es. vanguard, skirmisher, warden) che determinano il pacchetto PI disponibile e i bias sui roll【495301925749946†L37-L42】.  Ogni job ha accesso a tratti di diversi livelli (T1/T2/T3) che conferiscono abilità, resistenze o equipaggiamenti speciali.  Le **mutazioni** permettono di modificare la Forma fra le missioni, adottando parti provenienti da altre specie, mentre i **pacchetti dati** definiscono la pool di tratti sbloccabili.  La validazione dei tratti e delle parti avviene tramite script dedicati e quality gate automatizzati.

## Eventi ecologici

Ogni bioma può ospitare **eventi** che modificano temporaneamente le regole: 

* **Tempesta Ferrosa** – magnetizza il suolo dei Badlands【165276345784449†L14-L21】, richiedendo tratti resistenti a sali e ustioni; 
* **Seme d’Uragano** – un uragano di semi nella Foresta Temperata【855554203911473†L51-L57】; 
* **Ondata Termica Ionica** – un’ondata di calore e ioni nel Deserto Caldo【820636074372850†L571-L576】; 
* **Brina Tempestosa** – tempesta di ghiaccio nel meta‑bioma della Cryosteppe【881005064092343†L9-L15】. 

Gli eventi offrono sfide e ricompense uniche e incoraggiano la rotazione dei tratti per mitigare i rischi.  In futuro è prevista l’aggiunta di pestilenze, eruzioni e migrazioni per ampliare la varietà.
