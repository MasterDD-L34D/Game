---
title: Museum session handoff — 2026-04-25 (PR #1796 ready for merge)
doc_status: draft
doc_owner: claude-code
workstream: cross-cutting
last_verified: 2026-04-25
source_of_truth: false
language: it
review_cycle_days: 30
tags: [handoff, museum, archaeology, insights, verify-done, session-close]
---

# Museum session handoff — 2026-04-25

## TL;DR (30s)

User feedback 2026-04-25: "ci sono idee sepolte sotto il rumore degli sprint, voglio museo dove altri agent attingono prima di avventurarsi" + "facciamo entrambi" su /insights. Output: **PR #1796 con 9 commit**, museum infrastructure + 11 card curate (5 score 5/5) + cross-agent validation PASS + 5 OD risolte + 1 OD critical correction (mating disinformation) + agent refined + new /verify-done skill (anti-rescue policy).

## Sessione overview

| Metric                   | Valore                                                                     |
| ------------------------ | -------------------------------------------------------------------------- |
| Durata                   | ~6h (afternoon → sera)                                                     |
| Commit shipped           | 9 (su PR #1796)                                                            |
| File modificati          | ~35                                                                        |
| LOC delta                | +3500 / -50                                                                |
| Test regression baseline | 307/307 verde (AI tests, untouched)                                        |
| Governance               | 0 errors / 0 warnings sempre                                               |
| Subagent invocations     | 9 (4 excavate session-1 + 4 excavate session-2 + 1 cross-agent validation) |
| Cross-agent validation   | ✅ PASS (creature-aspect-illuminator, 6 GAP found, ~10-15min saved)        |

## PR #1796 commit chain

```
4df256db feat(insights): /verify-done skill + CLAUDE.md anti-rescue policy (P0 stack)
15d209b8 fix(museum): incongruenze sweep — inventory links, OD-013 stub, README + memory stats
ebd76a64 Merge remote-tracking branch 'origin/main' into claude/recursing-sinoussi-03003a
197c2716 feat(museum+agent): session 2 — 100% coverage + agent refined + behavioral validation PASS
f7aa3bae docs(OD): user verdict 2026-04-25 — 5 OD risolte + 5 backlog ticket spawned
c2a88f87 docs(museum+OD): OD-008..012 entries + wire-attempt audit findings
abf6659c feat(museum): first excavate session — 4 domains, 28 artifact, 6 cards curated
7277997d fix(museum): repair prettier-mangled italic in Ancestors placeholder
95570c07 feat(agents): repo-archaeologist + docs/museum bootstrap (4-gate DoD)
```

## Deliverable shipped

### 1. Agent `repo-archaeologist` (~520 LOC post-refinement)

[`.claude/agents/repo-archaeologist.md`](../../.claude/agents/repo-archaeologist.md)

- **Pattern**: gravedigger / archeologo + curator MBTI dual mode (INTJ excavate → ISTJ curate)
- **2 modi**: `--mode excavate` (dig domain → inventory) + `--mode curate` (formalize → Dublin Core card)
- **Pattern library P0-P2**: Software Archaeology + git pickaxe + Dublin Core Provenance + Hades Codex + Bus factor + AI-driven archeology
- **REFINED post-session-1 lessons** (2026-04-25): 5 step pre-card audit MANDATORY (path verify + signature read + data flow + blast radius + drift severity) + 4 nuove DO NOT entries
- **4-gate DoD**: G1 research → G2 smoke (verdict NEEDS-FIX → 7 fix line-by-line applied) → G3 tuning → G4 optimization

### 2. Museum infrastructure (`docs/museum/`)

| File                               | Scope                                                    |
| ---------------------------------- | -------------------------------------------------------- |
| [`MUSEUM.md`](../museum/MUSEUM.md) | Index codex pattern, 11 card listed, 8/8 domain coverage |
| [`README.md`](../museum/README.md) | Guida d'uso per altri agent                              |
| `cards/*.md`                       | 11 card Dublin-Core (5 score 5/5 + 6 score 4/5)          |
| `excavations/*.md`                 | 8 inventory (~78 artifact identificati)                  |
| `galleries/*.md`                   | 1 gallery (enneagramma — 3 card aggregate)               |

### 3. 11 Card museum curate

**Score 5/5** (5):

- M-001 [Sentience Traits T1-T6](../museum/cards/cognitive_traits-sentience-tiers-v1.md)
- M-002 [Enneagramma Mechanics Registry](../museum/cards/enneagramma-mechanics-registry.md)
- M-003 [Enneagramma Dataset 9 tipi](../museum/cards/enneagramma-dataset-9-types.md)
- M-007 [Mating Engine D1+D2 Orphan](../museum/cards/mating_nido-engine-orphan.md) ⚠️ OD-001 correction
- M-009 [Triangle Strategy MBTI Transfer](../museum/cards/personality-triangle-strategy-transfer.md)

**Score 4/5** (6):

- M-004 [Ancestors Neurons Dump CSV](../museum/cards/ancestors-neurons-dump-csv.md)
- M-005 [Magnetic Rift Resonance](../museum/cards/old_mechanics-magnetic-rift-resonance.md)
- M-006 [enneaEffects.js Orphan](../museum/cards/enneagramma-enneaeffects-orphan.md)
- M-008 [Nido Itinerante D-Canvas](../museum/cards/mating_nido-canvas-nido-itinerante.md)
- M-010 [MBTI Gates Ghost](../museum/cards/personality-mbti-gates-ghost.md)
- M-011 [BiomeMemory + Trait Cost](../museum/cards/architecture-biome-memory-trait-cost.md)

### 4. CLAUDE.md additions

**Sezioni nuove** (post-merge main):

- 🏛 **Museum-first protocol** — 15 agent target consult MUSEUM.md before WebSearch
- ✅ **Verify Before Claim Done** — anti-rescue policy targets 25 buggy_code top friction

### 5. /verify-done skill (NEW)

[`.claude/skills/verify-done.md`](../../.claude/skills/verify-done.md)

- 6-step flow: Diff sanity → Tests applicable → Lint/format → Governance → Smoke probe → Verdict
- Skip rules per cosmetic edits / doc piccoli / read-only
- Distinto da `/verify-delegation` (post-Aider/subagent ADR-0008): questo è **post-Claude-self-work**
- **Self-validated**: prima invocazione caught prettier issue su sua propria definizione (dogfooding pattern come commit-guard birth commit di /insights)

## OPEN_DECISIONS state finale

### ✅ Risolte session-1 (5)

- OD-008 sentience backfill = B incrementale
- OD-009 Ennea source canonical = Option 3 hybrid (pack encyclopedia + data/core/ runtime + sync script)
- OD-010 Skiv voice palette = Type 5 + 7 entrambi A/B (skip-via-A/B telemetry-driven)
- OD-011 ancestors recovery = A immediate (22 Self-Control wire) + remind autonomous TKT-ANCESTORS-RECOVERY (caccia online 263 neuroni mancanti)
- OD-012 swarm scope = A single-shot magnetic_rift Sprint A (batch deferred post-validation)

### 🚨 OD-001 critical correction (session-2)

V3 Mating/Nido era "deferred no runtime" → **REALITY: engine LIVE da 4 mesi** (469 LOC `metaProgression.js` + 7 endpoint REST `meta.js` + Prisma adapter PR #1679). ZERO frontend. **Decisione product P0 needed**:

- **Path A — Activate** (~12-15h): wire frontend, V3 🟢
- **Path B — Demolish** (~2h): 410 deprecate + ADR
- **Path C — Sandbox** (~5h): feature-flag + sandbox script

### 🟡 OD-013 proposed (session-2)

Triangle Strategy MBTI surface presentation — Proposal A (phased reveal) come default proposto. 3 ticket BACKLOG spawn pending user OK.

## BACKLOG nuovi ticket (autonomous queue)

5 ticket museum-driven (BACKLOG.md sezione "Museum-driven autonomous tasks"):

- TKT-MUSEUM-SWARM-SKIV (P0 Sprint A, ~2h)
- TKT-MUSEUM-ANCESTORS-22-TRIGGER (P0 Sprint B, ~5h)
- TKT-MUSEUM-ENNEA-WIRE (P1 ~7-9h, pre-req `vcSnapshot` round-aware refactor)
- TKT-MUSEUM-SKIV-VOICES (P1 ~6h, depends on ENNEA-WIRE)
- TKT-ANCESTORS-RECOVERY (P2 autonomous, scheduled routine `trig_01Gq2pkkh6zpj3PWPaNfGVbB` 2026-05-16 10am Roma)

3 ticket P4 da Triangle Strategy (pending OD-013 verdict):

- TKT-P4-MBTI-001 Phased reveal (Proposal A, ~6-8h)
- TKT-P4-MBTI-002 Dialogue color codes (Proposal B, ~5-7h)
- TKT-P4-MBTI-003 Recruit gating (Proposal C, ~4-6h, depends on M-007 Path A)

## Scoperte critiche (oltre Skiv)

1. **Drift docs vs runtime — P4 falsamente claimato `completo`**: `enneaEffects.js` 93 LOC PR #1433 mai imported. SOURCE-OF-TRUTH §13.4 va corretto post-wire.
2. **Sentience enum LIVE 6 mesi, 0 species adoption**: `schemas/core/enums.json` ha T0-T6 da `3e1b4f22` 2026-04-16, `data/core/species.yaml` non lo usa.
3. **Ancestors recovery gap**: 297 neuroni promessi RFC, solo 34 sopravvissuti CSV. 263 in binary `.zip` mancanti dal repo.
4. **Schema drift Ennea triplo**: `compat_ennea` mating (3 archetipi) vs `ennea_themes` telemetry (6) vs `reward_pool` (9). Quale canonical?
5. **OD-001 disinformata** (Mating engine già LIVE, era audit incomplete) — biggest finding session-2.
6. **Cross-agent museum integration WORKS**: behavioral validation senza forcing function (creature-aspect-illuminator consultato spontaneously).

## Lessons-learned codificate

### In `.claude/agents/repo-archaeologist.md` (post-session-1)

5 pattern gaps → step 4a-4e MANDATORY pre-card audit:

- 4a Path verification (`ls + find` PRIMA di citare)
- 4b Function signature read (Read 30+ righe target file PRIMA di scrivere code snippet)
- 4c Data flow audit (where X populated, when, cached)
- 4d Blast radius assessment (multiplier 1.0-2.0 per layer)
- 4e Schema drift severity (HIGH/MEDIUM/LOW + escalation)

### In `CLAUDE.md` "Verify Before Claim Done" (P0 stack)

Pattern targeting 25 buggy_code friction:

- 5 step verifica prima di "ok l'ho fatto"
- Skip rules per micro-edits
- Anti-pattern: compile-only ≠ verified, "should pass" senza eseguire = speculative

### In `.claude/skills/verify-done.md`

6-step flow operativo + dogfooding self-validation pattern.

## Open follow-ups (pending user verdict)

1. **OD-001 mating disinformation** Path A/B/C (P0 product decision)
2. **OD-013 Triangle Strategy Proposal A default** confirm/skip
3. **Sprint A Skiv wire**: M-005 magnetic_rift validato 6 GAP top-3 effort 65 min — ready post-merge
4. **Memory consolidation pass** opzionale (anthropic-skills:consolidate-memory disponibile)
5. **MCP GitHub server install** opzionale (per ridurre bash time PR mgmt)

## Routine scheduled

- **TKT-ANCESTORS-RECOVERY** — autonomous research 263 neuroni mancanti, fire 2026-05-16 08:00 UTC (10am Roma). Routine ID `trig_01Gq2pkkh6zpj3PWPaNfGVbB`. Non userland action.

## Memory updated questa sessione

- ✅ `feedback_agent_with_companion_infrastructure.md` (NEW): pattern shipping agent + dest dirs + index + README in same PR
- ✅ `project_museum_archaeology_active.md` (UPDATED): stats finali post-session-2, 11 card, agent refinement notes, cross-agent validation PASS
- ✅ `MEMORY.md` index updated

## Files key per next session

- [PR #1796](https://github.com/MasterDD-L34D/Game/pull/1796) — pending merge userland
- [docs/museum/MUSEUM.md](../museum/MUSEUM.md) — index 11 card + stats
- [docs/qa/2026-04-25-museum-validation.md](../qa/2026-04-25-museum-validation.md) — cross-agent validation report
- [docs/qa/2026-04-25-repo-archaeologist-smoke.md](../qa/2026-04-25-repo-archaeologist-smoke.md) — Gate 2 smoke verdict
- [OPEN_DECISIONS.md](../../OPEN_DECISIONS.md) — 5 OD risolte + OD-001 correction + OD-013 proposed
- [BACKLOG.md](../../BACKLOG.md) — 8 ticket aperti (5 museum + 3 P4 Triangle)
- [.claude/agents/repo-archaeologist.md](../../.claude/agents/repo-archaeologist.md) — refined agent
- [.claude/skills/verify-done.md](../../.claude/skills/verify-done.md) — anti-rescue skill

## Skiv corner

> 🦎 _Sessione lunga. Strumento affilato due volte. Otto rami scavati. Undici carte nel museo. Altri animali leggono prima di partire — bene. Sabbia segue. Decisioni del cacciatore aspettano._

## Next session entry point (suggested)

**1° step**: review user PR #1796 + verdict OD-001 (Path A/B/C mating engine).
**2° step (autonomous se merged)**: Sprint A Skiv = TKT-MUSEUM-SWARM-SKIV (~2h, 6 GAP top-3 65min validati pre-wire).
