#!/usr/bin/env python3
"""VC telemetry harness -- #2850 S3 (5-stub species-calib follow-up).

Runs N>=50 combat sessions per RATIFIED calibration scenario, captures
`vc_per_actor` from GET /api/session/:id/debrief (a NON-destructive read, taken
AFTER combat resolves but BEFORE /api/session/end finalizes), maps each enemy
unit -> species, and aggregates the telemetry-DERIVABLE VC vectors per target
species. The aggregated means replace the heuristic vc vectors set in S0.

DERIVABILITY CAVEAT (verified vcScoring.js):
  - per_actor IS per-enemy-unit: buildVcSnapshot buckets by
    `event.ia_controlled_unit || event.actor_id` (vcScoring.js:272), and the
    sistema enemy units carry actor_id == unit id == `e_<species_underscored>`.
  - aggregate_indices[name] is {value, coverage[, missing]} or null.
  - COHESION is non-derivable from current sim logs (vcScoring.js:15) -> stays
    heuristic in the pack YAML.
  - TILT returns null in the snapshot path (vcScoring.js:566 -- window-based,
    not snapshot-applicable). The harness collects it defensively; expect 0
    samples, so it ALSO stays heuristic.
  - SETUP weights only overwatch_turns/trap_value/cover_before_attack, none of
    which are in DERIVABLE_RAW_KEYS -> the setup index is always null. Stays
    heuristic; collected defensively as non-derivable (expect 0 samples).
  - Telemetry therefore refines only aggro / risk / explore.

Reuses the ratified runner's combat helpers (post/get/health_check/
plan_player_intents/detect_outcome/load_turn_limit_defeat/MAX_ROUNDS) from
batch_calibrate_badlands_ambient_01 so the simulated play -- and therefore the
enemy AI behavior the VC is scored on -- matches the calibration runs exactly.

Each of the 5 target species appears in exactly ONE scenario:
  - badlands_ambient_01: rubrospina-velox, ferriscroba-detrita
  - badlands_elite_01:   ferrimordax-rutilus
  - foresta_pilot_01:    nebulocornis-mollis, arboryxis-lenis

PORTS: default --host 127.0.0.1:3400 (local test). NEVER prod 3334/3341.
Use modulation 'full' (10x10 grid -- the ratified config) and seed 424242.
"""

import argparse
import json
import statistics
import sys
import time

import batch_calibrate_badlands_ambient_01 as runner

# Telemetry-derivable VC vectors (see module docstring). The aggregate INDEX for
# setup weights only overwatch_turns/trap_value/cover_before_attack -- NONE in
# DERIVABLE_RAW_KEYS -> setup is non-derivable (joins cohesion/tilt). Keeping it
# OUT of DERIVABLE_INDICES guarantees a consumer can never auto-overwrite the
# heuristic setup value from this harness (Codex P2 #2864).
DERIVABLE_INDICES = ["aggro", "risk", "explore"]
NON_DERIVABLE_INDICES = ["cohesion", "setup", "tilt"]

SCENARIOS = {
    "badlands_ambient_01": {
        "scenario_id": "enc_badlands_ambient_01",
        "encounter_class": "badlands_ambient",
        "targets": {"rubrospina-velox", "ferriscroba-detrita"},
    },
    "badlands_elite_01": {
        "scenario_id": "enc_badlands_elite_01",
        "encounter_class": "badlands_elite",
        "targets": {"ferrimordax-rutilus"},
    },
    "foresta_pilot_01": {
        "scenario_id": "enc_foresta_pilot_01",
        "encounter_class": "foresta_pilot",
        "targets": {"nebulocornis-mollis", "arboryxis-lenis"},
    },
}


def _clamp01(x):
    return max(0.0, min(1.0, x))


def _index_value(entry):
    """aggregate_indices[name] is {value, coverage[, missing]} or null or number.

    Returns (value, coverage) -- value is None when non-derivable for this unit.
    """
    if entry is None:
        return None, None
    if isinstance(entry, dict):
        v = entry.get("value")
        cov = entry.get("coverage")
        return (v if isinstance(v, (int, float)) else None), cov
    if isinstance(entry, (int, float)):
        return entry, "full"
    return None, None


def run_one_vc(host, scenario_id, encounter_class, targets, seed, turn_limit_defeat):
    """One session; returns {outcome, samples:{species:{index:[values]}}} or {error}."""
    status, sc = runner.get(f"{host}/api/tutorial/{scenario_id}")
    if status != 200:
        return {"error": f"fetch scenario failed: {sc}"}
    units = sc["units"]
    # Enemy units carry both `id` (e_<species_underscored>) and `species` (pack id).
    unit_species = {u["id"]: u.get("species") for u in units}
    hazard = sc.get("hazard_tiles", [])
    pstart = sc.get("sistema_pressure_start", 75)

    body = {
        "units": units,
        "modulation": "full",  # 10x10 grid -- ratified config (quartet=6x6 off-grid)
        "sistema_pressure_start": pstart,
        "hazard_tiles": hazard,
        "encounter": {"id": scenario_id},
        "encounter_class": encounter_class,
    }
    if seed is not None:
        body["seed"] = seed
    status, start = runner.post(f"{host}/api/session/start", body)
    if status != 200:
        return {"error": f"session/start failed: {start}"}
    sid = start["session_id"]
    state = start["state"]

    outcome = None
    for _rnd in range(1, runner.MAX_ROUNDS + 1):
        outcome = runner.detect_outcome(state, turn_limit_defeat)
        if outcome:
            break
        intents = runner.plan_player_intents(state, None)
        status, resp = runner.post(
            f"{host}/api/session/round/execute",
            {
                "session_id": sid,
                "player_intents": intents,
                "ai_auto": True,
                "priority_queue": True,
            },
        )
        if status != 200:
            break
        state = resp.get("state", state)
    if outcome is None:
        outcome = runner.detect_outcome(state, turn_limit_defeat) or "timeout"

    # Capture vc_per_actor BEFORE /end finalizes (non-destructive GET).
    oc_q = "victory" if outcome == "victory" else outcome
    dstatus, dres = runner.get(f"{host}/api/session/{sid}/debrief?outcome={oc_q}")
    per_actor = dres.get("vc_per_actor") if isinstance(dres, dict) else None

    # Cleanup (destructive end) -- done BEFORE any error bail so a telemetry
    # failure never leaks the session.
    runner.post(f"{host}/api/session/end", {"session_id": sid})

    # Telemetry MUST be present. A non-200 debrief or a null/missing vc_per_actor
    # (older backend without the field, transient route failure, or a failed
    # snapshot build) would silently contribute 0 samples while the run still
    # exits green -- biasing aggregates with n < N or dropping a species. Surface
    # it as a hard error so the outer loop counts + prints it (Codex P2 #2864).
    if dstatus != 200 or not isinstance(per_actor, dict):
        kind = "null" if per_actor is None else type(per_actor).__name__
        return {"error": f"debrief telemetry unavailable (status={dstatus}, vc_per_actor={kind})"}

    samples = {}  # species -> {index -> {"values":[...], "coverage":set}}
    for uid, actor in per_actor.items():
        sp = unit_species.get(uid)
        if sp not in targets:
            continue
        agg = (actor or {}).get("aggregate_indices") or {}
        bucket = samples.setdefault(sp, {})
        for idx in DERIVABLE_INDICES + NON_DERIVABLE_INDICES:
            v, cov = _index_value(agg.get(idx))
            if v is not None:
                slot = bucket.setdefault(idx, {"values": [], "coverage": set()})
                slot["values"].append(v)
                if cov:
                    slot["coverage"].add(cov)
    return {"outcome": outcome, "samples": samples}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default="http://127.0.0.1:3400")
    ap.add_argument("--n", type=int, default=50, help="sessions per scenario (>=50)")
    ap.add_argument("--seed", type=int, default=424242)
    ap.add_argument("--cooldown", type=float, default=0.15)
    ap.add_argument("--out", default=None, help="JSON output path (keep OUT of repo)")
    ap.add_argument("--scenarios", default="all", help="comma list of keys or 'all'")
    ap.add_argument("--skip-health", action="store_true")
    args = ap.parse_args()

    if not args.skip_health and not runner.health_check(args.host):
        print(f"ERROR: backend health check failed at {args.host}/api/health", flush=True)
        return 1
    print(f"OK: backend healthy at {args.host}", flush=True)

    selected = list(SCENARIOS) if args.scenarios == "all" else args.scenarios.split(",")

    species_samples = {}  # species -> {index -> [values across all sessions]}
    species_scenario = {}  # species -> scenario key (provenance)
    per_scenario_meta = {}

    t0 = time.time()
    for scen_key in selected:
        cfg = SCENARIOS[scen_key]
        sid_name = cfg["scenario_id"]
        ec = cfg["encounter_class"]
        targets = cfg["targets"]
        tld = runner.load_turn_limit_defeat(ec, scenario_id=sid_name)
        print(
            f"\n=== {scen_key} ({sid_name}, class={ec}, turn_limit_defeat={tld}) "
            f"N={args.n} targets={sorted(targets)} ===",
            flush=True,
        )
        outcomes = {"victory": 0, "defeat": 0, "timeout": 0, "error": 0}
        for i in range(args.n):
            run_seed = args.seed + i if args.seed is not None else None
            r = run_one_vc(args.host, sid_name, ec, targets, run_seed, tld)
            if "error" in r:
                outcomes["error"] += 1
                print(f"  [{i+1}/{args.n}] E {str(r['error'])[:80]}", flush=True)
                continue
            outcomes[r["outcome"]] = outcomes.get(r["outcome"], 0) + 1
            for sp, idxmap in r["samples"].items():
                species_scenario[sp] = scen_key
                dst = species_samples.setdefault(sp, {})
                for idx, slot in idxmap.items():
                    agg_slot = dst.setdefault(idx, {"values": [], "coverage": set()})
                    agg_slot["values"].extend(slot["values"])
                    agg_slot["coverage"].update(slot["coverage"])
            print(f"  [{i+1}/{args.n}] {r['outcome'][0].upper()}", flush=True)
            if args.cooldown > 0 and i + 1 < args.n:
                time.sleep(args.cooldown)
        per_scenario_meta[scen_key] = {"outcomes": outcomes}

    aggregates = {}
    for sp, idxmap in species_samples.items():
        derivable = {}
        non_derivable_seen = {}
        for idx, slot in idxmap.items():
            vals = slot["values"]
            if not vals:
                continue
            stat = {
                "mean": round(_clamp01(statistics.mean(vals)), 2),
                "n": len(vals),
                "stdev": round(statistics.pstdev(vals), 3) if len(vals) > 1 else 0.0,
                "coverage": sorted(slot["coverage"]),
            }
            if idx in DERIVABLE_INDICES:
                derivable[idx] = stat
            else:
                non_derivable_seen[idx] = stat
        aggregates[sp] = {
            "scenario": species_scenario.get(sp),
            "derivable": derivable,
            "non_derivable_observed": non_derivable_seen,
        }

    out = {
        "harness": "vc_telemetry_harness",
        "ticket": "#2850 S3",
        "n_per_scenario": args.n,
        "seed": args.seed,
        "modulation": "full",
        "derivable_indices": DERIVABLE_INDICES,
        "non_derivable_indices": NON_DERIVABLE_INDICES,
        "elapsed_sec": round(time.time() - t0, 1),
        "per_scenario": per_scenario_meta,
        "species_aggregate": aggregates,
    }
    print("\n=== SPECIES VC AGGREGATE ===")
    print(json.dumps(out, indent=2))
    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(out, f, indent=2)
        print(f"\nWrote {args.out}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
