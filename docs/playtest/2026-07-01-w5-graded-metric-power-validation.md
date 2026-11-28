---
title: 'W5 inc-2 -- graded metrics validated as the Gap-C power discriminator (pivot rationale)'
date: 2026-07-01
sprint: closeout-w5-sim-harness
doc_status: review_needed
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-07-01'
source_of_truth: false
review_cycle_days: 90
language: it-en
---

# W5 inc-2 -- graded metrics validated (Gap-C power discriminator)

> Follow-up to inc-1 ([2026-07-01-w5-focus-fire-ab-evidence.md](2026-07-01-w5-focus-fire-ab-evidence.md)).
> Master-dd ratified the **graded-metric re-ratify** direction (AskUserQuestion 2026-07-01) over
> more AI-tactics factors, on this evidence. Probe: `tools/sim/focus-fire-ab-probe.js`.

## 1. Two diagnostics that reshape W5

### 1a. The hardcore timeout is DPR/hit-rate-bound, NOT positioning-bound

Diagnostic on `enc_badlands_ultima_caccia_01` (wave-1 hardcore, canonical party, focusFire OFF,
N=8) with the new engagement/output metrics:

| metric                      | value    |
| --------------------------- | -------- |
| win_rate                    | 0        |
| avg_rounds                  | 40 (cap) |
| **mean_player_attacks**     | 24.3     |
| **mean_enemy_hp_remaining** | 0.74     |
| mean_hp_remaining (party)   | 0.975    |
| creature_ko_rate            | 0.41     |

Players DO engage (~24 landed attacks/run) but the enemies still sit at **74% HP** at the
round cap: ~24 attacks removed ~26% of ~48 enemy HP = ~0.5 effective damage/attack (heavy
misses vs DC 11-14). The bottleneck is **damage output / hit-rate, not reaching the enemy**.
=> A positioning upgrade (F3) would NOT un-stick this encounter -- the party already reaches and
swings. (It is also a KO-rate-designed encounter, not a WR one -- SPEC-J gates on KO-rate.)

### 1b. The graded metrics discriminate power where binary WR cannot

Same hardcore, party to-hit `mod +0` (baseline) vs `mod +6` (a synthetic team-power delta,
`PROBE_MOD_BUFF`), N=6:

| party power | win_rate | **enemy_hp_remaining** | creature_ko_rate |
| ----------- | -------- | ---------------------- | ---------------- |
| baseline +0 | 0.00     | **0.71**               | 0.42             |
| +6 to-hit   | 0.50     | **0.21**               | 0.13             |

`enemy_hp_remaining` moves **0.71 -> 0.21** -- a large, continuous response to a power delta that
binary WR barely captures (0 -> 0.5 only at a big +6). The graded metric would register even a
SMALL power delta while WR stays pinned at 0. `creature_ko_rate` (0.42 -> 0.13) is a second
power-sensitive graded channel.

## 2. Conclusion -- the graded metrics ARE the Gap-C / signal win

The recurring inc-1/inc-2 result: **AI-tactics levers (focus-fire, positioning) prove
band-neutral/irrelevant because the encounters are power/DPR-bound, not tactics-bound.** The sim
AI already reaches and swings; the missing piece was never AI skill -- it was a metric that reads
the power delta the binary outcome hides. inc-1's graded metrics do exactly that, validated here
end-to-end. This is why W5 pivots (master-dd) from "build utility-AI factors F1..F4" to **use the
validated graded metrics to re-ratify** the provisional bands + drive the flip measurements.

## 3. Shipped (inc-2)

- `combat-adapter.js`: `enemy_hp_remaining_pct` added (mean sistema HP fraction over the final
  board, dead = 0) -- the damage-OUTPUT graded channel. Test in `tests/sim/combatAdapter.test.js`.
- `focus-fire-ab-probe.js`: `mean_enemy_hp_remaining_pct` + `mean_player_attacks` in the summary;
  `PROBE_MOD_BUFF` env (synthetic to-hit power delta) -- the re-ratify measurement tooling.
- 216/216 sim suite green.

## 4. Next (graded re-ratify, the W5 payload)

Run flag-ON vs OFF N=40 on the D6 / D8 / ER6 mechanics reading the GRADED metrics (not just WR)
on their relevant encounters -> real bands (vs the passive-AI WR-only PROVISIONAL bands) -> master-dd
ratifies. Same graded harness sets up the form-pulse W6 cross-biome measurement. Owner-gated
ratification; the sim produces the evidence.

## 5. Reproduce

```
node tools/sim/focus-fire-ab-probe.js 8 hardcore                 # 1a diagnostics
PROBE_MOD_BUFF=0 node tools/sim/focus-fire-ab-probe.js 6 hardcore # 1b baseline
PROBE_MOD_BUFF=6 node tools/sim/focus-fire-ab-probe.js 6 hardcore # 1b buffed
```

Node 22 (sim not bit-repro cross-version; variance ~+-0.05). Graded-metric additions are
AI-independent + read-only; no prod flag flipped.
