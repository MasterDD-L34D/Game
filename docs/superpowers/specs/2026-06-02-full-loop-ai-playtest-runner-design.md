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
    eng-graph,
    pending-design,
  ]
---

# Full-loop AI-playtest runner — design

> **Stato**: brainstorm → spec v2 (grounded), **gated** sul tuo OK (nessun build finché non approvi).
> Estende il metodo di validazione canonico (AI giocano via CLI/sim, band-verify N=40) dal **combat** al
> **meta-loop**. v2 ancora ogni decisione alle fonti autoritative (governance codemasterdd + manuali
> GM/gamebuilding + ref di design validati + postmortem + eng-graph). Memory: [[feedback-ai-playtest-is-the-nord]].

## 1. Problema (il gap, verify-first 2026-06-02)

Il "Nord" qualità del progetto è l'**AI-playtest**: agenti AI giocano encounter reali via il round-engine,
in batch statistici, con verifica a **win-rate band** (`ai-driven-sim.js` + `batch-ai-runner.js` +
`batch_calibrate_*.py` + MAP-Elites/Optuna). **Ma copre solo il combat.** Audit copertura full-loop:

| Pezzo esistente                                     | Cosa fa                                                              | Limite                                                                |
| --------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `tools/sim/ai-driven-sim.js` + `batch-ai-runner.js` | AI giocano combat reale (archetype × scenario), JSONL, win-rate band | **combat-only** (carica `encounters/*.yaml`, niente campaign/Nido)    |
| `tests/api/campaignIntegration.test.js`             | E2E catena campagna (start→advance→choose→summary→end)               | esiti combat **FINTI** (`outcome:'victory'` stampato, non giocato)    |
| `tools/playtest/phase_walkthrough.sh`               | Walkthrough coop phase-machine (lobby→…→debrief) via REST            | **scriptato** (5 player fissi), combat snapshot-only, no AI, no batch |
| Nido / mating / recruit / affinity / trust          | backend live + test unitari/integrazione                             | **nessun AI-playtest batch** del meta-loop                            |

**Il gap esatto**: il combat è AI-giocato in isolamento; la campagna è testata con esiti finti; i due **non
sono mai uniti sotto AI-play**. Nessuna band misura la salute del **meta-loop**. Conseguenza: bug
d'integrazione + regressioni "Engine LIVE / Surface DEAD" nel meta-loop **non sono intercettati da nulla** oggi.

**Verify-first via eng-graph (governance)**: prima di costruire, interrogare il knowledge-graph
d'ingegneria del vault (`Vault-ops-remote/scripts/eng_graph` + cognee GRAPH_COMPLETION, Phase-3 DONE, 691
nodi/1175 edge, sovrano Ryzen-Ollama) per confermare che nessun harness equivalente esista già
(anti-shadow-duplicate). Vedi §9.

## 2. Goal / Non-goal

**Goal**: un harness dove l'AI gioca il **loop intero** — `campagna → combat REALE → debrief → decisioni
Nido (recruit/mating/affinity) → missione successiva` — in batch, prima per **integrazione** (regge?), poi
per **balance** (band sul meta-loop).

**Non-goal** (YAGNI): NON è una UI; NON sostituisce il combat-sim (lo riusa); NON tocca l'engine (solo
orchestrazione via seam HTTP esistenti); NON è il playtest umano (deprecato come Nord); NON costruisce
surface Godot (lavoro separato); NON accende `META_NETWORK_ROUTING` in prod (solo nel proprio contesto-test, §9).

## 3. Approccio scelto — A: orchestratore che compone

Nuovo `tools/sim/full-loop-runner.js` che **riusa** `ai-driven-sim.js` per il combat e guida campagna+Nido
via i seam HTTP esistenti. **Zero modifiche all'engine.** Rispecchia il pattern `batch-ai-runner` (familiare,
JSONL-aggregate). Reversibile (tool nuovo, opt-in). Riferimenti architetturali validati
(`external-references.md` §A): **boardgame.io** (interface bot MCTS = blueprint per `metaPolicy`),
**wesnoth** (AI composite + recruit/retain economy = 20 anni di proof data-driven).

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
  un modulo con questi 4 metodi puri (interface = boardgame.io bot pattern). MVP = `greedyPolicy`; fase-2 =
  `mbtiPolicy`, `randomPolicy` (mirror dei profili archetype combat).
- `combatAdapter.runEncounter(scenarioId, roster, seed) → { outcome, telemetry }` — esegue l'encounter con
  il roster REALE della campagna e ritorna l'esito vero per `/campaign/advance`.
  ⚠️ **Prerequisito fase-0 (Codex #2559 P2)**: `tests/smoke/ai-driven-sim.js` oggi **hardcoda** la party
  (`Skiv` + `AiChar*`, righe ~456-464) prima di `/session/start` → wrappare il worker così com'è
  IGNOREREBBE il roster di campagna (combat su party fissa → invarianti roster/attrition falsi-verdi).
  Serve un **seam roster-injection**: parametro/env (`--roster <json>` / `FULL_LOOP_ROSTER`) che sostituisce
  il blocco party hardcoded con il roster passato. Modifica piccola e isolata al TEST-harness (non l'engine),
  TDD. Alternativa: il combatAdapter guida direttamente `/session/start`(roster reale)+`/round/execute` (path
  kill-wire) riusando solo il loop di decisione di ai-driven-sim, non la sua party.

## 5. Data flow (sequenza del loop)

```
campaign/start(player_id, seed)
repeat per capitolo:
  scenario   ← capitolo corrente (meta-network/next se flag-test ON, else chain lineare)
  roster     ← roster persistito della campagna (party_rosters / Nido)
  {outcome, telemetry} ← combatAdapter.runEncounter(scenario, roster, seed)   # COMBAT REALE
  campaign/advance(outcome, pe_earned da telemetry)                            # esito vero propagato
  debrief    ← rewards PE→PI dal backend
  meta-step  ← metaPolicy: choosePath / chooseRecruits / chooseMatings / spendAffinity (route Nido/mating)
  invariantChecker(state)                                                      # FASE 1
  metaBandAggregator.record(state, telemetry)                                  # FASE 2
until campagna completa O defeat-cap O round-cap
emit run JSONL
```

## 6. Fase 1 — integrazione (MVP)

**Policy `greedyPolicy`** — fondata sui **manuali GM/gamebuilding** + **postmortem** (no euristiche a caso):

- path: primo valido / max-weight (Dormans lock-and-key, già in `selectNextNodes`).
- recruit: max-affinità verso soglia (wesnoth recruit/retain economy).
- mating: coppie eleggibili per complexity-budget (Niche eredità discreta, già in `rollMatingOffspring`).
- affinity-spend: sul partner più vicino alla soglia — analogo al metodo "Creazione di una Scorta di Tesori"
  del manuale GM (vault `Cards/gamemastering`): allocare la ricompensa dove massimizza il valore-per-soglia.
- Deterministico (seed). Obiettivo: una policy "GM ragionevole", non ottimale (vedi §8 per il criterio).

**Invarianti asseriti** (`invariantChecker`, fail = run RED + dump stato):

1. Nessun crash / 5xx su tutto il loop end-to-end.
2. Economia non-negativa e coerente: PE ≥ 0, PI ≥ 0, **PE→PI = 5:1** (SoT `26-ECONOMY`), nessun spend > saldo,
   PI accumulabile entro il budget baseline **7/9/11** (base/veteran/elite, SoT §PI).
3. Stato campagna valido: capitoli monotoni, outcome ∈ {victory,defeat,timeout}, no completata con buchi.
4. Roster coerente: nessun PG duplicato/fantasma; morti rimossi; recruit aggiunge esattamente N; mating
   genera offspring con lineage valido (geneEncoder).
5. Esito combat REALE propagato (no `outcome` finto): `pe_earned` da telemetria = quanto il backend accredita.
6. **Identità roster (Codex #2559 P2)**: gli unit-id che combattono = gli id del roster di campagna corrente
   (recruited/dead/offspring inclusi), NON la party hardcoded Skiv/AiChar. Senza questo, gli invarianti 4+
   passerebbero su una party fissa fresca → falso-verde; questo invariante CHIUDE quel buco ed è il gate del
   prerequisito fase-0 (il seam roster funziona davvero).

**Output MVP**: `docs/playtest/<date>-full-loop-mvp/runs/*.jsonl` + `summary.json`. **Valore immediato**:
cattura "Engine LIVE / Surface DEAD" + rotture d'integrazione meta-loop che oggi niente intercetta — alla
scala batch del combat-sim.

## 7. Fase 2 — balance (band sul meta-loop)

Band-metriche ("win-rate del meta"), ognuna con range **derivato da fonte autoritativa** (non placeholder),
poi calibrato N=40 (L-069) e **ratificato master-dd** (come le band combat):

| Metrica meta            | Definizione                                    | Derivazione del range (fonte citata)                                                                                                                                                                                                                                                   |
| ----------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `completion_rate`       | % campagne completate su N run                 | **XCOM Long War 2** (completabile-ma-dura, pod>HP philosophy) → range iniziale **40–70%** (né wipe-garantito né passeggiata)                                                                                                                                                           |
| `roster_attrition`      | survivors / roster-iniziale sull'arco          | **XCOM Long War 2** attrition + **AI War** scaling difficoltà co-op → attrition **>0 ma <100%** (perdite reali, non wipe)                                                                                                                                                              |
| `economy_flow`          | PE guadagnati vs PI spesi + drift build-power  | **`26-ECONOMY`** (PE→PI 5:1, PI baseline 7/9/11, PE tier 3/5/8/12) + GM-manual "valori medi oggetti" (reward-curve per tier) + **Machinations** (`docs/balance/MACHINATIONS_MODELS.md`) + Hades/StS/Monster-Train (tier-currency) → PI accumulati entro baseline, drift power < soglia |
| `relationship_progress` | rate recruit + buildup trust/affinity + mating | **wesnoth** recruit/retain + SoT `27-MATING_NIDO` (Aff≥0&Trust≥2 recruit / Trust≥3+nest mating) → progressione monotona non-stallo                                                                                                                                                     |
| `offspring_viability`   | offspring generati vs vitali                   | **Niche** (eredità Mendeliana discreta) + **Spore** complexity-budget + Binding-of-Isaac/System-Shock-2 (build-variety emergente, postmortem) → offspring vitali ≥ soglia, diversità lineage non-collassata                                                                            |

**Policy diverse** (esplorano lo spazio come gli archetype combat): `greedy`, `random`, e — interessante —
`mbtiPolicy` (scelte meta guidate dal temperamento: INTJ recluta/accoppia ≠ ESFP → **testa P4 nel meta-loop**;
fondato su Triangle Strategy recruit-gating + Disco micro-reactivity). Riuso possibile di MAP-Elites/Optuna
(fase-2-late) per tarare le band — **ma objective N ≥ ratify (L-073: optimizer-on-noise)**.

**Anti-reference** (games-source-index): NON ottimizzare il meta-loop a un single-best (collassa la
diversità — anti-pattern Quality-Diversity); le band tengono lo spazio sano, non cercano "la build dominante".

## 8. Metodo di decisione autonoma (meta-regola riusabile)

> Risposta alla direttiva: «usa i manuali + i riferimenti validati per scegliere in autonomia ogni volta che
> ci sono decisioni del genere». Ogni decisione di design dell'harness segue **quest'ordine di autorità**:

1. **Governance codemasterdd** (A0 decisioni): `codemasterdd-ai-station/{DECISIONS_LOG,OPEN_DECISIONS}.md` +
   `OPEN_DECISIONS.md`/`docs/adr/` di Game. Se una decisione è già stata presa → la si applica, non si re-decide.
2. **Manuali GM/gamebuilding** (principi): vault `Atlas/gamemastering-moc.md` + `Cards/pathfinder-library/`
   (kobold guide to game design, gamemastery guide) + `Cards/guida-completa-creazione-dungeon-e-mondi` +
   `external-references.md` §H (Art of Game Design "lenti", Lost Garden "loops & arcs", Theory of Fun). Danno
   i principi di encounter/reward/pacing/difficoltà.
3. **Riferimenti di design validati** (pattern): `games-source-index.md` (mappa pilastro → top-3 source +
   anti-reference) + museum cards + ADR + `Machinations` models + `cross-game-extraction-MASTER.md`.
4. **Verifica eng-graph** (anti-dup + struttura): interroga/aggiorna il knowledge-graph d'ingegneria del vault
   (§9) prima di introdurre un nuovo modulo.

Output di ogni decisione = verdetto **citato** (quale fonte), con `(⚠️ Claude autonomous — pending master-dd)`
sui fork di balance soggettivi (no-anticipated-judgment) + museum card per gli scartati. Questo metodo è
**il deliverable riusabile** oltre l'harness: vale per ogni decisione-di-design futura.

## 9. GAP-C routing-graph + eng-graph (verifica) — direttiva #4

**GAP-C (routing-graph del gioco)**: il flag `META_NETWORK_ROUTING` è OFF in prod (STOP master-dd). MA il
runner può **attivarlo nel SUO contesto-test** (env `META_NETWORK_ROUTING=1` solo per i propri processi, come
la sim setta `AI_SIM_LOAD_YAML=1`) → esercita il routing-graph Dormans (`selectNextNodes` → `candidates`,
NON `.preview`) **senza accenderlo nel gioco live**. Beneficio: il meta-loop band ottiene copertura su
**rotte ramificate diverse** (non solo la chain lineare) → validazione più ricca del routing + dati per
decidere se/quando sbloccarlo in prod. **Lo sblocco-prod resta verdetto tuo**; il runner lo de-rischia
giocandoci sopra prima.

**eng-graph (verifica struttura/governance, NON runtime di gioco)**: il vault ha un knowledge-graph
d'ingegneria (`eng_graph_extract.py` → subsystems/modules → bridge-notes in `Atlas/engineering-moc.md`;
Phase-3 cognee GraphRAG, 691 nodi/1175 edge, sovrano Ryzen-Ollama). Due usi:

1. **Verify-first (pre-build)**: query GRAPH_COMPLETION ("esiste già un harness full-loop / un runner
   campaign+combat?") per anti-shadow-duplicate prima di scrivere `full-loop-runner.js`.
2. **Registrazione (post-build)**: rilanciare l'estrattore sul repo Game → il nuovo subsystem `tools/sim`
   full-loop entra nel grafo-ingegneria del vault (governance: il vault sa che esiste). Sovrano, batch/cron.

## 10. Definition of Done

- **Gate-5**: eccezione esplicita **methodology tooling** (il "player" = analista calibrazione; surface =
  report band JSONL). Non serve surface Godot.
- **TDD**: ogni unità (campaignDriver, combatAdapter, metaPolicy, invariantChecker) con test red→green.
- **Reversibile + opt-in**: tool nuovo sotto `tools/sim/`, invocazione esplicita (no auto-run CI default).
  **Band-neutral per l'engine**: zero modifiche a `apps/backend` (solo lettura HTTP) → suite AI 500/500 invariata.
- **Provenance**: ogni run JSONL stampa seed + commit + policy + scenario chain + flag-test attivi (riproducibile).
- **eng-graph**: verify-first pre-build (query) + registrazione post-build (estrattore) — §9.
- **Decisioni citate**: ogni scelta di design segue §8 (fonte citata; fork balance → markup pending master-dd).

## 11. Domande aperte residue (per master-dd, post-grounding)

> Le 5 domande v1 sono **risolte** dalle direttive (band=derivate+citate §7; policy=postmortem/GM §6;
> metodo=§8; GAP-C=flag-test §9; compute=MVP N=10-20 → fase-2 N=40 §6/§7). Residuo gated:

1. **Sblocco `META_NETWORK_ROUTING` in PROD** — il runner lo esercita in test-context; accenderlo nel gioco
   live resta verdetto tuo (STOP). Il runner produce i dati per decidere.
2. **Band-target finali** — i range §7 sono derivati+citati, ma i numeri esatti li ratifichi tu post-N=40
   (come le band combat). `(⚠️ Claude-derived — pending master-dd ratify)`.
3. **Scope arco MVP** — proposto cave_path completo (~3-5 missioni); estendibile.

## 12. Provenienza

- **Metodo Nord**: [[feedback-ai-playtest-is-the-nord]] + `tools/sim/ai-driven-sim.js` / `batch-ai-runner.js`.
- **Seam meta**: `apps/backend/routes/campaign.js` (start/advance/choose/summary/meta-network/seasonal/ambitions)
  - route Nido/mating/recruit + `/coop/combat/end` (fold SistemaState).
- **Esistente full-loop** (limiti): `tests/api/campaignIntegration.test.js`, `tools/playtest/phase_walkthrough.sh`,
  `docs/playtest/2026-04-26-coop-full-loop-playbook.md`, `2026-05-25-m1-sistema-live-loop.md`.
- **Manuali GM/gamebuilding**: vault `Atlas/gamemastering-moc.md` + `Cards/pathfinder-library/`
  (kobold/gamemastery) + `Cards/guida-completa-creazione-dungeon-e-mondi` + `external-references.md` §H.
- **Postmortem/ref**: `games-source-index.md` (XCOM Long War 2, Hades/StS/Monster Train, wesnoth, Niche, AI War)
  - `external-references.md` §E + `cross-game-extraction-MASTER.md` + `Machinations` (`docs/balance/MACHINATIONS_MODELS.md`).
- **Governance**: `codemasterdd-ai-station/{DECISIONS_LOG,OPEN_DECISIONS}` + `26-ECONOMY_CANONICAL` + `27-MATING_NIDO`.
- **eng-graph**: vault `docs/research/eng-graph-phase{1,2,3}-2026-05-26.md` + `Vault-ops-remote/scripts/eng_graph`.
- **Pilastri**: P2 (offspring/lineage), P5 (co-op campaign), P6 (band-verify methodology), P4 (mbtiPolicy).

```

```
