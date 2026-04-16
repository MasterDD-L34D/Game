---
name: authority-check
description: Verify source-of-truth coherence across A0-A5 authority levels
user_invocable: true
---

# Authority Check

Verify coherence across the source authority hierarchy (A0-A5) defined in EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.

## Authority Levels

- **A0**: `docs/governance/*` — path, frontmatter, metadata
- **A1**: ADRs + hubs (`docs/hubs/combat.md`, `docs/adr/ADR-*.md`) — arch boundaries
- **A2**: `data/core/*` + `packages/contracts/schemas/*` — mechanical truth
- **A3**: `docs/core/90-FINAL-DESIGN-FREEZE.md` — product synthesis, shipping scope
- **A4**: `CLAUDE.md`, `AGENTS.md` — agent workflow (not canonical content)
- **A5**: Canvas, research, historical — context only

## Steps

### 1. Freeze baseline

Read `docs/core/90-FINAL-DESIGN-FREEZE.md` (first 150 lines) for:

- Shipping scope boundaries
- Named pillars and their expected state
- Non-negotiable constraints

### 2. ADR coherence (A1 vs A3)

List ADRs:

```bash
ls docs/adr/ADR-*.md
```

For each recent ADR (last 30 days):

```bash
find docs/adr/ -name "ADR-*.md" -newer docs/core/90-FINAL-DESIGN-FREEZE.md
```

If newer ADRs exist → they may override freeze boundaries. Flag for review.

### 3. Schema vs docs (A2 vs A1)

Check combat schema matches hub:

```bash
grep -c "damage_dealt\|action_type\|margin_of_success" packages/contracts/schemas/combat.schema.json
```

Cross-reference with `docs/hubs/combat.md`:

```bash
grep -c "damage_dealt\|action_type\|margin_of_success" docs/hubs/combat.md
```

If schema has fields not documented in hub → drift.

### 4. Data vs contracts (A2 internal)

```bash
node -e "
const s = require('./packages/contracts/schemas/combat.schema.json');
const props = Object.keys(s.properties || s.definitions?.CombatAction?.properties || {});
console.log('Schema fields:', props.join(', '));
" 2>/dev/null
```

Compare with actual session event shape in `apps/backend/routes/session*.js`.

### 5. CLAUDE.md vs freeze (A4 vs A3)

Read CLAUDE.md pillar table. Compare status with freeze expectations.

- Freeze says pillar X is "complete" but CLAUDE.md says 🟡 → stale CLAUDE.md
- CLAUDE.md says 🟢 but freeze has open items → premature green

### 6. Produce report

```
## Authority Coherence Report

| Check | A-levels | Status | Detail |
|-------|----------|--------|--------|
| ADRs post-freeze | A1 vs A3 | 🟢/🟡 | N newer ADRs |
| Schema vs combat hub | A2 vs A1 | 🟢/🔴 | N undocumented fields |
| Data vs contracts | A2 internal | 🟢/🔴 | ... |
| CLAUDE.md vs freeze | A4 vs A3 | 🟢/🟡 | ... |
| Governance registry | A0 | 🟢/🔴 | N missing entries |

### Conflicts found
<list with [file:line] citations and which authority wins>
```

### 7. Resolution guidance

For each conflict, cite the rule:

- A1 > A3 for boundary definitions
- A2 > A3 for mechanical truth
- A3 > A5 for shipping scope
- In case of doubt → flag for Master DD decision
