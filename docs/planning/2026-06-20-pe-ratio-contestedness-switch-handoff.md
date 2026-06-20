---
title: 'PE_ratio -- switch to contestedness (sec 4.5 negative-result branch) -- calib handoff'
date: 2026-06-20
type: planning
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-06-20'
source_of_truth: false
language: en
review_cycle_days: 30
tags: [evo-tactics, calibration, g2, pe-ratio, composite, contestedness]
related: docs/superpowers/specs/2026-06-18-composite-pe-ratio-experiment-design.md
---

# PE_ratio -- switch to contestedness (calib-session handoff)

## Decision (2026-06-20, master-dd)

**(b) SWITCH the composite's PE source from pressure-trajectory to the design's
alternate "contestedness" proxy (sec 4.5 negative-result branch).** PE-from-pressure
is REJECTED as the PE source.

**Why** (evidence `docs/playtest/2026-06-19-pe-ratio-experiment-n100.md`): all three
ratified balance oracles run at HIGH pressure, so every PE-from-pressure candidate
near-SATURATES (`pe_ratio` 0.81-0.94 everywhere). No robust `|corr|` winner exists
(N-sensitive noise: B won the N=100 pool at 0.197, A won the clean N=40 pool at 0.092).
The PE term mostly shifts the composite UP uniformly and adds little discrimination
between healthy and unhealthy balance -- so ratifying the proposed band `[0.236, 0.815]`
(k=2.0) would lock a near-zero-discrimination metric into the balance authority (SDMG
anti-pattern), and the composite would fail its anti-false-balance purpose. The design
(`2026-06-18-composite-pe-ratio-experiment-design.md` sec 4.5) explicitly anticipated
this and prescribes the contestedness fallback. The proposed pressure band is NOT
written to the manifest -- it is dropped, not ratified.

## Why contestedness can work where pressure did not

`turns-to-resolve` + `dmg_taken` is a challenge-skill MARGIN. Both derive from the raw
combat event stream (`{turn, damage_dealt, ...}`) that the sim emits on EVERY run/oracle
-- so, unlike the pressure trajectory (which needed per-batch instrumentation in
`batch_calibrate_hardcore06.py` only), contestedness needs NO new pressure-style
instrumentation, just a per-run rollup of data already produced. It is also not pinned
by high-pressure saturation: a curb-stomp resolves in few turns with low party damage; a
nail-biter takes many turns with high damage taken -- real variance across the SAME
oracles where pressure saturated.

## Plan (calib-session owns; tools/py = their territory)

1. **Add contestedness candidate formulas** to `tools/py/pe_candidates.py` (mirror the
   existing pressure candidate shape):
   - a `turns-to-resolve` candidate (e.g. normalized rounds-to-resolution; longer
     contested fight -> higher tension, capped/normalized to 0..1);
   - a `dmg_taken` candidate (party damage taken / a normalizer = challenge-skill margin);
   - optionally a combined turns\*dmg candidate.
     Higher = healthier tension, per the design's `pe_ratio` 0..1 convention.
2. **Per-run rollup**: confirm `aggregate()` exposes per-run `turns_to_resolve` +
   `dmg_taken` (derive from the raw events if not already surfaced -- the data is in the
   event stream; this is a rollup, NOT new instrumentation). No pressure-trajectory
   dependency.
3. **Re-run the orthogonality experiment** (design 3.2-3.4) with the contestedness
   candidates on the oracles (`hardcore_06`, `badlands_elite_01`, `foresta_pilot_01`;
   add a low-pressure oracle if one exists). N=100 seed-pinned (424242), node 22,
   backend `127.0.0.1:3400` shared-WS (**NEVER prod 3334/3341**; kill by
   `Get-NetTCPConnection -LocalPort 3400`).
4. **Select** the candidate LEAST collinear with `win_rate` on real run data (the
   design's empirical selection criterion, not a guess). If a `|corr|` winner is now
   robust (not N-sensitive), keep it; document the selection report.
5. **Derive the composite band** off the new contestedness composite (mean +/- k\*sd, the
   k chosen per the design). Harsh-review the derivation (CANONICAL sec 9), then present
   for **master-dd ratification** (SDMG, human-only, never auto).
6. **After ratification**: write the band into `canonical-suite.yaml`; update CANONICAL +
   the composite spec with the ratified definition + evidence; flip P4 gate-2/4b + P5 to
   consume the real composite band.

## Guardrails

- **Owner-gated**: master-dd ratifies BOTH the candidate selection AND the band (SDMG).
  The tool only proposes with numbers.
- **N=100 = maintainer run**, not per-PR.
- **Escalation**: if contestedness ALSO proves materially collinear with WR (pressure
  tracks kills; contestedness MIGHT too), that is a valid negative result -- escalate to
  (c) drop the PE term (composite = re-weighted `win_rate` + `kd_ratio`) or defer the
  composite gate, and say so in the selection report. Do not force a marginal band.
- **Do NOT** auto-ratify, auto-flip P4/P5, or write the manifest band without master-dd.

## Status

- PE-from-pressure band `[0.236, 0.815]` = DROPPED (not ratified, not in manifest).
- `attach_composite_terms` wiring (#2867) + the badlands/foresta instrumentation (#2869)
  stay -- the composite is still computable; only the PE SOURCE changes.
- Next owner action = the contestedness experiment above (single-owner, with the G2 N=40
  leverage ticket).
