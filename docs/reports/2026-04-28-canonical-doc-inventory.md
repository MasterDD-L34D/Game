---
title: 'Inventario canonical doc — cross-reference audit 2026-04-28'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-28'
source_of_truth: false
language: it
review_cycle_days: 14
---

# Inventario doc canonical "What game is Evo-Tactics" — 2026-04-28

Shortlist 35 doc game-defining. Scope: Tier 1-6 dichiarato. Skip espliciti rispettati.
Prodotto da: `repo-archaeologist` excavate + curate mode.

---

## Metodologia

- Scope: doc che rispondono "cosa è Evo-Tactics" (vision, mechanics, state, decisioni).
- Esclusi: governance/, generated/, archive/historical-snapshots/, incoming/, per-domain
  deep-dive reports (synth in SYNTHESIS già esistente).
- `last_verified` da frontmatter YAML. Se assente → "n/a".
- Age bucket: **fresh** = last_verified ≥ 2026-04-21 | **aging** = 2026-04-15..20 |
  **stale** = < 2026-04-15.

---

## Tier 1 — "What game is" canonical SOT (docs/core/)

| # | Path | LOC | last_verified | doc_status | Scope summary | Age |
|---|------|----:|--------------|-----------|---------------|-----|
| T1-01 | `docs/core/01-VISIONE.md` | 14 | 2026-04-14 | active | Vision statement + one-liner canonical | stale |
| T1-02 | `docs/core/02-PILASTRI.md` | 107 | 2026-04-27 | active | 6-pilastri canonical P1-P6 + runtime score + authority map | fresh |
| T1-03 | `docs/core/03-LOOP.md` | 17 | 2026-04-14 | active | Game loop macro (turn-encounter-campaign) | stale |
| T1-04 | `docs/core/10-SISTEMA_TATTICO.md` | 20 | 2026-04-14 | active | Tactical system overview | stale |
| T1-05 | `docs/core/11-REGOLE_D20_TV.md` | 207 | 2026-04-17 | active | d20 rules + TV format | aging |
| T1-06 | `docs/core/15-LEVEL_DESIGN.md` | 154 | 2026-04-16 | active | Encounter templates + PCG schema | aging |
| T1-07 | `docs/core/20-SPECIE_E_PARTI.md` | 20 | 2026-04-14 | active | Species + body parts brief | stale |
| T1-08 | `docs/core/22-FORME_BASE_16.md` | 16 | 2026-04-14 | active | 16 MBTI forms | stale |
| T1-09 | `docs/core/24-TELEMETRIA_VC.md` | 18 | 2026-04-16 | active | VC telemetry system | aging |
| T1-10 | `docs/core/26-ECONOMY_CANONICAL.md` | 171 | 2026-04-20 | active | SF/PE/Seed economy | aging |
| T1-11 | `docs/core/27-MATING_NIDO.md` | 18 | 2026-04-16 | active | Mating + Nido stub | aging |
| T1-12 | `docs/core/40-ROADMAP.md` | 51 | 2026-04-20 | active | Sprint roadmap | aging |
| T1-13 | `docs/core/51-ONBOARDING-60S.md` | 193 | 2026-04-21 | active | 60s onboarding flow canonical | fresh |
| T1-14 | `docs/core/90-FINAL-DESIGN-FREEZE.md` | 759 | 2026-04-15 | **draft** | Pre-pillar freeze snapshot | aging |
| T1-15 | `docs/core/00-SOURCE-OF-TRUTH.md` | 1341 | 2026-04-16 | active | Full system narrative SoT v4 | aging |
| T1-16 | `docs/core/00-GDD_MASTER.md` | 179 | 2026-04-16 | active | GDD master index | aging |
| T1-17 | `docs/core/DesignDoc-Overview.md` | 96 | 2026-04-14 | active | Design doc overview map | stale |

**Tier 1 subtotal**: 17 doc · 3 fresh / 8 aging / 6 stale · 1 draft status.

---

## Tier 2 — Vertical slice + stato dell'arte (docs/reports/)

| # | Path | LOC | last_verified | doc_status | Scope summary | Age |
|---|------|----:|--------------|-----------|---------------|-----|
| T2-01 | `docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md` | 670 | 2026-04-27 | proposed | Full status snapshot + 73 pattern + vertical slice 8-fasi | fresh |
| T2-02 | `docs/reports/2026-04-27-situation-report-late.md` | 187 | 2026-04-27 | active | Cross-PC situation report late (HEAD a5679e81) | fresh |
| T2-03 | `docs/reports/2026-04-26-deep-analysis-SYNTHESIS.md` | 192 | 2026-04-26 | active | 9-domain residual synthesis P0/P1/P2 | fresh |
| T2-04 | `docs/reports/2026-04-27-strategy-research-MASTER-synthesis.md` | 269 | 2026-04-27 | active | Cross-game tier strategy master | fresh |
| T2-05 | `docs/reports/2026-04-27-v3.7-cross-pc-update-synthesis.md` | 287 | 2026-04-27 | active | V3.7 6 opzioni action plan | fresh |
| T2-06 | `docs/reports/2026-04-26-design-corpus-catalog.md` | ~200 | 2026-04-26 | active | Pre-existing corpus catalog v1 | fresh |
| T2-07 | `docs/reports/2026-04-26-design-corpus-catalog-V2.md` | ~200 | 2026-04-26 | active | Pre-existing corpus catalog v2 | fresh |

**Tier 2 subtotal**: 7 doc · 7 fresh · 0 aging · 0 stale.

---

## Tier 3 — Hubs canonical (docs/hubs/)

| # | Path | LOC | last_verified | doc_status | Scope summary | Age |
|---|------|----:|--------------|-----------|---------------|-----|
| T3-01 | `docs/hubs/combat.md` | 132 | 2026-04-17 | active | Combat workstream canonical entrypoint | aging |
| T3-02 | `docs/hubs/flow.md` | 32 | 2026-04-13 | active | Generation pipeline entrypoint | stale |
| T3-03 | `docs/hubs/atlas.md` | 32 | 2026-04-14 | active | Dashboard/telemetry entrypoint | stale |
| T3-04 | `docs/hubs/backend.md` | 35 | 2026-04-13 | active | Backend workstream entrypoint | stale |
| T3-05 | `docs/hubs/dataset-pack.md` | 32 | 2026-04-13 | active | Dataset + pack workstream entrypoint | stale |

**Tier 3 subtotal**: 5 doc · 0 fresh / 1 aging / 4 stale.

---

## Tier 4 — Recent handoffs canonical (docs/planning/)

| # | Path | LOC | last_verified | doc_status | Scope summary | Age |
|---|------|----:|--------------|-----------|---------------|-----|
| T4-01 | `docs/planning/2026-04-27-sprint-abgd-coordinated-handoff.md` | 494 | 2026-04-27 | active | Sprint α/β/γ/δ full spec + pillar score post-merge | fresh |
| T4-02 | `docs/planning/2026-04-27-skiv-personal-sprint-handoff.md` | 402 | 2026-04-27 | active | Skiv portable companion sprint plan | fresh |
| T4-03 | `docs/planning/2026-04-27-bundle-b-recovery-handoff.md` | 157 | 2026-04-27 | active | Bundle B recovery plan | fresh |
| T4-04 | `docs/planning/2026-04-25-illuminator-orchestra-handoff.md` | 311 | 2026-04-25 | active | Illuminator orchestra multi-agent handoff | fresh |

**Tier 4 subtotal**: 4 doc · 4 fresh · 0 aging · 0 stale.

---

## Tier 5 — Project bootstrap (root)

| # | Path | LOC | last_verified | doc_status | Scope summary | Age |
|---|------|----:|--------------|-----------|---------------|-----|
| T5-01 | `PROJECT_BRIEF.md` | 93 | 2026-04-18 | active | Project identity + frozen vision + bootstrap | aging |
| T5-02 | `COMPACT_CONTEXT.md` | 259 | ~2026-04-27 | active | 30s session snapshot (multi-sprint stacked) | fresh |

**Tier 5 subtotal**: 2 doc · 1 fresh / 1 aging / 0 stale.

---

## Tier 6 — ADR canonical post-2026-04-20 (docs/adr/)

| # | Path | last_verified | Status | Scope summary |
|---|------|--------------|--------|---------------|
| T6-01 | `docs/adr/ADR-2026-04-27-pilastri-canonical-6.md` | 2026-04-27 | Accepted | 6-pilastri canonical decision |
| T6-02 | `docs/adr/ADR-2026-04-26-sg-earn-mixed.md` | 2026-04-26 | Accepted | SG earn Opzione C decision |
| T6-03 | `docs/adr/ADR-2026-04-26-spore-part-pack-slots.md` | 2026-04-26 | Accepted | Spore part-pack P2 |
| T6-04 | `docs/adr/ADR-2026-04-23-m12-phase-a-form-evolution.md` | n/a | Accepted | Form evolution engine M12 |
| T6-05 | `docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md` | n/a | Accepted | Jackbox WS P5 networking |

**Tier 6 subtotal**: 5 ADR checked (24 total ADR post-2026-04-20 exist). Shown: most relevant to game-defining.

---

## Summary stats

| Bucket | Count | % of 35 |
|--------|------:|--------:|
| **Fresh** (≥ 2026-04-21) | 15 | 43% |
| **Aging** (2026-04-15..20) | 11 | 31% |
| **Stale** (< 2026-04-15) | 9 | 26% |

**Total doc in shortlist**: 35 (17 T1 + 7 T2 + 5 T3 + 4 T4 + 2 T5 + 5 T6 partial)

**Critical stale**: 6 Tier 1 core docs with `last_verified: 2026-04-14` — 13+ giorni fa,
11+ sprint successivi. Tier 3 hubs: 4/5 stale (last_verified 2026-04-13/14).

---

## Top-3 candidates for immediate curation attention

1. **`docs/core/00-SOURCE-OF-TRUTH.md`** (T1-15, 1341 LOC, aging) — networking section §16
   dice "🟡 ADR proposto, non implementato" ma M11 Jackbox è LIVE da PR #1680. Drift
   confonde agent + developer che lo leggono come SOT.

2. **`docs/hubs/combat.md`** (T3-01, aging) + tutte le hubs (T3-02..05, stale) — hub sono
   entrypoint canonici ma last_verified 2026-04-13/17. Sprint M17-M20 + α/β/γ/δ shipped
   dopo senza aggiornamento hub.

3. **`docs/core/90-FINAL-DESIGN-FREEZE.md`** (T1-14, 759 LOC, `doc_status: draft`) —
   unico doc Tier 1 con status draft. Mai promosso ad active nonostante contenga freeze
   reference usato in altri doc.

---

*Generato: repo-archaeologist excavate mode · 2026-04-28*
*Metodologia: Read frontmatter YAML + LOC count via wc -l. NON content fabricato.*
