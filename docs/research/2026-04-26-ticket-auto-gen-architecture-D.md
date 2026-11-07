---
title: 'Ticket Auto-Generation Architecture D — execution spec for M14 sprint'
date: 2026-04-26
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-04-26'
source_of_truth: false
language: it
review_cycle_days: 60
tags: [agent, integration, ticket, automation, architecture, M14, sprint-planning]
related:
  - docs/research/2026-04-26-agent-integration-plan-DETAILED.md
  - docs/research/2026-04-26-cross-game-extraction-MASTER.md
  - .claude/agents/balance-illuminator.md
  - BACKLOG.md
---

# Ticket Auto-Generation Architecture D

> **Step 3** dell'Agent Integration Plan (Step 1+2 shipped PR #1892).
> **Status**: architecture spec only. Runtime engine deferred a sprint M14.
> **Effort totale**: ~5.25h sviluppo + 2h test smoke + decisione user schema.

---

## §0 — TL;DR esecuzione

| Sub-step                                          |     Effort | Dipendenza     |
| ------------------------------------------------- | ---------: | -------------- |
| 1. Ticket schema JSON canonical                   |       0.5h | nessuna        |
| 2. Ticket store directory structure               |      0.25h | sub-step 1     |
| 3. Agent emit hook (10 illuminator edit)          |         2h | sub-step 1+2   |
| 4. BACKLOG sync script Python                     |       1.5h | sub-step 2     |
| 5. ticket-triage skill                            |         1h | sub-step 4     |
| **Totale sviluppo**                               |  **5.25h** |                |
| Test smoke E2E (3 agent run produrre real ticket) |         2h | tutti sub-step |
| **Grand total con QA**                            | **~7.25h** |                |

**Bloccanti**:

- Decisione user su ticket schema fields (sub-step 1) — 4 opzioni vedi §6
- Sprint M14 slot disponibile
- 2 PR pre-requisito merge: #1892 (agent integration step 1+2) + 4 extraction matrix doc

---

## §1 — Sub-step 1: Ticket schema JSON canonical

### File: `data/core/tickets/ticket_schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Ticket BACKLOG-ready",
  "description": "Canonical ticket schema per agent auto-generation. Source: docs/research/2026-04-26-ticket-auto-gen-architecture-D.md",
  "type": "object",
  "required": [
    "id",
    "title",
    "pillar",
    "effort_hours",
    "donor_game",
    "agent_owner",
    "audit_source_doc"
  ],
  "properties": {
    "id": {
      "type": "string",
      "pattern": "^TKT-(P[1-6]|UI|COMBAT|NARRATIVE|PCG|BALANCE|TELEMETRY|ECONOMY|CREATURE|COOP|AI|MUTATION|TRAIT|SPECIES|BIOME|META)-[A-Z0-9-]+-[A-Z0-9]+$",
      "description": "Format: TKT-{PILLAR_OR_AREA}-{DONOR-GAME}-{FEATURE}"
    },
    "title": { "type": "string", "minLength": 5, "maxLength": 80 },
    "pillar": {
      "enum": ["P1", "P2", "P3", "P4", "P5", "P6", "cross-cutting"],
      "description": "Pillar mappato (vedi docs/core/02-PILASTRI.md)"
    },
    "effort_hours": { "type": "number", "minimum": 0.25, "maximum": 50 },
    "donor_game": {
      "type": "object",
      "required": ["name", "tier"],
      "properties": {
        "name": { "type": "string" },
        "tier": { "enum": ["S", "A", "B", "E", "anti-ref"] },
        "matrix_anchor": {
          "type": "string",
          "description": "Anchor link to docs/research/2026-04-26-tier-{S,A,B,E}-extraction-matrix.md#{anchor}"
        }
      }
    },
    "agent_owner": {
      "enum": [
        "balance-illuminator",
        "balance-auditor",
        "creature-aspect-illuminator",
        "economy-design-illuminator",
        "narrative-design-illuminator",
        "pcg-level-design-illuminator",
        "telemetry-viz-illuminator",
        "ui-design-illuminator",
        "coop-phase-validator",
        "playtest-analyzer",
        "repo-archaeologist",
        "session-debugger",
        "schema-ripple",
        "migration-planner",
        "sot-planner",
        "species-reviewer"
      ]
    },
    "status": {
      "enum": ["proposed", "open", "in_progress", "review", "merged", "rejected", "duplicate"],
      "default": "proposed"
    },
    "reuse_level": { "enum": ["minimal", "moderate", "full"] },
    "blast_radius": { "enum": ["isolated", "moderate", "wide"] },
    "blockers": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Other TKT-IDs or external decision deps"
    },
    "anti_pattern_guard": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Cross-card museum o anti-pattern doc da NON ripetere"
    },
    "museum_card": {
      "type": "string",
      "description": "Path docs/museum/cards/*.md se gap mappa a card esistente"
    },
    "audit_source_doc": {
      "type": "string",
      "description": "Path doc audit dove gap fu identificato (es. docs/reports/...)"
    },
    "created_at": { "type": "string", "format": "date" },
    "created_by_agent": { "type": "string" },
    "smoke_test_command": {
      "type": "string",
      "description": "Comando per validate ticket completion (es. node --test tests/...)"
    }
  }
}
```

### Decisione user su schema (4 livelli)

| Livello         | Fields                                                    | Note                         |
| --------------- | --------------------------------------------------------- | ---------------------------- |
| **Minimal**     | id, title, pillar, effort_hours, agent_owner              | bare-bones BACKLOG insertion |
| **Standard** ⭐ | + donor_game, status, reuse_level, audit_source_doc       | tracking utile sprint        |
| **Full**        | + blast_radius, blockers, anti_pattern_guard, museum_card | sprint-planning ready        |
| **Enterprise**  | + smoke_test_command, created_by_agent metadata           | CI/CD integration            |

**Default raccomandato**: **Standard** (8 fields, balance ergonomia/utility).

---

## §2 — Sub-step 2: Ticket store directory structure

```
data/core/tickets/
├── ticket_schema.json          # canonical schema
├── proposed/                   # auto-emitted by agents (review needed)
│   ├── TKT-P1-TACTICS-OGRE-HP-FLOATING.json
│   ├── TKT-P4-DISCO-MBTI-TAG.json
│   └── ...
├── active/                     # accepted, sprint-ready
│   └── TKT-{accepted}.json
├── rejected/                   # rejected with reason
│   └── TKT-{rejected}.json
│       (frontmatter: rejection_reason, rejected_by, rejected_at)
└── merged/                     # completed (linked to PR sha)
    └── TKT-{merged}.json
        (frontmatter: pr_url, sha, merged_at)
```

**File naming**: `TKT-{ID}.json` (ID = il `id` field del schema).

**1 file = 1 ticket** (no JSON arrays). Facilita `git pickaxe` history + per-ticket review.

---

## §3 — Sub-step 3: Agent emit hook

### Pattern integration in 10 agent illuminator

Step 1+2 shipped PR #1892 ha già aggiunto sezione "Output requirements" che richiede `Proposed tickets` final section. Step 3 rende **machine-readable** quello che ora è solo markdown.

**Modifica**: ogni agent illuminator aggiunge funzione di output secondaria:

```markdown
## Ticket emit hook (Step 3 auto-gen, M14+)

Quando esegui audit/research, OLTRE al markdown report, emit JSON ticket files
in `data/core/tickets/proposed/{TKT-ID}.json` per ogni gap identificato.

### Tool: Write

Per ogni gap, write JSON conforme a `data/core/tickets/ticket_schema.json`.

### Esempio output

Markdown report (existing):
\`\`\`
GAP-001 (P1 Tattica): UI threat tile overlay missing.

- Donor: Into the Breach telegraph rule (Tier A 🟢 PR #1884)
- Reuse path: Minimal 3h
  \`\`\`

JSON ticket emit (NEW):
\`\`\`json
{
"id": "TKT-UI-INTO-THE-BREACH-TELEGRAPH",
"title": "UI threat tile overlay (ITB telegraph rule)",
"pillar": "P1",
"effort_hours": 3,
"donor_game": {
"name": "Into the Breach",
"tier": "A",
"matrix_anchor": "docs/research/2026-04-26-tier-a-extraction-matrix.md#into-the-breach"
},
"agent_owner": "ui-design-illuminator",
"status": "proposed",
"reuse_level": "minimal",
"blast_radius": "isolated",
"audit_source_doc": "docs/reports/2026-04-26-deep-analysis-ui.md",
"created_at": "2026-04-26",
"created_by_agent": "ui-design-illuminator"
}
\`\`\`
```

### Edit count step 3

10 agent illuminator (stessi step 1+2). +1 sezione "Ticket emit hook" alla fine. ~10 min/agent × 10 = **100 min (~2h)**.

---

## §4 — Sub-step 4: BACKLOG sync script Python

### File: `tools/py/sync_proposed_tickets.py`

```python
#!/usr/bin/env python3
"""Sync proposed tickets from agent emit hook to BACKLOG.md.

Source: docs/research/2026-04-26-ticket-auto-gen-architecture-D.md (Step 3 §4).

Flow:
1. Scan data/core/tickets/proposed/*.json
2. Validate schema (jsonschema)
3. Filter duplicates (vs BACKLOG.md existing TKT-IDs)
4. Append a BACKLOG.md sezione "🤖 Auto-proposed tickets (review needed)"
5. Output report stdout: count proposed, accepted, rejected, duplicates

Usage:
    python tools/py/sync_proposed_tickets.py [--dry-run] [--threshold N]

Exit codes:
    0 = sync OK
    1 = validation errors (proposed file invalid schema)
    2 = IO/parse error
"""

import argparse
import json
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
SECTION_HEADER = "## 🤖 Auto-proposed tickets (review needed)"


def load_schema():
    with SCHEMA_PATH.open(encoding="utf-8") as fh:
        return json.load(fh)


def validate_ticket(data, schema):
    """Returns (is_valid, error_msg)"""
    try:
        jsonschema.validate(data, schema)
        return True, None
    except jsonschema.ValidationError as e:
        return False, str(e)


def existing_tkt_ids(backlog_text):
    """Extract TKT-* IDs già in BACKLOG.md per dedup."""
    import re
    return set(re.findall(r"\bTKT-[A-Z0-9-]+\b", backlog_text))


def render_ticket_md(ticket):
    """Render single ticket as markdown bullet."""
    return (
        f"- **{ticket['id']}** — {ticket['title']}\n"
        f"  - Pillar: {ticket['pillar']} · Effort: {ticket['effort_hours']}h "
        f"· Owner: {ticket['agent_owner']}\n"
        f"  - Donor: {ticket['donor_game']['name']} (Tier {ticket['donor_game']['tier']}) "
        f"· Reuse: {ticket.get('reuse_level', 'n/a')}\n"
        f"  - Source: {ticket['audit_source_doc']}\n"
    )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="report only, no write")
    ap.add_argument("--threshold", type=int, default=10,
                    help="max ticket per sync (avoid BACKLOG flood)")
    args = ap.parse_args()

    schema = load_schema()

    # 1. Scan proposed
    proposed_files = list(PROPOSED_DIR.glob("*.json"))
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
    backlog_text = BACKLOG_PATH.read_text(encoding="utf-8") if BACKLOG_PATH.exists() else ""
    existing = existing_tkt_ids(backlog_text)
    new_tickets = [t for t in valid_tickets if t["id"] not in existing]
    duplicate_count = len(valid_tickets) - len(new_tickets)

    # 4. Apply threshold
    new_tickets = new_tickets[: args.threshold]

    print(f"Valid: {len(valid_tickets)}, Duplicates: {duplicate_count}, "
          f"To append: {len(new_tickets)} (threshold {args.threshold})")

    if args.dry_run:
        print("\n--- DRY RUN preview ---")
        for t in new_tickets:
            print(render_ticket_md(t))
        return 0

    # 5. Append a BACKLOG.md
    if new_tickets:
        section = "\n\n" + SECTION_HEADER + "\n\n"
        for t in new_tickets:
            section += render_ticket_md(t) + "\n"
        BACKLOG_PATH.open("a", encoding="utf-8").write(section)
        print(f"Appended {len(new_tickets)} ticket(s) to {BACKLOG_PATH}")

    return 1 if invalid_count > 0 else 0


if __name__ == "__main__":
    sys.exit(main())
```

**Effort sub-step 4**: ~1.5h (script + jsonschema dep + smoke test).

**Dependency**: `pip install jsonschema` (existing dev requirement, verify tools/py/requirements-dev.txt).

---

## §5 — Sub-step 5: ticket-triage skill

### File: `.claude/skills/ticket-triage.md`

```markdown
---
name: ticket-triage
description: |
  Triage proposed tickets emessi da agent illuminator auto-gen (Step 3).
  User flow:
    /ticket-triage                    → mostra ultimi 10 ticket proposed
    /ticket-triage accept TKT-{ID}    → move to active/
    /ticket-triage reject TKT-{ID} --reason "X"  → move to rejected/ con motivo
    /ticket-triage merge TKT-{ID} --pr {URL} --sha {SHA}  → move to merged/
    /ticket-triage stats              → count per agent + per pillar
---

# Ticket Triage Skill

> Skill on-demand per review proposed tickets emessi da agent.

## Steps

1. **List**: scan `data/core/tickets/proposed/*.json`, sort by `created_at` desc, mostra top 10
2. **For each**: show ID + title + pillar + effort + donor + agent
3. **User decision**: accept / reject / merge / skip / batch-accept
4. **Move file**: rename + update status field + add reason/pr metadata se applicable
5. **Sync BACKLOG**: invoke `python tools/py/sync_proposed_tickets.py` post-batch

## Output

- Markdown report: ticket count per status post-triage
- BACKLOG.md updated (auto-call sync script)
```

**Effort sub-step 5**: ~1h (skill md + invoke logic + sync wire).

---

## §6 — Decisione user (3 opzioni)

### Decisione A: Schema livello (vedi §1)

- **Minimal** (5 fields)
- **Standard** ⭐ (8 fields)
- **Full** (12 fields)
- **Enterprise** (15+ fields)

### Decisione B: Ticket store location

- **Repo-tracked** ⭐ `data/core/tickets/` (commit + history + cross-PC sync)
- **Gitignored** `.tickets/` (local only, no sync)
- **Database** Prisma model `Ticket` (heavyweight, future)

### Decisione C: Sync trigger

- **Manual** ⭐ via `python tools/py/sync_proposed_tickets.py` (opt-in, safe)
- **Pre-commit hook** (auto pre-commit, rischio noise)
- **CI cron** ogni notte (background, low-friction)

### Decisione D: Sprint M14 slot

- **A** Sprint M14 dedicated (~7h totali, 1 day)
- **B** M14 spread (3 sub-sprint × 2h ciascuno)
- **C** Defer M15+ (no slot M14)

**Default raccomandato bundle**: Standard schema + Repo-tracked + Manual sync + Sprint M14 dedicated.

---

## §7 — Migration manual ticket → auto-gen

### Pre-existing manual ticket pattern in BACKLOG.md

Esempio entry attuale:

```markdown
- TKT-M11B-06 — playtest live (P5, userland, 2-4 amici)
- TKT-MUTATION-P6-VISUAL — Voidling Pattern 6 visual_swap_it (~1h)
```

### Migration plan (one-shot)

1. Script `tools/py/migrate_backlog_to_tickets.py` scan BACKLOG.md
2. Parse pattern `TKT-{ID}` + nearby description
3. Generate JSON ticket file per match
4. Output: `data/core/tickets/active/TKT-*.json` (legacy ticket = active by default)
5. BACKLOG.md riferisce file path invece descrizione inline

**Effort migration**: ~3h (one-shot, optional).

---

## §8 — Anti-pattern guard

### NON fare:

- ❌ Auto-merge proposed → active (always require user triage)
- ❌ Generate ticket senza donor_game (= not actionable, just noise)
- ❌ Threshold > 20 ticket per sync (BACKLOG flood, kill review utility)
- ❌ Skip jsonschema validation (garbage in BACKLOG)
- ❌ Append senza dedup (TKT-ID duplicate)
- ❌ Commit hook auto-emit (lose user agency)

### DA fare:

- ✅ Manual triage gate (user decide accept/reject)
- ✅ Schema validation hard gate
- ✅ Dedup vs BACKLOG.md existing IDs
- ✅ Threshold default 10 (configurable)
- ✅ Provenance: created_by_agent + audit_source_doc obbligatori
- ✅ Migration legacy TKT optional (one-shot, not enforced)

---

## §9 — Test smoke E2E (post sub-step 1-5)

### Scenario: agent emette ticket → user triage → BACKLOG sync

```bash
# 1. Invoke agent (es. balance-illuminator audit mode)
#    Agent emette JSON ticket files in proposed/
ls data/core/tickets/proposed/  # expected: N file post-audit

# 2. User triage via skill
/ticket-triage  # mostra top 10
/ticket-triage accept TKT-P6-PATHFINDER-XP-BUDGET
/ticket-triage reject TKT-CREATURE-CK3-DNA --reason "OD-001 Path A pending"

# 3. Sync to BACKLOG
python tools/py/sync_proposed_tickets.py
# expected: BACKLOG.md ha nuova sezione + TKT-P6-PATHFINDER-XP-BUDGET appended

# 4. Verify
grep TKT-P6-PATHFINDER BACKLOG.md  # expected: 1 match
ls data/core/tickets/active/  # expected: TKT-P6-PATHFINDER-XP-BUDGET.json
ls data/core/tickets/rejected/  # expected: TKT-CREATURE-CK3-DNA.json
```

**Effort test smoke**: ~2h (scenario E2E + 3 agent run).

---

## §10 — M14 sprint slot proposal

### Sub-sprint breakdown M14

| Day            | Sub-step                                          | Owner              |    Effort |
| -------------- | ------------------------------------------------- | ------------------ | --------: |
| M14.1          | Sub-step 1+2 (schema + dir) + pre-existing review | claude-code        |        1h |
| M14.2          | Sub-step 3 (10 agent edit)                        | claude-code        |        2h |
| M14.3          | Sub-step 4 (Python sync script + jsonschema test) | claude-code        |      1.5h |
| M14.4          | Sub-step 5 (ticket-triage skill)                  | claude-code        |        1h |
| M14.5          | Test smoke E2E (3 agent run + triage cycle)       | claude-code + user |        2h |
| **Totale M14** |                                                   |                    | **~7.5h** |

**Ship as 5 sequential PR atomici** (uno per sub-step) per cleaner review.

---

## §11 — Action items immediate

### Non-azione adesso

Step 3 deferred. Aspetta sprint M14 slot + decisione user §6.

### Pre-requisiti merge prima M14

- ✅ PR #1892 (agent integration step 1+2) — shipped
- ✅ 4 extraction matrix doc — shipped
- ⏸️ User decision §6 schema livello + store location + sync trigger + slot
- ⏸️ Verifica jsonschema dep in tools/py/requirements-dev.txt

### Risk mitigation

- Fallback: rimani su manual ticket scribing in BACKLOG.md (current state)
- Cost manual: ~5min per ticket × ~50 ticket future = ~4h tot, comparable a auto-gen sviluppo
- Auto-gen win nel medio-lungo periodo (>50 ticket) o quando audit cycle accelera

---

## §12 — Riferimenti

- [`docs/research/2026-04-26-agent-integration-plan-DETAILED.md`](2026-04-26-agent-integration-plan-DETAILED.md) §3 (sketch originale)
- [`docs/research/2026-04-26-cross-game-extraction-MASTER.md`](2026-04-26-cross-game-extraction-MASTER.md) §4 agent integration matrix
- 10 `.claude/agents/*-illuminator.md` aggiornati PR #1892
- `BACKLOG.md` (target sync)
