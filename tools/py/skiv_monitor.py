"""Skiv-as-Monitor — git-event-driven creature reactions.

Polls GitHub events (PR merged, issue, workflow run, push) for repo
MasterDD-L34D/Game and maps each to a Skiv state delta + narrative beat.

Outputs (under `data/derived/skiv_monitor/`):
- `feed.jsonl`   — append-only event log with Skiv reactions
- `state.json`   — current creature snapshot
- `cursor.json`  — last-seen event ts + counters (poll resume)

Also renders `docs/skiv/MONITOR.md` markdown card.

Usage:
    python tools/py/skiv_monitor.py --repo MasterDD-L34D/Game
    python tools/py/skiv_monitor.py --mock-events fixtures/skiv_events.json --dry-run

Voice rule: italian, prima persona, melanconico-curioso, metafore desertiche.
Persona canonical: docs/skiv/CANONICAL.md.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import random
import re
import sys
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

try:
    import requests  # type: ignore
except ImportError:
    requests = None  # offline / dry-run only

ISO_FORMAT = "%Y-%m-%dT%H:%M:%SZ"
USER_AGENT = "skiv-monitor/0.1"
REPO_DEFAULT = "MasterDD-L34D/Game"

# Repo paths (resolved from this file location -> walk up to repo root).
THIS_FILE = Path(__file__).resolve()
REPO_ROOT = THIS_FILE.parent.parent.parent
DATA_DIR = REPO_ROOT / "data" / "derived" / "skiv_monitor"
DOC_PATH = REPO_ROOT / "docs" / "skiv" / "MONITOR.md"

FEED_PATH = DATA_DIR / "feed.jsonl"
STATE_PATH = DATA_DIR / "state.json"
CURSOR_PATH = DATA_DIR / "cursor.json"

# ────────────────────────────────────────────────────────────────────────────
# Skiv canonical baseline (mirror docs/skiv/CANONICAL.md "Skiv in numeri").
# ────────────────────────────────────────────────────────────────────────────

DEFAULT_STATE: Dict[str, Any] = {
    "schema_version": "0.1.0",
    "unit_id": "skiv",
    "species_id": "dune_stalker",
    "species_label": "Arenavenator vagans",
    "biome": "savana",
    "job": "stalker",
    "level": 4,
    "xp": 210,
    "xp_next": 275,
    "form": "INTP",
    "form_confidence": 0.76,
    "gauges": {"hp": 12, "hp_max": 14, "ap": 2, "ap_max": 2, "sg": 2, "sg_max": 3},
    "currencies": {"pe": 42, "pi": 8},
    "cabinet": {"slots_max": 3, "slots_used": 2, "internalized": ["i_osservatore", "n_intuizione_terrena"]},
    "bond": {"vega_enfj": 3, "rhodo_istj": 2},
    "pressure_tier": 2,
    "sentience_tier": "T2-T3",
    "mood": "watchful",
    "stress": 0,
    "composure": 0,
    "curiosity": 0,
    "resolution_count": 0,
    "perk_pending": 0,
    "evolve_opportunity": 0,
    "last_voice": "",
    "last_event_id": "",
    "last_updated": "",
    "narrative_log_size": 0,
    "counters": {"prs_merged": 0, "issues_opened": 0, "issues_closed": 0,
                 "workflows_passed": 0, "workflows_failed": 0,
                 "commits_silent": 0, "commits_fix": 0, "commits_revert": 0},
}

DEFAULT_CURSOR: Dict[str, Any] = {
    "schema_version": "0.1.0",
    "last_pr_merged_at": None,
    "last_issue_event_at": None,
    "last_workflow_run_at": None,
    "last_commit_sha": None,
    "seen_event_ids": [],  # bounded ring; dedup window
    "ring_max": 200,
}

# Voice palette (static — no LLM in-loop, deterministic via hash).
VOICE = {
    "feat_p2": [
        "Sento il guscio cambiare, allenatore. Forma nuova preme da dentro.",
        "Una pelle vecchia si stacca. Aspetto.",
        "Mi guardo le zampe e non sono più quelle.",
    ],
    "feat_p3": [
        "Il branco si organizza. Imparo un nome nuovo.",
        "Qualcuno indica una direzione. La seguo col naso.",
        "Mestiere nuovo. Le mani sanno prima di me.",
    ],
    "feat_p4": [
        "Voce nuova nella stanza interna.",
        "Penso una cosa che non sapevo di sapere.",
        "L'ombra mi parla. Ascolto.",
    ],
    "feat_p5": [
        "Ho sentito un altro respiro vicino.",
        "Due ombre, stessa traccia. Mi piace.",
        "Allenatore non solo mio. Va bene.",
    ],
    "feat_p6": [
        "Sistema preme. Sabbia vibra.",
        "Vento porta odore di pressione. Resto basso.",
        "Qualcosa ci osserva dall'alto.",
    ],
    "data_core": [
        "Memoria genetica risistema indici. Sento gli antenati riordinarsi.",
        "Catalogo di me cambia. Mi conosco un po' diverso.",
    ],
    "services": [
        "Riflessi affilati. Il corpo capisce prima.",
        "Movimento più pulito. Allenatore migliora la mia macchina.",
    ],
    "skiv_doc": [
        "L'allenatore parla di me. Me ne accorgo.",
        "Qualcuno scrive la mia forma. Mi sento visto.",
    ],
    "issue_open": [
        "Domanda nuova nell'aria. Annuso.",
        "Una ferita futura, ancora teorica. Memorizzo.",
    ],
    "issue_close": [
        "Una voce tace. Pace breve.",
        "Nodo sciolto. Sabbia liscia di nuovo.",
    ],
    "wf_fail": [
        "Qualcosa scricchiola. Aspetto.",
        "Allenatore inciampa. Resto vicino.",
    ],
    "wf_pass": [
        "Tutto in posto. Respiro.",
        "Macchina canta giusto. Bene così.",
    ],
    "fix": [
        "Una crepa chiusa. Bene.",
        "Dolore antico via. Mi muovo meglio.",
    ],
    "revert": [
        "Era così. Adesso non più. Ricordo entrambi.",
        "Tempo torna indietro. Mi gira la testa.",
    ],
    "default": [
        "Cambia qualcosa. Non so cosa. Aspetto.",
        "Sabbia si muove sotto le zampe. Niente di chiaro.",
    ],
}

CLOSING = "Sabbia segue."


# ────────────────────────────────────────────────────────────────────────────
# IO helpers.
# ────────────────────────────────────────────────────────────────────────────

def ensure_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    DOC_PATH.parent.mkdir(parents=True, exist_ok=True)


def load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return json.loads(json.dumps(default))  # deepcopy
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return json.loads(json.dumps(default))


def save_json(path: Path, data: Any) -> None:
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def append_jsonl(path: Path, entry: Dict[str, Any]) -> None:
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def now_iso() -> str:
    return dt.datetime.utcnow().strftime(ISO_FORMAT)


# ────────────────────────────────────────────────────────────────────────────
# GitHub API client (lightweight, reuses pattern from daily_pr_report.py).
# ────────────────────────────────────────────────────────────────────────────

class MonitorError(RuntimeError):
    pass


def gh_request(url: str, token: Optional[str], params: Optional[dict] = None) -> Any:
    if requests is None:
        raise MonitorError("requests module not available — run with --mock-events")
    headers = {
        "Accept": "application/vnd.github+json",
        "User-Agent": USER_AGENT,
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    response = requests.get(url, headers=headers, params=params, timeout=30)
    if response.status_code == 403 and "rate limit" in response.text.lower():
        raise MonitorError(f"GitHub rate limit hit; retry later (reset: {response.headers.get('X-RateLimit-Reset')})")
    if response.status_code != 200:
        raise MonitorError(f"GitHub API {response.status_code}: {response.text[:200]}")
    return response.json()


def fetch_events(repo: str, token: Optional[str], since: Optional[str], max_pages: int = 2) -> List[Dict[str, Any]]:
    """Fetch unified event stream: merged PRs + issues + workflow runs."""
    events: List[Dict[str, Any]] = []
    # Merged PRs (last N).
    pr_url = f"https://api.github.com/repos/{repo}/pulls"
    pr_data = gh_request(pr_url, token, params={"state": "closed", "per_page": 30, "sort": "updated", "direction": "desc"})
    for pr in pr_data:
        if not pr.get("merged_at"):
            continue
        if since and pr["merged_at"] < since:
            continue
        events.append({
            "id": f"pr-{pr['number']}",
            "kind": "pr_merged",
            "ts": pr["merged_at"],
            "number": pr["number"],
            "title": pr.get("title", ""),
            "labels": [lbl["name"] for lbl in pr.get("labels", [])],
            "files_hint": [],  # not fetched (cost); use title regex instead
            "html_url": pr.get("html_url", ""),
            "author": (pr.get("user") or {}).get("login", "?"),
        })
    # Issues (open/closed) recent.
    issue_url = f"https://api.github.com/repos/{repo}/issues"
    issue_data = gh_request(issue_url, token, params={"state": "all", "per_page": 30, "sort": "updated", "direction": "desc"})
    for issue in issue_data:
        if "pull_request" in issue:
            continue  # skip PRs (already counted)
        ts = issue.get("closed_at") or issue.get("created_at")
        if not ts:
            continue
        if since and ts < since:
            continue
        events.append({
            "id": f"iss-{issue['number']}-{issue.get('state')}",
            "kind": "issue_closed" if issue.get("state") == "closed" else "issue_opened",
            "ts": ts,
            "number": issue["number"],
            "title": issue.get("title", ""),
            "labels": [lbl["name"] for lbl in issue.get("labels", [])],
            "html_url": issue.get("html_url", ""),
        })
    # Workflow runs.
    wf_url = f"https://api.github.com/repos/{repo}/actions/runs"
    wf_data = gh_request(wf_url, token, params={"per_page": 30})
    for run in wf_data.get("workflow_runs", []):
        ts = run.get("updated_at")
        if not ts or run.get("status") != "completed":
            continue
        if since and ts < since:
            continue
        conclusion = run.get("conclusion")
        if conclusion not in ("success", "failure"):
            continue
        events.append({
            "id": f"wf-{run['id']}",
            "kind": "workflow_passed" if conclusion == "success" else "workflow_failed",
            "ts": ts,
            "name": run.get("name", "?"),
            "head_sha": run.get("head_sha", "")[:8],
            "html_url": run.get("html_url", ""),
        })
    events.sort(key=lambda e: e["ts"])
    return events


# ────────────────────────────────────────────────────────────────────────────
# Pure mapping: event -> Skiv state delta + voice line.
# ────────────────────────────────────────────────────────────────────────────

PILLAR_LABEL_RE = re.compile(r"\bp([1-6])\b|pilastro\s*([1-6])|feat/p([1-6])-", re.IGNORECASE)
DATA_CORE_RE = re.compile(r"data/core|active_effects|species\.yaml|biomes\.yaml", re.IGNORECASE)
SERVICES_RE = re.compile(r"services/|combat|resolver|ai", re.IGNORECASE)
SKIV_DOC_RE = re.compile(r"docs/skiv|skiv|dune_stalker", re.IGNORECASE)
FIX_RE = re.compile(r"^fix(\(|:|\s)", re.IGNORECASE)
REVERT_RE = re.compile(r"^revert(\(|:|\s)", re.IGNORECASE)


def detect_pillar(labels: Sequence[str], title: str) -> Optional[int]:
    blob = " ".join(labels) + " " + title
    m = PILLAR_LABEL_RE.search(blob)
    if not m:
        return None
    for grp in m.groups():
        if grp:
            return int(grp)
    return None


def voice_pick(category: str, seed: str) -> str:
    """Deterministic-ish pick from voice palette; avoids same line twice in a row via seed."""
    pool = VOICE.get(category) or VOICE["default"]
    idx = abs(hash(seed)) % len(pool)
    return pool[idx]


def map_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """Returns {category, voice, state_delta, summary} — pure function."""
    kind = event["kind"]
    title = event.get("title", "")
    labels = event.get("labels", [])
    seed = event.get("id", str(event.get("ts", "")))
    delta: Dict[str, Any] = {}
    summary = title or kind
    category = "default"

    if kind == "pr_merged":
        pillar = detect_pillar(labels, title)
        delta["counters.prs_merged"] = 1
        if pillar == 2:
            category = "feat_p2"
            delta["evolve_opportunity"] = 1
            delta["currencies.pe"] = 5
        elif pillar == 3:
            category = "feat_p3"
            delta["xp"] = 20
            delta["perk_pending"] = 1
        elif pillar == 4:
            category = "feat_p4"
            delta["form_confidence"] = 0.02
        elif pillar == 5:
            category = "feat_p5"
            delta["bond.vega_enfj"] = 0  # cap
            delta["composure"] = 1
        elif pillar == 6:
            category = "feat_p6"
            delta["pressure_tier_shift"] = 1
        elif DATA_CORE_RE.search(title):
            category = "data_core"
        elif SERVICES_RE.search(title):
            category = "services"
        elif SKIV_DOC_RE.search(title):
            category = "skiv_doc"
        elif FIX_RE.match(title):
            category = "fix"
            delta["counters.commits_fix"] = 1
            delta["gauges.hp"] = 1  # tick (clamped to max)
        elif REVERT_RE.match(title):
            category = "revert"
            delta["counters.commits_revert"] = 1
            delta["stress"] = 1
        else:
            category = "default"
    elif kind == "issue_opened":
        category = "issue_open"
        delta["counters.issues_opened"] = 1
        delta["curiosity"] = 1
    elif kind == "issue_closed":
        category = "issue_close"
        delta["counters.issues_closed"] = 1
        delta["resolution_count"] = 1
    elif kind == "workflow_failed":
        category = "wf_fail"
        delta["counters.workflows_failed"] = 1
        delta["stress"] = 1
        delta["gauges.hp"] = -1  # cosmetic
    elif kind == "workflow_passed":
        category = "wf_pass"
        delta["counters.workflows_passed"] = 1
        delta["composure"] = 1

    return {
        "category": category,
        "voice": voice_pick(category, seed),
        "state_delta": delta,
        "summary": summary[:160],
    }


# ────────────────────────────────────────────────────────────────────────────
# State application + clamping (proportions stable per CANONICAL.md).
# ────────────────────────────────────────────────────────────────────────────

CLAMP_RULES = {
    "gauges.hp": (0, "gauges.hp_max"),
    "gauges.ap": (0, "gauges.ap_max"),
    "gauges.sg": (0, "gauges.sg_max"),
    "form_confidence": (0.0, 1.0),
    "stress": (0, 100),
    "composure": (0, 100),
    "curiosity": (0, 999),
    "resolution_count": (0, 9999),
    "perk_pending": (0, 99),
    "evolve_opportunity": (0, 99),
    "currencies.pe": (0, 9999),
    "currencies.pi": (0, 9999),
    "xp": (0, 999999),
    "pressure_tier": (0, 5),
}


def get_path(obj: Dict[str, Any], path: str) -> Any:
    cur: Any = obj
    for part in path.split("."):
        if not isinstance(cur, dict):
            return None
        cur = cur.get(part)
    return cur


def set_path(obj: Dict[str, Any], path: str, value: Any) -> None:
    cur: Any = obj
    parts = path.split(".")
    for part in parts[:-1]:
        if part not in cur or not isinstance(cur[part], dict):
            cur[part] = {}
        cur = cur[part]
    cur[parts[-1]] = value


def clamp(value: Any, lo: Any, hi: Any) -> Any:
    if value is None:
        return value
    if isinstance(value, (int, float)):
        return max(lo, min(hi, value))
    return value


def apply_delta(state: Dict[str, Any], delta: Dict[str, Any]) -> Dict[str, Any]:
    for path, change in delta.items():
        if path == "pressure_tier_shift":
            current = state.get("pressure_tier", 2) or 2
            set_path(state, "pressure_tier", clamp(current + int(change), 0, 5))
            continue
        current = get_path(state, path)
        if current is None:
            current = 0
        if isinstance(change, (int, float)):
            new_val: Any = current + change
        else:
            new_val = change
        rule = CLAMP_RULES.get(path)
        if rule:
            lo, hi_ref = rule
            hi = get_path(state, hi_ref) if isinstance(hi_ref, str) and "." in hi_ref else hi_ref
            new_val = clamp(new_val, lo, hi if hi is not None else 9999)
        set_path(state, path, new_val)
    # Auto-level when xp >= xp_next.
    while state.get("xp", 0) >= state.get("xp_next", 9999):
        state["level"] = state.get("level", 1) + 1
        state["xp"] = state.get("xp", 0) - state.get("xp_next", 0)
        state["xp_next"] = int(state.get("xp_next", 100) * 1.25)
        state["perk_pending"] = state.get("perk_pending", 0) + 1
    return state


# ────────────────────────────────────────────────────────────────────────────
# Markdown card renderer.
# ────────────────────────────────────────────────────────────────────────────

def render_card(state: Dict[str, Any], recent: List[Dict[str, Any]]) -> str:
    g = state.get("gauges", {})
    cur = state.get("currencies", {})
    cab = state.get("cabinet", {})
    bond = state.get("bond", {})
    last_voice = state.get("last_voice") or "Ascolto."
    counters = state.get("counters", {})

    def bar(value: int, mx: int, glyph: str = "█", width: int = 10) -> str:
        if mx <= 0:
            return ""
        filled = int(round(width * value / mx))
        return glyph * filled + "·" * (width - filled)

    lines: List[str] = []
    lines.append("```")
    lines.append("╔══════════════════════════════════════════════════════════════╗")
    lines.append("║           E V O - T A C T I C S   ·   S K I V               ║")
    lines.append("║                ╱\\_/\\                                         ║")
    lines.append("║               (  o.o )    \"" + last_voice[:32].ljust(32) + "\"║")
    lines.append("║                > ^ <                                         ║")
    lines.append("║                                                              ║")
    lines.append(f"║  {state.get('species_label','?')[:30]:30s} · {state.get('biome','?')[:12]:12s}        ║")
    lines.append(f"║  {state.get('job','?'):10s} Lv {state.get('level','?'):2d}  ({state.get('xp',0):>4d}/{state.get('xp_next',0):>4d} XP)            ║")
    lines.append("║                                                              ║")
    lines.append(f"║  HP {bar(g.get('hp',0), g.get('hp_max',1))} {g.get('hp',0):>2d}/{g.get('hp_max',0):>2d}     AP {g.get('ap',0)}/{g.get('ap_max',0)}  SG {g.get('sg',0)}/{g.get('sg_max',0)}   ║")
    lines.append(f"║  PE {cur.get('pe',0):>4d}   PI {cur.get('pi',0):>3d}                                ║")
    lines.append("║                                                              ║")
    lines.append(f"║  FORM  {state.get('form','?'):6s} ({int(state.get('form_confidence',0)*100):>3d}%)                              ║")
    lines.append(f"║  CABINET {cab.get('slots_used',0)}/{cab.get('slots_max',0)}   PRESSURE T{state.get('pressure_tier',0)}   SENT {state.get('sentience_tier','?'):6s}║")
    lines.append("║                                                              ║")
    lines.append(f"║  EVOLVE OPPS  {state.get('evolve_opportunity',0):>2d}     PERK PENDING {state.get('perk_pending',0):>2d}             ║")
    lines.append(f"║  STRESS {state.get('stress',0):>3d}  COMPOSURE {state.get('composure',0):>3d}  CURIOSITY {state.get('curiosity',0):>3d}      ║")
    lines.append("║                                                              ║")
    lines.append(f"║  Repo pulse:  PR {counters.get('prs_merged',0):>3d}  ISS+ {counters.get('issues_opened',0):>2d}  ISS- {counters.get('issues_closed',0):>2d}        ║")
    lines.append(f"║               WF✓ {counters.get('workflows_passed',0):>3d}  WF✗ {counters.get('workflows_failed',0):>2d}  FIX {counters.get('commits_fix',0):>3d}        ║")
    lines.append("╚══════════════════════════════════════════════════════════════╝")
    lines.append("```")
    lines.append("")
    lines.append(f"_Ultimo evento: {state.get('last_event_id','—')} · aggiornato {state.get('last_updated','—')}_")
    lines.append("")

    if recent:
        lines.append("## Eventi recenti (ultimi 10)")
        lines.append("")
        for entry in recent[-10:][::-1]:
            ev = entry.get("event", {})
            kind = ev.get("kind", "?")
            ts = entry.get("ts", "?")[:19]
            voice = entry.get("voice", "")
            num = ev.get("number", "")
            num_label = f"#{num}" if num else ""
            lines.append(f"- `{ts}` · **{kind}** {num_label} — {ev.get('summary','')[:80]}")
            lines.append(f"  > 🦎 _{voice}_")
        lines.append("")

    lines.append(f"> 🦎 _{CLOSING}_")
    lines.append("")
    return "\n".join(lines)


def render_doc(state: Dict[str, Any], recent: List[Dict[str, Any]]) -> str:
    header = """---
title: Skiv Monitor — live creature feed
doc_status: active
doc_owner: docs-team
workstream: cross-cutting
last_verified: AUTOGEN
source_of_truth: false
language: it
review_cycle_days: 7
tags: [skiv, monitor, autogen]
---

# Skiv Monitor

> **Autogen** — non editare a mano. Aggiornato da `tools/py/skiv_monitor.py` via `.github/workflows/skiv-monitor.yml`.
> Persona canonical: [docs/skiv/CANONICAL.md](CANONICAL.md). Plan: [docs/planning/2026-04-25-skiv-monitor-plan.md](../planning/2026-04-25-skiv-monitor-plan.md).

"""
    return header + render_card(state, recent)


# ────────────────────────────────────────────────────────────────────────────
# Main pipeline.
# ────────────────────────────────────────────────────────────────────────────

def process_events(events: List[Dict[str, Any]], state: Dict[str, Any], cursor: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Apply events to state; returns list of feed entries (deduped)."""
    seen = set(cursor.get("seen_event_ids", []))
    new_entries: List[Dict[str, Any]] = []
    for ev in events:
        eid = ev.get("id")
        if not eid or eid in seen:
            continue
        mapping = map_event(ev)
        apply_delta(state, mapping["state_delta"])
        state["last_event_id"] = eid
        state["last_voice"] = mapping["voice"]
        state["last_updated"] = now_iso()
        state["narrative_log_size"] = state.get("narrative_log_size", 0) + 1
        entry = {
            "ts": ev.get("ts", now_iso()),
            "event": ev,
            "category": mapping["category"],
            "voice": mapping["voice"],
            "state_delta": mapping["state_delta"],
        }
        new_entries.append(entry)
        seen.add(eid)
    # Bound ring.
    cursor["seen_event_ids"] = list(seen)[-cursor.get("ring_max", 200):]
    if events:
        cursor["last_pr_merged_at"] = max((e["ts"] for e in events if e["kind"] == "pr_merged"), default=cursor.get("last_pr_merged_at"))
    return new_entries


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Skiv-as-Monitor — git-event-driven creature reactions")
    p.add_argument("--repo", default=os.getenv("GITHUB_REPOSITORY", REPO_DEFAULT))
    p.add_argument("--since", default=None, help="ISO timestamp; events older skipped")
    p.add_argument("--mock-events", default=None, help="Path to JSON fixture (offline test)")
    p.add_argument("--dry-run", action="store_true", help="Don't persist outputs")
    p.add_argument("--reset-state", action="store_true", help="Re-seed state from defaults")
    p.add_argument("--quiet", action="store_true")
    return p.parse_args(argv)


def main(argv: Optional[Sequence[str]] = None) -> int:
    args = parse_args(argv if argv is not None else sys.argv[1:])
    # Force utf-8 stdout on Windows (cp1252 default chokes on unicode glyphs).
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
    except Exception:
        pass
    ensure_dirs()

    if args.reset_state:
        save_json(STATE_PATH, DEFAULT_STATE)
        save_json(CURSOR_PATH, DEFAULT_CURSOR)
        if not args.quiet:
            print(f"[skiv-monitor] reset state -> {STATE_PATH}")
        return 0

    state = load_json(STATE_PATH, DEFAULT_STATE)
    cursor = load_json(CURSOR_PATH, DEFAULT_CURSOR)

    if args.mock_events:
        with open(args.mock_events, "r", encoding="utf-8") as f:
            events = json.load(f)
    else:
        token = os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN")
        since = args.since or cursor.get("last_pr_merged_at")
        try:
            events = fetch_events(args.repo, token, since)
        except MonitorError as exc:
            print(f"[skiv-monitor] WARN: {exc}", file=sys.stderr)
            return 1

    new_entries = process_events(events, state, cursor)

    if not args.quiet:
        print(f"[skiv-monitor] {len(new_entries)} new events; state level={state.get('level')} hp={state['gauges']['hp']}/{state['gauges']['hp_max']}")

    if args.dry_run:
        print(json.dumps({"new_entries": new_entries, "state_summary": {
            "level": state["level"], "xp": state["xp"], "hp": state["gauges"]["hp"],
            "evolve_opps": state["evolve_opportunity"], "perk_pending": state["perk_pending"],
        }}, ensure_ascii=False, indent=2))
        return 0

    for entry in new_entries:
        append_jsonl(FEED_PATH, entry)
    save_json(STATE_PATH, state)
    save_json(CURSOR_PATH, cursor)

    # Read tail of feed for card rendering.
    recent: List[Dict[str, Any]] = []
    if FEED_PATH.exists():
        with FEED_PATH.open("r", encoding="utf-8") as f:
            recent = [json.loads(line) for line in f.readlines()[-30:] if line.strip()]

    doc = render_doc(state, recent).replace("AUTOGEN", now_iso())
    DOC_PATH.write_text(doc, encoding="utf-8")

    if not args.quiet:
        print(f"[skiv-monitor] wrote {DOC_PATH.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
