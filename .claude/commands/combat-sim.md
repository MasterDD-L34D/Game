---
name: combat-sim
description: Run combat simulation via rules engine (predict_combat or demo_cli)
user_invocable: true
---

# Combat Sim

Quick combat simulation using the Python rules engine.

## Arguments

Optional: species names, trait sets, or "random" for default matchup.

## Steps

### 1. Check Python environment

```bash
PYTHONPATH=services/rules python3 -c "from resolver import resolve_action; print('Rules engine OK')" 2>&1
```

If fails → check `pip install -r tools/py/requirements.txt`.

### 2. Run simulation

**Quick predict (N=1000 simulated attacks):**

```bash
PYTHONPATH=services/rules python3 -c "
from resolver import predict_combat
result = predict_combat()
import json
print(json.dumps(result, indent=2, default=str))
" 2>&1
```

**Interactive demo (turn-by-turn):**

```bash
PYTHONPATH=services/rules python3 services/rules/demo_cli.py 2>&1 | head -80
```

### 3. Parse results

From predict_combat output, extract:

- Win rate (attacker vs defender)
- Average damage per attack
- Average margin of success
- Status effect distribution (bleeding, fracture, stun)
- Average PT spent per turn

### 4. Produce report

```
## Combat Simulation Report

| Metric | Value |
|--------|-------|
| Simulations | 1000 |
| Attacker win rate | X% |
| Avg damage/attack | X |
| Avg MoS | X |
| Status infliction rate | X% |

### Status distribution
| Status | Frequency |
|--------|-----------|
| bleeding | X% |
| fracture | X% |
| stunned | X% |
| focused | X% |
```

### 5. Balance assessment

Compare results against balance targets from `packs/evo_tactics_pack/data/balance/`:

- Win rate should be 45-55% for balanced matchups
- If >60% or <40% → flag asymmetry
- If status infliction >50% → may need tuning

### 6. If user provides specific matchup

Parse species/trait names from user input. Build custom combat config and pass to predict_combat with specific parameters.
