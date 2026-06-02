---
title: 'GOAL fase-2 -- full-loop AI-playtest balance (scaled enemy + band-metriche + N=40)'
date: 2026-06-02
type: goal
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-06-02'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [goal, full-loop, ai-playtest, balance, band-verify, scaled-enemy, fase-2]
---

# GOAL fase-2 -- full-loop AI-playtest: balance (band sul meta-loop)

> Goal self-contained ed ESEGUIBILE: una sessione lo riprende via `/goal` e costruisce
> senza ri-derivare nulla. Continua il full-loop runner dopo **fase-1b COMPLETA**
> (meta-loop interamente AI-played). Spec di riferimento (band/policy/metodo ancorati a
> fonti): [`2026-06-02-full-loop-ai-playtest-runner-design.md`](../superpowers/specs/2026-06-02-full-loop-ai-playtest-runner-design.md)
> (#2559 §4-8). Memory: `~/.claude/projects/C--dev-Game/memory/project_full_loop_ai_playtest_runner.md`.

## TL;DR

Oggi l'AI gioca il meta-loop intero (campagna -> combat reale -> recruit->combat + economia
Nido + breeding), MA i nemici sono **deboli-fissi** => l'AI vince sempre => **nessuna band
puo' misurare la salute del gioco**. fase-2 rende il combat **vero** e poi **misura** il
meta-loop con band-metriche calibrate N=40 e ratificate da master-dd (come le band combat).
Tre slice in sequenza: **2a scaled enemy** -> **2b band-metriche + aggregatore** -> **2c
N=40 + mbtiPolicy + GAP-C routing + ratifica**.

## Stato corrente (verify-first, 2026-06-02)

| Slice                       | Cosa                                           | Stato  |
| --------------------------- | ---------------------------------------------- | ------ |
| fase-0 #2561 `723b8548`     | combat-policy + combat-adapter (Option B)      | MERGED |
| fase-1b-1 #2562 `c151ce29`  | campaign + combat join (esiti reali)           | MERGED |
| fase-1b-2 #2563 `8c41ce84`  | Nido recruit                                   | MERGED |
| fase-1b-3a #2565 `f7777f28` | recruit -> combat (deriveCombatStats faithful) | MERGED |
| fase-1b-3b #2566 `66bf849b` | Nido economy (earned recruit) + breeding       | MERGED |

**Moduli `tools/sim/` esistenti**: `combat-policy.js`, `combat-adapter.js`, `campaign-driver.js`,
`full-loop-invariants.js`, `greedy-policy.js`, `recruit-resolver.js`, `nido-economy.js`,
`full-loop-runner.js`. Test: `tests/sim/*.test.js` = **24/24**.

## Architettura reale (Option B) -- NON la Option A dello spec

> ATTENZIONE anti-drift: lo spec #2559 §4/§6 descrive Option A (`combatAdapter invoca
ai-driven-sim` via seam `FULL_LOOP_ROSTER`). Il build l'ha **superata** con **Option B
> rifinita**: `combat-adapter.js` e' un modulo NUOVO che chiama `/api/session/start`
> direttamente e riusa `combat-policy.js` (estratto da ai-driven-sim). `ai-driven-sim.js`
> resta INTOCCATO (coop-coupled, non-testabile). Quindi fase-2 estende i moduli `tools/sim/`,
> NON wrappa ai-driven-sim.

Harness: `createApp({databasePath:null})` + supertest (no WS/lobby). `http` iniettato.

## Decomposizione fase-2

### fase-2a -- scaled enemy (FONDAZIONE)

**Perche'**: con nemici deboli-fissi l'AI vince sempre => completion_rate = 100% sempre =>
ogni band-metrica e' priva di senso. Nemici veri = la precondizione per misurare.

**Design (DECISO)**:

- NUOVO `tools/sim/scenario-enemies.js`: porta `buildEnemiesFromYaml` FUORI da
  `tests/smoke/ai-driven-sim.js` (oggi interno al worker coop-coupled, righe ~181-237) in un
  modulo puro. Carica `docs/planning/encounters/<encounter_id>.yaml`, prende la wave con
  `turn_trigger` minimo, espande `units` per `count`, applica la tier-table
  (`base` hp7/mod1, `elite` hp10/mod2, `apex` hp14/mod4). 10 YAML disponibili (tutorial_01/02,
  savana_01, caverna_02, ecc.).
- **MAPPING di shape (load-bearing)**: l'output di `buildEnemiesFromYaml` usa
  `ap_remaining/ap_max/defense/damage/name` -- va MAPPATO alla shape unit del runner
  (`id, species, hp, max_hp, ap, mod, dc, attack_range, position, controlled_by:'sistema',
status`) che `/api/session/start` consuma nel kill-wire path del `combat-adapter`. Verificare
  i nomi-campo con un probe supertest PRIMA (lezione 3a/3b: i seam vanno verificati).
- `full-loop-runner.js`: `enemiesForChapter(step)` -> carica lo YAML del capitolo per `enc`
  (encounter_id da `summary.current_encounter`); **FALLBACK al nemico debole-fisso quando lo
  YAML manca** (es. boss / id non coperti) cosi' il giro completa comunque.

**Conseguenza**: il combat ora puo' **perdere** => si attivano i path defeat/attrition/
roster-wipe (gia' presenti negli invarianti) + il recruit-as-replacement diventa
significativo. Resta **band-safe** (zero engine change; solo `tools/sim/`).

**Test (TDD)**: `scenarioEnemies.test.js` (YAML reale -> nemici scalati, shape corretta,
YAML mancante -> throw/fallback) + `fullLoopRunner.test.js` e2e (capitolo coperto spawna
nemici scalati; YAML mancante -> fallback; loop completa).

**DoD 2a**: `node --test tests/sim/*.test.js` verde; prettier+governance verdi; PR band-safe;
Codex P1/P2 indirizzati+risolti; merge auto-L3.

### fase-2b -- band-metriche + aggregatore batch

**Design (DECISO, definizioni da spec §7)**:

- NUOVO `tools/sim/meta-band-aggregator.js`: data una lista di run-result (`runFullLoop`
  output), calcola le 5 metriche meta + le confronta coi range provisional (sotto). JSONL
  per-run + `summary.json` aggregato (mirror di `batch-ai-runner.js`).
- `full-loop-runner.js`: arricchire il return con la telemetria per-run necessaria
  (gia' presenti: chapters/outcome/finalRoster/recruited/economyRecruited/offspring;
  aggiungere quanto serve a economy_flow [PE guadagnati vs PI spesi] -- leggere dal
  debrief/advance del backend, NON inventare).
- NUOVO `tools/sim/full-loop-batch.js` (o estendere `batch-ai-runner` pattern): gira K run
  con seed diversi -> aggregatore -> summary. Provenance per run: seed + commit + policy +
  scenario-chain + flag-test (spec §10 DoD).

**Le 5 band-metriche** (spec §7, range derivati+citati -- `(WARN Claude-derived, pending
master-dd ratify post-N=40)`):

| Metrica                 | Definizione                                    | Range iniziale (fonte)                                                                                        |
| ----------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `completion_rate`       | % campagne completate su N run                 | **40-70%** (XCOM Long War 2: completabile-ma-dura)                                                            |
| `roster_attrition`      | survivors / roster-iniziale sull'arco          | **>0 & <100%** (XCOM-LW2 attrition + AI War scaling)                                                          |
| `economy_flow`          | PE guadagnati vs PI spesi + drift build-power  | PE->PI **5:1**, PI baseline **7/9/11**, PE tier **3/5/8/12** (`26-ECONOMY` + Machinations + Hades/StS)        |
| `relationship_progress` | rate recruit + trust/affinity buildup + mating | progressione monotona non-stallo (wesnoth + `27-MATING_NIDO`: Aff>=0&Trust>=2 recruit / Trust>=3+nest mating) |
| `offspring_viability`   | offspring generati vs vitali                   | vitali >= soglia, diversita' lineage non-collassata (Niche + Spore complexity-budget)                         |

**Anti-pattern (spec §7)**: NON ottimizzare a single-best (collassa la diversita',
Quality-Diversity). Le band tengono lo spazio sano.

**DoD 2b**: aggregatore testato su run sintetici + reali; JSONL+summary prodotti; band
provisional calcolate (NON ancora ratificate).

### fase-2c -- N=40 + mbtiPolicy + GAP-C routing + ratifica

**Design (DECISO)**:

- **Policy pluggable**: rifattorizzare la policy in un'interfaccia comune (spec §4:
  `choosePath/chooseRecruits/chooseMatings/spendAffinity` -- mappare l'attuale
  greedy-policy `chooseRecruits/chooseCourtship/chooseMating` su questa interfaccia) +
  NUOVO `mbtiPolicy` (scelte meta guidate dal temperamento: INTJ recluta/accoppia != ESFP
  -> testa P4 nel meta-loop; fondato Triangle Strategy recruit-gating + Disco micro-reactivity).
- **GAP-C routing test-context**: girare con env `META_NETWORK_ROUTING=true` (NON `=1` --
  `campaign.js:215` checka `=== 'true'`) per coprire il routing-graph (`selectNextNodes`)
  in test SENZA accenderlo nel gioco live. (Sblocco in PROD = verdetto master-dd separato.)
- **N=40 batch** (L-069 ratify): girare N=40 (eredita l'infra batch di 2b), calcolare band
  placement, confrontare ai range provisional §7. Se si usa MAP-Elites/Optuna per tarare,
  **objective N >= ratify** (L-073: optimizer-on-noise).

**GATE master-dd (owner)**: i **numeri band ESATTI** li ratifica master-dd post-N=40 (come le
band combat). Questo goal definisce il PROCESSO + i range provisional; la ratifica e' un
verdetto umano, NON automatizzabile (L-069).

**DoD 2c**: mbtiPolicy + greedy + (random) girano N=40; band-summary prodotto; report in
`docs/playtest/<date>-full-loop-band/`; presentato a master-dd per ratifica.

## Decisioni risolte (autonome, reversibili) vs gated (master-dd)

**Risolte (procedo)**:

- Architettura = Option B (moduli `tools/sim/`, ai-driven-sim intoccato).
- 2a enemy source = encounter YAML (`buildEnemiesFromYaml` portato) + fallback debole-fisso su YAML mancante.
- 2b metriche = le 5 di spec §7, con i range provisional citati.
- biome mating = 'badlands' (coerente col pool recruit badlands).

**Gated (STOP, owner-gated)**:

- **Ratifica band numbers ESATTI** = master-dd post-N=40 (L-069).
- **`META_NETWORK_ROUTING` in PROD** = verdetto master-dd data-driven (il runner lo
  de-rischia esercitandolo in test-context).
- **offspring -> combat** (risolvere offspring a unita' combattente): genetica offspring->stat,
  deferred (oltre fase-2 o slice dedicata).
- **affinity campaign-scoped** (`/affinity` accetti `campaign_id`) = ENGINE change -- fuori
  band-safe, gated.

## Sequencing + dipendenze

```
2a scaled enemy  (foundation: combat puo' perdere)
   -> 2b band-metriche + aggregatore  (misura: ora le metriche hanno senso)
      -> 2c N=40 + mbtiPolicy + routing-test  (calibra + ratifica master-dd)
```

2b dipende da 2a (senza difficolta' vera le metriche sono degeneri). 2c dipende da 2b
(serve l'aggregatore per N=40). mbtiPolicy puo' partire in parallelo a 2b (e' policy pura)
ma si verifica meglio dopo 2a.

## Metodo + constraints (invarianti per OGNI slice)

- **TDD** red->green; harness `createApp({databasePath:null})` + supertest.
- **Worktree ISOLATO** off origin/main (`git -C C:/dev/Game worktree add C:/dev/_gamewt-<x>
-b claude/<x> origin/main` + `npm ci`). MAI committare sul main checkout `C:/dev/Game`.
- **Band-safe** = ZERO engine change (solo `tools/sim/` + `tests/sim/` + docs). Gate-5
  eccezione methodology-tooling.
- **ADR-0011 trailer** (`Coding-Agent: claude-opus-4.8` + `Trace-Id` uuidv7, NO Co-Authored-By);
  commit lowercase <=72 no-em-dash; prettier pre-commit; governance `--strict` errors=0.
- **NO forbidden paths**: `.github/workflows`, `migrations`, `packages/contracts`, `services/generation`.
- **Babysit Codex** per ogni PR (~2 nudge `@codex review`, ~8min; address P1/P2 + reply +
  resolveReviewThread graphql); auto-merge L3 a CI verde + thread risolti.
- **Post-merge**: `git worktree remove` + `branch -D` + `pull --ff-only`; COLLISION check
  (`git worktree list` + `gh pr list`) PRIMA.
- Gotcha: `node --test tests/sim/*.test.js` (glob, node v24); `.gitignore Lib/` cattura
  `tools/sim/lib/` (usa flat); `META_NETWORK_ROUTING=true` NON `=1`.

## Resume trigger (`/goal`)

> _"Leggi docs/planning/2026-06-02-full-loop-fase2-goal.md + memory project_full_loop. Costruisci
> fase-2a (scaled-enemy: porta buildEnemiesFromYaml in tools/sim/scenario-enemies.js, mappa shape,
> fallback su YAML mancante; verify-first il probe shape PRIMA) -> poi 2b (meta-band-aggregator +
> batch) -> poi 2c (mbtiPolicy + META_NETWORK_ROUTING=true + N=40, band provisional §7, ratifica
> master-dd). TDD, worktree isolato off origin/main, band-safe, babysit Codex, auto-merge L3."_
