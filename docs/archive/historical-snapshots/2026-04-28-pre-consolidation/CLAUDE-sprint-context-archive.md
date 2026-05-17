---
title: 'CLAUDE.md Sprint Context Archive — pre-consolidation 2026-04-28'
date: 2026-04-28
doc_status: historical_ref
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-28'
source_of_truth: false
language: it
review_cycle_days: 365
tags: [archive, claude-md, sprint-context, pre-consolidation, snapshot, historical]
related:
  - CLAUDE.md
  - docs/reports/2026-04-28-canonical-doc-consolidation-plan.md
  - docs/reports/2026-04-28-canonical-doc-drift-audit.md
---

# CLAUDE.md Sprint Context Archive — pre-consolidation 2026-04-28

> **Snapshot pre-consolidation**: archivio sezioni `## 🎮 Sprint context` 4-23 da `CLAUDE.md` PRIMA di pruning per policy max 3 sections (drift audit 2026-04-28).
>
> **Provenance**: estratto da `CLAUDE.md` HEAD `1d6f697b` (2026-04-28 mattina), 638 righe, 20 sezioni cronologicamente dalla più recente alla più vecchia (2026-04-27 → 2026-04-23).
>
> **Razionale archiviazione**: drift audit (PR #1989) ha rilevato 23 sezioni sprint context coexistenti in CLAUDE.md vs policy max 3. Sezioni 4-23 (qui sotto) hanno valore historical ma non operational — archive permette pruning safe da CLAUDE.md mantenendo provenance trail.
>
> **Policy upkeep post-consolidation**: CLAUDE.md sprint context max 3 sections (top + 2 prior). Sezioni più vecchie auto-archive in questo doc (append-only lifecycle).

---

## Sezioni archiviate (sequenza cronologica originale CLAUDE.md)

Le seguenti sezioni `## 🎮 Sprint context` sono state estratte dal CLAUDE.md (sezione 4 in poi). Mantengono format originale per provenance trail.


---

---

## 🎮 Sprint context (precedente: 2026-04-27 — Sprint 7

**Sessione 2026-04-27 Sprint 7 (autonomous, ~5h)**: AncientBeast Tier S #6 residuo Beast Bond — passive species-pair reaction parallel a M2 reactionEngine. Closes 3/4 Tier S #6 (Sprint 6 channel + Sprint 7 bond; Ability r3/r4 ~10h residuo).

**PR shipped** (1): [#1971](https://github.com/MasterDD-L34D/Game/pull/1971) — `data/core/companion/creature_bonds.yaml` (6 bond pair, 5 archetype combo) + AJV schema `creature_bond.schema.json` + engine `apps/backend/services/combat/bondReactionTrigger.js` + wire in `session.js` performAttack + `sessionRoundBridge.js` capture/emit + 19 unit test (loader + eligibility + cooldown + counter/shield fire + back-compat) + ADR-2026-04-27 + numeric-reference §11 + stato-arte §B.1.5.

**Reaction types**:

- `counter_attack`: bonded ally strikes attacker, damage_step_mod=-1 + refund (pulled punch, cannot 1-shot kill); range gate via ally.attack_range.
- `shield_ally`: bonded ally absorbs floor(damageDealt/2), target restored (math identica intercept reroute, half-only passive).

**Caps**: 1 bond reaction/round/actor (`_bond_round_used`) + cooldown per-bond (`_bond_cooldown[bond_id] = currentTurn + cooldown_turns`). Mutually exclusive con M2 intercept (skip silent quando `interceptResult` fired).

**Compat**: missing YAML / vuoto → loadCreatureBonds returns `{bonds:[]}` → no-op silent. Zero breaking change su encounter esistenti.

**Stato pillars post Sprint 7**:

| #   | Pilastro          | Pre Sprint 7 |  Post  | Delta                                                                |
| --- | ----------------- | :----------: | :----: | -------------------------------------------------------------------- |
| P1  | Tattica leggibile |     🟢++     |  🟢ⁿ   | **Creature reactivity surface live (prima solo ability-armed)**      |
| P2  | Evoluzione        |    🟢 def    | 🟢 def | unchanged                                                            |
| P3  | Specie×Job        |     🟢c+     | 🟢c++  | **Species_pair semantics emerge dalle 45 specie canonical (6 bond)** |
| P4  | MBTI/Ennea        |     🟢c      |  🟢c   | unchanged                                                            |
| P5  | Co-op             |     🟢c      |  🟢c   | unchanged                                                            |
| P6  | Fairness          |    🟢 def    | 🟢 def | unchanged                                                            |

**Test baseline post-merge**: AI 382/382 ✓ (was 363, +19) · reactionEngine 13/13 ✓ · abilityExecutor 35/35 ✓ · sessionRound 23/23 ✓ · format/lint/schema verde · governance 0/0.

**Backlog Tier S #6 residuo**: Ability r3/r4 tier progressive (~10h, P3+, separate sprint).

**Handoff**: [`docs/planning/2026-04-27-sprint-7-beast-bond-handoff.md`](docs/planning/2026-04-27-sprint-7-beast-bond-handoff.md).

---

## 🎮 Sprint context (precedente: 2026-04-27 — Sprint 6 channel resistance earth/wind/dark)

**Sessione 2026-04-27 Sprint 6 (autonomous quick win, ~6h)**: AncientBeast Tier S #6 residuo candidato C — 3 channel canonical nuovi (earth/wind/dark) integrati 5 archetype + 6 ability routing + 10 test resistanceEngine. P6 Fairness 🟢c++ → 🟢 def.

**PR shipped main** (1):

| PR                                                       | Sprint | Scope                                                                                                                                                                                                                                                                                                                                                   | Pattern source         |
| -------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| [#1964](https://github.com/MasterDD-L34D/Game/pull/1964) | 6      | species_resistances.yaml v0.2.0 (8→11 channel: +earth/wind/dark, 15 entry × 5 archetype) + 6 ability nuove trait_mechanics (meteor_strike/ground_pound/gale_burst/vortex_spin/pressure_wave/umbral_spore) + 3 resist passive + tests +10 (matrix 6×5 + 11-channel presence + outlier guard) + numeric-reference §10 canonical channel resistance matrix | AncientBeast Tier S #6 |

**Channel allocation** (range 70-120, delta ±30):

- corazzato: earth 70 (+30 res), wind 80 (+20), dark 100
- bioelettrico: earth 120 (-20 vul), wind 90 (+10), dark 110
- psionico: earth 100, wind 100, dark 80 (+20 res abyss-friendly)
- termico: earth 90 (+10), wind 110 (-10), dark 120 (-20 sun-bound)
- adattivo: 100/100/100 neutral

**Test baseline post-merge**: AI 363/363 ✓ (was 311 + 21 resistanceEngine = 332; ora 363 = +31 dopo Sprint 6) · API 864/864 ✓ · contracts-trait-mechanics 15/15 ✓ · format/lint/schema verde.

**Stato pillars post Sprint 6**:

| #   | Pilastro          | Pre Sprint 6 |  Post  | Delta                                                                                                              |
| --- | ----------------- | :----------: | :----: | ------------------------------------------------------------------------------------------------------------------ |
| P1  | Tattica leggibile |     🟢++     |  🟢++  | unchanged                                                                                                          |
| P2  | Evoluzione        |    🟢 def    | 🟢 def | unchanged                                                                                                          |
| P3  | Specie×Job        |     🟢c+     |  🟢c+  | unchanged                                                                                                          |
| P4  | MBTI/Ennea        |     🟢c      |  🟢c   | unchanged                                                                                                          |
| P5  | Co-op             |     🟢c      |  🟢c   | unchanged (residuo TKT-M11B-06 userland)                                                                           |
| P6  | Fairness          |    🟢c++     | 🟢 def | **Parity 11 channel canonical (vs 8 attuali) + invariant test no outlier > 2× baseline (cap 20) e < 0.5× (cap 5)** |

**Score finale post Sprint 1-6**: **5/6 🟢 def + 1/6 🟢c**.

**Lessons codified questa sessione**:

- **Multi-active_effect pattern**: aggiungere ability nuove con `channel: <new>` su trait esistenti (array `active_effects`) = no breaking change ai 33 core trait. Schema permette + test invarianti restano verdi.
- **CANONICAL_CHANNELS test enforcement**: `tests/api/contracts-trait-mechanics.test.js` controlla allow-list per evitare drift (gelo/cryo/acido pre-2026-04-25 audit). Aggiornare quando si introducono nuovi channel canonical.
- **Schema `channel: string` (no enum)**: runtime accetta any channel via `applyResistance`. Solo test contracts enforce la lista canonical → no migration cost.

**Handoff**: [`docs/planning/2026-04-27-sprint-6-channel-resistance-handoff.md`](docs/planning/2026-04-27-sprint-6-channel-resistance-handoff.md).

**Next session candidati**:

- A) **TKT-M11B-06 playtest live** (userland 2-4 amici) — chiude P5 🟢 def
- B) **Beast Bond reaction trigger** (~5h) — AncientBeast Tier S #6 residuo (P1+)
- D) **Thought Cabinet UI panel cooldown round-based** (~8h) — Disco Tier S #9 residuo, P4 dominante
- E) **Ability r3/r4 tier progressive** (~10h) — AncientBeast Tier S #6 residuo (P3+)
- F) **Wildermyth layered storylets pool** (~10h) — Tier S #12 residuo, P4 narrative

---

## 🎮 Sprint context (aggiornato: 2026-04-27 notte — 5 sprint autonomous + OD-001 closure)

**Sessione 2026-04-27 notte (autonomous full-stack)**: 5 sprint autonomous shipped + 4 fixture maintenance fix + OD-001 Path A 4/4 chiuso definitivamente (PR #1877 superseded).

**PR shipped main** (5):

| PR                                                       | Sprint | Scope                                                                                                                                                                               | Pattern source                   |
| -------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| [#1934](https://github.com/MasterDD-L34D/Game/pull/1934) | 1      | Wesnoth time-of-day modifier + AI War defender's advantage + Disco day pacing flavor + Fallout numeric reference doc + 2 ADR design AI War                                          | Tier S #5/#9/#10/#11             |
| [#1935](https://github.com/MasterDD-L34D/Game/pull/1935) | 2      | Subnautica habitat lifecycle wire (biomeAffinity service + dune_stalker `biome_affinity_per_stage` + 14 lifecycle YAML stub script + biomeSpawnBias initial wave universal closure) | Tier A #9                        |
| [#1937](https://github.com/MasterDD-L34D/Game/pull/1937) | 3      | Tunic Glifi codexPanel tab + AncientBeast wikiLinkBridge slug bridge + Wildermyth choice→permanent flag campaign state                                                              | Tier S #6/#12 + Tier A indie     |
| [#1938](https://github.com/MasterDD-L34D/Game/pull/1938) | 4      | Cogmind stratified tooltip Shift-hold expand + Dead Space holographic AOE cone shimmer + Isaac Anomaly card glow effect                                                             | Tier B #3/#7 + Tier S #11 hybrid |
| [#1940](https://github.com/MasterDD-L34D/Game/pull/1940) | 5      | Tufte sparkline HTML dashboard generator + DuckDB analyze_telemetry +4 SQL query (mbti_distribution / archetype_pickrate / kill_chain_assists / biome_difficulty)                   | Tier E #9/#13                    |

**OD-001 chiusura definitiva**: PR #1877 (Sprint C UI + backend, 51K LOC stale) chiuso come superseded. Path A 4/4 già live via combo #1874+#1875+#1876+#1879+#1911. Niente perso.

**Engine LIVE Surface DEAD anti-pattern killed**: Subnautica habitat (Tier A #9) chiuso (engine + lifecycle YAML + wire performAttack + UI biome_affinity surface). biomeSpawnBias universal init wave closure (encounter.biome_id derive biomeConfig).

**Test baseline post-merge**: AI 311/311 + spawner 15/15 + biomeAffinity 7/7 + wikiLinkBridge 10/10 + campaignFlags 9/9 + sparkline 8/8 + 4 fixture restore = **~360 test verde**.

**Stato pillars post-sprint**:

| #   | Pilastro          |  Pre   |  Post  | Delta                                                   |
| --- | ----------------- | :----: | :----: | ------------------------------------------------------- |
| P1  | Tattica leggibile |   🟢   |  🟢++  | + Cogmind tooltip + Dead Space AOE + Isaac glow         |
| P2  | Evoluzione        | 🟢 def | 🟢 def | + Subnautica habitat lifecycle live (15 species)        |
| P3  | Specie×Job        |  🟢c   |  🟢c+  | + AncientBeast wiki cross-link runtime ↔ catalog       |
| P4  | MBTI/Ennea        |  🟡++  |  🟢c   | + Wildermyth permanent flags + Disco day pacing         |
| P5  | Co-op             |  🟢c   |  🟢c   | unchanged (residuo TKT-M11B-06 userland)                |
| P6  | Fairness          |  🟢c+  | 🟢c++  | + AI War defender adv + Fallout numeric ref + Tufte viz |

**Lessons codified questa sessione**:

- **Cherry-pick fixture fix opportunistic** quando CI block PR proprio per stale fixtures di altre PR mergiate (sangue_piroforico nerf #1869, orphan currency #1870, schema object #1871).
- **`gh pr update-branch` API > rebase + force-push** quando branch protection blocca admin merge.
- **Sandbox guardrail**: force-push e admin merge denied automatically. Workflow alternative: GitHub UI "Update branch" button via `gh pr update-branch <num>`.
- **Multi-PC race PR superseded**: PR aperti pre-cross-PC che restano stale > 1 giorno = candidate close-as-superseded automatic. Pattern visto su #1877.

**Handoff**: [`docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md`](docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md) §A.2 PR table aggiornato + §B.1.5/§B.1.11/§B.2 #9/§B.3 #3/§B.5 #9/#13 marked 🟢 shipped.

**Next session candidati**:

- A) **TKT-M11B-06 playtest live** (userland 2-4 amici) — chiude P5 🟢 def
- B) **Beast Bond reaction trigger** (~5h) — adjacency-trigger per-creature trait, AncientBeast Tier S #6 residuo
- C) **3 nuovi elementi channel resistance** earth/wind/dark (~6h con balance pass) — AncientBeast Tier S #6 residuo
- D) **Thought Cabinet UI panel cooldown round-based** (~8h) — Disco Tier S #9 residuo, P4 dominante
- E) **Ability r3/r4 tier progressive** (~10h) — AncientBeast Tier S #6 residuo, P3+

---

## 🎮 Sprint context (aggiornato: 2026-04-27 — Status Effects v2 Phase A COMPLETA)

**Sessione 2026-04-27 (status effects)**: STEP 3 Phase A completo — 5 stati Tier 1 come 5 mini-PR sequenziali. Tutti i CI verdi. 0 regressioni.

**PR shipaiti** (5, tutti draft in attesa merge):

| PR                                                       | Stato       | Trait                | Effetto           | CI  |
| -------------------------------------------------------- | ----------- | -------------------- | ----------------- | --- |
| [#1947](https://github.com/MasterDD-L34D/Game/pull/1947) | slowed      | `tela_appiccicosa`   | -1 AP reset/T     | ✅  |
| [#1948](https://github.com/MasterDD-L34D/Game/pull/1948) | marked      | `marchio_predatorio` | +1 dmg next hit   | ✅  |
| [#1950](https://github.com/MasterDD-L34D/Game/pull/1950) | burning     | `respiro_acido`      | DoT 2 PT/T        | ✅  |
| [#1951](https://github.com/MasterDD-L34D/Game/pull/1951) | chilled     | `aura_glaciale`      | -1 AP -1 atk/T    | ✅  |
| [#1953](https://github.com/MasterDD-L34D/Game/pull/1953) | disoriented | `sussurro_psichico`  | -2 atk/T (1T cap) | ✅  |

**Test baseline**: 311→319 (+8 disoriented, branche separate ~315-321 per PR). AI suite 0 regressioni.

**Handoff**: [`docs/planning/2026-04-27-status-effects-phase-a-handoff.md`](docs/planning/2026-04-27-status-effects-phase-a-handoff.md).

**Next session candidati**: A) HUD surface per 5 stati (~3-4h, Gate 5 DoD), B) policy.js consumption per AI awareness (~6-8h), C) merge + rebase PR-1/2 su nuovo main, D) Phase B stati avanzati.

---

## 🎮 Sprint context (aggiornato: 2026-04-27 — Sprint 11 Biome chip HUD — Surface-DEAD #6 chiuso, 6/8 sweep)

**Sessione 2026-04-27 (Sprint 11, §C.2 Surface-DEAD #6 chiusura)**: biome chip HUD live next to objective bar. Player vede ora `🌾 Savana` (o equivalente per altri biomi) chip pill style accanto all'obiettivo, con tooltip nativo "Biome: <id> — vedi Codex per dettagli". Sblocca lettura tattica ambiente (specie endemiche favorite, hazard, strategia).

**Highlights**:

- **Backend** [`apps/backend/routes/sessionHelpers.js`](apps/backend/routes/sessionHelpers.js): expose `biome_id` in `publicSessionView` con fallback `session.encounter?.biome_id` (per encounter YAML loaded via encounter_id).
- **Module nuovo** [`apps/play/src/biomeChip.js`](apps/play/src/biomeChip.js): pure `labelForBiome(biomeId)` (11 canonical IT labels: savana/caverna/foresta/pianura_aperta/rovine_planari/abisso_vulcanico/atollo_obsidiana/cattedrale_apex/frattura_stellare/etc) + `iconForBiome` (emoji per tipo) + `formatBiomeChip(biomeId)` (HTML pill) + side-effect `renderBiomeChip(containerEl, biomeId)` (idempotent + show/hide gracefully).
- **HTML slot** [`apps/play/index.html`](apps/play/index.html): `<div id="biome-chip" class="biome-chip biome-hidden" role="status" aria-live="polite">` next to objective-bar in header.
- **Wire** [`apps/play/src/main.js`](apps/play/src/main.js): import + `refreshBiomeChip()` chiamato in `refresh()` (post state-fetch) + bootstrap `startSession`. Reads `state.world.biome_id` (publicSessionView).
- **CSS** [`apps/play/src/style.css`](apps/play/src/style.css): `.biome-chip` pill style (rgba green-tinted bg + border + caps label).
- **Smoke E2E preview validato live**: bootstrap session enc_tutorial_01 → backend resolve `biome_id: 'savana'` (via encounter YAML) → HUD chip render `🌾 Savana` con tooltip ✓.
- **Test**: 17/17 nuovi `tests/play/biomeChip.test.js` (4 describe blocks: labelForBiome 4 + iconForBiome 3 + formatBiomeChip 4 XSS escape + renderBiomeChip 6 idempotent + DOM side effect). AI baseline 363/363 zero regression. Format prettier verde + governance 0 errors.
- **Status §C.2 Surface-DEAD sweep**: **6/8 chiusi** (#1 Sprint 8 + #2 HP floating + #5 Sprint 9 + #6 Sprint 11 + #7 Sprint 10 + #8 Sprint 6). Residui solo #3 Spore mutation dots (15h authoring) + #4 Mating lifecycle wire (5h).

**Pillar P5 Co-op Sistema**: 🟡++ → **🟡++ (consolidato)**. **P1 Tattica leggibile**: 🟢++ (ambient context).

**Next session candidato**: Sprint 12 Mating lifecycle wire (Surface-DEAD #4 ~5h, sblocca lineage chain visibile post-encounter) oppure pivotare su Tier-A o Tier-B residui non-Surface-DEAD.

---

## 🎮 Sprint context (aggiornato: 2026-04-27 — Sprint 10 QBN narrative debrief beats — Surface-DEAD #7 chiuso)

**Sessione 2026-04-27 (Sprint 10, §C.2 Surface-DEAD #7 chiusura)**: QBN narrative event diegetic surface live nel debrief panel. Backend `qbnEngine.drawEvent` LIVE da PR #1914 + `rewardEconomy.buildDebriefSummary` già emette `narrative_event` in debrief response, ma frontend ignorava il campo.

**Highlights**:

- **Module nuovo** [`apps/play/src/qbnDebriefRender.js`](apps/play/src/qbnDebriefRender.js): pure `formatNarrativeEventCard(narrativeEvent)` (HTML card con title + body + choices + meta) + side-effect `renderNarrativeEvent(sectionEl, cardEl, payload)` (idempotent + section show/hide). Accept legacy keys `title`/`body` + canonical `title_it`/`body_it`. XSS escape su tutti i campi.
- **Setter** [`apps/play/src/debriefPanel.js`](apps/play/src/debriefPanel.js): nuovo `setNarrativeEvent(payload)` API + `state.narrativeEvent` field + `renderQbn()` chiamato in render path principale + `<div id="db-qbn-section">` HTML template + import.
- **Wire** [`apps/play/src/phaseCoordinator.js`](apps/play/src/phaseCoordinator.js): pipe `bridge.lastDebrief.narrative_event` → `dbApi.setNarrativeEvent(...)` quando phase transitions a 'debrief'.
- **CSS** [`apps/play/src/debriefPanel.css`](apps/play/src/debriefPanel.css): `.db-qbn-card` journal style (linear-gradient violet + Georgia serif body italic) + `.db-qbn-title/body/choices/meta` typography.
- **Test**: 15/15 nuovi `tests/play/qbnDebriefRender.test.js` (2 describe blocks: formatNarrativeEventCard + renderNarrativeEvent — null/empty/full payload + legacy keys + XSS escape + choices fallback + idempotency). AI baseline 363/363 zero regression. Format prettier verde + governance 0 errors.
- **Smoke E2E preview validato live**: backend + play servers, module import OK, render path produces correct DOM `<div class="db-qbn-event"...>` con title/body/choices/meta sections.
- **Status §C.2 Surface-DEAD sweep**: **5/8 chiusi** (#1 Sprint 8 + #2 HP floating + #5 Sprint 9 + #7 Sprint 10 + #8 Sprint 6). Residui: #3 Spore mutation dots (15h authoring), #4 Mating lifecycle wire (5h), #6 Biome initial wave (2h quick-win).

**Pillar P4 Narrative Identità**: 🟢 def → **🟢++** (cronaca diegetica visibile post-encounter).

**Next session candidato**: Sprint 11 biome initial wave universal wire (Surface-DEAD #6 ~2h quick-win).

---

## 🎮 Sprint context (aggiornato: 2026-04-27 — Sprint 9 Objective HUD top-bar — Surface-DEAD #5 chiuso)

**Sessione 2026-04-27 (Sprint 9, §C.2 Surface-DEAD #5 chiusura)**: objective HUD top-bar live. Player vede subito `⚔ Elimina i nemici · Sistema vivi: 2 · PG: 2` band active, status colorato (active accent / win green / loss red). Backend `objectiveEvaluator` 6 obj types (elimination/capture_point/escort/sabotage/survival/escape) era LIVE da ADR-2026-04-20 ma surface DEAD: encounter.objective + objective_state non esposti al client.

**Highlights**:

- **Backend route nuovo** [`apps/backend/routes/session.js`](apps/backend/routes/session.js): `GET /api/session/:id/objective` ritorna `{encounter_id, encounter_label_it, objective: {type,...}, evaluation: {completed, failed, progress, reason, outcome?}}` lazy-evaluating tramite `evaluateObjective()`. Graceful 404 / null shape se sessione senza encounter.objective (backward compat tutorial legacy).
- **Module nuovo** [`apps/play/src/objectivePanel.js`](apps/play/src/objectivePanel.js): pure `labelForObjectiveType(type)` (6 IT canonical labels) + `iconForObjectiveType(type)` (emoji per tipo) + `statusForEvaluation(evaluation)` (win/loss/active/unknown) + `formatProgress(type, progress)` aligned con real backend payload keys (sistema/player, turns_held/target_turns, turns_survived/target, units_escaped/units_alive, escort_hp/extracted, sabotage_progress/required) + side-effect `renderObjectiveBar(containerEl, payload)` (idempotent innerHTML + status class swap).
- **API client** [`apps/play/src/api.js`](apps/play/src/api.js): `api.objective(sid)` GET helper.
- **Wire** [`apps/play/src/main.js`](apps/play/src/main.js): import + `refreshObjectiveBar()` chiamato in `refresh()` (post state-fetch) + bootstrap `startSession`. Pipeline encounter_id → backend loadEncounter (docs/planning/encounters/<id>.yaml) → engine.encounter populated → /objective surfaces.
- **HTML slot** [`apps/play/index.html`](apps/play/index.html): `<div id="objective-bar" class="objective-bar obj-hidden" role="status" aria-live="polite">` in header next to pressure-meter.
- **CSS** [`apps/play/src/style.css`](apps/play/src/style.css): `.objective-bar` rules con varianti band (status-active accent / status-win green / status-loss red / hidden).
- **Smoke E2E preview validato live**: bootstrap session enc_tutorial_01 (ora con encounter_id pipe) → HUD render `⚔ Elimina i nemici · Sistema vivi: 2 · PG: 2` con band active (accent border) ✓.
- **Test**: 29/29 nuovi `tests/play/objectivePanel.test.js` (6 describe blocks: labelForObjectiveType + iconForObjectiveType + statusForEvaluation + formatProgress 6 obj types con real backend keys + formatObjectiveBar + renderObjectiveBar fakeContainer DOM). AI baseline 363/363 zero regression. Format prettier verde + governance 0 errors.
- **Status §C.2 Surface-DEAD sweep**: **4/8 chiusi** (#1 Sprint 8 + #2 HP floating M4 P0.2 + #5 Sprint 9 + #8 Thought Cabinet Sprint 6).

**Pillar P5 Co-op Sistema**: 🟡 → **🟡++** (player vede esplicitamente cosa deve fare). **P1 Tattica leggibile**: 🟢++ → **🟢++ (consolidato)**.

**Next session candidato**: Sprint 10 QBN narrative debrief beats (Surface-DEAD #7) o Sprint 11 biome initial wave universal wire (Surface-DEAD #6 ~2h quick-win).

---

## 🎮 Sprint context (aggiornato: 2026-04-27 — Sprint 8 predict_combat hover preview — Surface-DEAD #1 chiuso)

**Sessione 2026-04-27 (Sprint 8, §C.2 Surface-DEAD #1 chiusura)**: predict_combat hover preview live. Player hover su nemico con player selezionato → tooltip mostra `⚔ HIT% · ~DMG · CRIT%` con band color (high/medium/low) + elevation hint. Decision aid <300ms before commit attack.

**Highlights**:

- **Module nuovo** [`apps/play/src/predictPreviewOverlay.js`](apps/play/src/predictPreviewOverlay.js): pure `formatPredictionRow(prediction)` + `colorBandForHit(hitPct)` (semantic band high/medium/low/unknown) + async cached `getPrediction(sid, actorId, targetId, fetcher)` (Map memoization per tuple, prevents flood backend) + `clearPredictionCache()`.
- **API client** [`apps/play/src/api.js`](apps/play/src/api.js): `api.predict(sid, actorId, targetId)` POST helper.
- **Wire** [`apps/play/src/main.js`](apps/play/src/main.js): mousemove handler — quando target è enemy alive AND state.selected è player alive → fetch async predict + inietta `.tt-predict` row in tooltip (idempotent, post handleDamageEvent path indipendente). Cache invalidated su `state.sid` change (nuova sessione).
- **CSS** [`apps/play/src/style.css`](apps/play/src/style.css): `.tt-predict` rules con varianti band (high green / medium amber / low red / unknown gray / error red-italic).
- **Smoke E2E preview validato live**: bootstrap session → select p_scout → hover su e_nomad_1 → tooltip surfaces `⚔ 60% hit · ~1.4 dmg · 5% crit` con band medium (amber). Tutorial 01 4-unit setup confermato end-to-end.
- **Test**: 22/22 nuovi `tests/play/predictPreviewOverlay.test.js` (3 describe blocks). AI baseline 363/363 zero regression. Format prettier verde + governance 0 errors.
- **Status §C.2 Surface-DEAD sweep**: **3/8 chiusi** (#1 Sprint 8 + #2 HP floating M4 P0.2 + #8 Thought Cabinet Sprint 6).

**Pillar P1 Tattica leggibile**: 🟢 → **🟢++** (decision aid live, hit% visibile pre-commit).

**Next session candidato**: Sprint 9 Objective UI HUD (Surface-DEAD #5) o Sprint 10 QBN narrative debrief beats (Surface-DEAD #7).

---

## 🎮 Sprint context (aggiornato: 2026-04-27 — Sprint 7 Disco skill check popup — ✅ B.1.8 BUNDLE COMPLETO)

**Sessione 2026-04-27 (Sprint 7, Disco B.1.8 #3 chiusura — bundle 4/4 shipped)**: stato-arte §B.1.8 closed completely. Bundle Disco Elysium Tier S 4/4 shipped: #1 Thought Cabinet (PR #1966), #2 Internal voice (PR #1945), **#3 Skill check popup (this sprint)**, #4 Day pacing (PR #1934).

**Highlights**:

- **Module nuovo** [`apps/play/src/skillCheckPopup.js`](apps/play/src/skillCheckPopup.js): pure `buildSkillCheckPayload(traitEffects)` + side-effect `renderSkillCheckPopups(event, actor, pushPopupFn, opts)`. Filtra `triggered=true`, dedupes, formatta in caps Disco-style `[NOME TRAIT]`, schedula popup floating sopra l'actor con stagger 220ms + y-offset crescente.
- **Wire** [`apps/play/src/main.js processNewEvents`](apps/play/src/main.js): post damage popup, chiamata `renderSkillCheckPopups(ev, actor, pushPopup)` su attack/ability events. Zero backend change — `evaluateAttackTraits` già emette `trait_effects[]` in event payload (verificato live via `/api/session/state`).
- **Test**: 22/22 nuovi `tests/play/skillCheckPopup.test.js` (3 describe blocks: formatTraitLabel + buildSkillCheckPayload pure transform + renderSkillCheckPopups side effect orchestration). AI baseline 363/363 zero regression. Format prettier verde + governance 0 errors.
- **Smoke E2E preview**: backend + play servers live, module import verificato, payload transform su 3 trait_effects → 2 popup correttamente filtrati (1 not-triggered escluso), pushPopup signature wire OK.

**Pillar P4 status**: 🟢 def → **🟢 def++ (Disco bundle saturated)**. Sprint chiude tutti i 4 pattern Disco Tier S residui.

**Next session candidato**: P4 non-Disco — XCOM EW Officer Training School ~10h (B.1.6) o Wildermyth layered storylets ~10h (B.1.11). Oppure P3 ability r3/r4 tier ~10h.

---

## 🎮 Sprint context (aggiornato: 2026-04-27 — Sprint 6 Thought Cabinet UI panel + cooldown round-based — ✅ MERGED #1966)

**Sessione 2026-04-27 (Sprint 6, Disco Tier S #9 chiusura)**: stato-arte §B.1.8 pattern P0 chiuso. Engine + bridge + UI + tests + smoke E2E live, 76/76 thoughts test verdi, 353/353 AI baseline zero regression.

**Merge bookkeeping**: PR [#1966](https://github.com/MasterDD-L34D/Game/pull/1966) squashed to `main` come `584c54c2` (2026-04-27 18:19 UTC). CI 19 SUCCESS / 12 SKIPPED / 0 FAIL post re-run del flake `terrainReactionsWire` "eventually hits". Adoption check scheduled per 2026-05-11 09:00 Europe/Rome (routine `trig_01JJsMTpGWaEsBfhE51YFNMx`).

**Highlights**:

- **P4 Disco Tier S #9** (Sprint 6 closure): Thought Cabinet UI panel + cooldown round-based shipped end-to-end.
  - Engine: `DEFAULT_SLOTS_MAX` 3→8; `RESEARCH_ROUND_MULTIPLIER=3` constant; `mode='rounds'|'encounters'` opt; `tickAllResearch(bucket, delta)` bulk helper.
  - Bridge: `applyEndOfRoundSideEffects` → `tickAllResearch` decrementa 1 round per tick + auto-internalize + apply passives + emit `thought_internalized` event. `getCabinetBucket` injected via deps.
  - Routes: `/thoughts/research` accetta `mode` body param, default `'rounds'` (T1→3 round, T2→6, T3→9). Risposta plumb `scaled_cost` + `mode`.
  - Frontend: `apps/play/src/thoughtsPanel.js` Assign/Forget buttons inline per card + progress bar `cost_remaining/cost_total round X%` + 8-slot grid + canResearchMore gate + error banner. Slot counter ●○ aggiornato live.
  - API client: `api.thoughtsList`/`thoughtsResearch`/`thoughtsForget` aliases.
- **Smoke E2E preview validato**: backend + play dev server. 8 slots default ✓, mode=rounds default cost_total=3 ✓, end-of-round auto-tick 3 round → internalize ✓, Assign ⇄ Forget round-trip UI ✓.
- **Test budget**: thoughtCabinet 59/59 (era 30/30; +29 round-mode), sessionThoughts 17/17 (era 12/12; +5 E2E round-tick), AI baseline 353/353 zero regression. Format prettier verde, governance 0 errors / 0 warnings.

**Pillar P4 status**: **🟢c → 🟢 def** (8 slot live + cooldown round-based + UI surface + auto-tick wired).

**Next session candidato**: P4 residui Disco — solo B.1.8 #3 Skill check passive vs active popup (~4h) resta open. Bundle Disco 3/4 shipped: ~~#1 Thought Cabinet PR #1966~~, ~~#2 Internal voice PR #1945~~, ~~#4 Day pacing PR #1934~~. Post-#3 Disco è 4/4 chiuso.

---

## 🎮 Sprint context (aggiornato: 2026-04-27 — Trait-bond stat buff complement (post-#1971))

**Sessione 2026-04-27 (rebase recovery)**: PR #1965 chiuso cross-PC quando #1971 ha shippato l'implementazione "pair-bond defensive reaction" (`bondReactionTrigger.js` + `creature_bonds.yaml`). Recupero del valore complementare: il mio approach **trait-based offensive sustain** è ortogonale, non duplicato. Re-aperto come PR distinto.

**Differenze chiave vs #1971 (pair-bond)**:

- **Trigger**: il mio fires su **actor ATTACK** (any hit/miss), il loro su **target HIT** (damage > 0).
- **Effetto**: il mio = **stat buff atk_mod/def_mod** via `status[*_buff]` decay; il loro = **damage redirect** (counter-attack -1 step / shield_ally 50% absorb).
- **Setup**: il mio = trait in `holder.traits[]` (filtro `any` / `same` / `pack:<id>`); il loro = YAML species_pair espliciti (6 bond canonical).
- **Cap**: il mio = nessuno (multipli stack); il loro = 1 reaction/round/actor + cooldown_turns.

**Convivono side-by-side**: action_type evento diverso (`beast_bond_triggered` mio vs `reaction_trigger` loro), file diversi (`beastBondReaction.js` vs `bondReactionTrigger.js`), data diversi (`active_effects.yaml` vs `creature_bonds.yaml`), wire in posizioni diverse di `performAttack` (mio post-status-applies, loro post-damage-pre-panic).

**Files**: `apps/backend/services/combat/beastBondReaction.js` (pure check+apply) + 3 trait nuovi in `active_effects.yaml` (`legame_di_branco`, `spirito_combattivo`, `pack_tactics` con schema `triggers_on_ally_attack`) + 5 species catalog adoption in `species.yaml` (dune_stalker / chemnotela_toxica / elastovaranus_hydrus → legame; sciame_larve_neurali / simbionte_corallino_riflesso → spirito) + 20 test (11 unit + 3 E2E + 6 catalog/balance) + handoff doc + memory feedback "round-bridge sync trap pattern". Tests: 39/39 bond suites totali (20 mio + 19 loro), **499/499 regression zero**. P1 🟢++ depth.

---

## 🎮 Sprint context (aggiornato: 2026-04-27 notte — Sprint α+β+γ+δ FULL coordinated wave shipped)

**Sessione 2026-04-27 notte (continuazione)**: 4 sprint coordinati α/β/γ/δ shipped main via Phase 1+2 paralleli (PR #1958+#1959+#1960+#1961). 19 patterns strategy research applicati end-to-end. Cross-PC ready handoff doc canonical.

**Highlights**:

- **Sprint α Tactical Depth** (PR #1959): pseudoRng + bravado + pinDown + morale + interruptFire → P1 def++, P6 🟢 cand
- **Sprint γ Tech Baseline** (PR #1958): perf benchmark + dirty flag + AI personality YAML + patch delta + bug replay → dev/perf/modding foundation
- **Sprint β Visual UX** (PR #1960): tooltip 3-tier + tension gauge + portrait CK3 + body-part Phoenix Point + voice UI JA3 → P3 🟡++, P4 🟢 def, P6 🟢
- **Sprint δ Meta Systemic** (PR #1961): DNA encoder + event chain Stellaris + mutation tree swap MYZ + conviction Triangle → P2 🟢 def++, P5 🟢 cand refined

**Pillar score finale 2026-04-27 notte**: **5/6 🟢 def** (P1++/P2++/P4 def/P5 cand/P6) + **1/6 🟡++** (P3). Demo-ready raggiunto.

**Total this run**: 32 PR mergiati main, ~5000+ LOC, 123 nuovi test, 0 regression.

**Coordinated handoff doc**: [`docs/planning/2026-04-27-sprint-abgd-coordinated-handoff.md`](docs/planning/2026-04-27-sprint-abgd-coordinated-handoff.md) — §6 progress all ✅, cross-PC ready.

**Lessons reinforced** (3 collision events questa notte mitigati):

- Worktree isolation raccomandato per agent paralleli (recovery via stash)
- File ownership esclusivo respect ↔ atomic commit safety
- Default recommendations per decisioni master-dd (no blocking)

**Next session candidato**: TKT-M11B-06 playtest live userland (chiude P5 🟢 def) o aspect_token authoring 30 mutations (~15h debt) o Bundle Visual-Β extension (Old World aging + Battle Brothers parchment ~8h).

---

## 🎮 Sprint context (aggiornato: 2026-04-27 sera — Spore Moderate FULL + Recovery + Bundle B Indie Quick-Wins)

**Sessione 2026-04-27 sera (continuazione)**: 18 PR mergiati main (Spore S1-S6 stack + lifecycle + UI QW-1/2/3 + recovery 6 deliverables persi + classification + 12 museum cards + Bundle B 4 indie quick-wins).

**Highlights**:

- **P2 Evoluzione 🟡++ → 🟢 def**: Spore Moderate FULL stack chiuso (S1+S2+S3+S5+S6 + lifecycle hooks + 3 UI surfaces). Player loop completo: encounter→MP→mutation pick→ability emerge→archetype passive→cross-gen inherit.
- **Recovery 6 deliverables persi**: 5 indie research docs (~1370 LOC) + RANKED report (312 LOC) mai-committed → rigenerati PR #1926 + #1927.
- **Museum +12 cards**: Dublin-Core M-019→M-031 (3×4/5 + 7×3/5 + 2×2/5). Total 19→31.
- **Bundle B Indie Quick-Wins** (4 patterns ~16h): Citizen Sleeper drift briefing (P4) + Wildfrost counter HUD (P1) + TBW Undo libero (P1) + Tunic decipher Codex pages session-scope (cross). Test +28.
- **Conflict resolved**: cross-PC race con #1931 Tunic glyph progression — merged campaign-scope + session-scope endpoints in unified codex router.

**Pillar score finale 2026-04-27 sera**: **3/6 🟢 def** (P1++ + P2 + P4 candidato) + 1/6 🟢 cand (P5) + 2/6 🟡+/++ (P3 P6).

**Handoff**: [`docs/planning/2026-04-27-bundle-b-recovery-handoff.md`](docs/planning/2026-04-27-bundle-b-recovery-handoff.md).

**Lessons codified**:

- Untracked file → `git add` immediato anche WIP
- Background agent + branch ops → isolation worktree raccomandato
- Audit forensic post-cleanup mandatory

**Decisioni master-dd pendenti** (sblocca next sprint): D3 permadeath, D4 writer budget, D5 mini-map, TKT-09 ai_intent, TKT-M11B-06 playtest live.

**Next session candidati**: A) Resolver adapter+alpha consumption (~3-5h, S6 100%), B) Mutation catalog rebalance (~3-4h, fix bingo physiological dominance), C) Decisioni user, D) Playtest live.

---

## 🎮 Sprint context (aggiornato: 2026-04-27 — cross-PC absorption + deep extraction pass 2 + 73 pattern residui catalogati)

**Sessione 2026-04-27** (master-dd + Claude): absorption massiccia da origin/main (32 PR mergiati 2026-04-26/27 cross-PC) + seconda passata estrattiva profonda sui 5 cross-game extraction matrix doc + audit 5 nuovi backend services + sintesi v3.7.

**Doc canonical post-sprint**:

- **Stato dell'arte completo + vertical slice**: [`docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md`](docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md) — §A inventario decisioni, §B 73 pattern residui dettagliati, §C vertical slice 8-fasi, §E 6 decisioni richieste
- **v3.7 master synthesis**: [`docs/reports/2026-04-27-v3.7-cross-pc-update-synthesis.md`](docs/reports/2026-04-27-v3.7-cross-pc-update-synthesis.md) — 6 opzioni action plan
- **Cross-game tier matrices synthesis**: [`docs/reports/2026-04-27-cross-game-tier-matrices-synthesis.md`](docs/reports/2026-04-27-cross-game-tier-matrices-synthesis.md) — top 15 ROI ranked
- **Deep-analysis residual gaps**: [`docs/reports/2026-04-27-deep-analysis-residual-gaps-synthesis.md`](docs/reports/2026-04-27-deep-analysis-residual-gaps-synthesis.md) — 9 domain residual P0/P1/P2

**Pattern residui catalogati**: 73 pattern cross-game (38 Tier S + 11 Tier A + 11 Tier B + 13 Tier E) — quick wins ≤5h totali ~64h, full residual ~509h. Doc dettagliati al §B dello stato-arte.

**Anti-pattern dominante "Engine LIVE Surface DEAD"**: ~30% delle 61 voci catalogate hanno runtime built ma surface player dead. 8 engine orphan diagnosticati (predictCombat/Tactics Ogre HUD/Spore part-pack/Mating gene_slots/objectiveEvaluator/biomeSpawnBias initial wave/QBN debrief/Thought Cabinet). Sweep ~17-32h chiude P1+P2+P4 strategico.

**Pillar status post-wave**: 0/6 🟢 + **2/6 🟢 candidato** (P1+P5) + **3/6 🟡+** (P2/P4/P6) + 1/6 🟡 (P3).

**Trigger consultation rules** (post-sessione):

- ✅ Research/audit dominio cross-game → leggi PRIMA i 4 synthesis 2026-04-27 + tier matrix originale + MUSEUM.md
- ✅ Sprint planning next session → leggi §C 6 opzioni con effort + outcome
- ✅ Pattern X gioco Y specifico → tier matrix è canonical, synthesis è index
- ❌ NON re-research dominio cross-game senza prima consultare i 4 synthesis (waste duplicate)

**Decisione user pending**: quale path attivare? A (polish demo ~10-12h) / C (P2 closure ~30h) / E (surface sweep ~25-35h).

---

## 🎮 Sprint context (aggiornato: 2026-04-25 sera-late — workspace audit + drift fixes 8 PR)

**Sessione 2026-04-25 sera-late (workspace ecosystem audit)**: utente segnala "non c'è punto chiaro di ingresso tra Game-Database, game-swarm e altri repo collegati". Audit a fondo scopre ecosystem 3x più grande del precedentemente mappato + multi-PC race condition + drift sistematico BACKLOG.

**PR shipped main** (8 Game + 1 Game-Database):

| PR                                                                | Scope                                                     | SHA        | Status |
| ----------------------------------------------------------------- | --------------------------------------------------------- | ---------- | :----: |
| [#1804](https://github.com/MasterDD-L34D/Game/pull/1804)          | WORKSPACE_MAP iniziale + clone Game-Database + path edusc | `ad23d0bf` |   ✅   |
| [#1806](https://github.com/MasterDD-L34D/Game/pull/1806)          | Stack validation + Alt B runtime smoke proven             | `113e832d` |   ✅   |
| [#1809](https://github.com/MasterDD-L34D/Game/pull/1809)          | Synesthesia move a `~/Documents/UPO/`                     | `17aea1c0` |   ✅   |
| [#1810](https://github.com/MasterDD-L34D/Game/pull/1810)          | WORKSPACE_MAP comprehensive ecosystem completo            | `effef40e` |   ✅   |
| [#1812](https://github.com/MasterDD-L34D/Game/pull/1812)          | WORKSPACE_MAP sweep finale (Desktop + WRITE-ACCESS)       | `148a5a75` |   ✅   |
| [#1814](https://github.com/MasterDD-L34D/Game/pull/1814)          | BACKLOG drift fix #1 (3 SHA closures)                     | `bb19697b` |   ✅   |
| [#1818](https://github.com/MasterDD-L34D/Game/pull/1818)          | Ancestors drift fix #2 + card AI-hallucination fix        | `6b2670a3` |   ✅   |
| [#1820](https://github.com/MasterDD-L34D/Game/pull/1820)          | BACKLOG drift fix #3 (F-1/F-2/F-3 + M14-A partial)        | `4ee9e30f` |   ✅   |
| [GD#106](https://github.com/MasterDD-L34D/Game-Database/pull/106) | Game-Database WORKSPACE_MAP simmetrico                    | `ea3791e`  |   ✅   |

PR #1816 closed-redundant (multi-PC race vs PR #1813 same scope OD-011) — caught early via `gh pr list --state merged`.

**Discoveries chiave**:

- `WORKSPACE_MAP` precedente copriva solo `gioco/`, miss massiccio. Realtà: 4 GitHub core (Game + Game-Database + evo-swarm + codemasterdd-ai-station) + 3 AI satelliti locali (~/Dafne/ 81MB, ~/aa01/ Archon Atelier, ~/.openclaw/ runtime) + C:/dev/ duplicati + Desktop entrypoints (WRITE-ACCESS-POLICY canonical, Swarm Dashboard :5000).
- Game-Database stack validato end-to-end: Postgres :5433 + server :3333 + Game backend :3344 con flag `GAME_DATABASE_ENABLED=true` log-confirmed `[game-database] HTTP integration ENABLED` + `[game-database] trait glossary fetched via HTTP`.
- Museum card `ancestors-neurons-dump-csv.md` AI-hallucinated: claim "22 Self-Control" smentito da `awk count $branch column` reale = 12. Schema columns fake. Esempi codici "CO 01 Pause Reflex" inventati (CO è branch Attack, SC reali usano FR codes). Fix con evidence reale.
- BACKLOG drift sistematico: 5 ticket "open" già chiusi (M13 P3 #1697, M13 P6 #1698, SWARM-SKIV #1774, ANCESTORS-22 #1813, ANCESTORS-RECOVERY #1815, F-1/F-2/F-3 #1736). Mitigation memorizzata.
- Multi-PC parallel race: 8 PR altro PC merged interleaved (OD-008/011/012, sentience tier backfill 45 species, ancestors 297/297 wiki recovery + 267 wire). Mio PR #1816 redundant chiuso post-detection.

**Memory salvate** (cross-session):

- `feedback_workspace_audit_scope_lesson.md` — "controlla a fondo" = filesystem-wide
- `feedback_data_grounded_expert_pattern.md` — `awk`/`head -1` cross-check obbligatorio pre-card

**Stato pillars post-sessione**: P3 + P6 → 🟢 candidato verificato (drift fix conferma chiusure precedenti). P5 🟡 (TKT-M11B-06 playtest userland resta unico bloccante). Altri stable.

**Handoff**: [`docs/planning/2026-04-25-workspace-audit-drift-fixes-handoff.md`](docs/planning/2026-04-25-workspace-audit-drift-fixes-handoff.md).

**Next session entry**: M14-A resolver wire residual (~3-4h, helpers shipped PR #1736, full integration combat damage step pending) o TKT-MUSEUM-ENNEA-WIRE (~7-9h, vcSnapshot round-aware refactor required) o userland TKT-M11B-06 playtest live.

---

## 🎮 Sprint context (aggiornato: 2026-04-25 sera — massive autonomous session 16 PR + OD-008/011/012 override)

**Sessione 2026-04-25 sera (autonomous trust mode)**: 16 PR consecutivi mergiati main da check-up audit a OD override esecuzione completa. User policy "trust autonomous" con verifica intermedia 5 OD museum-driven.

**PR shipped main** (sequenza):

| PR                                                       | Scope                                                                                                                                   | Status |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | :----: |
| [#1802](https://github.com/MasterDD-L34D/Game/pull/1802) | docs M14-C calibration stale fix (cross-out tickets già chiusi PR #1744)                                                                |   ✅   |
| [#1800](https://github.com/MasterDD-L34D/Game/pull/1800) | M11 co-op WS test gaps + round_ready replay host transfer                                                                               |   ✅   |
| [#1801](https://github.com/MasterDD-L34D/Game/pull/1801) | schema AJV exports + 5 schema register runtime                                                                                          |   ✅   |
| [#1803](https://github.com/MasterDD-L34D/Game/pull/1803) | balance audit fix — dominance + drift + cautious AI + spore                                                                             |   ✅   |
| [#1796](https://github.com/MasterDD-L34D/Game/pull/1796) | repo-archaeologist agent + museum bootstrap + 4 excavation + 6 card                                                                     |   ✅   |
| [#1712](https://github.com/MasterDD-L34D/Game/pull/1712) | Wrangler bot worker name fix                                                                                                            |   ✅   |
| [#1804](https://github.com/MasterDD-L34D/Game/pull/1804) | WORKSPACE_MAP entry-point ecosystem                                                                                                     |   ✅   |
| [#1805](https://github.com/MasterDD-L34D/Game/pull/1805) | SoT §13.4 P4 Ennea wire false claim fix                                                                                                 |   ✅   |
| [#1807](https://github.com/MasterDD-L34D/Game/pull/1807) | OD-008/011/012 user override codify                                                                                                     |   ✅   |
| [#1808](https://github.com/MasterDD-L34D/Game/pull/1808) | OD-008 sentience_tier backfill ALL 45 species (T0=2, T1=23, T2=14, T3=3, T4=0, T5=3, T6=0)                                              |   ✅   |
| [#1811](https://github.com/MasterDD-L34D/Game/pull/1811) | OD-012 magnetic_rift_resonance promoted from staging (single trait pool limited)                                                        |   ✅   |
| [#1813](https://github.com/MasterDD-L34D/Game/pull/1813) | OD-011 Path A — 22 ancestors reaction trigger (FR 8 + CO 6 + DO 7 + BB 2)                                                               |   ✅   |
| [#1815](https://github.com/MasterDD-L34D/Game/pull/1815) | OD-011 Path B v07 wiki recovery 297/297 neurons (RFC v0.1 promise CHIUSA, CC BY-NC-SA Fandom via MediaWiki API)                         |   ✅   |
| [#1817](https://github.com/MasterDD-L34D/Game/pull/1817) | OD-011 Path B wire — 267 ancestors neurons batch (Senses 37 + Dexterity 33 + PrevMed 30 + Ambulation 26 + TheraMed 24 + Comm 20 + ... ) |   ✅   |

**Bug critici discoveries**:

- **Stale doc trap**: M14-C calibration doc raccomandava obsolete tune già shipped #1744. Anti-pattern guard — futuri agent leggono "stato corretto reale".
- **enneaEffects.js orphan**: 93 LOC PR #1433 mai `require`/`import`. SOURCE-OF-TRUTH §13.4 falso claim "Operativo P4 completo" → corretto a 🟡 reale.
- **Schema AJV registry partial**: solo 3/10 schema registrati runtime; `combat`/`traitMechanics`/`glossary`/`narrative`/`speciesBiomes` esportati ma non validati live.
- **OD-007 hybrid pattern enacted**: data/core/personality/ runtime + packs/ encyclopedia + sync script (raccomandato da card M-002).

**Counters end-of-session**:

- **active_effects.yaml traits**: 165 → **432** (+267 ancestors batch)
- **Ancestors entries**: 22 (Path A) → **289** total (Path A + Path B wire)
- **Species sentience_tier**: 0 → **45/45** (OD-008 full backfill)
- **AI test baseline**: 311/311 ✅ verde post-merge (zero regression)
- **Lines added active_effects.yaml**: ~3193 → ~8412 (+5219)
- **Museum cards**: 11 (10 score 4-5/5 cross-domain)

**Audit findings post-massive-session** (general-purpose + balance-auditor agent paralleli 2026-04-25 sera):

- 🔴 P0 — **68/267 ancestor traits silently no-op**: status `linked`/`fed`/`healing`/`attuned`/`sensed`/`telepatic_link`/`frenzy` non consumati da `policy.js`/`resolver.py`. Tests pass per evaluator pass-1 (triggered:true + log) ma downstream consumption morta. M-future status-system extension richiesta (~6-8h).
- 🟠 P1 — **`ancestor_self_control_determination` dominance**: T2 +2 unconditional MoS≥3 → bumped 5 (peer T2 parity)
- 🟠 P1 — **`passesBasicTriggers` ignora `requires_ally_adjacent` + `requires_target_status`**: 2 trait fire ungated (`coscienza_d_alveare_diffusa`, `biochip_memoria`) → fix wire
- 🟡 P2 — 13 rage on_kill sources chain potential (review)
- 🟡 P2 — 220 dead-loop entries in evaluator (passive/movement traits non-attack-action) → analytics noise

**Override scope FINAL**:

- ✅ **OD-008 sentience full**: 45/45 species T0-T6 backfill
- ✅✅ **OD-011 Path A + Path B + Wire**: RFC v0.1 promise CHIUSA, 297/297 neuroni recovery + 22+267 trait wired
- 🟡 **OD-012 single trait** (magnetic_rift only, pool 5-10 non achievable, 1 staged solo): pool expansion follow-up

**Pillar impact**:

- **P2 Evoluzione 🟢c → 🟢c+ candidato**: ancestors base genetica popolata 297 neuroni
- **P3 Specie×Job 🟢c+**: rami Ancestors mappabili job archetypes (Senses → Recon, Comm → Support, Settlement → Tank)

**Restano autonomous procedibili next**:

- **Status engine extension** (~6-8h): wire `linked`/`fed`/`healing`/`focused` runtime-active in `policy.js` + `resolver.py` consumers + 7 unit tests
- **Pool swarm expansion**: autonomous Dafne regen session OR user-driven content design (4-9 trait candidate)
- **Ancestor gallery doc**: consolidating 289 ancestor entries con domain breakdown

**Bloccanti user input**:

- **OD-001 Mating Path A/B/C verdict**: 50-80h sunk cost engine, frontend zero, decision blocking
- **OD-013 MBTI surface presentation** (proposta, pending verdict A/B/C/skip)

---

## 🎮 Sprint context (aggiornato: 2026-04-25 — /parallel-sprint validation + jobs_expansion wire)

**Sessione 2026-04-25 pomeriggio (autonomous)**: prima esecuzione live di `/parallel-sprint` skill (PR #1788) + wire jobs_expansion runtime loader. 4 PR mergiati su main, pipeline self-healing parzialmente validata.

**PR shipped main**:

| PR                                                       | Scope                                                                                                                                                                                          | SHA        | Status |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | :----: |
| [#1791](https://github.com/MasterDD-L34D/Game/pull/1791) | Wave 6 sensori\_\* trait mechanics (3 entries: sensori_geomagnetici/planctonici/sismici) + glossary +1                                                                                         | `dc12dea1` |   ✅   |
| [#1792](https://github.com/MasterDD-L34D/Game/pull/1792) | Wave 6 mente*\*+cervello*\* trait mechanics (3 entries: cervello_a_bassa_latenza/mente_lucida/cervello_predittivo, apply_status panic/stunned) + glossary +2                                   | `9ee6308d` |   ✅   |
| [#1793](https://github.com/MasterDD-L34D/Game/pull/1793) | Wave 6 cuore*\*+midollo*\* trait mechanics (3 entries: cuore_multicamera_bassa_pressione/midollo_antivibrazione/cuore_in_furia, apply_status rage on_kill) + glossary +1                       | `b37de1f6` |   ✅   |
| [#1795](https://github.com/MasterDD-L34D/Game/pull/1795) | Wire jobs_expansion runtime: jobsLoader merge additivo 4 jobs (stalker/symbiont/beastmaster/aberrant) + progressionLoader normalize 48 perks + 4 expansion test cases + parallel-sprint report | `b418eb01` |   ✅   |

**Pipeline /parallel-sprint validation outcome**:

- **Worker layer**: ✅ 3/3 DONE first round (~10 min)
- **Critic layer**: 🟡 3/3 subagent FAILED (1 quota, 2 stall 600s) → recovery via main-thread direct verification
- **Merge layer**: 🟡 NEEDS-MANUAL-RESOLUTION per shared-file additive PRs (3-step: `checkout --ours` → programmatic append → `rebase --continue`). Naive regex resolve mangia struttura YAML

**Lessons learned** (vedi `docs/process/sprint-2026-04-25-parallel-validation.md`):

- Critic prompt deve essere ≤30 righe, output budget esplicito
- Fallback automatico a main-thread se 2/3 critic fail
- Per shared-file additive ticket: structured patches (ticket-id-N-additions.yaml) > full-file diff
- Alternative: split target file per famiglia (es. `data/core/traits/active_effects/sensori.yaml`) — schema loader può supportare directory walk

**Trait mechanics counter**: 111 → **120** (+9, all glossary cross-referenced).
**Glossary entries**: 275 → **279** (+4 new).
**Jobs runtime**: 7 → **11** (4 expansion live).
**Perks runtime**: 84 → **132** (+48 expansion).
**AI test baseline**: 311/311 ✅ verde post-merge (zero regression).

**Steps deferred** (next session pickup):

- **STEP 3 Status effects v2 Phase A** (5 stati Tier 1: slowed/marked/burning/chilled/disoriented) — ~110 LOC + 5 trait + 5 test, **HIGH-RISK** runtime combat resolver. Decompose in 5 mini-PR sequenziali post design call.
- **STEP 4 Content wave 6 manuale** (~20 trait residui) — additive ad active_effects.yaml, ~1h. Quick win bookmark next sprint.

**Handoff doc**: [`docs/planning/2026-04-25-parallel-sprint-jobs-wire-handoff.md`](docs/planning/2026-04-25-parallel-sprint-jobs-wire-handoff.md).

---

## 🎮 Sprint context (aggiornato: 2026-04-24 — Playtest prep + smoke round 1)

**Sessione 2026-04-24 (playtest prep)**: 4 PR mergiati su main consecutivi per abilitare playtest live. Smoke round 1 rivelò bug reali → fix-round immediato.

**PR shipped main**:

| PR                                                       | Scope                                                                                                                                                                                                                                      | SHA        | Status |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | :----: |
| [#1727](https://github.com/MasterDD-L34D/Game/pull/1727) | V5 SG runtime wire abilityExecutor (7 sites) + UI rewards/packs in phaseCoordinator + characterCreation                                                                                                                                    | `b9a6dc73` |   ✅   |
| [#1728](https://github.com/MasterDD-L34D/Game/pull/1728) | **Bug critico**: `publicSessionView` sovrascriveva V5 pool `u.sg` con gauge stress legacy. Fix preserve V5 + rename legacy → `stress_gauge` + CSS cc-preview-packs                                                                         | `0df68899` |   ✅   |
| [#1729](https://github.com/MasterDD-L34D/Game/pull/1729) | Launcher UX rewrite: 5 preflight check, health probe /api/health, ngrok tunnel + auto-open browser + clipboard copy URL + QR link + ANSI banner pulito. Backend stdout → `logs/demo-<ts>.log` separato                                     | `a5d18248` |   ✅   |
| [#1730](https://github.com/MasterDD-L34D/Game/pull/1730) | Playtest-ui fix round 1: share hint self-poll setInterval 1s (salvagente race dismiss), layout ultrawide (CELL cap 96→160 + `min-height:0` main + sidebar 300→360), `public/runtime-config.js` fallback statico per ngrok single-tunnel WS | `168a8d0d` |   ✅   |

**Bug critici identificati + fix root cause**:

- **V5 SG pool collision**: spread `...u` preservava `u.sg` V5 (integer 0..3) ma linea successiva sovrascriveva con stress gauge legacy (0..100). V5 mai esposto al client.
- **ngrok single-tunnel WS rotto**: client defaultava `:3341/ws` non esposto. Fix: backend intercepta `/play/runtime-config.js` dinamicamente + file statico fallback in `public/`.
- **Share hint race dismiss**: event-driven listener fallivano su race (hint reso post-hello con roster già popolato). Fix: `updateHostRoster` trigger dismiss + self-poll setInterval salvagente.
- **Layout ultrawide 3436×1265**: `fitCanvas` CELL cap 96 era TV-safe ma canvas minuscolo su desktop. Fix cap 160.

**Playtest round 2 pending** (userland): retest post PR #1730 con browser Ctrl+Shift+R (cache bust). Residuo: narrative log prose feature M18+ (gap non-bug).

---

## 🎮 Sprint context (aggiornato: 2026-04-26 — Vision Gap V1-V7 + M16-M20 co-op MVP)

**Sessione 2026-04-26 sera (Vision Gap autonomous)**: Audit post-M20 rileva 7 verità promesse in `docs/core/` zero runtime. PR [#1726](https://github.com/MasterDD-L34D/Game/pull/1726) branch `feat/p5-vision-gaps` chiude 6/7 in 3 commit.

**Gap chiusi**:

- **V1 Onboarding 60s Phase B**: `/api/campaign/start` accetta `initial_trait_choice`, `onboardingPanel.js` Disco Elysium 3-stage overlay
- **V2 Tri-Sorgente reward API Node-native**: `rewardOffer.js` + pool R/A/P + softmax T=0.7 + `/api/rewards/{offer,skip}` + `/fragments`, skipFragmentStore + 15-card seed pool
- **V4 PI-Pacchetti tematici 16×3 machine-readable**: `form_pack_bias.yaml` + `formPackRecommender.js` (d20 universal/bias_forma/bias_job/scelta)
- **V5 SG earn formula Opzione C mixed**: ADR-2026-04-26 chiude Q52 P2. `sgTracker.js` 5 dmg taken OR 8 dmg dealt → +1 SG, cap 2/turn, pool max 3. **Wired** in session.js damage step
- **V7 Biome-aware spawn bias**: `biomeSpawnBias.js` affix+archetype weight (primary 3x, support 2x, affix 1.5x per match, cap 3x). **Wired** in reinforcementSpawner
- **Telemetry endpoint**: `POST /api/session/telemetry` batch JSONL append (cap 200, anonymous events OK, logs gitignored)

**Deferred**: V3 Mating/Nido (~20h post-MVP), V6 UI TV dashboard polish (~6h post-playtest).

**Tests**: +65 nuovi (5+5+12+17+12+14) · AI regression 307/307 · **411/411 verde aggregate**.

**Sessione 2026-04-26 mattina (M16-M20 co-op)**: PR #1721/#1722/#1723/#1724/#1725. State machine `lobby → character_creation → world_setup → combat → debrief → (loop|ended)`. +41 test.

**Score pilastri aggiornato**:

| #   | Pilastro   |                 Stato                 |
| --- | ---------- | :-----------------------------------: |
| 1   | Tattica    |                  🟢                   |
| 2   | Evoluzione |       🟢c+ (tri-sorgente live)        |
| 3   | Specie×Job |                  🟢c                  |
| 4   | MBTI       | 🟡++ (PI pacchetti + Thought Cabinet) |
| 5   | Co-op      |      🟢c (residuo playtest live)      |
| 6   | Fairness   |     🟢c+ (SG wired + biome bias)      |

Handoff: [`docs/planning/2026-04-26-vision-gap-sprint-handoff.md`](docs/planning/2026-04-26-vision-gap-sprint-handoff.md) + [`docs/process/sprint-2026-04-26-M16-M20-close.md`](docs/process/sprint-2026-04-26-M16-M20-close.md).

**Next session residuo** (autonomous 4h + userland 2h):

- UI polish: wire onboardingPanel in main.js, reward offer in debriefPanel, pack recommender in char creation
- Runtime: sgTracker.accumulate in abilityExecutor.js (5 sites), lifecycle reset hooks
- **TKT-M11B-06 playtest live 2-4 amici** (userland, unico bloccante umano)

---

## 🎮 Sprint context (aggiornato: 2026-04-23)

> Sezione aggiunta post-sprint 019. Aggiorna a ogni sessione significativa.

**Visione**: "Tattica profonda a turni, cooperativa contro il Sistema, condivisa su TV: come giochi modella ciò che diventi."

**Sprint completati**: 001–020 + M11/M12/M13 · **Sessione 16-17/04**: 22 PR (#1383→#1405) · **Sessione 16/04 (repo analysis)**: 10 PR (#1422→#1431) · **Sessione 17/04 (game loop arc)**: 21 PR (#1447→#1471) · **Sessione 17/04 M2 (ability + canonical)**: 16 PR (#1498→#1527) · **Sessione 17-18/04 (co-op scaling 4→8)**: 6 PR (#1529, #1530, #1531, #1534, #1537, #1542)

**Milestone completate sessione 16-17/04**:

- Final Design Freeze v0.9 pubblicato (PR #1378, sessione precedente)
- Round orchestrator Python batch 2: predicates DSL, cooldown, counter/overwatch, heal/healed (+42 test, 217/217 verdi)
- **ADR-2026-04-16 Node session engine migration: 17/17 step completati** (#1387-#1405). Round model default ON, legacy removed.
- Workflow cleanup: 28→16 (-43%), 0 broken, Node 22 + FORCE_NODE24
- Issue cleanup: 33→0 (-100%)
- Token optimization: session.js -57% (1967→851 LOC, split in 4 moduli), docs/planning -49%

**Milestone sessione repo analysis (#1422-#1431)**:

- 18 repo esterni analizzati con scorecard (7 deep dive: wesnoth, boardgame.io, xstate, OpenRA, bevy, ink, langium)
- 24 pattern architetturali estratti e implementati (+3816 LOC)
- Nuove dipendenze: `xstate@5` (state machines), `inkjs` (narrative engine)
- **Nuovi moduli**: statusEffectsMachine.js (xstate FSM), roundStatechart.js, sistemaActor.js, sessionValidation.js, narrativeEngine.js + narrativeRoutes.js, pluginLoader.js, gen_trait_docs.py, gen_trait_types.py
- **Nuovi YAML balance**: ai_intent_scores, ai_profiles, terrain_defense, movement_profiles, species_resistances, pack_manifest
- AI Sistema ora data-driven (intent scores + profiles in YAML)
- Combat prediction: `predict_combat()` simula N=1000 attacchi
- Terrain defense modifier nel calcolo CD
- Narrative service con inkjs (briefing/debrief con scelte)
- Plugin registration pattern per servizi backend
- **P4 completato**: MBTI axes E_I+S_N implementati, 16 Forms YAML, PF_session endpoint, Ennea theme effects, deriveMbtiType()

**Milestone sessione SoT deep dive (#1441)**:

- **SoT v1→v4**: 13→19 sezioni, deep dive 12+ repo esterni (AncientBeast, wesnoth, yuka, GOApy, UtilityAI, easystarjs, honeycomb-grid, Colyseus)
- **3 ADR nuovi**: Grid hex axial, Networking Colyseus, AI Utility Architecture
- **hexGrid.js** (195 LOC): axial coordinates, Dijkstra flood-fill, A\* pathfinding, BFS range, LOS ray-cast (23 test)
