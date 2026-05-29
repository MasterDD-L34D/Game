---
title: 'ADR-2026-05-18 — DF-Levels integration: direzione confermata + decision-matrix governata'
date: 2026-05-18
type: adr
workstream: cross-cutting
owner: master-dd
status: accepted
proposed_by: claude-code (codemasterdd consolidamento DF + ground-truth audit gh-api)
accepted_by: master-dd (Eduardo Scarpelli) -- verdetto 2026-05-29 post harsh-review stress-test
verdict_date: 2026-05-29
related_adr:
  - docs/adr/ADR-2026-05-18-sistema-persistent-state-learning.md
related_pr:
  - https://github.com/MasterDD-L34D/Game/pull/2326
  - https://github.com/MasterDD-L34D/Game/pull/2328
  - https://github.com/MasterDD-L34D/Game/pull/2329
related_doc:
  - docs/planning/RESCUE-FORGOTTEN-HIGH-ROI.md
  - docs/PLAYER-VISION.md
supersedes_as_decision_source:
  # effective UPON merge of vault PR #94 (filing order: #94 before #2330)
  - vault Spaces/Dev/Evo-Tactics/core/RECONCILIATION-MASTER.md (A5, resta reasoning archive, via #94)
  - vault Spaces/Dev/Evo-Tactics/core/PHASE-PLAN-COMPLETE.md (A5, resta reasoning archive, via #94)
  # GAME-ANALYSIS-COMPLETE.md NOT filed standalone -- content absorbed (corrected) into this matrix
---

# ADR-2026-05-18 — DF-Levels integration: direzione confermata + decision-matrix governata

> STATUS: **ACCEPTED** (verdetto master-dd 2026-05-29, post harsh-review stress-test
> — vedi "Verdetto master-dd" sotto). Nessun codice in questo ADR. Consolida **2 doc
> A5 reali** (RECONCILIATION / PHASE-PLAN; GAME-ANALYSIS gia' assorbito-corretto in
> questa matrix, non file standalone) in **un unico artefatto governato**, con la
> per-game matrix **ground-truth-corretta** (audit gh-api origin/main 2026-05-18).
> L'intento DF e' reale e deliberato, NON vaporware e NON shipped.

## Context

L'idea di integrare un'architettura di simulazione a livelli **L0-L5**
(stile Dwarf-Fortress: simulazione -> identita' -> memoria mondo ->
eredita' -> narrativa -> "losing is fun") in Evo-Tactics ha prodotto 3 doc
research (RECONCILIATION-MASTER, PHASE-PLAN-COMPLETE, GAME-ANALYSIS-COMPLETE,
tutti A5 vault). Audit ground-truth 2026-05-18 (gh-api origin/main) ha
trovato **premessa parzialmente falsificata** ricorrente nei 3:

- Triangle Strategy Proposal **A** (`apps/backend/services/mbtiSurface.js`)
  **e B** (`apps/backend/services/mbtiPalette.js` + `data/core/personality/
mbti_axis_palette.yaml` + test) = **SHIPPED 2026-04-26** (OD-013 Path A+B),
  NON "FORGOTTEN/rescue 5/5".
- Sentience tier backfill SHIPPED **PR #1808** (OD-008, ALL 45 species,
  25/04). NB: BACKLOG L23 cita erroneamente #2262 (= Envelope-B bundle
  14/05, scollegato) -- upstream-wrong da fixare Eduardo-side.
- `services/{identity,eventlog,worldstate,chronicle}` = **404, non esistono**:
  battle-scar / EventLog / population-tick / Chronicle / Sistema-S7 sono
  **greenfield non-costruito**, non "IN-DESIGN/ready".

I 3 doc A5 hanno valore (ragionamento L0-L5, modello identita', anti-ref) ma
NON sono governanti e ripetono il difetto. Serve **un artefatto unico
governato** che: (a) affermi la direzione come reale; (b) porti la
decision-matrix corretta; (c) chiuda lo sprawl di 4 doc paralleli.

## Decision (proposed)

1. **Adottare DF-Levels L0-L5 come direzione di design confermata** di
   Evo-Tactics (non sperimentale, non opzionale-vago). Tracciata QUI.
2. **Questo ADR = record canonical governato** della direzione DF. I 3 doc
   A5 (RECONCILIATION/PHASE-PLAN/GAME-ANALYSIS) restano **reasoning archive
   A5 non-governante** (informano il "perche'", non decidono).
3. **DESIGN_DIGEST.md** (codemasterdd, ground-truth-corretto) +
   **PLAYER-VISION.md** = layer player/reference. Questo ADR = layer
   decisione/governance. Non duplicare.
4. La decision-matrix sotto e' **ground-truth-verificata** e sostituisce le
   tabelle status sparse nei 3 doc A5.

## Modello DF-Levels (breve)

| Lvl | Cosa                        | Domanda                                      |
| --- | --------------------------- | -------------------------------------------- |
| L0  | Simulazione (eventi grezzi) | "aggiunge eventi interessanti?"              |
| L1  | Identita' individuale       | "da' un soggetto agli eventi (earned)?"      |
| L2  | Memoria del mondo           | "il mondo ricorda?"                          |
| L3  | Eredita'/artefatti          | "cristallizza in oggetti tangibili?"         |
| L4  | Narrativa superficiale      | "rende la storia leggibile?"                 |
| L5  | Filosofia "losing is fun"   | "il fallimento e' narrativo non frustrante?" |

Regola (verdetto 2026-05-29, fix P0.1 harsh-review): L0-L5 e' **annotazione
descrittiva subordinata al gate dei 6 pilastri** (`vault core/02-PILASTRI` =
source_of_truth), NON un secondo gate parallelo. Il gate che approva/blocca un
feature restano i 6 pilastri; L0-L5 = lente narrativa di profondita'-emergenza
(serve a *descrivere* dove un feature aggiunge story-depth, non a deciderlo in/out).
Euristica informale OK ("questo sprint tocca quale livello?"), MA non e' un cancello
autonomo. Evita il doppio-gate = doppia superficie di sprawl (la cosa che questo
ADR dichiara di combattere).

## Decision-matrix per-gioco (GROUND-TRUTH CORRETTA 2026-05-18)

Verdetto: **SHIPPED** (fatto, drop) | **GATED** (open ma bloccato da decisione) |
**GREENFIELD** (non-costruito, feature ordinaria se voluta) | **REF**
(reference/validatore, no feature) | **ANTI** (rifiuto esplicito).
Catalogo studiato (studio+feature+pilastro+depth) = SoT registrato `docs/guide/games-source-index.md`.
Catalogo "cosa prendi/cosa NO" prosa = DESIGN_DIGEST §11. Qui = **DF-level + verdetto** governato
(de-dup: NON ripetere il catalogo — feature/pilastro in games-source-index, verdetto-di-build qui).

### A — Pillar tier

| Gioco                | DF    | Pil   | Cosa prendi (sintesi)                                         | STATUS verificato                                                                                                                          | Verdetto                  |
| -------------------- | ----- | ----- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| FFT 1997             | L0,L1 | P1    | Wait action; facing 3-zone; CT-bar come _senso_; JP-concept   | Wait SHIPPED #1896; facing/CT DEFERRED                                                                                                     | KEEP-partial              |
| Spore 2008           | L3    | P2    | ability da morfologia; visual-swap; DNA-budget; eredita' gen. | mating engine SHIPPED (multiple PR ~2026-04, range non-citazione); visual-swap = **design-claim non-verificato** (non "P0 gap" confermato) | KEEP (verify visual-swap) |
| Disco Elysium 2019   | L1,L4 | P4    | MBTI debrief color-coded; reveal diegetico                    | MBTI debrief SHIPPED #1897; Thought-Cabinet greenfield ~8h                                                                                 | KEEP-partial              |
| AI War 2009          | L2    | P5    | Sistema-centric; progress-meter; intelligence accumulata      | progress-meter SHIPPED `aiProgressMeter.js`; Sistema-memoria = ADR-2026-05-18-sistema-persistent (#2328 pending)                           | GATED (#2328)             |
| Into the Breach 2018 | L0    | P1    | telegraph rule; threat overlay; kill-badge; arrows            | threat-tile UI SHIPPED #1884 (WCAG tile, NON threat-logic); badge/arrows greenfield ~3h                                                    | KEEP-partial              |
| Hades 2020           | L5    | P6    | 3-currency (cap 3); Pact opt-in; codex                        | DEFERRED post-playtest                                                                                                                     | GATED (playtest)          |
| Monster Train 2020   | L5    | P6    | Pact-Shards opt-in componibile                                | DEFERRED post-playtest (converge Hades/AIWar/XCOM-LW2)                                                                                     | GATED (playtest)          |
| Tactics Ogre 2022    | L0,L1 | P1,P3 | HP-float; AP-pip; charm; WORLD-rewind                         | HP/AP SHIPPED #1901; charm/auto/rewind greenfield                                                                                          | KEEP-partial              |

### B — Creature & narrativa

| Gioco                  | DF    | Pil   | Cosa prendi                                                    | STATUS verificato                                                                                                     | Verdetto                |
| ---------------------- | ----- | ----- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Wildermyth 2021        | L1    | P2,P3 | battle-scar permanente; portrait stratificato; identity-earned | `services/identity` **404 greenfield** (non "IN-DESIGN") ~12h                                                         | GREENFIELD              |
| Triangle Strategy 2022 | L1,L4 | P4    | A phased-reveal; B color-codes; C recruit-gating               | **A+B SHIPPED 2026-04-26** (mbtiSurface.js + mbtiPalette.js, OD-013 Path A+B). **C** = unico open, gated OD-001/M-007 | SHIPPED(A,B) / GATED(C) |

### C — Combat & UI quick-win

| Gioco        | DF  | Pil   | Cosa prendi                                           | STATUS                      | Verdetto              |
| ------------ | --- | ----- | ----------------------------------------------------- | --------------------------- | --------------------- |
| Cogmind 2015 | L0  | P1,P3 | tooltip stratificati base+expand; trade-off espliciti | MUSEUM, non-costruito ~4-6h | GREENFIELD (low-lift) |

### D — Indie research cluster

| Gioco                  | DF  | Pil   | Cosa prendi                          | STATUS                                          | Verdetto         |
| ---------------------- | --- | ----- | ------------------------------------ | ----------------------------------------------- | ---------------- |
| Banner Saga 2014       | L5  | P6    | caravan attrition; permadeath opt-in | DEFERRED post-playtest                          | GATED            |
| Cobalt Core 2023       | L0  | P1    | position-conditional bonus           | DEFERRED post-Bundle A                          | GREENFIELD/gated |
| Backpack Hero 2023     | L0  | P2,P3 | adjacency bonus organ_system         | `form_pack_bias.yaml` live; resto post-S6 (3/5) | GREENFIELD/gated |
| Astrea 2023            | L1  | P4    | dadi contaminati/puri = VC visual    | pending OD-013 (3/5)                            | GATED            |
| Citizen Sleeper 2022   | L0  | P2    | fatigue drift cross-encounter        | post-Bundle C (3/5)                             | GREENFIELD/gated |
| Slay the Princess 2023 | L4  | P4    | branching state memory               | post-D4 writer (3/5)                            | GREENFIELD/gated |
| Pentiment 2022         | L4  | P4    | job voice briefing                   | post-D4 writer (3/5)                            | GREENFIELD/gated |
| Inscryption 2021       | L2  | P5    | dossier reveal escalating            | post-MVP (2/5)                                  | GREENFIELD/low   |
| 1000xRESIST 2024       | L2  | P5    | memory layered POV briefing          | post-Bundle B (3/5) ~5h                         | GREENFIELD/gated |
| Loop Hero 2021         | L4  | P5    | minimap visual emergence             | pending D5 (3/5) ~6-9h                          | GATED (D5)       |
| Cocoon 2023            | L0  | P1    | biome rules layer                    | post-P3 (3/5) ~7h                               | GREENFIELD/gated |
| Tunic 2022             | L4  | P4    | partial codex decipher (subset)      | post-MVP (2/5) ~5h                              | GREENFIELD/low   |

### E — Core/GDD narrative & system tier

| Gioco                   | DF    | Pil   | Cosa prendi                                          | STATUS                                                      | Verdetto          |
| ----------------------- | ----- | ----- | ---------------------------------------------------- | ----------------------------------------------------------- | ----------------- |
| Wesnoth GPL             | L2,L5 | P2,P6 | scaling 0.7/1.0/1.3; validatore P2 advancement-tree  | concettuale gia' integrato                                  | REF               |
| Descent: Road to Legend | L2,L5 | P5    | Overlord rhythm; Custodi named Fase B; dice-metaphor | `custodi.yaml` exist; Fase B post-EA                        | GATED (Fase B)    |
| Fire Emblem             | L0    | P1    | grid positioning (ref comparativo)                   | hex adottato ADR-2026-04-16                                 | REF               |
| AncientBeast GPL        | L0    | P1    | hex 16x9; multi-tile; axial/cube                     | ADR-2026-04-16 DECIDED, in impl                             | REF/decided       |
| Don't Starve            | L1    | P3    | silhouette forte; palette 16-24/biome                | art-direction approved, pipeline Aseprite                   | KEEP (art)        |
| Slay the Spire 2017     | L0,L5 | P1,P6 | UI mood scuro; intent-preview; non-gacha             | art-direction ADR-2026-04-18; intent=telegraph converge ITB | KEEP (art)        |
| Wargroove 2019          | L1    | P3    | pixel-art moderno; clarity                           | reference moodboard                                         | REF               |
| OpenRA GPL              | L4    | P5    | mission briefing schema (briefing_ink)               | schema integrato                                            | REF/integrated    |
| FFT WotL 2007           | L1    | P5    | Custodi named; acted scenes                          | `custodi.yaml`; Fase B post-EA                              | GATED (Fase B)    |
| Ink/inkle               | L4    | P4,P5 | multi-speaker knot; branching state                  | **IMPLEMENTED** (inkjs Fase 1)                              | SHIPPED (base L4) |
| 80 Days/Sorcery         | L4    | P4    | validatore "creature silent + Sistema narra"         | validatore, no feature                                      | REF               |

## Anti-reference (rifiuti espliciti — invariati, validi)

Disney cartoon / Pokemon-cute / Full-3D realistico / Anime shonen / Military
sci-fi polished / Descent-puro Heroes-fissi / Pattern-C Commander-named /
Pattern-D Ramza-light / Darkest Dungeon / XCOM-core / Battle Brothers
(solo Telegraph 7-source). Regola: nuova feature vicina a un anti-ref =
veto immediato indipendente dal ROI. Non "non-ancora", ma "escluso".

## Genuinely-open azionabile (post ground-truth, ranked)

1. **Triangle Proposal C** (recruit-gating MBTI) — gated OD-001/M-007. No
   action finche' mating closure.
2. **Sistema S7** persistent-state — verdetto ADR-2026-05-18-sistema (#2328:
   A full / B pilot / C defer). Engine parziale esiste (`sistemaTurnRunner.js`).
3. **Cogmind tooltip stratificati** — ~4-6h, low-lift, MUSEUM-ready, GREEN.
4. **Worldgen population-tick** — verificare `foodweb` unused a runtime, poi
   ~6h GREEN se confermato unbuilt.
5. **Greenfield DF restante** (Wildermyth scar / EventLog / Chronicle /
   relationships / named-mutation-lineage / indie-cluster) — feature
   ordinarie: entrano in roadmap M2+ con gate normale SE volute. **NON
   "rescue", NON priorita' alta automatica.**

## Supersession & relazione artefatti

| Artefatto                                              | Ruolo post-questo-ADR                                                                             |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Questo ADR                                             | **canonical governato** direzione DF + decision-matrix                                            |
| ADR-2026-05-18-sistema-persistent-state (#2328)        | sub-decisione (S7), figlia di questo                                                              |
| RECONCILIATION / PHASE-PLAN / GAME-ANALYSIS (vault A5) | reasoning archive A5, **non-governanti**, non task-source. Non serve filing standalone aggiuntivo |
| DESIGN_DIGEST.md (codemasterdd)                        | catalogo player/reference (gia' ground-truth-corretto)                                            |
| PLAYER-VISION.md (#2329)                               | player-facing, sezione "Visione estesa" punta a questo ADR                                        |

## Options considered

- **A (proposed)**: adotta direzione DF intera + decision-matrix governata +
  supersede A5 sparsi. Intento esplicito reale, scope greenfield = roadmap normale.
- **B core-only**: adotta solo L0-L1 (identita'/eventi gia' vicini al core),
  defer L2-L5 a post-EA. Riduce ambizione, meno rischio scope.
- **C reject**: nessun ADR governato, restano i 3 A5 sparsi. Sconsigliato
  (sprawl + premessa falsificata non corretta in governance).

## Verdetto master-dd (2026-05-29)

Verdetto dato da Eduardo (master-dd) in valutazione congiunta, stress-testato da
`harsh-reviewer` (read-only) PRIMA del commit: 2 P0 + fix anti-blind-spot adottati
("se rigetta adotto non difendo"). Sintesi: **direzione regge, ambizione sequenziata,
L0-L5 declassato a lente**.

1. **Direzione DF = CONFERMATA**. Cross-run persistence confermata da master-dd =
   substrato reale per L2-L5 (NON format-mismatch). Build-sequencing: **A come
   direzione, B come ordine-di-costruzione**.
2. **Record governato = SI**. Questa decision-matrix sostituisce le tabelle A5 sparse.
3. **Supersession = SI**. I 2 doc A5 reali -> reasoning archive non-governante (vault PR #94).
4. **Build**: L0-L1 ora (vicini al core). **L2-L5 = feature ordinarie M2+**, NON
   priorita' automatica, gated da DUE precondizioni HARD (fix P1.1/P1.2/P1.3
   harsh-review — non hand-wavy):
   - **(a) gate AI-driven canonical playtest** (paradigma 2026-05-29,
     `docs/process/CANONICAL-AI-PLAYTEST.md`): nessun merge L2-L5 finche' il core co-op
     loop non passa il **playtest AI-driven canonico** (multi-policy, WR in-band a N=40,
     test verdi), riproducibile via `calibrate_parallel.py`. Playtest umano = conferma
     opzionale, NON bloccante. Artefatto-gate = `canonical-suite.yaml` + BACKLOG `Short` M1.
   - **(b) regola same-increment-surface**: ogni sprint L2-L5 shippa engine + payoff
     player-visibile + debrief NELLO STESSO incremento, o non shippa (roadmap
     `evo-state-roadmap` §82-83). Cross-run NON de-rischia: e' un *moltiplicatore* di
     surface-dead. Precedente di creep gia' avvenuto: il figlio S7 (feature L2) e'
     stato costruito PRIMA del suo verdetto.
5. **Figlio #2328 (Sistema S7)**: Option B **gia' SHIPPED** (units_observed + threat,
   e2e PASS 2026-05-25) -> NON "pilot" (correzione P0.2: era stale framing). Verdetto =
   **ratify-or-revert** sul gate playtest (a). Estensione a Option A
   (tactics/factions/phase) = feature M2+ ordinaria, stesso doppio-gate. Dettaglio nel child ADR.

Riferimento audit: codemasterdd `STATUS_MULTI_REPO.md` §DF Integration +
PR #2326 caveat ground-truth. Stress-test: harsh-reviewer 2026-05-29 (2 P0 fixed:
L0-L5 gate->annotazione; Q5 pilot->ratify; gate reso falsificabile; count 3->2 doc A5).
