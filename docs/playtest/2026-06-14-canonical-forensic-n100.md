# Canonical AI-driven playtest — Forensic N=100 sweep (hardcore_06 + hardcore_07)

> Date: 2026-06-14 | PC: Lenovo (edusc) | Commit: `eb78814d` (origin/main) | Worktree: `Game-forensic` (clean)
> Method: canonical suite-runner `playtest_canonical.py --n 100 --shards 4` (forensic tier, L-073), seed `424242` (pinned, reproducible).
> Verdict: **BOTH OUT-OF-BAND (high)**. hc06 = **53% vs 15-25%**. hc07 = **52% vs 30-50%** (marginal, within CI of ceiling). Difficulty ladder **flattened**.
> Root cause: **CONFIRMED by git-bisect = #2719 `f5387e66`** (channel-routing fix). Parent #2717 = 17% in-band → #2719 = 51% OOB. The fix is correct; the band was ratified under the prior bug. **#2725 ER1 = REFUTED** (A/B inert).
> Resolution (this PR): hc06 re-tuned **`boss_hp_multiplier` 0.65 -> 1.04** (forensic N=100 WR **22%**, def 78%, timeout 0% — all 3 class bands) + per-PR **CI balance gate** (`.github/workflows/combat-balance-gate.yml`, phase-1 warn) + band-invalidation protocol (SoT §9). hc07 = marginal, #2719-independent (separate follow-up). **Do NOT revert #2719.** Knob value calibrated at N≥40 / ratified N=100 (L-073), not chosen blindly.

## TL;DR

Forensic N=100 of the two canonical `balance_oracle` scenarios on current `origin/main` shows **both scenarios sit at a ~52-53% coin-flip win rate**, well above their ratified bands. The intended difficulty ladder (hc06 should be the _hardest_ scenario at 15-25%, hc07 easier at 30-50%) has **inverted/flattened**: hc06 ≈ hc07 ≈ coin-flip. The uniform upward shift (large on the elimination scenario, small on the timer scenario) pointed to a global combat change; **git-bisect confirms it = a single commit, #2719 (`f5387e66`), a channel-routing _bug fix_** that unlocked the hc06 policy's `psionico` exploit against the armored boss/elites (parent #2717 = 17% in-band → #2719 = 51% OOB at N=100). The band was ratified under the prior bug, so it was stale. **Resolved in this PR** — hc06 re-tuned (`boss_hp_multiplier` 0.65 -> 1.04, N=100 WR 22%) + a per-PR CI balance gate so this can't silently recur (see Resolution). Merge = master-dd.

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

## Root cause — CONFIRMED by git-bisect (`a81fe108`..`eb78814d`, 281 commits)

Bisected with the identical harness (seed 424242, greedy, N=40/step → N=100 confirm on the boundary pair). Exact flip pinpointed at **one commit**:

| Commit                                                                                        | hc06 WR (N=100) | Band 15-25% |
| --------------------------------------------------------------------------------------------- | --------------- | ----------- |
| `a81fe108` (2026-05-30 baseline)                                                              | 16.0%           | in-band ✓   |
| `7f39b3bd` (#2717, parent of culprit)                                                         | **17.0%**       | in-band ✓   |
| **`f5387e66` (#2719)** — `fix(combat): trait resistances mirror + channel routing round path` | **51.0%**       | **OOB ✗**   |

**Mechanism** (from the #2719 commit body + the hc06 policy): #2719's "Root-cause 2" fixed `/round/execute`, which **was not passing `action.channel` to `handleLegacyAttackViaRound` → every round attack resolved as `fisico` (physical)**. The hc06 batch policy (`CHANNEL_EXPLOIT_MAP`) attacks the boss + elite hunters with **`psionico`** to exploit their `corazzato` (armored) weakness. Under the bug those attacks were silently downgraded to physical → armor resisted → scenario hard (17%). Post-fix the psionico exploit lands → boss/elites melt → scenario easy (51%).

**This is a legitimate bug fix, NOT a break — do not revert #2719.** The consequence is that the hc06 band (15-25%) was **ratified under the channel-routing bug** (all-physical round combat) and is now stale. Correct action = **re-tune + re-ratify** hc06 against post-#2719 (correct) channel routing — **done in this PR** (see Resolution).

**REFUTED suspects** (tested, ruled out — not hand-waved):

- **#2725 ER1 role-gap (default-ON flip)** — A/B with `ERMES_ROLE_GAP_ENABLED=false` gave **byte-identical** results (0/100 runs changed). ER1 (`session.js:1844`) only fires inside the biome-eco path: it needs a `biome_id` **and** party `job`s in `BIOME_ROLE_DEMANDS`; the hc06 batch passes neither → inert. That same biome-gated block makes **#2720 wound-cutover / #2535 / A13 / ER2** almost certainly inert for hc06 too (no `biome_id` in the batch).

> ⚠️ **Broader flag:** the channel-routing bug was live through an entire calibration era (until #2719, 2026-06-10). Any balance band ratified before that date — measured under all-physical round combat — may be **stale** wherever the player/AI policy relied on channel exploits. hc07 (+2pp, timer-gated) is only marginally affected; re-check any other oracle the same way.

## Proposed knobs — _diagnosis-derived directions, NOT applied_ (tuning = master-dd, L-070/L-073)

- **hc06**: raise enemy pressure to restore lethality — e.g. add an `enemy_damage_multiplier_override` for `enc_tutorial_06_hardcore` (currently none; inherits class), and/or revisit `boss_hp_multiplier` 0.65 upward. **Multi-knob discipline (L-070):** do NOT move two knobs together without an N=10 probe between them (the iter3 `turn_limit null` overshoot to 85% is the cautionary precedent). Prefer single-knob bisection.
- **hc07**: **no action recommended on this evidence** — +2pp over ceiling is within CI95 of the band edge. If tightened later, it is timer-gated (tune `mission_timer`/`turn_limit` or enemy pressure), but re-probe at N=40 first; do not tune on a marginal forensic.

## Resolution (this PR)

### 1. hc06 re-tuned (evidence, not blind)

`boss_hp_multiplier 0.65 -> 1.04` in `data/core/balance/damage_curves.yaml`, calibrated against post-#2719 (correct) combat:

| boss_hp_multiplier | WR (N=40) | WR (N=100) | verdict                                               |
| ------------------ | --------- | ---------- | ----------------------------------------------------- |
| 0.65 (old)         | —         | 53%        | OOB-high                                              |
| 1.0                | 20%       | 27%        | edge / OOB-high                                       |
| **1.04 (new)**     | **20%**   | **22%**    | **in-band** (def 78%, timeout 0% — all 3 class bands) |
| 1.05               | 12.5%     | —          | OOB-low                                               |

The lever is **steep** near the band (1.0->27%, 1.05->12.5%), so the value was chosen at the band centre (22% @ N=100) for maximum margin. L-073 respected: candidate picked at N>=40, ratified at N=100, never N<=20. `canonical-suite.yaml` updated (`ratified_knob` + `last_wr_n40` + `status`).

### 2. Systemic guardrail (so it doesn't recur)

Root gap: the SoT (§5) declared a merge gate but it was **never wired per-PR** (only a weekly playtest-2 sweep existed). With SPEC A..Q churning combat ~daily, silent band-invalidation recurs by default. Added:

- **`.github/workflows/combat-balance-gate.yml`** — per-PR gate, path-filtered to combat code/data, runs the canonical oracles (N=40, seed 424242, **shards 4 = same as ratification = deterministic**). **Phase 1 = warn-only** (`continue-on-error`) because hc07 is still marginally OOB; flip to blocking once hc07 is in-band.
- **Band-invalidation protocol** (`CANONICAL-AI-PLAYTEST.md` §9): a correct fix that shifts a band ⇒ block + human re-ratify, **never** auto-update the band (Stockfish-fishtest discipline).
- **Follow-up (documented, not built)**: also gate a `random`-policy band (mechanic-robust, already in `--policy all`) so a single-mechanic fix can't silently move the oracle — hc06's fragility came from the greedy policy hardcoding the channel exploit (`CHANNEL_EXPLOIT_MAP`).

### hc07 status

52% (band 30-50%), CI95 [42,62] straddling the ceiling. Policy is `fisico`-only (no channel exploit) → **#2719-independent**; drifted from ~40% for an un-bisected reason. Marginal (+2pp), low priority → separate follow-up; the gate stays warn-only until it is resolved or re-ratified.

### ⚠️ Forbidden-path flag

This PR touches `.github/workflows/` (the CI guardrail) — a guarded path per repo policy — so it is **not auto-mergeable** and is surfaced for explicit review. The balance ratification (`damage_curves.yaml`) is also a master-dd merge gate. Review + merge = master-dd.

## Reproducibility contract (SoT §3)

- Command: `python tools/py/playtest_canonical.py --n 100 --shards 4 --base-port 3341 --label forensic-n100`
- Commit `eb78814d`; seed `424242` (manifest `seed_pinned: true`); host `127.0.0.1`; `LOBBY_WS_ENABLED=false`; `DAMAGE_CURVES_PATH` pinned to `data/core/balance/damage_curves.yaml` (knobs verified present: hc06 `boss_hp_multiplier: 0.65` L260, hc07 `enemy_damage_multiplier_override: 2.1` L269).
- pre-batch gate run: predictCombat sanity (player→enemy hit 45-65% exp_dmg ~1.0-1.55/hit; enemy→player hit 50-60%; party DPR ~8.6/round vs enemy eff-HP ~47 → config non-degenerate) + live N=2 chain smoke (0 failures, deterministic: seed-424242 run = defeat boss_hp 6, reproduced exactly in the N=100 sweep).
- Evidence: `docs/playtest/_canonical-work-forensic-n100/parallel-hardcore_0{6,7}-forensic-n100-merged.json` (100 runs each) + `docs/playtest/forensic-n100-canonical-suite.{md,json}`.

## Method caveats

- **Single-policy (greedy):** the canonical suite-runner drives the **greedy** player policy only (the bands were ratified the same way). The multi-policy triangulation band (random/lookahead2/utility, SoT §1.1) is a **separate tool** (`--policy all`) and was **not** run here. The numbers above are the greedy/ceiling-local proxy. A full per-policy band is a useful follow-up if master-dd wants the skill-vs-luck spread.
- **Data-integrity note:** an initial run accidentally double-wrote hc06's append-mode JSONL (label reuse → 200 dup runs; WR ratio unchanged but CI understated). The reported figures are from a **clean re-run** (work dir cleared first) verified at exactly n=100 per scenario.
