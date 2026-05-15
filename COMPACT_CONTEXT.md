# COMPACT_CONTEXT — Evo-Tactics

> **Scope**: snapshot 30 secondi. Sessione successiva parte da qui.
> **Cambia ogni sessione significativa**. Aggiornamento manuale o via skill `/compact`.

---

## Progetto

- **Nome**: Evo-Tactics
- **Versione compact**: v40 (post sessione 2026-05-11 verdict batch + scope tickets cascade + M14-B + P2 Brigandine A+B+C — 113 PR cumulative Day 5+1+2+3)
- **Ultimo aggiornamento**: 2026-05-11 ~22:00 UTC. **113 PR cumulative** (112 Game/ + 2 Game-Godot-v2 #217+#218 MERGED). Major delta v39→v40 (20 PR turno verdict + cascade): verdict batch 4 ADR/proposal ACCEPTED (#2234-#2237) + 4 cascade scoped tickets (#2238-#2247: C6 install-doc + C4 mutation Phase 6 + B1 UI polish + P6 rewind + M15 promotion + C1 Vue 3 4/5 + P6-FE rewind HUD + M15-FE promotion UI + M14-A elevation+terrain + C1-FE editor full port) + M14-B Conviction Phase A+B+C cross-fase (#2248-#2250: engine + 5 dialogue branches + 2 endpoints + 9 tests) + TKT-P2 Brigandine Phase A+B+C cross-fase (#2251-#2253: seasonal engine + 4 seasons YAML + 2 phases + 6 endpoints + 11 tests). Pillar deltas v40: P1 🟢 → 🟢++ (elevation+terrain) + P2 🟢ⁿ → 🟢ⁿ+ (Brigandine seasonal stack) + P3 🟢ⁿ confermato (promotion engine) + P4 🟡 → **🟢 candidato** (Conviction system FULL closure) + P5 🟢++ confermato + P6 🟢 → 🟢 confermato (rewind safety valve). AI 393→417 + API 988→1069 verde. **Vedi memory: project_session_2026_05_11_verdict_cascade_v40.md**.

## ⚡ TL;DR sessione 2026-05-13/14/15 — ecosystem audit + ai-station Envelope A+B+C cascade (v41)

**Trigger user**: "analizza col metodo tutta l'infrastruttura Ecosistema > Biomi > reti trofiche > hazard > specie > mating > creature giocabili ed evoluzioni" (2026-05-13).

**Cascade cumulative 14 PR shipped** (Game/ + Godot v2 + vault):

| PR | Topic | Tests |
|---|---|:--:|
| Game/ #2260 | Audit ecosystem 7-strati 495 LOC + plan 22 ticket TKT-ECO-XX 730 LOC | docs |
| Game/ #2261 | Envelope A bundle (OD-025 smoke + OD-028 Howler + OD-030 flag-ON) | 16/16 |
| Game/ #2262 | Envelope B bundle (OD-024 + OD-025-B2 + OD-027 + OD-029 + OD-031) | 24/24 |
| Game/ #2263 | fix promotion JS FALLBACK_CONFIG cross-stack parity drift | parity |
| Game/ #2264 | Phase B3 PromotionEngine job_archetype_bias + vc_scoring sentience fold | TKT-A8 |
| Game/ #2265 | Playtest #2 analyzer + cross-stack fixture | infra |
| Game/ #2266 | Cloudflare prod deploy guide + Playtest #2 synthetic baseline (P3 🟡 + P4 🟢 + P6 🟢) | E ✅ |
| Game/ #2267 | GSD audit Bundle B — conviction tactical flags + balance tweaks | P3+P4 |
| Game/ #2268 | Phase B4 promotionEngine job_threshold_override engine consume | P3 |
| Game/ #2269 | endCombat debrief_payload backend wire | coop |
| Game/ #2270 | broadcast debrief_payload type — Phase-3 cross-stack closure | open |
| Godot v2 #259 | Envelope B mirror SpeciesCatalog + NeuronsBridgeCatalog + PromotionEngine | 60/60 |
| Godot v2 #260 | Envelope C scaffold OD-026 Diegetic Atlas (TV + Phone) | 18/18 |
| Vault #5 | ai-station re-analisi 6/8 verdict ribaltato "finish work, not conservative" | docs |

**Cumulative tests cross-stack**: 118/118 verde + ai-station tests 393 → 422 (Game/) + 1877 → 1955 (Godot v2).

**8/8 OD audit ai-station re-analysis CLOSED** post cross-validation (OD-024 + OD-025-B2 + OD-026 + OD-027 + OD-028 + OD-029 + OD-030 + OD-031). 5 OD aperte storiche resolved cascade.

**Pillar deltas v40 → v41 confermati**:
- P3 Identità: 🟢-cand → 🟢 candidato HARD (PromotionEngine elite+master + B3 + B4 + parity)
- P4 Temperamenti: 🟢-cand → 🟢 candidato HARD (sentience 15/15 + 51 neurons + vc_scoring fold + 4 traits interocettivi)
- P5 Co-op: 🟢 confirmed + Phase-3 debrief_payload cross-stack closure (#2270 in flight)
- P6 Fairness: 🟢 candidato confermato (conviction tactical flags inline)

🟢 hard final ancora gated **Playtest #2 userland** (master-dd manual, 4 amici).

**Phase A residue mio plan TKT-ECO-XX (~9-10h)**:
- A1 ✅ smoke mutations PARTIAL-WIRED (visual aspect_token + MP accrual + API wrapper)
- A2 ✅ shipped via #2261 verify smoke
- A3 ✅ museum card M-007 post-script "FULL CLOSURE OD-001 Path A 2026-04-27"
- A7 ✅ mating.yaml pack drift sync (gene_slots 84 LOC core → pack)
- A8 ✅ shipped via #2264 (Phase B3 promotions engine)
- A6 🟡 PARTIAL backend chain wired, frontend characterCreation label gap (~30 LOC, scope creep)
- A5 ⏳ pending bioma diff_base + hazard pressure modifier (~3h, sessionHelpers backend)
- A4-residue ⏳ pending 30 species heuristic sentience (~3-4h, master-dd review)

**3 governance Q questions still open** (vault re-analisi cascade NON addressed):
- Q1 schema fork OD-027 (species.yaml 45 ↔ catalog 15 dual SOT)
- Q2 TKT-ECO-A7 mating drift autonomous → ✅ shipped this session
- Q3 TKT-ECO-A8 promotions engine Phase B3 → ✅ shipped via #2264

**Branch claude/analyze-ecosystem-infrastructure-W4Lyf**: post-merge HEAD `2889a90` con commit residui Codex fix + cascade verify + A1/A3/A7 + branch sync. Future session reuse o delete dopo final closure.

**Anti-pattern killer milestone**: PR #2260 cross-validation L7c Promotions ORPHAN claim FALSE NEGATIVE → museum discard card M-2026-05-13-001 + lessons codify per Explore agent inventory tasks (grep cross sub-dir naming variants + import destrutturati cross routes).

---

## ⚡ Resume trigger phrase canonical (next session — post-2026-05-15 ai-station cascade v41)

**Primary** (Phase B Day 7 formal closure):

> _"Phase B Day 7 iter5 2026-05-14 — formal grace closure γ default ratificato + cascade actions ADR §13.4 (web-v1-final tag + apps/play archive + README banner)"_

**Big items remaining post-verdict ACCEPT batch**:

- TKT-P2 Phase D UI Godot v2 phone composer (~3h, cross-stack closure seasonal stack)
- Side-runs cleanup #2226/#2227/#2228 (CONFLICTING/DRAFT)

**Verdict cascade closure v40 — zero outstanding ADR/proposal queue master-dd**:
ADR #2216 AngularJS + #2222 mutation Phase 4 + #2230 species_expansion + Proposal #2231 T3 lore tutti ACCEPTED via verdict batch #2234.

**Forbidden path bundle** GRANTED + SHIPPED:

> ~~Mutation Phase 6 ADR + Prisma migration 0009+ ally_adjacent_turns + trait_active_cumulative kinds~~ ✅ shipped #2239 `26bd5360`

Spec docs canonical pre-stage:

- [docs/planning/2026-05-10-sprint-q-plus-qa-prestage-bundle.md](docs/planning/2026-05-10-sprint-q-plus-qa-prestage-bundle.md) — Q-1 schema + Q-2 migration + §13.3 fill template
- [docs/planning/2026-05-10-sprint-q-plus-qbcde-spec-extension.md](docs/planning/2026-05-10-sprint-q-plus-qbcde-spec-extension.md) — Q-3 → Q-12 full pipeline spec

Pre-closure history (mantenuta):

- **Versione v39**: post sessione 2026-05-11 mattina+pomeriggio Opzione A cascade + Phase B Day 4+5 + 2 ADR PROPOSED — 88 PR cumulative.
- **Versione v38**: post sessione 2026-05-10 notte Sprint Q+ Q-10 cross-stack closure 12/12 + trait orphan ASSIGN-A FULL CLOSURE — 76 PR cumulative.
- **Versione v37**: post sessione 2026-05-10 sera FULL Sprint Q+ closure + close-gaps cascade — 71 PR cumulative + Q.A→Q.E pipeline + Phase B ACCEPTED γ + waves 0-4 35/91 trait orphan.
- **Versione v36**: post sessione 2026-05-10 sera cascade L3 — 51 PR cumulative + Phase 5 partial + npm audit + MC build PAT E2E + browser ops AUTODEPLOY_PAT autonomous.
- **Versione v35**: post sessione 2026-05-10 mattina FULL AUDIT CLOSURE — 41 PR cumulative + 17/17 audit + 13/13 verdict closed + T4 ladder 5/5.

## ⚡ TL;DR sessione 2026-05-10 sera FULL Sprint Q+ closure (v37)

**Trigger**: cascade approval → "facciamo gli auto trigger pending e poi continuiamo con i due next gate in parallel" → "procedi continuando in autonomia" → escalation "3+4 e dopo facciamo 2+1" → power-out resume → closure ritual.

**20 PR sera v37 delta** (post-v36):

| #   | PR    | SHA        | Topic                                                                          |
| --- | ----- | ---------- | ------------------------------------------------------------------------------ |
| 1   | #2195 | `089cea2e` | V9+V10 reentry audit + C delete batch (3/4) + BACKLOG corrections              |
| 2   | #2196 | `299f9700` | QA reports regen post-#2195 trait C delete                                     |
| 3   | #2198 | `898d4968` | Phase B ACCEPTED Path γ default — master-dd verdict 2026-05-10 sera            |
| 4   | #2199 | `e231423a` | Trait orphan ticket codification post-V10 audit                                |
| 5   | #2200 | `862dde8b` | Sprint Q+ Q.A — Q-1 schema + Q-2 migration Offspring                           |
| 6   | #2201 | `f8f37904` | Sprint Q+ Q.B — Q-3 propagateOffspringRitual + Q-4 HTTP API + Q-5 bridge       |
| 7   | #2202 | `41778bd1` | Sprint Q+ Q.C — Q-7 validator implementation + Q-8 workflow gate               |
| 8   | #2203 | `7092c24e` | Sprint Q+ Q-9 — Offspring Ritual UI surface DebriefView                        |
| 9   | #2204 | `bdf16717` | Sprint Q+ Q.E — Q-11 E2E test + Q-12 closure ADR shipped                       |
| 10  | #2205 | `df87a4b5` | npm audit C surgical — trait-editor semver fix + cluster analysis              |
| 11  | #2206 | `86ec898b` | trait orphan A=keep biome-aligned assignment proposal                          |
| 12  | #2208 | `61042522` | trait orphan ASSIGN-A wave 0+1 — 14 traits / 12 species                        |
| 13  | #2209 | `e189f4e4` | trait orphan ASSIGN-A wave 2 DEFENSIVE — 6 traits / 6 species                  |
| 14  | #2210 | `9c065375` | trait orphan ASSIGN-A wave 3+4 STATUS+SENSORY — 15 traits / 9 species          |
| 15  | #2211 | `25c124fc` | BACKLOG sync trait orphan progress + ajv-cli investigation closure             |
| —   | #217  | _open_     | Game-Godot-v2 Q-10 OffspringRitualPanel + service (in-flight master-dd review) |

**Sprint Q+ ship state**: 12/12 ticket Q-1 → Q-12 cross-stack. Game-side 11/12 SHIPPED + Q-10 Godot v2 #217 in-flight master-dd. Effort actual ~3.5h vs ~19-21h estimated (5-6x faster spec pre-stage + agent paralleli).

**Trait orphan ASSIGN-A**: 35/91 (38%) shipped player-visible across 3 waves. Residue 56 (28 wave 5+6 master-dd review TBD + 28 species_expansion schema decision).

**Phase B**: ACCEPTED Path γ default 2026-05-10 sera. Formal grace closure 2026-05-14.

**Pillar deltas v37**:

- P2 Evoluzione 🟢++ → 🟢ⁿ (offspring ritual cross-encounter lineage propagation runtime LIVE)
- P3 Identità Specie × Job 🟢ⁿ → 🟢++ confermato (39 trait abilities + 35 trait orphan player-visible)
- P5 Co-op vs Sistema 🟢 → 🟢++ (zero regression validated, threatAssessment + ws lobby + offspring shared)

**Anti-pattern killer**: Engine LIVE / Surface DEAD diagnostico 2026-04-25 (museum M-2026-04-25-007 mating engine orphan score 5/5) → cross-stack offspring ritual ship 2026-05-10 (16gg gap closed).

Pre-pre-closure history (mantenuta):

- **Versione precedente v34**: post sessione 2026-05-09 sera→2026-05-10 nightly cron P0 fix + sweep harness extension. **3 PR Game/ shipped main + 1 DRAFT-→ready-review**:
  - #2155 `48eaf24a` nightly cron P0 (WS port 3334 vs 3341 + `set +e` regression-detection)
  - #2152 `5466cf45` Skiv Monitor auto-update admin merge
  - labels create direct (3rd P0 — `ai-sim-regression` + `automated` mancavano)
  - #2156 DRAFT→ready-review: scenario diversity sweep harness YAML loader opt-in (Codex P2 #1 grid + #2 objective whitelist addressed, NIT 2 WS scheme validation shipped)
  - Cumulative Day 5 + 2026-05-10 closure = **15 PR Game/ shipped main** (#2140-#2151 + #2153 + #2155 + #2152) + 1 PR open #2156 + 1 Godot v2 + 1 Godot v2 direct main.

## ⚡ Resume trigger phrase canonical (next session — post-2026-05-10 closure)

> _"verifica primo nightly cron run scheduled 2026-05-10 02:00 UTC (artifact + threshold report — auto-fired post wakeup chain), merge PR #2156 master-dd verdict pending (sweep YAML loader + Codex P2 fix), poi MAP-Elites sticky × commit × softmax grid OR scenario diversity sweep run real (aggressive × enc_tutorial_01/02 + savana/caverna/savana_skiv/survival)"_

OR (post-#2156 merge):

> _"esegui scenario diversity sweep aggressive default × 5+ scenari validi (enc_tutorial_01/02 + savana_01 + caverna_02 + savana_skiv + survival_01) N=20 con AI_SIM_LOAD_YAML=1 — ~10-15min compute"_

OR (precedente — invariato):

> _"verifica primo nightly cron run 2026-05-10 02:00 UTC (artifact + threshold report) + esegui scenario diversity sweep aggressive default × enc_tutorial_02..05 + hardcore-\*"_

OR (post first nightly run pass):

> _"esegui MAP-Elites K4 grid — sticky × commit × softmax cells ~150 runs"_

OR (Phase A Day 5/7 monitoring continua):

> _"leggi COMPACT_CONTEXT.md v32 + docs/planning/2026-05-07-phase-a-handoff-next-session.md + docs/planning/2026-05-08-sprint-q-kickoff-coordination.md. Phase A Day 5/7 monitoring 2026-05-11 (synthetic iter3 trigger OD-021) + verifica master-dd Phase B verdict + OD-022 explicit verdict."_

OR (post 7gg grace 2026-05-14):

> _"Phase B ACCEPTED → Sprint Q+ kickoff bundle (Q-1→Q-12 + OD-022 step 3+4 ~19-23h). Eseguire ADR-2026-05-05 §6 archive + sprint-q-kickoff-coordination.md trigger sequence."_

Handoff doc canonical: [`docs/planning/2026-05-07-phase-a-handoff-next-session.md`](docs/planning/2026-05-07-phase-a-handoff-next-session.md)

OR (post 7gg grace 2026-05-14):

> _"Phase B archive web v1 formal post 7gg grace + 1+ playtest pass — eseguire ADR-2026-05-05 §6"_

## ⚡ TL;DR sessione 2026-05-09 sera K4 Approach B + 4 task autonomous closure

**Trigger**: user resume "leggi `docs/planning/2026-05-09-fase1-2-handoff-next-session.md`, esegui Option A K4 Approach B commit-window" → escalation "3+5+esegui FASE 1 T1.3" → grant esplicito `.github/workflows/` "si facciamo subito".

**4 PR Game/ shipped main 2026-05-09 sera**:

- [#2149](https://github.com/MasterDD-L34D/Game/pull/2149) `e608ddd8` K4 Approach B commit-window guard 100% WR N=40 (+10pp vs K3 baseline 90%, avg rounds -0.8r). Side-fix critico: state tracking `last_action_type` + `last_move_direction` ora in `sessionRoundBridge.js realResolveAction` post-commit (pre-PR esisteva solo in legacy `sistemaTurnRunner.js` DEAD path → K4 sticky era no-op nel round flow).
- [#2150](https://github.com/MasterDD-L34D/Game/pull/2150) `94dabd95` swap default aggressive profile → utility ON + commit_window 2. Profile alternativi preservati ablation (`aggressive_no_util`, sticky variants, explicit `aggressive_commit_window`).
- [#2151](https://github.com/MasterDD-L34D/Game/pull/2151) `9f8bcaae` FASE 1 T1.3 browser sync spectator Playwright headless + visual diff CLI 3 modi. Smoke validato 4 PNG cattura + manifest.json + telemetry.jsonl. Open question phone composer no canvas → DOM bbox vs PNG fallback.
- [#2153](https://github.com/MasterDD-L34D/Game/pull/2153) `ebb04e8f` FASE 5 nightly cron `.github/workflows/ai-sim-nightly.yml` + `tools/sim/check-thresholds.js`. Cron 02:00 UTC, drift threshold ±10pp, completion floor 95%. Su regression: GH Issue label `ai-sim-regression,automated` + artifact 14d retention. **First scheduled run 2026-05-10 02:00 UTC**.

**Sweep N=40 K4 commit-window evidence**:

- victory: 40/40 = **100% WR** (cap), avg_rounds 24.2 (-0.8 vs baseline 25.0)
- baseline N=20 K3 prod re-validated stesso tunnel: 18V/2D = **90% WR** avg 25.0r
- ΔWR +10pp absolute (capped). Zero timeouts, zero defeats.
- Guard footprint: 90 firings / 1208 SIS decisions = 7.4%. 9/40 runs ZERO firings (target non oscillava → guard dormant, utility brain pulito vince).

**Pillar deltas**: P1 Tattica 🟢++ (commit-window deterministico = AI behavior più readable). P5 Co-op 🟢 confermato. Altri invariati.

**Cumulative Day 5 (2026-05-09)** = 13 PR Game/ shipped main (#2140-#2151 + #2153) + 1 Godot v2 + 1 Godot v2 direct main.

**Lessons codified questa sessione**:

- **Round flow state tracking gap** (PR #2149 side-fix): K4 sticky PR #2147 era no-op nel round flow perché `last_action_type` esisteva solo in legacy `sistemaTurnRunner.js` (DEAD path M17 ADR-2026-04-16). Il fix ha riabilitato retroattivamente sticky variants (out of scope re-test).
- **Determinismo > additive sticky** in 2-unit kite oscillation: weighted sum considerations (Distance/TargetHealth/SelfHealth) dominava additive 0.30 max. Anti-flip guard con override hard-coded del policy.intent ignora score gradient.
- **`.github/workflows/` grant explicit user-side**: classifier blocca ogni write/copy senza grant esplicito. User dice "fallo" → autorizzato. Senza esplicito → STOP + surface decision.
- **Playwright > Chrome MCP per CI-friendly visual regression**: già dev-dep installata, headless di default, no extension/user-profile dipendenza.

## ⚡ TL;DR sessione 2026-05-08 sera Day 3/7 trigger autonomous + normalize chip

**Trigger**: user resume "leggi COMPACT_CONTEXT.md v30 + handoff. Phase A Day 3/7 monitoring 2026-05-09 — synthetic iter2". Execution UTC = `2026-05-08` (1 calendar day anticipo vs OD-021 schedule label). Master-dd weekend playtest signal **ABSENT** (12+h silenzio post Day 2/7 closure #2116).

**Date label convention canonical**: filename + label = `<schedule-day>` (= `2026-05-09` per OD-021), body §setup = real UTC execution timestamp.

**7 PR Game/ shipped autonomous Day 3 trigger**:

- [#2118](https://github.com/MasterDD-L34D/Game/pull/2118) `27dc92e6` synthetic supplement iter2 + handoff Day 3 + COMPACT v31 + memory ritual
- [#2119](https://github.com/MasterDD-L34D/Game/pull/2119) `0423001a` normalize chip drift: handoff date label + PR count gh ground truth + CLAUDE.md sprint
- [#2108](https://github.com/MasterDD-L34D/Game/pull/2108) `1cfd7220` evo-swarm run #5 distillation merge (honesty pass shipped pre)
- [#2120](https://github.com/MasterDD-L34D/Game/pull/2120) `9d57a2c5` OD-022 add evo-swarm cross-verification gate pre run #6
- [#2121](https://github.com/MasterDD-L34D/Game/pull/2121) `1ee6fd94` triage run #5 5/7 closed canonical grep (2 deferred Sprint Q+)
- [#2117](https://github.com/MasterDD-L34D/Game/pull/2117) `2656640c` Skiv Monitor auto-update admin merge
- [#2122](https://github.com/MasterDD-L34D/Game/pull/2122) `95ac1ef3` Day 3 closure cumulative: BACKLOG + COMPACT + CLAUDE.md + memory + handoff fill TBDs
- [#2123](https://github.com/MasterDD-L34D/Game/pull/2123) `bec82f12` OD audit cleanup OD-016 sposta Aperte→Risolte (drift, corrected by #2125)
- [#2125](https://github.com/MasterDD-L34D/Game/pull/2125) `e6e0ba0a` Completionist enrichment + museum card M-2026-05-08-001 + lesson codify CLAUDE.md §"No anticipated judgment"

**Synthetic iter2 evidence**:

- Tier 1 phone smoke fresh capture localhost main HEAD `51d9df4e`
- 15/16 PASS + 1 SKIP in 39.8s (vs iter1 39.4s = +0.4s noise)
- Iter3 hardware-equivalent: host reconnect 30.9s grace + WS RTT p95 441ms (zero degradation)
- Bug bundle B5+B6+B7+B8+B9+B10 + Iter3 item 2+3 tutti verdi
- Doc canonical: `docs/playtest/2026-05-09-phase-b-synthetic-supplement-iter2.md`

**Phase A guard verified Day 3/7**:

- ✅ CI Game/ + Godot v2 main verde 5/5 last runs
- ✅ Skiv Monitor 4 verde post-restore Day 2/7
- ✅ Zero functional regression Day 1 → Day 2 → Day 3
- ✅ ADR §4.4 critical bug regression trigger NOT fired

**Cumulative Phase A gh ground truth Day 1+2 UTC** = 51 PR cross-repo (37 Game/ + 14 Godot v2; +1 PR #2124 closed senza merge revert direction). Vecchio tracking "21 Claude-shipped autonomous" sotto-stimava cross-repo + Codex iter rounds.

**Day 4 (2026-05-10) skip per OD-021** (Day 3+5+7 only). Day 5 scheduled iter3 = 2026-05-11.

---

## ⚡ TL;DR sessione 2026-05-08 Day 2/7 monitoring — 4 PR autonomous + 5 OD aperte

**Trigger**: user post-handoff-resume Day 2/7 monitoring window. Master-dd silenzioso playtest signal. Claude autonomous research-only scoping + RCA + synthetic supplement.

**4 PR Game/ shipped autonomous** (~10min cumulative auto-merge L3 cascade):

| #   | PR                                                       | SHA        | Topic                                                                                                    | Tipo          |
| --- | -------------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------------- | ------------- |
| 1   | [#2109](https://github.com/MasterDD-L34D/Game/pull/2109) | `66bfc200` | Sprint Q+ GAP-12 LineageMergeService ETL scoping (12 ticket Q-1→Q-12, ~14-17h)                           | design-only   |
| 2   | [#2110](https://github.com/MasterDD-L34D/Game/pull/2110) | `009c812c` | Tier 2 PlayGodot integration prep — kill-60 verdict reject (PlayGodot 20-40h custom Godot fork burden)   | research-only |
| 3   | [#2111](https://github.com/MasterDD-L34D/Game/pull/2111) | `3c588278` | Skiv Monitor RCA — 30/30 fail post 2026-04-25 + 4-option fix menu (Option A repo toggle 30s recommended) | RCA forensic  |
| 4   | [#2112](https://github.com/MasterDD-L34D/Game/pull/2112) | `c4515b31` | Phase B synthetic supplement iter1 (Tier 1 phone smoke 15/16 verde localhost, ZERO regression Day 1→2)   | live evidence |

**5 OD aperte tracking master-dd action** (vedi `OPEN_DECISIONS.md`):

- OD-017 Phase B trigger 2/3 Option α/β/γ (🔴 hard gate)
- OD-018 Tier 2 PlayGodot kill-60 accept/reject (🟡 strategic)
- OD-019 Skiv Monitor fix Option A/B/C/D (🟡 cosmetic)
- OD-020 Sprint Q+ pre-kickoff 5 sub-decisione (🔴 gated post-Phase-B)
- OD-021 Continuous synthetic monitoring Day 3-7 schedule (🟢 low-risk)

**Stale ticket cleanup**: 6 ticket pre-pivot/pre-Phase-A marcati closed/superseded (Sprint M.1 + Sprint M.5 race + Sprint G.2b BG3-lite Plus + TKT-M11B-06 + Playtest round 2 + Pivot Godot).

**Test baseline post-cascade**: Tier 1 phone smoke 15/16 + 1 skip (39.4s, ZERO regression Day 1→Day 2). CI Game/ + Godot v2 main verde.

**Cumulative Phase A Day 1+2** = 18 PR Claude-shipped autonomous (sera 4 + Day 2 morning 3 + Day 2 sera 5 + Day 2 tarda sera 1 + Day 2/7 monitoring oggi 4 + 1 docs PR session memory).

---

## ⚡ TL;DR sessione 2026-05-07 Day 2 tarda sera — audit closure 14/15 (+1 PR GAP-11)

**Trigger**: user _"continua"_ post Day 2 sera surface debt cascade closure. Audit godot-surface-coverage residuo P2 wires.

**1 PR Game-Godot-v2 ~30min**:

| #   | PR                                                              | SHA        | Topic                                          |
| --- | --------------------------------------------------------------- | ---------- | ---------------------------------------------- |
| 1   | [#215](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/215) | `42307516` | GAP-11 PseudoRng miss-streak compensation wire |

**Audit godot-surface-coverage closure status post-#215**:

- ✅ 14/15 closed: GAP-1, GAP-2, GAP-3, GAP-4, GAP-5, GAP-6, GAP-7, GAP-8, GAP-9, GAP-10, GAP-11, GAP-13, GAP-14, GAP-15
- ⏸ GAP-12 LineageMergeService P2 deferred Sprint Q+ (requires bond_path completion + offspring instantiation pipeline mating_trigger ETL)

**Wire details**:

- combat_session.resolve_attack_action: pre-resolve init_unit + get_streak_bonus folded into attacker_payload, post-resolve record_roll, surface event.pseudo_rng_streak_bonus
- battle_feed_adapter: emits "🎯 actor: bonus anti-streak +N" line on non-zero
- Phoenix Point bounded streak: 3 consecutive miss → +5 attack_mod next roll, hit resets streak

**Test baseline**: GUT 1957 → 1964 (+7 GAP-11). Format + gdlint clean.

**Pillar P6 Fairness 🟢++ rinforzato** — anti-frustration tilt without killing variance.

**Cumulative Day 2 PR Godot v2**: 10 (3 morning Sprint M.7 chip + 5 sera + 1 tarda sera + 1 GAP-11). **Cumulative session 2026-05-07**: 14 PR (sera 5 + Day 2 morning 3 + Day 2 sera 5 + Day 2 tarda sera 1).

---

## ⚡ TL;DR sessione 2026-05-07 Day 2 sera — surface debt cascade 5/5 closed (3 PR ~2h)

**Trigger**: user choice option B post-Tier-1-smoke-verde _"continua autonomous (B): surface debt audit P1 residuo (GAP-3+6+8+13+14)"_.

**3 PR Game-Godot-v2 cascade L3 ~2h cumulative**:

| #   | PR                                                              | SHA        | Topic                                      | Tests     |
| --- | --------------------------------------------------------------- | ---------- | ------------------------------------------ | --------- |
| 1   | [#212](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/212) | `0b954949` | GAP-3 + GAP-6 + GAP-14 surface debt bundle | +8 cases  |
| 2   | [#213](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/213) | `0ccd8697` | GAP-8 SgTracker live bar PressureMeter     | +12 cases |
| 3   | [#214](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/214) | `925933fe` | GAP-13 lifecycle phase label UnitInfoPanel | +12 cases |

**Surface debt audit residuo 5/5 closed**:

- ✅ GAP-3 DefenderAdvantageModifier BattleFeed (P6)
- ✅ GAP-6 ReinforcementSpawner pre-spawn telegraph (P1)
- ✅ GAP-14 TimeOfDayModifier diegetic HUD (P3 immersion)
- ✅ GAP-8 SgTracker live bar PressureMeter (P5)
- ✅ GAP-13 Lifecycle phase label UnitInfoPanel (P3 lifecycle)

**Test baseline**: GUT 1925 → 1933 (+8 bundle) → 1945 (+12 GAP-8) → 1957 (+12 GAP-13). Format + gdlint verde. main.gd 990→993 LOC under 1000.

**Pillar deltas Day 2 sera** (5/6 🟢++ rinforzati):

- P1 Tattica: telegraph reinforcement
- P3 Identità: passive linked + lifecycle phase + time of day immersion
- P5 Co-op: SG live bar (Sistema tension visible cross-stack)
- P6 Fairness: defender advantage feed + mission timer + wound badge

**Cumulative Day 2 PR**: 9 Claude-shipped autonomous (3 morning + 3 sera + 3 docs).

**Phase A Day 2/7 monitoring**:

- ✅ CI Game/ + Godot v2 main verde post 9 PR
- ✅ Tier 1 functional smoke 15/16 + 1 skip (cloudflare iter3 env-gated)
- ✅ Zero regression
- ✅ Auto-merge L3 cascade ~4-5x speedup confirmed

---

## ⚡ TL;DR sessione 2026-05-07 Day 2/7 morning — Sprint M.7 chip cascade (2 PR ~50min)

**Trigger**: user _"Phase A Day 2/7 monitoring + Sprint M.7 chip kickoff GAP-5+GAP-7 reincarnate"_.

**2 PR shipped UTC 19:51-20:40** (~50min cumulative, Game-Godot-v2 cascade L3):

| #   | PR                                                              | SHA        | Topic                            | Pillar        |
| --- | --------------------------------------------------------------- | ---------- | -------------------------------- | ------------- |
| 1   | [#210](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/210) | `c89f7bfd` | GAP-7 PassiveStatusApplier wire  | P3 🟢ⁿ → 🟢++ |
| 2   | [#211](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/211) | `db745302` | GAP-5 MissionTimer countdown HUD | P6 🟢 → 🟢++  |

**ADR-2026-05-07-abort-web reincarnate target 3/3 CLOSED**:

- ✅ GAP-10 AiProgressMeter #208 sera
- ✅ GAP-7 PassiveStatusApplier #210 Day 2
- ✅ GAP-5 MissionTimer #211 Day 2

**Test baseline**: GUT 1877 → 1911 (+14 GAP-7) → 1925 (+14 GAP-5). Format + gdlint verde. main.gd 981 LOC under 1000 (TUTORIAL_01_UNITS relocated to MainCombatSetup per budget).

**Phase A Day 2/7 monitoring**: CI Game/ + Godot v2 main verde, zero regression.

**Pillar deltas Day 2**: P3 🟢ⁿ → 🟢++ (297 ancestor passive unblock + Skiv linked demo) + P6 🟢 cand → 🟢++ (Long War 2 mission timer visibility).

**Pillar status finale post-Day-2**: 5/6 🟢++ + 2/6 🟢 cand (P2 + P4 unchanged).

**Auto-merge L3 cumulative session 2026-05-07**: 6 PR Claude-shipped autonomous (sera 4 + Day 2 cascade 2). ~4-5x speedup confirmed.

**Resume**: see canonical handoff `docs/planning/2026-05-07-phase-a-handoff-next-session.md`.

---

## ⚡ TL;DR sessione 2026-05-07 sera — cascade auto-merge L3 (4 PR ~17min)

**Trigger**: user formal authorization _"hai la mia autorizzazione formale a modificare le policy e fare i merge futuri"_. First Claude-shipped autonomous cascade su Game/ + Game-Godot-v2.

**4 PR shipped UTC 19:15-19:33** (~17min cumulative):

| #   | PR                                                              | Repo     | SHA        | Topic                                                      |
| --- | --------------------------------------------------------------- | -------- | ---------- | ---------------------------------------------------------- |
| 1   | [#209](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/209) | Godot v2 | `87dd88df` | Lint debt cleanup main.gd 1101→999 LOC                     |
| 2   | [#2101](https://github.com/MasterDD-L34D/Game/pull/2101)        | Game/    | `98dbf058` | Plan v3.2 final close 8/8 P1 + 3/3 P2 + sentience T4 audit |
| 3   | [#2103](https://github.com/MasterDD-L34D/Game/pull/2103)        | Game/    | `6a3880ef` | Auto-merge L3 ADR + CLAUDE.md gates codified               |
| 4   | [#208](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/208) | Godot v2 | `29640c5f` | GAP-10 AiProgressMeter wire (P5 🟢→🟢++)                   |

**Pillar deltas**:

- P5 Co-op vs Sistema 🟢 → 🟢++ (Sistema escalation HUD top-strip live)
- meta: plan v3.2 audit synthesis 100% closed → archived
- policy: auto-merge L3 codified, master-dd preserve veto

**Phase A monitoring Day 1/7**: Godot v2 main CI hygiene blocker resolved (#209 unblocks 5 consecutive lint failures post-#205). Day 2-7 grace continua.

**Resume**: see canonical handoff `docs/planning/2026-05-07-phase-a-handoff-next-session.md`.

---

## ⚡ TL;DR sessione 2026-05-06 sera — Wave 1-6 full closure (20 PR)

**Scope**: 6 wave end-of-session ad ~36h. Cross-stack Game/ + Game-Godot-v2.

**Game/ shipped (12 PR W4-W6)**:

| PR    | SHA        | Topic                                       | Wave   |
| ----- | ---------- | ------------------------------------------- | ------ |
| #2072 | `d46fdaa2` | handoff session parte 2                     | bridge |
| #2073 | `9f24791c` | W4 form_pulse_submit drain                  | W4     |
| #2074 | `55a8b5f3` | supersede ADR Godot pivot + hosting cleanup | W4     |
| #2075 | `19fccaad` | W7 next_macro drain + design                | W4     |
| #2076 | `b8a666f5` | plan v3 §N.5+O.3+O.4+R.6 prep               | W5     |
| #2077 | `6c2a81a9` | BACKLOG closure ticket                      | W5     |
| #2078 | `a0ffc2f9` | governance process chunk (218→186)          | W6     |
| #2079 | `c868a850` | governance pipelines chunk (186→156)        | W6     |
| #2080 | `c07449a2` | plan v3 §O.3 drift sync Tier A/B/C matrix   | W6     |
| #2081 | `20f91212` | governance core chunk (156→137)             | W6     |
| #2082 | `abee7c02` | governance ops+traits chunk (137→104)       | W6     |
| #2083 | `afc0cb70` | governance residue cleanup (104→4)          | W6     |
| #2084 | `25d6a35d` | plan v3 §O.4 AI services drift sync         | W6     |

**Game-Godot-v2 shipped (8 PR Sprint M.6+M.7+O.3+O.4)**:

| PR   | SHA        | Topic                                                 |
| ---- | ---------- | ----------------------------------------------------- |
| #193 | `9105c169` | Sprint M.6 Phase B onboarding port (758 LOC + 18 GUT) |
| #194 | `39aceba7` | CLAUDE.md M.6 closure                                 |
| #195 | `23b7e2ea` | Sprint O.3 woundedPerma port                          |
| #196 | `a60e17bd` | Sprint M.7 next_macro composer wire                   |
| #197 | `63b8e574` | Sprint M.7 lifecycle events composer wire             |
| #198 | `a0cbb31f` | Sprint O.3 defenderAdvantageModifier port             |
| #199 | `e26b4a11` | Sprint O.3 Tier C bundle port                         |

**Deltas finali**:

- Game/ governance: **460 → 4** (-99.1%) via 5 chunk batch
- Godot v2 GUT: **1757 → 1834** (+77, +4.4%)
- Coop WS audit: **6/6 closed** (5/5 lifecycle drained: form_pulse + next_macro + reveal_ack + world_vote + lineage_choice)
- Sprint M.7 lifecycle composer wire: **5/5 done**
- Sprint O.3 combat services Godot: **28/28 ✅** tutti porti
- Sprint O.4 AI services Godot: **8/8 ✅** tutti porti
- 8× Codex P2 review iterations addressed in 4 PR (PR #193 round 3 most valuable per state machine race conditions)

**Lessons codified**:

1. **Codex P2 iteration pattern** (memory): default workflow ritrigger `@codex review` post-fix. Round 3 spesso cattura subtle state machine edge case (race condition cross-stack).
2. **Hosting stack cleanup** (PR #2074): supersede ADR-2026-04-26 CF Pages + Render dormant per reversibility se Godot cutover regredisce.
3. **Drift sync close-marks pattern** (PR #2076-#2080-#2084): plan v3 sezioni Tier A/B/C matrix vs Godot v2 reality bridging. Audit grep verify obbligatorio prima di marcare ✅.

---

## ⚡ TL;DR sessione 2026-05-06 — Wave 1 docs sweep autonomous

**Scope**: docs sync + ADR drop + path drift fix + audit log update. Bundle low-risk additive zero side-quest.

| Action                                                 | File                                                                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| ADR formal DROP Sprint L HermeticOrmus                 | `docs/adr/ADR-2026-05-06-drop-hermeticormus-sprint-l.md` (NEW)                                                           |
| Path drift correction `data/skiv/` → `docs/skiv/`      | `docs/planning/2026-04-28-godot-migration-strategy.md:145` + `data/core/narrative/beats/skiv_pulverator_alliance.yaml:4` |
| Gap audit P1.4 + P1.6 close                            | `docs/research/2026-04-30-gap-audit-plan-v3-2-synthesis.md`                                                              |
| BACKLOG audit log entry 2026-05-05/06 + 2 ticket close | `BACKLOG.md`                                                                                                             |
| Compact context v24 sync                               | `COMPACT_CONTEXT.md` (this file)                                                                                         |

**Plan v3.3 effort delta**: -2g (Sprint L drop). Sprint K-M phase 14g → 12g cumulative.

**Path drift findings revisited**: gap audit P1.6 originale claim `data/core/narrative/ennea_voices/` not exist + `balance/terrain_defense` + `balance/ai_profiles` non al path = **false-alarm**. Audit grep 2026-05-06 confirma 3/4 path canonical correct. Solo `data/skiv/` drift reale (2 ref attivi → fixati).

**Wave 2-4 remainder** (questa sessione continua O next):

- Wave 2 (~2h): #3 governance 460 warnings batch
- Wave 3 (~3-5h): #2 coop test coverage 5 negative tests
- Wave 4 timeboxed: #6 docs:smoke EINVAL Windows + #7 TKT-07 Tutorial sweep

---

## ⚡ TL;DR sessione 2026-05-05 — Repo content audit Phase 1+3

**Phase 1 static scan** (3 agent parallel): report `docs/reports/2026-05-05-repo-audit-static-scan.md`.

**Phase 3 triage cleanup**:

| Action              | Target                                                          | Result                        |
| ------------------- | --------------------------------------------------------------- | ----------------------------- |
| Delete dead service | `aiPersonalityLoader.js` + `sistemaActor.js` + test             | 121+ LOC removed              |
| Fix biome_affinity  | 10 species in `data/core/species.yaml`                          | Risonanza Perfetta now works  |
| Delete Godot stub   | `sistema_turn_runner.gd` (Tier 3 abandon)                       | Zero callers confirmed        |
| Gate 5 document     | `enneaEffects.js` / `eventChainScripting.js` / `speciesWiki.js` | 3 exempt w/ inline note       |
| Gate 5 TODO         | `routes/conviction.js`                                          | TKT-GATE5-CONVICTION ~4h      |
| Update docs status  | `docs/incoming/lavoro_da_classificare/`                         | doc_status → integrato        |
| BACKLOG update      | `BACKLOG.md`                                                    | 6 closed + 3 new open tickets |

**2 PRs open** (awaiting master-dd merge):

- [#2058 Game/](https://github.com/MasterDD-L34D/Game/pull/2058) — pre-cutover cleanup Phase 3
- [#177 Godot v2](https://github.com/MasterDD-L34D/Game-Godot-v2/pull/177) — drop sistema_turn_runner stub

**Gate 5 count: 4** (≤5 = does NOT block cutover Phase A)

**Open tickets**:

- `TKT-GATE5-CONVICTION` ~4h — wire FE or deprecate conviction voting
- `TKT-TRAITS-ANCESTOR-BUFF-STAT` ~3h — buff_stat handler = 51 ancestor traits inactive
- `TKT-RULES-SIMULATE-BALANCE` ~1h — prereq for services/rules/ Phase 3 removal

**Phase 2** (runtime probe) NOT executed — not blocking.

---

## ⚡ Resume trigger phrase canonical (sessione precedente — Sprint M.1 spawn)

> _"leggi COMPACT_CONTEXT.md v22 + docs/planning/2026-04-29-master-execution-plan-v3.md v3.2 + docs/adr/ADR-2026-04-29-pivot-godot-immediate.md + docs/research/2026-04-30-gap-audit-plan-v3-2-synthesis.md. Spawn Sprint M.1 chip: NEW repo Game-Godot-v2 + Donchitos template adopt + Godot 4.x install + 3 spike (M.5 cross-stack + M.7 phone + M.6 CI)."_

Handoff doc canonical:

- [`docs/adr/ADR-2026-04-29-pivot-godot-immediate.md`](docs/adr/ADR-2026-04-29-pivot-godot-immediate.md) — decision pivot
- [`docs/planning/2026-04-29-master-execution-plan-v3.md`](docs/planning/2026-04-29-master-execution-plan-v3.md) — sequenza Sprint M.1-S v3.2
- [`docs/adr/ADR-2026-04-30-pillar-promotion-criteria.md`](docs/adr/ADR-2026-04-30-pillar-promotion-criteria.md) — tier ladder Sprint N gate
- [`docs/research/2026-04-30-gap-audit-plan-v3-2-synthesis.md`](docs/research/2026-04-30-gap-audit-plan-v3-2-synthesis.md) — 8 P1 deferred plan v3.3

## ⚡ TL;DR pivot Godot v2 (2026-04-29 sera)

**Trigger**: web stack co-op 7-PR cascade fix #2016-#2022 NON risolve race conditions architetturali. HOST clicca Nuova Sessione → server character*creation phase → player UI stuck "in attesa host" perma. Master-dd verdict: *"rifarlo bene seguendo le vertical sheet e usando godot e i nuovi asset e un design meglio studiato"\_.

**Decision**: Path B accelerated cap (cross-check + risk agent convergent verdict). Pivot Godot immediate, preserve Express backend cross-stack, drop Sprint G.2b + A1 rubric + Sprint H. Native Godot 2D = BG3-lite Plus features ZERO extra effort.

**Status doc**:

| Doc                                                |                   Status                   |
| -------------------------------------------------- | :----------------------------------------: |
| ADR-2026-04-29-pivot-godot-immediate.md            | NEW Accepted (decision-altering canonical) |
| master-execution-plan-v3.md                        |    NEW Active (replace plan v2 §FASE 1)    |
| ADR-2026-04-28-bg3-lite-plus-movement-layer.md     |                 Superseded                 |
| ADR-2026-04-28-deep-research-actions.md §G.2b/H/A1 |           Superseded items only            |
| ADR-2026-04-28-grid-type-square-final.md           |   Confermato Active (square anche Godot)   |
| Cross-check report 2026-04-29                      | Shipped reference (general-purpose agent)  |

**Sprint Fase 1 closure**:

- 22 PR mergiati main (10 ondata 3 + 7 ondata 4 + 5 cascade fix launcher partial useful)
- 4 items DEPRECATED post-pivot: Sprint G.2b BG3-lite Plus + A1 rubric + Sprint H + Sprint I (defer post-Godot)
- Backend services + research docs + Skiv canon + ERMES E0-E6 PRESERVED

**Sprint Fase 2 ACCELERATED**:

- Sprint M.1 (~3-4g): NEW repo Game-Godot-v2 + Godot 4.x + Donchitos template incorporated
- Sprint M.2 (~2g): plugin Asset Library priority install
- Sprint M.3 (~2-3g): Asset Legacy import (47 PNG CC0 from #2002)
- Sprint M.4 (~1g): Reference codebase study application (research #2001)
- Sprint M.5 (~4h): Cross-stack spike Godot HTML5 ↔ Express WS backend MANDATORY
- Sprint M.6 (~3h): CI minimal Godot project MANDATORY
- Sprint M.7 (~2g): Phone composer Godot HTML5 spike MANDATORY P5 gate
- Sprint N.1-N.7 (~4-5 sett): Vertical slice MVP 3-feature + GATE 0 failure-model parity

**Sprint Fase 3 cutover**: ~4-8 sett (Sprint O-S session engine + co-op WS port + cutover hybrid stable).

**Total revised plan v3**: ~13-19 sett (vs plan v2 14-21 sett, net savings ~1-2 sett).

**Pillar status post-pivot Fase 1 closure**:

| Pillar        |                                        Stato                                         |
| ------------- | :----------------------------------------------------------------------------------: |
| P1 Tattica    |                       🟢++ archive (re-impl Godot Sprint N.1)                        |
| P2 Spore      |                 🟢++ backend preserved (re-impl UI Godot Sprint N.7)                 |
| P3 Specie×Job |                 🟢ⁿ backend preserved (re-impl UI Godot Sprint N.5)                  |
| P4 MBTI       |                   🟡++ (re-impl Godot Sprint N.4 vcScoring iter2)                    |
| P5 Co-op      | 🟡 regressed (web stack race conditions UNRESOLVED, defer Godot Sprint M.7 + R port) |
| P6 Fairness   |                            🟢 candidato backend preserved                            |

**5/6 stable** + 1/6 regressed (P5) pending Godot rebuild architecturally correct.

## ⚡ TL;DR ondata 4 follow-up (2026-04-29 — post Sprint Fase 1 closure)

## ⚡ TL;DR ondata 4 follow-up (2026-04-29 — post Sprint Fase 1 closure)

**6 PR shipped post launcher suite** (corrente HEAD `6a9bcc43`):

| PR    | Squash commit | Topic                                                           |
| ----- | ------------- | --------------------------------------------------------------- |
| #2008 | `83f26050`    | fix(ai): preserve ai_profile in normaliseUnit (PR #1495 bot P1) |
| #2009 | `2259634e`    | feat(ermes): drop-in self-install — prototype lab E0-E6         |
| #2010 | `8b5d4ab9`    | chore(governance): registry add ERMES planning docs             |
| #2011 | `8acc7389`    | docs(guide): asset-creation-workflow 3-path canonical           |
| #2013 | `0fdd2853`    | fix(ai): utilityBrain oscillation root cause — re-enable        |
| #2014 | `6a9bcc43`    | docs(guide): Workspace locale (out-of-repo) section             |

**ERMES = Ecosystem Research, Measurement & Evolution System**. Modulo prototype/lab isolato `prototypes/ermes_lab/`. NON nuovo gioco — laboratorio + dashboard + JSON exporter + tuning harness. Roadmap E0-E8 (E0-E6 shipped, E7-E8 future runtime/foodweb deferred post-playtest).

**Fix AI critical 2026-04-29**:

1. **Bug ai_profile dropped** (PR #2008) — `normaliseUnit` perde `ai_profile` field → SIS unit fall-back legacy AI invece Utility AI. Fix preserve field.
2. **Utility AI oscillation** (PR #2013) — bug latente expose by ai_profile fix. Apex `aggressive` oscilla R1=5/R2=4/R3=5/R4=4 mai chiude. 3 root causes: faction key mismatch (`team` vs `controlled_by`), multiplicative scoring annihilation, action-agnostic considerations. Fix all 3 + re-enable `aggressive.use_utility_brain: true`.

**Test baseline post-fix**: AI 384/384 verde + utility 23/23 verde.

## 🖥️ Desktop icons + routine canonical (zero-terminal master-dd)

**Shipped PR #2007** (`be07ebae`). 4 icone su `C:\Users\VGit\Desktop\` cliccabili:

| Icona                           | Function                                                             | Click order |
| ------------------------------- | -------------------------------------------------------------------- | :---------: |
| 🔄 Evo-Tactics-Sync-Main        | Pre-rubric: git pull main + npm install se drift                     |     Pre     |
| 🚀 Evo-Tactics-Demo             | Backend + ngrok pubblico + auto-open browser + clipboard URL         |     1°      |
| ⚙️ Evo-Tactics-Toggle-A-Classic | Set ui*config.json all bg3lite*\*: false (modalità A grid square)    |     2°      |
| ⚙️ Evo-Tactics-Toggle-B-BG3lite | Set ui*config.json all bg3lite*\*: true (modalità B BG3-lite Tier 1) |     3°      |

**Cross-PC**: doppio clic `Evo-Tactics-Install-Desktop-Shortcuts.bat` (repo root) → 4 .lnk recreated automatic su Desktop di nuovo PC.

**Routine rubric session 90min** (full desktop click, zero terminal):

```
PRE: Sync-Main (5 min)
  → git pull origin main + npm install se drift

LIVE: Demo + Toggle A/B (60-90 min)
  1. Demo → ngrok URL pubblico → condividi 4 amici tester DIVERSI da TKT-M11B-06 pool
  2. Toggle-A-Classic → amici Ctrl+Shift+R → score 4 criteri 1-5
  3. Toggle-B-BG3lite → amici Ctrl+Shift+R → score 4 criteri 1-5

POST: Aggregate (15 min)
  4. Compila docs/playtest/2026-04-29-bg3-lite-spike-rubric.md tabella scores
  5. Verifica threshold pass: media B ≥3.5 + zero score 1 + zero criterio rigetto unanime

STOP:
  6. Chiudi finestra nera Demo launcher

VERDICT:
  7. Apri nuova sessione Claude + trigger phrase canonical (sopra)
```

## 🚫 Bottleneck residuo Sprint Fase 1 → Fase 2 Godot onset

1. **🚫 A1 — Master-dd rubric session Spike POC** (~1-2h userland) — 4 amici tester DIVERSI da TKT-M11B-06 pool. Stato: TBD scores in `docs/playtest/2026-04-29-bg3-lite-spike-rubric.md`. Sblocca Sprint G.2b OR Sprint I.
2. **🚫 Sprint G.2b BG3-lite Plus** (~10-12g) — solo se A1 PASS. Tier 2 backend cherry-pick.
3. **🚫 Sprint I TKT-M11B-06 playtest** (~1 sett userland) — post Sprint G.2b ship OR direct se A1 FAIL.
4. **🚫 ERMES E7-E8** — future runtime/foodweb candidate. Defer post Sprint I + ADR + test regression.

## ⚡ TL;DR per ripartire (sessione 2026-04-29 — Sprint Fase 1 closure 100% autonomous)

## ⚡ TL;DR per ripartire (sessione 2026-04-29 — Sprint Fase 1 closure 100% autonomous)

**Sprint Fase 1 ondata 3+ shipped end-to-end** (10 PR main, branch deleted o pending worktree cleanup):

| #   | PR    | Squash commit | Topic                                                                                                                                                                                                   |
| --- | ----- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | #1996 | `16fdebb7`    | Deep research SRPG/strategy synthesis + 5 ADR (deep-research-actions + BG3-lite Plus + grid-type-square-final + supersede ADR-2026-04-16 hex axial + grid-less feasibility) + 9 deferred Q user verdict |
| 2   | #1997 | `5884e50f`    | Action 4 Sprint M.7 doc re-frame DioField command-latency p95                                                                                                                                           |
| 3   | #1998 | `bf9b39ff`    | Action 7 CT bar visual lookahead 3 turni FFT-style                                                                                                                                                      |
| 4   | #1999 | `252593b3`    | Action 5 BB hardening: injury severity 3-tier enum + slow_down trigger expanded (panic/confused/bleeding≥medium/fracture≥medium)                                                                        |
| 5   | #2000 | `246e1369`    | Action 2 tactical AI archetype templates (Battle Brothers + XCOM:EU postmortem, 3 archetype Beehave)                                                                                                    |
| 6   | #2001 | `28eeb71a`    | Action 1 SRPG engine reference codebase extraction (Project-Tactics + nicourrea + OpenXcom + Lex Talionis)                                                                                              |
| 7   | #2002 | `d6f04300`    | Sprint G v3 Legacy Collection asset swap (Ansimuz CC0, 47 PNG 345KB ≤20MB cap, 5 biomi tile + 8 archetype creature + parallax 4-layer + VFX 8 types + Skiv LPC override preserved)                      |
| 8   | #2003 | `c6587ce5`    | Spike POC BG3-lite Tier 1 — hide grid + smooth movement + range cerchio + AOE shape + ui_config.json toggle                                                                                             |
| 9   | #2004 | `dcba8295`    | Action 6 ambition Skiv-Pulverator alleanza (combat path + bond gate ritual choice fame vs alliance + reconciliation narrative beat)                                                                     |
| 10  | #2005 | `88a4fded`    | Action 3 Sprint N gate row failure-model parity MANDATORY 5/5 + N.7 spec doc (WoundState.gd + LegacyRitualPanel.gd)                                                                                     |

**Test baseline post-merge**: AI 382/382 verde zero regression preservato across all 10 PR. Format + governance + paths-filter + python-tests + dataset-checks + styleguide-compliance verdi.

**Pillar status finale post-wave-3**:

| Pillar        |                                              Status                                              |
| ------------- | :----------------------------------------------------------------------------------------------: |
| P1 Tattica    |      🟢++ (visual upgrade Legacy + CT bar lookahead 3 turni + BG3-lite Tier 1 toggle live)       |
| P2 Spore      |   🟢++ (mating engine #1879 + Spore S1-S6 + ambition long-arc Skiv-Pulverator alleanza wired)    |
| P3 Specie×Job |         🟢ⁿ (35 ability r1-r4 #1978 + Beast Bond + 4 jobs orfani Battle Sprite assigned)         |
| P4 MBTI       | 🟡++ (T_F full + thought cabinet UI + thoughts ritual G3 + tactical AI archetype templates spec) |
| P5 Co-op      |  🟢 candidato (long-arc goal closes "combat isolated" risk + M11 lobby/ws + ambition HUD wired)  |
| P6 Fairness   |      🟢 candidato (BB attrition severity stack + slow_down trigger + status engine wave A)       |

**5/6 🟢++/🟢 candidato** + 1/6 🟡++ (P4). Demo-ready confermato.

**Bottleneck residuo Sprint Fase 1 closure → Fase 2 Godot onset**:

1. **Master-dd rubric session Spike POC** (~1-2h) — 4 amici tester DIVERSI da TKT-M11B-06 pool. Toggle `apps/play/public/data/ui_config.json` `bg3lite_*: false ↔ true` per A/B test. Score rubric 4-criteria (movement smooth + range readability + 2024 RPG feel + Skiv lore-faithful) 1-5 scale. Aggregate scores in `docs/playtest/2026-04-29-bg3-lite-spike-rubric.md` placeholder. Threshold pass: media ≥3.5 + zero score 1.
2. **Sprint G.2b BG3-lite Plus** (~10-12g, 2-2.5 sett) — solo se rubric pass. Tier 2 add-ons sub-tile float positioning + vcScoring area_covered float + flanking 5-zone smooth angle.
3. **Sprint I TKT-M11B-06 playtest** (~1 sett userland) — post Sprint G.2b ship.

**Sprint G v3 deferred items** (Sprint H / Sprint Q candidate):

- G.5b Kenney audio CC0 pack (zip Legacy senza audio file, defer Sprint H separato pack autorizzazione user)
- Multi-frame creature anim (sheet layout non-uniform, defer Sprint Q metadata authoring JSON)
- Boss VFX wire ability-trigger (6 boss sprite extracted, wire defer Sprint Q)

**Effort delta cumulativo plan v2 → v3**: ~+107-127h (~+19-23% base 14 sett, justified data-driven post tester feedback informal 2026-04-28).

**Resume trigger phrase canonical** per nuova sessione:

> _"leggi COMPACT_CONTEXT.md + BACKLOG.md, master-dd ha eseguito rubric session Spike POC, verdict X/Y/N → procedi Sprint G.2b OR Sprint I"_

Claude (nuova sessione):

1. Read `COMPACT_CONTEXT.md` v19 + `BACKLOG.md` Sprint Fase 1 closure
2. Se rubric pass → spawn chip Sprint G.2b BG3-lite Plus full ~10-12g (Tier 2 add-ons backend cherry-pick)
3. Se rubric fail → abort BG3-lite Plus, ship Sprint I TKT-M11B-06 current state + Sprint G v3 visual asset swap solo

## ⚡ TL;DR per ripartire (sessione 2026-04-28 sera — Deep research + BG3-lite Plus + grid SQUARE final)

**Sessione documentation-heavy** (5 commit PR #1996 branch `feat/deep-research-analysis-2026-04-28`):

1. **Deep research SRPG synthesis** (18 titoli FFT/Tactics Ogre/Brigandine/Battle Brothers/Midnight Suns/DioField/etc.) — 2 file deep research letti + 2 agent paralleli (general-purpose gap analysis + balance-illuminator domain fit) → 11 cross-ref entries + 6 pillar fit table + 5 actionable. ZERO decision-altering plan v2 decisions 3-10. `docs/research/2026-04-28-deep-research-synthesis.md` shipped.

2. **ADR-2026-04-28-deep-research-actions Accepted** — 8 micro-actions trackable autonomo additive plan v2 (Action 5 BB hardening pre Sprint G v3 + Action 7 CT bar lookahead 3 turni + ordine inverted + gate failure-model parity MANDATORY 5/5).

3. **Tester feedback informal raccolto playtest 2026-04-28** — _"griglia pre-2000 feel"_ + _"movement BG3-like richiesto"_ — trasforma decision Q5 grid-less da speculative a data-driven.

4. **Background agent grid-less feasibility analysis** (`docs/research/2026-04-28-grid-less-feasibility.md`) — catalog 11 surfaces grid-dependent + 4 scenari (A NO pivot / B Hybrid full ~14-18g / C Midnight Suns ~12-16 sett / D DioField ~20-30 sett anti-pattern).

5. **ADR-2026-04-28-bg3-lite-plus-movement-layer Accepted** — Sprint G.2b NEW ~10-12g middle-tier sweet spot. Tier 1 (~6-7g frontend-only): hide grid + click area + smooth move + range cerchio + AOE shape + zone outline arc. Tier 2 (~+4-5g backend): sub-tile positioning float + vcScoring `area_covered` float + flanking 5-zone smooth angle. Cattura 90% valore Hybrid full con 65% effort. 4 pillar lift (P1+P4+P5+P6).

6. **ADR-2026-04-28-grid-type-square-final Accepted** (supersedes ADR-2026-04-16 hex axial Proposto da 12 giorni) — SQUARE WINS definitivo. 5/5 motivazioni hex original obsolete post-BG3-lite Plus (LOS/range ambiguità + pathfinding + flanking = CAPTURED da Tier 2 sub-tile + 5-zone angle). Grid HIDDEN post-BG3-lite Plus = player non vede hex/quadrati. Backend math square preserved zero refactor (~30-40h saved).

7. **9 deferred questions chiuse user verdict 2026-04-28**: Q1 severity enum default light · Q2 bleeding/fracture trigger NOT minor · Q3 ambition seed C "Skiv unisce Pulverator pack fatto bene" + bond/conflict path · Q4 round-to-nearest semantics · Q5 5-zone smooth angle (NOT 3-zone classic) · Q6 tester DIVERSI da TKT-M11B-06 + rubric 4-criteria · Q7 echolocation radius DINAMICO per sense level · Q8 synthetic test 10 scenari hardcoded + replay infra deferred M12+ · Q9 memory save full ritual (this).

**Effort delta cumulativo plan v2 → v3**: ~+107-123h (~+2.5-3 sett base 14 sett, ~+18-20%, justified data-driven).

**Sprint Fase 1 ordine REVISED finale**:

1. Action 5a+5b BB hardening pre Sprint G v3 (~5h)
2. Action 7 CT bar lookahead 3 turni parallel (~4h)
3. Sprint G v3 Legacy Collection asset swap (~2.5g)
4. Spike POC BG3-lite (~1g) — go/no-go gate rubric 4-criteria pass ≥3.5
5. Sprint G.2b BG3-lite Plus (~10-12g) post-spike SÌ
6. Action 6 ambition Skiv-Pulverator alleanza (~5-7h) parallel G.2b
7. Sprint I TKT-M11B-06 playtest (~1 sett)

Total Fase 1 effort: ~5-5.5 settimane.

**PR #1996 status**: 6 commit shipped (sintesi + 4 ADR + grid-less feasibility doc + Q1-Q9 verdict applies). Pending master DD review + merge.

## ⚡ TL;DR per ripartire (post Sprint 13 — Status engine wave A: passive ancestor producer wire)

**Sprint 13 autonomous shipped** in continuation: passive ancestor producer wired end-to-end. Pre-Sprint 13: `apps/backend/services/combat/statusModifiers.js` consumer side LIVE da audit P0 fix (computeStatusModifiers + applyTurnRegen handle 7 statuses) MA `traitEffects.js:226` `passesBasicTriggers` returns false per `action_type: passive` → 297 ancestor batch traits con effect kind=apply_status MAI eseguono → unit.status[X] sempre 0 → consumer engine vede niente. Helper backend nuovo `apps/backend/services/combat/passiveStatusApplier.js` (pure: `applyPassiveAncestors(unit, registry)` + `applyPassiveAncestorsToRoster` + `passiveStatusSpec` + `collectTraitIds`). Producer scan unit.traits, per ogni trait passive con apply_status + Wave A status (linked/fed/healing/attuned/sensed/telepatic_link, frenzy esclusa via PASSIVE_BLOCKLIST per balance 2-turn rage canonical), set unit.status[stato] a turns specificato (o 99 default = effectively-permanent). Idempotent max-policy. Wire `apps/backend/routes/session.js /start` (initial wave dopo lineage inheritance) + `apps/backend/routes/sessionRoundBridge.js applyEndOfRoundSideEffects` (refresh wave per traits gained mid-encounter via mating/recruit/evolve, before regen+decay). Frontend extends `apps/play/src/render.js` `STATUS_ICONS` registry con 7 nuove entry (∞ linked gold / ◍ fed brown / ✚ healing green / ⌬ attuned cyan / ⊙ sensed purple / ⚹ telepatic_link violet / ᛞ frenzy red). 27/27 test nuovi + AI 382/382 zero regression + statusModifiers existing test 13/13 baseline. Format + governance verdi. End-to-end integration verificato via direct node: `ancestor_comunicazione_cinesica_cm_01` (CM 01) → unit.status.linked = 2 → computeStatusModifiers emette `+1 attack_mod (ally adjacent)`. **P6 Fairness 🟢** consolidato (status engine extension recupera 297 ancestor batch ROI dormant). Pattern: producer/consumer separation chiusa.

## ⚡ TL;DR per ripartire (post Sprint 12 — Surface-DEAD #4 chiuso, 7/8 sweep)

**Sprint 12 autonomous shipped** in continuation: Mating lifecycle wire end-to-end. Engine LIVE in `metaProgression.js` (`rollMatingOffspring` + `canMate` + offspringRegistry da PR #1879) era invisibile in player loop normale — debrief panel non mostrava mai pair-bond candidates post-victory. Helper backend nuovo `apps/backend/services/mating/computeMatingEligibles.js` (pure: filterPlayerSurvivors + pairCombinations n-choose-2 + cap 6 + opzionale metaTracker.canMate gate graceful). Wire `rewardEconomy.buildDebriefSummary` emette `mating_eligibles[]` solo on victory + best-effort require pattern (mirror QBN Sprint 10). Module frontend nuovo `apps/play/src/lineagePanel.js` (pure `formatLineageCard`+`formatLineageList` con XSS escape + side-effect idempotent `renderLineageEligibles`). Reuse `iconForBiome`+`labelForBiome` da `biomeChip.js`. Plural offspring label quando count>1. Wire frontend: `debriefPanel.js` HTML slot + import + `setLineageEligibles` setter API + `renderLineage()` registered in render() (gated outcome non-defeat). `phaseCoordinator.js` pipe `bridge.lastDebrief.mating_eligibles`. CSS gold pair-bond card (linear-gradient + serif italic + offspring badge + biome chip caps). 38/38 test (19 backend + 19 frontend) + AI 382/382 zero regression. Format + governance verdi. Smoke E2E preview limitazione worktree-path mismatch → validazione end-to-end via direct node integration test (buildDebriefSummary mock session emits 1 pair eligible biome=savana can_mate=true; defeat path → empty array). **P2 🟢 def → 🟢++** (ciclo Nido→pair-bond→offspring visibile post-encounter). **§C.2 Surface-DEAD: 7/8 chiusi** (#1+#2+#4+#5+#6+#7+#8). Residuo solo #3 Spore mutation dots (~15h authoring esterno).

## ⚡ TL;DR per ripartire (post Sprint 11 — Surface-DEAD #6 chiuso, 6/8 sweep)

**Sprint 11 autonomous shipped** in continuation: biome chip HUD live next to objective bar. Backend `biomeSpawnBias.js` (reinforcement spawn boost) era LIVE ma player non vedeva mai il bioma corrente — perdeva lettura tattica ambientale (specie endemiche, hazard, strategia). Backend `publicSessionView` extended con `biome_id: session.biome_id || session.encounter?.biome_id || null` (fallback a encounter YAML loader). Module nuovo `apps/play/src/biomeChip.js` (pure `labelForBiome` 11 canonical IT labels + `iconForBiome` emoji + `formatBiomeChip` HTML + side-effect `renderBiomeChip` idempotent + show/hide). HUD slot `<div id="biome-chip">` in header next to objective-bar. main.js `refreshBiomeChip()` wire on bootstrap + post-state-fetch. CSS pill style (rgba green-tinted bg + border + caps label). 17/17 test + AI 363/363 zero regression. Smoke E2E preview validato live: bootstrap enc_tutorial_01 → HUD chip `🌾 Savana` con tooltip "Biome: savana — vedi Codex per dettagli". **§C.2 Surface-DEAD: 6/8 chiusi** (#1 + #2 + #5 + #6 + #7 + #8). Residui solo #3 Spore mutation dots (15h authoring) + #4 Mating lifecycle wire (5h).

## ⚡ TL;DR per ripartire (post Sprint 10 — Surface-DEAD #7 chiuso)

**Sprint 10 autonomous shipped** in continuation: QBN narrative event diegetic surface live nel debrief panel. Backend `qbnEngine.drawEvent` LIVE da PR #1914 + `rewardEconomy.buildDebriefSummary` già emette `narrative_event` in debrief response, ma frontend ignorava il campo. Modulo nuovo `apps/play/src/qbnDebriefRender.js` (pure `formatNarrativeEventCard` + side-effect `renderNarrativeEvent`) + setter `setNarrativeEvent` aggiunto a `debriefPanel.js` API + `<div id="db-qbn-section">` HTML template + `phaseCoordinator.js` pipe da `bridge.lastDebrief.narrative_event` + CSS journal style (Georgia serif italic body + violet accent border). 15/15 test + AI 363/363 zero regression. Smoke E2E preview validato live: render produces `<div class="db-qbn-event">` con title/body/choices/meta sections. **P4 🟢 def → 🟢++** (cronaca diegetica visibile post-encounter). **§C.2 Surface-DEAD: 5/8 chiusi** (#1 + #2 + #5 + #7 + #8). Residui: #3 Spore mutation dots (15h authoring), #4 Mating lifecycle wire (5h), #6 Biome initial wave (2h quick-win).

## ⚡ TL;DR per ripartire (post Sprint 9 — Surface-DEAD #5 chiuso)

**Sprint 9 autonomous shipped** in continuation: Objective HUD top-bar live. Backend route nuovo `GET /api/session/:id/objective` + module `apps/play/src/objectivePanel.js` (6 obj types: elimination/capture_point/escort/sabotage/survival/escape — IT label + emoji icon + status win/loss/active/unknown + formatProgress aligned con real backend payload keys) + `api.objective` client + main.js `refreshObjectiveBar()` wire on bootstrap + post-state-fetch + index.html HUD slot in header + CSS band colors (status-active accent / status-win green / status-loss red). Tutorial play UI ora pipe `encounter_id` a `/api/session/start` per attivare engine. 29/29 test + AI 363/363 zero regression. Smoke E2E preview validato live: bootstrap enc_tutorial_01 → HUD render `⚔ Elimina i nemici · Sistema vivi: 2 · PG: 2` band active. **P5 Co-op Sistema 🟡 → 🟡++** (player vede esplicitamente cosa deve fare). **§C.2 Surface-DEAD: 4/8 chiusi** (#1 Sprint 8 + #2 HP floating + #5 Sprint 9 + #8 Sprint 6).

## ⚡ TL;DR per ripartire (post Sprint 8 — Surface-DEAD #1 chiuso)

**Sprint 8 autonomous shipped** in continuation: predict_combat hover preview live. Module nuovo `apps/play/src/predictPreviewOverlay.js` (pure `formatPredictionRow` + `colorBandForHit` + async cached `getPrediction`). Wire in `main.js mousemove` quando hover su enemy alive + state.selected è player alive → fetch async + inject `.tt-predict` row in tooltip. CSS `style.css` band colors high/medium/low/unknown. Cache invalidated su nuova sessione. Backend route `/api/session/predict` già LIVE (apps/backend/routes/session.js + sessionHelpers.js predictCombat analytic enumeration). 22/22 test + AI 363/363 zero regression. Smoke E2E preview validato live in browser: `⚔ 60% hit · ~1.4 dmg · 5% crit` band medium injected su hover e_nomad_1 con p_scout selezionato. **Pillar P1 🟢 → 🟢++** (decision aid live). **§C.2 Surface-DEAD: 3/8 chiusi** (#1 Sprint 8 + #2 HP floating M4 P0.2 + #8 Thought Cabinet Sprint 6).

## ⚡ TL;DR per ripartire (post Sprint 7 — Disco bundle 4/4)

**Sprint 7 autonomous shipped** in continuation: Disco skill check passive→active popup. Module nuovo `apps/play/src/skillCheckPopup.js` (pure `buildSkillCheckPayload` + side-effect `renderSkillCheckPopups`). Wire in `main.js processNewEvents` post damage popup. Filtra `triggered=true`, dedupes, format `[NOME TRAIT]` Disco-style caps, stagger 220ms + y-offset crescente. Zero backend change — `evaluateAttackTraits` già emette trait_effects in event payload. Test 22/22 + AI 363/363 zero regression. Smoke E2E preview validato. **P4 🟢 def → 🟢 def++** (Disco bundle Tier S 4/4 saturated: #1 PR #1966 + #2 PR #1945 + #3 this sprint + #4 PR #1934).

## ⚡ TL;DR per ripartire (post Sprint 6)

**Sprint 6 autonomous shipped** in single session: Thought Cabinet UI panel + cooldown round-based end-to-end. Engine `DEFAULT_SLOTS_MAX` 3→8 + `mode='rounds'` opt + `RESEARCH_ROUND_MULTIPLIER=3` (T1→3 round, T2→6, T3→9) + `tickAllResearch(bucket, delta)` bulk helper. Bridge `applyEndOfRoundSideEffects` decrementa 1 round/fine-turno + auto-internalize + apply passives + emit `thought_internalized` event. Routes `/thoughts/research` accetta body `mode` (default `'rounds'`). Frontend `apps/play/src/thoughtsPanel.js` Assign/Forget buttons inline + progress bar `cost_remaining/cost_total round X%` + 8-slot grid + can-research-more gate + error banner. API client `thoughtsList/thoughtsResearch/thoughtsForget`. Smoke E2E preview validato: 8 slots ✓, mode=rounds default ✓, 3-round auto-tick → internalize ✓. Test 76/76 thoughts + 353/353 AI baseline zero regression. Format prettier verde, governance 0 errors. **P4 🟢c → 🟢 def** (8 slot live + cooldown round-based + UI surface + auto-tick wired). Stato-arte §B.1.8 #1 chiuso (3 pattern Disco residui — internal voice + skill check popup + day pacing flavor).

## ⚡ TL;DR sprint precedenti (reference)

**5 sprint autonomous shipped** in single session: PR #1934 (Wesnoth time-of-day + AI War defender's adv + Disco day pacing + Fallout numeric ref doc) → #1935 (Subnautica habitat lifecycle wire — biomeAffinity + 14 species stub + biomeSpawnBias init wave universal) → #1937 (Tunic Glifi UI + AncientBeast wikiLinkBridge + Wildermyth permanent flags) → #1938 (Cogmind tooltip + Dead Space holographic AOE + Isaac Anomaly glow) → #1940 (Tufte sparkline dashboard + DuckDB +4 query). **+OD-001 Path A 4/4 chiuso** (PR #1877 superseded). Stato pillars: 5/6 🟢 def/cand. Test baseline ~360 verde. Vedi handoff aggiornato: [`docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md`](docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md).

## 🆕 Sessione 2026-04-27 notte — Sprint 1-5 autonomous (5 PR + 1 closure)

| PR                                                          | Sprint              | Files key                                                                                                                                              | Tests           |
| ----------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| [#1934](https://github.com/MasterDD-L34D/Game/pull/1934)    | 1 backend QW        | `timeOfDayModifier.js` + `defenderAdvantageModifier.js` + `terrain_defense.yaml` time_of_day section + `formatDayPacing` campaign + 3 docs             | +18             |
| [#1935](https://github.com/MasterDD-L34D/Game/pull/1935)    | 2 mutation pipeline | `services/species/biomeAffinity.js` NEW + `dune_stalker_lifecycle.yaml` + 14 stub + `seed_lifecycle_stubs.py` + `reinforcementSpawner` biome_id derive | +9              |
| [#1937](https://github.com/MasterDD-L34D/Game/pull/1937)    | 3 codex completion  | `codexPanel.js` Glifi tab + `wikiLinkBridge.js` + `speciesWiki.js` 3 routes + `campaignStore` permanentFlags + 3 routes + 4 stale fixture fix          | +19 + 4 fixture |
| [#1938](https://github.com/MasterDD-L34D/Game/pull/1938)    | 4 UI polish         | `main.js` Shift-hold expand tooltip + `render.js` `drawHolographicAoe` + `debriefPanel` anomaly badge + CSS keyframes                                  | regression OK   |
| [#1940](https://github.com/MasterDD-L34D/Game/pull/1940)    | 5 telemetry viz     | `sparkline_dashboard.py` NEW + `analyze_telemetry.py` +4 SQL (mbti_distribution + archetype_pickrate + kill_chain_assists + biome_difficulty)          | +8              |
| [#1877 ❌](https://github.com/MasterDD-L34D/Game/pull/1877) | OD-001 Path A       | CLOSED as superseded — backend + UI già live via #1874+#1875+#1876+#1879+#1911                                                                         | —               |

**Pillars finali post-sprint**: P1 🟢++ · P2 🟢 def · P3 🟢c+ · P4 🟢c · P5 🟢c · P6 🟢c++.

**Anti-pattern Engine LIVE Surface DEAD**: chiuso su Subnautica habitat (Tier A #9). Pattern killer permanent: ogni new engine richiede surface player visibile <60s gameplay (Gate 5 DoD).

**Lessons codified**:

- **Cherry-pick fixture fix opportunistic** (4 stale post-cross-PC: #1869 nerf + #1870 currency cleanup + #1871 schema)
- **`gh pr update-branch <num>`** > rebase + force-push quando branch protection blocca
- **Sandbox guardrail**: force-push + admin merge denied; usa GitHub UI workflow

**Next session candidati ranked**: A) Playtest live TKT-M11B-06 (chiude P5 def), B) Beast Bond reaction trigger 5h (AncientBeast Tier S #6 residuo), C) Thought Cabinet UI panel cooldown 8h (P4 dominante), D) Ability r3/r4 tier 10h (P3+).

---

## 🆕 Sessione 2026-04-25 P1 follow-up (3 PR)

**3 PR derivati dai P0 (#1768 + #1769) chiusi**:

| PR    | Title                                                        | Status          |
| ----- | ------------------------------------------------------------ | --------------- |
| #1778 | feat(narrative): Thought Cabinet tier-2/3 effects + tests    | merged          |
| #1780 | feat(combat): Thought Cabinet passive resolver wire          | merged          |
| #1782 | feat(balance): MAP-Elites HTTP live archive (85.2% coverage) | draft, CI green |

**Nuovi test**: thoughtCabinet 46/46 (+7) · thoughtPassiveApply 8/8 NEW. Grand total post-P1: AI 307 · services 306 · api 633 · pytest 948. Governance 0/0.

**MAP-Elites risultati**: 23/27 celle riempite (85.2% coverage), fitness max=1.0, avg=0.6812. Top elites: support + skirmisher in high-T/N range. 4 cells vuote in low-MBTI range (tank) = tuning target.

**Thought Cabinet resolver wire**: `thoughtPassiveApply.js` new module. `updateThoughtPassives(unit, bonus, cost)` applica net delta a unit.mod/dc/hp_max/attack_range/ap. Wired in `/thoughts/tick` (on promotion) + `/thoughts/forget` (on forget + recompute). Pattern: snapshot flag `_thought_passive_delta` per revert pulito.

**Residuali P1 attivi**: Synergy HUD telegraph + Defy enemy extension + Resonance tier badge.

---

## 🆕 Sessione 2026-04-25 sera — Skiv extended (10 PR + 2 routine)

**10 PR mergiati main consecutivi** (5/8 Skiv wishlist closed):

| PR    | Title                                                         | SHA        | Skiv ticket    |
| ----- | ------------------------------------------------------------- | ---------- | -------------- |
| #1767 | fix(tests): pytest.importorskip pypdf in collection           | `02832dfc` | infra          |
| #1768 | feat(balance): MAP-Elites HTTP fitness wrapper                | `fcd50315` | balance P0     |
| #1769 | feat(narrative): Thought Cabinet Phase 2 (Disco internalize)  | `b04f3a92` | narrative P0   |
| #1770 | docs(handoff): bump COMPACT_CONTEXT + handoff (3 P0 closures) | `1d1fdb0f` | docs           |
| #1772 | feat(combat): synergy combo detection (echo_backstab)         | `cb1ca79e` | **Skiv #2 ✅** |
| #1773 | feat(combat): Defy verb (counter-pressure agency)             | `b2e079ba` | **Skiv #5 ✅** |
| #1774 | feat(combat): biome resonance reduces research_cost           | `c06e02c4` | **Skiv #4 ✅** |
| #1775 | docs(handoff): Skiv mega-session bump (7 PR + 1 routine)      | `e1c0a9f5` | docs           |
| #1777 | feat(diary): unit diary persistente MVP backend               | `f0bd514e` | **Skiv #7 ✅** |
| #1779 | feat(progression): Hybrid Path perks                          | `8413fd47` | **Skiv #6 ✅** |

**+ 2 routine scheduled**:

- `trig_012Axz6S7TjfC8g1W2gE4Mg4` lunedì 2026-05-11 07:00 UTC — Sprint A residual (resolver wire #1 + tier-2/3 thought content + MAP-Elites HTTP archive)
- `trig_01SB74yJvr6eyX4Gjq9H1jFB` mercoledì 2026-05-13 07:00 UTC — Skiv #3 Inner Voices (24-36 Disco-style diegetic, depends on resolver wire merge)

**Tests aggregate post-merge**: AI 307/307 · services **323/323** (+66 sessione: 22 synergy + 15 defy + 12 resonance + 17 diary) · api **652/652** (+31 sessione: 3 synergy + 8 defy + 1 resonance + 8 diary + 11 hybrid) · pytest **948/948** · governance 0/0.

**Skiv canonical creature**: introdotto come tamagotchi-style recap entity + 8-ticket wishlist con sprint A+B+C reorder. Salvato in memoria persistente. **5/8 wishlist closed** (~62%); residuali: #1 (scheduled), #3 (scheduled), #8 (deferred big rock).

**Score pilastri post-sera-extended**:

| Pillar          | Pre-sera     | Post-sera (Skiv 5/8)          |
| --------------- | ------------ | ----------------------------- |
| P1 Tattica      | 🟢           | **🟢+** (synergy beats)       |
| P2 Evoluzione   | 🟢 candidato | 🟢 candidato                  |
| P3 Identità×Job | 🟢 candidato | **🟢** (hybrid path)          |
| P4 MBTI         | 🟡+          | **🟡+ deeper** (biome×spec)   |
| P5 Co-op        | 🟡 → 🟢      | **🟡+** (diary cross-session) |
| P6 Fairness     | 🟢 candidato | **🟢** (two-way pressure)     |

→ **3🟢 + 1🟢-cand + 2🟡+** (zero 🔴). +2 pilastri saliti rispetto a sera baseline.

## 🆕 Sessione 2026-04-25 notte (autonoma post user trust)

**7 PR mergiati main consecutivi** (#1758 → #1765, ~7h work in 1.5h cycle ciascuno):

| PR    | Title                                               | SHA        |
| ----- | --------------------------------------------------- | ---------- |
| #1758 | SPRT + macro-economy diagram + governance bug fix   | `7e17d84c` |
| #1759 | PI Shop Monte Carlo (Gap 4 🟡→🟢)                   | `488da05b` |
| #1760 | Tutorial briefing variations (~30 variants)         | `6f397e6d` |
| #1762 | Encounter XP budget audit (Pathfinder framework)    | `9901407e` |
| #1763 | QBN engine MBTI-gated events (12 events + 3 routes) | `bec2bcd6` |
| #1764 | Handoff doc update (continuity per next session)    | `15ca7425` |
| #1765 | MAP-Elites lightweight QD archive (Mouret 2015)     | `b22fc2b7` |

**Tests aggregate post-merge**: AI 307/307 + services 257/257 + pytest **384/384** (+36 MAP-Elites) + governance 0/0.

**7 P0 chiusi**: balance SPRT, economy Machinations diagram, economy PI Monte Carlo, narrative briefing variations, narrative QBN, pcg XP audit, balance MAP-Elites + bonus governance bug fix.

**P0 residuali rimanenti** (post sessione pomeriggio): balance MCTS (~4h, blocked by session state clone API), ui intent preview (~4h, UI runtime risk), ui threat zone toggle (~3h, UI runtime risk), pcg objective variety (~8h). Thought Cabinet Phase 2 shipped (#1769) — UI reveal + combat resolver wire = follow-up P1.

## Stato attuale (post sessione 2026-04-28 visual+planning + PR #1995 merged)

**Latest merge main**: `4844add6` — `feat(visual+planning): Sprint A-F visual upgrade + Godot migration master plan v2 (#1995)`

**Sessione 2026-04-28 highlights**:

- **Sprint A-F shipped**: tactical RPG visual upgrade web stack (`apps/play/`)
  - Sprint A: Cinzel/IM Fell English/VT323 fonts + GRIMDARK palette tokens
  - Sprint B: border-image SVG procedural + scanline 0.12 + vignette radial
  - Sprint C: 8 SVG icon set + pixel-perfect rendering globale
  - Sprint D: 27 PNG tile (9 biomi × 3 varianti) + 16 PNG portrait MBTI procedural Python PIL
  - Sprint E: creature sprite 64×64 RGBA pixel-art per 8 archetype + multi-tone shading 5-tier + drop-shadow + idle bob
  - Sprint F: borderImage cascade fix + sprite onload event + button/select tactical theming
- **Godot migration strategy 3-fase** (`docs/planning/2026-04-28-godot-migration-strategy.md`): Fase 1 web ship demo + Fase 2 R&D parallel + Fase 3 cutover, ~14-21 sett
- **Asset sourcing strategy multi-tier** (`docs/planning/2026-04-28-asset-sourcing-strategy.md`): Legacy Collection (Ansimuz CC0, 1613 PNG fornito user) + itch.io tag-godot + Godot Asset Library
- **Master execution plan v2 review-fixed** (`docs/planning/2026-04-28-master-execution-plan.md` 980 LOC): 3 CRITICAL gap killed (test cliff + cross-stack untested + MVP wrong gate) + 5 HIGH gap risolti via 2 review agent paralleli
- **JOB_TO_ARCHETYPE 4 orfani wired** (warden/artificer/invoker/harvester) in `apps/play/src/render.js`
- **Decision Donchitos cherry-pick** (24 agent + 30 skill, NOT full 49+72), Trilium SKIP (AGPL viral), DevForge SKIP (closed Tauri), HermeticOrmus cherry-pick 10-15 prompt
- **Visual Map Obsidian** decided (post-playtest), MIT-friendly markdown vault `kb/`

**Pillar status post #1994 + PR #1995**:

| #   | Pilastro                |                      Stato                      |
| --- | ----------------------- | :---------------------------------------------: |
| 1   | Tattica leggibile       |                       🟢                        |
| 2   | Evoluzione emergente    |                     🟢 def                      |
| 3   | Identità Specie × Job   |               🟢 (post Sprint 8)                |
| 4   | Temperamenti MBTI/Ennea |                       🟡                        |
| 5   | Co-op vs Sistema        |          🟡 → 🟢 def post TKT-M11B-06           |
| 6   | Fairness                | 🟡 (Sprint 13 status engine wave A wired #1994) |

**Next**: deep research analysis NEW session pending (2 file da fornire user). Sprint G v3 Legacy asset swap ready (~20h ~2.5g) post deep research.

**Branch staging NEW session**: `feat/deep-research-analysis-2026-04-28` (da origin/main).

**Trigger phrase NEW session**: _"leggi docs/planning/2026-04-28-deep-research-staging.md, fornisco i 2 file deep research, esegui §Goals analysis"_

---

## Stato precedente (post sessione 2026-04-24/25 notte)

- **20 PR merged** in main da #1736 (M14-A) a #1756 (Observable Plot dashboard)
- Test suite **AI 307/307 verde** + services 177/177 + 57+ nuovi (telemetry 20, restricted-play 13, funnel 4)
- Zero deps nuove, zero guardrail violations
- Branch lavoro precedente: `claude/sprint-3-archivio-close` (worktree reset post PR #1732 merge)
- Ultimo PR merged main: **#1732** `chore(bootstrap): archivio Sprint 0+1+2 + 2 agent P0 + /compact skill + 4-gate DoD policy` (merge commit `1e7bc455`, 2026-04-24 12:52 UTC)
- Sprint 3 archivio in progress: chiude gap readiness 21.5→24/24 con BACKLOG.md + OPEN_DECISIONS.md + master orchestrator decision (OD-006 risolta)
- Sprint **2026-04-24 playtest prep** chiuso in main: 4 PR consecutivi (#1728-#1731) — fix V5 SG pool, launcher rewrite preflight+health+QR+ngrok, playtest-UI fix round 1, sprint close doc
- Sprint 2026-04-26 Vision Gap V1-V7 chiuso (6/7, V3 deferred), PR #1726 merged
- Sprint M16-M20 co-op MVP chiuso (PR #1721-#1725, state machine lobby→debrief live)
- Test suite: **AI 307/307** verdi (DoD gate #1 post-rebase). Altri: round model 60+, lobby 26, M12 57, M13 progression 24, timer 17, vision-gap 65 — aggregate 411+/411
- Playtest round 2 pendente (userland, post #1730)

## 🎮 Agent Illuminator Orchestra (6 attivi)

| Agent                        | MBTI audit/research |        PR        |                          Smoke                           |
| ---------------------------- | :-----------------: | :--------------: | :------------------------------------------------------: |
| balance-illuminator          |    ENTJ-A / ENTP    | #1745 `bfd62ecb` |     docs/qa/2026-04-26-balance-illuminator-smoke.md      |
| ui-design-illuminator        |    ISTP-A / ENFP    | #1746 `3184f25f` |    docs/qa/2026-04-26-ui-design-illuminator-smoke.md     |
| pcg-level-design-illuminator |    INTJ-A / INTP    | #1747 `a7850ad5` | docs/qa/2026-04-26-pcg-level-design-illuminator-smoke.md |
| telemetry-viz-illuminator    |   ISTJ-A / INTP-A   | #1748 `619cecb3` |  docs/qa/2026-04-26-telemetry-viz-illuminator-smoke.md   |
| narrative-design-illuminator |   INFJ-A / INFP-A   | #1754 `84f92687` | docs/qa/2026-04-26-narrative-design-illuminator-smoke.md |
| economy-design-illuminator   |    ENTJ-A / ENTP    | #1755 `f5286bfd` |  docs/qa/2026-04-26-economy-design-illuminator-smoke.md  |

**Memory persistent saved**:

- `feedback_agent_illuminator_workflow.md` — 5-step workflow validated 6×
- `feedback_parallel_research_batches_pattern.md` — 8 WebSearch parallel cache-warm
- `project_agent_illuminator_set_2026-04-26.md` — roster + 70+ pattern

## 🔧 Runtime infrastructure shipped

- `tools/py/telemetry_analyze.py` (15 pytest) — stdlib aggregation pipeline
- `tools/py/restricted_play.py` (13 pytest) — Jaffe 2012 multi-policy harness
- `apps/analytics/index.html` — Observable Plot dashboard CDN ESM
- Backend telemetry hooks `tutorial_start` + `tutorial_complete` auto-log
- `apps/play/lobby.html` WCAG 2.1 AA compliant
- Backend hardcore species variety (1 → 4 distinte)

## Obiettivo prossima fase

- **Preserva approccio**: invoke illuminator agent per ogni nuova feature (non skip)
- **TKT-M11B-06 playtest live** (userland only, 4 amici 90min, chiude P5 🟢)
- **P0 residuali agent** (vedi handoff): MCTS smart policy ~4h, SPRT sequential ~2h, objective variety ~8h, Observable Plot funnel D1/D7/D30 ~4h
- **Nuovi domini agent** se gap (art-direction, audio-design, localization, accessibility specifico)

## Cosa è già stato fatto (ultimi 3 PR + sessione corrente)

- **#1727** (b9a6dc73): SG earn formula Opzione C wired in `abilityExecutor.js` (5 site), UI rewards/packs wires in `onboardingPanel.js`/`debriefPanel.js`/`characterCreation.js`
- **#1726** (0d501169): V1 onboarding 60s, V2 tri-sorgente reward API, V4 PI-pacchetti YAML 16×3, V5 SG tracker 5/8 formula, V7 biome-aware spawn bias, telemetry JSONL endpoint
- **#1725** (5fb94b99): M16-M20 sprint close docs + playtest playbook + CLAUDE.md update
- **Sessione 2026-04-24 (corrente — PR #1732 MERGED + Sprint 3 in-flight)**:
  - 5 research docs scritti (2062 righe totali): skills shopping list, archivio inventory, agent roster, tiktok extraction, triangle-strategy transfer plan
  - **Sprint 0 archivio** (root): PROJECT_BRIEF.md, COMPACT_CONTEXT.md (questo), DECISIONS_LOG.md
  - **Sprint 1 archivio** (root + `.claude/`): MODEL_ROUTING.md, TASK_PROTOCOL.md, SAFE_CHANGES.md, 4 prompt template in `.claude/prompts/` (02_game_design, 04_research_bridge, 05_claude_code_brief, 09_first_principles_checklist)
  - **Sprint 2 archivio** (root + docs): LIBRARY.md (reference index), PROMPT_LIBRARY.md (entrypoint), docs/reports/2026-04-24-repo-autonomy-readiness-audit.md (score 21.5/24 = semi-autonomia reale), docs/guide/claude-code-setup-p1-skills.md (install guide P1), docs/planning/2026-04-24-pr-1732-gamer-summary.md (patch-notes per user approval)
  - 3 nuove memory (2026-04-24 sera): project_archivio_adoption_status (stato adoption), feedback_4gate_dod_application_pattern (template applicativo), MEMORY.md index esteso
  - 2 agent P0 creati + smoke-tested: `.claude/agents/playtest-analyzer.md` (USABLE), `.claude/agents/coop-phase-validator.md` (USABLE post-fix path rewrite)
  - 1 skill creata: `.claude/skills/compact.md`
  - 4 memory saved: session-timing, smoke-test-policy (4-gate DoD), user-decision-shortcuts, archivio-reference
  - Policy **4-gate DoD** codificata in CLAUDE.md — obbligatoria per ogni nuovo agent/skill/feature
  - Branch rebased onto origin/main post merge PR #1728-#1731 — zero conflitti
  - **PR #1732 MERGED** in main (`1e7bc455`, 5 commit squashed, 27 file, +5044 righe). Remote branch deleted post-merge.
  - **Sprint 3** (questa fase): BACKLOG.md root + OPEN_DECISIONS.md root (OD-006 master orchestrator NON adottare, OD-007 Sprint 3 chiuso). Readiness audit 21.5→24/24 practical max.

## Decisioni prese

- **Archivio operativo → adozione Sprint 0 + Sprint 1**: 4 bootstrap file root (PROJECT_BRIEF, COMPACT_CONTEXT, DECISIONS_LOG, MODEL_ROUTING) + 3 file `.claude/` (TASK_PROTOCOL, SAFE_CHANGES, prompts/) + link in CLAUDE.md
- **Agent roster P0**: solo `playtest-analyzer` + `coop-phase-validator`. Vision-gap-tracker deferred (P1), game-database-bridge dormiente (Alt B flag-OFF), archivio-librarian deferred (P2)
- **Skills P0**: zero install NPM/MCP server in questa sessione (richiede approvazione utente setting). Solo skill locale `/compact` codificata
- **Triangle Strategy**: 10 meccaniche → ticket di backlog design, non commit automatico. Rollout proposto in 3 sprint slice M14-A/M14-B/M15 (documento ricerca)
- **Session timing reset**: comportamento salvato in memory (non codice), applicabile cross-session
- **Policy 4-gate DoD**: dichiarazione permanente — ogni nuovo agent/skill/feature richiede research + smoke test + tuning + optimization prima di "ready". Applicata retroattivamente su 2 agent P0 + /compact skill (smoke test eseguiti). Sprint 1 prompts = eccezione (one-off prompts = solo Gate 1).

## Vincoli hard

- **Regola 50 righe**: task >50 righe nuove fuori da `apps/backend/` → ferma, segnala, aspetta
- **Guardrail sprint**: no touch `.github/workflows/`, `migrations/`, `packages/contracts/`, `services/generation/`
- **No nuove deps** senza approvazione esplicita
- **Docs italiano, code identifier inglese**
- **Master DD approval** prima di merge PR
- **Trait solo in** `data/core/traits/active_effects.yaml`

## Problemi aperti

- **TKT-M11B-06 playtest live** (userland, P0, chiude P5 🟢) — invoke `playtest-analyzer` agent post-playtest per crunchare dati JSONL + dashboard `apps/analytics/index.html`
- **M14-D pincer follow-up queue** (ADR #1741 ready, ~6h)
- **M13 P3 Phase B residuo**: balance N=10 sim post XP grant (3-5h)
- **M13 P6 Phase B residuo**: calibration harness N=10 hardcore 07 + HUD timer Phase B (3-5h)
- **V3 Mating/Nido deferred** (~20h post-MVP) — pattern design ready (`narrative-design-illuminator` + `pcg-level-design-illuminator` already covered Creatures/MHS2/Palworld/DQM/Viva Piñata)
- **V6 UI TV polish deferred** (~6h post-playtest)
- **P0 residuali agent illuminator** (vedi handoff doc): MCTS smart policy ~4h, SPRT sequential ~2h, objective variety ~8h, Observable Plot funnel D1/D7/D30 ~4h

## File / output importanti (sessione corrente)

- `docs/planning/2026-04-24-claude-skills-shopping-list.md` (513 righe) — top 5 P0 MCP/skill
- `docs/planning/2026-04-24-archivio-libreria-inventory.md` (249 righe) — 7 subdir + piano 3 sprint
- `docs/planning/2026-04-24-agent-roster-linked-projects.md` (191 righe) — 6 esistenti + 5 proposti
- `docs/planning/2026-04-24-tiktok-screenshots-extraction.md` (378 righe) — 9 Claude-specific estratti
- `docs/research/triangle-strategy-transfer-plan.md` (731 righe) — 10 meccaniche, 64 fonti
- `PROJECT_BRIEF.md` (root, questa sessione)
- `COMPACT_CONTEXT.md` (root, questo file)
- `DECISIONS_LOG.md` (root, index 30 ADR)

## Prossimi 3 passi

1. **Read handoff doc** (`docs/planning/2026-04-25-illuminator-orchestra-handoff.md`) — 90s onboarding alla orchestra agent + workflow validato 6×.
2. **Pick P0 residual or new domain** — usa illuminator agent invocation in `--mode audit` per scope, poi runtime apply separato.
3. **TKT-M11B-06 playtest live** (userland, 2-4h con 2-4 amici) — unico bloccante P5 🟢 definitivo. Post-playtest: invoke `playtest-analyzer` agent per crunchare dati JSONL + visualizza in `apps/analytics/index.html`.

**Deferred**: M13 P3 Phase B balance pass, M13 P6 Phase B calibration hardcore 07, M14-D pincer queue (ADR ready), V3 Mating/Nido (~20h post-MVP, pattern già researched).

**🚨 NON perdere l'approccio illuminator**: ogni nuovo dominio = research-first agent illuminator. Memory salvata in 3 file, vedi handoff doc.
