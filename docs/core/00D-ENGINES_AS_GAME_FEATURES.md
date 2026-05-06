---
title: Engines as Game Features — Evo Tactics
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-05-06'
source_of_truth: true
language: it-en
review_cycle_days: 14
---

# Engines as Game Features — Evo Tactics

> **Stato**: piano approvato (2026-04-16). Le trasformazioni engine→feature qui descritte sono design intent, non brainstorming. Aperto a espansione, rinominazioni in tema Evo-Tactics, e raffinamento dell'aspetto game-facing. I nomi diegetici e le interfacce specifiche vanno rifiniti durante l'implementazione.

## 0. Scopo

Questo documento spiega **come trasformare gli engine e i servizi tecnici del repo in feature di gioco leggibili, diegetiche e utili**.

Non serve a ridefinire l'architettura backend.
Serve a rispondere a una domanda pratica di design:

> se Atlas, Flow, Idea Engine e gli altri engine diventassero parti visibili del gioco, come dovrebbero apparire al giocatore?

L'obiettivo è evitare due errori opposti:

1. lasciare questi sistemi completamente invisibili e perdere una parte dell'unicità di Evo Tactics;
2. esporli in modo troppo tecnico, facendo sembrare il gioco una dashboard o un tool interno.

La regola guida è questa:

- **engine invisibili** → possono restare backend, ma devono produrre effetti leggibili nel gioco;
- **engine semi-visibili** → diventano schermate, rituali, report, companion, hub;
- **engine visibili** → diventano meccaniche vere con scelta, rischio e ricompensa.

---

## 1. Principio di integrazione

Ogni engine deve essere tradotto in almeno uno di questi ruoli:

- **organo del mondo**
- **superficie di lettura**
- **motore di proposta**
- **motore di conseguenza**
- **strumento della squadra**
- **layer meta/sociale**

La traduzione corretta non è:

> “portiamo il tool dentro il gioco”.

La traduzione corretta è:

> “portiamo dentro il gioco la funzione sistemica che il tool già svolge, ma in una forma comprensibile e diegetica”.

---

## 2. Mappa rapida degli engine

| Engine / Servizio          | Ruolo tecnico oggi                               | Ruolo ideale nel gioco                      | Visibilità consigliata                  |
| -------------------------- | ------------------------------------------------ | ------------------------------------------- | --------------------------------------- |
| Atlas                      | telemetria, snapshot, lettura stato              | Sistema di Lettura Evolutiva                | alta nel debrief, media in match        |
| Flow                       | generazione, validazione, simulazione dataset    | Motore di Simulazione del Mondo             | media pre/post missione, bassa in match |
| Idea Engine                | intake, tassonomia, proposta strutturata, report | Motore di Proposta Evolutiva                | alta post-missione                      |
| Rules Engine               | resolver tattico d20                             | Spina dorsale leggibile del conflitto       | alta in-match, ma non verbosa           |
| SquadSync / Adaptive layer | sincronizzazione/bridging squadra                | Coordinazione di Branco                     | media in-match e meta                   |
| EventScheduler             | gestione tempo/eventi/finestre                   | Ritmo Ecologico del Mondo                   | media su mappa campagna                 |
| Export                     | serializzazione/report/share                     | Diario / Dossier / Codex condivisibile      | bassa, meta                             |
| Publishing                 | pubblicazione / surface esterne                  | Galleria campagne / seed / run condivise    | bassa, meta/social                      |
| Moderation                 | controllo contenuti                              | Governance comunitaria / filtro curatoriale | minima, solo layer community            |

---

## 3. Atlas → Sistema di Lettura Evolutiva

### 3.1 Ruolo tecnico oggi

Atlas è il layer che espone e legge telemetria, snapshot e indicatori di stato della run/squadra.

### 3.2 Trasformazione consigliata

Nel gioco deve diventare:

**il sistema che legge chi state diventando.**

Non una dashboard tecnica, ma un interprete della traiettoria della squadra.

### 3.3 Come appare in gioco

#### Durante il match

- warning leggibili sulla TV;
- indicatori di pressione, rischio, coesione, tilt, momentum;
- segnali chiari su trend negativi o opportunità;
- spiegazioni sintetiche del perché il Sistema sta reagendo in un certo modo.

#### Nel debrief

- report identitario post-missione;
- drift di squadra e profilo della run;
- suggerimenti su Forme, Job, mutazioni o carte future;
- chiave di lettura delle metriche recenti.

#### Nel meta-loop

- diario evolutivo della squadra;
- storico delle run;
- confronto archetipale tra creature o gruppi;
- memoria lunga del Nido.

### 3.4 Funzione diegetica

Atlas può essere presentato come:

- archivio vivente del Nido;
- memoria biomeccanica del gruppo;
- sistema di lettura del Sistema;
- organo che interpreta il comportamento della colonia/squadra.

### 3.5 Beneficio

Atlas rende il progetto coerente con il suo pilastro più raro:

> il gioco non osserva solo cosa hai vinto; osserva **come** hai giocato.

---

## 4. Flow → Motore di Simulazione del Mondo

### 4.1 Ruolo tecnico oggi

Flow è il motore di generazione, orchestrazione, validazione e sintesi dei contenuti ecologici e sistemici.

### 4.2 Trasformazione consigliata

Nel gioco deve diventare:

**il motore che costruisce il prossimo problema ecologico e tattico.**

### 4.3 Come appare in gioco

#### Prima della missione

- preview ecologica della zona;
- forecast parziale su specie plausibili, hazard e pressioni;
- lettura incompleta ma utile del bioma;
- segnali di crisi o equilibrio instabile.

#### Durante la campagna

- mutazione dei biomi;
- migrazioni e bridge species;
- collassi trofici o riequilibri;
- eventi cross-bioma che aprono nuove missioni.

#### Dopo decisioni importanti

- cambiamenti persistenti nel contenuto;
- alterazione di spawn, risorse, mutazioni favorite;
- conseguenze ecologiche leggibili delle azioni dei giocatori.

### 4.4 Funzione diegetica

Flow può essere presentato come:

- camera di simulazione del Nido;
- oracolo ecologico;
- motore previsionale del Sistema;
- campo di risonanza ambientale.

### 4.5 Beneficio

Flow tiene insieme:

- foodweb;
- worldgen;
- conseguenze sistemiche;
- promessa di un mondo che non resta statico dopo il combattimento.

---

## 5. Idea Engine → Motore di Proposta Evolutiva

### 5.1 Ruolo tecnico oggi

L'Idea Engine oggi è soprattutto intake strutturato, tassonomia, raccolta idee/feedback, report e support layer.

### 5.2 Trasformazione consigliata

Nel gioco deve diventare:

**il motore che formula le prossime possibilità di mutazione, adattamento o dottrina.**

### 5.3 Come appare in gioco

#### Dopo missioni, eventi o soglie identitarie

Il gioco propone:

- **3 opzioni evolutive**;
- **1 linea tattica o dottrinale**;
- **1 deviazione rischiosa o specializzazione rara**;
- oppure la conversione in risorsa genetica.

Queste proposte devono usare almeno:

- contesto del bioma;
- stato della foodweb;
- telemetria Atlas;
- Forma / profilo identitario;
- relazioni del Nido;
- eventi recenti.

### 5.4 Rapporto con Tri-Sorgente

Il modo migliore per integrarlo è:

- **Idea Engine = motore interno delle proposte**
- **Tri-Sorgente = interfaccia giocabile e regola di selezione**

Quindi Idea Engine non sostituisce Tri-Sorgente.
La alimenta.

### 5.5 Funzione diegetica

Può essere presentato come:

- Consiglio del Nido;
- Motore di Mutazione;
- Protocollo di Adattamento;
- Interprete del Sistema.

### 5.6 Beneficio

Trasforma un backend di raccolta/strutturazione in uno dei sistemi più forti del gioco:

> il mondo osserva ciò che fai e ti propone modi coerenti per cambiare.

---

## 6. Rules Engine → Spina dorsale leggibile del conflitto

### 6.1 Ruolo tecnico oggi

Il Rules Engine è il resolver del combattimento tattico: round, ordine di risoluzione, d20, parry, risorse, esiti.

### 6.2 Trasformazione consigliata

Qui non serve “reinventarlo”.
Serve **renderlo leggibile**.

### 6.3 Come appare in gioco

- timeline di risoluzione chiara;
- spiegazione sintetica degli esiti;
- visibilità di parry, cover, flank, obscured, trigger e status;
- surfacing dei motivi per cui una scelta ha funzionato o fallito.

### 6.4 Funzione diegetica

Non va nominato come “motore regole”.
Può essere percepito come:

- metabolismo del conflitto;
- sequenziatore di reazione;
- rete neuromotoria del combattimento.

### 6.5 Beneficio

Il giocatore deve sentire:

> “capisco il sistema, quindi posso dominarlo.”

Non:

> “dietro le quinte succedono numeri che non controllo.”

---

## 7. SquadSync / Adaptive Layer → Coordinazione di Branco

### 7.1 Ruolo tecnico oggi

Layer che collega stato squadra, bridge, alert intelligenti e adattamento della sincronizzazione.

### 7.2 Trasformazione consigliata

Nel gioco deve diventare:

**il sistema che rende la squadra più di una somma di build individuali.**

### 7.3 Come appare in gioco

#### In match

- segnali di combo readiness;
- suggerimenti di follow-up;
- assist, chain actions e opportunità di sincronizzazione;
- reward alla coordinazione reale, non solo al danno.

#### Fuori dal match

- stili di squadra emergenti;
- compatibilità tra Forme;
- drift di coesione;
- raccomandazioni di coppie/unità efficaci.

### 7.4 Funzione diegetica

Può essere presentato come:

- sinapsi di branco;
- rete adattiva del Nido;
- eco-mentale della squadra.

### 7.5 Beneficio

SquadSync permette di legare in modo organico:

- couch co-op;
- telemetria;
- progressione collettiva;
- identità di squadra.

---

## 8. EventScheduler → Ritmo Ecologico del Mondo

### 8.1 Ruolo tecnico oggi

Gestione di finestre temporali, eventi pianificati, attivazioni di sistema e scheduling operativo.

### 8.2 Trasformazione consigliata

Nel gioco deve diventare:

**il sistema che decide quando il mondo cambia davvero.**

### 8.3 Come appare in gioco

- migrazioni;
- finestre biologiche;
- mating season;
- crisi di risorse;
- fioriture tossiche;
- tempeste, crolli, aperture o anomalie;
- eventi speciali legati a finestre temporali o a stati di ecosistema.

### 8.4 Funzione diegetica

Può essere presentato come:

- calendario del Sistema;
- ritmo metabolico del pianeta;
- onda di pressione ecologica.

### 8.5 Beneficio

Aggiunge:

- urgenza;
- varietà;
- memoria del tempo;
- sensazione di mondo vivo tra una missione e l'altra.

---

## 9. Export / Publishing / Moderation → Meta-layer comunitario

### 9.1 Ruolo tecnico oggi

Serializzazione, pubblicazione, esposizione e controllo di contenuti o report.

### 9.2 Trasformazione consigliata

Questi sistemi **non devono diventare core gameplay**.
Devono diventare estensioni del metagioco.

### 9.3 Come appaiono in gioco

#### Export

- dossier run;
- codex condivisibile;
- diario del Nido;
- schede specie o creature generate.

#### Publishing

- galleria di campagne;
- seed condivisi;
- bacheca mutazioni, squadre o sfide;
- eventi community.

#### Moderation

- filtro curatoriale dei contenuti condivisi;
- governance del layer social/community;
- approvazione o visibilità di contenuti user-generated.

### 9.4 Beneficio

Arricchiscono il gioco senza confondere il loop principale.

---

## 10. Integrazione migliore: tre cerchi

## 10.1 Cerchio A — Engine centrali e diegetici

Questi devono entrare davvero nel gioco:

- Atlas
- Flow
- Idea Engine
- Rules Engine
- SquadSync

## 10.2 Cerchio B — Engine ambientali

Questi entrano come stato del mondo e pressione di campagna:

- EventScheduler
- propagation / network ecologica
- validation/generation surfacing selettivo

## 10.3 Cerchio C — Engine esterni / metastrato

Questi restano fuori dal loop centrale ma valorizzano la run:

- Export
- Publishing
- Moderation

---

## 11. Circuito ideale del gioco

### Prima della missione

- **Flow** simula il mondo e il bioma;
- **EventScheduler** definisce finestra ecologica e urgenza;
- **Atlas** mostra memoria e pattern recenti;
- **Idea Engine** prepara adattamenti, carte o dottrine possibili.

### Durante la missione

- **Rules Engine** risolve il conflitto;
- **SquadSync** evidenzia coordinazione e assist;
- **Atlas** legge rischio, coesione e drift;
- **Flow** rende il bioma un agente, non uno sfondo.

### Dopo la missione

- **Atlas** produce il referto identitario;
- **Idea Engine** genera le proposte evolutive;
- **Flow** aggiorna lo stato ecologico;
- **Nido** assorbe le conseguenze.

### Tra campagne

- **Export / Publishing** trasformano la run in memoria condivisibile;
- **Moderation** governa il layer comunitario.

---

## 12. Mappa concettuale semplificata

- **Atlas** = ti dice **chi stai diventando**
- **Flow** = decide **che mondo stai attraversando**
- **Idea Engine** = propone **come potresti cambiare**
- **Rules Engine** = determina **come il conflitto prende forma**
- **SquadSync** = misura **come diventate squadra**
- **EventScheduler** = decide **quando il mondo cambia**

Questa struttura è forte perché ogni engine risponde a una domanda diversa del gioco.

---

## 13. Cosa NON fare

Non trasformare gli engine in:

- pannelli admin travestiti da UX;
- schermate con gergo troppo tecnico;
- dashboard da QA esposte al giocatore;
- sistemi separati che non si parlano tra loro.

Ogni engine deve diventare:

> una funzione del mondo, della squadra o dell’evoluzione.

---

## 14. Priorità di integrazione consigliata

| Priorità | Engine                           | Perché                                                                |
| -------- | -------------------------------- | --------------------------------------------------------------------- |
| 1        | Atlas                            | è il ponte più diretto tra telemetria, identità e debrief             |
| 2        | Idea Engine                      | può dare senso forte alla progressione post-missione e a Tri-Sorgente |
| 3        | SquadSync                        | valorizza il couch co-op e la squadra come organismo                  |
| 4        | Flow                             | rende il worldgen e la foodweb veramente percepibili                  |
| 5        | EventScheduler                   | introduce ritmo, memoria del tempo e finestre ecologiche              |
| 6        | Rules Engine surfacing           | migliora la leggibilità senza cambiare il cuore del combat            |
| 7        | Export / Publishing / Moderation | completa il metastrato ma non deve distrarre dal loop centrale        |

---

## 15. Come usare questo documento

Usa questo file quando devi decidere:

- se un engine debba restare backend o diventare feature;
- come presentare in fiction un sistema tecnico già esistente;
- dove agganciare un engine al core loop o al meta-loop;
- come evitare che il progetto sembri un collage di tool interni;
- quali engine promuovere per primi a superfici player-facing.

Se devi invece capire **dove leggere cosa nel repo**, usa `00C-WHERE_TO_USE_WHAT.md`.
Se devi capire **cosa è canonico e cosa no**, usa `00B-CANONICAL_PROMOTION_MATRIX.md`.
Se devi capire **cos'è Evo Tactics come gioco**, usa `00-GDD_MASTER.md`.
