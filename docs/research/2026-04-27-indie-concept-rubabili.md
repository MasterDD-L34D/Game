---
title: 'Indie Concept Rubabili — 5 idee di design estraibili per Evo-Tactics'
date: 2026-04-27
doc_status: active
doc_owner: narrative-design-illuminator
workstream: cross-cutting
last_verified: '2026-04-27'
source_of_truth: false
language: it
review_cycle_days: 90
tags: [research, indie, concept, design, citizen-sleeper, inscryption, tunic, cocoon, pentiment]
related:
  - docs/research/2026-04-26-cross-game-extraction-MASTER.md
  - docs/research/2026-04-26-tier-s-extraction-matrix.md
  - docs/research/2026-04-26-tier-a-extraction-matrix.md
  - docs/research/2026-04-26-tier-b-extraction-matrix.md
  - docs/research/2026-04-26-spore-deep-extraction.md
  - docs/adr/ADR-2026-04-26-spore-part-pack-slots.md
---

# Indie Concept Rubabili — 5 idee di design estraibili per Evo-Tactics

> **Scopo**: 5 giochi indie con **concept di design** che vanno oltre la meccanica — sistemi di significato, frame narrativi, strutture meta. Per ogni gioco: concept core + come si "ruba" per Evo-Tactics + esempi specifici di implementazione.
>
> **Modalita**: INFP-A research mode (Fi values → Ne explore). Disruptive hunt: contrarian alle convenzioni tattiche, ricerca trasversale di genere.
>
> **Cross-ref**: complementa `2026-04-27-indie-meccaniche-perfette.md` (meccaniche isolabili) con focus sui frame concettuali.

---

## Indice

1. [Citizen Sleeper — clock-driven narrative + dice resource](#1-citizen-sleeper--clock-driven-narrative--dice-resource)
2. [Inscryption — escalating meta-frame + camera glitch reveals](#2-inscryption--escalating-meta-frame--camera-glitch-reveals)
3. [Tunic — manual-as-puzzle diegetic](#3-tunic--manual-as-puzzle-diegetic)
4. [Cocoon — contained-world traversal](#4-cocoon--contained-world-traversal)
5. [Pentiment — typography-as-faction](#5-pentiment--typography-as-faction)
6. [Sintesi + bundle proposti](#6-sintesi--bundle-proposti)

---

## 1. Citizen Sleeper — clock-driven narrative + dice resource

**Studio**: Jump Over The Age / Fellow Traveller (2022). **Pilastro match**: P4 (MBTI/temperamento), P6 (fairness).

### Concept core

Citizen Sleeper usa un **orologio diegetico**: ogni "ciclo" (giorno di gioco) il player tira un pool di dadi. I dadi di valore alto abilitano azioni migliori; i dadi di valore basso possono solo azioni basiche. Il corpo del Sleeper si **degrada** nel tempo — il pool di dadi si riduce a ogni ciclo senza Medicine. Questa degradazione e la pressione centrale, non nemici.

Il clock non e un timer esterno — e la vita del personaggio che si esaurisce. Player sente l'urgenza come embodied, non come HUD number.

[design pattern reference: body-as-resource-clock; reference Fellow Traveller GDC notes on Citizen Sleeper design]

### Concept rubato per Evo-Tactics

**Il corpo come risorsa temporale**. Le nostre VC axes (T_F, S_N ecc.) gia agiscono come "stato mentale del personaggio". Il concept di Citizen Sleeper suggerisce: le axes dovrebbero avere **drift over campaign time**, non essere statiche.

**Implementazione specifica**:

- Ogni sessione di campagna che finisce con trauma (KO, permadeath scenario) aggiunge 1 punto "fatigue" alla species.
- Fatigue accumulata → modifica VC axis scoring (piu T → meno F, pressione diegetica).
- Il player "cura" la fatigue tra sessioni con rest events (narrative ink knot).
- UI: piccolo indicatore "stato del party" in briefing panel, non HUD invasivo.

**Effort**: ~8h (fatigue accumulator in campaign advance + ink knot rest events + UI indicator).

**Pillar impact**: P4 (axes che si muovono) + P6 (conseguenze reali).

**Cosa NON copiare**: il dice pool di Citizen Sleeper funziona perche il gioco e singolo-personaggio e narrativo. In co-op tattico, 4 pool di dadi individuali all'inizio di ogni sessione creano overhead insostenibile. Il **concept** (risorsa corporea temporale) si prende, non la meccanica dei dadi.

---

## 2. Inscryption — escalating meta-frame + camera glitch reveals

**Studio**: Daniel Mullins Games (2021). **Pilastro match**: P4 (MBTI), P5 (co-op experience).

### Concept core

Inscryption usa un **meta-frame escalating**: il gioco inizia come deckbuilder con un antagonista misterioso, poi si "rompe" rivelando strati di realta. La camera glitcha. Files di sistema appaiono. L'antagonista diventa complice. Il player non sa mai se e nel gioco o nel meta-gioco.

Il concept chiave e **l'inaspettata rivelazione come emotional pivot**: il player pensava di giocare X, scopre di giocare Y, e questa scoperta e il contenuto emotivo del gioco.

[design pattern reference: meta-frame-reveal, diegetic-break; reference Daniel Mullins devlog / Rock Paper Shotgun interview 2021]

### Concept rubato per Evo-Tactics

**Sistema come antagonista rivelato progressivamente**. In Evo-Tactics la narrativa e "la squadra vs. il Sistema". Il Sistema e l'antagonista. Il concept di Inscryption suggerisce: **il Sistema dovrebbe rivelare informazioni su se stesso gradualmente** — non come lore dump, ma come scoperta player-driven.

**Implementazione specifica**:

- `objectiveEvaluator.js` (gia live) valuta obiettivi per il Sistema. Rendi visibile al player, tra una missione e l'altra, i "dati interni del Sistema" (pressure history, spawn pattern) come se fossero documenti intercettati.
- Debriefing panel mostra "intelligence report" con dati reali (% win rate sessione, pressure peak, AI intents usati) framed come "dossier intercettato dal Sistema".
- Un milestone di campagna puo rivelare che il Sistema "sa" del party (quality check su consecutiveWins — se >3, un briefing speciale attiva).
- Nessun "glitch visivo" (troppo budget) — il reveal avviene attraverso tono: briefing diventa piu personale, piu minaccioso, nomina i player characters.

**Effort**: ~5h (ink briefing variant + objectiveEvaluator data expose in debrief + consecutive win check).

**Pillar impact**: P5 (Sistema come antagonista reale) + P4 (narrative reactivity).

**Cosa NON copiare**: il meta-frame di Inscryption richiede un colpo di scena narrative letterale (atto 2 = gioco diverso). Evo-Tactics non ha questa struttura e non deve — il concept si traduce in "rivelazione progressiva interna", non reset completo del frame.

---

## 3. Tunic — manual-as-puzzle diegetic

**Studio**: Andrew Shouldice / Finji (2022). **Pilastro match**: P4 (MBTI/cognizione), P3 (identita).

### Concept core

Tunic non ha tutorial esplicito. Ha un **manuale del gioco in lingua gliffica** che il player raccoglie pagina per pagina. Le pagine rivelano meccaniche, ma il manuale usa un alfabeto inventato (con chiave decifrabile). Il player impara a giocare come imparerebbe da un manuale straniero — ricercando pattern, deducendo regole.

Il concept e **l'ignoranza come stato di gioco valido**: non sapere qualcosa non blocca il player, crea curiosita. L'informazione e ricompensa narrativa.

[design pattern reference: diegetic-knowledge-as-reward; reference Tunic design notes Andrew Shouldice GDC 2023]

### Concept rubato per Evo-Tactics

**Il manuale tattiche come item di gioco**. Evo-Tactics ha una species lore ricca ma mai surfaciata al player come scoperta. Il concept di Tunic suggerisce: **la conoscenza del sistema tattico dovrebbe essere acquisibile in-game**, non pre-spiegata.

**Implementazione specifica**:

- Ogni scenario ha un "codex entry" sbloccabile dopo aver completato una condizione (es. "sopravvivi 5 turni sotto pressure 60+" sblocca "Rapporto Sistema: comportamento sotto pressione").
- Le entries sono scritte con tono dossier, non tutorial — player legge descrizione comportamento AI come se fossero field notes.
- La Thought Cabinet (V1 onboardingPanel gia in repo) e il container naturale: thoughts non sono solo perk ma **conoscenza tattica acquisita**.
- Un thought "Anatomia del Sistema" si sblocca dopo 3 missioni completate e rivela la formula di pressure escalation (gia in repo, non surfaciata).

**Effort**: ~6h (codex entry trigger in campaign advance + ink content 5-8 entries + thought cabinet extension per knowledge type).

**Pillar impact**: P4 (cognizione come gameplay) + P3 (species lore come risorsa tattica).

**Cosa NON copiare**: l'alfabeto glifico di Tunic funziona perche il gioco e single-player e puo richiedere ore di decifrazione. In co-op con 4 persone in serata, l'oscurita totale e frustrante. Il concept si riduce a "scoperta progressiva" — non oscurita ostruttiva.

---

## 4. Cocoon — contained-world traversal

**Studio**: Geometric Interactive / Annapurna (2023). **Pilastro match**: P2 (evoluzione), P1 (tattica).

### Concept core

Cocoon e un puzzle game dove il player porta "mondi" (orbs) dentro altri mondi. Ogni orb e un ambiente autonomo con sue regole. Portare un mondo dentro un altro crea nuove interazioni. Il concept e **nested systems che si modificano vicendevolmente**.

La genialita non e la meccanica dei mondi annidati in se — e che ogni sistema rimane coerente e comprensibile anche quando annidato. Il player non si perde perche ogni orb ha regole visivamente distinte.

[design pattern reference: nested-systems-coherent-scope; reference Geometric Interactive / Annapurna press coverage]

### Concept rubato per Evo-Tactics

**Biomi come sistemi annidati con regole distinte**. Il biome-aware spawn bias gia live (PR #1726 V7, `biomeSpawnBias.js`). Il concept di Cocoon suggerisce che ogni bioma dovrebbe avere non solo spawn bias ma **un set di regole tattiche uniche** che si "portano" nella sessione come un orb.

**Implementazione specifica**:

- Ogni bioma ha un file `biome_rules.yaml` (attualmente assente) con 1-2 regole speciali: es. `arctic: { movement_cost_multiplier: 1.5, freeze_on_water: true }`, `volcanic: { hazard_every_n_turns: 3 }`.
- Le regole si combinano se la missione e in un biome "transition zone" (2 biomi).
- Il briefing ink per ogni bioma cita esplicitamente la regola speciale: "Il ghiaccio rallenta il movimento — tienilo in mente."
- Il player "porta" la conoscenza del bioma da una missione all'altra: la prima volta in arctic e scoperta, la terza e expertise.

**Effort**: ~7h (biome_rules.yaml schema + loader + session.js apply + briefing ink variant per biome).

**Pillar impact**: P1 (tattica leggibile) + P2 (varieta emergente).

**Prerequisiti**: `biomeSpawnBias.js` gia live, scenario YAML ha `biome_id`, briefing ink endpoint gia in `narrativeRoutes.js`.

**Cosa NON copiare**: il level design annidato di Cocoon richiede world design esplicito per ogni "strato". Evo-Tactics non ha budget per world design iterativo — il concept si semplifica a "regole bioma come layer tattiche flat", non annidamento letterale.

---

## 5. Pentiment — typography-as-faction

**Studio**: Obsidian Entertainment (2022). **Pilastro match**: P4 (MBTI/identita), P3 (specie x job).

### Concept core

Pentiment usa il font del personaggio come **indicatore di status sociale**. Personaggi nobili parlano in calligrafia elaborata; contadini in testo piu grezzo; scribi in Gothic textura. Il font non e decorativo — e parte del sistema semiotico del gioco. Il player legge la gerarchia sociale attraverso la tipografia prima ancora di leggere il contenuto.

Il concept e **visual language as systemic information**: il design visivo porta significato tattico/sociale reale.

[design pattern reference: typography-as-social-code; reference Obsidian GDC 2023 Pentiment postmortem + Josh Sawyer design notes]

### Concept rubato per Evo-Tactics

**Job archetype come codice visivo coerente**. Attualmente in Evo-Tactics i job (Vanguard, Sniper, Support ecc.) si distinguono principalmente per abilita. Il concept di Pentiment suggerisce: ogni job dovrebbe avere un **visual vocabulary distinto** che il player riconosce immediatamente.

**Implementazione specifica**:

- Ogni job ha un **color tag** primario (gia parzialmente in design rebrand PR #1905, cross-ref `docs/reports/2026-04-27-indie-design-perfetto.md`).
- Il nome del job in HUD usa un font-weight o stile distinto (Bold per Vanguard / Italic per Recon / Regular per Support).
- I briefing ink per ogni job usano **tono di voce distinto**: Vanguard = imperativo militare, Support = collaborativo, Sniper = distaccato tecnico.
- Le ability card in UI (se implementata) hanno bordo color-coded per job.

**Effort**: ~5h (CSS font-weight per job tag + ink tone variants per 7 job briefing + color tag YAML).

**Pillar impact**: P3 (identita job visibile) + P4 (tone di voce come characterization).

**Cross-ref**: design rebrand M3.6 (PR #1577-#1582) ha gia ADR art accepted + styleguide. Typography-as-faction e un'estensione di quel sistema.

**Cosa NON copiare**: Pentiment e 100% testo — la tipografia e il medium principale. Evo-Tactics ha un visual canvas con sprite. Non rendere il gioco text-heavy solo per avere piu tipografia — il concept si applica ai label, non al gameplay.

---

## 6. Sintesi + bundle proposti

### Concetti per impatto narrativo (P4 focus)

I 5 concept convergono su un tema: **informazione come ricompensa narrativa, non come tutorial**. Il player dovrebbe scoprire, non essere istruito.

| Concept                                | Fonte           | Effort | Prerequisiti gia live               |
| -------------------------------------- | --------------- | -----: | ----------------------------------- |
| Body-as-resource-clock (fatigue drift) | Citizen Sleeper |    ~8h | campaign advance endpoint           |
| Sistema che rivela se stesso           | Inscryption     |    ~5h | objectiveEvaluator, narrativeRoutes |
| Knowledge-as-thought-cabinet           | Tunic           |    ~6h | onboardingPanel Thought Cabinet     |
| Biome-rules layer                      | Cocoon          |    ~7h | biomeSpawnBias.js, narrativeRoutes  |
| Job typography + tone voice            | Pentiment       |    ~5h | art ADR accepted, ink endpoint      |

**Total bundle**: ~31h per P4 surfacing completo.

### Bundle A — "Player sente il Sistema" (~18h)

Inscryption reveal (5h) + Citizen Sleeper fatigue (8h) + Tunic knowledge thoughts (6h). Chiude P4 gap principale: il player vede il proprio stato mentale evolversi e sente il Sistema come nemico reale.

### Bundle B — "World che respira" (~12h)

Cocoon biome-rules (7h) + Pentiment job voice (5h). Chiude P3 + P1: ogni missione ha sapore distinto, ogni job ha identita riconoscibile.

### Decisioni aperte per master-dd

1. **Fatigue drift**: tracking per-unit o per-party? Per-unit piu narrativo ma piu complesso da UI.
2. **Sistema reveal**: vuoi che i player leggano i "dossier intercettati" come meta-info esplicita o preferisci che sia piu sottile (solo tono briefing cambia)?
3. **Biome rules**: quanti biomi hanno regole speciali al lancio? 3 (tutorial/arctic/volcanic) o tutti i 40+ biomi?

---

_Doc generato da narrative-design-illuminator in research mode (INFP-A). Verifica pattern specifici contro fonti primarie. Tag `verification_needed: true` per sezioni marcate [design pattern reference]._
