---
title: "Pending Verdicts Inventory — Completionist + Optimizer Lens"
date: 2026-05-10
author: claude-autonomous
type: report
status: live
workstream: ops-qa
slug: 2026-05-10-pending-verdicts-completionist-optimizer
tags: [decisions, open-questions, master-dd-review, completionist, sprint-planning]
---

# Pending Verdicts Inventory — 2026-05-10

User profile: **completista + ottimizzatore**. Default lens = preserve all info, codify all decisions, optimize blast-radius vs effort.

## Tier HOT — surfaced this session, actionable NOW

### V1. MC build workflow push blocked (P0 latent caught dispatch 2026-05-10 11:12 UTC)

Run [25627227469](https://github.com/MasterDD-L34D/Game/actions/runs/25627227469): build verde, push blocked GH006 branch protection main.

| Option | Effort | Blast radius | Cosa cambia |
|---|---|---|---|
| **A) Workflow rewrite → PR-based auto-deploy** | ~30min, forbidden path grant | LOW (PR review gate normale) | Auto-deploy passa via auto-PR `auto/mission-console-dist-YYYY-MM-DD-HHMM` + label `auto-merge-l3-candidate`. Cascade auto-merge L3 7-gate CI. Sicurezza preservata, latenza ~2-5min vs direct push immediato. |
| **B) Bypass branch protection per `github-actions[bot]`** | ~1min userland | MEDIUM (bot scoped, ma erode CI gate) | Toggle Settings → Branches → main → Bypass list. Bot push direct senza CI checks. Erode rule 6/6 status check. Reversibile. |
| **C) GitHub Pages deploy direct** (`actions/deploy-pages@v4`) | ~1h refactor, forbidden path grant | LOW (Pages canonical pattern) | Skip commit `docs/mission-console/`. Pages publish direct da `apps/mission-console/dist`. `docs/mission-console/` diventa source-of-truth deprecata, eventualmente rimossa. Production-clean canonical. |

**Completionist+Optimizer raccomandato**: **C** — pattern Pages canonical, evita il `docs/mission-console/` mirror tree (290+ assets), riduce blast radius commit history, future-proof. Effort 1h una-tantum vs A 30min ricorrente sui ricalc.

**Fallback ottimo**: **A** — preserva tutto il flusso esistente (`docs/mission-console/` GitHub Pages source storica), aggiunge solo PR gate. Zero info lost.

**Sconsigliato**: **B** — erode branch protection, viola spirit "6/6 status check". Anti-pattern.

---

### V2. PR #2156 sweep YAML loader DRAFT → ready-review

[#2156](https://github.com/MasterDD-L34D/Game/pull/2156) scenario diversity sweep harness extension. Codex P2 #1+#2 addressed (commit `072d3e38` + `b3ee75ea`). NIT 2 self-review applied. Master-dd verdict gated.

| Option | Cosa cambia |
|---|---|
| **A) Merge ready-review** | Sweep YAML loader opt-in via `AI_SIM_SWEEP_YAML=1`. Zero impact default path (synthetic-only). Aggiunge runtime path scenarios via `data/scenarios/*.yaml` per multi-wave / objective whitelist. Sblocca scenario diversity sweep canonical. |
| **B) Defer post-Phase-B** | Phase B accept 2026-05-14 → review allora. Risparmio ~10min review now. Sweep YAML diversity rimanda. |
| **C) Reject + close** | Sweep harness resta synthetic-only canonical. PR #2156 archive read-only. Ridotta surface complessità harness. |

**Completionist+Optimizer raccomandato**: **A** — opt-in flag = zero regressione default, additive only. Sblocca multi-wave / objective sweep richiesti per scenario authoring `enc_tutorial_03/04/05`.

---

### V3. Worktree cleanup ~10min userland

8 worktree stale locali (vedi BACKLOG.md L213-225). Effort ~10min `git worktree remove` × 8.

| Option | Cosa cambia |
|---|---|
| **A) Cleanup ora** | Disco free ~few hundred MB locali. Riduce confusione worktree-guard hook. Verifica branch fully merged main pre-remove. |
| **B) Defer post-Phase-B-accept** | Status quo, 8 worktree continuano ad esistere. Zero rischio merge confusion. |

**Raccomandato**: **A** — completist principle, no debris. Bash one-liner via `gh pr list --search "head:<branch> is:merged"` verify pre-remove. Dimmi e procedo.

---

## Tier MEDIUM — gated on Phase B accept (2026-05-14 day 8)

### V4. Phase B trigger 2/3 — Option α full social vs β solo hardware

OD-017 RISOLTA 2026-05-08 (downgrade nice-to-have). Ma 2026-05-14 master-dd verdict explicit ancora gated.

| Option | Cosa cambia |
|---|---|
| **α canonical** (4 amici Discord/WhatsApp + master-dd, ~1-2h userland) | Full social playtest = trigger 2/3 ✅. Phase B accept formal. ADR-2026-05-05 §5 condizioni complete. |
| **β fallback** (master-dd solo 2 device, ~30min) | Trigger ⚠️ borderline. Phase B accept Path β + ADR amendment esplicito. |
| **γ skip** (sintetic Tier 1 7gg grace OK + zero regression conferma) | Phase B accept automatic via amendment OD-017. Soft trigger satisfied senza social playtest. |

**Completionist+Optimizer raccomandato**: **γ** — amendment già shipped. 4-amici social = nice-to-have NON blocker. Sintetic Tier 1 ZERO regression Day 1→2→3 = solid evidence. Phase B accept default 2026-05-14 + zero-regression confirmed.

**Se settimana libera**: **α** preferred — full evidence cross-stack (web v1 archive formal post + 4 phone simultanei stress test reale).

---

### V5. OD-022 evo-swarm pipeline cross-verification gate — formal accept timing

IMPLICIT ACCEPT 2026-05-08 sera (cross-repo evidence convergente: master-dd #2128 swarm-side + Claude #2129 Game-side). Formal verdict + bundle decision pending.

| Option | Cosa cambia |
|---|---|
| **A) Bundle Sprint Q+ kickoff** | OD-022 ~3-4h Game-side residue + 5-6h cross-repo aggiunto a Sprint Q+ Q.A→Q.E ~14-17h = total ~17-21h cumulative ~4-5 sessioni autonomous. Single trigger post-Phase-B-accept. |
| **B) Standalone OD-022 separato post-Sprint-Q+** | Sprint Q+ pure (~14-17h) + OD-022 standalone (~7-9h) sequenziale. Total ~21-26h, +1 trigger gate. |
| **C) Reject OD-022** | Swarm Atto 2 abandoned. Run #5 distillation honesty pass shipped (PR #2108) preserved come archive. 8/13 hallucinated discardati museum card M-2026-05-08-001. |

**Completionist+Optimizer raccomandato**: **A** — bundle riduce overhead context-switch, sfrutta cross-repo coordination momentum. -4h vs B.

---

### V6. Sprint Q+ FULL Q.A→Q.E scope (5 sub-decisione gated)

OD-020 RISOLTA 2026-05-08 (FULL deep scope). Sub-decisione gated post-Phase-B:

1. **GAP-12 LineageMergeService ETL Q-1 ⇄ Q-12 priority order**
2. **YAML schema Q-3 design** (lineage chain merge spec)
3. **Test strategy Q-7** (unit / integration / E2E ratio)
4. **Migration path Q-9** (Prisma additive vs breaking)
5. **Surface UI Q-11** (debrief lineage panel extension)

| Option | Cosa cambia |
|---|---|
| **Standard sequence Q-1→Q-12 cumulative** | Sequential ~3-4 sessioni ~14-17h. Master-dd review gate ogni Q-N completion. |
| **Parallel Q-1+Q-3+Q-7 batch** | Risparmio ~4-5h via parallel context. Master-dd review gate batch end-of-batch. |

**Completionist+Optimizer raccomandato**: **Sequential** — Sprint Q+ design ETL = high-stakes data integrity. Sequential preserva context cleanliness vs parallel context-switching cost.

---

## Tier COLD — older standing decisions

### V7. OD-002 V6 UI TV dashboard polish

Stato: deferred post-playtest. Trigger: post-TKT-M11B-06 playtest live.

| Option | Cosa cambia |
|---|---|
| **A) Wait playtest** (default) | UI rough-edge stato attuale. Polish data-driven post-feedback. |
| **B) Polish ora** (~5-7h proattivo) | Completist UI canonical. Rischio guess-work senza feedback reale. |

**Completionist+Optimizer raccomandato**: **A** — data-driven polish = optimizer principle. Completist preservation: feedback playtest catalogato in `docs/playtest/` per polish round 2.

---

### V8. OD-003 Triangle Strategy rollout sequence M14-A/B/M15

Stato: proposta `docs/research/triangle-strategy-transfer-plan.md`. 3 slice ~35h aggregate.

| Option | Cosa cambia |
|---|---|
| **Sequence M14-A → M14-B → M15** (default proposed) | Pillar P1 rafforzato → P4 sblocca 🟡++ → 🟢 cand → P3 finalizza. ~35h sequenziale ~6-8 sessioni. |
| **Parallel M14-A + M14-B** | Pillar P1 + P4 same window. Conflict potenziale `vcScoring.js` + `combat/` cross-touching. Sconsigliato. |
| **Skip M14-A elevation, focus M14-B Conviction** | P1 already 🟢 = marginal upgrade. P4 priority alta. Risparmio ~10h. |

**Completionist+Optimizer raccomandato**: **Sequence canonical** — preserve proposed rollout, completist principle. Open M14-A ticket post-playtest.

---

### V9. OD-004 Game-Database HTTP runtime Alt B

Stato: flag-OFF, scaffold ADR-2026-04-14. Activate quando sibling repo production-ready.

| Option | Cosa cambia |
|---|---|
| **Wait sibling prod-ready** (default) | Drift schema rischio se entrambi evolvono indipendentemente. |
| **Activate ora con local stub** | Smoke testing dual-ownership content. Rischio crash runtime se Game-Database missing. |

**Completionist+Optimizer raccomandato**: **Wait** — re-evaluate post-M14. Completist preservation: ADR + scaffold preserved.

---

### V10. OD-005 Game Balance & Economy Tuning skill (mcpmarket)

Stato: identificata shopping list, non installata.

| Option | Cosa cambia |
|---|---|
| **Install post-playtest** (default) | Test-driven adoption su `docs/playtest/*-calibration.md` raccolti. |
| **Install proattivo ora** | Skill disponibile per simulation N=40 sweep balance. Rischio over-engineer pre-data. |

**Completionist+Optimizer raccomandato**: **Wait playtest** — optimizer test-driven principle.

---

## Tier NEW — surfaced 2026-05-10 cross-domain audit (P0/P1 design gate)

### V11. TKT-MUT-AUTO-TRIGGER Phase 5 ADR design call

P0 surfaced cross-domain audit 2026-05-10. Mutation engine sans trigger evaluator (biome turn / kill streak / Sistema pressure auto-unlock 0% impl).

| Option | Cosa cambia |
|---|---|
| **A) Build trigger evaluator runtime** (~5-8h) | 30/30 mutation `trigger_examples` runtime-evaluated. Mutation auto-unlock LIVE. Completist gate canonical. |
| **B) Defer Sprint Q+ post-cutover** | Mutation Phase 1+2+3+4 already runtime LIVE (8/12 kinds). Phase 5 = 4 stub kinds residue. Marginal gap. |
| **C) Reject auto-trigger, manual unlock only** | Master-dd / progression event triggers manual via `metaProgression.js`. Eliminate dead `trigger_examples` prose. |

**Completionist+Optimizer raccomandato**: **A** post-Phase-B — completist principle: 30/30 mutations evaluator-complete. Effort moderato, blast radius contained (additive evaluator). Schedule Sprint Q+ window.

---

### V12. TKT-ANCESTORS-CONSUMER 297 proposal entries

P1. `data/core/ancestors/` 297 proposal entries zero runtime consumer (proposal-only files inert).

| Option | Cosa cambia |
|---|---|
| **A) Build consumer service** (~3-5h) | Runtime ancestor proposal → catalog ingest. 297 entries data-driven. |
| **B) Reject + delete** | -297 file inert. Repo cleanup. Sunk cost research adapt PR #2176. |
| **C) Sandbox dormant** | Mark `proposal-only` header explicit. Future activation reversible. |

**Completionist+Optimizer raccomandato**: **C** — sandbox preserves all 297 entries (completist), zero runtime cost (optimizer), reversible. PR #2176 research adapt preservato.

---

### V13. TKT-TRAIT-MECH-NO-HANDLER 31 traits dead economy

P1 ~5-8h. 31 traits in `trait_mechanics.yaml` hanno PT cost + damage tuned ma ZERO active_effects handler.

| Option | Cosa cambia |
|---|---|
| **A) Author 31 handlers** (~5-8h) | 31 traits LIVE economy. Player può equipare + payoff coerente. |
| **B) Strip mechanics** | trait_mechanics.yaml ridotto 31 entries. Completist preservation lost. |
| **C) Mark sandbox `[future]`** | YAML front-matter `status: future`. Loader skip. Reversibile. |

**Completionist+Optimizer raccomandato**: **A** sequenziale — completist principle: 31/31 mechanics ↔ handler parity. Schedule batch authoring post-Sprint-Q+.

---

### V14. TKT-TRAIT-ORPHAN-ACTIVE 59/168 traits A/B/C threshold

P2. 59/168 active_effects mai referenziati in code/data/scenario.

| Option | Cosa cambia |
|---|---|
| **A) Categorize A=keep / B=defer / C=delete** | Master-dd verdict per ogni 59 trait. ~30min review. Repo clean post-batch C delete. |
| **B) Defer indefinito** | Drift permanente. Future agent confusion. |

**Completionist+Optimizer raccomandato**: **A** — master-dd review batch ~30min. Codified delete batch C ship via single PR. Resume trigger phrase canonical: _"TKT-TRAIT-ORPHAN-ACTIVE master-dd verdict A/B/C threshold + lista 59 IDs full audit + ship category C delete batch"_.

---

## Tier OPEN-QUESTIONS — minor master-dd review pending

### V15. T1.3 phone composer no canvas (PR #2151 K4)

Phone composer no canvas → DOM bbox sample vs PNG-only fallback.

| Option | Cosa cambia |
|---|---|
| **A) DOM bbox sample** | Strutturato + accessibilità. Effort ~2h refactor. |
| **B) PNG fallback** (shipped default) | Status quo. PNG cattura full-page coerente. |

**Raccomandato**: **B** — shipped default OK. Riapri se phone composer regression.

---

### V16. BASELINE_WR.cautious empirical N=40 measurement

Default 0.85 placeholder. Measure empirico richiede ~5min sweep N=40.

| Option | Cosa cambia |
|---|---|
| **A) Measure ora** | Threshold drift detection coerente cautious profile. |
| **B) Defer** | Threshold check approssimato cautious. Possibili false positive. |

**Raccomandato**: **A** — ~5min effort, completist threshold parity 3/3 profile. Schedule next nightly cron review window.

---

### V17. TKT-NIGHTLY-WORKFLOW-NIT-1+3 (forbidden path)

NIT 1: port 3341 hardcoded comment workflow. NIT 3: comment exit-code contract reference.

| Option | Cosa cambia |
|---|---|
| **A) Bundle next workflow PR** | ~40min cumulative NIT cleanup. Master-dd grant gate. |
| **B) Defer** | NIT debris permanent. |

**Raccomandato**: **A** — bundle con MC build fix V1 (forbidden path grant comune). Single PR gate.

---

### V18. TKT-TERRAIN-FLAKY (RCA pending)

`tests/api/terrainReactionsWire.test.js:119` flaky failure rerun-on-pass detected 2026-05-10 dispatch #25616222307.

| Option | Cosa cambia |
|---|---|
| **A) RCA + fix ora** (~1h+30min) | Test stable. CI confidence canonical. |
| **B) Defer next ricorrenza** | Risparmio 1.5h ora. Rischio re-fire. |

**Raccomandato**: **A** — completist test gate. Schedule prossima sessione manutenzione.

---

## Aggregate effort (raccomandazioni completionist+optimizer)

| Tier | Items | Effort cumulative |
|---|---|:---:|
| HOT (V1+V2+V3) | MC fix C + #2156 merge + worktree cleanup | ~1h 10min |
| MEDIUM (V4+V5+V6) | Phase B γ + OD-022 bundle + Sprint Q+ sequential | ~17-21h gated post-2026-05-14 |
| COLD (V7+V8+V9+V10) | Wait playtest defaults | 0h ora, ~40-50h gated post-playtest |
| NEW (V11+V12+V13+V14) | Mut auto-trigger A + ancestors C + 31 handler A + orphan trait audit A | ~9-14h post-Phase-B |
| OPEN-Q (V15-V18) | T1.3 B + cautious A + workflow NITs A + terrain RCA A | ~2.5-3h |

**Total HOT+OPEN-Q immediate** = ~3.5-4h actionable autonomous (forbidden path grants gated where applicable).

**Total post-Phase-B-accept** = ~26-35h cumulative ~6-8 sessioni autonomous.

## Forbidden path grants pending consolidation

Items che richiedono master-dd grant explicit `.github/workflows/` o `migrations/` o equivalenti:

- V1 MC build fix (workflow rewrite)
- V11 mutation evaluator Phase 5 (potentially)
- V13 trait handler 31 batch (active_effects modifier)
- V17 nightly workflow NITs

Bundle grant strategy: single trigger phrase _"OK fix bundle workflow + active_effects + Sprint Q+ scope"_ → cascade autonomous Sprint M+.
