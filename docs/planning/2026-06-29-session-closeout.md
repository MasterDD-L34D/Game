---
title: '2026-06-29 session close-out -- move terrain-cost: telegraph + flip prereqs + LIVE flip'
date: 2026-06-29
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-29'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags:
  [
    closeout,
    handoff,
    combat,
    movement,
    terrain-cost,
    volo,
    radici,
    godot,
    gate-5,
    flip,
    prod-deploy,
  ]
---

# 2026-06-29 session close-out

> Sessione lunga, cross-repo (Game + Game-Godot-v2). Tema unico chiuso end-to-end: il **move
> terrain-cost substrate** dal Gate-5 al **flip LIVE in prod**. Entry handoff (mid-session):
> [`2026-06-29-session-handoff.md`](2026-06-29-session-handoff.md). Memory:
> [[project_move_terrain_cost_substrate]].

## 1. Deliverable completati (con link ai piani)

### Gate-5 Godot telegraph -- GGv2 PR #557 MERGED (`36ca823`)

Surface player-visible del costo-terreno nel client Godot. Flow brainstorming -> writing-plans
-> subagent-driven (5 implementer + 2-stage review + final whole-impl review).

- Spec: `Game-Godot-v2/docs/superpowers/specs/2026-06-28-godot-move-terrain-cost-telegraph-design.md`
- Plan: `Game-Godot-v2/docs/superpowers/plans/2026-06-28-godot-move-terrain-cost-telegraph.md`
- 🔑 reframe verify-first: combat Godot e' CLIENT-SIDE -> telegraph = PORT della matematica costo
  in GDScript (`MoveCostField` mirror di `moveCost.js`, parity-pinned), NON una chiamata backend.

### Flip prereqs (Path A) -- Game PR #3061 MERGED

- Parent spec: [`docs/superpowers/specs/2026-06-23-move-terrain-cost-substrate-design.md`](../superpowers/specs/2026-06-23-move-terrain-cost-substrate-design.md)
- Volo-grade spec (poi superseded): `docs/superpowers/specs/2026-06-23-volo-grade-percreature-design.md`
- Evidence: [`docs/reports/2026-06-29-move-terrain-flip-prereqs-evidence.md`](../reports/2026-06-29-move-terrain-flip-prereqs-evidence.md)
- Per-species `volo_grade` (echo-wing g1 / aurora-gull g2 / noctule-termico g3) -> `deriveCombatStats`
  emette `unit.volo_grade`. 🔑 **NESSUN cambio schema** (verify-first: `validate-datasets` accetta il
  campo sui pack YAML flat; lo schema `additionalProperties:false` gatta i file `species:`-wrapped).

### Hazard encounter content + engine grid-clamp fix -- Game PR #3065 MERGED

- Encounter caricabile `enc_deserto_caldo_bocche_vulcaniche_01` (muro lava+roccia 8x8) -> g2/g3 giocati.
- 🔑 **engine fix**: `clampPosition`/`normaliseUnit` ora prendono un `bounds` opzionale dall'encounter.grid
  -> encounter > 6x6 validi (prima le unita' a x=7 venivano clampate a x=5), backward-compat. Band
  true-8x8 ri-misurata = **WR-neutra**.

### radici DR2 band -- Game PR #3043 MERGED

- DR2 **provata** mordere via invariant (danno 43->33 = 5xDR2). Band-neutral in AI-play = **genuino**
  (non artefatto: il fix del probe tiene il carrier ancorato). DR2=2 resta PROPOSED (re-valida con
  playtest umano hold-capable).

### Codex audit su PR mergiati -- Game PR #3064 MERGED

- 6 fix P2 reali su PR gia' mergiati (#3056/#3042/#3038/#3036) + 1 falso-positivo refutato
  (trait-reference = export curato RFC#4, esclude `design_stub` by-design).

### Housekeeping coda

- Merged: #3063 (GAP2 docs) · #3066 (close derived-canon arc) · #3067 (cross-CPython float fix).
- Chiusi superseded-by-#3061: #3054 (schema premise falsa) · #3039 (fulfilled Path A).
- Tutti i thread Codex non risolti su PR mergiati -> chiusi (4 non-issue + 6 fix + 2 probe-fix).

### FLIP -- terrain-cost LIVE in prod 2026-06-29

- 🔴 verify-first: prod (`_gamewt-lenovo-host`) era **104 commit indietro, pre-substrate** -> il flip
  era un **deploy**: checkout `7d211a3b` (no deps/migration -> no npm ci) + restart.
- 🔑 `keys.env` `source` senza `set -a` -> la riga bare non era esportata -> 1o restart lava=1AP;
  fix = **`export MOVE_TERRAIN_COST_ENABLED=true`** -> restart -> verificato live (lava move = 2 AP).
- Rollback pronto: `git -C _gamewt-lenovo-host checkout 0b2cfea4` + `keys.env.bak-20260629-flip`.

## 2. Verify-first wins (sessione)

- Godot combat client-side -> telegraph = port GDScript, non backend-preview.
- Backend-flip NON richiede l'engine-AP-enforcement Godot (separato, informativo).
- Nessun schema forbidden-path per volo_grade (testato `validate-datasets`, non indovinato).
- trace_hash test = solo non-empty -> niente regen rischioso.
- prod 104-behind -> il "flip" era un deploy (non un flag-flip).
- `source` senza `set -a` -> il flag serve `export` per raggiungere node.
- mesh-roster-batch4 era gia' mergiato -> cancella, non rebasare.
- cavecrew/audit falsi-positivi refutati (GDScript `Color` value-type; trait-reference curato).

## 3. Residui (owner / deferred -- NON bloccanti il flip, gia' LIVE)

- **Godot client engine-AP-enforcement**: il telegraph #557 e' informativo; far CARICARE l'AP
  terrain-weighted al motore locale Godot = balance-affecting -> N=40 Godot-scope + parity-contract.
- **Chip #3058 governance drift**: chip `task_f62b339f` (resolve la draft via AskUserQuestion).
- **DR2=2 radici**: PROPOSED -> re-valida con playtest umano hold-capable.
- **Prod**: ora su latest main (il deploy 104-commit era un side-benefit; prod era fermo al 22/06).

## 4. Prossimo (continuation chip)

Chip di chiusura-progetti: usa questo close-out + le altre sessioni per identificare come **chiudere
completamente i progetti in sospeso PRIMA di aprirne nuovi** (anti-WIP-sprawl).
