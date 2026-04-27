#!/usr/bin/env python3
"""Sync proposed tickets from agent emit hook to BACKLOG.md.

Source: docs/research/2026-04-26-ticket-auto-gen-architecture-D.md (Step 3 §4).
Step 7 user decision 2026-04-27 (faciamo insieme).

Flow:
1. Scan data/core/tickets/proposed/*.json
2. Validate schema (data/core/tickets/ticket_schema.json)
3. Filter duplicates (vs BACKLOG.md existing TKT-IDs)
4. Append a BACKLOG.md sezione "🤖 Auto-proposed tickets (review needed)"
5. Output report stdout: count proposed/accepted/rejected/duplicates

Usage:
    python tools/py/sync_proposed_tickets.py [--dry-run] [--threshold N]

Exit codes:
    0 = sync OK
    1 = validation errors (proposed file invalid schema)
    2 = IO/parse error
"""

import argparse
import json
import re
import sys
from pathlib import Path

try:
    import jsonschema
except ImportError:
    print("ERROR: pip install jsonschema", file=sys.stderr)
    sys.exit(2)


PROPOSED_DIR = Path("data/core/tickets/proposed")
SCHEMA_PATH = Path("data/core/tickets/ticket_schema.json")
BACKLOG_PATH = Path("BACKLOG.md")
SECTION_HEADER = "## 🤖 Auto-proposed tickets (agent emit hook)"


def load_schema():
    if not SCHEMA_PATH.is_file():
        print(f"ERROR: schema not found at {SCHEMA_PATH}", file=sys.stderr)
        sys.exit(2)
    with SCHEMA_PATH.open(encoding="utf-8") as fh:
        return json.load(fh)


def validate_ticket(data, schema):
    """Returns (is_valid, error_msg)."""
    try:
        jsonschema.validate(data, schema)
        return True, None
    except jsonschema.ValidationError as e:
        return False, str(e).split("\n")[0]


def existing_tkt_ids(backlog_text):
    """Extract TKT-* IDs già in BACKLOG.md per dedup."""
    return set(re.findall(r"\bTKT-[A-Z0-9-]+\b", backlog_text))


def render_ticket_md(ticket):
    """Render single ticket as markdown bullet."""
    donor = ticket.get("donor_game", {})
    return (
        f"- **{ticket['id']}** — {ticket['title']}\n"
        f"  - Pillar: {ticket['pillar']} · Effort: {ticket['effort_hours']}h "
        f"· Owner: {ticket['agent_owner']}\n"
        f"  - Donor: {donor.get('name', 'n/a')} (Tier {donor.get('tier', '?')}) "
        f"· Reuse: {ticket.get('reuse_level', 'n/a')}\n"
        f"  - Source: {ticket.get('audit_source_doc', 'n/a')}\n"
    )


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--dry-run", action="store_true", help="report only, no write")
    ap.add_argument(
        "--threshold",
        type=int,
        default=10,
        help="max ticket per sync (avoid BACKLOG flood, default 10)",
    )
    args = ap.parse_args()

    if not PROPOSED_DIR.is_dir():
        print(f"ERROR: proposed dir not found: {PROPOSED_DIR}", file=sys.stderr)
        return 2

    schema = load_schema()

    # 1. Scan proposed
    proposed_files = sorted(PROPOSED_DIR.glob("*.json"))
    print(f"Found {len(proposed_files)} proposed tickets in {PROPOSED_DIR}")

    # 2. Load + validate
    valid_tickets = []
    invalid_count = 0
    for f in proposed_files:
        try:
            with f.open(encoding="utf-8") as fh:
                data = json.load(fh)
            ok, err = validate_ticket(data, schema)
            if ok:
                valid_tickets.append(data)
            else:
                print(f"  INVALID {f.name}: {err}", file=sys.stderr)
                invalid_count += 1
        except json.JSONDecodeError as e:
            print(f"  PARSE FAIL {f.name}: {e}", file=sys.stderr)
            invalid_count += 1

    # 3. Dedup vs BACKLOG existing
    backlog_text = BACKLOG_PATH.read_text(encoding="utf-8") if BACKLOG_PATH.is_file() else ""
    existing = existing_tkt_ids(backlog_text)
    new_tickets = [t for t in valid_tickets if t["id"] not in existing]
    duplicate_count = len(valid_tickets) - len(new_tickets)

    # 4. Apply threshold
    if len(new_tickets) > args.threshold:
        print(
            f"WARN: {len(new_tickets)} new tickets exceed threshold {args.threshold}, "
            f"truncating. Run multiple times se necessario."
        )
        new_tickets = new_tickets[: args.threshold]

    print(
        f"Valid: {len(valid_tickets)}, Duplicates: {duplicate_count}, "
        f"To append: {len(new_tickets)} (threshold {args.threshold})"
    )

    if args.dry_run:
        print("\n--- DRY RUN preview ---")
        for t in new_tickets:
            print(render_ticket_md(t))
        return 0

    # 5. Append a BACKLOG.md
    if new_tickets:
        section = "\n\n" + SECTION_HEADER + "\n\n"
        section += f"_Auto-synced {len(new_tickets)} ticket(s) — review needed (accept/reject)._\n\n"
        for t in new_tickets:
            section += render_ticket_md(t) + "\n"
        with BACKLOG_PATH.open("a", encoding="utf-8") as fh:
            fh.write(section)
        print(f"Appended {len(new_tickets)} ticket(s) to {BACKLOG_PATH}")

    return 1 if invalid_count > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
