---
title: 'ADR-2026-04-28: BG3-lite Plus movement layer — Sprint G.2b NEW (frontend visual abstraction + 3 backend cherry-pick)'
doc_status: active
doc_owner: master-dd
workstream: planning
last_verified: 2026-04-28
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - docs/research/2026-04-28-grid-less-feasibility.md
  - docs/adr/ADR-2026-04-28-deep-research-actions.md
  - docs/research/2026-04-28-deep-research-synthesis.md
  - docs/planning/2026-04-28-master-execution-plan.md
  - docs/adr/ADR-2026-04-16-grid-axial-tiles.md
---

# ADR-2026-04-28: BG3-lite Plus movement layer — Sprint G.2b NEW

> ⚠️ **SUPERSEDED 2026-04-29 sera** by [ADR-2026-04-29-pivot-godot-immediate.md](./ADR-2026-04-29-pivot-godot-immediate.md). Sprint G.2b ~10-12g DEPRECATED post-pivot Godot. BG3-lite Plus features (hide grid + smooth movement + range cerchio + AOE shape + sub-tile float + flanking 5-zone angle) sono native Godot 2D primitives = ZERO extra effort post-pivot. A1 rubric session formal abort. Doc preservato come historical reference.

- **Data**: 2026-04-28
- **Stato**: **Superseded by ADR-2026-04-29-pivot-godot-immediate**
- **Owner**: Master DD
- **Stakeholder**: gameplay-programmer + ui-programmer + qa-tester (Sprint G.2b execution)
- **Supersedes**: ADR-2026-04-28 §11 open question Q5 grid-less feasibility deferred

## 1. Contesto

Sessione 2026-04-28 deep research SRPG/strategy ha aperto Q5 (grid-less pivot feasibility). Background agent feasibility analysis output: [`docs/research/2026-04-28-grid-less-feasibility.md`](../research/2026-04-28-grid-less-feasibility.md).

**User feedback playtest informal raccolto 2026-04-28** post-analysis:

- _"Griglia fa molto gioco pre-2000"_ — visual feel datato
- _"Molti si sono lamentati della grafica"_ — gap visivo (scope Sprint G v3 asset swap esistente)
- _"Movement BG3-like richiesto"_ — KEY signal nuovo

Tester data trasforma decision da **speculative** a **data-driven**.

**3 scenarios analizzati** (vedi research doc):

- **A) NO pivot** — 0h, plan v2 on track, ma feedback tester ignorato
- **B) Hybrid full** ~14-18g — arena free-positioning + euclidean math + encounter YAML reformat
- **C) Midnight Suns full pivot** ~12-16 sett — card system, NO signal tester
- **D) DioField RTTB** ~20-30 sett — anti-pattern total break round model M17

**Critical insight**: BG3 reality NON è grid-less. BG3 ha grid invisibile 5-foot D&D + smooth movement + radius range visualization + camera 3D feel. **BG3 ≠ Midnight Suns ≠ DioField**.

Quindi sweet spot middle-tier identificato: **BG3-lite Plus** = frontend visual abstraction (grid hidden + smooth movement + range cerchio + AOE shape) + cherry-pick 3 valuable Hybrid backend features.

## 2. Decisione

Adottare **BG3-lite Plus** scope ~10-12g come **Sprint G.2b NEW** post Sprint G v3 asset swap, pre Sprint I TKT-M11B-06 playtest.

**NOT** Scenario A (ignora feedback). **NOT** Scenario B full Hybrid (overshoot). **NOT** Scenario C Midnight Suns (no card signal). **NOT** Scenario D DioField (anti-pattern).

### Cosa BG3-lite Plus include (3 tier)

#### Tier 1 — BG3-lite minimal (~6-7g, frontend-only)

| Cambio                                                    | Effort |          Backend impact           |
| --------------------------------------------------------- | :----: | :-------------------------------: |
| Hide grid lines (no border tile draw)                     | ~30min |               zero                |
| Click area → unit (path-find smooth)                      |  ~1d   | zero (canvasToCell mantiene math) |
| Smooth move interpolation curva (no snap-to-center jerky) |  ~1d   |        zero (anim.js only)        |
| Range = cerchio radius arc (NOT cell highlight)           |  ~1d   |               zero                |
| AOE preview = shape sphere/cone (NOT tile array)          |  ~2d   |              minimal              |
| Movement zone outline arc invece tile-by-tile             |  ~1d   |               zero                |

#### Tier 2 — Plus add-ons (~+4-5g, backend cherry-pick)

| Cherry-pick from Hybrid                                                                                                                                                                                                                                                                                                                                                                                                          | Effort |                 Pillar impact                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----: | :-------------------------------------------: |
| **Sub-tile positioning** (unit ferma a 1.7 tile dist, NOT center) — float coord position_from/position_to + **round-to-nearest** semantics range check (Q4 verdict)                                                                                                                                                                                                                                                              | ~+2-3d |      P1 strong lift (tactical precision)      |
| **vcScoring area_covered float** (P4 MBTI signal richer continuous, NOT discrete new_tiles integer) — **synthetic test 10 scenari hardcoded baseline** (Q8 verdict)                                                                                                                                                                                                                                                              | ~+1-2d | P4 mild lift (S_N exploration axis sensitive) |
| **Flanking 5-zone smooth angle** (Q5 verdict opt B). **Default values tunable post-playtest**: 0-30° front ×1.0 / 30-90° fronte-side ×1.1 / 90-150° rear-side ×1.4 / 150-180° rear ×1.6. User verdict approved partition (5-zone NOT 3-zone) ma multipliers default suggested — refine post TKT-M11B-06 playtest data (es. ×1.5 rear se ×1.6 troppo brutal, ×1.05 fronte-side se ×1.1 invisibile feel). Math angolo float input. |  ~+2d  |      P6 mild lift (flanking satisfying)       |

**Total BG3-lite Plus**: ~10-12 giorni (2-2.5 settimane).

### Cosa BG3-lite Plus SKIPPA da Hybrid full

| Hybrid feature                                           |      Costo recover       |                          Decision                           |
| -------------------------------------------------------- | :----------------------: | :---------------------------------------------------------: |
| Encounter free-form map shape (arena_radius vs grid w/h) | +3-4g (14 YAML reformat) | **SKIP** — player NON percepisce differenza con grid hidden |
| Euclidean range continuous (3.5 tile precise)            |           +1g            |   **SKIP** — manhattan basta visualmente con cerchio arc    |
| Movement curve interpolation native                      |           +1g            |        **SKIP** — A\* waypoint smooth è 95% del feel        |

**Justification**: BG3-lite Plus cattura 90% del valore Hybrid con 65% effort.

### Cosa preservato (TUTTO INTATTO)

- `wounded_perma` + `legacy_ritual` + `propagateLineage` + mating engine (PR #1982/#1984/#1918/OD-001)
- 7 trait `active_effects.yaml`
- d20 + AP + round model M17 + simultaneous planning Sprint 11
- Skiv canon — preservato + echolocation feel **improved** (cerchio reveal più fedele lore)
- 35 ability r1-r4 (#1978) — range manhattan basta
- Co-op WS Jackbox M11 (lobby + host-transfer + reconnect token)
- vcScoring 14 raw metrics non-positional + 6 aggregate + 4 MBTI + 6 Ennea
- 60+ encounter YAML coords (NO reformat — backend grid 6x6 mantiene math)
- 382 test green expected (no schema change frontend-only + 3 add-ons additive)

## 3. Pillar impact comparativo

| Pillar        | Scenario A (oggi) | BG3-lite minimal Tier 1 |               **BG3-lite Plus**               | Hybrid full B  |
| ------------- | :---------------: | :---------------------: | :-------------------------------------------: | :------------: |
| P1 Tattica    |        🟢         |      🟢 mild lift       |    🟢 **strong lift** (sub-tile precision)    | 🟢 strong lift |
| P2 Spore      |      🟢 def       |            0            |                       0                       |       0        |
| P3 Specie×Job |        🟢         |            0            |                       0                       |       0        |
| P4 MBTI       |       🟡++        |            0            | 🟢 **mild lift** (vcScoring float richer S_N) |  🟢 mild lift  |
| P5 Co-op      |       🟡→🟢       |      🟢 mild lift       |                 🟢 mild lift                  |  🟢 mild lift  |
| P6 Fairness   |        🟡         |            0            |   🟢 **mild lift** (flanking angle precise)   |  🟢 mild lift  |

**BG3-lite Plus = 4 pillar lift, gli stessi di Hybrid full, con 65% effort**.

## 4. Lato gamer (cosa player vede pre/post)

### Combat feel pre-Sprint G.2b (oggi)

- Click tile esagono visibile
- Range = celle highlightate
- Movement snap-to-tile-center (jerky)
- AOE = array tile rossi
- Echolocation Skiv = 5-tile pulse rigido

### Combat feel post-Sprint G.2b (BG3-lite Plus)

- Click area smooth (grid hidden)
- Range = cerchio radius gradient (BG3-style)
- Movement curve smooth + sub-tile position (può fermarsi 1.7 tile dist per fianco preciso)
- AOE = shape sphere/cone visualizzata (BG3-style)
- Echolocation Skiv = cerchio reveal radiale **dinamico per sense level** (Q7 verdict): radius scaling base 5 tile, modificato da fame/bond/sense state (es. Skiv affamato → -1 tile radius, Skiv legato → +1 tile radius). Implementation: `senseReveal.js` aggiungi `computeDynamicRadius(unit, baseRadius=5)` + emergent gameplay tie-in P2 Spore lifecycle (fame state). Future-proof per Sprint Q P2 macro-loop sense expansion.

### Side-by-side test pre-commit

- 1 encounter `enc_tutorial_01` rendered con BG3-lite Plus prototype
- User judgment subjective + 4 amici tester pre-TKT-M11B-06 valutano "feel BG3?" sì/no

## 5. Effort + ordine esecuzione (REVISED ADR-2026-04-28-deep-research-actions §7)

| #   | Action                                          |   Effort    | Quando                 |
| --- | ----------------------------------------------- | :---------: | ---------------------- |
| 1   | Action 5a + 5b BB hardening                     |     ~5h     | **PRE Sprint G v3**    |
| 2   | Action 7 CT bar lookahead 3 turni               |     ~4h     | parallel Action 5 ship |
| 3   | **Sprint G v3 Legacy Collection asset swap**    |    ~2.5g    | post Action 5+7        |
| 4   | **Sprint G.2b BG3-lite Plus NEW**               | **~10-12g** | post Sprint G v3       |
| 5   | Action 6 (Skiv-Pulverator alleanza, REVISED Q3) |    ~5-7h    | durante G.2b window    |
| 6   | Sprint I TKT-M11B-06 playtest userland          |   ~1 sett   | post G.2b ship         |

**Total Fase 1 effort REVISED**: ~5-5.5 settimane vs plan v2 originale ~3-5 sett. Slippage ~+1-1.5 sett, signal user-driven (NOT speculative).

**Plan v2 → v3 effort delta cumulativo (REVISED 2026-04-28 user verdict batch finale)**:

- ADR-2026-04-28-deep-research-actions: **+29-31h** (8 actions, REVISED post-Q3 ambition expand)
- ADR-2026-04-28-bg3-lite-plus-movement-layer (this): **+10-12 giorni = +80-96h**
- **Total v2 → v3**: **~+109-127h aggiunti** (~+2.7-3.2 settimane base 14 sett, ~+19-23%)

Ancora justified: tester signal data-driven, NOT speculative.

## 6. Anti-pattern guards

**NO** durante Sprint G.2b implementation:

- **NO** rewrite backend manhattanDistance/stepAway (mantieni tile-math)
- **NO** rewrite session.js position_from/to schema (compatibility 382 test)
- **NO** rewrite encounter YAML grid w/h block (skip from Hybrid full)
- **NO** vcScoring rewrite full 6 raw metrics (solo `area_covered` add float, `new_tiles` integer **mantenuto** parallel)
- ~~**NO** drop ADR-2026-04-16 hex grid Proposed (resta Proposed, future-deferred — BG3-lite hidden grid risolve visual SENZA implementare hex)~~ **UPDATE 2026-04-28**: ADR-2026-04-16 ora **Superseded** by [ADR-2026-04-28-grid-type-square-final](./ADR-2026-04-28-grid-type-square-final.md). Square wins definitivo. BG3-lite Plus Tier 2 (sub-tile float + flanking angle continuous) = catturano vantaggi hex senza refactor.

## 7. Risk + mitigation

| Risk                                                            | Mitigation                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sub-tile positioning rompe ability range tile-based             | Math: **round-to-nearest-tile** per range check (Q4 user verdict 2026-04-28), render position float                                                                                                                                                                                                                                                                                                                                       |
| vcScoring `area_covered` float → MBTI signal drift baseline     | **Synthetic test 10 scenari hardcoded coords** (Q8 user verdict 2026-04-28): NEW `tests/services/areaCovered.test.js` con 10 scenari deterministic (5 sparse exploration high-area / 5 dense corner-camp low-area), assert MBTI S_N axis output stabile ±5% pre/post. Future-proof: add ticket `TKT-FUTURE-REPLAY-INFRA M12+` per session replay storage tie-in telemetry pipeline (deferred low-priority, synthetic test sufficient ora) |
| Flanking 5-zone smooth angle break facing 3-zone (museum M-001) | Q5 user verdict 2026-04-28: adotta **5-zone smooth** (NOT 3-zone classic): 0-30° front ×1.0 / 30-90° fronte-side ×1.1 / 90-150° rear-side ×1.4 / 150-180° rear ×1.6. Museum M-001 facing crit 3-zone superseded by 5-zone (player feel più granular ma ancora leggibile, NOT continuous gradient invisible).                                                                                                                              |
| 60-80 test fail per position float                              | Coordinate format `{x: 1.0, y: 2.0}` quando integer = backward-compat                                                                                                                                                                                                                                                                                                                                                                     |
| User feel "BG3 feel non c'è" post-spike                         | Spike 1 giorno enc_tutorial_01 prototype prima commit Sprint G.2b full (~6-12g)                                                                                                                                                                                                                                                                                                                                                           |
| Sprint G v3 visual + G.2b movement merge collision              | Sequential ordine (G v3 ship → poi G.2b branch) — disjoint blast radius                                                                                                                                                                                                                                                                                                                                                                   |

## 8. Rollback path

| Trigger                                       | Rollback action                                                       |
| --------------------------------------------- | --------------------------------------------------------------------- |
| Sprint G.2b spike user judgment NO BG3 feel   | Abort full G.2b, ship Tier 1 minimal solo (~6-7g) o skip totale       |
| Backend cherry-pick (#1/#2/#5) break test 382 | Revert backend changes, mantieni Tier 1 frontend-only                 |
| Sub-tile positioning break ability range      | Snap-to-tile fallback per range check, mantieni float per render only |
| User playtest TKT-M11B-06 reject BG3-lite     | Revert Sprint G.2b commit, restore Sprint G v3 final state            |

## 9. Spike POC pre-commit (REVISED 2026-04-28 user verdict Q6)

**Spike 1 giorno** (~8h budget) PRIMA full Sprint G.2b ~10-12g commitment:

- Branch `spike/bg3-lite-prototype-2026-04-28`
- Scope: 1 encounter `enc_tutorial_01` rendered con grid hidden + smooth movement + range cerchio + AOE shape
- NO sub-tile positioning + NO vcScoring float + NO flanking 5-zone angle (Tier 2 add-ons skip)
- NO 14 encounter YAML reformat

**Tester pool** (Q6 user verdict): **4 amici DIVERSI da TKT-M11B-06 pool** (preserva pool playtest userland fresh, evita "stancare" tester pre-Sprint I).

**Rubric 4-criteria** (1-5 scale per ognuno, Q6 user verdict):

| Criterio                            | 1 (poor)                   | 5 (BG3-tier)                       |
| ----------------------------------- | -------------------------- | ---------------------------------- |
| **Movement smoothness**             | Jerky snap-to-tile-center  | BG3-tier curve smooth              |
| **Range readability**               | Confuso, non capisco range | Immediately clear cerchio gradient |
| **Combat feel "2024 RPG"**          | Pre-2000 console feel      | BG3 / Pillars Eternity tier        |
| **Echolocation Skiv lore-faithful** | Tile rigid 5-cell          | Natural sense radiale              |

**Threshold pass**: media ≥3.5 + zero score 1 + zero criterio rigetto unanime.

**Decision binary**:

- Pass threshold → commit full Sprint G.2b (~10-12g)
- Fail threshold → abort, mantieni grid square + ship Sprint G v3 visual asset swap solo

**Spike output**: `docs/playtest/2026-04-28-bg3-lite-spike-rubric.md` con before/after side-by-side screenshot + rubric scores per tester + verdict aggregate.

## 10. Decision-altering check vs plan v2 + ADR-2026-04-28-deep-research-actions

| Doc                                                  | Impatto                                                                  |                Verdict                 |
| ---------------------------------------------------- | ------------------------------------------------------------------------ | :------------------------------------: |
| Plan v2 master                                       | +1-1.5 sett Fase 1, +1 nuovo Sprint G.2b                                 |        **EXTEND** (NOT rewrite)        |
| Plan v2 decisions 1-10                               | Decision 1 (ordine fasi) confermato. Decisions 6-10 confermate.          |            **NO altering**             |
| ADR-2026-04-28-deep-research-actions §11 Q5 deferred | Q5 grid-less = RESOLVED via BG3-lite Plus                                |              **CLOSE Q5**              |
| ADR-2026-04-16 hex grid Proposed                     | Resta Proposed — BG3-lite hidden grid risolve visual senza hex backend   |             **NO change**              |
| Godot migration plan Fase 2 Sprint M-N               | Sprint N Godot port deve replicate BG3-lite Plus visual layer Godot-side | **EXTEND Sprint N spec** (sub-feature) |

**Conclusione**: 1 NEW Sprint (G.2b) + 1 Sprint N spec extension (replicate BG3-lite Plus Godot). NO rewrite plan v2.

## 11. Conseguenze

**Positive**:

- Tester feedback data-driven addressed
- 4 pillar lift (P1+P4+P5+P6) con 65% effort vs Hybrid full
- Skiv echolocation feel improved
- Backend math grid intatta = 382 test green expected zero rewrite
- Compatible Godot Sprint N port (porting visual layer scope ~equivalente)
- Spike POC 1g de-risk full ~10-12g commitment

**Negative / risks**:

- ~+10-12g delta Fase 1 effort (~+1.5 sett, ~+18% base)
- Sub-tile positioning richiede careful range check round-to-tile (test buffer ~+1d)
- vcScoring `area_covered` baseline shift richiede A/B test 10 sessioni replay
- Risk user feel "non è BG3 abbastanza" → mitigato da spike

**Rollback**: branch revert clean, frontend-only changes Tier 1 + 3 backend add-ons cherry-pick isolati.

## 12. References

- Source feedback: User playtest informal 2026-04-28
- Grid-less feasibility analysis: [`docs/research/2026-04-28-grid-less-feasibility.md`](../research/2026-04-28-grid-less-feasibility.md)
- Deep research synthesis: [`docs/research/2026-04-28-deep-research-synthesis.md`](../research/2026-04-28-deep-research-synthesis.md)
- ADR-2026-04-28-deep-research-actions: [`docs/adr/ADR-2026-04-28-deep-research-actions.md`](./ADR-2026-04-28-deep-research-actions.md)
- Master plan v2: [`docs/planning/2026-04-28-master-execution-plan.md`](../planning/2026-04-28-master-execution-plan.md)
- ADR-2026-04-16 hex grid Proposed: [`docs/adr/ADR-2026-04-16-grid-axial-tiles.md`](./ADR-2026-04-16-grid-axial-tiles.md)
- BG3 design reference (visual abstraction grid + smooth movement + radius range): pattern industry-standard 2024+ tactical RPG era

## 13. Status tracking Sprint G.2b sub-tasks

| Sub-task                                     | Tier  |   Status   | PR / commit |
| -------------------------------------------- | :---: | :--------: | ----------- |
| Spike POC enc_tutorial_01 BG3-lite prototype | spike | 🟡 pending | TBD         |
| 1.1 — Hide grid lines                        |  T1   | 🟡 pending | TBD         |
| 1.2 — Click area path-find                   |  T1   | 🟡 pending | TBD         |
| 1.3 — Smooth move interpolation curve        |  T1   | 🟡 pending | TBD         |
| 1.4 — Range cerchio radius arc               |  T1   | 🟡 pending | TBD         |
| 1.5 — AOE shape sphere/cone                  |  T1   | 🟡 pending | TBD         |
| 1.6 — Movement zone outline arc              |  T1   | 🟡 pending | TBD         |
| 2.1 — Sub-tile positioning float coords      |  T2   | 🟡 pending | TBD         |
| 2.2 — vcScoring area_covered float metric    |  T2   | 🟡 pending | TBD         |
| 2.3 — Flanking continuous angle              |  T2   | 🟡 pending | TBD         |
| Test regression 382 + 5-10 nuovi             |  QA   | 🟡 pending | TBD         |
| User judgment + 4 amici BG3 feel validation  |  QA   | 🟡 pending | TBD         |

**Next sync**: aggiorna status table when ogni sub-task ship.

## Addendum anti-rot — cross-ref path rotto (fence 2026-05-17)

⚠️ **La DECISIONE resta valida e invariata** (BG3-lite Plus movement
layer, Sprint G.2b). **Ma un riferimento file è ROTTO** (audit veracità
ADR 2026-05-17, regola-0, verifica file-path vs git-truth):

- `docs/adr/ADR-2026-04-16-grid-axial-tiles.md` (frontmatter `related:`
  + sezione Riferimenti "ADR-2026-04-16 hex grid Proposed") → **FILE
  INESISTENTE**. Il file reale è
  `docs/adr/ADR-2026-04-16-grid-type-hex-axial.md` (stessa decisione hex
  axial grid). Link storico = snapshot pre-rinomina, NON path corrente.
  Nota: la decisione hex è poi superseded da
  `ADR-2026-04-28-grid-type-square-final.md` (catena superseder
  separata, intatta).

**Trattamento**: decisione invariata; il path nel corpo/frontmatter =
*riferimento storico rotto*, NON puntatore valido. Target canonico →
`ADR-2026-04-16-grid-type-hex-axial.md`. (Addendum-only: governance ADR
non riscrive link nel corpo; pointer corretto qui.)
