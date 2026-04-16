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

Indice filtrato di risorse esterne rilevanti per Evo-Tactics, estratto da [awesome-game-design](https://github.com/Roobyx/awesome-game-design) e integrato con fonti aggiuntive. Solo materiale con applicabilita diretta ai 6 pilastri di design.

> Ultima revisione: 2026-04-16. Prossima: entro 90 giorni o al cambio di pilastro.

---

## A. Tool di bilanciamento

| Risorsa                                  | Link                                                 | Rilevanza Evo-Tactics                                                                                                                                                            |
| ---------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Machinations**                         | <https://machinations.io/>                           | Modellazione visuale economia di gioco. Utile per: trait economy, damage step scaling, cap_pt budget, PP combo meter. Alternativa ai fogli di calcolo per Pilastro 6 (Fairness). |
| **Game Design Patterns Wiki** (Chalmers) | <https://virt10.itu.chalmers.se/index.php/Main_Page> | Catalogo accademico di pattern. Pattern mappabili: Action Point Allowance, Rock-Paper-Scissors (counter system), Asymmetric Abilities (specie x job), Team Combos.               |

## B. Pattern e architettura gameplay

| Risorsa                       | Link                                                                         | Rilevanza Evo-Tactics                                                                                                                                                                  |
| ----------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Game Programming Patterns** | <https://gameprogrammingpatterns.com/>                                       | Libro gratuito. Pattern gia in uso nel codebase: State Machine (session engine), Observer (event system), Command (action pipeline), Component (trait system). Reference per refactor. |
| **Overwatch ECS — GDC Talk**  | <https://www.gdcvault.com/play/1024001/-Overwatch-Gameplay-Architecture-and> | Architettura ECS di Overwatch (Timothy Ford). Rilevante per grid spatial module e combat pipeline. Pattern composizione vs ereditarieta per trait/ability.                             |

## C. Postmortem tattici e cooperativi (genere affine)

| Gioco                     | Studio          | Link                                                                                                              | Pilastro                      | Note                                                                                                       |
| ------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Halfway**               | Robotality      | [One Year of Halfway](https://web.archive.org/web/20190325064712/http://robotality.com/blog/one-year-of-halfway/) | P1 (Tattica)                  | Tattico a turni indie. Lezioni su UI griglia, feedback turni, leggibilita azioni.                          |
| **AI War: Fleet Command** | Arcen Games     | [Postmortem](https://www.gamedeveloper.com/design/postmortem-arcen-games-i-ai-war-fleet-command-i-)               | P5 (Co-op vs Sistema)         | Co-op vs IA. Come bilanciare aggressivita IA, threat system, scaling difficolta in contesto cooperativo.   |
| **Frozen Synapse**        | Mode 7          | [Postmortem](https://www.gamedeveloper.com/design/postmortem-mode-7-s-i-frozen-synapse-i-)                        | P1 (Tattica)                  | Simultaneous-turn tactics. Risoluzione turni simultanei, planning phase, chiarezza tattica.                |
| **Hades**                 | Supergiant      | [GDC Talk](https://www.gdcvault.com/play/1026975/Breathing-Life-into-Greek-Myth)                                  | P2 (Evoluzione)               | Loop progressione + build variety. "Come giochi modella cio che diventi" — allineato con visione progetto. |
| **Cogmind**               | Grid Sage Games | [Postmortem](https://www.gridsagegames.com/blog/)                                                                 | P2+P3 (Evoluzione + Identita) | Sistema componenti modulari, emergent gameplay da combinazioni, UI per sistemi complessi.                  |
| **Balatro**               | LocalThunk      | [Timeline](https://localthunk.com/blog/balatro-timeline-3aarh)                                                    | P6 (Fairness)                 | Iterazione meccaniche, bilanciamento emergente, test su community. Postmortem 2024.                        |

## D. GDD di riferimento

| Documento                         | Link                                                                                                                    | Utilita                                                                            |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **Diablo 1 — Pitch doc** (Condor) | [PDF](http://www.graybeardgames.com/download/diablo_pitch.pdf)                                                          | Struttura pitch per sistema complesso con progression loop + loot economy.         |
| **Deus Ex — Design doc annotato** | [Articolo](https://www.gamasutra.com/view/news/285520/Annotated_version_of_an_original_Deus_Ex_design_doc_surfaces.php) | Design doc per gioco con sistemi interconnessi, scelte giocatore, build emergenti. |
| **GTA — Original GDD** (Rockstar) | [PDF](https://www.gamedevs.org/uploads/grand-theft-auto.pdf)                                                            | Esempio storico di GDD per open-world con sistemi complessi.                       |

## E. Risorse future (non prioritarie ora)

| Risorsa                      | Link                                | Quando serve                                                                                             |
| ---------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Yarn Spinner**             | <https://yarnspinner.dev/>          | Se aggiungiamo narrativa/dialoghi nel gameplay coop. Integrabile con Node. Usato in Night in the Woods.  |
| **Arrow**                    | <https://github.com/mhgolkar/Arrow> | Storytelling non-lineare open-source. Alternativa a Yarn Spinner se serve branching narrativo complesso. |
| **Ink/Inky** (Inkle Studios) | <https://www.inklestudios.com/ink/> | Linguaggio narrativo scriptato. Usato in 80 Days, Heaven's Vault.                                        |

## F. Community e apprendimento

| Risorsa                               | Link                                                                   | Note                                                                                       |
| ------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Game Maker's Toolkit** (Mark Brown) | <https://www.youtube.com/@GMTK>                                        | Video analisi design. Episodi specifici su: boss design, difficulty, puzzle design.        |
| **Designer Notes** (Soren Johnson)    | <https://www.designer-notes.com/>                                      | Podcast + blog. Johnson ha lavorato su Civilization IV — rilevante per sistemi strategici. |
| **GDC Vault — Postmortems playlist**  | <https://youtube.com/playlist?list=PLNu0OXEmMXnA46j4CDZLVsVj-ysmWwW6s> | Collezione video GDC Classic Postmortems (DOOM, Elite, Pac-Man, Prince of Persia, etc.).   |

---

## Mapping pilastri

| Pilastro                          | Risorse chiave                                     |
| --------------------------------- | -------------------------------------------------- |
| P1 — Tattica leggibile (FFT)      | Halfway, Frozen Synapse, Overwatch ECS             |
| P2 — Evoluzione emergente (Spore) | Hades, Cogmind, Game Design Patterns Wiki          |
| P3 — Identita Specie x Job        | Cogmind, Deus Ex design doc                        |
| P4 — Temperamenti MBTI/Ennea      | (nessuna risorsa diretta — area di ricerca aperta) |
| P5 — Co-op vs Sistema             | AI War, Designer Notes                             |
| P6 — Fairness                     | Machinations, Balatro, Game Programming Patterns   |
