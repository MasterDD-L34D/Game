# BACKLOG — Evo-Tactics

> **Scope**: backlog prioritizzato ticket aperti + residui sprint.
> **Sorgente canonical**: CLAUDE.md sezione "Sprint context" + sprint doc in `docs/process/`.
> **Aggiornamento**: on-demand quando chiudi/apri un ticket. Sprint close aggiorna anche CLAUDE.md summary.
> **Ref template**: `04_BOOTSTRAP_KIT/BACKLOG.md` archivio.

---

## 🔴 Priorità alta (bloccanti o sbloccanti)

### Userland (richiede azione umana)

- [ ] **TKT-M11B-06** — Playtest live 2-4 amici post PR #1730. Unico bloccante P5 🟢 definitivo. Seguire `docs/playtest/2026-04-21-m11-coop-ngrok-playbook.md`. ~2-4h sessione.
- [ ] **Playtest round 2** — retest post PR #1730 con browser Ctrl+Shift+R (cache bust). Residuo: narrative log prose feature M18+ (gap non-bug).

### Autonomous (Claude Code può fare)

- [x] ~~**Sprint 11 Biome chip HUD (§C.2 Surface-DEAD #6 — engine LIVE surface DEAD killer)**~~ → **✅ CHIUSO 2026-04-27** branch `claude/sprint-11-biome-initial-wave`. Backend `publicSessionView` extended con `biome_id: session.biome_id || session.encounter?.biome_id || null` (fallback a encounter YAML loader) + module nuovo `apps/play/src/biomeChip.js` (pure `labelForBiome` 11 canonical IT labels + `iconForBiome` emoji + `formatBiomeChip` HTML pill + side-effect `renderBiomeChip` idempotent show/hide) + HUD slot `<div id="biome-chip">` in header next to objective-bar + main.js `refreshBiomeChip()` wire on bootstrap + post-state-fetch + CSS pill style (rgba green-tinted bg + border + caps label). 17/17 test nuovi + AI 363/363 zero regression. Smoke E2E preview validato live: bootstrap enc_tutorial_01 → HUD chip `🌾 Savana` con tooltip "Biome: savana — vedi Codex per dettagli" ✓. **§C.2 Surface-DEAD sweep: 6/8 chiusi** (residui solo #3 Spore mutation dots 15h authoring + #4 Mating lifecycle wire 5h).
- [x] ~~**Sprint 10 QBN narrative debrief beats (§C.2 Surface-DEAD #7 — engine LIVE surface DEAD killer)**~~ → **✅ CHIUSO 2026-04-27** branch `claude/sprint-10-qbn-debrief`. Module nuovo `apps/play/src/qbnDebriefRender.js` (pure `formatNarrativeEventCard` con title + body + choices + meta + XSS escape, side-effect `renderNarrativeEvent` idempotent + section show/hide) + setter `setNarrativeEvent(payload)` aggiunto a `debriefPanel.js` API + `<div id="db-qbn-section">` HTML template + render path call + `phaseCoordinator.js` pipe da `bridge.lastDebrief.narrative_event` quando phase transition a 'debrief' + CSS `.db-qbn-card` journal style (linear-gradient violet + Georgia serif body italic). Backend `qbnEngine.drawEvent` LIVE da PR #1914 + `rewardEconomy.buildDebriefSummary` già emetteva `narrative_event` (zero backend change). 15/15 test nuovi + AI 363/363 zero regression. Smoke E2E preview validato live (module + render path produces correct DOM). **§C.2 Surface-DEAD sweep: 5/8 chiusi** (#1 + #2 + #5 + #7 + #8). **Pillar P4 🟢 def → 🟢++** (cronaca diegetica visibile post-encounter).
- [x] ~~**Sprint 9 Objective HUD top-bar (§C.2 Surface-DEAD #5 — engine LIVE surface DEAD killer)**~~ → **✅ CHIUSO 2026-04-27** branch `claude/sprint-9-objective-hud`. Backend route nuovo `GET /api/session/:id/objective` (lazy evaluator wire) + module `apps/play/src/objectivePanel.js` (pure `labelForObjectiveType` + `iconForObjectiveType` + `statusForEvaluation` + `formatProgress` aligned con real backend payload keys 6 obj types: elimination/capture_point/escort/sabotage/survival/escape, side-effect `renderObjectiveBar`) + `api.objective` client + main.js `refreshObjectiveBar()` wire on bootstrap + post-state-fetch + index.html HUD slot `#objective-bar` in header next to pressure-meter + CSS `.objective-bar` band colors. Tutorial play UI ora pipe `encounter_id` a `/api/session/start` per attivare engine (sblocca encounter YAML loader → docs/planning/encounters/<id>.yaml). 29/29 test nuovi + AI 363/363 zero regression. Smoke E2E preview validato live: bootstrap enc_tutorial_01 → HUD render `⚔ Elimina i nemici · Sistema vivi: 2 · PG: 2` band active accent ✓. **§C.2 Surface-DEAD sweep: 4/8 chiusi** (#1 + #2 + #5 + #8). **Pillar P5 🟡 → 🟡++** (player vede esplicitamente cosa deve fare).
- [x] ~~**Sprint 8 predict_combat hover preview (§C.2 Surface-DEAD #1 — engine LIVE surface DEAD killer)**~~ → **✅ CHIUSO 2026-04-27** branch `claude/sprint-8-hp-floating-numbers` (originally planned for HP floating, pivoted dopo discovery che HP numerici già live M4 P0.2 — render.js line 768). Module `apps/play/src/predictPreviewOverlay.js` (pure `formatPredictionRow` + `colorBandForHit` + async cached `getPrediction`) + `api.predict` client + main.js mousemove wire + CSS band colors. Backend `/api/session/predict` LIVE pre-existing (analytic d20 enumeration in sessionHelpers.js predictCombat). Quando player hover su nemico vivo con player selezionato vivo → tooltip surface `⚔ HIT% · ~DMG · CRIT%` band high/medium/low + elevation hint. Cache invalidated su new session. Test 22/22 + AI baseline 363/363 + smoke E2E preview validato live (`⚔ 60% hit · ~1.4 dmg · 5% crit` band medium su e_nomad_1 hover con p_scout selezionato). **Pillar P1 🟢 → 🟢++** (decision aid live). **§C.2 Surface-DEAD sweep: 3/8 chiusi** (#1 + #2 + #8).
- [x] ~~**Sprint 7 Disco skill check passive→active popup (B.1.8 #3 — bundle saturator)**~~ → **✅ CHIUSO 2026-04-27** branch `claude/sprint-7-skill-check-popup`. Module `apps/play/src/skillCheckPopup.js` (pure `buildSkillCheckPayload` + side-effect `renderSkillCheckPopups`) + wire in `main.js processNewEvents`. Filtra `triggered=true` su `world.events[].trait_effects`, dedupes, format Disco-style `[NOME TRAIT]` floating sopra l'actor con stagger 220ms. Zero backend change. Test 22/22 + AI 363/363 zero regression. Smoke E2E preview validato (module load + payload transform + integration wire). **Bundle Disco Tier S 4/4 COMPLETO** (#1 PR #1966 + #2 PR #1945 + #3 this + #4 PR #1934).
- [x] ~~**Sprint 6 Thought Cabinet UI panel + cooldown round-based (Disco Tier S #9)**~~ → **✅ MERGED 2026-04-27** [PR #1966](https://github.com/MasterDD-L34D/Game/pull/1966) squash come `584c54c2`. Adoption follow-up scheduled 2026-05-11 09:00 Europe/Rome (`trig_01JJsMTpGWaEsBfhE51YFNMx`). Branch originale `claude/sprint-6-thought-cabinet-ui`. Engine `thoughtCabinet.js` bump `DEFAULT_SLOTS_MAX` 3→8 + `RESEARCH_ROUND_MULTIPLIER=3` + `mode='rounds'|'encounters'` opt + `tickAllResearch(bucket, delta)` bulk helper + snapshot `mode/scaled_cost/progress_pct/started_at_round`. Bridge `sessionRoundBridge.applyEndOfRoundSideEffects` → tick 1 round per fine-turno + auto-internalize + `updateThoughtPassives` apply su unit + emit `thought_internalized` event. Routes `/thoughts/research` accetta body `mode` (default `'rounds'`); response plumb `scaled_cost+mode`. Frontend `apps/play/src/thoughtsPanel.js` Assign/Forget buttons inline + progress bar `cost_remaining/cost_total round X%` + 8-slot grid + can-research-more gate + error banner + status classes (researching/internalized). API client `thoughtsList/thoughtsResearch/thoughtsForget` aliases. Test budget: thoughtCabinet 59/59 (+29 round-mode), sessionThoughts 17/17 (+5 E2E round-tick), AI baseline 353/353 zero regression. Smoke E2E preview validato: 8 slot default ✓, mode=rounds default cost_total=3 (T1) ✓, end-of-round auto-tick 3 round → internalize ✓, Assign ⇄ Forget round-trip UI ✓. Format prettier verde, governance 0 errors. **P4 🟢c → 🟢 def**. Stato-arte §B.1.8 aggiornato (3 pattern Disco residui).
- [x] ~~**M13 P3 Phase B**~~ — balance pass N=10 post XP grant hook → **✅ CHIUSO in PR #1697 (`a462d4d5`)** 2026-04-25. Campaign advance XP grant hook + combat resolver 5 passive tags wired (flank_bonus, first_strike_bonus, execution_bonus, isolated_target_bonus, long_range_bonus) + frontend progressionPanel overlay. Balance pass 448 builds validated. Pilastro 3 → 🟢 candidato.
- [x] ~~**M13 P6 Phase B calibration**~~ — N=10 hardcore 07 → **✅ SHIPPED in PR #1698 (`135b5b1f`)** 2026-04-25 (esecuzione harness userland resta). Calibration harness `tools/py/batch_calibrate_hardcore07.py` + HUD timer countdown + campaign auto-timeout outcome. Pilastro 6 → 🟢 candidato. **Userland residual**: eseguire harness N=10, valutare win rate 30-50%.

---

## 🟡 Priorità media

### Bug / tech debt identificati

> **Audit 2026-04-24**: CLAUDE.md "Backlog ticket aperti" era stale. Verificato contro git history.

- [x] ~~**TKT-06**~~ — `predict_combat` ignora `unit.mod` stat → **✅ CHIUSO in PR #1588 (`2d6394dd`)** 2026-04-18. `resolve_attack_v2` + `predict_combat` Python + JS `predictCombat` ora includono actor.mod + aggregate_mod parity.
- [ ] **TKT-07** — Tutorial sweep #2 N=10/scenario post telemetry fix. Unblock (TKT-06 risolto). Sweep #2 run da confermare in `docs/playtest/*sweep*`.
- [x] ~~**TKT-08**~~ — Backend stability under batch (morì run #14 batch N=30) → **✅ CHIUSO 2026-04-26 (branch `fix/tkt-08-batch-harness-stability`)**. Diagnosi: (1) `planningTimers` Map in `sessionRoundBridge.js` non cancellato a `/end` → orphan setTimeout closures accumulano in Node timer queue su batch lunghi (callback no-op grazie al guard, ma queue cresce N×runs). Fix: `cancelPlanningTimer` esposto da `createRoundBridge` + invocato in `/end` prima di `sessions.delete` (defensive try/catch). (2) `batch_calibrate_hardcore07.py` era bare urlopen senza retry/health/cooldown/jsonl → transient backend stalls causavano crash mid-batch. Fix: porting hardening pattern da `batch_calibrate_hardcore06.py` (retry exp backoff 5×0.5s base, `/api/health` probe fail-fast pre-batch + ogni 10 run, cooldown 0.5s, JSONL incremental write resume-friendly, `--skip-health` opt-out). Test: AI 311/311 + session API 77/77 verdi, prettier verde, syntax python OK, CLI args wire OK. ADDITIVE only (zero breaking change). Doc: `docs/process/2026-04-26-tkt-08-backend-stability.md`.
- [x] ~~**TKT-09**~~ — `ai_intent_distribution` mancante in `/round/execute` response → **✅ CHIUSO in PR #1551 (`092bff14`)** 2026-04-18. Harness `_ai_actions_from_resp` filtra `results[]` per `actor_id ∈ SIS`.
- [ ] **TKT-10** — Harness retry+resume incrementale (JSONL write per-run). **Parziale**: PR #1551 probe_one addendum; retry+resume esplicito da confermare.
- [x] ~~**TKT-11**~~ — `predict_combat` 8p aggregate sanity boss vs full party → **✅ CHIUSO** (branch `test/tkt-11-predictcombat-8p-sanity`). 11 test additive in `tests/api/predict-combat-8p.test.js` (~200 LOC): no-NaN/Infinity guard 8p × boss, hit% bands sane 40-60%, aggregate hit chance bands 3.5-5.5/round, edge mod 10 vs DC 10 → 95-100%, edge mod 0 vs DC 18 → 5-25%, evasion_bonus_bonus + defense_mod_bonus stack additivo (PR #1830 ripple), attack_mod_bonus buff monotonic, asymmetry boss→tank vs tank→boss, reverse 8 enemies vs tank aggregate sanity, determinism analytic enumeration. AI baseline 311/311 verde, predict-combat baseline 10/10 verde, format:check verde. ADDITIVE test-only (zero production code change).

### Triangle Strategy MBTI surface tickets (proposed OD-013, pending user verdict)

- [x] ~~**TKT-P4-MBTI-001** — Phased reveal MBTI Disco-Elysium-style (Proposal A, ~6-8h)~~ → **✅ CHIUSO 2026-04-25 sera (branch `feat/d1a-mbti-phased-reveal`)**: `apps/backend/services/mbtiSurface.js` (NEW, ~140 LOC) helper `computeRevealedAxes` + `buildMbtiRevealedMap` con confidence derivata da coverage×decisiveness, threshold default 0.7 (env `MBTI_REVEAL_THRESHOLD` A/B testabile), label italiani conservative (T="Pensiero"/F="Sentimento"/E="Estroversione"/I="Introversione"/S="Sensazione"/N="Intuizione"/J="Giudizio"/P="Percezione") + hint diegetici per assi nascosti ("Sei socievole o solitario? Ancora non lo sai."). Routes `/:id/vc` e `/:id/pf` estese additivamente con `mbti_revealed` per_actor (lazy-import + try/catch non-blocking, zero breaking change). Frontend `debriefPanel.js` nuova sezione `#db-mbti-section` (4 axis card + hidden hints + confidence bar) + setter `setMbtiRevealed(payload)` + CSS `.db-mbti-*`. 12/12 unit test nuovi (`tests/services/mbtiSurface.test.js`), AI baseline 311/311 verde, vcScoring 56/56 verde, session API smoke verde. P4 🟡 → 🟡+ (UI surface live, playtest pending). Card [M-2026-04-25-009](docs/museum/cards/personality-triangle-strategy-transfer.md) reuse_path eseguito.
- [x] ~~**TKT-P4-MBTI-002** — Dialogue color codes diegetic (Proposal B, ~5-7h)~~ → **✅ CHIUSO 2026-04-26 (branch `feat/d1b-mbti-dialogue-color-codes`)**: palette canonical 8 lettere E/I/S/N/T/F/J/P in `data/core/personality/mbti_axis_palette.yaml` (WCAG AA garantito ≥5.02:1 contrast vs `#ffffff`, range 5.02-8.72). Backend helper `apps/backend/services/mbtiPalette.js` (loadMbtiPalette memoized + try/catch graceful, colorForAxis lookup, mbtiTaggedLine wrap inline `<mbti axis="X">...</mbti>`, wcagContrastRatio utility). Frontend renderer `apps/play/src/dialogueRender.js` (renderMbtiTaggedHtml DOM-free, isAxisRevealed gating compose con Path A, tagsAreBalanced + escapeHtml safety, stripMbtiTags accessibility fallback) + CSS `apps/play/src/dialogueRender.css` (8 axis classes, hover tooltip pure-CSS, dark-bg `text-shadow`, print-safe `@media print`). Reveal-gated: colore renderizzato SOLO se `mbtiRevealed.revealed[]` contiene axis pair (compose Path A). 26/26 test nuovi `tests/services/mbtiPalette.test.js` (load/lookup/tag/WCAG/render/escape/balance/strip). AI baseline 311/311 verde, format:check verde. ADDITIVE only: testo senza tag passa-through unchanged. P4 🟡+ → 🟡++ (Path A+B both shipped; integration in `narrativeEngine` + `render.js` pendente, helpers ready).
- [ ] **TKT-P4-MBTI-003** — Recruit gating by MBTI thresholds (Proposal C, ~4-6h). Hook `metaProgression.recruitFromDefeat`. Pre-req: M-007 mating engine activate (Path A in OD-001).

### Museum-driven autonomous tasks (user verdict 2026-04-25)

- [x] ~~**TKT-ANCESTORS-RECOVERY (P2 autonomous)**~~ — Caccia online 263 neuroni Ancestors → **✅ CHIUSO 2026-04-25 PR #1815 (`73bbab3e`)** "OD-011 Path B v07 wiki recovery 297/297 neurons". Method: Fandom wiki MediaWiki API bypass Cloudflare (`action=query&prop=revisions&rvslots=main` + custom UA). Branches recovered: Senses 37 + Ambulation 26 + Dexterity 33 + Attack 8 + Dodge 10 + Self-Control 12 + 9 bonus rami (Communication 20, Intelligence 14, Motricity 20, Omnivore 11, Settlement 10, Swim 5, Metabolism 4, Preventive 30, Therapeutic 24, Hominid lineages 33). Output: `reports/incoming/ancestors/ancestors_neurons_dump_v07_wiki_recovery.csv` 76KB + manifest SHA256. License CC BY-NC-SA 3.0. RFC v0.1 promise CLOSED.
  - [x] ~~**Follow-up wire 263 entries**~~ → **✅ CHIUSO 2026-04-26** branch `feat/ancestors-v07-residual-90-entries`. Diff CSV 297 codes vs YAML 290 records (post-PR #1817 batch wire 267) rilevò gap reale di **7 codes truly missing** (BB CO 02, BB DO 01/02/03-2, BB FR 02-04). Audit "22 residual" overstated — actual gap 7 (variant rows of Path A T2 genetic ancestors). Coverage chiusa via 2 range-extension provenance updates (`ancestor_attack_released_strength` BB CO 01 → BB CO 01-02; `ancestor_self_control_determination` BB FR 01 → BB FR 01-04) + 1 nuovo entry `ancestor_dodge_infundibular_pathway` T2 collassante BB DO 01/02/03-2 (Infundibular Pathway = genetic version di DO 06 Atarassia, target focused 2t). All 297/297 v07 codes ora hanno YAML mapping. Total ancestor entries 289 → **290**. AI baseline 311/311 verde, traitEffects 21/21 verde, schema lint passing, dataset validate 0 avvisi, prettier clean, docs governance 0 errors.
- [x] ~~**TKT-MUSEUM-ENNEA-WIRE (P1 autonomous)**~~ → **✅ CHIUSO 2026-04-25 sera** stack 3 PR consecutive: [#1825](https://github.com/MasterDD-L34D/Game/pull/1825) (`5c088ee5` enneaEffects 6/9 wire mechanical+log_only) + [#1827](https://github.com/MasterDD-L34D/Game/pull/1827) (`9f48cef6` 9/9 archetype coverage Riformatore+Individualista+Lealista) + [#1830](https://github.com/MasterDD-L34D/Game/pull/1830) (`b27a612c` 3 stat consumer wire move/stress/evasion → 9/9 mechanical). Card M-006 reuse_path fully implemented. Pre-req `buildVcSnapshot` per-round mode soluto via lazy invocation in `sessionRoundBridge.applyEndOfRoundSideEffects` post status decay (gate `session.turn > 1`, KO-skip, telemetry config caching). 311/311 AI baseline preserved + 31 tests new su `enneaEffectsWire.test.js`. P4 🟡 → 🟢 candidato definitivo. Card M-006 stato `curated → revived`.
- [ ] **TKT-MUSEUM-SKIV-VOICES (P1 autonomous)** — Implementa palette Type 5 + Type 7 in `data/core/narrative/ennea_voices/{type_5,type_7}.yaml` + selector in `narrativeEngine.js` + telemetry `ennea_voice_type_used`. ~6h. **Pre-req**: TKT-MUSEUM-ENNEA-WIRE shipped (vcSnapshot round-aware required).
- [ ] **TKT-MUTATION-P6-VISUAL (P0 autonomous, ~1h)** — Aggiungi field `visual_swap_it` + `aspect_token` a 30 mutation in `data/core/mutations/mutation_catalog.yaml` (oggi 0/30) + nuovo linter `tools/py/lint_mutations.py` (P0 enforcement). Gap doppio-confermato (Wildermyth + Voidling Bound wiki Rarity page). Card [M-2026-04-26-001](docs/museum/cards/evolution_genetics-voidling-bound-patterns.md) reuse_path Minimal. Zero blast radius (YAML additive puro).
- [x] ~~**TKT-MUSEUM-SWARM-SKIV (P0 Sprint A)**~~ — Single-shot magnetic_rift_resonance (OD-012) → **✅ CHIUSO 2026-04-25** in PR #1774 (`c06e02c4` biomeResonance.js + research_cost reduction) + PR #1779 (`8413fd47` Hybrid Path perks). magnetic_rift_resonance T2 trait + 2 prereq stub (magnetic_sensitivity, rift_attunement) promossi a `data/core/traits/active_effects.yaml`. Biome alias `atollo_ossidiana → atollo_obsidiana` in `biome_aliases.yaml`. Flag `magnetic_field_strength=1.0` su atollo_obsidiana in biomes.yaml. Wired in `apps/backend/services/combat/biomeResonance.js` (185 LOC, BIOME_FAMILIES.aquatic + skirmisher archetype). Staging file conservato come provenance.
- [x] ~~**TKT-MUSEUM-ANCESTORS-22-TRIGGER (P0 Sprint B)**~~ → **✅ CHIUSO 2026-04-25 PR #1813 (`59dc7195`)** "feat(traits): OD-011 Path A — 22 ancestors reaction trigger". Implementati 22 trait `ancestor_<ramo>_<name>` in `data/core/traits/active_effects.yaml` coprendo 5 rami con genetic variants collapsed: 8 Self-Control (FR 01-08, BB FR 01-04 → Determination ×1) + 6 Attack (CO 01-06) + 7 Dodge (DO 01-07) + 1 Released_Strength (BB CO 01-02 → ×1). Effect kind `extra_damage amount: 1`. **Reality note**: card originale claim "22 Self-Control" smentito da awk count CSV (12 SC reali). PR #1813 ha riinterpretato scope come "22 trigger overall (5 rami)" con BB collapsed = decisione difendibile. Card fix in PR drift fix #2 2026-04-25.

### Pre-playtest coop fixes (da audit coop-phase-validator 2026-04-24)

Ref: `docs/qa/2026-04-24-coop-phase-validation-pre-playtest.md` (agent run verdict 🟡 minor, 0 blocker).

- [x] ~~**F-1 (P1, ~1h)**~~ — Host transfer mid-combat phase rebroadcast → **✅ CHIUSO PR #1736 (`b7abfe39`)** 2026-04-24. `wsSession.js` host transfer ora rebroadcast coop phase_change + character_ready_list al new host + peers post-promotion. coopStore inject opzionale in createWsServer (backward-compat se assente). Linea 627 nota: "Optional `coopStore` (F-1)".
- [x] ~~**F-2 (P1, ~1h)**~~ — Stuck-phase escape hatch → **✅ CHIUSO PR #1736 (`b7abfe39`)** 2026-04-24. Endpoint `POST /api/coop/run/force-advance` host-only in `apps/backend/routes/coop.js:206`. Whitelist `character_creation → world_setup`, `debrief → next scenario/ended`. Implementato in `coopOrchestrator.js:269 forceAdvance({reason})`.
- [x] ~~**F-3 (P2)**~~ — `submitCharacter` membership check → **✅ CHIUSO PR #1736 (`b7abfe39`)** 2026-04-24. Membership check `allPlayerIds` rifiuta ghost client con error `player_not_in_room` (quando `allPlayerIds` non vuoto).

### Test coverage gaps coop (non bloccanti, da audit)

- [ ] Phase-skip negative tests (`confirmWorld()` from lobby should throw)
- [ ] Multi-player disconnect race test
- [ ] Host-transfer + coop-state sync e2e
- [ ] Room-code alphabet regex purity test
- [ ] `startRun()` from combat phase untested

### Triangle Strategy transfer (design-driven, new)

Da `docs/research/triangle-strategy-transfer-plan.md` — 10 meccaniche identificate, rollout 3 sprint slice:

- [x] **M14-A CHIUSO** — Mechanic 3 elevation damage multiplier + Mechanic 4 terrain reactions → helpers PR #1736 (`b7abfe39`) 2026-04-24, terrainReactions wire + elevation wire residual chiuso branch `feat/tkt-09-elevation-resolver-wire` 2026-04-26. Helpers: `elevationDamageMultiplier` in `hexGrid.js` (delta>=1 → 1.30, delta<=-1 → 0.85), `terrain_defense.yaml` attack_damage_bonus 0.30/-0.15, `apps/backend/services/combat/terrainReactions.js` + `chainElectrified` BFS.
  - [x] **terrainReactions wire** — branch `feat/m14a-terrain-reactions-wire` 2026-04-25: `performAttack` post-damage hook chiama `reactTile` quando `action.channel` mappa a fire/ice/water/lightning, `session.tile_state_map` persiste cross-round, decay ttl in `applyEndOfRoundSideEffects`, `terrain_reaction` field surfaced on attack event + response. +7 test (`tests/api/terrainReactionsWire.test.js`). 12/12 unit + 19/19 wire+unit verde, 311/311 AI baseline preserved.
  - [x] **elevation resolver wire residuo** — branch `feat/tkt-09-elevation-resolver-wire` 2026-04-26: `predictCombat` ora ritorna `elevation_multiplier` + `elevation_delta` + `expected_damage` (proxy hit_pct × (1+avg_pt) × multiplier). `performAttack` return surfacing `positional` info, `buildAttackEvent` emits `elevation_multiplier`/`elevation_delta`/`positional_multiplier`/`attack_quadrant` su event quando delta != 0 (rumor reduction). 9 buildAttackEvent call sites wired (sessionRoundBridge, sistemaTurnRunner, 7 in abilityExecutor). +10 test (`tests/services/elevationResolverWire.test.js`). 311/311 AI + 12/12 hardcore + 17/17 round + 7/7 terrainReactions verde. Calibration HC06 iter4 invariata (BOSS mod 5→3 + elev 1 attaccante).
  - **Ancora aperto**: facing system runtime (M14-B parzialmente shipped, full UI integration pending), chainElectrified BFS chain wire (deferred M-future).
- [ ] **M14-B** — Mechanic 1 (Conviction → MBTI axis reveal) + Mechanic 2 (Scales of Conviction → M18 world_setup upgrade). Effort L. ~12h. Target Pilastro 4 MBTI.
- [ ] **M15** — Mechanic 7 (Initiative CT bar / Wait action) + Mechanic 6 (class promotion XCOM-style). Effort L. ~15h. Target Pilastro 3 Specie×Job.

### Sprint 3 archivio (chiude readiness 24/24)

- [x] BACKLOG.md file root (questo)
- [x] OPEN_DECISIONS.md root (vedi file)
- [ ] Master orchestrator decision formalizzata (deferred a sessione successiva via ADR o note inline)

---

## 🟢 Priorità bassa

### Research / exploratory

- [ ] **P1 skills install** — seguire `docs/guide/claude-code-setup-p1-skills.md` (filesystem/git/github MCP + superpowers + serena). ~35 min userland.
- [ ] **Cherry-pick `wshobson/agents`** bundle — valutare skill specifiche (NON bulk install, context bloat risk).
- [ ] **`Game Balance & Economy Tuning` skill** install (mcpmarket.com) — fit diretto Pilastro 6 calibration, post-playtest round 2.

### Deferred (post-MVP)

- [ ] **V3 Mating/Nido** system — ~20h, post-MVP. Vedi `docs/core/Mating-Reclutamento-Nido.md`.
- [ ] **V6 UI TV dashboard polish** — ~6h, post-playtest live.
- [ ] **M12+ P2 Form evoluzione completa** Spore-core — ~35h, deferred (CLAUDE.md sprint roadmap).

### Tech debt long-term

- [ ] **Python rules engine Phase 2/3** removal — ADR-2026-04-19 kill-python. Phase 2 feature freeze + Phase 3 removal pending (services/rules/).
- [ ] **Prisma room persistence** (Phase C opzionale, default in-memory). Attiva solo se deploy pubblico.
- [ ] **Rate-limit / DoS hardening** (Phase D). Solo se deploy pubblico.
- [ ] **Alt B Game-Database HTTP runtime** attivazione (flag-OFF attuale, vedi `ADR-2026-04-14-game-database-topology.md`).

---

## 🚫 Bloccato da

- **TKT-07** ← TKT-06 (predict_combat fix prima di sweep #2)
- **V6 UI polish** ← TKT-M11B-06 playtest (serve feedback real per priorità UI)
- **M15 Triangle Strategy** ← M14-A + M14-B completati (sequenza rollout)
- **Alt B HTTP runtime** ← Game-Database sibling repo availability + deployment pubblico

---

## Primo sprint consigliato post-merge PR #1732

**Obiettivo**: chiudere Pilastri 5 + 6 🟢 definitivi tramite playtest live.

- **Task 1** (userland, 2-4h): **TKT-M11B-06** playtest live 2-4 amici
- **Task 2** (autonomous post-playtest, ~2h): invoke agent `playtest-analyzer` sui telemetry raccolti
- **Task 3** (autonomous, ~3h): **M13 P3 Phase B balance pass N=10** + **M13 P6 calibration hardcore 07**

**Definition of Done**:

- Playtest completato senza crash
- Analysis report in `docs/playtest/YYYY-MM-DD-playtest-round-2-analysis.md`
- Pilastri 5 + 6 aggiornati a 🟢 (o 🟢c con gap minori documentati) in CLAUDE.md
- TKT-06..11 aggiornati (chiusi o re-prioritizzati con evidenza)

---

## Audit log

**2026-04-24** (backlog audit post-Sprint 3):

- CLAUDE.md "Backlog ticket aperti" sezione 17-18/04 era stale:
  - TKT-06 listato come aperto → CHIUSO in PR #1588 (`2d6394dd`, 2026-04-18)
  - TKT-09 listato come aperto → CHIUSO in PR #1551 (`092bff14`, 2026-04-18)
  - TKT-08/TKT-10 parzialmente affrontati in PR #1551/#1559, marcati "parziale"
  - TKT-11 confermato aperto → CHIUSO 2026-04-26 (branch `test/tkt-11-predictcombat-8p-sanity`, 11 test additive)

**2026-04-24** (coop-phase-validator real run, primo uso post-policy 4-gate DoD):

- Agent invocato su codice reale (non smoke test). Verdict 🟡 minor issues, 0 blocker, cleared per playtest.
- 3 findings aggiunti al backlog (F-1, F-2, F-3)
- 5 test coverage gap identificati (non bloccanti pre-playtest)
- P1 fixes ~2h pre-playtest: F-1 (host transfer coop phase rebroadcast) + F-2 (force-advance endpoint)
- Report: `docs/qa/2026-04-24-coop-phase-validation-pre-playtest.md`

**Lesson**: CLAUDE.md narrative sprint context tende a fossilizzarsi — BACKLOG.md è single source of truth per stato ticket. Sync manuale post-merge PR importanti, o via skill `sprint-close`.

**2026-04-25** (D2 Path A faithful pivot — M14 mutation framework foundation):

- ✅ D2 mutation_catalog Path A — M14 framework loader + routes. `apps/backend/services/mutations/mutationCatalogLoader.js` + `apps/backend/routes/mutations.js` + plugin wire. 30 entries shipped, 4 endpoint REST (`/registry`, `/:id`, `/eligible`, `/apply`). +12 test (8 loader + 4 routes). PE/PI charging deferred a M13.P3 wire (display-only). Decoupled da V3 mating per design semantics — vedi card M-007.

**2026-04-27** (Sprint 8 Ability r3/r4 tier progressive — AncientBeast Tier S #6 closure 4/4 100%):

- ✅ **Sprint 8** ([PR #1978](https://github.com/MasterDD-L34D/Game/pull/1978)) — Ability r3/r4 tier progressive. `data/core/jobs.yaml` v0.1.0 → v0.2.0 (21 → 35 base ability, +14 nuove: 2/job × 7 base job). Cost ladder canonical r1=3/r2=8/r3=14/r4=22 PI (curva quasi-quadratica). 14 ability nuove via 7 effect_type esistenti (move_attack, multi_attack, buff, aoe_buff, aoe_debuff, ranged_attack, surge_aoe, team_buff, team_heal, drain_attack, execution_attack, debuff): skirmisher (phantom_step+dervish_whirlwind), vanguard (aegis_stance+bulwark_aegis), warden (chain_shackles+void_collapse), artificer (arcane_renewal+convergence_wave), invoker (arcane_lance+apocalypse_ray), ranger (hunter_mark+headshot), harvester (vital_drain+lifegrove). Vincolo critical: zero nuovi runtime types, zero modifica abilityExecutor.js (extension data-only). 5 test nuovi (cost ladder + naming uniqueness + rank sort + version bump + r3/r4 specific keys) + 1 e2e smoke abilityExecutor (phantom_step move_attack via /api/session/action) + ADR-2026-04-27-ability-r3-r4-tier + numeric-reference §12 + stato-arte §B.1.5 marked 0 residui. jobs 14/14 + abilityExecutor 36/36 + AI 382/382 zero regression. Pillar P3 🟢c++ → 🟢ⁿ. **Tier S #6 100% closed** (channel resist #1964 + Beast Bond #1971 + wiki cross-link #1937 + r3/r4 progression this PR).

**2026-04-27** (Sprint 7 Beast Bond reactions — AncientBeast Tier S #6 closure 3/4):

- ✅ **Sprint 7** ([PR #1971](https://github.com/MasterDD-L34D/Game/pull/1971)) — Beast Bond creature reaction trigger system. `data/core/companion/creature_bonds.yaml` (6 bond pair canonical, 5 archetype combo) + AJV schema `creature_bond.schema.json` + engine `apps/backend/services/combat/bondReactionTrigger.js` (~250 LOC) + wire `session.js` performAttack post intercept + `sessionRoundBridge.js` capture/emit reaction_trigger event + 19 unit test (loader, eligibility gates, cooldown, counter_attack/shield_ally fire, back-compat) + ADR-2026-04-27 + numeric-reference §11 + stato-arte §B.1.5. Reaction types: counter_attack (-1 dmg_step + refund pulled punch) + shield_ally (50% absorb transfer). Caps: 1/round/actor + cooldown_turns regen + mutually exclusive con M2 intercept. Compat: missing YAML → no-op silent. AI 363→382 verde, format/schema/governance verdi. Pillar delta P1 🟢++ → 🟢ⁿ (creature reactivity surface) + P3 🟢c+ → 🟢c++ (species_pair semantics). Tier S #6 residuo: solo Ability r3/r4 ~10h aperto.

**2026-04-27 notte** (Sprint 1-5 autonomous + OD-001 closure + docs sync):

- ✅ **Sprint 1** (PR #1934) — Wesnoth time-of-day modifier + AI War defender's advantage + Disco day pacing flavor + Fallout numeric reference doc + 2 ADR design AI War. Tier S #5/#9/#10/#11 chiusi.
- ✅ **Sprint 2** (PR #1935) — Subnautica habitat lifecycle wire (Tier A #9 chiuso). `biomeAffinity` service + `dune_stalker_lifecycle.yaml` + 14 species lifecycle stub + `seed_lifecycle_stubs.py` + biomeSpawnBias init wave universal closure (Engine LIVE / Surface DEAD anti-pattern killed).
- ✅ **Sprint 3** (PR #1937) — Codex completion (3 chiusure): Tunic Glifi codexPanel tab + AncientBeast `wikiLinkBridge` slug + Wildermyth choice→permanent flag campaign state. Bonus: 4 stale fixture fix opportunistic (sangue_piroforico nerf #1869 + orphan currency #1870 + schema object #1871).
- ✅ **Sprint 4** (PR #1938) — UI polish: Cogmind stratified tooltip Shift-hold expand + Dead Space holographic AOE cone shimmer + Isaac Anomaly card glow effect. Tier B #3/#7 + Tier S #11 hybrid chiusi.
- ✅ **Sprint 5** (PR #1940) — Telemetry viz: Tufte sparkline HTML dashboard + DuckDB +4 SQL query (mbti_distribution / archetype_pickrate / kill_chain_assists / biome_difficulty). Tier E #9/#13 chiusi.
- ❌ **PR #1877 closed-superseded** — OD-001 Sprint C UI 51K LOC stale. Backend già live #1879 + UI Lineage tab #1911. OD-001 Path A 4/4 chiuso end-to-end via combo.
- ✅ **PR #1952 docs sync** — CLAUDE.md sprint context + COMPACT_CONTEXT v9 + stato-arte §A.2 + OPEN_DECISIONS OD-001 closure + 13 ticket auto-gen `proposed/` → `merged/` + combat hub cross-link.

**Pillars finali**: 5/6 🟢 def/c++/c+ + 1/6 🟢c (P5 unblock playtest live).
**Test baseline**: 324 → 364 (+40 nuovi + 4 fixture restore + 0 regression).
**Total PR shipped 2026-04-25 → 2026-04-27 notte**: **54** (+ 1 closed-superseded + 1 docs sync).
**Handoff**: `docs/planning/2026-04-27-sprint-1-5-autonomous-handoff.md`.

## Ref

- CLAUDE.md sezione "Sprint context" e "Pilastri" = dettagli completi stato
- ADR storici: `DECISIONS_LOG.md`
- Sprint doc: `docs/process/sprint-*.md`
- Vision + roadmap: `docs/core/` + `PROJECT_BRIEF.md`
- Triangle Strategy: `docs/research/triangle-strategy-transfer-plan.md`
- Readiness audit: `docs/reports/2026-04-24-repo-autonomy-readiness-audit.md`

## Policy backlog

- **Non ridondare con CLAUDE.md**: questo file è il registro operativo; CLAUDE.md narra sprint chiusi. Evita duplicazioni.
- **Chiusura ticket**: aggiorna qui + sposta in CLAUDE.md "milestone sessione YYYY-MM-DD" quando lo sprint close (via skill `sprint-close`).
- **Apertura ticket**: minimo richiesto = titolo + priorità + scope (autonomous/userland) + blocker se presente.
- **Eccessi da evitare**: non aggiungere ticket senza ownership o criterio di successo. "Refactor X quando possibile" ≠ ticket.
