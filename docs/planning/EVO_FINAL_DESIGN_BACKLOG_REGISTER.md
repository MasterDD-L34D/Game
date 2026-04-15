---
title: Evo Final Design — Backlog Register
doc_status: draft
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-15
source_of_truth: false
language: it-en
review_cycle_days: 14
---

# Evo Final Design — Backlog Register

## 1. Uso del registro

Questo file è il backlog centrale del final design.

Può essere usato per:

- issue tracker
- task board
- pipeline Codex
- review settimanali
- sign-off milestone

## 2. Legenda

| Stato | Significato                        |
| ----- | ---------------------------------- |
| ☐     | Da fare                            |
| ☐→☑  | In corso / in consolidamento       |
| ☑    | Completato o assunto come baseline |

## 3. Convenzioni

- Ogni task ha un ID stabile `FD-XXX`.
- I task si appoggiano al freeze, non lo riscrivono.
- I task con side-effect richiedono strict-mode (vedi [glossario in `MILESTONES_AND_GATES §2.1`](EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md)).
- I task che toccano file core o dati vanno eseguiti con preview, validator e riepilogo impatti.

> **Nota sull'unicita' dei FD-IDs**: gli IDs devono essere unici per tutto il registro. Questa iterazione ha corretto le collisioni piu' evidenti (EPIC B ora FD-011..014 al posto di FD-021..024). Alcuni ID duplicati residui (in particolare intorno a FD-030) sono **ancora aperti** e richiedono decisione umana sullo schema di numerazione definitivo — vedi la nota finale in §6.

## 4. Backlog per epic

### EPIC A — Governance, docs e baseline

| Stato | Task                                      | Dettagli operativi                                                                                                                                         |
| ----- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ☐     | FD-000 - Pubblicare source authority map  | Caricare [`docs/planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md`](EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md) e farlo linkare da freeze, index e playbook. |
| ☐→☑  | FD-001 - Pubblicare freeze                | Caricare [`docs/core/90-FINAL-DESIGN-FREEZE.md`](../core/90-FINAL-DESIGN-FREEZE.md) e trattarlo come sorgente master.                                      |
| ☐→☑  | FD-002 - Pubblicare roadmap bundle        | Caricare tutti i file `docs/planning/EVO_FINAL_DESIGN_*`.                                                                                                  |
| ☐     | FD-003 - Aggiornare docs registry         | Inserire i nuovi file in [`docs/governance/docs_registry.json`](../governance/docs_registry.json).                                                         |
| ☐     | FD-004 - Aggiornare index docs            | Linkare il freeze e le roadmap da entrypoint o hub appropriati.                                                                                            |
| ☐     | FD-005 - Aprire changelog di final design | Aggiungere voce dedicata in `docs/changelog.md` o log equivalente.                                                                                         |
| ☐     | FD-006 - Definire owner matrix definitiva | Confermare owner logici e owner umani per milestone e gate.                                                                                                |
| ☐     | FD-007 - Congelare pilastri canonici      | Scegliere un set unico di pilastri e dichiarare il product boundary.                                                                                       |
| ☐     | FD-008 - Scrivere overview canonico unico | Stabilire la sintesi che unifica overview, core docs, Canvas e deep research.                                                                              |
| ☐     | FD-009 - Formalizzare controllo autorita  | Regola di risoluzione conflitti tra governance, ADR, YAML, freeze e file operativi.                                                                        |

### EPIC B — Session model, controls e in-match HUD

| Stato | Task                                          | Dettagli operativi                                                           |
| ----- | --------------------------------------------- | ---------------------------------------------------------------------------- |
| ☐     | FD-010 - Definire session model               | Distinguere loop di sessione, pacing turni, companion/UI e mission control.  |
| ☐     | FD-011 - Scrivere controls spec minima        | Input, affordance, targeting, navigazione e conferme base.                   |
| ☐     | FD-012 - Scrivere HUD in-match spec minima    | AP, reazioni, targeting, status, biome feedback, warning e priorita visuali. |
| ☐     | FD-013 - Dichiarare boundary gioco vs tooling | Mission Console e dashboard non sono HUD di gameplay.                        |
| ☐     | FD-014 - Linkare controls/HUD nel freeze      | Rendere esplicito il gap chiuso e non lasciarlo implicito.                   |

### EPIC C — Combat canon e resolver

| Stato | Task                                         | Dettagli operativi                                                               |
| ----- | -------------------------------------------- | -------------------------------------------------------------------------------- |
| ☐     | FD-030 - Scrivere Combat Canon Spec          | Documento unico con formule, timing, side effect e non-scope.                    |
| ☐     | FD-021 - Bloccare action types shipping      | `attack`, `move`, `defend`, `parry`, ability stub.                               |
| ☐     | FD-022 - Bloccare status shipping            | `bleeding`, `fracture`, `disorient`, `rage`, `panic`.                            |
| ☐     | FD-023 - Bloccare PT spend shipping          | `perforazione`, `spinta`, costi, limitazioni e timing.                           |
| ☐     | FD-024 - Formalizzare timing begin_turn      | Tick status, decay e priorità effetti.                                           |
| ☐     | FD-025 - Formalizzare ordine mitigazioni     | Armor, resistenze, parry, MoS, damage step.                                      |
| ☐     | FD-026 - Esplicitare active_effects deferred | Mantenere NOOP come stato ufficiale fino a Fase 3+.                              |
| ☐     | FD-027 - Verificare determinismo             | RNG namespacing, seed strategy e ripetibilità risultati.                         |
| ☐     | FD-028 - Rieseguire suite Python combat      | `tests/test_resolver.py`, `tests/test_hydration.py`.                             |
| ☐     | FD-029 - Rieseguire suite Node contract      | `contracts-combat`, `contracts-hydration-snapshot`, `contracts-trait-mechanics`. |
| ☐     | FD-030 - Rieseguire demo CLI auto            | Smoke stabile con log archiviabile.                                              |

### EPIC D — Balance layer <!-- NOTE: 2 task di questo epic (FD-030 Audit trait_mechanics) collidono ancora con EPIC C FD-030; lo schema definitivo di numerazione e' una decisione aperta, vedi §6 -->

| Stato | Task                                     | Dettagli operativi                                                            |
| ----- | ---------------------------------------- | ----------------------------------------------------------------------------- |
| ☐     | FD-030 - Audit `trait_mechanics.yaml`    | Copertura completa del set shipping, placeholder review, note giustificative. |
| ☐     | FD-031 - Tabella mod offensivi/difensivi | Audit di attack/defense/damage/resistance.                                    |
| ☐     | FD-032 - Verificare AP costs             | Allineare `cost_ap` a fantasy, pacing e leggibilità.                          |
| ☐     | FD-033 - Rivedere resistenze e cap       | Evitare stack difensivi rotti.                                                |
| ☐     | FD-034 - Documentare trade-off           | Ogni trait core deve avere costo, contesto e counter.                         |
| ☐     | FD-035 - Chiudere policy placeholder     | Nessun placeholder 0 ingiustificato sullo shipping set.                       |
| ☐     | FD-036 - Congelare caps PT / PP / SG     | Cap definitivi e rationale.                                                   |

### EPIC E — Progression, economy e identity

| Stato | Task                                  | Dettagli operativi                                            |
| ----- | ------------------------------------- | ------------------------------------------------------------- |
| ☐     | FD-040 - Bloccare economy PE          | Curve, reward sources, pacing e checkpoint.                   |
| ☐     | FD-041 - Bloccare economy PI          | Costi build, unlock, respec soft.                             |
| ☐     | FD-042 - Bloccare Seed economy        | Meta bridge controllato, no scope creep.                      |
| ☐     | FD-043 - Definire conversioni economy | PE→PI, seed acquisition, reward bundle.                       |
| ☐     | FD-044 - Congelare unlock rules       | Set shipping dichiarato e testabile.                          |
| ☐     | FD-045 - Build identity matrix        | Specie × Morph × Job × Surge × Bioma.                         |
| ☐     | FD-046 - MBTI/PF gate soft            | Penalty / surcharge / suggestion model non opaco.             |
| ☐     | FD-047 - Enneagramma secondario       | Modulo attivo ma non dominante sul balance core.              |
| ☐     | FD-048 - Chiudere XP Cipher gap       | Trattare il gap storico o formalizzarne l’uscita dallo scope. |

### EPIC F — Species, morph, jobs, traits, gear

| Stato | Task                                    | Dettagli operativi                                                |
| ----- | --------------------------------------- | ----------------------------------------------------------------- |
| ☐     | FD-050 - Species slice shipping         | Selezione set immediato e set target.                             |
| ☐     | FD-051 - 5 slot morfologici obbligatori | Regola uguale per tutti i PG giocabili.                           |
| ☐     | FD-052 - Budget specie inviolabili      | Nessuna eccezione senza rationale e test.                         |
| ☐     | FD-053 - Morph compatibility table      | Parti, costi, requisiti, warning budget.                          |
| ☐     | FD-054 - Job fantasies finali           | 6 job con fantasy, unlock minimi, dipendenze e debolezze.         |
| ☐     | FD-055 - Job economy alignment          | Uso coerente di PT / PP / SG / PI.                                |
| ☐     | FD-056 - Surge shipping set             | `pierce`, `spin`, `chain`, `pulse`, `overdrive` con note rischio. |
| ☐     | FD-057 - Weapon compatibility           | `twin_blades`, `arc_rod` e compatibilità con surge e job.         |
| ☐     | FD-058 - Traits shipping notes          | `backstab`, `focus_frazionato` e relativi contesti d’uso.         |

### EPIC G — Biomi, NPG, Director, missioni

| Stato | Task                                   | Dettagli operativi                                                      |
| ----- | -------------------------------------- | ----------------------------------------------------------------------- |
| ☐     | FD-060 - Biome shipping set            | Desert, Cavern, Badlands come baseline.                                 |
| ☐     | FD-061 - Impatto sistemico biomi       | Ogni bioma deve toccare visibilità, mobilità o risorse.                 |
| ☐     | FD-062 - Encounter reference per bioma | Almeno un encounter valido e documentato per bioma.                     |
| ☐     | FD-063 - Director minimum output       | species, budget, job, 1–2 unlock, 1–2 traits, gear base, comportamento. |
| ☐     | FD-064 - Mission vertical slice        | 1–2 missioni di riferimento complete.                                   |
| ☐     | FD-065 - Counter surfacing             | Ogni slice deve dichiarare i counter principali.                        |
| ☐     | FD-066 - Reward per bioma              | Token, PE/PI/Seed o modifier coerenti.                                  |

### EPIC H — HUD, UI identità, debrief, telemetry

| Stato | Task                                  | Dettagli operativi                                              |
| ----- | ------------------------------------- | --------------------------------------------------------------- |
| ☐     | FD-070 - Overlay HUD shipping         | Risorse, status, warnings, risk/cohesion.                       |
| ☐     | FD-071 - In-mission surfacing         | Parry, cover, flank, obscured, biome bonus, sinergie attive.    |
| ☐     | FD-072 - Debrief shipping             | VC, PF session, rewards, unlock, suggerimenti.                  |
| ☐     | FD-073 - Meta UI shipping             | Budget morph, gates, recruit/nest/mating prerequisites.         |
| ☐     | FD-074 - Telemetry output contract    | Metriche, export, naming, threshold, owner.                     |
| ☐     | FD-075 - QA dashboard separation      | Distinguere UI giocatore vs dati QA/analytics.                  |
| ☐→☑  | FD-076 - Chiudere HUD overlay storico | Assorbire l’open item storico HUD dentro la UI shipping finale. |
| ☐     | FD-077 - Validare regressioni visuali | Alert leggibili, contrasto eventi, feedback coerenti.           |

### EPIC I — Recruit, Nido, Mating

| Stato | Task                             | Dettagli operativi                                                       |
| ----- | -------------------------------- | ------------------------------------------------------------------------ |
| ☐     | FD-080 - Recruit slice           | Affinity/Trust gating, subset NPG, eccezioni chiare.                     |
| ☐     | FD-081 - Trust/Affinity table    | Range, trigger, decay o stabilizzazione.                                 |
| ☐     | FD-082 - Nido livello 1 shipping | Requisiti minimi, bioma links, benefici reali.                           |
| ☐     | FD-083 - Mating shipping slice   | Gating, output, limiti, no genealogia profonda.                          |
| ☐     | FD-084 - Seed outputs            | Definire se genera 1–2 seed o nuovo membro in casi particolari.          |
| ☐     | FD-085 - Park deep simulation    | Rinviare genetica complessa, genealogie, ecosistema riproduttivo esteso. |

### EPIC J — QA, validator, smoke, release

| Stato | Task                                             | Dettagli operativi                                 |
| ----- | ------------------------------------------------ | -------------------------------------------------- |
| ☐     | FD-090 - Rieseguire validator dataset            | Validazione principale dei dati.                   |
| ☐     | FD-091 - Rieseguire ecosystem/package validation | Pack e spawn pack verdi.                           |
| ☐     | FD-092 - Rieseguire smoke CLI profili            | `hud`, `playtest`, `support`, `telemetry`.         |
| ☐     | FD-093 - Rieseguire test web minimi              | Solo se toccata UI o bundle relativo.              |
| ☐     | FD-094 - Definire playtest matrix                | Scenario, obiettivi, log, owner, questioni aperte. |
| ☐     | FD-095 - Chiudere triage bug P0/P1               | Nessun gate finale con P0 aperti.                  |
| ☐     | FD-096 - Preparare changelog                     | Note merge e release candidate.                    |
| ☐     | FD-097 - Preparare rollback plan 03A             | Richiesto dal processo di contribution.            |
| ☐     | FD-098 - Ottenere approvazione Master DD         | Gate finale di merge.                              |

### EPIC K — Game <-> Game-Database

| Stato | Task                                  | Dettagli operativi                                                          |
| ----- | ------------------------------------- | --------------------------------------------------------------------------- |
| ☑    | FD-100 - Mantenere confine attuale    | Runtime Game locale; DB come CMS / import target.                           |
| ☐     | FD-101 - Formalizzare import contract | Elenco file, comando, log destination, frequenza.                           |
| ☐     | FD-102 - Scrivere runbook import      | `sync:evo-pack` lato Game, `evo:import` lato DB, dry-run/verbose/repo path. |
| ☐     | FD-103 - Decidere cadence             | Manuale, batch o cron lato Game-Database.                                   |
| ☐     | FD-104 - Preparare pattern B          | Opzione raccomandata futura: cron job DB-side con PR di sync.               |
| ☐     | FD-105 - Definire trigger futuri      | Quando riaprire B o C dell’ADR topology.                                    |
| ☐     | FD-106 - Bloccare runtime dependency  | Vietato introdurre Game <- HTTP come prerequisito dello shipping freeze.    |

## 5. Vista priorità

> **Nota**: i range FD-XXX..XXX sotto sono informativi e punta all'epic di riferimento. Alcune collisioni di ID (intorno a FD-030) sono segnalate in §6 come **decisione aperta**.

### Priorità P0

| Stato | Task        | Dettagli operativi                                    |
| ----- | ----------- | ----------------------------------------------------- |
| ☐→☑  | FD-001      | Freeze pubblicato.                                    |
| ☐→☑  | FD-002      | Bundle roadmap pubblicato.                            |
| ☐     | FD-010..014 | Session model, controls e HUD in-match (EPIC B).      |
| ☐     | FD-020..030 | Combat canon e test (EPIC C).                         |
| ☐     | FD-030..036 | Balance audit (EPIC D, vedi nota ID collision).       |
| ☐     | FD-040..048 | Economy e progression freeze (EPIC E).                |
| ☐     | FD-050..058 | Species / morph / jobs / surge / gear slice (EPIC F). |
| ☐     | FD-060..066 | Biomi / director / vertical slice (EPIC G).           |
| ☐     | FD-090..098 | QA e release gates (EPIC J).                          |

### Priorità P1

| Stato | Task        | Dettagli operativi                      |
| ----- | ----------- | --------------------------------------- |
| ☐     | FD-070..077 | HUD / UI / telemetry shipping (EPIC H). |
| ☐     | FD-080..085 | Meta slice controllata (EPIC I).        |
| ☐     | FD-100..106 | Cross-repo sync readiness (EPIC K).     |

### Priorità P2

| Stato | Task                             | Dettagli operativi                                                 |
| ----- | -------------------------------- | ------------------------------------------------------------------ |
| ☐     | Registry/docs index polishing    | Rifiniture governance docs.                                        |
| ☐     | Automazioni evolute cross-repo   | Solo dopo freeze e import contract stabile.                        |
| ☐     | Espansioni contenuto post-freeze | Nuove specie, mappe, sistemi profondi, runtime integration estesa. |

## 6. Decisioni aperte sul numbering

Questo registro ha due collisioni di ID ancora non risolte, **intenzionalmente lasciate aperte** per decisione umana:

- **FD-030** e' usato 2 volte:
  1. EPIC C FD-030 "Scrivere Combat Canon Spec" (task di design)
  2. EPIC C FD-030 (in coda) "Rieseguire demo CLI auto" (task di smoke test)
- **FD-030..036** sono usati anche da EPIC D "Balance layer" per i task di audit `trait_mechanics`. Sovrapposizione piena con il range EPIC C.

Opzioni proposte per la risoluzione definitiva:

1. **Prefix per epic**: FD-C030, FD-D030 — piu' verboso ma unambiguo.
2. **Range contigui**: shiftare EPIC D a FD-040..046 e cascatare il resto (EPIC E → FD-050..058, EPIC F → FD-060..068, ecc.). Richiede aggiornamento di tutti i riferimenti in §5.
3. **Numerazione globale**: rinumerare tutti i task in sequenza ignorando i blocchi per epic (FD-001, FD-002, ... FD-NNN).

**Questa decisione va presa dal Master DD** prima che il backlog venga promosso a issue tracker / board esterno. Nel frattempo, la collisione FD-030 e FD-030..036 rimane documentata qui.

## 7. Ready definition per un task

Un task è considerato **Ready** solo se:

- ha owner;
- ha input noti;
- ha file target noti;
- ha criterio di uscita verificabile;
- non richiede chiarimenti di scope fondamentali.

## 8. Done definition per un task

Un task è considerato **Done** solo se:

- la modifica è stata documentata;
- i test/validator richiesti sono stati eseguiti;
- i file toccati sono elencati;
- esiste una nota rollback se il task è ad alto impatto;
- non contraddice freeze, ADR o confine cross-repo.
