---
title: "Economy Deep Analysis — PE/PI/PT/PP/SG (2026-04-26)"
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-04-26'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [economy, audit, pe, pi, sg, meta-progression]
date: 2026-04-26
---

# Economy Deep Analysis — Audit (2026-04-26)

> Output di `economy-design-illuminator` agent. Spawn da catalog parent: [`docs/reports/2026-04-26-design-corpus-catalog.md`](2026-04-26-design-corpus-catalog.md).

## Summary — Gap Priority

### 🔴 P0 — 2 orphan currencies (SF + Seed)

Emit attivo, zero sink. Viola Hades principle. Fix opzioni:
- **SF (skip_fragment)**: A=disable emission finché nest sink live; B=stub 5 SF→reward re-roll; C=accelerate nest M10.
- **Seed**: rimuovi `seed_earned: 0` da debrief payload fino a V3 mating shipped.
Effort: A+Seed cleanup = ~30min each. Ship immediately.

### 🔴 P0 — Q19 checkpoint unresolved blocks PE anti-inflation

PE earn ~8/encounter. Forma evolve sink = 8 PE one-time × 3 forms max = 24 PE lifetime sink campaign. Campaign 10-encounter base = 80 PE earned. **Ratio 80:24 = 3.3× surplus**. PE→PI drena il surplus (floor(56/5) = 11 PI extra) ma PI shop Monte Carlo mostra 0% stockpile — drain funziona. **Inflation è solo nell'intermediary PE pool** tra checkpoint.

Decision tree user: Opzione A (ogni mission victory conversion) = lowest latency, StS gold analogy, raccomandato.

### 🟡 P1 — SG underflow tutorial

5 dmg threshold troppo alto vs tutorial damage (~10-15 dmg total = 1-2 SG max). Surge Burst inaccessibile encounter 1-2. Fix: stub +1 SG initial in tutorial encounter config (`data/core/encounters/*.yaml`), costo ~2h.

### 🟡 P1 — Personality component silently 0 in Tri-Sorgente

Se `mbti_type` null (player non ha ancora VC score) → `personalityComponent = 0`. Offer degrada a roll-only. No error, no log, no feedback. Add fallback MBTI in session state: `mbti_type: 'NEUTRA'` default triggers NEUTRA bias in packRecommender. ~1h fix.

### 🟢 P2 — PI shop cost-curve (confirmed sano)

Monte Carlo N=1000 closed Gap 4. Strategy spread 4.38 items (cheapest) vs 2.0 items (power). Residual stockpile 1.6% max. No action needed.

### 🟢 P2 — LW2 supply+intel strategic layer (future)

Meta-progression upgrade: nest slot scarcity → mutually exclusive actions (recruit/upgrade/harvest). V4+ design only. ~8-12h.

## Pack systems duality

`packRoller.js` (M12 Phase B, session scope, `data/packs.yaml`) + `formPackRecommender.js` (V4, char creation scope, `data/core/forms/form_pack_bias.yaml`). Diversi scope ma semantica items sovrapposta — **rischio confusione UI**. NON è bug ma manca integrazione esplicita.

## Feedback loops audit

| Loop | Tipo | Counter | Verdict |
|---|---|---|---|
| Victory → PE → Form evolve → snowball | Positive | Pressure tier V7 + mission timer M13 P6 | 🟢 |
| Victory → PE → PI shop → trait_T2 → snowball | Positive | max_copies + exclusion_tags + duplicate_penalty | 🟢 |
| Form evolve → VC bonus boost → more PE | Positive | Confidence threshold 0.55 | 🟢 |
| Damage taken → SG → Surge Burst | Negative | cap 2/turn + pool max 3 | 🟢 rubber-band |
| Low VC → Recovery pool R Tri-Sorgente | Negative | pool weighting | 🟢 Mario Kart |
| PE accumulation senza cap | Positive | **NESSUNO** | 🔴 Q17 unresolved |
| SF accumulation senza sink | Positive | **NESSUNO** | 🔴 orphan |

## Relevant files

- `apps/backend/services/combat/sgTracker.js` — SG earn wired, accumulate OK
- `apps/backend/services/rewardEconomy.js` — PE earn + PE→PI conversion, `seed_earned: 0` stub line 110
- `apps/backend/services/rewards/rewardOffer.js` — Tri-Sorgente pipeline, `skip_fragment_delta: 1` line 231
- `apps/backend/services/forms/packRoller.js` — d20 pack roller (session scope)
- `apps/backend/services/forms/formPackRecommender.js` — V4 form+job recommender (char creation scope)
- `apps/backend/services/metaProgression.js` — NPC affinity/trust/nest tracker
- `apps/backend/routes/forms.js` — form evolution + pack/roll endpoints
- `docs/core/26-ECONOMY_CANONICAL.md` — canonical glossario (A1)
- `docs/balance/macro-economy-source-sink.md` — prior gap analysis (5 gap, Gap 1+2=🔴, Gap 3=🟡, Gap 4+5=🟢)
- `docs/balance/2026-04-25-pi-shop-monte-carlo.md` — Monte Carlo N=1000 chiude Gap 4
- `docs/adr/ADR-2026-04-26-sg-earn-mixed.md` — SG formula canonical
- `docs/adr/ADR-2026-04-21-meta-progression-prisma.md` — Prisma write-through pattern
