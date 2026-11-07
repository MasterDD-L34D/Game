---
title: 'Strategy Games Mechanics Extraction — tactical + gameplay patterns Evo-Tactics'
date: 2026-04-27
doc_status: active
doc_owner: balance-illuminator
workstream: cross-cutting
last_verified: '2026-04-27'
source_of_truth: false
language: it
review_cycle_days: 90
tags: [research, strategy, mechanics, gameplay, tactical, balance, extraction, verification_needed]
related:
  - docs/research/2026-04-26-cross-game-extraction-MASTER.md
  - docs/research/2026-04-27-indie-meccaniche-perfette.md
  - docs/research/2026-04-26-tier-a-extraction-matrix.md
  - docs/research/2026-04-26-tier-s-extraction-matrix.md
---

# Strategy Games Mechanics Extraction — top-tier tactical patterns per Evo-Tactics

> **Scopo**: audit approfondito di 8 strategy games AAA/indie-pro, focus meccaniche di sistema puro (non feature cosmetiche). Per ogni gioco: meccanica core, perche funziona, estraibilita a Evo-Tactics (pillar + effort), anti-pattern.
>
> **Cross-ref**: complementa Tier S (13 donor) + Tier A (11 donor) + indie-meccaniche-perfette (5 giochi). NO duplicate: Banner Saga / Wildfrost / Astrea / Backpack Hero / Cobalt Core / Tactics Ogre / Wesnoth / XCOM Long War 2 (timer gia shipped PR #1695) / XCOM EU/EW (perks gia shipped PR #1694).
>
> **Tag `verification_needed`**: stime design e numeri non tratti da fonti primarie accademiche vanno verificati contro GDC Vault / dev-blog prima di citare come definitivi.

---

## Indice

1. [XCOM 2 — concealment phase + overwatch interrupt stack](#1-xcom-2--concealment-phase--overwatch-interrupt-stack)
2. [Battle Brothers — morale contagion + fatigue-initiative coupling](#2-battle-brothers--morale-contagion--fatigue-initiative-coupling)
3. [Phoenix Point — free aim body-part targeting vs pseudo-RNG](#3-phoenix-point--free-aim-body-part-targeting-vs-pseudo-rng)
4. [Jagged Alliance 3 — AP granulare + interrupt fire multi-perk](#4-jagged-alliance-3--ap-granulare--interrupt-fire-multi-perk)
5. [Mutant Year Zero — stealth pre-combat + mutation tree swap](#5-mutant-year-zero--stealth-pre-combat--mutation-tree-swap)
6. [Hard West 2 — bravado chain-kill AP refill](#6-hard-west-2--bravado-chain-kill-ap-refill)
7. [Othercide — timeline manipulation + remembrance roguelite](#7-othercide--timeline-manipulation--remembrance-roguelite)
8. [Triangle Strategy — conviction voting + branching outcomes](#8-triangle-strategy--conviction-voting--branching-outcomes)

---

## 1. XCOM 2 — concealment phase + overwatch interrupt stack

**Studio + anno**: Firaxis Games, 2016
**Genere**: turn-based tactical, sci-fi

### Meccanica core

La **concealment phase** apre ogni missione in modalita stealth real-time: il player posiziona le unita silenziosamente prima che il turno tattico parta. Ogni missione ha un countdown timer che scorre simultaneamente — creando pressione immediata senza ancora impegnare risorse. L'**overwatch** converte AP residui in interrupt: se un nemico si muove nel cono di fuoco, si attiva un reaction shot automatico. XCOM 2 usa **pseudo-RNG con pre-seed**: i tiri falliti consecutivi aumentano probabilita del prossimo (implementazione Bernstein stochastic). L'overwatch si risolve in stack ordinato (un soldato alla volta, FIFO), non simultaneo.

[design pattern reference: concealment-as-tactical-setup + pseudo-RNG mitigation; verify against Jake Solomon interview Gamedeveloper.com 2016]

### Perche funziona

La concealment phase trasforma il "momento prima della battaglia" in gameplay reale: decisioni di posizionamento e informazione (quale nemico aggredire per primo) avvengono a rischio zero ma con conseguenze complesse. Il pseudo-RNG risolve il "felt unfair" dell'RNG puro: il player non sente la sfortuna come ingiustizia sistemica.

### Estraibile a Evo-Tactics

**Pillar target**: P1 (tattica leggibile), P6 (fairness)

| Aspetto                          |     Effort | Cosa implementare                                                             |
| -------------------------------- | ---------: | ----------------------------------------------------------------------------- |
| Concealment pre-round setup mode |        ~5h | flag `session.phase = 'setup'` — unita muovibili senza AP, read-only enemies  |
| Pseudo-RNG seed                  |        ~3h | Bernstein rolling seed in `resolveAttack` — track consecutive miss, bump prob |
| Overwatch FIFO stack             | 🟢 shipped | `reaction_trigger` system gia live (PR #1498, intercept + overwatch_shot)     |

**Total effort**: ~8h (pseudo-RNG + setup mode). Overwatch gia shipped.
**Pillar impact**: P1 +1 leggibilita setup, P6 +fairness felt.

### Anti-pattern (cosa NON copiare)

- **Timer sempre visibile come countdown**: stressante oltre soglia (community divide enorme su XCOM 2). Evo-Tactics usa timer come escalation pressione, non come metronomo UI.
- **Concealment rotto da un tile sbagliato**: in XCOM 2 basta incocciare un patrol per perdere il vantaggio. In co-op multiplayer questo crea blame inter-player. Meccanismo va moderato o reso forgiving.
- **Pseudo-RNG reso trasparente**: rivelare la formula al player riduce immersion. Mantieni opaco, solo tooltips "fortuna sembra girare".

---

## 2. Battle Brothers — morale contagion + fatigue-initiative coupling

**Studio + anno**: Overhype Studios, 2017
**Genere**: mercenary tactics, sandbox RPG

### Meccanica core

**Cinque stati morale discreti** (Steady → Wavering → Fleeing → Routing → Broken) invece di un valore numerico continuo. Ogni evento (alleato ko, ferita pesante, nemico ucciso) triggera un **morale check** basato su `bravery` dell'unita. Il fallimento abbassa lo stato di 1 livello. Il contagio e deliberato: un'unita in fuga abbassa la probabilita di superare i check per gli alleati adiacenti — **morale failure cascade**. Fatigue si accumula per azione eseguita + armatura portata, e l'**initiative** scende proporzionalmente al fatigue: unita pesantemente armate agiscono per ultime ogni round, creando un tradeoff armatura/velocita intrinseco.

[design pattern reference: discrete-morale-states + fatigue-as-initiative-sink; source: battlebrothersgame.com Dev Blog #20 + Dev Blog #4]

### Perche funziona

Stati discreti vs. valore numerico continuo = player legge il morale a colpo d'occhio (icona stato) senza microgestire un numero. Il cascade e narrativo: la disfatta si sente come crollo psicologico reale, non come "perdita punti". Fatigue-initiative coupling crea **composizione armata organica** senza dover disegnare counter-chart: heavy bruisers agiscono tardi, scout-light agiscono presto, si bilancia da soli.

### Estraibile a Evo-Tactics

**Pillar target**: P1 (tattica), P4 (MBTI/temperamenti), P6 (fairness)

| Aspetto                                       | Effort | Cosa implementare                                                                      |
| --------------------------------------------- | -----: | -------------------------------------------------------------------------------------- |
| 5 stati morale discreti                       |    ~4h | estendi `statusEffectsMachine.js` — aggiunge 5 stati `morale_*` + trigger check        |
| Morale check su eventi (ally_ko, heavy_wound) |    ~3h | `sessionRoundBridge.js` post-attack hook → `checkMorale(actor, event)`                 |
| Cascade contagion                             |    ~2h | su `morale_fleeing`: propagate check agli adiacenti (1 tile radius)                    |
| Fatigue-initiative coupling                   |    ~4h | `roundOrchestrator.js` priority = `initiative - fatigue_penalty` (gia ha `initiative`) |
| MBTI modifier su bravery                      |    ~2h | S-type +bravery base, N-type -bravery base (narrativo: S piu stabili sotto stress)     |

**Total effort**: ~15h. **Pillar impact**: P1 +depth senza regole extra, P4 MBTI via differenza bravery, P6 perceived fairness (cascade leggibile).

### Anti-pattern (cosa NON copiare)

- **Morale check ogni singolo evento granulare**: Battle Brothers ha check su ogni azione, rallenta il ritmo visivamente. In Evo-Tactics: check solo a fine round su evento KO + ferita pesante (>30% HP persi in 1 turno).
- **Cascade infinita senza floor**: se ogni unita casca, il sistema e solo punizione. Servirebbe `morale_rally` reaction (gia esiste `rage` status — potrebbe diventare morale boost su KO).

---

## 3. Phoenix Point — free aim body-part targeting vs pseudo-RNG

**Studio + anno**: Snapshot Games (Julian Gollop), 2019
**Genere**: turn-based tactical, sci-fi horror

### Meccanica core

**Free aim**: invece di un singolo hit-chance % , il player vede un cono di dispersione con raggio variabile. Le unita sparano N proiettili fisici, ciascuno tracciato realmente nel 3D space. Parti del corpo sono **hitbox indipendenti**: braccia (weapon disarm), gambe (slow), testa (stun/disorient), torso (HP drain). Colpire un'armatura su arto specifico rende permanentemente inefficace quella parte per la durata del combattimento. La cover non abbassa l'hit-chance ma **riduce la hitbox esposta** — toglie fisicamente le aree bersagliabili.

[design pattern reference: physics-based-aiming + bodypart-as-resource; source: Phoenix Point wiki + Snapshot Games forums; verify against Julian Gollop GDC/dev interviews 2019]

### Perche funziona

Il player sente **agency nel mirare** anche con un personaggio scarso: un arciere mediocre puo disarmare un guerriero facendo center-mass shots sulla mano. La variabilita e spaziale (dove sparo) non numerica (quante chance ho) — il player capisce intuitivamente "coperto + small hitbox = difficile". Body-part degradation crea decisioni tattiche profonde: disarmo ora o elimino?

### Estraibile a Evo-Tactics

**Pillar target**: P1 (tattica), P6 (fairness — meno RNG felt unfair)

| Aspetto                          | Effort | Cosa implementare                                                                                                     |
| -------------------------------- | -----: | --------------------------------------------------------------------------------------------------------------------- |
| Pseudo-RNG (come XCOM 2)         |    ~3h | vedi sezione 1 — aggiunge felt-fairness senza riscrivere combat                                                       |
| Body-part targeting semplificato |    ~8h | 2 zone: `torso` (danno normale) + `limb` (-2 AP unita per 2 round, no disarmo permanente). Tile-click select on enemy |
| Limb-hit trigger status          |    ~3h | `slowed` (gia in status engine) su limb-hit. Mappa a `move_cost+1`                                                    |

**Total effort**: ~14h per versione lite. Full free-aim 3D non applicabile (motore 2D grid).
**Pillar impact**: P1 decisioni depth +, P6 felt-RNG mitigato.

### Anti-pattern (cosa NON copiare)

- **Full 3D ballistics simulation**: in 2D grid il free-aim perde la sua fisicita. Il cono diventa solo "spray angle" — non aggiunge profondita, aggiunge latenza UI.
- **Permanent body-part break per singola hit**: in Phoenix Point le gambe rotte inchiodano unita per tutta la battaglia. In Evo-Tactics co-op vs Sistema, il player deve poter sentire progresso — status `slowed` (2-3 turni max) e piu sano.
- **Cover-removes-hitbox complexity**: spiegare alle persone che "quella parte non e bersagliabile" e una complicazione UI non immediata. Se copiamo il concetto, serve overlay chiaro (gia abbiamo intent-preview pattern da Slay the Spire).

---

## 4. Jagged Alliance 3 — AP granulare + interrupt fire multi-perk

**Studio + anno**: Haemimont Games, 2023
**Genere**: turn-based tactical, mercenary

### Meccanica core

**AP base 3** + bonus agility (`+1 per 10 pts`) + bonus level (`+1 per 3 livelli`). Ogni azione ha costo AP preciso (movimento tile = 1 AP, burst fire = 2 AP, cambio stance = 0.5 AP via perk). Il sistema **interrupt** non e monolitico: e una famiglia di reazioni — Overwatch (cono targeting), Pin Down (soppressione accuracy penalty), Retaliation/Reactive Fire (on-hit response), tutti modulati da perk `Killzone` che raddoppia il numero di interrupt attacks possibili. Ogni perk specializza il mercenario verso una modalita di interrupt diversa, creando profili tattici reali.

[design pattern reference: granular-AP + multi-perk interrupt family; source: Steam Community discussions JA3 2023 + gamefaqs.com guide]

### Perche funziona

AP granulare permette **microdecisioni** che il player sente come competenza: spendere 0.5 AP per cambiare stance prima di sparare e una scelta reale. La famiglia di perk interrupt crea **specializzazione ruolo organica** (non obbligata da classe): un merc puo diventare "reaction specialist" investendo in Killzone + Reactive Fire, senza che sia l'unico path.

### Estraibile a Evo-Tactics

**Pillar target**: P1 (tattica profonda), P3 (specie x job)

| Aspetto                          | Effort | Cosa implementare                                                                                    |
| -------------------------------- | -----: | ---------------------------------------------------------------------------------------------------- |
| AP con decimali (0.5 step)       |    ~4h | `ap_max` gia float-capable. Aggiunge 0.5-cost actions: `quick_aim`, `crouch_switch`                  |
| Pin Down (soppressione)          |    ~3h | nuovo status `suppressed`: accuracy -20% per 1 round su target                                       |
| Killzone perk (double interrupt) |    ~3h | perk `killzone`: `reaction_cap = 2` invece di 1 (gia esiste reaction cap 1 in PR #1498)              |
| Interrupt profile per job        |    ~2h | Stalker job = `+Reactive Fire` perk unlock; Symbiont = `+Pin Down`; Beastmaster = `+Overwatch range` |

**Total effort**: ~12h. **Pillar impact**: P3 job identity via interrupt specialization, P1 micro-AP decisions.

### Anti-pattern (cosa NON copiare)

- **Old JA2 interrupt-within-interrupt** (citato esplicitamente nel design JA3 come anti-pattern da evitare): interrupts che generano altri interrupts creano loop di difficile terminazione + UX confusissima. Evo-Tactics cap: 1 interrupt per actor per round (gia implementato).
- **AP decimali comunicati come numeri**: 0.5 AP va reso come icona (mezzo cerchio) non come "0.5" — il player deve leggere lo stato visivamente.

---

## 5. Mutant Year Zero — stealth pre-combat + mutation tree swap

**Studio + anno**: The Bearded Ladies (ex-Hitman devs), 2018
**Genere**: turn-based tactical + stealth hybrid, post-apoc

### Meccanica core

**Fase real-time stealth**: prima del combattimento, il player muove le unita in real-time su una mappa visibile, studiate le patrol routes dei nemici. **Silent weapons** (arco, silenziatore) permettono di eliminare bersagli isolati senza alertare il gruppo — se il danno e sufficiente a KO in un solo attacco. Ogni unita ha una **mutation tree** con passive + active equipabili (1 passive + 2 active simultaneamente), swappabili tra missioni. I mutation slots non sono unlock permanenti: puoi "ri-equipaggiare" mutazioni diverse per rispondere al tipo di missione.

[design pattern reference: hybrid-stealth-to-tactical + mutation-loadout-flex; source: mutantyearzero.com dev feature breakdown + Unreal Engine spotlight 2018]

### Perche funziona

La stealth pre-phase trasforma **preparation come gameplay**: il player vuole ridurre il numero di nemici prima che parta il turno tattico — e un puzzle di separazione patrol routes. Mutation swap crea **loadout customization per missione** senza meta-progression grind: non e "ho sbloccato X", e "quale combo di X e migliore per questo incontro?".

### Estraibile a Evo-Tactics

**Pillar target**: P1 (tattica), P2 (evoluzione — loadout flex), P5 (co-op)

| Aspetto                          | Effort | Cosa implementare                                                                                                |
| -------------------------------- | -----: | ---------------------------------------------------------------------------------------------------------------- |
| Stealth pre-phase (semplificato) |    ~6h | `session.phase = 'stealth'` — unita muovibili silenziosamente, silent attack 1-shot se sotto threshold HP nemico |
| Silent weapon tag                |    ~2h | `ability_tag: silent` — non scatena patrol alert, trigger stealth kill                                           |
| Mutation swap tra missioni       |    ~3h | gia parzialmente: `formsPanel.js` + ability loadout. Aggiunge "swap prima di /start" modal                       |
| Co-op stealth: split party       |    ~4h | ogni player muove il proprio personaggio in stealth-phase indipendentemente (WS sync gia esiste via lobby)       |

**Total effort**: ~15h. **Pillar impact**: P1 +profondita pre-combat, P2 loadout flex, P5 co-op async stealth.

### Anti-pattern (cosa NON copiare)

- **Stealth failure = full-combat immediate**: in MYZ se il player fallisce la stealth, la missione diventa exponenzialmente piu difficile. In co-op questo e frustrante. Evo-Tactics: stealth failure = alert singolo nemico, non tutto il map.
- **Real-time movimento completo**: richiede pathfinding real-time + collision detection per patrol. In Evo-Tactics: semplifica a "numero di azioni stealth disponibili" o "distanza massima stealth move" — mantieni il turno come unita di controllo.

---

## 6. Hard West 2 — bravado chain-kill AP refill

**Studio + anno**: Ice Code Games, 2022
**Genere**: turn-based tactical, western occult

### Meccanica core

**Bravado**: ogni kill triggera un AP refill completo per il personaggio che ha eseguito il kill. Il refill e immediato e permette di attaccare un nuovo bersaglio nello stesso turno — creando catene di azioni su un singolo turn se il player coordina i kill nell'ordine corretto. Il sistema ha **transitivity tattica**: un personaggio da solo non puo fare chain infinita (nemici finiscono), ma 3 personaggi in coordinata possono passarsi i "setup" (abbasso HP di A, B esegue kill e ottiene AP, B abbassa HP di C, C esegue kill su D...). Il turn planning diventa ottimizzazione di ordine operativo.

[design pattern reference: kill-AP-refill + kill-chain-momentum; source: Hard West 2 Neoseeker Bravado guide + TheSixthAxis review 2022]

### Perche funziona

Bravado **ricompensa gioco aggressivo** invece di punirlo. In XCOM, stare a distanza e overwatch e quasi sempre ottimale (conservativo). In HW2, andare all-in per fare chain di kill e attivamente premiato. Il player sente una "combo" — ogni kill e setup per il prossimo — come in un fighting game. Il rischio (esporre un personaggio per fare kill) e bilanciato dal reward (AP gratis).

### Estraibile a Evo-Tactics

**Pillar target**: P1 (tattica — decisioni rischio/reward), P5 (co-op — combo inter-player)

| Aspetto                                | Effort | Cosa implementare                                                                      |
| -------------------------------------- | -----: | -------------------------------------------------------------------------------------- |
| Kill AP refill (single-player Bravado) |    ~3h | post-kill event → `actor.ap += 1` (capped 1x per actor per round)                      |
| Co-op kill-chain: cross-player setup   |    ~2h | `on_kill` broadcast via WS → trigger "bravado_opportunity" hint a prossimo player      |
| Bravado perk (unlock da progressione)  |    ~1h | perk `berserker_flow` unlock a level 3: attiva kill-AP-refill                          |
| SquadCombo integration                 |    ~2h | kill SquadCombo partner → refill 0.5 AP (gia abbiamo `squadCombo` PR #1462 focus_fire) |

**Total effort**: ~8h. **Pillar impact**: P1 risk/reward decisions, P5 co-op coordination incentivo.

### Anti-pattern (cosa NON copiare)

- **Bravado per ogni kill senza cap**: in HW2 mid-game sei obbligato a fare chain o perdi. Evo-Tactics: capped 1x per actor per round, non cumulabile — evita one-shot speedrun pathological.
- **Full AP refill**: in Evo-Tactics ap_max = 2, refillare tutto da 1 kill e troppo potente. Refilla 1 AP (mezzo turno) — abbastanza per sentire il momentum, non abbastanza per chain completa.

---

## 7. Othercide — timeline manipulation + remembrance roguelite

**Studio + anno**: Lightbulb Crew, 2020
**Genere**: turn-based tactical roguelite, horror

### Meccanica core

**Dynamic timeline system**: ogni unita (Daughters + Suffering) ha una position su una timeline visibile. Le ability possono **spostare la posizione** di un'unita avanti o indietro nella timeline — posticipare il turno di un nemico di 2 slot, o anticipare quello di un'alleata. L'output tatticamente importante e il **chaining**: se due Daughters agiscono consecutivamente, la seconda puo bonus da "reaction chain". La **Sacrifice mechanic**: per curare una Daughter ferita, devi sacrificare un'altra Daughter — quella curata eredita trait alterati dalla sacrificata (enabling build customization roguelite). **Remembrance**: obiettivi specifici in-run (X damage totale, Y kill di tipo Z) sbloccano buff permanenti per i run successivi.

[design pattern reference: timeline-manipulation + sacrifice-inheritance + remembrance-roguelite; source: Wikipedia Othercide + RPGFan review + Gameskinny beginner guide 2020]

### Perche funziona

La timeline visibile trasforma "aspetta il mio turno" in **gestione attiva di risorse temporali**. Spostare un nemico avanti nella timeline e come guadagnare un turno extra. Il sacrifice-inheritance crea **loss con significato**: la Daughter sacrificata "vive" nella sopravvissuta tramite trait — permadeath emotivo ma non punizione pura. Remembrance crea un meta-loop di crescita trasparente: il player sa esattamente cosa fare per sbloccare il prossimo buff.

### Estraibile a Evo-Tactics

**Pillar target**: P1 (tattica — initiative manipulation), P2 (evoluzione — trait inheritance), P6 (fairness — meta-loop trasparente)

| Aspetto                          | Effort | Cosa implementare                                                                                                    |
| -------------------------------- | -----: | -------------------------------------------------------------------------------------------------------------------- |
| Timeline visible UI              |    ~6h | HUD sidebar con ordine turni visuale (actor sprites in sequence) — `roundOrchestrator.js` ha gia priority queue      |
| Initiative delay/advance ability |    ~4h | nuovo `effect_type: adjust_initiative` delta = +/-N nella priority queue gia esistente                               |
| Sacrifice + trait inherit (lite) |    ~5h | on voluntary unit-drop: killed unit dona 1 perk a surviving unit (usa `progressionStore.pick`)                       |
| Remembrance meta-unlock          |    ~6h | post-session: track achievement goals → unlock `campaign_buffs.yaml` entry — simile a `missionTimer` escalation hook |

**Total effort**: ~21h full. Solo timeline UI + initiative ability = ~10h quick-win.
**Pillar impact**: P1 +high (timeline manipulation = nuova dimensione tattica), P2 +medio (trait inheritance adds evolution layer).

### Anti-pattern (cosa NON copiare)

- **Full roguelite reset su wipe**: Othercide e un roguelite puro, campaign reset = feature. Evo-Tactics e co-op campaign — perdita totale frustrerebbe un gruppo di amici reali. Sacrifice deve essere **opt-in** e limitato a 1 unita per sessione.
- **Timeline manipulation come unica strategia**: in Othercide, se non manipoli la timeline sei automaticamente in svantaggio. In Evo-Tactics, deve essere un tool avanzato (perk unlock), non il modo principale di giocare.

---

## 8. Triangle Strategy — conviction voting + branching outcomes

**Studio + anno**: Square Enix + Artdink, 2022
**Genere**: tactical RPG, high-fantasy political

### Meccanica core

**Scales of Conviction**: i punti conviction si accumulano in 3 categorie (Liberty / Morality / Utility) attraverso le scelte dialogue e esplorazione. Ai **branching decision points** chiave, il player deve persuadere la maggioranza dei companion a votare per una delle opzioni. La persuasione usa informazioni raccolte durante la mappa esplorabile precedente — NPC rivelano argomenti che possono sbloccare dialogue choices nella fase di voto. Conviction accumulata determina quali finali sono accessibili (4 route totali).

[design pattern reference: conviction-axes-accumulation + majority-vote-branching; source: Triangle Strategy Wiki Fandom + Game8 guide + Kotaku analysis 2022]

### Perche funziona

Il sistema di voto **distribuisce il agency narrativo** tra i companion: il player non decide unilateralmente, deve convincere alleati. Questo crea **emergent roleplay**: il player capisce la "filosofia" di ogni companion (chi vota Morality, chi Utility) e progetta gli argomenti. Le conviction axes tracciano l'identita del protagonista — non come scelta binaria ma come spettro continuo, simile agli assi MBTI.

### Estraibile a Evo-Tactics

**Pillar target**: P4 (MBTI/temperamenti), P5 (co-op — voto condiviso)

| Aspetto                           | Effort | Cosa implementare                                                                                                              |
| --------------------------------- | -----: | ------------------------------------------------------------------------------------------------------------------------------ |
| Conviction axes (3 valori)        |    ~4h | `campaignConviction.js` — Liberty / Cohesion / Pragmatics (rinominati per fiction Evo-Tactics). Aggiornati da scelte narrative |
| Co-op majority vote per branching |    ~5h | Decision point → WS broadcast a tutti i player → voto a schermo separato → maggioranza decide path                             |
| Companion vote profiles           |    ~3h | ogni species/job ha `conviction_bias.yaml` — indica quale asse pesa di piu nel voto                                            |
| Axis-to-MBTI mapping              |    ~2h | Liberty = E/I axis influence, Cohesion = F/T axis, Pragmatics = J/P axis                                                       |

**Total effort**: ~14h. **Pillar impact**: P4 +++ (conviction = MBTI proxy narrativo misurabile), P5 + (voto co-op crea momento sociale).

### Anti-pattern (cosa NON copiare)

- **4 ending routes con campaign-length commitment**: in Triangle Strategy la branching avviene su un gioco 40h. In Evo-Tactics ogni sessione e 45-90min — la branching deve risolversi nello scenario stesso, non in un ending separato.
- **Conviction come gate rigido**: "non hai abbastanza Morality per questo ending" = player sente lock-out punitivo. Evo-Tactics: conviction come flavor bonus al risultato (vittoria con piu Liberty = reward diverso, non meno reward).

---

## §A — Cross-ref shipped Evo-Tactics

Meccaniche in questo doc che hanno predecessori gia live nel repo:

| Meccanica                             | Donor game        | Shipped           | Riferimento                           |
| ------------------------------------- | ----------------- | ----------------- | ------------------------------------- |
| Mission timer                         | XCOM Long War 2   | ✅ PR #1695       | `missionTimer.js`                     |
| Overwatch reaction shot               | XCOM 2 / JA3      | ✅ PR #1498       | `session.js` reaction_trigger         |
| Reaction cap 1/actor                  | JA3 Killzone perk | ✅ PR #1498       | `reaction_cap = 1`                    |
| XCOM EU/EW perk pairs                 | XCOM EU           | ✅ PR #1694       | `progressionEngine.js` 84 perks       |
| SquadCombo focus fire                 | co-op pattern     | ✅ PR #1462       | `squadCombo` +1 bonus dmg             |
| Initiative-based round order          | tutti             | ✅ ADR-2026-04-15 | `roundOrchestrator.js` priority queue |
| 5 status effects (rage/panic/stunned) | BB / XCOM         | ✅ PR #1498+      | `statusEffectsMachine.js`             |
| Form evolution gating                 | Spore / FF        | ✅ PR #1689-1691  | `formEvolution.js`                    |

---

## §B — Top 5 quick-win (effort ≤ 5h, prerequisiti live)

| #   | Pattern                                    | Gioco           | Effort | Pillar         | Prerequisito live                       |
| --- | ------------------------------------------ | --------------- | -----: | -------------- | --------------------------------------- |
| 1   | **Pseudo-RNG rolling seed**                | XCOM 2          |    ~3h | P6 fairness    | `resolveAttack` in session.js           |
| 2   | **Kill AP refill Bravado (capped 1 AP)**   | Hard West 2     |    ~3h | P1+P5          | `on_kill` hook gia in roundOrchestrator |
| 3   | **Pin Down (suppressed status)**           | JA3             |    ~3h | P1 tattica     | statusEffectsMachine gia live           |
| 4   | **Morale check su ally_ko (single event)** | Battle Brothers |    ~4h | P1+P4          | `on_unit_death` broadcast gia emesso    |
| 5   | **Timeline visible UI sidebar**            | Othercide       |    ~5h | P1 leggibilita | priority queue gia in roundOrchestrator |

**Bundle quick-win totale**: ~18h per tutti e 5. Zero nuove deps. Zero schema ripple.

---

## §C — 3-4 bundle proposti (~20-30h cad)

### Bundle 1 — Combat Depth (~22h)

Pseudo-RNG (3h) + Morale 5-stati (9h morale+cascade+fatigue) + Kill AP refill Bravado (3h) + Pin Down (3h) + Killzone perk (2h) + MBTI bravery modifier (2h).
**Output**: ogni round ha piu variabili strategiche senza aggiungere regole esplicite. Morale + Bravado creano ritmo emotivo del combat.

### Bundle 2 — Persistent Consequences (~20h)

Morale cascade (battle-scope, non permanente, 9h overlap con Bundle 1) + Body-part targeting lite (11h: limb-hit + slowed) + Sacrifice trait-inherit lite (5h).
**Output**: le battaglie lasciano cicatrici funzionali (slowed limb, morale abbassato) — senza full permadeath.

### Bundle 3 — Preparation & Stealth (~21h)

Stealth pre-phase semplificata (6h) + Silent weapon tag (2h) + Concealment setup mode (5h) + Co-op stealth split (4h) + Mutation swap pre-mission (3h).
**Output**: aggiunge una fase tattica PRIMA del combattimento — raddoppia il gameplay loop senza cambiare il core combat.

### Bundle 4 — Social + Narrative Layer (~20h)

Conviction axes 3-valori (4h) + Co-op majority vote (5h) + Companion vote profiles (3h) + Axis-to-MBTI (2h) + Remembrance meta-unlock (6h).
**Output**: crea uno strato narrativo misurabile sopra il combat — pilastri P4 e P5 chiudono a 🟢.

---

## §D — 5 anti-pattern trasversali

1. **RNG punizione vs. RNG sorpresa**: pseudo-RNG (XCOM 2, Phoenix Point) va usato perche il player sente fairness. Basta con RNG puro su azioni critiche — serve sempre un mitigation path (rolling seed o free-aim fallback).
2. **Interrupt recursion infinita** (JA2 old system → JA3 lo risolve): interrupt che generano interrupt = loop non terminabile. Cap 1 interrupt per actor per round gia implementato — non rimuovere mai senza analisi.
3. **Morale senza floor/rally**: morale cascade senza un "rally event" e pura punizione. Battle Brothers stesso lo ammette nei dev blog. Ogni morale system deve avere un event di recupero (kill nemico, rally ability, fine round).
4. **Stealth = tutto o niente**: se la stealth phase si rompe, torna il full combat a odds sfavorevoli. In co-op, questo crea blame e frustrazione. Design: stealth fail = reveal 1 nemico max, non alert globale.
5. **Timeline UI senza feedback su skip**: se un'ability manipola l'ordine dei turni, il player deve vedere il delta visivamente PRIMA di confermare. Altrimenti "ho spostato X" e astratto e non leggibile.

---

## §E — Decisioni master-dd aperte

- **D1 Morale scope**: il morale si resetta a fine ogni missione (reset completo) o persiste tra missioni come "troop fatigue" (campaign layer)? Battle Brothers usa persistenza — alta stakes ma potenzialmente punitive in co-op.
- **D2 Bravado AP cap**: refill 1 AP (proposta) vs 0.5 AP vs no-cap (Hard West 2 originale). Il cap impatta la lettura delle combo e il rischio che 1 player "rubi" tutte le azioni in un turno co-op.
- **D3 Stealth opt-in vs default**: la stealth pre-phase e obbligatoria (ogni missione parte in concealment) o opt-in (solo missioni taggate `stealth: true` in encounter YAML)? XCOM 2 usa default, MYZ usa default. Evo-Tactics campaign deve scegliere.
- **D4 Conviction integration con MBTI**: le 3 conviction axes (Liberty/Cohesion/Pragmatics) mappano agli assi MBTI (E/I, F/T, J/P) oppure restano sistemi separati? Unificazione richiede ADR + test VC axes esistente.
- **D5 Body-part targeting UX**: limb-hit richiede un secondo click (tile click nemico → select zone body) oppure e auto-determinato dalla direzione dell'attacco? Il secondo click aggiunge latenza in co-op.

---

## §F — Tech debt / refactor opportunity

Questi pattern richiedono refactor moderato (>50 LOC) su componenti esistenti:

- **`roundOrchestrator.js`**: aggiunta timeline visible UI + initiative-adjust ability richiedono expose dell'ordine corrente come API. Attualmente priority queue e interna. Refactor: `getTimelineSnapshot()` public + WS broadcast. ~3h overhead.
- **`statusEffectsMachine.js`**: morale 5-stati + suppressed + limb-slowed portano gli stati totali a ~13. xstate machine non scala bene oltre 15 stati senza compound state grouping. Refactor: nested `morale.*` states come compound state. ~4h.
- **`sessionRoundBridge.js`**: pseudo-RNG rolling seed va iniettato in `resolveAttack` — dipende da `sessionHelpers.js` che attualmente non ha stato persistente tra resolve calls. Refactor: seed state in `session.rng_state` object. ~2h.
- **`active_effects.yaml`**: body-part targeting e morale check potrebbero diventare trait effect types. Richiede estendere lo schema `effect_type` enum con `apply_morale_penalty` + `target_limb`. Guardrail: `packages/contracts/schemas/` va aggiornato — schema ripple su backend + test. Budget 2h solo se si decide di usare il trait system come vettore.

---

## Fonti

- [Battle Brothers Dev Blog #20 — Bravery and Morale](https://battlebrothersgame.com/dev-blog-20-bravery-morale/) — sistema morale discreto, trigger eventi, stati 5
- [Battle Brothers Dev Blog #4 — Tactical Combat Mechanics](http://battlebrothersgame.com/tactical-combat-mechanics/) — fatigue-initiative coupling
- [Hard West 2 Bravado Guide — Neoseeker](https://www.neoseeker.com/hard-west-2/guides/Bravado) — meccanica kill AP refill
- [Hard West 2 Review — TheSixthAxis](https://www.thesixthaxis.com/2022/07/29/hard-west-2s-occult-powers-bravado-supercharge-the-xcom-like/) — analisi momentum system
- [XCOM 2 Overwatch — XCOM Wiki Fandom](<https://xcom.fandom.com/wiki/Overwatch_(XCOM_2)>) — interrupt stack ordinato FIFO
- [Jake Solomon — Careful Use of Randomness](https://www.gamedeveloper.com/design/jake-solomon-explains-the-careful-use-of-randomness-in-i-xcom-2-i-) — pseudo-RNG design intent
- [Phoenix Point Free Aim — wiki.phoenixpoint.com](http://wiki.phoenixpoint.com/Combat) — body-part hitbox system
- [Mutant Year Zero Stealth — official site](https://www.mutantyearzero.com/news/master-the-stealthy-approach/) — silent takedown design
- [Mutant Year Zero — Unreal Engine spotlight](https://www.unrealengine.com/spotlights/mutant-year-zero-road-to-eden-uses-stealth-to-offer-a-fresh-take-on-tactical-adventure) — hybrid stealth+tactical design philosophy
- [Jagged Alliance 3 Fire Modes — Steam Community](https://steamcommunity.com/app/1084160/discussions/0/3809533247352737013/) — interrupt family (Overwatch/Pin Down/Reactive Fire/Killzone)
- [Triangle Strategy Voting — Fandom Wiki](https://triangle-strategy.fandom.com/wiki/Voting) — majority vote mechanics
- [Triangle Strategy Conviction — Fandom Wiki](https://triangle-strategy.fandom.com/wiki/Conviction) — 3 axes accumulation
- [Othercide Overview — Wikipedia](https://en.wikipedia.org/wiki/Othercide) — timeline manipulation + remembrance system
- [Othercide Beginner's Guide — Gameskinny](https://www.gameskinny.com/tips/othercide-beginners-guide-tips-for-killing-in-style/) — chain mechanics + sacrifice
- [Stoneshard Injuries — Official Wiki](https://stoneshard.com/wiki/Injuries_&_Pain) — body-part injury persistence _(reference solo, non estratto come pattern)_
- [GDC Vault — XCOM 2 Procedural Level Design](https://gdcvault.com/play/1025387/Plot-and-Parcel-Procedural-Level) — Firaxis design methodology context
