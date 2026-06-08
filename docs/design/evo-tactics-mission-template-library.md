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
- Integrazione SPEC-D: tipo missione -> grammatica scene/camera beats.
- Integrazione SPEC-I: pressione ERMES scala col tipo obiettivo.
- Difficulty profile per template (engine difficulty gia' live/pervasivo).
- Metrica full-loop: `completion_rate` entro 0.40-0.70 per template.

## Dipendenze

- SPEC-D (director), SPEC-I (ERMES), `tools/sim/full-loop-runner.js` per calibrazione.

## Stato runtime (git-verify 2026-06-08)

DESIGN/PARTIAL: 6 tipi documentati; schema encounter esiste; 1 solo encounter
tunato. Costruire i 5 template restanti = content production (gate kill-60 + 50-righe).

## Output consigliato

6 template YAML + integrazione Director + calibrazione full-loop.
