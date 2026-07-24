"""Skiv-as-Monitor — historic backfill from repo lifetime.

Walks the entire merged-PR + closed-issue + completed-workflow history of
`MasterDD-L34D/Game` and replays each event through `skiv_monitor.map_event`
+ `apply_delta` to reconstruct Skiv state evolution from project start.

Why: the cron-based monitor (`skiv_monitor.py`) starts from current cursor
(today). Without backfill, Skiv is "amnesiac" — sees only events from its
first run forward. Backfill gives Skiv full memory of repo lifetime.

Output:
- Same paths as `skiv_monitor.py` (`feed.jsonl`, `state.json`, `cursor.json`).
- Idempotent: dedup via existing `seen_event_ids` ring.

Usage:
    python tools/py/skiv_backfill.py --repo MasterDD-L34D/Game
    python tools/py/skiv_backfill.py --repo MasterDD-L34D/Game --max-pages 50
    python tools/py/skiv_backfill.py --repo MasterDD-L34D/Game --reset-state

Run once (or after major event drop). After backfill, `skiv_monitor.py` cron
takes over for incremental updates.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

THIS = Path(__file__).resolve()
sys.path.insert(0, str(THIS.parent))
import skiv_monitor as sm  # type: ignore  # noqa: E402

try:
    import requests  # type: ignore
except ImportError:
    requests = None

USER_AGENT = "skiv-backfill/0.1"
PER_PAGE = 100  # GitHub max


def gh_paginate(url: str, token: Optional[str], params: Optional[dict] = None,
                max_pages: int = 50, key: Optional[str] = None) -> List[Dict[str, Any]]:
    """Walk GitHub paginated endpoint until empty or max_pages."""
    if requests is None:
        raise sm.MonitorError("requests not available")
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": USER_AGENT,
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    out: List[Dict[str, Any]] = []
    p = dict(params or {})
    p.setdefault("per_page", PER_PAGE)
    for page in range(1, max_pages + 1):
        p["page"] = page
        r = requests.get(url, headers=headers, params=p, timeout=30)
        if r.status_code == 403 and "rate limit" in r.text.lower():
            reset = r.headers.get("X-RateLimit-Reset", "?")
            print(f"[backfill] WARN: rate-limit hit at page {page}; reset={reset}", file=sys.stderr)
            break
        if r.status_code != 200:
            print(f"[backfill] WARN: {r.status_code} at page {page}: {r.text[:200]}", file=sys.stderr)
            break
        data = r.json()
        items = data if isinstance(data, list) else (data.get(key, []) if key else [])
        if not items:
            break
        out.extend(items)
        if len(items) < PER_PAGE:
            break
        # Polite pause every 10 pages
        if page % 10 == 0:
            print(f"[backfill] paged {page} ({len(out)} items so far)", flush=True)
    return out


def fetch_all_merged_prs(repo: str, token: Optional[str], max_pages: int) -> List[Dict[str, Any]]:
    """All closed PRs (filtered to merged) — sorted by merged_at ascending."""
    items = gh_paginate(
        f"https://api.github.com/repos/{repo}/pulls",
        token,
        params={"state": "closed", "sort": "created", "direction": "asc"},
        max_pages=max_pages,
    )
    events: List[Dict[str, Any]] = []
    for pr in items:
        if not pr.get("merged_at"):
            continue
        events.append({
            "id": f"pr-{pr['number']}",
            "kind": "pr_merged",
            "ts": pr["merged_at"],
            "number": pr["number"],
            "title": pr.get("title", ""),
            "labels": [lbl["name"] for lbl in pr.get("labels", [])],
            "files_hint": [],
            "html_url": pr.get("html_url", ""),
            "author": (pr.get("user") or {}).get("login", "?"),
        })
    return events


def fetch_all_issues(repo: str, token: Optional[str], max_pages: int) -> List[Dict[str, Any]]:
    """All issues (open+closed). Filter out PRs (GitHub returns both)."""
    items = gh_paginate(
        f"https://api.github.com/repos/{repo}/issues",
        token,
        params={"state": "all", "sort": "created", "direction": "asc"},
        max_pages=max_pages,
    )
    events: List[Dict[str, Any]] = []
    for issue in items:
        if "pull_request" in issue:
            continue
        # Two events per issue: opened (always), closed (if closed_at present)
        ts_open = issue.get("created_at")
        if ts_open:
            events.append({
                "id": f"iss-{issue['number']}-open",
                "kind": "issue_opened",
                "ts": ts_open,
                "number": issue["number"],
                "title": issue.get("title", ""),
                "labels": [lbl["name"] for lbl in issue.get("labels", [])],
                "html_url": issue.get("html_url", ""),
            })
        ts_close = issue.get("closed_at")
        if ts_close:
            events.append({
                "id": f"iss-{issue['number']}-closed",
                "kind": "issue_closed",
                "ts": ts_close,
                "number": issue["number"],
                "title": issue.get("title", ""),
                "labels": [lbl["name"] for lbl in issue.get("labels", [])],
                "html_url": issue.get("html_url", ""),
            })
    return events


def fetch_all_workflows(repo: str, token: Optional[str], max_pages: int) -> List[Dict[str, Any]]:
    """All completed workflow runs. Big — capped per max_pages."""
    items = gh_paginate(
        f"https://api.github.com/repos/{repo}/actions/runs",
        token,
        params={"per_page": PER_PAGE},
        max_pages=max_pages,
        key="workflow_runs",
    )
    events: List[Dict[str, Any]] = []
    for run in items:
        if run.get("status") != "completed":
            continue
        conclusion = run.get("conclusion")
        if conclusion not in ("success", "failure"):
            continue
        ts = run.get("updated_at")
        if not ts:
            continue
        events.append({
            "id": f"wf-{run['id']}",
            "kind": "workflow_passed" if conclusion == "success" else "workflow_failed",
            "ts": ts,
            "name": run.get("name", "?"),
            "head_sha": (run.get("head_sha") or "")[:8],
            "html_url": run.get("html_url", ""),
        })
    return events


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Skiv backfill — replay repo lifetime events")
    p.add_argument("--repo", default=os.getenv("GITHUB_REPOSITORY", "MasterDD-L34D/Game"))
    p.add_argument("--max-pages", type=int, default=30, help="Max paginate per resource (PR/issue/wf)")
    p.add_argument("--reset-state", action="store_true", help="Reset state before backfill")
    p.add_argument("--skip-workflows", action="store_true", help="Skip workflow runs (heavy + chatty)")
    p.add_argument("--dry-run", action="store_true")
    p.add_argument("--quiet", action="store_true")
    return p.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv if argv is not None else sys.argv[1:])
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
    except Exception:
        pass
    sm.ensure_dirs()

    if args.reset_state:
        sm.save_json(sm.STATE_PATH, sm.DEFAULT_STATE)
        sm.save_json(sm.CURSOR_PATH, sm.DEFAULT_CURSOR)
        if not args.quiet:
            print(f"[backfill] reset state -> {sm.STATE_PATH}")

    state = sm.load_json(sm.STATE_PATH, sm.DEFAULT_STATE)
    cursor = sm.load_json(sm.CURSOR_PATH, sm.DEFAULT_CURSOR)
    token = os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN")

    print(f"[backfill] fetching merged PRs (max_pages={args.max_pages})...", flush=True)
    pr_events = fetch_all_merged_prs(args.repo, token, args.max_pages)
    print(f"[backfill]   {len(pr_events)} merged PRs", flush=True)

    print(f"[backfill] fetching issues...", flush=True)
    issue_events = fetch_all_issues(args.repo, token, args.max_pages)
    print(f"[backfill]   {len(issue_events)} issue events", flush=True)

    wf_events: List[Dict[str, Any]] = []
    if not args.skip_workflows:
        print(f"[backfill] fetching workflow runs (skip with --skip-workflows)...", flush=True)
        wf_events = fetch_all_workflows(args.repo, token, args.max_pages)
        print(f"[backfill]   {len(wf_events)} workflow events", flush=True)

    all_events = pr_events + issue_events + wf_events
    all_events.sort(key=lambda e: e.get("ts") or "")
    print(f"[backfill] total events to replay: {len(all_events)}", flush=True)

    if args.dry_run:
        print(json.dumps({
            "total_events": len(all_events),
            "pr": len(pr_events),
            "issue": len(issue_events),
            "wf": len(wf_events),
            "first_ts": all_events[0]["ts"] if all_events else None,
            "last_ts": all_events[-1]["ts"] if all_events else None,
        }, indent=2))
        return 0

    new_entries = sm.process_events(all_events, state, cursor)
    print(f"[backfill] applied {len(new_entries)} new events to state", flush=True)

    for entry in new_entries:
        sm.append_jsonl(sm.FEED_PATH, entry)
    sm.save_json(sm.STATE_PATH, state)
    sm.save_json(sm.CURSOR_PATH, cursor)

    # Render fresh card.
    recent: List[Dict[str, Any]] = []
    if sm.FEED_PATH.exists():
        with sm.FEED_PATH.open("r", encoding="utf-8") as f:
            recent = [json.loads(line) for line in f.readlines()[-30:] if line.strip()]
    doc = sm.render_doc(state, recent).replace("AUTOGEN", sm.now_iso())
    sm.DOC_PATH.write_text(doc, encoding="utf-8")

    print(f"[backfill] DONE. Skiv state:", flush=True)
    print(f"  level={state['level']} xp={state['xp']}/{state['xp_next']}", flush=True)
    print(f"  hp={state['gauges']['hp']}/{state['gauges']['hp_max']}", flush=True)
    print(f"  evolve_opps={state['evolve_opportunity']} perk_pending={state['perk_pending']}", flush=True)
    print(f"  counters: PR={state['counters']['prs_merged']} ISS+={state['counters']['issues_opened']} "
          f"FIX={state['counters']['commits_fix']} WF✓={state['counters']['workflows_passed']} "
          f"WF✗={state['counters']['workflows_failed']}", flush=True)
    print(f"  narrative_log_size={state['narrative_log_size']}", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
