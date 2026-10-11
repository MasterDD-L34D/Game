---
name: ticket-triage
description: |
  Triage proposed tickets emessi da agent illuminator auto-gen.
  Sub-commands:
    /ticket-triage                       → list top 10 proposed
    /ticket-triage accept TKT-{ID}       → move proposed → active
    /ticket-triage reject TKT-{ID} --reason "X"  → move proposed → rejected
    /ticket-triage merge TKT-{ID} --pr URL --sha SHA  → move active → merged
    /ticket-triage stats                 → count per agent + per pillar
    /ticket-triage sync                  → invoke sync_proposed_tickets.py

  Source canonical: docs/research/2026-04-26-ticket-auto-gen-architecture-D.md §5.
  Step 7 user decision 2026-04-27.
---

# Ticket Triage Skill

> Skill on-demand per review proposed tickets emessi da agent.
> Source: `docs/research/2026-04-26-ticket-auto-gen-architecture-D.md` (Step 3 §5).

## Steps esecuzione

### Sub-command `list` (default)

1. `ls data/core/tickets/proposed/*.json` → conta + sort by `created_at` desc
2. Per top 10: read JSON + render compact line:
   `{id} · {pillar} · {effort_hours}h · {agent_owner} · {donor_game.name}`
3. Output markdown table

### Sub-command `accept TKT-{ID}`

1. Verify file exists: `data/core/tickets/proposed/TKT-{ID}.json`
2. Read JSON, set `status: "open"` + `accepted_at: today`
3. Write a `data/core/tickets/active/TKT-{ID}.json`
4. Remove proposed file
5. Echo confirmation

### Sub-command `reject TKT-{ID} --reason "X"`

1. Verify file exists: `data/core/tickets/proposed/TKT-{ID}.json`
2. Read JSON, set `status: "rejected"` + `rejected_at` + `rejection_reason: "X"`
3. Write a `data/core/tickets/rejected/TKT-{ID}.json`
4. Remove proposed file
5. Echo confirmation

### Sub-command `merge TKT-{ID} --pr URL --sha SHA`

1. Verify file exists in `active/` o `proposed/`
2. Read JSON, set `status: "merged"` + `pr_url` + `merged_sha` + `merged_at`
3. Write a `data/core/tickets/merged/TKT-{ID}.json`
4. Remove from previous location
5. Update BACKLOG.md mark TKT-ID as completed (strikethrough)

### Sub-command `stats`

1. Scan tutti subdirs (proposed/active/rejected/merged)
2. Conta per status, per agent_owner, per pillar
3. Output markdown table aggregato

### Sub-command `sync`

1. Invoke `python tools/py/sync_proposed_tickets.py`
2. Forward output a user

## Anti-pattern guard

- ❌ Non auto-accept tutto in batch (perde controllo qualità)
- ❌ Non skip schema validation
- ❌ Non bypass dedup (TKT-ID duplicato in BACKLOG)
- ❌ Non muovere file senza update `status` field

## Smoke flow esempio

```bash
# List
/ticket-triage
→ "Found 75 proposed tickets in data/core/tickets/proposed/"

# Accept top-1
/ticket-triage accept TKT-P6-PATHFINDER-XP-BUDGET
→ "Accepted, moved to active/"

# Reject blocked
/ticket-triage reject TKT-CREATURE-CK3-DNA --reason "OD-001 Path A pending"
→ "Rejected con motivo, moved to rejected/"

# Sync to BACKLOG
/ticket-triage sync
→ "Appended 8 ticket(s) to BACKLOG.md"

# Stats
/ticket-triage stats
→ proposed: 73, active: 1, rejected: 1, merged: 0
```

## Trigger consultation

- User dice: "che ticket abbiamo proposed?"
- Sprint planning: "quali ticket sblocco questo sprint?"
- Post audit agent: "salva findings come ticket"
- Cross-PC coordination: prima di nuovo work, verifica ticket non duplica
