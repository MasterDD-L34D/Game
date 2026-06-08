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

COPERTURA 6/6 (aggiornata via ground-truth 2026-06-08; NON "1 solo encounter"): l'engine
objective e' LIVE -- `objectiveEvaluator.js` (ADR-2026-04-20) registra TUTTI e 6 i tipi
(elimination/capture_point/escort/sabotage/survival/escape); `encounterLoader.js` carica gli
encounter schema-validi da `docs/planning/encounters/`. Stato reale:

- **10 encounter schema-validi gia' presenti** in `docs/planning/encounters/` -- coprivano
  4/6 tipi (elimination, capture_point, escort, survival).
- **+2 questo lavoro (SPEC-O)**: `enc_sabotage_01.yaml` + `enc_escape_01.yaml` -> **6/6 tipi
  coperti**. Schema-validi (`tests/scripts/encounterSchema.test.js` 15/15), caricati da
  encounterLoader, valutabili da objectiveEvaluator.
- `data/core/missions/skydock_siege.yaml` resta un TUNE-LOG (formato `groups`/`party_vc`
  diverso, non schema-encounter) -- distinto dai template.
- **NON ancora calibrati (DRAFT)**: il gate `completion_rate` 0.40-0.70 per template richiede
  un `full-loop-runner` mission-type-aware (oggi scenario fisso) -- prerequisito di tooling,
  non costruito. I roster/wave dei 2 nuovi sono provvisori (mirror degli esistenti).
- Restano le estensioni SPEC-D/I (hook `mission_type`) come delta da proporre (vedi Deve
  coprire).

## Output consigliato

6 template YAML + integrazione Director + calibrazione full-loop.
