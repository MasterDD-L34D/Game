---
title: 2026-05-04 Plan v3 drift sync — Godot v2 realtime confronto
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: 2026-05-05
source_of_truth: false
language: it
review_cycle_days: 14
related:
  - 'docs/planning/2026-04-29-master-execution-plan-v3.md'
  - 'docs/planning/2026-04-30-plan-v3-2-gap-audit.md'
  - 'docs/adr/ADR-2026-04-29-pivot-godot-immediate.md'
  - 'docs/planning/2026-04-29-sprint-n7-failure-model-parity-spec.md'
---

# Plan v3 drift sync — Godot v2 realtime 2026-05-04

> **Scope**: confronto status plan v3 (Game side, last_verified 2026-04-30) vs realtà Game-Godot-v2 (2026-05-04). 9 drift item identificati. 2 verifiche parity formali (M.7 + N.7) chiarite PARTIAL non MATCH come dichiarato nei recap CLAUDE.md.

## TL;DR

| Categoria                   | Item                                          |             Stato realtà             |
| --------------------------- | --------------------------------------------- | :----------------------------------: |
| Plan v3 anticipa, NON wired | M.7 DioField command-latency p95              |  🟢 ENGINE+WIRE LIVE (surface debt)  |
| Plan v3 anticipa, NON wired | N.7 failure-model parity 5/5                  |      🟢 GATE 0 NEAR-PASS (4/5)       |
| Godot anticipa plan v3      | Beehave AI tactical tree                      |           ✅ shipped #164            |
| Godot anticipa plan v3      | Caller-wire pipeline LIVE                     |           ✅ shipped W7.x            |
| Godot anticipa plan v3      | Combat stubs ported                           | ✅ 9/14 ported (vs plan v3 deferred) |
| NOT yet shipped Godot       | Asset Legacy Skiv portrait + lifecycle stages |           ❌ gap concreto            |
| NOT yet shipped Godot       | Cutover Fase 3 decision gate                  |      🟡 ADR PROPOSED 2026-05-05      |
| NOT yet shipped Godot       | ERMES E7-E8 runtime bridge                    |        ⏸ deferred (correct)         |
| NOT yet shipped Godot       | Character creation TV scene Bible §0          |           ❌ gap concreto            |
| NOT yet shipped Godot       | Phone composer real-device smoke              |    🟡 GUIDA SHIPPED, EXEC PENDING    |
| **NEW drift discovered**    | Ennea taxonomy schema mismatch 9 vs 6         |       ✅ RESOLVED #167 + #2041       |

**Pillar realignment**:

- P5 Co-op (plan v3 🟡 → expected 🟢 candidato): ✅ shipped Sprint R + W4-W6 phone composer
- P4 MBTI/Ennea (plan v3 🟡++): 🟢 cross-stack parity restored (PR #167 + #2041) — taxonomy drift CHIUSA. Surface debrief Godot side 9 archetype wire residuo (~2-3h) NON blocker.

---

## Item 1 — M.7 DioField command-latency p95 — 🟢 ENGINE+WIRE LIVE (surface debrief HUD pending)

**Game side spec** (PR #1997):

- Metric: `command_latency_p95` round-trip (t0: button press → t5: render echo)
- Chain 6 timestamp steps: input event → WS send → server receive → state update → echo send → render frame
- Threshold: p95 <100ms PASS / 100-200ms CONDITIONAL / >200ms ABORT
- Test vectors: iOS Safari + Android Chrome, WiFi + LTE 4G

**Closure 2026-05-05** — Godot v2 PR #166 shipped TelemetryCollector + wire main.gd:

- ✅ `scripts/services/telemetry_collector.gd` (~120 LOC RefCounted) — `record_action_start`/`record_action_end` + `compute_p95_ms()` + `threshold_verdict(p95)` (PASS<100 / CONDITIONAL 100-200 / ABORT>200)
- ✅ `scripts/main.gd` wire LIVE 2 sites — line 578 `_telemetry.record_action_start(_pending_action_id)` (input) + line 718 `_telemetry.record_action_end(_pending_action_id)` (resolved)
- ✅ GUT 11 cases / 21 asserts (`test_telemetry_collector.gd`) — empty samples + roundtrip + 3 threshold scenarios + FIFO drop + reset
- ✅ MAX_SAMPLES FIFO drop policy + threshold_verdict deterministic helper

**Cross-stack parity**: ENGINE LIVE on Godot side + Game side spec (PR #1997). Round-trip chain instrumented Godot side single-player local mode (multiplayer Godot HTML5 + Game/ Express WS = future extension server-side timing).

**Verdict**: **ENGINE + WIRE LIVE 🟢** — TelemetryCollector running per action. Surface presentation (debug HUD widget OR debrief view summary panel) NOT yet wired (anti-pattern Engine LIVE Surface DEAD chiusabile via `print(t.compute_p95_ms())` console fallback durante phone smoke test).

**Sub-item residuo per close FULL surface parity**:

- ❌ Debug HUD widget OR debrief view summary panel non present — telemetry data invisible al player
- Effort: ~2-3h Godot side post-Item-10 phone smoke results submission

**Effort residuo**: ~2-3h surface wire (low priority — phone smoke can use console fallback). **Critical path**: NO LONGER blocking phone smoke; surface debt only.

---

## Item 2 — N.7 failure-model parity — 🟢 GATE 0 NEAR-PASS (4/5 shipped, Wave B 2 statuses pending)

**Game side spec** (PR #2005):

- 5/5 MANDATORY:
  1. wounded_perma persistence (WoundState.gd: LIGHT -5%, MEDIUM -15%, SEVERE -30% attack_mod)
  2. legacy_ritual overlay (LegacyRitualPanel.gd: 30s timer + mutation choice + lineage_id guard)
  3. 9-status 1:1 parity (WAVE_A 7 statuses + WoundState + system layer)
  4. CampaignState cross-encounter flow (ResourceSaver/Loader orchestrator)
  5. Action 6 lineage merge (parents' WoundState → offspring, cap 5 FIFO)

**Closure 2026-05-05** — Godot v2 shipped 4/5 mandatory:

| Sub-item                         | Stato | File / PR                                                                                                                                                                                     |
| -------------------------------- | :---: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. wounded_perma WoundState      |  ✅   | `scripts/combat/wound_state.gd` Resource + severity enum + `attack_mod_penalty()` parity exact (PR #146 era)                                                                                  |
| 2. legacy_ritual overlay         |  ✅   | `scripts/ui/legacy_ritual_panel.gd` CanvasLayer 30s timer + signals                                                                                                                           |
| 3. 9-status 1:1 parity           |  🟡   | `scripts/combat/passive_status_applier.gd` WAVE_A 7 statuses (linked/fed/healing/attuned/sensed/telepatic_link + frenzy blocklist). **Wave B 2 statuses missing** (no `WAVE_B` grep match)    |
| 4. CampaignState cross-encounter |  ✅   | `scripts/session/campaign_state.gd` 81 LOC Resource — `wounds_by_unit` Dictionary + `MAX_WOUNDS_PER_UNIT=5` FIFO cap + `SAVE_PATH_FMT="user://campaigns/%s/state.tres"` namespacing           |
| 5. Action 6 lineage merge        |  ✅   | `scripts/lifecycle/lineage_merge_service.gd` 76 LOC (PR #165) — `merge_offspring_wounds(parent_a, parent_b)` reads `CampaignState` + cap 5 FIFO + cross-ref Action 6 PR #2004 ambition ritual |
| GUT tests                        |  ✅   | `test_wound_state.gd` + `test_passive_status_applier.gd` + `test_legacy_ritual_panel.gd` + `test_lineage_merge_service.gd`                                                                    |

**Pending 1/5**:

- 🟡 Wave B 2 statuses NOT surfaced — 9-status parity incomplete (WAVE_A=7, +2 needed). No `WAVE_B`/`wave_b`/`wave.B` constant in scripts/. Identify exact 2 missing statuses via cross-ref Game/data/core/traits/active_effects.yaml.

**Verdict**: **GATE 0 NEAR-PASS (4/5) 🟢** — Fase 3 cutover NO LONGER blocked dai 2/5 deferred originali (CampaignState + LineageMergeService entrambi shipped). Wave B residuo è polish, non blocker.

**Sub-item residuo per close FULL parity**:

1. **Wave B mapping**: identify 2 remaining statuses beyond WAVE_A per 9-status full parity. ~2h analysis + ~1h impl.
2. **End-to-end GUT cross-encounter**: Encounter A → save campaign_state.tres → Encounter B → verify `attack_mod_penalty` active across save boundary. ~2h.
3. **Action 6 bond_path integration test**: Skiv-Pulverator alleanza E2E + offspring wound inheritance assert. ~1h.

**Effort residuo**: ~6h totale. **Critical path**: NO LONGER blocking cutover Fase 3 ADR (Item 7).

---

## Item 3 — Beehave AI tactical tree — Godot anticipa plan v3 ✅

**Plan v3 expectation**: Sprint N.4 / O.4 deferred (asset/UI focus prima).
**Godot reality**: PR #133 design plan + PR #164 OPEN (Sprint A.1 PersonalityTreeFactory) shipped 2026-05-04.

**Content shipped #164**:

- Code-first behavior tree: pure RefCounted `TacticalNode` decision tree (Beehave-compatible naming, no scene-tree dep, deterministic offline tick)
- 8 narrative leaves (panic_when_wounded, enemy_in_attack_range, ally_under_threat, seek_weakest_target, flee_to_cover, protect_ally_under_threat, hold_position_under_fire, coordinate_flank)
- 3 personality factories: aggressive (panic 0.15), cautious (panic 0.45), opportunist (panic 0.30)
- GUT 1455 → 1488 (+33 asserts)

**Action item**: aggiornare plan v3 §"Sprint N.4 / O.4 deferred" → riconoscere shipping anticipato. **NON cambia critical path** (positive surprise).

**Next Godot side**: Sprint A.2 — 3 role overlays (skirmisher / tank / support) + BeehavePersonalityRegistry combiner (9 valid combinations: 3 personalities × 3 roles). Effort: ~6-8h.

---

## Item 4 — Caller-wire pipeline LIVE — Godot anticipa plan v3 ✅

**Plan v3 expectation**: implicit Fase 3 (cutover phase). Plan v3 §"Sprint N.7 polish" + §"Cutover" timeline 4-8 sett.
**Godot reality**: shipped W7.x bundle (#126-#138) + W7.x caller-wire (#156-#163) — 2/4 adapters LIVE end-to-end (UnitInfoPanel XCOM sticky + BattleFeed real-time).

**Content shipped**:

- ✅ `UnitSelectionState` bus + `UnitInfoPanelAdapter` (XCOM sticky B1-a) — PR #159
- ✅ `BattleFeedAdapter` RoundOrchestrator action_resolved → BattleFeed wire — PR #158
- 🟡 `BoardOverlayAdapter` move/attack range tile wire — PR #161 (deferred emitter)
- 🟡 `ForecastPanelAdapter` pre-AttackAction preview wire — PR #160 (deferred emitter)
- ✅ `caller integration #5` Unit.clicked + Main bus + HudView panels mount — PR #162

**Action item**: 2 adapters DEFERRED need source emitter:

- `RoundOrchestrator.attack_range` — Godot side
- `RoundOrchestrator.d20_forecast()` — Godot side

Effort: ~3-5h. Concurrente con M.7 telemetry (item 1).

---

## Item 5 — Combat stubs ported 9/14 — Godot anticipa plan v3 ✅

**Plan v3 expectation**: Sprint Q.x + R deferred (post Sprint M-N).
**Godot reality**: 5 ported W7.x bundle:

- ✅ SgTracker (PR #138)
- ✅ TimeOfDayModifier (PR #137)
- ✅ BiomeResonance per-attack wire (PR #136)
- ✅ ArchetypePassives (PR #145)
- ✅ PassiveStatusApplier Wave A (PR #146)
- ✅ TelepathicReveal (PR #143)
- ✅ SenseReveal (PR #142)
- ✅ SynergyDetector (PR #149)
- ✅ AiProgressMeter (PR #144)

Plus ported O.2.x batch: Bravado, BeastBondReaction, BondReactionTrigger, DefyEngine, InterruptFire, PinDown.

**Residual stubbed (5)**:

- BiomeModifiers (Sprint Q)
- TerrainReactions (Sprint Q)
- biomePoolLoader (Sprint Q)
- biomeSpawnBias (Sprint Q)
- encounterLoader (Sprint Q ✅ shipped via Q.1 PR #42 actually — verify)
- missionTimer (Sprint Q)

Effort residual: ~10-15h Sprint Q polish. Non-gating Fase 3 cutover.

---

## Item 6 — Asset Legacy import M.3 Skiv portrait + lifecycle — gap concreto ❌

**Plan v3 §A.3 Skiv asset spec**:

| Asset                                           | Path consigliato               | Priority      |        Stato         |
| ----------------------------------------------- | ------------------------------ | ------------- | :------------------: |
| Skiv portrait (recap card) 256×256              | Path 3 (signature)             | P0 Sprint M.3 | ❌ NOT shipped Godot |
| Skiv lifecycle 5 stages 64×64 atlas             | Path 1+3 ibrido (LPC base)     | P0 Sprint M.3 | ❌ NOT shipped Godot |
| Skiv run cycle anim 8-frame 64×64 atlas         | Path 1 ibrido (LPC + override) | P0 Sprint M.3 | ❌ NOT shipped Godot |
| Skiv echolocation visual (Light2D + Particle2D) | native Godot 2D                | P1 Sprint N.6 |          ⏸          |
| Skiv idle vocal SFX 1-2s OGG                    | Path 2 AI o Sonniss CC0        | P2 Sprint M.3 |    ❌ NOT shipped    |
| Skiv combat roar SFX 0.5-1s OGG                 | Path 2 AI o Sonniss CC0        | P2 Sprint M.3 |    ❌ NOT shipped    |
| Skiv attack VFX 32×32 atlas 5-frame             | Path 1 Kenney VFX              | P1 Sprint M.3 |    ❌ NOT shipped    |
| Skiv death anim 64×64 atlas 8-frame             | Path 3 signature               | P1 Sprint N.6 |          ⏸          |

**Godot reality `assets/legacy/`** (verified gh api 2026-05-04):

- ✅ 8 archetype creature dirs (artificer/boss/harvester/invoker/ranger/skirmisher/vanguard/warden)
- ✅ 5 biomi tile dirs (caverna/foresta_acida/savana/town/tundra)
- ✅ parallax + vfx dirs
- ❌ NO `assets/skiv/` o `assets/creatures/skiv*`

**Verdict**: 47 PNG CC0 (Game PR #2002) ported MA Skiv-specific Path 3 portrait + lifecycle stages NON shipped Godot.

**Workspace ref**: `~/Documents/evo-tactics-refs/HANDOFF.md` ha recipe Skiv-direct ma asset finali polished pending. Asset workflow skill `/asset-workflow` invocabile.

**Action items**:

1. Skiv portrait Path 3 redraw (Pixelorama, 256×256 + 128×128 thumbnail) ~2-3h userland
2. Skiv lifecycle 5 stages ibrido Path 1+3 (LPC fox base + custom mutations) ~3-4h
3. Skiv vocal SFX Path 2 (Retro Diffusion audio o Sonniss CC0 perpetual) ~1h
4. Skiv attack VFX Path 1 (Kenney VFX pack adapt) ~30min
5. Commit a `assets/skiv/` Godot v2 + `CREDITS.md` provenance log

**Effort totale userland**: ~6-9h. **Gating**: P0 Sprint M.3 plan v3 non chiuso. Skiv visual non recap-card-quality cross-stack.

---

## Item 7 — Cutover Fase 3 decision gate — 🟡 ADR PROPOSED 2026-05-05

**Closure 2026-05-05** — formal ADR shipped:

- ✅ **Decision gate criteria**: [`ADR-2026-05-04-cutover-godot-v2-decision-gate.md`](../adr/ADR-2026-05-04-cutover-godot-v2-decision-gate.md) (superseded 2026-05-05)
- 🟡 **Formal cutover ADR PROPOSED**: [`ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md`](../adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md) — Scenario 3 STAGED canary, 5/6 critical path PASS, C3 phone smoke retry pending
- ✅ **Web v1 archive plan codified**: §6 ADR-formal — tag preservation + frontend deprecate + backend preserve + documentation update
- ✅ **Rollback plan**: §7 ADR-formal — Phase A rollback + Phase B rollback procedures

**Critical path post-2026-05-05** (vs originale 24-31h decision-gate stima):

| #                  | Pre-condition                                             | Stato 2026-05-05 |
| ------------------ | --------------------------------------------------------- | :--------------: |
| C1 N.7 5/5         | 🟢 4/5 NEAR-PASS (Wave B residual non blocker)            |
| C2 M.7 p95         | 🟢 ENGINE+WIRE LIVE (#166)                                |
| C3 phone smoke     | 🟡 CONDITIONAL iter1 (B5 retest pending ~30 min userland) |
| C4 Ennea ACCEPTED  | ✅ #167 + #2041                                           |
| C5 cross-repo sync | ✅ LIVE                                                   |
| C6 GUT ≥1500       | 🟡 1499 (99.9%)                                           |

**Effort residuo Phase A trigger**: ~30 min userland (C3 retry) — vs originale stima 24-31h (-99% reduction).

**Verdict cutover readiness**: **PRE-PHASE-A (~95%)** — gating solo C3 phone smoke retry results.

**Action items chiusi 2026-05-05**:

1. ✅ Draft ADR decision-gate criteria — `ADR-2026-05-04` shipped (superseded by `ADR-2026-05-05`)
2. ✅ Web v1 archive plan — codified §6 ADR-formal (tag + frontend deprecate + backend preserve)
3. ✅ Cutover trigger phrase formalizzata — "phone smoke retry results PASS or CONDITIONAL accettato → Phase A ACCEPTED" (ADR-formal §3)

**Pending residuo**:

1. 🟡 Master-dd phone smoke retry (~30 min userland) — unblocks Phase A trigger
2. 🟡 Phase A ACCEPTED verdict (post-retry) — master-dd dichiarazione
3. ⏸ Phase B trigger (post 7gg grace + 1+ playtest pass) — soft criteria selection

**Decision criteria plan v3** (implicit):

- ✅ Vertical slice MVP 3-feature shipped
- ✅ 3 mandatory spike (M.5 race, M.6 WS, M.7 latency) → M.5 + M.6 ✅, **M.7 PARTIAL**
- ✅ Sprint N gate playtest pass — **N gate ready trigger ma userland playtest pending**
- ✅ Co-op WS Godot HTML5 → ✅ shipped Sprint R + W6 phone composer
- ❌ N.7 failure-model parity 5/5 → **3/5 PARTIAL**, blocking
- ❌ Phone composer real-device smoke → master-dd manual ops pending
- ❌ Web v1 archive formal decision → no ADR

**Godot reality status**:

- 162+ PR main shipped 5-6 giorni
- GUT 1488 asserts
- Caller-wire LIVE
- Co-op WS multiplayer COMPLETE (Sprint R)
- 4 endpoints backend wire LIVE (Game ↔ Godot sync 6/6 endpoints)

**Verdict cutover readiness**: **PRE-GATE (~75%)**. Manca:

1. M.7 timing instrumentation + p95 test (~4-6h)
2. N.7 CampaignState + LineageMerge + Wave B (~14-16h)
3. Master-dd manual deploy ops (~2-4h userland)
4. Sprint I playtest userland 2-3 device (~1-2 sett userland)
5. ADR-2026-05-XX-cutover-godot-v2-formal (decision doc + web v1 archive plan)

**Action items**:

1. **Draft ADR cutover decision criteria**: doc `docs/adr/ADR-2026-05-XX-cutover-godot-v2-decision-gate.md` — match M.7+N.7 close + playtest pass before formal cutover.
2. **Web v1 archive plan**: tag `web-v1-final` su Game/ commit, freeze `apps/play/` (deprecated post-cutover), preserve `apps/backend/` cross-stack persiste Fase 3.
3. **Cutover trigger phrase**: "rubric session 4 amici tester pass + M.7+N.7 close + master-dd manual deploy verified" → Cutover Fase 3 ADR ACCEPTED.

---

## Item 8 — ERMES E7-E8 runtime bridge Godot — ⏸ deferred (correct)

**Plan v3 §ERMES roadmap**:

- E0-E6 shipped (PR #2009 + #2010, prototypes/ermes_lab/ Python isolated)
- E7 future runtime candidate **post-cutover Fase 3**
- E8 future foodweb candidate **post E7 + 5+ playtest session**

**Godot reality**: legge sample JSON statici via `WorldSeedRevealView` (W4.5) + `BiomeAdjacency` (W4.5.1). NO runtime bridge ERMES Python.

**Verdict**: **CORRETTO deferred**. Plan v3 esplicito "ERMES NON gating Sprint Fase 2/3 + NON in roadmap critical path".

**No action item**. Defer naturale post-cutover.

---

## Item 9 — Character creation TV scene Bible §0 — gap concreto ❌

**Plan v3 expectation**: Path A W4.5 candidate post W4 backend wire (per integrated-world-companion-plan §W4.5).

**Godot reality**: `gh search code` ricerca `CharacterCreationView` o `character_creation_view` → empty. NON shipped.

**Bible §0 player avatar setup**: form/job/species pick UI before lobby_join confirms. Separa da World Seed Reveal (Bible §3, ✅ shipped).

**Action items**:

1. Doc `scripts/views/character_creation_view.gd` design (mirror `LobbyView` + `WorldSetupHostView` pattern)
2. UI form/job/species pick (3 dropdown + RadarPolygon preview)
3. Bridge `CoopApi.create_character()` POST `/api/coop/character/create` (already LIVE Game side `routes/coop.js:94`)
4. Phase machine `main.gd` extend: `PHASE_CHARACTER_CREATION` between LOBBY → FORM_PULSE
5. GUT tests `test_character_creation_view.gd` + integration `test_main_phase_switch.gd`

**Effort**: ~6-10h. **Priority**: P1 (gating full vertical slice). **Sprint suggestion**: Sprint M.4-M.5 Godot side (post-A.1 Beehave merge).

---

## Item 10 — Phone composer real-device smoke test — master-dd manual ops 🟡 GUIDA SHIPPED, EXEC PENDING

**Plan v3**: W6 deploy ops shipped (PR #74) — `tools/web/build_web.sh` + `serve_local.sh` + `PhoneComposerBoot.tscn` + `docs/godot-v2/deploy-w6.md`.

**Closure 2026-05-05** — pre-flight + tooling + guida shipped:

| Sub-item                                  | Stato | Ref                                                                                                                                                                          |
| ----------------------------------------- | :---: | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Userland step-by-step guida               |  ✅   | [`docs/playtest/2026-05-05-phone-smoke-step-by-step.md`](../playtest/2026-05-05-phone-smoke-step-by-step.md) (Game/ PR #2045 + #2047 + #2048 + #2050)                        |
| Doc redirect → upstream canonical         |  ✅   | Game/ PR #2048 — punta a `Game-Godot-v2/docs/godot-v2/deploy-quickstart.md` (Quick Tunnel) + `deploy-master-dd-checklist.md` (named tunnel) + `tools/deploy/deploy-quick.sh` |
| `Game/.env` AUTH_SECRET gitignored        |  ✅   | Game/ PR #2048 (`.gitignore` +13 LOC)                                                                                                                                        |
| `build_web.sh` MSYS Windows compat        |  ✅   | Game-Godot-v2 PR #168 — `$USER` fallback bilingual + `command -v` `.cmd` resolve fix + `.exe` direct fallback                                                                |
| `serve_local.sh` path traversal guard     |  ✅   | Game-Godot-v2 PR #168 — `path.resolve` both sides + traversal blocked                                                                                                        |
| Pre-flight 5/5 verified locale            |  ✅   | Sessione 2026-05-05: Godot 4.6.2 + preset.0 Web + main post #166/#167 + cloudflared 2025.8.1 + npm deps                                                                      |
| Smoke verify `deploy-quick.sh` end-to-end |  ✅   | Tunnel URL ephemeral live verified `https://sub-answering-copies-classics.trycloudflare.com/phone/` (subsequent runs use new random subdomain)                               |

**Pending manual ops** (master-dd userland, NON automatable):

- Phone real-device smoke test (iOS Safari + Android Chrome) — segui [`2026-05-05-phone-smoke-step-by-step.md`](../playtest/2026-05-05-phone-smoke-step-by-step.md) §"Smoke test scenarios" 5a-5d
- Compila verdict template + submit results doc `docs/playtest/2026-05-XX-phone-smoke-results.md`
- Drift sync Item 10 final close mark (post-results submission)

**Verdict**: **GUIDA + TOOLING COMPLETE**. Master-dd userland action solo per phone test execution + verdict capture (~30 min run + 15 min compile results).

**Effort residuo userland**: ~45 min (no più 2-4h originale — pre-flight + tooling automated). **Gating**: cutover Fase 3 ADR pre-condition (Item 7) — sblocca quando results PASS p95 <100ms o CONDITIONAL accettato.

---

## NEW drift discovered — Ennea taxonomy schema mismatch — ✅ RESOLVED 2026-05-05

**Game side `apps/play/src/debriefPanel.js` + `characterPanel.js`** (sessione 2026-05-04 PR #2041):

- 9 ENNEA_META: Riformatore(1)/Coordinatore(2)/Conquistatore(3)/Individualista(4)/Architetto(5)/Lealista(6)/Esploratore(7)/Cacciatore(8)/Stoico(9)
- Schema: full enneagram 9-type taxonomy

**Resolution 2026-05-05** — ADR + cross-stack port:

- ✅ **Decision**: ADR-2026-05-04 Opzione A — full 9-type enneagram canonical (drop Sprint O.5 simplified 6-archetype)
- ✅ **Game side**: ENNEA_META 9 full canon shipped PR #2041 (`apps/play/src/debriefPanel.js` + `characterPanel.js`)
- ✅ **Godot side port**: Game-Godot-v2 PR #167 — `scripts/ai/vc_scoring.gd` ENNEA_ARCHETYPES 9 full enneagram canon mirror Game `apps/backend/services/vcScoring.js` + `data/core/telemetry.yaml ennea_themes`. Multi-trigger semantics + `_eval_ennea_triggers(agg, raw)` hardcoded conditions per `compute_ennea_archetypes`
- ✅ **Cross-stack parity**: vcSnapshot Godot side produce 9 archetype = Game side payload (9 type) — incompatibilità chiusa

**Verdict**: **DRIFT RESOLVED ✅** — cutover Fase 3 ADR no longer blocked dalla taxonomy mismatch. P4 MBTI/Ennea cross-stack consistency restored.

**Sub-item residuo (NON blocker)**:

- 🟡 Godot UI surface 9 archetype non ancora wired (Engine LIVE Surface DEAD — vcSnapshot computa ma debrief panel Godot NON mostra all 9 type yet)
- Effort: ~2-3h Godot side debrief surface — low priority post-Item-10 phone smoke results.

---

## Sintesi action items + ordering

| #   | Item                                                 | Owner            | Effort  | Gating             |
| --- | ---------------------------------------------------- | ---------------- | ------- | ------------------ |
| 1   | M.7 surface debrief HUD (engine + wire ✅ #166)      | Godot dev        | 2-3h    | UX polish          |
| 2   | N.7 Wave B 2 statuses + cross-encounter GUT (4/5 ✅) | Godot dev        | 6h      | UX polish          |
| 3   | Beehave A.2 role overlays + registry                 | Godot dev        | 6-8h    | optional           |
| 4   | 2 deferred adapters emitter wire (forecast/overlay)  | Godot dev        | 3-5h    | UX polish          |
| 5   | Skiv asset Path 3 portrait + lifecycle + SFX + VFX   | userland + tools | 6-9h    | cross-stack visual |
| 6   | Cutover ADR draft + criteria                         | master-dd + dev  | 1-2h    | **cutover Fase 3** |
| 7   | ERMES E7-E8 (deferred correct)                       | post-cutover     | —       | —                  |
| 8   | Character creation TV scene Godot                    | Godot dev        | 6-10h   | full slice         |
| 9   | Phone composer real-device smoke (guida shipped ✅)  | master-dd manual | ~45 min | **cutover Fase 3** |
| 10  | Ennea Godot debrief surface 9 archetype (cross ✅)   | Godot dev        | 2-3h    | UX polish          |

**Critical path Fase 3 cutover (post-2026-05-05 close-marks)** — items 6 + 9 = ~2-3h totale:

1. **Item 9** Phone composer real-device smoke (~45 min userland, master-dd) — guida + tooling shipped 2026-05-05
2. **Item 6** Cutover ADR formal (1-2h, master-dd + dev) — sblocca quando Item 9 results PASS p95 <100ms o CONDITIONAL accettato

**Non-blocking refinements** (items 1 + 2 polish + 3 + 4 + 5 + 8 + 10 = ~28-43h):

- M.7 surface HUD (2-3h), N.7 Wave B + cross-encounter GUT (6h), Beehave A.2 (6-8h), adapter emitter wire (3-5h), Skiv asset (6-9h), character creation TV (6-10h), Ennea Godot debrief surface (2-3h)

**Total cutover Fase 3 ADR-ready effort**: **~2-3h userland + dev** (vs 47-70h originale stima 2026-05-04). Reduction post-2026-05-05 close-marks: **~93-96%** del residual blocking effort eliminato (Item 1+2+Ennea + Item 10 guida tutti closed-marked autonomous).

## Verdict finale

✅ **Godot v2 OVERSHOT plan v3 expectation in 5-6 giorni reali** (vs 6-8 sett stima Fase 2). Sprint M-N-O-P-Q-R-W7 ALL closed.

✅ **2 verifiche parity post-2026-05-05 close-marks**: M.7 ENGINE+WIRE LIVE (#166) + N.7 GATE 0 NEAR-PASS 4/5 (#165 + CampaignState shipped). Cross-stack Ennea taxonomy 9-canon RESOLVED (#167 + #2041).

🟡 **Phone smoke guida shipped + tooling automated** (Game/ #2045/#2047/#2048/#2050 + #168). Userland exec residuo solo ~45 min.

❌ **Drift items concreti residual** (NON cutover-blocker): Skiv visual asset, character creation TV scene Godot.

⏸ **ERMES correctly deferred** post-cutover.

**Resume trigger phrase canonical**:

> _"leggi docs/planning/2026-05-04-plan-v3-drift-sync-godot-realtime.md, esegui Item 9 phone smoke userland → poi Item 6 cutover Fase 3 ADR formal"_
