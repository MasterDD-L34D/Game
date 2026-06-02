---
title: 'Full-loop AI-playtest runner — design (meta-loop validation harness)'
date: 2026-06-02
workstream: ops-qa
category: spec
doc_status: review_needed
doc_owner: master-dd
language: it
review_cycle_days: 30
tags:
  [
    ai-playtest,
    meta-loop,
    calibration,
    harness,
    campaign,
    nido,
    mating,
    band-verify,
    pending-design,
  ]
---

# Full-loop AI-playtest runner — design

> **Stato**: brainstorm → spec, **gated** sul tuo OK (nessun build finché non approvi lo spec).
> Estende il metodo di validazione canonico (AI giocano via CLI/sim, band-verify N=40) dal **combat**
> al **meta-loop**. Memory: [[feedback-ai-playtest-is-the-nord]].

## 1. Problema (il gap, verify-first 2026-06-02)

Il "Nord" qualità del progetto è l'**AI-playtest**: agenti AI giocano encounter reali via il round-engine,
in batch statistici, con verifica a **win-rate band** (`ai-driven-sim.js` + `batch-ai-runner.js` +
`batch_calibrate_*.py` + MAP-Elites/Optuna). **Ma copre solo il combat.** Audit della copertura full-loop:

| Pezzo esistente                                     | Cosa fa                                                              | Limite                                                                |
| --------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `tools/sim/ai-driven-sim.js` + `batch-ai-runner.js` | AI giocano combat reale (archetype × scenario), JSONL, win-rate band | **combat-only** (carica `encounters/*.yaml`, niente campaign/Nido)    |
| `tests/api/campaignIntegration.test.js`             | E2E catena campagna (start→advance→choose→summary→end)               | esiti combat **FINTI** (`outcome:'victory'` stampato, non giocato)    |
| `tools/playtest/phase_walkthrough.sh`               | Walkthrough coop phase-machine (lobby→…→debrief) via REST            | **scriptato** (5 player fissi), combat snapshot-only, no AI, no batch |
| Nido / mating / recruit / affinity / trust          | backend live + test unitari/integrazione                             | **nessun AI-playtest batch** del meta-loop                            |

**Il gap esatto**: il combat è AI-giocato in isolamento; la campagna è testata con esiti finti; i due **non
sono mai uniti sotto AI-play**. Nessuna band misura la salute del **meta-loop** (sopravvivenza roster,
economia PE→PI, recruit/trust/mating, offspring, completion-rate). Conseguenza: bug d'integrazione +
regressioni "Engine LIVE / Surface DEAD" nel meta-loop **non sono intercettati da nulla** oggi.

## 2. Goal / Non-goal

**Goal**: un harness dove l'AI gioca il **loop intero** — `campagna → combat REALE → debrief → decisioni
Nido (recruit/mating/affinity) → missione successiva` — in batch, prima per **integrazione** (regge?), poi
per **balance** (band sul meta-loop).

**Non-goal** (YAGNI): NON è una UI; NON sostituisce il combat-sim (lo riusa); NON tocca l'engine (solo
orchestrazione via seam HTTP esistenti); NON è il playtest umano (deprecato come Nord); NON costruisce
surface Godot (lavoro separato).

## 3. Approccio scelto — A: orchestratore che compone

Nuovo `tools/sim/full-loop-runner.js` che **riusa** `ai-driven-sim.js` per il combat e guida campagna+Nido
via i seam HTTP esistenti. **Zero modifiche all'engine.** Rispecchia il pattern `batch-ai-runner` (familiare,
JSONL-aggregate). Reversibile (tool nuovo, opt-in).

Alternative scartate: **B** estendere `ai-driven-sim.js` in-place (gonfia il combat-sim, mescola concern,
fragile); **C** estendere i `batch_calibrate_*.py` Python (i seam campaign/Nido sono Node-side; il combat-sim
è JS → il Python ri-implementerebbe l'orchestrazione HTTP). A vince su isolamento + riuso + reversibilità.

## 4. Architettura (unità isolate, ognuna uno scopo)

```
full-loop-runner.js (orchestratore)
 ├─ campaignDriver        — guida /api/campaign/{start,advance,choose,summary,end,meta-network/next}
 ├─ combatAdapter         — invoca ai-driven-sim per UN encounter, ritorna esito REALE (win/loss + telemetria)
 ├─ metaPolicy (pluggable)— decide le scelte meta: path, recruit, mating, affinity-spend (interface comune)
 ├─ invariantChecker      — FASE 1: asserisce invarianti dopo ogni step (no-crash, econ≥0, stato valido)
 ├─ metaBandAggregator    — FASE 2: raccoglie metriche meta per run → JSONL → band-summary
 └─ output                — runs/*.jsonl (per-run) + summary.json (aggregato) [mirror batch-ai-runner]
```

**Contratti (interface)**:

- `metaPolicy.choosePath(candidates) → nodeId` · `metaPolicy.chooseRecruits(eligibles) → ids[]` ·
  `metaPolicy.chooseMatings(pairs) → pairs[]` · `metaPolicy.spendAffinity(state) → actions[]`. Una policy =
  un modulo che implementa questi 4 metodi puri. MVP = `greedyPolicy`; fase-2 = `mbtiPolicy`, `randomPolicy`,
  ecc. (mirror dei profili archetype combat).
- `combatAdapter.runEncounter(scenarioId, roster, seed) → { outcome, telemetry }` — wrappa `ai-driven-sim`
  passando il roster REALE della campagna (non un roster fisso) e ritorna l'esito vero per `/campaign/advance`.

## 5. Data flow (sequenza del loop)

```
campaign/start(player_id, seed)
repeat per capitolo:
  scenario   ← capitolo corrente (meta-network/next se flag, else chain lineare)
  roster     ← roster persistito della campagna (party_rosters / Nido)
  {outcome, telemetry} ← combatAdapter.runEncounter(scenario, roster, seed)   # COMBAT REALE
  campaign/advance(outcome, pe_earned da telemetry)                            # esito vero propagato
  debrief    ← rewards PE→PI dal backend
  meta-step  ← metaPolicy: choosePath / chooseRecruits / chooseMatings / spendAffinity
               applicati via route Nido/mating/recruit
  invariantChecker(state)                                                      # FASE 1
  metaBandAggregator.record(state, telemetry)                                  # FASE 2
until campagna completa O defeat-cap O round-cap
emit run JSONL
```

## 6. Fase 1 — integrazione (MVP)

**Policy**: `greedyPolicy` (path: primo valido / max-weight; recruit: max-affinità; mating: coppie eleggibili;
affinity: spendi sul partner più vicino alla soglia). Deterministico (seed).

**Invarianti asseriti** (`invariantChecker`, fail = run RED + dump stato):

1. Nessun crash / 5xx su tutto il loop end-to-end.
2. Economia non-negativa e coerente: PE ≥ 0, PI ≥ 0, PE→PI = 5:1 (SoT 26-ECONOMY), nessun spend > saldo.
3. Stato campagna valido: capitoli monotoni, outcome ∈ {victory,defeat,timeout}, no campagna completata con
   capitoli mancanti.
4. Roster coerente: nessun PG duplicato/fantasma; morti rimossi; recruit aggiunge esattamente N; mating
   genera offspring con lineage valido (geneEncoder).
5. Esito combat REALE propagato (no `outcome` finto): `pe_earned` da telemetria = quanto il backend accredita.

**Output MVP**: `docs/playtest/<date>-full-loop-mvp/runs/*.jsonl` + `summary.json` (run completate, invarianti
falliti per categoria, campioni di failure). **Valore immediato**: cattura "Engine LIVE / Surface DEAD" +
rotture d'integrazione meta-loop che oggi niente intercetta — alla scala batch del combat-sim.

## 7. Fase 2 — balance (band sul meta-loop)

Aggiunge le **band-metriche** ("win-rate del meta"), ognuna con band target (placeholder → calibrate N=40):

| Metrica meta            | Definizione                                                      | Reference-game (perché)                                       |
| ----------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------- |
| `completion_rate`       | % campagne completate su N run                                   | XCOM Long War 2 (campagna deve essere completabile-ma-dura)   |
| `roster_attrition`      | survivors / roster-iniziale sull'arco                            | XCOM Long War 2 (attrition gestita, non wipe né zero-rischio) |
| `economy_flow`          | PE guadagnati vs PI spesi + drift build-power per capitolo       | Hades / Slay-the-Spire / Monster Train (economia meta sana)   |
| `relationship_progress` | rate recruit + buildup trust/affinity + mating riusciti          | (sistema sociale del gioco — P5/P2)                           |
| `offspring_viability`   | offspring generati vs vitali (complexity-budget, lineage valido) | (Spore Moderate — P2)                                         |

**Policy diverse** (esplorano lo spazio meta come gli archetype combat): `greedy`, `random`, e — interessante
per il gioco — `mbtiPolicy` (le scelte meta guidate dal temperamento: un INTJ recluta/accoppia diversamente da
un ESFP → **testa P4 nel meta-loop**). Riuso possibile di MAP-Elites/Optuna (fase-2-late) per tarare le band.

**Anti-reference** (games-source-index): NON ottimizzare il meta-loop a un single-best (collassa la diversità);
le band servono a tenere lo spazio sano, non a trovare "la build dominante".

## 8. Definition of Done

- **Gate-5**: eccezione esplicita **methodology tooling** (il "player" di un harness = l'analista
  calibrazione; la surface = il report band JSONL). Non serve surface Godot.
- **TDD**: ogni unità (campaignDriver, combatAdapter, metaPolicy, invariantChecker) con test red→green.
- **Reversibile + opt-in**: tool nuovo sotto `tools/sim/`, invocazione esplicita (nessun auto-run in CI di
  default; opt-in come `batch-ai-runner`). **Band-neutral per l'engine**: zero modifiche a `apps/backend`
  (solo lettura via HTTP) → suite AI 500/500 invariata.
- **Provenance**: ogni run JSONL stampa seed + commit + policy + scenario chain (riproducibile, come il
  combat-sim).

## 9. Rischi / domande aperte (per master-dd)

1. **Band-target meta**: i valori band (completion-rate %, attrition %) sono **leve di design** non
   pre-derivabili → fase-2 propone + calibra N=40, ma i target finali = verdetto tuo (come le band combat).
2. **metaPolicy "intelligenza"**: quanto deve essere "brava" la greedy MVP? Una policy troppo stupida fa
   fallire il loop per scelte assurde (falso-negativo); troppo brava nasconde i problemi. → MVP = greedy
   "ragionevole", documentata.
3. **Scope capitoli**: quanti capitoli/missioni per run (arco completo vs slice)? MVP propone arco corto
   (cave_path completo, ~3-5 missioni) → estendibile.
4. **meta-network flag**: il routing GAP-C è dietro `META_NETWORK_ROUTING` OFF. MVP usa la chain lineare
   esistente; il routing graph è un'estensione fase-2 (quando/se attivi il flag).
5. **Costo compute**: il full-loop è N× più pesante di un encounter (più combat per run). MVP = N piccolo
   (10-20 run) per integrazione; fase-2 N=40 per band (parallelizzabile come `calibrate_parallel`).

## 10. Provenienza

- Metodo Nord: [[feedback-ai-playtest-is-the-nord]] + `tools/sim/ai-driven-sim.js` / `batch-ai-runner.js`.
- Seam meta: `apps/backend/routes/campaign.js` (start/advance/choose/summary/meta-network/seasonal/ambitions)
  - route Nido/mating/recruit + `/coop/combat/end` (fold SistemaState).
- Esistente full-loop (limiti): `tests/api/campaignIntegration.test.js`, `tools/playtest/phase_walkthrough.sh`,
  `docs/playtest/2026-04-26-coop-full-loop-playbook.md`, `2026-05-25-m1-sistema-live-loop.md`.
- Reference-game: `docs/guide/games-source-index.md` (meta-progression: Hades/StS/Monster Train; campaign:
  XCOM Long War 2; reward-choice: Into the Breach) + `docs/research/2026-04-26-cross-game-extraction-MASTER.md`.
- Pilastri toccati: P2 (offspring/lineage), P5 (co-op campaign), P6 (band-verify methodology).

```

```
