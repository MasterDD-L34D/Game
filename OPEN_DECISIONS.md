# OPEN_DECISIONS — Evo-Tactics

> **Scope**: decisioni ambigue ma non bloccanti, da risolvere con miglior default + review quando possibile.
> **Sorgente template**: `07_CLAUDE_CODE_OPERATING_PACKAGE/OPEN_DECISIONS.template.md` archivio.
> **Differenza da DECISIONS_LOG.md**: quello è index ADR storici (decisioni prese). Questo file = domande ancora aperte o proposte non ancora confermate.
> **Ciclo di vita**: una volta risolta (con ADR, test playtest, o decisione esplicita user), sposta in DECISIONS_LOG o chiudi con verdict.

---

## Aperte

### [OD-023] Phase B execution date verdict — Day 5 anticipato vs Day 8 canonical vs ADR amendment Path D

- **Livello**: workflow + ADR contract gate (date-discipline)
- **Stato**: **APERTA 2026-05-12** — user trigger phrase exact match pre-stage doc §5 invocata Day 5/8 (2026-05-12) invece target Day 7 (2026-05-14). Richiesto parere OOA + ai-station methods.
- **Ambiguità**: 3 path scoring (3-agent OOA parallel):
  - **Path A (wait Day 8 canonical)** — 34/35 — execute 2026-05-14 mattina UTC, single-PR cascade ~30min, conforme ADR §13.1 gate, zero anticipation risk
  - **Path B (anticipate Day 5 early)** — 8/35 REJECTED — anti-pattern `codex/structural-reset` analog (ai-station ADR-0021), force-push tag irreversibile, master-dd veto window collapse 3gg→0
  - **Path C (pre-flight no-cascade)** — 34/35 — autonomous deliverables additive (handoff + museum + memory + OD), §13.4 cascade preserved Day 8, ZERO blast radius
  - **Path D (ADR amendment 30gg grace extension)** — 26/35 — align Game ADR-2026-05-05 a ai-station ADR-0024 soft-deadline 2026-09-30, Sprint Q+ scope amendment
- **Perché conta**: Phase B archive web v1 = cutover irreversibile cross-repo + cross-PC. Schedule discipline = precedent normativo per future autonomous mode anticipation detection.
- **Miglior default proposto**: **Path C ORA** (autonomous deliverables shipped — handoff `docs/planning/2026-05-14-phase-b-cutover-canonical-execution.md` + museum card M-2026-05-12-001 + memory save + this OD-023) + **Path A Day 8** (canonical execution 2026-05-14 mattina UTC). Master-dd explicit grant required per Path B OR Path D.
- **Rischio se ignorata**: 🟡 future Claude sessione legge trigger phrase + esegue Path B silently → recurrence anti-pattern + ADR §13.1 audit trail gap.
- **Cross-repo ai-station alignment**: ADR-0024 Proposed 2026-05-09 = Vue3 archive soft-deadline 2026-09-30 (4 mesi). Conflict apparente con Game/ ADR-2026-05-05 (7gg grace). Risolto via Opt B+C combined: scope disjoint (Game = FE `apps/play/` only, ai-station = Vue3 repo-wide). Amendment ai-station ADR-0024 § "Sub-events timeline" raccomandato Sprint Q+ NON oggi.
- **Source ref**: [Pre-stage doc](docs/playtest/2026-05-14-phase-b-day-7-formal-closure-prestage.md) + [Day 5 monitor anticipated](docs/playtest/2026-05-11-phase-b-day-5-monitor-anticipated.md) + [Canonical execution checklist](docs/planning/2026-05-14-phase-b-cutover-canonical-execution.md) + [Museum card M-2026-05-12-001](docs/museum/cards/phase-b-anticipated-execution-2026-05-12-discard.md) + [ai-station ADR-0024](https://github.com/MasterDD-L34D/codemasterdd-ai-station/blob/main/docs/adr/0024-vue3-archive-godot-v2-canonical-timeline.md).

### [OD-017] Phase B trigger 2/3 — Option α full social vs β solo hardware vs γ synthetic only ✅ RISOLTA 2026-05-08 (DOWNGRADE nice-to-have)

- **Livello**: workflow + ADR contract gate
- **Stato**: **risolta 2026-05-08** — master-dd verdict explicit "Phase B trigger 2/3 NON è hard gate, diventa nice-to-have. Probabilmente weekend se launcher 1-2 click usability OK."
- **Verdict**: Phase B trigger condition §5 ADR-2026-05-05 **AMENDED** → trigger originale 4 conditions → 2 hard (Phase A 7gg grace + 0 critical regression) + 1 nice-to-have (4-amici social playtest). Phase B archive web v1 formal POST 2026-05-14 + zero-regression confirmed = automatic accept. Master-dd 4-amici weekend = supplement, NOT blocker.
- **Action shipped**: ADR-2026-05-05 §5 amendment (questa PR).
- **Rationale**: Tier 1 layered QA infra (Day 1+2) coverage functional + iter3 hardware-equivalent ~70-90% fidelity = automation-first sufficient. ZERO regression Day 1+2 confirma cutover stable.
- **Optional follow-up Claude autonomous**: verifica deploy-quick.sh path Game-Godot-v2 ergonomics + opzionale `.bat` desktop shortcut wrapper 1-click se non esiste.
- **Source ref**: [ADR-2026-05-05 §5](docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md) AMENDMENT 2026-05-08 + [docs/playtest/2026-05-08-phase-b-synthetic-supplement-iter1.md](docs/playtest/2026-05-08-phase-b-synthetic-supplement-iter1.md).

### [OD-017-original-archive] Phase B trigger 2/3 (PRE-AMENDMENT)

- **Ambiguità**: ADR-2026-05-05 §5 trigger 2/3 require "1+ playtest pass post-cutover (4 amici + master-dd, full combat scenario)". Master-dd silenzioso Day 2/7. Window 7gg termina 2026-05-14. Tre path:
  - **Option α canonical** (4 amici Discord/WhatsApp + master-dd, ~1-2h userland, satisfies trigger ✅)
  - **Option β fallback** (master-dd solo 2 device, 5 round combat + 3 hardware-only check, ~30min, trigger ⚠️ borderline)
  - **Option γ synthetic only** (Claude rerun Tier 1 Day 3-7 ~5min/giorno, supplement evidence ❌ NON satisfies trigger)
- **Perché conta**: Phase B archive web v1 formal (ADR §6) GATED su trigger 2/3. Sprint Q+ scoping (#2109) bloccato. Senza trigger entro 2026-05-14 → window grace estende OR Phase B abort.
- **Miglior default proposto**: **Option α canonical** weekend 2026-05-10/11 (sabato/domenica massima disponibilità amici). Plan: master-dd setup tunnel `./tools/deploy/deploy-quick.sh` + share URL Discord 4 amici + 30-60min combat session + verdict explicit "Phase B ACCEPTED". Effort modesto vs evidence canonical massima.
- **Rischio se ignorata**: 🔴 Phase B trigger fallisce. Web v1 archive deferred indefinitely. Sprint Q+ kickoff bloccato. Auto-merge L3 cascade Day 2 work potential lost momentum.
- **Evidence supplement**: PR #2112 iter1 confirma functional gate ZERO regression Day 1→Day 2. Tier 1 functional baseline solido pre-canonical-playtest.
- **Source ref**: [ADR-2026-05-05 §5](docs/adr/ADR-2026-05-05-cutover-godot-v2-fase-3-formal.md), [PR #2112](https://github.com/MasterDD-L34D/Game/pull/2112), [docs/playtest/2026-05-08-phase-b-synthetic-supplement-iter1.md](docs/playtest/2026-05-08-phase-b-synthetic-supplement-iter1.md), [docs/playtest/2026-05-07-master-dd-validation-10min-checklist.md](docs/playtest/2026-05-07-master-dd-validation-10min-checklist.md).

### [OD-018] Tier 2 PlayGodot integration — kill-60 verdict accept/reject ✅ RISOLTA 2026-05-08 (OVERRIDE keep both)

- **Livello**: workflow (test infra)
- **Stato**: **risolta 2026-05-08** — master-dd verdict explicit "no, vogliamo mantenere anche PlayGodot+GodotTestDriver. Lo avevamo scelto per un motivo. Servono per i test."
- **Verdict**: **OVERRIDE Claude kill-60 verdict**. Mantieni PlayGodot + GodotTestDriver in `docs/playtest/AGENT_DRIVEN_WORKFLOW.md` adoption roadmap row 5+6. NON strikethrough. Aggiorna ETA realistic post-research:
  - PlayGodot: ~5h → **~20-40h reality** (custom Godot fork build maintenance burden cross-platform)
  - GodotTestDriver: ~2h → **~10-15h reality** (C# enable + GDScript-C# bridge ergonomics)
- **Rationale master-dd intuition validated**:
  - PlayGodot UNIQUE coverage: external Python automation = pytest integration + cross-stack signal→DOM bridge testing GUT NON copre (engine + HTML5 export + DOM canvas pixel insieme)
  - GodotTestDriver UNIQUE coverage: in-engine C# integration testing fixture + simulated input + scene tree drivers (alternativa GUT pattern, plus chickensoft community ecosystem)
- **Aggiunte effort transparency**: workflow doc row 5+6 update con ETA realistic + explicit "custom Godot fork required" caveat (PlayGodot) + "C# bindings required" caveat (GodotTestDriver). Master-dd informed decision pre-adoption.
- **Action shipped**: workflow doc update (questa PR).
- **Source ref**: [PR #2110 research](https://github.com/MasterDD-L34D/Game/pull/2110) + master-dd verdict 2026-05-08.

### [OD-018-original-archive] Tier 2 PlayGodot kill-60 verdict (PRE-OVERRIDE)

- **Ambiguità**: handoff `docs/playtest/AGENT_DRIVEN_WORKFLOW.md` §"Adoption roadmap" lista PlayGodot Tier 2 ~5h post Phase A. Research PR #2110 reveal stima 5h era WRONG. Reality:
  - PlayGodot ~20-40h (custom Godot fork build + scons C++ + 2-platform maintenance)
  - GodotTestDriver ~10-15h (C# stack mismatch GDScript)
  - GUT scenario ext ~3-5h (stack-native, recommended)
- **Perché conta**: AGENT_DRIVEN_WORKFLOW.md row 5+6 contiene stima sbagliata = futuro agent rischia adoption sbagliata. Cross-stack signal→DOM bridge gap ~5% NON giustifica 20-40h custom Godot fork burden solo-dev.
- **Miglior default proposto**: **REJECT PlayGodot + GodotTestDriver, ACCEPT GUT scenario fixture extension** (~3-5h Sprint M9+). Update workflow doc strikethrough row 5+6 + redirect "GUT scenario ext".
- **Rischio se ignorata**: 🟡 LOW. Workflow doc claim 5h stima conservata = risk waste 20-40h se future master-dd accept "as written". Esplicito kill-60 = doc-aligned con reality.
- **Evidence**: [PR #2110 research](https://github.com/MasterDD-L34D/Game/pull/2110) + [PlayGodot README](https://github.com/Randroids-Dojo/PlayGodot) (custom fork explicit) + [GodotTestDriver README](https://github.com/chickensoft-games/GodotTestDriver) (C# only).
- **Source ref**: [docs/playtest/2026-05-08-tier-2-playgodot-integration-prep.md](docs/playtest/2026-05-08-tier-2-playgodot-integration-prep.md).

### [OD-019] Skiv Monitor scheduled fail fix — Option A repo toggle vs B/C/D workflow edit ✅ RISOLTA 2026-05-08 (Option A confirmed)

- **Livello**: ops (CI cosmetic)
- **Stato**: **risolta 2026-05-08** — master-dd verdict explicit "A 1-click. Forensic puro repo setting toggle off post-data."
- **Verdict**: **Option A repo setting toggle**. Master-dd manual action: Settings → Actions → General → Workflow permissions → check "Allow GitHub Actions to create and approve pull requests". 30s 1-click. Restore pre-2026-04-25 verde state. NON Claude action (repo settings = userland).
- **Action followup**: nessuna autonomous Claude. Master-dd execute toggle quando ha PC. Post-execute: verify next 4h cron run = success conclusion + new PR auto opened.
- **Source ref**: [docs/reports/2026-05-08-skiv-monitor-rca.md](docs/reports/2026-05-08-skiv-monitor-rca.md) + master-dd verdict 2026-05-08.

### [OD-019-original-archive] Skiv Monitor fix (PRE-VERDICT)

- **Ambiguità**: workflow `Skiv Monitor` 30/30 last runs failure (~12 days, post 2026-04-25 ultimo successo PR auto #1836). Root cause: `gh pr create` exit 1 perm denied. Branch `auto/skiv-monitor-update` push OK. 4 fix path:
  - **Option A** repo setting toggle (Settings → Actions → "Allow GitHub Actions to create PRs", 30s 1-click, 🟢 LOW risk)
  - **Option B** workflow graceful fallback (`.github/workflows/` forbidden path, master-dd manual review)
  - **Option C** notification-only skip create (forbidden path)
  - **Option D** PAT secret swap (heavier, 🔴 MED-HIGH risk)
- **Perché conta**: continuous red CI badge falsifica handoff "CI verde" assertion Phase A. Branch updated 4h cron OK ma PR auto NON aperto = master-dd manual workflow gap.
- **Miglior default proposto**: **Option A** 30s 1-click. Restore pre-2026-04-25 verde state, zero code change, zero risk. Option B/C fallback se A blocked da org policy.
- **Rischio se ignorata**: 🟡 cosmetic. NON blocca Phase A o Phase B. Solo notification noise.
- **Evidence**: PR #2111 RCA + GraphQL error quote evidence + 30/30 fail rate.
- **Source ref**: [docs/reports/2026-05-08-skiv-monitor-rca.md](docs/reports/2026-05-08-skiv-monitor-rca.md).

### [OD-020] Sprint Q+ pre-kickoff scope freeze — 5 sub-decisione ✅ RISOLTA 2026-05-08 (FULL deep scope)

- **Livello**: game (cross-stack ETL)
- **Stato**: **risolta 2026-05-08** — master-dd verdict explicit "se intuisco bene mi chiedi se insistere sullo Sprint Q. Sì vogliamo insistere a farlo tutto approfonditamente."
- **Verdict**: **FULL scope freeze Q.A → Q.E**. NO incremental Q.A only. Spec full execution plan post-Phase-B-trigger entire 12-ticket pipeline (~14-17h cumulative ~3-4 sessioni autonomous + 4 master-dd review gate).
- **Sub-decisioni gated post-Phase-B**:
  - Q-1 schema contract review master-dd manual approve (forbidden path `packages/contracts/`)
  - Q-2 Prisma migration `Offspring` master-dd manual approve (forbidden path `migrations/`)
  - Q-3 mutation list **default 6-canonical accept-as-spec'd** (Appendice A PR #2109): armatura_residua + tendine_rapide + cuore_doppio + vista_predatore + lingua_chimica + memoria_ferita
  - Q-4 HTTP API auth: usa JWT esistente cross-stack (default accept)
  - Q-5 **scope freeze full Q.A→Q.E** confirmed (NO incremental Q.A only)
- **Rationale master-dd**: Sprint Q+ chiude finalmente Engine LIVE Surface DEAD anti-pattern canonical case (`mating_nido-engine-orphan` 5/5 score museum, 469 LOC + 7 endpoint shipped 4 mesi fa con ZERO frontend). Full deep approach = compelete narrative arc Skiv-Pulverator alleanza visible debrief panel + cross-encounter offspring legacy.
- **Trigger conditions**: Sprint Q+ kickoff = Phase B ACCEPTED (target 2026-05-14 + zero-regression confirmed).
- **Sprint Q+ prerequisite candidates** (⚠️ **Claude-proposed pending master-dd review** — NON parte di verdict FULL Q.A→Q.E master-dd Day 2/7. Bundle vs standalone decision = master-dd-only): [OD-022](#od-022-evo-swarm-pipeline-cross-verification-gate-pre-run-6) evo-swarm pipeline cross-verification gate pre run #6 (~7-9h). Indipendente da Q-1→Q-5 ETL ma stesso trigger window post-Phase-B-accept. Master-dd può scegliere: (a) bundle insieme Sprint Q+ pre-kickoff, (b) standalone OD-022 separato post-Sprint-Q+, (c) reject OD-022 (= swarm Atto 2 abandoned path).
- **Action followup**: questa PR aggiorna OD-020 verdict + Sprint Q+ scoping doc PR #2109 può essere ampliato post-Phase-B con full execution plan + OD-022 gate addition se accepted.
- **Codification 2026-05-10 (V6 cascade bundle master-dd grant)**: Sprint Q+ FULL scope formal codified in [docs/planning/2026-05-10-sprint-q-plus-full-scope-codification.md](docs/planning/2026-05-10-sprint-q-plus-full-scope-codification.md). Sequential pipeline Q-1 → Q-12 (12 ticket Q.A → Q.E) ~22-25h cumulative ~4-5 sessioni autonomous + 5 master-dd review gate. Bundle OD-022 cross-repo sync (Q-6+Q-7+Q-8 ~7-9h) included post IMPLICIT ACCEPT. Effort revision vs original 14-17h stima = +7-9h bundle. Sub-decisione defaults explicit Q-1 schema accept + Q-2 migration accept + Q-3 MUTATION*LIST 6-canonical + Q-4 JWT existing + Q-5 FULL confirmed. Resume trigger phrase canonical: *"Sprint Q+ kickoff post-Phase-B-accept — execute Q.A Q-1+Q-2 forbidden path bundle"\_.
- **Source ref**: [PR #2109 scoping](https://github.com/MasterDD-L34D/Game/pull/2109) + [docs/planning/2026-05-08-sprint-q-lineage-merge-etl-scoping.md](docs/planning/2026-05-08-sprint-q-lineage-merge-etl-scoping.md) + [docs/planning/2026-05-10-sprint-q-plus-full-scope-codification.md](docs/planning/2026-05-10-sprint-q-plus-full-scope-codification.md) + master-dd verdict 2026-05-08 + V6 cascade grant 2026-05-10.

### [OD-020-original-archive] Sprint Q+ scope freeze (PRE-VERDICT)

- **Ambiguità**: Sprint Q+ LineageMergeService ETL chiusura GAP-12 audit godot-surface-coverage. 14-17h effort total. 5 sub-decisione master-dd richieste pre-kickoff:
  - **Q-1** Schema contract `lineage_ritual.schema.json` review obbligatorio (forbidden path `packages/contracts/`)
  - **Q-2** Prisma migration `Offspring { id, parent_a_id, parent_b_id, mutations, born_at, lineage_id }` master-dd manual approve (forbidden path `migrations/`)
  - **Q-3** MUTATION_LIST canonical (3 mutation choice in LegacyRitualPanel) — narrative call. Default proposed: 6 mutation generic (vedi PR #2109 Appendice A: armatura_residua + tendine_rapide + cuore_doppio + vista_predatore + lingua_chimica + memoria_ferita)
  - **Q-4** HTTP API auth: `/api/v1/lineage/legacy-ritual` JWT required? Default: usa JWT esistente cross-stack
  - **Q-5** Scope freeze vs incremental: full ETL Q.A→Q.E in 1 settimana, OR Q.A only ship + master-dd review pre-Q.B kickoff?
- **Perché conta**: ETL pipeline cross-stack contract break tra `ambitionService.evaluateChoiceRitual` (Game/ LIVE) + `propagateLineage` (stub deferred) + Godot v2 engine LIVE. Sblocca P2+P5 narrative arc Skiv-Pulverator alleanza completion (mating + offspring + debrief surface).
- **Miglior default proposto**: **Hard gate Phase B ACCEPTED** prima di toccare Q-1→Q-5. Pre-Phase-B impl rischia regressione `DebriefView` cutover-critical surface. Default Q-3 mutation list 6-canonical accept-as-spec'd. Default Q-5 incremental Q.A only first.
- **Rischio se ignorata**: 🟡 zero immediate (Sprint Q+ deferred per design). Solo importante post-Phase-B trigger 2/3.
- **Evidence**: [PR #2109 scoping doc](https://github.com/MasterDD-L34D/Game/pull/2109) + [docs/planning/2026-04-29-sprint-n7-failure-model-parity-spec.md](docs/planning/2026-04-29-sprint-n7-failure-model-parity-spec.md) §6 + Game-Godot-v2 `scripts/lifecycle/lineage_merge_service.gd` (77 LOC LIVE) + `scripts/session/mating_trigger.gd` (164 LOC LIVE).
- **Source ref**: [docs/planning/2026-05-08-sprint-q-lineage-merge-etl-scoping.md](docs/planning/2026-05-08-sprint-q-lineage-merge-etl-scoping.md).

### [OD-021] Continuous synthetic monitoring Day 3-7 — confirm/reject Claude autonomous schedule ✅ RISOLTA 2026-05-08 (Option C ridotto)

- **Livello**: workflow
- **Stato**: **risolta 2026-05-08** — master-dd verdict explicit "C" (modify cadence ridotto Day 3+5+7 only).
- **Verdict**: **Option C ridotto**. Cadence:
  - Day 3 2026-05-09 → synthetic iter2 (~5min Claude)
  - Day 4 2026-05-10 → SKIP
  - Day 5 2026-05-11 → synthetic iter3 (~5min Claude)
  - Day 6 2026-05-12 → SKIP
  - Day 7 2026-05-13 → synthetic iter4 final (~5min Claude)
  - Day 8 2026-05-14 → master-dd Phase B verdict + Sprint Q+ kickoff trigger
- **Total Claude effort**: ~15min cumulative cycle 7gg (vs 25-30min Option A original).
- **Rationale**: Day 1+2 ZERO regression baseline solido. Cadence sparse sufficient catch regression senza overhead daily. Master-dd zero burden invariato.
- **Action**: Day 3 2026-05-09 trigger phrase canonical: _"resume synthetic supplement iter2 Day 3 monitoring window"_. Claude execute ~5min Tier 1 phone smoke fresh.
- **Source ref**: [PR #2112 §7](https://github.com/MasterDD-L34D/Game/pull/2112) + master-dd verdict 2026-05-08.

### [OD-022] evo-swarm pipeline cross-verification gate pre run #6 ✅ IMPLICIT ACCEPT 2026-05-08 sera (cross-repo evidence convergente)

- **Livello**: workflow + pipeline contract (Atto 2 Scenario A "Integration drive")
- **Trigger**: post merge PR #2108 `1cfd7220` (run #5 distillation honesty pass — 7/13 swarm claims hallucinated vs canonical Game).
- **Ambiguità**: evo-swarm pipeline genera output JSON validato da `co02_validation.complete` SOLO struttura, NON fedeltà canonical (lezione meta run #5). Pattern dominante: swarm prende nomi reali (`dune_stalker`, `abisso_vulcanico`, `impulsi_bioluminescenti`) e combina attributi non supportati. Run #5 score 5/13 verified + 1/13 partial + 7/13 hallucinated.
- **Perché conta**: ogni distillation PR richiede manual cross-verification 30-60min (PR #2108 esempio). Senza gate automatico ogni run #N successivo replica overhead + rischio merge claim hallucinated se honesty pass dimenticato.
- **Sub-utilizzo evidence**: 11gg dormancy pre run #5 + week 2026-04-30→05-07 0 cicli significativi (Issue [#2102](https://github.com/MasterDD-L34D/Game/issues/2102)) + counter Atto 2 score "Integration drive" 1/10 → 2/10 post-merge (per PR body).
- **Miglior default proposto**: **gate cross-verification pre run #6**. Specifica:
  1. Swarm-side: ogni claim su species/biome/trait deve includere field `canonical_ref` con path Game (`data/core/species.yaml#dune_stalker.biome_affinity`)
  2. Pipeline ETL Game-side: validator Python che match claim vs canonical YAML + emit verification table embedded automatic nel doc generato
  3. Reject merge se hallucination ratio >30% (run #5 = 54%, sopra soglia)
- **Rischio se ignorata**: 🟡 MEDIUM. Senza gate, run #6+ ricreano overhead manual + diluiscono trust pipeline. Possibile abandon evo-swarm Atto 2 path se ROI negativo persiste 2+ run consecutivi.
- **Trigger eval**: **post Phase B accept** (week 2026-05-14+). Phase A monitoring critical path priorità prima.
- **Effort stima implementation**:
  - Swarm-side `canonical_ref` field: ~2-3h (cross-repo, evo-swarm autonomous)
  - Game-side validator Python: ~3-4h (`tools/py/swarm_canonical_validator.py`)
  - Pipeline integration ETL: ~2h
  - Total: ~7-9h, deferred Sprint Q+ candidate
- **Action followup**: trigger trip-wire — se run #6 ship pre fix → ferma + ratifica OD-022 trigger.
- **Triage update 2026-05-08 sera (post-merge #2108)**: 5/7 open questions run #5 chiuse autonomous via canonical grep (~25min). Score honesty post-triage: 5/13 verified + 8/13 hallucinated + 2 redundant + 2 deferred Sprint Q+. **Net actionable per data integration immediate = ZERO** (⚠️ Claude triage autonomous judgment — master-dd verdict pendente per criteri value diversi: 5 verified consistency-minor potrebbero avere valore non-data-integration come baseline pipeline metric / pattern reference / doc audit). 10 discarded items preservati in [museum card M-2026-05-08-001](docs/museum/cards/evo-swarm-run-5-discarded-claims.md). Vedi [docs/research/2026-05-08-evo-swarm-stress-mechanics-distillation.md §Triage closure](docs/research/2026-05-08-evo-swarm-stress-mechanics-distillation.md#triage-closure-2026-05-08-sera).
- **Pre-design preview shipped Day 3/7 sera 2026-05-08** (⚠️ Claude autonomous, master-dd verdict accept/reject/defer pendente): skeleton `tools/py/swarm_canonical_validator.py` (6 funzioni `NotImplementedError` + 3 dataclass + GATE_THRESHOLD 0.30) + spec doc [`docs/research/2026-05-08-od-022-validator-pre-design.md`](docs/research/2026-05-08-od-022-validator-pre-design.md) (test corpus 15 cases + 3 gate criteria open questions + effort 8-10h post-accept). Zero impl produzione, zero info lost se reject (skeleton archive read-only).
- **Cross-repo evidence convergente Day 3/7 sera 2026-05-08 — IMPLICIT ACCEPT**: master-dd ha shippato cross-repo coordinazione [PR #2128](https://github.com/MasterDD-L34D/Game/pull/2128) `20dda146` `.ai/GLOBAL_PROFILE.md` CO-02 v0.3 canonical_refs MANDATORY shared (= swarm-side step 1 evo-swarm PR #85 + #89 cross-repo coordinazione). Parallel a Claude pre-design preview Game-side ([PR #2129](https://github.com/MasterDD-L34D/Game/pull/2129)). Pattern coincidence parallel = path implicit accept. Status: OPEN → **CANDIDATE-RIPE post-Phase-B-accept**. Bundle Sprint Q+ kickoff sequence eseguibile. Vedi [`docs/planning/2026-05-08-sprint-q-kickoff-coordination.md`](docs/planning/2026-05-08-sprint-q-kickoff-coordination.md) per coordination doc canonical.
- **Source ref**: [PR #2108 honesty pass](https://github.com/MasterDD-L34D/Game/pull/2108#issuecomment-honesty) + [Issue #2102 weekly digest](https://github.com/MasterDD-L34D/Game/issues/2102).

### [OD-021-original-archive] Continuous monitoring schedule (PRE-VERDICT)

- **Ambiguità**: PR #2112 Phase B synthetic supplement propone schedule Day 3-7 monitoring window: Claude rerun Tier 1 phone smoke harness ~5min/giorno per regression detection autonomous. Total ~25-30min cumulative cycle 7gg. Master-dd burden invariato.
- **Perché conta**: regression detection earlier vs Day 7 master-dd verdict. Synthetic supplement evidence growing dataset pre-Phase-B-trigger. Zero-cost Claude vs ZERO master-dd action.
- **Miglior default proposto**: **CONFIRM schedule**. Cadence proposta:
  - Day 3 2026-05-09 — synthetic iter2
  - Day 4 2026-05-10 — skip weekend opzionale
  - Day 5 2026-05-11 — synthetic iter3
  - Day 6 2026-05-12 — synthetic iter4
  - Day 7 2026-05-13 — synthetic iter5 final
  - Day 8 2026-05-14 — master-dd Option α/β verdict
- **Rischio se ignorata**: 🟢 LOW. NON eseguire synthetic = solo regression catch later. Phase A ZERO regression Day 1+2 = stable.
- **Evidence**: [PR #2112 §7](https://github.com/MasterDD-L34D/Game/pull/2112) + Day 1+2 zero regression baseline.
- **Source ref**: [docs/playtest/2026-05-08-phase-b-synthetic-supplement-iter1.md](docs/playtest/2026-05-08-phase-b-synthetic-supplement-iter1.md) §7.

### [OD-014] P6 Fairness ammortizer — Tactics Ogre rewind/WORLD-Chariot pattern ✅ RISOLTA 2026-05-11 (IMPLEMENT ORA ACCEPTED-IMPL-SCOPED)

- **Livello**: game (combat fairness + anti-frustration ammortizer)
- **Stato**: **risolta 2026-05-11** — master-dd verdict batch 11-decisioni explicit ACCEPT implement ora (~5-7h) NON deferred post-playtest.
- **Verdict**: **IMPLEMENT ORA come safety valve player**. NON gate su playtest feedback. Rewind N times per battle + snapshot state pre-action.
- **Action shipped (questa PR)**: scope ticket `TKT-P6-REWIND-SAFETY-VALVE` formal in `docs/planning/2026-05-11-big-items-scope-tickets-bundle.md` §4 (~5-7h). Implementation futura session.
- **Verdict precedente preservato (riferimento)**: deferred citation post-playtest — superseded.
- **File o moduli coinvolti**: `apps/backend/services/combat/rewindBuffer.js` (new), `apps/backend/routes/session.js` (extend `/rewind` endpoint), frontend button.
- **Source ref**: master-dd verdict batch 2026-05-11 (A3 grant) + F1 §"Tactics Ogre" + ADR-2026-04-28-deep-research-actions §5 + scope ticket bundle.

### [OD-015] P2 Macro-loop campaign — Brigandine seasonal Organization Phase pattern ✅ RISOLTA 2026-05-11 (PROMUOVI priorità M14 ACCEPTED-SCOPED)

- **Livello**: game (P2 evoluzione macro-loop campaign-wide)
- **Stato**: **risolta 2026-05-11** — master-dd verdict batch 11-decisioni explicit PROMUOVI priorità M12+ → M14.
- **Verdict**: **PROMUOVI priorità M14**. NON M12+ post-playtest deferred. Brigandine seasonal Organization Phase + Battle Phase 5-10 stagioni meta-loop scoped M14.
- **Action shipped (questa PR)**: scope ticket `TKT-P2-BRIGANDINE-SEASONAL` formal in `docs/planning/2026-05-11-big-items-scope-tickets-bundle.md` §5 (~20h). Implementation futura session.
- **Verdict precedente preservato (riferimento)**: citation-only deferred M12+ — superseded.
- **File o moduli coinvolti**: `apps/backend/services/campaign/seasonalEngine.js` (NEW), `data/core/campaign/seasons/*.yaml` (NEW).
- **Source ref**: master-dd verdict batch 2026-05-11 (A4 promotion grant) + F1+F2 §"Brigandine" + ADR-2026-04-28-deep-research-actions §5 + scope ticket bundle.

### [OD-001] V3 Mating/Nido — scope e timing ✅ FULL CLOSURE 2026-04-27 notte

- **Livello**: game + system
- **Stato**: **FULL CLOSURE 2026-04-27 notte** — verdict user **Path A** confermato + PR #1877 superseded chiuso definitivamente. Sprint Nido Path A 4/4 SHIPPED end-to-end + UI Mating tab via combo:
  - Sprint A nestHub panel + biome_arc unlock (PR #1876)
  - Sprint B debrief recruit wire (PR #1875)
  - Sprint C backend mating roll + 3-tier offspring (PR #1879)
  - Sprint D lineage chain + tribe emergent (PR #1874)
  - Lineage tab UI nestHub (PR #1911)
  - **PR #1877** (Sprint C UI con conflict frontend) → **CLOSED-superseded 2026-04-27 notte** dopo verifica 51K LOC stale rispetto a main: tutto il content backend già live via #1879, UI Mating tab già coperta da Sprint A scaffold + Lineage tab. Niente perso, doppio shipping evitato.
  - **Breakthrough 2026-04-26**: tribe **emerge automaticamente** dalla catena Nido→offspring→`lineage_id` — Path C (replace job system ~40h breaking) deprecato dalla scoperta.
  - **Pillar P2 → 🟢 candidato def** (post Spore Moderate #1913+#1915+#1916 + Lineage tab #1911).
- **Storico (preservato)**: claim originale 2026-04-25 "runtime zero / green-field" era basato su audit incomplete. Reality: engine LIVE da 4 mesi. Vedi card [M-2026-04-25-007 Mating Engine Orphan](docs/museum/cards/mating_nido-engine-orphan.md).
- **Reality verified 2026-04-25**:
  - `apps/backend/services/metaProgression.js` (469 LOC): `canMate`, `rollMating`, `computeMatingRoll`, `setNest`, `tickCooldowns`, `recruitFromDefeat` engine D1+D2 LIVE. Intro `ea945a56` (PR #1435 Design Freeze v0.9), Prisma adapter `3272f844` (PR #1679, 2026-04-23)
  - `apps/backend/routes/meta.js` (119 LOC): 7 endpoint REST `/api/meta/{npg,affinity,trust,recruit,mating,nest,nest/setup}` LIVE
  - Prisma model `UnitProgression` + migration `0004` shipped
  - **ZERO frontend integration** (`grep -rn "/api/meta" apps/play/` = 0 hit) → engine = dead path completo
- **Decisione product P0 needed** (3 path):
  - **Path A — Activate** (~12-15h): wire frontend `apps/play/src/{debriefPanel,nestHub}.js` chiama `/api/meta/*`. Output: V3 🟢 reale. Pillar P2/P3 🟢. Cross-link card M-008 nido itinerante (Skiv vagans pilot).
  - **Path B — Demolish** (~2h): routes 410 Gone + service `// QUARANTINED` header + ADR. Output: drift docs/runtime risolto, sunk cost (~50-80h shippato) accettato. OD-001 chiude → "engine quarantined, V3 truly post-MVP".
  - **Path C — Sandbox** (~5h): feature-flag OFF + sandbox script + OpenAPI doc. Output: engine pronto a riattivare senza re-scoping completo.
- **Ambiguità originale residua**: solo se Path A → quanti tagli accettabili? Quale subset prioritario (recruit-only? mating-only? nest-only?)?
- **Perché conta**: pilastro P2 (Evoluzione emergente) sarebbe **già operativo** se Path A. Senza decisione → drift docs/runtime resta + futuri agent confusione.
- **Miglior default proposto**: **decisione product PRIMA del prossimo Sprint M14**. Path C (sandbox) è low-risk middle-ground se decisione blocked.
- **Rischio se ignorata**: 50-80h sunk cost + OD/runtime drift permanente.
- **File o moduli coinvolti**: `apps/backend/services/metaProgression.js`, `apps/backend/routes/meta.js`, `apps/backend/prisma/migrations/0004_unit_progression.sql`, frontend `apps/play/src/` (Path A only).
- **Prossima azione consigliata**: **user review card M-007 + decision verdict Path A/B/C**. Cross-card link M-008 (nido itinerante Skiv) per Path A content.
- **Skiv link**: weak diretto (vagans = loner mating-blocked). Indiretto: Path A abilita "recruit ex-nemico nel debrief" Skiv narrative beat (vagans seguendo vincente).
- **Ref**: card [M-2026-04-25-007 Mating Engine Orphan](docs/museum/cards/mating_nido-engine-orphan.md), [M-2026-04-25-008 Nido Itinerante](docs/museum/cards/mating_nido-canvas-nido-itinerante.md), [excavations/2026-04-25-mating_nido-inventory.md](docs/museum/excavations/2026-04-25-mating_nido-inventory.md).

### [OD-002] V6 UI TV dashboard polish — priorità vs playtest feedback ✅ RISOLTA 2026-05-11 (ACCEPT proattivo ORA)

- **Livello**: repo (frontend UI)
- **Stato**: **risolta 2026-05-11** — master-dd verdict batch 11-decisioni explicit ACCEPT proattivo ora (~3-5h).
- **Verdict**: **ACCEPT proattivo ORA**. NON deferred post-playtest. Polish iterativo + screenshot before/after senza dipendere da TKT-M11B-06.
- **Action shipped (questa PR)**: scope ticket `TKT-B1-UI-TV-POLISH` formal in `docs/planning/2026-05-11-big-items-scope-tickets-bundle.md` §6 (~3-5h). Implementation futura session.
- **Verdict precedente preservato (riferimento)**: deferred post-playtest — superseded.
- **File o moduli coinvolti**: `apps/play/src/*.css`, `apps/play/src/lobbyBridge.js`, `docs/frontend/`.
- **Source ref**: master-dd verdict batch 2026-05-11 (B1 grant) + scope ticket bundle.

### [OD-003] Triangle Strategy rollout sequence — M14-A/B vs M15 priorità ✅ RISOLTA 2026-05-11 (sequenza M14-A → M14-B → M15 ACCEPTED)

- **Livello**: game + system
- **Stato**: **risolta 2026-05-11** — master-dd verdict batch 11-decisioni explicit ACCEPT sequenza M14-A → M14-B → M15.
- **Verdict**: **sequenza M14-A → M14-B → M15**. Non parallelizzata. 3 ticket scoped, NOT impl this session.
- **Action shipped (questa PR)**: scope ticket `TKT-M14-A` (~12h) + `TKT-M14-B` (~13h) + `TKT-M15` (~10h) formal in `docs/planning/2026-05-11-big-items-scope-tickets-bundle.md` §1-3.
- **Verdict precedente preservato (riferimento)**: proposta sequenza M14-A → M14-B → M15 confermata, ora ACCEPTED + scoped.
- **File o moduli coinvolti**: `apps/backend/services/combat/` (elevation, terrain, reaction), `apps/backend/services/vcScoring.js` (MBTI), `apps/backend/services/roundOrchestrator.js` (CT bar).
- **Source ref**: master-dd verdict batch 2026-05-11 (A2 grant) + scope ticket bundle.

### [OD-004] Game-Database HTTP runtime Alt B — quando attivare ✅ RISOLTA 2026-05-11 (status quo flag-OFF confermato)

- **Livello**: system + repo
- **Stato**: **risolta 2026-05-11** — master-dd verdict batch 11-decisioni explicit status quo flag-OFF.
- **Verdict**: **mantieni flag-OFF**. NON attivare. Status quo confermato fino a quando Game-Database non è production-ready separatamente.
- **Rationale**: agent `game-database-bridge` rimane dormiente. Re-evaluate solo post-Sprint Q+ Game-Database integration trigger.
- **Action followup**: nessuna autonomous Claude. Documentazione status quo questo verdict in OPEN_DECISIONS.
- **Verdict precedente preservato (riferimento)**: flag-OFF default confermato come canonical decision.
- **File o moduli coinvolti**: `packages/contracts/schemas/glossary.schema.json`, `apps/backend/services/catalog/`.
- **Source ref**: master-dd verdict batch 2026-05-11 (C5 status quo).

### [OD-005] Integrazione `Game Balance & Economy Tuning` skill (mcpmarket) ✅ RISOLTA 2026-05-11 (install ORA ACCEPTED)

- **Livello**: workflow
- **Stato**: **risolta 2026-05-11** — master-dd verdict batch 11-decisioni explicit ACCEPT install proattivo ora (~30min).
- **Verdict**: **install ORA** (NON deferred post-playtest). Test-driven adoption su `docs/playtest/*-calibration.md` raccolti + dataset balance esistenti.
- **Action shipped (questa PR)**: scope ticket `TKT-C6-BALANCE-SKILL-INSTALL` formal in `docs/planning/2026-05-11-big-items-scope-tickets-bundle.md` §9 (~30min). Implementation futura session (Claude lacks mcpmarket access from agent).
- **Verdict precedente preservato (riferimento)**: deferred post-playtest — superseded.
- **File o moduli coinvolti**: `.claude/settings.json` (per skill install config).
- **Source ref**: master-dd verdict batch 2026-05-11 (C6 grant) + scope ticket bundle.

### [OD-008] Sentience index backfill scope ✅ RISOLTA 2026-04-25 → ⚠️ OVERRIDE 2026-04-25 sera

- **Livello**: game + system
- **Stato**: **OVERRIDE 2026-04-25 sera (user re-decisione)** — sostituisce verdict Opzione B precedente
- **Verdict NEW**: **Opzione A — backfill TUTTE 45 species esistenti** in single PR (~6h). Zero gap residuo, drift chiuso immediatamente.
- **Ragione override**: user vuole stato definito ora invece che drift "lazy" su 3-4 sprint. Sweep dedicato accettato come lavoro one-shot.
- **Implementation plan**:
  1. Per ogni species in `data/core/species.yaml` + `data/core/species_expansion.yaml` (45 totali), assegna `sentience_index: T0-T6` via matching:
     - T0 = species senza milestones definite
     - T1 = "Senses core" presente
     - T2 = "AB 01 Endurance" presente
     - T3-T5 = milestone progression aggregate
     - T6 = full sentience marker (NPG-eligible)
  2. Validate: `python3 tools/py/game_cli.py validate-datasets`
  3. Schema enum check: `npm run schema:lint`
  4. Test: `node --test tests/api/*.test.js` (regression)
- **Verdict precedente preservato (riferimento)**: Opzione B incrementale — superseded da OVERRIDE.
- **File o moduli coinvolti**: `data/core/species.yaml`, `data/core/species_expansion.yaml`, `schemas/core/enums.json` (enum già live).
- **Ref**: card [M-2026-04-25-001](docs/museum/cards/cognitive_traits-sentience-tiers-v1.md), gallery [galleries/enneagramma.md](docs/museum/galleries/enneagramma.md).
- **Skiv-voice motivation** (user feedback): "sabbia ha strati, marcare quando passi sopra — sufficiente". Override: "marcare TUTTI i passaggi ora, non quando capita".

### [OD-009] Ennea source canonical — `data/core/personality/` vs `packs/evo_tactics_pack/...` ✅ RISOLTA confermata 2026-04-25

- **Livello**: system + repo
- **Stato**: **risolta 2026-04-25 (user OK)** — vedi card M-2026-04-25-002 + M-2026-04-25-003
- **Verdict confermato**: **Option 3 hybrid** (entrambi mantenuti):
  - **Encyclopedia**: `packs/evo_tactics_pack/tools/py/modules/personality/enneagram/` rimane source-of-truth completo (CSV + JSON + TS + PY + schema + README + 16 web sources cited)
  - **Runtime**: `data/core/personality/enneagramma_types.yaml` (NUOVO) = subset machine-readable per backend Node consumer
  - **Sync**: `scripts/sync_ennea_from_pack.js` (NUOVO ~50 LOC) converte pack JSON → data/core YAML
- **Pattern precedente**: `npm run sync:evo-pack` (`package.json:43`) fa già lo stesso per catalog. Pattern validato 1+ anno operativo.
- **Pro**: zero perdita info pack, runtime efficient, encyclopedia preservata. Pattern repo-coerente.
- **Con**: serve script sync ~50 LOC marginal cost.
- **Action plan**:
  1. Implementa wire M-006 (enneaEffects.js) con assunzione hybrid (legge da `data/core/personality/`)
  2. Convert dataset pack → `data/core/personality/enneagramma_types.yaml`
  3. Add sync script (deferrable, baseline copy manuale OK per M2 prima invocazione)
- **File o moduli coinvolti**: `data/core/personality/` (NUOVO), `scripts/sync_ennea_from_pack.js` (NUOVO), `apps/backend/services/enneaEffects.js` (extend), `apps/backend/services/vcScoring.js` (extend coverage 6/9 → 9/9).
- **Ref**: card [M-2026-04-25-002](docs/museum/cards/enneagramma-mechanics-registry.md), [M-2026-04-25-003](docs/museum/cards/enneagramma-dataset-9-types.md), gallery [galleries/enneagramma.md](docs/museum/galleries/enneagramma.md).

### [OD-010] Skiv voice palette default — Type 5 vs Type 7 ✅ RISOLTA confermata 2026-04-25

- **Livello**: game + narrative
- **Stato**: **risolta 2026-04-25 (user OK)** — skip-decision via A/B test data-driven
- **Verdict confermato**: **NON pre-decidere**. Implementare entrambe palette vocali (Type 5 Investigator stoico + Type 7 Enthusiast caotico), instrumentare telemetry `ennea_voice_type_used`, decisione default emerge da playtest data invece che a-priori user choice.
- **Skiv-voice motivation** (user feedback): "due voci nella mia testa. Una conta i granelli. L'altra ride mentre scivola. Lascia che il deserto scelga".
- **Sprint C deliverable rivisto**:
  ```
  data/core/narrative/ennea_voices/
  ├── type_5_investigator.yaml    # voce stoica taxonomica
  └── type_7_enthusiast.yaml      # voce caotica giocosa
  apps/backend/services/narrativeEngine.js
    pickVoice(unit) → vcSnapshot.ennea_archetypes[0]
                   → caso 5 || 7 → carica YAML matching
                   → fallback: type_5 (default arbitrario, non choosen design)
  ```
- **Pro**: zero arbitrary user decision. A/B test naturale nel playtest. Pattern futuro per altre creature canoniche.
- **Con**: 2× lavoro voice palette (~12h vs 6h single). Trade-off accettabile per data-driven design.
- **Tritype Skiv** (5-3-9 / 5-1-2 / altro): **rimane decision pending POST-playtest**, non pre-decidere ora.
- **File o moduli coinvolti**: `data/core/narrative/ennea_voices/` (NUOVO), `apps/backend/services/narrativeEngine.js` (extend), telemetry events.
- **Ref**: card [M-2026-04-25-003](docs/museum/cards/enneagramma-dataset-9-types.md), gallery [galleries/enneagramma.md](docs/museum/galleries/enneagramma.md).

### [OD-011] Ancestors recovery scope ✅ RISOLTA 2026-04-25 → ⚠️ OVERRIDE 2026-04-25 sera

- **Livello**: game + system
- **Stato**: **OVERRIDE 2026-04-25 sera (user re-decisione)** — full scope upgrade da Path A solo a Path A + Path B insieme
- **Verdict NEW**: **Opzione A FULL — recovery completo ~15-20h**:
  1. Wire 22 Self-Control trigger immediato (Path A originale ~5h)
  2. Estrai zip ancestors archive + restore 263 neuroni mancanti (Path B originale ~10-15h, ora **non deferred**)
  3. Integra dump completo in `data/core/traits/active_effects.yaml` o split per branch (CO/AB/SE/PA/etc.)
- **Ragione override**: user vuole gap chiuso completamente, non in fasi. Sprint B Skiv ottiene coverage massima invece che parziale.
- **Implementation plan rivisto**:
  1. Path A first (low-risk, ~5h): wire 22 CO trigger da `reports/incoming/ancestors/ancestors_neurons_dump_01B_sanitized.csv`
  2. Path B parallel (~10-15h): identifica zip source (RFC mention archive `.zip` 263 neuroni — verifica path), estrai, sanitize, deduplicate vs existing 22, integra in glossary
  3. Validate cross-pollution: nessun trait duplicato post-merge
  4. Test full: `pytest tests/scripts/test_trace_hashes.py` + `python3 tools/py/game_cli.py validate-ecosystem-pack`
- **Pre-req autonomous**: localizzare zip archive. RFC mention: probabilmente in `incoming/`, `reports/incoming/`, o esterno (Google Drive backup user). Se zip non locale → user upload prima del Path B start.
- **Verdict precedente preservato (riferimento)**: Path A wire 22 + Path B autonomous deferred — superseded da OVERRIDE.
- **File o moduli coinvolti**: `data/core/traits/active_effects.yaml`, `reports/incoming/ancestors/ancestors_neurons_dump_01B_sanitized.csv`, archive zip TBD.
- **Ref**: card [M-2026-04-25-004](docs/museum/cards/ancestors-neurons-dump-csv.md), backlog [TKT-ANCESTORS-RECOVERY](BACKLOG.md).
- **Skiv-voice motivation** override: "tracce fresche + scava le coperte. Vento o no, tutte le 297 marche o niente".
- **Skiv-voice motivation precedente**: "tracce fresche nelle dune — 34 marche chiare. Le altre 263... vento le ha coperte. Prima caccia ciò che vedi. Sabbia profonda dopo" (superseded).

### [OD-013] MBTI surface presentation — phased reveal vs accrual silenzioso vs full upfront ✅ RISOLTA Path A+B 2026-04-26

- **Livello**: game + system
- **Stato**: **RISOLTA 2026-04-26** — verdict user A+B entrambi shipped. **Path A** branch `feat/d1a-mbti-phased-reveal` (PR #1848 merged): `mbtiSurface.js` helper + `/vc` + `/pf` extension `mbti_revealed` + `debriefPanel` `#db-mbti-section` UI + 12/12 test. Threshold 0.7 default (env `MBTI_REVEAL_THRESHOLD` A/B). **Path B** branch `feat/d1b-mbti-dialogue-color-codes`: palette canonical 8 colori in `data/core/personality/mbti_axis_palette.yaml` (WCAG AA ≥5.02:1) + `mbtiPalette.js` (loader/lookup/tag/contrast helpers) + `dialogueRender.js` (DOM-free renderer reveal-gated compose Path A) + CSS axis classes con hover tooltip + print-safe + 26/26 test. P4 🟡 → 🟡++ (Path A+B both shipped; integration narrativeEngine + render.js pendente). Card M-009 reuse_path completato.
- **Stato precedente**: proposta 2026-04-25 (museum card [M-2026-04-25-009 Triangle Strategy](docs/museum/cards/personality-triangle-strategy-transfer.md) trigger)
- **Ambiguità**: P4 MBTI/Ennea attualmente 🟡. Triangle Strategy research doc propone 3 path per surface MBTI al player:
  - **Proposal A — Phased reveal** (Disco Elysium pacing): solo axis con `confidence_per_axis > 0.7` mostrato, reveal progressivo durante campaign
  - **Proposal B — Dialogue color codes** (diegetic): ogni MBTI axis ha color palette, player vede senza menu esplicito
  - **Proposal C — Recruit gating** (depends on M-007 mating engine): recruit fails if MBTI distance > threshold
- **Perché conta**: P4 closure path 🟡 → 🟢 senza nuova matematica. Triangle Proposals usano `vcScoring.js` esistente, ROI altissimo per effort moderato.
- **Miglior default proposto**: **Proposal A (Phased reveal)** come pilot, ~6-8h. Hook in `vcScoring.js` per `confidence_per_axis`, frontend filter in debriefPanel. A/B con full upfront via flag se time permette. Proposal B (color codes) come Sprint+1. Proposal C deferred a OD-001 Path A.
- **Rischio se ignorata**: P4 resta 🟡 indefinitamente, Triangle research stays buried. Skiv Sprint C voice palette manca contesto MBTI surface.
- **File o moduli coinvolti**: `apps/backend/services/vcScoring.js`, `apps/backend/routes/session.js`, `apps/play/src/debriefPanel.js`, telemetry events.
- **Prossima azione consigliata**: user verdict A/B/C/skip + promote a 3 ticket BACKLOG (TKT-P4-MBTI-001/002/003) come da card.
- **Ref**: card [M-2026-04-25-009 Triangle Strategy MBTI Transfer](docs/museum/cards/personality-triangle-strategy-transfer.md), gallery [galleries/enneagramma.md](docs/museum/galleries/enneagramma.md), source [docs/research/triangle-strategy-transfer-plan.md](docs/research/triangle-strategy-transfer-plan.md).

### [OD-012] Swarm trait integration scope ✅ RISOLTA 2026-04-25 → ⚠️ OVERRIDE 2026-04-25 sera

- **Livello**: game + system
- **Stato**: **OVERRIDE 2026-04-25 sera (user re-decisione)** — sostituisce single-shot con batch
- **Verdict NEW**: **Opzione B — batch 5-10 trait swarm** (~10h). Magnetic_rift come pilot incluso nel batch, ma scope esteso a 5-10 trait swarm in singolo PR.
- **Ragione override**: user vuole velocità di integrazione + cluster validation. Trade-off: rischio blast radius leggermente più alto, mitigato da test regression.
- **Implementation plan rivisto**:
  1. Sweep candidate da `feat/swarm-staging` branch + `incoming/swarm-candidates/traits/` per identificare 5-10 trait
  2. Pre-flight: `node --check` su ciascun YAML, schema lint AJV
  3. Magnetic_rift first (pilot, ~2h): biome `atollo_ossidiana` placeholder + `requires_traits` deps stub
  4. Batch wire altri 4-9 trait con pattern condiviso (`requires_traits`, `effect_trigger`, status mapping)
  5. Test full: `pytest tests/test_biome_synthesizer.py` + `npm run schema:lint` + `node --test tests/ai/*.test.js` (regression baseline)
  6. Status registry decision: per ogni nuovo status (`telepatic_link`, etc.), check existing (`linked`, `coordinated`) prima di add-only
- **Verdict precedente preservato (riferimento)**: Opzione A single-shot magnetic_rift only — superseded da OVERRIDE.
- **File o moduli coinvolti**: `data/core/traits/active_effects.yaml`, `data/core/biomes.yml`, `apps/backend/services/combat/biomeResonance.js`, `incoming/swarm-candidates/traits/*.yaml` (source pool), `feat/swarm-staging` branch (history mining).
- **Ref**: card [M-2026-04-25-005](docs/museum/cards/old_mechanics-magnetic-rift-resonance.md).
- **Skiv-voice motivation** override: "5-10 pietre alla volta. Sorelle insieme parlano meglio".

---

## Risolte (archivio OD chiuse)

### [OD-016] Midnight Suns 3-card-plays + Heroism economy — design precedent thoughts ritual (citation-only) ✅ RISOLTA 2026-04-28

- **Livello**: game (P4 MBTI thoughts ritual UI design audit strength)
- **Stato**: ✅ closure citation 2026-04-28 (Action 8 P3) — moved Aperte → Risolte 2026-05-08 sera (audit cleanup misplace)
- **Ambiguità**: thoughts ritual G3 (PR #1983) usa pattern 3-card-style (3 candidati + 30s timer + irreversible) — research valida questo è Midnight Suns Hero Combo unlock-by-relationship design precedent. NO design change needed.
- **Verdict**: cita Midnight Suns canonical URL `https://midnightsuns.2k.com/it-IT/game-guide/gameplay/hero-abilities/` in NEXT thoughts-ritual ADR (rinforza decision audit). Non urgente — già implementato + funziona. Pure citation strength per future ADR thoughts ritual extension.
- **Source ref**: F1 §"Midnight Suns" + F2 §"Midnight Suns" + ADR-2026-04-28-deep-research-actions §5 citations + PR #1983 G3 Skiv thoughts ritual choice UI shipped 2026-04-27/28.

### [OD-006] Master orchestrator prompt — adottare o no? ✅ RISOLTA

- **Livello**: workflow
- **Stato**: **risolta 2026-04-24**
- **Verdict**: **NON adottare**. L'archivio `07_CLAUDE_CODE_OPERATING_PACKAGE/CLAUDE_CODE_MASTER_ORCHESTRATOR.prompt.md` duplica funzionalmente:
  - Auto mode (gestisce multi-step esecuzione senza prompt esplicito)
  - `.claude/TASK_PROTOCOL.md` (7-fasi orchestration flow già formalizzato)
  - Skill `anthropic-skills:game-repo-orchestrator` (bootstrap projet + archivio, già installata)
  - Skill `anthropic-skills:first-principles-game` (audit design + refactor decisioni)
- **Conseguenza**: nessuna azione. `docs/reports/2026-04-24-repo-autonomy-readiness-audit.md` item C.5 marcato "non applicabile, coperto da auto mode + TASK_PROTOCOL".
- **Ref**: audit readiness section C.5.

### [OD-007] Sprint 3 archivio — chiudere o deferrere? ✅ RISOLTA

- **Livello**: workflow
- **Stato**: **risolta 2026-04-24** (questa sessione)
- **Verdict**: chiuso. BACKLOG.md + OPEN_DECISIONS.md + master orchestrator decision (OD-006) creati. Readiness score da 21.5/24 a 23.5/24 (gap residuo minore: C.5 "master orchestrator" marcato "non applicabile" = effettivo 5/5 relativo → **24/24 practical max**).
- **Ref**: commit Sprint 3, PR associata.

---

## Regola pratica

Se la decisione:

- **blocca davvero il gameplay core** (es. cambiare round flow, vision pilastri)
- **cambia visione o scope** (es. taglio feature centrale)
- **impatta più sistemi in modo irreversibile** (es. schema breaking change)

allora **non basta questo file**: serve **checkpoint umano** + **ADR ufficiale** in `docs/adr/`. OPEN_DECISIONS è per ambiguità tattiche operative.

**Anti-pattern**: accumulare OD senza review. Periodicamente (ogni 2-3 sprint) → batch review + chiusura o escalation ad ADR.

## Ref

- `DECISIONS_LOG.md` — index 30 ADR storici
- `docs/adr/` — ADR ufficiali
- CLAUDE.md — sprint context e pilastri
- `docs/reports/2026-04-24-repo-autonomy-readiness-audit.md` — audit readiness che motiva alcune OD
