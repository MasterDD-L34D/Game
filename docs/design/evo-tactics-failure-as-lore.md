---
title: 'Evo-Tactics SPEC-P Failure-as-Lore Loop'
date: 2026-06-08
type: design-spec
doc_status: review_needed
doc_owner: master-dd
workstream: flow
last_verified: '2026-06-08'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [evo-tactics, spec-p, failure-as-lore, narrative, meta-loop]
related: docs/planning/2026-06-05-evo-tactics-open-points-resolution-roadmap.md
---

# SPEC-P: Failure-as-Lore Loop

Origine: harvest 2026-06-08 (cluster "Failure & telegraph"). Recupera V3 B18 +
B16 + B14, oggi DESIGN-ONLY (0 hit `failureLore`). Pillar P2 (emergente) + P4
(identita' narrativa). Distinto dalla morte per-creatura (SPEC-J).

## Obiettivo

Chiudere il loop run-fail come arco narrativo persistente ma bounded: la
sconfitta diventa lore, non game-over secco, senza brickare la campagna.

## Deve coprire

- Trigger run-fail: vittoria mancata / wipe / ritirata / timeout.
- Epilogo Skiv/Custode (~60s) che traduce il fallimento in lore.
- Wiki/Codex progressivo (pattern Hades, B14): aggiornamento alla scoperta/fallimento.
- Degrado meta-network bounded: biome "ferito" cumulativo cross-run (A13) con cap.
- StressWave come telegraph diegetico del degrado (A2; condiviso con SPEC-I).
- Export Custodi porta il frammento di lore (SPEC-F).
- Device confirmation; public (TV recap) vs private (device).
- Failure bounded: nessuno stato che renda la campagna ingiocabile.

## Dipendenze

- SPEC-J (rituali ferite/morte per-creatura), SPEC-I (ERMES/StressWave),
  SPEC-F (Custodi portano lore), SPEC-D (epilogo cinematic), event-log deterministico.

## Stato runtime (git-verify 2026-06-08)

DESIGN-ONLY: 0 hit `failureLore`/epilogo-lore; meta-network arc-conditions live
(GAP-C #2509) ma nessun degrado cross-run ne' epilogo.

## Output consigliato

Spec piena del loop + emitter event-log -> wiki/Codex -> meta-network degrade ->
Custode lore-fragment.
