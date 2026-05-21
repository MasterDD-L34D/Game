#!/usr/bin/env python3
"""Playtest #2 telemetry analyzer — ai-station verdict validation.

Specialized analyzer focused on validating ai-station 8 OD verdicts via
playtest #2 userland telemetry. Builds on tools/py/analyze_telemetry.py
DuckDB infrastructure but adds verdict-specific aggregations + report
generator producing markdown verdict (🟢-cand → 🟢 hard promotion gate).

Focus areas (ai-station Phase B+C verdicts):
  - P3 Identità — promotion uptake (Jobs reaching elite/master tier,
    job_archetype_bias preferences via Phase B3 #2264)
  - P4 Temperamenti — 4-layer psicologico distribution (MBTI/Ennea/
    Conviction/Sentience clustering)
  - P6 Fairness — pressure tier balance + rewind usage frequency
  - OD-024 — interoception traits firing rates
    (propriocezione/nocicezione/equilibrio_vestibolare/termocezione)
  - OD-026 — Skiv pulse atlas reveal_neighbor events
  - Performance — command latency p95 (M.7), session length, drop-off

Usage:
  python tools/py/playtest_2_analyzer.py \\
      --telemetry tests/fixtures/playtest-2-synthetic-telemetry.jsonl \\
      --output docs/playtest/2026-05-XX-playtest-2-report.md

Output:
  Markdown report with sections:
    1. Executive summary (sample size + 🟢/🟡/🔴 verdict per pillar)
    2. P3 promotion uptake breakdown
    3. P4 4-layer psicologico distribution
    4. P6 fairness signals
    5. OD-024 interoception trait firing
    6. OD-026 atlas pulse usage
    7. Performance metrics
    8. Verdict + next-action recommendation

Graceful: missing duckdb dep → fallback pure-stdlib JSONL iteration.
"""

from __future__ import annotations

import argparse
import json
import statistics
import sys
from collections import Counter, defaultdict
from datetime import date
from pathlib import Path

# Windows cp1252 stdout chokes on emoji. Force UTF-8 if reconfigure supported.
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # type: ignore[attr-defined]
    except (TypeError, ValueError):
        pass

# Optional DuckDB acceleration (Tier E donor — analyze_telemetry.py pattern).
try:
    import duckdb  # type: ignore

    HAS_DUCKDB = True
except ImportError:
    HAS_DUCKDB = False


# Minimum sample for 🟢 hard verdict (vs 🟢-cand). Below = 🟡 partial.
MIN_SAMPLE_GREEN_HARD = 30  # ~30 sessions ≈ pillar promotion threshold
MIN_SAMPLE_PARTIAL = 5  # below = 🔴 insufficient signal

# Performance gates per M.7 telemetry contract.
LATENCY_P95_PASS_MS = 100
LATENCY_P95_COND_MS = 200


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Playtest #2 telemetry analyzer (ai-station)")
    p.add_argument("--telemetry", required=True, help="Path to telemetry JSONL")
    p.add_argument("--output", help="Output markdown path (default stdout)")
    p.add_argument(
        "--json-out",
        help="Optional path to dump aggregated metric dicts as JSON "
        "(machine-readable; non-breaking, markdown output unchanged)",
    )
    p.add_argument(
        "--min-sample",
        type=int,
        default=MIN_SAMPLE_GREEN_HARD,
        help="Min sample for 🟢 hard (default 30)",
    )
    return p.parse_args()


def load_events(path: Path) -> list[dict]:
    """Load JSONL telemetry — one event per line. Graceful malformed-line skip."""
    if not path.exists():
        print(f"ERROR: telemetry file not found: {path}", file=sys.stderr)
        sys.exit(2)
    events: list[dict] = []
    with path.open(encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            try:
                events.append(json.loads(line))
            except json.JSONDecodeError as err:
                print(f"WARN: line {i} malformed JSON, skipped: {err}", file=sys.stderr)
    return events


def aggregate_session_summary(events: list[dict]) -> dict:
    """Aggregate per-session summary. Group by session_id."""
    by_session: dict[str, list[dict]] = defaultdict(list)
    for ev in events:
        sid = ev.get("session_id", "_unknown_")
        by_session[sid].append(ev)
    return {
        "total_sessions": len(by_session),
        "total_events": len(events),
        "sessions": by_session,
    }


def analyze_p3_promotions(by_session: dict[str, list[dict]]) -> dict:
    """P3 Identità — promotion uptake + job_archetype_bias preferences."""
    promotion_events = []
    for evs in by_session.values():
        for ev in evs:
            if ev.get("action_type") in ("promotion", "promotion_accepted"):
                promotion_events.append(ev)
    tier_distribution: Counter = Counter()
    job_tier: Counter = Counter()
    for ev in promotion_events:
        tier = ev.get("applied_tier", ev.get("target_tier", "unknown"))
        job = ev.get("job_id", "unknown")
        tier_distribution[tier] += 1
        job_tier[(job, tier)] += 1
    elite_count = tier_distribution.get("elite", 0)
    master_count = tier_distribution.get("master", 0)
    return {
        "total_promotions": len(promotion_events),
        "tier_distribution": dict(tier_distribution),
        "elite_count": elite_count,
        "master_count": master_count,
        "phase_b3_reached": elite_count + master_count,
        "job_tier_breakdown": dict(job_tier),
    }


def analyze_p4_psicologico(by_session: dict[str, list[dict]]) -> dict:
    """P4 Temperamenti — 4-layer profilo psicologico distribution."""
    mbti_types: Counter = Counter()
    ennea_archs: Counter = Counter()
    conviction_axes: list[dict] = []
    sentience_tiers: Counter = Counter()
    for evs in by_session.values():
        for ev in evs:
            if ev.get("event_type") == "vc_snapshot":
                per_actor = ev.get("per_actor", {})
                for uid, actor in per_actor.items():
                    mbti_t = actor.get("mbti_type", "")
                    if mbti_t:
                        mbti_types[mbti_t] += 1
                    for arch, fired in (actor.get("ennea_archetypes") or {}).items():
                        if fired:
                            ennea_archs[arch] += 1
                    if "conviction_axis" in actor:
                        conviction_axes.append(actor["conviction_axis"])
                    sent = (actor.get("sentience") or {}).get("tier", "")
                    if sent:
                        sentience_tiers[sent] += 1
    conviction_summary = {}
    if conviction_axes:
        for axis in ("utility", "liberty", "morality"):
            values = [float(c.get(axis, 50)) for c in conviction_axes]
            conviction_summary[axis] = {
                "mean": statistics.mean(values) if values else None,
                "stdev": statistics.stdev(values) if len(values) > 1 else 0.0,
            }
    return {
        "mbti_distribution": dict(mbti_types),
        "ennea_distribution": dict(ennea_archs),
        "conviction_distribution": conviction_summary,
        "sentience_distribution": dict(sentience_tiers),
        "layer_completeness": {
            "mbti": len(mbti_types) > 0,
            "ennea": len(ennea_archs) > 0,
            "conviction": bool(conviction_axes),
            "sentience": len(sentience_tiers) > 0,
        },
    }


def analyze_p6_fairness(by_session: dict[str, list[dict]]) -> dict:
    """P6 Fairness — pressure tier balance + rewind usage."""
    pressure_tiers: Counter = Counter()
    rewind_events = 0
    for evs in by_session.values():
        for ev in evs:
            tier = ev.get("pressure_tier")
            if tier is not None:
                pressure_tiers[str(tier)] += 1
            if ev.get("action_type") == "rewind":
                rewind_events += 1
    return {
        "pressure_distribution": dict(pressure_tiers),
        "rewind_events": rewind_events,
        "rewind_sessions_pct": (
            100 * rewind_events / max(1, len(by_session)) if by_session else 0.0
        ),
    }


def analyze_od024_interoception(events: list[dict]) -> dict:
    """OD-024 — 4 interoception traits firing rates."""
    interoception_log_tags = {
        "proprioception_balance",
        "vestibular_advantage",
        "nociception_reactive",
        "thermoception_resist",
    }
    firings: Counter = Counter()
    total_attacks = 0
    for ev in events:
        if ev.get("action_type") == "attack":
            total_attacks += 1
        for fx in ev.get("trait_effects", []) or []:
            tag = fx.get("effect")
            if tag in interoception_log_tags and fx.get("triggered"):
                firings[tag] += 1
    return {
        "firings_by_trait": dict(firings),
        "total_firings": sum(firings.values()),
        "total_attacks": total_attacks,
        "firing_rate_pct": (
            100 * sum(firings.values()) / total_attacks if total_attacks else 0.0
        ),
    }


def analyze_od026_atlas(events: list[dict]) -> dict:
    """OD-026 — Skiv pulse atlas reveal_neighbor + biome_focus events."""
    pulse_events = 0
    biome_focus: Counter = Counter()
    revealed_biomes: Counter = Counter()
    for ev in events:
        if ev.get("event_type") == "skiv_pulse_fired":
            pulse_events += 1
            biome_id = ev.get("target_biome_id", "")
            if biome_id:
                revealed_biomes[biome_id] += 1
        if ev.get("event_type") == "biome_focus_changed":
            biome_focus[ev.get("biome_id", "_unknown_")] += 1
    return {
        "skiv_pulse_events": pulse_events,
        "revealed_biomes": dict(revealed_biomes),
        "biome_focus_events": dict(biome_focus),
    }


def analyze_performance(events: list[dict]) -> dict:
    """Performance — command latency p95 + session length distribution."""
    latencies_ms: list[float] = []
    for ev in events:
        lat = ev.get("command_latency_ms")
        if isinstance(lat, (int, float)) and lat > 0:
            latencies_ms.append(float(lat))
    p95 = None
    p50 = None
    if latencies_ms:
        latencies_sorted = sorted(latencies_ms)
        p50 = latencies_sorted[int(0.5 * len(latencies_sorted))]
        p95 = latencies_sorted[int(0.95 * len(latencies_sorted))]
    verdict_gate = "n/a"
    if p95 is not None:
        if p95 < LATENCY_P95_PASS_MS:
            verdict_gate = "PASS"
        elif p95 < LATENCY_P95_COND_MS:
            verdict_gate = "CONDITIONAL"
        else:
            verdict_gate = "ABORT"
    return {
        "command_latency_p50_ms": p50,
        "command_latency_p95_ms": p95,
        "command_latency_verdict": verdict_gate,
        "samples": len(latencies_ms),
    }


def _verdict_emoji(metric_count: int, min_sample: int) -> str:
    if metric_count >= min_sample:
        return "🟢"
    if metric_count >= MIN_SAMPLE_PARTIAL:
        return "🟡"
    return "🔴"


def build_report(  # noqa: PLR0913
    summary: dict,
    p3: dict,
    p4: dict,
    p6: dict,
    od024: dict,
    od026: dict,
    perf: dict,
    min_sample: int,
) -> str:
    """Build markdown report from aggregated metrics."""
    today = date.today().isoformat()
    total_sessions = summary["total_sessions"]
    total_events = summary["total_events"]
    overall_verdict = _verdict_emoji(total_sessions, min_sample)
    lines: list[str] = []
    lines.append(f"# Playtest #2 telemetry report — {today}")
    lines.append("")
    lines.append("ai-station verdict validation report. Auto-generated by")
    lines.append("`tools/py/playtest_2_analyzer.py`. Sample-driven verdicts:")
    lines.append("🟢 = ≥30 sessions sample / 🟡 = 5-29 / 🔴 = <5.")
    lines.append("")
    lines.append("## 1. Executive summary")
    lines.append("")
    lines.append(f"- **Sessions analyzed**: {total_sessions}")
    lines.append(f"- **Total events**: {total_events}")
    lines.append(f"- **Overall sample verdict**: {overall_verdict}")
    lines.append("")
    lines.append("| Pillar | Verdict | Note |")
    lines.append("|---|:--:|---|")
    p3_v = _verdict_emoji(p3["total_promotions"], min_sample)
    p4_v = "🟢" if all(p4["layer_completeness"].values()) else "🟡"
    p6_v = _verdict_emoji(
        sum(p6["pressure_distribution"].values()) or 0, min_sample
    )
    lines.append(f"| P3 Identità | {p3_v} | {p3['total_promotions']} promotions, "
                 f"{p3['phase_b3_reached']} reached elite/master |")
    lines.append(f"| P4 Temperamenti | {p4_v} | 4-layer completeness: "
                 f"{p4['layer_completeness']} |")
    lines.append(f"| P6 Fairness | {p6_v} | {p6['rewind_events']} rewinds, "
                 f"{p6['rewind_sessions_pct']:.1f}% of sessions |")
    lines.append("")
    # P3 Promotions
    lines.append("## 2. P3 Identità — promotion uptake")
    lines.append("")
    lines.append(f"Tier distribution: `{p3['tier_distribution']}`")
    lines.append("")
    if p3["job_tier_breakdown"]:
        lines.append("**Job × Tier breakdown** (Phase B3 job_archetype_bias signal):")
        for (job, tier), count in sorted(p3["job_tier_breakdown"].items()):
            lines.append(f"- `{job}` → `{tier}`: {count}")
    else:
        lines.append("_No Job × Tier data captured._")
    lines.append("")
    # P4 4-layer psicologico
    lines.append("## 3. P4 Temperamenti — 4-layer profilo psicologico")
    lines.append("")
    lines.append("### MBTI distribution")
    for typ, count in sorted(p4["mbti_distribution"].items()):
        lines.append(f"- {typ}: {count}")
    lines.append("")
    lines.append("### Ennea archetype firings")
    for arch, count in sorted(p4["ennea_distribution"].items()):
        lines.append(f"- {arch}: {count}")
    lines.append("")
    lines.append("### Conviction axes (D2-A)")
    for axis, stats in p4["conviction_distribution"].items():
        mean = stats.get("mean")
        stdev = stats.get("stdev", 0)
        if mean is not None:
            lines.append(f"- **{axis}**: mean={mean:.1f} σ={stdev:.1f}")
    lines.append("")
    lines.append("### Sentience tier distribution (Phase B3 OD-024)")
    for tier, count in sorted(p4["sentience_distribution"].items()):
        lines.append(f"- {tier}: {count}")
    lines.append("")
    # P6 Fairness
    lines.append("## 4. P6 Fairness — pressure tier + rewind")
    lines.append("")
    lines.append(f"Pressure tier distribution: `{p6['pressure_distribution']}`")
    lines.append(
        f"Rewind events: **{p6['rewind_events']}** "
        f"({p6['rewind_sessions_pct']:.1f}% of sessions)"
    )
    lines.append("")
    # OD-024 interoception
    lines.append("## 5. OD-024 — interoception traits firing")
    lines.append("")
    lines.append(f"Total attacks: {od024['total_attacks']}")
    lines.append(
        f"Total interoception firings: **{od024['total_firings']}** "
        f"({od024['firing_rate_pct']:.1f}% of attacks)"
    )
    for trait, count in sorted(od024["firings_by_trait"].items()):
        lines.append(f"- `{trait}`: {count}")
    lines.append("")
    # OD-026 atlas
    lines.append("## 6. OD-026 — Skiv pulse atlas usage")
    lines.append("")
    lines.append(f"Pulse events: **{od026['skiv_pulse_events']}**")
    if od026["revealed_biomes"]:
        lines.append("Revealed biomes:")
        for biome, count in sorted(od026["revealed_biomes"].items()):
            lines.append(f"- `{biome}`: {count}")
    if od026["biome_focus_events"]:
        lines.append("Biome focus clicks:")
        for biome, count in sorted(od026["biome_focus_events"].items()):
            lines.append(f"- `{biome}`: {count}")
    lines.append("")
    # Performance
    lines.append("## 7. Performance — command latency (M.7 contract)")
    lines.append("")
    lines.append(
        f"- p50: **{perf['command_latency_p50_ms']}** ms / p95: "
        f"**{perf['command_latency_p95_ms']}** ms ({perf['samples']} samples)"
    )
    lines.append(f"- Verdict gate (M.7): **{perf['command_latency_verdict']}**")
    lines.append(
        f"  - PASS < {LATENCY_P95_PASS_MS}ms / CONDITIONAL "
        f"< {LATENCY_P95_COND_MS}ms / ABORT ≥ {LATENCY_P95_COND_MS}ms"
    )
    lines.append("")
    # Final verdict
    lines.append("## 8. Verdict + next action")
    lines.append("")
    pillars_green = sum(1 for v in (p3_v, p4_v, p6_v) if v == "🟢")
    if pillars_green == 3:
        lines.append("🟢 **3/3 pillars hard verified** — proceed 🟢-cand → 🟢 hard "
                     "promotion for P3+P4+P6.")
    elif pillars_green >= 1:
        lines.append(f"🟡 **{pillars_green}/3 pillars hard verified** — partial "
                     "promotion: shipping pillars qualifying threshold, repeat "
                     "playtest #3 for residual gap.")
    else:
        lines.append(
            "🔴 **0/3 pillars hard verified** — insufficient sample. Repeat "
            "playtest #2 with broader recruitment OR adjust sample size target."
        )
    lines.append("")
    lines.append("## Cross-link")
    lines.append("")
    lines.append("- ai-station re-analisi: `vault docs/decisions/"
                 "OD-024-031-aistation-reanalysis-2026-05-14.md`")
    lines.append("- Phase B3 cross-stack: Game/ PR #2264 + Godot v2 PR #261")
    lines.append("- Envelope A+B+C: PR #2261 + #2262 + #259 + #260")
    return "\n".join(lines)


def main() -> int:
    args = parse_args()
    telemetry_path = Path(args.telemetry)
    events = load_events(telemetry_path)
    summary = aggregate_session_summary(events)
    by_session = summary["sessions"]

    p3 = analyze_p3_promotions(by_session)
    p4 = analyze_p4_psicologico(by_session)
    p6 = analyze_p6_fairness(by_session)
    od024 = analyze_od024_interoception(events)
    od026 = analyze_od026_atlas(events)
    perf = analyze_performance(events)

    report = build_report(summary, p3, p4, p6, od024, od026, perf, args.min_sample)

    # Envelope A A4 — optional machine-readable JSON dump of the aggregated
    # metric dicts. Non-breaking: markdown output path is unchanged. The
    # nightly workflow uploads this alongside the report so downstream
    # tooling (drift dashboards) does not have to re-parse markdown.
    if args.json_out:
        json_path = Path(args.json_out)
        json_path.parent.mkdir(parents=True, exist_ok=True)
        # job_tier_breakdown uses (job, tier) tuple keys → JSON-unsafe.
        # Re-key to "job::tier" strings for the machine dump only (the
        # markdown report keeps the original tuple-keyed dict untouched).
        p3_json = dict(p3)
        p3_json["job_tier_breakdown"] = {
            f"{job}::{tier}": count
            for (job, tier), count in p3["job_tier_breakdown"].items()
        }
        machine = {
            "summary": {
                "total_sessions": summary["total_sessions"],
                "total_events": summary["total_events"],
            },
            "min_sample": args.min_sample,
            "p3_promotions": p3_json,
            "p4_psicologico": p4,
            "p6_fairness": p6,
            "od024_interoception": od024,
            "od026_atlas": od026,
            "performance": perf,
        }
        json_path.write_text(
            json.dumps(machine, indent=2, default=str), encoding="utf-8"
        )
        print(f"[playtest-2-analyzer] JSON metrics written: {json_path}")

    if args.output:
        out_path = Path(args.output)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(report, encoding="utf-8")
        print(f"[playtest-2-analyzer] Report written: {out_path}")
    else:
        print(report)
    return 0


if __name__ == "__main__":
    sys.exit(main())
