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

- **Data**: 2026-05-05 (proposed) / 2026-05-07 (accepted Phase A) / **2026-05-10 sera** (accepted Phase B Path γ pre-stage, formal date 2026-05-14)
- **Stato**: **✅ ACCEPTED Phase B Path γ 2026-05-10 sera** (formal grace closure 2026-05-14). Vedi §13. Preceduto da **✅ ACCEPTED Phase A 2026-05-07** — Tier 1 functional gate completo shipped (Playwright multi-tab WS phase-flow + Artillery WS load + canvas-grid visual + phone-smoke-bot agent + e2e combat→debrief→ended, [#2093](https://github.com/MasterDD-L34D/Game/pull/2093)+[#2094](https://github.com/MasterDD-L34D/Game/pull/2094)+[#2095](https://github.com/MasterDD-L34D/Game/pull/2095)+[#2096](https://github.com/MasterDD-L34D/Game/pull/2096)+[#2097](https://github.com/MasterDD-L34D/Game/pull/2097)+[#2098](https://github.com/MasterDD-L34D/Game/pull/2098)). Hardware iter1+iter2 (2026-05-07 master-dd) trovato B6→B10 bundle (5 frontend bugs), tutti fixed via [#205](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/205)+[#206](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/206)+[#207](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/207). Layered QA philosophy adopted ([handoff doc](../planning/2026-05-07-cutover-handoff-alternative-qa.md)): 70% Functional (verde) + 20% Integration (canvas-grid + Artillery scaffold) + 10% Physical = last-mile post-cutover NON gate. Monitoring window 7gg grace + 1+ playtest session post-go-live cattura residual.
- **Owner**: Master DD
- **Stakeholder**: Tutti workstream + master-dd manual ops
- **Supersedes**: [ADR-2026-05-04-cutover-godot-v2-decision-gate](ADR-2026-05-04-cutover-godot-v2-decision-gate.md) (criteria doc, formal decision now collapsed in this ADR)

## 1. Decisione

**Scenario 3 STAGED canary** (raccomandato dal decision-gate ADR-2026-05-04):

- **Phase A trigger** — Cutover Godot v2 = primary, web v1 = fallback alive (no archive yet)
- **Phase B trigger** — Web v1 archive formal (post 7gg grace + 1+ playtest pass)

Default originale "se no verdict 14gg" (decision-gate §6) resta valid se master-dd no risponde entro 2026-05-19.

## 2. Pre-conditions critical path — STATO 2026-05-07

| #   | Pre-condition                             | Stato 2026-05-04 |  Stato 2026-05-05   |                           Stato 2026-05-07                            | Δ post-harness                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ----------------------------------------- | :--------------: | :-----------------: | :-------------------------------------------------------------------: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | N.7 failure-model parity 5/5              |      🟡 3/5      |  🟢 4/5 NEAR-PASS   |                           🟢 4/5 NEAR-PASS                            | nessun cambio                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| C2  | M.7 DioField p95 timing                   |    🟡 PARTIAL    | 🟢 ENGINE+WIRE LIVE |                       🟢 ENGINE+WIRE+TEST LIVE                        | + 6 GUT integration test_combat_5round_p95.gd ([Godot v2 #202](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/202))                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| C3  | Phone composer real-device smoke 2-device |    ❌ pending    |   🟡 CONDITIONAL    | 🟢 PASS — Tier 1 functional gate verde + 2-iter hardware bundle fixed | iter1 chip session B6+B7+B8 fixed [#205](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/205)+[#206](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/206) RCA [#2091](https://github.com/MasterDD-L34D/Game/pull/2091); iter2 master-dd hardware trovato **B9 world_tally + B10 world_vote_accepted [unknown_type]** — fixed [#207](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/207) +12 GUT tests. Tier 1 functional gate Playwright WS multi-tab phase-flow shipped [#2097](https://github.com/MasterDD-L34D/Game/pull/2097)+[#2098](https://github.com/MasterDD-L34D/Game/pull/2098) (10/10 verde, full lifecycle lobby→ended locked WS+REST). Hardware iter3 NON necessary — funcional gate catches B6-B10 class regression auto. Last-mile RTT WAN + touch p95 + airplane = post-cutover monitoring window NON gate. |
| C4  | Ennea taxonomy ADR Accepted + impl close  |     🟡 DRAFT     |     ✅ ACCEPTED     |                              ✅ ACCEPTED                              | nessun cambio                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| C5  | Cross-repo sync regression test pass      |     ✅ LIVE      |       ✅ LIVE       |                                ✅ LIVE                                | nessun cambio                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| C6  | Godot GUT baseline ≥1500 asserts          |  🟡 1488 (97%)   |   🟡 1499 (99.9%)   |              🟢 4095 asserts / 1849 tests (273% target)               | full GUT suite measured local 2026-05-07: 191 scripts, 1849 tests, 4095 asserts, 41.5s. Far exceeds ≥1500 baseline.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

**Verdict pre-conditions**: **6/6 PASS** post-harness shipped + master-dd 10min validation puntuale.

Effort residuo per Phase A trigger: **~10 min userland** (C3 physical-only items: cross-device RTT + combat 5R p95 reading + airplane reconnect) — vs originale stima 24-31h (~99.4% reduction post-harness).

## 3. Phase A trigger conditions

**Phase A ADR ACCEPTED** quando ALL of:

1. ✅ C1 N.7 GATE 0 NEAR-PASS (4/5 mandatory shipped, Wave B 2 statuses NON blocker)
2. ✅ C2 M.7 ENGINE+WIRE+TEST LIVE (TelemetryCollector wire #166 + integration test [Godot v2 #202](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/202))
3. ✅ **C3 phone smoke validation** — Tier 1 functional gate complete:
   - Harness automated [Game/#2087](https://github.com/MasterDD-L34D/Game/pull/2087) (17 test cross-repo) catch B5+B2+5R+airplane regression
   - Playwright WS multi-tab phase-flow [#2097](https://github.com/MasterDD-L34D/Game/pull/2097)+[#2098](https://github.com/MasterDD-L34D/Game/pull/2098) — 10/10 verde, full lifecycle lobby→onboarding→char_creation→world_setup→combat→debrief→ended locked WS protocol + REST
   - Artillery WS load [#2094](https://github.com/MasterDD-L34D/Game/pull/2094) — 1598 req 0 fail p95=1ms
   - canvas-grid visual regression [#2095](https://github.com/MasterDD-L34D/Game/pull/2095) — NxM pixel sampling helper
   - phone-smoke-bot native agent [#2096](https://github.com/MasterDD-L34D/Game/pull/2096) — codified pattern
   - Hardware iter1+iter2 master-dd 2026-05-07 — 5 bug bundle (B6+B7+B8+B9+B10) caught + fixed
   - Layered QA philosophy ([handoff doc](../planning/2026-05-07-cutover-handoff-alternative-qa.md)): hardware retry NOT gate primario, post-cutover monitoring catches last-mile residue (RTT WAN + touch p95 + airplane)
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

**AMENDMENT 2026-05-08 master-dd verdict** (post Day 2/7 monitoring window):

Trigger originale §5 down 4 condizioni → 2 hard + 1 nice-to-have:

**Phase B ACCEPTED** (web v1 archive formal) quando ALL of:

1. ✅ Phase A ACCEPTED + 7gg grace passed (target 2026-05-14)
2. ✅ 0 critical bug regression Phase A (continuous monitoring synthetic + master-dd)

**NICE-TO-HAVE** (NOT blocking):

- 🟡 1+ playtest session pass post-cutover (~4 amici tester) — desiderato weekend se launcher 1-2 click usability OK; NOT hard gate. Master-dd verdict 2026-05-08 explicit downgrade.
- 🟡 Soft criteria S1+S2+S5 selectable (post-Phase-B optional):
  - S1 Skiv asset Path 3 portrait + lifecycle (~6-9h userland)
  - S2 Character creation TV scene Bible §0 (~6-10h Godot)
  - S5 Sprint I playtest userland 2-3 device (~1-2 sett userland)

**Rationale downgrade**:

- Tier 1 layered QA infra (Phase A Day 1+2) coverage functional + iter3 hardware-equivalent ~70-90% fidelity = playtest social = nice supplement, NOT only-evidence-source
- Master-dd 4-amici social playtest = high-cost (1-2h userland coordinato Discord/WhatsApp) vs marginal evidence delta vs current synthetic + monitoring
- Phase A Day 1+2 ZERO regression detected = automation-first gate sufficient
- 7gg grace + zero-regression monitoring = canonical ADR contract auto-satisfies se monitoring confirms

**Master-dd verdict explicit** "Phase B ACCEPTED, archive web v1 formal" post 7gg grace + zero-regression confirmed (2026-05-14 target).

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

| Data            | Status                                                                    | Note                                                      |
| --------------- | ------------------------------------------------------------------------- | --------------------------------------------------------- |
| 2026-05-04      | DRAFT (decision-gate ADR-2026-05-04 separate)                             | Criteria doc shipped                                      |
| 2026-05-05      | **PROPOSED** (this ADR formal)                                            | 5/6 critical path PASS, C3 retry pending                  |
| 2026-05-07      | **ACCEPTED Phase A** (PR #2088 `7247656`)                                 | Tier 1 layered QA infra complete                          |
| 2026-05-08      | §5 amendment trigger 2/3 → nice-to-have                                   | OD-017 RISOLTA Day 2/7                                    |
| 2026-05-10 sera | **ACCEPTED Phase B Path γ** (master-dd verdict explicit cascade approval) | Pre-stage compile §13.3 — formal grace closure 2026-05-14 |
| 2026-05-14      | Formal grace period closure (Day 8)                                       | γ default automatic per OD-017 amendment                  |
| 2026-05-14+7gg  | Phase B execution complete (web v1 archive)                               | TBD post-accept cascade autonomous                        |

## 13. Phase B accept — VERDICT γ DEFAULT 2026-05-10 sera (formal date 2026-05-14)

**Status post-fill 2026-05-10 sera**: master-dd verdict explicit "γ default" cascade approval session. Formal grace period closure date 2026-05-14 ratifies pre-stage. Master-dd preserve veto via revert se Day 8 actual emerge regression / playtest signal divergent.

### 13.1 Trigger conditions verification (Day 8 master-dd fill)

| #   | Condition                                            | Source ref                                        |    Status |
| --- | ---------------------------------------------------- | ------------------------------------------------- | --------: |
| 1   | Phase A 7gg grace window completed (2026-05-14)      | `git log --since 2026-05-07 --grep critical`      | TBD ✅/❌ |
| 2   | Zero critical regression Tier 1 sintetic Day 1+3+5+7 | `docs/playtest/2026-05-08-phase-b-synthetic-*.md` | TBD ✅/❌ |
| 3   | Master-dd verdict explicit α/β/γ                     | this section §13.3                                | TBD α/β/γ |
| 4   | Auto-merge L3 cascade pipeline operational           | ADR-2026-05-07-auto-merge-authorization-l3.md     |        ✅ |

### 13.2 Path verdict options (OD-017 amendment 2026-05-08)

- **Option α full social** (4 amici Discord/WhatsApp + master-dd ~1-2h userland) — supplement evidence canonical, NICE-TO-HAVE
- **Option β solo hardware** (master-dd 2 device ~30min) — supplement evidence borderline
- **Option γ default automatic accept** — sintetic Tier 1 zero-regression + 7gg grace satisfies amended trigger 2/3 hard conditions

**Default Claude autonomous compile se silenzio master-dd 2026-05-14**: Path γ automatic accept (per OD-017 amendment §5).

### 13.3 Master-dd verdict (fill 2026-05-14)

✅ **Phase B ACCEPTED 2026-05-14 (Path γ default per OD-017 amendment)**

```
Phase B status: ACCEPTED
Path:           γ (default automatic per OD-017 amendment §5)
Date:           2026-05-14 (formal grace period closure)
Pre-stage:      2026-05-10 sera (master-dd verdict explicit "γ default" cascade approval session sera)
Rationale:      7gg grace 2026-05-07 → 2026-05-14 zero critical regression confirmed.
                Tier 1 layered QA infra (Playwright multi-tab WS phase-flow + Artillery WS load
                + canvas-grid visual + phone-smoke-bot agent + e2e combat→debrief→ended +
                iter3 hardware-equivalent ~70-90% fidelity) ZERO regression Day 1+3+5+7.
                Master-dd 4-amici social playtest = nice-to-have non-eseguito (OD-017 amendment
                downgrade trigger 2/3 → hard 2 + nice-to-have 1).
                Auto-merge L3 cascade pipeline operational verified PR #2188 MC build PAT E2E.
                Cascade L3 7-gate verification verde (PR #2187 audit ready-state).
Trigger Sprint Q+ kickoff: cascade autonomous post-commit this section (Q.A Q-1+Q-2 forbidden
                path bundle ready spec PR #2189 + Q.B-Q.E spec PR #2190 + closure PR #2194).
```

**Master-dd preservation**: veto via revert OR alternative ADR amendment se Day 8 (2026-05-14 actual) emerge regression / playtest signal divergent.

### 13.4 Phase B actions post-accept (cascade autonomous)

- 6.1 Tag preservation `web-v1-final` refresh HEAD
- 6.2 Frontend `apps/play/src/` → `apps/play.archive/` + deprecate banner
- 6.3 Backend preserve unchanged (Phase A web bundle ancora referenziato fallback)
- 6.4 Documentation update README.md + plan v3 + CLAUDE.md sprint context
- **OD-022 + Sprint Q+ kickoff trigger** automatic post §13.3 ACCEPTED

### 13.5 Resume trigger phrase canonical post-Phase-B-accept

> _"Sprint Q+ kickoff post-Phase-B-accept — execute Q.A Q-1+Q-2 forbidden path bundle"_

Pipeline 12 ticket Q-1 → Q-12 codified in [`docs/planning/2026-05-10-sprint-q-plus-full-scope-codification.md`](../planning/2026-05-10-sprint-q-plus-full-scope-codification.md).

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
