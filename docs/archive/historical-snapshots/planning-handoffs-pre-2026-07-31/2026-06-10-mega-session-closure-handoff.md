---
title: 'Handoff chiusura mega-sessione 2026-06-10 (Ryzen) -- governance+SPEC-M/I+OD-058+chip-rounds'
date: 2026-06-10
type: handoff
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-06-11
source_of_truth: false
language: it
review_cycle_days: 30
tags: [evo-tactics, handoff, session-closure, od-058, spec-i, spec-m, governance]
---

# Handoff chiusura mega-sessione 2026-06-10 (Ryzen)

Sessione singola ~24h, **~30 PR merged** su main (#2694..#2730) tra sessione
principale, 7+ chip paralleli e sync cross-machine Lenovo. Entry point della
prossima sessione = questo doc + riga Sessione D/E in CLAUDE.md.

## Cosa e' SHIPPED (macro)

| Filone                    | Esito                                                                                                                                                                                                                                                                                       |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Governance disk->registry | check `unregistered_document` (#2694) + bulk-register 246 legacy (#2695) + burn-down batch-2 (#2726) + verdetti STALE-B2 (#2728). Stale 397 -> **362**, mismatch 0, errors 0.                                                                                                               |
| SPEC-M                    | flip `active`: MA3 mapping + name_pool 32 + `MAX_FP_VC_DELTA=0.05` RATIFIED-PROVISIONAL (#2699/#2701, probe paired `fp-delta-probe`)                                                                                                                                                        |
| SPEC-I                    | flip `active`: ER1 role-gap wire (#2704) + fork ER6/ER7 ratificati (#2705) + ER6 StressWave build (#2712) + ER7 population build flag-OFF (#2723) + **N=40 gates PASSED -> ER1+ER6 default ON** (#2725)                                                                                     |
| OD-058                    | **COMPLETO, tracker #2531 CHIUSO 13/13**: D1 overcharge evidence (#2713, coupling ratify-as-built), D2 read-apply+N=40 (#2714), D2-cutover wound V2 LIVE default ON (#2720), D3 vcSnapshot ledger replay coop server-authoritative (#2722), D4 electric (#2715, valori ratificati), D5 docs |
| Coop quorum family        | host TV-mirror vs host-plays coerente su WS+REST (#2707/#2708/#2711)                                                                                                                                                                                                                        |
| Surfaces                  | hint overcharge first-use (#2721+#2727), telegraph stresswave chip (#2712), biome wounded (pre-esistente)                                                                                                                                                                                   |
| Fix critici               | **#2730 spawner position drift** (#2724: rinforzi round-model MAI spawnati -- array vs {x,y}; era closed col bug vivo, riaperta e fixata TDD) + sync:evo-pack anti-drift (#2718) + trait-mirror canary (#2717) + resistances mirror (#2719)                                                 |
| SoT/issues                | vault #254 (d20 doc riconciliato), issue chiuse: #2531 #2533 #2602 #2674 #2679 #2703 #2709 #2716 #2724 + 4 swarm                                                                                                                                                                            |

## Residui APERTI (prossima sessione, ordine consigliato)

1. ~~**Re-run N=40 overrun ER6**~~ **DONE 2026-06-11 (#2734)**: `OVERRUN_BUDGET_BONUS=1`
   **RATIFIED as-built** (semantica nicchia biomi fast-escalation, outcome-neutro ISO).
   Evidence `docs/reports/2026-06-11-spec-i-er6-overrun-n40-evidence.md`.
2. ~~**N=40 ER7 flag-ON**~~ **DONE 2026-06-11 (#2735 -> main `ded481f6d`)**: 3 magnitudini
   (`RECOVERY_SEASONS=2` / `ABUNDANCE_SEASONS=2` / `ABUNDANT_WEIGHT_MULT=2`) **RATIFIED
   as-built**; esclusione `depleted` = conseguenza ecologica INTENZIONALE (A13-like); flag
   `BIOME_POPULATION_ENABLED` **tenuto OFF** (verdetto DD). Evidence a 2 layer (season-tick
   trace deterministico + spawn-shaping N=40 ISO su encounter probe foodweb-aligned),
   `docs/reports/2026-06-11-spec-i-er7-population-n40-evidence.md`. **Forward-work**: flip-ON
   deferito a pilot su encounter badlands REALE (stat canoniche `deriveCombatStats`, non il
   probe differenziato) -> conferma in banda, poi flip default ON.
3. **Item-1 flip**: ground-truth verify-first 2026-06-11 (main `ded481f6d`) = **5/17 active**
   (I/L/M/N/O) -- NON 6: SPEC-K = `review_needed` su registry+frontmatter (coerenti, no
   drift) -> il "6/17 (I/K/L/M/N/O)" era L-075 over-count (K mai flippato). **12 review_needed**:
   7 gated su **item-3 Godot/Lenovo** (A/B/C/D/E/K/P -- A confermata Godot-client dalla sua
   sez.4.1) + 5 design-impl-pure DA COSTRUIRE (F/G/H/J/Q). Nessun flip pulito-by-verify resta
   su Ryzen: item-1 = territorio Godot/Lenovo o build design-pure. Pattern flip (quando
   azionabile): verify-first gate + registry-sync atomico (#2689).
4. **Stale batch-3**: 362 warning (batch-1 adr+core e batch-2 process+pipelines DONE;
   ticket residui TKT-STALE-B2-\* in BACKLOG sez. campagna).
5. **Hint role-gap private per-device** (SPEC-I forward-work, item-3 Godot/Lenovo).
6. Igiene: worktree `docs+spec-b-tv-device-contract` (branch `chore/session-rituals-2026-06-08`,
   2 giorni, contenuto da triage) · GGv2 4 `.import` sporchi (cache editor, Lenovo) ·
   PR bot #2683 mission-console.

## Catch operativi della sessione (gia' in MEMORY.md, i top-5)

1. **Junction-chain wipe** (2 volte, 655 file): worktree `node_modules` junctionato al main
   - junction npm-workspace interne (`@game/backend -> apps/backend`) -- `rm -rf`/`worktree
remove --force` MSYS le attraversa e cancella i SORGENTI. Rimozione = `cmd rmdir` di OGNI
     junction (`dir /AL /B /S`) PRIMA di rm. Recovery: tutto tracked, `git checkout -- .`.
2. **npm ci parziale silenzioso** (114 pkg, exit 0): SEMPRE probe (`ls node_modules | wc -l`
   ~387 + un test) prima di fidarsi. 144 fail fantasma = solo env.
3. **Issue closed != fix nel codice** (#2724): verify-first anche sulle chiusure.
4. **Flip default rompe i test legacy "flag OFF default"**: full `tests/api` PRIMA del push.
5. **Auto-merge arm dopo update-branch**: sopravvive a volte si a volte no -- ricontrollare
   SEMPRE `--json autoMergeRequest`; watch senza auto-update (gara col fix manuale).

## Stato finale verificato

Main `83666daa4` · health-sweep ~3930 test 0 fail (api 1563/1564 + ai 502 + services 1264 +
sim/play/scripts 598) · governance errors=0 / stale 362 / mismatch 0 · format:check verde ·
ambiente npm sano (387 pkg / 129 bin) · pipeline PR vuota.

## Update 2026-06-11 (follow-up sessions ER6/ER7)

Residui #1 + #2 CHIUSI in due sessioni di follow-up (Ryzen):

- **#1 ER6 overrun** -> #2734 merged (RATIFIED as-built).
- **#2 ER7 population N=40** -> #2735 merged, **main ora `ded481f6d`** (3 magnitudini
  RATIFIED, esclusione depleted intenzionale A13-like, flag tenuto OFF; forward-work =
  flip-ON su pilot encounter reale). Nuovo harness `tools/sim/er7-season-trace.js` +
  effect `er7` in `spec-i-gates-probe.js`. Codex P2 fixato + thread risolto.
- **#3 item-1** istruito verify-first: count reale **5/17 active** (correzione L-075 del
  "6/17" -- SPEC-K mai flippato, Godot-gated). SPEC-A non flippabile su Ryzen (Godot-client).
  Item-1 = territorio Godot/Lenovo o build design-pure F/G/H/J/Q. Verdetto DD: sessione
  chiusa (item-1 non avanza pulito da qui).

Residui ancora aperti: #3 (item-1, vedi sopra), #4 (stale batch-3), #5 (hint role-gap
Godot), #6 (igiene). ER7 flip-ON default = nuovo forward-work.
