---
title: Evo Tactics — Visione Ricostruita del Gioco
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-16'
source_of_truth: false
language: it-en
review_cycle_days: 30
---

# Evo Tactics — Visione Ricostruita del Gioco

## Scopo del documento

Questo documento ricostruisce **come dovrebbe essere Evo Tactics come gioco completo**, mettendo insieme il design attuale, i sistemi centrali emersi dal freeze, e le idee forti che nel tempo si sono disperse tra documenti core, planning, architetture, appendici e sistemi di supporto.

L'obiettivo non è descrivere solo lo stato presente del repo, ma **elevare i sistemi trovati a funzioni effettive di gioco**, per mostrare la forma più coerente e potente che Evo Tactics dovrebbe avere.

---

## Definizione del gioco

**Evo Tactics è un tactical co-op da salotto, TV-first, giocato con companion personali su telefono, ambientato in un mondo ecologico generato, dove il modo in cui combatti cambia davvero ciò che diventi.**

Non è soltanto un gioco di combattimento tattico.
È l'unione organica di quattro strati:

1. **Esperienza living-room condivisa** su TV + companion personali.
2. **Partita tattica cooperativa** con planning condivisa e risoluzione ordinata.
3. **Mondo ecologico simulato**, composto da biomi, ecosistemi, specie e foodweb.
4. **Progressione evolutiva e sociale**, che traduce stile di gioco, scelte e relazioni in trasformazione persistente.

Il cuore della promessa è semplice:

> **Non stai solo vincendo scontri. Stai diventando qualcosa.**

---

## Come dovrebbe iniziare una partita

La prima esperienza non dovrebbe aprirsi con menu pesanti o tutorial astratti.
Dovrebbe iniziare con un flusso rapido, leggibile e immediato:

**Boot → Campagna → Bioma → Encounter → Setup squadra / Draft → Briefing → Match → Debrief → Risultati / VC → Albero Evolutivo**

### Obiettivi della prima partita

La prima sessione dovrebbe:

- far capire subito il fantasy del gioco;
- introdurre il bioma come forza viva e non come semplice sfondo;
- mostrare il combattimento cooperativo senza sovraccaricare;
- far vedere fin da subito che il comportamento del giocatore lascia una traccia;
- chiudersi con una scelta evolutiva leggibile.

### Filosofia onboarding

L'onboarding ideale è:

- **integrato nei primi encounter**;
- rapido, sotto i 10 minuti;
- accompagnato da preset di Forme, direttive assistite e suggerimenti;
- costruito per far capire il gioco mentre lo si gioca, non prima.

La prima partita dovrebbe lasciare questa impressione:

> “Ho capito come si combatte, ma soprattutto ho sentito che il gioco stava già leggendo chi sono e cosa sto diventando.”

---

## Il cuore del match

Il combattimento dovrebbe essere costruito su un sistema cooperativo moderno:

**planning condivisa → commit → risoluzione ordinata**

Questo significa che il gioco non ruota attorno al classico “tocca a me”.
Tutti i giocatori:

- leggono il campo insieme;
- consultano le proprie informazioni personali sui device;
- dichiarano intenti, movimenti, abilità, reazioni e priorità;
- poi congelano il piano;
- infine il round si risolve in base a velocità di reazione, timing dell’azione, contromisure e stato del campo.

### Effetto sul feeling

Questa struttura dovrebbe far sentire Evo Tactics come:

- più cooperativo di un tactics tradizionale;
- più vicino a un tavolo condiviso che a un turno sequenziale;
- più moderno e leggibile di un sistema a iniziativa rigida.

Non è “ognuno gioca il proprio turno”.
È:

> “Noi impostiamo un piano, poi il mondo lo mette davvero alla prova.”

---

## TV, tavolo e telefoni

Uno degli elementi più distintivi del progetto è la sua forma da salotto.

### La TV

La TV dovrebbe essere il **teatro del combattimento**:

- mappa tattica condivisa;
- linee di pericolo;
- ordine di risoluzione;
- warning;
- status e risorse chiave;
- identità tattica della squadra;
- stato del bioma e degli hazard.

### I telefoni / companion

I telefoni dovrebbero essere strumenti personali, non semplici menu remoti.
Dovrebbero gestire:

- info private o parziali;
- draft di Forme / upgrade / carte;
- pannello build personale;
- scelte sociali;
- recruit / trust / mating;
- micro-interazioni del meta-loop;
- supporto tattico leggero durante planning e debrief.

### Distinzione cruciale

Il progetto dovrebbe separare chiaramente:

- **Gameplay HUD**
- **Mission Console / tooling / mission control**
- **Telemetry / debrief UI**

Questa distinzione è fondamentale per non confondere UX di gioco e strumenti di supporto.

---

## Il mondo come organismo vivo

Evo Tactics dovrebbe essere costruito su un mondo generato che non è una semplice lista di mappe, ma una rete di relazioni ecologiche.

La struttura corretta del mondo dovrebbe essere:

**Bioma → Ecosistema → Foodweb → Specie / ruoli → Connessioni cross-bioma → Eventi → Encounter → Pressioni di gioco**

### Il bioma non è sfondo

Ogni bioma dovrebbe influenzare davvero il gameplay:

- visibilità;
- mobilità;
- risorse;
- hazard;
- archetipi di nemici;
- specie favorite o penalizzate;
- mutazioni plausibili;
- tono narrativo della missione.

Quindi:

- il deserto non è solo “giallo”;
- la caverna non è solo “buia”;
- le badlands non sono solo “metalliche”.

Ogni luogo deve avere **identità ecologica, identità tattica e identità evolutiva**.

---

## La foodweb come sistema chiave

Una delle idee più importanti recuperate è che la **foodweb** dovrebbe essere un sistema reale, non una nota laterale.

### Ruolo effettivo della foodweb

Nel gioco completo, la foodweb dovrebbe:

- collegare specie, biomi ed ecosistemi;
- determinare ruoli trofici e pressioni ambientali;
- influenzare spawn, minacce ed eventi;
- spiegare perché certe specie compaiono in certi contesti;
- creare crisi, squilibri e spillover tra biomi;
- dare coerenza al worldgen;
- guidare encounter design e validazione del contenuto.

### Impatto sul gioco

L’impatto ideale della foodweb è:

- **alto** sul worldgen e sulla coerenza del mondo;
- **medio-alto** sugli encounter e sulla varietà delle run;
- **medio** sulla progressione e sulle build consigliate;
- **basso ma non nullo** come meccanica esplicita cliccabile.

In pratica, è il motore invisibile che rende credibile il mondo.

---

## Specie, morph, trait e Forme

Le creature in Evo Tactics non dovrebbero mai essere trattate come skin o classi statiche.

La costruzione corretta della build è:

**Specie → parti / morph → trait → job → Forma → comportamento osservato → telemetria → unlock**

### Specie

La specie definisce:

- budget;
- predisposizioni ecologiche;
- slot morfologici;
- limiti del corpo;
- ruolo naturale nell’ecosistema.

### Morph / parti

Le parti definiscono come quel corpo funziona davvero.
Gli slot principali dovrebbero restare leggibili:

- locomotion;
- offense;
- defense;
- senses;
- metabolism.

### Trait

I trait dovrebbero essere la zona di deviazione e personalizzazione:

- adattamenti;
- affinità;
- eccezioni;
- specializzazioni;
- mutazioni situazionali.

### Job

Il job assegna il ruolo tattico leggibile dentro il team.
Non sostituisce la specie: la interpreta in chiave combattiva.

### Forme

Le Forme dovrebbero rappresentare il seme temperamentale / identitario.
Sono la parte che connette psicologia, stile di gioco, telemetria e direzione evolutiva.

---

## Job come ruoli di organismo, non solo classi

I job shipping dovrebbero restare leggibili e forti:

- Skirmisher
- Vanguard
- Warden
- Artificer
- Invoker
- Harvester

Ma la loro funzione ideale non è “classe fantasy” in senso tradizionale.
Dovrebbero essere letti come:

> “Il ruolo che questo organismo assume all’interno del team e dell’ecosistema di missione.”

Il punto distintivo è che il giocatore non sceglie solo un tank, un DPS o un supporto.
Sceglie **che tipo di creatura sta facendo emergere**.

---

## Il Sistema legge il giocatore

La progressione di Evo Tactics dovrebbe basarsi su un’idea rarissima:

> **Il gioco osserva come combatti e usa quella traccia per proporti ciò che potresti diventare.**

### Dati comportamentali

Il sistema dovrebbe raccogliere:

- aggressività;
- rischio;
- coesione;
- setup;
- esplorazione;
- stabilità / tilt;
- drift dei profili MBTI / PF;
- segnali di identità e preferenza.

### Funzione effettiva

Questi dati non devono restare invisibili o cosmetici.
Devono influenzare:

- reward;
- suggerimenti di Forma;
- unlock;
- consigli build;
- derive identitarie;
- gating soft;
- scelte sociali e reclutamento;
- mutazioni disponibili.

Questo è il punto che rende Evo Tactics diverso:
non sei solo tu a scegliere una build;
**il gioco interpreta la build che il tuo comportamento sta costruendo**.

---

## La progressione a carte: Tri-Sorgente

Una delle idee più forti da rimettere al centro è la **Tri-Sorgente**.

### Definizione

Dopo scontri minori o eventi, il gioco dovrebbe offrire:

**3 carte + Skip**

Le tre offerte dovrebbero nascere da:

1. **contesto / bioma / missione**
2. **identità / Forma / profilo**
3. **azioni recenti / telemetria effettiva**

Se il giocatore salta tutto, converte in **Frammenti Genetici** o valuta equivalente.

### Perché è importante

La Tri-Sorgente è il ponte perfetto tra:

- run-based progression;
- build identity;
- evoluzione tipo Spore;
- agency leggibile;
- reward design elegante.

### Effetto desiderato

La progressione dovrebbe far sentire il giocatore così:

> “Il gioco non mi sta dando loot a caso. Mi sta offrendo mutazioni che hanno senso per dove sono, per chi sto diventando e per come ho giocato.”

---

## Il Sistema / SIS come antagonista vivo

Il nemico in Evo Tactics non dovrebbe essere solo un insieme di unità avversarie.
Dovrebbe esserci un **Sistema** che osserva, interpreta e reagisce.

### Funzioni ideali del SIS

Il Sistema dovrebbe:

- leggere eventi e comportamenti;
- valutare rischio, pressione e stato del campo;
- scegliere escalation;
- spingere il ritmo della missione;
- adattarsi al turtling, all’all-in o alla crisi del giocatore;
- incarnare la pressione del mondo.

Il risultato desiderato non è “IA imbattibile”, ma:

> “Il mondo sembra accorgersi di come sto giocando e rispondermi.”

Questo rende il gioco più narrativo anche senza lunghe cutscene.

---

## Narrativa emergente

La storia di Evo Tactics non dovrebbe vivere solo in testi statici.
Dovrebbe emergere da:

- briefing brevi;
- debrief reattivi;
- biomi con identità narrativa;
- feedback del Sistema;
- mutazioni ottenute;
- relazioni sbloccate;
- recruit e trust;
- eventi di crisi negli ecosistemi.

Il tono corretto è una narrativa **emergente, sistemica, leggibile**.
Non una lore opaca che vive fuori dal gioco.

---

## Il meta-loop sociale

Fuori dalla missione, Evo Tactics dovrebbe avere un meta-loop chiaro e potente, ma controllato:

- Recruit
- Trust / Affinity
- Nido
- Mating
- Ereditarietà o nuove opzioni evolutive

### Recruit

Il recruit dovrebbe essere legato a:

- comportamenti osservati;
- affinità;
- scelte fatte durante eventi;
- stato del Nido;
- esito degli encounter.

### Trust e Affinity

Dovrebbero essere sistemi distinti:

- **Trust** come affidabilità e sicurezza relazionale;
- **Affinity** come vicinanza, attrazione o sintonia.

### Nido

Il Nido dovrebbe essere l’hub evolutivo e sociale:

- spazio di crescita;
- moduli;
- gestione di risorse;
- unlock di rituali / sviluppo;
- base da cui leggere il progresso della campagna.

### Mating

Il mating non dovrebbe essere un sistema ornamentale.
Dovrebbe funzionare come prosecuzione coerente di trust, nido e build identity, producendo:

- seed;
- mutazioni future;
- opzioni di lignaggio;
- nuovi rami evolutivi o sociali.

L’obiettivo non è diventare un dating sim.
L’obiettivo è far sentire che il percorso della squadra continua fuori dal match.

---

## A.L.I.E.N.A. e i framework profondi

Framework come **A.L.I.E.N.A.** non devono necessariamente diventare meccaniche visibili in prima linea.
La loro funzione ideale è stare dietro le quinte come sistemi autoriali che garantiscono:

- coerenza tra ambiente e specie;
- linee evolutive credibili;
- coerenza ecologica;
- comportamento coerente;
- ancoraggio narrativo e culturale.

Il giocatore non deve “usare A.L.I.E.N.A.”.
Deve sentirne il risultato in un mondo più robusto, leggibile e meno arbitrario.

---

## La forma ideale del loop completo

Il loop completo del gioco dovrebbe essere questo:

**Bioma → Ecosistema → Missione → Planning condivisa → Resolve → Debrief → Tri-Sorgente → Telemetria / Identità → Nido / Relazioni / Recruit → Nuova missione**

Questa sequenza è importante perché unifica tutto:

- il mondo;
- il combat;
- l’identità;
- la progressione;
- il meta-loop.

Il gioco smette così di sembrare un collage di sistemi.
Diventa un organismo unico.

---

## Descrizione finale del gioco

Se bisogna descrivere Evo Tactics in modo completo e fedele al suo potenziale, la formulazione giusta è questa:

**Evo Tactics è un tactical co-op TV-first in cui una squadra di creature modulari combatte dentro ecosistemi vivi e interconnessi. Ogni scontro viene pianificato insieme e risolto per velocità di reazione, timing e contromisure. Ogni missione lascia una traccia: telemetria, identità, carte di mutazione, relazioni, seed e nuove possibilità evolutive. Il mondo non è scenario, ma pressione ecologica attiva. Il combattimento non serve solo a vincere: serve a definire che cosa stai diventando.**

---

## Formula sintetica

La forma più sintetica e corretta del gioco è:

> **Bioma → ecosistema → missione → comportamento → telemetria → Tri-Sorgente → evoluzione → nido / relazioni → nuova missione**

Questa è la struttura che, più di tutte, tiene insieme il progetto.
