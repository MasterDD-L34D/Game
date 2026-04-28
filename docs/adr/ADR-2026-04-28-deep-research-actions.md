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

**Output**: 1-page Beehave behavior tree template per archetype (vanguard / skirmisher / healer) seeded da BB enemy taxonomy. File: `docs/research/2026-04-28-tactical-ai-archetype-templates.md`.

**Effort**: ~2h read + ~1h template authoring = ~3h totali.

**Source ref**: F1 §"Tactical AI" lines 131-134.

### Action 3 — Sprint N gate row "failure-model parity" + N.7 micro-feature (P1, ~3h)

**Trigger**: prevent silent P2 attrition signal regression cross-stack Godot port.

**Scope**: aggiungere 1 row alla gate table Sprint N (master plan v2 line 820):

| Q                                                                                                                        | Threshold | Verifica                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Failure model parity**: `wounded_perma` persists Godot Resource state cross-encounter + `legacy_ritual` fires on death | Required  | Test: encounter A finisce con unit ferita → encounter B unit reload preserved wounded_perma → unit muore → legacy_ritual UI overlay fires |

**Sprint N.7 micro-feature aggiunto**: GDScript `WoundState.gd` Resource (custom class) + `LegacyRitualPanel.gd` overlay parity con web stack PR #1984. ~3h verification.

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

#### 5a — Injury severity stack (~3h)

- Extend `data/core/traits/active_effects.yaml` `wounded_perma` con `severity: 1|2|3` field
- `apps/backend/services/combat/statusModifiers.js`: read severity → attack_mod penalty scaling -5% / -15% / -30%
- Test regression `tests/ai/*.test.js` (esistenti devono passare)
- Test nuovi: 3 test case severity 1/2/3 attack_mod scaling

#### 5b — Morale → action_speed coupling (~2h)

- `apps/backend/services/combat/statusModifiers.js`: aggiungi `morale_low` trigger when `unit.status.panic > 0` OR `unit.status.confused > 0` → reduce `action_speed` by 1 tier (esistenti speed tiers in `roundOrchestrator.js`)
- Connect a `computeStatusModifiers` output esistente
- Test regression + 2 test case nuovi panic→speed_drop / confused→speed_drop

**Effort**: ~5h totali. Blast-radius: localized a `statusModifiers.js` + `active_effects.yaml`. Pattern segue existing consumer shape esattamente. Zero breaking change.

**Source ref**: F1 §"Battle Brothers": _"sistema di injuries temporanee e permanenti è un asse portante del rischio... fatigue/initiative coupling"_.

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

## 6. Effort delta totale plan v2 → v3 (post-action)

| Action                                    | Priority |     Effort     |
| ----------------------------------------- | :------: | :------------: |
| 1 — Sprint M.4b reference codebase study  |    P1    |      ~7h       |
| 2 — Sprint N.4 pre-read tactical AI       |    P1    |      ~3h       |
| 3 — Sprint N gate row + N.7 micro-feature |    P1    |      ~3h       |
| 4 — Sprint M.7 re-frame DioField          |    P2    | 0h + 30min doc |
| 5a — Injury severity stack                |    P2    |      ~3h       |
| 5b — Morale→action_speed coupling         |    P2    |      ~2h       |
| 6 — Citations BACKLOG/OPEN_DECISIONS/ADR  |    P3    |     ~45min     |

**Total delta plan v2**: ~+19h aggiunti (~14.5 sett v3 vs 14 sett v2 master plan totale, justified +1.5%).

## 7. Esecuzione

| Action                         | Quando                                     | Owner                           |
| ------------------------------ | ------------------------------------------ | ------------------------------- |
| Action 1 (Sprint M.4b)         | Pre Sprint N start                         | claude-code + master-dd         |
| Action 2 (Sprint N.4 pre-read) | Pre Sprint N.4                             | claude-code                     |
| Action 3 (Sprint N gate row)   | Append a Sprint N spec doc                 | claude-code                     |
| Action 4 (Sprint M.7 re-frame) | Append a Sprint M.7 spec doc               | claude-code                     |
| Action 5a + 5b (BB hardening)  | **PRE-Godot** (web stack Sprint G+ window) | gameplay-programmer + qa-tester |
| Action 6 (citations)           | One-shot batch                             | claude-code                     |

**Open question pending master DD**: ordine esecuzione Action 5 — pre Sprint G v3 (asset swap) o post Sprint G v3 ma pre Sprint I (playtest)? **Default**: post Sprint G v3 (no merge collision con asset swap branch).

## 8. Conseguenze

**Positive**:

- Plan v2 production-ready preservato (no riscrittura)
- 5 micro-actions trackable autonomo
- Battle Brothers attrition pattern formalmente validato come design canonical Evo-Tactics
- Reference repos canonical aggiunti pre-Sprint M-N Godot porting (de-risk)
- P6 🟡 → 🟢 candidato chiusura web stack (Action 5)

**Negative / risks**:

- ~+19h delta plan v2 effort (~+1.5% vs base 14 sett) — accettabile
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

## 10. Status tracking

| Action                                   |   Status   | PR / commit |
| ---------------------------------------- | :--------: | ----------- |
| 1 — Sprint M.4b reference codebase study | 🟡 pending | TBD         |
| 2 — Sprint N.4 pre-read tactical AI      | 🟡 pending | TBD         |
| 3 — Sprint N gate row + N.7 micro        | 🟡 pending | TBD         |
| 4 — Sprint M.7 re-frame DioField         | 🟡 pending | TBD         |
| 5a — Injury severity stack               | 🟡 pending | TBD         |
| 5b — Morale→action_speed coupling        | 🟡 pending | TBD         |
| 6 — Citations BACKLOG/OPEN_DECISIONS/ADR | 🟡 pending | TBD         |

**Next sync**: aggiorna status table when ogni action ship.
