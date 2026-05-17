---
title: 'ADR-2026-05-04: Cutover Godot v2 decision gate — criteria + web v1 archive plan'
doc_status: superseded
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-05
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md
  - docs/planning/2026-05-04-plan-v3-drift-sync-godot-realtime.md
  - docs/planning/2026-04-29-master-execution-plan-v3.md
  - docs/adr/ADR-2026-04-29-pivot-godot-immediate.md
  - docs/adr/ADR-2026-05-04-ennea-taxonomy-canonical.md
  - docs/planning/2026-04-29-sprint-n7-failure-model-parity-spec.md
---

> **SUPERSEDED 2026-05-05** by [`ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md`](ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md). Quel doc collapsa criteri (questo ADR) + decisione formale Scenario 3 STAGED canary + Phase A/B trigger conditions + rollback plan in single canonical ADR. Mantenere questo doc per provenance criteria origin.

# ADR-2026-05-04: Cutover Godot v2 decision gate

- **Data**: 2026-05-04
- **Stato**: **SUPERSEDED — see ADR-2026-05-05 formal**
- **Owner**: Master DD
- **Stakeholder**: Tutti workstream + master-dd manual ops

## 1. Contesto

Plan v3 §"Fase 3 cutover ~4-8 sett" prevede full session engine port + co-op WS Godot HTML5 + cutover Godot v2 OR archive R&D web v1 final.

Drift sync 2026-05-04 ([plan-v3-drift-sync](../planning/2026-05-04-plan-v3-drift-sync-godot-realtime.md)) ha identificato:

- ✅ **Godot OVERSHOT plan v3 expectation in 5-6 giorni** (vs 6-8 sett Fase 2 estimate)
- ✅ Sprint M-N-O-P-Q-R-W7 ALL closed Godot side
- ✅ Co-op WS multiplayer COMPLETE (Sprint R + W4-W6 phone composer)
- ✅ Caller-wire pipeline LIVE end-to-end W7.x (2/4 adapter)
- ✅ Cross-repo sync: 6/6 endpoints LIVE, 0 schema drift contract level
- 🟡 **2 verifiche parity revisited PARTIAL** (M.7 + N.7) — gating
- ❌ **NEW drift discovered**: Ennea taxonomy schema mismatch 9 vs 6 — gating
- ❌ Master-dd manual ops (phone smoke test) pending
- ❌ Skiv asset Path 3 portrait + lifecycle stages NON shipped

**Decisione richiesta**: quando triggerare formal cutover ADR ACCEPTED + web v1 archive?

## 2. Pre-conditions cutover gate

### 2.1 Critical path MANDATORY (gate non passabile senza ALL ✅)

| #   | Pre-condition                                  | Stato attuale |  Effort residual   | Owner                |
| --- | ---------------------------------------------- | :-----------: | :----------------: | -------------------- |
| C1  | N.7 failure-model parity 5/5 close             |    🟡 3/5     |   ~14-16h Godot    | gameplay-programmer  |
| C2  | M.7 DioField p95 timing instrumentation + test |  🟡 PARTIAL   |    ~4-6h Godot     | gameplay-programmer  |
| C3  | Phone composer real-device smoke 2-device      |  ❌ pending   |   ~2-4h userland   | **MASTER-DD MANUAL** |
| C4  | Ennea taxonomy ADR Accepted + impl close       |   🟡 DRAFT    | ~3-5h post-verdict | master-dd verdict    |
| C5  | Cross-repo sync regression test pass           |    ✅ LIVE    |         0          | gameplay-programmer  |
| C6  | Godot GUT baseline ≥1500 asserts pass          | 🟡 1488 (97%) |       ~minor       | dev                  |

**Critical path totale**: ~24-31h dev/userland post master-dd verdict Item C4.

### 2.2 Soft criteria DESIDERATA (gate passabile senza ma raccomandato)

| #   | Soft criteria                                      |    Stato    |       Effort       | Note                      |
| --- | -------------------------------------------------- | :---------: | :----------------: | ------------------------- |
| S1  | Skiv asset Path 3 portrait + lifecycle stages      |     ❌      |   ~6-9h userland   | Recap-card visual quality |
| S2  | Character creation TV scene Bible §0               |     ❌      |    ~6-10h Godot    | Full vertical slice       |
| S3  | Beehave A.2 role overlays + registry               | 🟡 A.1 OPEN |    ~6-8h Godot     | AI behavior richness      |
| S4  | 2 deferred adapter emitter wire (forecast/overlay) | 🟡 deferred |    ~3-5h Godot     | UX polish                 |
| S5  | Sprint I playtest userland 2-3 device              |     ❌      | ~1-2 sett userland | Demo readiness            |

**Soft criteria totale**: ~22-39h dev + 1-2 sett userland.

### 2.3 Post-cutover deferred (non gating)

| #   | Item                       |    Stato     | Note                          |
| --- | -------------------------- | :----------: | ----------------------------- |
| D1  | ERMES E7-E8 runtime bridge | ⏸ deferred  | Plan v3 explicit "non gating" |
| D2  | Web v1 archive cleanup     | post-cutover | Solo dopo cutover Accepted    |

## 3. Decision matrix scenarios

### Scenario 1 — Cutover MINIMAL gate (only critical path)

- Trigger: C1+C2+C3+C4+C5+C6 ✅
- Effort: ~24-31h
- Demo readiness: vertical slice tactical funzionante, NO Skiv signature visual, NO character creation TV
- Risk: cutover demo "rough edges" visible

### Scenario 2 — Cutover FULL gate (critical + soft selected)

- Trigger: C1-C6 + S1+S2+S5 ✅
- Effort: ~50-70h + 1-2 sett userland
- Demo readiness: Skiv visual recap-card quality + character creation full + playtest validated
- Risk: cutover delay 2-3 sett extra

### Scenario 3 — Cutover STAGED (canary)

- Phase A: cutover MINIMAL (Scenario 1) → web v1 stays alive in parallel
- Phase B: post-cutover sprint completes soft criteria → archive web v1 formal
- Pro: faster initial cutover trigger + safety net web v1 fallback
- Contro: maintenance overhead 2 stack contemporanei N giorni

## 4. Mia raccomandazione

**Scenario 3 — Cutover STAGED (canary)** con thresholds:

- **Phase A trigger** (cutover Godot v2 = primary, web v1 = fallback alive):
  - C1+C2+C3+C4+C5+C6 ✅ (~24-31h dev + master-dd verdict)
- **Phase B trigger** (web v1 archive formal):
  - S1+S2+S5 ✅ (~50-70h cumulative)
  - 1+ playtest session pass post-cutover
  - 0 critical bug regression Phase A

**Reasoning**:

1. **Faster initial validation**: Phase A trigger ~24-31h vs ~50-70h FULL gate. Stage A unblocca primo demo Godot v2.
2. **Safety net**: web v1 stays alive durante Phase A. Se Godot v2 fallisce demo, fallback rapido a web v1.
3. **Iterative quality**: soft criteria S1+S2 polish post-Phase A senza pressing deadline.
4. **Web v1 archive formal Phase B**: cutover irreversible solo dopo validation.

## 5. Web v1 archive plan (Phase B)

Quando Phase B trigger ✅, eseguire:

### 5.1 Tag preservation

```bash
git tag web-v1-final $(git log --oneline | grep "0e044312" | cut -d' ' -f1)
git push origin web-v1-final
```

Nota: web v1 ha già web-v1-final tag preservation 2026-04-29 (PR #2023 commit `91876ac0`). Aggiornare a HEAD post-Phase A se cutover stable.

### 5.2 Frontend deprecate

- `apps/play/src/` → move `apps/play.archive/`
- `apps/play/package.json` → mark `"deprecated": true` + `"private": true`
- `package.json` script `play:dev` → remove (o redirect Godot HTML5 export)
- README + CLAUDE.md: aggiornare "Web v1 ARCHIVED, primary frontend = Godot v2"

### 5.3 Backend preserve

- `apps/backend/` cross-stack persiste Fase 3 (plan v3 explicit decision)
- Endpoint surface `routes/coop.js` + `routes/companion.js` LIVE per Godot HTML5 client
- ERMES bridge `prototypes/ermes_lab/` isolated, no impact

### 5.4 Documentation update

- ADR-2026-05-XX-cutover-godot-v2 → status `Accepted`
- Plan v3 → mark Fase 3 `CHIUSA` + add cutover date
- CLAUDE.md sprint context → update post-cutover state
- Memory file ritual snapshot

## 6. Decision request

Master-dd specifica:

1. **Scenario**: 1 (MINIMAL) / 2 (FULL) / 3 (STAGED canary)
2. **Phase A timing**: ASAP / aspetta soft criteria S1 (Skiv asset visual)
3. **Web v1 archive trigger**: post Phase A success / 7gg post-Phase A grace / Phase B explicit
4. **Authorize impl**: ✅ proceed Fase 3 cutover OR ❌ defer pending

**Default se no verdict 14gg**: Scenario 3 + Phase A ASAP post critical-path close + web v1 archive trigger 7gg post-Phase A grace.

## 7. Status

**DRAFT** — pre-conditions critical path NOT yet met:

- C1 N.7 close: pending (~14-16h Godot)
- C2 M.7 timing: pending (~4-6h Godot)
- C3 phone smoke: pending (master-dd manual)
- C4 Ennea ADR: DRAFT separate ADR pending master-dd verdict

ADR Accepted SOLO quando C1-C4 chiusi.
