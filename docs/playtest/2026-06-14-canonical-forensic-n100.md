# Canonical AI-driven playtest — Forensic N=100 sweep (hardcore_06 + hardcore_07)

> Date: 2026-06-14 | PC: Lenovo (edusc) | Commit: `eb78814d` (origin/main) | Worktree: `Game-forensic` (clean)
> Method: canonical suite-runner `playtest_canonical.py --n 100 --shards 4` (forensic tier, L-073), seed `424242` (pinned, reproducible).
> Verdict: **BOTH OUT-OF-BAND (high)**. hc06 = **hard regression** (53% vs 15-25%). hc07 = **marginal** (52% vs 30-50%, within CI of ceiling). Difficulty ladder **collapsed/flattened**.
> Action: **diagnosis + flag only — NO knob applied** (L-070/L-073: tuning is master-dd's). Re-tune/re-ratify gated on master-dd.

## TL;DR

Forensic N=100 of the two canonical `balance_oracle` scenarios on current `origin/main` shows **both scenarios sit at a ~52-53% coin-flip win rate**, well above their ratified bands. The intended difficulty ladder (hc06 should be the _hardest_ scenario at 15-25%, hc07 easier at 30-50%) has **inverted/flattened**: hc06 ≈ hc07 ≈ coin-flip. The uniform upward shift (large on the elimination scenario, small on the timer scenario) points to a **global combat-power change since the ratify dates (~2026-05-26)** rather than a per-scenario knob drift. This is a metric-first diagnosis; root-cause confirmation + any tuning is deferred to master-dd.

## Results (N=100, seed 424242, greedy policy)

| Scenario                            | Role           | Target band | WR (N=100) | CI95 (±10pp)            | In-band                     | Ratified knob                           |
| ----------------------------------- | -------------- | ----------- | ---------- | ----------------------- | --------------------------- | --------------------------------------- |
| `enc_tutorial_06_hardcore`          | balance_oracle | **15-25%**  | **53.0%**  | ±9.8pp → [43.2%, 62.8%] | **NO** (+28pp over ceiling) | `boss_hp_multiplier: 0.65`              |
| `enc_tutorial_07_hardcore_pod_rush` | balance_oracle | **30-50%**  | **52.0%**  | ±9.8pp → [42.2%, 61.8%] | **NO** (+2pp over ceiling)  | `enemy_damage_multiplier_override: 2.1` |

- **hc06**: CI95 lower bound (43.2%) is **18pp above the band ceiling (25%)** → robust, unambiguous regression, not a sampling fluke.
- **hc07**: CI95 [42.2%, 61.8%] **straddles the 50% ceiling** → only marginally out; statistically consistent with sitting _at_ its ceiling. Mild upward lean, not a catastrophe.

Composite metric (`0.50·WR + 0.25·KD + 0.25·PE`, anti false-balanced):

| Scenario | WR   | KD_avg                               | PE (party-survive proxy) | Reading                                                         |
| -------- | ---- | ------------------------------------ | ------------------------ | --------------------------------------------------------------- |
| hc06     | 0.53 | 2.98                                 | 0.72 (5.8/8 alive)       | All three axes high → genuinely **too easy**, not a WR artifact |
| hc07     | 0.52 | n/a (objective scenario, no elim KD) | 0.37                     | WR/timer-gated; KD/PE not elimination-meaningful                |

## Metric-first diagnosis (SoT §1.3 — _before_ touching any knob)

### hardcore_06 — elimination, HARD regression

- timeout **0%** (band 0-5% ✓) → **not a timer problem**; `turn_limit_defeat=25` is firing correctly (losses cap at turn 25, wins resolve ~turn 20).
- defeat 47% / victory 53%; turns med 25 (loss) vs ~20 (win).
- `dmg_taken_avg = 24.1` of a **90-HP party pool** (only 27% chipped); `players_alive_on_win = 6/8`; `kd_avg = 2.98` (party kills ~3× more than it loses).
- `boss_hp_remaining`: **0 on win** (boss cleared), 9.3 on loss (~55% of eff-HP ~16.9 = 26×0.65).
- **SoT §1.3 match**: _"WR alto + boss residual <10% → DPR insufficiente nemico → enemy_damage_multiplier"_. On wins the boss residual is 0; the party survives near-untouched and grinds the roster down. → **Enemies under-pressure the party / party over-survives.** The scenario lost its lethality.

### hardcore_07 — pod-rush timer, marginal

- defeat **0%**, **timeout 48%**, victory 52%; turns max 15 (mission timer); elimination metrics (KD/dmg) not emitted (objective scenario).
- **SoT §1.3 match**: _"Timeout high + turns=max → timer"_. This is a **timer race**: 52% reach the objective inside 15 turns, 48% time out. WR is gated by the clock, not by kills — which is exactly why a global combat-power buff barely moves it (+2pp) while it swings hc06 hard (+28pp).

## Cross-scenario fairness / metagame-lock

|                | Designed              | Observed (N=100)                     |
| -------------- | --------------------- | ------------------------------------ |
| hc06 (hardest) | 15-25%                | **53%**                              |
| hc07 (easier)  | 30-50%                | **52%**                              |
| Ordering       | hc06_WR **<** hc07_WR | hc06 ≈ hc07 (**flattened/inverted**) |

- The ladder no longer discriminates difficulty: the scenario meant to be the _punishing_ one (hc06) is now **as winnable as the easier one**. hc06 has lost its identity.
- The **asymmetry is itself diagnostic**: a global player-buff / enemy-nerf differentially inflates an _elimination_ scenario (hc06, kill-gated → +28pp) far more than a _timer_ scenario (hc07, clock-gated → +2pp). This is the signature of a **combat-power shift**, not two independent per-scenario config drifts.

## Root-cause hypotheses (FLAG for master-dd — NOT confirmed, NOT bisected)

The regression is on `eb78814d` vs the ratify state (hc06 #2381, ~2026-05-26). Combat-touching commits landed since then; the uniform-upward-shift signature points at a **global** change. Top candidates to investigate first (highest blast-radius on raw combat power):

1. **#2725 `28690f9b` — "SPEC-I ER1/ER6 N=40 gates PASSED — role-aware harness + flip default ON"**: an ER1 _role-gap_ combat effect was **flipped from default-OFF to default-ON**. A combat modifier newly active in every fight is the strongest single suspect for a uniform WR lift. _(Cross-check: was the N=40 gate that flipped it run against the canonical hardcore oracles, or only its own SPEC-I harness? If the latter, hc06/hc07 were never re-checked post-flip.)_
2. **#2720 `e1064339` / #2714 / #2535 — OD-058 wound system cutover (flip ON)**: location→stat-malus. If wounds land asymmetrically (or the cutover changed enemy effectiveness), it shifts combat power.
3. **#2698 `c81d1ec8` — data-derived `agile_robust` / base-stats bounds**: touches the stat source (hp/speed) feeding units.
4. **#2719 `f5387e66` — trait resistances mirror + channel-routing round path**: changes how channel/resistance routing resolves damage.

Lower-prior (claimed band-neutral at ship, but worth a sanity re-check now): economy gates #2557/#2555, PHASEC perks, A13/ER read-side eco effects.

> **Recommended first step (master-dd):** before any re-tune, confirm whether the global combat shift is _intended_ (e.g., ER1-ON is a deliberate new baseline) or _accidental_. The fix differs:
>
> - **Accidental** → identify/correct the offending change; re-run this N=100 to confirm the bands return.
> - **Intended/permanent** → the ratified bands are stale; **re-ratify** the scenario knobs at N=40 against the new baseline.

## Proposed knobs — _diagnosis-derived directions, NOT applied_ (tuning = master-dd, L-070/L-073)

- **hc06**: raise enemy pressure to restore lethality — e.g. add an `enemy_damage_multiplier_override` for `enc_tutorial_06_hardcore` (currently none; inherits class), and/or revisit `boss_hp_multiplier` 0.65 upward. **Multi-knob discipline (L-070):** do NOT move two knobs together without an N=10 probe between them (the iter3 `turn_limit null` overshoot to 85% is the cautionary precedent). Prefer single-knob bisection.
- **hc07**: **no action recommended on this evidence** — +2pp over ceiling is within CI95 of the band edge. If tightened later, it is timer-gated (tune `mission_timer`/`turn_limit` or enemy pressure), but re-probe at N=40 first; do not tune on a marginal forensic.

## Reproducibility contract (SoT §3)

- Command: `python tools/py/playtest_canonical.py --n 100 --shards 4 --base-port 3341 --label forensic-n100`
- Commit `eb78814d`; seed `424242` (manifest `seed_pinned: true`); host `127.0.0.1`; `LOBBY_WS_ENABLED=false`; `DAMAGE_CURVES_PATH` pinned to `data/core/balance/damage_curves.yaml` (knobs verified present: hc06 `boss_hp_multiplier: 0.65` L260, hc07 `enemy_damage_multiplier_override: 2.1` L269).
- pre-batch gate run: predictCombat sanity (player→enemy hit 45-65% exp_dmg ~1.0-1.55/hit; enemy→player hit 50-60%; party DPR ~8.6/round vs enemy eff-HP ~47 → config non-degenerate) + live N=2 chain smoke (0 failures, deterministic: seed-424242 run = defeat boss_hp 6, reproduced exactly in the N=100 sweep).
- Evidence: `docs/playtest/_canonical-work-forensic-n100/parallel-hardcore_0{6,7}-forensic-n100-merged.json` (100 runs each) + `docs/playtest/forensic-n100-canonical-suite.{md,json}`.

## Method caveats

- **Single-policy (greedy):** the canonical suite-runner drives the **greedy** player policy only (the bands were ratified the same way). The multi-policy triangulation band (random/lookahead2/utility, SoT §1.1) is a **separate tool** (`--policy all`) and was **not** run here. The numbers above are the greedy/ceiling-local proxy. A full per-policy band is a useful follow-up if master-dd wants the skill-vs-luck spread.
- **Data-integrity note:** an initial run accidentally double-wrote hc06's append-mode JSONL (label reuse → 200 dup runs; WR ratio unchanged but CI understated). The reported figures are from a **clean re-run** (work dir cleared first) verified at exactly n=100 per scenario.
