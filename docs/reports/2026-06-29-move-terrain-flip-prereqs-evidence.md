---
title: 'Move terrain-cost flip -- prerequisites evidence (band + Path A + DR2)'
date: 2026-06-29
doc_status: draft
doc_owner: master-dd
workstream: combat
last_verified: '2026-06-29'
source_of_truth: false
language: it-en
review_cycle_days: 90
tags: [combat, movement, terrain-cost, substrate, n40, band, evidence, volo, radici, flip]
---

# Move terrain-cost flip -- prerequisites evidence

> **Scopo**: consolidare l'evidenza per il flip `MOVE_TERRAIN_COST_ENABLED` (backend prod).
> Esegue i 3 prereq decisi (AskUserQuestion master-dd 2026-06-29): banda N=40, Path A
> (per-species volo grade), ratifica radici DR2. Branch `feat/move-terrain-flip-prereqs`.

## 1. Banda WR (N=40, hazard worst-case)

Probe `tools/sim/move-terrain-hazard-probe.js` (paired-seed ON vs OFF, in-process supertest,
NO prod, node v22.22.3). Scenario = unita' heavy (`corazzato`, profilo heavy, lava/roccia 2.0,
NO volo) forzate ad attraversare un muro pieno lava(x3)+roccia(x4) su griglia 8x8 (nessun
detour -> il substrate morde al massimo).

```
flag ON : 40 wins / 0 def / 0 timeout · WR 1.0 · avg 20.13 rounds
flag OFF: 40 wins / 0 def / 0 timeout · WR 1.0 · avg 20.45 rounds
wr_delta: 0 · avg_rounds_delta: -0.32
```

**Banda WR-NEUTRA anche nel caso peggiore**: il substrate spara (i round cambiano leggermente)
ma **0 impatto sul win-rate**. Caveat onesto (SDMG): WR=1.0 = soffitto (roster sovra-pompato
vince sempre) -> la neutralita' qui dice "non rompe un fight vincibile", non "neutra a margine
50%". Un roster calibrato a WR~0.5 darebbe un segnale piu' stretto (raffinamento futuro, non
bloccante: il caso peggiore non sposta l'esito).

La foresta pilot (`move-terrain-n40-probe.js`) resta null-by-construction (volatori aggirano il
terreno mite) -> non e' una misura, e' confermato dal probe hazard.

## 2. Path A -- per-species volo grade (mechanism live end-to-end)

La distinzione di grado (g1 libera terreno normale / g2 dimezza hazard / g3 libera hazard)
e' provata deterministicamente da `tests/api/voloGradePercreatureWire.test.js`: con flag ON,
un carrier `volo_grade:3` attraversa una tile lava per **1 AP** (ceil 1.0) vs `volo_grade:1`
per **2 AP** (ceil 1.5).

Questo commit sorgente il grado dai **dati specie** cosi' i flyer reali lo portano in combat:

- `packs/.../species/{badlands/echo-wing, cryosteppe/aurora-gull, deserto_caldo/noctule-termico}.yaml`
  -> campo top-level `volo_grade: 1 / 2 / 3` (gradi ecology-grounded, RATIFICATI 2026-06-28).
- `ecologyCombatAdapter.deriveCombatStats` emette `unit.volo_grade` da `species.volo_grade`.
- `badlandsPilotScenario` + `forestaPilotScenario` lift `volo_grade` nella norm.
- `movementResolver.evaluateVoloGrade` (gia' live, PR #3020) lo legge al move-gate.

🔑 **Nessun cambio schema necessario** (verify-first): `validate-datasets` accetta il campo
sui pack YAML flat -- `species.schema.json` (`additionalProperties:false`) gatta i file rich
`species:`-wrapped, non questi. Evitato un edit forbidden-path inutile testando invece di
indovinare. 3 test adapter + 44/44 verde; `sync:evo-pack` 0 drift catalog.

## 3. radici DR2 ratificata

`anchorState.js`: `ANCHOR_DR = 2` -> commento `RATIFIED-PROVISIONAL (master-dd 2026-06-29)`.
Valore invariato. Caveat onesto: la banda held-DR resta non-misurata dai sim greedy-AI (il
greedy muove -> `breakAnchor`); re-validare con policy hold-capable/umana quando un carrier
radici va live. Blast-radius attuale ~0 (carrier dormienti, fuori dai pilot calibrati).

## 4. Flip-readiness

| Prereq | Stato |
|---|---|
| Banda WR (caso peggiore) | ✅ WR-neutra (delta 0) |
| Meccanismo volo_grade | ✅ live + provato (e2e test) |
| Per-species grade (Path A) | ✅ wired (3 flyer g1/g2/g3) |
| radici DR2 | ✅ ratificata-provisional |
| Gate-5 telegraph (Godot) | ✅ merged GGv2 #557 |

**Residuo (design, NON bloccante il flip)**: autorare un encounter hazard caricabile
(`docs/planning/encounters/`, `encounter_id`, terrain lava + roster con i flyer) cosi' g2/g3
sono esercitati in gioco. Il flip funziona senza (g2/g3 latenti finche' non c'e' content hazard);
la composizione/bilanciamento del roster e' una call di design master-dd.

**Flip**: `MOVE_TERRAIN_COST_ENABLED=true` in `~/.config/api-keys/keys.env` + restart
`EvoTacticsBackend` (host CODEMASTERDD). Owner-gated; eseguibile post-merge di questo branch.
