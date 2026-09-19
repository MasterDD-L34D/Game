---
title: 'Pending Verdicts Inventory POST-Cascade-L3 — Completionist + Optimizer Lens'
date: 2026-05-10
type: report
status: live
workstream: ops-qa
slug: 2026-05-10-sera-pending-verdicts-completionist-optimizer
tags: [decisions, open-questions, master-dd-review, completionist, post-cascade-l3, sera]
author: claude-autonomous
---

# Pending Verdicts Inventory POST-Cascade-L3 — 2026-05-10 sera

User profile canonical: **completista + ottimizzatore**. Default lens = preserve all info, codify all decisions, optimize blast-radius vs effort.

**Context delta vs mattina inventory**: 12 verdict morning resolved sera cascade L3 (V1+V2+V6+V11+V13+V17+V18 + browser ops 1+2 + cascade approval V3). Residue post-cascade.

## Tier HOT — actionable autonomous now

### V1. PR #2192 MC build auto-deploy dist (currently OPEN)

Auto-PR generated 2026-05-10 13:21 UTC via mission-console-build workflow firing post-PAT-setup. Routine auto-PR:

| Option | Cosa cambia |
|---|---|
| **A) Auto-merge L3 cascade** | docs/mission-console/ dist refresh main. Standard pattern post-PAT. |
| **B) Defer master-dd review manual** | PR resta open until master-dd inspect. Safety per first auto-PR generation post-PAT setup. |

**Completionist+Optimizer raccomandato**: **A** — workflow PAT path validated #2188 already (E2E green + auto-merge L3 cascade verde naturale). Routine pattern, zero blast radius.

### V2. Skiv Monitor PR #2174 (OPEN ~auto-generated)

Skiv Monitor cron auto-generated PR. Pattern canonical post-OD-019 toggle.

| Option | Cosa cambia |
|---|---|
| **A) Auto-merge** | Skiv state feed updated. Continuous sync canonical. |
| **B) Manual review** | Master-dd inspect Skiv state evolution. |

**Raccomandato**: **A** auto-merge — canonical pattern, low blast.

### V3. Worktree cleanup local 8 stale (BACKLOG L213)

8 worktree stale residue locali pre-Phase-B-accept defer. Effort ~10min `git worktree remove` × 8.

| Option | Cosa cambia |
|---|---|
| **A) Cleanup ora** | Disco free + worktree-guard hook clean. Verify branches fully merged main pre-remove. Risk = LOW (merge verify pre-remove). |
| **B) Defer post-Phase-B-accept** | Status quo BACKLOG default. 8 worktree continuano esistere. |

**Completionist+Optimizer raccomandato**: **A** — completist no-debris principle. Pre-remove verify via `gh pr list --search "head:<branch> is:merged"` per ogni branch. Dimmi e procedo autonomous.

## Tier MEDIUM — gated post-Phase-B-accept (2026-05-14)

### V4. Phase B Day 8 verdict α/β/γ

OD-017 RISOLTA 2026-05-08 amendment downgrade nice-to-have. Day 8 verdict explicit ancora gated.

| Option | Effort | Cosa cambia |
|---|:-:|---|
| **γ default automatic accept** | ~5min ADR §13.3 fill | 7gg grace + zero regression Day 1+3+5+7 satisfies amended trigger 2/3 hard. Auto-merge L3 cascade pipeline operational verified #2188 E2E. **Default raccomandato**. |
| **α full social** | ~30min compile + ~1-2h playtest | 4-amici Discord + master-dd weekend playtest evidence canonical massima. Trigger 2/3 ✅ + supplement evidence growing dataset. |
| **β solo hardware** | ~30min compile + 30min smoke | 2 device 5 round combat + 3 hardware-only check. Borderline trigger ⚠️. |

**Completionist+Optimizer raccomandato**: **γ default** — minimum effort + amendment già downgraded social to nice-to-have. Se settimana libera + amici disponibili = α full social bonus evidence.

### V5. Sprint Q+ Q.A kickoff cascade (Q-1 schema + Q-2 migration)

Spec ready PR #2189 + #2190. Trigger post-§13.3 commit Day 8.

| Option | Effort | Cosa cambia |
|---|:-:|---|
| **A) Cascade autonomous post-Day-8 commit** | ~3h Q-1+Q-2 ship + ~30min master-dd review forbidden path | Schema canonical `lineage_ritual.schema.json` + Prisma migration `Offspring` table additive. Cascade trigger phrase canonical pre-staged. |
| **B) Master-dd manual ship** | ~3h master-dd hands-on coding | Slower vs cascade autonomous (~3-5x effort). NON consigliato. |

**Raccomandato**: **A** — cascade autonomous canonical pattern Sprint Q+ pipeline. Spec doc ready 2 PR pre-stage + ADR §13.3 trigger phrase.

### V6. Sprint Q+ Q.B → Q.E sequential pipeline

Spec ready PR #2190 8 ticket Q-3 → Q-12. ~19h cumulative ~3-4 sessioni autonomous post-Q.A merge.

| Option | Effort | Cosa cambia |
|---|:-:|---|
| **Sequential canonical** | ~19h + ~30-45min master-dd review across 4-5 gates | Q.B engine → Q.C cross-repo OD-022 → Q.D frontend → Q.E test+closure. P2 🟢++→🟢ⁿ + P5 🟢→🟢++ post-completion. Skiv-Pulverator alleanza arc canonical complete. |
| **Parallel cherry-pick** | ~12-15h faster | Risk context-switching cost + cross-stack contract drift. Sconsigliato per high-stakes ETL. |

**Completionist+Optimizer raccomandato**: **Sequential canonical** — high-stakes ETL data integrity preserve. Pillar deltas anticipated full delivery.

### V7. OD-022 evo-swarm pipeline validator implementation

IMPLICIT ACCEPT 2026-05-08 sera. Bundle Sprint Q+ Q.C (Q-6+Q-7+Q-8) ~7-9h.

| Option | Cosa cambia |
|---|---|
| **A) Bundle Sprint Q+ Q.C** (default) | OD-022 + Sprint Q+ same trigger window post-Phase-B-accept. -4h vs standalone via shared coordination context. |
| **B) Standalone post-Sprint-Q+** | Sequenziale Q+ pure (~19h) + OD-022 (~7-9h) = ~26-28h total. +1 trigger gate. |
| **C) Reject** | Swarm Atto 2 abandoned. 8/13 hallucinated discardati museum card preserved. 5/13 verified consistency-minor archive. |

**Raccomandato**: **A bundle** — already IMPLICIT ACCEPT cross-repo evidence convergente master-dd #2128 + Claude #2129 pre-design.

### V8. Mutation Phase 6 (ally_adjacent_turns + trait_active_cumulative)

V11 cross-domain audit residue 2/12 kinds — Prisma migration 0008+/0009+ required.

| Option | Effort | Cosa cambia |
|---|:-:|---|
| **A) ADR + Prisma migration** | ~3-5h migration + impl | 12/12 kinds runtime parity completist. Cross-encounter trait active aggregate + per-turn proximity tracker live. |
| **B) Defer indefinitely** | 0 effort | 10/12 kinds residue gap permanente. Mutation catalog 2 conditions unevaluated. |
| **C) Strip catalog conditions** | ~30min | YAML cleanup mutation_catalog.yaml entries che usano kinds deferred. Reduce surface. |

**Completionist+Optimizer raccomandato**: **A** — completist 12/12 parity. Schedule Sprint Q+ Q.B window se Prisma migration cycle attivo. Or post-Sprint-Q+ closure standalone.

## Tier NEW — cross-domain audit residue (gated)

### V9. TKT-ANCESTORS-CONSUMER 297 proposal entries

P1. `data/core/ancestors/` 297 proposal entries zero runtime consumer.

| Option | Cosa cambia |
|---|---|
| **A) Build consumer service** (~3-5h) | Runtime ancestor proposal → catalog ingest. 297 entries data-driven. |
| **B) Reject + delete** | -297 file inert. Repo cleanup. Sunk cost research adapt PR #2176. |
| **C) Sandbox dormant** (default) | Mark `proposal-only` header explicit. Future activation reversible. |

**Raccomandato**: **C** — completist preserve all 297 entries, zero runtime cost (optimizer), reversible. PR #2176 research adapt preservato.

### V10. TKT-TRAIT-ORPHAN-ACTIVE 59/168 traits A/B/C threshold

P2. 59/168 active_effects mai referenziati.

| Option | Cosa cambia |
|---|---|
| **A) Master-dd batch review A/B/C** | ~30min review + ship category C delete batch. Repo clean post. |
| **B) Defer indefinito** | Drift permanente. Future agent confusion. |

**Raccomandato**: **A** — master-dd batch review window single-shot ~30min. Codified delete batch C ship via single PR.

## Tier OPEN-Q — minor master-dd review pending

### V11. T1.3 phone composer no canvas (PR #2151 K4 residue)

Phone composer no canvas → DOM bbox sample vs PNG-only fallback.

| Option | Cosa cambia |
|---|---|
| **A) DOM bbox sample** | Strutturato + accessibilità. ~2h refactor. |
| **B) PNG fallback** (shipped default) | Status quo. PNG cattura full-page coerente. |

**Raccomandato**: **B** shipped default OK. Riapri se phone composer regression.

### V12. BASELINE_WR.cautious empirical N=40 measurement

Default 0.85 placeholder. Measure empirico richiede ~5min sweep N=40.

| Option | Cosa cambia |
|---|---|
| **A) Measure ora** | Threshold drift detection coerente cautious profile. |
| **B) Defer** | Threshold check approssimato cautious. Possibili false positive. |

**Raccomandato**: **A** — ~5min effort, completist threshold parity 3/3 profile.

### V13. npm audit 9 residue (--force breaking changes)

PR #2191 chiuse 18/27. Residue 9 (6 moderate + 3 high) richiedono `npm audit fix --force` major version bump.

| Option | Cosa cambia |
|---|---|
| **A) Force update + verify tests** | Risk regression deps major. Effort ~2h verify + roll-back se rotte. |
| **B) Defer indefinitely** | 9 vulnerabilities surface persistent. Security gap moderate-high. |
| **C) Per-dep manual upgrade audit** | ~3-4h audit each dep + selective upgrade. Surgical. |

**Completionist+Optimizer raccomandato**: **C** surgical — completist preserve test stability + optimizer eliminate single-point risk vulnerabilities. Schedule next maintenance session window.

## Tier COLD — standing decisions deferred post-playtest

### V14. OD-002 V6 UI TV dashboard polish

Status: deferred post-TKT-M11B-06 playtest live.

| Option | Cosa cambia |
|---|---|
| **A) Wait playtest** (default) | UI rough-edge stato attuale. Polish data-driven. |
| **B) Polish ora** (~5-7h) | Completist UI canonical. Risk guess-work senza feedback reale. |

**Raccomandato**: **A** — data-driven polish optimizer principle.

### V15. OD-003 Triangle Strategy rollout sequence M14-A/B/M15

Proposta `docs/research/triangle-strategy-transfer-plan.md`. ~35h aggregate.

| Option | Cosa cambia |
|---|---|
| **A) Sequence canonical M14-A → M14-B → M15** (default proposed) | Pillar P1 rafforzato → P4 sblocca 🟡++ → 🟢 cand → P3 finalizza. |
| **B) Parallel M14-A + M14-B** | Conflict potenziale `vcScoring.js` + `combat/`. Sconsigliato. |

**Raccomandato**: **A canonical** post-playtest data.

### V16. OD-004 Game-Database HTTP runtime Alt B

Status: flag-OFF, scaffold ADR-2026-04-14. Activate post-sibling-prod-ready.

| Option | Cosa cambia |
|---|---|
| **A) Wait sibling prod-ready** (default) | Drift schema rischio se entrambi evolvono indipendentemente. |
| **B) Activate ora local stub** | Smoke testing dual-ownership. Risk crash runtime se Game-Database missing. |

**Raccomandato**: **A wait** — re-evaluate post-M14.

### V17. OD-005 Game Balance & Economy Tuning skill (mcpmarket)

Status: identificata shopping list, non installata.

| Option | Cosa cambia |
|---|---|
| **A) Install post-playtest** (default) | Test-driven adoption su `docs/playtest/*-calibration.md`. |
| **B) Install proattivo ora** | Pre-data over-engineer risk. |

**Raccomandato**: **A wait playtest**.

## Tier RESOLVED — sera closure (post-cascade)

| ID | Verdict morning | Resolution sera |
|---|---|:-:|
| Morning V1 | MC build push blocked | ✅ #2184 PAT-based + #2188 E2E validation |
| Morning V2 | PR #2156 sweep YAML | ✅ MERGED (auto-merge naturale) |
| Morning V13 | TKT-TRAIT-MECH-NO-HANDLER 31 | ✅ #2185 trait_native 39 abilities (correct count post-audit) |
| Morning V11 | TKT-MUT-AUTO-TRIGGER Phase 5 | ✅ partial #2193 (10/12 kinds), residue 2/12 → V8 sera |
| Morning V17 | TKT-NIGHTLY-WORKFLOW-NIT-1+3 | ✅ #2184 + verified pre-shipped #2155 |
| Morning V18 | TKT-TERRAIN-FLAKY | ✅ verified pre-fixed + bundle #2193 4 loops 12→30 |
| Morning V14 | TKT-TRAIT-ORPHAN 59 | Same as sera V10 (pending master-dd review) |
| Browser Azione 1 | AUTODEPLOY_PAT setup | ✅ Chrome MCP autonomous + token live |
| Browser Azione 2 | Skiv Monitor toggle | ✅ Già done verified |
| Cascade approval | 4 PR cascade L3 | ✅ All MERGED #2185+#2186+#2184+#2187 |

## Aggregate effort sera completionist+optimizer raccomandazioni

| Tier | Items | Effort cumulative | Trigger |
|---|---|:-:|---|
| HOT (V1+V2+V3) | Auto-PR cascade + worktree cleanup | ~15min autonomous | Now |
| MEDIUM (V4+V5+V6+V7+V8) | Phase B γ + Sprint Q+ Q.A→Q.E + OD-022 + Mutation Phase 6 | ~25-30h gated | Post-2026-05-14 |
| NEW (V9+V10) | Ancestors C sandbox + Trait orphan A review | ~30min master-dd review + ~3-5h Phase 6 | Post-Sprint-Q+ |
| OPEN-Q (V11+V12+V13) | T1.3 B + cautious A + npm audit C surgical | ~5-9h | Maintenance window |
| COLD (V14+V15+V16+V17) | Wait playtest defaults | 0h ora, ~40-50h gated | Post-TKT-M11B-06 |

**Total HOT immediate** = ~15min autonomous (Skiv + MC auto-PR merge + worktree cleanup).

**Total post-Phase-B-accept** = ~30-35h cumulative ~6-8 sessioni autonomous + ~50min master-dd review burden.

## Forbidden path grants pending consolidation

Items requiring master-dd grant explicit:

- V4 Phase B ADR §13.3 fill (canonical doc, not technically forbidden but high-stakes)
- V5+V6 Sprint Q+ Q-1 + Q-2 (`packages/contracts/` + `migrations/`)
- V7 OD-022 swarm-side coordination
- V8 Mutation Phase 6 Prisma migration 0008+/0009+

Bundle grant strategy single phrase post-Day-8 verdict:

> _"Phase B γ accept + Sprint Q+ Q.A kickoff cascade + Mutation Phase 6 Prisma migration window + OD-022 bundle Q.C"_
