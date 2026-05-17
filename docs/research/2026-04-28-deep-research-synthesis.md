---
title: 2026-04-28 Deep research SRPG/strategy synthesis — gap analysis × master plan v2
doc_status: draft
doc_owner: master-dd
workstream: planning
last_verified: 2026-04-28
language: it
review_cycle_days: 14
related:
  - 'docs/planning/2026-04-28-master-execution-plan.md'
  - 'docs/planning/2026-04-28-godot-migration-strategy.md'
  - 'docs/planning/2026-04-28-asset-sourcing-strategy.md'
  - 'docs/planning/2026-04-28-deep-research-staging.md'
  - 'docs/museum/MUSEUM.md'
---

# Deep research SRPG/strategy synthesis — gap analysis × plan v2

> **Scope**: sintesi di 2 deep research (18 SRPG/strategy titoli) contestualizzata a master plan v2 e a Evo-Tactics domain reality. Non riscrive plan v2 — produce action items concrete + decision-altering check.

## Source

- **File 1**: `deep-research-report SIstemi SRPG e strategy.md` (140 LOC, 35KB) — matrice comparativa + breakdown analitico per titolo + piste tecniche
- **File 2**: `deep-research-report SIstemi SRPG e strategy parte 2.md` (160 LOC, 40KB) — versione iterata: 3 assi discriminanti (turn economy / spazio / costo errore) + raccomandazione "grid sì o no" + reference repo prioritari

**Coverage**: FFT, Tactics Ogre, Fell Seal, Fire Emblem, Brigandine, Battle Brothers, Expeditions, Horizon's Gate, Disgaea 5, Midnight Suns, DioField Chronicle, Shining Force, Gladius, Mystaria, Golden Sun, Vandal Hearts, Persona 5 Tactica, Redemption Reapers — **4 famiglie design**: job-grid tattica + campagna+logistica+tattica + ibridi rottura + system-heavy sandbox.

## Executive summary

Research è **research design SRPG genre** — orthogonal a plan v2 (infrastructure/asset/migration phased) MA highly relevant per:

1. Sprint N vertical slice MVP scope (combat + mating + thoughts) — research conferma plan v2 scope corretto post review (3-feature)
2. Pillar P1+P2+P6 combat design — match Battle Brothers attrition pattern (Evo-Tactics ha già `wounded_perma` PR #1982 + `legacy_ritual` PR #1984)
3. Sprint M-N Godot porting — 4 reference repos canonical (Project-Tactics + Lex Talionis + Wesnoth + OpenXcom) NON citati in plan v2
4. Sprint N.4 AI port — XCOM:EU GDC postmortem + Battle Brothers AI dev blog mancano da plan v2 source list

**Decision-altering check vs plan v2 decisions 3-10**: **NONE**. Tutte le decisions confermate. Plan v2 → v3 full rewrite NON necessario. Synthesis doc + 7 actionable tickets sufficient.

## Cross-ref matrix (research finding × plan v2 sprint)

| #   | Research finding                                                                                      | Source ref                                            | Plan v2 sprint                     | Impact                                              | Effort      | Priority |
| --- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------------- | --------------------------------------------------- | ----------- | :------: |
| 1   | Project-Tactics + OpenXcom + Wesnoth + Lex Talionis come porting source canonical                     | F1 §"Engine e systems" + F2 lines 125-132             | Sprint M.4 / N.3 / N.4             | HIGH (concrete code reference, save reinvention)    | +3h study   |    P1    |
| 2   | Tactical AI postmortems (XCOM:EU GDC + Battle Brothers AI dev blog) per Beehave templates             | F1 §"Tactical AI" lines 131-134                       | Sprint N.4                         | HIGH (archetype behavior templates)                 | +2h read    |    P1    |
| 3   | Battle Brothers failure model = match Evo-Tactics `wounded_perma` + `legacy_ritual` (validation lift) | F1 §"Battle Brothers" + F2 §"Battle Brothers" line 78 | Sprint N gate + N.7 micro-feature  | HIGH (P2 attrition signal cross-stack preservation) | +3h         |    P1    |
| 4   | DioField command-latency frame Sprint M.7 phone composer spike                                        | F1 §"DioField" + F2 line 97                           | Sprint M.7                         | MEDIUM (re-framing existing spike)                  | 0h re-frame |    P2    |
| 5   | Grid-shape assumption "square stays" explicit doc                                                     | F2 §"Raccomandazione progettuale" line 155            | Sprint M.1 / N.1                   | MEDIUM (audit clarity)                              | +30min      |    P2    |
| 6   | nicourrea/Tactical-RPG (Godot A\*) come pathfinding extraction                                        | F1 §"Repos e implementazioni"                         | Sprint M.4 prereq                  | HIGH (de-risk Godot pathfinding)                    | +4h study   |    P1    |
| 7   | Battle Brothers injury severity stack + morale-fatigue coupling (P6 hardening)                        | F1 §"Battle Brothers"                                 | docs/balance + active_effects.yaml | MEDIUM (P6 🟡 → 🟢 candidato)                       | +5h         |    P2    |
| 8   | FFT CT bar visual + facing crit 3-zone (museum M-2026-04-27-001)                                      | F1 §"FFT"                                             | apps/play render.js                | MEDIUM (P1 legibility upgrade)                      | +8h         |    P2    |
| 9   | Brigandine macro-loop stagionale come reference P2 deferred M12+                                      | F1 §"Brigandine" + F2 §"Brigandine"                   | BACKLOG.md                         | LOW (future-proof citation)                         | 0h citation |    P3    |
| 10  | Midnight Suns card economy precedent thoughts ritual UI scope                                         | F1 §"Midnight Suns" + F2 §"Midnight Suns"             | docs/adr/ thoughts ritual          | LOW (audit strength)                                | +15min      |    P3    |
| 11  | Tactics Ogre rewind/WORLD-Chariot ammortizer P6 fairness option                                       | F1 §"Tactics Ogre" line 50-51                         | OPEN_DECISIONS.md                  | LOW (deferred option)                               | +15min      |    P3    |

## Domain fit summary (per Pilastro)

| Pillar        | Current state                                                                     | Best research match                                                        | Gap                                                                          | Recommended action                                                                                                                      |
| ------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| P1 Tattica    | 🟢 square + predict_combat hover (#1975) + ITB telegraph                          | FFT CT-bar + facing crit 3-zone                                            | CT bar visual + facing 3-zone unshipped                                      | TKT museum M-001 ~8h                                                                                                                    |
| P2 Spore      | 🟢 def propagateLineage + lifecycle + Spore S1-S6 + wounded_perma + legacy_ritual | Battle Brothers attrition (validated) + Brigandine org-phase (future M12+) | Cross-stack persistence Godot Sprint N untested                              | Sprint N gate row failure-model parity ~3h                                                                                              |
| P3 Specie×Job | 🟢 35 ability r1-r4 (#1978)                                                       | Fell Seal subclass synergy                                                 | r3/r4 shipped MA combo chain surface zero visible                            | Cobalt Core position-conditional bonus museum M-2026-04-27-024 ~4h                                                                      |
| P4 MBTI       | 🟡++ T_F full + thought cabinet UI (#1966)                                        | Disco Elysium + Persona 5 Tactica cover-chain                              | 3 axes partial, museum M-2026-04-25-009 Triangle Strategy MBTI 5/5 forgotten | Triangle Strategy transfer plan deferred                                                                                                |
| P5 Co-op      | 🟡→🟢 post TKT-M11B-06                                                            | Battle Brothers ambitions + world-crises                                   | Long-arc campaign goal missing → "combat isolated" risk                      | Single ambition wire QBN ~5-7h REVISED (Q3 verdict opt C Skiv-Pulverator alleanza fatto bene, vedi ADR-deep-research-actions §Action 6) |
| P6 Fairness   | 🟡 status engine wired + harness pending                                          | Battle Brothers injury stack + morale-fatigue coupling                     | wounded_perma binary not severity-stack; morale not→initiative modifier      | Injury severity ~3h + morale→action_speed ~2h                                                                                           |

## Key insights synthesized

### 1. Failure model = Battle Brothers attrition (validation lift, NOT pivot)

Evo-Tactics combat surface ha già 3 layer Battle Brothers-style:

- `wounded_perma` status (PR #1982 Skiv G1 encounter) = BB permanent injury
- `legacy_ritual` (PR #1984 G4) = company-level attrition consequence (player choose what preserve)
- `propagateLineage` (PR #1918) = roster-level replayability via generational carry-forward

Research valida: _"il sistema di injuries temporanee e permanenti è un asse portante del rischio... il gioco rifiuta una quest line lineare rigida e usa ambitions come struttura di replayability"_ (F1 §"Battle Brothers", source: `https://battlebrothersgame.com/tactical-combat-mechanics/`).

**Gap**: nostro `wounded_perma` è binario (present/absent). BB ha severity scale stacked. Hardening additive ~3h: extend `data/core/traits/active_effects.yaml` con severity 1/2/3 → attack_mod scaling -5%/-15%/-30% via `statusModifiers.js`.

### 2. Reference repo extraction pre-Sprint N (P1 actionable)

Plan v2 Sprint M-N cita Donchitos template + Aseprite Wizard / Beehave / Phantom Camera / GUT plugins. **NON cita** 4 reference repos canonical research:

- **nicourrea/Tactical-RPG (Godot A\*)** — pathfinding GDScript extraction Sprint M.4 prereq (~4h)
- **OpenXcom (C++ AI module)** — utility scoring per declareSistemaIntents Sprint N.4 prereq (~8h reverse-eng)
- **Project-Tactics (FFT-like architecture)** — validation reference data model unit/turn/action/tile (~3h study, NO extraction)
- **Lex Talionis (FE-like Python free)** — defer post-Godot N (alternative lineage, low priority)
- **Battle for Wesnoth (hex)** — defer post-Godot hex spike se mai

**Effort cumulativo P1**: ~15h aggiunti pre-Sprint N (M.4b reference codebase study + N.4 AI pre-read). De-rischia 4-5 settimane Sprint N port vs reinvention.

### 3. Sprint N gate row aggiunto: failure-model parity

Plan v2 Sprint N gate (line 820 master plan v2) verifica P1+P2+P4+P6 ma NON verifica esplicitamente **wounded_perma + legacy_ritual cross-stack persistence**. Risk: Godot port green-light P2 (mating) + P4 (thoughts) ma silently break P2 attrition signal cross-encounter.

**Action**: aggiungi gate row Sprint N: _"Failure model parity: wounded_perma persists Godot Resource state cross-encounter + legacy_ritual fires on death"_. Verifica Battle Brothers-pattern preservation.

### 4. Sprint M.7 spike = DioField command-latency frame (0h re-frame)

Sprint M.7 phone composer Godot HTML5 spike (master plan v2 lines 678-689) misura touch latency + DPI + virtual keyboard. **NON misura** end-to-end command latency button→WS→backend→state-echo. Research: DioField command latency è "design crux" per real-time-adjacent inputs (F1 §"DioField" + F2 line 97).

**Action**: re-frame existing <100ms cap come **DioField command-latency p95 round-trip cap**. Aggiungi web v1 baseline measure prima per comparison. Zero effort delta.

### 5. Brigandine seasonal + Tactics Ogre rewind = backlog deferred

Research evidenzia 2 pattern future-proof per gap pillars residui:

- **Brigandine Organization Phase** stagionale = reference P2 macro-loop deferred M12+ (currently roadmap "P2 full Form evoluzione deferred ~35h")
- **TO Reborn WORLD/Chariot rewind** = anti-frustration ammortizer per P6 hardcore-iter7 deadlock (mitigation complementary a `wounded_perma` regret)

**Action**: BACKLOG.md row + OPEN_DECISIONS.md row. Citation-only, zero plan v2 cost.

### 6. NON adottare (anti-pivot guard)

Research esplicita warn (F2 §"Raccomandazione progettuale") che switch a card actions Midnight Suns dovrebbe accadere SOLO se _"obiettivo centrale non è lo spazio in sé, ma il ritmo delle decisioni"_. Evo-Tactics ha 12 mesi sunk cost in d20+grid square+AP model. **NO pivot**.

Similar: hex grid pivot (Brigandine + BB ref) costo ~30-40h refactor blast-radius (rewrite roundOrchestrator pathfinding + render.js + encounter YAML coords). **NO pivot Sprint N — defer post-Godot decision** (Godot TileMap supporta hex nativo, Sprint M.4 può spike hex/square).

## Top 5 actionable (priority + effort)

1. **[P1, ~3h] Add Sprint M.4b reference codebase study** — clone Project-Tactics + nicourrea/Tactical-RPG + OpenXcom + Lex Talionis to `/tmp/`, extract turn scheduler + grid + AI scoring patterns. Output: `docs/research/2026-04-28-srpg-engine-reference-extraction.md`. Pre-Sprint N.3 prerequisite.

2. **[P1, ~2h] Add Sprint N.4 pre-read** — Battle Brothers AI dev blog (`https://battlebrothersgame.com/tactical-combat-mechanics/`) + XCOM:EU GDC postmortem. Output: 1-page Beehave behavior tree template per archetype (vanguard/skirmisher/healer) seeded da BB enemy taxonomy. De-risk Sprint N.4 vcScoring + AI port.

3. **[P1, ~3h] Sprint N gate row aggiunto + N.7 micro-feature** — "Failure model parity: wounded_perma persists Godot Resource cross-encounter + legacy_ritual fires on death". Battle Brothers-pattern preservation gate.

4. **[P2, 0h] Re-frame Sprint M.7 spike come DioField command-latency test** — existing <100ms cap re-cast come round-trip p95 button→WS→backend→state-echo. Add web v1 baseline measure per comparison.

5. **[P2, ~5h] Battle Brothers hardening web stack pre-Godot** — injury severity stack (~3h, `wounded_perma` severity 1/2/3 in `active_effects.yaml` → `statusModifiers.js` attack_mod scaling) + morale→action_speed coupling (~2h, `panic`/`confused` → action_speed tier reduction in `statusModifiers.js`). Test regression `tests/ai/*.test.js`. Closes P6 🟡 hardening gap before Godot port.

## Plan v2 → v3 changelog (proposed minimal)

**Decision**: NO full rewrite plan v2. Plan v2 production-ready. Aggiungi **only** 5 micro-changes via separate ADR / append section:

1. Sprint M.4b NEW (~3h reference codebase study)
2. Sprint N.4 pre-read aggiunto (~2h Battle Brothers + XCOM AI)
3. Sprint N gate table row "Failure model parity" aggiunto (+3h N.7 verification)
4. Sprint M.7 description annotated "DioField command-latency p95 round-trip" (0h re-frame)
5. Sprint M.1 + N.1 annotation "grid stays square per FFT-job-system fit; flanking via channels (resistanceEngine.js PR #1964) NOT geometry" (audit clarity 30min)

**Total effort delta**: +11h aggiunti (~1.5 sett v2 totale → 14.5 sett v3, justified) + 3 doc citations (BACKLOG + OPEN_DECISIONS + thoughts-ritual ADR).

## Decision-altering check vs plan v2 decisions 3-10

| #   | Decision plan v2                                                   | Research impact                                                              |       Verdict       |
| --- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- | :-----------------: |
| 3   | DevForge skip                                                      | Not addressed                                                                | **CONFIRM default** |
| 4   | Donchitos cherry-pick (24 agent + 30 skill)                        | Not addressed (research ortho a Donchitos)                                   | **CONFIRM default** |
| 5   | HermeticOrmus cherry-pick 10-15 prompt                             | Not addressed                                                                | **CONFIRM default** |
| 6   | NEW repo Game-Godot-v2                                             | Research ref repos validate (Project-Tactics + nicourrea Godot)              |     **CONFIRM**     |
| 7   | Vertical slice 3-feature (combat+mating+thoughts)                  | Research domain agent CONFIRMS scope correct, do NOT add Brigandine seasonal | **CONFIRM default** |
| 8   | Backend Express + Prisma + WS persiste Fase 3                      | Not addressed                                                                | **CONFIRM default** |
| 9   | Mission Console deprecated immediate Fase 3                        | Not addressed                                                                | **CONFIRM default** |
| 10  | Donchitos `/art-bible` `/asset-spec` `/asset-audit` defer Sprint K | Not addressed                                                                | **CONFIRM default** |

**Conclusione**: ZERO decision-altering. Plan v2 production-ready confermato. Solo additive micro-changes (5 sopra) raccomandati via append doc o ADR separato.

## Anti-pattern + risk

- **NON adottare** Midnight Suns card-actions / DioField RTTB / hex grid Brigandine senza ADR esplicito + user OK + 12-mesi sunk cost re-evaluation. Research warn esplicita.
- **NON espandere** Sprint N vertical slice oltre 3-feature (combat+mating+thoughts) con seasonal Brigandine — research domain agent valida scope corrente.
- **NON saltare** Battle Brothers AI dev blog pre-Sprint N.4 — risk reinvention Beehave templates.

## Open questions (carry-over post-synthesis)

1. Sprint N.7 vs N.8: dove fit "failure-model parity" gate verification? (raccomanda N.7 micro-feature)
2. Battle Brothers hardening pre-Godot vs post-Godot? (raccomanda **pre-Godot** — chiude P6 🟡 → 🟢 candidato in web stack, semplifica Sprint O port)
3. Reference codebase extraction = NEW research doc o append a master plan? (raccomanda NEW `docs/research/2026-04-28-srpg-engine-reference-extraction.md`)
4. itch.io Cloudflare bypass per pack secondary? (research non addressa, defer Sprint H protocol)

## References sintetizzate

**Source files**:

- F1: `C:\Users\VGit\Desktop\deep-research-report SIstemi SRPG e strategy.md`
- F2: `C:\Users\VGit\Desktop\deep-research-report SIstemi SRPG e strategy parte 2.md`

**Research-cited URLs (canonical)**:

- Battle Brothers tactical combat mechanics: `https://battlebrothersgame.com/tactical-combat-mechanics/`
- Brigandine game system: `https://brigandine.happinet-games.com/gamesystem/?lang=en`
- Midnight Suns hero abilities: `https://midnightsuns.2k.com/it-IT/game-guide/gameplay/hero-abilities/`
- DioField intro Square Enix: `https://www.square-enix-games.com/it_IT/home/introducing-diofield-chronicle-brand-new-strategy-rpg-square-enix`
- FFT manual + interview: `https://www.gamesdatabase.org/Media/SYSTEM/Sony_Playstation/manual/Formated/Final_Fantasy_Tactics_-_1998_-_Sony_Computer_Entertainment.pdf` + `https://shmuplations.com/fft/`
- Tactics Ogre PSP manual: `https://support.na.square-enix.com/document/manual/1840/ogre.pdf`
- Fire Emblem Iwata Asks: `https://iwataasks.nintendo.com/interviews/3ds/fire-emblem/0/0/`

**Reference repos (priority order Sprint M-N)**:

- P1: `https://github.com/nicourrea/Tactical-RPG` (Godot A\*) — Sprint M.4 pathfinding
- P1: `https://github.com/OpenXcom/OpenXcom` (C++ tactical AI module) — Sprint N.4 AI scoring
- P1: `https://github.com/Project-Tactics/Project-Tactics` (FFT-like architecture validation) — Sprint M.4 study
- P2: `https://lex-talionis.net/` (FE-like Python free) — defer post-Godot
- P3: `https://github.com/wesnoth/wesnoth` (hex + campaign + AI) — defer post-Godot hex spike

## Status

**DRAFT** — pending user review. Decision pending: applicare 5 micro-changes plan v2 → v3 inline (ADR append) oppure separate `docs/adr/ADR-2026-04-28-deep-research-actions.md`.

---

**Synthesis output**: 11 cross-ref entries + 6 pillar fit table + 6 key insights + 5 top actionable + 4 open questions. ZERO decision-altering. Plan v2 production-ready confermato.
