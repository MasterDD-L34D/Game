---
title: 'ADR-2026-04-28: Deep research SRPG/strategy — 5 micro-actions plan v2 (additive, no decision-altering)'
doc_status: active
doc_owner: master-dd
workstream: planning
last_verified: 2026-04-28
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - docs/research/2026-04-28-deep-research-synthesis.md
  - docs/planning/2026-04-28-master-execution-plan.md
  - docs/planning/2026-04-28-godot-migration-strategy.md
  - docs/planning/2026-04-28-asset-sourcing-strategy.md
---

# ADR-2026-04-28: Deep research SRPG/strategy — 5 micro-actions plan v2

- **Data**: 2026-04-28
- **Stato**: Accepted
- **Owner**: Master DD
- **Stakeholder**: Sprint M-N execution (gameplay-programmer + ai-programmer + qa-tester)

## 1. Contesto

Sessione 2026-04-28 ha analizzato 2 deep research SRPG/strategy file (18 titoli — FFT, Tactics Ogre, Brigandine, Battle Brothers, Midnight Suns, DioField, etc.) contestualizzata a master plan v2 ([`docs/planning/2026-04-28-master-execution-plan.md`](../planning/2026-04-28-master-execution-plan.md), 973 LOC, production-ready post 2-agent review).

Synthesis output completo in [`docs/research/2026-04-28-deep-research-synthesis.md`](../research/2026-04-28-deep-research-synthesis.md):

- **11 cross-ref entries** (research finding × plan v2 sprint × impact × effort × priority)
- **6 pillar fit table** (P1-P6 current state vs research match vs gap)
- **Decision-altering check vs decisions 3-10**: ZERO altering. Plan v2 production-ready confermato.

Research è **research design SRPG genre** — orthogonal a plan v2 (infrastructure/asset/migration phased) MA highly relevant per Sprint N vertical slice MVP scope + Pillar P1+P2+P6 combat design + Sprint M-N Godot porting reference repos + Sprint N.4 AI port.

ADR separato (NOT inline plan v2 append) per:

- Plan v2 git history pulita
- 5 actionable trackable autonomo (status open/done per item)
- Cross-ref bidirectional plan v2 ↔ ADR
- Future revisit canonical "decision unit"

## 2. Decisione

Adottare **5 micro-actions additivi** a plan v2, senza riscrivere il plan stesso. Tutte additive, low blast-radius, zero pivot architetturale.

### Action 1 — Sprint M.4b NEW: reference codebase study (P1, ~3h)

**Trigger**: pre-Sprint N.3 prerequisite.

**Scope**: clonare i 4 reference repos canonical research a `/tmp/`:

- `https://github.com/Project-Tactics/Project-Tactics` (FFT-like architecture validation, ~3h study NO extraction)
- `https://github.com/nicourrea/Tactical-RPG` (Godot A\* pathfinding extraction, ~4h study)
- `https://github.com/OpenXcom/OpenXcom` (C++ tactical AI module reverse-eng blueprint, ~8h)
- `https://lex-talionis.net/` (FE-like Python free, defer post-Godot — citation only)

**Output**: `docs/research/2026-04-28-srpg-engine-reference-extraction.md` con:

- Turn scheduler patterns (`OpenXcom/src/Battlescape/`)
- Grid representation (`Project-Tactics`)
- AI scoring (`OpenXcom`, `Wesnoth/src/ai/`)
- Pathfinding GDScript blueprint (nicourrea/Tactical-RPG A\*)

**Effort**: ~3h study + ~4h pathfinding extraction = ~7h totali. Sprint M.4b incastonato fra M.4 (asset import) e M.5 (cross-stack spike).

**Source ref**: F1 §"Engine e systems" + F1 §"Repos e implementazioni" + F2 lines 125-132.

### Action 2 — Sprint N.4 pre-read tactical AI postmortems (P1, ~2h)

**Trigger**: pre-Sprint N.4 AI policy + vcScoring port.

**Scope**: read 2 source canonical:

- Battle Brothers AI dev blog: `https://battlebrothersgame.com/tactical-combat-mechanics/`
- XCOM:EU GDC postmortem (movement + ability usage degli alieni)

**Output**: 1-page Beehave behavior tree template per archetype (vanguard / skirmisher / healer) seeded da BB enemy taxonomy. File: [`docs/research/2026-04-28-tactical-ai-archetype-templates.md`](../research/2026-04-28-tactical-ai-archetype-templates.md) (shipped 2026-04-29).

**Effort**: ~2h read + ~1h template authoring = ~3h totali.

**Scope user verdict 2026-04-28**: minimal per Sprint N playtest (3 archetype: vanguard / skirmisher / healer). Future expand post-playtest se nemico SISTEMA feel "robot prevedibile" emerge come bug report TKT-M11B-06 → spawn follow-up TKT per Beehave full taxonomy (es. 7-9 archetype con risk-aversion + group cohesion + retreat behavior). Defer expand a post-validation playtest data.

**Source ref**: F1 §"Tactical AI" lines 131-134.

### Action 3 — Sprint N gate row "failure-model parity" + N.7 micro-feature (P1, ~3h)

**Trigger**: prevent silent P2 attrition signal regression cross-stack Godot port.

**Scope**: aggiungere 1 row alla gate table Sprint N (master plan v2 line 820):

| Q                                                                                                                        | Threshold | Verifica                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Failure model parity**: `wounded_perma` persists Godot Resource state cross-encounter + `legacy_ritual` fires on death | Required  | Test: encounter A finisce con unit ferita → encounter B unit reload preserved wounded_perma → unit muore → legacy_ritual UI overlay fires |

**Sprint N.7 micro-feature aggiunto**: GDScript `WoundState.gd` Resource (custom class) + `LegacyRitualPanel.gd` overlay parity con web stack PR #1984. ~3h verification.

**Sprint N.7 spec doc**: [`docs/planning/2026-04-29-sprint-n7-failure-model-parity-spec.md`](../planning/2026-04-29-sprint-n7-failure-model-parity-spec.md) — SPEC DRAFT (impl deferred Sprint M.1 Godot bootstrap).

**Gate verdict user 2026-04-28**: gate row **MANDATORY 5/5 SÌ**. Failure-model parity NON è "nice-to-have". Senza preservation cross-encounter Godot port = creatura ferita "magicamente sana" encounter dopo = perdita identità tactical RPG attrition = perdita P2 def status. Gate fail = NO Fase 3 cutover. Documenta esplicito Sprint N.7 spec.

**Source ref**: F1 §"Battle Brothers" + F2 line 78 + Battle Brothers attrition pattern (research valida `wounded_perma` PR #1982 + `legacy_ritual` PR #1984 = architecturally correct attrition design).

### Action 4 — Sprint M.7 re-frame DioField command-latency p95 (P2, 0h)

**Trigger**: existing spike test latency è generic; research esplicita "command latency" come design crux per real-time-adjacent inputs.

**Scope**: re-cast existing `<100ms latency` cap (master plan v2 line 688) come **DioField command-latency p95 round-trip**:

- p95 round-trip button press → WS upgrade → Express WS receive → state update → echo back → Godot HTML5 client render
- Aggiungere baseline measure web v1 first per comparison (zero-extra-effort, riusa current backend)
- Document in spike output `docs/research/2026-04-28-godot-phone-composer-spike.md` (master plan v2 line 691)

**Effort**: 0h re-frame + ~30min documentation update.

**Source ref**: F1 §"DioField" + F2 line 97.

### Action 5 — Battle Brothers hardening pre-Godot web stack (P2, ~5h)

**Trigger**: chiudere P6 🟡 → 🟢 candidato in web stack PRIMA Sprint O port (semplifica porting + valida design pattern già nostro).

**Scope**: 2 hardening additivi ortogonali:

#### 5a — Injury severity stack (~3h, REVISED 2026-04-28 user verdict Q1)

- Extend `data/core/traits/active_effects.yaml` `wounded_perma` con **enum** `severity: light|medium|severe` field (NOT numeric — leggibile playtest debug)
- Backward-compat: vecchi `wounded_perma` esistenti senza field → **default `light`** (NO surprise difficulty regression spike)
- `apps/backend/services/combat/statusModifiers.js`: read enum → attack_mod penalty scaling:
  - `light` → -5%
  - `medium` → -15%
  - `severe` → -30%
- Test regression `tests/ai/*.test.js` (esistenti devono passare con default light)
- Test nuovi: 3 test case enum light/medium/severe attack_mod scaling + 1 backward-compat test (no field → default light)

#### 5b — Morale → action_speed coupling (~2.5h, REVISED 2026-04-28 user verdict Q2)

- `apps/backend/services/combat/statusModifiers.js`: aggiungi `slow_down` trigger when ANY of:
  - `unit.status.panic > 0` (mental panic — paura)
  - `unit.status.confused > 0` (mental confusion — disorientamento)
  - `unit.status.bleeding >= medium` severity (NOT minor — graffio leggero rimane neutral, NO double-penalty)
  - `unit.status.fracture >= medium` severity (NOT hairline — minor crack rimane neutral)
- → reduce `action_speed` by 1 tier (esistenti speed tiers in `roundOrchestrator.js`)
- **Severity threshold**: bleeding/fracture richiedono enum severity field analogo a `wounded_perma` Q1. Implementation: extend `bleeding` + `fracture` `active_effects.yaml` con `severity: minor|medium|major` field. Default **minor** backward-compat. Trigger `slow_down` solo `medium|major`.
- **User verdict Q2 2026-04-28**: minor NO trigger (preserva graffio leggero come neutral, NO double-penalty oltre HP drain). Major SÌ trigger ("ferito grave = compromesso totale" Battle Brothers attrition feel).
- Connect a `computeStatusModifiers` output esistente
- Test regression + 4 test case nuovi (panic→speed_drop / confused→speed_drop / bleeding-medium→speed_drop / bleeding-minor→NO speed_drop) + 2 backward-compat (bleeding senza severity = minor default, NO trigger)

**Effort**: ~5h totali. Blast-radius: localized a `statusModifiers.js` + `active_effects.yaml`. Pattern segue existing consumer shape esattamente. Zero breaking change.

**Source ref**: F1 §"Battle Brothers": _"sistema di injuries temporanee e permanenti è un asse portante del rischio... fatigue/initiative coupling"_.

### Action 6 — Sprint N "1 ambition" minimal long-arc campaign goal (P2, ~5-7h, REVISED 2026-04-28 user verdict Q3)

**Trigger**: research warn (F2 §"Questioni aperte"): _"quanto del gioco deve stare nel meta-loop? Se troppo poco, il combat diventa isolato"_. Senza ambition Sprint N gate pass tecnicamente ma player feel "demo vuota".

**Scope** (user verdict Q3 2026-04-28: opzione **C "fatto bene"**):

**Ambition seed**: _"Branco Skiv unisce Pulverator pack — alleanza emerge attraverso conflict + bond"_

**Implementation note critica** (user "fatto bene"): NON è "non combattere = win". Path completion **passa attraverso combat** (defeat Pulverator alpha encounter) MA outcome trigger reconciliation narrative beat (NOT slaughter):

- Encounter A-B-C: combat normale Skiv solo vs Pulverator pack (PR #1982 G1 base)
- Defeat Pulverator alpha → trigger choice ritual: "Fame + dominanza" vs "Bond proposal" (Disco-Elysium-style choice gated da bond_hearts threshold)
- Bond proposal path → narrative beat reconciliation + lineage_id merged + ambition complete
- Fame path → standard kill outcome, ambition `failed`, alternative seed proposto next campaign

Combat ancora drives loop (4-5 encounter sequenziali per build threshold). Completion = peace narrative MA combat path mandatory. Anti-pattern "ambition = avoid combat" prevented.

**Tech**:

- Long-arc campaign goal seed in `data/core/campaign/ambitions/skiv_pulverator_alliance.yaml` (NEW)
- Persistence cross-encounter (UnitProgression-like Resource Godot OR backend `campaignStore` pattern)
- Status surface UI overlay (1 line top-HUD: `🤝 Alleanza Pulverator: 2/5 incontri`)
- Trigger reward narrative beat su completion (debrief panel paragraph + voice line Skiv "Sabbia segue branco doppio.")
- Reuse QBN engine esistente (PR #1979) backend + bond_hearts gate from PR #1984
- Reuse `legacyRitualPanel.js` overlay pattern per choice ritual

**Effort**: ~5-7h totali REVISED (era ~3-5h, "fatto bene" implementation +2h: choice ritual + bond gate + reconciliation narrative beat).

**Lato gamer**: senza ambition = "perché combatto Pulverator encounter dopo encounter?" risposta "loot/XP" (meccanico). Con ambition C = "voglio capire se posso unire 2 branchi diversi" (narrativo + emotional stake — Skiv solitario alleato del nemico). Apex finale = scelta player (fame vs bond).

**Source ref**: F1 §"Battle Brothers" ambitions + F2 §"Questioni aperte" + PR #1984 legacy_ritual choice ritual pattern + PR #1982 Skiv G1 encounter Pulverator established.

### Action 7 — CT bar visual lookahead 3 turni (P2, ~4h, PROMOTED user verdict 2026-04-28)

**Trigger**: museum card M-2026-04-27-001 già curate FFT CT-bar + facing crit. User verdict 2026-04-28: lookahead **3 turni** (NOT solo current round).

**Scope**: `apps/play/src/render.js` `drawCtBar(unit, cx, cy)` + HUD overlay sequenza turni futuri:

- Read `initiative + action_speed - status_penalty` da `publicSessionView` (esistente)
- Compute lookahead 3 turni futuri (chi muove dopo current, dopo-dopo, dopo-dopo-dopo)
- Render strip top-HUD: `Skiv → nemico1 → healer → nemico2` (avatars 32px + arrow separatori)
- Pulsa current actor (subtle glow)
- Update real-time post-action (re-compute initiative)

**Effort**: ~4h totali. Apps/play frontend only, zero backend change.

**Lato gamer**: oggi vedi "turno 3 di X" generic. Con CT bar lookahead 3 turni = pianifichi "se faccio wait, salto avanti vs nemico1?". Equivale lettura intent ITB + ordine FFT. Pillar P1 leggibilità tattica chiusura sostanziale.

**Future expand**: post-playtest se player feel "info overload" → reduce lookahead 2 turni. Se feel "non basta" → expand 5 turni. Cap configurable via `apps/play/public/data/ui_config.json`.

**Source ref**: F1 §"FFT" + museum M-2026-04-27-001 (`docs/museum/cards/combat-fft-ct-bar-wait-facing-crit.md`).

## 3. Decision-altering check vs plan v2 decisions 3-10

| #   | Decision                                                           |                                      Verdict                                      |
| --- | ------------------------------------------------------------------ | :-------------------------------------------------------------------------------: |
| 3   | DevForge skip                                                      |                                    **CONFIRM**                                    |
| 4   | Donchitos cherry-pick (24 agent + 30 skill)                        |                                    **CONFIRM**                                    |
| 5   | HermeticOrmus cherry-pick 10-15 prompt                             |                                    **CONFIRM**                                    |
| 6   | NEW repo Game-Godot-v2                                             |      **CONFIRM** (research valida via Project-Tactics + nicourrea ref repos)      |
| 7   | Vertical slice 3-feature (combat+mating+thoughts)                  | **CONFIRM** (research domain agent: scope correct, NO Brigandine seasonal expand) |
| 8   | Backend Express + Prisma + WS persiste Fase 3                      |                                    **CONFIRM**                                    |
| 9   | Mission Console deprecated immediate Fase 3                        |                                    **CONFIRM**                                    |
| 10  | Donchitos `/art-bible` `/asset-spec` `/asset-audit` defer Sprint K |                                    **CONFIRM**                                    |

**Conclusione**: ZERO decision-altering. Plan v2 v2 → v3 NON necessario.

## 4. Anti-pivot guard

Research warn esplicita (F2 §"Raccomandazione progettuale"):

- **NO** switch a card-actions Midnight Suns senza ADR + user OK + 12-mesi sunk cost re-evaluation
- **NO** switch a RTTB DioField (perde sequential simultaneous round model M17)
- **NO** switch hex grid Brigandine senza Sprint M.4 hex/square spike post-Godot bootstrap

12 mesi sunk cost in d20 + grid square + AP model. Pivot architetturale richiede ADR esplicito separato.

## 5. Citazioni deferred (BACKLOG + OPEN_DECISIONS)

3 reference patterns deferred via citation-only (zero plan v2 cost):

- **Brigandine seasonal Organization Phase** — reference P2 macro-loop deferred M12+ (currently roadmap "P2 full Form evoluzione deferred ~35h"). Aggiungi `BACKLOG.md` row.
- **Tactics Ogre rewind/WORLD-Chariot** — anti-frustration ammortizer P6 hardcore-iter7 deadlock complementary a `wounded_perma` regret. Aggiungi `OPEN_DECISIONS.md` row.
- **Midnight Suns 3-card-plays + Heroism economy** — design precedent thoughts ritual UI scope. Cita in next thoughts-ritual ADR (rinforza decision audit).

**Effort cumulativo**: ~45min total citation work.

## 6. Effort delta totale plan v2 → v3 (post-action, REVISED 2026-04-28 user verdict)

| Action                                                             | Priority |     Effort     |
| ------------------------------------------------------------------ | :------: | :------------: |
| 1 — Sprint M.4b reference codebase study                           |    P1    |      ~7h       |
| 2 — Sprint N.4 pre-read tactical AI (minimal scope, future expand) |    P1    |      ~3h       |
| 3 — Sprint N gate row + N.7 micro-feature (MANDATORY 5/5)          |    P1    |      ~3h       |
| 4 — Sprint M.7 re-frame DioField                                   |    P2    | 0h + 30min doc |
| 5a — Injury severity 3-tier stack                                  |    P2    |      ~3h       |
| 5b — Slow_down trigger expanded (panic+confused+bleeding+fracture) |    P2    |     ~2.5h      |
| 6 — Sprint N "1 ambition" Skiv-Pulverator alleanza NEW             |    P2    |     ~5-7h      |
| 7 — CT bar visual lookahead 3 turni NEW (museum M-001 promote)     |    P2    |      ~4h       |
| 8 — Citations BACKLOG/OPEN_DECISIONS/ADR (renumbered da 6)         |    P3    |     ~45min     |

**Total delta plan v2 REVISED 2x**: ~+29-31h aggiunti (~+2.5% base 14 sett, justified). Trend: +19h pre-verdict → +27h post-Q1-Q9 batch 1 → +29-31h post-Q3 ambition expand "fatto bene" (~5-7h vs 3-5h originale).

## 7. Esecuzione (REVISED 2026-04-28 user verdict)

| Action                                    | Quando                                                    | Owner                           |
| ----------------------------------------- | --------------------------------------------------------- | ------------------------------- |
| **Action 5a + 5b (BB hardening) PRIMA**   | **PRE Sprint G v3** (chiude P6 🟡→🟢 candidato pre-asset) | gameplay-programmer + qa-tester |
| Action 7 (CT bar lookahead 3) parallel    | Post Action 5 ship, pre Sprint G v3                       | gameplay-programmer             |
| Sprint G v3 (asset swap)                  | Dopo Action 5+7                                           | claude-code + master-dd         |
| Action 6 (1 ambition) parallel Sprint G   | Backend QBN seed + UI overlay during asset swap window    | gameplay-programmer             |
| Action 1 (Sprint M.4b reference codebase) | Pre Sprint N start (post Sprint I playtest)               | claude-code + master-dd         |
| Action 2 (Sprint N.4 pre-read AI)         | Pre Sprint N.4                                            | claude-code                     |
| Action 3 (Sprint N gate row MANDATORY)    | Append a Sprint N spec doc                                | claude-code                     |
| Action 4 (Sprint M.7 re-frame)            | Append a Sprint M.7 spec doc                              | claude-code                     |
| Action 8 (citations)                      | One-shot batch end-of-sprint                              | claude-code                     |

**User verdict 2026-04-28**: ordine Action 5 — **PRIMA Sprint G v3 hardening** (NOT post). Rationale user: profondità sistemica precede polish visivo. Risk merge collision asset swap = mitigato (Action 5 tocca `apps/backend/services/combat/` + `data/core/traits/`, Sprint G v3 tocca `apps/play/public/assets/legacy/` + `apps/play/src/render.js` — disjoint file ownership).

## 8. Conseguenze

**Positive**:

- Plan v2 production-ready preservato (no riscrittura)
- 5 micro-actions trackable autonomo
- Battle Brothers attrition pattern formalmente validato come design canonical Evo-Tactics
- Reference repos canonical aggiunti pre-Sprint M-N Godot porting (de-risk)
- P6 🟡 → 🟢 candidato chiusura web stack (Action 5)

**Negative / risks**:

- ~+29-31h delta plan v2 effort (~+2.5% vs base 14 sett, REVISED post-user verdict 2026-04-28) — accettabile
- Action 1 study time potrebbe estendersi se reference repo arch divergente (cap 7h hard)
- Action 5 Battle Brothers hardening richiede test regression accurato (~+1h buffer)

**Rollback**:

- Action 1+2+4: doc-only, zero rollback need
- Action 3: gate row removal triviale se gate fail
- Action 5: revert commit branch hardening pre-merge se test regression
- Action 6: citation rollback triviale

## 9. References

- Source files deep research:
  - `C:\Users\VGit\Desktop\deep-research-report SIstemi SRPG e strategy.md`
  - `C:\Users\VGit\Desktop\deep-research-report SIstemi SRPG e strategy parte 2.md`
- Synthesis doc: [`docs/research/2026-04-28-deep-research-synthesis.md`](../research/2026-04-28-deep-research-synthesis.md)
- Plan v2: [`docs/planning/2026-04-28-master-execution-plan.md`](../planning/2026-04-28-master-execution-plan.md)
- PR #1996 deep research synthesis (this branch parent)
- Research-cited canonical URLs:
  - Battle Brothers: `https://battlebrothersgame.com/tactical-combat-mechanics/`
  - Brigandine: `https://brigandine.happinet-games.com/gamesystem/?lang=en`
  - Midnight Suns: `https://midnightsuns.2k.com/it-IT/game-guide/gameplay/hero-abilities/`
  - DioField: `https://www.square-enix-games.com/it_IT/home/introducing-diofield-chronicle-brand-new-strategy-rpg-square-enix`
  - FFT manual + Famitsu interview: `https://shmuplations.com/fft/`
  - Tactics Ogre PSP manual: `https://support.na.square-enix.com/document/manual/1840/ogre.pdf`
  - Fire Emblem Iwata Asks: `https://iwataasks.nintendo.com/interviews/3ds/fire-emblem/0/0/`

## 10. Status tracking (REVISED 2026-04-28 user verdict, 9 actions)

| Action                                                             |   Status   | PR / commit                                                                                    |
| ------------------------------------------------------------------ | :--------: | ---------------------------------------------------------------------------------------------- |
| 1 — Sprint M.4b reference codebase study                           | 🟡 pending | TBD                                                                                            |
| 2 — Sprint N.4 pre-read tactical AI (minimal scope)                | 🟡 pending | TBD                                                                                            |
| 3 — Sprint N gate row + N.7 micro (MANDATORY 5/5)                  | 🟢 shipped | docs PR (gate row + [spec doc](../planning/2026-04-29-sprint-n7-failure-model-parity-spec.md)) |
| 4 — Sprint M.7 re-frame DioField                                   | 🟡 pending | TBD                                                                                            |
| 5a — Injury severity 3-tier stack                                  | 🟡 pending | TBD                                                                                            |
| 5b — Slow_down trigger expanded (panic+confused+bleeding+fracture) | 🟡 pending | TBD                                                                                            |
| 6 — Sprint N "1 ambition" minimal long-arc goal                    | 🟡 pending | TBD                                                                                            |
| 7 — CT bar visual lookahead 3 turni                                | 🟡 pending | TBD                                                                                            |
| 8 — Citations BACKLOG/OPEN_DECISIONS/ADR                           | 🟡 pending | TBD                                                                                            |

## 11. Open question Q5 grid-less — RESOLVED 2026-04-28

User feedback playtest informal 2026-04-28: tester signal "grafica pre-2000" + "movement BG3-like richiesto". Dato data-driven (NOT speculative).

Background agent feasibility analysis output: [`docs/research/2026-04-28-grid-less-feasibility.md`](../research/2026-04-28-grid-less-feasibility.md).

**Decision finale**: NEW separate ADR [`ADR-2026-04-28-bg3-lite-plus-movement-layer.md`](./ADR-2026-04-28-bg3-lite-plus-movement-layer.md) — **BG3-lite Plus** scope ~10-12g middle-tier.

**Rationale verdict**:

- NOT Scenario A (ignora feedback) — tester signal reale
- NOT Scenario B Hybrid full ~14-18g — overshoot (3 feature low-value skippable: encounter free-form + euclidean + curve native)
- NOT Scenario C Midnight Suns ~12-16 sett — NO card signal user
- NOT Scenario D DioField ~20-30 sett — anti-pattern total break round model M17

**BG3-lite Plus** = frontend visual abstraction (Tier 1 ~6-7g) + cherry-pick 3 backend Hybrid features (Tier 2 ~+4-5g): sub-tile positioning + vcScoring float + flanking continuous angle.

**Pillar impact**: 4 pillar lift (P1+P4+P5+P6) con 65% effort vs Hybrid full. Skiv echolocation feel improved.

**Anti-pivot guard ADR §4** rimane intatto — BG3-lite Plus NON è pivot architetturale (mantiene round model M17 + d20 + AP + grid math backend). Solo visual abstraction + 3 add-ons additive.

**New Sprint G.2b** post Sprint G v3 asset swap, pre Sprint I TKT-M11B-06 playtest. Spike POC 1 giorno pre-commit full.

**Next sync**: aggiorna status table when ogni action ship.
