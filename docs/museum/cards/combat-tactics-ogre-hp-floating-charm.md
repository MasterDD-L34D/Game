---
title: 'Tactics Ogre Reborn — HP floating bar + Charm recruit + Auto-battle (P1 UI canonical stack)'
museum_id: M-2026-04-27-002
type: research
domain: combat_ui
provenance:
  found_at: docs/research/2026-04-26-tier-s-extraction-matrix.md#3-tactics-ogre-reborn-square-enix-2022--p1-ui--p3
  git_sha_first: c4a0a4d5
  git_sha_last: 6480e025
  last_modified: 2026-04-26
  last_author: docs-team
  buried_reason: unintegrated
relevance_score: 5
reuse_path: 'Minimal: HP floating refactor (~5-7h) / Moderate: + Charm recruit boss + Auto-battle button (~16h) / AP pip floating shipped #1901'
related_pillars: [P1, P3]
status: curated
excavated_by: claude-code (deep extraction pass-2 2026-04-27)
excavated_on: 2026-04-27
last_verified: 2026-04-27
---

# Tactics Ogre Reborn — HP floating + Charm + Auto-battle (P1 canonical stack)

## Summary (30s)

- **5/5 score** — `docs/core/44-HUD-LAYOUT-REFERENCES.md` ranking ⭐⭐⭐⭐⭐ ADOPT canonical. AP pip indicator floating shipped PR #1901 (primo pezzo del bundle).
- **3 pattern residui** ad alto-ROI: HP bar floating sopra sprite (refactor render.js, ~5-7h), Charm/recruit boss via dialogue (~8h), Auto-battle button (~3h, predict_combat backend N=1000 esiste).
- **Surface-DEAD anti-pattern**: 44-HUD-LAYOUT-REFERENCES doc canonical adopted, ma render.js attuale ha sidebar HUD non floating. Engine = doc, surface = sidebar legacy.

## What was buried

Tier S extraction matrix categorizza Tactics Ogre Reborn come **donor canonical P1 UI** (5/5). 5 cosa-prendere identificati:

- ✅ **AP pip indicator floating** — shipped PR #1901 (primo pezzo)
- 🔴 **HP bar floating sopra sprite** — refactor render.js sidebar→overlay sprite, breaking change cosmetic
- 🔴 **Charm system** (recruit boss enemy via dialogue) — debrief dialogue + roster add
- 🔴 **Class change altare** — allinea con job switching roadmap (bookmark)
- 🔴 **Auto-battle quick simulation button** — UI button "auto-resolve" su predict_combat N=1000 (backend live)
- ⏸️ **WORLD system rewind** — defer, costoso state machine

## Why it might still matter

### Pillar match

- **P1 Tattica leggibile 🟢 candidato**: HP floating + AP pip + StS damage forecast = UI canonical "info-on-entity" stack. Quando shipped completo → P1 🟢 definitivo.
- **P3 Specie×Job 🟡**: Charm/recruit boss = espansione roster post-battle, sinergico con Sprint Nido/lineage chain shipped Sprint D.

### Convergenza UI Telegraph (cross-tier signal)

7 fonti convergono su info-attached-to-entity:

- StS intent preview (Tier A #1)
- ITB telegraph (Tier A #4)
- **Tactics Ogre HP floating** (questo)
- Halfway numbers visible (Tier B #1)
- Cogmind tooltip stratificati (Tier B #3)
- FFT CT bar (M-2026-04-27-001)
- Battle Brothers ATB initiative (Tier B #11)

Tension diegetic-vs-overlay: Dead Space contrario (no overlay), Tactics Ogre = overlay-rich pragmatic middle.

### File targets

- HUD canonical doc: [`docs/core/44-HUD-LAYOUT-REFERENCES.md`](../../core/44-HUD-LAYOUT-REFERENCES.md) ⭐⭐⭐⭐⭐
- Render: [`apps/play/src/render.js`](../../../apps/play/src/render.js) — sidebar HUD attuale
- Predict combat backend: `apps/backend/services/combat/predictCombat.js` (N=1000 sim live)
- Roster add: [`apps/backend/routes/sessionHelpers.js`](../../../apps/backend/routes/sessionHelpers.js)

### Cross-card relations

- M-2026-04-27-001 [FFT CT bar + Wait + Facing](combat-fft-ct-bar-wait-facing-crit.md) — combina temporal CT bar + spatial HP floating
- M-2026-04-27-007 [ITB Telegraph](ui-itb-telegraph-deterministic.md) — full overlay paradigm
- M-2026-04-25-005 [Magnetic Rift Resonance](old_mechanics-magnetic-rift-resonance.md) — pattern HUD adoption canonical

## Concrete reuse paths

### Minimal — HP floating refactor (~5-7h)

1. `apps/play/src/render.js` `drawUnit()` — sostituire sidebar HP indicator con overlay sopra sprite (16×3px bar + numerical)
2. CSS adjust per safe zone TV — bar visibile ma non occlude sprite
3. Backward compat: env flag `HUD_LAYOUT=legacy|floating` durante transition
4. Regression test snapshot UI

### Moderate — Charm recruit + Auto-battle (~11h)

1. **Charm recruit** (~8h):
   - Debrief dialogue trigger su victory + boss alive
   - `recruit_chance: 0.0..1.0` formula based on dialogue success
   - Roster add via `sessionHelpers.addUnitToRoster(uid, sid)`
   - 5-6 dialogue line per boss type (narrative authoring)
2. **Auto-battle button** (~3h):
   - UI button "auto-resolve" wrap `predict_combat()` N=1000
   - Display average outcome + win probability
   - "Use this resolution" → applica state delta direttamente

### Full — Class change altare + WORLD rewind (~30h+)

- Class change altare: in-town job swap (bookmark, allinea jobs roadmap)
- WORLD rewind: replay state machine (~25h costoso, defer)

## Tickets proposed

- [`TKT-UI-TACTICS-OGRE-HP-FLOATING`](../../../data/core/tickets/proposed/TKT-UI-TACTICS-OGRE-HP-FLOATING.json) (6h, ui-design-illuminator) — high-ROI
- [`TKT-NARRATIVE-TACTICS-OGRE-CHARM`](../../../data/core/tickets/proposed/TKT-NARRATIVE-TACTICS-OGRE-CHARM.json) (8h, narrative-design-illuminator)
- [`TKT-UI-TACTICS-OGRE-AUTO-BATTLE`](../../../data/core/tickets/proposed/TKT-UI-TACTICS-OGRE-AUTO-BATTLE.json) (3h, ui-design-illuminator) — quick win, backend live

## Sources / provenance trail

- Source matrix: [`docs/research/2026-04-26-tier-s-extraction-matrix.md`](../../research/2026-04-26-tier-s-extraction-matrix.md) §3
- HUD canonical: [`docs/core/44-HUD-LAYOUT-REFERENCES.md`](../../core/44-HUD-LAYOUT-REFERENCES.md)
- PR shipped: [#1901 c6fa8d90](https://github.com/MasterDD-L34D/Game/pull/1901)
- Tactics Ogre Reborn (Square Enix 2022) — re-release Tactics Ogre Let Us Cling Together (1995), lead Yasumi Matsuno
- Stato arte: [`docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md`](../../reports/2026-04-27-stato-arte-completo-vertical-slice.md) §B.1.2

## Decision codified 2026-04-27

**HUD canonical = Tactics Ogre overlay-rich** (no archive Dead Space). Hybrid approach selettivo:

- ✅ **Tactics Ogre base layer**: HP bar floating sopra sprite + AP pip + intent forecast + StS damage forecast (tutti shipped o in-flight)
- ✅ **Dead Space additive layer** (cherry-pick 2 pattern compatibili):
  - **HP critico pulse interno sprite** (low HP = pulsing red tint del body) — già shipped #1906 HP critico pulse animation
  - **Holographic projection cone** per AOE ability targeting — diegetic stretch goal (~5h) per AOE telegraph

**Combina**: precise (Tactics Ogre bar) + emozionale (Dead Space tint) = layered feedback. NON scegli uno O l'altro.

## Risks / open questions

- **Breaking change cosmetic**: HP floating refactor rompe screenshot snapshot test esistenti. Update + flag transition.
- ~~Conflict Dead Space diegetic UI~~ ✅ **risolta 2026-04-27**: hybrid pattern — vedi Decision codified sopra.
- **Auto-battle UX**: rischio sostituire decisioni player se troppo accessibile. Limit to "boss escape" / "trivial cleanup" scenarios.
- **Charm recruit balance**: troppo recruit boss abundance → power creep. Cap 1 boss recruited per campaign.

## Anti-pattern guard

- ❌ NON card-based RNG (Tactics Ogre Let Us Cling Together randomness pickup tile)
- ❌ NON Loyalty/morale meter opaco
- ❌ NON crafting deep equipment (scope creep, creature-focused)
- ❌ NON 70+ ore campaign (sessione roguelike compact 1-2h)
- ✅ DO mantenere overlay visibile su safe zone TV (10-foot rule)
