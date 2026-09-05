---
title: 'Into the Breach — Telegraph rule + push/pull arrows + kill probability (P1+P5 deterministic)'
museum_id: M-2026-04-27-006
type: research
domain: combat_ui
provenance:
  found_at: docs/research/2026-04-26-tier-a-extraction-matrix.md#4-into-the-breach-subset-games--2018
  git_sha_first: c4a0a4d5
  git_sha_last: 6480e025
  last_modified: 2026-04-26
  last_author: platform-research
  buried_reason: unintegrated
relevance_score: 4
reuse_path: 'Minimal: push/pull arrows overlay (~3h) / Moderate: hand-curate 8 tutorial maps + 6 hardcore (~10h) / Full: telegraph completo + biome map authoring'
related_pillars: [P1, P5]
status: curated
excavated_by: claude-code (deep extraction pass-2 2026-04-27)
excavated_on: 2026-04-27
last_verified: 2026-04-27
---

# Into the Breach — Telegraph rule + push/pull arrows (P1+P5 deterministic)

## Summary (30s)

- **4/5 score** — Into the Breach è gold standard "telegraph rule sacrifice cool for clarity, every time" (GDC 2019). Threat tile overlay shipped PR #1884 (primo pezzo).
- **3 pattern residui**: Push/pull direction arrows + kill probability badge (~3h Min), hand-curate biome maps (~10h Moderate), full telegraph completo.
- **Convergenza determinism rule**: `predictCombat()` esistente già zero RNG hidden. ITB pattern già parzialmente adopted, gap = visual layer overlay.

## What was buried

Tier A matrix #4 categorizza ITB come donor primario P1 + P5 cooperativo. 3 cosa-prendere:

- ✅ **Threat tile overlay rosso** — shipped PR #1884 (ITB telegraph base)
- 🔴 **Push/pull direction arrows** sovrapposte alla grid (visual blast cone before attack)
- 🔴 **Kill probability badge** sopra target threatened
- 🔴 **Hand-made island layout + procedural spawn** — 4 islands × 8 maps handcrafted, enemy types/positions randomized per run

Determinism rule canonical: zero RNG hidden post-player-decision. Player decisions consume forecast accurately.

## Why it might still matter

### Pillar match

- **P1 Tattica leggibile 🟢 candidato**: telegraph rule = reason perché P1 è 🟢 candidato. Push/pull arrows + kill probability chiudono visualization layer.
- **P5 Co-op 🟢 candidato**: shared visibility = co-op planning unblock. Tutti vedono preview = tutti partecipano alla decision.

### Convergenza UI Telegraph (7 fonti)

- StS intent preview (Tier A #1)
- **ITB telegraph** (questo, full grid extension)
- Tactics Ogre HP floating (M-2026-04-27-002)
- Halfway numbers visible (Tier B #1)
- Cogmind tooltip stratificati (Tier B #3)
- FFT CT bar (M-2026-04-27-001)
- Battle Brothers ATB (Tier B #11)

ITB è il pattern più estremo (everything visible, not just enemy intent).

### File targets

- predictCombat backend: `apps/backend/services/combat/predictCombat.js` — output già include `push_direction` + `kill_probability`
- Render: [`apps/play/src/render.js`](../../../apps/play/src/render.js) — `drawThreatTileOverlay()` shipped #1884, manca arrow + badge
- Encounter authoring: `packs/evo_tactics_pack/data/encounters/` — 9 tutorial + 2 hardcore esistenti
- pcg-level-design-illuminator P0 pattern catalogato

### Cross-card relations

- M-2026-04-27-002 [Tactics Ogre HP Floating](combat-tactics-ogre-hp-floating-charm.md) — convergence info-on-entity
- M-2026-04-27-001 [FFT CT bar](combat-fft-ct-bar-wait-facing-crit.md) — temporal axis
- M-2026-04-27-007 (cross-link reciprocal)

## Concrete reuse paths

### Minimal — Push/pull arrows + kill probability (~3h)

1. `apps/play/src/render.js` `drawPushPullArrows(target, direction, intensity)` — render frecce direzionali con color coding (red threatening, blue safe push)
2. `drawKillProbabilityBadge(unit, kill_prob)` — badge 16×16px sopra unit threatened con `%` value
3. Backend output `predictCombat()` già contiene questi fields, basta consumarli render-side
4. Smoke test playable scenario tutorial 02

### Moderate — Hand-curate biome maps (~10h)

1. Authoring 6-8 hardcore maps + 4 tutorial enhancement (handcrafted layout)
2. Random enemy types + positions per run (already supported by reinforcement_pool)
3. Wire encounterLoader.js (✅ shipped #1873) per YAML loading
4. Telemetry per map win-rate

### Full — Telegraph completo + biome map authoring (~20h+)

- 4 islands × 8 maps handcrafted (~50 trait spawn pool randomized per run)
- Push/pull/move blast cone full overlay
- Multi-target highlight (per AOE)
- pcg-level-design-illuminator P0 pattern già catalogato

## Tickets proposed

- [`TKT-UI-ITB-PUSH-PULL-ARROWS`](../../../data/core/tickets/proposed/TKT-UI-ITB-PUSH-PULL-ARROWS.json) (3h) — quick win

## Sources / provenance trail

- Source matrix: [`docs/research/2026-04-26-tier-a-extraction-matrix.md`](../../research/2026-04-26-tier-a-extraction-matrix.md) §4
- Into the Breach (Subset Games 2018) — Justin Ma, Matthew Davis
- GDC 2019 talk: "Designing Into the Breach" — telegraph philosophy
- PR shipped: [#1884 58202227](https://github.com/MasterDD-L34D/Game/pull/1884)
- Stato arte: [`docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md`](../../reports/2026-04-27-stato-arte-completo-vertical-slice.md) §B.2 #4

## Risks / open questions

- **Push/pull arrow rendering perf**: 1 arrow per threatened unit per frame. Cap max 4-6 arrow simultanee (player attention budget).
- **Kill probability accuracy**: depend su predictCombat accuracy. Sample size N=1000 → 95% CI ±0.03. Buon enough.
- **AOE multi-target visualization**: complica display, prioritize single-target prima.
- **Conflict Dead Space diegetic**: ITB = overlay-rich, Dead Space = no overlay. Design call (ITB win per co-op planning).

## Anti-pattern guard

- ❌ NON RNG hidden post-decision (canonical broken determinism)
- ❌ NON forecast probabilistic non visibile (Halfway lesson)
- ❌ NON cinematic blocking transitions tra round (mantieni async)
- ❌ NON pure procgen senza handmade hooks (replayability low)
- ✅ DO show ALL numbers (hit%, dmg, push direction, kill probability)
- ✅ DO hand-made layout + procedural spawn (replayability + cohesion)
