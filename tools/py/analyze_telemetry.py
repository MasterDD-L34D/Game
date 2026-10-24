#!/usr/bin/env python3
"""DuckDB analytics over the REAL session-event corpus (logs/session_*.json).

History: Tier E quick win #13 (donor: DuckDB, in-process SQL, zero server).
Originally pointed at logs/telemetry_*.jsonl expecting type='session_complete'
events that the backend never emitted -- every query returned empty. Repointed
2026-07-02 to the actual data:

Primary source -- logs/session_<timestamp>.json: JSON ARRAYS of sim events
written by the backend session logger (action_type: session_start / move /
attack / kill / assist / session_end / ...). session_end carries
outcome (win/abandon/defeat/wipe/timeout) and, post-#3176 (merged 2026-07-02),
vc_mbti {avg_axes, types} + vc_ennea {triggered}; older logs have those null.
session_seed_*.json files are seed corpora and are excluded from all globs
(pattern session_[0-9]*.json).

Secondary source -- logs/telemetry_*.jsonl (newline-delimited): funnel/reward
telemetry. Only reward_skip_rate still reads it, because reward_offer /
reward_skip events genuinely live there and NOT in the session arrays.

Usage:
    python tools/py/analyze_telemetry.py --query <name> [--logs-dir DIR] [--out FORMAT]

Available queries (--query):
    win_rate            -- session outcome breakdown from session_end events
    funnel              -- action_type counts per turn (activity drop-off)
    reward_skip_rate    -- reward_skip vs reward_offer (telemetry_*.jsonl)
    kill_heatmap        -- kill events per scenario (session_start join)
    retention_d1d7      -- NOT IMPLEMENTED: no player identity in corpus
    mbti_distribution   -- vc_mbti.types distribution (post-#3176 logs only)
    archetype_pickrate  -- vc_ennea.triggered archetypes (post-#3176 only)
    kill_chain_assists  -- top killer units + K/A ratio (kill/assist events)
    biome_difficulty    -- outcome + turns per scenario (biome_id not logged)

Output (--out):
    json (default)      -- single JSON to stdout
    table               -- pretty table to stdout (markdown)

Graceful: missing duckdb dep -> fallback iterates the same session_*.json
arrays and reports per-action_type + per-outcome counts with a warning.
"""

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_LOGS_DIR = ROOT / "logs"

# duckdb Invalid Input Error for a broken array file names the culprit.
_MALFORMED_FILE_RE = re.compile(r'Malformed JSON in file "([^"]+)"')
# Safety cap for the exclude-and-retry loop: if more than this many files are
# corrupt something systemic is wrong -- surface the error instead.
_MAX_CORRUPT_FILES = 20

# session_[0-9]* (not session_*) so seed corpora session_seed_*.json never match.
SESSION_GLOB = "session_[0-9]*.json"
TELEMETRY_GLOB = "telemetry_*.jsonl"

# Explicit column spec: avoids schema inference over ~40 heterogeneous keys
# across thousands of files; unknown keys are ignored, missing keys read NULL.
SESSION_COLUMNS = {
    "action_type": "VARCHAR",
    "turn": "BIGINT",
    "outcome": "VARCHAR",
    "scenario_id": "VARCHAR",
    "actor_id": "VARCHAR",
    "actor_species": "VARCHAR",
    "actor_job": "VARCHAR",
    "damage_dealt": "DOUBLE",
    "vc_mbti": "JSON",
    "vc_ennea": "JSON",
}


def has_duckdb() -> bool:
    try:
        import duckdb  # noqa: F401
        return True
    except ImportError:
        return False


def list_session_files(logs_dir: Path) -> list:
    """Session array files, sorted; session_seed_* excluded by the glob."""
    return sorted(logs_dir.glob(SESSION_GLOB))


def _session_source(logs_dir: Path, exclude=()) -> str:
    colspec = ", ".join(f"{name}: '{typ}'" for name, typ in SESSION_COLUMNS.items())
    if exclude:
        # Corrupt files found: enumerate the good ones explicitly (duckdb's
        # ignore_errors does not apply to format='array').
        keep = [
            str(p).replace("\\", "/")
            for p in list_session_files(logs_dir)
            if p.name not in exclude
        ]
        source_files = "[" + ", ".join(f"'{f}'" for f in keep) + "]"
    else:
        source_files = "'" + str(logs_dir / SESSION_GLOB).replace("\\", "/") + "'"
    return (
        f"read_json({source_files}, format='array', filename=true, "
        f"columns={{{colspec}}})"
    )


def _telemetry_source(logs_dir: Path) -> str:
    pattern = str(logs_dir / TELEMETRY_GLOB).replace("\\", "/")
    return (
        f"read_json('{pattern}', format='newline_delimited', "
        f"columns={{ts: 'VARCHAR', type: 'VARCHAR'}})"
    )


# Queries that the corpus genuinely cannot answer. Honest > fake.
NOT_IMPLEMENTED = {
    "retention_d1d7": (
        "session_*.json events carry NO player identity: player_id is absent "
        "everywhere and session_id is a per-run UUID (AI batch-sim corpus, "
        "not live players). D1/D7 retention needs a stable player key across "
        "days -- cannot be computed from this corpus. Data gap documented "
        "2026-07-02; revisit if/when live-player logging lands."
    ),
}

# {events} -> session-array source, {telemetry} -> jsonl source.
QUERIES = {
    "win_rate": """
        SELECT
            COALESCE(outcome, 'unknown') AS outcome,
            COUNT(*) AS sessions,
            ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS pct
        FROM {events}
        WHERE action_type = 'session_end'
        GROUP BY 1
        ORDER BY sessions DESC
    """,
    "funnel": """
        SELECT
            turn,
            COUNT(*) FILTER (WHERE action_type = 'move') AS moves,
            COUNT(*) FILTER (WHERE action_type = 'attack') AS attacks,
            COUNT(*) FILTER (WHERE action_type = 'kill') AS kills,
            COUNT(*) FILTER (WHERE action_type = 'assist') AS assists,
            COUNT(*) FILTER (WHERE action_type = 'session_end') AS sessions_ended,
            ROUND(AVG(damage_dealt) FILTER (WHERE action_type = 'attack'), 2)
                AS avg_attack_damage
        FROM {events}
        WHERE turn IS NOT NULL
        GROUP BY turn
        ORDER BY turn
        LIMIT 60
    """,
    "reward_skip_rate": """
        SELECT
            COUNT(*) FILTER (WHERE type = 'reward_offer') AS offers,
            COUNT(*) FILTER (WHERE type = 'reward_skip') AS skips,
            ROUND(100.0 * COUNT(*) FILTER (WHERE type = 'reward_skip')
                  / NULLIF(COUNT(*) FILTER (WHERE type IN ('reward_offer', 'reward_skip')), 0), 1)
                AS skip_pct
        FROM {telemetry}
        WHERE type IN ('reward_offer', 'reward_skip')
    """,
    "kill_heatmap": """
        WITH scen AS (
            SELECT filename, MAX(scenario_id) AS scenario_id
            FROM {events}
            WHERE action_type IN ('session_start', 'session_end')
            GROUP BY filename
        )
        SELECT
            COALESCE(s.scenario_id, 'unknown') AS scenario,
            COUNT(*) AS kills,
            COUNT(DISTINCT e.filename) AS sessions,
            ROUND(1.0 * COUNT(*) / COUNT(DISTINCT e.filename), 2) AS kills_per_session
        FROM {events} e
        LEFT JOIN scen s USING (filename)
        WHERE e.action_type = 'kill'
        GROUP BY 1
        ORDER BY kills DESC
        LIMIT 20
    """,
    # biome_id is not present in any session event; scenario_id is the finest
    # difficulty key actually logged (name kept for CLI compatibility).
    "biome_difficulty": """
        WITH sess AS (
            SELECT
                filename,
                MAX(scenario_id) AS scenario_id,
                MAX(CASE WHEN action_type = 'session_end' THEN outcome END) AS outcome,
                MAX(CASE WHEN action_type = 'session_end' THEN turn END) AS turns
            FROM {events}
            GROUP BY filename
        )
        SELECT
            COALESCE(scenario_id, 'unknown') AS scenario,
            COUNT(*) FILTER (WHERE outcome IS NOT NULL) AS sessions,
            ROUND(100.0 * COUNT(*) FILTER (WHERE outcome = 'win')
                  / NULLIF(COUNT(*) FILTER (WHERE outcome IS NOT NULL), 0), 1) AS win_pct,
            ROUND(AVG(turns), 1) AS avg_turns
        FROM sess
        GROUP BY 1
        ORDER BY sessions DESC
        LIMIT 20
    """,
    # vc_mbti.types = {"ESTJ": 5, ...} unit counts per session (post-#3176).
    "mbti_distribution": """
        SELECT
            je.key AS mbti_type,
            SUM(CAST(je.value AS INTEGER)) AS units,
            COUNT(*) AS sessions,
            ROUND(100.0 * COUNT(*) FILTER (WHERE e.outcome = 'win')
                  / NULLIF(COUNT(*), 0), 1) AS session_win_pct
        FROM {events} e, json_each(e.vc_mbti -> 'types') je
        WHERE e.action_type = 'session_end' AND e.vc_mbti IS NOT NULL
        GROUP BY 1
        ORDER BY units DESC
    """,
    # vc_ennea.triggered = {"Stoico(9)": 4, ...} TRIGGERED archetype counts.
    # Archetypes are trigger-based (not player picks); name kept for CLI compat.
    "archetype_pickrate": """
        SELECT
            je.key AS archetype,
            SUM(CAST(je.value AS INTEGER)) AS triggered_units,
            COUNT(*) AS sessions,
            ROUND(100.0 * COUNT(*) FILTER (WHERE e.outcome = 'win')
                  / NULLIF(COUNT(*), 0), 1) AS session_win_pct
        FROM {events} e, json_each(e.vc_ennea -> 'triggered') je
        WHERE e.action_type = 'session_end' AND e.vc_ennea IS NOT NULL
        GROUP BY 1
        ORDER BY triggered_units DESC
    """,
    "kill_chain_assists": """
        WITH kills AS (
            SELECT
                actor_id,
                MAX(actor_species) AS species,
                MAX(actor_job) AS job,
                COUNT(*) AS kills
            FROM {events}
            WHERE action_type = 'kill' AND actor_id IS NOT NULL
            GROUP BY actor_id
        ),
        assists AS (
            SELECT
                actor_id,
                MAX(actor_species) AS species,
                MAX(actor_job) AS job,
                COUNT(*) AS assists
            FROM {events}
            WHERE action_type = 'assist' AND actor_id IS NOT NULL
            GROUP BY actor_id
        )
        SELECT
            COALESCE(k.actor_id, a.actor_id) AS unit,
            COALESCE(k.species, a.species) AS species,
            COALESCE(k.job, a.job) AS job,
            COALESCE(k.kills, 0) AS kills,
            COALESCE(a.assists, 0) AS assists,
            ROUND(1.0 * COALESCE(k.kills, 0) / NULLIF(a.assists, 0), 2) AS k_per_a
        FROM kills k
        FULL JOIN assists a USING (actor_id)
        ORDER BY kills DESC, assists DESC
        LIMIT 25
    """,
}

# Queries whose data exists only in post-#3176 session_end events: attach a
# coverage note so empty/partial results are self-explanatory, not misleading.
_VC_COVERAGE_NOTE = {
    "mbti_distribution": "vc_mbti",
    "archetype_pickrate": "vc_ennea",
}


def _vc_coverage_note(con, source: str, field: str) -> str:
    total, populated = con.execute(
        f"SELECT COUNT(*), COUNT({field}) FROM {source} "
        "WHERE action_type = 'session_end'"
    ).fetchone()
    return (
        f"{field} non-null in {populated}/{total} session_end events. "
        "The field is populated only by post-#3176 backend builds "
        "(merged 2026-07-02); all older logs carry null. Empty rows here "
        "mean no post-#3176 sessions in the corpus yet, NOT zero data loss."
    )


def run_query_duckdb(query_name: str, logs_dir: Path) -> dict:
    import duckdb

    if query_name in NOT_IMPLEMENTED:
        return {
            "query": query_name,
            "not_implemented": True,
            "reason": NOT_IMPLEMENTED[query_name],
        }
    if query_name != "reward_skip_rate" and not list_session_files(logs_dir):
        return {"query": query_name, "error": f"no {SESSION_GLOB} files in {logs_dir}"}
    if query_name == "reward_skip_rate" and not sorted(logs_dir.glob(TELEMETRY_GLOB)):
        return {"query": query_name, "error": f"no {TELEMETRY_GLOB} files in {logs_dir}"}

    telemetry = _telemetry_source(logs_dir)
    con = duckdb.connect(":memory:")
    # Corrupt session files (trailing junk from interleaved writes) exist in
    # the real corpus and abort read_json(format='array') wholesale. Retry
    # loop: parse the offending filename out of the error, exclude, re-run.
    excluded = []
    try:
        while True:
            events = _session_source(logs_dir, exclude=excluded)
            sql = QUERIES[query_name].format(events=events, telemetry=telemetry)
            try:
                result = con.execute(sql).fetchall()
                cols = [d[0] for d in con.description]
                break
            except Exception as e:
                bad = _MALFORMED_FILE_RE.search(str(e))
                if bad is None or len(excluded) >= _MAX_CORRUPT_FILES:
                    return {
                        "query": query_name,
                        "error": str(e),
                        "fallback": "duckdb sql failed",
                        "skipped_files": excluded,
                    }
                excluded.append(Path(bad.group(1)).name)
        out = {"query": query_name, "columns": cols, "rows": [list(r) for r in result]}
        if excluded:
            out["skipped_files"] = excluded
        if query_name in _VC_COVERAGE_NOTE:
            out["note"] = _vc_coverage_note(con, events, _VC_COVERAGE_NOTE[query_name])
        if query_name == "biome_difficulty":
            out["note"] = (
                "biome_id is not logged in session events; scenario_id is the "
                "difficulty key actually available."
            )
        return out
    finally:
        con.close()


def run_query_fallback(query_name: str, logs_dir: Path) -> dict:
    """Fallback without duckdb -- iterate the same session_*.json arrays."""
    if query_name in NOT_IMPLEMENTED:
        return {
            "query": query_name,
            "not_implemented": True,
            "reason": NOT_IMPLEMENTED[query_name],
        }
    files = list_session_files(logs_dir)
    if not files:
        return {"query": query_name, "error": f"no {SESSION_GLOB} files in {logs_dir}"}
    action_counts = {}
    outcome_counts = {}
    skipped = 0
    processed = 0
    for fpath in files:
        try:
            with fpath.open(encoding="utf-8") as fh:
                events = json.load(fh)
        except (OSError, json.JSONDecodeError):
            skipped += 1
            continue
        if not isinstance(events, list):
            skipped += 1
            continue
        processed += 1
        for entry in events:
            if not isinstance(entry, dict):
                continue
            t = entry.get("action_type", "unknown")
            action_counts[t] = action_counts.get(t, 0) + 1
            if t == "session_end":
                o = entry.get("outcome") or "unknown"
                outcome_counts[o] = outcome_counts.get(o, 0) + 1
    return {
        "query": query_name,
        "fallback": "duckdb missing -- basic counts per action_type/outcome",
        "files_processed": processed,
        "files_skipped": skipped,
        "event_counts": action_counts,
        "outcome_counts": outcome_counts,
    }


def run_query(query_name: str, logs_dir: Path) -> dict:
    if query_name in NOT_IMPLEMENTED:
        # Data gap, engine-independent: never needs duckdb.
        return run_query_fallback(query_name, logs_dir)
    if has_duckdb():
        return run_query_duckdb(query_name, logs_dir)
    print("WARN: duckdb not installed -- fallback mode (limited queries)", file=sys.stderr)
    return run_query_fallback(query_name, logs_dir)


def format_table(result: dict) -> str:
    if result.get("not_implemented"):
        return f"NOT IMPLEMENTED: {result['reason']}"
    if "error" in result:
        return f"ERROR: {result['error']}"
    if "event_counts" in result:
        lines = ["| Event type | Count |", "|---|---:|"]
        for t, c in sorted(result["event_counts"].items(), key=lambda x: -x[1]):
            lines.append(f"| {t} | {c} |")
        if result.get("outcome_counts"):
            lines.append("")
            lines.append("| Outcome | Count |")
            lines.append("|---|---:|")
            for o, c in sorted(result["outcome_counts"].items(), key=lambda x: -x[1]):
                lines.append(f"| {o} | {c} |")
        return "\n".join(lines)
    if "columns" not in result:
        return json.dumps(result, indent=2)
    cols = result["columns"]
    rows = result["rows"]
    lines = ["| " + " | ".join(cols) + " |", "|" + "|".join(["---"] * len(cols)) + "|"]
    for r in rows:
        lines.append("| " + " | ".join(str(v) for v in r) + " |")
    if result.get("note"):
        lines.append("")
        lines.append(f"NOTE: {result['note']}")
    if result.get("skipped_files"):
        lines.append("")
        lines.append(
            "SKIPPED (malformed JSON): " + ", ".join(result["skipped_files"])
        )
    return "\n".join(lines)


def main() -> int:
    all_queries = sorted(list(QUERIES) + list(NOT_IMPLEMENTED))
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--query", default="win_rate", choices=all_queries)
    ap.add_argument("--logs-dir", default=str(DEFAULT_LOGS_DIR))
    ap.add_argument("--out", choices=["json", "table"], default="json")
    args = ap.parse_args()

    logs_dir = Path(args.logs_dir)
    if not logs_dir.is_dir():
        print(f"ERROR: logs dir not found: {logs_dir}", file=sys.stderr)
        return 1

    result = run_query(args.query, logs_dir)

    if args.out == "table":
        print(format_table(result))
    else:
        print(json.dumps(result, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
