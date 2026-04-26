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

- [x] ~~**M13 P3 Phase B**~~ — balance pass N=10 post XP grant hook → **✅ CHIUSO in PR #1697 (`a462d4d5`)** 2026-04-25. Campaign advance XP grant hook + combat resolver 5 passive tags wired (flank_bonus, first_strike_bonus, execution_bonus, isolated_target_bonus, long_range_bonus) + frontend progressionPanel overlay. Balance pass 448 builds validated. Pilastro 3 → 🟢 candidato.
- [x] ~~**M13 P6 Phase B calibration**~~ — N=10 hardcore 07 → **✅ SHIPPED in PR #1698 (`135b5b1f`)** 2026-04-25 (esecuzione harness userland resta). Calibration harness `tools/py/batch_calibrate_hardcore07.py` + HUD timer countdown + campaign auto-timeout outcome. Pilastro 6 → 🟢 candidato. **Userland residual**: eseguire harness N=10, valutare win rate 30-50%.

---

## 🟡 Priorità media

### Bug / tech debt identificati

> **Audit 2026-04-24**: CLAUDE.md "Backlog ticket aperti" era stale. Verificato contro git history.

- [x] ~~**TKT-06**~~ — `predict_combat` ignora `unit.mod` stat → **✅ CHIUSO in PR #1588 (`2d6394dd`)** 2026-04-18. `resolve_attack_v2` + `predict_combat` Python + JS `predictCombat` ora includono actor.mod + aggregate_mod parity.
- [ ] **TKT-07** — Tutorial sweep #2 N=10/scenario post telemetry fix. Unblock (TKT-06 risolto). Sweep #2 run da confermare in `docs/playtest/*sweep*`.
- [ ] **TKT-08** — Backend stability under batch (morì run #14 batch N=30). **Parziale**: PR #1551/#1559 harness migliorato; "backend stability full fix" non esplicitamente confermato.
- [x] ~~**TKT-09**~~ — `ai_intent_distribution` mancante in `/round/execute` response → **✅ CHIUSO in PR #1551 (`092bff14`)** 2026-04-18. Harness `_ai_actions_from_resp` filtra `results[]` per `actor_id ∈ SIS`.
- [ ] **TKT-10** — Harness retry+resume incrementale (JSONL write per-run). **Parziale**: PR #1551 probe_one addendum; retry+resume esplicito da confermare.
- [ ] **TKT-11** — `predict_combat` 8p aggregate sanity boss vs full party. **Aperto** (nessun commit linkato).

### Triangle Strategy MBTI surface tickets (proposed OD-013, pending user verdict)

- [x] ~~**TKT-P4-MBTI-001** — Phased reveal MBTI Disco-Elysium-style (Proposal A, ~6-8h)~~ → **✅ CHIUSO 2026-04-25 sera (branch `feat/d1a-mbti-phased-reveal`)**: `apps/backend/services/mbtiSurface.js` (NEW, ~140 LOC) helper `computeRevealedAxes` + `buildMbtiRevealedMap` con confidence derivata da coverage×decisiveness, threshold default 0.7 (env `MBTI_REVEAL_THRESHOLD` A/B testabile), label italiani conservative (T="Pensiero"/F="Sentimento"/E="Estroversione"/I="Introversione"/S="Sensazione"/N="Intuizione"/J="Giudizio"/P="Percezione") + hint diegetici per assi nascosti ("Sei socievole o solitario? Ancora non lo sai."). Routes `/:id/vc` e `/:id/pf` estese additivamente con `mbti_revealed` per_actor (lazy-import + try/catch non-blocking, zero breaking change). Frontend `debriefPanel.js` nuova sezione `#db-mbti-section` (4 axis card + hidden hints + confidence bar) + setter `setMbtiRevealed(payload)` + CSS `.db-mbti-*`. 12/12 unit test nuovi (`tests/services/mbtiSurface.test.js`), AI baseline 311/311 verde, vcScoring 56/56 verde, session API smoke verde. P4 🟡 → 🟡+ (UI surface live, playtest pending). Card [M-2026-04-25-009](docs/museum/cards/personality-triangle-strategy-transfer.md) reuse_path eseguito.
- [ ] **TKT-P4-MBTI-002** — Dialogue color codes diegetic (Proposal B, ~5-7h). Hook `narrativeEngine.pickVoice` + `render.js drawDialogue` color palette per MBTI axis. WCAG accessibility review needed (link `ui-design-illuminator`).
- [ ] **TKT-P4-MBTI-003** — Recruit gating by MBTI thresholds (Proposal C, ~4-6h). Hook `metaProgression.recruitFromDefeat`. Pre-req: M-007 mating engine activate (Path A in OD-001).

### Museum-driven autonomous tasks (user verdict 2026-04-25)

- [x] ~~**TKT-ANCESTORS-RECOVERY (P2 autonomous)**~~ — Caccia online 263 neuroni Ancestors → **✅ CHIUSO 2026-04-25 PR #1815 (`73bbab3e`)** "OD-011 Path B v07 wiki recovery 297/297 neurons". Method: Fandom wiki MediaWiki API bypass Cloudflare (`action=query&prop=revisions&rvslots=main` + custom UA). Branches recovered: Senses 37 + Ambulation 26 + Dexterity 33 + Attack 8 + Dodge 10 + Self-Control 12 + 9 bonus rami (Communication 20, Intelligence 14, Motricity 20, Omnivore 11, Settlement 10, Swim 5, Metabolism 4, Preventive 30, Therapeutic 24, Hominid lineages 33). Output: `reports/incoming/ancestors/ancestors_neurons_dump_v07_wiki_recovery.csv` 76KB + manifest SHA256. License CC BY-NC-SA 3.0. RFC v0.1 promise CLOSED.
  - **Follow-up open** (~5-10h): wire 263 nuove entries (v07 - 01B = 263) in `data/core/traits/active_effects.yaml` con pattern `ancestor_<ramo>_<name>` come PR #1813.
- [x] ~~**TKT-MUSEUM-ENNEA-WIRE (P1 autonomous)**~~ → **✅ CHIUSO 2026-04-25 sera** stack 3 PR consecutive: [#1825](https://github.com/MasterDD-L34D/Game/pull/1825) (`5c088ee5` enneaEffects 6/9 wire mechanical+log_only) + [#1827](https://github.com/MasterDD-L34D/Game/pull/1827) (`9f48cef6` 9/9 archetype coverage Riformatore+Individualista+Lealista) + [#1830](https://github.com/MasterDD-L34D/Game/pull/1830) (`b27a612c` 3 stat consumer wire move/stress/evasion → 9/9 mechanical). Card M-006 reuse_path fully implemented. Pre-req `buildVcSnapshot` per-round mode soluto via lazy invocation in `sessionRoundBridge.applyEndOfRoundSideEffects` post status decay (gate `session.turn > 1`, KO-skip, telemetry config caching). 311/311 AI baseline preserved + 31 tests new su `enneaEffectsWire.test.js`. P4 🟡 → 🟢 candidato definitivo. Card M-006 stato `curated → revived`.
- [ ] **TKT-MUSEUM-SKIV-VOICES (P1 autonomous)** — Implementa palette Type 5 + Type 7 in `data/core/narrative/ennea_voices/{type_5,type_7}.yaml` + selector in `narrativeEngine.js` + telemetry `ennea_voice_type_used`. ~6h. **Pre-req**: TKT-MUSEUM-ENNEA-WIRE shipped (vcSnapshot round-aware required).
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

- [🟡] **M14-A PARTIAL** — Mechanic 3 elevation damage multiplier + Mechanic 4 terrain reactions → **🟡 PARZIALE PR #1736 (`b7abfe39`)** 2026-04-24 ("slice ridotto, pure helpers, no wire resolver"). Helpers shipped: `elevationDamageMultiplier` in `hexGrid.js` (delta>=1 → 1.30, delta<=-1 → 0.85), `terrain_defense.yaml` attack_damage_bonus 0.30/-0.15, `apps/backend/services/combat/terrainReactions.js` (reactTile fire+ice→water/steam, fire+water→evaporate, lightning+water→electrified) + `chainElectrified` BFS maxDepth cap 5 TS-style.
  - [x] **terrainReactions wire** — branch `feat/m14a-terrain-reactions-wire` 2026-04-25: `performAttack` post-damage hook chiama `reactTile` quando `action.channel` mappa a fire/ice/water/lightning, `session.tile_state_map` persiste cross-round, decay ttl in `applyEndOfRoundSideEffects`, `terrain_reaction` field surfaced on attack event + response. +7 test (`tests/api/terrainReactionsWire.test.js`). 12/12 unit + 19/19 wire+unit verde, 311/311 AI baseline preserved. `chainElectrified` BFS deferred (M-future, follow-up).
  - **Ancora aperto**: full resolver wire `elevationDamageMultiplier` (combat damage step usa multiplier?), facing system, chainElectrified BFS chain. ~2-3h residui.
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
  - TKT-11 confermato aperto

**2026-04-24** (coop-phase-validator real run, primo uso post-policy 4-gate DoD):

- Agent invocato su codice reale (non smoke test). Verdict 🟡 minor issues, 0 blocker, cleared per playtest.
- 3 findings aggiunti al backlog (F-1, F-2, F-3)
- 5 test coverage gap identificati (non bloccanti pre-playtest)
- P1 fixes ~2h pre-playtest: F-1 (host transfer coop phase rebroadcast) + F-2 (force-advance endpoint)
- Report: `docs/qa/2026-04-24-coop-phase-validation-pre-playtest.md`

**Lesson**: CLAUDE.md narrative sprint context tende a fossilizzarsi — BACKLOG.md è single source of truth per stato ticket. Sync manuale post-merge PR importanti, o via skill `sprint-close`.

**2026-04-25** (D2 Path A faithful pivot — M14 mutation framework foundation):

- ✅ D2 mutation_catalog Path A — M14 framework loader + routes. `apps/backend/services/mutations/mutationCatalogLoader.js` + `apps/backend/routes/mutations.js` + plugin wire. 30 entries shipped, 4 endpoint REST (`/registry`, `/:id`, `/eligible`, `/apply`). +12 test (8 loader + 4 routes). PE/PI charging deferred a M13.P3 wire (display-only). Decoupled da V3 mating per design semantics — vedi card M-007.

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
