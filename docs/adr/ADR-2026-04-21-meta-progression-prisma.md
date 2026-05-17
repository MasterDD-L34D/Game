---
title: 'ADR 2026-04-21 — Meta progression Prisma persistence (Prompt B / L06 partial)'
doc_status: active
doc_owner: master-dd
workstream: backend
last_verified: '2026-04-21'
source_of_truth: true
language: it
review_cycle_days: 30
related:
  - docs/adr/ADR-2026-04-21-campaign-save-persistence.md
  - docs/planning/2026-04-20-integrated-design-map.md
  - docs/planning/2026-04-21-next-session-kickoff.md
  - apps/backend/prisma/schema.prisma
  - apps/backend/services/metaProgression.js
  - apps/backend/routes/meta.js
---

# ADR-2026-04-21 · Meta progression Prisma persistence

**Stato**: 🟢 ACCEPTED (2026-04-21, Prompt B closure)
**Trigger**: L06 parziale dal kickoff doc — metaProgression in-memory `Map` non sopravvive al restart del processo. Blocca progressione cross-session + M10 campaign.

## Decisione sintetica

1. **Schema**: 5 nuovi model Prisma (`NpcRelation`, `AffinityLog`, `TrustLog`, `NestState`, `MatingEvent`) in `apps/backend/prisma/schema.prisma`.
2. **Provider**: **KEEP `postgresql`** (override ADR-2026-04-21 `campaign-save-persistence` SQLite default).
3. **Adapter pattern**: `createMetaStore({ prisma, campaignId })` async; fallback in-memory quando Prisma client stub (no `DATABASE_URL`).
4. **API shape**: invariata — 7 endpoint `/api/(v1/)meta/*` già in produzione, zero breaking change.

## Contesto

`apps/backend/services/metaProgression.js` (194 LOC, 11 funzioni) gestiva affinity/trust/nest/mating via `Map` in-memory. Due problemi:

- **Persistence zero**: restart backend → NPC relations azzerate. Blocca campaign cross-session (P2 Pilastro audit 2026-04-20 🟡).
- **Alias divergent state (latent bug)**: `pluginLoader.js` registrava `createMetaRouter()` due volte (`/api/v1/meta` + `/api/meta`) → due `Map` separate, stessi NPC con stato diverso per client a seconda dell'alias chiamato. Adapter fix questo by design (store condiviso via DI).

Kickoff doc prereq (37/37 baseline test + `metaProgression.js` 194 LOC + 7 route) verificati prima di iniziare. PR #1678 (trait env costs) già merged su main; branch `feat/meta-prisma-persistence` partito da `origin/main` post-merge.

## Q1 — Provider: swap SQLite o keep postgresql?

### Scelta: KEEP postgresql

**Motivo override ADR-04-21**:

- Migration `0001_init` già shipped postgresql (`apps/backend/prisma/migrations/0001_init/migration.sql` usa `SERIAL`, `TEXT[]`, `ARRAY[]::TEXT[]` → non portabili SQLite senza refactor).
- `migration_lock.toml` locked a `postgresql`.
- `docker compose up` bootstrappa Postgres auto.
- M10 Campaign/Chapter/PartyRoster/SaveSnapshot (ADR-04-21) già **postgresql** in `schema.prisma` (line 8 `provider = "postgresql"`, 4 model M10 shipped). Swap breakerebbe M10.
- Adapter in-memory fallback copre dev/demo (ngrok) senza Postgres.

**Cost swap SQLite** (rejected):

- Rewrite migration 0001 (rimuovere `SERIAL` + `TEXT[]`) ~2h.
- Rewrite 4 model M10 (SQLite non supporta array nativi, JSON-only string) ~1h.
- Rewrite docker-compose + CI harness ~1h.
- Regression risk test campaign/ideas esistenti.
- **Totale ~4-5h solo per downgrade infra funzionante**.

**Deferred**: swap a SQLite quando/se M11 Jackbox multi-client richiede file locale per partita non condivisa. A quel punto serve multi-provider Prisma o reinstradamento via adapter pattern (già presente). ADR aggiornata in quel momento.

## Q2 — Schema: 5 nuovi model

### NpcRelation

```prisma
model NpcRelation {
  id              String   @id @default(uuid())
  campaignId      String?  // null = legacy global (retro-compat)
  npcId           String
  affinity        Int      @default(0)  // -2..+2 app-level
  trust           Int      @default(0)  // 0..5 app-level
  recruited       Boolean  @default(false)
  mated           Boolean  @default(false)
  matingCooldown  Int      @default(0)
  mbtiType        String?
  traitIds        String   @default("[]")  // JSON array
  @@unique([campaignId, npcId])
}
```

- **Unique composite**: `(campaignId, npcId)` → stesso npcId in campaign diverse = record separati.
- **`campaignId` nullable**: legacy in-memory behavior senza campaign (test + MVP) continua a funzionare con `campaignId = null`.
- **Range enforcement app-level** (`clamp`): Prisma `Int` è signed 32-bit; enforcement `-2..+2` / `0..5` resta in `metaProgression.js` come prima.

### AffinityLog / TrustLog

Audit trail delta: `{ relationId, delta, before, after, reason?, createdAt }`. Cascade-delete su `NpcRelation`. Serve a debug + analytics future (heat map di choice branching).

### NestState

```prisma
model NestState {
  id                String   @id @default(uuid())
  campaignId        String?  @unique
  level             Int      @default(0)
  biome             String?
  requirementsMet   Boolean  @default(false)
}
```

- **`campaignId @unique`**: un nest per campaign (null = nest globale legacy). Attuale codice aveva `nest` come singleton nel tracker → mapping 1:1.

### MatingEvent

Storia rolls: `{ relationId, success, roll, modifier, total, threshold, offspringTraits, seedGenerated, reason?, createdAt }`. Append-only; serve a debug + a feedback loop del design (check empirico RNG fairness).

## Q3 — Adapter pattern

### Scelta: dual export `createMetaTracker` (sync) + `createMetaStore` (async)

- **`createMetaTracker()`** sync in-memory — invariato. Backward-compat per i 37 baseline test in `tests/ai/metaProgression.test.js` (Node test runner, no async).
- **`createMetaStore({ prisma, campaignId })`** async — API identica a tracker ma `Promise`. Rileva stub Prisma via `prismaSupportsMeta(prisma)` (check `prisma.npcRelation.findUnique` presente) → se stub, delega al tracker in-memory. Quando Prisma client reale disponibile (`DATABASE_URL` set + `prisma generate` eseguito), scrive su DB.
- **Logic mating roll condivisa** via `computeMatingRoll()` pure function → entrambi i paths producono output identici a parità di `rng`.

### Injection

`createMetaRouter({ store })` accetta store pre-built. `pluginLoader.metaPlugin` ora costruisce **1** store e lo inietta in **entrambi** i mount (`/api/v1/meta` + `/api/meta`) → fix latent bug divergent Map.

### Mode flag

`store._mode` = `'prisma' | 'in-memory'` (introspezione per test + logging).

## Contract API (invariato)

| Method | Path                        | Body                          | Response                                           |
| ------ | --------------------------- | ----------------------------- | -------------------------------------------------- |
| GET    | `/api/(v1/)meta/npg`        | —                             | `{ npcs: [...], nest: {...} }`                     |
| POST   | `/api/(v1/)meta/affinity`   | `{ npc_id, delta }`           | `{ npc, can_recruit }`                             |
| POST   | `/api/(v1/)meta/trust`      | `{ npc_id, delta }`           | `{ npc, can_recruit, can_mate }`                   |
| POST   | `/api/(v1/)meta/recruit`    | `{ npc_id }`                  | `{ success, npc? }` o `{ success: false, reason }` |
| POST   | `/api/(v1/)meta/mating`     | `{ npc_id, party_member }`    | roll result + `offspring_traits` su success        |
| GET    | `/api/(v1/)meta/nest`       | —                             | `{ level, biome, requirements_met }`               |
| POST   | `/api/(v1/)meta/nest/setup` | `{ biome, requirements_met }` | nest shape                                         |

## Test coverage

- **Baseline 37/37 verdi** post-refactor: `tests/ai/metaProgression.test.js` (createMetaTracker sync path invariato).
- **Nuovi 7 contract test** in `tests/api/metaRoutes.test.js`:
  - `GET /npg` shape
  - `POST /affinity` update + 400 missing body
  - `POST /recruit` gate denied → success post trust bump
  - `POST /nest/setup` + `GET /nest` roundtrip
  - `POST /mating` 400 missing party_member
  - Adapter `_mode === 'in-memory'` quando Prisma stub
- Full AI suite: 307/307 verdi, zero regression.

## Migration workflow

1. `apps/backend/prisma/migrations/0002_meta_progression/migration.sql` — CREATE TABLE + INDEX + FK per 5 tabelle.
2. Deploy: `npm run db:migrate` o `prisma migrate deploy` (Docker auto via bootstrap marker).
3. **Dev demo**: senza `DATABASE_URL`, adapter usa tracker in-memory → nessun setup DB richiesto per prototipo.

## Out of scope

Non implementato in questo PR (task successivi dedicati):

- **PI pack spender runtime** → ADR dedicata M10.
- **UI Nido panel** → M11-adjacent, richiede mission console build (non in questo repo).
- **Cross-session Prisma seed automatic** → manual seed OK MVP (`prisma db seed`).
- **Migration backfill di state in-memory esistente** → nessuno stato da migrare (nessun deploy con NPC recruited in-memory prima di L06 closure).

## Conseguenze

### Positive

- L06 parziale chiuso → P2 Pilastro audit unlocked parzialmente (persistence cross-session sbloccata).
- Audit trail (AffinityLog/TrustLog/MatingEvent) abilita analytics future senza rework.
- Latent bug divergent alias Map fix.
- `createMetaStore` riutilizzabile in campaign engine (M10) per scope per-campaign.

### Negative

- **Schema drift doc/ADR-04-21**: decisione SQLite lì non onorata qui. Rationale documentata (§Q1). ADR-04-21 stessa conferma "Prisma ORM supporta SQLite adapter trivial swap (future Postgres upgrade)" — mantenere postgres è quindi coerente con il trajectory declared, non regressione.
- **Test coverage Prisma-path non eseguito in CI** (no Postgres in test env). Coverage Prisma-path è code-path review + local smoke test + future integration suite quando docker compose CI verde.

## Rollback plan

1. Revert PR (branch `feat/meta-prisma-persistence`).
2. `prisma migrate resolve --rolled-back 0002_meta_progression` in Postgres prod (solo se migrate già deployed).
3. `DROP TABLE` per 5 tabelle nuove (schema additive, no alter di tabelle esistenti → rollback sicuro).
4. Baseline 37/37 test garantisce tracker sync resta funzionante post-revert (createMetaTracker esportato + chiamato invariato).

## Follow-up ticket

- **TKT-META-01**: wire `campaignId` da session engine (`/api/session/start`) a `createMetaStore({ campaignId })`. Oggi tutti gli endpoint usano `campaignId = null` (legacy global). M10 campaign engine dovrà passare il vero `campaignId` attivo.
- **TKT-META-02**: Prisma integration test in CI. Richiede docker-compose CI + `prisma migrate deploy` step.
- **TKT-META-03**: API scope `GET /api/meta/npg?campaign_id=X` per query per-campaign (oggi elenca solo scope attivo store).
- **TKT-META-04**: seed NPC data-driven da `packs/evo_tactics_pack/data/mating.yaml` o `data/core/npcs.yaml` (non esistente ancora — TBD).
