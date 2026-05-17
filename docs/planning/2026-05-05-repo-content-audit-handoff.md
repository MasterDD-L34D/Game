---
title: Repo content audit handoff — next session brief 2026-05-05
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-05
source_of_truth: false
language: it
review_cycle_days: 14
related:
  - docs/planning/2026-05-04-plan-v3-drift-sync-godot-realtime.md
  - docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md
  - docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md
  - docs/museum/MUSEUM.md
tags: [audit, repo-content, unused, stub, orphan, disconnected, handoff]
---

# Repo content audit handoff — next session 2026-05-05

> **Scope next session**: scan systematic Game/ + Game-Godot-v2 per identificare codice/dati **inutilizzato + disconnesso + stub vuoti** post-13 PR sessione 2026-05-05. Pre-cutover Fase 3 cleanup: prepare repo per Phase A trigger pulito.

## Obiettivo

Pre-cutover Phase A (ADR-2026-05-05) richiede repo coerente:

1. **No dead code** carry-over da pre-pivot Godot
2. **Stub registry trasparente** — quali stub valgono Tier 2/3 (port futuro) vs unused
3. **Engine LIVE Surface DEAD** — anti-pattern Gate 5 CLAUDE.md → ferma cutover se >5 voci active
4. **Ghost data**: YAML entries senza runtime consumer, asset non referenziati, doc con stale path

## Scope

### Game/ side audit targets

```
apps/backend/services/         # 30+ files — identify orphan services
apps/backend/routes/            # 20+ routes — verify each route consumed by FE
apps/play/src/                  # web v1 (will archive Phase B) — out of scope
data/core/traits/active_effects.yaml  # 458 entries — verify each consumed runtime
data/core/species.yaml          # 50+ species — verify spawn/biome refs
data/core/biomes.yaml           # biome registry — cross-ref encounters
packs/evo_tactics_pack/data/    # ecosystem pack — verify generator consumes
services/generation/            # Python orchestrator — verify worker pool live
services/rules/                 # ⚠️ DEPRECATED M6-#4 Phase 1 — confirm zero callers
prototypes/ermes_lab/           # ERMES isolated — verify prototype-only intent
```

### Game-Godot-v2 side audit targets

```
scripts/combat/                 # 15 full + 9 stubs — close-mark or port residual
scripts/combat/stubs/           # 9 stubs — Tier 2/3 priority list
scripts/ai/                     # 8 full + 4 stubs — same triage
scripts/ai/stubs/               # 4 stubs
scripts/lifecycle/              # mating + lineage — verify caller wire
scripts/services/               # telemetry + onset — narrow scope
scripts/phone/                  # post-#169 fix bundle — verify B5 phase chain
scripts/net/                    # WS + REST clients — verify all routes consumed
scenes/                         # Main.tscn + phone composer + character creation
assets/ui/ferrospora/           # UI Art Pass v1 — verify all PNG referenced .tscn
assets/legacy/                  # 47 PNG CC0 — verify all consumed
```

## Methodology

### Phase 1 — Static scan automated (~2h, agents)

**Spawn 3 agents parallel** (single message multiple Agent calls):

1. **`repo-archaeologist` excavate mode** — Game/ side
   - Excavate `services/rules/` deprecated (Phase 2 feature freeze + Phase 3 removal)
   - Excavate `apps/play/` legacy (pre-archive cleanup pass)
   - Excavate `incoming/` + `docs/incoming/` triage residuo
   - Output: museum cards score 1-5, focus card score ≥3 (re-revive candidate)

2. **`repo-archaeologist` excavate mode** — Game-Godot-v2 side
   - Excavate `scripts/combat/stubs/` 9 residui — Tier classification
   - Excavate `scripts/ai/stubs/` 4 residui
   - Excavate any `*.gd` con `is_implemented() = false` patterns
   - Output: stub registry priority + port effort estimate

3. **`balance-illuminator` audit mode** — cross-stack
   - Cross-ref `data/core/traits/active_effects.yaml` 458 entries vs runtime consumer
     (grep `apps/backend/services/traitEffects.js` + `Game-Godot-v2/scripts/combat/passive_status_applier.gd`)
   - Identify trait orphan (definito YAML, mai consumed runtime)
   - Identify trait runtime hardcoded (consumed runtime, mancante YAML)
   - Output: orphan list + hardcode list + delta % coverage

**Deliverable Phase 1**: `docs/reports/2026-05-XX-repo-audit-static-scan.md` con:

- Orphan code paths per repo (file count + LOC dead estimated)
- Stub registry tier matrix (Tier 1 critical port / Tier 2 nice-to-have / Tier 3 abandon)
- Engine LIVE Surface DEAD violations (Gate 5 anti-pattern)
- YAML data orphan/hardcoded list
- Asset references missing/unused

### Phase 2 — Live runtime probe (~1h)

Boot `deploy-quick.sh` shared mode (post Phase A pending):

1. **Endpoint probe**: `curl /api/<every-route>` → log 200/404/500
2. **Trait runtime trace**: enable verbose `[trait-effects]` log → log every trait fire in 10-round combat sample
3. **Service callers trace**: enable `[*]` debug log + grep service-name occurrences

**Deliverable Phase 2**: `docs/reports/2026-05-XX-repo-audit-live-runtime.md` con:

- Routes 404 = orphan (no FE consumer)
- Trait fire % coverage (X / 458 actually fired)
- Service callers count (services with 0 callers = candidate dead)

### Phase 3 — Triage decisions (~1h)

Per ogni voce identified:

| Categoria                    | Action                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------- |
| **Dead code zero callers**   | PR delete (con archive backup `docs/archive/historical-snapshots/`)           |
| **Stub Tier 1**              | Sprint future port (~Nh stimato)                                              |
| **Stub Tier 2**              | Defer + close museum card score 4 (re-revive opt)                             |
| **Stub Tier 3**              | Drop (museum card score 2 archive only)                                       |
| **Engine LIVE Surface DEAD** | PR surface wire OR explicit Gate 5 exemption (audit/telemetry justification)  |
| **YAML orphan**              | Either consumer impl OR drop entry                                            |
| **Hardcoded runtime**        | Move to YAML (data-driven) OR doc explicit "code-canonical, YAML mirror only" |
| **Asset unused**             | PR delete from repo, preserve in `~/Documents/evo-tactics-refs/` workspace    |

**Deliverable Phase 3**: 1-3 PR triage:

- PR cleanup-1: dead code delete (Game/ + Godot v2)
- PR cleanup-2: stub registry rationalization (museum cards + DEPRECATED.md updates)
- PR cleanup-3: Engine LIVE Surface DEAD violation closures (surface wire OR Gate 5 exemption ADR)

## Esistenti riferimenti

### Audit precedenti

- [`docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md`](../reports/2026-04-27-stato-arte-completo-vertical-slice.md) — §C.2 Engine LIVE Surface DEAD analysis (8/8 chiusi 2026-04-27)
- [`docs/research/2026-04-26-cross-game-extraction-MASTER.md`](../research/2026-04-26-cross-game-extraction-MASTER.md) §4 — anti-pattern dominance
- [`docs/research/2026-04-26-agent-integration-plan-DETAILED.md`](../research/2026-04-26-agent-integration-plan-DETAILED.md) §4 — agent tooling per audit

### Stub registries esistenti

- Game-Godot-v2 [`docs/godot-v2/deferred-roadmap.md`](https://github.com/MasterDD-L34D/Game-Godot-v2/blob/main/docs/godot-v2/deferred-roadmap.md) — 9 combat stubs + 4 AI stubs Tier 2/3 priority + blocker
- Game/ [`services/rules/DEPRECATED.md`](../../services/rules/DEPRECATED.md) — Python rules engine Phase 2 freeze (M6-#4)

### Museum cards index

- [`docs/museum/MUSEUM.md`](../museum/MUSEUM.md) — 11 cards curated (5 score 5/5 + 6 score 4/5) — domain coverage 8/8 (100%)
- Lifecycle: `excavated → curated → reviewed → revived | rejected`
- **Solo `repo-archaeologist` scrive cards. Tutti agent leggono per cross-check pre research.**

### Anti-pattern guards

- **Gate 5** CLAUDE.md "Engine LIVE Surface DEAD KILLER": ogni nuovo engine/service backend DEVE avere wire frontend prima di production-ready. Surface = UI overlay / HUD widget / debrief field / log line / CLI output / debug endpoint.
- **Gate 5 exemptions**: audit/telemetry internal (log developer surface), refactor cleanup, schema migration, methodology tooling.

## Out of scope

- Web v1 `apps/play/` deep audit — out of scope (Phase B archive cleanup separate)
- Asset workspace `~/Documents/evo-tactics-refs/` audit — separate doc 184GB recipes
- ERMES bridge `prototypes/ermes_lab/` — isolated, no cross-stack impact
- Backend `apps/backend/data/` mock fixtures — preserve hand-curated (PR #1343 era)

## Pre-conditions next session

- [x] Phone smoke runtime 2026-05-05 → 5-bug fix bundle shipped (PR #2053 + Game-Godot-v2 #169)
- [x] CLAUDE.md cross-repo sprint context sync 2026-05-05 (PR #2054 + #170)
- [x] ADR-2026-05-05 cutover Fase 3 formal PROPOSED (PR #2055)
- [x] Drift sync 2026-05-04 close-marks Items 1+2+10+Ennea (PR #2051+#2052)
- [ ] Master-dd phone smoke retry verdict (pending — does NOT block this audit, but inform Phase A timeline)

## Effort stimato

- **Phase 1 static scan**: ~2h autonomous (3 agent parallel)
- **Phase 2 live runtime probe**: ~1h autonomous (deploy-quick.sh boot + curl probe + trait log analysis)
- **Phase 3 triage decisions**: ~1h master-dd verdict + 1-3 cleanup PR

**Total**: ~4-5h autonomous + ~1h master-dd verdict.

## Resume trigger phrase next session

> _"resume repo content audit 2026-05-XX, esegui Phase 1 static scan 3 agent parallel su Game/ + Game-Godot-v2, audit stub registry + Engine LIVE Surface DEAD + YAML orphan"_

OR

> _"leggi docs/planning/2026-05-05-repo-content-audit-handoff.md, esegui Phase 1+2+3 sequenziale, ship cleanup PR"_

## Action items concrete entry-point next session

```bash
cd /c/Users/VGit/Desktop/Game
# Phase 1 — spawn 3 agent parallel single message:
#   - Agent repo-archaeologist excavate Game/
#   - Agent repo-archaeologist excavate Game-Godot-v2
#   - Agent balance-illuminator audit cross-stack
# Phase 2 — boot deploy-quick + curl probe routes + trait fire log
# Phase 3 — triage matrix + 1-3 cleanup PR
```

## Dependencies

- Drift sync 2026-05-04 stato 2026-05-05 (post-close-marks)
- ADR-2026-05-05 PROPOSED (cutover criteria)
- CLAUDE.md sprint context 2026-05-05 (post-sync)
- Memory file `~/.claude/projects/.../memory/project_phone_smoke_session_2026_05_05.md`

## Output expected

3 deliverable docs + 1-3 cleanup PR:

1. `docs/reports/2026-05-XX-repo-audit-static-scan.md` (Phase 1 report)
2. `docs/reports/2026-05-XX-repo-audit-live-runtime.md` (Phase 2 report)
3. `docs/reports/2026-05-XX-repo-audit-triage-matrix.md` (Phase 3 decision matrix)
4. PR cleanup-1+2+3 (dead code + stub registry + Gate 5 violations)

Pre-cutover Phase A repo state: **lean + intentional + zero ghost** ✅.
