---
title: 'Lenovo handoff -- item 2 (N=40 OA2 calib) + item 3 (Godot surfaces)'
date: 2026-06-09
type: session-handoff
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-09'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [evo-tactics, reconstruction, lenovo, calibration, godot, handoff, oa2, branco-trait]
---

# Lenovo handoff -- item 2 + item 3 (2026-06-09)

Prodotto da una sessione **Ryzen**. item 2 (N=40 batch calib) + item 3 (Godot) sono
**Lenovo-only** (CodeMasterDD / .10, RAM-rich, AI-hub canonico). Verifica identita PRIMA
di lanciare: `powershell -NoProfile -Command "$env:COMPUTERNAME"` deve dare `CodeMasterDD`.

## Contesto -- cosa e' appena entrato su main

3 PR mergiati (main `75108350b`):

- **#2664** i18n NF3 (4 pannelli label-map -> `t()`).
- **#2665** OA2 nav fix: `tools/sim/combat-policy.js stepTowardZone` -- i pursuer si
  spargono su tile-zona DISTINTE + sidestep attorno agli alleati. **Sblocca item 2**:
  capture/sabotage/escape con `min_units_in_zone>1` ora completabili in sim (prima la 2a
  unita restava bloccata fuori zona -> `completion_rate` strutturalmente 0%).
- **#2666** MA1 part 2: `brancoTraitEmergence` (FP aggregate -> 1 trait-branco emergente),
  knob PROPOSED da ratificare N=40.

## Item 2 -- N=40 OA2 `completion_rate` calibration

Metrica: `completion_rate` target **0.40-0.70** per template (mirror band full-loop).
Gate promozione: un template DRAFT (sabotage/escape, SPEC-O #2640) passa a "ratificato"
SOLO con `completion_rate` 0.40-0.70 su **N=40 col roster REALE**.

### Pre-requisiti

1. Backend up su `127.0.0.1:3334` (`npm run start:api`). Probe: `curl http://127.0.0.1:3334/health`.
2. **L-074 (load-bearing)**: usa `--host http://127.0.0.1:3334`, **MAI** "localhost" --
   il `DEFAULT_HOST` del runner e' `http://localhost:3334` che su Windows risolve IPv6 ->
   stall urllib ~2s/call (= il vero "hang at 7"). Override esplicito obbligatorio.

### Comando (per ogni template OA2 non-elim)

```
python3 tools/py/batch_calibrate_non_elim.py \
  --scenario <slug> --n 40 --host http://127.0.0.1:3334 \
  --out reports/2026-06-09-oa2-<slug>-n40.json
```

Slug: `enc_capture_01` (min_units=2), `enc_sabotage_01`, `enc_escape_01`
(+ `enc_escort_01`, `enc_survival_01` se vuoi coprire i 6 tipi).
Probe veloce prima del batch: aggiungi `--probe` (N=1 verboso) per smoke 1 run.

### Residuo noto -> RISOLTO

"traversal multi-unit con `min_units_in_zone>1`" (mission-template-library sez. 9 residuo)
= **FIXED da #2665** (`stepTowardZone`). Resta solo il tuning N=40 della band.

## Knob PROPOSED da ratificare N=40 (ratify-by-data, MAI fiat)

N=10 = direction-probe; **N=40 = ratify** (anti lucky-sample, CI95 vs band-ceiling).

| Knob                         | File                                                     | Default PROPOSED                                             |
| ---------------------------- | -------------------------------------------------------- | ------------------------------------------------------------ |
| OA2 completion_rate band     | `docs/design/evo-tactics-mission-template-library.md`    | 0.40-0.70                                                    |
| FP->VC mapping + magnitudine | `apps/backend/services/formPulseVc.js`                   | `PROPOSED_FP_VC_MAPPING` + `MAX_FP_VC_DELTA=0.05`            |
| **branco-trait (NEW #2666)** | `apps/backend/services/identity/brancoTraitEmergence.js` | `PROPOSED_BRANCO_TRAIT_MAPPING` + `EMERGENCE_THRESHOLD=0.30` |
| name pool                    | `data/core/identity/name_pool.yaml`                      | contenuto PROPOSED                                           |
| A13 biome-wound              | `apps/backend/services/worldgen/biomeWound.js`           | `PRESSURE_PER_BIOME` + `woundedStep` magnitude               |

Toolkit calib (memoria `feedback_calibration_toolkit_2026_05_21`): parallel C 4x, SPRT B,
Optuna A, MAP-Elites D, drift_verify (L-072 guard), trait validator.

## Item 3 -- Godot surfaces (repo `Game-Godot-v2` su Lenovo)

Stato Godot-v2 (main, ultimo commit 2026-06-08 00:11): **#449 K01-K06 device-authority
surface audit + Nido party-select + k07 smoke plan**. Device-authority surfaces in corso.

Superfici da costruire (engine backend LIVE qui in Game, dormienti finche' Godot non le popola):

1. **Form Pulse UX** = KEYSTONE. Popola `formPulses` -> attiva D'UN COLPO 3 engine dormienti:
   FP->VC (SPEC-M), trait-branco emergente (#2666), name emergence (M-2). Priorita' alta.
2. **Memory-mode chronicle viewer** -- M-7, backend `apps/backend/services/chronicle` LIVE
   (3 emitter: run_failed / creature_named / biome_wound) + `routes/chronicle.js`.
3. **Device-driven char-creation** -- M-2 / SPEC-K, backend `services/identity/identityService.js`.

## Cleanup Lenovo (opzionale, non bloccante)

Game repo su Lenovo: ~40 branch locali stale (quasi tutti `[origin/...: gone]` = merged+
cancellati), 3 stash vecchi (apr 2026), 5 worktree (`_gamewt-d4`, `_gamewt-gapc2impl`,
`_gamewt-lenovo-host`, +2 `.claude/worktrees`). Prune sicuro:
`git branch -d <gone-branches>`, `git stash drop`, `git worktree prune`. NON tocco da Ryzen
(repo suo + mutate cross-PC = gated).

## Note finali

- La sessione Claude attiva su Lenovo (06-08 23:24+) lavorava su **GAP-C option-C phase3
  retune + band-verify + governance** -- binario DIVERSO da item 2/3. Coordinare per non
  collidere (es. il backend / ollama gia' up dal 06-08 18:54).
- item 1 (flip SPEC-A..Q review_needed->accepted) = owner-gated, indipendente dalla macchina.
- item 6 (mutation_lineage) = forbidden path `services/generation/` -> nodo master-dd.
