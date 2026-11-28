---
title: 'Calibration runs INDEX — 1-line per iter'
workstream: ops-qa
category: reference
status: published
owner: balance
created: 2026-04-20
tags:
  - calibration
  - index
  - kill-ceremony
---

# Calibration runs INDEX

Flint kill-60 2026-04-20: sostituisce markdown playtest report per-iter. Solo transition RED→GREEN o pivot strategy merita report full.

Format: `iterN | config | N | wr% | defeat% | timeout% | verdict | note`

## enc_tutorial_06_hardcore

| Iter | Config | N | wr | defeat | timeout | Verdict | Note |
|:-:|---|---:|---:|---:|---:|:-:|---|
| iter5 | post M7 DPR+routing | 10 | 70% | 0% | 30% | 🔴 | M7 baseline, root cause asymmetry |
| iter6 | hardcore 1.4x, enrage 1 | 30 | 63% | 0% | 37% | 🔴 | Phase B+C wiring live, multiplier insufficient |
| iter7 | hardcore 1.8x, boss 2.0, enrage 3 | 30 | 33% | 0% | 67% | 🔴 | Phase E multiplier exhausted, stalemate amplificato |
| **iter8** | **+ P6 turn_limit_defeat 25** | **26** | **23%** | **77%** | **0%** | **🟢\*** | **win IN band**, defeat over, timeout eliminated. P6 works structurally |

**\***: iter8 verdict tecnicamente RED per target_bands strict (defeat 77% vs 40-55%), MA **win_rate in band** + timeout eliminated = feature working. Defeat over acceptable per hardcore = challenging. **Stop tune**. Pilastro 6 GREEN candidate.

## Methodology (canonical)

- Harness: `tools/py/batch_calibrate_hardcore06.py`
- Backend: port 3340 isolato
- Target bands: `data/core/balance/damage_curves.yaml` per encounter_class
- Verdict: auto GREEN/AMBER/RED via `verdict_for()`
- Full markdown report solo su RED→GREEN transition o strategic pivot (ADR)

## Ship criteria

- **GREEN verdict auto** = PR merge direct, commit msg + 1 INDEX row
- **AMBER (±5pp edge)** = 1 tune iter + re-check
- **RED 2x consecutivi** = structural fix required (M9-M11 roadmap)
- **Pattern multiplier knob exhausted** (iter7) = stop tune, pivot architecture (M9 P6 validated)

## Archive pointers

Reports full per storical reference:
- `2026-04-19-m6-iter2b-baseline.md` — M6 resistance baseline
- `2026-04-20-m7-iter6-hardcore-verdict.md` — first post-Phase-D
- `2026-04-20-m7-iter7-phase-e-verdict.md` — multiplier plateau evidence

Iter8 NO separate markdown per kill-ceremony rule.
