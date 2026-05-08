---
title: 'Day 3/7 sera completionist multi-action audit (B+D+E + A pre-design)'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-08
source_of_truth: false
language: it
review_cycle_days: 7
related:
  - docs/planning/2026-05-07-phase-a-handoff-next-session.md
  - OPEN_DECISIONS.md
  - docs/museum/cards/evo-swarm-run-5-discarded-claims.md
  - docs/research/2026-05-08-od-022-validator-pre-design.md
tags: [phase-a, day-3, audit, multi-action, completionist]
---

# Day 3/7 sera completionist multi-action audit

User trigger _"facciamoli tutti possiamo?"_ — 4 autonomous-eligible options eseguite cumulative ~3h Day 3 sera 2026-05-08:

- **A** OD-022 validator pre-design preview (skeleton + test corpus + spec)
- **B** Cross-repo Game-Godot-v2 audit
- **D** OD-014 P6 rewind + OD-015 Brigandine deeper research
- **E** Pre-Phase-B-accept readiness check ADR §6

## 1. A — OD-022 validator pre-design preview ✅ shipped

### Files

- NEW `tools/py/swarm_canonical_validator.py` — skeleton 6 funzioni `NotImplementedError` + 3 dataclass + `GATE_THRESHOLD = 0.30`
- NEW `docs/research/2026-05-08-od-022-validator-pre-design.md` — spec preview + test corpus 15 cases + 3 gate criteria open questions + effort 8-10h post master-dd accept

### Status

**DRAFT pre-design** — master-dd OD-022 verdict pendente. Caveat explicit: skeleton non production. Zero info lost se reject (archive read-only).

### Gate criteria proposed master-dd review

1. Threshold 0.30 too strict / too lax (run #5 = 0.54)?
2. Redundant count separato o aggregato a hallucinated?
3. Verified-low-value (5/13 consistency-minor) = pass o flag attention?

## 2. B — Cross-repo Game-Godot-v2 audit ✅ verde

### Findings

| Aspect                          | Status              | Evidence                                                              |
| ------------------------------- | ------------------- | --------------------------------------------------------------------- |
| Latest 5 commits main           | 🟢 verde            | All 2026-05-07, GAP-11/-13/-8/-3+6+14/-5 chain                        |
| Open PR                         | 🟢 zero             | `gh pr list --state open` empty                                       |
| CI status last 5 runs           | 🟢 5/5 success      | Uniform green test.yml + GUT + gdformat                               |
| GUT test baseline               | 🟢 1964/1964 pass   | +7 GAP-11 cases shipped #215                                          |
| GAP-12 LineageMergeService P2   | 🟡 deferred Sprint Q+ | Bond system not yet wired (legitimate defer)                          |
| Skiv Monitor cron schedule      | 🟢 active           | `cron: '0 */4 * * *'` workflow `.github/workflows/skiv-monitor.yml`   |

### Verdict

5/6 verde + 1/6 yellow (deferred legitimate). Zero drift Day 3 sera. Day 5 iter3 schedule confermato.

## 3. D — OD-014 + OD-015 deeper research ✅ pattern extracted

### OD-014 P6 Fairness ammortizer — Tactics Ogre WORLD-Chariot

**Pattern**:

- Rewind 3-5 turn at tactical checkpoint (anti-frustration valve)
- Complementary attrition (wounded_perma + legacy_ritual) — non sostituisce
- Safety valve scope partial vs full restart

**Reuse path concreto**:

- File: `apps/backend/services/combat/stateSnapshot.js` (NEW) + extend `apps/backend/routes/session.js` `/action` endpoint
- Effort ~5-7h (state serialization + replay validation + UI overlay)
- Reuse foundation: `propagateLineage` snapshot pattern PR #1979

**Pre-req**: wounded_perma severity stack shipped Action 5a + legacy_ritual choice PR #1984 + TKT-M11B-06 playtest feedback

**Score relevance vs Phase A**: **2/5** (low immediate priority, high strategic se feedback "wounded_perma feels punitive")

### OD-015 P2 Macro-loop — Brigandine Organization Phase

**Pattern**:

- Dual-phase Organization + Battle Phase stagionale
- 5-10 seasons per campaign forces re-evaluation roster + diplomacy
- Non-combat 60% player agency vs 40% combat (inverte ratio SRPG)

**Reuse path concreto**:

- File: `apps/backend/services/campaign/organizationPhase.js` (NEW) + `data/core/campaign/seasons/` (NEW YAML)
- Effort ~15-20h full impl, ~8h citation+architectural blueprint (current deferred)
- Reuse foundation: extend `metaProgression.js` 469 LOC engine PR #1435 + lineage_id roster persistence Sprint Q+ TKT-Q-3

**Pre-req**: Sprint Q+ TKT-Q-3 lineage_id merged roster + TKT-M11B-06 playtest feedback su mating engine pacing

**Score relevance vs Phase A**: **3/5** (medium future-proof reference M12+ roadmap slot, zero immediate blocking)

## 4. E — Phase B archive readiness check ✅ score 5/5 zero blockers

### Status per §

| §       | Status     | Evidence                                                                                         |
| ------- | ---------- | ------------------------------------------------------------------------------------------------ |
| §6.1    | ✅ READY    | Tag `web-v1-final` exists `91876ac0` (PR #2023, 2026-04-29). Refresh command valid               |
| §6.2    | ✅ READY    | `apps/play/src/` 53 source files accessible. `package.json` parseable. `git mv` testable         |
| §6.3    | ✅ READY    | All 4 route files live (coop.js + companion.js + lobby.js + wsSession.js). Endpoint surface live |
| §6.4    | ✅ READY    | ADR + Plan v3 + README.md root + CLAUDE.md tutti accessibili                                    |

### Pre-cutover effort

~15 min cumulative: tag push + git mv + 4 doc edits.

### Phase B trigger sequence (executable post master-dd verdict 2026-05-14+)

```bash
# §6.1 Tag refresh
cd /c/Users/VGit/Desktop/Game
git tag -d web-v1-final 2>/dev/null || true
git tag web-v1-final HEAD
git push origin web-v1-final --force-with-lease

# §6.2 Frontend archive
git mv apps/play/src apps/play.archive/src
# + edit apps/play/package.json deprecated:true private:true
# + edit apps/play/README.md deprecation banner
# + remove root package.json scripts/play:dev

# §6.3 Backend validation (no action, verify only)
grep -r "/api/lobby\|/api/session" apps/backend/routes

# §6.4 Documentation updates
# - ADR header: ACCEPTED Phase A → ACCEPTED Phase B
# - Plan v3: Phase 3 CHIUSA + final cutover date
# - README.md: Primary = Godot v2, web v1 ARCHIVED
# - CLAUDE.md: post-cutover sprint context
```

### Gate eval master-dd

Phase B trigger contingent (ADR §5 amendment Day 2):

- ✅ Phase A ACCEPTED + 7gg grace passed (target 2026-05-14)
- ✅ 0 critical bug regression Phase A (continuous monitoring passed Day 1+2+3)
- ⏸ 1+ playtest pass nice-to-have (OD-017 downgrade Day 2)

## 5. Cumulative Day 3 sera summary

### PR shipped (12 totali Day 3 sera, post #2126)

| #     | SHA        | Topic                                                                                          |
| ----- | ---------- | ---------------------------------------------------------------------------------------------- |
| #2117 | `2656640c` | Skiv Monitor admin merge (autonomous lesson codified post)                                     |
| #2118 | `27dc92e6` | Synthetic supplement iter2                                                                     |
| #2108 | `1cfd7220` | evo-swarm run #5 distillation merge                                                            |
| #2119 | `0423001a` | Normalize chip drift Day 3                                                                     |
| #2120 | `9d57a2c5` | OD-022 add cross-verification gate                                                             |
| #2121 | `1ee6fd94` | Triage run #5 5/7 closure canonical grep                                                       |
| #2122 | `95ac1ef3` | Closure cumulative                                                                             |
| #2123 | `bec82f12` | OD audit cleanup OD-016 sposta                                                                 |
| #2124 | CLOSED     | Revert direction wrong (anti-completionist)                                                    |
| #2125 | `e6e0ba0a` | Completionist enrichment + museum card M-2026-05-08-001 + lesson codify CLAUDE.md              |
| #2126 | `35c1ca31` | Final closure TBD fill + count audit fresh                                                     |
| TBD   | TBD        | Multi-action audit (questa PR): A pre-design + B+D+E findings doc                              |

### Pillar status invariati

5/6 🟢++ + 2/6 🟢 cand (P2 + P4). No regression Day 1→2→3.

### OD aperte tracking (7 totali)

- OD-002 V6 UI TV polish — deferred post-playtest
- OD-003 Triangle rollout — deferred post-playtest
- OD-004 Game-Database Alt B — flag-OFF dormant
- OD-005 Tuning skill install — shopping list
- OD-014 P6 rewind — score relevance 2/5 confermato (D research)
- OD-015 P2 Brigandine — score relevance 3/5 confermato (D research)
- **OD-022 evo-swarm gate — pre-design preview shipped** (skeleton + test corpus + spec gate criteria proposed pendente master-dd)

## 6. Direction next

### Autonomous-eligible immediate

- **C** Worktree cleanup 8 stale residue (post-merge branches removable, ~10min)
- **F+** OD-014 / OD-015 implementation (gated post-playtest, deferred)

### Userland-gated

- Master-dd weekend playtest signal Phase B trigger (OD-017 nice-to-have)
- S1/S2/S5 soft criteria
- OD-022 verdict accept/reject/defer

### Standby

- Day 5 (2026-05-11) iter3 trigger autonomous OD-021

## 7. Cross-ref

- Handoff Phase A: [`docs/planning/2026-05-07-phase-a-handoff-next-session.md`](../planning/2026-05-07-phase-a-handoff-next-session.md)
- OD-022 pre-design preview: [`docs/research/2026-05-08-od-022-validator-pre-design.md`](../research/2026-05-08-od-022-validator-pre-design.md)
- Museum card M-2026-05-08-001: [`docs/museum/cards/evo-swarm-run-5-discarded-claims.md`](../museum/cards/evo-swarm-run-5-discarded-claims.md)
- ADR Phase B archive: [`docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md`](../adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md) §6
