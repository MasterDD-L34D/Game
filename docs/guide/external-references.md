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

## F. Apprendimento e teoria

| Risorsa                                      | Link                                                           | Note                                                                                                                                       |
| -------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **The Art of Game Design: A Book of Lenses** | [Google Books](https://books.google.com/books?id=LP5xOYMjQKQC) | Jesse Schell. Framework "lenti" per analizzare design da angolazioni diverse. Utile per valutare trade-off tra pilastri.                   |
| **A Theory of Fun** (Raph Koster)            | <https://www.theoryoffun.com/>                                 | Teoria fondamentale su perche i giochi funzionano. Pattern di apprendimento come fonte di divertimento — rilevante per curva progressione. |
| **Lost Garden** (Daniel Cook)                | <https://lostgarden.home.blog/>                                | Essay su game loops, framework "loops and arcs". Utile per strutturare sessione 90min e bilanciare ritmo tattica/esplorazione.             |
| **The Door Problem** (Liz England)           | <https://lizengland.com/blog/2014/04/the-door-problem/>        | Essay classico su cosa fa un game designer. Utile per comunicare ruoli e responsabilita nel team.                                          |
| **Game Maker's Toolkit** (Mark Brown)        | <https://www.youtube.com/@GMTK>                                | Video analisi design. Episodi specifici su: boss design, difficulty, puzzle design, tattica.                                               |
| **Designer Notes** (Soren Johnson)           | <https://www.designer-notes.com/>                              | Podcast + blog. Johnson ha lavorato su Civilization IV — rilevante per sistemi strategici e AI design.                                     |
| **Game Design Patterns Wiki** (Chalmers)     | <https://virt10.itu.chalmers.se/index.php/Main_Page>           | Catalogo accademico. Gia in sezione A, ripetuto qui come learning resource.                                                                |
| **Asking Gamedevs**                          | <https://askingamedev.tumblr.com/>                             | Q&A da veterani industria. Risposte pratiche su produzione, design, carriera.                                                              |
| **Game Developer Deep Dives**                | <https://www.gamedeveloper.com/keyword/deep-dive>              | Serie postmortem tecnici approfonditi. Complemento ai postmortem in sezione C.                                                             |

## G. Community e risorse

| Risorsa                              | Link                                                                   | Note                                                                                     |
| ------------------------------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| **GDC Vault — Postmortems playlist** | <https://youtube.com/playlist?list=PLNu0OXEmMXnA46j4CDZLVsVj-ysmWwW6s> | Collezione video GDC Classic Postmortems (DOOM, Elite, Pac-Man, Prince of Persia, etc.). |
| **GDC Vault** (archivio completo)    | <https://gdcvault.com/>                                                | Archivio talk GDC (free + premium). Ricerca per argomento/anno.                          |
| **r/gamedesign Wiki**                | <https://www.reddit.com/r/gamedesign/wiki/index/>                      | Risorse curate dalla community Reddit. Buon punto di partenza per topic specifici.       |
| **IGDA Resources**                   | <https://igda.org/resources-learning/>                                 | Libreria International Game Developers Association.                                      |
| **GameDev.net**                      | <https://www.gamedev.net/>                                             | Community storica game dev con articoli e forum.                                         |

---

## Mapping pilastri

| Pilastro                          | Risorse chiave                                                         |
| --------------------------------- | ---------------------------------------------------------------------- |
| P1 — Tattica leggibile (FFT)      | Halfway, Frozen Synapse, Overwatch ECS, Baldur's Gate II               |
| P2 — Evoluzione emergente (Spore) | Hades, Cogmind, Magicka, Binding of Isaac, System Shock 2, Lost Garden |
| P3 — Identita Specie x Job        | Cogmind, Deus Ex design doc, System Shock 2, Baldur's Gate II          |
| P4 — Temperamenti MBTI/Ennea      | Theory of Fun, Book of Lenses (framework lenti per analisi)            |
| P5 — Co-op vs Sistema             | AI War, Natural Selection 2, Designer Notes                            |
| P6 — Fairness                     | Machinations, Balatro, SpaceChem, Game Programming Patterns            |
