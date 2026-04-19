---
title: Spike M6 resistance evidence — hardcore-06 calibration lever validated
doc_status: active
doc_owner: master-dd
workstream: combat
last_verified: '2026-04-19'
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - 'docs/architecture/resistance-engine-gap.md'
  - 'docs/adr/ADR-2026-04-19-resistance-convention.md'
---

# Spike M6 — Resistance evidence test

**Data**: 2026-04-19
**Trigger**: Flint pre-M6 validation ("30min spike obbligatorio prima di committare 10h")
**Hypothesis**: se channel resistance è la leva calibrazione hardcore-06, halving damage a enemy deve droppare win rate >15pp.

## Setup

**Branch temp**: `spike/m6-resistance-evidence` (non committato, revertato post-spike)

**Edit**: `apps/backend/routes/session.js:236` post damage calculation:

```javascript
if (target && target.controlled_by === 'sistema' && damageDealt > 0) {
  damageDealt = Math.floor(damageDealt * 0.5);
}
```

**Harness**: `tools/py/batch_calibrate_hardcore06.py` via backend port 3340
**Scenario**: `enc_tutorial_06_hardcore` (8p vs boss apex + 2 elite + 3 minion)

## Risultati

### Batch N=5

| Metrica          |    Valore     |
| ---------------- | :-----------: |
| Win rate         | **20%** (1/5) |
| Timeouts         |      4/5      |
| Avg turns        |     40.8      |
| K/D avg          |      1.6      |
| Damage dealt avg |     59.6      |
| Damage taken avg |     38.2      |

### Batch N=10 (confirm)

| Metrica          |     Valore     |
| ---------------- | :------------: |
| Win rate         | **20%** (2/10) |
| Timeouts         |      8/10      |
| Losses           |       0        |
| Avg turns        |      40.x      |
| Damage dealt avg |      63.9      |
| Damage taken avg |      32.3      |

### Aggregate N=15

**Win rate: 20% (3/15), 12 timeouts, 0 losses**

## Confronto vs baseline

| Config                       |   Win rate   |  Target (15-25%)   |
| ---------------------------- | :----------: | :----------------: |
| **Baseline** (no resistance) | 84.6% (N=13) |    ❌ out +59pp    |
| **Spike** (50% enemy resist) |  20% (N=15)  | ✅ **dentro band** |
| Delta                        | **-64.6pp**  |   signal massive   |

## Findings

### ✅ Resistance IS calibration lever

Halving incoming damage a enemy targets droppa win rate di 64.6pp. Questo è il segnale più forte possibile: **la leva funziona**.

Target design band 15-25% **raggiunto** con hardcoded resistance universale 50%. Implementazione corretta (channel-specific + archetype-based) darà granularità + preservation gameplay per match-up favorevoli.

### ⚠️ Caveat: stall pattern (12 timeouts / 3 wins)

Match terminano al round cap (40). Player damage output halved universalmente = combat troppo lungo. Implementazione M6 DEVE essere **channel-specific**:

- Player attacks canale X vs enemy archetype corazzato resist X: applica riduzione (tanker boss)
- Player attacks canale Y (che X è vulnerabile a): applica amplify (reward player che pondera match-up)
- Canali neutral: no change

Non flat 50% su tutto. Design resistance asimmetrico = stall ridotto + tactical depth aumentato.

### ⚠️ HP ancora elevato ma non dominante

Dmg dealt N=10: 63.9 avg = player riescono a portare 6 minion + 2 elite giù ma boss hp 22 con halved damage = trop tempo per kill. Post resistance implementazione + fine-tune boss hp potrebbe servire iter3.

## Decision

**M6 GO**.

### Sequenza proposta

1. **M6-#1** (4-6h): native Node `resistanceEngine.js` + wire `session.js:performAttack`
2. **M6-#2** (2h): `resistance_archetype` field per 45 species
3. **M6-#3** (1h): calibration iter2 **reale** post-implementation (non hardcoded 50% ma channel-specific)
4. **M6-#4** (2h): contract parity test (se Python rules engine survives — vedi discussion kill)

### Discussion: kill Python rules engine

User direction (2026-04-19): **"il gioco deve essere senza master, un solo gioco online"**.

Implicazione: `services/rules/` (Python) serve solo `demo_cli.py` + `master_dm.py` tabletop. Se design = solo Node runtime, Python engine diventa **dead weight**.

**Kill candidate**: `services/rules/` (~2500 LOC Python).

**Mitigazione pre-kill**: porting resistance a Node NON blocca kill Python. Prima M6-#1+#2+#3 (validare lever su Node reale), poi decidere kill Python via ADR separato.

## Cleanup

- Spike edit revertato
- Branch `spike/m6-resistance-evidence` orfano (no commit)
- Backend stoppato
- Output data preservato in `reports/spike/m6_spike.json` + `m6_spike.jsonl`

## Riferimenti

- Flint advisor review: session 2026-04-19 post-merge M5 (10 PR)
- Baseline data: `docs/playtest/2026-04-18-hardcore-06-calibration.md` (iter1 84.6%)
- Gap doc: `docs/architecture/resistance-engine-gap.md`
