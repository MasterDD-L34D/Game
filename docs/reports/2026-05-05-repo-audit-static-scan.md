---
title: "Repo audit static scan 2026-05-05"
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-05
source_of_truth: false
language: it
review_cycle_days: 30
related:
  - docs/planning/2026-05-05-repo-content-audit-handoff.md
  - docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md
  - docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md
  - docs/museum/MUSEUM.md
tags: [audit, orphan, dead-code, stub, gate5, yaml, traits, pre-cutover]
---

# Repo audit static scan — 2026-05-05

> **Scope**: pre-cutover Phase A (ADR-2026-05-05) static scan. Game/ + Game-Godot-v2. Identifies orphan code, dead routes, stub registry tier matrix, Engine LIVE Surface DEAD (Gate 5) violations, YAML data orphans.
>
> **3 agents parallel** — run 2026-05-05. Agent 1: Game/ backend. Agent 2: Godot v2. Agent 3: cross-stack YAML.

---

## Gate 5 violation count: 4 (target ≤5 → PASS — does NOT block cutover)

| # | Violation | Severity | Proposed action |
|---|---|---|---|
| G5-1 | `services/enneaEffects.js` — fires `ennea_effects` in session log, no dedicated FE render surface. Museum M-2026-04-25-006 score 4/5. | Medium | Surface via debrief panel OR add Gate 5 exemption (telemetry-class) |
| G5-2 | `routes/conviction.js` + `meta/convictionVoting.js` (63 LOC) — conviction badge shows via vcSnapshot, voting API (`/api/v1/conviction/init`, `/vote`, `/results`, `/close`) never called from FE. | Medium | Wire FE POST to conviction API OR explicitly deprecate voting flow |
| G5-3 | `meta/eventChainScripting.js` (210 LOC) — tested, consumed by `narrativeEngine.js` internally, but zero live session flow triggers `triggerEventChain`. | Low | Wire session trigger path OR museum card score 3 + defer |
| G5-4 | `routes/speciesWiki.js` + `services/species/wikiLinkBridge.js` (74 LOC) — wiki endpoints registered, zero FE caller in `apps/play/src/`. | Low | Wire FE call to wiki endpoint OR explicit Gate 5 exemption (dev-tooling) |

---

## Section 1: Game/ — services/rules/ caller audit

**Verdict: MOSTLY SAFE TO REMOVE — 1 pre-condition**

| File | Import type | Runtime? |
|---|---|---|
| `apps/backend/services/combat/resistanceEngine.js` | Comment only (`// semantic parity con Python`) | NO |
| `apps/backend/services/roundOrchestrator.js` | Comment only | NO |
| `tools/py/gen_trait_types.py` | Path string in `PY_OUTPUT` var | Dev tool only |
| `tools/py/mark_python_rules_deprecated.py` | Comment reference | Admin one-shot script |
| `tools/py/master_dm.py` | Comment (`# Vedi DEPRECATED.md`) | Deprecated tabletop REPL |
| `tools/py/simulate_balance.py` | **LIVE** `sys.path.insert(0, "services/rules")` + `from resolver import ...` + `from hydration import load_trait_mechanics` | **YES** |

**Pre-condition for Phase 3 removal**: `tools/py/simulate_balance.py` must be either deleted or ported off `services/rules/` before the directory can be removed. NOT in CI, NOT a production path — pure dev balance tool.

---

## Section 2: Game/ — orphan services

| Service | Route consumer | FE consumer | Status |
|---|---|---|---|
| `ai/aiPersonalityLoader.js` (121 LOC) | NONE | NONE | **ORPHAN** — test-only. `tests/services/aiPersonalityLoader.test.js` only. |
| `ai/sistemaActor.js` | NONE in routes/app.js | NONE | **NEEDS VERIFICATION** — may be consumed by `sistemaTurnRunner.js` internally. Check before deletion. |

All other `apps/backend/services/` files (~80+): route consumer + FE consumer confirmed.

**Dead LOC estimate**: 121 LOC confirmed dead (`aiPersonalityLoader.js`). `sistemaActor.js` LOC unknown pending verification.

---

## Section 3: Game/ — orphan routes

| Route | Registered? | FE caller | Status |
|---|---|---|---|
| `routes/conviction.js` | YES (`createConvictionRouter`) | NONE — FE reads conviction badge from vcSnapshot only, never POSTs to `/api/v1/conviction/*` | **ORPHAN + Gate 5 G5-2** |
| `routes/speciesWiki.js` | YES (`createSpeciesWikiRouter`) | NONE — no fetch call to `/api/species/:id/wiki` in `apps/play/src/` | **ORPHAN + Gate 5 G5-4** |

**Note**: `routes/monitoring.js` intentionally dev-only (Prometheus). `routes/sessionConstants.js` + `routes/sessionHelpers.js` are not routers — shared modules.

---

## Section 4: Game/ — docs/incoming/ triage

| File | doc_status | Tasks done? | Stale? |
|---|---|---|---|
| `README.md` | active | N/A | Borderline — `last_verified: 2026-04-14` (21d ago), cycle=30d |
| `lavoro_da_classificare/INTEGRATION_PLAN.md` | draft | All `[x]` except ROL-07 | **STALE** — should be `integrato`. ROL-07 (GitHub PAT + project board) is only open item |
| `lavoro_da_classificare/TASKS_BREAKDOWN.md` | draft | All `[x]` except ROL-07 | **STALE** — same as above |

**Action**: update both files `doc_status: draft → integrato`, note ROL-07 manual-only (requires GitHub PAT).

---

## Section 5: Game/ — prototypes/ermes_lab/ isolation

**Verdict: ISOLATED**

- Zero `require`/`import` of `prototypes/ermes_lab/` found in `apps/`.
- `coop/ermesExporter.js` naming is cosmetic coincidence — unrelated.
- `prototypes/ermes_lab/` is a self-contained Python simulation lab (PR #2009 `2259634e`). No cross-stack contamination.

---

## Section 6: Game-Godot-v2 — combat stubs tier matrix

**Status: ALL 9 STUBS PORTED in W7.x bundle. Zero Tier 1 blocking gaps.**

| Stub (was in stubs/) | Ported to | PR | Status |
|---|---|---|---|
| BiomeModifiers | `scripts/combat/biome_modifiers.gd` | #130 | DONE |
| BiomeResonance | `scripts/combat/biome_resonance.gd` | #130 | DONE |
| TerrainReactions | `scripts/combat/terrain_reactions.gd` | #130 | DONE |
| SenseReveal | `scripts/combat/sense_reveal.gd` | #142 | DONE |
| TelepathicReveal | `scripts/combat/telepathic_reveal.gd` | #143 | DONE |
| SynergyDetector | `scripts/combat/synergy_detector.gd` | — | DONE |
| ArchetypePassives | `scripts/combat/archetype_passives.gd` | — | DONE |
| PassiveStatusApplier | `scripts/combat/passive_status_applier.gd` | — | DONE |
| TimeOfDayModifier | `scripts/combat/time_of_day_modifier.gd` | #137 | DONE |
| SgTracker | `scripts/combat/sg_tracker.gd` | #138 | DONE |

`scripts/combat/stubs/stubs_registry.gd` = empty sentinel confirming clean state.

---

## Section 7: Game-Godot-v2 — AI stubs tier matrix

| Stub | What it stubs | Callers | Tier | Action |
|---|---|---|---|---|
| `scripts/ai/stubs/sistema_turn_runner.gd` | Turn orchestration loop | NONE | **Tier 3 — ABANDON** | Functionality fully covered by `SistemaIntents` (Sprint O.3) + `RoundOrchestrator` (Sprint O.1 + W7.x). Port = dead code. |
| AiPersonalityLoader (old stub) | Personality data loading | — | DONE | Full impl at `scripts/ai/ai_personality_loader.gd` |
| AiProfilesLoader (old stub) | AI profiles | — | DONE | Full impl at `scripts/ai/ai_profiles_loader.gd` |
| AiProgressMeter (old stub) | Sistema pressure | — | DONE | Full impl at `scripts/ai/ai_progress_meter.gd` |

**Action for `sistema_turn_runner.gd`**: delete stub file + add museum card score 2 (archive, functionality superseded).

---

## Section 8: Game-Godot-v2 — repo-wide stub pattern grep

19 files outside `stubs/` matched stub grep patterns. **All are historical comments in fully-implemented classes** (migration trail: "Replaces scripts/combat/stubs/X"). No hidden live stubs discovered.

Notable: `scripts/unit.gd:122` has `# For N.2 stub: queue_free immediate` — this IS the current live behavior, comment documents deferred art polish (dissolve shader N.6). Not a bug.

---

## Section 9: Game-Godot-v2 — B5 phone phase_change chain

**Verdict: B5 WIRED**

- `scripts/phone/phone_composer_view.gd:100–116` — `_connect_ws_signals()` connects `_ws.event_received → _on_event_received`.
- `scripts/phone/phone_composer_view.gd:232–239` — filters `phase_change`, extracts `phase`, calls `_swap_mode_for_phase(phase)`.
- `scripts/phone/phone_composer_view.gd:242–259` — handles all 6 canonical phases: `character_creation`, `form_pulse`, `world_seed_reveal`, `world_setup`, `combat`, `debrief`.
- Dual path preserved: `_on_state` (snapshot R.0/R.1) + `_on_event_received` (versioned R.5). Both call `_swap_mode_for_phase`.

**Pending**: runtime retest on physical device still required (user manual — deferred-roadmap blocker B).

---

## Section 10: Game-Godot-v2 — unused assets

### assets/ui/ferrospora/ (87 PNG total)

| File(s) | Referenced? | Verdict |
|---|---|---|
| `action_dock_v2/actiondock_v2_runtime_1200.png` | YES — `scenes/ui/ActionDock.tscn:4` | IN USE |
| `action_dock_v2/actiondock_v2_runtime_1000.png` | NO | **UNUSED** |
| `action_dock_v2/actiondock_v2_empty_socket_option_1200.png` | NO | **UNUSED** |
| `action_icons_v1/icon_*.png` (75 files) | Dynamically loaded via `scripts/ui/action_button_sigil.gd:37` | IN USE (runtime) |
| `ui_frames_v1/gothic_fantasy_game_interface_frame.png` | NO | **UNUSED** |
| `ui_frames_v1/gothic_steampunk_battle_interface_frame.png` | NO | **UNUSED** |
| `ui_frames_v1/ornate_steampunk_fantasy_ui_panel.png` | NO | **UNUSED** |

**Truly unused: 5 files** (2 action_dock variants + 3 ui_frames). Visual design options not adopted.

### assets/legacy/ (47 PNG total)

| Category | Total | Referenced | Unreferenced | Notes |
|---|---|---|---|---|
| `creatures/` (8 job sheets + 5 boss) | 13 | 13 | 0 | Wired in `resources/sprite_frames/*.tres` |
| `tiles/` (5 biome tilesets) | 10 | 5 | 5 | 5 secondary atlas layers deferred |
| `parallax/` (6 layers) | 6 | 0 | 6 | Deferred — ParallaxBackground scene not yet created (N.6 polish) |
| `vfx/` (bolt, death×8, etc.) | 18 | 0 | 18 | Deferred — SpriteFrames anim states (sprint M.2 deferred) |

**Referenced: 18/47 (~38%). Unreferenced: 29/47 (~62%).**

The 29 unreferenced map to deferred art polish sprints (parallax scenes + VFX anim states). These are **deferred-roadmap assets, NOT abandoned**. No deletion recommended before cutover — they will be consumed in sprint M.2/N.6.

---

## Section 11: Cross-stack YAML — trait coverage

**Loading strategy**: DYNAMIC on both stacks. `traitEffects.js` + `TraitCatalog.gd` both load all 458 entries at boot.

| Metric | Value |
|---|---|
| YAML entries | 458 |
| Loaded at runtime | 458 (100%) |
| Handled by working handler OR hardcoded | **404 (88.2%)** |
| Orphaned (loaded, handler always no-op) | **51** |
| Hardcoded IDs consumed NOT in YAML | **0** |

### Orphan breakdown (51 total)

> **Correction 2026-05-05**: initial scan classified `legame_di_branco`, `spirito_combattivo`, `pack_tactics` as null-effect stubs. Post-verification they have `triggers_on_ally_attack` data and ARE handled by `beastBondReaction.js`. True orphan count = 51.

| Group | Count | Kind | Issue |
|---|---|---|---|
| `ancestor_deambulazione_*` | 26 | `buff_stat` | NO handler in `traitEffects.js` or `passiveStatusApplier.js` |
| `ancestor_motricita_*` | 20 | `buff_stat` | Same |
| `ancestor_nuoto_*` | 5 | `buff_stat` | Same |

**Root cause**: `buff_stat` effect.kind handler missing from backend. Museum card `ancestors-neurons-dump-csv.md` (score 4/5) covers this gap. `abilityExecutor.js` uses `buff_stat` as an ability field (different pipeline) — not the trait pipeline.

### Backend effect.kind handlers

| Handler | effect.kind | YAML count |
|---|---|---|
| `traitEffects.js:evaluateAttackTraits` | `extra_damage`, `damage_reduction` | 212 |
| `traitEffects.js:evaluateStatusTraits` | `apply_status` | 191 |
| `services/combat/passiveStatusApplier.js` | `passive` | 4 |
| `services/combat/beastBondReaction.js` | `beast_bond_ally_buff` | varies |
| `services/combat/woundedPerma.js` | `persistent_marker` | 1 |
| **MISSING** | `buff_stat` | **51** |
| **MISSING (null stubs)** | null | **3** |

### Hardcoded trait IDs (static code references — all in YAML)

`zampe_a_molla`, `pelle_elastomera` (sessionHelpers + hardcoreScenario), `sensori_geomagnetici` (senseReveal.js `BONUS_TRAIT_ID`), 16 `starter_bioma_*` (formPackRecommender.js MBTI→trait map). Total: 19 unique IDs — all present in YAML. **Zero missing-from-YAML hardcodes**.

### Gate 5: PASS

Trait effects are player-visible: `skillCheckPopup.js` (backend), `vfx_spawner.gd` + `beast_bond_reaction.gd` (Godot). The 51 `buff_stat` orphans are **EXEMPT** — ancestor lore traits, intended for future stat-bonus pipeline not yet wired.

---

## Section 12: Cross-stack — species/biomes cross-ref

**10/15 species have broken `biome_affinity` cross-refs** — generic habitat slugs, not canonical biome IDs.

| Status | Species | biome_affinity | Effect |
|---|---|---|---|
| OK | `dune_stalker` | `savana` (canonical) | Perfect resonance eligible |
| OK | `polpo_araldo_sinaptico`, `sciame_larve_neurali`, `leviatano_risonante`, `simbionte_corallino_riflesso` | `frattura_abissale_sinaptica` (canonical) | Perfect resonance eligible |
| BROKEN | `anguis_magnetica` | `acquatico_costiero` (generic) | Never achieves perfect resonance |
| BROKEN | `chemnotela_toxica`, `soniptera_resonans` | `terrestre_forestale` (generic) | Never achieves perfect resonance |
| BROKEN | `elastovaranus_hydrus`, `terracetus_ambulator` | `terrestre_pianeggiante` (generic) | Never achieves perfect resonance |
| BROKEN | `gulogluteus_scutiger` | `terrestre_roccioso` (generic) | Never achieves perfect resonance |
| BROKEN | `perfusuas_pedes` | `sotterraneo` (generic) | Never achieves perfect resonance |
| BROKEN | `proteus_plasma` | `acquatico_dolce` (generic) | Never achieves perfect resonance |
| BROKEN | `rupicapra_sensoria` | `terrestre_montano` (generic) | Never achieves perfect resonance |
| BROKEN | `umbra_alaris` | `terrestre_umido` (generic) | Never achieves perfect resonance |

`biomeResonance.js` handles these gracefully (secondary family match), so no crash. But `isPerfectMatch()` NEVER fires for these 10 species.

---

## Summary dashboard

### Pre-cutover gate check

| Check | Result | Blocks cutover? |
|---|---|---|
| Gate 5 violations ≤5 | **4 violations** | **NO** (target met) |
| services/rules live callers | **1 (simulate_balance.py)** | **NO** (dev tool, not CI) |
| Combat stubs Tier 1 | **0** (all 9 ported W7.x) | **NO** |
| B5 phone phase chain | **WIRED** (code level) | **NO** (runtime retest pending, user manual) |
| prototypes/ermes_lab isolated | **YES** | **NO** |

**Pre-cutover Phase A verdict: CLEAN** — no blocking gaps from this audit.

### Action items (prioritized)

| Ticket | Area | Priority | Effort | Description |
|---|---|---|---|---|
| `TKT-TRAITS-ANCESTOR-BUFF-STAT` | Game/ traits | P1 | ~3h | Wire `buff_stat` handler in `passiveStatusApplier.js` — activates 51 ancestor locomotion traits |
| `TKT-SPECIES-BIOME-AFFINITY-FIX` | Game/ data | P1 | ~1h | Update 10 species `biome_affinity` to canonical biome slugs for `isPerfectMatch()` eligibility |
| `TKT-GATE5-ENNEAEFFECTS` | Game/ Gate 5 | P2 | ~2h | Surface `enneaEffects` in debrief panel OR add Gate 5 exemption ADR |
| `TKT-GATE5-CONVICTION` | Game/ Gate 5 | P2 | ~4h | Wire FE conviction voting UI OR deprecate conviction route |
| ~~TKT-TRAITS-NULL-STUBS~~ | ~~Game/ traits~~ | — | — | ~~`legame_di_branco`/`spirito_combattivo`/`pack_tactics`~~ — **CLOSED**: these ARE live via `beastBondReaction.js` (`triggers_on_ally_attack`), not null stubs |
| `TKT-SERVICES-ORPHAN` | Game/ backend | P2 | ~1h | Delete `ai/aiPersonalityLoader.js` (121 LOC, test-only) + verify `ai/sistemaActor.js` |
| `TKT-RULES-SIMULATE-BALANCE` | Game/ cleanup | P3 | ~1h | Port or delete `tools/py/simulate_balance.py` — last blocker before `services/rules/` removal |
| `TKT-GODOT-AI-STUB-DROP` | Godot v2 | P3 | ~30min | Delete `scripts/ai/stubs/sistema_turn_runner.gd` + museum card score 2 |
| `TKT-GODOT-LEGACY-PARALLAX-VFX` | Godot v2 assets | P4 | defer | 29 legacy assets (parallax + vfx + aux tiles) — wire in sprint M.2/N.6 art polish |
| `TKT-DOCS-INCOMING-STATUS` | docs | P4 | ~15min | Update `docs/incoming/` 2 files: `doc_status: draft → integrato`, note ROL-07 |

### Counts summary

| Metric | Count |
|---|---|
| Gate 5 violations | 4 |
| Orphan backend services | 1 confirmed + 1 needs-verify |
| Orphan routes | 2 |
| Trait orphans (YAML, no-op handler) | 51 (ancestor buff_stat only) |
| Hardcoded traits missing from YAML | 0 |
| Species biome cross-ref broken | 10/15 |
| Godot combat stubs remaining Tier 1 | 0 |
| Godot AI stubs Tier 3 (abandon) | 1 |
| Godot unused ferrospora PNGs | 5 |
| Godot unused legacy PNGs | 29 (deferred art) |
| services/rules live callers | 1 (dev tool) |
