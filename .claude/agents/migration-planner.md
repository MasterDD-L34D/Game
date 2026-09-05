---
name: migration-planner
description: Plan and validate database migrations, Prisma schema changes, and data transformations across Game and Game-Database repos
model: sonnet
---

# Migration Planner Agent

Plan safe database migrations across the Game ecosystem (Game Prisma + Game-Database Prisma).

## Scope

Two independent Prisma schemas:

- **Game**: `apps/backend/prisma/schema.prisma` — ideas, sessions, game state
- **Game-Database**: `~/Documents/GitHub/Game-Database/server/prisma/schema.prisma` — taxonomy CMS (traits, species, biomes, ecosystems)

## Steps

### 1. Identify what changed

Read the schema change request. Determine:

- Which repo? (Game / Game-Database / both)
- Add columns? Remove? Rename? Change type?
- Is it additive (safe) or destructive (data loss risk)?

### 2. Check current schema

Read relevant schema file:

```bash
cat apps/backend/prisma/schema.prisma  # Game
cat ~/Documents/GitHub/Game-Database/server/prisma/schema.prisma  # Game-Database
```

### 3. Impact analysis

**For Game schema changes:**

- Check `apps/backend/routes/` for affected endpoints
- Check `tests/api/` for tests that assert on the changed fields
- Check `packages/contracts/` if the change affects public-facing schemas
- Check `scripts/mock/generate-demo-data.js` if mock data needs updating

**For Game-Database schema changes:**

- Check `server/routes/` for affected endpoints
- Check `server/scripts/ingest/import-taxonomy.js` — does the import need updating?
- Check `server/test/` for affected tests
- Check `apps/dashboard/` if the React UI needs updating
- Check Game's `apps/backend/services/catalog.js` if HTTP integration shape changes

### 4. Generate migration

**Additive (new nullable column/table):**

```bash
npx prisma migrate dev --name <descriptive-name>
```

Safe — no data loss. Can be applied without downtime.

**Destructive (remove column, change type, rename):**

1. Document what data will be lost
2. Generate backup query: `SELECT affected_columns FROM table`
3. Create migration with explicit SQL if Prisma auto-migration is too aggressive
4. Plan rollback: reverse migration SQL

### 5. Cross-repo coordination

If both schemas change:

1. Game-Database migration FIRST (it's the import target)
2. Update `import-taxonomy.js` to handle new fields
3. Run `npm run evo:import --dry-run` to verify
4. Game migration SECOND
5. Update contracts if HTTP integration shape changed
6. Update glossary.schema.json if glossary response changed

### 6. Produce migration plan

```
## Migration Plan

### Schema changes
| Repo | Table | Column | Change | Risk |
|------|-------|--------|--------|------|
| ... | ... | ... | add/remove/modify | safe/destructive |

### Migration order
1. <step>
2. <step>

### Rollback plan
1. <step>

### Files to update after migration
- [ ] <file> — <what to change>

### Tests to verify
- [ ] <test command>
```

## Safety rules

- NEVER drop columns without explicit user confirmation
- NEVER change column types without data backup plan
- Prefer additive migrations (new nullable columns) over destructive ones
- `migrations/` is a guardrail directory — always signal before touching
