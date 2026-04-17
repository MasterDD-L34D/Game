---
title: Evo Final Design — Milestones and Gates
doc_status: draft
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-15
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Evo Final Design — Milestones and Gates

## 1. Scopo

Questo file definisce i gate formali di avanzamento del final design.

Va usato come riferimento da:

- Master DD
- Codex / agenti
- QA
- Release Ops
- owner di workstream

## 2. Legenda

| Stato | Significato                       |
| ----- | --------------------------------- |
| ☐     | Gate non aperto / non soddisfatto |
| ☐→☑  | Gate aperto o in consolidamento   |
| ☑    | Gate chiuso e verificato          |

### 2.1 Glossario operativo

| Termine             | Significato                                                                                                                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **action-required** | Il task comporta modifiche reali a file del repo (YAML, JSON, MD, codice). Richiede validazione e log di impatto.                                                                                                      |
| **info-only**       | Il task e' di analisi, design o pipeline; non modifica file.                                                                                                                                                           |
| **strict-mode**     | Modalita' operativa degli agenti Codex (vedi [`AGENTS.md`](../../AGENTS.md) e [`.ai/BOOT_PROFILE.md`](../../.ai/BOOT_PROFILE.md)): validator obbligatori, preview dei cambiamenti, rollback plan, working tree pulito. |
| **Golden Path**     | Sequenza canonica di validator + test + smoke richiesta dal repo per un merge sicuro.                                                                                                                                  |
| **FAST_PATH**       | Modalita' semplificata per patch piccole e isolate (vedi [`CODEX_EXECUTION_PLAYBOOK §7`](EVO_FINAL_DESIGN_CODEX_EXECUTION_PLAYBOOK.md)).                                                                               |
| **Gate**            | Condizione formale di avanzamento di milestone. Entry/exit criteria, evidenze richieste, stop conditions e rollback.                                                                                                   |

## 3. Gate overview

| Stato | Task                                         | Dettagli operativi                                                                               |
| ----- | -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| ☐→☑  | G0 — Baseline & Governance                   | Freeze pubblicato, file planning presenti, authority map presente, naming/owner/gating definiti. |
| ☐     | G1 — Session Model / Controls / In-match HUD | Session model, control scheme e HUD in-match minimi chiusi e coerenti col prodotto.              |
| ☐     | G2 — Combat Freeze                           | Combat canon unico, scope azioni chiuso, test combat e schema verdi.                             |
| ☐     | G3 — Balance & Progression Freeze            | Trait mechanics audit completato, economy freeze, unlock freeze, build matrix.                   |
| ☐     | G4 — Content Shipping Slice                  | Species/job/biome/director slice chiusi e vertical slice ripetibile.                             |
| ☐     | G5 — UX / HUD / Telemetry                    | Overlay HUD, debrief, output metriche e surfacing warnings chiusi.                               |
| ☐     | G6 — Meta Slice & Cross-Repo                 | Recruit/Nido/Mating slice chiusi, import contract e runbook DB pronti.                           |
| ☐     | G7 — Release Candidate                       | Validator PASS, smoke PASS, snapshot PASS, playtest target e sign-off completi.                  |

## 4. G0 — Baseline & Governance

### Entry criteria

- Esiste un documento freeze completo.
- I file roadmap sono presenti nel repo.
- Esiste `docs/planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md`.
- Il path del freeze è deciso.
- Il lavoro è dichiarato come action-required e gestito in strict-mode quando tocca file.

### Exit criteria

| Stato | Task                               | Dettagli operativi                                                                                     |
| ----- | ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| ☐     | Freeze pubblicato                  | `docs/core/90-FINAL-DESIGN-FREEZE.md` caricato e linkato.                                              |
| ☐     | Bundle roadmap pubblicato          | `docs/planning/*` caricato.                                                                            |
| ☐     | Source authority map pubblicata    | La gerarchia tra governance, ADR, YAML, freeze, file operativi e storico e definita e linkata.         |
| ☐     | Product boundary chiarito          | Visione, pilastri, product boundary e differenza gioco vs tooling sono dichiarati nel freeze/overview. |
| ☐     | Owner e responsabilità esplicitati | Master DD + owner logici confermati.                                                                   |
| ☐     | Registry aggiornato opzionalmente  | Se si attiva governance completa, aggiornare `docs_registry.json`.                                     |
| ☐     | Policy merge richiamata            | Nessun merge senza validator report, changelog, rollback plan e approvazione Master DD.                |

### Evidenze richieste

- link ai file
- eventuale PR notes di pubblicazione
- log attività / changelog

### Rollback

- ripristino della versione precedente dei file planning;
- ritiro del freeze dal branch se ancora non approvato.

## 5. G1 — Session Model / Controls / In-match HUD

### Entry criteria

- G0 chiuso.
- Esiste una distinzione esplicita tra gioco, tooling, dashboard e mission control.
- I conflitti tra overview, Canvas e documenti core sono stati almeno catalogati.

### Exit criteria

| Stato | Task                               | Dettagli operativi                                                                     |
| ----- | ---------------------------------- | -------------------------------------------------------------------------------------- |
| ☐     | Session model scritto              | Struttura della sessione, turn pacing e ruolo di TV/app/companion chiariti.            |
| ☐     | Controls spec minima pronta        | Input model, affordance base e mappa dei controlli di gioco definiti.                  |
| ☐     | In-match HUD minima pronta         | Gerarchia informazioni, status, targeting, AP/reazioni e feedback essenziali definiti. |
| ☐     | Boundary gioco vs tooling chiarito | Mission Console e dashboard non vengono scambiate per HUD di gameplay.                 |
| ☐     | Cross-link aggiornati              | Freeze, roadmap e playbook puntano a questa decisione.                                 |

### Evidenze richieste

- spec sintetica controls/HUD
- nota di boundary prodotto
- eventuali mockup o TODO ufficiali in repo

### Stop conditions

- i controlli restano impliciti o confusi con UI di tooling
- l'HUD continua a essere solo overlay telemetrico
- il product boundary non e dichiarato

### Rollback

- riportare la milestone in stato aperto;
- lasciare controls/HUD come TODO ufficiale e bloccare l'avanzamento delle milestone successive che dipendono da essa.

## 6. G2 — Combat Freeze

### Entry criteria

- G0 chiuso.
- Combat hub, combat README e ADR rules engine allineati.
- Nessuna nuova meccanica entra senza scope review.

### Exit criteria

| Stato | Task                     | Dettagli operativi                                                                                                                     |
| ----- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| ☐     | Combat canon spec pronto | Documento unico con formule, timing, scope e non-scope.                                                                                |
| ☐     | Action types chiusi      | `attack`, `move`, `defend`, `parry`, ability stub solo come stub.                                                                      |
| ☐     | Status shipping chiusi   | `bleeding`, `fracture`, `disorient`, `rage`, `panic`.                                                                                  |
| ☐     | PT spend chiusi          | `perforazione`, `spinta` e relativo timing.                                                                                            |
| ☐     | NOOP dichiarato          | `active_effects` esplicitamente fuori dallo shipping scope.                                                                            |
| ☐     | Test Python verdi        | `tests/test_resolver.py`, `tests/test_hydration.py`.                                                                                   |
| ☐     | Test Node/contract verdi | `tests/api/contracts-combat.test.js`, `tests/api/contracts-hydration-snapshot.test.js`, `tests/api/contracts-trait-mechanics.test.js`. |
| ☐     | Smoke demo CLI verde     | Modalità auto e output riproducibile.                                                                                                  |

### Evidenze richieste

- report test
- eventuale snapshot diff approvato
- nota di freeze su rules engine

### Stop conditions

- test rossi
- nuove meccaniche core richieste a metà freeze
- mismatch schema / resolver / docs

### Rollback

- revert del rulebook o delle patch meccaniche in branch dedicato;
- ripristino snapshot baseline;
- ripetizione smoke e test.

## 7. G3 — Balance & Progression Freeze

### Entry criteria

- G1 chiuso.
- Resolver stabile.
- Trait mechanics schema già valido.

### Exit criteria

| Stato | Task                         | Dettagli operativi                                                                                                                     |
| ----- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| ☐     | Trait mechanics audit chiuso | Nessun trait core senza mapping o placeholder non giustificato.                                                                        |
| ☐     | Build matrix pronta          | Specie × Morph × Job × Surge × Bioma con sinergie e counter.                                                                           |
| ☐     | Economy freeze chiusa        | PE, PI, Seed, PP, SG, conversioni e cap stabiliti.                                                                                     |
| ☐     | Unlock rules freeze          | Set shipping delle unlock rules dichiarato.                                                                                            |
| ☐     | MBTI/PF gating soft chiuso   | Gating documentato senza hard lock opaco.                                                                                              |
| ☑    | Legacy gaps chiusi           | HUD overlay dependency nota; XP Cipher **parked** via [ADR-2026-04-17](../adr/ADR-2026-04-17-xp-cipher-official-park.md) (2026-04-17). |

### Evidenze richieste

- tabella di tuning
- note bilanciamento
- changelog dati
- test contratti ancora verdi

### Stop conditions

- build dominante evidente senza counter
- regressione numerica tra combat docs e trait mechanics
- valute che svolgono troppe funzioni nello stesso layer

### Rollback

- ripristino `trait_mechanics.yaml` e tabelle economy precedenti;
- retest su resolver e scenario matrix.

## 8. G4 — Content Shipping Slice

### Entry criteria

- G2 chiuso.
- Build identity leggibile.
- Economy freeze stabile.

### Exit criteria

| Stato | Task                       | Dettagli operativi                                                  |
| ----- | -------------------------- | ------------------------------------------------------------------- |
| ☐     | Species slice chiusa       | Set shipping immediato e set target distinti.                       |
| ☐     | Morph slice chiusa         | 5 slot minimi, budget, combinazioni permesse, parti guida.          |
| ☐     | Jobs slice chiusa          | 6 job con unlock minimi e fantasy leggibile.                        |
| ☐     | Biome slice chiusa         | Desert, Cavern, Badlands con impatto reale e encounter documentati. |
| ☐     | Director slice chiusa      | Output minimi NPG e comportamento leggibile.                        |
| ☐     | Vertical slice ripetibile  | 1–2 missioni di riferimento usate come banco di prova unico.        |
| ☐     | Counter surfacing definito | Ogni slice dichiara i counter principali.                           |

### Evidenze richieste

- content matrix
- examples / encounter reference
- vertical slice notes

### Stop conditions

- contenuto che richiede nuove meccaniche core
- missioni che non possono essere testate ripetibilmente
- biomi senza impatto sistemico reale

### Rollback

- tagliare contenuto non stabile;
- tornare alla slice precedente e ripristinare encounter di baseline.

## 9. G5 — UX / HUD / Telemetry Shipping Layer

### Entry criteria

- G3 chiuso.
- Vertical slice ripetibile.
- Metriche disponibili.

### Exit criteria

| Stato | Task                      | Dettagli operativi                                             |
| ----- | ------------------------- | -------------------------------------------------------------- |
| ☐     | Overlay HUD shipping      | Risk/cohesion, risorse, status, warnings principali leggibili. |
| ☐     | Debrief shipping          | Trend VC, PF session, reward, unlock, suggerimenti build.      |
| ☐     | Player UI freeze          | Nessun overload cognitivo non giustificato.                    |
| ☐     | Telemetry output contract | Metriche, naming, export e ownership documentati.              |
| ☐     | Visual QA pass            | Nessuna regressione grave su contrasto eventi o alert.         |

### Evidenze richieste

- mock / spec finale HUD
- report metriche
- smoke visuale
- note QA

### Stop conditions

- HUD che mostra dati non affidabili
- output metrici non coerenti con i dati di gioco
- alert che generano rumore e non informazione

### Rollback

- disabilitare overlay non stabile;
- tornare a set minimo di metriche;
- ridurre UI a sola lettura essenziale.

## 10. G6 — Meta Slice & Cross-Repo

### Entry criteria

- G4 chiuso.
- Core loop completo e leggibile.

### Exit criteria

| Stato | Task                        | Dettagli operativi                                                      |
| ----- | --------------------------- | ----------------------------------------------------------------------- |
| ☐     | Recruit slice chiusa        | Affinity/Trust e subset NPG documentati.                                |
| ☐     | Nido slice chiusa           | 1 livello shipping con requisiti chiari.                                |
| ☐     | Mating slice chiusa         | Gating, output e limiti definiti.                                       |
| ☐     | Import contract documentato | Elenco dati importati verso Game-Database e log ownership.              |
| ☐     | Runbook DB pronto           | Dry-run, verbose, repo path override, log esiti, fallback.              |
| ☐     | Automazione scelta          | Pattern manuale o futuro pattern B dichiarato senza rompere il runtime. |

### Evidenze richieste

- note sistemiche meta
- import runbook
- eventuale decision log cross-repo

### Stop conditions

- meta-sistemi che cambiano scope del core combat
- richieste di runtime dependency verso Game-Database
- import non idempotente o non osservabile

### Rollback

- tornare a sync manuale;
- rimuovere automazioni non stabili;
- mantenere solo Game local-files runtime.

## 12. G7 — Release Candidate

### Entry criteria

- G5 chiuso.
- Nessun gate precedente aperto.

### Exit criteria

| Stato | Task                      | Dettagli operativi                                                            |
| ----- | ------------------------- | ----------------------------------------------------------------------------- |
| ☐     | Validator PASS            | Datasets, contracts, ecosystem/package e controlli necessari verdi.           |
| ☐     | Smoke PASS                | CLI, combat demo, encounter, export critici allineati.                        |
| ☐     | Snapshot PASS             | Nessuna regressione non approvata.                                            |
| ☐     | Playtest target raggiunto | 50 partite target o soglia decisa da Master DD con evidenze.                  |
| ☐     | Bug backlog triage        | Tutti i P0/P1 aperti classificati e trattati.                                 |
| ☐     | PR ready                  | Changelog, rollback plan, validator report collegato, approvazione Master DD. |

### Evidenze richieste

- report validator
- smoke log
- snapshot diff
- report playtest
- PR notes

### Stop conditions

- P0 aperti
- validator rosso
- rollback plan assente
- approvazione Master DD mancante

### Rollback

- non si merge;
- si riapre il gate specifico fallito;
- si aggiorna il backlog con owner e fix path.

## 13. Gate board sintetico

Questa board rispecchia il body (§4..§12). Ogni gate ha il suo significato dichiarato nelle sezioni dedicate.

| Stato | Gate | Etichetta                                                                            |
| ----- | ---- | ------------------------------------------------------------------------------------ |
| ☐→☑  | G0   | Baseline & Governance — struttura documentale e governance pronta.                   |
| ☐     | G1   | Session Model / Controls / In-match HUD — session pacing, input e HUD minimi chiusi. |
| ☐     | G2   | Combat Freeze — combat congelato.                                                    |
| ☐     | G3   | Balance & Progression Freeze — bilanciamento e progressione congelati.               |
| ☐     | G4   | Content Shipping Slice — content slice congelata.                                    |
| ☐     | G5   | UX / HUD / Telemetry Shipping Layer — HUD/telemetria shipping pronte.                |
| ☐     | G6   | Meta Slice & Cross-Repo — meta-slice e cross-repo readiness pronte.                  |
| ☐     | G7   | Release Candidate — release candidate approvabile.                                   |

## 14. Documenti correlati

- [`90-FINAL-DESIGN-FREEZE`](../core/90-FINAL-DESIGN-FREEZE.md) — sintesi di prodotto da cui discendono i gate.
- [`EVO_FINAL_DESIGN_MASTER_ROADMAP`](EVO_FINAL_DESIGN_MASTER_ROADMAP.md) — mapping fasi ↔ milestone ↔ gate (`§6.1`).
- [`EVO_FINAL_DESIGN_BACKLOG_REGISTER`](EVO_FINAL_DESIGN_BACKLOG_REGISTER.md) — task esecutivi che chiudono ogni gate.
- [`EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP`](EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md) — gerarchia delle fonti.
- [`EVO_FINAL_DESIGN_CODEX_EXECUTION_PLAYBOOK`](EVO_FINAL_DESIGN_CODEX_EXECUTION_PLAYBOOK.md) — guida operativa agenti, include definizione di `FAST_PATH` e strict-mode.
