---
title: 'Evo-Tactics SPEC-O Mission Template Library'
date: 2026-06-08
type: design-spec
doc_status: review_needed
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-08'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [evo-tactics, spec-o, level-design, missions]
related: docs/planning/2026-06-05-evo-tactics-open-points-resolution-roadmap.md
---

# SPEC-O: Mission Template Library

Origine: harvest 2026-06-08 (cluster Spec-M nuove). Recupera
`15-LEVEL_DESIGN` (6 tipi obiettivo documentati), oggi PARTIAL (solo 1 encounter
tunato, Skydock Siege).

## Obiettivo

Definire la libreria canonica dei 6 tipi-obiettivo come template YAML, cosi' che
TV Cinematic Director ed ERMES abbiano una grammatica di missione condivisa.

## Deve coprire

- 6 tipi: Eliminazione, Cattura punto, Escort, Sabotaggio, Sopravvivenza, Fuga.
- Schema encounter + wave config riusabile.
- Estensione SPEC-D (NON contratto esistente): proporre `mission_type` come context del
  Director -> grammatica scene/camera beats. SPEC-D oggi e' round-scoped, niente
  mission_type -> soggetto a review SPEC-D.
- Estensione SPEC-I (NON contratto esistente): proporre che la pressione ERMES scali col
  tipo obiettivo. SPEC-I oggi e' per-bioma, niente hook objective_type -> delta da proporre.
- Difficulty profile per template: oggi esistono `difficulty_rating` (field schema) +
  moltiplicatore per classe (tutorial/hardcore), NON un modulo DifficultyCalculator (da
  creare, vedi `difficulty-integration.md`). "pervasivo" e' eccessivo.
- Metrica full-loop: `completion_rate` target 0.40-0.70 per template -- **prerequisito**:
  `tools/sim/full-loop-runner.js` oggi NON e' mission-type-aware (scenario fisso); va esteso
  con parametro `mission_type` o scenari per-template prima di poter calibrare.

## Dipendenze

- SPEC-D (director), SPEC-I (ERMES), `tools/sim/full-loop-runner.js` per calibrazione.

## Stato runtime (git-verify 2026-06-08)

DESIGN/PARTIAL: 6 tipi documentati (`15-LEVEL_DESIGN`); `schemas/evo/encounter.schema.json`
esiste con i 6 tipi nell'enum `objective.type`. `data/core/missions/skydock_siege.yaml` e'
un TUNE-LOG (source_logs + adjustments per tier), NON un encounter-template schema-valido --
i 6 template da costruire devono conformarsi a encounter.schema.json. Costruire i template =
content production (gate kill-60 = playtest N>=10 per template; 50-righe = PR fuori
apps/backend/ <50 LOC o approval). I 3 output (template / estensione Director+ERMES /
calibrazione) possono viaggiare in PR separati.

## Output consigliato

6 template YAML + integrazione Director + calibrazione full-loop.
