#!/usr/bin/env python3
"""Safety-gated auto-ratify of a calibrated KNOB to production (G2 P4).

Ships the GATE machinery + an atomic comment-preserving production writer + a
provenance sidecar, ALL fail-closed, behind ``--auto-ratify`` (off by default) and a
second ``--confirm-prod`` for the actual production write (owner decision 2026-06-17:
proposal + 2nd-confirm; never a single-flag auto write). The orchestrator NEVER writes
a BAND -- only the ratified KNOB (CANONICAL-AI-PLAYTEST sec 9; reconciled by the spec
sec 2/5). The live prod write is intentionally UNREACHABLE today: gate-2/gate-4b abort
on a None composite (the batch aggregate does not yet emit pe_ratio/kd_ratio), gate-3
needs a stored seed-pinned baseline, and the flag stays off until a harsh-reviewer SDMG
falsification pass (ADR-0026 #7). See
docs/superpowers/specs/2026-06-17-per-template-calibration-design.md sec 5.

Design hardened against the 8 P1 fail-open vectors found by the P4 verify+red-team:
every gate returns a strict bool (never None/dict), the aggregate is fail-closed, the
prod write is two-phase atomic with a read-back reconcile, and the provenance CI is a
real Wilson interval (never fabricated).
"""

from __future__ import annotations

import math
import os
import re
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from objective import evaluate_metric  # noqa: E402

FORENSIC_N = 100

# Aggregate metric keys a seed-pinned re-verify must match bit-identically. These are
# the keys the batch aggregate actually emits (win_rate/kd_avg/defeat_rate); see
# batch_calibrate_hardcore06.py aggregate().
_REVERIFY_KEYS = ("win_rate", "kd_avg", "defeat_rate")
# Run-plan keys: seed offsets are cumulative-N/shard-dependent, so a re-verify must
# replay the EXACT same plan, not merely the same canonical_seed.
_PLAN_KEYS = ("shards", "n", "seed")


def _metrics(result):
    """A result may carry metrics under a 'metrics' key (orchestrator result shape) or
    flat at the top level."""
    return result.get("metrics") or result


def _is_real_number(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def gate_forensic_n(result, required_n=FORENSIC_N):
    """Gate 1: the justifying run reached forensic N (>=100). Fail-closed on missing/non-int."""
    n = result.get("n")
    if n is None:
        n = _metrics(result).get("n")
    return isinstance(n, int) and not isinstance(n, bool) and n >= required_n


def gate_wr_in_band(result, band):
    """Gate 4b helper: win-rate lands inside the EXISTING band. If WR cannot reach the
    band at the candidate knob, that is the #2719 stale-band signal (handled by the caller).
    Fail-closed on missing/non-numeric WR."""
    wr = _metrics(result).get("win_rate")
    if not _is_real_number(wr):
        return False
    return band[0] <= wr <= band[1]


def gate_composite(result, *, objective_metric, composite_band):
    """Gate 2: the composite_metric is computable AND inside its band. FAIL-CLOSED if the
    composite is None (a missing term -- e.g. pe_ratio/kd_ratio not yet in the aggregate)
    or if no composite_band is supplied (a scalar cannot be verified against no band). NEVER
    falls back to a WR-only subset (that would silently diverge from the manifest contract,
    the #2719 class). A WR-only / None-flagged read is acceptable only in advisory output."""
    if composite_band is None:
        return False
    try:
        comp = evaluate_metric(objective_metric, _metrics(result))
    except (KeyError, ValueError, TypeError):
        return False
    if not _is_real_number(comp):
        return False
    return composite_band[0] <= comp <= composite_band[1]


def gate_seed_reverify(baseline, reverify, *, node_version, expected_node="22"):
    """Gate 3: a seed-pinned re-run reproduces the baseline aggregate bit-identically.
    FAIL-CLOSED unless ALL hold: a stored baseline exists; the runtime is the canonical
    node (determinism is within-runtime only, CANONICAL sec 3 rule 8); the run plan
    (shards + n + seed) matches; and every compared aggregate metric is present and equal."""
    if baseline is None or reverify is None:
        return False
    if str(node_version) != str(expected_node):
        return False
    # FAIL-CLOSED presence guard for BOTH metric AND plan keys, on BOTH dicts: a
    # plan-less (or metric-less) pair compares None==None and would pass vacuously --
    # that proves nothing (no seed pinned, no shard/N matched). Require completeness first.
    required = _REVERIFY_KEYS + _PLAN_KEYS
    if any(k not in baseline for k in required) or any(k not in reverify for k in required):
        return False
    for k in required:
        if baseline.get(k) != reverify.get(k):
            return False
    return True


def aggregate_gate_flags(flags):
    """Strict fail-closed aggregate (R1 short-circuit guard): pass ONLY if every flag is
    the bool True. None / dict / truthy-int / empty -> fail. No gate's diagnostic object
    can flip the chain to pass."""
    if not flags:
        return False
    return all(v is True for v in flags.values())


def wilson_interval(wins, n, z=1.96):
    """Wilson score 95% interval on a proportion (real CI for the provenance stamp; never
    a fabricated placeholder). Degenerate n<=0 -> (0.0, 0.0)."""
    if n <= 0:
        return (0.0, 0.0)
    p = wins / n
    denom = 1.0 + z * z / n
    centre = (p + z * z / (2 * n)) / denom
    margin = (z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / denom
    return (max(0.0, centre - margin), min(1.0, centre + margin))


# --- Atomic comment-preserving production writer -------------------------------
# damage_curves.yaml + canonical-suite.yaml are runtime/SoT-parsed and carry rich history
# comments + rationale blocks. yaml.safe_dump drops comments and the optuna staging writer
# block-rebuilds (also dropping inner comments), so neither P2/P3 writer is reusable for a
# PROD write. These do a SURGICAL line-targeted value replace that preserves everything else.

def _indent(line):
    return len(line) - len(line.lstrip(" "))


def _format_value(value):
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, (int, float)):
        return repr(value)
    return str(value)


def _set_value_line(line, value):
    """Replace the scalar value on a 'key: value [# comment]' line, preserving indent,
    key, and any trailing comment."""
    m = re.match(r"^(\s*[^:]+:\s*)(.*?)(\s*#.*)?$", line)
    if not m:
        raise ValueError(f"cannot parse value line: {line!r}")
    return f"{m.group(1)}{_format_value(value)}{m.group(3) or ''}"


def validate_field_allowed(field, knob_space):
    """Allowlist the writable field against the scenario's manifest knob_space (NOT the
    schema doc comment, which is behind the runtime). target_band is never a writable knob;
    fail-closed (ValueError) on anything not in knob_space."""
    if not knob_space or field not in knob_space:
        raise ValueError(
            f"field {field!r} not in scenario knob_space {sorted(knob_space or [])} "
            f"-- refusing to write (fail-closed)"
        )
    return True


def replace_scenario_override_knob(text, scenario_id, field, value):
    """Surgically replace data.scenario_overrides[scenario_id][field] in damage_curves.yaml
    TEXT, preserving every comment/rationale/sibling. Raises KeyError if the path is absent
    (never silently adds a new knob field -- fail-closed)."""
    lines = text.split("\n")
    so_idx = next((i for i, ln in enumerate(lines)
                   if _indent(ln) == 0 and re.match(r"^scenario_overrides\s*:", ln)), None)
    if so_idx is None:
        raise KeyError("scenario_overrides")
    scen_idx = scen_indent = None
    for i in range(so_idx + 1, len(lines)):
        ln = lines[i]
        if not ln.strip() or ln.lstrip().startswith("#"):
            continue
        ind = _indent(ln)
        if ind == 0:
            break  # left scenario_overrides block
        if re.match(rf"^\s+{re.escape(scenario_id)}\s*:", ln):
            scen_idx, scen_indent = i, ind
            break
    if scen_idx is None:
        raise KeyError(scenario_id)
    for i in range(scen_idx + 1, len(lines)):
        ln = lines[i]
        if not ln.strip() or ln.lstrip().startswith("#"):
            continue
        if _indent(ln) <= scen_indent:
            break  # next scenario / dedent
        if re.match(rf"^\s+{re.escape(field)}\s*:", ln):
            lines[i] = _set_value_line(ln, value)
            return "\n".join(lines)
    raise KeyError(field)


def replace_ratified_knob(text, scenario_id, field, value):
    """Surgically replace scenarios[id].ratified_knob[field] in canonical-suite.yaml TEXT,
    preserving the inline-map's other knobs, comments, and -- critically -- target_band
    (the write surface is knob-only by construction; CANONICAL sec 9). Raises KeyError if
    the scenario / ratified_knob / field is absent."""
    lines = text.split("\n")
    item_idx = item_indent = None
    for i, ln in enumerate(lines):
        if re.match(rf"^(\s*)-\s*id:\s*{re.escape(scenario_id)}\s*(#.*)?$", ln):
            item_idx, item_indent = i, _indent(ln)
            break
    if item_idx is None:
        raise KeyError(scenario_id)
    rk_idx = None
    for i in range(item_idx + 1, len(lines)):
        ln = lines[i]
        if not ln.strip() or ln.lstrip().startswith("#"):
            continue
        ind = _indent(ln)
        if ind <= item_indent and re.match(r"^\s*-", ln):
            break  # next list item
        if ind <= item_indent:
            break  # dedent out of the list item
        if re.match(r"^\s+ratified_knob\s*:", ln):
            rk_idx = i
            break
    if rk_idx is None:
        raise KeyError("ratified_knob")
    # Left-anchor so the field cannot bind as a SUFFIX of a longer sibling key on the same
    # inline map (e.g. 'enemy_damage_multiplier_override' must not match inside
    # 'secondary_enemy_damage_multiplier_override'); count=1 would otherwise rewrite the
    # wrong knob. The required ':' already prevents prefix collisions.
    pat = re.compile(rf"(?<![\w])({re.escape(field)}\s*:\s*)([^,}}\s]+)")
    if not pat.search(lines[rk_idx]):
        raise KeyError(field)
    lines[rk_idx] = pat.sub(lambda m: f"{m.group(1)}{_format_value(value)}", lines[rk_idx], count=1)
    return "\n".join(lines)


def _atomic_replace(path, text):
    """Write `text` to a temp sibling then os.replace (atomic rename within the same dir).
    Leaves the original untouched on any failure before the rename."""
    p = Path(path)
    fd, tmp = tempfile.mkstemp(dir=str(p.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as fh:
            fh.write(text)
        os.replace(tmp, str(p))
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def atomic_ratify_write(scenario_id, field, value, *, prod_path, manifest_path, knob_space):
    """Gate-5 production write: atomically set the ratified KNOB in BOTH the prod
    damage_curves.yaml (scenario_overrides) AND the manifest (ratified_knob), with a
    post-write read-back reconcile that the two agree. FAIL-CLOSED: the field must be in
    knob_space (never target_band); both new contents are built + parse-validated BEFORE
    any rename; the prod YAML is replaced first, the manifest LAST; a reconcile mismatch
    raises. 2-file FS atomicity is impossible -- read-back-reconcile is the safe equivalent."""
    import yaml

    validate_field_allowed(field, knob_space)  # fail-closed BEFORE any file touch

    prod_text = Path(prod_path).read_text(encoding="utf-8")
    man_text = Path(manifest_path).read_text(encoding="utf-8")
    new_prod = replace_scenario_override_knob(prod_text, scenario_id, field, value)
    new_man = replace_ratified_knob(man_text, scenario_id, field, value)

    pd = yaml.safe_load(new_prod)
    md = yaml.safe_load(new_man)
    if pd["scenario_overrides"][scenario_id][field] != value:
        raise RuntimeError("prod build validation failed")
    scen = next((s for s in md.get("scenarios", []) if s.get("id") == scenario_id), None)
    if scen is None or scen.get("ratified_knob", {}).get(field) != value:
        raise RuntimeError("manifest build validation failed")

    _atomic_replace(prod_path, new_prod)
    _atomic_replace(manifest_path, new_man)

    rpd = yaml.safe_load(Path(prod_path).read_text(encoding="utf-8"))
    rmd = yaml.safe_load(Path(manifest_path).read_text(encoding="utf-8"))
    rscen = next((s for s in rmd.get("scenarios", []) if s.get("id") == scenario_id), None)
    prod_v = rpd["scenario_overrides"][scenario_id][field]
    man_v = rscen["ratified_knob"][field] if rscen else None
    if not (prod_v == value == man_v):
        raise RuntimeError(
            f"post-write reconcile mismatch: prod={prod_v} manifest={man_v} expected={value}"
        )
    return {"prod_path": prod_path, "manifest_path": manifest_path,
            "scenario_id": scenario_id, "field": field, "value": value, "reconciled": True}


# --- Gate evaluation + provenance + orchestration ------------------------------

def evaluate_gates(result, *, band, composite_band, objective_metric,
                   baseline, reverify, node_version, expected_node="22"):
    """Compute the 4 PRE-WRITE gates independently (gate-5 atomic write is evaluated
    later, only under --confirm-prod). Each is a strict bool; the aggregate is fail-closed.
    band_reachable (gate-4b) = WR inside the EXISTING band -- combined with composite
    (gate-2) it is the structural stale-band signal (knob-cannot-reach-band => #2719),
    needing no P5 detector. The write-surface invariant (gate-4a) is enforced structurally
    by the writer (validate_field_allowed + knob-only replacers), tested separately."""
    flags = {
        "forensic_n": gate_forensic_n(result),
        "composite": gate_composite(result, objective_metric=objective_metric,
                                    composite_band=composite_band),
        "seed_reverify": gate_seed_reverify(baseline, reverify, node_version=node_version,
                                            expected_node=expected_node),
        "band_reachable": gate_wr_in_band(result, band),
    }
    return {"gates": flags, "all_pass": aggregate_gate_flags(flags)}


def _dirty_suffix(stdout, returncode):
    """Conservative dirty marker for the provenance stamp: '-dirty' if the tree has changes,
    '-unknown' if `git status` itself errored (rc!=0) so an ambiguous git state is never
    recorded as a false-clean SHA, '' only when status succeeded AND was empty."""
    if stdout and stdout.strip():
        return "-dirty"
    if returncode != 0:
        return "-unknown"
    return ""


def git_commit():
    """`<short-sha>[-dirty|-unknown]` for the provenance stamp, or None if git is unavailable."""
    import subprocess
    try:
        sha = subprocess.run(["git", "rev-parse", "--short", "HEAD"],
                             capture_output=True, text=True, check=True).stdout.strip()
        st = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True)
        return f"{sha}{_dirty_suffix(st.stdout, st.returncode)}"
    except Exception:
        return None


def build_provenance(*, scenario_id, field, value, band, seed, n, wins, objective_metric,
                     composite_band, result, gates, git_commit_val, coding_agent, trace_id,
                     method="A-optuna-tpe", method_ref=None, source_report=None,
                     timestamp_utc=None):
    """Provenance sidecar payload. composite = the NAMED objective_metric string + its
    numeric value (None if uncomputable -- surfaced, never faked, never best_value_distance).
    ci = a REAL Wilson interval when win counts exist, else null + an explicit reason (never
    a fabricated/placeholder number). All ADR-0011 attribution (coding_agent/trace_id) is
    captured here, not assumed from a helper."""
    try:
        comp = evaluate_metric(objective_metric, _metrics(result)) if objective_metric else None
    except (KeyError, ValueError, TypeError):
        comp = None
    if not _is_real_number(comp):
        comp = None
    if isinstance(wins, int) and not isinstance(wins, bool) and isinstance(n, int) \
            and not isinstance(n, bool) and n > 0:
        lo, hi = wilson_interval(wins, n)
        ci = {"lo": round(lo, 4), "hi": round(hi, 4), "method": "wilson95", "z": 1.96}
        ci_reason = None
    else:
        ci = None
        ci_reason = "win count or N unavailable -- CI not computed (P4 gap)"
    return {
        "scenario_id": scenario_id,
        "field": field,
        "ratified_knob": {field: value},
        "seed": seed,
        "n": n,
        "composite": {"formula": objective_metric, "value": comp},
        "composite_band": list(composite_band) if composite_band else None,
        "ci": ci,
        "ci_reason": ci_reason,
        "target_band": list(band) if band else None,
        "git_commit": git_commit_val,
        "coding_agent": coding_agent,
        "trace_id": trace_id,
        "method": method,
        "method_ref": method_ref,
        "source_report": source_report,
        "timestamp_utc": timestamp_utc,
        "gates_passed": dict(gates),
    }


def write_provenance_sidecar(payload, *, out_dir, filename):
    """Emit the provenance sidecar JSON (never inline in the runtime-parsed YAML/manifest)."""
    import json
    d = Path(out_dir)
    d.mkdir(parents=True, exist_ok=True)
    p = d / filename
    p.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return str(p)


def auto_ratify(scenario_id, *, result, band, composite_band, objective_metric, knob_space,
                field, value, baseline=None, reverify=None, node_version=None, seed=None,
                wins=None, n=None, prod_path=None, manifest_path=None, coding_agent=None,
                trace_id=None, source_report=None, timestamp_utc=None, confirm_prod=False):
    """Orchestrate safety-gated auto-ratify. Returns {action, all_pass, gates, provenance,
    written[, write]}.

    action: 'blocked' (a gate failed -- NO write even with confirm_prod), 'proposal' (all
    gates pass but confirm_prod is False -- the default; a human still ratifies), or
    'written' (all gates pass AND confirm_prod -- the atomic prod write happened). The live
    write is reachable ONLY when every gate passes AND the maintainer passes --confirm-prod
    (owner decision: proposal + 2nd confirm)."""
    g = evaluate_gates(result, band=band, composite_band=composite_band,
                       objective_metric=objective_metric, baseline=baseline,
                       reverify=reverify, node_version=node_version)
    prov = build_provenance(
        scenario_id=scenario_id, field=field, value=value, band=band, seed=seed, n=n,
        wins=wins, objective_metric=objective_metric, composite_band=composite_band,
        result=result, gates=g["gates"], git_commit_val=git_commit(),
        coding_agent=coding_agent, trace_id=trace_id, source_report=source_report,
        timestamp_utc=timestamp_utc,
    )
    if not g["all_pass"]:
        return {"action": "blocked", "all_pass": False, "gates": g["gates"],
                "provenance": prov, "written": False}
    if not confirm_prod:
        return {"action": "proposal", "all_pass": True, "gates": g["gates"],
                "provenance": prov, "written": False}
    w = atomic_ratify_write(scenario_id, field, value, prod_path=prod_path,
                            manifest_path=manifest_path, knob_space=knob_space)
    prov["gates_passed"]["atomic_write"] = w["reconciled"]
    return {"action": "written", "all_pass": True, "gates": g["gates"],
            "provenance": prov, "written": True, "write": w}


# --- CLI helpers ---------------------------------------------------------------

def _node_major(version_str):
    """'v22.15.0' -> '22'. Fail-closed (None) on garbage -- gate-3 must pin node 22
    (CANONICAL sec 3 rule 8); an unknown runtime cannot satisfy the within-runtime
    determinism requirement."""
    if not version_str:
        return None
    m = re.match(r"^v?(\d+)\.", version_str.strip())
    return m.group(1) if m else None


def _node_version_string():
    import subprocess
    try:
        return subprocess.run(["node", "--version"], capture_output=True, text=True,
                              check=True).stdout.strip()
    except Exception:
        return None


def gen_trace_id():
    """uuidv7 (time-ordered) for ADR-0011 Trace-Id in the provenance stamp. No reusable
    producer exists in the repo, so generate fresh."""
    import os
    import time
    ms = int(time.time() * 1000)
    rb = bytearray(os.urandom(10))
    out = bytearray(16)
    out[0:6] = ms.to_bytes(6, "big")
    out[6] = 0x70 | (rb[0] & 0x0F)
    out[7] = rb[1]
    out[8] = 0x80 | (rb[2] & 0x3F)
    out[9:16] = rb[3:10]
    h = out.hex()
    return f"{h[0:8]}-{h[8:12]}-{h[12:16]}-{h[16:20]}-{h[20:32]}"


def main():
    import argparse
    import json
    import os

    from suite_manifest import (
        DEFAULT_MANIFEST_PATH,
        get_scenario,
        load_manifest,
        scenario_band,
        scenario_knob_space,
        scenario_objective,
    )

    ap = argparse.ArgumentParser(description="G2 P4 safety-gated auto-ratify (KNOB to production)")
    ap.add_argument("--scenario", required=True)
    ap.add_argument("--auto-ratify", action="store_true",
                    help="opt-in: run the 5 gates + emit a proposal + provenance sidecar (NO prod write)")
    ap.add_argument("--confirm-prod", action="store_true",
                    help="SECOND confirmation: actually write prod (only if --auto-ratify gates ALL pass)")
    ap.add_argument("--result", help="forensic run aggregate JSON (win_rate, kd_avg, n, shards, seed, win_count)")
    ap.add_argument("--baseline", help="seed-pinned baseline aggregate JSON for gate-3")
    ap.add_argument("--value", type=float, help="candidate knob value to ratify")
    ap.add_argument("--composite-band", nargs=2, type=float, metavar=("LO", "HI"),
                    help="band for the scalar composite (none today -> gate-2 fail-closed)")
    ap.add_argument("--provenance-dir", default=None)
    ap.add_argument("--dry-run", action="store_true",
                    help="synthetic forensic result, no backend/files (smoke; uses the real manifest objective -> blocks today)")
    args = ap.parse_args()

    if not args.auto_ratify:
        print("Refusing to act without --auto-ratify (gate machinery is opt-in, OFF by default).",
              file=sys.stderr)
        return 2

    manifest = load_manifest(DEFAULT_MANIFEST_PATH)
    sc = get_scenario(manifest, args.scenario)
    band = scenario_band(manifest, args.scenario)
    knob_space = scenario_knob_space(manifest, args.scenario)
    if not knob_space:
        print(f"{args.scenario}: no knob_space in manifest", file=sys.stderr)
        return 2
    objective = scenario_objective(manifest, args.scenario)
    field = next(iter(knob_space))
    composite_band = list(args.composite_band) if args.composite_band else None

    node_ver = _node_major(_node_version_string())
    coding_agent = os.environ.get("CODING_AGENT")
    trace_id = gen_trace_id()

    # --dry-run is a smoke: it must NEVER mutate the live files, regardless of how the
    # manifest objective evolves (a future WR-only objective + --composite-band could
    # otherwise make a synthetic dry-run satisfy the gates). Hard-force no prod write.
    confirm_prod = args.confirm_prod and not args.dry_run

    if args.dry_run:
        mid = (band[0] + band[1]) / 2.0
        result = {"win_rate": mid, "kd_avg": 0.8, "defeat_rate": 0.78, "n": 100,
                  "shards": 4, "seed": 424242, "win_count": int(round(mid * 100))}
        baseline = dict(result)
        value = args.value if args.value is not None else (sc.get("ratified_knob") or {}).get(field)
    else:
        if not args.result:
            print("--result <aggregate.json> required (or --dry-run)", file=sys.stderr)
            return 2
        result = json.loads(Path(args.result).read_text(encoding="utf-8"))
        baseline = json.loads(Path(args.baseline).read_text(encoding="utf-8")) if args.baseline else None
        value = args.value
        if value is None:
            print("--value <knob> required", file=sys.stderr)
            return 2

    repo = Path(__file__).resolve().parents[2]
    prov_dir = args.provenance_dir or str(repo / "data/core/balance/ratify-provenance")
    out = auto_ratify(
        args.scenario, result=result, band=band, composite_band=composite_band,
        objective_metric=objective, knob_space=knob_space, field=field, value=value,
        baseline=baseline, reverify=result, node_version=node_ver, seed=result.get("seed"),
        wins=result.get("win_count"), n=result.get("n"),
        prod_path=str(repo / "data/core/balance/damage_curves.yaml"),
        manifest_path=str(DEFAULT_MANIFEST_PATH), coding_agent=coding_agent, trace_id=trace_id,
        source_report=args.result, confirm_prod=confirm_prod,
    )
    # The provenance sidecar is the LAST step of an irreversible flow. If it fails to
    # persist AFTER a prod write, surface the full payload on stderr (so the audit record
    # is recoverable) and raise loudly -- never let a live ratified value go unrecorded.
    try:
        sidecar = write_provenance_sidecar(
            out["provenance"],
            out_dir=prov_dir,
            filename=f"{args.scenario}-{out['action']}-{trace_id}.json",
        )
    except OSError as e:
        print(f"provenance sidecar FAILED to persist to {prov_dir}: {e}", file=sys.stderr)
        print("PROVENANCE_PAYLOAD " + json.dumps(out["provenance"]), file=sys.stderr)
        if out["written"]:
            raise RuntimeError(
                f"prod WRITTEN (trace={trace_id}) but provenance sidecar failed: {e} "
                f"-- reconstruct from the PROVENANCE_PAYLOAD line above"
            ) from e
        sidecar = None
    print(json.dumps({k: out[k] for k in ("action", "all_pass", "gates", "written")}, indent=2))
    print(f"provenance: {sidecar}", file=sys.stderr)
    if out["action"] == "blocked":
        failed = [k for k, v in out["gates"].items() if v is not True]
        print(f"BLOCKED -- gates not passed: {failed} (fail-closed by design; "
              f"composite needs pe_ratio/kd_ratio wired, gate-3 needs a node-22 baseline).",
              file=sys.stderr)
    return 0 if out["action"] in ("proposal", "written") else 1


if __name__ == "__main__":
    sys.exit(main())
