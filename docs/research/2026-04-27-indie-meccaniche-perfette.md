---
title: 'Indie Meccaniche Perfette — 5 sistemi estraibili per Evo-Tactics'
date: 2026-04-27
doc_status: active
doc_owner: narrative-design-illuminator
workstream: cross-cutting
last_verified: '2026-04-27'
source_of_truth: false
language: it
review_cycle_days: 90
tags:
  [
    research,
    indie,
    mechanics,
    extraction,
    banner-saga,
    wildfrost,
    astrea,
    backpack-hero,
    cobalt-core,
  ]
related:
  - docs/research/2026-04-26-cross-game-extraction-MASTER.md
  - docs/research/2026-04-26-tier-s-extraction-matrix.md
  - docs/research/2026-04-26-tier-a-extraction-matrix.md
  - docs/research/2026-04-26-tier-b-extraction-matrix.md
  - docs/research/2026-04-26-tier-e-extraction-matrix.md
  - docs/research/2026-04-26-spore-deep-extraction.md
  - docs/adr/ADR-2026-04-26-spore-part-pack-slots.md
---

# Indie Meccaniche Perfette — 5 sistemi estraibili per Evo-Tactics

> **Scopo**: analisi profonda di 5 giochi indie con meccaniche "perfette" — sistemi che fanno esattamente una cosa, la fanno bene, e sono isolabili. Per ogni gioco: meccanica core, perche funziona, trasferibilita a Evo-Tactics (pillar + effort), anti-pattern (cosa NON copiare).
>
> **Metodo**: INFJ audit mode. Player-journey-first. "Cosa sente il player in questa meccanica?" prima di "come e implementata?".
>
> **Cross-ref**: complementa `docs/research/2026-04-26-tier-s-extraction-matrix.md` (13 Tier S donor) con focus indie recent releases 2020-2024.

---

## Indice

1. [The Banner Saga — caravan attrition + permadeath choice](#1-the-banner-saga--caravan-attrition--permadeath-choice)
2. [Wildfrost — charge timer combat + tribe synergy](#2-wildfrost--charge-timer-combat--tribe-synergy)
3. [Astrea: Six-Sided Oracles — purificazione dadi come strategia](#3-astrea-six-sided-oracles--purificazione-dadi-come-strategia)
4. [Backpack Hero — puzzle inventario integrato al combattimento](#4-backpack-hero--puzzle-inventario-integrato-al-combattimento)
5. [Cobalt Core — cards-as-positioning ship combat](#5-cobalt-core--cards-as-positioning-ship-combat)
6. [Sintesi + ranking estrazione](#6-sintesi--ranking-estrazione)

---

## 1. The Banner Saga — caravan attrition + permadeath choice

**Studio**: Stoic Studio (2014). **Pilastro match**: P1 (tattica), P6 (fairness/consequences).

### Meccanica core

Caravan supply system: tra una battaglia e l'altra, la carovana consuma `cibo` proporzionale al numero di sopravvissuti. Decisioni di marcia (velocita vs. sicurezza) alterano ritmo di consumo. Permadeath autentico: personaggi morti in battaglia restano morti. Non ci sono resurrezioni narrative per gli "importanti" — tutti hanno stesso peso esistenziale.

Il sistema produce una pressione **diegetica**: non "hai perso punti vita", ma "hai 3 giorni di cibo e 47 bocche da sfamare". Il player sente la scarsita come realta narrativa, non come numero in HUD.

### Perche funziona

La meccanica forza **prioritizzazione resource vs. relationship**. Sacrificare un personaggio amato per far sopravvivere la carovana e una decisione che nessun sistema di punti potrebbe evocare. Il permadeath non e punizione — e racconto. La battaglia diventa significativa perche le conseguenze sono permanenti, non resettabili.

Secondo [Stoic GDC 2014], il sistema nasce dall'osservazione che nei JRPG "la morte non insegna nulla perche si carica il save". Il permadeath selettivo (solo in battle, non in cutscene) mantiene il player engaged senza essere sadico.

[design pattern reference: attrition-as-narrative-resource, verifiy against Stoic postmortem]

### Estraibile a Evo-Tactics

**Pilastro P6 (Fairness + Consequences)**. Match con mission timer Long War 2 gia implementato (PR #1695, `missionTimer.js`).

| Aspetto                         | Effort | Cosa implementare                                    |
| ------------------------------- | -----: | ---------------------------------------------------- |
| Caravan supply between missions |    ~6h | `campaignResourceTracker.js` — supp/cibo tra scenari |
| Permadeath opt-in mode          |    ~4h | flag `permadeath: true` in party.yaml modulation     |
| Supply choice UI                |    ~3h | modal pre-scenario "marcia veloce vs. sicura"        |

**Total effort**: ~13h. **Pillar impact**: P6 fairness (scelte reali con peso reale).

**Prerequisiti soddisfatti**: campaign advance endpoint gia live (`/api/campaign/advance`), modulation system live (PR #1530), mission timer live (missionTimer.js).

### Anti-pattern (cosa NON copiare)

- **Dialogue branches 60+ per scene**: Banner Saga ha migliaia di dialogue state variables. Evo-Tactics ha budget writer zero — usa ink knots con 2-3 branch max, non alberi di scelta narrativa profondi.
- **Permadeath obbligatorio**: rende inaccessibile il gioco casual. Evo-Tactics deve essere permadeath opt-in (modulation preset "hardcore").
- **Caravan come gameplay principale**: in Banner Saga la marcia e 40% del tempo. Evo-Tactics e combat-first; il caravan e un wrapper tra sessioni, non il loop principale.

---

## 2. Wildfrost — charge timer combat + tribe synergy

**Studio**: Deadpan Games / Chucklefish (2023). **Pilastro match**: P1 (tattica leggibile), P3 (identita specie x job).

### Meccanica core

Ogni unita e ogni nemico ha un **counter** (timer di carica) che scende di 1 ogni turno. Quando raggiunge 0, l'entita agisce. Il player non controlla "chi va prima" — controlla quali azioni esegue prima che i nemici agiscano. Creare "finestre" blocca o ritarda counter avversari.

Il sistema di **tribe synergy** e altrettanto elegante: 3 tribu (Snowdwellers, Shademancers, Clunkmasters) hanno tag di compatibilita. Mischiare tribu funziona ma perdi bonus passivi. La scelta di purezza vs. ibrido e genuinamente strategica.

### Perche funziona

Il charge counter rende **visibile la minaccia** in tempo reale. Non devi capire "il nemico attacca ogni 2 turni" — vedi il numero scendere. Questa informazione diegetica riduce il cognitive load e massimizza la leggibilita tattica.

Il sistema evita il "alpha strike" meta dei giochi a turni classici (agisci tu, agisci avversario). Qui puoi "bloccare" un nemico riducendo il suo counter usando abilita specifiche, creando opportunita emergenti.

[design pattern reference: countdown-as-threat-telegraph; verify against Wildfrost official design notes]

### Estraibile a Evo-Tactics

**Pilastro P1 (tattica leggibile)**. Il sistema di initiative gia live in Evo-Tactics (formula `initiative + action_speed - status_penalty` da ADR-2026-04-15) e il fondamento. Il charge counter e una variazione visiva.

| Aspetto                         | Effort | Cosa implementare                                                         |
| ------------------------------- | -----: | ------------------------------------------------------------------------- |
| Charge counter HUD per unita    |    ~4h | `render.js` badge counter sopra sprite (vedi HP bar pattern Tactics Ogre) |
| Counter-block ability type      |    ~5h | nuovo `effect_type: counter_delay` in abilityExecutor                     |
| Tribe synergy → species synergy |    ~8h | bonus passivo se 2+ same species_tag in party                             |

**Total effort**: ~17h. **Pillar impact**: P1 leggibilita + P3 identita specie.

**Note**: counter display richiede `render.js` refactor — cross-ref con HP bar floating (top quick-win #1 da `tier-s-extraction-matrix.md`). Batch insieme per ROI.

### Anti-pattern (cosa NON copiare)

- **Deck building roguelite loop**: Wildfrost e roguelite, carta estratta casualmente. Evo-Tactics ha job abilities fisse — no deck building casuale, rompe progressione XCOM-style gia implementata.
- **Counter a 0 = instant death** (alcune carte Wildfrost): troppo punitivo senza tutorial chiaro. Evo-Tactics usa damage step, non one-shot.
- **Art style candy/cute**: Wildfrost ha estetica kawaii che non matcha dark-tactical Evo-Tactics. Pattern meccanico isolabile, estetica no.

---

## 3. Astrea: Six-Sided Oracles — purificazione dadi come strategia

**Studio**: Little Leo Games (2023). **Pilastro match**: P2 (evoluzione emergente), P4 (MBTI/temperamento).

### Meccanica core

Astrea usa **dadi a facce contaminate e pure**. Ogni dado ha facce che possono essere Corruption (danno a te) o Purification (ripristina stabilita). Nel corso della run, il player "purifica" i dadi — letteralmente modifica le facce da Corruption a Purification attraverso upgrade. Il pool di dadi e il character sheet: un dado upgradato e un perk permanente visibile.

La strategia nasce dalla tensione: tirare piu dadi aumenta il potenziale ma anche il rischio di Corruption. Sapere quando fermarsi e la skill loop.

[design pattern reference: dice-as-upgradeable-resource; verify against Astrea dev blog / Little Leo postmortem]

### Perche funziona

Il dado e una **metafora tangibile del personaggio**. Non "hai +3 forza" — hai un dado con piu facce Purification. La progressione e visibile e fisica. Il player sente ownership sul proprio pool come se stesse costruendo qualcosa.

Il sistema di Corruption crea una curva di rischio naturale: un player aggressivo colleziona piu dadi ma rischia overflow. Un player cauto purifica meno ma e stabile. Entrambi i path sono validi — emergent strategy senza forzatura.

### Estraibile a Evo-Tactics

**Pilastro P4 (MBTI/temperamento)**. Le nostre VC axes (T_F, S_N, E_I, J_P come numeric 0-1) sono gia "dadi" concettuali. Il pattern di purificazione mappa a "internalization" del Thought Cabinet gia in repo (V1 onboardingPanel).

| Aspetto                                   | Effort | Cosa implementare                                        |
| ----------------------------------------- | -----: | -------------------------------------------------------- |
| Trait "face" visible upgrade              |    ~5h | thought internalization mostra "before/after" axis delta |
| Corruption/Purification → VC axis tension |    ~4h | sessione con alto T_F drift accumula "cognitive stress"  |
| Visual dice metaphor in debrief           |    ~6h | debrief mostra radar chart axis come "dadi"              |

**Total effort**: ~15h. **Pillar impact**: P4 MBTI surfacing + P2 evoluzione visibile.

**Note**: prerequisiti Thought Cabinet gia parzialmente in `onboardingPanel.js`. Cross-ref narrative pattern P0 "Thought Cabinet internalization" da agent knowledge base.

### Anti-pattern (cosa NON copiare)

- **Full RNG dice roll ogni turno**: il core roguelite di Astrea e randomness pesante. Evo-Tactics usa d20 vs DC (Margin of Success), non variance pura ogni turno.
- **6+ tipi di dado simultanei**: troppa cognitive load per un gioco co-op TV. Evo-Tactics: max 2 axis visibili per volta.
- **Roguelite run restart**: Astrea resetta tutto a ogni run. Evo-Tactics ha progressione persistente (XP curves, XCOM perk pairs) — NON resettabile.

---

## 4. Backpack Hero — puzzle inventario integrato al combattimento

**Studio**: The Gentlebros (2023). **Pilastro match**: P2 (evoluzione emergente), P3 (identita specie x job).

### Meccanica core

Lo zaino del player e una **griglia Tetris**. Ogni item occupa celle fisiche (spada 1x3, scudo 2x2, pozione 1x1). La posizione degli item nella griglia crea bonus di adiacenza: mettere due item dello stesso tipo vicini sblocca bonus passivi. Il "deck building" e spaziale, non casuale.

Combat usa gli item nella griglia come risorse. AP speso su un item lo attiva. La griglia piena e piu potente ma piu fragile (un oggetto distrutto lascia buco).

[design pattern reference: spatial-inventory-as-character-build; verify against Backpack Hero Kickstarter devlog]

### Perche funziona

Il puzzle spaziale crea **investment materiale** nell'equipaggiamento. Non e "equipa la spada migliore" — e "come organizzo la griglia per massimizzare adiacenza". Il player pensa alla disposizione come a un problem solving tangibile.

L'adiacenza bonus crea sinergie non ovvie da scoprire. Player che trovano combo "non documentate" si sentono scoperti qualcosa, non guidati dalla mano.

### Estraibile a Evo-Tactics

**Pilastro P2 (evoluzione) + P3 (identita)**. Il form_pack_bias.yaml gia implementa "pacchetti tematici 16x3" (PR #1726 V4). Il concetto di adiacenza spaziale mappa a "species trait synergy": avere 2 trait dello stesso organ_system sblocca bonus.

| Aspetto                                    | Effort | Cosa implementare                                                |
| ------------------------------------------ | -----: | ---------------------------------------------------------------- |
| Trait adjacency bonus (organ_system match) |    ~6h | `traitEffects.js` check `organ_system` tag su 2+ trait attivi    |
| Reward offer grid preview                  |    ~4h | `rewardOffer.js` mostra griglia attuale + nuova slot visivamente |
| Pack slot visual (non Tetris)              |    ~3h | form pack UI mostra slot occupati come colored cells             |

**Total effort**: ~13h. **Pillar impact**: P2 evoluzione visibile + P3 identita.

**Nota**: il sistema Tetris vero e fuori scope — troppo complesso per co-op TV. Il **principio** (posizione fisica = bonus) e estraibile come sinergie organ_system.

### Anti-pattern (cosa NON copiare)

- **Griglia Tetris completa**: per Evo-Tactics co-op TV, gestire un puzzle spaziale su telefono/gamepad e un UX nightmare. Semplifica a "slot contati" (vedi ADR-2026-04-26 spore-part-pack-slots).
- **Item destruction mid-combat**: rompere un item nella griglia e una meccanica interessante ma troppo punitiva senza save/reload. Evo-Tactics usa durability system solo in hardcore mode.
- **Single player inventory focus**: Backpack Hero e singleplayer. Gestire 4 griglie Tetris co-op simultaneamente e ingestibile — il principio va co-op-ificato (ogni player ha max 3 slot, non griglia).

---

## 5. Cobalt Core — cards-as-positioning ship combat

**Studio**: Brace Yourself Games (2023). **Pilastro match**: P1 (tattica), P5 (co-op).

### Meccanica core

Cobalt Core e un deckbuilder roguelite ma con una peculiarita: le carte non fanno solo danno — modificano la **posizione della nave** (3 corsie: top/mid/bot). Alcune carte funzionano solo in certi position state. Il posizionamento e meta-rilevante per l'intero sistema.

Ogni personaggio (ship crew) ha un deck dedicato. In co-op, i deck si mescolano creando sinergie cross-character. La composizione del party cambia quali carte sono disponibili nel pool.

[design pattern reference: positioning-as-card-modifier; verify against Cobalt Core Steam page + Brace Yourself dev notes]

### Perche funziona

Il positioning crea un secondo layer di decisione sopra il damage output. "Dove sono" diventa importante quanto "quanto danno faccio". Questo trasforma un deckbuilder da "ottimizza danno" a "gestisci stato spaziale + danno". Profondita tattica raddoppiata con 1 layer aggiunto.

La meccanica co-op di deck misti crea **identita party emergente**: 2 ship crew specifiche insieme hanno combo che nessuna delle due ha da sola. Il player sente ownership sul party, non sul singolo personaggio.

### Estraibile a Evo-Tactics

**Pilastro P1 (tattica) + P5 (co-op)**. Il sistema di posizionamento esadecimale gia implementato (`hexGrid.js`, ADR-2026-04-16). Le abilita gia hanno `effective_reach` e `range` che dipendono da posizione.

| Aspetto                            | Effort | Cosa implementare                                                                  |
| ---------------------------------- | -----: | ---------------------------------------------------------------------------------- |
| Position-conditional ability bonus |    ~5h | `abilityExecutor.js` check `position_condition` tag (es. "attacco +2 se flanking") |
| Cross-party ability unlock         |    ~7h | 2+ player con species_tag matching sblocca ability variante                        |
| Position as narrative trigger      |    ~3h | briefing ink variant se party ha formation specifica                               |

**Total effort**: ~15h. **Pillar impact**: P1 profondita tattica + P5 co-op identity.

**Note**: cross-party unlock richiede session.js check su party composition a /start — prerequisito gia parzialmente in modulation system.

### Anti-pattern (cosa NON copiare)

- **Deckbuilder roguelite completo**: Cobalt Core ha run roguelite con carta estratta casuale. Evo-Tactics usa job abilities fisse. NO deck building — solo position-conditional bonus.
- **3-lane positioning semplificato**: Cobalt Core ha 3 corsie (top/mid/bot) perche e 2D side-scrolling. Evo-Tactics ha hex grid 3D — non adattare il layout visivo, solo il principio "posizione modifica bonus".
- **Card art visual language**: il visual design di Cobalt Core e molto specifico al suo genere. Non importare card UI — il principio e nei condizionali di posizione.

---

## 6. Sintesi + ranking estrazione

### Ranked per ROI Evo-Tactics

| Rank | Gioco               | Pattern                    | Effort | Pillar | Quick Win? |
| ---: | ------------------- | -------------------------- | -----: | :----: | :--------: |
|    1 | **Wildfrost**       | Counter display HUD        |    ~4h |   P1   |     SI     |
|    2 | **The Banner Saga** | Permadeath opt-in          |    ~4h |   P6   |     SI     |
|    3 | **Backpack Hero**   | Trait adjacency bonus      |    ~6h | P2+P3  |     SI     |
|    4 | **Cobalt Core**     | Position-conditional bonus |    ~5h | P1+P5  |     SI     |
|    5 | **Astrea**          | Debrief dice radar chart   |    ~6h |   P4   |     SI     |

**Bundle quick wins** (~25h totale): chiude gap P1 HUD leggibilita + P4 MBTI surfacing + P2 evoluzione visibile.

### Cross-ref priority stack

- Counter display Wildfrost → batch con HP bar floating Tactics Ogre (tier-s-extraction-matrix.md rank #1, ~5h).
- Banner Saga permadeath → costruisce su mission timer Long War 2 gia live (PR #1695).
- Backpack Hero adjacency → costruisce su form_pack_bias.yaml V4 gia live (PR #1726).
- Cobalt Core position → costruisce su hexGrid.js gia live (ADR-2026-04-16).
- Astrea dice → costruisce su Thought Cabinet onboardingPanel gia parziale (V1).

### Decisioni aperte per master-dd

1. **Permadeath mode**: opt-in toggle (raccomandato) o hardcore-only preset? Impatta onboarding.
2. **Wildfrost counter**: mostrare counter su tutti gli attori o solo nemici? (Riduce HUD noise se solo nemici.)
3. **Backpack adjacency**: basare su `organ_system` tag (gia in YAML) o creare nuovo tag `synergy_group`?

---

_Doc generato da narrative-design-illuminator. Fonte primaria: analisi meccanica diretta giochi + cross-ref con tier matrices esistenti. Verifica pattern specifici contro fonti primarie prima di implementazione._
