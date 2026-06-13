---
title: 'Sprint α + β + γ + δ Coordinated Handoff — Strategy Research execution plan'
date: 2026-04-27
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-27'
source_of_truth: false
language: it
review_cycle_days: 14
tags:
  [handoff, sprint, coordinated, cross-pc, strategy-research, autonomous, multi-pc, execution-plan]
related:
  - docs/reports/2026-04-27-strategy-research-MASTER-synthesis.md
  - docs/research/2026-04-27-strategy-games-design-extraction.md
  - docs/research/2026-04-27-strategy-games-mechanics-extraction.md
  - docs/research/2026-04-27-strategy-games-tech-extraction.md
  - docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md
  - docs/planning/2026-04-27-bundle-b-recovery-handoff.md
---

# Sprint α + β + γ + δ Coordinated Execution Handoff

> **Purpose**: piano coordinato per applicare in autonomo i 4 sprint proposti dalla strategy research wave 2026-04-27 (PR #1942-#1946). Salvato su repo per **continuazione cross-PC** — qualsiasi sessione (PC master-dd / PC altro / nuovo Claude) può loadare questo doc + eseguire fase corrente.
>
> **Status documento**: ACTIVE. Update mandatory ad ogni Sprint shipped (sezione §6 progress tracking).

---

## §1 — Stato vertical slice CORRENTE (post wave research)

### 1.1 Snapshot vertical slice 2026-04-27 sera

8 fasi gameplay flow. Status update post 30+ PR mergiate questa sessione + cross-PC waves:

| Fase                  | Componenti shipped                                                                                                                                                                                                                                                                                                                        | Componenti deferred                                                                                                                                                                                                            | Pillar coverage |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------: |
| **[1] Lobby**         | M11 Phase A+B+C ✅                                                                                                                                                                                                                                                                                                                        | TKT-M11B-06 playtest userland                                                                                                                                                                                                  |     P5 🟢c      |
| **[2] Char creation** | MBTI choice ✅ + Form pack roll ✅ + Mutations tab ✅ (#1922)                                                                                                                                                                                                                                                                             | Morphotype CoQ pool selector + XCOM points-buy                                                                                                                                                                                 |  P3 🟡+ P4 🟢c  |
| **[3] World setup**   | Biome + difficulty ✅                                                                                                                                                                                                                                                                                                                     | Time-of-day Wesnoth + Pact Shards opt-in                                                                                                                                                                                       |     P5 🟢c      |
| **[4] Combat**        | AP pip ✅ + StS forecast ✅ + ITB telegraph ✅ + Threat tile ✅ + Counter HUD ✅ (#1932) + Wait action ✅ + Reinforcement ✅ + Mission timer ✅ + Cogmind tooltip ✅ (#1938) + Dead Space AOE ✅ (#1938) + Isaac glow ✅ (#1938) + AI Progress meter ✅ + archetype DR/init/sight/adapter/alpha ✅ (#1920+#1941) + Undo libero ✅ (#1933) | HP floating Tactics Ogre + CT bar FFT + Facing crit + push/pull arrows kill prob + Beast Bond + Defender's adv + Pseudo-RNG + Bravado + Pin Down + Morale check + Interrupt fire + Body-part overlay + Tooltip 3-tier extended |    P1 🟢 def    |
| **[5] Debrief**       | MBTI tag ✅ + XP grant ✅ + Tri-Sorgente reward ✅ + QBN debrief ✅ (#1914) + Conviction insights ✅ (#1891)                                                                                                                                                                                                                              | Thought Cabinet UI + OTS meta perks + Day/time pacing flavor + Replay cinematico Frozen Synapse + Timeline manipulation Othercide                                                                                              |     P4 🟢c      |
| **[6] Evolution**     | Form evolution 16 MBTI ✅ + S1+S2+S3+S5+S6 ✅ + lifecycle hooks ✅ + Mutations tab ✅ (#1922) + lint balance ✅ (#1939) + adapter+alpha ✅ (#1941)                                                                                                                                                                                        | Aspect_token authoring 30 entries (~15h debt) + MHS gene grid 3×3 visual + CK3 DNA chains lineage + DNA gene encoding                                                                                                          |    P2 🟢 def    |
| **[7] Campaign**      | M10 ✅ + Lineage tribe emergent ✅ + biodiversity bundle ✅ (#1891) + Tunic Codex ✅ (#1933+#1931) + Tufte sparklines ✅ (#1940)                                                                                                                                                                                                          | Liberation region map LW2 + Haven recruitment + Charm/recruit boss + Companion lifecycle aging + Choice → permanent + Subnautica habitat fully wired (#1935 partial)                                                           |     P5 🟢c      |
| **[8] Loop**          | Next mission via campaign advance ✅                                                                                                                                                                                                                                                                                                      | End campaign ceremony                                                                                                                                                                                                          |                 |

### 1.2 Pillar score corrente (post #1946)

|        Pillar        |    Status    | Note                                                                          |
| :------------------: | :----------: | ----------------------------------------------------------------------------- |
| P1 Tattica leggibile | **🟢 def++** | counter HUD + undo + archetype consumption + Cogmind tooltip + Dead Space AOE |
|    P2 Evoluzione     |  **🟢 def**  | Spore Moderate FULL stack S1-S6 + lifecycle + balance lint + UI panel         |
|   P3 Specie × Job    |     🟡+      | Lineage UI exposed; needs CoQ morphotype + XCOM points-buy                    |
|    P4 MBTI/Ennea     | **🟢 cand**  | Drift briefing wired + QBN debrief + conviction insights                      |
|       P5 Co-op       | **🟢 cand**  | M11 stack live; gate finale = TKT-M11B-06 userland playtest                   |
|     P6 Fairness      |     🟡++     | SPRT+DuckDB+LLM critic shipped; mancano pseudo-RNG + morale + tension gauge   |

**Score finale**: **3/6 🟢 def + 2/6 🟢 candidato + 1/6 🟡++**.

### 1.3 Strategy research wave summary

23 games (8 tech + 7 design + 8 mechanics) → 58 pattern → top 15 quick-win → 4 bundle proposti (Sprint α/β/γ/δ).

**Verifica pre-execution mandatory**: alcuni top 15 patterns potrebbero overlap con cross-PC sprint shipped (#1935-#1940). Verify checklist:

- ✅ Cogmind tooltip → already shipped #1938 (Sprint 4 UI polish) — **REMOVE from Sprint β #7 scope, replace with extension/refinement only**
- ✅ Dead Space AOE → already shipped #1938 — **REMOVE Sprint β if duplicato**
- ✅ Tufte sparklines → already shipped #1940 (Sprint 5 telemetry viz) — **REMOVE Sprint γ overlap**
- ✅ AncientBeast wiki + Tunic Glifi + Wildermyth flags → already shipped #1937 (Sprint 3 codex)
- ✅ Subnautica habitat → already shipped #1935 (Sprint 2 mutation pipeline)

**Top 15 NET clean (post-overlap removal)** — vedi §3 esecuzione.

---

## §2 — 4 sprint plan (α+β+γ+δ) coordinato

### 2.1 Strategia execution

**Wave structure** (2 fasi, anti-collision):

```
Phase 1 (autonomous, ~32h budget): α + γ parallel
  ├─ Sprint α "Tactical Depth"   [backend + tests]
  └─ Sprint γ "Tech Baseline"    [tools + perf + modding]
       ↓ (merge wave Phase 1)
Phase 2 (autonomous, ~42h budget): β + δ parallel
  ├─ Sprint β "Visual UX"        [frontend + content]
  └─ Sprint δ "Meta Systemic"    [V3 mating + narrative + conviction]
       ↓ (merge wave Phase 2)
       ↓
Phase 3 (synthesis): aggiorna vertical slice + handoff next session
```

**Razionale ordine**:

- α + γ first → backend stable foundations (nuovo combat depth + tooling) prima delle UX layer
- β depends on α (tooltip 3-tier estende threat preview shipped, body-part overlay riusa pseudo-RNG α#1)
- δ richiede TKT-09 ai_intent_distribution (γ#5 patch delta auto report potenzialmente collateral) + writer budget D4

### 2.2 File ownership matrix (anti-collision)

Lessons from sessione 2026-04-27 sera: parallel agents hanno avuto 3 collision events su working dir condiviso. Strategy questa wave: **file ownership esclusivo + branch isolato + pre-fetch origin/main per ogni agent**.

| Sprint              | File esclusivi                                                                                                                                                                                            | Shared (additive only, max LOC)                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **α Tactical**      | `apps/backend/services/combat/*` (NEW pseudoRng.js + bravado.js + pinDown.js + morale.js + interruptFire.js) + `tests/services/sprint-alpha/*`                                                            | `apps/backend/routes/session.js` (+30 LOC max), `apps/backend/services/roundOrchestrator.js` (+20 LOC) |
| **β Visual UX**     | `apps/play/src/render.js` (drawTooltip3Tier + drawTensionGauge + drawPortraitOverlay + drawBodyPartOverlay) + `apps/play/src/style.css` + `apps/play/src/portraitPanel.js` (NEW)                          | `apps/play/src/main.js` (+50 LOC max wire), `apps/play/src/api.js` (+5 endpoint methods)               |
| **γ Tech Baseline** | `tools/py/*` (perf_benchmark.py + patch_delta_report.py + bug_replay_export.py + ai_personality_loader.py) + `apps/backend/services/perf/*` (NEW dirtyFlagTracker.js) + `Makefile`                        | `tests/scripts/*` (additive new files), `apps/backend/services/traitEffects.js` (+20 LOC dirty flag)   |
| **δ Meta Systemic** | `apps/backend/services/meta/*` (NEW geneEncoder.js + eventChainScripting.js + convictionVoting.js + mutationTreeSwap.js) + `data/core/dna/*` (NEW gene chain seed YAML) + `tests/services/sprint-delta/*` | `apps/backend/services/metaProgression.js` (+30 LOC, V3 mating extension)                              |

**Disjoint check**:

- α ↔ β: NO overlap files (α backend pure / β frontend pure)
- α ↔ γ: minor overlap traitEffects (α reads dirty flag if γ shipped first) → γ must precede α reading
- α ↔ δ: NO overlap (α combat services / δ meta services)
- β ↔ γ: NO overlap
- β ↔ δ: minor overlap api.js (5+5 = 10 new methods OK in budget)
- γ ↔ δ: NO overlap

### 2.3 Sprint α "Tactical Depth" — agent prompt

**Effort**: ~16-22h | **Pillar**: P1+P6 | **Branch**: `feat/sprint-alpha-tactical-depth-2026-04-28` | **Dependencies**: nessuna

**Patterns inclusi** (top 15 ranks #1+#2+#3+#11 + #12 light):

1. **Pseudo-RNG mitigation** (Phoenix Point, ~3h) — streak-breaker per resolveAttack
2. **Bravado AP refill** (Hard West 2, ~3h) — chain-kill +1 AP refill
3. **Pin Down suppress fire** (XCOM 2, ~3h) — mark target → -2 attack mod next turn
4. **Morale check post-event** (Battle Brothers, ~4h) — threshold trigger panic/rage
5. **Interrupt fire stack light** (JA3, ~3h) — overwatch + reaction priority queue

**Agent prompt ready-to-paste** (prossima sessione):

```
Spawn general-purpose agent background.
Branch: feat/sprint-alpha-tactical-depth-2026-04-28 da origin/main.
Read context: docs/research/2026-04-27-strategy-games-mechanics-extraction.md §1+§2+§3+§4+§6.
Read shipped: apps/backend/services/combat/sgTracker.js (mirror pattern per nuove services).

Implementa 5 patterns in 1 PR:
1. apps/backend/services/combat/pseudoRng.js (NEW, ~80 LOC):
   - Streak-breaker: dopo 3 miss consecutivi su stesso actor, +5 to_hit garantito
   - Pure module mirror sgTracker, init unit fields {miss_streak: 0, hit_streak: 0}
   - Wire in resolveAttack post-roll
   - 4 test (streak threshold, reset on hit, scope per-actor, back-compat)

2. apps/backend/services/combat/bravado.js (NEW, ~70 LOC):
   - On kill event → +1 AP refill to actor (max actor.ap)
   - Hook in damage step quando target.hp = 0 + actor.controlled_by = 'player'
   - 3 test (kill triggers refill, max cap, sistema actor no refill)

3. apps/backend/services/combat/pinDown.js (NEW, ~80 LOC):
   - Action type "pin_down" — actor spends 1 AP, marks target → target.status.pinned = 2 turns
   - Pinned target -2 attack_mod next turn
   - 4 test (apply pinned, decay 2 turns, attack mod check, action available)

4. apps/backend/services/combat/morale.js (NEW, ~100 LOC):
   - Post-event check (ally_killed_adjacent / enemy_critical_hit / status_panic_count > 2)
   - Threshold MoS-style: morale_score < threshold → trigger status panic (2 turns) o rage (1 turn)
   - 5 test (threshold pass/fail, ally KO trigger, status integration, decay)

5. apps/backend/services/combat/interruptFire.js (NEW, ~80 LOC):
   - Overwatch + reaction stack: priority queue ordered by initiative + perk modifier
   - Wire in roundOrchestrator post-action resolution
   - 3 test (queue order, priority resolution, no-conflict adjacency)

Wire shared: apps/backend/routes/session.js (+30 LOC max — endpoint pin_down action), apps/backend/services/roundOrchestrator.js (+20 LOC, interrupt queue hook).

DoD: 19+ test green, prettier check, AI baseline 311/311 verde.
NO modify tests esistenti, additive only.
Commit message: "feat(combat): Sprint α Tactical Depth — pseudo-RNG + bravado + pin down + morale + interrupt"
Push + PR title "feat(combat): Sprint α — 5 tactical mechanics (Phoenix Point + Hard West + XCOM + Battle Brothers + JA3)"
```

### 2.4 Sprint β "Visual UX" — agent prompt

**Effort**: ~22h | **Pillar**: P3+P4+P6 | **Branch**: `feat/sprint-beta-visual-ux-2026-04-28` | **Dependencies**: α merged (uses pseudo-RNG output for tooltip)

**Patterns inclusi** (top 15 ranks #7+#8+#9+#10+#15):

1. **Tooltip stratificato 3-tier** (Civ VI, ~5h) — hover delay 300ms → tier 1 (icon+name), 800ms → tier 2 (stats), 1500ms → tier 3 (lore)
2. **Chromatic tension gauge** (Frostpunk, ~4h) — pressure bar transition cool→warm + screen vignette
3. **Portrait-as-status** (CK3, ~5h) — character portrait con expression dynamic da status (panic/rage/focused)
4. **Free-aim body-part overlay** (Phoenix Point, ~5h) — overlay percentages per zona (head/torso/legs)
5. **JA3 atmospheric voice UI** (~3h) — period-typography ON status messages

**Agent prompt ready-to-paste**: vedi ALLEGATO §A (sotto, sezione 5).

### 2.5 Sprint γ "Tech Baseline" — agent prompt

**Effort**: ~16h | **Pillar**: dev/perf/modding | **Branch**: `feat/sprint-gamma-tech-baseline-2026-04-28` | **Dependencies**: nessuna

**Patterns inclusi** (top 15 ranks #4+#5+#6+#13+#14):

1. **Perf benchmark baseline** (Frostpunk, ~2h) — `tools/py/perf_benchmark.py` con suite 5 hot path
2. **Dirty flag traitEffects** (Frostpunk, ~4h) — pattern dirty flag in `apps/backend/services/traitEffects.js`
3. **AI personality YAML** (Total War, ~4h) — schema + loader + ai_profiles.yaml extension
4. **Patch delta auto report** (CK3, ~3h) — `tools/py/patch_delta_report.py` git diff vs N PR
5. **Bug replay export** (Old World, ~3h) — `tools/py/bug_replay_export.py` JSON snapshot session + seed

**Agent prompt ready-to-paste**: vedi ALLEGATO §B.

### 2.6 Sprint δ "Meta Systemic" — agent prompt

**Effort**: ~20h | **Pillar**: P2+P5 | **Branch**: `feat/sprint-delta-meta-systemic-2026-04-28` | **Dependencies**: β merged (UI for conviction voting), TKT-09 ai_intent_distribution opt-in (light version OK without)

**Patterns inclusi**:

1. **DNA gene encoding** (CK3, ~6h) — encode `unit.lineage_id` + applied_mutations[] → DNA hash chain (per V3 Mating evolved)
2. **Event chain scripting** (Stellaris, ~5h) — narrative event sequence con conditional next_event wire (extends narrativeEngine)
3. **Mutation tree swap** (Mutant Year Zero, ~4h) — alternative path mutation: swap one applied → free re-pick (extends mutationEngine)
4. **Conviction voting** (Triangle Strategy, ~5h) — multi-player vote weighted by VC axes alignment

**Agent prompt ready-to-paste**: vedi ALLEGATO §C.

---

## §3 — Cross-PC coordination protocol

### 3.1 Resume command (any session)

Per loadare questo piano e continuare da fase corrente:

```
read docs/planning/2026-04-27-sprint-abgd-coordinated-handoff.md.
verifica §6 progress tracking — quale fase corrente?
se Phase 1 not started: spawn α + γ paralleli (vedi §2.3 + §2.5 prompts).
se Phase 1 done: spawn β + δ paralleli (vedi §2.4 + §2.6 prompts).
se Phase 2 done: synthesis vertical slice update + close handoff.
```

### 3.2 Conflict-detection rules

Pre-spawn agent checklist:

1. **Verify origin/main** è up-to-date (`git fetch origin main`)
2. **Branch existence check** (`git branch -a | grep feat/sprint-{alpha|beta|gamma|delta}` — se esiste, possibile lavoro altro PC in flight)
3. **Open PR check** (`gh pr list --state open` — se sprint corrispondente già aperto, potrebbe essere altro PC)
4. **Working tree clean** (`git status` — no uncommitted residue da sessione precedente)

### 3.3 Anti-pattern guards

**Lessons codified questa sessione** (DA NON RIPETERE):

- ❌ NO modify branch sibling agent's working dir during parallel execution (collision triple)
- ❌ NO checkout origin/main durante un altro agent committing (race condition)
- ❌ NO untracked file `??` lasciato senza `git add` — perso permanentemente cleanup
- ❌ NO duplicate import `createXRouter` in app.js (cross-PC race risk PR #1933 lesson)
- ✅ DO worktree isolation per agent backround quando possibile (`git worktree add`)
- ✅ DO commit atomico ogni edit significativo (anche WIP) per safety
- ✅ DO pre-fetch + post-fetch verify per ogni agent (rebase awareness)

### 3.4 Cross-PC merge wave protocol

Quando entrambi PC hanno PR open:

1. PR primo merge → main aggiorna
2. PR secondo `mergeStateStatus: BEHIND` → trigger rebase locale (non auto-merge)
3. Se conflict → preferire `--theirs` per registry (mechanical), `--ours` per code (semantic) caso-per-caso
4. Force push --force-with-lease (NO bare --force per safety)
5. Re-merge admin

Vedi PR #1933 + #1939 per esempi precedenti gestiti.

---

## §4 — Decisioni master-dd richieste pre-execution

Sblocca rispettivi sprint:

### Per Sprint α (zero blocchi)

Prerequisiti tutti live. Può partire IMMEDIATELY.

### Per Sprint β

- **D-design-1**: Portrait dynamic emotion (~12h con animation) o static set (~5h)?
- **D-design-2**: Tooltip 3-tier hover delay default 300ms o 500ms?
- **D-design-3**: Tension gauge integrato pressure UI esistente (#1905) o panel separato?

### Per Sprint γ (zero blocchi critici)

- **D-tech-1**: Mod hook API initial scope (ini-override / Lua / TypeScript plugin)? — può partire con scaffolding generic + lock decision in PR
- **D-tech-2**: Replay storage (in-memory / IndexedDB / server-side)? — decisione affidabile post-implementation

### Per Sprint δ

- **D-mech-1**: Pseudo-RNG seed scope per-encounter o per-campaign? (overlap α#1 — risolvi α prima)
- **D-mech-2**: Bravado refill 1 AP fixed o variable per kill type? (overlap α#2)
- **D-mech-3**: Morale threshold MoS-driven o status-driven? (overlap α#4)
- **TKT-09**: ai_intent_distribution priority? (sblocca δ#2 event chains parziale)
- **D4**: Writer budget per content event chains + conviction text? (~30 ink stitches needed)

**Recommendation default** (se master-dd non risponde):

- D-design-1: **static set** (5h, zero animation overhead per primo MVP)
- D-design-2: **300ms** (Civ VI canonical)
- D-design-3: **integrato** (single coherent pressure UI, no fragmentation)
- D-tech-1: **TypeScript plugin scaffold** (matches Node backend, no Lua deps)
- D-tech-2: **in-memory + IndexedDB fallback** (zero server overhead playtest)
- D-mech-1: **per-encounter** (bound, no carry-over fairness issues)
- D-mech-2: **fixed 1 AP** (predictable, MVP)
- D-mech-3: **status-driven** (consistency con bleeding/panic/rage)
- TKT-09: **DEFER** (Sprint δ event chains parziale OK)
- D4: **placeholder text** caveat MVP, writer commission Phase 3 iter

---

## §5 — Allegati prompt agent

### §A — Sprint β agent prompt full

```
Spawn general-purpose agent background.
Branch: feat/sprint-beta-visual-ux-2026-04-28 da origin/main (verify Sprint α merged).
Read context: docs/research/2026-04-27-strategy-games-design-extraction.md §1+§3+§5+§6+§7.
Read shipped: apps/play/src/render.js (extension pattern), style.css (--gris-* + --font-*).

Implementa 5 patterns in 1 PR:
1. apps/play/src/render.js drawTooltip3Tier (NEW ~80 LOC):
   - Hover delay: tier 1 @ 300ms (icon + name), tier 2 @ 800ms (stats panel), tier 3 @ 1500ms (lore + flavor)
   - Stack on cell-hover, dismissed onmove
   - 3 test (delay tiers, dismiss, stack disjoint)

2. style.css + render.js drawTensionGauge (NEW ~60 LOC):
   - Pressure bar gradient cool blue (calm) → warm red (apex)
   - Screen vignette overlay 0.0 (calm) → 0.4 alpha (apex)
   - Hook in render() loop su pressure update
   - 3 test (gradient correct, vignette alpha, transition smooth)

3. apps/play/src/portraitPanel.js (NEW ~100 LOC):
   - Sub-panel in characterPanel
   - Static portrait per MBTI form (16 base) + emoji-overlay per status (panic 😱 / rage 😡 / focused 🎯)
   - 4 test (default render, status overlay swap, multi-status priority, idempotent)

4. apps/play/src/render.js drawBodyPartOverlay (NEW ~80 LOC):
   - On hover enemy unit pre-attack: overlay 3 zone (head 25% / torso 50% / legs 25%)
   - Visual percentages from pseudoRng predict (α dependency!)
   - 3 test (overlay zones, hit % match predict, dismissed on click)

5. style.css + period UI:
   - Status-driven font swap (panic → font-weight bold + color #ff7755 / focused → font-italic / rage → font-stretch expanded)
   - Period typography variants per faction esistenti
   - 2 test (font swap correct, fallback default)

Wire shared: apps/play/src/main.js (+50 LOC max wire panel), api.js (+5 endpoints if needed).

DoD: 15+ test, prettier, no canvas regression, AI baseline 311/311 verde.

Commit message: "feat(visual): Sprint β Visual UX — 5 design patterns (Civ VI + Frostpunk + CK3 + Phoenix Point + JA3)"
```

### §B — Sprint γ agent prompt full

```
Spawn general-purpose agent background.
Branch: feat/sprint-gamma-tech-baseline-2026-04-28 da origin/main.
Read context: docs/research/2026-04-27-strategy-games-tech-extraction.md §1+§5+§6+§7+§8.
Read shipped: tools/py/lint_mutations.py (pattern), apps/backend/services/combat/sgTracker.js (mirror).

Implementa 5 patterns in 1 PR:
1. tools/py/perf_benchmark.py (NEW ~120 LOC):
   - Suite 5 hot path: resolveAttack 1k iter, applyMutation 100 iter, vcScoring snapshot 50 iter, narrativeRoutes drift 100 iter, applyProgressionToUnits 50 iter
   - Output reports/perf/baseline.json con timings p50/p95/p99
   - Makefile target make perf-benchmark
   - 1 smoke test

2. apps/backend/services/perf/dirtyFlagTracker.js (NEW ~80 LOC):
   - Wraps unit/session state mutations con dirty flag
   - traitEffects.js extension: skip recompute se !unit._dirty
   - 3 test (clean → cached, dirty → recompute, multi-unit isolation)

3. data/core/ai/ai_profiles_extended.yaml (NEW additive) + apps/backend/services/ai/aiPersonalityLoader.js (NEW ~60 LOC):
   - Schema: personality_id, trigger_thresholds, intent_weights, signature_actions
   - 3 personality seed (aggressive_bloodthirsty, cautious_defensive, opportunist_flexible)
   - Loader memoized
   - 4 test (load + 3 personalities + fallback default)

4. tools/py/patch_delta_report.py (NEW ~100 LOC):
   - Git diff origin/main..HEAD → markdown report (file changed + LOC delta + commit list)
   - Output reports/patch-delta/sprint-X.md
   - Makefile target make patch-delta-report SPRINT=N
   - 1 smoke test

5. tools/py/bug_replay_export.py (NEW ~80 LOC):
   - Reads session JSON + roundState + seed → reconstructs deterministic replay
   - Output reports/bug-replay/replay-<sid>.json
   - Smoke test (round-trip identical replay verified)

Wire: Makefile (+3 target), apps/backend/services/traitEffects.js (+20 LOC dirty flag).

DoD: 9+ test, prettier, AI baseline 311/311 verde.

Commit message: "feat(tech): Sprint γ Tech Baseline — 5 dev/perf/modding tools (Frostpunk + Total War + CK3 + Old World)"
```

### §C — Sprint δ agent prompt full

```
Spawn general-purpose agent background.
Branch: feat/sprint-delta-meta-systemic-2026-04-28 da origin/main (verify β merged).
Read context: docs/research/2026-04-27-strategy-games-design-extraction.md §2 (CK3) + mechanics §8 (Triangle).
Read shipped: apps/backend/services/metaProgression.js (V3 Mating engine), apps/backend/services/mutations/mutationEngine.js.

Implementa 4 patterns in 1 PR:
1. apps/backend/services/meta/geneEncoder.js (NEW ~120 LOC):
   - encode(lineage_id, applied_mutations[]) → DNA hash chain (deterministic)
   - decode(dna_chain) → metadata (parent lineage, mutation set, generation)
   - Wire in V3 Mating roll (offspring_traits derivation reads DNA chain parent)
   - 5 test (encode determinism, decode round-trip, parent-child chain, mutation diff, malformed defensive)

2. apps/backend/services/meta/eventChainScripting.js (NEW ~150 LOC):
   - Schema YAML data/core/narrative/event_chains/*.yaml (event id, condition, next_event_id)
   - Engine: trigger event → check condition (vcSnapshot + session state) → emit next_event
   - 3 seed event chain (savana_intro_chain, caverna_mystery_chain, deserto_drift_chain)
   - Endpoint POST /api/v1/narrative/event-chain/trigger
   - 6 test

3. apps/backend/services/meta/mutationTreeSwap.js (NEW ~80 LOC):
   - Function swapAppliedMutation(unit, oldMutationId, newMutationId)
   - Validates: newMutation eligible per slot + mp budget; oldMutation reversible
   - Returns updated unit + log event
   - Endpoint POST /api/v1/mutations/swap
   - 5 test (basic swap, slot conflict, mp insufficient, eligibility re-check, idempotent)

4. apps/backend/services/meta/convictionVoting.js (NEW ~120 LOC):
   - Multi-player vote: weight per voter VC axes (T_F or J_P) alignment con choice
   - Outcome aggregato weighted majority
   - Endpoint POST /api/v1/conviction/vote {player_id, choice_id, vc_snapshot}
   - 6 test (single voter, weighted outcome, tie-break, missing axis fallback)

Wire shared: apps/backend/services/metaProgression.js (+30 LOC, gene chain hook in rollMating).

DoD: 22+ test, prettier, AI baseline 311/311 verde.

Commit message: "feat(meta): Sprint δ Meta Systemic — 4 patterns (CK3 DNA + Stellaris event chain + MYZ mutation tree + Triangle conviction)"
```

---

## §6 — Progress tracking

### Phase 1 (α + γ) — ✅ COMPLETE 2026-04-27 sera

| Sprint           |   Status   | PR    | Notes                                                         |
| ---------------- | :--------: | ----- | ------------------------------------------------------------- |
| α Tactical Depth | ✅ SHIPPED | #1959 | 5 combat services + 19 test, P1 def++, P6 🟡++ → 🟢 cand      |
| γ Tech Baseline  | ✅ SHIPPED | #1958 | 3 Python tools + 2 JS services + 15 test + Makefile +3 target |

### Phase 2 (β + δ) — ✅ COMPLETE 2026-04-27 sera

| Sprint          |   Status   | PR    | Notes                                                             |
| --------------- | :--------: | ----- | ----------------------------------------------------------------- |
| β Visual UX     | ✅ SHIPPED | #1960 | 5 visual patterns + 55 test, P3 🟡++, P4 🟢 def, P6 🟢            |
| δ Meta Systemic | ✅ SHIPPED | #1961 | 4 meta patterns (DNA + event chain + swap + conviction) + 34 test |

### Phase 3 — ✅ COMPLETE 2026-04-27 sera

- ✅ Vertical slice doc update (delta sprints α+β+γ+δ) — questo PR
- ✅ Pillar score recompute (5/6 🟢 def + 1/6 🟡++ P3)
- ✅ Memory checkpoint + handoff next session — questo PR
- ✅ Cross-PC sync verify (no work duplicated, 4 PR merged main isolated branches)

**Update status**: agent che completa sprint deve modificare questa tabella + committare nel PR di chiusura.

---

## §7 — Estimated total effort + outcome

| Sprint           |  Effort | Pillar impact                                                   |
| ---------------- | ------: | --------------------------------------------------------------- |
| α Tactical Depth | ~16-22h | P1 def++ → def++ (rinforzo), P6 🟡++ → 🟢 candidato             |
| β Visual UX      |    ~22h | P3 🟡+ → 🟡++, P4 🟢c → 🟢 def, P6 🟡++ → 🟢                    |
| γ Tech Baseline  |    ~16h | dev velocity + perf hot path + modding foundation               |
| δ Meta Systemic  |    ~20h | P2 🟢 def → 🟢 def++ (V3 Mating evolved), P5 🟢c → 🟢 candidato |

**Outcome atteso post tutti 4 sprint**: **5/6 🟢 def + 1/6 🟢 candidato** (P3 unico residuo). Demo-ready.

**Total effort budget**: ~74-80h (2-3 sprint week single-dev autonomous).

---

## §8 — Resume trigger phrase

Per **qualsiasi sessione futura** (qualsiasi PC):

> "leggi docs/planning/2026-04-27-sprint-abgd-coordinated-handoff.md, verifica §6 progress, esegui fase corrente"

Single comando autosufficiente. Doc contiene tutto context necessario per continuare cross-PC.

---

_Doc generato 2026-04-27 sera. Coordinated execution plan per Sprint α/β/γ/δ post strategy research wave (PR #1942-#1946). Cross-PC ready. Update §6 progress mandatory ad ogni sprint shipped._
