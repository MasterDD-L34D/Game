---
title: Lezioni da postmortem tattici — Pattern applicabili a Evo-Tactics
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-16
source_of_truth: false
language: it-en
review_cycle_days: 90
---

# Lezioni da postmortem tattici — Pattern applicabili a Evo-Tactics

Analisi di 5 giochi tattici/coop con pattern estraibili per i 6 pilastri di design. Ogni sezione: cosa ha funzionato, cosa ha fallito, pattern concreto per Evo-Tactics.

> Fonte: postmortem pubblici, GDC talk, blog degli sviluppatori. Vedi `docs/guide/external-references.md` per i link.

---

## 1. Halfway (Robotality, 2014) — Tattico a turni indie

**Genere**: Tattico a turni, sci-fi, pixel art, griglia ortogonale, 2 sviluppatori.

### Cosa ha funzionato

- **Leggibilita griglia**: confini tile chiari, indicatori copertura, preview linea di tiro. Percentuali hit mostrate pre-azione. I giocatori sapevano sempre cosa offriva una cella prima di impegnarsi.
- **Pixel art atmosferico**: arte coerente a scala costante. Per tattici dove i giocatori fissano la griglia per periodi lunghi, qualita visiva consistente paga molto.
- **Feedback sonoro tattico**: suoni arma, conferme colpo, audio ambientale rinforzavano stato tattico (pericolo, copertura, esposizione).
- **Disciplina di scope**: 2 persone hanno consegnato una campagna completa di 15 ore tagliando multiplayer, mappe procedurali, alberi classi profondi.

### Cosa ha fallito

- **Varieta nemici insufficiente**: critica piu comune. IA nemica usava pattern semplici rush-or-cover. Pochi tipi nemico = puzzle tattico risolto presto e ripetuto.
- **Progressione piatta**: alberi skill superficiali (solo bump statistici), nessuna scelta build trasformativa. Differenziazione meccanica debole tra membri squad.
- **Geometria mappe monotona**: troppi corridoi, poche route di fiancheggiamento, nessuna elevazione o copertura distruttibile.
- **Gap informativi UI**: hit% mostrato, ma range danno, durata status, cooldown abilita nascosti. Decisioni non informate sull'uso abilita.
- **Curva difficolta**: missioni iniziali troppo facili, spike tardivo senza nuovi strumenti per rispondere.

### Pattern per Evo-Tactics

| Pattern                                    | Pilastro | Applicazione                                                                                                                                                             |
| ------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Varieta nemici non negoziabile**         | P1, P5   | `trait_mechanics.yaml` deve creare comportamenti IA meaningfully diversi per specie, non solo variazioni statistiche. Sistema IA con personality variant.                |
| **Mostrare TUTTI i numeri decisionali**    | P1       | Hit%, range danno, durata status, cooldown, soglie MoS. Resolver d20 deve surfaceare tutto nel layer UI.                                                                 |
| **Geometria mappa > quantita mappe**       | P1       | Grid spatial module: prioritizzare lane fiancheggiamento, elevazione, asimmetria copertura su conteggio tile.                                                            |
| **Progressione deve trasformare il gioco** | P2       | Bump statistici invisibili. Trait combo (PP combo meter, SG surge burst) giusto approccio — ogni unlock deve cambiare visibilmente cosa un'unita puo fare sulla griglia. |
| **Densita combattimento**                  | P1, P5   | Per play coop su TV, ogni 2-3 minuti senza decisione tattica = tempo morto.                                                                                              |

---

## 2. AI War: Fleet Command (Arcen Games, 2009) — Co-op vs Sistema IA

**Genere**: Strategico cooperativo, asimmetrico, giocatori vs IA galattica. Postmortem di Chris Park (Game Developer, Feb 2010).

### Cosa ha funzionato

- **AI Progress (AP) come valuta di aggressione**: IA non scala linearmente col tempo. Traccia un punteggio AP che sale quando i giocatori prendono azioni aggressive (cattura pianeti, distruzione strutture chiave). Ogni decisione giocatore = calcolo costo-beneficio. Partner dovevano concordare su quali target valevano il costo AP.
- **Asimmetria di potere permanente**: IA controlla la galassia dal turno 1, giocatori sono guerriglieri. Co-op necessario, non opzionale — un giocatore solo non poteva coprire abbastanza fronti.
- **10 livelli difficolta con tipi IA ortogonali**: difficolta non scalava solo statistiche. Ogni tipo IA (Backdoor, Fortress, Technologist) cambiava pattern comportamentali. Due giocatori potevano affrontare tipi IA diversi contemporaneamente.
- **Economia condivisa, flotte indipendenti**: co-op condivideva risorse/conoscenza ma comandava flotte separate. Evitava problema "un giocatore guida".

### Cosa ha fallito

- **Onboarding brutale**: sistema AP quasi impossibile da spiegare a nuovi giocatori. Molti perdevano le prime 5+ partite prima di capire che conquista = morte.
- **Valli di pacing**: meta partita stallava quando giocatori tartarugavano per non alzare AP. Strategia "ottimale" (prendere meno pianeti possibile) era noiosa. Patch successive aggiunsero wave timer e flotte roaming.
- **Sovraccarico informativo UI**: gestire 30.000+ navi su 80 pianeti travolgeva i giocatori.

### Pattern per Evo-Tactics

| Pattern                                             | Pilastro | Applicazione                                                                                                          |
| --------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- |
| **Threat meter reattivo alle scelte giocatore**     | P5       | Sistema con threat che sale su aggressione giocatore — ogni attacco ha un costo. Mappabile su PP combo / SG surge.    |
| **Asimmetria: Sistema sempre piu forte**            | P5       | Sistema deve sembrare opprimente; giocatori vincono con tattica, non attrition. Rinforza necessita co-op.             |
| **Tipi comportamentali IA, non scaling statistico** | P5       | Personalita Sistema (aggressivo, difensivo, trapper) >> moltiplicatori difficolta piatti.                             |
| **Punire turtling, non solo aggressione**           | P5, P6   | Threat roaming / escalation temporizzata previene stalli. Round orchestrator puo iniettare onde di pressione.         |
| **Agenzie indipendenti, conseguenze condivise**     | P5       | Ogni giocatore controlla proprio squad ma condivide conseguenze sul campo. Gia nel design session engine.             |
| **Rendere leggibile la risposta del Sistema**       | P1, P5   | Fallimento principale AI War = opacita. Evo-Tactics deve rendere la threat response del Sistema visibile e leggibile. |

---

## 3. Frozen Synapse (Mode 7 Games, 2011) — Turni simultanei

**Genere**: Tattico a turni simultanei, cyberpunk, 2D top-down.

### Cosa ha funzionato

- **Pianificazione simultanea**: entrambi i giocatori pianificano mosse contemporaneamente, poi risoluzione simultanea. Elimina "attesa turno avversario". Tensione da incertezza su cosa fara l'avversario.
- **Simulatore "what-if"**: giocatori potevano simulare scenari prima di confermare turno. Potevano posizionare "fantasmi" nemici e testare risposte. Trasparenza totale sulle regole.
- **Regole minimaliste, profondita emergente**: poche armi (shotgun, sniper, machine gun, rocket), regole semplici (linea di tiro, copertura, velocita), complessita emergente dalle interazioni.
- **Replay cinematici**: ogni turno risolto veniva riprodotto come "film". Creava momenti memorabili e facilitava comprensione di cosa era successo.

### Cosa ha fallito

- **Curva apprendimento ripida per nuovi giocatori**: nonostante simulatore, sistema simultaneo confondeva chi veniva da tattici sequenziali.
- **Partite lunghe online**: tempi di pianificazione illimitati portavano a partite che duravano giorni.
- **Poca varieta unita**: meccaniche emergenti compensavano, ma giocatori volevano piu tipi unita.

### Pattern per Evo-Tactics

| Pattern                                    | Pilastro | Applicazione                                                                                               |
| ------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------- |
| **Simulatore "what-if" pre-azione**        | P1       | Preview azioni prima di confermare. Mostrare outcome probabile di un attacco/movimento sulla griglia.      |
| **Replay turno**                           | P1       | Per TV play: replay cinematico del round risolto. Crea momenti memorabili, facilita comprensione.          |
| **Regole semplici, complessita emergente** | P1, P6   | Validazione approccio Evo-Tactics: pochi tipi danno + counter system = profondita senza inflazione regole. |

---

## 4. Hades (Supergiant Games, 2020) — Progressione emergente

**Genere**: Action roguelike, narrazione integrata. GDC Talk "Breathing Life into Greek Myth" (2020).

### Cosa ha funzionato

- **Narrazione reattiva al gameplay**: ogni run, morte, scelta di arma/boon generava dialogo unico. Il gioco riconosceva come il giocatore giocava e rispondeva narrativamente. Oltre 300.000 parole di dialogo, quasi zero ripetizioni percepite.
- **Build variety come espressione identita**: sistema boon (Dio + arma + aspetto) creava migliaia di combinazioni. Ogni giocatore sviluppava "stile" riconoscibile. "Come giochi modella chi sei" — esattamente la visione Evo-Tactics.
- **Progressione permanente + progressione run**: meta-progressione (Mirror, relazioni NPC) motivava long-term; boon per-run motivavano sperimentazione. Due loop che si rinforzano.
- **Difficolta come scelta, non imposizione**: Pact of Punishment permetteva giocatori di scegliere QUALI modificatori difficolta attivare. Personalizzazione della sfida.

### Cosa ha fallito

- **Meta-progressione poteva trivializzare sfida**: giocatori con Mirror maxato trovavano difficolta base troppo facile. Balance tra permanente e per-run richiese molte iterazioni.
- **Early Access dependency**: Hades richiedeva anni di feedback iterativo per calibrare. Non replicabile senza community attiva.

### Pattern per Evo-Tactics

| Pattern                               | Pilastro | Applicazione                                                                                                                                                                                 |
| ------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **"Come giochi modella chi diventi"** | P2, P4   | Sistema trait evolution gia allineato. Aggiungere: VC scoring che influenza narrative/dialoghi NPC. Temperamenti MBTI/Ennea come "boon permanenti" che cambiano in base allo stile di gioco. |
| **Difficolta come menu, non slider**  | P6       | Giocatori scelgono QUALI modificatori attivare, non solo "facile/medio/difficile". Mappabile su: scelta bioma, trait restrizioni, Sistema personalita.                                       |
| **Due loop progressione**             | P2       | Per-sessione (trait temporanei, PP combo) + permanente (evoluzione specie, reputazione fazione). Gia nel design — validato da Hades.                                                         |

---

## 5. Cogmind (Grid Sage Games, 2015+) — Componenti modulari

**Genere**: Roguelike tattico, sci-fi, sistema componenti modulari. Blog estensivo di Josh Ge (gridsagegames.com).

### Cosa ha funzionato

- **Identita attraverso componenti**: il giocatore E' i componenti che equipaggia. Nessuna classe fissa — build emerge da cosa trovi e scegli. Ogni run e' unica perche' componenti disponibili cambiano.
- **Trade-off visibili e immediati**: ogni componente ha benefici e costi espliciti (peso, energia, slot). Aggiungere un'arma potente = sacrificare mobilita. Decisioni significative perche' costi sono chiari.
- **UI per sistemi complessi**: nonostante centinaia di componenti, UI ASCII mantiene leggibilita. Tooltip stratificati: info base sempre visibile, dettagli su hover/expand. Principio: "informazione giusta al momento giusto".
- **Emergent gameplay da combinazioni**: componenti non progettati per combo specifiche creavano sinergie inaspettate. Giocatori scoprivano strategie non intenzionali — gameplay emergente autentico.

### Cosa ha fallito

- **Nicchia estrema**: ASCII art + complessita = barriera entrata altissima. Bellissimo sistema, pubblico limitato.
- **Onboarding lungo**: curva apprendimento componenti richiede molte run per capire trade-off reali.
- **Balance iterativo senza fine**: centinaia di componenti = bilanciamento perpetuo. Josh Ge documenta anni di micro-aggiustamenti.

### Pattern per Evo-Tactics

| Pattern                         | Pilastro | Applicazione                                                                                                                                                                                         |
| ------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Identita = equipaggiamento**  | P3       | Specie x Job x Trait = identita emergente. Cogmind valida: lascia che combinazioni definiscano il personaggio, non classi fisse.                                                                     |
| **Trade-off espliciti**         | P6       | Ogni trait deve avere costo visibile e immediato. `trait_mechanics.yaml` ha gia `cost_ap` — estendere a trade-off piu ricchi (slot, energia, vulnerabilita). Vedi `docs/combat/trait-trade-offs.md`. |
| **UI a strati**                 | P1       | Info base sempre visibile, dettagli on-demand. Per TV play: HUD mostra essenziale, espansione su selezione.                                                                                          |
| **Accettare emergent gameplay** | P2       | Non over-ingegnerizzare combo — lasciare che sinergie emergano da regole semplici. Testare, poi bilanciare solo outlier estremi.                                                                     |

---

## Sintesi trasversale — Top 10 pattern per Evo-Tactics

| #   | Pattern                                                        | Fonte            | Pilastro | Priorita |
| --- | -------------------------------------------------------------- | ---------------- | -------- | -------- |
| 1   | Mostrare tutti i numeri decisionali (hit%, danno, durata, MoS) | Halfway          | P1       | Alta     |
| 2   | Threat meter reattivo alle scelte giocatore                    | AI War           | P5       | Alta     |
| 3   | Tipi comportamentali IA, non scaling statistico                | AI War           | P5       | Alta     |
| 4   | Trade-off trait espliciti e visibili                           | Cogmind          | P6       | Alta     |
| 5   | Varieta nemici attraverso behaviour, non stats                 | Halfway + AI War | P1, P5   | Alta     |
| 6   | Difficolta come menu di modificatori                           | Hades            | P6       | Media    |
| 7   | Replay round cinematico per TV play                            | Frozen Synapse   | P1       | Media    |
| 8   | Preview/simulatore "what-if" pre-azione                        | Frozen Synapse   | P1       | Media    |
| 9   | Due loop progressione (per-sessione + permanente)              | Hades            | P2       | Media    |
| 10  | Punire turtling con escalation temporizzata                    | AI War           | P5       | Media    |

---

## Prossimi passi suggeriti

1. **P5 — Sistema threat meter**: progettare meccanica ispirata ad AI Progress. Ogni azione aggressiva alza minaccia Sistema; Sistema risponde con wave/rinforzi proporzionali.
2. **P1 — UI decisionale**: definire quali numeri mostrare nella UI tattica (pre-resolver layer).
3. **P6 — Difficolta modulare**: sistema "Pact" con modificatori selezionabili per sessione.
4. **P2 — Validare emergent gameplay**: playtest trait combo senza over-constraining sinergie.
