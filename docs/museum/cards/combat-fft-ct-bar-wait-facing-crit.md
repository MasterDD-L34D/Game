---
title: 'FFT — CT bar + Wait action + Facing crit (P1 tactical legibility)'
museum_id: M-2026-04-27-001
type: research
domain: combat_tactics
provenance:
  found_at: docs/research/2026-04-26-tier-s-extraction-matrix.md#2-final-fantasy-tactics-square-1997--p1-tattica
  git_sha_first: c4a0a4d5
  git_sha_last: 6480e025
  last_modified: 2026-04-26
  last_author: docs-team
  buried_reason: unintegrated
relevance_score: 4
reuse_path: 'Minimal: CT bar visual overlay (~3-4h) / Wait action shipped #1896 / Facing crit 3-zone (~4h) / Full: cross-job JP inheritance (~10h bookmark)'
related_pillars: [P1]
status: curated
excavated_by: claude-code (deep extraction pass-2 2026-04-27)
excavated_on: 2026-04-27
last_verified: 2026-04-27
---

# FFT — CT bar + Wait action + Facing crit (P1 tactical legibility)

## Summary (30s)

- **3 pattern complementari** da Final Fantasy Tactics che chiudono il P1 tattica leggibile.
- **Wait action shipped** PR #1896 (Tier S #2 quick-win). Restano CT bar visuale (HUD overlay charge time, ~3-4h) + Facing crit 3-zone (front/side/rear bonus, ~4h). Cross-job JP inheritance bookmark M14+ (~10h).
- **Combina con Tactics Ogre HP floating** (M-2026-04-27-002) per HUD canonical Pillar 1 stack.

## What was buried

Tier S extraction matrix categorizza FFT come donor primario P1 (tattica leggibile). 4 cosa-prendere identificati di cui:

- ✅ **Wait/Hold action +20% speed next turn** — shipped PR #1896 `feat(combat): FFT Wait action defer turn`
- 🔴 **CT bar (Charge Time) visuale** — `initiative + action_speed - status_penalty` formula esiste backend, manca UI overlay
- 🔴 **Facing crit 3-zone** (rear +50%, side +25%, front baseline) — squad focus_fire +1 esistente è precursore
- 🔴 **JP cross-job ability inheritance** — bookmark, NOT priority

⏸️ **Zodiac signs** anti-pattern (opaco) — skip esplicito.

## Why it might still matter

### Pillar match

- **P1 Tattica leggibile 🟢 candidato**: CT bar visuale + facing crit chiudono "info on entity" pattern (convergence Tactics Ogre HUD + ITB telegraph + StS intent).
- **Convergenza UI Telegraph** (sezione cross-tier MASTER): 7 fonti convergono su info-attached-to-entity. FFT CT bar = manifest temporale del pattern.

### File targets

- Backend formula esistente: [`apps/backend/services/combat/`](../../../apps/backend/services/combat/) — `initiative + action_speed - status_penalty`
- Frontend HUD: [`apps/play/src/render.js`](../../../apps/play/src/render.js) + [`apps/play/src/style.css`](../../../apps/play/src/style.css) HUD slot
- Resolver attack: `resolveAttack()` — facing_modifier hook point

### Cross-card relations

- M-2026-04-27-002 [Tactics Ogre HP Floating](combat-tactics-ogre-hp-floating-charm.md) — convergence "info on entity"
- M-2026-04-27-007 [ITB Telegraph](ui-itb-telegraph-deterministic.md) — full overlay vs FFT CT bar (temporal axis only)
- existing M-005 magnetic_rift_resonance — pattern HUD canonical adoption

## Concrete reuse paths

### Minimal — Wait shipped (~0h, done #1896)

✅ Status: shipped 2026-04-26 PR #1896.

### Moderate — CT bar overlay (~3-4h)

1. Render CT bar overlay HUD per ogni unit usando `initiative` value pre-computed
2. `apps/play/src/render.js` `drawCtBar(unit, cx, cy)` — barra orizzontale 32×4px sopra sprite
3. CSS animation tween 200ms su tick

### Full — Facing crit 3-zone (~4h)

1. `resolveAttack()` esistente: aggiungi `computeFacingZone(attacker, target)` → enum `front|side|rear`
2. Multiplier: rear ×1.5, side ×1.25, front ×1.0 (FFT canonical)
3. Render arrow indicator per facing su sprite (~ 1h cosmetic)
4. Cap speed_bonus per turno (max 1 wait per round) — anti-pattern FFT speed-as-god-stat

### Bookmark — Cross-job JP inheritance (~10h, M14+)

Switch job tiene abilita imparate. Estende `progressionStore` + `perks.yaml` 84 perks. NOT priority.

## Tickets proposed

- [`TKT-P1-FFT-CT-BAR-VISUAL`](../../../data/core/tickets/proposed/TKT-P1-FFT-CT-BAR-VISUAL.json) (4h, ui-design-illuminator)
- [`TKT-COMBAT-FFT-FACING-CRIT-3-ZONE`](../../../data/core/tickets/proposed/TKT-COMBAT-FFT-FACING-CRIT-3-ZONE.json) (4h, balance-illuminator)
- [`TKT-COMBAT-FFT-JP-CROSS-JOB`](../../../data/core/tickets/proposed/TKT-COMBAT-FFT-JP-CROSS-JOB.json) (10h, balance-illuminator, bookmark)

## Sources / provenance trail

- Source matrix: [`docs/research/2026-04-26-tier-s-extraction-matrix.md`](../../research/2026-04-26-tier-s-extraction-matrix.md) §2
- FFT canonical reference: Final Fantasy Tactics (Square 1997, lead Yasumi Matsuno)
- GDC postmortems / fan analyses: Final Fantasy Tactics A2 design retrospectives
- PR shipped: [#1896](https://github.com/MasterDD-L34D/Game/pull/1896)
- Stato arte: [`docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md`](../../reports/2026-04-27-stato-arte-completo-vertical-slice.md) §B.1.1

## Risks / open questions

- **Speed cap mandatory**: FFT speed = god stat anti-pattern. Cap `speed_bonus` per turno = max 1 wait round.
- **Facing rendering perf**: arrow indicator ogni unit rerender ogni frame — ottimizzare via dirty flag.
- **Backward compat**: aggiungere facing_modifier post-hoc richiede regression test resolveAttack (`node --test tests/ai/*.test.js`).

## Anti-pattern guard

- ❌ NON copiare Zodiac compatibility crit modifier (opaco, design debt 1997)
- ❌ NON cross-job JP grinding 100h (anti-roguelike compact session)
- ❌ NON random battle out-of-context per leveling
- ✅ DO mostrare numeri reali (no opacity Halfway lesson)
