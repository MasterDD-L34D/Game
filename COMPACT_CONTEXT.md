# COMPACT_CONTEXT — Evo-Tactics

> **Scope**: snapshot 30 secondi. Sessione successiva parte da qui.
> **Cambia ogni sessione significativa**. Aggiornamento manuale o via skill `/compact`.

---

## Progetto

- **Nome**: Evo-Tactics
- **Versione compact**: v10 (post Sprint 6 Thought Cabinet UI panel cooldown round-based 2026-04-27 — ✅ MERGED #1966 `584c54c2`)
- **Ultimo aggiornamento**: 2026-04-27 (Sprint 6 Disco Tier S #9 closure — engine + bridge + UI + tests + smoke E2E + merge bookkeeping + adoption follow-up scheduled 2026-05-11)

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

## Stato attuale (post sessione 2026-04-24/25 notte)

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
