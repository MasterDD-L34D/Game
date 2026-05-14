---
id: OD-024-031-verdict-record
title: OD-024..031 verdict record — master-dd decision permanent
status: pending-master-dd-confirm
verdict_date: 2026-05-14
verdict_by: claude-code-aistation
doc_owner: master-dd
workstream: evo-tactics
last_verified: 2026-05-14
language: it
tags: [open-decision, verdict-record, ai-station, cross-stack, pr-2260]
source_pr: 2260
analysis_methodology: ai-station-task-execution-protocol-phase-0-7
---

# OD-024..031 verdict record

Decision record permanente per 8 Open Decisions originati da Game/ PR #2260 ecosystem audit 2026-05-13.

## Provenance

- **Source PR**: Game/ PR #2260 (`claude/analyze-ecosystem-infrastructure-W4Lyf` branch, parallel Claude session 2026-05-13)
- **Audit scope**: 7-strati ecosystem audit + 22+ ticket TKT-ECO-XX plan
- **Verdict precedente (vault)**: `docs/decisions/OD-024-031-game-pr-2260-vault-verdict-template.md` (7/8 CONFIRM default, conservativo)
- **Verdict corrente (this doc)**: re-analisi ai-station 2026-05-14 — 6/8 verdict cambiato verso "finisci lavoro"
- **Methodology**: ai-station TASK_EXECUTION_PROTOCOL Phase 0-7 + CHANGE_BUDGET Envelope A/B/C

## Verdict table (ai-station re-analysis)

| OD  | Topic               |                                      Verdict                                      | Envelope | Effort | Pilastro target |
| --- | ------------------- | :-------------------------------------------------------------------------------: | :------: | -----: | --------------- |
| 024 | Sentience 45 specie |                      ✅ **Full RFC T1-T6 + 4 traits 45/45**                       |    B     |  ~3-4h | P4 → 🟢         |
| 025 | Promotions demolish | ❌ **REJECT framing** (premessa falsa, code LIVE) + ✅ Phase B2 catalog expansion |   A+B    |  ~3.5h | P3 → 🟢         |
| 026 | Atlas mini-map      |                ✅ **Diegetic TV + Phone overlay** (FDF §16 canon)                 |    C     |    ~6h | P1 UX           |
| 027 | Bridge species      |                  ✅ **Full Species type + ecotypes integration**                  |    B     |    ~3h | P3 content      |
| 028 | Audio API           |                    ✅ **Howler.js middleware adopt** (5KB MIT)                    |    A     |    ~2h | P6 audio        |
| 029 | Ancestors Path B    |         ✅ **Proceed + neurons_bridge 13→50 entries** (Senses+Dexterity)          |    B     |    ~5h | P4 sentience    |
| 030 | Game-Database       |                ✅ **Flag-ON cross-stack** (D2-C già merged #2259)                 |    A     |  ~0.5h | D2-C LIVE       |
| 031 | Pack drift          |                ✅ **Merge core+plus consolidato + diff audit log**                |    B     |    ~3h | Single SOT dati |

**Total effort**: ~23h distribuiti su 2-3 settimane sprint.

## OD-025 chiarimento provenance + REJECT rationale

**Origine claim "Promotions ORPHAN"**:

- PR #2260 audit L7c row: "Promotions COMPLETE ORPHAN (engine=0 LOC, routes=0, test=0)"
- Verdict default proposto: "demolish + sandbox header" → cancella codice

**Cross-validation 2026-05-13 (session corrente)**:

- `apps/backend/services/progression/promotionEngine.js` = **302 LOC LIVE** (mtime 2026-05-11)
- `apps/backend/routes/session.js:208` import `{ evaluatePromotion, applyPromotion }` ✅
- Routes attive:
  - `GET /api/session/:id/promotion-eligibility`
  - `POST /api/session/:id/promote`
- Godot v2 cross-stack:
  - `scripts/progression/promotion_engine.gd` (#226)
  - `scenes/ui/PromotionPanel.tscn` (#243)
  - Caller wire E3 (#252)
  - Postgres D2-C mirror (#2259 + #253 + #254 + #256)

**Stack cross-stack reality**: P3 Promotions = uno dei pilastri PIÙ COMPLETI (Postgres + Express + Godot + UI + caller wire ALL LIVE).

**Root cause false ORPHAN claim**: Explore agent missing `progression/` sub-dir + missed destructured import in route definition. Speed/completeness tradeoff in subagent (226s, 51k token).

**REJECT means**:

- ❌ DON'T demolish (eliminerebbe 302 LOC engine + 2 routes + Godot stack 4 PR)
- ✅ Revise TKT-ECO-B7 from "demolish 2-15h" → "verify-only smoke 0.5h"
- ✅ ADD Phase B2 catalog expansion: base→veteran→captain attuale → +elite +master tier × per archetipo Job
- Correzione comment già posted: PR #2260 [comment-4444944824](https://github.com/MasterDD-L34D/Game/pull/2260#issuecomment-4444944824)

## Comparazione conservative vs ambitious (ai-station lens)

| Metric                    | Conservative (verdetto precedente) |        Ambitious (ai-station current) |
| ------------------------- | ---------------------------------: | ------------------------------------: |
| OD "CONFIRM default"      |                                7/8 |    1/8 (solo OD-025 REJECT invariato) |
| Effort sprint corrente    |                                ~6h |                                  ~23h |
| Pilastri promossi 🟢      |                                  0 |   P3 + P4 (potenziale post-execution) |
| OD "deferred Phase B/C"   |                                6/8 |        0/8 (tutti shipped or planned) |
| Risk profile              |                    Envelope A only | Envelope A+B+C bilanciato + stop-rule |
| Coerenza vs lavoro merged |           OD-030 contraddice #2259 |                 OD-030 ratifica #2259 |

## Master-dd insight catturato

Verdetto precedente 7/8 conservativo lasciava lavoro "a metà":

- 6 OD defer Phase B/C indefinito
- OD-030 contraddiceva D2-C Prisma cross-stack pipeline già merged wave 2026-05-13
- Pattern "skip Howler / skip diegetic / skip full Species" → audio/UI/data SUPERFICI rimangono "terziarie" perché mai finite

Re-analisi ai-station ribalta 6/8 verso "finisci" con:

- Envelope graduato A/B/C (no all-or-nothing)
- Stop-rule per ogni Envelope (fallback safety)
- Dependencies graph esplicito (OD-030 prerequisito veloce, OD-026 sprint dedicato)
- Effort budget realistico (~23h vs ~6h precedente)

## Execution sequence (recommended)

1. **OD-030 flag-ON** (0.5h Envelope A) — sblocca D2-C consistency post-merge
2. **OD-025 smoke + B2 catalog plan** (0.5h smoke + 3h plan) — sblocca P3 🟢
3. **OD-028 Howler adopt** (2h Envelope A) — sblocca audio surface
4. **OD-031 Pack merge** (3h Envelope B) — pulisce dati prima di OD-027
5. **OD-027 Full Species type** (3h Envelope B) — feeds OD-024
6. **OD-024 RFC T1-T6 full + 4 traits** (3-4h Envelope B) — P4 completion
7. **OD-029 neurons expand 13→50** (5h Envelope B) — chiude P4 sentience canon
8. **OD-026 Diegetic Atlas** (6h Envelope C) — UI completion sprint dedicato

## Master-dd checkpoints required

Per ogni Envelope, master-dd verdict gate:

### Envelope A bundle (OD-025 smoke + OD-028 + OD-030) — ~3h total

- [ ] Confirma OD-030 flag default flip OK (no production data hostage)
- [ ] Confirma OD-028 Howler.js license + size OK (5KB MIT verified)
- [ ] Confirma OD-025 smoke scope sufficient (verify routes + engine + Godot wire)

### Envelope B bundle (OD-024 + OD-025-B2 + OD-027 + OD-029 + OD-031) — ~18h total

- [ ] Confirma OD-024 deterministic rule mapping OK (Animal→T1-T2, Custode→T3-T4, etc.)
- [ ] Confirma OD-025 B2 catalog tier scope (elite + master vs solo elite)
- [ ] Confirma OD-027 ETL pattern triplicato (vs deviation)
- [ ] Confirma OD-029 neurons subset criteria (Senses + Dexterity vs full 297)
- [ ] Confirma OD-031 merge resolution authority (core vs pack-v2-full-plus per conflict)

### Envelope C (OD-026 Diegetic) — ~6h dedicated sprint

- [ ] Master-dd design call: TV diegetic implementation (shader custom vs Skiv pulse reuse)
- [ ] Sprint slot allocation (post Envelope A+B closure)

## Cross-link

- Vault re-analysis full: `vault/docs/decisions/OD-024-031-aistation-reanalysis-2026-05-14.md`
- Vault verdict precedente conservativo: `vault/docs/decisions/OD-024-031-game-pr-2260-vault-verdict-template.md`
- Game/ PR #2260 audit originale
- Game/ PR #2260 [comment-4444944824](https://github.com/MasterDD-L34D/Game/pull/2260#issuecomment-4444944824) (OD-025 correzione)
- Wave 2026-05-13 D2-C: PR #2259 (Game/) + Godot v2 #253 + #254 + #256 (D2-C LIVE — OD-030 prerequisite already satisfied)
- ai-station methodology: TASK_EXECUTION_PROTOCOL Phase 0-7 applied
- CHANGE_BUDGET Envelope A/B/C + stop-rule per ogni OD

## Lifecycle status

- 2026-05-13: PR #2260 audit raise 8 OD defaults proposed
- 2026-05-13: cross-validation 2026-05-13 → OD-025 L7c claim FALSE → correction comment posted
- 2026-05-14: verdetto precedente conservativo (vault) 7/8 CONFIRM default
- 2026-05-14: master-dd pushback "troppo conservativo, lasciamo lavoro a metà" + request ai-station methodology
- 2026-05-14: re-analisi ai-station (this doc) → 6/8 verdict cambiato
- **PENDING**: master-dd confirma re-analisi → Envelope A bundle start

## Cherry-pick instructions (Game/ landing)

Game/ repo currently in detached HEAD state (session-closure-2026-05-09 stash + 409 modified files). Quando Game/ workspace clean:

```bash
cd /c/Users/VGit/Desktop/Game
git checkout main && git pull origin main
git checkout -b governance/od-024-031-verdict-record
mkdir -p docs/governance/open-decisions
cp /tmp/vault-pr1/Vault-ops-remote/Game-staging/docs/governance/open-decisions/OD-024-031-verdict-record.md \
   docs/governance/open-decisions/
git add docs/governance/open-decisions/OD-024-031-verdict-record.md
git commit -m "docs(governance): OD-024-031 verdict record ai-station re-analysis"
git push -u origin governance/od-024-031-verdict-record
gh pr create --title "docs(governance): OD-024..031 verdict record ai-station re-analysis" \
  --body "Cross-stack handoff vault → Game/. Re-analisi ai-station 2026-05-14 ribalta 6/8 verdetti precedenti conservativi. Master-dd confirma necessario prima Envelope A bundle start. Cross-link PR #2260."
```
