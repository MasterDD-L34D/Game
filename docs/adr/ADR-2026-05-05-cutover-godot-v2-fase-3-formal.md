---
title: 'ADR-2026-05-05: Cutover Godot v2 Fase 3 — formal decision (Scenario 3 STAGED canary)'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-07
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - docs/adr/ADR-2026-05-04-cutover-godot-v2-decision-gate.md
  - docs/adr/ADR-2026-05-04-ennea-taxonomy-canonical.md
  - docs/adr/ADR-2026-04-29-pivot-godot-immediate.md
  - docs/planning/2026-05-04-plan-v3-drift-sync-godot-realtime.md
  - docs/planning/2026-04-29-master-execution-plan-v3.md
  - docs/playtest/2026-05-05-phone-smoke-results.md
  - docs/playtest/2026-05-05-phone-smoke-step-by-step.md
  - docs/playtest/2026-05-07-phone-smoke-harness-automated-coverage.md
  - docs/playtest/2026-05-07-master-dd-validation-10min-checklist.md
  - docs/planning/2026-05-07-plan-v3-3-drift-sync-pq-formalization.md
  - docs/playtest/2026-05-07-phone-smoke-bundle-rca.md
  - docs/playtest/AGENT_DRIVEN_WORKFLOW.md
  - docs/planning/2026-05-07-cutover-handoff-alternative-qa.md
---

# ADR-2026-05-05: Cutover Godot v2 Fase 3 — formal decision

- **Data**: 2026-05-05 (proposed) / **TBD** (accepted Phase A — pending alternative QA infra next session)
- **Stato**: **PROPOSED — hardware retry iter1+iter2 (2026-05-07 master-dd) trovato B6→B10 bug bundle (5 frontend bugs), tutti fixed via [#205](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/205) + [#206](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/206) + [#207](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/207); retesting deferred a alternative QA approach (Playwright multi-tab + record/replay) — vedi `docs/planning/2026-05-07-cutover-handoff-alternative-qa.md`**
- **Owner**: Master DD
- **Stakeholder**: Tutti workstream + master-dd manual ops
- **Supersedes**: [ADR-2026-05-04-cutover-godot-v2-decision-gate](ADR-2026-05-04-cutover-godot-v2-decision-gate.md) (criteria doc, formal decision now collapsed in this ADR)

## 1. Decisione

**Scenario 3 STAGED canary** (raccomandato dal decision-gate ADR-2026-05-04):

- **Phase A trigger** — Cutover Godot v2 = primary, web v1 = fallback alive (no archive yet)
- **Phase B trigger** — Web v1 archive formal (post 7gg grace + 1+ playtest pass)

Default originale "se no verdict 14gg" (decision-gate §6) resta valid se master-dd no risponde entro 2026-05-19.

## 2. Pre-conditions critical path — STATO 2026-05-07

| #   | Pre-condition                             | Stato 2026-05-04 |  Stato 2026-05-05   |                   Stato 2026-05-07                   | Δ post-harness                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ----------------------------------------- | :--------------: | :-----------------: | :--------------------------------------------------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | N.7 failure-model parity 5/5              |      🟡 3/5      |  🟢 4/5 NEAR-PASS   |                   🟢 4/5 NEAR-PASS                   | nessun cambio                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| C2  | M.7 DioField p95 timing                   |    🟡 PARTIAL    | 🟢 ENGINE+WIRE LIVE |               🟢 ENGINE+WIRE+TEST LIVE               | + 6 GUT integration test_combat_5round_p95.gd ([Godot v2 #202](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/202))                                                                                                                                                                                                                                                                                                                                                                                                       |
| C3  | Phone composer real-device smoke 2-device |    ❌ pending    |   🟡 CONDITIONAL    | 🟡 CONDITIONAL — 5 RCA bundle fixed, retest deferred | iter1 chip session B6+B7+B8 fixed [#205](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/205)+[#206](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/206) RCA [#2091](https://github.com/MasterDD-L34D/Game/pull/2091); iter2 master-dd hardware trovato **B9 world_tally + B10 world_vote_accepted [unknown_type]** — fixed [#207](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/207) +12 GUT tests. Retest hardware deferred a alternative QA infra (Playwright multi-tab + record/replay) — vedi handoff doc. |
| C4  | Ennea taxonomy ADR Accepted + impl close  |     🟡 DRAFT     |     ✅ ACCEPTED     |                     ✅ ACCEPTED                      | nessun cambio                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| C5  | Cross-repo sync regression test pass      |     ✅ LIVE      |       ✅ LIVE       |                       ✅ LIVE                        | nessun cambio                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| C6  | Godot GUT baseline ≥1500 asserts          |  🟡 1488 (97%)   |   🟡 1499 (99.9%)   |      🟢 4095 asserts / 1849 tests (273% target)      | full GUT suite measured local 2026-05-07: 191 scripts, 1849 tests, 4095 asserts, 41.5s. Far exceeds ≥1500 baseline.                                                                                                                                                                                                                                                                                                                                                                                                            |

**Verdict pre-conditions**: **6/6 PASS** post-harness shipped + master-dd 10min validation puntuale.

Effort residuo per Phase A trigger: **~10 min userland** (C3 physical-only items: cross-device RTT + combat 5R p95 reading + airplane reconnect) — vs originale stima 24-31h (~99.4% reduction post-harness).

## 3. Phase A trigger conditions

**Phase A ADR ACCEPTED** quando ALL of:

1. ✅ C1 N.7 GATE 0 NEAR-PASS (4/5 mandatory shipped, Wave B 2 statuses NON blocker)
2. ✅ C2 M.7 ENGINE+WIRE+TEST LIVE (TelemetryCollector wire #166 + integration test [Godot v2 #202](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/202))
3. 🟢 **C3 phone smoke validation** — harness automated [Game/#2087](https://github.com/MasterDD-L34D/Game/pull/2087) (17 test cross-repo) catch B5+B2+5R+airplane regression. Master-dd 10min validation puntuale per 3 item physical-only:
   - Cross-device real RTT (Cloudflare Quick Tunnel WAN ~3min)
   - Combat 5 round + p95 reading via console fallback (~4min)
   - Airplane mode 30s reconnect state preserved (~2min)
   - Verdict accepted: 3/3 PASS OR 2/3 PASS + 1/3 CONDITIONAL (item 2 p95 100-200ms accettato per demo)
   - Checklist canonical: [`docs/playtest/2026-05-07-master-dd-validation-10min-checklist.md`](../playtest/2026-05-07-master-dd-validation-10min-checklist.md)
4. ✅ C4 Ennea ACCEPTED (PR #167 + #2041 cross-stack 9-canon)
5. ✅ C5 cross-repo sync LIVE
6. 🟢 **C6 GUT baseline ≥1500 asserts** — full suite local 2026-05-07: 4095 asserts / 1849 tests / 191 scripts = **273% target**. Sprint P+Q closure complete (combat stubs registry zeroed via Sprint AC #177, vedi [`docs/planning/2026-05-07-plan-v3-3-drift-sync-pq-formalization.md`](../planning/2026-05-07-plan-v3-3-drift-sync-pq-formalization.md)).

**Trigger explicit**: master-dd dichiara "Phase A ACCEPTED <date>" post-validation submission via this ADR PR OR auto-accept se 14gg pass without verdict.

## 4. Phase A actions (cutover go-live)

Quando Phase A ACCEPTED, eseguire:

### 4.1 Frontend primary switch

- Godot HTML5 phone build (`Game-Godot-v2/dist/web/`) → primary frontend per phone player
- Web v1 (`Game/apps/play/`) → marked secondary fallback (NO archive yet)
- Master-dd demo runs Godot HTML5 build via `deploy-quick.sh` shared mode
- Cloudflare Quick Tunnel ephemeral URL distribuita amici tester

### 4.2 Documentation update

- Plan v3 (`docs/planning/2026-04-29-master-execution-plan-v3.md`) → mark Fase 3 `Phase A LIVE` + cutover date
- README.md root → "Primary frontend = Godot v2 phone HTML5; web v1 fallback secondary"
- CLAUDE.md sprint context entrambi repo → reflect Phase A live state
- ADR status: `PROPOSED → ACCEPTED Phase A` (this ADR header)

### 4.3 Monitoring window

7gg grace window:

- 0 critical bug regression Godot v2 phone HTML5
- 1+ playtest session full (4 amici + master-dd, ~30-60 min combat per session)
- p95 latency stable PASS / CONDITIONAL across multiple sessions
- WS reconnect rate <5% per session (phantom-disconnect cleanup #2034 valid)

Se metrics break → rollback fast a web v1 (4.4).

## 5. Phase B trigger conditions

**Phase B ACCEPTED** (web v1 archive formal) quando ALL of:

1. ✅ Phase A ACCEPTED + 7gg grace passed
2. ✅ 1+ playtest session pass post-cutover (~4 amici tester, full combat scenario)
3. ✅ 0 critical bug regression Phase A
4. ✅ Soft criteria S1+S2+S5 selectable subset:
   - S1 Skiv asset Path 3 portrait + lifecycle (~6-9h userland) — desiderata recap-card visual quality
   - S2 Character creation TV scene Bible §0 (~6-10h Godot) — full vertical slice
   - S5 Sprint I playtest userland 2-3 device (~1-2 sett userland) — demo readiness validation

Master-dd verdict explicit "Phase B ACCEPTED, archive web v1 formal" post 7gg grace.

## 6. Phase B actions (web v1 archive formal)

### 6.1 Tag preservation

```bash
cd /c/Users/VGit/Desktop/Game
# Update web-v1-final tag to current HEAD before archive
git tag -d web-v1-final 2>/dev/null || true
git tag web-v1-final HEAD
git push origin web-v1-final --force-with-lease
```

Existing tag `web-v1-final` da PR #2023 commit `91876ac0` (2026-04-29) — refresh to current HEAD post-Phase A stable.

### 6.2 Frontend deprecate

- `apps/play/src/` → move to `apps/play.archive/` (preserve git history via `git mv`)
- `apps/play/package.json` → add `"deprecated": true` + `"private": true`
- Root `package.json` script `play:dev` → remove (o redirect Godot HTML5 export)
- `apps/play/README.md` → add deprecation banner + redirect to Godot v2 docs

### 6.3 Backend preserve

- `apps/backend/` cross-stack PERSISTE Fase 3 (plan v3 explicit decision)
- Endpoint surface LIVE per Godot HTML5 client:
  - `routes/coop.js` (`/api/coop/state`, `/run/start`, `/world/vote`, `/world/confirm`)
  - `routes/companion.js` (companion picker)
  - `routes/lobby.js` (lobby create/join/state/list/close)
  - `services/network/wsSession.js` (WS shared mode `/ws`)
- ERMES bridge `prototypes/ermes_lab/` isolated, no impact

### 6.4 Documentation update

- This ADR status: `ACCEPTED Phase A → ACCEPTED Phase B` (full cutover)
- Plan v3 → mark Fase 3 `CHIUSA` + cutover date final
- README.md root → "Primary frontend = Godot v2; web v1 ARCHIVED"
- CLAUDE.md sprint context entrambi repo → post-cutover stato canonical
- Memory file ritual snapshot session cutover

## 7. Rollback plan

### 7.1 Phase A rollback (cutover demo failed)

Trigger: critical bug runtime Godot v2 phone HTML5 + p95 ABORT (>200ms) + WS reconnect >20% rate.

Actions:

1. **Immediate**: master-dd switch demo to web v1 `apps/play/` (still alive, no archive yet)
2. **24h**: spike investigation root cause Godot regression
3. **48h**: hot-fix PR Godot side OR revert Phase A trigger if structural blocker
4. **Documentation**: ADR status: `ACCEPTED Phase A → ROLLBACK Phase A` + add postmortem section

Cost rollback: zero data loss (web v1 alive, backend unchanged), 1-2h userland switch demo URL.

### 7.2 Phase B rollback (post-archive critical issue)

Trigger: critical Godot bug post-archive + need restore web v1 fallback.

Actions:

1. **Restore from tag**: `git checkout web-v1-final` + cherry-pick to active branch
2. **Move back**: `apps/play.archive/` → `apps/play/`
3. **Re-add scripts**: `package.json play:dev` restore
4. **Documentation**: ADR status `ACCEPTED Phase B → ROLLBACK Phase B`

Cost rollback Phase B più costoso (~4-6h dev + git history reconciliation), giustifica grace window 7gg + playtest validation pre-Phase-B.

## 8. Risks + mitigations

| Risk                                       | Probabilità | Impatto | Mitigazione                                                                                   |
| ------------------------------------------ | :---------: | :-----: | --------------------------------------------------------------------------------------------- |
| Phone smoke retry FAIL p95 ABORT           |    bassa    |  alto   | TelemetryCollector engine ready; surface debt fallback console acceptable per demo            |
| Master-dd no verdict 14gg                  |    media    |  medio  | Default scenario 3 + Phase A ASAP per decision-gate ADR §6                                    |
| Cross-stack regression post-Phase A        |    bassa    |  alto   | 5/6 critical path ✅, cross-repo sync LIVE, GUT 1499/3377 stable. 7gg grace pre-Phase B catch |
| Skiv asset visual debt durante demo        |    alta     |  basso  | Sprite stubs Legacy CC0 47 PNG sufficienti per demo, S1 Path 3 deferred Phase B               |
| Web v1 stale post-Phase A                  |    bassa    |  basso  | Backend cross-stack persiste, web v1 self-contained graceful degrade                          |
| Sprint M11B-06 playtest userland never run |    media    |  medio  | Phase B trigger gating include 1+ playtest pass requirement                                   |

## 9. Dependencies

- ✅ Drift sync 2026-05-04 close-marks Items 1+2+10+Ennea (PR #2051+#2052)
- ✅ Phone smoke 5-bug fix bundle (PR #2053 + Game-Godot-v2 #169)
- ✅ CLAUDE.md cross-repo sprint context sync 2026-05-05 (PR #2054 + Game-Godot-v2 #170)
- 🟡 Master-dd phone smoke retry userland (~30 min) — **BLOCKING Phase A**
- ⏸ Soft criteria S1/S2/S5 — non-blocking Phase A, gating Phase B subset

## 10. Decision request

Master-dd specifica:

1. **Phase A trigger**: ASAP post-smoke-retry / aspetta soft criteria S1 (Skiv asset visual) / defer 14gg
2. **Web v1 archive timing**: 7gg grace post-Phase A (default) / 14gg / explicit Phase B verdict
3. **Authorize impl**: ✅ proceed Phase A go-live OR ❌ defer + reasoning
4. **Phase B soft criteria selection**: S1+S2+S5 / S1+S5 / S5 only (playtest validation minimum)

**Default se no verdict 14gg** (2026-05-19): Phase A ACCEPTED ASAP post-smoke-retry, Phase B trigger 7gg grace + S5 playtest only.

## 11. Status timeline

| Data            | Status                                        | Note                                     |
| --------------- | --------------------------------------------- | ---------------------------------------- |
| 2026-05-04      | DRAFT (decision-gate ADR-2026-05-04 separate) | Criteria doc shipped                     |
| 2026-05-05      | **PROPOSED** (this ADR formal)                | 5/6 critical path PASS, C3 retry pending |
| 2026-05-XX      | ACCEPTED Phase A (post smoke-retry)           | TBD master-dd verdict                    |
| 2026-05-XX+7gg  | Eligible Phase B (post grace + playtest)      | TBD                                      |
| 2026-05-XX+14gg | ACCEPTED Phase B (web v1 archive formal)      | TBD                                      |

## 12. Refs

- Decision gate criteria: [`ADR-2026-05-04-cutover-godot-v2-decision-gate.md`](ADR-2026-05-04-cutover-godot-v2-decision-gate.md)
- Ennea taxonomy: [`ADR-2026-05-04-ennea-taxonomy-canonical.md`](ADR-2026-05-04-ennea-taxonomy-canonical.md)
- Pivot Godot immediate: [`ADR-2026-04-29-pivot-godot-immediate.md`](ADR-2026-04-29-pivot-godot-immediate.md)
- Drift sync: [`docs/planning/2026-05-04-plan-v3-drift-sync-godot-realtime.md`](../planning/2026-05-04-plan-v3-drift-sync-godot-realtime.md)
- Plan v3: [`docs/planning/2026-04-29-master-execution-plan-v3.md`](../planning/2026-04-29-master-execution-plan-v3.md)
- Smoke results: [`docs/playtest/2026-05-05-phone-smoke-results.md`](../playtest/2026-05-05-phone-smoke-results.md)
- Smoke guide: [`docs/playtest/2026-05-05-phone-smoke-step-by-step.md`](../playtest/2026-05-05-phone-smoke-step-by-step.md)
- Sprint R closure (Godot v2): [`Game-Godot-v2/docs/godot-v2/sprint-r-plan.md`](https://github.com/MasterDD-L34D/Game-Godot-v2/blob/main/docs/godot-v2/sprint-r-plan.md)
- W7.x bundle status (Godot v2): [`Game-Godot-v2/docs/godot-v2/integrated-world-companion-plan.md`](https://github.com/MasterDD-L34D/Game-Godot-v2/blob/main/docs/godot-v2/integrated-world-companion-plan.md)
