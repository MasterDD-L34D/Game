---
title: 2026-04-29 Master execution plan v3 — post Godot pivot decision
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-04-30
source_of_truth: true
language: it
review_cycle_days: 14
related:
  - 'docs/adr/ADR-2026-04-29-pivot-godot-immediate.md'
  - 'docs/planning/2026-04-28-master-execution-plan.md'
  - 'docs/planning/2026-04-28-godot-migration-strategy.md'
  - 'docs/planning/2026-04-28-asset-sourcing-strategy.md'
  - 'docs/planning/2026-04-29-sprint-n7-failure-model-parity-spec.md'
  - 'docs/research/2026-04-29-godot-pivot-cross-check.md'
  - 'docs/research/2026-04-28-srpg-engine-reference-extraction.md'
  - 'docs/research/2026-04-28-tactical-ai-archetype-templates.md'
---

# Master execution plan v3 — post Godot pivot decision

> **Scope**: piano esecutivo unificato post-pivot Godot v2 immediate (ADR-2026-04-29-pivot-godot-immediate). Replace plan v2 §FASE 1 Sprint G v3 + G.2b + H + I + relativa rubric session.

> **Versioning**: v3 post-pivot. v2 sections preserved as historical reference (Fase 1 Sprint G v3 shipped + Action 5/6/7 + ricerche), v2 §"Sprint G.2b" + §"Sprint H" + §"A1 rubric session" SUPERSEDED.

## Context

**Trigger pivot**: master-dd live test 2026-04-29 sera, post 22 PR cascade fix web stack co-op #2016-#2022, char creation overlay NEVER renders to player (race conditions cascade architecturali, NON whack-a-mole patches).

**User esplicito**: _"rifarlo bene seguendo le vertical sheet e usando godot e i nuovi asset e un design meglio studiato"_.

**Decision verdict**: Path B accelerated cap (cross-check + risk agent convergent). Pivot Godot v2 immediate, preserve Express backend cross-stack, drop Sprint G.2b BG3-lite Plus + A1 rubric + Sprint H itch.io.

## Goals

1. **Short-term (Fase 2 Godot, ~6-8 sett)**: Godot v2 NEW repo bootstrap + asset import + 3 mandatory spike + vertical slice MVP 3-feature + decision gate cutover/abort.
2. **Mid-term (Fase 3 cutover, ~4-8 sett)**: full session engine port + co-op WS Godot HTML5 + cutover Godot v2 OR archive R&D web v1 final.

**Total plan v3**: ~13-19 settimane (vs plan v2 14-21 settimane). Net savings ~1-2 sett.

## Non-goals

- ❌ Web stack co-op debug iteration (cascade race conditions = arch-fix needed, NOT patches)
- ❌ Sprint G.2b BG3-lite Plus ~10-12g (native Godot 2D zero effort)
- ❌ A1 rubric session 4 amici tester DIVERSI (formal abort, no tester run)
- ❌ Sprint H itch.io gap-fill (Godot Asset Library replace)
- ❌ Sprint I TKT-M11B-06 playtest userland (defer post-Godot Sprint N gate)
- ❌ Backend Express rewrite (preserve cross-stack persiste Fase 3)
- ❌ Hex grid pivot (square confermato ADR-2026-04-28-grid-type-square-final, anche Godot TileMap square-mode)
- ❌ Midnight Suns / DioField anti-pattern (round model M17 + d20 + AP preserved)

---

## FASE 1 — Web stack ship demo CHIUSA 2026-04-29

**Stato**: ✅ **CHIUSA con scope ridotto** post-pivot 2026-04-29.

### Shipped (22 PR mergiati main)

**Sprint Fase 1 ondata 3** (10 PR autonomous):

| PR    | Squash commit | Topic                                                                     |
| ----- | ------------- | ------------------------------------------------------------------------- |
| #1996 | `16fdebb7`    | Deep research SRPG/strategy synthesis + 5 ADR + 9 deferred Q              |
| #1997 | `5884e50f`    | Action 4 Sprint M.7 doc re-frame DioField command-latency p95             |
| #1998 | `bf9b39ff`    | Action 7 CT bar visual lookahead 3 turni (re-impl Godot Sprint N.1)       |
| #1999 | `252593b3`    | Action 5 BB hardening severity stack + slow_down (PRESERVE backend)       |
| #2000 | `246e1369`    | Action 2 tactical AI archetype templates (Sprint N.4 input)               |
| #2001 | `28eeb71a`    | Action 1 SRPG engine reference codebase extraction (Sprint M.4 input)     |
| #2002 | `d6f04300`    | Sprint G v3 Legacy Collection asset swap 47 PNG CC0 (re-import Godot ~1h) |
| #2003 | `c6587ce5`    | Spike POC BG3-lite Tier 1 (DEPRECATED post-pivot, archive only)           |
| #2004 | `dcba8295`    | Action 6 ambition Skiv-Pulverator (PRESERVE backend)                      |
| #2005 | `88a4fded`    | Action 3 Sprint N.7 spec failure-model parity (impl ready Sprint N.7)     |

**Sprint Fase 1 ondata 4** (7 PR follow-up):

| PR    | Squash commit | Topic                                                     |
| ----- | ------------- | --------------------------------------------------------- |
| #2006 | `9ba3a265`    | Memory ritual update v19                                  |
| #2007 | `be07ebae`    | Rubric launcher .lnk suite (DEPRECATED post-pivot)        |
| #2008 | `83f26050`    | fix(ai) ai_profile preserve normaliseUnit                 |
| #2009 | `2259634e`    | ERMES drop-in self-install E0-E6 (out-of-scope, isolated) |
| #2010 | `8b5d4ab9`    | governance registry ERMES                                 |
| #2011 | `8acc7389`    | docs asset workflow                                       |
| #2013 | `0fdd2853`    | fix(ai) utilityBrain oscillation root cause               |
| #2014 | `6a9bcc43`    | docs Workspace locale                                     |
| #2015 | `2694af54`    | Memory ritual + handoff doc post ondata 4                 |

**Cascade fix launcher web stack** (5 PR, 2026-04-29 sera, partial useful):

| PR    | Squash commit | Topic                                                |
| ----- | ------------- | ---------------------------------------------------- |
| #2016 | `2a931b9c`    | Worktree-aware launcher (PowerShell pipe)            |
| #2017 | `7c687403`    | Node helper + Setup-Ngrok-Auth                       |
| #2018 | `c06452aa`    | ASCII-only .bat parser fix                           |
| #2019 | `e8adf9dd`    | ngrok official ZIP installer (MS Store panic fix)    |
| #2020 | `ffb3a7ef`    | Coop snapshot first connect (partial fix)            |
| #2021 | `f98bc768`    | WS connect AFTER handler register race (partial fix) |
| #2022 | `090af63d`    | QR code lobby + onboarding hint                      |

### NOT shipped (DEPRECATED post-pivot)

| Item                                   | Reason DEPRECATED                                                                                                                     |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Sprint G.2b BG3-lite Plus ~10-12g      | Native Godot 2D zero effort: hide grid + smooth move + range cerchio + AOE shape + sub-tile + flanking 5-zone all built-in primitives |
| A1 rubric session 4 amici tester       | Formal abort, master-dd no tester recruit. Web stack race conditions cascade = no value gating G.2b dec-binary.                       |
| Sprint H itch.io gap-fill              | Godot Asset Library replace + Sprint M.3 covers Legacy import                                                                         |
| Sprint I TKT-M11B-06 playtest userland | Defer post-Godot Sprint N gate playtest (combined cycle)                                                                              |

### Test baseline post-Fase 1 closure

- AI 384/384 verde (tutti 22 PR)
- Format + governance + paths-filter + python-tests + dataset-checks + styleguide-compliance verdi
- 458 trait `active_effects.yaml` preserved
- 60+ encounter YAML preserved
- Skiv canon `docs/skiv/CANONICAL.md` preserved

### Pillar status finale post-Fase 1

| Pilastro                   | Stato pre-pivot |                       Stato post-pivot Fase 1 closure                        |
| -------------------------- | :-------------: | :--------------------------------------------------------------------------: |
| P1 Tattica leggibile (FFT) |      🟢++       |        🟢++ (CT bar + asset Legacy + BG3-lite Tier 1 ARCHIVE web v1)         |
| P2 Spore evoluzione        |      🟢++       |        🟢++ (mating + Spore + ambition Skiv-Pulverator wired backend)        |
| P3 Specie×Job              |       🟢ⁿ       |      🟢ⁿ (35 ability r1-r4 + Beast Bond + 4 jobs orfani Battle Sprite)       |
| P4 MBTI/Ennea              |      🟡++       | 🟡++ (T_F full + thought cabinet + thoughts ritual + tactical AI templates)  |
| P5 Co-op vs Sistema        |  🟢 candidato   | 🟡 (web stack co-op race conditions cascade UNRESOLVED, defer Godot rebuild) |
| P6 Fairness                |  🟢 candidato   |           🟢 candidato (BB attrition severity + slow_down trigger)           |

**5/6 stable post-pivot** + P5 regressed 🟢→🟡 pending Godot rebuild (architecturally correct fix vs whack-a-mole).

---

## FASE 2 — Godot R&D ACCELERATED (~6-8 settimane)

### Sprint M — Godot project bootstrap (~6-8 giorni REVISED post-pivot)

> **v3 changelog vs v2**: incorporate Sprint K Donchitos cherry-pick INSIDE Sprint M.1 (no separate Sprint K). Effort 5-7g → 6-8g per inclusione cherry-pick + 4 reference codebase study application.

**Strategy**: NEW separate repo `MasterDD-L34D/Game-Godot-v2`. Express backend resta su current repo `MasterDD-L34D/Game`.

#### M.1 — Repo creation + Godot 4.x install + Donchitos template adopt (~3-4g)

```bash
gh repo create MasterDD-L34D/Game-Godot-v2 --private --description "Evo-Tactics Godot 4.x port" --license mit
git clone https://github.com/MasterDD-L34D/Game-Godot-v2.git
cd Game-Godot-v2
```

Download Godot 4.x latest stable Windows. Open `project.godot` (auto-create) + pin `config_version`.

**Donchitos cherry-pick INCORPORATED**:

- 18 agent (16 Donchitos + 2 custom: evo-tactics-domain-specialist + skiv-curator)
- 32 skill cherry-picked production-focused
- 12 hook adapted
- 10 path-scoped rules adapted
- `production/review-mode.txt: lean`
- `CLAUDE.md` per repo Godot

#### M.2 — Plugin Asset Library install priority (~2g)

1. Aseprite Wizard (sprite anim pipeline)
2. LDtk import (encounter level authoring)
3. Phantom Camera 2D (cinematic camera grid combat)
4. Beehave (behavior tree visual editor)
5. Dialogue Manager 2 (narrative dialogue)
6. GdPlanningAI (GOAP-based AI behavior)
7. Pixel-perfect outline shader
8. CRT scanline shader
9. Dissolve / dither shader
10. GUT framework (test runner)

#### M.3 — Asset Legacy import (~2-3g)

Copy `apps/play/public/assets/legacy/` (47 PNG CC0 from #2002) → `Game-Godot-v2/assets/`:

- TileSet authoring per ogni bioma (TileSet resource `.tres`)
- AtlasTexture per character spritesheet (Battle Sprites 8 archetype)
- Aseprite Wizard import → SpriteFrames `.tres` per AnimationPlayer
- VFX → AnimatedSprite2D resources
- Skiv LPC override preserved (canonical, NO Legacy swap per Skiv canon)

#### M.4 — Reference codebase study application (~1g)

Apply Action 1 research findings (PR #2001, `docs/research/2026-04-28-srpg-engine-reference-extraction.md`):

- `Project-Tactics` (FFT-like architecture validation)
- `nicourrea/Tactical-RPG` (Godot A\* pathfinding extraction)
- `OpenXcom` (C++ tactical AI module → GDScript blueprint)
- `Lex Talionis` (FE-like alternative reference, defer)

Output: GDScript skeleton patterns docs `docs/godot-v2/architecture/` (NEW dir Game-Godot-v2 repo).

#### M.5 — Cross-stack backend spike (~4h, MANDATORY)

Test Express backend + Godot HTML5 cross-stack:

- CORS preflight OPTIONS GET/POST `/api/coop/*` da origin `https://masterdd-l34d.github.io`
- WS upgrade headers Godot WebSocketClient → Express ws@8.18.3 server :3341
- JWT Bearer auth `Authorization` header da Godot HTTPClient
- Latency baseline p50/p95/p99 measured 50ms artificial delay
- Postgres session persistence Godot client diversi (UUID identity unique)

**Output**: `docs/research/2026-04-30-cross-stack-spike-godot-express.md` con findings + go/no-go signal Sprint N commitment.

**Abort trigger**: SE latency p95 > 200ms o CORS unsolvable senza nginx reverse proxy → Sprint N delay + investigate alternative.

#### M.6 — CI minimal Game-Godot-v2 setup (~3h, MANDATORY)

```yaml
# Game-Godot-v2/.github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  gut:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: chickensoft-games/setup-godot@v1
        with:
          version: 4.x-stable
      - run: godot --headless --script tests/gut_runner.gd
  format:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: gdformat --check scripts/
```

#### M.7 — Phone composer Godot HTML5 spike (~2g, MANDATORY P5 gate)

**Scope minimal POC**:

- Godot HTML5 export → 1 button "ATTACK" pressed → emit WebSocket message → Express WS receive → state log
- Test su iOS Safari + Android Chrome real device (browser PWA)
- Touch input latency measure
- Virtual keyboard occlusion test (chat input field)
- DPI handling 320px width minimum

**Decision binary**: SE prototype works <100ms latency + UI scale OK su 320px → Sprint N gate criterion "phone composer portable" PRE-validated. SE fail → abort Godot decision PRIMA Sprint N.3-N.6 (3-4 settimane risparmio) o hybrid (phone web PWA + Godot TV view).

**Output**: `docs/research/2026-04-30-godot-phone-composer-spike-results.md` + binary go/no-go signal.

**Gate exit Sprint M**: project Godot bootstrappato + Donchitos integrated + plugin install + asset Legacy importati + 1 scene `Main.tscn` aperta + cross-stack spike PASS + CI green + phone composer spike PASS. Tutti 3 spike PASS → Sprint N commitment.

---

### Sprint N — Vertical slice MVP 3-feature ELEVATE GATE 0 (~4-5 settimane)

> **v3 changelog vs v2**: ELEVATE Sprint N.7 failure-model parity check come **GATE 0** (mandatory PRE Sprint N.1-N.6) per evitare silent P2 attrition regression late discovery.

**Goal**: 1 encounter combat + 1 mating trigger + 1 thoughts ritual playable end-to-end in Godot. Validare core loop Spore-like + MBTI thought cabinet visibility decision gate.

**Feature slice target**:

1. **Combat encounter**: `enc_tutorial_01` (savana, 2 PG vs 2 SISTEMA)
2. **Mating trigger**: post-combat 2 unit superstiti → `propagateLineage` lightweight (NO full lineage tree, solo 1-gen child stat preview)
3. **Thoughts ritual**: 1 PG end-of-encounter → 3 candidati top vcProxy score → choice UI (Disco Elysium-style) → status_lock

#### GATE 0 — Failure-model parity check (~3h, ELEVATE post-pivot)

Pre Sprint N.1 mandatory check (was Sprint N.7 plan v2):

- `WoundState.gd` Resource (custom class) impl per spec doc PR #2005
- `LegacyRitualPanel.gd` overlay parity con web stack PR #1984
- Cross-encounter persistence test: encounter A wound → save campaign state → encounter B reload → wound preserved
- Status_lock gate test

Spec ready: `docs/planning/2026-04-29-sprint-n7-failure-model-parity-spec.md`.

#### N.1 — Scene root + TileMap + CT bar HUD (~3 giorni)

Re-impl Action 7 CT bar lookahead 3 turni (PR #1998 web stack reference):

`scenes/Main.tscn`:

- `Camera2D` (Phantom Camera 2D)
- `TileMap` (Legacy/Kenney savana TileSet)
- `Node2D` Units container
- `CanvasLayer` HUD overlay (CT bar lookahead)

Authoring tutorial_01 grid 8x6 hand-placed savana tile.

#### N.2 — Unit scene + animations (~3 giorni)

`scenes/Unit.tscn`:

- `Area2D` (collision)
- `AnimatedSprite2D` (4-state anim idle/walk/attack/hurt)
- `Label` (species name)
- `ProgressBar` (HP)
- `Marker2D` (anchor effects)
- `AnimationPlayer` (idle bob + attack swing)

`scripts/unit.gd`:

- `@export` species_id, job, hp, max_hp, ap, faction
- `func play_anim(state)` → AnimatedSprite2D play
- `func take_damage(dmg)` → flash red + decrement HP + AnimationPlayer hurt
- `func die()` → AnimationPlayer death + queue_free post-anim

#### N.3 — D20 resolver port + smooth movement BG3-lite native (~3 giorni)

Port `services/rules/resolver.py` → `scripts/combat/d20_resolver.gd` (~200 LOC):

- `func resolve_attack(attacker, target, channel) -> AttackResult`
- d20 + bonus vs DC + Margin of Success + damage step
- Return Resource `AttackResult.gd` (immutable struct)

**BG3-lite Plus features NATIVE Godot 2D** (zero extra effort):

- Hide grid lines: `TileMap.show_grid = false`
- Smooth movement: `Tween` + `cubic-bezier` easing built-in
- Sub-tile float positioning: `Vector2` native (no rounding)
- Range cerchio gradient: `Polygon2D` + `Shader2D` radial gradient
- AOE shape sphere/cone: `GPUParticles2D` + `Light2D` + `Shape2D`
- Flanking 5-zone smooth angle: `atan2(target.y - actor.y, target.x - actor.x)` native

GUT test: port 20 critical test → `tests/test_d20_resolver.gd`.

#### N.4 — AI policy + vcScoring iter2 4-axes MBTI port (~4-5 giorni)

Port `apps/backend/services/ai/policy.js` essence → `scripts/ai/sis_policy.gd`:

- `enumerate_actions` + `score_action` basic + `select_best_action`
- Use Beehave behavior tree per archetype (vanguard tank vs skirmisher offensive vs healer support) — input PR #2000 templates

Port `apps/backend/services/vcScoring.js` 4-MBTI subset → `scripts/ai/vc_scoring_mbti.gd`:

- 4 axes (E_I, S_N, T_F, J_P) computed from raw events action_type/target_id/result
- Real-time pubsub via Signal `vc_scoring_updated` → thoughts ritual UI listen
- `area_covered` Vector2.distance_to() native (BG3-lite Tier 2 feature gratis)
- NO Ennea + 6 aggregate themes (defer Sprint O Fase 3 full)
- GUT test 20 critical port (4 axes × 5 scenario threshold)

#### N.5 — HUD Cinzel theme + ambition HUD (~2 giorni)

Re-impl ambition HUD (PR #2004 frontend reference):

`scenes/HUD.tscn`:

- `Theme` resource Cinzel font + IM Fell English + parchment border via NinePatchRect
- HP bar gold-bronze gradient
- Ability bar bottom Cinzel uppercase
- Pressure meter bronze frame
- **Ambition HUD top-strip**: `🤝 Alleanza Pulverator: 2/5 incontri` (mirror PR #2004 frontend)

#### N.6 — Particles + lighting + Skiv echolocation Light2D (~3 giorni)

- `GPUParticles2D` per hit/death/explosion (port da Sprint G v3 VFX wire)
- `Light2D` ambient bioma savana golden hour
- Occluders su tile high (mountain shadow)
- Dissolve shader on death
- **Skiv echolocation Light2D + GPUParticles2D radial** (improvement vs web stack tile pulse, lore-faithful)

#### N.7 — End-to-end 3-feature slice playable (~4-5 giorni)

**Combat loop**:

- Avvia encounter → 2 PG spawn + 2 SISTEMA spawn
- Player turn → click PG → ability menu → click target → attack resolve → VFX play → damage update HP
- SISTEMA turn → AI behavior tree decide → attack
- Loop fino vittoria/sconfitta

**Post-combat mating trigger** (re-impl PR #2004 backend reuse):

- 2 superstiti player → `propagateLineage` lightweight call → child stat preview
- Mating UI overlay: 2 portrait parents + 1 child stat aggregato + bond_hearts indicator
- Choice: ACCEPT / REJECT lineage → narrative beat preview

**Thoughts ritual end-of-encounter** (re-impl PR #1983 G3 Skiv backend reuse):

- 1 PG selezionato → vcProxy MBTI 4-axes top score → 3 candidati thought
- Disco Elysium-style overlay: 3 panels candidate + lore preview + voice line audio
- 30s timer countdown → choice irreversible → `status_lock` apply
- Cinzel font + parchment border NinePatchRect Theme

GUT test: 50 critical test port-end-to-end (combat 30 + mating 10 + thoughts 10).

#### N.8 — Side-by-side comparison vs web demo + ambition full path (~1 giorno)

Screenshot comparison Godot v2 MVP vs web stack archive:

- Visual quality side-by-side
- Performance (Godot profiler vs Chrome DevTools)
- HTML5 export Godot → deployable build
- Ambition Skiv-Pulverator alleanza full 5-encounter path test (combat → bond gate ritual choice → reconciliation)

**Gate exit Sprint N (Decision gate Fase 2)** — v3 confermato:

| Q                                                                               | Threshold                    | Verifica                                  |
| ------------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------- |
| Visual quality MVP Godot ≥ 80% Tactics Ogre target                              | Required                     | Subjective user judgment                  |
| Effort MVP entro 5 settimane (cap)                                              | Required                     | git log Sprint M+N elapsed                |
| Godot HTML5 export funzionante                                                  | Required                     | Browser test export deployable            |
| Phone composer V2 portable Control nodes                                        | Required (M.7 PRE-validated) | Mobile real device test                   |
| Backend Express + WS unchanged                                                  | Mandatory (M.5 spike PASS)   | API call cross-stack test                 |
| **GATE 0 — Failure-model parity** wounded_perma + legacy_ritual cross-encounter | MANDATORY 5/5                | Test integrato per spec PR #2005          |
| **P1 Tattica** combat playable + ITB telegraph                                  | Required                     | predict_combat hover + threat tile        |
| **P2 Spore** mating trigger funzionante post-combat                             | Required                     | propagateLineage + child stat preview UI  |
| **P4 MBTI** thoughts ritual + vcProxy 4-axes visible                            | Required                     | 3 candidate UI + voice line + status_lock |
| **P6 Fairness** combat balance check non-trivial                                | Required                     | hardcore subset 1 scenario non-stalemate  |

**Verdict**:

- 6/6 SÌ → cutover Fase 3
- 5/6 → re-evaluate, possible patch + retry
- ≤4/6 → archive Godot R&D, accept web stack v1 final + restore Sprint G.2b BG3-lite Plus rubric

---

## FASE 3 — Cutover Godot v2 (~4-8 settimane)

**Trigger**: Fase 2 Sprint N decision gate 6/6 SÌ.

### Sprint O — Full session engine port (~2-3 settimane)

Port `apps/backend/routes/session.js` (1967 LOC) + `roundOrchestrator.js` + `sessionHelpers.js` + `sessionConstants.js` → GDScript `scripts/session/`.

Map:

- `session.js` createSessionRouter → `scripts/session/round_orchestrator.gd` (Resource + signal)
- `/start /action /turn/end /end /state /:id/vc` endpoint → backend HTTPClient calls (backend resta Express, Godot client only)
- AI scoring vcScoring 20+ raw + 6 aggregate + 4 MBTI + 6 Ennea → `scripts/ai/vc_scoring.gd`
- declareSistemaIntents → `scripts/ai/sistema_intents.gd`

GUT test: port 100/384 critical test → `tests/`.

### Sprint P — Trait + lifecycle + mating port (~1-2 settimane)

- 458 trait `active_effects.yaml` → Godot `Resource` custom class `TraitEffect.gd`
- `propagateLineage` + mating + legacy ritual → `scripts/lifecycle/`
- Lifecycle phase + stadio system → `Resource`

### Sprint Q — Encounter + data ETL + test parity audit (~1.5-2 settimane)

- 60+ encounter YAML → import via `EncounterLoader.gd` ResourceLoader
- 250+ trait + 100+ species + 9 biome data → Godot `Resource` ETL one-shot
- LDtk integration per encounter authoring future
- **Q.1 test parity audit**: target ≥250/384 GUT test critical pre-cutover

### Sprint R — Co-op WS + phone composer port (~2-3 settimane)

- Lobby + Room + host-transfer + reconnect token → custom `WebSocketClient` in Godot HTML5 (NO Godot MultiplayerAPI — keep Express WS server authoritative)
- Phone composer V2 → Control nodes Godot (mantenere PWA web alternative come fallback se Godot phone troppo limitato)

### Sprint S — Cutover checklist + hybrid stable channel (~5-7 giorni)

```
- [ ] All Sprint O-R shipped
- [ ] HTML5 export deploy GitHub Pages
- [ ] Phone composer Godot funzionante
- [ ] Backend Express + WS test cross-stack OK
- [ ] 250/250 critical GUT pass
- [ ] Asset Legacy import verified
- [ ] Web v1 archive: branch `archive/web-v1-2026-04-29` + tag `web-v1-final`
- [ ] CLAUDE.md update repo Game/ → mark deprecated, point Game-Godot-v2/
- [ ] Memory PC-local backport selettivo: museum cards score ≥4/5 + ADR ACCEPTED + Skiv canon → Game-Godot-v2 paths
```

**Hybrid stable maintenance**: web v1 stable maintained 2 settimane post-cutover Godot v2 = "experimental channel" → archive solo dopo userland validation Godot v2 stabile.

**Gate exit Fase 3**: cutover complete, Godot v2 live.

---

## TOTAL effort summary v3

| Fase | Sprint                                                   | Effort v2  |            Effort v3             | Cumulative v3 |
| ---- | -------------------------------------------------------- | :--------: | :------------------------------: | :-----------: |
| 1    | G v3 (Legacy asset swap)                                 |    2.5g    |         ✅ shipped #2002         |     2.5g      |
| 1    | H (itch.io gap-fill) OPT                                 |    0.5g    |          ❌ DEPRECATED           |     2.5g      |
| 1    | I (TKT-M11B-06 playtest)                                 |   1 sett   | ❌ DEPRECATED (defer post-Godot) |     2.5g      |
| 1    | G.2b BG3-lite Plus                                       |   10-12g   |   ❌ DEPRECATED (native Godot)   |     2.5g      |
| 1    | A1 rubric session                                        |    1-2h    |         ❌ FORMAL ABORT          |     2.5g      |
| 2    | M v3 (Godot bootstrap + Donchitos cherry-pick + 3 spike) | 3-5g + 2g  |             **6-8g**             |   ~2-3 sett   |
| 2    | N v3 (Vertical slice MVP 3-feature + GATE 0)             |  4-5 sett  |             4-5 sett             |   ~6-8 sett   |
| 3    | O (session engine port)                                  |  2-3 sett  |             2-3 sett             |  ~8-11 sett   |
| 3    | P (trait+lifecycle+mating port)                          |  1-2 sett  |             1-2 sett             |  ~9-13 sett   |
| 3    | Q v3 (encounter+data ETL + test parity audit)            | 1.5-2 sett |            1.5-2 sett            |  ~11-15 sett  |
| 3    | R (co-op WS + phone composer port)                       |  2-3 sett  |             2-3 sett             |  ~13-18 sett  |
| 3    | S v3 (cutover + hybrid stable 2-sett)                    |    5-7g    |               5-7g               |  ~14-19 sett  |

**TOTALE v3**: ~13-19 settimane (3.25-4.75 mesi). vs v2: -1 to -2 sett net (DEPRECATED Sprint G.2b + H + I + rubric).

## Decision points pending master DD

1. ✅ Pivot Godot immediate (decision-altering) — confermato 2026-04-29 sera
2. ⚠️ Sprint J Visual Map Obsidian: defer post-N gate o eliminate (default raccomanda **defer**)
3. ✅ Sprint K Donchitos cherry-pick incorporate Sprint M.1 — confermato (no separate Sprint K)
4. ✅ Backend Express persiste Fase 3 — confermato plan v2 §Decision 8
5. ⚠️ Sprint M.5 race condition diagnose: frontend o backend (master-dd input richiesto pre M.5 spike)
6. ✅ Sprint N.7 ELEVATE come GATE 0 — confermato plan v3 §FASE 2 Sprint N
7. ✅ Spike POC #2003 + Rubric launcher #2007 archive method: **branch tag `web-v1-final`** — confermato plan v3 §FASE 3 Sprint S
8. ✅ Skiv canon preserved cross-PC via git — already enforced

## Risks + mitigations master plan v3

| Risk                                        | Mitigation                                                                          | Owner       |
| ------------------------------------------- | ----------------------------------------------------------------------------------- | ----------- |
| Sprint M.7 phone composer Godot HTML5 fail  | Hybrid: phone web PWA + Godot TV view (acceptable per migration doc §Risks)         | user gate   |
| 384 AI test → GUT port effort cliff         | Target ≥250 critical pre-cutover Sprint Q.1                                         | qa-tester   |
| Master-dd burnout 13-19 sett solo-dev       | Hard pause weekly + checkpoint user satisfaction + kill-60 + daily energy_score 1-5 | user        |
| Donchitos upstream drift cherry-pick frozen | Sprint M.1 quarterly diff review post-init                                          | claude-code |
| Godot 4.x version drift breaking            | Sprint M.1 pin `project.godot config_version` + version-lock                        | claude-code |
| Sprint N gate ≤4/6 fail                     | Archive Godot R&D, restore web stack + Sprint G.2b rubric session resume            | user gate   |
| Backend Express WS Godot HTML5 latency      | Sprint M.5 cross-stack perf test early + DioField command-latency p95 frame         | qa-tester   |
| 12 mesi memory backport doloroso            | Selettivo museum ≥4/5 + ADR ACCEPTED + Skiv canon (NOT 150 memory full)             | claude-code |
| Skiv canon LPC sprite override loss         | docs/skiv/CANONICAL.md preserved + asset re-import explicit Sprint M.3              | claude-code |
| ERMES E0-E6 isolation broken                | Out-of-scope Godot, prototypes/ermes_lab/ stays Python isolated                     | n/a         |

## Monitoring + checkpoint cadence

- **Daily** (during sprint active): kb/daily/YYYY-MM-DD.md log progress
- **Weekly** (Fri end-day): retrospective sprint progress + adjust scope next week
- **Bi-weekly** (every 2 sett): re-read master plan v3, update `last_verified`, adjust if scope drift
- **Phase exit**: gate criteria sopra → SÌ proceed o NO abort/retry

## Rollback paths v3

| Trigger                                                           | Rollback action                                                                                                              |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Sprint M.5 cross-stack spike fail (p95 > 200ms o CORS unsolvable) | Investigate alternative (nginx reverse proxy o Godot self-host server alongside Express) o defer pivot                       |
| Sprint M.7 phone composer fail                                    | Hybrid: phone web PWA + Godot TV view (acceptable)                                                                           |
| Sprint M.6 CI minimal fail                                        | Defer GUT test infra, manual gdformat                                                                                        |
| Sprint N MVP gate ≤4/6 fail                                       | Archive Godot R&D, mark `experimental/godot-v2` deprecated, accept web stack v1 final, return Sprint G v3 + Sprint I iterate |
| GATE 0 failure-model parity fail                                  | Sprint N.7 spec impl deferred Sprint O Phase 3 (NON pre-Sprint N.1)                                                          |
| Fase 3 cutover bug critico post-deploy                            | Tag `web-v1-final` revert deploy, debug Godot v2 issue, retry post-fix                                                       |

---

## Final output

**Plan v3 ready**. Decision-altering pivot Godot immediate accepted.

**Status**: ACTIVE — replace plan v2 §FASE 1 sections.

**Next step**: Sprint M.1 chip spawn (NEW repo `Game-Godot-v2` + Donchitos template adopt + Godot 4.x install) — `feat/sprint-m-1-godot-bootstrap-2026-04-30`.
