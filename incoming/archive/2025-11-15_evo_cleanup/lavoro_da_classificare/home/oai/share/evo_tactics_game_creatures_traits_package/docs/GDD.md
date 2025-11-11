# Evo‑Tactics – Game Design Document (GDD)

## Visione e obiettivi

Evo‑Tactics è un gioco di strategia e crescita personale in cui il giocatore guida una squadra di compagni attraverso biomi dinamici, sviluppando le proprie abilità e creando sinergie uniche fra talenti, tratti MBTI/enneagramma e morfologie delle specie.  L’obiettivo è fornire un’esperienza coinvolgente che unisca esplorazione, tattica e narrazione, alimentata da un sistema di progressione profondo e da scelte significative.

### Target e tono

Il gioco è rivolto a giocatori interessati a giochi tattici, roguelike e di ruolo, con particolare attenzione a chi apprezza la profondità narrativa e la personalizzazione.  Il tono è misterioso ma positivo: i biomi e le missioni invitano alla scoperta e alla crescita interiore.

## Panoramica del sistema di gioco

### Loop principale

1. **Preparazione della squadra:** il giocatore seleziona e personalizza i compagni, assegnando tratti, specie e job in base al proprio stile di gioco.
2. **Esplorazione dei biomi:** ogni run si svolge attraverso biomi generati proceduralmente, suddivisi in zone con caratteristiche e sfide differenti.  Alla fine di ogni zona si accede al sistema *Tri‑Sorgente* per potenziare la squadra.
3. **Battaglie tattiche:** combat system a turni ispirato al sistema d20, con modificatori dati da tratti e job.  La gestione delle risorse (salute, stamina, “energie”) e il posizionamento sono fondamentali.
4. **Progressione e scelta:** dopo le battaglie, il giocatore acquisisce esperienza, materiali e frammenti genetici.  Si aprono nuove scelte tramite il *Tri‑Sorgente* e la possibilità di modificare i compagni.
5. **Narrativa emergente:** eventi, incontri e missioni generano narrazione basata sulle scelte del giocatore e sulle combinazioni di tratti, fornendo rigiocabilità e immersione.

### Sistema Tri‑Sorgente

Il *Tri‑Sorgente* offre al giocatore tre carte più un’opzione “skip” al termine delle battaglie minori.  La scelta viene generata attraverso un pipeline che considera:

* **Tabella del bioma** – definisce la rarità e il tipo di carte disponibili in base al livello di zona raggiunto.
* **Composizione della squadra** – include risultati dei tiri basati sul sistema d20, personalità (MBTI/enneagramma) e azioni recenti (telemetria).  Le carte vengono punteggiate con la formula:

```
score(c) = base(c)
           + w_roll × roll_comp(c)
           + w_pers × pers_comp(c)
           + w_act × act_comp(c)
           – penalty_duplicate(c)
```

dove la **base(c)** è la rarità intrinseca della carta, i pesi *w_* modulano l’influenza dei componenti e *penalty_duplicate(c)* riduce il punteggio per evitare ripetizioni.  La pipeline filtra inoltre le carte in base a sinergie/diversità con la squadra e offre un’opzione di skip che rilascia un frammento genetico.

I principi alla base del *Tri‑Sorgente* sono: dare al giocatore agency senza sovraccarico cognitivo, controllare la varianza per evitare roll “dominanti”, garantire coerenza con le combinazioni di tratti e prevenire il power creep【109425184895403†L8-L16】.

### Progressione e crescita

* **Esperienza e livelli:** le attività di gioco (battaglie, missioni, esplorazione) concedono XP per job e tratti.  I compagni sbloccano abilità e talenti avanzati aumentando di livello.
* **Frammenti genetici:** ottenuti dalle opzioni skip e da eventi speciali; permettono di modificare specie, morfologia o potenziare tratti esistenti.
* **Telemetria e adattamento:** un sistema di telemetria raccoglie le azioni del giocatore e adatta la generazione di missioni ed eventi, favorendo la rigiocabilità.

### Componenti principali

| Modulo      | Descrizione breve                                                     |
|-------------|-----------------------------------------------------------------------|
| **Dataset** | Insiemi di specie, job, tratti, talenti, sinergie e parametri di gioco. |
| **CLI**     | Strumenti in Python e TypeScript per validare dataset, generare baseline e audit, e per lanciare processi (es. export QA). |
| **Backend** | Gestione database, API e servizi (matchmaking, telemetria) con sicurezza integrata. |
| **Webapp**  | Dashboard per visualizzare telemetria, QA e tracker dei progressi.      |
| **HUD**     | Overlay smart che mostra alert e statistiche in tempo reale, configurato tramite YAML. |


## World‑building e ambientazione

Ogni bioma rappresenta un ecosistema con regole e creature uniche: foreste antiche, deserti magnetici, grotte bioluminescenti, ecc.  I compagni hanno storie e motivazioni che influenzano le loro relazioni e le interazioni con l’ambiente.  La narrativa si sviluppa tramite missioni principali, secondarie e incontri emergenti, orchestrati da un *director* dinamico che bilancia sfida e varietà.

## Monetizzazione

Il modello previsto è *free‑to‑play* con monetizzazione etica basata su cosmetici e contenuti opzionali.  Non è previsto il pay‑to‑win: tutti i contenuti che influiscono sul gameplay (specie, job, talenti) sono ottenibili giocando.

## Requisiti tecnici e pipeline di sviluppo

* Utilizzo di GitHub con workflow CI/CD per testing, linting e deployment.
* Pipeline suddivisa in fasi (origine, build, test, deployment) con check di qualità e sicurezza【189322877471245†L985-L1011】.
* Automatizzazione di validazione dataset e audit tratti tramite script Python/TS.
* Generazione e aggiornamento di report QA e tracker giornalieri.

## Roadmap e milestone

La roadmap dettagliata è mantenuta in `docs/piani/roadmap.md` e nel board di progetto.  Le prossime milestone includono:

1. **Smart HUD & SquadSync:** completare l’overlay e la sincronizzazione telemetria.
2. **Export telemetria incrementale:** finalizzare API e script per esportare eventi.
3. **Release VC:** preparare la versione per venture capital con build stabile e presentazione.
4. **Level design e biomi avanzati:** introdurre nuovi biomi con meccaniche uniche.
5. **Bilanciamento XP e tratti:** rifinire la progressione e le sinergie.

## Appendice

Per ulteriori dettagli consultare i documenti nel repository:

* `docs/tri-sorgente/overview.md` – pipeline e motivazioni del Tri‑Sorgente【109425184895403†L8-L16】.
* `docs/piani/roadmap.md` – roadmap operativa con milestone e task.
* `docs/tabelle/*` – liste di job, specie, talenti, parametri e sinergie.
* `docs/api/*` – definizioni API e endpoints.
