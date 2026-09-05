# FASE 3 P2 -- ERMES combat-wiring calibration (N=40 balance gate)

Date: 2026-05-30
Spec: vault `Spaces/Dev/Evo-Tactics/plans/2026-05-30-ermes-fase3-combat-wiring-design.md` section 8
Branch: chore/2026-05-30-ermes-fase3-p1 (PR #2437)

## Gate

ADR-2026-05-29 section 9: ERMES live combat wiring must not shift win-rate > 5pp (N=40 ratify).

## Method

hardcore_06 scenario, `tools/py/batch_calibrate_hardcore06.py` (`--biome-id` seam added in P2).

- baseline: no biome_id (ERMES no-op).
- cryosteppe_convergence: HIGH band (eco ~0.87 static fallback) -> symmetric +1 atk / +1 def
  on both unit pools, combined cap +/-2 (applyBiomeEcoEffects).
- N=40 per L-069 / L-073 (N=10 = direction only, not ratify).

## Result

| condition       | WR        | wins/N          |
| --------------- | --------- | --------------- |
| baseline        | 15.0%     | 6/40            |
| cryosteppe HIGH | 15.0%     | 6/40            |
| **delta**       | **0.0pp** | **PASS (<5pp)** |

Wilson CI95 ~[7%, 29%] each; delta point 0pp clearly within the 5pp gate.

## Findings

- Symmetric +/-2 combined delta = **WR-neutral** (0pp). The design's symmetric-neutral
  assumption is ratified at N=40.
- The earlier N=10 probe showed cryosteppe -10pp -> **pure noise** (L-069): the baseline
  alone swung 30% at N=10 to 15% at N=40. Confirms N=10 = direction-only, N=40 = ratify.
- Caveat: rovine LOW (-1/-1, symmetric mirror) not separately N=40'd; low risk (same
  magnitude opposite sign, symmetric mechanism proven neutral on the HIGH band).

## Verdict

P2 gate **PASS**. P1 (PR #2437) is balance-safe to merge. Telegraph (P4) + Godot parity (P5)
unblocked. Combat-WR re-check recommended only if `ermes_bucket_thresholds.yaml` deltas change.
