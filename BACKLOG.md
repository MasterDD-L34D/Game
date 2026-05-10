# BACKLOG — Evo-Tactics

> **Scope**: backlog prioritizzato ticket aperti + residui sprint.
> **Sorgente canonical**: CLAUDE.md sezione "Sprint context" + sprint doc in `docs/process/`.
> **Aggiornamento**: on-demand quando chiudi/apri un ticket. Sprint close aggiorna anche CLAUDE.md summary.
> **Ref template**: `04_BOOTSTRAP_KIT/BACKLOG.md` archivio.

---

## 🔴 Priorità alta (bloccanti o sbloccanti)

### ✅ Cascade L3 autonomous + Phase 5 partial + npm audit + MC build PAT E2E — sessione 2026-05-10 sera — 10 PR shipped (cumulative Day 5+1+2 = 51 PR)

User resume trigger "cascade approval" → "facciamo gli auto trigger pending e poi continuiaimo con i due next gate in parallel" → "procedi continuando in autonomia". Cascade ~5h cumulative post-FULL-AUDIT-CLOSURE (41 PR pre-conv).

| #   | PR                                                       | Squash     | Topic                                                                       |
| --- | -------------------------------------------------------- | ---------- | --------------------------------------------------------------------------- |
| 1   | [#2185](https://github.com/MasterDD-L34D/Game/pull/2185) | _silent_   | V13 trait_native pseudo-job 39 abilities + jobs route filter pseudo         |
| 2   | [#2186](https://github.com/MasterDD-L34D/Game/pull/2186) | `6bbcaae7` | V6 Sprint Q+ FULL scope codification post-Phase-B (12 ticket Q-1 → Q-12)    |
| 3   | [#2184](https://github.com/MasterDD-L34D/Game/pull/2184) | `f9a9e282` | Workflow bundle V1+V17 — MC build PR-based + nightly NIT-1 + Codex 5 rounds |
| 4   | [#2187](https://github.com/MasterDD-L34D/Game/pull/2187) | `1b42d18f` | Cascade L3 pre-merge audit + Phase B accept ADR §13 stub                    |
| 5   | [#2188](https://github.com/MasterDD-L34D/Game/pull/2188) | `e50c49ca` | MC build auto-deploy dist (PAT validation E2E) — first cascade auto-PR live |
| 6   | [#2189](https://github.com/MasterDD-L34D/Game/pull/2189) | `6dcf2983` | Sprint Q+ Q.A pre-stage bundle (Q-1 schema + Q-2 migration + Day 8 fill)    |
| 7   | [#2190](https://github.com/MasterDD-L34D/Game/pull/2190) | `7f8dd93b` | Sprint Q+ Q.B+Q.C+Q.D+Q.E spec extension (Q-3 → Q-12 full pipeline)         |
| 8   | [#2191](https://github.com/MasterDD-L34D/Game/pull/2191) | `f3576a90` | npm audit fix 27 → 9 vulnerabilities (18 fixed semver-compat)               |
| 9   | [#2193](https://github.com/MasterDD-L34D/Game/pull/2193) | `d43b29d6` | Mutation Phase 5 partial 10/12 + terrain flaky 12→30 iters bundle           |

**Browser ops master-dd autonomous (Chrome MCP)**:

- Azione 1 ✅ AUTODEPLOY_PAT secret created — fine-grained PAT 4 permissions (Actions+Contents+Metadata+PR r+w), repo Game only, expiration 2026-08-08 (90gg). End-to-end via Chrome MCP (sudo OTP master-dd, scopes + repo selection + permissions + token gen + clipboard paste autonomous).
- Azione 2 ✅ Skiv Monitor toggle verified done (Settings → Actions → workflow permissions allow create/approve PR già checked).

**MC build workflow E2E validation**:

- Workflow_dispatch run [25629460120](https://github.com/MasterDD-L34D/Game/actions/runs/25629460120) SUCCESS post-PAT setup
- Auto-PR #2188 creato `auto/mission-console-dist-2026-05-10-1304` con labels `automation` + `auto-merge-l3-candidate` ✅
- PAT path active (no fallback dispatch fired)
- Native CI `pull_request` event fired (no recursion guard issue)
- Cascade L3 7-gate verification verde + auto-merge naturale

**Mutation Phase 5 partial (10/12 kinds)**:

- ally_killed_adjacent: kill events + position adjacency Manhattan ≤1 + species_filter
- assisted_kill_count: assist event filter actor_id (assist events già emessi via emitKillAndAssists SPRINT_003)
- 8 tests new tests/services/mutationTriggerEvaluatorPhase5.test.js
- Residue 2/12 deferred Phase 6 (Prisma migration 0008+/0009+): ally_adjacent_turns + trait_active_cumulative

**Codex iter cycle PR #2184 (5 rounds)**:

- Round 1 P1: GITHUB_TOKEN recursion guard → PAT chain + dispatch fallback
- Round 2 P2+P3: missing L3 label + PAT marker scope → label create + step output
- Round 3 P2: ci.yml lacks workflow_dispatch → + workflow_dispatch + validation
- Round 4 P2: DISPATCH_FAILURES exit 0 → exit 1 + ::error
- Round 5: "Delightful! No major issues" 🟢

**BACKLOG closure**:

- TKT-NIGHTLY-WORKFLOW-NIT-1 ✅ chiuso (PR #2184 top-level env LOBBY_WS_PORT)
- TKT-NIGHTLY-WORKFLOW-NIT-3 ✅ verified pre-shipped #2155
- **TKT-TERRAIN-FLAKY** ✅ chiuso (5/5 PASS reproduce post-fix shipped 12→30 iters già live, pre-fix-discovery stale entry)
- **TKT-TERRAIN-FLAKY-2** (fire channel attack on normal tile + acqua + lightning + ghiaccio) ✅ shipped fix bundled in PR #2193

**Pillar deltas**: P3 Identità Specie × Job 🟢ⁿ → 🟢++ (39 trait abilities runtime live).

**Outstanding master-dd action items** (non-blocking):

- Phase B Day 8 verdict (2026-05-14): ADR-2026-05-05 §13.3 fill template ready (γ default automatic ~5min compile OR α full social ~30min)
- Sprint Q+ kickoff cascade post-§13.3 commit: Q-1 + Q-2 spec ready ship cascade autonomous (~3h)
- Sprint Q+ Q.B → Q.E full pipeline spec ready (~21-23h post-Q.A merge)

**Pre-existing residue master-dd** (deferred):

- 9 npm audit residue (--force breaking changes)
- Mutation Phase 6 (ally_adjacent_turns + trait_active_cumulative) — Prisma migration ADR
- Lifecycle 5-fasi YAML 5 T4 species (design gate)
- ⚠️ BACKLOG correction 2026-05-10 sera (V9 audit reentry): "ancestors 297 zero runtime consumer" era WRONG. **290/297 traits LIVE (97%)** — 3 runtime consumers wired (passiveStatusApplier + evaluateMovementTraits + passesBasicTriggers). Solo 18 branch metadata categories unconsumed. Vedi [docs/research/2026-05-10-ancestors-297-reentry-audit.md](docs/research/2026-05-10-ancestors-297-reentry-audit.md) + museum card [M-2026-05-10-001 ancestors-297-orphan](docs/museum/cards/ancestors-297-orphan-2026-05-10.md). Path A biome seeder ~3h raccomandato future activation.
- ⚠️ Trait orphan count drift (V10 audit reentry): BACKLOG diceva 59 — **reality 109 core orphans** post waves 1-6 (active_effects.yaml 499 totali). C delete batch 3/4 shipped (agent false positive wounded_perma verified actively wired statusModifiers.js). Residue: A keep 91 + B defer 14 master-dd review window. Vedi [docs/research/2026-05-10-trait-orphan-audit-batch-review.md](docs/research/2026-05-10-trait-orphan-audit-batch-review.md).

#### Trait orphan ticket codification 2026-05-10 sera (master-dd verdict "2+3" cascade approval)

- **TKT-P3-TRAIT-ORPHAN-ASSIGN-A** (~4h initial → 35/91 shipped sera close-gaps cascade): 91 A-keep traits assignment to species wave 6. Biome-aligned batch (3-4 traits per new species). Audit table reference: [§1 Wave 0-6 listing](docs/research/2026-05-10-trait-orphan-audit-batch-review.md#1-full-audit-table--109-orphan-traits).
  - ✅ **Wave 0+1 SHIPPED PR #2208** `61042522` — 14 traits / 12 species (8 species_expansion deferred schema mismatch).
  - ✅ **Wave 2 SHIPPED PR #2209** `e189f4e4` — 6 traits / 6 species (7 species_expansion deferred).
  - ✅ **Wave 3+4 SHIPPED PR #2210** `9c065375` — 15 traits / 9 species.
  - ⏳ **Wave 5+6 RESIDUE** ~28 traits — master-dd review TBD biome mapping per audit doc §Wave 5+6.
  - ⏳ **Species_expansion schema extension** ~22 traits across 8 sp\_\* species (sp_lithoraptor_acutornis + sp_basaltocara_scutata + sp_arenaceros_placidus + sp_ferrimordax_rutilus + sp_pyrosaltus_celeris + sp_ventornis_longiala + sp_sonapteryx_resonans + sp_arenavolux_sagittalis + sp_salifossa_tenebris). Schema species_expansion.yaml uses morph_slots (not trait_plan section) → master-dd review schema extension OR migrate species_expansion entries adopt trait_plan canonical.

**Cumulative ASSIGN-A progress sera close-gaps**: **35/91 traits** (38%) shipped player-visible across 3 PR. Residue 56 traits deferred (28 wave 5+6 master-dd review + 28 schema extension species_expansion).

#### Cluster C ajv-cli investigation closure (2026-05-10 sera close-gaps)

**STUCK upstream**: ajv-cli 5.0.0 = latest stable npm registry (verified `npm view ajv-cli versions` 27 versions, 5.0.0 latest 5.x). Audit `fixAvailable: 0.6.0` = downgrade weird signal. fast-json-patch 3.1.1 latest = upstream still vulnerable.

**Same pattern Cluster A AngularJS**: NO upstream patch. Solo paths:

1. Wait upstream patch (indefinite)
2. Replace ajv-cli con direct ajv invocation in `tools/ajv-wrapper.sh` (~30min refactor)
3. Accept residue (low impact: dev tool only, NOT runtime)

**Recommendation**: option 3 accept residue. Used solo via Makefile EVO_VALIDATE_AJV + schema-validate.yml workflow (dev validation, NOT prod runtime).

TKT-DEPS-AJV-CLI-INVESTIGATE ✅ closed (no actionable fix).

- **TKT-P6-TRAIT-ORPHAN-DESIGN-B** (~2h): 14 B-defer traits design call. Categorization audit doc:
  - Swarm cluster (3): `magnetic_rift_resonance` + `magnetic_sensitivity` + `rift_attunement` — non-canonical status strings (telepatic_link/sensed/attuned), need ADR canonical status enum extension OR rename
  - Miscellaneous unclear semantics (5): `aura_glaciale` + `sussurro_psichico` + `tela_appiccicosa` + `marchio_predatorio` + `antenne_wideband` — design call effect spec
  - Balance tuning (2): `mente_lucida` (panic 2t MoS≥3 troppo low threshold) + `cervello_predittivo` (stunned 2t T3 no T3 species slot)
  - Evaluator gap (2): `biochip_memoria` (`requires_target_status` not implemented in traitEffects.js) + others
  - Trigger: Sprint M-future window OR bundle Sprint Q+ Q.B per shared evaluator extension
- **TKT-P6-TRAIT-MECHANICS-SYNC** (~1h): add subset A-class traits to `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml` (wave 1-3 families currently missing balance values). Trigger parallel TKT-P3-A.

Effort cumulative residue ~7h (4h A + 2h B + 1h mechanics sync) post-Sprint-Q+ window.

### ✅ FULL AUDIT CLOSURE — sessione 2026-05-10 — 27 PR shipped main (cumulative Day 5+1 = 41 PR)

User canonical resume trigger 2026-05-09 sera "verifica primo nightly cron run 2026-05-10 02:00 UTC". Cascade autonomous ~12h waves 7-19 chiude:

**17/17 cross-domain audit ticket addressed**:

- 15 shipped runtime/data
- 2 docs (ADR + handoff)
- 0 verdict residue

**13/13 master-dd user-explicit verdict closed**:

- A1-A4 Mission Console (install + bond toast + CI workflow + ADR)
- B1-B3 Mutation (Prisma migration + manual fill + manual_only)
- C1-C2 Trait (B4 YELLOW + heal handler new kind)
- D ship 5 T4 species sequenziali (T4=0→5 LADDER COMPLETE)
- F1-F3 (nightly NIT + terrain flaky + ancestors research+Path B)

**T4 ladder COMPLETE 5/5**:

- Apex electromanta_abyssalis (frattura_abissale_sinaptica)
- Keystone symbiotica_thermalis (dorsale_termale_tropicale)
- Threat sonaraptor_dissonans (canopia_ionica)
- Bridge psionerva_montis (caldera_glaciale)
- Playable fusomorpha_palustris (palude)

**Major findings**:

1. Mission Console source recovered (git commit 42d1d6f3) — ADR-2026-05-10 supersede
2. Mutation Phase 1+2+3+4 evaluator runtime + 12 kinds whitelist (8/12 implemented)
3. Heal kind canonical wired (effect.kind=heal hp_delta dice rolls)
4. Cron P0 caught T-7h pre-fire (WS port + set+e bugs)
5. F3 ancestors corrected — naming migration docs (290/297 already in AE)

**Pillar deltas**: P1 🟢, P2 🟢++, P3 🟢++, P4 🟢++, P5 🟢, P6 🟢.

**Residue deferred non-blocking**:

- Mutation Phase 5 stub kinds (4: ally_killed_adjacent, ally_adjacent_turns, assisted_kill_count, trait_active_cumulative)
- Aggregate update logic cumulative_biome_turns (end-of-encounter increment)
- Lifecycle 5-fasi YAML 5 T4 species (master-dd design gate)
- Sprite assets 5 T4 species (skipped verdict #D)
- npm audit fix 18 vulnerabilities

### ✅ Nightly cron P0 fix + scenario diversity sweep harness extension — sessione 2026-05-09 sera→2026-05-10 — 3 PR shipped + 1 DRAFT

Resume trigger user "verifica primo nightly cron run 2026-05-10 02:00 UTC + esegui scenario diversity sweep aggressive default × enc_tutorial_02..05 + hardcore-\*". P0 caught a T-7h pre-prima cron + harness gap discovered.

| #   | PR                                                       | SHA                  | Topic                                                                          |
| --- | -------------------------------------------------------- | -------------------- | ------------------------------------------------------------------------------ |
| 1   | [#2155](https://github.com/MasterDD-L34D/Game/pull/2155) | `48eaf24a`           | nightly cron P0 — WS port 3334 vs 3341 split + `set +e` regression-detection   |
| 2   | [#2152](https://github.com/MasterDD-L34D/Game/pull/2152) | `5466cf45`           | Skiv Monitor auto-update admin merge (canonical pattern)                       |
| 3   | _label create_                                           | _direct_             | `ai-sim-regression` + `automated` labels create (3rd P0 surfaced via dispatch) |
| 4   | [#2156](https://github.com/MasterDD-L34D/Game/pull/2156) | DRAFT → ready-review | scenario diversity sweep harness YAML loader opt-in (master-dd verdict gated)  |

**N=40 verify dispatch [#25609294902](https://github.com/MasterDD-L34D/Game/actions/runs/25609294902)**: ✅ CLEAN — completion 100% × 3 profile, drift ±10pp tolerance, aggressive avg_rounds 24.2 = PR #2149 baseline exact.

**Cumulative Day 5 + 2026-05-10 closure** = 15 PR Game/ shipped main (#2140-#2151 + #2153 + #2155 + #2152) + 1 PR open (#2156).

**Codex P2 review #2156 addressed (commit `072d3e38` + `b3ee75ea`)**:

- P2 #1 grid sizing: `pickModulationForGrid()` mapping YAML grid_size edge → preset deployed count (`solo`/`trio_mid`/`duo_hardcore`) → backend allocates grid coerente
- P2 #2 objective whitelist: `SUPPORTED_OBJECTIVE_TYPES = [elimination, survival]` — escort/capture_point/etc throw + graceful fallback synthetic
- NIT 2 (self-review #2155): WS_URL scheme validation `/^wss?:\/\//`

### Cross-domain gap inventory 2026-05-10 — 4 audit paralleli (trait + form/morph/mutation + MBTI×Job + Ennea)

User trigger "ci sono altri gap nei trait, parti, morph, MBTI×Job, Ennea?". 4 balance-auditor + creature-aspect-illuminator agents audit paralleli. Findings consolidated:

#### P0 — 3 critical

| Ticket                   | Gap                                                                                                                                              | Domain   | Effort |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | :----: |
| **TKT-MUT-AUTO-TRIGGER** | 30/30 mutations `trigger_examples` prose-only — backend ZERO trigger evaluator (biome turn / kill streak / Sistema pressure auto-unlock 0% impl) | Mutation | ~5-8h  |
| **TKT-MBTI-JOB-VOCAB**   | mbti_forms `job_affinities` usa role-archetypes ("tattico"/"guaritore") vs canonical job IDs ("skirmisher"/"vanguard") — **0/176 combo resolve** | MBTI×Job |  ~2h   |
| **TKT-MBTI-EXP-JOBS**    | 4 expansion jobs (stalker/symbiont/beastmaster/aberrant) assenti da mbti_forms — 64/176 = 36% unaddressed                                        | MBTI×Job |  ~1h   |

#### P1 — 8 moderate

| Ticket                           | Gap                                                                                                          | Domain    | Effort |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------ | --------- | :----: |
| **TKT-ENNEA-1-5-DOUBLE-TRIGGER** | Riformatore(1)+Architetto(5) co-fire double `attack_mod +1` buff (no dedup in resolveEnneaEffects)           | Ennea     | ~30min |
| **TKT-ENNEA-METRICS-FALLBACK**   | `assists`/`low_hp_time` 0 in solo scenario → ennea trigger silent no-op (calibration risk)                   | Ennea     |  ~1h   |
| **TKT-MUT-CIRCULAR-SWAP**        | `simbionte_batteri_termofili` tier 3 `trait_swap.add: [batteri_endosimbionti_chemio]` = proprio prereq trait | Mutation  | ~10min |
| **TKT-BOND-HUD-SURFACE**         | bondReactionTrigger.js wired session response ma ZERO HUD player-visible (Gate 5 engine LIVE / surface DEAD) | Companion |  ~3h   |
| **TKT-SKIV-COMPANION-SERVICE**   | skiv_archetype_pool.yaml generativo unwired (`companionService.js` absent)                                   | Companion |  ~3h   |
| **TKT-MBTI-AFFINITY-RUNTIME**    | personalityProjection.job_affinities NO runtime wire (vcScoring NOT consume mbti_forms)                      | MBTI×Job  |  ~3h   |
| **TKT-TRAIT-MECH-NO-HANDLER**    | 31 traits in trait_mechanics.yaml hanno PT cost + damage tuned ma ZERO active_effects handler (dead economy) | Trait     | ~5-8h  |
| **TKT-TRAIT-EFFECT-KIND-MISS**   | 4 active_effects traits hanno `effect.kind` senza handler (`wounded_perma persistent_marker` novel kind)     | Trait     | ~1-2h  |

#### P2 — 6 minor

| Ticket                      | Gap                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------ |
| TKT-SKIV-ENNEA-ARCHETYPE    | `skiv_archetype_pool.yaml` 0/9 Ennea archetype assignments per biome pool                        |
| TKT-FORMPACK-EXP-JOB-BIAS   | `form_pack_bias.yaml job_bias` missing 3 expansion job slugs → silent [E,I] fallback             |
| TKT-ANCESTORS-CONSUMER      | `data/core/ancestors/` 297 proposal entries zero runtime consumer (proposal-only files inert)    |
| TKT-VCSCORING-ITER2-DEFAULT | iter2 E_I + S_N axis full coverage gated env flag `VC_AXES_ITER=2` (default partial < 30 events) |
| TKT-TRAIT-ORPHAN-ACTIVE     | 59/168 active_effects mai referenziati in code/data/scenario (no assignment path)                |
| TKT-TRAIT-AE-GLOSSARY-MISS  | 7 active_effects IDs senza glossary entry (no display name/description se UI surface)            |

**Aggregate effort**: P0+P1 ~22-27h × 11 ticket. P2 ~5-8h × 6 ticket. **Total ~27-35h cross-domain**.

**Engine LIVE / surface DEAD pattern hits Gate 5 — 3 ticket P0/P1 violation pervasive**:

- TKT-MUT-AUTO-TRIGGER (mutation engine sans trigger evaluator)
- TKT-BOND-HUD-SURFACE (bond reaction sans HUD)
- TKT-SKIV-COMPANION-SERVICE (skiv pool sans generative service wire)

### Deferred follow-up tickets (post-Codex review #2156)

| Ticket                             | Scope                                                                                                                                                                        |         Effort          | Trigger                                                      |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :---------------------: | ------------------------------------------------------------ |
| **TKT-SWEEP-MULTI-WAVE**           | extend `buildEnemiesFromYaml` a wave_id>1 turn_trigger handling (worker drives reinforcement spawn via session/round events)                                                 |          ~2-3h          | post-merge #2156 + sweep signal positivo su wave_id=1        |
| **TKT-SWEEP-ESCORT-TARGET**        | spawn `objective.escort_target` unit + extend `selectPlayerAction` a escort-protect policy                                                                                   |           ~2h           | post merge multi-wave OR if master-dd richiede escort sweep  |
| **TKT-SWEEP-CAPTURE-CAMP**         | extend `selectPlayerAction` a capture-point camp tile policy + tile occupancy detection                                                                                      |          ~2-3h          | post merge multi-wave OR if master-dd richiede capture sweep |
| **TKT-ENCOUNTER-T03-T05**          | crea YAML enc_tutorial_03/04/05 (PCG generation OR designer-authored) — pressure_start 50/75/95 progression                                                                  | ~3-5h design + ~1h YAML | post sweep harness validated + designer assigned             |
| **TKT-SWEEP-HARDCORE-PATH**        | bootstrap path harness per `apps/backend/services/hardcoreScenario.js` programmatic scenarios (separate da YAML loader)                                                      |          ~3-4h          | post sweep YAML loader validated                             |
| **TKT-SWEEP-PER-UNIT-PROFILE**     | `AI_SIM_USE_YAML_PROFILE=1` flag opt-in per granular per-wave ai_profile vs sweep override globale                                                                           |         ~30min          | low priority, design call gate                               |
| ~~**TKT-NIGHTLY-WORKFLOW-NIT-1**~~ | ✅ CHIUSO 2026-05-10 (workflow bundle PR) — top-level env `LOBBY_WS_PORT: '3341'` + step env reference `${{ env.LOBBY_WS_PORT }}`                                            |            —            | —                                                            |
| ~~**TKT-NIGHTLY-WORKFLOW-NIT-3**~~ | ✅ CHIUSO 2026-05-10 (verified shipped PR #2155 lines 124-127, comment block check-thresholds.js exit-code contract già canonical)                                           |            —            | —                                                            |
| ~~**TKT-TERRAIN-FLAKY**~~          | ✅ CHIUSO 2026-05-10 — reproduce 5/5 PASS verifica autonomous post-cascade. Fix 12→30 iters già shipped (test line 128-131 commento). Stale BACKLOG entry pre-fix-discovery. |            —            | —                                                            |

### ✅ K4 Approach B + 4 task autonomous closure — sessione 2026-05-09 sera — 4 PR shipped

K4 follow-up cycle complete + 3 task scaling parallel. Resume trigger user "leggi handoff PR #2148, esegui Option A K4 Approach B" + escalation "3+5+esegui FASE 1 T1.3" + grant esplicito `.github/workflows/`.

| #   | PR                                                       | SHA        | Topic                                                                          |
| --- | -------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------ |
| 1   | [#2149](https://github.com/MasterDD-L34D/Game/pull/2149) | `e608ddd8` | K4 Approach B commit-window guard 100% WR N=40 (+10pp vs K3 baseline 90%)      |
| 2   | [#2150](https://github.com/MasterDD-L34D/Game/pull/2150) | `94dabd95` | Swap default aggressive profile → utility ON + commit_window 2                 |
| 3   | [#2151](https://github.com/MasterDD-L34D/Game/pull/2151) | `9f8bcaae` | FASE 1 T1.3 browser sync spectator Playwright harness + visual diff CLI        |
| 4   | [#2153](https://github.com/MasterDD-L34D/Game/pull/2153) | `ebb04e8f` | FASE 5 nightly cron `.github/workflows/ai-sim-nightly.yml` + threshold checker |

**K4 commit-window evidence (PR #2149 sweep N=40)**:

- victory: 40/40 = **100% WR** (cap), avg_rounds 24.2 (-0.8 vs baseline 25.0)
- baseline N=20 K3 prod re-validated stesso tunnel: 18V/2D = **90% WR** avg 25.0r
- ΔWR +10pp absolute (capped). Zero timeouts, zero defeats.
- Guard footprint: 90 firings / 1208 SIS decisions = 7.4%

**Side-fix critico (PR #2149)**: state tracking `last_action_type` + `last_move_direction` ora in `sessionRoundBridge.js realResolveAction` post-commit. Pre-PR esisteva solo in legacy `sistemaTurnRunner.js` (DEAD path M17 ADR-2026-04-16) → K4 sticky era no-op nel round flow.

**Production state ai_profiles.yaml post-#2150**: `aggressive` profile = utility ON + commit_window 2. Profile alternativi preservati ablation (`aggressive_no_util`, `aggressive_with_stickiness`, `aggressive_sticky_30`, `aggressive_commit_window`).

**FASE 5 nightly cron (PR #2153)**: cron 02:00 UTC daily, drift threshold ±10pp WR + completion floor 95%. Su regression: GH Issue label `ai-sim-regression,automated` + artifact upload 14d retention. **First scheduled run 2026-05-10 02:00 UTC**.

**T1.3 browser sync (PR #2151)**: Playwright chromium headless harness, hook `window.__evoLobbyBridge._currentPhase` poll 200ms, PNG + grid signature 4×4 RGBA su ogni `phase_change`. Smoke validato 4 PNG cattura. Open question master-dd: phone composer no canvas → DOM bbox sample vs PNG-only fallback.

**Cumulative Day 5 (2026-05-09 mattina+sera)** = 13 PR Game/ shipped main (#2140-#2151 + #2153) + 1 Godot v2 + 1 Godot v2 direct main.

**Pillar deltas**: P1 Tattica 🟢++ (commit-window deterministico = AI behavior più readable). Altri invariati.

**Open question pendenti master-dd**:

- T1.3 phone composer no canvas → DOM bbox sample vs PNG fallback (next-iter design call)
- BASELINE_WR.cautious update post empirical N=40 (default 0.85 placeholder)

**Day 5 (2026-05-11) iter3 schedule confermato per OD-021** (invariato).

### ✅ Phase A Day 3/7 trigger autonomous — sessione 2026-05-08 sera — 14 PR shipped (closure final)

Phase A LIVE Day 3/7 trigger autonomous (OD-021 schedule label `2026-05-09`, execution UTC `2026-05-08`). Master-dd weekend playtest signal **ABSENT** (12+h silenzio post Day 2/7 closure #2116). Cascade ~3.5h cumulative: synthetic iter2 + normalize chip + evo-swarm distillation + OD-022 add + triage + Skiv admin + closure cumulative + OD audit + completionist enrichment + final closure + multi-action + master-dd cross-repo + coordination + final-final.

| #   | PR                                                       | SHA        | Topic                                                                                           |
| --- | -------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------- |
| 1   | [#2118](https://github.com/MasterDD-L34D/Game/pull/2118) | `27dc92e6` | Phase B synthetic supplement iter2 (15/16 PASS 39.8s, ZERO regression Day 1→2→3)                |
| 2   | [#2108](https://github.com/MasterDD-L34D/Game/pull/2108) | `1cfd7220` | evo-swarm run #5 distillation merge (honesty pass shipped pre-merge: 7/13 hallucinated flagged) |
| 3   | [#2119](https://github.com/MasterDD-L34D/Game/pull/2119) | `0423001a` | Normalize chip Day 3 drift: handoff date label + PR count gh ground truth + CLAUDE.md sprint    |
| 4   | [#2120](https://github.com/MasterDD-L34D/Game/pull/2120) | `9d57a2c5` | OD-022 add: evo-swarm pipeline cross-verification gate pre run #6 (~7-9h Sprint Q+ candidate)   |
| 5   | [#2121](https://github.com/MasterDD-L34D/Game/pull/2121) | `1ee6fd94` | Triage run #5 5/7 questions closed via canonical grep (~25min, 2 deferred Sprint Q+)            |
| 6   | [#2117](https://github.com/MasterDD-L34D/Game/pull/2117) | `2656640c` | Skiv Monitor auto-update admin merge (canonical pattern post #2115 lesson)                      |
| 7   | [#2122](https://github.com/MasterDD-L34D/Game/pull/2122) | `95ac1ef3` | Closure cumulative: BACKLOG + COMPACT + CLAUDE.md + memory + handoff fill TBDs                  |
| 8   | [#2123](https://github.com/MasterDD-L34D/Game/pull/2123) | `bec82f12` | OD audit cleanup OD-016 sposta Aperte→Risolte + OD-022 cross-link (drift, corrected by #2125)   |
| 9   | [#2125](https://github.com/MasterDD-L34D/Game/pull/2125) | `e6e0ba0a` | Completionist enrichment + museum card M-2026-05-08-001 + lesson codify CLAUDE.md               |
| 10  | [#2126](https://github.com/MasterDD-L34D/Game/pull/2126) | `35c1ca31` | Final closure TBD fill + count audit fresh post #2125                                           |
| 11  | [#2129](https://github.com/MasterDD-L34D/Game/pull/2129) | `62cd6b60` | Multi-action: A pre-design preview + B+D+E findings + aggregate doc                             |
| 12  | [#2127](https://github.com/MasterDD-L34D/Game/pull/2127) | `c2e21551` | Skiv Monitor auto-update admin merge (cascade)                                                  |
| 13  | [#2128](https://github.com/MasterDD-L34D/Game/pull/2128) | `20dda146` | Master-dd cross-repo `.ai/GLOBAL_PROFILE.md` CO-02 v0.3 canonical_refs MANDATORY                |
| 14  | [#2130](https://github.com/MasterDD-L34D/Game/pull/2130) | `b492cdd6` | Sprint Q+ kickoff coordination + OD-022 implicit accept                                         |

**Closed senza merge**: #2124 (revert direction wrong, anti-completionist — preserved come learning case in PR thread).

**Test baseline post-cascade**: Tier 1 phone smoke 15/16 + 1 skip in 39.8s = ZERO regression Day 1 → Day 2 → Day 3. CI Game/ + Godot v2 main verde 5/5.

**Pillar deltas**: invariati 5/6 🟢++ + 2/6 🟢 cand (P2 + P4 unchanged).

**Outstanding master-dd action items** (5 RISOLTA + 1 IMPLICIT ACCEPT post-Day-3-sera):

- OD-017 Phase B trigger downgrade nice-to-have ✅ RISOLTA Day 2
- OD-018 Tier 2 PlayGodot OVERRIDE kill-60 ✅ RISOLTA Day 2
- OD-019 Skiv Monitor Option A ✅ RISOLTA Day 2
- OD-020 Sprint Q+ FULL deep scope ✅ RISOLTA Day 2 (gated post-Phase-B-accept)
- OD-021 Continuous monitoring Day 3+5+7 ✅ RISOLTA Day 2
- **OD-022 evo-swarm cross-verification gate pre run #6 ✅ IMPLICIT ACCEPT Day 3/7 sera** (cross-repo evidence convergente: master-dd #2128 swarm-side + Claude #2129 Game-side pre-design). Status: CANDIDATE-RIPE post-Phase-B-accept. Bundle Sprint Q+ kickoff (~5-6h Game-side residue). Vedi `docs/planning/2026-05-08-sprint-q-kickoff-coordination.md`.

**Net actionable run #5 per data integration immediate = ZERO** (Claude triage autonomous judgment). 5/13 verified consistency-minor (specie esistenti grep-confirmed) potrebbero avere valore non-data-integration **pending master-dd review** — criteri possibili: baseline pipeline metric ("swarm sa mappare canonical"), pattern reference, doc audit. 8/13 hallucinated + 2 redundant **discarded preserved** in [museum card M-2026-05-08-001](docs/museum/cards/evo-swarm-run-5-discarded-claims.md). OD-022 gate Sprint Q+ candidate.

**Day 5 (2026-05-11) iter3 schedule confermato per OD-021**.

### 🟢 Worktree cleanup post-Phase-B-accept — deferred (~10min userland)

8 worktree stale residue locali (eloquent-gagarin-db4e3f current preserved):

- `bold-wiles-5b8e81` (docs/memory-save-day2-sprint-m7-chip)
- `charming-mahavira-c45d4c` (docs/session-2026-05-07-sera-memory-save)
- `dazzling-mirzakhani-20117a` (docs/adr-2026-05-05-accepted-phase-a-pending-validation)
- `interesting-moore-8eddcc` (docs/closure-session-2026-05-06-wave-6-full-recap)
- `peaceful-chaplygin-b74aa4` (docs/memory-save-audit-14-15-closure)
- `practical-gauss-954b86` (claude/practical-gauss-954b86)
- `vibrant-faraday-472863` (claude/vibrant-faraday-472863)

Handoff §"Cleanup eseguito 2026-05-07" notes "left intact (claudia/handoff branches active)". Verify post-Phase-B accept (2026-05-14+) se branches ancora needed o safely removable. Comando:

```bash
git worktree remove .claude/worktrees/<name>
git branch -D <branch-name>  # se branch fully merged + pushed
```

Trigger: post-Phase-B-accept verdict master-dd. Pre-req: verify ogni branch fully merged main via `gh pr list --search "head:<branch> is:merged"`.

### ✅ Phase A Day 2/7 monitoring — sessione 2026-05-08 — 4 PR shipped autonomous

Phase A LIVE Day 2/7 monitoring window 2026-05-08. Master-dd silenzioso (no playtest signal). Claude autonomous research-only scoping + RCA + synthetic supplement.

| #   | PR                                                       | SHA        | Topic                                                                      |
| --- | -------------------------------------------------------- | ---------- | -------------------------------------------------------------------------- |
| 1   | [#2109](https://github.com/MasterDD-L34D/Game/pull/2109) | `66bfc200` | Sprint Q+ GAP-12 LineageMergeService ETL scoping (design-only, NO impl)    |
| 2   | [#2110](https://github.com/MasterDD-L34D/Game/pull/2110) | `009c812c` | Tier 2 PlayGodot integration prep — kill-60 verdict reject (research-only) |
| 3   | [#2111](https://github.com/MasterDD-L34D/Game/pull/2111) | `3c588278` | Skiv Monitor scheduled fail RCA + 4-option fix menu                        |
| 4   | [#2112](https://github.com/MasterDD-L34D/Game/pull/2112) | `c4515b31` | Phase B synthetic supplement iter1 (Tier 1 fresh capture localhost)        |

**Pillar deltas**: zero regression Day 1→Day 2. Phase A LIVE stable confirmed.

**Outstanding master-dd action items** (5 nuove decisioni — vedi `OPEN_DECISIONS.md`):

- OD-017 Phase B trigger 2/3 Option α/β/γ
- OD-018 Tier 2 PlayGodot kill-60 accept/reject
- OD-019 Skiv Monitor fix Option A/B/C/D
- OD-020 Sprint Q+ pre-kickoff 5 sub-decisione (gated post-Phase-B)
- OD-021 Continuous synthetic monitoring Day 3-7 schedule

### 🟢 STALE TICKET CLEANUP — closed/superseded post Phase A LIVE 2026-05-07

Cleanup batch 2026-05-08. Ticket pre-pivot e pre-Phase-A-LIVE marcati closed/superseded:

- [x] ~~**Sprint M.1 Game-Godot-v2 bootstrap**~~ → **✅ CHIUSO 2026-04-29→2026-05-07** Game-Godot-v2 repo created, Godot 4.x installed, Sprint M-N-O-P-Q-R progressivamente shipped (audit godot-surface-coverage 14/15 closed Day 2 2026-05-07).
- [x] ~~**Master-dd input Sprint M.5 race condition diagnose**~~ → **✅ SUPERSEDED 2026-05-07** Phase A LIVE cutover Godot v2 = web stack v1 race conditions OBSOLETE (web v1 archive deferred Phase B). NON applicable.
- [x] ~~**🚫 BLOCKED Sprint G.2b BG3-lite Plus movement layer**~~ → **❌ FORMAL ABORT 2026-04-29 sera** post-pivot Godot decision. ADR-2026-04-29-pivot-godot-immediate. Godot v2 native 2D = zero porting effort.
- [x] ~~**🚫 BLOCKED TKT-M11B-06 playtest userland**~~ → **✅ SUPERSEDED 2026-05-07** Phase B trigger 2/3 (OD-017) replace. Playtest scope = full social 4 amici + master-dd post-cutover Godot v2.
- [x] ~~**Playtest round 2 PR #1730 retest**~~ → **❌ OBSOLETE 2026-04-29** post-pivot Godot. Web v1 archive Phase B target. Narrative log prose feature M18+ deferred (gap non-bug, post-pivot reframe).
- [x] ~~**🛑 PIVOT GODOT 2026-04-29 sera** Sprint Fase 1 chiusa~~ → **✅ DONE 2026-05-07** Phase A LIVE cutover ACCEPTED ([PR #2088](https://github.com/MasterDD-L34D/Game/pull/2088) `7247656`). Web stack v1 secondary fallback, Godot v2 phone HTML5 primary.

### ✅ Cascade auto-merge L3 sessione 2026-05-07 sera — 4 PR shipped ~17min

**User formal authorization** 2026-05-07 sera grant L3 blanket auto-merge codified [`ADR-2026-05-07-auto-merge-authorization-l3`](docs/adr/ADR-2026-05-07-auto-merge-authorization-l3.md). 7 safety gate verification mandatory pre-merge.

| #   | PR                                                              | Repo     | SHA        | Topic                                                      |
| --- | --------------------------------------------------------------- | -------- | ---------- | ---------------------------------------------------------- |
| 1   | [#209](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/209) | Godot v2 | `87dd88df` | Lint debt cleanup main.gd 1101→999                         |
| 2   | [#2101](https://github.com/MasterDD-L34D/Game/pull/2101)        | Game/    | `98dbf058` | Plan v3.2 final close 8/8 P1 + 3/3 P2 + sentience T4 audit |
| 3   | [#2103](https://github.com/MasterDD-L34D/Game/pull/2103)        | Game/    | `6a3880ef` | Auto-merge L3 ADR codify                                   |
| 4   | [#208](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/208) | Godot v2 | `29640c5f` | GAP-10 AiProgressMeter wire (P5 🟢→🟢++)                   |

**Pillar deltas**:

- P5 Co-op vs Sistema 🟢 → 🟢++ (Sistema escalation HUD top-strip live)
- meta plan v3.2 audit synthesis 100% closed
- policy auto-merge L3 ATTIVO

**Phase A Day 1/7 monitoring**: Godot v2 main CI hygiene blocker resolved (#209 unblocks 5 consecutive lint failures post-#205).

### 🛑 PIVOT GODOT 2026-04-29 sera — Sprint Fase 1 CHIUSA (web stack co-op race conditions UNRESOLVED, pivot Godot immediate)

**Decision-altering**: ADR-2026-04-29-pivot-godot-immediate.md + master-execution-plan-v3.md SHIPPED. Path B accelerated cap. 22 PR mergiati main preserved come reference port Godot. Sprint G.2b BG3-lite Plus + A1 rubric + Sprint H + Sprint I DEPRECATED post-pivot.

### ✅ Plan v3.2 gap audit shipped 2026-04-30 — PR #2026 merged main `e8967285`

**Scope**: P0 fix plan v3 (line 305 ADR-19 contraddizione, counts inflated 60+→14 enc + 100+→15 species, Sprint N gate P3+P5 row 10/10 verdict). NEW ADR-2026-04-30 pillar promotion criteria (tier ladder formal). NEW gap audit synthesis 3 agent paralleli (~30 gap classified, 4 P0 fixed, 8 P1 + 3 P2 actionable). **STATUS FINAL 2026-05-07**: 100% P0+P1 closed (8/8) + 100% P2 actionable closed (P2.1+P2.2+P2.4) + P2.3 sentience T4 audit completed (2 candidate proposed, ADR deferred post-cutover Phase B). Synthesis doc → archive status post 2026-05-14.

**P1 deferred plan v3.3** — TUTTI CHIUSI ✅ (8/8):

- [x] ~~**§Sprint O combat services 16+ port matrix**~~ → **✅ CHIUSO 2026-05-06** [PR #2076](https://github.com/MasterDD-L34D/Game/pull/2076) squash `b8a666f5`. 28 combat services classificati Tier A (10 mandatory N.7 GATE 0, ~36-40h) + Tier B (10 recommended Sprint Q ETL, ~22h) + Tier C (8 optional Sprint R+, ~10h). Codex P2 catch traitEffects.js misclassified (root services/, NOT combat/) → swap timeOfDayModifier.js. Fix `01286f0d` squashed in.
- [x] ~~**§Sprint R 26 routes HTTP backend whitelist**~~ → **✅ CHIUSO 2026-05-06** [PR #2076](https://github.com/MasterDD-L34D/Game/pull/2076). 27 routes Tier A (7) + B (10) + C (9). HTTPClient adapter spec con Result[T,Error] + retry/backoff. Codex P2 catch unversioned mounts (companion/diary/skiv use `/api/*` only) + `/api/auth` doesn't exist (rimosso Tier A).
- [x] ~~**§Sprint O.4 8 AI services list**~~ → **✅ CHIUSO 2026-05-06** [PR #2076](https://github.com/MasterDD-L34D/Game/pull/2076). 8 AI services + Beehave 6-archetype expand. Total ~21-25h.
- [x] ~~**ADR drop HermeticOrmus formal**~~ → **✅ CHIUSO 2026-05-06** [ADR-2026-05-06](docs/adr/ADR-2026-05-06-drop-hermeticormus-sprint-l.md). Sprint L DROP formal, plan v3.3 effort -2g.
- [x] ~~**Sprint S Mission Console deprecation row**~~ → **✅ CHIUSO 2026-05-06** plan v3 §Sprint S checklist updated con riga deprecation + nota inline rationale.
- [x] ~~**Path drift correction table**~~ → **✅ CHIUSO 2026-05-06** audit grep: solo `data/skiv/` drift reale (2 ref attivi fixati: `docs/planning/2026-04-28-godot-migration-strategy.md:145` + `data/core/narrative/beats/skiv_pulverator_alliance.yaml:4` → `docs/skiv/CANONICAL.md`). Altri 3 path (ennea_voices + terrain_defense + ai_profiles) canonical correct, false-alarm.
- [x] ~~**§Sprint M.3 7 silhouette spec addendum**~~ → **✅ CHIUSO 2026-05-06** addendum in `docs/core/41-ART-DIRECTION.md §Job-to-shape silhouette spec` (canonical path è 41 non 22). 7 job × archetype base + key marker + frame budget +2/+3 + override scene `.tres`. Sprint M.3 Godot import pronto.
- [x] ~~**§Sprint N.5 accessibility parity bullet**~~ → **✅ CHIUSO 2026-05-06** [PR #2076](https://github.com/MasterDD-L34D/Game/pull/2076). Spec colorblind shape encoding + aria-label tooltip + prefers-reduced-motion (Global flag, OS env auto-detect). Sprint N.6 impl wave.
- [x] ~~**Pre-Sprint M.1 quick wins ~3h (P1.8)**~~ → **✅ CHIUSO ABORT 2026-05-07** [ADR-2026-05-07](docs/adr/ADR-2026-05-07-abort-web-quickwins-reincarnate-godot.md). 3 web stack v1 quick wins (TKT-MUTATION-P6-VISUAL + Thought Cabinet 8-slot + QBN debrief) ABORT post-pivot Godot. Re-incarnate target Godot v2 audit GAP-5 MissionTimer + GAP-7 PassiveStatusApplier + GAP-10 AiProgressMeter (Sprint M.7 chip post Phase A stable). GAP-9 already shipped Godot v2 [PR #203](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/203).
- [x] ~~**Sprint M.7 chip reincarnate ADR-2026-05-07-abort-web 3/3**~~ → **✅ CHIUSO 2026-05-07 Day 2/7** Phase A. GAP-10 AiProgressMeter [PR #208 Godot v2](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/208) `29640c5f` (sera) + GAP-7 PassiveStatusApplier [PR #210 Godot v2](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/210) `c89f7bfd` + GAP-5 MissionTimer [PR #211 Godot v2](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/211) `db745302`. Pillar P3 🟢ⁿ → 🟢++ + P5 🟢 → 🟢++ + P6 🟢 cand → 🟢++. GUT 1925/1925 baseline, format + gdlint clean.
- [x] ~~**Surface debt audit residuo 5/5 GAP-3+6+8+13+14**~~ → **✅ CHIUSO 2026-05-07 Day 2/7 sera** Phase A. 3 PR cascade L3: GAP-3+6+14 bundle [PR #212](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/212) `0b954949` + GAP-8 SgTracker live bar [PR #213](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/213) `0ccd8697` + GAP-13 lifecycle phase label [PR #214](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/214) `925933fe`. 5/6 pillar 🟢++ rinforzati (P1 telegraph + P3 lifecycle/time + P5 SG live + P6 defender). GUT 1957/1957, +32 cumulative Day 2 sera.
- [x] ~~**Audit godot-surface-coverage closure 14/15 (P2 GAP-11)**~~ → **✅ CHIUSO 2026-05-07 Day 2/7 tarda sera** Phase A. GAP-11 PseudoRng miss-streak compensation wire [PR #215](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/215) `42307516`. P6 🟢++ rinforzato (anti-frustration tilt). GUT 1964/1964, +7 GAP-11. **Audit closure 14/15** (GAP-12 LineageMergeService P2 deferred Sprint Q+ — requires bond_path + offspring pipeline).

**P2 actionable** — TUTTI CHIUSI ✅ (3/3):

- [x] ~~**§Sprint P bond reactions + Skiv crossbreeding (P2.1)**~~ → **✅ CHIUSO 2026-05-07** verified Sprint P closure W7.x bundle. BeastBondReaction wire pre-#37 `1172819` + propagateLineage runtime #63 `c8473cd` + caller wire W7.x #127 `2d929c7`. Zero gap residual.
- [x] ~~**§Sprint N.5 accessibility parity (P2.4)**~~ → ✅ vedi sopra (PR #2076).
- [x] ~~**Ennea archetypes UI surface (P2.2)**~~ → **✅ CHIUSO 2026-05-07** Godot v2 [PR #203](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/203) `5d098e7b` (GAP-2 debrief view top archetype) + [PR #204](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/204) `194a68da` (D3 expand toggle full 9 list).

**P2.3 sentience T4 audit** — completed 2026-05-07 (T4=0 confirmed, 46 species across 2 catalog file). Distribution T0:2 / T1:23 / T2:15 / T3:3 / T4:**0** / T5:3. Bridge gap T3→T5. Candidate A `umbra_alaris` (Playable, Skiv-bond ritual T3→T4 trigger) + Candidate B `terracetus_ambulator` (Keystone, legacy ritual T3→T4 trigger). ADR formal deferred post-cutover Phase B + 1+ playtest. Default fallback no signal entro 2026-06-01: promote A only. Synthesis: [`docs/research/2026-04-30-gap-audit-plan-v3-2-synthesis.md §P2.3`](docs/research/2026-04-30-gap-audit-plan-v3-2-synthesis.md).

### ✅ Coop WS audit 6/6 closed 2026-05-06 — gap matrix complete

3 PR shipped main close audit `docs/reports/2026-05-06-coop-phase-ws-audit.md`. Harness 18 PASS / 0 FAIL / 0 GAP. 5/5 lifecycle action drained server-side (character_create + form_pulse_submit + lineage_choice + reveal_acknowledge + next_macro).

- [x] ~~**TKT-P5-WS-FORM-PULSE-DRAIN**~~ → **✅ CHIUSO 2026-05-06** [PR #2073](https://github.com/MasterDD-L34D/Game/pull/2073) squash `9f24791c`. `coopOrchestrator.submitFormPulse` + `formPulseList()` + `formPulses` Map mirror voteWorld pattern. +4 unit test (W4 series). Codex P2 #2073: host filter (excluding hostId from allPids) → fix `26758887` squashed in.
- [x] ~~**TKT-P5-WS-NEXT-MACRO-DESIGN**~~ → **✅ CHIUSO 2026-05-06** [PR #2075](https://github.com/MasterDD-L34D/Game/pull/2075) squash `19fccaad`. Design verdict: host-only post-debrief macro {advance, branch, retreat}. retreat forces phase=ended. +5 unit test. Codex P2 #2075: phase gate widen `world_setup` (post-auto-advance edge) → fix `3b820153` squashed in.

### ✅ Sprint M.6 Phase B Godot port shipped 2026-05-06

- [x] ~~**Sprint M.6 Phase B — phone_onboarding_view BASE port (Godot)**~~ → **✅ CHIUSO 2026-05-06** [PR #193 Game-Godot-v2](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/193) squash `9105c169`. Backend Phase A live (PR #2071). Frontend port: `phone_onboarding_view.gd` ~280 LOC + `PhoneOnboardingView.tscn` 3-stage Control + `phone_composer_view.gd` MODE_ONBOARDING + payload bind + `coop_ws_peer.gd` 3 dedicated signal + 18 GUT test. **3 round Codex P2 review** all addressed: round 1 retryable choices (`b28d00c`) + round 2 countdown reset + non-host transition (`0415239`) + round 3 defer phase_change swap until transition_complete (`50d28e7`). Total 758 insertions. 64/64 GUT pass + gdformat + gdlint clean.

### Userland (richiede azione umana)

- [x] ~~**Deep research analysis** (NEW session)~~ → **✅ CHIUSO 2026-04-28 sera** PR #1996.
- [x] ~~**Sprint G v3 Legacy Collection asset swap**~~ → **✅ CHIUSO 2026-04-29** PR #2002 (Ansimuz CC0 47 PNG re-import Godot Sprint M.3).
- [x] ~~**Spike POC BG3-lite**~~ → **✅ CHIUSO 2026-04-29** PR #2003 (Tier 1 frontend, archive web-v1-final post-pivot, native Godot 2D 0 effort).
- [x] ~~**Rubric launcher desktop suite**~~ → **✅ CHIUSO 2026-04-29** PR #2007 (DEPRECATED post-pivot, archive web-v1-final).
- [x] ~~**A1 Master-dd rubric session Spike POC BG3-lite**~~ → **❌ FORMAL ABORT 2026-04-29 sera** post-pivot Godot decision. No tester recruited. Reasoning: web stack co-op race conditions cascade architecturally broken (7-PR fix #2016-#2022 NOT enough), rubric value zero gating G.2b decision-binary (G.2b DEPRECATED post-pivot anyway).
- [ ] **NEW — Phase B trigger 2/3 master-dd action** (Option α full social ~1-2h | β solo hardware ~30min | γ synthetic only ❌ NON satisfies). Vedi OD-017. Window 7gg termina 2026-05-14. Default proposed: Option α weekend 2026-05-10/11.
- [ ] **NEW — Skiv Monitor fix master-dd action** Option A repo setting toggle (30s 1-click). Vedi OD-019. Restore pre-2026-04-25 verde state.

**Stale ticket marcati closed/superseded sopra in §"STALE TICKET CLEANUP"** (Sprint M.1 + Sprint M.5 race + Sprint G.2b BG3-lite Plus + TKT-M11B-06 + Playtest round 2 + Pivot Godot tutti chiusi).

### Sprint Fase 1 — TUTTI CHIUSI ✅ (10 PR ondata 3+ shipped 2026-04-28/29)

- [x] ~~**Action 4 Sprint M.7 doc re-frame DioField**~~ → **✅ CHIUSO 2026-04-29** PR #1997.
- [x] ~~**Action 5a Injury severity stack** + **Action 5b Slow_down trigger expanded**~~ → **✅ CHIUSO 2026-04-29** PR #1999. Severity enum light/medium/severe + slow_down trigger panic/confused/bleeding≥medium/fracture≥medium. 31/31 test verde + AI 382/382 zero regression. P6 🟡 → 🟢 candidato.
- [x] ~~**Action 7 CT bar visual lookahead 3 turni**~~ → **✅ CHIUSO 2026-04-29** PR #1998. `apps/play/src/ctBar.js` NEW module + 28 test verdi + AI 382/382 zero regression. P1 🟢 → 🟢++.
- [x] ~~**Action 1 Sprint M.4b reference codebase study**~~ → **✅ CHIUSO 2026-04-29** PR #2001. `docs/research/2026-04-28-srpg-engine-reference-extraction.md` shipped (4 repos studiati: Project-Tactics + nicourrea/Tactical-RPG + OpenXcom + Lex Talionis).
- [x] ~~**Action 2 Sprint N.4 pre-read tactical AI**~~ → **✅ CHIUSO 2026-04-29** PR #2000. `docs/research/2026-04-28-tactical-ai-archetype-templates.md` shipped (Battle Brothers AI + XCOM:EU postmortem + 3 archetype Beehave templates: vanguard / skirmisher / healer).
- [x] ~~**Action 3 Sprint N gate row failure-model parity + N.7 spec**~~ → **✅ CHIUSO 2026-04-29** PR #2005. Master plan v2 §Sprint N gate row MANDATORY 5/5 + `docs/planning/2026-04-29-sprint-n7-failure-model-parity-spec.md` (WoundState.gd + LegacyRitualPanel.gd Godot impl deferred Sprint M.1).
- [x] ~~**Action 6 Ambition seed Skiv-Pulverator alleanza**~~ → **✅ CHIUSO 2026-04-29** PR #2004. `data/core/campaign/ambitions/skiv_pulverator_alliance.yaml` + `apps/backend/services/campaign/ambitionService.js` + `apps/play/src/ambitionHud.js` + `apps/play/src/ambitionChoicePanel.js` + 10 test verdi + AI 382/382 zero regression. P2 🟢 def → 🟢++ + P5 🟡 → 🟢 candidato.

### Sprint Fase 1 ondata 4 follow-up — TUTTI CHIUSI ✅ (6 PR 2026-04-29 post launcher suite)

- [x] ~~**fix(ai) ai_profile preserve in normaliseUnit**~~ → **✅ CHIUSO 2026-04-29** PR #2008 (`83f26050`). PR #1495 bot review P1 risolto. Side-effect: expone bug latente Utility AI oscillation (vedi #2013 below).
- [x] ~~**ERMES drop-in self-install E0-E6**~~ → **✅ CHIUSO 2026-04-29** PR #2009 (`2259634e`). `prototypes/ermes_lab/` modulo isolato (sim deterministica + JSON eco_pressure_report + experiment loop scoring). E7-E8 future runtime/foodweb deferred post-playtest + ADR.
- [x] ~~**governance registry ERMES planning docs**~~ → **✅ CHIUSO 2026-04-29** PR #2010 (`8b5d4ab9`). Frontmatter compliance.
- [x] ~~**asset-creation-workflow 3-path canonical**~~ → **✅ CHIUSO 2026-04-29** PR #2011 (`8acc7389`).
- [x] ~~**fix(ai) utilityBrain oscillation root cause**~~ → **✅ CHIUSO 2026-04-29** PR #2013 (`0fdd2853`). 3 root cause compounding: (1) faction key mismatch `team` vs `controlled_by` PRIMARY (2) multiplicative scoring annihilation SECONDARY (3) action-agnostic considerations TERTIARY. Re-enable `aggressive.use_utility_brain: true`. AI 384/384 verde + utility 23/23 verde. Doc: `docs/reports/2026-04-29-utility-ai-oscillation-bug.md`.
- [x] ~~**Workspace locale (out-of-repo) section asset workflow**~~ → **✅ CHIUSO 2026-04-29** PR #2014 (`6a9bcc43`).

### Future-proof deferred M12+

- [ ] **TKT-FUTURE-REPLAY-INFRASTRUCTURE M12+** — session replay storage tie-in telemetry pipeline. Trigger: post Sprint G.2b ship + post-playtest bug analysis. Synthetic test 10 scenari hardcoded sufficient ora (vedi `tests/services/areaCovered.test.js`).

### Autonomous (Claude Code può fare)

- [x] ~~**Sprint 13 Status engine wave A — passive ancestor producer wire**~~ → **✅ CHIUSO 2026-04-28** branch `claude/sprint-13-status-engine-wave-a`. Pre-Sprint 13: `statusModifiers.js` consumer LIVE (computeStatusModifiers + applyTurnRegen, 7 statuses) MA producer side DEAD: `traitEffects.js:226` `passesBasicTriggers` returns false per `action_type: passive` → 297 ancestor batch traits MAI eseguono → unit.status[X] sempre 0 → consumer engine vede niente. Helper backend nuovo `apps/backend/services/combat/passiveStatusApplier.js` (pure: `applyPassiveAncestors(unit, registry)` + `applyPassiveAncestorsToRoster` + `passiveStatusSpec` + `collectTraitIds`). Filter Wave A statuses (linked/fed/healing/attuned/sensed/telepatic_link) + `PASSIVE_BLOCKLIST=['frenzy']` (rage 2-turn canonical, no auto-permanent). Default turns 99 (effectively-permanent vs decay loop). Idempotent max-policy. Wire `apps/backend/routes/session.js /start` (initial wave dopo lineage inheritance) + `apps/backend/routes/sessionRoundBridge.js applyEndOfRoundSideEffects` (refresh wave pre regen+decay per traits gained mid-encounter via mating/recruit/evolve). Frontend extends `apps/play/src/render.js STATUS_ICONS` registry con 7 nuove entry (∞ linked gold / ◍ fed brown / ✚ healing green / ⌬ attuned cyan / ⊙ sensed purple / ⚹ telepatic_link violet / ᛞ frenzy red, esistente `drawStatusIcons` auto-itera). 27/27 test nuovi (`tests/services/passiveStatusApplier.test.js`) + AI 382/382 baseline + statusModifiers existing 13/13 = 422/422 zero regression. Format + governance verdi. **End-to-end integration verificato** via direct node: `ancestor_comunicazione_cinesica_cm_01` (CM 01 wiki source) → unit.status.linked = 2 → computeStatusModifiers emette `+1 attack_mod (ally adjacent)`. **Recupera 297 ancestor batch ROI** dormant (single largest single-sprint ROI batch). Producer/consumer separation chiusa.
- [x] ~~**Sprint 12 Mating lifecycle wire (§C.2 Surface-DEAD #4 — engine LIVE surface DEAD killer)**~~ → **✅ CHIUSO 2026-04-28** branch `claude/sprint-12-mating-lifecycle-wire`. Engine LIVE in `metaProgression.js` (`rollMatingOffspring` + `canMate` + offspringRegistry da PR #1879) era invisibile in player loop. Helper backend nuovo `apps/backend/services/mating/computeMatingEligibles.js` (pure: `filterPlayerSurvivors` + `pairCombinations` n-choose-2 + cap 6 + opzionale `metaTracker.canMate()` gate graceful con fallback permissivo on throw). Wire `apps/backend/services/rewardEconomy.js` `buildDebriefSummary` emette `mating_eligibles[]` solo on victory + best-effort require pattern (mirror QBN narrativeEvent Sprint 10). Module frontend nuovo `apps/play/src/lineagePanel.js` (pure `formatLineageCard` + `formatLineageList` con XSS escape + side-effect idempotent `renderLineageEligibles`). Reuse `iconForBiome` + `labelForBiome` da `biomeChip.js`. Plural offspring label quando count>1. Wire frontend: `debriefPanel.js` HTML slot `<div id="db-lineage-section">` + `<div id="db-lineage-list">` + import + `setLineageEligibles` setter API + `renderLineage()` registered in render() (gated outcome non-defeat). `phaseCoordinator.js` pipe `bridge.lastDebrief.mating_eligibles` → `dbApi.setLineageEligibles(...)` quando phase 'debrief'. CSS gold pair-bond card (linear-gradient + serif italic + offspring badge gold border + biome chip caps). 38/38 test nuovi (19 backend + 19 frontend) + AI 382/382 zero regression. Format + governance verdi. Smoke E2E preview limitazione worktree-path mismatch (Vite serve da repo principale) → validazione end-to-end via direct node integration test (buildDebriefSummary mock session emits 1 pair eligible biome=savana can_mate=true, defeat path → empty array). **§C.2 Surface-DEAD sweep: 7/8 chiusi** (residuo solo #3 Spore mutation dots ~15h authoring esterno). **Pillar P2 🟢 def → 🟢++** (ciclo Nido→pair-bond→offspring visibile post-encounter).
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

### Audit 2026-05-05 — pre-cutover cleanup tickets

> **Source**: `docs/reports/2026-05-05-repo-audit-static-scan.md` — Phase 3 triage.
> **Shipped 2026-05-05**: PR [#2058](https://github.com/MasterDD-L34D/Game/pull/2058) (Game/) + [#177](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/177) (Godot v2).

- [x] ~~**TKT-SERVICES-ORPHAN**~~ → **✅ CHIUSO PR #2058** — deleted `aiPersonalityLoader.js` (121 LOC) + `sistemaActor.js` (zero callers).
- [x] ~~**TKT-SPECIES-BIOME-AFFINITY-FIX**~~ → **✅ CHIUSO PR #2058** — 10 species `biome_affinity` → canonical biome slugs. `isPerfectMatch()` now eligible for all 15 species.
- [x] ~~**TKT-GODOT-AI-STUB-DROP**~~ → **✅ CHIUSO PR #177** — `sistema_turn_runner.gd` Tier 3 abandoned.
- [x] ~~**TKT-GATE5-ENNEAEFFECTS**~~ → **✅ CHIUSO PR #2058** — Gate 5 exemption documented (telemetry/vcScoring surface).
- [x] ~~**TKT-GATE5-EVENTCHAIN**~~ → **✅ CHIUSO PR #2058** — Gate 5 exemption documented (design-complete infra, M18+ trigger).
- [x] ~~**TKT-GATE5-SPECIESWIKI**~~ → **✅ CHIUSO PR #2058** — Gate 5 exemption documented (dev-tooling).
- [x] ~~**TKT-GATE5-CONVICTION**~~ → **✅ CHIUSO PR #2058** — Deprecated: route+service+tests deleted (zero FE callers, Godot cutover in progress). vcScoring conviction_badge unaffected.
- [x] ~~**TKT-TRAITS-ANCESTOR-BUFF-STAT**~~ → **✅ CHIUSO PR #2058** — `evaluateMovementTraits` added to `traitEffects.js`. Wired in `session.js` move handler: `apCost = max(1, dist - move_bonus)`. 51 ancestor locomotion traits now reduce AP cost. 9 new tests verde.
- [x] ~~**TKT-RULES-SIMULATE-BALANCE**~~ → **✅ CHIUSO PR #2058** — `tools/py/simulate_balance.py` deleted. Unblocks `services/rules/` Phase 3 removal.
- [x] ~~**TKT-RULES-PHASE-3-REMOVAL**~~ → **✅ CHIUSO 2026-05-05** branch `chore/services-rules-phase-3-removal`. Deleted `services/rules/` (8 file Python) + 7 test Python (resolver/hydration/round_orchestrator/trait_effects/demo_cli/grid/master_dm_parser) + `tests/server/rules-bridge.spec.js` + `tools/py/master_dm.py` + `tools/py/mark_python_rules_deprecated.py`. Patched `gen_trait_types.py` (drop PY codegen, mantenuto TS+Schema). YAML comments + CLAUDE.md + combat hub + ADR-2026-04-19 status → CLOSED. ADR-2026-04-13 superseded.

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
- [x] ~~**TKT-MUSEUM-SKIV-VOICES (P1 autonomous)**~~ → **✅ CHIUSO 2026-05-05** PR #2061 (`d16cd941`) Type 5+7 + estensione 9/9 (Riformatore/Coordinatore/Conquistatore/Individualista/Lealista/Cacciatore/Stoico). 9 palette × 7 beat = ~189 line totali. Selector + endpoint `GET /api/session/:id/voice` + telemetry `ennea_voice_type_used`. P4 🟡++ → 🟢 candidato (9/9 archetype voice live).
- [x] ~~**TKT-MUTATION-P6-VISUAL**~~ → **✅ CHIUSO 2026-05-05** branch `feat/mutation-aspect-token`. `visual_swap_it` 36/36 (pre-shipped #711619e7) + `aspect_token` 36/36 backfill deterministico (`claws_glacial`/`wings_resonant`/etc.) + `tools/py/lint_mutations.py` esteso enforcement entrambi field + `apps/play/src/render.js` ASPECT_TOKEN_OVERLAY 4 → 36 token (glyph alphabet ◆▲◇◉✦❄◊▼⬢◈⌬☉ + colori thematic). Gate 5 surface live (player vede glifo overlay per ogni mutation). Card [M-2026-04-26-001](docs/museum/cards/evolution_genetics-voidling-bound-patterns.md) reuse_path Moderate complete.
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

### Deferred decisions (gated post-playtest)

- [ ] **Colyseus adoption** — verdetto 2026-04-28 NO ora. Riapri SOLO se TKT-M11B-06 playtest live mostra trigger soglia (state broadcast lag >10KB, stanze concorrenti >50, host drop UX rotto, reconnect replay needed). Se nessun trigger → close decisione "ws native canonical". Vedi addendum 2026-04-28 in `docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md`.

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

**2026-05-06** (Wave 1-4 + closure bundle — 5 PR shipped main, 7 gap audit close):

- ✅ **Wave 1 docs sweep** PR [#2065](https://github.com/MasterDD-L34D/Game/pull/2065) (`42727de3`):
  - ADR-2026-05-06-drop-hermeticormus-sprint-l.md shipped — Sprint L formal DROP, plan v3.3 effort -2g.
  - Path drift correction: solo `data/skiv/` reale (2 ref fixati → `docs/skiv/`). Altri 3 path canonical.
  - COMPACT_CONTEXT v23 → v24, BACKLOG audit log entry, gap audit §P1.4 + §P1.6 CLOSED.
- ✅ **Wave 2 governance batch** PR [#2066](https://github.com/MasterDD-L34D/Game/pull/2066) (`a59985ed`):
  - 460 → 218 stale_document warnings (-52.6%). 249 entries updated (archive 112 + root 10 + planning/reports/playtest 98 + qa/logs/presentations 29).
  - `docs/reports/2026-05-06-governance-drift-audit-wave-2.md` audit report.
- ✅ **Wave 3 coop test coverage** PR [#2067](https://github.com/MasterDD-L34D/Game/pull/2067) (`e4447575`):
  - +9 negative tests audit 2026-04-24 §coop (items #1, #4, #5 + 4 defensive extras).
  - Items #2 (multi-disconnect race) + #3 (host-transfer e2e full) DEFERRED — port Godot Sprint M.7 incoming.
- ✅ **Wave 4 docs:smoke fix** PR [#2068](https://github.com/MasterDD-L34D/Game/pull/2068) (`50cbb04d`):
  - Fix spawn EINVAL Windows Node v22+ (CVE-2024-27980 mitigation): shell:true gate win32.
  - Item #7 TKT-07 Tutorial sweep N=10 DEFERRED — backend+telemetry infra dep, separate session.
- ✅ **Closure bundle** (this PR — pending):
  - Sprint S Mission Console deprecation row (gap audit P1.5 CLOSED) → plan v3 §Sprint S checklist + nota inline.
  - Sprint M.3 silhouette spec addendum (gap audit P1.7 CLOSED) → `docs/core/41-ART-DIRECTION.md §Job-to-shape` (path canonical 41 non 22).
  - Handoff doc sessione 2026-05-06 + BACKLOG cleanup row.

**Sessione totals 2026-05-05/06**: **15 PR shipped main** (cumulative #2056-#2068 + this bundle). 9+4 BACKLOG ticket chiusi. Plan v3.3 effort -2g. Governance -52.6% warnings. Coop test +9. Pillar P4 🟡 → 🟢 candidato.

**2026-05-05** (cutover Phase 3 + Sprint 8.1 expansion — 9 PR shipped main):

- ✅ 9 PR mergiati main: #2056 (handoff doc) + #2057 (Sprint 8.1 expansion r3/r4) + #2058 (cleanup audit Phase 3) + #2059 (services/rules/ removal Phase 3) + #2060 (mutation aspect_token 36/36) + #2061 (ennea voice Type 5+7) + #2062 (ennea voice 9/9) + #2063 (cleanup stale comments) + #2064 (test artifacts refresh).
- ✅ ADR-2026-04-19 ACCEPTED + Phase 3 closed (services/rules/ Python rimosso).
- ✅ ADR-2026-04-13 superseded.
- ✅ 7 BACKLOG ticket chiusi: TKT-RULES-PHASE-3 + TKT-RULES-SIMULATE-BALANCE + TKT-TRAITS-ANCESTOR-BUFF-STAT + TKT-GATE5-CONVICTION + TKT-MUTATION-P6-VISUAL + TKT-MUSEUM-SKIV-VOICES + TKT-SERVICES-ORPHAN.
- 📊 **Pillar shift**: P4 Temperamenti MBTI/Ennea 🟡 → 🟢 candidato (9/9 archetype voice live + endpoint + telemetry).
- 📊 **Test baseline post-merge**: AI 383/383 + pytest 735/735 + format clean + governance 0 errors.

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

**2026-05-05** (Sprint 8.1 Ability r3/r4 expansion gap-fill — codename snoopy-milner):

- ✅ **Sprint 8.1** — Ability r3/r4 expansion roster gap-fill. Audit 2026-05-05 ha rilevato 4 expansion job orphan (stalker/symbiont/beastmaster/aberrant) con solo r1/r2 wired; PR #1978 originale shippò solo i 7 base. `data/core/jobs_expansion.yaml` v0.2.0 → v0.3.0 (12 → 20 ability expansion, +8 nuove: 2/job × 4 expansion). Cost ladder canonical r3=14 / r4=22 PI mirror base. 8 ability nuove via 6 effect_type esistenti (debuff, execution_attack, team_buff, team_heal, aoe_buff, buff, surge_aoe): stalker (shadow_mark+shadow_assassinate), symbiont (bond_amplify+unity_surge), beastmaster (feral_dominion+apex_pack), aberrant (stabilized_mutation+perfect_mutation). Vincolo critical: zero nuovi runtime types, zero modifica abilityExecutor.js (extension data-only — vincolo PR #1978 preservato). 4 test nuovi jobs.test (expansion ladder + naming + version bump + rank sort) + 5 test nuovi abilityExecutor (dervish/headshot/apocalypse/lifegrove smoke r4 base + shadow_assassinate r4 expansion) = jobs 18/18 + abilityExecutor 41/41. ADR-2026-04-27 §6 expansion roster + numeric-reference §12 expansion table. AI baseline 382/382 zero regression. Pillar P3 🟢ⁿ → 🟢++ (roster 11/11 job r1→r4 wired complete). Out of scope: balance playtest expansion (deferred a calibration sprint), frontend redesign (auto-respect via JSON catalog).

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
