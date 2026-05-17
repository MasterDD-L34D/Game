---
title: Evo Final Design — Backlog Register
doc_status: draft
doc_owner: platform-docs
workstream: cross-cutting
last_verified: 2026-04-19
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

> **Unicita' dei FD-IDs**: tutti gli IDs sono unici. Lo schema di numerazione e' "range contigui per epic" (vedi §6) con cuscinetto di `+10` tra epic per consentire l'aggiunta di nuovi task senza cascade. La collisione `FD-030` precedente (3 definizioni) e' stata risolta con cascade documentato il 2026-04-15.

## 4. Backlog per epic

### EPIC A — Governance, docs e baseline

| Stato | Task                                      | Dettagli operativi                                                                                       |
| ----- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| ☑    | FD-000 - Pubblicare source authority map  | DONE: pubblicata in PR #1378. Linkata da freeze, index, playbook, combat hub.                            |
| ☑    | FD-001 - Pubblicare freeze                | DONE: PR #1378. `docs/core/90-FINAL-DESIGN-FREEZE.md` attivo come sorgente master.                       |
| ☑    | FD-002 - Pubblicare roadmap bundle        | DONE: PR #1378. Tutti i 7 file `EVO_FINAL_DESIGN_*` pubblicati.                                          |
| ☑    | FD-003 - Aggiornare docs registry         | DONE: 479 entries in registry. Bundle + combat-canon + trait-trade-offs tutti registrati.                |
| ☑    | FD-004 - Aggiornare index docs            | DONE: freeze e roadmap linkati da combat hub, cross-cutting hub, 00-INDEX. Combat Canon aggiunto.        |
| ☑    | FD-005 - Aprire changelog di final design | DONE: `docs/planning/changelog.md` sezione [2026-04-17] con 24+ PR + rollback plan 03A.                  |
| ☐     | FD-006 - Definire owner matrix definitiva | PENDING: confermare owner logici e owner umani per milestone e gate.                                     |
| ☐     | FD-007 - Congelare pilastri canonici      | PENDING: set unico di pilastri + product boundary.                                                       |
| ☐     | FD-008 - Scrivere overview canonico unico | PENDING: sintesi che unifica overview, core docs, Canvas e deep research.                                |
| ☑    | FD-009 - Formalizzare controllo autorita  | DONE: `EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md` (A0-A5 hierarchy, §4 conflict rules, §5 lookup matrix). |

### EPIC B — Session model, controls e in-match HUD

| Stato | Task                                          | Dettagli operativi                                                                                                                                                                                                                                                      |
| ----- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ☑    | FD-010 - Definire session model               | DONE: ADR-2026-04-16 M1-M17. Round model (planning→commit→resolve) default ON. Legacy removed.                                                                                                                                                                          |
| ☐→☑  | FD-011 - Scrivere controls spec minima        | PARTIAL: Wave 2-7 (M4, 2026-04-18/19) ship input+hover tooltip+range overlay+planning toggle+per-PG abilities panel. Run4 playtest 2026-04-19 rivela 3 P0 gap (ability trigger non scopribile + commit-round crash + ability panel vuoto). Spec formale ancora pending. |
| ☐→☑  | FD-012 - Scrivere HUD in-match spec minima    | PARTIAL: Wave 2-7 ship HUD cosmetic+help overlay+job colors+priority queue+speed label+per-PG panel+events tail. Run4 rivela gap: result persistent visibility + kill chain + enemy inspect separation + unit card legend. Spec formale pending.                        |
| ☑    | FD-013 - Dichiarare boundary gioco vs tooling | DONE: Mission Console ≠ gameplay HUD (ADR-2026-04-14 + serve script #1416).                                                                                                                                                                                             |
| ☐     | FD-014 - Linkare controls/HUD nel freeze      | PENDING: rendere esplicito gap chiuso.                                                                                                                                                                                                                                  |

### EPIC C — Combat canon e resolver

| Stato | Task                                         | Dettagli operativi                                                                                                                                      |
| ----- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ☑    | FD-020 - Scrivere Combat Canon Spec          | DONE: `docs/combat/combat-canon.md` — specifica unificata con action types, status shipping, timing, formule, non-scope.                                |
| ☑    | FD-021 - Bloccare action types shipping      | DONE: attack, move, defend, parry, ability (Fase 3b #1409), heal (#1386). Tutti funzionali.                                                             |
| ☑    | FD-022 - Bloccare status shipping            | DONE: 6 status shipping (bleeding, fracture, disorient, rage, panic, stunned) + 2 placeholder (focused, sbilanciato). Dichiarato in combat-canon.md §2. |
| ☑    | FD-023 - Bloccare PT spend shipping          | DONE: `perforazione` (armor -2) + `spinta` (sbilanciato) implementati in resolver.py. Panic blocca PT. Documentato in combat-canon.md.                  |
| ☑    | FD-024 - Formalizzare timing begin_turn      | DONE: begin_turn/begin_round implementati con tick status, decay, bleeding, buff decay, cooldown. Documentato in round-loop.md.                         |
| ☑    | FD-025 - Formalizzare ordine mitigazioni     | DONE: documentato in combat-canon.md §5 + resolver-api.md: d20→MoS→damage_dice→step_bonus→resist→armor→clamp. Ordine deterministico.                    |
| ☑    | FD-026 - Esplicitare active_effects deferred | DONE: active_effects ora LIVE (Fase 3a #1408 + 3b #1409). 8 ability + attack-triggered trait effects. Non più NOOP.                                     |
| ☐     | FD-027 - Verificare determinismo             | RNG namespacing, seed strategy e ripetibilità risultati.                                                                                                |
| ☑    | FD-028 - Rieseguire suite Python combat      | DONE: 237/237 verdi (resolver + orchestrator + hydration + trait_effects + demo_cli).                                                                   |
| ☑    | FD-029 - Rieseguire suite Node contract      | DONE: 23/23 contract tests verdi (combat + hydration-snapshot + trait-mechanics).                                                                       |
| ☐     | FD-030 - Rieseguire demo CLI auto            | Smoke stabile con log archiviabile.                                                                                                                     |

### EPIC D — Balance layer

| Stato | Task                                     | Dettagli operativi                                                                                                           |
| ----- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| ☑    | FD-040 - Audit `trait_mechanics.yaml`    | DONE: 33/33 trait coperti, tutti con 1+ ability. Audit script eseguito.                                                      |
| ☑    | FD-041 - Tabella mod offensivi/difensivi | DONE: 6 off, 10 def, 1 hybrid, 16 utility. Tabella generata in audit.                                                        |
| ☑    | FD-042 - Verificare AP costs             | DONE: AP 1=11, AP 2=17, AP 3=5. Distribuzione ragionevole.                                                                   |
| ☑    | FD-043 - Rivedere resistenze e cap       | DONE: decisione Master DD = no cap, stacking libero. Fuoco 75% accettato (diversity > hard cap).                             |
| ☑    | FD-044 - Documentare trade-off           | DONE: `docs/combat/trait-trade-offs.md` con 33 sezioni dettagliate per trait.                                                |
| ☑    | FD-045 - Chiudere policy placeholder     | DONE: 16 all-zero-mod trait giustificati da abilities (utility class).                                                       |
| ☑    | FD-046 - Congelare caps PT / PP / SG     | DONE: PT cap=1. PP = combo meter (+hit/kill/assist, sblocca ability). SG = stress burst (individuale). Vedi combat-canon.md. |

### EPIC E — Progression, economy e identity

| Stato | Task                                  | Dettagli operativi                                                                                                                                                              |
| ----- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ☐     | FD-050 - Bloccare economy PE          | Curve, reward sources, pacing e checkpoint.                                                                                                                                     |
| ☐     | FD-051 - Bloccare economy PI          | Costi build, unlock, respec soft.                                                                                                                                               |
| ☐     | FD-052 - Bloccare Seed economy        | Meta bridge controllato, no scope creep.                                                                                                                                        |
| ☐     | FD-053 - Definire conversioni economy | PE→PI, seed acquisition, reward bundle.                                                                                                                                         |
| ☐     | FD-054 - Congelare unlock rules       | Set shipping dichiarato e testabile.                                                                                                                                            |
| ☐     | FD-055 - Build identity matrix        | Specie × Morph × Job × Surge × Bioma.                                                                                                                                           |
| ☐     | FD-056 - MBTI/PF gate soft            | Penalty / surcharge / suggestion model non opaco.                                                                                                                               |
| ☐     | FD-057 - Enneagramma secondario       | Modulo attivo ma non dominante sul balance core.                                                                                                                                |
| ☑    | FD-058 - Chiudere XP Cipher gap       | **Parked** via [ADR-2026-04-17](../adr/ADR-2026-04-17-xp-cipher-official-park.md) (Q-001 T2.1, 2026-04-17). Out of scope: meccaniche XP-like coperte da jobs/mating/VC/economy. |

### EPIC F — Species, morph, jobs, traits, gear

| Stato | Task                                    | Dettagli operativi                                                |
| ----- | --------------------------------------- | ----------------------------------------------------------------- |
| ☐     | FD-060 - Species slice shipping         | Selezione set immediato e set target.                             |
| ☐     | FD-061 - 5 slot morfologici obbligatori | Regola uguale per tutti i PG giocabili.                           |
| ☐     | FD-062 - Budget specie inviolabili      | Nessuna eccezione senza rationale e test.                         |
| ☐     | FD-063 - Morph compatibility table      | Parti, costi, requisiti, warning budget.                          |
| ☐     | FD-064 - Job fantasies finali           | 6 job con fantasy, unlock minimi, dipendenze e debolezze.         |
| ☐     | FD-065 - Job economy alignment          | Uso coerente di PT / PP / SG / PI.                                |
| ☐     | FD-066 - Surge shipping set             | `pierce`, `spin`, `chain`, `pulse`, `overdrive` con note rischio. |
| ☐     | FD-067 - Weapon compatibility           | `twin_blades`, `arc_rod` e compatibilità con surge e job.         |
| ☐     | FD-068 - Traits shipping notes          | `backstab`, `focus_frazionato` e relativi contesti d’uso.         |

### EPIC G — Biomi, NPG, Director, missioni

| Stato | Task                                   | Dettagli operativi                                                      |
| ----- | -------------------------------------- | ----------------------------------------------------------------------- |
| ☐     | FD-070 - Biome shipping set            | Desert, Cavern, Badlands come baseline.                                 |
| ☐     | FD-071 - Impatto sistemico biomi       | Ogni bioma deve toccare visibilità, mobilità o risorse.                 |
| ☐     | FD-072 - Encounter reference per bioma | Almeno un encounter valido e documentato per bioma.                     |
| ☐     | FD-073 - Director minimum output       | species, budget, job, 1–2 unlock, 1–2 traits, gear base, comportamento. |
| ☐     | FD-074 - Mission vertical slice        | 1–2 missioni di riferimento complete.                                   |
| ☐     | FD-075 - Counter surfacing             | Ogni slice deve dichiarare i counter principali.                        |
| ☐     | FD-076 - Reward per bioma              | Token, PE/PI/Seed o modifier coerenti.                                  |

### EPIC H — HUD, UI identità, debrief, telemetry

| Stato | Task                                  | Dettagli operativi                                              |
| ----- | ------------------------------------- | --------------------------------------------------------------- |
| ☐     | FD-080 - Overlay HUD shipping         | Risorse, status, warnings, risk/cohesion.                       |
| ☐     | FD-081 - In-mission surfacing         | Parry, cover, flank, obscured, biome bonus, sinergie attive.    |
| ☐     | FD-082 - Debrief shipping             | VC, PF session, rewards, unlock, suggerimenti.                  |
| ☐     | FD-083 - Meta UI shipping             | Budget morph, gates, recruit/nest/mating prerequisites.         |
| ☐     | FD-084 - Telemetry output contract    | Metriche, export, naming, threshold, owner.                     |
| ☐     | FD-085 - QA dashboard separation      | Distinguere UI giocatore vs dati QA/analytics.                  |
| ☐→☑  | FD-086 - Chiudere HUD overlay storico | Assorbire l’open item storico HUD dentro la UI shipping finale. |
| ☐     | FD-087 - Validare regressioni visuali | Alert leggibili, contrasto eventi, feedback coerenti.           |

### EPIC I — Recruit, Nido, Mating

| Stato | Task                             | Dettagli operativi                                                       |
| ----- | -------------------------------- | ------------------------------------------------------------------------ |
| ☐     | FD-090 - Recruit slice           | Affinity/Trust gating, subset NPG, eccezioni chiare.                     |
| ☐     | FD-091 - Trust/Affinity table    | Range, trigger, decay o stabilizzazione.                                 |
| ☐     | FD-092 - Nido livello 1 shipping | Requisiti minimi, bioma links, benefici reali.                           |
| ☐     | FD-093 - Mating shipping slice   | Gating, output, limiti, no genealogia profonda.                          |
| ☐     | FD-094 - Seed outputs            | Definire se genera 1–2 seed o nuovo membro in casi particolari.          |
| ☐     | FD-095 - Park deep simulation    | Rinviare genetica complessa, genealogie, ecosistema riproduttivo esteso. |

### EPIC J — QA, validator, smoke, release

| Stato | Task                                             | Dettagli operativi                                                         |
| ----- | ------------------------------------------------ | -------------------------------------------------------------------------- |
| ☑    | FD-100 - Rieseguire validator dataset            | DONE: `validate-datasets` → 0 warnings, 14 controlli verdi.                |
| ☑    | FD-101 - Rieseguire ecosystem/package validation | DONE: `validate-ecosystem-pack` → tutti exit 0.                            |
| 🟡    | FD-102 - Rieseguire smoke CLI profili            | PARTIAL: CI green, locale exit 1 (PyYAML env mismatch non bloccante).      |
| ☑    | FD-103 - Rieseguire test web minimi              | SKIP: nessuna UI toccata in sessione 2026-04-17.                           |
| ☐     | FD-104 - Definire playtest matrix                | PENDING: richiede decisioni di game design (scenari, obiettivi, owner).    |
| ☑    | FD-105 - Chiudere triage bug P0/P1               | DONE: 0 issue aperte (33→0 in sessione). Nessun P0/P1 residuo.             |
| ☑    | FD-106 - Preparare changelog                     | DONE: `docs/planning/changelog.md` sezione [2026-04-17] con 24+ PR.        |
| ☑    | FD-107 - Preparare rollback plan 03A             | DONE: rollback plan in changelog §Rollback plan 03A (5 livelli di revert). |
| ☐     | FD-108 - Ottenere approvazione Master DD         | PENDING: gate finale — richiede review umana.                              |

### EPIC K — Game <-> Game-Database

| Stato | Task                                  | Dettagli operativi                                                                                  |
| ----- | ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| ☑    | FD-110 - Mantenere confine attuale    | DONE: confine mantenuto, ADR-2026-04-14 rispettato.                                                 |
| ☑    | FD-111 - Formalizzare import contract | DONE: documentato in EVO_FINAL_DESIGN_GAME_DATABASE_SYNC.md §3 (file→dominio→dest→owner→frequenza). |
| ☑    | FD-112 - Scrivere runbook import      | DONE: runbook in GAME_DATABASE_SYNC.md §4 (sync:evo-pack → evo:import --dry-run/--verbose/--repo).  |
| ☑    | FD-113 - Decidere cadence             | DONE: "manuale durante freeze" — documentato in GAME_DATABASE_SYNC.md §5.                           |
| ☐     | FD-114 - Preparare pattern B          | PENDING: cron job DB-side con PR di sync. Descritto come opzione in SYNC doc §6. Non implementato.  |
| ☑    | FD-115 - Definire trigger futuri      | DONE: trigger di riapertura B/C documentati in GAME_DATABASE_SYNC.md §7 (post-stabilizzazione).     |
| ☑    | FD-116 - Bloccare runtime dependency  | DONE: dichiarato in ADR-2026-04-14 + GAME_DATABASE_SYNC.md: "Game ← HTTP vietato nel freeze scope". |

## 5. Vista priorità

> **Nota**: i range `FD-XXX..YYY` sotto sono informativi e puntano all'epic di riferimento. Post-cascade (2026-04-15) tutti gli ID sono unici; ogni epic ha un range contiguo.

### Priorità P0

| Stato | Task        | Dettagli operativi                               |
| ----- | ----------- | ------------------------------------------------ |
| ☐→☑  | FD-001      | Freeze pubblicato.                               |
| ☐→☑  | FD-002      | Bundle roadmap pubblicato.                       |
| ☐     | FD-010..014 | Session model, controls e HUD in-match (EPIC B). |
| ☐     | FD-020..030 | Combat canon, resolver e test (EPIC C).          |
| ☐     | FD-040..046 | Balance layer audit (EPIC D).                    |
| ☐     | FD-050..058 | Economy, progression e identity (EPIC E).        |
| ☐     | FD-060..068 | Species, morph, jobs, traits, gear (EPIC F).     |
| ☐     | FD-070..076 | Biomi, NPG, Director, missioni (EPIC G).         |
| ☐     | FD-100..108 | QA, validator, smoke, release (EPIC J).          |

### Priorità P1

| Stato | Task        | Dettagli operativi                              |
| ----- | ----------- | ----------------------------------------------- |
| ☐     | FD-080..087 | HUD, UI identità, debrief, telemetry (EPIC H).  |
| ☐     | FD-090..095 | Recruit, Nido, Mating (EPIC I).                 |
| ☐     | FD-110..116 | Game ↔ Game-Database cross-repo sync (EPIC K). |

### Priorità P2

| Stato | Task                             | Dettagli operativi                                                 |
| ----- | -------------------------------- | ------------------------------------------------------------------ |
| ☐     | Registry/docs index polishing    | Rifiniture governance docs.                                        |
| ☐     | Automazioni evolute cross-repo   | Solo dopo freeze e import contract stabile.                        |
| ☐     | Espansioni contenuto post-freeze | Nuove specie, mappe, sistemi profondi, runtime integration estesa. |

## 6. Schema di numerazione FD-IDs

**Schema adottato (2026-04-15)**: **range contigui per epic**. Ogni EPIC ha un range di FD-IDs inviolabile, con uno scarto di `+10` rispetto al precedente per lasciare spazio a nuovi task futuri senza cascade.

| EPIC | Scope                                 | Range FD-IDs  | Tasks |
| ---- | ------------------------------------- | ------------- | ----- |
| A    | Governance, docs, baseline            | `FD-000..009` | 10    |
| B    | Session model, controls, HUD in-match | `FD-010..014` | 5     |
| C    | Combat canon e resolver               | `FD-020..030` | 11    |
| D    | Balance layer                         | `FD-040..046` | 7     |
| E    | Progression, economy, identity        | `FD-050..058` | 9     |
| F    | Species, morph, jobs, traits, gear    | `FD-060..068` | 9     |
| G    | Biomi, NPG, Director, missioni        | `FD-070..076` | 7     |
| H    | HUD, UI identità, debrief, telemetry  | `FD-080..087` | 8     |
| I    | Recruit, Nido, Mating                 | `FD-090..095` | 6     |
| J    | QA, validator, smoke, release         | `FD-100..108` | 9     |
| K    | Game ↔ Game-Database                 | `FD-110..116` | 7     |

**Totale**: 88 task, 88 ID unici, 0 collisioni.

**Regola operativa**: nuovi task si aggiungono riempiendo i gap all'interno del range dell'epic di appartenenza. Se un epic esaurisce il range (es. EPIC B `FD-010..014` → 5 slot), la scelta va al Master DD tra (a) espansione del range prendendo dal cuscinetto successivo, oppure (b) shifting dell'epic successivo con cascade documentato.

**Storia**: fino al 2026-04-15 la collisione `FD-030` triplice (EPIC C Combat Canon Spec + EPIC C demo CLI + EPIC D Audit trait_mechanics) era documentata come decisione aperta. Il cascade "range contigui" e' stato approvato dal Master DD e applicato in questa revisione del registry.

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
