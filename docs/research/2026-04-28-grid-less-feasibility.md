---
title: 2026-04-28 Grid-less feasibility Evo-Tactics — agent analysis output
doc_status: active
doc_owner: master-dd
workstream: planning
last_verified: 2026-04-28
language: it
review_cycle_days: 30
related:
  - 'docs/adr/ADR-2026-04-28-bg3-lite-plus-movement-layer.md'
  - 'docs/adr/ADR-2026-04-28-deep-research-actions.md'
  - 'docs/research/2026-04-28-deep-research-synthesis.md'
  - 'docs/planning/2026-04-28-master-execution-plan.md'
---

# Grid-less feasibility Evo-Tactics — analysis output

> **Source**: balance-illuminator agent background analysis 2026-04-28 spawned per user open question Q5 (synthesis doc §"Open questions"). Trigger: user dubbio pivot grid-less Midnight Suns / DioField pattern.

> **User feedback playtest informal raccolto post-analysis 2026-04-28**: tester segnalano (a) "grafica vecchia / pre-2000 feel", (b) "movement BG3-like richiesto". Cambia equazione decision da speculative a data-driven.

> **Outcome**: vedi [ADR-2026-04-28-bg3-lite-plus-movement-layer.md](../adr/ADR-2026-04-28-bg3-lite-plus-movement-layer.md) per decision finale BG3-lite Plus tier ~10-12g.

## Q1 — Grid-dependent surfaces (catalog)

Numbered by blast-radius if removed. LOC = direct code affected.

**1. `apps/play/src/render.js` — drawCell + canvasToCell + fitCanvas (~1834 LOC total)**
Core loop iterates `width × height` grid cells. `drawCell(ctx, x, yPx, fill, tileImg)` at line 482 draws each square. `canvasToCell()` maps pixel click → `{x,y}` grid coord. `fitCanvas()` computes `CELL` size in px from container/grid-W. `drawUnit()` reads `unit.position.{x,y}` directly (line 746+). Range overlay draws Manhattan-distance reachable cells (line 1201). AOE preview draws `Array<{x,y}>` tiles (line 1298). ITB threat tile overlay (line 1073) iterates grid cells for intent preview. Echolocation pulse (PR #1977) renders radius around `{x,y}` target tile. **Breaking cost if removed: ~900 LOC rewrite**.

**2. `apps/backend/services/ai/policy.js` — manhattanDistance + stepAway + range logic (~282 LOC)**
`manhattanDistance(a, b)` computes grid distance. `stepAway(from, to, gridSize=6)` moves one step backward on grid. All intents (`attack`/`approach`/`retreat`/`kite`) gated on `dist <= attack_range`. Lines 128, 156, 165, 183-194. **Breaking cost: ~120 LOC**.

**3. `apps/backend/services/vcScoring.js` — positional metrics (~935 LOC)**
`computeRawMetrics` has `gridSize=6` parameter. `new_tiles` metric counts unique `{x,y}` visited (line 352). `manhattan()` used for `time_to_commit` and `kiting_efficiency` metrics (lines 359, 367-368). `position_from` / `position_to` / `target_position_at_attack` in raw event schema. 6 of 20+ raw metrics positional (new_tiles, time_to_commit, evasion_success, kiting_efficiency, aggression, mutual_range). **Breaking cost: ~200 LOC** — 6 raw metrics undefined, 2 MBTI aggregate axes (S_N exploration, J_P commitment) lose primary signals.

**4. `apps/backend/services/combat/senseReveal.js` — echolocation tile reveal (~117 LOC)**
Pure function computing `{x,y}` tiles revealed around target (lines 70-93). Skiv-specific (dune_stalker echolocation = 3D-style sense). **Breaking cost: ~117 LOC rewrite**.

**5. `apps/backend/services/combat/resistanceEngine.js` — `stepAway` / `manhattanDistance` indirect**
Policy.js `stepAway` uses hardcoded `gridSize=6`. resistanceEngine has channel-based logic but indirectly uses position for `flanking` / `pincer` not yet live. **Breaking cost: ~40 LOC**.

**6. Session event schema — `position_from` / `position_to` fields**
`apps/backend/routes/session.js` emits raw events with `position_from` / `position_to`. Consumed by vcScoring + replay + telemetry. **Breaking cost: schema ripple ~50 LOC + 382 tests re-validation**.

**7. Encounter YAML schema — `grid.width` / `grid.height` / `terrain_features`**
All 4 live encounter YAMLs + 4 planning encounter YAMLs have `grid:` block. `encounterLoader.js` reads e expone `grid_size` (6×6 default). **Breaking cost: ~15 encounter files reformat**.

**8. `apps/play/src/anim.js` — movement interpolation along grid path (~176 LOC)**
`getInterpolatedPos(unitId, position)` used by `drawUnit()`. Animates linear move from `position_from` → `position_to`. **Breaking cost: ~80 LOC rewrite**.

**9. `data/core/balance/damage_curves.yaml` + `trait_environmental_costs.yaml`**
`terrain_features` in encounter YAML links biome tile properties to DC modifier. **Breaking cost: ~30 LOC resolver + YAML cleanup**.

**10. ADR-2026-04-16 hex-axial decision (PROPOSED, not yet implemented)**
Hex grid PROPOSED but not shipped. **Breaking cost: ADR supersede + spec rewrite (doc-only, ~2h)**.

**11. PR #1975 predict_combat hover + PR #1884 ITB telegraph**
Both work on `Array<{x,y}>` tile coords. **Breaking cost: ~100 LOC**.

**Total LOC directly grid-dependent: ~1700 frontend + ~500 backend = ~2200 LOC**
Total tests with grid assumption: ~60-80 of 382.

## Q2 — Pattern fit comparison

### Midnight Suns (card-based + heroism + free positioning)

**Pillar fit**:

- P1 Tattica: **LIFT** — zero hit-RNG eliminates miss frustration. 3 card plays/turn = tactical constraint instead AP counting.
- P2 Evoluzione: **NEUTRAL** — card deck = evolution analog. Heroism economy mirrors PI budget.
- P3 Specie×Job: **LIFT** — each unit unique card pool. Maps a species+job combo decks.
- P4 MBTI: **STRONG LIFT** — thoughts ritual (PR #1983) IS already Midnight Suns card-select pattern.
- P5 Co-op TV: **NEUTRAL → mild lift** — phone-as-card-hand works.
- P6 Fairness: **LIFT** — deterministic = calibration trivial.

**Skiv canon impact**: Echolocation pulse → "Skiv plays REVEAL card → enemy zone highlighted" instead of 5-tile pulse. Loses physical-space flavor. wounded_perma survives as persistent card debuff.

**Match runtime**: thoughts ritual (PR #1983) = 80% match già. vcScoring raw metrics need new non-positional signals.

### DioField RTTB

**Pillar fit**:

- P1 Tattica: **TOTAL BREAK** — simultaneous round model (M17, Sprint 11) + planning phase. RTTB requires continuous time, pause-to-order. Architecture break 100%.
- P4 MBTI: **BREAK** — thoughts ritual requires discrete decision moments.
- P5 Co-op TV: **BREAK** — phone latency p95 > 100ms unacceptable real-time.

**Skiv canon impact**: round-based identity di Skiv (slow-burn predator) = completamente recontextualizzato. Worst possible fit.

### Hybrid free-positioning + turn discreto (Arena-style)

**Pillar fit**:

- P1 Tattica: **LIFT** — keep AP + round model. ITB telegraph survives (unit-area instead tile-area). Predict combat hover survives.
- P4 MBTI: **NEUTRAL** — thoughts ritual works identically.
- P5 Co-op TV: **NEUTRAL** — phone tile-pointer → phone "tap arena zone" pointer.
- P6 Fairness: **MILD LIFT** — movement freedom = more counterplay options.

**Skiv canon impact**: echolocation pulse = "reveal radius circle" più fedele al lore. wounded_perma survives.

**Match runtime**: round model SOPRAVVIVE intatto. Least blast-radius of 3 options.

## Q3 — Effort pivot stimato

### Scenario B: Hybrid (arena + keep turn model)

| Sub-sprint | Scope                                                            | Effort            | Blast                   |
| ---------- | ---------------------------------------------------------------- | ----------------- | ----------------------- |
| H.1        | Replace tile grid draw circular movement zone                    | 3-4d              | render.js ~400 LOC      |
| H.2        | Replace manhattanDistance with euclidean                         | 1d                | ~80 LOC                 |
| H.3        | Replace canvasToCell with click-in-zone                          | 2d                | render.js + interaction |
| H.4        | Encounter YAML reformat: drop grid.width/height add arena_radius | 1d                | 14 YAML files           |
| H.5        | senseReveal radius circle                                        | 1d                | 117 LOC                 |
| H.6        | vcScoring new_tiles → area_covered float                         | 2d                | ~200 LOC                |
| H.7        | Range overlay circle arc                                         | 1d                | render.js ~100 LOC      |
| H.8        | Regression 60-80 position-related tests                          | 3-5d              | 382 test sweep          |
| **Total**  |                                                                  | **~14-18 giorni** | ~2200 LOC               |

### Scenario C: Full Midnight Suns pivot

| Sub-sprint | Scope                             | Effort               |
| ---------- | --------------------------------- | -------------------- |
| M.1        | Remove grid entirely              | 1 sett               |
| M.2        | Card system NEW                   | 2-3 sett             |
| M.3        | Heroism economy                   | 1 sett               |
| M.4        | Environmental targets             | 2 sett               |
| M.5        | vcScoring rewrite 6 metrics       | 1 sett               |
| M.6        | Encounter YAML reformat 60+ files | 1 sett               |
| M.7        | Phone UI card hand                | 1 sett               |
| M.8        | Regression + 382 test rewrite     | 2-3 sett             |
| **Total**  |                                   | **~12-16 settimane** |

### Scenario D: Full DioField RTTB

Estimate **20-30 settimane**. Anti-pattern confirmed ADR-2026-04-28 §4. Not analyzed further.

## Q4 — Trade-off matrix lato gamer

| Aspect                   | Grid square (oggi)                      | Midnight Suns pivot                | DioField RTTB                    | Hybrid arena                                 |
| ------------------------ | --------------------------------------- | ---------------------------------- | -------------------------------- | -------------------------------------------- |
| **Combat feel**          | Click hex tile to move, see range cells | Draw 3 cards, play sequence        | Click+hold path real-time        | Click in movement circle, smoother anim      |
| **Strategic depth**      | AP economy + positioning + range tile   | Card hand + heroism + combo        | Pause-to-plan + RTS micro        | AP economy + free positioning                |
| **Skiv echolocation**    | 5-tile pulse circle, literal grid       | "Play REVEAL card" abstract        | Auto-sense around unit           | Radius circle reveal, spatially faithful     |
| **Co-op TV**             | Tile pointer phone → TV highlight       | Card hand on phone (3 cards)       | Phone d-pad → real-time cursor   | Tap zone phone → TV movement arc             |
| **MBTI thoughts ritual** | Discrete turn moment 3 candidate panel  | Native match: 3 cards = 3 thoughts | No natural pause → ritual breaks | Unchanged: turn-end ritual works             |
| **Failure model**        | wounded_perma binary turn-based         | Card debuff (lose card slot)       | Injury not natural in RTTB       | wounded_perma survives                       |
| **Learning curve**       | Familiar (FFT/FE players)               | Novel for casual                   | RTS skill required               | Near-identical, smoother                     |
| **RNG frustration**      | d20 miss = visible frustration          | Zero miss RNG                      | Same as grid d20 if kept         | d20 still there, but miss feels "wrong zone" |

## Verdict synthesizer (NO endorsement)

### Scenario A — NO pivot

- Pros: zero code cost. 382 tests green. Plan v2 Godot migration on track.
- Cons: ADR-2026-04-16 hex grid Proposed unimplemented. Grid square less elegant per 6-directional combat.
- Effort: 0h. Pillar impact: no change. Skiv canon: preserved.

### Scenario B — Hybrid minimal (arena free-positioning + keep turn discreto)

- Pros: keeps round model + M17 + co-op phone. Smoother movement. Echolocation più spatially faithful. vcScoring extensible (float coords). Compatible Godot Sprint N.
- Cons: ~14-18 giorni web stack change. 60-80 test re-validation. Encounter YAML reformat. ADR needed.
- Effort: ~14-18 giorni. Pillar impact: P1 mild lift + P6 mild lift. Skiv canon: improved.

### Scenario C — Full Midnight Suns / DioField pivot

- Pros (MS only): strongest P4 match, deterministic combat (P6 lift), card design = differentiator.
- Cons: 12-16 sett MS. 20-30 sett DioField. 12 mesi sunk cost partial waste. 382 test rewrite. Co-op WS round model = redesign.
- Decision gate: USER DECISION required + ADR + playtest prototype + sunk cost re-evaluation meeting.

## Open questions BEFORE deciding

1. **Is grid ≠ tile a real gamer pain?** Has any playtest feedback said "tile click feels bad"?
2. **Does thoughts ritual (PR #1983) already feel Midnight-Suns-enough?** G3 already ships 3-card-style thought selection.
3. **What is the hex ADR status decision?** ADR-2026-04-16 "Proposto" not "Accepted".
4. **What does vcScoring lose in Midnight Suns?** S_N axis (exploration = new_tiles) e J_P axis (commitment = time_to_commit) are grid-derived.
5. **Godot timing gate**: Hybrid arena change must happen BEFORE Sprint N (Godot vertical slice).

## Resolution post user feedback playtest 2026-04-28

User feedback informal raccolto post-analysis ha risposto Q1 + Q3:

- Q1 ANSWER: **SÌ** — tester signal "grafica pre-2000" + "movement BG3-like" = grid square percepito antiquato.
- Q3 ANSWER: hex ADR può rimanere Proposed indefinitely — BG3-lite frontend abstraction risolve visual feel senza implementare hex backend.

Q2 + Q4 + Q5 portano a decision: **NOT full Hybrid (14-18g overshoot) + NOT Midnight Suns pivot (no card signal user)**. Sweet spot middle-tier = **BG3-lite Plus** = frontend visual abstraction + cherry-pick 3 valuable Hybrid backend features (sub-tile positioning + vcScoring float + flanking continuous angle).

Decision finale ADR separato: [ADR-2026-04-28-bg3-lite-plus-movement-layer.md](../adr/ADR-2026-04-28-bg3-lite-plus-movement-layer.md).

## Anti-pattern + risk preserved

- NO Midnight Suns full pivot (12-16 sett, no card signal user)
- NO DioField RTTB (20-30 sett, anti-pattern total break round model M17)
- NO hex grid backend pivot (~30-40h refactor, no signal need)
