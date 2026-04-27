#!/usr/bin/env python3
"""DuckDB JSONL telemetry analyzer — Tier E quick win (donor: DuckDB).

Source: docs/research/2026-04-26-tier-e-extraction-matrix.md #13 DuckDB.
Pattern: in-process analytical DB con SQL nativo su file JSONL/Parquet.
~10x faster than sqlite per analytics, zero server.

Usage:
    python tools/py/analyze_telemetry.py --query <name> [--logs-dir DIR] [--out FORMAT]

Available queries (--query):
    win_rate            — per-session win rate aggregate
    funnel              — tutorial T01→T05 funnel (drop-off per stage)
    reward_skip_rate    — % reward_skip vs reward_offer events
    kill_heatmap        — kill events count per encounter
    retention_d1d7      — D1/D7 retention placeholder (player_id required)
    mbti_distribution   — MBTI type distribution + win rate per type (Sprint 5 §II)
    archetype_pickrate  — archetype pick vs skip rates (Sprint 5 §II)
    kill_chain_assists  — top killers + K/A ratio (Sprint 5 §II)
    biome_difficulty    — biome win rate + avg duration + avg kills (Sprint 5 §II)

Output (--out):
    json (default)      — single JSON to stdout
    table               — pretty table to stdout (markdown)

Graceful: missing duckdb dep → fallback to JSONL line iteration with print warning.
"""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_LOGS_DIR = ROOT / "logs"


def has_duckdb() -> bool:
    try:
        import duckdb  # noqa: F401
        return True
    except ImportError:
        return False


QUERIES = {
    "win_rate": """
        SELECT
            COUNT(*) FILTER (WHERE type = 'session_complete' AND payload->>'outcome' = 'victory') AS wins,
            COUNT(*) FILTER (WHERE type = 'session_complete') AS total,
            ROUND(100.0 * COUNT(*) FILTER (WHERE payload->>'outcome' = 'victory')
                  / NULLIF(COUNT(*) FILTER (WHERE type = 'session_complete'), 0), 1) AS win_pct
        FROM read_json('{path}', format='newline_delimited')
        WHERE type = 'session_complete'
    """,
    "funnel": """
        SELECT
            type,
            COUNT(*) AS count
        FROM read_json('{path}', format='newline_delimited')
        WHERE type IN ('tutorial_start', 'tutorial_t02_complete', 'tutorial_t03_complete',
                       'tutorial_t04_complete', 'tutorial_t05_complete')
        GROUP BY type
        ORDER BY type
    """,
    "reward_skip_rate": """
        SELECT
            type,
            COUNT(*) AS count
        FROM read_json('{path}', format='newline_delimited')
        WHERE type IN ('reward_offer', 'reward_skip')
        GROUP BY type
    """,
    "kill_heatmap": """
        SELECT
            COALESCE(payload->>'encounter_id', 'unknown') AS encounter,
            COUNT(*) AS kills
        FROM read_json('{path}', format='newline_delimited')
        WHERE type = 'kill'
        GROUP BY encounter
        ORDER BY kills DESC
        LIMIT 20
    """,
    "retention_d1d7": """
        SELECT
            COUNT(DISTINCT player_id) AS unique_players,
            COUNT(DISTINCT player_id) FILTER (WHERE ts > NOW() - INTERVAL 1 DAY) AS d1,
            COUNT(DISTINCT player_id) FILTER (WHERE ts > NOW() - INTERVAL 7 DAY) AS d7
        FROM read_json('{path}', format='newline_delimited')
        WHERE player_id IS NOT NULL
    """,
    # Sprint 5 §II (2026-04-27) — DuckDB query expansion (Tier E #13).
    "mbti_distribution": """
        SELECT
            COALESCE(payload->>'mbti_type', 'unknown') AS mbti_type,
            COUNT(*) AS sessions,
            ROUND(100.0 * COUNT(*) FILTER (WHERE payload->>'outcome' = 'victory')
                  / NULLIF(COUNT(*), 0), 1) AS win_pct
        FROM read_json('{path}', format='newline_delimited')
        WHERE type = 'session_complete'
        GROUP BY mbti_type
        ORDER BY sessions DESC
    """,
    "archetype_pickrate": """
        SELECT
            COALESCE(payload->>'archetype', 'unknown') AS archetype,
            COUNT(*) FILTER (WHERE type = 'archetype_picked') AS picks,
            COUNT(*) FILTER (WHERE type = 'archetype_skipped') AS skips,
            ROUND(100.0 * COUNT(*) FILTER (WHERE type = 'archetype_picked')
                  / NULLIF(COUNT(*) FILTER (WHERE type IN ('archetype_picked', 'archetype_skipped')), 0), 1) AS pick_pct
        FROM read_json('{path}', format='newline_delimited')
        WHERE type IN ('archetype_picked', 'archetype_skipped')
        GROUP BY archetype
        ORDER BY picks DESC
        LIMIT 20
    """,
    "kill_chain_assists": """
        SELECT
            COALESCE(payload->>'killer_id', 'unknown') AS killer,
            COUNT(*) FILTER (WHERE type = 'kill') AS kills,
            COUNT(*) FILTER (WHERE type = 'assist') AS assists,
            ROUND(1.0 * COUNT(*) FILTER (WHERE type = 'kill')
                  / NULLIF(COUNT(*) FILTER (WHERE type = 'assist'), 0), 2) AS k_per_a
        FROM read_json('{path}', format='newline_delimited')
        WHERE type IN ('kill', 'assist')
        GROUP BY killer
        ORDER BY kills DESC
        LIMIT 25
    """,
    "biome_difficulty": """
        SELECT
            COALESCE(payload->>'biome_id', 'unknown') AS biome,
            COUNT(*) AS sessions,
            ROUND(100.0 * COUNT(*) FILTER (WHERE payload->>'outcome' = 'victory')
                  / NULLIF(COUNT(*), 0), 1) AS win_pct,
            ROUND(AVG(CAST(payload->>'duration_s' AS INTEGER)), 1) AS avg_duration_s,
            ROUND(AVG(CAST(payload->>'kills' AS INTEGER)), 1) AS avg_kills
        FROM read_json('{path}', format='newline_delimited')
        WHERE type = 'session_complete'
        GROUP BY biome
        ORDER BY sessions DESC
    """,
}


def run_query_duckdb(query_name: str, logs_dir: Path) -> dict:
    import duckdb
    sql_template = QUERIES[query_name]
    pattern = str(logs_dir / "telemetry_*.jsonl").replace("\\", "/")
    sql = sql_template.format(path=pattern)
    con = duckdb.connect(":memory:")
    try:
        result = con.execute(sql).fetchall()
        cols = [d[0] for d in con.description]
        return {"query": query_name, "columns": cols, "rows": [list(r) for r in result]}
    except Exception as e:
        return {"query": query_name, "error": str(e), "fallback": "duckdb sql failed"}
    finally:
        con.close()


def run_query_fallback(query_name: str, logs_dir: Path) -> dict:
    """Fallback senza duckdb — count basic events per type."""
    counts = {}
    files = list(logs_dir.glob("telemetry_*.jsonl"))
    if not files:
        return {"query": query_name, "error": f"no telemetry files in {logs_dir}"}
    for fpath in files:
        try:
            with fpath.open(encoding="utf-8") as fh:
                for line in fh:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        entry = json.loads(line)
                        t = entry.get("type", "unknown")
                        counts[t] = counts.get(t, 0) + 1
                    except json.JSONDecodeError:
                        continue
        except OSError:
            continue
    return {
        "query": query_name,
        "fallback": "duckdb missing — basic count per type",
        "files_processed": len(files),
        "event_counts": counts,
    }


def format_table(result: dict) -> str:
    if "error" in result:
        return f"ERROR: {result['error']}"
    if "event_counts" in result:
        lines = ["| Event type | Count |", "|---|---:|"]
        for t, c in sorted(result["event_counts"].items(), key=lambda x: -x[1]):
            lines.append(f"| {t} | {c} |")
        return "\n".join(lines)
    if "columns" not in result:
        return json.dumps(result, indent=2)
    cols = result["columns"]
    rows = result["rows"]
    lines = ["| " + " | ".join(cols) + " |", "|" + "|".join(["---"] * len(cols)) + "|"]
    for r in rows:
        lines.append("| " + " | ".join(str(v) for v in r) + " |")
    return "\n".join(lines)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--query", default="win_rate", choices=list(QUERIES.keys()))
    ap.add_argument("--logs-dir", default=str(DEFAULT_LOGS_DIR))
    ap.add_argument("--out", choices=["json", "table"], default="json")
    args = ap.parse_args()

    logs_dir = Path(args.logs_dir)
    if not logs_dir.is_dir():
        print(f"ERROR: logs dir not found: {logs_dir}", file=sys.stderr)
        return 1

    if has_duckdb():
        result = run_query_duckdb(args.query, logs_dir)
    else:
        print("WARN: duckdb not installed — fallback mode (limited queries)", file=sys.stderr)
        result = run_query_fallback(args.query, logs_dir)

    if args.out == "table":
        print(format_table(result))
    else:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
