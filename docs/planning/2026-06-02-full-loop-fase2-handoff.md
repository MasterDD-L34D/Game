---
title: 'Handoff full-loop AI-playtest fase-2 + slice extra (composition / routing / PI-sink)'
date: 2026-06-02
type: handoff
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-06-02'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [handoff, full-loop, ai-playtest, fase-2, band-verify, composition, pi-sink, routing]
---

# Handoff — full-loop AI-playtest fase-2 + slice extra (2026-06-02)

> Riprende dopo che il meta-loop e' interamente AI-played (fase-1b) + le band-metriche
> esistono (fase-2). Goal di riferimento: [`2026-06-02-full-loop-fase2-goal.md`](2026-06-02-full-loop-fase2-goal.md)
> (stato finale = BUILD COMPLETE). Report band: [`docs/playtest/2026-06-02-full-loop-band-report.md`](../playtest/2026-06-02-full-loop-band-report.md).
> Memory: `~/.claude/projects/C--dev-Game/memory/project_full_loop_ai_playtest_runner.md`.

## Cosa e' stato fatto (8 PR su main)

| PR                                                       | Commit     | Cosa                                                                   |
| -------------------------------------------------------- | ---------- | ---------------------------------------------------------------------- |
| [#2568](https://github.com/MasterDD-L34D/Game/pull/2568) | `ae855542` | fase-2b: `meta-band-aggregator.js` (5 metriche) + `full-loop-batch.js` |
| [#2569](https://github.com/MasterDD-L34D/Game/pull/2569) | `4a711aba` | fase-2c-1: policy pluggable (`opts.policy`) + `mbti-policy.js`         |
| [#2570](https://github.com/MasterDD-L34D/Game/pull/2570) | `60b5131f` | fase-2c-end: report N=40 + batch ermetico                              |
| [#2571](https://github.com/MasterDD-L34D/Game/pull/2571) | `92185919` | goal-doc -> BUILD COMPLETE (tracker chiuso)                            |
| [#2572](https://github.com/MasterDD-L34D/Game/pull/2572) | `548c7872` | routing wiring (`meta-network-driver.js`) -> chiude Finding 4          |
| [#2573](https://github.com/MasterDD-L34D/Game/pull/2573) | `5403601c` | composizione/P4: `roster_composition` (POLICY-SENSITIVE)               |
| [#2574](https://github.com/MasterDD-L34D/Game/pull/2574) | `0f680125` | PI-sink wired (hybrid perk pick via `/api/progression/:id/pick`)       |

Metodo: TDD red->green (`tests/sim` 24 -> 87), worktree isolati off origin/main, band-safe
(zero engine change: solo `tools/sim/` + `tests/sim/` + docs), 9 Codex P2 presi+risolti
(2 stale-refired post-fix, verificati e NON rifatti), auto-merge L3, AI 500/500.

## Moduli `tools/sim/` (stato)

`combat-policy.js` · `combat-adapter.js` · `campaign-driver.js` · `full-loop-invariants.js`
· `greedy-policy.js` · `mbti-policy.js` (NEW) · `species-roles.js` (NEW) · `recruit-resolver.js`
· `nido-economy.js` · `scenario-enemies.js` · `meta-band-aggregator.js` · `full-loop-batch.js`
· `meta-network-driver.js` (NEW). Test: `tests/sim/*.test.js` = 87.

## Findings (per master-dd)

1. **`completion_rate` = 1.0 OOB (troppo facile, varianza zero)** -> calibrazione difficolta'
   = la precondizione perche' OGNI band sia non-degenere.
2. **P4 ora MISURABILE** via `roster_composition` (era il headline-finding): greedy domina
   `[APEX, HAZARD]`, mbti:ESFP `[HAZARD, PREY]`. Le 5 metriche quantita' restano
   policy-insensitive by design; la composizione no.
3. **PI-sink WIRED ma non spende** nel sim canonico: `piSpentTotal 0 / piPickAttempts 18 /
piInsufficient 0` -> picks BLOCCATI (non PI-insufficiente): il job del roster sim
   (`stalker`) NON e' un perk-job (`perks.yaml` = skirmisher/vanguard/warden/artificer/
   invoker/ranger/harvester) -> 409; + a PE->PI 5:1 il budget (<=4) farebbe 402 comunque.
4. `META_NETWORK_ROUTING` ora esercitato in test-context (no-op chiuso); PROD-enable = verdetto.

## Come continuare (NEXT)

Tutto **master-dd-gated** salvo dove indicato BUILDABLE:

1. **Ratifica i numeri band** (5 range provisional, post-N=40, L-069) -- verdetto umano, NON
   automatizzabile. Il band report e' il deliverable.
2. **BUILDABLE -- Calibrazione difficolta'**: tarare la tier-table scaled-enemy
   (`tools/sim/scenario-enemies.js`) finche' `completion_rate` entra in 0.40-0.70. Metodo:
   N=10 probe -> N=40 ratify (L-069/L-072/L-073: no optimizer-on-noise). Precondizione per
   band non-degeneri (Finding 1).
3. **BUILDABLE -- roster perk-job per il PI-spend**: dare al roster sim un perk-job (es.
   `skirmisher`) cosi' il PI-sink spende davvero (oggi 409) + verificare un piSpentTotal>0
   con un PE che afford il pick (Finding 3). Nota seam: i job combat (`stalker`) != i job
   perk (`perks.yaml`).
4. **deferred**: offspring `lineage_diversity` (la composizione copre il roster, non la
   discendenza); offspring->combat; `META_NETWORK_ROUTING` in PROD (verdetto data-driven).

## Resume trigger (`/goal`)

> _"Leggi docs/planning/2026-06-02-full-loop-fase2-handoff.md + il band report + memory
> project_full_loop. BUILDABLE: (a) calibra la tier-table scaled-enemy (tools/sim/
> scenario-enemies.js) finche' completion_rate entra in 0.40-0.70 -- N=10 probe poi N=40
> ratify (L-069/L-072/L-073) -- ri-gira il band-batch greedy+mbti con composition+PI,
> aggiorna il band report; (b) dai al roster sim un perk-job (skirmisher) cosi' il PI-sink
> spende (oggi 409, job stalker non e' perk-job). TDD, worktree isolato off origin/main,
> band-safe (solo tools/sim+tests/sim+docs), babysit Codex, auto-merge L3. La ratifica dei
> numeri band ESATTI resta verdetto master-dd (L-069)."_
