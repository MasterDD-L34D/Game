---
title: 'Cogmind — Tooltip stratificati base+expand (P2+P3 quick-win UI)'
museum_id: M-2026-04-27-009
type: research
domain: combat_ui
provenance:
  found_at: docs/research/2026-04-26-tier-b-extraction-matrix.md#3-cogmind-2015
  git_sha_first: c4a0a4d5
  git_sha_last: 6480e025
  last_modified: 2026-04-26
  last_author: docs-team
  buried_reason: unintegrated
relevance_score: 4
reuse_path: 'Minimal: tooltip base+expand on hover (~4-6h) / Moderate: trait cost_ap multi-cost extension (~8h) / Full: identity = equipaggiamento Cogmind philosophy (~20h)'
related_pillars: [P2, P3]
status: curated
excavated_by: claude-code (deep extraction pass-2 2026-04-27)
excavated_on: 2026-04-27
last_verified: 2026-04-27
---

# Cogmind — Tooltip stratificati base+expand (quick-win UI)

## Summary (30s)

- **4/5 score** — Cogmind è gold standard "identità = equipaggiamento + trade-off espliciti per ogni componente". UI a strati: info base sempre visibile, dettagli on-demand expand.
- **Quick win ≤6h**: Tooltip stratificati su trait/ability con expand on hover/select. Trait `cost_ap` esistente parziale → multi-cost (slot/energia/vulnerabilità) extension.
- **Tier B ALTA priority** — 4-6h effort minimal sblocca P2+P3 chiarezza decisionale per ogni componente trait/ability.

## What was buried

Tier B matrix #3 categorizza Cogmind come donor primario P2+P3. 1 pattern transferable concreto:

- 🔴 **Trait `cost_ap` esteso a multi-cost** (slot/energia/vulnerabilità) + Tooltip stratificati con expand on hover/select
- ⏸️ **Browser-only Flash legacy** — out of scope
- ⏸️ **Roguelike permadeath** — anti-pattern co-op

Lesson chiave: trade-off espliciti per ogni componente. UI a strati base→expand riduce cognitive load mantenendo depth on-demand.

## Why it might still matter

### Pillar match

- **P2 Evoluzione 🟡++**: trait_mechanics catalog ha `cost_ap` per molti trait, ma tooltip non mostrano trade-off completo. Multi-cost extension chiarisce decisione player.
- **P3 Specie×Job 🟡**: identità = equipaggiamento — ogni job ha perk + trait pool, tooltip stratificati fanno emergere identità decision-by-decision.

### Convergenza UI Tooltip stratificati (3 fonti)

- **Cogmind** (questo, gold standard)
- **Slay the Spire** intent preview (Tier A #1, info-on-entity)
- **Halfway** UI surface ALL numbers (Tier B #1)

### File targets

- Trait mechanics: [`packs/evo_tactics_pack/data/balance/trait_mechanics.yaml`](../../../packs/evo_tactics_pack/data/balance/trait_mechanics.yaml) — `cost_ap` field già presente
- Render: [`apps/play/src/render.js`](../../../apps/play/src/render.js) — tooltip rendering
- Style: [`apps/play/src/style.css`](../../../apps/play/src/style.css) — tooltip CSS layer
- UI overlay pattern: [`apps/play/src/formsPanel.js`](../../../apps/play/src/formsPanel.js) — expand pattern reference

### Cross-card relations

- M-2026-04-27-002 [Tactics Ogre HP Floating](combat-tactics-ogre-hp-floating-charm.md) — convergence info-on-entity
- M-2026-04-27-006 [ITB Telegraph](ui-itb-telegraph-deterministic.md) — visibility paradigm
- M-2026-04-27-001 [FFT CT bar + Wait + Facing](combat-fft-ct-bar-wait-facing-crit.md) — temporal layer

## Concrete reuse paths

### Minimal — Tooltip base+expand (~4-6h)

1. **CSS layer base+expand** (~1h): `apps/play/src/style.css` — `.tooltip-base` (always visible) + `.tooltip-expanded` (on hover/long-press)
2. **Render extension** (~2h): `apps/play/src/render.js` `drawTraitTooltip(trait, x, y)` — base= 1 line summary, expanded= full effects + cost + cooldown + trade-off
3. **Trait multi-cost field** (~1h): aggiungere `cost_slot`, `cost_energy`, `cost_vulnerability` a `trait_mechanics.yaml` (additive, default null)
4. **Smoke test** (~30min): 5 trait con multi-cost mostrati nel tooltip durante encounter playable

### Moderate — Trait cost_ap multi-cost extension (~8h)

1. - Multi-cost authoring 26/33 trait_mechanics no active_effects entry audit
2. - UI badge per cost type (icona slot/energia/vulnerabilità)
3. - Resolver consume multi-cost in `resolveAttack()` / `applyAbility()`

### Full — Identity = equipaggiamento philosophy (~20h)

- Estendi pattern a job perk + form mutation (universal tooltip system)
- "Identità" panel diegetic: vedi tutti i tuoi trait + perk + form attivi con trade-off totale
- Auto-derive identity score (es. "Tank +3 / Mobility -1 / Energy efficient")

## Tickets proposed

- [`TKT-UI-COGMIND-TOOLTIP-STRATIFICATI`](../../../data/core/tickets/proposed/TKT-UI-COGMIND-TOOLTIP-STRATIFICATI.json) (5h, ui-design-illuminator) — **quick win Tier B**

## Sources / provenance trail

- Source matrix: [`docs/research/2026-04-26-tier-b-extraction-matrix.md`](../../research/2026-04-26-tier-b-extraction-matrix.md) #3
- Cogmind (Grid Sage Games 2015+) — Kyzrati
- Roguelike Celebration / GDC postmortems Cogmind tooltip philosophy
- Stato arte: [`docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md`](../../reports/2026-04-27-stato-arte-completo-vertical-slice.md) §B.3 #3

## Risks / open questions

- **Tooltip overlap**: 4-6 trait simultanei → tooltips overlap. Cap max 1 tooltip espanso simultaneo.
- **Touch input mobile**: hover non disponibile su phone. Long-press 300ms come trigger expand.
- **Multi-cost authoring debt**: 33 trait_mechanics × ~2 min/multi-cost = ~1h authoring incremental.
- **Performance**: tooltip render frame-by-frame potenzialmente costoso. Cache rendered tooltip per trait_id.

## Anti-pattern guard

- ❌ NON tooltip enciclopedia 200+ word (Halfway lesson — show numbers, not lore)
- ❌ NON nested tooltip 2-livelli (cognitive overload)
- ❌ NON tooltip auto-popup senza hover (anti-pattern attention)
- ✅ DO base sempre visibile + expand on demand
- ✅ DO trade-off espliciti (Cogmind philosophy)
- ✅ DO numeric values reali (no opacity)
