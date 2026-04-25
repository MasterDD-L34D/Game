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

- [ ] **M13 P3 Phase B** — balance pass N=10 post XP grant hook. ~3h. Chiude Pilastro 3 🟢 definitivo.
- [ ] **M13 P6 Phase B calibration** — N=10 hardcore 07 via `tools/py/batch_calibrate_hardcore07.py`. ~2h (parte userland). Chiude Pilastro 6 🟢 definitivo.

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

- [ ] **TKT-P4-MBTI-001** — Phased reveal MBTI Disco-Elysium-style (Proposal A, ~6-8h). Hook `vcScoring.js computeMbtiAxes` returns `confidence_per_axis`, frontend filter axis con confidence > 0.7. P4 🟡 → 🟡+. Card [M-2026-04-25-009](docs/museum/cards/personality-triangle-strategy-transfer.md).
- [ ] **TKT-P4-MBTI-002** — Dialogue color codes diegetic (Proposal B, ~5-7h). Hook `narrativeEngine.pickVoice` + `render.js drawDialogue` color palette per MBTI axis. WCAG accessibility review needed (link `ui-design-illuminator`).
- [ ] **TKT-P4-MBTI-003** — Recruit gating by MBTI thresholds (Proposal C, ~4-6h). Hook `metaProgression.recruitFromDefeat`. Pre-req: M-007 mating engine activate (Path A in OD-001).

### Museum-driven autonomous tasks (user verdict 2026-04-25)

- [ ] **TKT-ANCESTORS-RECOVERY (P2 autonomous)** — Caccia online dei 263 neuroni Ancestors mancanti. RFC v0.1 prometteva 297, solo 34 sopravvissuti in CSV. Path B di [OD-011](OPEN_DECISIONS.md#od-011) scheduled come task autonomous quando Claude ha budget tempo. **NON userland action**. Sources candidate (già citate in [pack README](packs/evo_tactics_pack/tools/py/modules/personality/enneagram/README.md) + [RFC](docs/planning/research/sentience-rfc/RFC_Sentience_Traits_v0.1.md)):
  - [Britannica — Animal Cognition](https://www.britannica.com/topic/animal-cognition) (rami Senses + Brain + Communication)
  - Ancestors The Humankind Odyssey wiki (rami Ambulation + Dexterity + Tools + Settlement)
  - Smithsonian Human Origins (Intelligence + Comm)
  - Comparative biology references (Ramo Movement)
  - 9 rami target: Senses 37 / Ambulation 26 / Dexterity / Brain / Communication / Tools / Settlement / Intelligence / Movement = ~263 entry to recover
  - Output atteso: `reports/incoming/ancestors/ancestors_neurons_dump_v1_full.csv` (~297 rows) + ADR-2026-XX "Ancestors full recovery" se path adottato
  - Estimated effort autonomous: ~10-15h (deep web research + CSV mapping + AJV schema validation)
  - Trigger: invocazione esplicita user O budget tempo idle in sessione successiva. Fino ad allora, dormiente.
- [ ] **TKT-MUSEUM-ENNEA-WIRE (P1 autonomous)** — Wire enneaEffects.js + registry M-002 + dataset M-003 (Path A OD-009 + OD-010). ~7-9h totali. **Pre-req**: refactor `buildVcSnapshot` per round-aware mode (vedi card [M-006](docs/museum/cards/enneagramma-enneaeffects-orphan.md) audit findings). Combat hot path = high blast radius, richiede regression baseline 307/307 verde.
- [ ] **TKT-MUSEUM-SKIV-VOICES (P1 autonomous)** — Implementa palette Type 5 + Type 7 in `data/core/narrative/ennea_voices/{type_5,type_7}.yaml` + selector in `narrativeEngine.js` + telemetry `ennea_voice_type_used`. ~6h. **Pre-req**: TKT-MUSEUM-ENNEA-WIRE shipped (vcSnapshot round-aware required).
- [ ] **TKT-MUSEUM-SWARM-SKIV (P0 Sprint A)** — Single-shot magnetic_rift_resonance (OD-012). ~2h. Biome `atollo_ossidiana` placeholder + trait + tier T2 wire `biomeResonance.js`. Skiv Sprint A direct fit.
- [x] ~~**TKT-MUSEUM-ANCESTORS-22-TRIGGER (P0 Sprint B)**~~ — Renamed → **TKT-MUSEUM-ANCESTORS-SELF-CONTROL-12 ✅ CHIUSO 2026-04-25 PR #1815**. Card claim "22" rivelato drift (awk count CSV branch column = 12 SC effettivi: FR 01-08 + BB FR 01-04). Implementati 12 trait stub data-only in `data/core/traits/active_effects.yaml` (+332 LOC, 143 → 155 trait totali) seguendo pattern magnetic_sensitivity. 3 famiglie status: `time_dilated` (Tachypsychia + Temporal Distortion), `reactive_focus` (Perceptual + Internal Process Speed × 3 target_filter), `disciplined` (Determination genetic ×4). Provenance metadata `ancestor_provenance.{source_csv,csv_code,csv_row,genetic}` per traceability. Tests: AI 311/311 verde, validate-datasets 14 controlli 0 avvisi, traitEffects 21/21. M-future wire (timing_window/dopamine_cost stat) deferred fino a schema extension.

### Pre-playtest coop fixes (da audit coop-phase-validator 2026-04-24)

Ref: `docs/qa/2026-04-24-coop-phase-validation-pre-playtest.md` (agent run verdict 🟡 minor, 0 blocker).

- [ ] **F-1 (P1, ~1h)** — Host transfer mid-combat: `wsSession.js:765-784` promuove nuovo host dopo grace 30s ma non pusha current coop phase. Nuovo host vede UI stale fino a `GET /api/coop/state` manuale. Fix: wire `coopStore` in wsSession close handler per rebroadcast phase.
- [ ] **F-2 (P1, ~1h)** — Stuck-phase se player droppa mid `character_creation` o `debrief`: `room.players` mantiene entry disconnesse (design reconnect), quindi guard `expected.size === characters.size` non fira. Worst case: host deve chiudere room. Fix: `/coop/run/force-advance` endpoint host-only.
- [ ] **F-3 (P2)** — `submitCharacter` non check `playerId ∈ allPlayerIds`. Harmless (crea ghost entry che blocca auto-advance = same as F-2). Fix: guard al route layer o orchestrator.

### Test coverage gaps coop (non bloccanti, da audit)

- [ ] Phase-skip negative tests (`confirmWorld()` from lobby should throw)
- [ ] Multi-player disconnect race test
- [ ] Host-transfer + coop-state sync e2e
- [ ] Room-code alphabet regex purity test
- [ ] `startRun()` from combat phase untested

### Triangle Strategy transfer (design-driven, new)

Da `docs/research/triangle-strategy-transfer-plan.md` — 10 meccaniche identificate, rollout 3 sprint slice:

- [ ] **M14-A** — Mechanic 3 (elevation + facing) + Mechanic 4 (terrain chain reactions fire/ice/water/lightning). Effort M. ~8h. Target Pilastro 1 Tattica.
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
