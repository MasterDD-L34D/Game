---
title: 'ADR 2026-04-21 — Campaign save persistence + branching + encounter unlock'
doc_status: active
doc_owner: master-dd
workstream: backend
last_verified: '2026-04-21'
source_of_truth: true
language: it
review_cycle_days: 30
related:
  - docs/core/40-ROADMAP.md
  - docs/core/15-LEVEL_DESIGN.md
  - docs/planning/2026-04-20-p0-batched-decisions.md
  - docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md
---

# ADR-2026-04-21 · Campaign save persistence + branching + encounter unlock

**Stato**: 🟢 ACCEPTED (user approval 2026-04-20 via batch P0 Q46+Q47+Q50 default)
**Trigger**: 4-agent design audit (2026-04-20) rivela Campaign structure = ZERO doc + ZERO impl (P0 absolute). M10-M11 blocked senza save + branching + unlock model.

## Decisione sintetica

1. **Save storage**: **SQLite locale** (Q46 default A)
2. **Branching**: **Lineare + 1-2 scelte binarie per atto (Descent pattern)** (Q47 default B)
3. **Encounter unlock**: **Sequenziale rigido post-tutorial** (Q50 default A)

## Contesto

Post Pilastri audit + 4-agent design audit, Campaign system emerge come unica feature canonical con **0 doc + 0 impl**. Nessun ADR precedente, nessun file campaign in `apps/backend/routes/`, NeDB sessione ephemeral post-restart.

Strategia M9-M11 (docs/planning/2026-04-20-strategy-m9-m11-evidence-based.md):

- M10 include "P2 PI pack runtime + P3 full progression" → richiede **persistence cross-session**
- M11 Jackbox co-op TV → richiede **save model compatibile multi-client**

## Q46 — Save storage

### Scelta: SQLite locale

**Rationale**:

- Zero-server-dependency = demo ngrok compatibile + offline play
- Prisma ORM supporta SQLite adapter trivial swap (future Postgres upgrade)
- Single-player friendly (coerente Pilastro 5 "TV condivisa" = 1 host, multi-client)
- Cloud sync deferred post-MVP (no auth needed MVP)

**Alternatives rejected**:

- **Postgres/Prisma**: overhead setup + auth + multi-device (non MVP need)
- **JSON flat**: no schema enforcement, migration nightmare, query inefficiency

**Schema location**: `apps/backend/prisma/schema.prisma` estensione + migration SQLite-compatible.

### Schema proposto

```prisma
// apps/backend/prisma/schema.prisma (estensione)
datasource db {
  provider = "sqlite"
  url      = "file:./data/idea_engine.db"
}

model Campaign {
  id              String   @id @default(uuid())
  player_id       String
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  current_chapter Int      @default(1)
  current_act     Int      @default(1)
  branch_choices  String   // JSON array of binary choices taken
  completion_pct  Float    @default(0.0)
  final_state     String?  // 'completed' | 'abandoned' | null (in progress)
  chapters        Chapter[]
  party           PartyRoster[]
}

model Chapter {
  id          String   @id @default(uuid())
  campaign_id String
  campaign    Campaign @relation(fields: [campaign_id], references: [id])
  chapter_idx Int      // 1..N (sequential unlock)
  act_idx     Int      // 1..3 (3 atti canonical)
  encounter_id String   // refs encounter YAML
  outcome     String?  // 'victory' | 'defeat' | 'timeout' | null
  pe_earned   Int      @default(0)
  pi_earned   Int      @default(0)
  completed_at DateTime?
  branch_chosen String? // scelta binaria Descent-pattern
}

model PartyRoster {
  id          String   @id @default(uuid())
  campaign_id String
  campaign    Campaign @relation(fields: [campaign_id], references: [id])
  unit_id     String   // PG identifier
  species     String
  job         String
  tier        String   @default("base") // base/veteran/elite (mythic post-MVP Q58)
  hp_base     Int
  traits      String   // JSON array trait IDs
  acquired_traits String // JSON array (PI pack runtime)
  xp_total    Int      @default(0)
  level       Int      @default(1)
}

model SaveSnapshot {
  id          String   @id @default(uuid())
  campaign_id String
  session_id  String?  // optional: active session during save
  save_type   String   // 'auto' | 'manual' | 'checkpoint'
  snapshot_data String // JSON full state
  created_at  DateTime @default(now())
}
```

## Q47 — Branching: Descent pattern (1-2 scelte binarie per atto)

### Scelta: Lineare + binary choices

**Rationale**:

- Low design complexity (3 atti × 2 scelte = 6 authored paths)
- High player agency (choice matters, ma DAG evitato)
- Narrative effort manageable (12 variants max per choice, non esponenziale)
- Descent board game shipped successo con pattern (proven)

**Alternatives rejected**:

- **0 scelte lineare (Wesnoth)**: zero player agency → "just click next"
- **Full DAG (Into the Breach)**: content budget esplode, no MVP viable

### Branching schema

Per atto, 1-2 binary choices:

- **Atto 1** (Tutorial → Esplorazione): 1 choice "follow leader trail" vs "investigate ruin"
- **Atto 2** (Esplorazione → Confronto): 2 choices "ally faction A" vs "faction B" + "stealth path" vs "direct assault"
- **Atto 3** (Endgame): 1 choice "rescue survivor" vs "destroy source" (ending flavor)

Branching metadata in `data/core/campaign_tree.yaml`:

```yaml
campaign_id: default_campaign_mvp
acts:
  - act_idx: 1
    encounters: [enc_tutorial_01, enc_tutorial_02, enc_tutorial_03]
    choice_node:
      description: 'Il Leader ha lasciato tracce...'
      option_a: { label: 'Segui tracce', next_act: 2, branch_key: 'leader_trail' }
      option_b: { label: 'Investiga rovina', next_act: 2, branch_key: 'ruin_investigate' }
  - act_idx: 2
    encounters_by_branch:
      leader_trail: [enc_savana_01, enc_caverna_02]
      ruin_investigate: [enc_frattura_03, enc_capture_01]
    # ...
```

## Q50 — Encounter unlock: sequenziale rigido

### Scelta: Sequential lock post-tutorial

**Rationale**:

- MVP scope: player non deve fare choice encounter fuori branching Q47
- Tutorial 01-05 sbloccato sequenziale (già impl)
- Post-tutorial: encounter determinato da `campaign.current_chapter + branch_chosen`
- Simple UX: "next mission" button vs map navigation

**Alternatives rejected**:

- **Open-world** (Q50 B): richiede encounter balancing indipendente + UX map navigation (M12+)
- **Hub centrale** (Q50 C): sandbox-ish, richiede level design 3-5 encounter/bioma × 7 biomi = 21-35 encounter (overscope MVP)

### Unlock flow

```
[Campaign start]
  ↓
Chapter 1 (Atto 1): enc_tutorial_01 → _02 → _03 → [choice Act1]
  ↓ (branch chosen)
Chapter 2+ (Atto 2): encounter sequence per branch
  ↓
[Choice Act2]
  ↓
Chapter 6+ (Atto 3): boss encounter sequence
  ↓
[Choice Act3 = ending variant]
  ↓
[Campaign completed]
```

## Conseguenze

### Positive

- Save schema Prisma SQLite = future Postgres migration easy
- Branching bounded (6 paths) = content budget MVP feasible
- Sequenziale unlock = UX simple, no campaign map UI M10
- Compatibile M11 Jackbox co-op TV (host = save owner, client joint state)

### Negative

- Replay value limitato (6 paths total, 3-4 playthrough = completionist done)
- No open-world freedom (deferred M12+)
- Single-player save = co-op TV richiede host=owner model (NON cloud sync)

### Rollback

- SQLite easy swap JSON file-based (dev fallback)
- Branching → lineare flat: delete campaign_tree.yaml branch nodes, flatten encounters
- Sequential unlock → open: feature flag in lobby UI

## Implementation plan M10

**Phase A** (2h): Prisma schema migration + seed default_campaign_mvp YAML
**Phase B** (4h): `apps/backend/routes/campaign.js` endpoints (/start, /state, /advance, /choose, /end)
**Phase C** (3h): `apps/backend/services/campaign/campaignEngine.js` branching logic + encounter unlock
**Phase D** (3h): `apps/play/src/campaignPanel.js` UI chapter progress + choice node modal
**Phase E** (2h): Tests + integration

**Totale M10 P2-extended**: ~14h. Incorporato in sprint M10 roadmap.

## Open questions deferred

- Cloud sync (Q46 B future upgrade): M12+ decision
- Branch depth >2 per atto: post-MVP content expansion
- Multi-save slot limit: default 5 slot, configurabile M12+

## Autori

- Master DD (P0 Q batch response default 2026-04-20)
- Claude Opus 4.7 (ADR draft + schema proposal)
- Flint advisor (kill-60 enforcement on ceremony loop, forced P0 batch)
