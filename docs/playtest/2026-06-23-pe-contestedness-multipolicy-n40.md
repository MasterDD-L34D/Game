---
title: 'PE_ratio contestedness -- canonical MULTI-POLICY N=40 re-run -> drop-PE recommendation (master-dd ratify)'
date: 2026-06-23
type: playtest-evidence
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-06-23'
source_of_truth: false
language: en
review_cycle_days: 30
tags:
  [evo-tactics, calibration, pe-ratio, contestedness, multi-policy, n40, composite, negative-result]
related: docs/playtest/2026-06-23-pe-contestedness-orthogonality-n100.md
---

# PE_ratio contestedness -- canonical MULTI-POLICY N=40 re-run

> Supersedes the greedy-only band in `docs/playtest/2026-06-23-pe-contestedness-orthogonality-n100.md`
> (that band was NOT ratifiable -- single-policy diagnostic regime, 3-point outlier
> artifact). This re-run executes the harsh-review's FIX path: canonical MULTI-POLICY
> corpora. **Result = a valid NEGATIVE result: no robust WR-orthogonal contestedness
> band exists -> recommend escalate to (c) drop the PE term.** PROPOSED only; master-dd
> ratifies (SDMG, human-only).

## What changed vs the committed (rejected) evidence

The harsh-review of the greedy-only band raised: (1) wrong policy regime (greedy-only
diagnostic, but the composite gates multi-policy canonical balance); (2) 3-point outlier
artifact; (3) E moderate/outcome-proxy at 0.499. This re-run addresses (1)+(2) directly.

**Verify-first correction (manifest-backed).** The PE composite
(`0.50*win_rate + 0.25*kd_ratio + 0.25*pe_ratio`) lives in
`docs/playtest/canonical-suite.yaml`, whose canonical regime is Restricted-Play
`policies: [random, greedy, lookahead2, utility]` (Jaffe 2012). It is **NOT** the MBTI
regime of `tools/sim/full-loop-batch.js` -- that drives the SEPARATE meta-loop gate
(`canonical-suite.yaml` gate.ci_workflow_metaloop, 7 metrics via
`meta-band-aggregator.js`). The 2026-06-20 handoff framed canonical multi-policy as MBTI;
the manifest says Restricted-Play. master-dd ratified Restricted-Play (2026-06-23). The
multi-policy machinery was already shipped (`calibrate_policies.py` `--policy all`,
TKT-PLAYTEST-TRIANGULATE) -- only the experiment runner needed generalizing.

## Method

- Regime: Restricted-Play `[random, greedy, lookahead2, utility]`, N=40 per policy
  (= canonical ratify N), pooled per oracle (160 runs/oracle).
- Oracles (6, master-dd-chosen broad set incl. a low-pressure one): `hardcore_06`,
  `hardcore_07`, `foresta_pilot_01`, `badlands_pilot_01`, `badlands_elite_01`,
  `badlands_ambient_01`.
- Seed-pinned 424242, node 22, NON-prod backend `:3500` (prod `:3334`/`:3341` untouched).
- Corpora generated via `batch_calibrate_<oracle>.py --policy all` (one triangulation
  file per oracle), pooled by the generalized runner
  `tools/py/run_pe_contestedness_experiment.py --corpora-config ...`.
- Orthogonality = `|Pearson(candidate, won)|` per run, LOWER = less collinear = better;
  formal reject threshold `>= 0.6`. Band = `mean +/- 2*sd` of the selected candidate's
  per-oracle aggregate value.
- Backend provenance: main checkout `5c547ec9`; combat behavior == `origin/main 7abe8651`
  for these oracles -- the only drift is `radici_ancora_planare` (#3014), inert here
  (assigned to no roster: appears only in `data/traits/species_affinity.json`, a procgen
  weight map; `computeAnchorDR` returns 0 for every unit in all 6 oracles).

## Result -- orthogonality |corr(candidate, won)| (LOWER = better)

| oracle              | n       | WR   | E_dmg_margin           | F_contest_combined | D_turns_contest |
| ------------------- | ------- | ---- | ---------------------- | ------------------ | --------------- |
| hardcore_06         | 160     | 0.51 | **0.666**              | 0.727              | 0.882           |
| hardcore_07         | 160     | 0.29 | **0.000** (degenerate) | 0.000              | 0.765           |
| foresta_pilot_01    | 160     | 0.35 | 0.263                  | 0.316              | 0.713           |
| badlands_pilot_01   | 160     | 0.38 | 0.295                  | 0.338              | 0.647           |
| badlands_elite_01   | 160     | 0.11 | 0.359                  | 0.252              | 0.156           |
| badlands_ambient_01 | 160     | 0.75 | 0.229                  | 0.496              | 0.979           |
| **POOLED**          | **960** | --   | **0.301**              | 0.305              | 0.522           |

Selected (least-collinear CONTEST, pooled): **E_dmg_margin 0.301 < 0.6 -> NOT formally rejected.**

## Why the 0.301 does NOT support ratifying E (3 findings, both reviewers verified)

1. **The 0.301 is FLATTERED by a degenerate oracle.** `hardcore_07` (pod_rush timer-race)
   has `dmg_taken_player` AND `dmg_dealt_player` identically 0 across all 160 runs (no
   damage telemetry -- losses are clock timeouts, not damage). So `E = dmg_taken/(taken+
dealt) = 0` for every hc07 run: a 160-point zero-variance block that mathematically
   drags the pooled |corr| down. **Excluding hc07: pooled |corr| = 0.479** (~= the
   already-rejected greedy-only 0.499). hc07 cannot inform a damage-margin band -- it has
   no damage data -- so its inclusion in the E pool is a data-validity error, not a real
   low-collinearity signal.

2. **On skilled play E is an outcome-proxy.** Per-policy E |corr| (hc07 excluded):
   `random 0.000` (always loses -> won constant -> degenerate), `greedy 0.426`,
   `lookahead2 0.684`, `utility 0.706`. On the policies that represent competent play
   (lookahead2/utility), E is **above the 0.6 reject line**. A strong policy wins _by_
   absorbing less relative damage, so E largely relabels the outcome. The low pooled
   number survives only because `random` (constant loss) + hc07 (zero damage) dilute it.

3. **The band is not ratifiable.** Per-oracle E aggregate: 0.245 / 0.000 (hc07) / 0.379 /
   0.445 / 0.605 (badlands_elite) / 0.300 -> band **[0.000, 0.702]** (sd 0.186). Excluding
   the degenerate hc07: **[0.144, 0.646]** (sd 0.125) -- still wide, still badlands_elite-
   driven. No alternative candidate is better: F 0.305 (~=E), D 0.522 (worse; D is highly
   collinear on timer/easy oracles: hc07 0.765, badlands_ambient 0.979).

**Related finding (composite-wide).** `kd_ratio` -- the composite's OTHER non-WR term --
is itself a strong outcome-proxy where per-run kd exists (hc07 skilled policies: |corr|
0.74-0.90). The "three orthogonal axes" premise is shaky: any damage/time/kill signal in a
win/lose tactical combat is causally downstream of the outcome.

## Harsh-review (2 independent passes, both adversarial)

- **balance-illuminator (calibration, quantitative): CONFIRM drop-PE.** Independently
  recomputed every number (pooled 0.301, no-hc07 0.479, per-policy 0.000/0.426/0.684/0.706
  -- all matched). Salvage analysis (damage-oracles-only band / alt normalization /
  turns-only / skill-residual) -> none clean: "any damage/time signal correlates with
  outcome by construction in a tactical combat with a winner/loser. Truly orthogonal
  contestedness would require signals not causally downstream of winning -- e.g. AP-usage
  spread, positional entropy, state-change frequency -- none currently instrumented."
  Flagged the hc07 zero-variance pooling as an analysis bug (correctable; does not change
  the verdict). Reweight proposal if dropped: ~`0.70*WR + 0.30*kd_norm` (owner ratifies).
- **cavecrew-reviewer (adversarial): numbers sound; do NOT pre-decide.** E at 0.301 (even
  0.479) is < the 0.6 formal threshold, so dropping E is a QUALITATIVE "materially
  collinear" judgment, not a rule -- it requires explicit master-dd sign-off, and the hc07
  exclusion must be stated as a principled data-validity disqualification (no damage
  telemetry), not a post-hoc convenience. Recommendation: present master-dd the framed
  choice, not a pre-decided escalation.

Both folded in below.

## Recommendation (PROPOSED) + the decision for master-dd

The selection criterion formally passes (E 0.301 < 0.6). But that pass is an artifact of a
zero-damage oracle + a constant-loss policy; on damage-capable oracles and skilled
policies E is collinear with the outcome (0.479 pooled, 0.68-0.71 skilled), and no
contestedness formula achieves WR-orthogonality with the current instrumentation. This is
the handoff's escalation condition ("if contestedness ALSO proves materially collinear ...
valid negative result"). **My recommendation: (c) drop the PE term.** It is a judgment
call -- master-dd decides among:

- **(a) Accept E at 0.301 on the 6-oracle pool.** Honors the formal threshold. Risk: locks
  a metric whose orthogonality is a degeneracy artifact into the balance authority (the
  SDMG anti-pattern the composite exists to prevent).
- **(b) Drop hc07 (no damage telemetry) and accept E at 0.479 on 5 oracles.** Principled
  exclusion, but 0.479 is moderate and skilled-policy E is 0.68-0.71 -> still largely an
  outcome-proxy; band [0.144, 0.646] still wide.
- **(c) Drop the PE term (RECOMMENDED).** Composite = re-weighted `win_rate + kd_ratio`
  (illuminator suggests ~`0.70*WR + 0.30*kd_norm`; exact split = master-dd). Valid
  negative result; matches the pressure-source rejection (both tension proxies track the
  outcome). NB kd_ratio is itself partly collinear -> a deeper "is any non-WR axis viable"
  question remains (would need new instrumentation: AP-spread / positional entropy), a
  separate follow-up.

## Guardrails honored

- No auto-ratify, no manifest write, no P4/P5 gate flip without master-dd.
- Worktree off origin/main; prod `:3334`/`:3341` never touched (non-prod `:3500`).
- Harness changes are TDD'd (44 tests) and reproduce the committed greedy-only evidence
  byte-for-byte (back-compat).

## Reproduce

Backend on a NON-prod port (NEVER 3334/3341), node 22, ratified knobs (committed
`data/core/balance/damage_curves.yaml`):

```
PORT=3500 LOBBY_WS_ENABLED=false node apps/backend/index.js   # background; wait /api/health
```

Generate one multi-policy corpus per oracle (`--policy all` = the 4 Restricted-Play
policies; seed-pinned; NB `hardcore_07` takes NO `--encounter-class`):

```
for o in "hardcore06 hardcore" "foresta_pilot_01 foresta_pilot" \
         "badlands_pilot_01 badlands" "badlands_elite_01 badlands_elite" \
         "badlands_ambient_01 badlands_ambient"; do
  set -- $o
  py tools/py/batch_calibrate_$1.py --host http://127.0.0.1:3500 --n 40 --seed 424242 \
     --policy all --skip-health --encounter-class $2 --out docs/playtest/_pe-n40-$1-allpol.json
done
py tools/py/batch_calibrate_hardcore07.py --host http://127.0.0.1:3500 --n 40 --seed 424242 \
   --policy all --skip-health --out docs/playtest/_pe-n40-hardcore_07-allpol.json   # NO --encounter-class
```

Analyze (corpora paths -> a config map, oracle -> [corpus]):

```
python tools/py/run_pe_contestedness_experiment.py \
  --corpora-config <(echo '{"hardcore_06":["docs/playtest/_pe-n40-hardcore_06-allpol.json"], ...}') \
  --json-out docs/playtest/_pe-n40-experiment-result.json
```

(The `_pe-n40-*` corpora are seed-pinned and gitignored -- regenerate via the above. The
back-compat default corpora set reproduces the greedy-only PR2 evidence byte-for-byte.)
