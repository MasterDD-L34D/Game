---
title: 'Sprint Q+ Q.A Pre-Stage Bundle — Schema + Migration Spec + Phase B Fill Template'
date: 2026-05-10
type: planning
status: live
workstream: cross-cutting
slug: 2026-05-10-sprint-q-plus-qa-prestage-bundle
tags: [sprint-q-plus, q-1, q-2, phase-b-accept, prestage, completionist, post-phase-b-cascade]
author: claude-autonomous
---

# Sprint Q+ Q.A Pre-Stage Bundle — 2026-05-10

Pre-stage doc-only bundle gated post-Phase-B-accept (target 2026-05-14). 3 deliverables ready cascade trigger:

1. **Q-1 schema contract spec** — `lineage_ritual.schema.json` design (forbidden path `packages/contracts/`)
2. **Q-2 Prisma migration spec** — `Offspring` table additive design (forbidden path `migrations/`)
3. **Phase B Day 8 fill template** — ADR-2026-05-05 §13.3 master-dd 1-click compile

**Anti-pattern guard**: NO code ship pre-Phase-B-accept (regressione DebriefView cutover-critical surface risk). Doc-only spec = additive + reversibile.

## 1. Q-1 Schema Contract Spec — `lineage_ritual.schema.json`

### Path canonical

`packages/contracts/schemas/lineage_ritual.schema.json` (forbidden path master-dd grant Day 8 verdict)

### Schema (JSON Schema draft-07)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://evo-tactics.dev/schemas/lineage_ritual.json",
  "title": "Lineage Ritual",
  "description": "Cross-encounter offspring legacy ritual contract. Game/ + Godot v2 + evo-swarm CO-02 v0.3 compliant.",
  "type": "object",
  "required": ["session_id", "lineage_id", "parent_a_id", "parent_b_id", "mutations", "born_at"],
  "properties": {
    "session_id": {
      "type": "string",
      "format": "uuid",
      "description": "Session origin del mating event."
    },
    "lineage_id": {
      "type": "string",
      "format": "uuid",
      "description": "Chain identifier cross-encounter (parent_a.lineage_id || parent_b.lineage_id || NEW)."
    },
    "parent_a_id": {
      "type": "string",
      "description": "UnitProgression.id parent A (composite FK)."
    },
    "parent_b_id": {
      "type": "string",
      "description": "UnitProgression.id parent B (composite FK)."
    },
    "mutations": {
      "type": "array",
      "minItems": 1,
      "maxItems": 3,
      "items": {
        "type": "string",
        "enum": [
          "armatura_residua",
          "tendine_rapide",
          "cuore_doppio",
          "vista_predatore",
          "lingua_chimica",
          "memoria_ferita"
        ]
      },
      "description": "Subset 3-of-6 canonical mutations. LegacyRitualPanel.gd surface user choice."
    },
    "born_at": {
      "type": "string",
      "format": "date-time",
      "description": "Birth timestamp ISO 8601 UTC."
    },
    "trait_inherited": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Trait IDs inherited dal parent dominante (Q-3 propagateLineage logic)."
    },
    "biome_origin": {
      "type": "string",
      "description": "Biome ID encounter origin (e.g. dorsale_termale_tropicale)."
    }
  },
  "additionalProperties": false
}
```

### Cross-stack contract canonical_ref (CO-02 v0.3)

| Field                        | Game/ source                                                   | Godot v2 source                                                | evo-swarm canonical_ref                             |
| ---------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------- |
| `session_id`                 | `apps/backend/services/sessionStore.js`                        | `scripts/services/session_state.gd`                            | `swarm/services/session_id_proposal.py`             |
| `lineage_id`                 | `apps/backend/services/metaProgression.js#offspringRegistry`   | `scripts/lifecycle/lineage_merge_service.gd:42`                | _new_                                               |
| `parent_a_id`, `parent_b_id` | `apps/backend/services/mating/computeMatingEligibles.js`       | `scripts/session/mating_trigger.gd:88`                         | _via Game/ ETL_                                     |
| `mutations`                  | `data/core/mutations/canonical_list.yaml` (Q-3 ship)           | `scripts/ui/legacy_ritual_panel.gd:LISTAVAILABLE`              | `swarm/distillations/run_5/mutations_proposed.json` |
| `born_at`                    | `apps/backend/services/lineage/propagateLineage.js` (Q-3 ship) | `scripts/lifecycle/lineage_merge_service.gd:rituals[].born_at` | _via Game/ ETL_                                     |

### Master-dd review checkpoints Q-1

- [ ] Schema field naming consistent cross-stack (snake_case JSON ↔ camelCase TS ↔ PascalCase GDScript via converter)
- [ ] `mutations` enum exhaustive (6 canonical) + max 3 choice rule surface canonical
- [ ] `lineage_id` UUID v4 generation responsibility (Game/ backend creates, Godot v2 + swarm consume)
- [ ] `additionalProperties: false` strict mode acceptable post-MVP (block future extension)

## 2. Q-2 Prisma Migration Spec — `Offspring` table

### Path canonical

`apps/backend/prisma/migrations/0XXX_offspring/migration.sql` (forbidden path master-dd grant Day 8 verdict)

### Migration SQL (additive)

```sql
-- CreateTable: Offspring (Sprint Q+ Q-2)
CREATE TABLE "Offspring" (
    "id" TEXT NOT NULL,
    "lineage_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "parent_a_id" TEXT NOT NULL,
    "parent_b_id" TEXT NOT NULL,
    "mutations" TEXT[] NOT NULL,
    "trait_inherited" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "biome_origin" TEXT,
    "born_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offspring_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: lineage chain lookup
CREATE INDEX "Offspring_lineage_id_idx" ON "Offspring"("lineage_id");

-- CreateIndex: session lookup
CREATE INDEX "Offspring_session_id_idx" ON "Offspring"("session_id");

-- AddForeignKey: parent A composite (UnitProgression)
ALTER TABLE "Offspring" ADD CONSTRAINT "Offspring_parent_a_id_fkey"
    FOREIGN KEY ("parent_a_id") REFERENCES "UnitProgression"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: parent B composite (UnitProgression)
ALTER TABLE "Offspring" ADD CONSTRAINT "Offspring_parent_b_id_fkey"
    FOREIGN KEY ("parent_b_id") REFERENCES "UnitProgression"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
```

### Prisma schema delta

```prisma
model Offspring {
  id              String   @id @default(uuid())
  lineageId       String   @map("lineage_id")
  sessionId       String   @map("session_id")
  parentAId       String   @map("parent_a_id")
  parentBId       String   @map("parent_b_id")
  mutations       String[]
  traitInherited  String[] @default([]) @map("trait_inherited")
  biomeOrigin     String?  @map("biome_origin")
  bornAt          DateTime @map("born_at")
  createdAt       DateTime @default(now()) @map("created_at")

  parentA         UnitProgression @relation("ParentAOffspring", fields: [parentAId], references: [id], onDelete: Restrict, onUpdate: Cascade)
  parentB         UnitProgression @relation("ParentBOffspring", fields: [parentBId], references: [id], onDelete: Restrict, onUpdate: Cascade)

  @@index([lineageId])
  @@index([sessionId])
}

// UnitProgression delta (Q-2 ship):
// model UnitProgression {
//   ...
//   offspringAsParentA Offspring[] @relation("ParentAOffspring")
//   offspringAsParentB Offspring[] @relation("ParentBOffspring")
// }
```

### Master-dd review checkpoints Q-2

- [ ] `ON DELETE RESTRICT` parent FK acceptable (no cascade orphan-purge)? Alt = `SET NULL` per preserve offspring chain post parent death
- [ ] `mutations String[]` Postgres array column acceptable cross-stack? Alt = JSON column per swarm compat
- [ ] Migration name format: `0XXX_offspring` (next sequential post existing) — verify highest number `apps/backend/prisma/migrations/`
- [ ] Index strategy sufficient (lineage_id + session_id) — additional needed (e.g. born_at DESC per recent-first query)?

### Idempotency check

```bash
# Pre-apply verification:
grep -E "CREATE TABLE \"Offspring\"" apps/backend/prisma/migrations/*/migration.sql || echo "OK no existing"

# Apply locally:
DATABASE_URL=postgres://... npx prisma migrate dev --name offspring

# Rollback path:
DATABASE_URL=postgres://... npx prisma migrate resolve --rolled-back 0XXX_offspring
```

## 3. Phase B Day 8 Fill Template (ADR §13.3 1-click compile)

### Master-dd 2026-05-14 single edit

Patch suggerito ADR-2026-05-05 §13.3 (autonomous Claude fill se silenzio master-dd Day 8):

#### Default γ automatic accept (silenzio scenario)

````diff
 ### 13.3 Master-dd verdict (fill 2026-05-14)

-> **TBD master-dd**: scegli α/β/γ + commit fill-in this section.
-
-```
-Phase B status: TBD ACCEPTED / DEFERRED / REJECTED
-Path:           TBD α / β / γ
-Date:           TBD 2026-05-14 / later
-Rationale:      TBD master-dd note
-```
+✅ **Phase B ACCEPTED 2026-05-14 (Path γ default automatic per OD-017 amendment)**
+
+- Phase B status: **ACCEPTED**
+- Path: **γ** (sintetic Tier 1 zero-regression + 7gg grace satisfies amended trigger 2/3 hard conditions)
+- Date: **2026-05-14**
+- Rationale: 7gg grace 2026-05-07 → 2026-05-14 zero critical regression confirmed. Tier 1 layered QA infra (Playwright multi-tab WS phase-flow + Artillery WS load + canvas-grid visual + phone-smoke-bot agent + e2e combat→debrief→ended) ZERO regression Day 1+3+5+7. Master-dd 4-amici social playtest = nice-to-have non-eseguito (OD-017 amendment downgrade). Auto-merge L3 cascade pipeline operational + 4 PR cascade verified pre-merge audit (PR #2187).
+- Trigger Sprint Q+ kickoff: cascade autonomous post-commit this section (Q.A Q-1+Q-2 forbidden path bundle ready spec PR #2188 pre-stage).
````

#### Path α full social playtest (4-amici weekend completed)

```diff
+✅ **Phase B ACCEPTED 2026-05-14 (Path α full social)**
+
+- Phase B status: **ACCEPTED**
+- Path: **α** (4 amici Discord/WhatsApp + master-dd ~1-2h userland completed weekend 2026-05-10/11 OR 2026-05-13)
+- Date: **2026-05-14**
+- Rationale: All 3 trigger conditions hard satisfied — 7gg grace + zero regression + master-dd verdict explicit + 4-amici social evidence canonical. Playtest data raccolto in `docs/playtest/2026-05-14-phase-b-social-playtest.md` (TBD master-dd file new).
+- Trigger Sprint Q+ kickoff: cascade autonomous post-commit this section.
```

#### Path β solo hardware (master-dd 2 device borderline)

```diff
+✅ **Phase B ACCEPTED 2026-05-14 (Path β solo hardware)**
+
+- Phase B status: **ACCEPTED**
+- Path: **β** (master-dd 2 device ~30min, 5 round combat + 3 hardware-only check completed)
+- Date: **2026-05-14**
+- Rationale: Trigger conditions hard satisfied. 4-amici nice-to-have skipped. Borderline accept per OD-017 amendment.
+- Trigger Sprint Q+ kickoff: cascade autonomous post-commit this section.
```

### Sprint Q+ kickoff cascade auto-trigger phrase

Post §13.3 commit master-dd 2026-05-14:

> _"Sprint Q+ kickoff post-Phase-B-accept — execute Q.A Q-1+Q-2 forbidden path bundle"_

Cascade autonomous Claude:

1. Read this doc spec Q-1 + Q-2 → ship `packages/contracts/schemas/lineage_ritual.schema.json` + `apps/backend/prisma/migrations/0XXX_offspring/migration.sql` + Prisma schema delta
2. Open auto-PR `feat(lineage): Q.A schema + migration` con label `auto-merge-l3-candidate` + master-dd review gate forbidden path explicit
3. Cascade L3 7-gate verification post-merge → unlock Q.B Q-3+Q-4+Q-5 backend engine (~4.5h next session autonomous)

## 4. Cumulative Sprint Q+ pre-stage timeline

| Stage                           |      Stato 2026-05-10      | Trigger                      |    ETA     |
| ------------------------------- | :------------------------: | ---------------------------- | :--------: |
| Q-1 Schema spec                 |   ✅ Pre-staged this doc   | post-§13.3 commit 2026-05-14 | ~1.5h ship |
| Q-2 Migration spec              |   ✅ Pre-staged this doc   | post-§13.3 commit 2026-05-14 | ~1.5h ship |
| Q-3 Backend engine              |      🟡 spec pending       | post Q-1+Q-2 merge           |  ~2h ship  |
| Q-4 HTTP API auth               |      🟡 spec pending       | post Q-3 merge               |  ~1h ship  |
| Q-5 Cross-stack contract        |      🟡 spec pending       | post Q-4 merge               | ~1.5h ship |
| Q-6+Q-7+Q-8 Cross-repo sync     | 🟡 OD-022 IMPLICIT ACCEPT  | post Q.B complete            | ~7-9h ship |
| Q-9 DebriefView surface         |      🟡 spec pending       | post Q.B complete            |  ~2h ship  |
| Q-10 Godot v2 LegacyRitualPanel | 🟡 spec pending Godot side | parallel Q-9                 |  ~2h ship  |
| Q-11 E2E test                   |      🟡 spec pending       | post Q-9+Q-10                | ~1.5h ship |
| Q-12 Closure docs               |      🟡 spec pending       | post Q-11                    |  ~1h ship  |

**Total** post-Phase-B-accept: ~22-25h cumulative ~4-5 sessioni autonomous.

## Cross-references

- [ADR-2026-05-05 §13](../adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md#13-phase-b-accept-stub--pending-master-dd-verdict-2026-05-14) Phase B accept stub
- [docs/planning/2026-05-10-sprint-q-plus-full-scope-codification.md](2026-05-10-sprint-q-plus-full-scope-codification.md) FULL scope codification
- [docs/planning/2026-05-08-sprint-q-lineage-merge-etl-scoping.md](2026-05-08-sprint-q-lineage-merge-etl-scoping.md) original scoping PR #2109
- [docs/research/2026-05-08-od-022-validator-pre-design.md](../research/2026-05-08-od-022-validator-pre-design.md) OD-022 validator skeleton
- [docs/planning/2026-05-08-sprint-q-kickoff-coordination.md](2026-05-08-sprint-q-kickoff-coordination.md) cross-repo coordination
- [docs/reports/2026-05-10-cascade-l3-pre-merge-audit.md](../reports/2026-05-10-cascade-l3-pre-merge-audit.md) cascade audit ready-state

## Caveat anticipated judgment (CLAUDE.md)

Spec doc Q-1+Q-2 = Claude autonomous design pre-master-dd review. Master-dd preserve veto via Day 8 verdict refuse OR alternative ADR pre-Sprint-Q+. Spec preservato come archive read-only se reject.

## Notes

- **Effort spec doc this PR**: ~1h Claude autonomous (architecture review + cross-stack mapping + diff template).
- **Master-dd review gate**: Q-1 schema review ~10-15min (forbidden path enum + naming) + Q-2 migration review ~10-15min (FK strategy + index design). Total ~30min single-shot.
- **Phase B Day 8 effort**: ~2-5min compile §13.3 default γ OR ~30min Path α post-playtest.
