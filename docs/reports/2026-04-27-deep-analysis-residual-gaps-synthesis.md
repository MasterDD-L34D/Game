---
title: "Deep-Analysis Residual Gaps Synthesis (post sprint wave 2026-04-27)"
doc_status: proposed
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-04-27'
source_of_truth: false
language: it
review_cycle_days: 14
tags: [synthesis, audit, residual-gaps, action-plan]
date: 2026-04-27
related:
  - docs/reports/2026-04-26-deep-analysis-SYNTHESIS.md
  - docs/reports/2026-04-26-deep-analysis-balance.md
  - docs/reports/2026-04-26-deep-analysis-coop.md
  - docs/reports/2026-04-26-deep-analysis-creature.md
  - docs/reports/2026-04-26-deep-analysis-economy.md
  - docs/reports/2026-04-26-deep-analysis-narrative.md
  - docs/reports/2026-04-26-deep-analysis-outliers.md
  - docs/reports/2026-04-26-deep-analysis-pcg.md
  - docs/reports/2026-04-26-deep-analysis-telemetry.md
  - docs/reports/2026-04-26-deep-analysis-ui.md
---

# Deep-Analysis Residual Gaps — Post Sprint Wave 2026-04-26/27

> Sintesi residuale 9 deep-analysis report. Cross-check vs PR #1869–#1901 mergiati. Focus: cosa NON è stato shipped + quick wins ≤4h.

## 0. Recap shipped wave

PR mergiati 2026-04-26/27 (synthesis-driven): #1869 trait-nerf P0, #1870 economy-orphan SF/Seed, #1871 scenario-objective-schema, #1872 turn-limit + status pin, #1873 encounter-yaml-loader, #1884 ui-wcag + threat-tile, #1886 cautious-AI, #1887 biome-id-orphan, #1888 coop-reconnect, #1889 ui-palette-drift, #1890 telemetry-bootstrap-CI, #1894 pathfinder-xp-budget, #1896 fft-wait, #1897 disco-MBTI-debrief, #1898 AI-progress-meter, #1899 xpbudget-wire, #1900 ticket-auto-gen, #1901 tactics-ogre-AP-pip, #1893 voidling-visual-swap.

10/10 P0 dalla synthesis ✅ shipped. Residuo: P1+P2 + cross-domain.

---

## 1. Balance

- **[P1] [pending] G-04 computeStatusModifiers in round bridge** — `linked`/`sensed`/`frenzy`/`attuned` ancora no-op nel co-op round path. PR #1872 ha pin test, NO wire. → import + call in `sessionRoundBridge.js`, ~2h.
- **[P1] [pending] G-01 PE→encounter_class mapping** — `session.difficulty` mai derivata da `encounter_class`. PE hardcore = standard 5 invece di boss 12. → mapper in `session.js /start` o aggiungere chiavi `hardcore`/`tutorial_advanced` a `PE_BASE_BY_DIFFICULTY`, ~30min.
- **[P2] [pending] G-06 applyTurnRegen duplicato inline** — divergenza logica latente fra `session.js` inline clone e `statusModifiers.js`. → refactor unico import, ~30min.
- **[P2] [pending] O-06 SG underflow tutorial** — Surge Burst inaccessibile in encounter 1-2. → `+1 SG starter` per `encounter_class === 'tutorial'`, ~30min.
- **[P2] [pending] G-02 sgTracker resetEncounter try/catch silente** — first-encounter reset potenzialmente no-op. → log + verify path, ~30min.

## 2. Coop

- **[P1] [shipped #1888] Reconnect snapshot mid-coop** — risolto.
- **[P2] [pending] Phase-skip negative tests** — nessun test asserisce `endCombat()` in lobby phase throws. → parametric test suite `tests/api/coopPhaseSkip.test.js`, ~2h.
- **[P2] [pending] Concurrent endCombat double-POST untested** — server idempotent throw safe ma untested. → `Promise.all([POST, POST])` test, ~30min.
- **[P2] [pending] Room.phase vs CoopOrchestrator.phase desync** — due state machines parallele, drift latente. → unit test convergence, ~1h.
- **[P3] [pending] ADR-2026-04-20 text "retry 10x" vs code 20x** — doc drift. → align doc, ~5min.

## 3. Creature

- **[P0] [pending] GAP-1 — 44/45 species senza lifecycle YAML** — solo `dune_stalker_lifecycle.yaml` esiste. Render wire shipped (#1863) ma payload vuoto per le altre. → `tools/py/seed_lifecycle_stub.py` script + 14 stub canonical, ~3h.
- **[P0] [pending] GAP-2 (parziale) — mutations visual_swap_it backfill** — PR #1893 ha shipped Voidling Pattern 6 (Moderate) + lint #1899. Restano ~28/30 mutations senza `aspect_token`/`phase_unlock`. → backfill autoring, ~3h.
- **[P1] [pending] GAP-4 — 16 MBTI forms senza `physical_correlate`/`canvas_posture_token`** — postura testuale già in dune_stalker correlates. → backfill YAML + render micro-variant, ~5h.
- **[P1] [pending] GAP-5 — 18 thoughts senza `aspect_token`** — Thought Cabinet portrait overlay missing. → YAML + drawUnit overlay 3 max, ~5h.
- **[P2] [pending] GAP-6 — 48 perks `jobs_expansion` senza `physical_correlate_it`** — solo testo tooltip. → autoring + tooltip wire, ~4h.

## 4. Economy

- **[P0] [shipped #1870] SF + Seed orphan emit** — risolto.
- **[P0] [pending] Q19 PE→PI checkpoint conversion** — decision tree user pendente Opzione A (StS gold analogy mission-victory). → wire in `rewardEconomy.js` su debrief, ~2h.
- **[P1] [pending] SG underflow tutorial** — same as Balance O-06 (duplicate). ~30min.
- **[P1] [pending] Personality component silently 0 in Tri-Sorgente** — `mbti_type=null` → `personalityComponent=0`, no fallback NEUTRA. → default fallback in session state, ~1h.
- **[P2] [pending] PE accumulation senza cap** — ratio 80:24 surplus. Drain via PI shop. Monitor solo, no fix richiesto pre-playtest.

## 5. Narrative

- **[P0] [partial #1897] Disco MBTI tag debrief insights** — shipped wire. Resta:
- **[P1] [pending] N-01 QBN drawEvent in session debrief** — endpoint live ma zero auto-call. → wire in `/api/session/:id/end`, ~3h.
- **[P1] [pending] N-02 `reveal_text_it` × 18 thoughts** — Disco moment mancante. → schema + autoring, ~3h.
- **[P1] [pending] N-04 T_F axis 6 thoughts** — axis parity gap, asse più legibile in tactical play senza mirror. → YAML autoring, ~2h.
- **[P1] [pending] N-05 thoughts/tick in campaign-advance** — pacing rotto. → wire 1 chiamata, ~1h.
- **[P2] [pending] N-07 QBN Ennea pack — 6 tipi missing (1/2/4/6/7/9)** — copre solo 3/9. → autoring 6 events, ~1.5h.
- **[P2] [pending] N-08 tutorial briefings enc_02..06** — solo enc_01 ha varianti, 5 encounters fallback hardcoded. → autoring 2 var/enc, ~2h.

## 6. Outliers

- **[P0] [shipped #1869] Trait nerf ipertrofia + sangue_piroforico** — risolto.
- **[P0] [shipped #1872] 68 silent ancestor status pin** — pinning test shipped, downstream consumer non wired.
- **[P0] [shipped #1886] Cautious AI retreat fix** — risolto (0.3→0.4).
- **[P1] [pending] gravita channel dead** — zero traits, zero archetype. → decision: kill canale OR aggiungere 1 trait + vulnerability, ~2h.
- **[P1] [pending] fuoco/elettrico no vulnerable archetype** — offense neutral. → +1 archetype each con 120 vuln, ~1h.
- **[P1] [pending] ai_intent_scores.yaml no per-intent weights** — tuning richiede code edit. → estrarre `attack_weight`/`heal_weight`/`kite_weight`, ~2h.
- **[P1] [pending] 26/33 trait_mechanics traits no active_effects entry** — paper-balanced runtime-inert. → audit + decisione passive vs missing wire, ~3h.
- **[P2] [pending] T3 traits 6/433 (1.4%)** — endgame build diversity bassa. → autoring 4-6 T3, ~3h.
- **[P2] [pending] balanced AI profile empty overrides** — no behavioral identity. → 1 override distinto, ~30min.
- **[P2] [pending] Light movement profile no terrain penalty** — strictly superior. → 1 terrain `light_cost_multiplier > 1.0`, ~30min.
- **[P2] [pending] Elevation +45% net no counter** — `roccia` cover terrain. → terrain definition, ~1h.

## 7. PCG

- **[P0] [shipped #1873] Encounter YAML loader G1** — risolto.
- **[P0] [shipped #1871] JS objective schema-compliant G2** — risolto.
- **[P0] [shipped #1887] biome_id orphan G6** — risolto (caverna canonical).
- **[P1] [pending] G3 biomeSpawnBias initial wave** — solo 1 scenario opt-in. → wire universale post-loader, ~2h.
- **[P1] [pending] G4 reinforcement_pool `archetype` field** — biomeSpawnBias archetype branch dead. → schema + YAML pool autoring, ~3h.
- **[P1] [pending] G5 biomeConfig require path verify** — runtime throw rischio non testato. → assert + fallback, ~1h.
- **[P2] [pending] G7 CI gate validate `docs/planning/encounters/*.yaml`** — drift risk. → npm script `schema:lint:encounters`, ~1h.
- **[P2] [pending] schema violation `difficulty_rating: 6/7`** — AJV reject se validato. → align hardcoreScenario.js o raise schema max, ~30min.
- **[P2] [pending] ITB random elements per-run** — replayability low (deterministic). → `enemy_pool_candidates[]`/`condition_candidates[]` pick-N init, ~3-5h.

## 8. Telemetry

- **[P1] [shipped #1890] Bootstrap CI 95% in batch_calibrate** — risolto.
- **[P0] [pending] `tilt` non implementato → Stoico(9) unreachable** — Ennea archetype 9/9 incomplete. → window EMA implementation, ~3h.
- **[P1] [pending] `telemetry.schema.json` AJV gate** — eventi schema-libero, drift. → schema + AJV register, ~2h.
- **[P1] [pending] Heatmap server-side kill events not in JSONL** — position_from/to in-memory, no auto-log. → wire in `appendTelemetryEvent` per kill+damage, ~2h.
- **[P1] [pending] `reward_accept`/`skip` non auto-loggato** — Sankey path data missing. → inline log in `rewardOffer.js` ~10 LOC, ~30min.
- **[P2] [pending] MBTI iter2 mai default** — `VC_AXES_ITER=2` mai testato production. → ADR + env wire, ~1h.
- **[P2] [pending] Observable Plot small multiples dashboard** — `docs/analytics/` dir mancante, post-playtest. → HTML standalone CDN, ~3-4h.
- **[P2] [pending] D-retention anonymous player_id** — cohort impossible. → decisione design ID stabile, ~1h decision.

## 9. UI

- **[P0] [shipped #1884] Threat tile overlay + WCAG contrast + font** — risolto (tile, `.dim` 666→888, font cap).
- **[P0] [shipped #1889] Palette token drift `phoneComposerV2`** — risolto.
- **[P0] [pending] HP critico pulse animation** — Dead Space pattern, accessibility-deaf P0. → `render.js drawUnit` `strokeRect` alpha pulsante <0.3 HP, ~20 LOC, ~1h.
- **[P1] [pending] Faction shape marker (colorblind)** — color-only. → triangle/diamond polygon top-left, ~35 LOC, ~2h.
- **[P1] [pending] Damage number nel SIS intent badge (StS)** — `✊ ${dmg}` preview. → 20 LOC render, ~1h.
- **[P1] [pending] Lobby role-chip color-only** — host/join shape distinction missing. → icon glyph, ~10 LOC, ~30min.
- **[P2] [pending] Safe zone 2.5vw → 5vw** — 48px clipping su 1080p TV. → CSS 2 LOC, ~5min.
- **[P2] [pending] Threat zone toggle (FE Engage long-press)** — non esiste. → nuovo modulo `threatZoneToggle.js`, ~3h.
- **[P2] [pending] `main.js` wire onboarding check** — verify-only, ~15min.
- **[P3] [pending] `docs/frontend/styleguide.md` `superseded_by`** — frontmatter 1 LOC.

---

## 10. Cross-domain patterns

### Pattern A — Engine shipped, surface dead (residuo)

Ancora aperti: **QBN drawEvent in debrief** (narrative N-01), **biomeSpawnBias initial wave** (PCG G3), **`isTurnLimitExceeded` single-player path** (Balance G-03 risolto solo round bridge), **MBTI iter2 opt-in mai testato** (telemetry), **44 species lifecycle render-ready ma payload vuoto** (creature GAP-1).

### Pattern B — Doc dedup + supersede pending

Persistono: `24-TELEMETRIA_VC.md` vs `Telemetria-VC.md`, `27-MATING_NIDO.md` vs `Mating-Reclutamento-Nido.md`, `EVO_FINAL_DESIGN_*` vs `90-FINAL-DESIGN-FREEZE.md` autorità sovrapposta, `frontend/styleguide.md` no `superseded_by`. Effort cumulativo ~1h.

### Pattern C — Schema-runtime drift residuo

`difficulty_rating 6/7` schema violation, `reinforcement_pool` no `archetype` field, `telemetry.schema.json` mancante. Mitigazione: 1 npm script `schema:lint:encounters` + AJV CI gate (~3h).

### Pattern D — Author-determinism vs emergence

ITB random per-run NON adottato. Pick-N pool candidates al session init (~3-5h). Replayability blocker.

### Pattern E — WCAG accessibility residuo

PR #1884 ha chiuso threat tile + contrast `.dim` + font cap. Resta: HP pulse animation (P0), faction shape (P1), threat zone toggle (P2), lobby chip shape (P1). 5 fix accessibilità su 9 ancora aperti.

### Pattern F — AI/intent tell visibility

Intent badge wired (#1884 + #1898 progress meter). Resta: damage number preview StS, threat zone toggle Fire Emblem, AI weights data-driven YAML (Outliers P1). Player-tell coverage migliorata ma non completa.

---

## 11. Residual P0 backlog (NON shipped, blocca gate)

| # | Domain | Gap | File | Effort |
|---|---|---|---|---:|
| 1 | Creature | 44 species senza lifecycle YAML — render payload vuoto | `data/core/species/`, new `seed_lifecycle_stub.py` | ~3h |
| 2 | Economy | Q19 PE→PI checkpoint Opzione A wire | `rewardEconomy.js` | ~2h |
| 3 | UI | HP critico pulse animation (accessibility-deaf P0) | `render.js drawUnit` | ~1h |
| 4 | Telemetry | `tilt` impl → sblocca Stoico(9) reachable | `vcScoring.js` window EMA | ~3h |
| 5 | Creature | mutations `aspect_token` + `phase_unlock` ~28/30 missing | `mutation_catalog.yaml` | ~3h |

**Sub-total residual P0**: ~12h, 5 fix.

---

## 12. Quick wins ≤4h (S-tier ROI)

| # | Domain | Action | File | Effort |
|---|---|---|---|---:|
| QW1 | Coop | ADR-2026-04-20 text "10x"→"20x" align | ADR | 5min |
| QW2 | UI | Safe zone 2.5vw→5vw | `style.css` | 5min |
| QW3 | UI | Lobby role-chip icon glyph (host/join) | `lobby.html` | 30min |
| QW4 | Telemetry | `reward_accept`/`skip` auto-log | `rewardOffer.js` | 30min |
| QW5 | Outliers | balanced AI 1 override distinto | `ai_profiles.yaml` | 30min |
| QW6 | Outliers | Light terrain penalty (luminescente=1.5) | `terrain_defense.yaml` | 30min |
| QW7 | Balance | PE keys hardcore/tutorial_advanced | `rewardEconomy.js` | 10min |
| QW8 | Balance | SG +1 starter tutorial | `session.js /start` | 30min |
| QW9 | Coop | Concurrent endCombat double-POST test | `tests/api/coop*` | 30min |
| QW10 | UI | HP critico pulse animation | `render.js` | 1h |
| QW11 | UI | Damage number SIS badge | `render.js` | 1h |
| QW12 | UI | Faction shape marker triangle/diamond | `render.js` | 2h |
| QW13 | Narrative | N-05 thoughts/tick in campaign-advance | route handler | 1h |
| QW14 | Telemetry | MBTI iter2 default flip | env + ADR | 1h |
| QW15 | Outliers | Elevation roccia counter terrain | `terrain_defense.yaml` | 1h |
| QW16 | Economy | Personality fallback NEUTRA | session state | 1h |
| QW17 | Narrative | N-07 QBN Ennea 6 events backfill | `qbn_events.yaml` | 1.5h |
| QW18 | PCG | G7 CI gate `schema:lint:encounters` | npm script | 1h |
| QW19 | Balance | G-04 computeStatusModifiers round bridge wire | `sessionRoundBridge.js` | 2h |
| QW20 | Narrative | N-08 tutorial briefings enc_02..06 var | `tutorial_briefings.yaml` | 2h |

**Cumulato S-tier ≤4h**: 20 quick wins, ~17h totali. Ship batch 1 (QW1–QW8 = 4h cumulati) come "polish hour" pre-playtest.

---

## 13. Pillar status update post-wave

| Pilastro | Pre-wave | Post-wave | Delta |
|---|---|---|---|
| P1 Tattica | 🟡 | 🟢 candidato | threat tile shipped |
| P2 Evoluzione | 🟡++ | 🟡++ | mating Sprint A-D shipped, V3 lineage ok, lifecycle 44/45 missing |
| P3 Specie×Job | 🟡 | 🟡 | lifecycle YAML residuo |
| P4 MBTI/Ennea | 🟡 | 🟡+ | Disco debrief shipped, reveal_text+T_F+tilt pending |
| P5 Co-op | 🟢 candidato | 🟢 candidato | reconnect shipped, playtest userland gating |
| P6 Fairness | 🟡 | 🟡+ | trait nerf + cautious AI shipped, gravita+intent weights pending |

Score residuo: 0/6 🟢 + **2/6 🟢 candidato** (P1+P5) + **4/6 🟡+** (P2/P3/P4/P6).

---

## 14. Raccomandazione next sprint

**Opzione A — Polish hour S-tier batch** (~4h, QW1–QW8): 8 quick wins cumulabili in 1 PR atomic. Ship pre-playtest.

**Opzione B — Pattern A wire residuo** (~10-12h): QBN debrief + biomeSpawnBias initial wave + 44 species lifecycle stub + tilt impl. Recover engine ROI.

**Opzione C — Vertical slice P4 MBTI** (~10h): N-02 reveal_text + N-04 T_F + N-05 tick + tilt + thought aspect_token. Pillar 🟡+ → 🟢 candidato.

**Default raccomandato**: A → B (parallelo Opzione A polish + Opzione B engine wire) per max ROI pre-playtest TKT-M11B-06.
