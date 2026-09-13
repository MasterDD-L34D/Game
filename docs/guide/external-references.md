---
title: Risorse esterne curate — Game Design Reference
doc_status: active
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-16
source_of_truth: false
language: it-en
review_cycle_days: 90
---

# Risorse esterne curate — Game Design Reference

Indice filtrato di risorse esterne rilevanti per Evo-Tactics. Solo materiale con applicabilita diretta ai 6 pilastri di design o all'infrastruttura del progetto.

> Ultima revisione: 2026-04-16. Prossima: entro 90 giorni o al cambio di pilastro.

---

## A. Repo open-source — DEEP DIVE (analisi approfondita raccomandata)

Repo da studiare per pattern architetturali, non da adottare come dipendenze.

| Repo                                                                        | Stars | Licenza    | Verdict   | Valore chiave per Evo-Tactics                                                                                                                                                               |
| --------------------------------------------------------------------------- | ----: | ---------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[wesnoth/wesnoth](https://github.com/wesnoth/wesnoth)**                   |  6.6k | GPL-2.0    | DEEP DIVE | Gold standard tattico a turni. Separazione data/engine, AI composite (Lua-scriptable), 20 anni di balance iteration. `data/core/` + `src/ai/` sono reference diretti per P1/P5/P6.          |
| **[boardgameio/boardgame.io](https://github.com/boardgameio/boardgame.io)** | 12.3k | MIT        | DEEP DIVE | Framework turn-based JS/TS. Round flow (`flow.ts`), server authority, MCTS AI bot. Pattern diretti per round orchestrator e session engine.                                                 |
| **[statelyai/xstate](https://github.com/statelyai/xstate)**                 | 29.5k | MIT        | DEEP DIVE | Statechart + actor model per JS/TS. Modellare round orchestrator come hierarchical statechart. Actor model per Sistema. Visual editor per docs.                                             |
| **[OpenRA/OpenRA](https://github.com/OpenRA/OpenRA)**                       | 16.6k | GPL-3.0    | DEEP DIVE | YAML-driven actor-trait composition. Engine/content boundary con mod SDK. Auto-generated trait docs. Pattern per data pipeline e ecosystem pack isolation.                                  |
| **[bevyengine/bevy](https://github.com/bevyengine/bevy)**                   | 45.6k | Apache-2.0 | DEEP DIVE | ECS composition: Components as data, Systems as behavior, Bundles as archetypes. Required Components = mandatory trait slots. Plugin modularity per servizi.                                |
| **[inkle/ink](https://github.com/inkle/ink)**                               |  4.7k | MIT        | DEEP DIVE | Standard narrativa branching. inkjs runtime per browser. Briefing/debrief, eventi testuali, scelte narrative. Colma gap narrativo reale nel progetto.                                       |
| **[eclipse-langium/langium](https://github.com/eclipse-langium/langium)**   |   991 | MIT        | DEEP DIVE | Framework DSL TypeScript. Unificare trait_mechanics.yaml + Python + TS + JSON Schema in un'unica source of truth con LSP, validation, code generation. Investimento lungo ma trasformativo. |

### Estraibili per repo (top 3)

<details>
<summary><b>wesnoth</b> — P1, P3, P5, P6</summary>

1. **Separazione content/gameplay/balance**: `data/` (WML config) vs `src/` (engine). 20 anni di proof che data-driven scala.
2. **AI composite pattern**: `src/ai/` con strategie composabili + Lua scripting per scenario-specific AI. Blueprint per Sistema.
3. **Attack prediction transparency**: probabilita completa esposta al giocatore. Pattern per rendere d20 leggibile.

</details>

<details>
<summary><b>boardgame.io</b> — P1, P5, P6</summary>

1. **Round/phase/turn flow**: `flow.ts` + `turn-order.ts` — separazione fasi, validazione mosse, turni. Pattern per roundOrchestrator.
2. **Server-authoritative state + event log**: reducer deterministico + time-travel replay. Per VC scoring replay.
3. **AI bot interface**: `src/ai/` MCTS + enumerate-moves. Clean interface per Sistema policy engine.

</details>

<details>
<summary><b>xstate</b> — P1, P5</summary>

1. **Round orchestrator come statechart**: planning → execution → resolution → cleanup come hierarchical state machine.
2. **Actor model per Sistema**: Sistema come actor con propria FSM. Comunicazione via eventi.
3. **Guard-based move validation**: pattern per validare mosse prima delle transizioni di stato.

</details>

<details>
<summary><b>OpenRA</b> — P1, P3</summary>

1. **YAML actor-trait composition**: actors assemblati da definizioni dichiarative YAML. Applicabile a trait hydration.
2. **Engine/content boundary + Mod SDK**: engine pubblica API stabile, mod overridano regole senza toccare engine.
3. **Auto-generated trait docs**: documentazione generata automaticamente da annotazioni codice.

</details>

<details>
<summary><b>bevy</b> — P2, P3</summary>

1. **ECS composition**: Species = archetype bundle, Job = system set. Required Components = mandatory trait slots.
2. **Plugin modularity**: ogni feature e' plugin indipendente. Pattern per modularizzare combat/generation/scoring.
3. **System scheduling + run conditions**: ordinamento esplicito, esecuzione parallela. Per sequencing fasi round.

</details>

<details>
<summary><b>ink</b> — narrativa</summary>

1. **Branching syntax** (knots/stitches/weave) per briefing/debrief/flavour text.
2. **inkjs runtime** per playback narrativo nel browser (Mission Console).
3. **Conditional text + variable tracking** per stato narrativo legato a outcome sessione.

</details>

<details>
<summary><b>langium</b> — tooling/DSL</summary>

1. **Grammar-driven DSL** per trait_mechanics.yaml — definizioni tipizzate con cross-reference, autocomplete LSP.
2. **Code generator pipeline**: DSL → TypeScript types + Python dataclasses + JSON Schema.
3. **Parser browser-compatible**: Trait Editor con syntax highlighting e validazione senza backend.

</details>

## B. Repo open-source — TAKE (integrare/riferire)

| Repo                                                                                    | Stars | Licenza    | Valore chiave                                                                                                                                                                  |
| --------------------------------------------------------------------------------------- | ----: | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **[colyseus/colyseus](https://github.com/colyseus/colyseus)**                           |  6.8k | MIT        | Framework multiplayer Node.js. Authoritative state sync, room lifecycle (maps to session engine), reconnection. Per co-op su dispositivi separati.                             |
| **[mermaid-js/mermaid](https://github.com/mermaid-js/mermaid)**                         | 87.4k | MIT        | Diagrammi as code in markdown. State diagram per round FSM, sequence per pipeline, class per Species x Job. Rendering nativo GitHub, zero build step. ROI immediato per docs/. |
| **[LazyHatGuy/GDDMarkdownTemplate](https://github.com/LazyHatGuy/GDDMarkdownTemplate)** |    50 | Other      | Template GDD 13 sezioni. Audit matrix per gap analysis vs docs/core/: mission structure, HUD, AI breakdown, management. 30min di lavoro concreto.                              |
| **[microsoft/playwright](https://github.com/microsoft/playwright)**                     | 86.6k | Apache-2.0 | Gia nel toolchain (`tools/ts/`). Upgrade a pattern recenti: trace-on-failure, codegen, test isolation. Infra QA.                                                               |

## C. Tool di bilanciamento

| Risorsa                                  | Link                                                 | Rilevanza Evo-Tactics                                                                                                                                                                                                                                      |
| ---------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Machinations**                         | <https://machinations.io/>                           | Modellazione visuale economia di gioco. 4 modelli specificati in [`docs/balance/MACHINATIONS_MODELS.md`](../balance/MACHINATIONS_MODELS.md): d20 attack economy, PT pool combo meter, damage step fairness cap, status propagation. Pilastro 6 (Fairness). |
| **Game Design Patterns Wiki** (Chalmers) | <https://virt10.itu.chalmers.se/index.php/Main_Page> | Catalogo accademico di pattern. Pattern mappabili: Action Point Allowance, Rock-Paper-Scissors (counter system), Asymmetric Abilities (specie x job), Team Combos.                                                                                         |

## D. Pattern e architettura gameplay

| Risorsa                       | Link                                                                         | Rilevanza Evo-Tactics                                                                                                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Game Programming Patterns** | <https://gameprogrammingpatterns.com/>                                       | Libro gratuito. Pattern gia in uso nel codebase: State Machine (session engine), Observer (event system), Command (action pipeline), Component (trait system). Reference per refactor. |
| **Overwatch ECS — GDC Talk**  | <https://www.gdcvault.com/play/1024001/-Overwatch-Gameplay-Architecture-and> | Architettura ECS di Overwatch (Timothy Ford). Rilevante per grid spatial module e combat pipeline. Pattern composizione vs ereditarieta per trait/ability.                             |

## E. Postmortem tattici e cooperativi (genere affine)

| Gioco                     | Studio          | Link                                                                                                                        | Pilastro                      | Note                                                                                                       |
| ------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Halfway**               | Robotality      | [One Year of Halfway](https://web.archive.org/web/20190325064712/http://robotality.com/blog/one-year-of-halfway/)           | P1 (Tattica)                  | Tattico a turni indie. Lezioni su UI griglia, feedback turni, leggibilita azioni.                          |
| **AI War: Fleet Command** | Arcen Games     | [Postmortem](https://www.gamedeveloper.com/design/postmortem-arcen-games-i-ai-war-fleet-command-i-)                         | P5 (Co-op vs Sistema)         | Co-op vs IA. Come bilanciare aggressivita IA, threat system, scaling difficolta in contesto cooperativo.   |
| **Frozen Synapse**        | Mode 7          | [Postmortem](https://www.gamedeveloper.com/design/postmortem-mode-7-s-i-frozen-synapse-i-)                                  | P1 (Tattica)                  | Simultaneous-turn tactics. Risoluzione turni simultanei, planning phase, chiarezza tattica.                |
| **Hades**                 | Supergiant      | [GDC Talk](https://www.gdcvault.com/play/1026975/Breathing-Life-into-Greek-Myth)                                            | P2 (Evoluzione)               | Loop progressione + build variety. "Come giochi modella cio che diventi" — allineato con visione progetto. |
| **Cogmind**               | Grid Sage Games | [Postmortem](https://www.gridsagegames.com/blog/)                                                                           | P2+P3 (Evoluzione + Identita) | Sistema componenti modulari, emergent gameplay da combinazioni, UI per sistemi complessi.                  |
| **Balatro**               | LocalThunk      | [Timeline](https://localthunk.com/blog/balatro-timeline-3aarh)                                                              | P6 (Fairness)                 | Iterazione meccaniche, bilanciamento emergente, test su community. Postmortem 2024.                        |
| **Magicka**               | Arrowhead       | [Postmortem](https://www.gamedeveloper.com/design/postmortem-arrowhead-game-studios-i-magicka-i-)                           | P2 (Evoluzione)               | Sistema combinazione spell coop — sinergie emergenti da mixing elementi. Trait mixing reference.           |
| **Natural Selection 2**   | Unknown Worlds  | [Postmortem](https://www.gamedeveloper.com/design/postmortem-unknown-worlds-entertainment-s-i-natural-selection-2-i-)       | P5 (Co-op vs Sistema)         | Asimmetria coop: commander + FPS. Ruoli diversi nella stessa partita, tensione coordinamento.              |
| **Binding of Isaac**      | Edmund McMillen | [Postmortem](https://www.gamedeveloper.com/design/postmortem-edmund-mcmillen-and-florian-himsl-s-i-the-binding-of-isaac-i-) | P2 (Evoluzione)               | Build variety procedurale, sinergie item non pianificate. Validazione "emergent combo".                    |
| **SpaceChem**             | Zachtronics     | [Postmortem](https://www.gamedeveloper.com/design/postmortem-zachtronics-industries-i-spacechem-i-)                         | P6 (Fairness)                 | Complessita emergente da regole semplici. Design puzzle con soluzione aperta.                              |
| **System Shock 2**        | Irrational      | [Postmortem](https://www.gamedeveloper.com/design/postmortem-irrational-games-system-shock-2)                               | P2+P3 (Evoluzione + Identita) | Immersive sim con RPG systems, emergent gameplay da interazioni sistema. Build diversity.                  |
| **Baldur's Gate II**      | BioWare         | [Postmortem](https://www.gamedeveloper.com/design/postmortem-bioware-s-i-baldur-s-gate-ii-the-shadows-of-amn-i-)            | P1+P3 (Tattica + Identita)    | Tattico RPG con party management profondo, identita companion, encounter design.                           |

## F. GDD di riferimento

| Documento                         | Link                                                                                                                    | Utilita                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Diablo 1 — Pitch doc** (Condor) | [PDF](http://www.graybeardgames.com/download/diablo_pitch.pdf)                                                          | Struttura pitch per sistema complesso con progression loop + loot economy.         |
| **Deus Ex — Design doc annotato** | [Articolo](https://www.gamasutra.com/view/news/285520/Annotated_version_of_an_original_Deus_Ex_design_doc_surfaces.php) | Design doc per gioco con sistemi interconnessi, scelte giocatore, build emergenti. |
| **GTA — Original GDD** (Rockstar) | [PDF](https://www.gamedevs.org/uploads/grand-theft-auto.pdf)                                                            | Esempio storico di GDD per open-world con sistemi complessi.                       |
| **GDD Markdown Template**         | [Repo](https://github.com/LazyHatGuy/GDDMarkdownTemplate)                                                               | Template 13 sezioni. Audit matrix per gap analysis vs docs/core/.                  |

## G. Narrativa e dialoghi (futuri)

| Risorsa                      | Link                                                                       | Quando serve                                                                                                                     |
| ---------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Ink/Inky** (Inkle Studios) | [Repo](https://github.com/inkle/ink) / <https://www.inklestudios.com/ink/> | Standard narrativa branching. inkjs per browser. Priorita quando serve briefing/debrief narrativo. Vedi sezione A per deep dive. |
| **Yarn Spinner**             | <https://yarnspinner.dev/>                                                 | Alternativa a Ink per dialoghi. Formato piu semplice per writer, ma meno espressivo. Unity-centric.                              |
| **Arrow**                    | <https://github.com/mhgolkar/Arrow>                                        | Tool visuale VCS-friendly. Standalone app, non libreria.                                                                         |

## H. Apprendimento e teoria

| Risorsa                                      | Link                                                           | Note                                                                                                                                       |
| -------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **The Art of Game Design: A Book of Lenses** | [Google Books](https://books.google.com/books?id=LP5xOYMjQKQC) | Jesse Schell. Framework "lenti" per analizzare design da angolazioni diverse. Utile per valutare trade-off tra pilastri.                   |
| **A Theory of Fun** (Raph Koster)            | <https://www.theoryoffun.com/>                                 | Teoria fondamentale su perche i giochi funzionano. Pattern di apprendimento come fonte di divertimento — rilevante per curva progressione. |
| **Lost Garden** (Daniel Cook)                | <https://lostgarden.home.blog/>                                | Essay su game loops, framework "loops and arcs". Utile per strutturare sessione 90min e bilanciare ritmo tattica/esplorazione.             |
| **The Door Problem** (Liz England)           | <https://lizengland.com/blog/2014/04/the-door-problem/>        | Essay classico su cosa fa un game designer. Utile per comunicare ruoli e responsabilita nel team.                                          |
| **Game Maker's Toolkit** (Mark Brown)        | <https://www.youtube.com/@GMTK>                                | Video analisi design. Episodi specifici su: boss design, difficulty, puzzle design, tattica.                                               |
| **Designer Notes** (Soren Johnson)           | <https://www.designer-notes.com/>                              | Podcast + blog. Johnson ha lavorato su Civilization IV — rilevante per sistemi strategici e AI design.                                     |
| **Asking Gamedevs**                          | <https://askingamedev.tumblr.com/>                             | Q&A da veterani industria. Risposte pratiche su produzione, design, carriera.                                                              |
| **Game Developer Deep Dives**                | <https://www.gamedeveloper.com/keyword/deep-dive>              | Serie postmortem tecnici approfonditi. Complemento ai postmortem in sezione E.                                                             |
| **2DGD_F0TH**                                | [Repo](https://github.com/2DGD-F0TH/2DGD_F0TH)                 | Ebook gratuito 500+ pagine: game loop, collision, design patterns, algoritmi. Codice in Python, Lua, C++, JS.                              |

## I. Community e meta-risorse

| Risorsa                              | Link                                                                   | Note                                                                                     |
| ------------------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **GDC Vault — Postmortems playlist** | <https://youtube.com/playlist?list=PLNu0OXEmMXnA46j4CDZLVsVj-ysmWwW6s> | Collezione video GDC Classic Postmortems (DOOM, Elite, Pac-Man, Prince of Persia, etc.). |
| **GDC Vault** (archivio completo)    | <https://gdcvault.com/>                                                | Archivio talk GDC (free + premium). Ricerca per argomento/anno.                          |
| **r/gamedesign Wiki**                | <https://www.reddit.com/r/gamedesign/wiki/index/>                      | Risorse curate dalla community Reddit. Buon punto di partenza per topic specifici.       |
| **IGDA Resources**                   | <https://igda.org/resources-learning/>                                 | Libreria International Game Developers Association.                                      |
| **GameDev.net**                      | <https://www.gamedev.net/>                                             | Community storica game dev con articoli e forum.                                         |
| **magictools**                       | [Repo](https://github.com/ellisonleao/magictools)                      | 16.5k stars. Meta-lista massiva di risorse game dev. Browse per gap.                     |
| **awesome-game-ai**                  | [Repo](https://github.com/datamllab/awesome-game-ai)                   | Multi-agent RL, imperfect-info game theory. Reference per fog-of-war + AI tattica.       |

---

## Mapping pilastri

| Pilastro                          | Risorse chiave                                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| P1 — Tattica leggibile (FFT)      | **wesnoth**, boardgame.io, xstate, Halfway, Frozen Synapse, Overwatch ECS, Baldur's Gate II                      |
| P2 — Evoluzione emergente (Spore) | **bevy** (ECS), Hades, Cogmind, Magicka, Binding of Isaac, System Shock 2, Lost Garden                           |
| P3 — Identita Specie x Job        | **OpenRA** (trait composition), **bevy** (ECS bundles), Cogmind, Deus Ex, Baldur's Gate II                       |
| P4 — Temperamenti MBTI/Ennea      | **xstate** (personality FSM), Theory of Fun, Book of Lenses                                                      |
| P5 — Co-op vs Sistema             | **wesnoth** (AI composite), **boardgame.io** (MCTS bot), **colyseus** (multiplayer), AI War, Natural Selection 2 |
| P6 — Fairness                     | **wesnoth** (20yr balance), Machinations, Balatro, SpaceChem, Game Programming Patterns                          |
| Infra/tooling                     | **mermaid** (docs diagrams), **playwright** (E2E), **langium** (DSL), GDD Template (audit)                       |
