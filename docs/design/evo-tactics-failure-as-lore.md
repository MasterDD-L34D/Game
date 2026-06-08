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

## Non-scopo

- SPEC-P NON ridecide la failure-as-lore per-creatura: i fork **J3** (cicatrice
  -> tratto/mutazione permanente) e **J5** (lineage automatica + Custode opt-in)
  sono ratificati in SPEC-J sez. 7. SPEC-P opera al livello RUN (epilogo + degrado
  meta-network), non al livello creatura.
- Sequenza ratificata (QA2, 2026-06-08): su wipe/run-fail, **J5 scrive prima** la
  lineage/Custode per-creatura; **poi** l'epilogo SPEC-P CONSUMA quell'output (narra
  i caduti + il degrado). J5 = input dell'epilogo, non output.
- SPEC-P NON definisce lo scoring/threshold di ERMES (engine-owned, SPEC-I).

## Deve coprire

- Trigger run-fail: vittoria mancata / wipe / ritirata / timeout.
- Epilogo Skiv/Custode (~60s) che traduce il fallimento in lore.
- Wiki/Codex progressivo (pattern Hades, B14): aggiornamento alla scoperta/fallimento.
- Degrado meta-network bounded: biome "ferito" cumulativo cross-run (**A13**) con cap.
  Ownership ratificata (QA1, 2026-06-08): **SPEC-P possiede il write-side di A13**
  (degrado run-level); SPEC-I resta sul read-side della pressione. Cap concreto = fork
  aperto (vedi sez. Decisioni).
- StressWave come telegraph diegetico del degrado (**A2**): SPEC-I fornisce il SEGNALE
  StressWave (read-side telegraph); SPEC-P lo consuma per il degrado. NB: oggi il wire
  `stresswave -> pressure/spawn` e' DEAD (`biomeModifiers.js`:188 "separate combat PR,
  band-verify") -- da attivare prima dell'uso runtime.
- Export Custodi porta il frammento di lore (SPEC-F): veicolo = `voice_diary_portable`
  (max 5) salvo nuovo campo `failure_lore_fragment` da aggiungere al contratto export SPEC-F.
- Device confirmation; public (TV recap) vs private (device).
- Failure bounded: nessuno stato che renda la campagna ingiocabile.

## Dipendenze

- SPEC-J (rituali ferite/morte per-creatura; J3/J5 = livello creatura, vedi Non-scopo).
- SPEC-I (read-side StressWave/pressione ecologica; A2 = segnale).
- SPEC-F (Custodi portano il frammento di lore; veicolo `voice_diary_portable`).
- SPEC-H (Codex/wiki progressivo, B14: l'epilogo emette eventi che il consumer Codex di
  SPEC-H raccoglie).
- SPEC-D (regia round-level): l'epilogo run-end NON e' un round-beat -> e' una surface
  separata; SPEC-P possiede il contratto epilogo (trigger + payload + tier public/private)
  oppure richiede un addendum run-end a SPEC-D.
- event-log deterministico.

## Stato runtime (git-verify 2026-06-08)

DESIGN-ONLY: 0 hit `failureLore`/epilogo-lore; meta-network arc-conditions live
(GAP-C #2509) ma nessun degrado cross-run ne' epilogo.

## Output consigliato

Spec piena del loop + emitter event-log -> wiki/Codex (SPEC-H) -> meta-network degrade
(A13 write-side) -> Custode lore-fragment (SPEC-F).

## Decisioni ratificate (Eduardo 2026-06-08)

- **QA1** -- A2/A13 ownership: SPEC-I = read-side A2 StressWave (segnale/telegraph);
  SPEC-P = write-side A13 degrado biome cross-run (run-level). Fence speculare in SPEC-I.
- **QA2** -- J5 vs SPEC-P: layered + sequenced (J5 per-creatura scrive prima; epilogo
  SPEC-P consuma dopo; vedi Non-scopo).

## Decisioni aperte (per Eduardo)

- Cap concreto del degrado A13 (es. max N biomi degradati simultanei + recupero dopo M
  run): da fissare nella spec piena.
- Surface epilogo run-end: contratto inline in SPEC-P vs addendum run-end a SPEC-D.
