---
title: 'Stato dell''arte completo — inventario decisioni + estrazione residua + vertical slice'
date: 2026-04-27
doc_status: proposed
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-04-27'
source_of_truth: false
language: it
review_cycle_days: 14
related:
  - docs/reports/2026-04-27-v3.7-cross-pc-update-synthesis.md
  - docs/reports/2026-04-27-cross-game-tier-matrices-synthesis.md
  - docs/reports/2026-04-27-deep-analysis-residual-gaps-synthesis.md
  - docs/planning/2026-04-26-v3-canonical-flow-decisions.md
  - docs/research/2026-04-26-cross-game-extraction-MASTER.md
tags: [stato-arte, inventory, vertical-slice, deep-extraction, v3.7]
---

# Stato dell'arte completo — punto della situazione 2026-04-27

> Documento di riferimento per scegliere next sprint con cognizione di causa. 3 sezioni:
> **§A** = inventario completo decisioni + modifiche proposte/introdotte in questa thread di lavoro
> **§B** = seconda passata estrattiva profonda sui 5 doc cross-game (residuo non ancora catalogato in v3.7)
> **§C** = vertical slice integrata — flow end-to-end con tutti i tasselli + opzioni sequenziamento

---

## §A — INVENTARIO completo decisioni + modifiche

### A.1 — Decisioni di design chiuse (v3.0 → v3.7)

#### v3 canonical flow (sessione 2026-04-26)
Fonte: [`docs/planning/2026-04-26-v3-canonical-flow-decisions.md`](docs/planning/2026-04-26-v3-canonical-flow-decisions.md).

| # | Design call | Verdetto | Stato |
|---:|---|---|:-:|
| 1 | Worldgen pattern | ITB hand-made + condizioni generative (NO simulation runtime UO-style) | 🟢 doc |
| 2 | Assi Form | ibrido 4 MBTI engine + 5 axes UI surface creature-themed | 🟢 doc + V3.5 conviction shipped |
| 3 | A.L.I.E.N.A. | acronimo metodo (NON AI) + wiki in-game progressiva + Skiv voce diegetic | 🟢 codified |
| 4 | Forma | 16 MBTI archetype + Forma I-X anatomical (ortogonali) | 🟢 |
| 5 | Lore alien-event | promote mutagen exploration to canon | 🟢 mutagen_events.yaml |
| 6 | Compromessi accettati | failure as lore, XP invisible, map voto macro | 🟢 |

**Breakthrough**: tribe = lineage emergent, NON layer aggiuntivo. Job runtime resta + tribe emerge da catena Nido→offspring→`lineage_id`.

#### v3 batch 3 decisioni (sessione 2026-04-27)
Fonte: memoria [`project_v3_canonical_flow_2026_04_27_batch3.md`](~/.claude/projects/.../memory/project_v3_canonical_flow_2026_04_27_batch3.md).

| # | Decisione | Verdetto |
|---:|---|---|
| Q1 ancestors | b — apply rename marchio Evo-Tactics: `_<code_suffix>` | applied #1881 |
| Q2 ancestors | B full IT 191 (TUTTI label_it tradotti, NO top-50) | applied #1881 |
| Q3 ancestors | B italianize ID base (es. `ancestor_autocontrollo_*`) | applied #1881 |
| Q4-Q8 S1 polish | tutti default (privacy whitelist subset / cap 10 ambassador / permanent / 1 cooldown campagna / rate-limit 10/h) | applied #1880 |
| M1 UI surface | b — 3-axes radar Personalità + Agile/Memoria stat scheda Specie | applied (V3.5) |
| Stadio | I-X (10 stadi) — 2:1 mapping over 5 macro-fasi Skiv | applied #1882 |

#### v3.5 sprint allineamento dati (this session)
Fonte: PR #1891 + report Skiv ADR + 5 reconciliation docs.
- Schema `biodiversity_bundle.schema.json` NEW (V3.5 bundle)
- `mbtiSurface.js` → +`buildConvictionBadges` + AXIS_COLORS palette
- `characterPanel.js` → 3s Conviction surfacing overlay
- ADR-2026-04-27-skiv-portable-companion-crossbreeding (status: accepted, Phase 1 shipped)
- 5 reconciliation reports: identity-dimensions, identity-stack, v3-vs-v3.2, vc-axes, vertical-slice-roadmap-v3.2

#### v3.6/v3.7 master-dd 6 risposte (this session)
| # | Domanda | Risposta |
|---:|---|---|
| G1 | promozione progression engine ad A2 | YES |
| 2 | priorità EPIC F+G+H | a discrezione Claude |
| 3 | search 9-part deep analysis | YES |
| 4 | leggi FEATURE_MAP_EVO_TACTICS.md | done (122 LOC) |
| 5 | Pattern B scheduled DB sync (~5-7h) | YES |
| 6 | Codex Playbook adoption + CLAUDE.md cross-link (~1h) | YES |

### A.2 — PR shipped 2026-04-26/27 (32 merge totali)

| Wave | PR | Scope | Pillar |
|---|---|---|:-:|
| Sprint v3 batch 1-2 | #1862 | role_templates spawn bias QW1 | meta |
| | #1863 | Skiv lifecycle visible TV | meta+P3 |
| | #1864 | bioma diff_base + stress → pressure runtime | P5 PCG |
| | #1865 | 16 starter_bioma trait + endpoint | P2 |
| | #1866 | synthesis batch 1 (CLAUDE.md + docs) | meta |
| | #1868 | telemetria VC compromesso completo (iter1 default reverted) | P4 |
| | #1874 | Sprint D Nido lineage chain + tribe emergent | P2 |
| | #1875 | Sprint B debrief recruit wire | P2 |
| | #1876 | Sprint A nestHub panel + biome_arc unlock | P2 |
| | #1878 | synthesis batch 2 (ancestors style guide + S1 ADR) | meta |
| | #1879 | Sprint C backend re-apply mating roll + 3-tier offspring | P2 |
| Sprint v3 batch 3 | #1880 | S1 polish Phase 1 schema + persistence | P2 Skiv |
| | #1881 | Ancestors Phase 2 rename marchio + full IT 191 + italianize ID | P2 |
| | #1882 | Stadio Phase A — 10 stadi I-X Skiv canonical | P3 |
| Cross-PC P0 wave | #1869 | trait nerf outlier (ipertrofia + sangue_piroforico) | P6 |
| | #1870 | economy SF/Seed orphan currency cleanup | P6 |
| | #1871 | scenario `objective: 'elimination'` JS → schema object | P5 |
| | #1872 | turn limit + status pin on expire | P6 |
| | #1873 | encounter YAML loader (PCG G1) | P5 |
| | #1883 | Voidling Bound research patterns | meta |
| | #1884 | UI threat tile + WCAG AA + font cap | P1 |
| | #1885 | deep-analysis 9 reports | meta |
| | #1886 | cautious AI retreat fix | P6 |
| | #1887 | biome_id orphan caverna_sotterranea | P5 |
| | #1888 | coop reconnect snapshot push | P5 |
| | #1889 | UI palette token drift phoneComposerV2 | P1 |
| | #1890 | telemetry bootstrap CI 95% in batch | P6 |
| Cross-game tier S | #1893 | Voidling Bound visual swap moderate | P2 |
| | #1894 | Pathfinder XP budget runtime engine | P6 |
| | #1895 | Spore deep extraction transfer plan | P2 |
| | #1896 | FFT Wait action defer turn | P1 |
| | #1897 | Disco MBTI tag debrief insights | P4 |
| | #1898 | AI War Progress meter visibility | P5+P6 |
| | #1899 | xpBudget audit wire + lint_mutations Makefile | P2+P6 |
| | #1900 | ticket auto-gen architecture sketch | meta |
| | #1901 | Tactics Ogre AP pip indicator | P1 |
| Agent integration | #1892 | cross-game extraction matrix + 10 agent step 1+2 | meta |
| Sprint v3.5 | #1891 | biodiversity bundle + pilastri reconciliation + Conviction surfacing | meta+P4 |
| Sprint α (mio) | #1914 | A+E residuals — SG starter + reward telemetry + QBN debrief wire | P2+P4+P6 |
| Decisions codify (mio) | #1921 | 3 user verdicts (OD-001 Path A + HUD hybrid + CoQ soft bias) | meta |
| Tier B+E QW (mio) | #1923 | Isaac Anomaly + FF7R critical juice + 3 Python tools | P1+P2+P6 |
| Spore Moderate full | #1917 | QW-1 mp_grants toast (Gate 5 UX fix) | P2 |
| | #1918 | S5 propagateLineage + inheritFromLineage cross-gen | P2 |
| | #1920 | S6 resolver — archetype DR/init/sight consumption | P2 |
| | #1922 | QW-2 MP badge characterPanel + QW-3 Mutations tab nestHub | P2+UI |
| | #1924 | Sprint Y S5 lifecycle hooks — death propagate + spawn inherit | P2 |
| Backbone deploy | #1919 | Sprint C backbone Min bundle — Render + CF Pages config | P5 ops |
| Ticket runtime (mio) | #1909 | Step 7 sync script + ticket-triage skill (M14 runtime) | meta |
| **Sprint 1-5 autonomous (notte)** | **#1934** | Sprint 1 backend QW — Wesnoth time-of-day + AI War defender adv + Disco day pacing + Fallout numeric ref doc | P1+P5+P6 |
| | **#1935** | Sprint 2 mutation pipeline — Subnautica habitat lifecycle wire (biomeAffinity + 14 species stub + biomeSpawnBias init wave universal) | P2+P3 |
| | **#1937** | Sprint 3 codex completion — Tunic Glifi UI tab + AncientBeast wikiLinkBridge slug + Wildermyth permanent flag | P3+P4+meta |
| | **#1938** | Sprint 4 UI polish — Cogmind stratified tooltip + Dead Space holographic AOE + Isaac Anomaly glow | P1 |
| | **#1940** | Sprint 5 telemetry viz — Tufte sparkline HTML dashboard + DuckDB +4 SQL query | P6+ops |
| OD-001 closure | #1877 ❌ | Sprint C UI — chiuso superseded (backend già via #1879, UI Lineage tab via #1911) | — |
| **Skiv Personal Sprint (2026-04-27/28)** | **#1982** | **G1 encounter Skiv solo vs Pulverator pack — `wounded_perma` status + `woundedPerma.js` + harness N=20 win 45.0% in band 35-45%** | **P1+P5** |
| | **#1977** | **G2 echolocation visual fog-of-war pulse — `senseReveal.js` + `drawEcholocationPulse` cyan 800ms + tile reveal `?` glyph + `installEcholocationOverlay` wire-point** | **P1** |
| | **#1983** | **G3 thoughts ritual choice UI — `thoughtsRitualPanel.js` overlay top-3 candidati + `GET /thoughts/candidates` ranked vcSnapshot + 30s timer + irreversible session lock + voice line preview Disco-style** | **P4** |
| | **#1984** | **G4 legacy death mutation choice ritual — `propagateLineage` opt-in `options.mutationsToLeave` filter (back-compat preserved) + `computeBondHeartsDelta` narrative beat + `POST /api/v1/lineage/legacy-ritual` + `legacyRitualPanel.js` overlay lifecycle_phase=legacy auto-trigger** | **P2** |
| | **#1986** | **Phase 4 close — §6 progress all ✅ + CLAUDE.md sprint context update + memory checkpoint** | **docs** |

**Totale 59 PR shipped** in ~4 giorni (2026-04-25→2026-04-28) + 1 PR closed-superseded. Skiv personal sprint = 5 PR addizionali (4 goals + Phase 4 close) + 29 nuovi test (9 G1 + 6 G2 + 10 G3 + 4 G4) + ~1100 LOC.

### A.3 — Documenti research/design generati (questa thread)

#### Research extraction (origin/main, by other PC)
- 5 cross-game extraction matrices (~1606 LOC totali)
- 10 deep-analysis reports (~2052 LOC: 9 domain + SYNTHESIS)
- Spore deep extraction (401 LOC)
- Voidling Bound patterns (256 LOC)
- Agent integration plan DETAILED (591 LOC)
- Ticket auto-gen architecture (571 LOC)
- v3 canonical flow decisions (la baseline, ora estesa)

#### Generati questa session (3 nuovi report)
- `docs/reports/2026-04-27-v3.7-cross-pc-update-synthesis.md` — 6 opzioni action plan
- `docs/reports/2026-04-27-cross-game-tier-matrices-synthesis.md` — top 15 patterns + status
- `docs/reports/2026-04-27-deep-analysis-residual-gaps-synthesis.md` — 9 domain residual P0/P1/P2
- _(questo doc)_ `docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md` — punto della situazione + vertical slice

#### Reconciliation reports (questa thread, 5 docs)
- `docs/reports/2026-04-27-identity-dimensions-reconciliation.md`
- `docs/reports/2026-04-27-identity-stack-reconciliation.md`
- `docs/reports/2026-04-27-v3-vs-v3.2-reconciliation.md`
- `docs/reports/2026-04-27-vc-axes-reconciliation.md`
- `docs/reports/2026-04-27-vertical-slice-roadmap-v3.2.md`
- `docs/reports/2026-04-27-5axes-ui-mapping-research.md`
- `docs/reports/2026-04-27-skiv-portable-companion-research-summary.md`
- `docs/reports/2026-04-27-stat-hybrid-tamagotchi-companion-research.md`
- `docs/reports/2026-04-27-stadio-phase-A-summary.md`
- `docs/reports/2026-04-27-ancestors-phase-2-apply-summary.md`
- `docs/reports/2026-04-27-ancestors-style-guide-audit.md`

### A.4 — Backend services nuovi shipped (questa thread)

| Servizio | LOC | Wire | Test |
|---|---:|---|---|
| `apps/backend/services/combat/encounterLoader.js` | 69 | session.js /start opt-in | smoke |
| `apps/backend/services/balance/xpBudget.js` | 188 | /start audit log | `tests/services/xpBudget.test.js` |
| `apps/backend/services/narrative/mbtiInsights.js` | 154 | rewardEconomy.buildDebriefSummary | `tests/services/mbtiInsights.test.js` |
| `apps/backend/services/ai/aiProgressMeter.js` | 108 | sessionHelpers.publicSessionView | `tests/services/aiProgressMeter.test.js` |
| `tools/py/lint_mutations.py` | 101 | Makefile | (CLI tool) |
| `apps/backend/services/skiv/companionStateStore.js` | (NEW) | S1 Phase 1 | smoke |
| Migration `0006_skiv_companion_state` | (NEW) | Prisma | — |
| `apps/backend/services/combat/woundedPerma.js` | (NEW ~80) | session lastMissionWoundedPerma persistence | `tests/services/woundedPerma.test.js` (5) |
| `apps/backend/services/combat/senseReveal.js` | (NEW ~70) | sessionHelpers tile_visibility | `tests/services/senseReveal.test.js` (6) |
| `apps/play/src/thoughtsRitualPanel.js` | (NEW ~330) | main.js auto-open `research_completed` | `tests/play/thoughtsRitualPanel.test.js` (4) + `tests/api/thoughtsRitual.test.js` (6) |
| `apps/play/src/legacyRitualPanel.js` | (NEW ~80) | lifecycle_phase=legacy trigger + bond hearts ±1 | `tests/services/lineagePropagatorRitual.test.js` (4) |

### A.5 — Pillar status corrente (post wave + Skiv personal sprint 2026-04-27/28)

| # | Pilastro | Stato | Skiv impact delta |
|---|---|:-:|---|
| P1 | Tattica leggibile | **🟢 def++** | + sense surface visible (echolocation #1977) + Skiv combat showcase (encounter #1982) |
| P2 | Evoluzione | **🟢 def** | + legacy cross-gen agency (mutationsToLeave #1984) — Spore Moderate FULL + lineage |
| P3 | Specie×Job | 🟡++ | unchanged questa sessione |
| P4 | MBTI/Ennea | **🟢 def** | + identity agency at apex (thoughts ritual choice #1983) |
| P5 | Co-op | 🟢 candidato | + solo-vs-pack base per future co-op pack scenarios (#1982) — playtest live = unico bloccante |
| P6 | Fairness | 🟡+ | unchanged questa sessione |

**Score post Skiv sprint**: **3/6 🟢 def** (P1++, P2, P4) + **1/6 🟢 candidato** (P5) + **1/6 🟡++** (P3) + **1/6 🟡+** (P6). Demo-ready confirmed con consolidamento P1+P2+P4.

---

## §B — Estrazione residua profonda (cosa NON è in v3.7)

> Seconda passata. Il v3.7 catalogava ~15 top patterns. Re-leggendo i 5 doc trovati altri **~50 pattern** non ancora indirizzati. Ecco l'inventario completo.

### B.1 — Tier S residuo (oltre i 5 quick-wins shipped)

#### B.1.1 — Final Fantasy Tactics (4 pattern residui)
- 🔴 **CT bar visuale** (3-4h) — overlay barre charge time per ogni unit, riempie secondo speed. Adesso `initiative` formula esiste backend, manca UI HUD.
- 🔴 **Facing crit 3-zone** (front/side/rear, +50%/+25% bonus) (~4h) — estende squad focus_fire +1 a `facing_modifier` in `resolveAttack`.
- 🔴 **JP cross-job ability inheritance** (~10h) — bookmark, NOT priority.
- ⏸️ **Zodiac signs** — anti-pattern (opaco), skip esplicito.

#### B.1.2 — Tactics Ogre Reborn (4 pattern residui)
- 🔴 **HP bar floating sopra sprite** (~5-7h, breaking change cosmetic) — refactor `render.js` HUD da sidebar a overlay sprite. **In v3.7 §11 Opzione B**.
- 🔴 **Charm/recruit boss via dialogue** (~8h) — debrief dialogue trigger + roster add.
- 🔴 **Auto-battle quick simulation button** (~3h) — UI button "auto-resolve" su `predict_combat()` esistente.
- ⏸️ **WORLD rewind state machine** (~40h) — defer, costoso.

#### B.1.3 — Fire Emblem (4 pattern residui)
- 🔴 **Support conversations** (~10h) — `proximity_count[A][B]` tracking + 5-6 conv content.
- 🔴 **Weapon triangle advantage display** (~4h) — consume `species_resistances.yaml` + HUD attack preview.
- 🔴 **Promotion item (master seal)** (~6h) — reward-card unlock tier upgrade.
- 🔴 **Dancer/Refresher class canonical** (~5h) — promuovi trait `coscienza_d_alveare_diffusa` analog a job.

#### B.1.4 — Wesnoth (5 pattern residui)
- 🔴 **Recruit + Recall economy** (~5h) — `recall_cost` formula con tier scaling roster overlay.
- 🔴 **Time-of-day modifier** (~3h) — 1 enum `dawn/day/dusk/night` + formula resolveAttack. **In v3.7 quick-wins**.
- 🔴 **Random map generator weighted noise** (~15h) — beyond hand-authored encounter.
- 🔴 **Replay file deterministic /api/session/:id/replay** (~8h) — seed + actions log + ricostruzione.
- 🔴 **Era system pack-as-era lobby UI** (~4h cosmetic).

#### B.1.5 — AncientBeast (4 pattern, **0 residui** — Tier S #6 closure 4/4 100%)
- 🟢 **Beast Bond reaction trigger** — 2 implementazioni complementari shipped:
  - **Pair-bond defensive reaction** (Sprint 7, PR #1971): `creature_bonds.yaml` 6 bond canonical + AJV schema + `bondReactionTrigger.js` + `counter_attack`/`shield_ally` types + 19 test + ADR-2026-04-27 + numeric-reference §11. Hook performAttack post intercept, mutually exclusive con M2 reactionEngine. Trigger: target HIT.
  - **Trait-bond offensive sustain** (PR #1965 successor): `apps/backend/services/combat/beastBondReaction.js` + schema field `triggers_on_ally_attack` in `active_effects.yaml` + 3 trait `legame_di_branco`/`spirito_combattivo`/`pack_tactics` + wire performAttack read-only check + sessionRoundBridge mutation post-sync + raw event `beast_bond_triggered` + 20 test + 5 species catalog adoption. Trigger: actor ATTACK (any hit/miss). Effetto: stat buff atk_mod/def_mod via status[*_buff] decay.
- 🟢 **3 nuovi elementi** (earth/wind/dark) — Sprint 6 shipped (PR #1964: species_resistances.yaml v0.2.0 8→11 channel + 6 ability nuove + 10 test resistanceEngine + numeric-reference §10. Invariant 6×5 matrix no outlier > 2× / < 0.5×).
- 🟢 **Ability r3/r4 tier** — Sprint 8 shipped (jobs.yaml v0.2.0 21→35 base ability + cost ladder canonical 3/8/14/22 PI + 14 ability nuove (2/job) tutti usano 18/18 effect_type esistenti zero runtime change + 5 test nuovi cost ladder + naming uniqueness + version bump + ADR-2026-04-27-ability-r3-r4-tier + numeric-reference §12). Pillar P3 🟢c++ → 🟢ⁿ.
- 🟢 **Beast Showcase wiki cross-link** — Sprint 3 §II shipped (wikiLinkBridge service + 3 REST endpoint + audit coverage report + 10 unit test).

#### B.1.6 — XCOM EW (1 pattern residuo)
- 🔴 **Officer Training School meta perks** (~10h) — campaign-gated 6-8 meta slot. **In v3.7 §4**.
- ⏸️ **Genetic Mod / MEC hybrid** — bookmark M14+.

#### B.1.7 — XCOM Long War 2 (3 pattern residui)
- 🔴 **Supply/intel currency separation** (~8h) — meta-resource gating mission availability.
- 🔴 **Liberation campaign region map** (~15h) — region grid + liberation% counter. **In v3.7 §4**.
- 🔴 **Haven recruitment radio passive growth** (~6h) — pool tick over campaign turns.

#### B.1.8 — Disco Elysium (4 pattern, 0 residui — ✅ 4/4 BUNDLE COMPLETO)
- 🟢 **Thought Cabinet UI panel + cooldown round-based** (Sprint 6 2026-04-27, PR #1966 `584c54c2`) — 8 slot mentali, mode='rounds' default scala T1→3 / T2→6 / T3→9 round, end-of-round auto-tick via `applyEndOfRoundSideEffects`, Assign/Forget UI con progress bar, 76/76 test verdi. Adoption check scheduled 2026-05-11.
- 🟢 **Internal voice 4-MBTI axes** (PR #1945 `de57432c` 2026-04-27) — narrative log debrief con voce-per-axis durante combat hint. Engine `apps/backend/services/narrative/innerVoice.js` + 18 voice templates `data/core/thoughts/inner_voices.yaml` + 135 test.
- 🟢 **Skill check passive vs active popup** (Sprint 7 2026-04-27) — `apps/play/src/skillCheckPopup.js` consuma `world.events[].trait_effects` (già emesso da `evaluateAttackTraits`), filtra `triggered=true`, dedupes, schedula popup `[NOME TRAIT]` floating Disco-style sopra l'actor con stagger 220ms. Wired in `main.js processNewEvents` post damage popup. 22/22 test, smoke E2E preview validato.
- 🟢 **Day/time pacing flavor copy** — Sprint 1 §I shipped (PR #1934: `formatDayPacing(currentChapter, currentAct)` in `apps/backend/routes/campaign.js` + 4 response sites: defeat retry + choice_node + advance + act_advanced. "Giorno N di Aurora" diegetic copy).

#### B.1.9 — AI War: Fleet Command (3 pattern, 0 residui — ✅ tutti shipped)
- 🟢 **Asymmetric rules registry doc** — Sprint 1 §III shipped (PR #1934: `docs/design/2026-04-27-ai-war-asymmetric-rules.md` canonical reference, codifica Sistema asymmetric pattern per Pillar 5+6).
- 🟢 **Decentralized unit AI doc** — Sprint 1 §IV shipped (PR #1934: `docs/design/2026-04-27-ai-war-decentralized-architecture.md` reference utility brain per-unit autonomous).
- 🟢 **Defender's advantage modifier** — Sprint 1 §II shipped (PR #1934: `apps/backend/services/combat/defenderAdvantageModifier.js` `getDefenderAdvantage` wired in `session.js:445` + `DEFENDER_ADVANTAGE_BONUS=1`).

#### B.1.10 — Fallout Tactics (3 pattern residui)
- 🔴 **Encounter authoring CLI YAML extension** (~6h) — `tools/py/master_dm.py` REPL → YAML generator + validator.
- 🔴 **Balance numeric reference doc** (~3h) — consolidato `data/core/balance/*.yaml`.
- 🔴 **Squad command UI formation preset** (~5h) — overlay 4-8 unit roster.

#### B.1.11 — Wildermyth (5 pattern residui)
- 🔴 **Layered storylets pool** (~10h) — extend pattern Skiv storylets a campaign narrative.
- 🔴 **Permanent visible aspect change battle-scar registry** (~12h) — mid-fight events alterano sprite long-term.
- 🔴 **Portrait stratificati layered overlay** (~15h) — face + scar + age + clothes via canvas compositing.
- 🔴 **Companion lifecycle aging cross-session** (~10h) — counter cross-session.
- 🟢 **Choice → permanent consequence flag in campaign state** — Sprint 3 §III shipped (campaignStore.permanentFlags + recordPermanentFlag/getPermanentFlag + 3 REST endpoint + 9 unit test, idempotent on key).

#### B.1.12 — Jackbox / XCOM 2 multi (2 pattern residui)
- 🔴 **Jack Principles guidance toast per phase** (~5h) — V1 onboarding shipped, estendi a phase-by-phase.
- 🔴 **XCOM 2 points-buy pre-game** (~8h) — point budget shared per build squad.

**Tier S residuo cumulato**: ~31 pattern, **~170h totali** se tutti adottati. (Drift fix 2026-04-27: §B.1.5 Beast Bond #1965 + channel resistance #1964 + §B.1.8 day pacing #1934 + Thought Cabinet main + §B.1.9 3/3 AI War #1934 shipped — 7 pattern segnati post-merge.)

### B.2 — Tier A residuo (oltre i 2 shipped: pathfinder + voidling)

| # | Pattern | Donor | Effort Min/Full | Status |
|---:|---|---|:-:|:-:|
| 1 | StS damage forecast inline su intent icon | Slay the Spire | 4h / 12h | 🟡 partial (intent SIS solo) |
| 2 | Hades multi-currency split (PE-run + Shards-meta + PI) | Hades | 6h / 20h | 🟡 codex schema spec'd |
| 3 | MT Pact Shards opt-in scaling | Monster Train | 5h / 14h | ⚪ — high-ROI hardcore |
| 4 | ITB push/pull arrows + kill probability badge | Into the Breach | 3h / 10h | 🟢 partial |
| 5 | Dead Cells concept graph PCG | Dead Cells | 8h / 24h | 🔵 |
| 6 | Caves of Qud morphotype gating | Caves of Qud | 6h / 18h | 🔵 |
| 7 | MHS gene grid 3×3 + bingo set bonus | Monster Hunter Stories | 4h / 12h | 🔵 — Spore S6 dependency |
| 8 | CK3 DNA chains geneEncoder | Crusader Kings 3 | 6h / 30h | ⚪ — bloccato OD-001 |
| 9 | Subnautica habitat lifecycle 5-stage | Subnautica | 3h / 14h | 🟢 — Sprint 2 §I shipped (biomeAffinity wired performAttack + 15 species lifecycle YAML + biomeSpawnBias universal init wave) |
| 10 | Spelunky 4×4 grid PCG | Spelunky | 4h / 12h | ⚪ |
| 11 | Dead Space diegetic UI HP | Dead Space | 5h / 16h | ⚪ — design call vs Tactics Ogre |

**Tier A residuo cumulato**: 11 pattern, **~54h Min / ~182h Full**.

### B.3 — Tier B residuo (15 giochi)

| # | Pattern | Donor | Effort | Priority |
|---:|---|---|:-:|:-:|
| 1 | Halfway UI surface ALL decision numbers (hit% + status duration + cooldown + MoS) | Halfway | M (~4-6h) | Alta |
| 2 | Frozen Synapse replay cinematico round 3-5s | Frozen Synapse | M (~10-14h) | Alta |
| 3 | Cogmind tooltip stratificati base+expand | Cogmind | S (~4-6h) | 🟢 **Sprint 4 §I shipped** (Shift hold expand → trait list + resistances + species + lifecycle phase) |
| 4 | Balatro joker family tagging combo discovery | Balatro | S (~6-8h) | Media |
| 5 | Magicka 3+ element combo extension | Magicka | M (~8-12h) | Media |
| 6 | NS2 Strategist role 5p+ async | Natural Selection 2 | L (~25-30h) | Media |
| 7 | Isaac Anomaly Trait pool raro 1/20 | Binding of Isaac | S (~4-6h) | **Media — quick win** |
| 8 | SpaceChem encoder editor user-generated | SpaceChem | post-1.0 | Bassa |
| 9 | SS2 3-axis orthogonal upgrade | System Shock 2 | archive | Bassa |
| 10 | BG2 companion arc 3-5 milestone narrative | Baldur's Gate II | archive | Bassa |
| 11 | Battle Brothers initiative timeline ATB + roster persistence cross-mission | Battle Brothers | M (~14-18h) | Media |
| 12 | FF7R critical hit juice (zoom + slow-mo) | FF7 Remake | S (~3-5h) | **Media — quick win** |
| 13 | Hades GDC Pact menu modificatori opt-in | Hades GDC | M (~12-16h) | Alta |
| 14 | Wargroove commander unit groove ability + aura | Wargroove | L (~20-25h) | Media |
| 15 | Songs of Conquest wielder spheres | Songs of Conquest | archive | Bassa |

**Tier B Quick wins ≤5h**: Cogmind tooltip stratificati + Isaac Anomaly Trait + FF7R critical juice = **~13h totali = 3 patterns**.

**Tier B residuo cumulato (esclusi 4 archive)**: 11 pattern, **~115h Min**.

### B.4 — Tier E residuo (oltre Pathfinder shipped)

| # | Pattern | Tipo | Effort | Status |
|---:|---|---|:-:|:-:|
| 1 | Stockfish SPRT calibration early-stop | tooling | Min ~3-4h | **quick win** |
| 2 | Hearthstone Map-Elites deck space | academic | Full ~12-15h | 🟡 spec |
| 3 | Wave Function Collapse encounter PCG | algorithm | Full ~20-25h | 🔴 |
| 5 | ASP constraint solvers | algorithm | Full ~25-30h | 🔴 (blocked dep) |
| 6 | MAP-Elites Quality-Diversity engine | algorithm | Full ~12-15h | 🟡 spec |
| 7 | MCTS smart playout AI Sistema | algorithm | Full ~15-20h | 🔴 |
| 8 | LLM-as-critic balance loop auto | methodology | Min ~4-6h | **quick win** |
| 9 | Tufte sparklines + small multiples HTML dashboard | viz | Min ~6-8h | 🟢 **Sprint 5 §I shipped** (`tools/py/sparkline_dashboard.py` — 5 metric card + win/duration/kills sparkline + funnel table + 8 unit test) |
| 10 | Grafana ops monitoring | tooling | Full ~10-12h | 🔴 (blocked dep) |
| 11 | Riot/Valorant analytics 4 viz canonical | industry | Full ~15-20h | 🔴 |
| 12 | deck.gl hex WebGL replay analyzer | library | Full ~12h | 🔴 (blocked Mission Console source) |
| 13 | DuckDB JSONL pipelines analytics | tooling | Min ~3-5h | 🟢 **Sprint 5 §II expanded** (analyze_telemetry.py +4 query: mbti_distribution + archetype_pickrate + kill_chain_assists + biome_difficulty) |
| 14 | Machinations.io 4 modelli build | tooling | Min ~8-10h | 🟡 spec |

**Tier E Quick wins ≤5h**: Stockfish SPRT + LLM-as-critic + DuckDB JSONL = **~10-15h totali = 3 patterns**.

**Tier E residuo cumulato**: 13 pattern, **~150h** se tutti, ma 4 bloccati su dep approval.

### B.5 — TOTALI estrazione residua

| Tier | Pattern residui | Effort cumulato Min |
|---|---:|---:|
| Tier S (13 giochi) | 32 | ~175h |
| Tier A (11 giochi) | 11 | ~54h |
| Tier B (15 giochi) | 11 (4 archive) | ~115h |
| Tier E (20 voci tech) | 13 (4 blocked) | ~150h |
| **TOTALE** | **67 pattern residui** | **~494h Min** |

**Quick wins ≤5h totali (cross-tier)**: ~16 pattern × media 4h = **~64h** = ~2 settimane sprint single-dev.

---

## §C — VERTICAL SLICE INTEGRATA

> Flow end-to-end del giocatore con tutti i tasselli — shipped + pending. Ordina decisioni next-sprint per prossimità di effort vs impact.

### C.1 — Flow del giocatore single session (golden path)

```
[1] LOBBY (TV + phones) — PR M11 ✅
    ↓
[2] CHARACTER CREATION
    ├─ MBTI personality choice (V1 Disco 60s, ✅)
    ├─ Form pack roll d20+BIAS (M12, ✅)
    ├─ Morphotype mutation pool selector (CoQ, 🔴 6h Min)  ← B.2 #6
    └─ XCOM 2 points-buy build allocation (🔴 8h)         ← B.1.12

[3] WORLD SETUP
    ├─ Biome selection + difficulty preview (✅)
    ├─ Time-of-day enum (Wesnoth, 🔴 3h)                  ← B.1.4
    └─ Pact Shards opt-in scaling slider (MT, 🔴 5h Min) ← B.2 #3

[4] COMBAT
    ├─ Hex grid + ITB telegraph (parziale ✅)
    ├─ AP pip indicator floating (✅ #1901)
    ├─ HP bar floating sopra sprite (Tactics Ogre, 🔴 5h)  ← B.1.2
    ├─ CT bar charge time visual (FFT, 🔴 3-4h)           ← B.1.1
    ├─ Wait action defer turn (FFT ✅ #1896)
    ├─ Facing crit 3-zone (front/side/rear, 🔴 4h)        ← B.1.1
    ├─ Threat tile overlay (ITB ✅ #1884)
    ├─ ITB push/pull arrows + kill probability (🔴 3h)    ← B.2 #4
    ├─ StS damage forecast inline su intent (🔴 4h)       ← B.2 #1
    ├─ AI Progress meter 0-100 + tier (✅ #1898 backend)
    │  └─ frontend overlay (deferred)
    ├─ Cogmind tooltip stratificati trait (🔴 4-6h)       ← B.3 #3
    ├─ FF7R critical hit juice (🔴 3-5h)                  ← B.3 #12
    ├─ Beast Bond reaction trigger adjacency (✅ pair-bond #1971 + trait-bond) ← B.1.5
    ├─ Ability r3/r4 tier progressive (✅ Sprint 8)        ← B.1.5
    ├─ Defender's advantage AI (🔴 3h)                    ← B.1.9
    ├─ Squad focus_fire combo (✅)
    ├─ Reinforcement spawner + biome bias (✅ M-018)
    ├─ Mission timer + pod activation (✅ M13.P6)
    ├─ Status effects (bleeding/stunned/etc — partial)
    └─ Hazard tile damage (✅)

[5] DEBRIEF
    ├─ MBTI tag debrief diegetic (Disco ✅ #1897)
    ├─ Thought Cabinet UI panel + cooldown round-based (Disco ✅ Sprint 6 PR #1966)
    ├─ Internal voice 4-MBTI axes diegetic (Disco ✅ PR #1945)
    ├─ Skill check passive→active popup (Disco ✅ Sprint 7 — `skillCheckPopup.js`)
    ├─ XP grant + perk pick (XCOM ✅ M13.P3 #1697)
    ├─ Officer Training School meta perks (XCOM EW, 🔴 10h) ← B.1.6
    ├─ Tri-Sorgente reward offer R/A/P softmax (✅ V2)
    ├─ Day/time pacing flavor "Giorno N di Aurora" (Disco ✅ Sprint 1 §I PR #1934)
    └─ Replay cinematico round 3-5s (Frozen Synapse, 🔴 10-14h) ← B.3 #2

[6] EVOLUTION (post-debrief, M12 Phase D shipped)
    ├─ Form evolution (16 MBTI, ✅)
    ├─ Mutation apply (Spore, 🔴 6h S2 + 3h S1 + 4h S3 + 7h S6 = 20h Moderate) ← Spore extraction
    ├─ Visual_swap_it backfill 30/30 mutations (Voidling Pattern 6 P0 P2)
    ├─ Lint enforcement (✅ #1899)
    ├─ Authoring 30 entries (🔴 ~15h)                     ← Spore S4
    ├─ MHS gene grid 3×3 + bingo (🔴 4h Min)              ← B.2 #7
    └─ CK3 DNA chains lineage (🔴 6h Min, blocked OD-001) ← B.2 #8

[7] CAMPAIGN ADVANCE (M14)
    ├─ Campaign engine /advance (✅ M10)
    ├─ Lineage chain tribe emergent (✅ Sprint D)
    ├─ Liberation region map macro (LW2, 🔴 15h)          ← B.1.7
    ├─ Haven recruitment radio passive growth (🔴 6h)     ← B.1.7
    ├─ Charm/recruit boss via dialogue (Tactics Ogre, 🔴 8h) ← B.1.2
    ├─ Companion lifecycle aging cross-session (Wildermyth, 🔴 10h) ← B.1.11
    └─ Choice → permanent consequence flag (🔴 4h)        ← B.1.11

[8] LOOP (next mission OR end campaign)
```

### C.2 — Anti-pattern dominante "Engine LIVE Surface DEAD" — 9 fix sweep (7/9 chiusi)

Diagnosticato ~30% delle 61 voci catalogate. Surface manca per:

| # | Engine LIVE | Surface DEAD | Effort fix | Status |
|---:|---|---|---:|:-:|
| 1 | predictCombat N=1000 | Auto-battle button UI | 3h | 🟢 Sprint 8 (hover preview shipped — predictPreviewOverlay.js + tooltip injection) |
| 2 | Tactics Ogre HUD canonical doc | HP floating render.js | 5-7h | 🟢 already live (M4 P0.2 — render.js line 768 `${unit.hp}/${maxHp}` + crit pulse + AP pips) |
| 3 | Spore part-pack design doc | drawMutationDots overlay | 3h (+ 15h authoring) | 🔴 |
| 4 | Mating engine 469 LOC | gene_slots → lifecycle wire | 5h | 🟢 Sprint 12 (`computeMatingEligibles.js` pure helper + `mating_eligibles[]` field in `rewardEconomy.buildDebriefSummary` + frontend `lineagePanel.js` module + `setLineageEligibles` setter + phaseCoordinator pipe `bridge.lastDebrief.mating_eligibles` + CSS gold pair-bond card. Solo su victory + 2+ player survivors. Cap 6 pair (n choose 2). Backend wire: 38/38 unit tests + integration verified end-to-end) |
| 5 | objectiveEvaluator 6 obj types | HUD top-bar surface | 3h | 🟢 Sprint 9 (`objectivePanel.js` + `/api/session/:id/objective` route + `api.objective` client + main.js refresh wire on session start + post commit. Tutorial play UI passa `encounter_id` per attivare engine. 6 obj types format: elimination/capture_point/escort/sabotage/survival/escape) |
| 6 | biomeSpawnBias.js + biome metadata | HUD biome chip surface | 2h | 🟢 Sprint 11 (`biomeChip.js` module + `#biome-chip` HUD slot in header + main.js refresh wire on bootstrap + post-state-fetch + CSS pill style + biome_id propagato in publicSessionView con fallback `session.encounter?.biome_id`. 11 canonical biome IT labels + emoji icons, fallback Title Case + 🌍 default. Tooltip "Biome: X — vedi Codex per dettagli". Engine biomeSpawnBias resta backend (reinforcement spawn pool boost), surface chip è il primo touchpoint player) |
| 7 | QBN engine 17 events | session debrief wire | 3h | 🟢 Sprint 10 (frontend `qbnDebriefRender.js` + `setNarrativeEvent` setter su debrief panel + phaseCoordinator pipe `bridge.lastDebrief.narrative_event` + CSS journal style. Backend `rewardEconomy.buildDebriefSummary` già emetteva `narrative_event` da PR #1914) |
| 8 | Thought Cabinet 18 thoughts | reveal_text_it authoring + UI | 8h | 🟢 Sprint 6 PR #1966 (engine + UI + cooldown round-based) |
| 9 | echolocation senses + sensori_geomagnetici | drawEcholocationPulse cyan + tile reveal `?` glyph | 3-4h | 🟢 Skiv G2 PR #1977 (`senseReveal.js` pure helper + `tile_visibility` in publicSessionView + `drawEcholocationPulse` cyan #66d1fb 800ms 40→120px + `installEcholocationOverlay` wire-point cell-hover ≥500ms) |

**Bundle Surface-DEAD sweep cumulato**: ~32h se incluso authoring. ~17h escluso authoring. **Single biggest strategic ROI** — recupera investimenti già fatti. **Status post-2026-04-28: 8/9 chiusi (#1 hover preview Sprint 8 + #2 HP floating numbers M4 P0.2 + #4 Mating lifecycle Sprint 12 + #5 Objective HUD Sprint 9 + #6 Biome chip Sprint 11 + #7 QBN debrief Sprint 10 + #8 Thought Cabinet Sprint 6 + #9 Echolocation Skiv G2).** Residuo: #3 Spore mutation dots (15h authoring esterno).

### C.3 — 6 OPZIONI sequenziamento next sprint (rank by ROI)

| Opzione | Scope | Effort | Sblocco principale |
|---|---|---:|---|
| **A** Polish hour batch | 8 micro-fix cosmetici (§8 v3.7) | ~4h | clean-up totale, no regressioni |
| **B** Tactics Ogre HUD bundle | HP floating + StS damage forecast + faction shape + HP critico pulse + ITB push arrows | ~12-14h | **P1 → 🟢 def + Surface-DEAD #1+#2 chiusi** |
| **C** Spore Moderate path | S1 schema + S2 applyMutation + S3 MP pool + S6 bingo + visual swap authoring 30 mutation | ~21h | **P2 → 🟢 candidato** + chiude Pattern 6 Voidling |
| **D** Status engine extension | Wire 68 silent ancestor consumers (linked/fed/attuned/sensed/telepatic_link/frenzy/healing) | ~6-8h | **P6 → 🟢 candidato** + recupera 297 ancestor batch ROI |
| **E** Surface-DEAD sweep (anti-pattern killer) | 8 engine orphan wire (vedi §C.2) | ~17-32h | **P1+P2+P4 → 🟢 strategico** |
| **F** Userland TKT-M11B-06 playtest | 2-4 amici live + ngrok + tunnel | ~2-4h userland | **P5 → 🟢 def** |

### C.4 — RACCOMANDAZIONE FINALE — 3 path possibili

#### Path "Polish + Vertical Slice Demo Ready" (ratio impact/effort max)
**A + D + F** in parallelo (~10-12h work + userland playtest)
- A: polish hour (4h) — cosmetic clean
- D: status engine extension (6-8h) — recupera ancestor ROI
- F: playtest live (userland) — chiude P5
- **Outcome**: 3 pillar 🟢 def (P1/P5/P6) + 1 candidato (P2). Demo-ready.

#### Path "P2 Closure" (chiude pillar maggiore)
**C + lint-driven authoring + S5 lineage** (~30h work)
- C: Spore Moderate (21h)
- Authoring 30 mutation `aspect_token` + `visual_swap_it` (15h authoring batch)
- S5 propagateLineage (5h, recupera Mating engine 469 LOC)
- **Outcome**: P2 → 🟢 candidato definitivo. Pilastro evoluzione playtestable.

#### Path "Surface-DEAD Strategic Sweep" (massimo ROI lungo termine)
**E + selective tier S residual** (~25-35h work)
- E: 8 engine orphan wire (17-32h)
- Bundle Tier S quick wins residui (Wesnoth time-of-day + Disco day pacing + AI War defender's advantage = ~8h)
- **Outcome**: 4 pillar 🟢 (P1/P2/P4/P5) + 1 candidato (P6). Pattern A diagnosi sistemica chiusa.

---

## §D — MAINTENANCE

- **Trigger update questo doc**: ogni shipping ≥3 PR di pillar coverage delta · pattern shipped/added/modified · persistence layer change · pillar status delta · sprint scelto
- **Pre-cite check** (mandatory): `git log --oneline -5` su questo file + read sezione rilevante per drift verifica
- **Review ciclo**: 14 giorni (`review_cycle_days`)
- **Cross-link obbligatori**: questo doc supersede/integra v3.7-cross-pc-update-synthesis.md per "stato dell'arte"
- **Memory rule**: vedi [`feedback_stato_arte_doc_upkeep.md`](~/.claude/projects/.../memory/feedback_stato_arte_doc_upkeep.md) — regola operativa upkeep dichiarata 2026-04-27

## §F — PERSISTENCE LAYER (delta 2026-04-27 post Step 1+2+3)

> Per garantire che i 73 pattern residui §B siano **ricordati cross-session** (non solo letti una volta).

### §F.1 — Tickets auto-gen architecture instantiated

- ✅ Schema canonical: [`data/core/tickets/ticket_schema.json`](../../data/core/tickets/ticket_schema.json) (Standard level, 8 required fields)
- ✅ Dir bootstrap: `data/core/tickets/{proposed,active,rejected,merged}/` + README
- ✅ **75 ticket JSON** in `data/core/tickets/proposed/` (73 pattern residui + 2 sub-pattern)
  - 38 Tier S + 11 Tier A + 11 Tier B + 13 Tier E + 2 sub-split
  - Status `blocked` flag su 4: CK3 DNA (OD-001), Grafana/ASP/deck.gl (dep approval / Mission Console source)
- ✅ Generator script riusabile: [`tools/py/seed_residual_tickets.py`](../../tools/py/seed_residual_tickets.py)

### §F.2 — Museum cards (Dublin Core, top-ROI)

11 nuove cards M-2026-04-27-001...011 (museum totale 30):

| ID | Card | Score | Pillar |
|---|---|:-:|:-:|
| 001 | [FFT CT bar + Wait + Facing Crit](../museum/cards/combat-fft-ct-bar-wait-facing-crit.md) | 4/5 | P1 |
| 002 | [Tactics Ogre HP Floating + Charm + Auto-battle](../museum/cards/combat-tactics-ogre-hp-floating-charm.md) | 5/5 | P1+P3 |
| 003 | [Disco Thought Cabinet + Voice + Day Pacing](../museum/cards/narrative-disco-thought-cabinet-diegetic.md) | 5/5 | P4 |
| 004 | [Wildermyth Battle-Scar + Layered Portrait](../museum/cards/creature-wildermyth-battle-scar-portrait.md) | 4/5 | P3+P4 |
| 005 | [Hades Multi-Currency + MT Pact Shards](../museum/cards/economy-hades-multi-currency-pact-menu.md) | 5/5 | P2+P6 |
| 006 | [ITB Telegraph + Push/Pull Arrows](../museum/cards/ui-itb-telegraph-deterministic.md) | 4/5 | P1+P5 |
| 007 | [MHS Gene Grid + CoQ Morphotype + Subnautica](../museum/cards/creature-mhs-gene-grid-coq-morphotype.md) | 5/5 | P2+P3 |
| 008 | [Spore Part-Pack Runtime Stack 6 patterns](../museum/cards/spore-part-pack-runtime-stack.md) | 5/5 | P2 |
| 009 | [Cogmind Tooltip Stratificati](../museum/cards/ui-cogmind-tooltip-stratificati-quick-win.md) | 4/5 | P2+P3 |
| 010 | [Tier E Quick Wins (DuckDB+SPRT+LLM-as-critic)](../museum/cards/telemetry-duckdb-stockfish-llm-critic-quick-wins.md) | 4/5 | P6 |
| 011 | [NS2 Strategist + Frozen Synapse Replay](../museum/cards/coop-ns2-frozen-synapse-replay-asymmetric.md) | 4/5 | P5 |

MUSEUM.md index aggiornato.

### §F.3 — Memory + CLAUDE.md cross-link

- ✅ Memory file: [`project_cross_game_extraction_residual_2026_04_27.md`](~/.claude/projects/.../memory/project_cross_game_extraction_residual_2026_04_27.md) — 73 pattern catalog + locations canonical
- ✅ Memory feedback: [`feedback_stato_arte_doc_upkeep.md`](~/.claude/projects/.../memory/feedback_stato_arte_doc_upkeep.md) — regola operativa upkeep mandatory
- ✅ MEMORY.md index: 2 nuovi entry pointer (project + feedback)
- ✅ CLAUDE.md sprint context section nuova in cima — cross-link 4 synthesis 2026-04-27 + trigger consultation rules

### §F.4 — Trigger consultation paths (post-persistence)

I 73 pattern ora vivono in 3 sistemi proven con trigger automatico:

1. **MUSEUM.md** — letto da TUTTI gli agent illuminator prima di research nuovo (museum-first protocol, validato 2026-04-25)
2. **`data/core/tickets/proposed/*.json`** — 75 file machine-readable, BACKLOG sync ready (ticket-triage skill ~1h pending)
3. **MEMORY.md** — caricato a inizio ogni sessione, trigger su "cosa resta integrare" / sprint planning

### §F.5 — Modifiche subite (changelog questo doc)

| Data | Sezione | Tipo | Motivo |
|---|---|---|---|
| 2026-04-27 created | §A-§E | initial | Master synthesis post deep extraction pass-2 |
| 2026-04-27 update | §F added | persistence | Step 1+2+3 completati: 75 tickets + 11 museum cards + memory entries |
| 2026-04-27 update | §D | upkeep rule | Pre-cite check + memory rule cross-link aggiunta |
| 2026-04-27 update | §G added | reality check | Audit empirico A+D+E targets dopo wave cross-PC |
| 2026-04-27 update | §H added | decisions codified | Sprint α merged + Spore Moderate shipped + 3 decisioni user closed |
| 2026-04-27 sera/notte | §A.2 + §G.5 + §H.4 | wave update | +11 PR mergiati (Spore S5/S6 + lifecycle + UI + Tier B+E mio + backbone deploy) → P2 → 🟢 def + 5 indie candidates verdict (2 ADOPT, 3 DEFER) |

## §G — REALITY CHECK 2026-04-27 sera (audit empirico A+D+E)

> Audit empirico pre-execution A+D+E ha rivelato che **molti target sono già shipped o bloccati**. Doc §B-§C era stale post wave 32 PR cross-PC. Sprint α successivo (PR #1914) ha shippato 3 residual non-blocked. Spore Moderate β è stato shippato autonomamente da altro PC (PR #1913+#1915+#1916).

### §G.1 — Status engine (Opzione D) — **SHIPPED 100%**

Audit verifica `apps/backend/services/combat/statusModifiers.js` full-feature wired:
- ✅ 7 status (linked/fed/attuned/sensed/telepatic_link/frenzy/healing)
- ✅ `computeStatusModifiers` chiamato in `session.js:402` con delta + revert
- ✅ `evaluateStatusTraits` produce `status_applies[]` → scrive `unit.status[stato]`
- ✅ `applyTurnRegen` chiamato in entrambi path (sequential + round bridge)
- ✅ 24/24 test verde (statusModifiers + statusExtension)

I 68 ancestor consumers dichiarati silent dal deep-analysis 2026-04-26 sono **fully consumed**.

### §G.2 — Polish hour (Opzione A) — **SHIPPED Sprint α PR #1914**

3 residual chiusi:
- ✅ **A1 SG +1 starter tutorial** (`session.js`)
- ✅ **A2 Reward auto-log JSONL** (`rewards.js`)
- ✅ **E2 QBN debrief wire** (`rewardEconomy.js` chiama qbnEngine.drawEvent)
- ⏸️ A3 (light terrain) + A4 (ADR retry) skipped — feature richiede engine extension / no drift detectable

### §G.3 — β Spore Moderate — **SHIPPED 100% autonomously**

PR mergiati altro PC:
- ✅ **#1913** Spore S1 schema (body_slot + derived_ability_id + mp_cost lock)
- ✅ **#1915** Spore S2+S3+S6 runtime engine (slot/mp/bingo)
- ✅ **#1916** Spore S3+S6 polish (MP pool tracker + archetype hydration)

**Pillar P2 Evoluzione → 🟢 candidato definitivo** (era 🟡++).

### §G.4 — Surface-DEAD sweep (Opzione E) — **wave UI 5 PR shipped + Gate 5 DoD policy**

PR mergiati altro PC durante wave UI:
- ✅ **#1904** Gate 5 DoD policy (anti-pattern Surface-DEAD codified come policy permanente)
- ✅ **#1905** Y1 design rebrand (Gris palette + HLD glyph + Pentiment font)
- ✅ **#1906** Y2 StS damage forecast + HP critico pulse
- ✅ **#1907** Y3 ITB push/pull arrows
- ✅ **#1908** Step 3 AI Progress meter frontend wire
- ✅ **#1911** Lineage tab fix (Sprint D engine wired UI exposed)
- ✅ **#1912** Backbone online deploy roadmap

**Pillar P1 Tattica → 🟢 definitivo** (era 🟢 candidato).

### §G.5 — Pillar status post merge wave + Sprint α (versione 2026-04-27 sera)

| # | Pillar | Pre | Post | Delta |
|---|---|:-:|:-:|---|
| P1 | Tattica leggibile | 🟢c | **🟢 def** | wave UI 5 PR + Gate 5 DoD policy + FF7R critical juice (#1923) |
| P2 | Evoluzione | 🟡++ | **🟢 def** | Spore Moderate FULL stack S1→S6 + S5 lifecycle hooks (#1917-1924) + Isaac Anomaly + biodiversity v3.5 (#1891) |
| P3 | Specie×Job | 🟡 | 🟡+ | Lineage tab UI + S5 cross-gen inherit (#1924) |
| P4 | MBTI/Ennea | 🟡++ | 🟡++ | QBN debrief wire (#1914) + pilastri canonical 6 ADR (#1891) |
| P5 | Co-op | 🟢c | 🟢c | M11B-06 playtest userland gate; backbone deploy roadmap shipped (#1919) |
| P6 | Fairness | 🟡+ | 🟡++ | + 3 Tier E tools (SPRT + DuckDB + LLM critic, #1923) |

**Score finale 2026-04-27 sera**: **2/6 🟢 def** (P1+P2!) + **1/6 🟢 cand** (P5) + 3/6 🟡+/++ (P3/P4/P6).

**Trend**: P2 Evoluzione passa da 🟡++ stable → **🟢 def** in <12h grazie a wave Spore Moderate altro PC (S1+S2+S3+S5+S6 + UI).

## §H — DECISIONI CODIFIED 2026-04-27 (post Sprint α + β + wave UI)

### §H.1 — OD-001 V3 Mating: **Path A confirmed**

**User verdict 2026-04-27**: Path A (Activate) è il più completo, già shipped Sprint A→D 4/4 + Lineage tab #1911. Path C (replace job system ~40h breaking) deprecato dalla scoperta tribe-emergent (memory `feedback_tribe_lineage_emergent_breakthrough.md`): tribe **emerge automaticamente** dalla catena Nido→offspring→`lineage_id`, senza layer aggiuntivo.

**Closure formale**: `OPEN_DECISIONS.md` OD-001 status → RISOLTA Path A.

### §H.2 — HUD canonical: **Tactics Ogre overlay-rich + cherry-pick Dead Space hybrid**

**User verdict 2026-04-27**: NON archive Dead Space — hybrid pattern selettivo. Canonical = Tactics Ogre overlay-rich (HP bar floating + AP pip + intent forecast + StS damage forecast tutti shipped). Dead Space layer additivo:

- ✅ **HP critico pulse interno sprite** (Dead Space tint) — già shipped #1906 HP critico pulse animation
- 🆕 **Holographic projection cone per AOE** — `TKT-UI-DEAD-SPACE-HOLOGRAPHIC-AOE-CONE` (~5h proposed)
- 🆕 **HP sprite tint additive** (precise bar + emozionale tint) — `TKT-UI-DEAD-SPACE-HP-SPRITE-TINT` (~2h proposed, partial overlap #1906)

Combina: precise (Tactics Ogre bar) + emozionale (Dead Space tint) = layered feedback. Museum card M-2026-04-27-002 aggiornata con "Decision codified" section.

### §H.3 — CoQ morphotype: **Soft bias confirmed**

**User verdict 2026-04-27**: soft bias (default V1 onboarding 60s shipped PR #1726). Mutazione della stessa "category" della MBTI personality scelta appare **2× più frequente** in `rewardOffer.js` softmax (NON exclusive — preserva flessibilità). Hard gate **DEFER post-playtest live** — riconsiderato solo se players SI bloccano in soft bias durante TKT-M11B-06.

**Cross-impact Spore S6 bingo** (just shipped): con soft bias, bingo bonus diventa **discovery emergente** (più reward design vs trivial garantito hard gate). Museum card M-2026-04-27-007 aggiornata con "DECISION CODIFIED" section.

---

### §H.4 — Indie research candidates (5 verdicts 2026-04-27 sera/notte)

**Context**: 5 candidati alto-ROI estratti da analisi predittiva indie research (i 5 file `2026-04-27-indie-*.md` **NON ANCORA online** sul repo — drafts locali altro PC).

| # | Candidato | Effort | Pillar | Verdict | Rationale |
|---:|---|---:|:-:|:-:|---|
| 1 | **Tactical Breach Wizards Undo libero** | 3-4h | P1 | ✅ **ADOPT** | Quality-of-life potente, sblocca apprendimento tutorial (player sperimenta senza penalty). Pillar P1 già 🟢 def lo rinforza. ROI 7/10. |
| 2 | Astrea dice deckbuilder dual-resource corruption/purification | 5-7h | P2 | ⏸️ **DEFER** | Spore Moderate ha già MP pool + Mutations + Tribe lineage. Aggiungere altro resource = scope creep. ROI 5/10 con costo coordinazione alto. |
| 3 | Citizen Sleeper dice allocation week-by-week | 6h | P1 | ⏸️ **DEFER post-playtest** | AP attualmente = numero (2/turno). Cambiare paradigma a dice allocation = breaking profondo (resolveAttack + AI selectAction + UI tutti toccati). Riconsidera SOLO se TKT-M11B-06 playtest mostra AP system "noioso". |
| 4 | **Tunic decipher Codex pages** | 5h | cross-cutting | ✅ **ADOPT** | Hades Codex panel già spec'd (M-2026-04-27-005). Tunic decipher = layer narrative-decifrabile sopra Codex base. Fits perfectly con A.L.I.E.N.A. wiki in-game progressiva. ROI 8/10. **TOP RECOMMENDATION.** |
| 5 | Inscryption meta-narrative gimmick | 10-15h | P4 | ⏸️ **DEFER post-MVP** | Easter egg P4 deep, scope niche, blast radius narrative system. Defer permanente fino feedback playtest demonstrato need. |

**Bundle ADOPT (~8-9h totale)**: TBW Undo + Tunic Codex. Tickets nuovi: `TKT-COMBAT-TBW-UNDO-LIBERO` + `TKT-CROSS-TUNIC-DECIPHER-CODEX`.

**Bundle DEFER**: Astrea + Citizen Sleeper + Inscryption. Tutti hanno trigger condition esplicito per riattivazione (post-playtest, post-MVP, scope expand).

---

## §E — DECISIONI RICHIESTE master-dd (legacy — vedi §H per closure 2026-04-27)

1. ~~Quale path attivare?~~ ✅ closed: Sprint α (A+E residuals) + β Spore Moderate auto-shipped altro PC
2. ~~Spore extraction Moderate confermato?~~ ✅ shipped #1913+#1915+#1916+#1918+#1920+#1922+#1924 (full S1-S6 stack)
3. ~~OD-001 V3 Mating verdict?~~ ✅ Path A confirmed (§H.1)
4. ~~Tier B Quick wins~~ ✅ shipped #1923 (Isaac Anomaly + FF7R critical juice; Cogmind DEFER)
5. ~~Tier E Quick wins~~ ✅ shipped #1923 (Stockfish SPRT + DuckDB + LLM-as-critic, 3 Python tools)
6. ~~Engine LIVE Surface DEAD sweep~~ ✅ codified Gate 5 DoD policy #1904
7. **Indie research integration** — ⏸️ **PENDING tu pushi i 5 file** `2026-04-27-indie-*.md` (drafts locali altro PC, NON ancora online). Decisione candidati shipped §H.4 above.

---

_Doc generato 2026-04-27 da claude-code dopo absorption massiccia + deep extraction pass 2. §G+§H+§H.4 added 2026-04-27 sera/notte post wave Spore Moderate auto-shipped altro PC + 5 decisioni user closed (3 originali + 2 Tier B+E)._
