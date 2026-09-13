---
title: Calibration N-sample authority — never ship pillar upgrade from N=10 alone
museum_id: M-2026-05-20-003
type: methodology
domain: [calibration, balance, testing]
provenance:
  found_at: docs/playtest/2026-05-20-hardcore-07-postwave57.json (N=10 WR 40%) + docs/playtest/2026-05-20-hardcore-07-postwave57-n40.json (N=40 WR 60%) + docs/playtest/2026-05-20-hardcore-06-postfix-bosshp30.json (N=10 WR 10%) + docs/playtest/2026-05-20-hardcore-06-postfix-bosshp26-iter2.json (N=10 WR 0%)
  git_sha_first: a1936bd9 2026-05-20
  git_sha_last: HEAD
  last_modified: 2026-05-20
  last_author: Claude (MasterDD-L34D autonomous loop)
  buried_reason: just-codified
relevance_score: 5
reuse_path: 'tools/py/calibrate_drift_verify.py (wrapper N=10 → N=40 escalation auto) + CLAUDE.md anti-pattern #10'
related_pillars: [P6]
status: curated
excavated_by: Claude (autonomous)
excavated_on: 2026-05-20
last_verified: 2026-05-20
---

# Calibration N-sample authority — anti-pattern #10

## Summary (30s)

Single-session lesson cluster prova **N=10 batch insufficient per ratify pillar upgrade**. Verdict flips osservato 3 volte stessa sessione:

1. **hardcore_07 N=10 WR 40% in-band → N=40 WR 60% OOB-high** (+20pp delta)
2. **hardcore_06 iter1 boss HP 30 N=10 WR 10% → iter2 boss HP 26 N=10 WR 0%** (boss HP went DOWN, WR went DOWN — should not be possible deterministically)
3. **hardcore_07 pre-N=40 baseline N=10 lucky-low** caught 40% chance, true mean ~60%

**Causa**: N=10 CI95 WR ±30pp on point estimate ~40-60% range. Band ceiling-touch insufficient signal.

## Pattern

```
N=10  → indicative direction, CI95 ±30pp
N=40  → authoritative band placement, CI95 ±15pp
N=100 → forensic fine-tune, CI95 ±10pp
```

## Rule canonical

**Never ship pillar status upgrade (🟡→🟢 candidato OR 🟢 candidato → 🟢 confirmed) on N=10 alone if CI95 spans band ceiling.**

**Workflow gated**:

1. N=10 probe → direction check (in-band? OOB-high? OOB-low?)
2. If in-band AND CI95 lower bound > floor → N=40 ratify (~20-25min)
3. If OOB-high → tighten knob + N=10 → if direction confirmed → N=40
4. If OOB-low → loosen knob + N=10 → if direction confirmed → N=40
5. Pillar upgrade ONLY post N=40 ratify

## Anti-pattern

❌ **N=10 in-band claim** without N=40 ratify when CI95 ≥ ±15pp
❌ **N=10 iter1 → iter2 single-knob continuation** without N=40 baseline first (iter1 result may be noise)
❌ **Multi-iteration knob exploration N=10 each** chains noise — every iteration adds variance not signal

## When N=10 IS sufficient

✅ Direction probe (testing if knob has ANY effect)
✅ Pre-batch instrumentation smoke (verify telemetry captures expected fields)
✅ Cross-scenario sanity (N=10 hardcore_06 + N=10 hardcore_07 to spot-check both not RED before committing N=40 to one)
✅ Bug detection (failures field > 0 means infrastructure broken — stop)

## Reuse path concrete

**Tool**: `tools/py/calibrate_drift_verify.py` (FASE 3 deliverable this session)

```bash
# Auto-escalation N=10 probe → N=40 ratify if direction promising
python tools/py/calibrate_drift_verify.py --scenario enc_tutorial_06_hardcore --target-band 15-25
```

Internal flow:

1. Run N=10 probe (~6-9min)
2. If WR within ±5pp of band → auto-escalate N=40 (~24min)
3. If WR direction wrong → return verdict + suggest knob axis
4. Compose report with both samples + CI95 delta

## Related anti-patterns CLAUDE.md

- #6 atomization granularity (decision tree per content type)
- #8 shallow-research ADOPT verdict (provenance ≠ fit)
- #9 DRY-RUN smoke ≠ -Apply smoke
- **#10 N=10 lucky-sample false in-band signal** (this card)

## Lesson family (L-cluster)

- L-069 (this session, canonical): N=10 → N=40 escalation gate
- L-032/L-033 (prior): output non-validato anti-pattern
- L-046 (prior): tool eval SDMG falsification

## Evidence trail this session

| Sample | Scenario    | Knob          | WR    | CI95     | Verdict                         |
| ------ | ----------- | ------------- | ----- | -------- | ------------------------------- |
| N=10   | hardcore_07 | post Wave 5-7 | 40.0% | [10, 70] | in-band (later overturned)      |
| N=40   | hardcore_07 | post Wave 5-7 | 60.0% | [45, 75] | OOB-high +10pp ceiling          |
| N=10   | hardcore_06 | post Wave 5-7 | 0.0%  | [0, 30]  | RED                             |
| N=10   | hardcore_06 | boss_hp 0.75  | 10.0% | [0, 40]  | AMBER near-band                 |
| N=10   | hardcore_06 | boss_hp 0.65  | 0.0%  | [0, 30]  | RED (iter1 noise contradiction) |
| N=40   | hardcore_06 | boss_hp 0.65  | TBD   | TBD      | ratify-pending                  |

## Reuse paths

- Cite from CLAUDE.md anti-pattern catalogue #10
- Surface in `tools/py/calibrate_drift_verify.py` docstring header
- Reference da future calibration handoff doc
- Memory file `feedback_n_sample_authority.md` PC-local
