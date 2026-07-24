---
title: 'Session Deliverables Ranked — 2026-04-26 cross-PC absorption'
date: 2026-04-26
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-27'
source_of_truth: false
language: it
review_cycle_days: 90
tags: [report, session, deliverables, ranking, cross-pc, anti-pattern]
related:
  - docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md
  - docs/reports/2026-04-27-v3.7-cross-pc-update-synthesis.md
  - docs/reports/2026-04-27-cross-game-tier-matrices-synthesis.md
---

# Session Deliverables Ranked — 2026-04-26 cross-PC absorption

> Ranking dei deliverables della sessione cross-PC 2026-04-26 (32 PR mergiati origin/main #1869→#1901 + 11 museum cards + 75 ticket auto-gen). Criteri: pillar coverage, surface-player visibility, effort/impact ratio. Riferimento di design per scegliere il next sprint con cognizione di causa.
>
> **Recovery note**: questo file è stato rigenerato 2026-04-27 da zero a partire da contenuti dei 4 synthesis docs (originale untracked, mai committato, perso nel reset branch).

---

## §0 — Numeri di sessione

| Counter | Valore |
|---|---:|
| PR mergiati origin/main 2026-04-26/27 | 32 (#1869 → #1901) |
| PR aggiuntivi (waves successivi same-thread) | +17 (#1909, #1914, #1917-#1924) |
| **PR totali sessione** | **49** in ~4 giorni (2026-04-25→27) |
| Doc research/design generati | 11 (5 cross-game tier matrices + 9 deep-analysis + spore + voidling + agent plan + ticket auto-gen) |
| LOC research absorbed | ~5708 |
| Backend services nuovi | 5 (encounterLoader, xpBudget, mbtiInsights, aiProgressMeter, companionStateStore) + 1 Python tool (lint_mutations) |
| Test baseline | ≥355 verde (311 AI + 24 mbtiSurface + 14 nuovi + 6 Python) |
| Museum cards | 11 curate (5 score 5/5 + 6 score 4/5) |
| Ticket auto-generated | 75 |

---

## §1 — Top 10 deliverables ranked

Criteri ranking: **pillar coverage** (quanti pilastri muove) × **surface-player visible** (player vede in 60s gameplay?) × **effort/impact ratio** (LOC vs unblock).

### #1 — `xpBudget.js` runtime engine (PR #1894 + #1899)
**Pillar**: P6 Fairness · **Surface**: log audit (developer surface, future CI gate) · **Effort/Impact**: 188 LOC + wire `/start` · **ROI**: ★★★★★

Pathfinder TTRPG XP budget pattern. Audit warning, non-blocking. Sblocca futuro CI gate per sanity encounter authoring. Smoke proven: catalog 30 trait → 0 violations.

### #2 — `mbtiInsights.js` Disco diegetic debrief (PR #1897)
**Pillar**: P4 MBTI · **Surface**: ✅ player vede badge debrief · **Effort/Impact**: 154 LOC + wire `rewardEconomy.buildDebriefSummary()` · **ROI**: ★★★★★

Disco Elysium pattern. 8 axis insights × 4 + 9 ennea. Stable seed picker (no RNG flake). Primo wire P4 visibile a player dal mese.

### #3 — `aiProgressMeter.js` AI War 5-tier visibility (PR #1898)
**Pillar**: P5 Co-op + P6 Fairness · **Surface**: ✅ `session.ai_progress` exposed (frontend overlay deferred) · **Effort/Impact**: 108 LOC · **ROI**: ★★★★★

AI War: Fleet Command pattern. 5 tier (Calm/Alert/Escalated/Critical/Apex). Backend live, frontend overlay deferred — **classic Engine LIVE Surface ½ DEAD**. Closing TKT-overlay (~2h) sblocca P5+P6 leggibilità.

### #4 — UI threat tile + WCAG AA + AP pip (PR #1884 + #1901)
**Pillar**: P1 Tattica leggibile · **Surface**: ✅ player vede direttamente · **Effort/Impact**: ~6h cumulato · **ROI**: ★★★★★

ITB telegraph + Tactics Ogre AP pip. Chiude regressione threat tile bug. Pillar P1 → 🟢 candidato.

### #5 — `encounterLoader.js` PCG G1 (PR #1873 + #1871 + #1887)
**Pillar**: P5 PCG · **Surface**: ⚠️ opt-in only (1 scenario usa) · **Effort/Impact**: 69 LOC + 9 YAML orphan sblocco · **ROI**: ★★★★

Sblocca 9 YAML orphan + objectiveEvaluator 5 obj types. Cache memoizzata. Schema obj `{ type: 'elimination', ... }`. **Engine LIVE Surface ½ DEAD** — solo 1 scenario opt-in, restano 8 da wire universal initial wave.

### #6 — Spore deep extraction PR #1895 + Sprint Y S5/S6 (#1917/#1918/#1920/#1922/#1924)
**Pillar**: P2 Evoluzione · **Surface**: ✅ MP toast + MP badge characterPanel + Mutations tab nestHub (parziale) · **Effort/Impact**: ~20h shipped · **ROI**: ★★★★

Pattern S5 propagateLineage cross-gen + S6 archetype DR/init/sight resolver. **Pattern S4 visual_swap_it** ancora 0/30 (Voidling lesson) — `lint_mutations.py` shipped #1899 garantisce CI fail finché authoring non completo.

### #7 — Sprint v3 Nido lineage chain + tribe emergent (PR #1874 + #1875 + #1876 + #1879)
**Pillar**: P2 Evoluzione + P3 Specie×Job · **Surface**: ✅ debrief recruit wire + nestHub panel · **Effort/Impact**: 4 PR · **ROI**: ★★★★

Breakthrough decisione design: tribe = lineage emergent (NON layer aggiuntivo). Job runtime resta + tribe emerge da catena Nido→offspring→`lineage_id`. Sblocca decisione progettuale OD-001 (Path A confirmed PR #1921).

### #8 — Trait nerf outlier + economy cleanup (PR #1869 + #1870 + #1872 + #1886 + #1888 + #1889 + #1890)
**Pillar**: P6 Fairness + P5 Co-op + P1 UI · **Surface**: ✅ runtime balance fix · **Effort/Impact**: 7 PR puntuali · **ROI**: ★★★★

Cluster di P0 fix synthesis-driven: ipertrofia/sangue_piroforico nerf, SF/Seed orphan currency, turn limit + status pin, cautious AI retreat fix, coop reconnect snapshot, palette token drift, telemetry CI 95%.

### #9 — Stadio I-X (10 stadi) Skiv canonical + Ancestors Phase 2 IT 191 (PR #1882 + #1881 + #1880)
**Pillar**: P3 Specie×Job + P2 Evoluzione · **Surface**: ✅ Skiv lifecycle visible TV · **Effort/Impact**: 3 PR · **ROI**: ★★★★

10 stadi 2:1 mapping over 5 macro-fasi Skiv. Full IT 191 ancestor labels. Italianized ID base. Marchio Evo-Tactics rename con `_<code_suffix>`. Closes RFC ancestors v07 promise.

### #10 — Cross-game extraction matrix + agent integration (PR #1892 + #1900 + #1885)
**Pillar**: meta · **Surface**: 🚫 doc only · **Effort/Impact**: 10 agent step 1+2 + ticket auto-gen architecture · **ROI**: ★★★

Foundation strategica. 9 deep-analysis reports + 5 tier matrix + agent integration plan. Genera 75 ticket auto. **NON player-facing** ma sblocca tutti i ranking successivi.

### Honourable mentions

- **#1891** Sprint v3.5 biodiversity bundle + 5 reconciliation reports + Conviction surfacing 3-axes radar — chiude V3.5 conviction shipped sprint (P4)
- **#1896** FFT Wait action defer turn — quick-win 3h cosmetic UX (P1)
- **#1893** Voidling Bound visual swap moderate — pattern enforcement live (P2)
- **#1914** A+E residuals SG starter + reward telemetry + QBN debrief wire (P2+P4+P6)
- **#1921** 3 user verdicts codificati (OD-001 Path A + HUD hybrid + CoQ soft bias) — sblocca decision queue
- **#1923** Isaac Anomaly + FF7R critical juice + 3 Python tools (P1+P2+P6)
- **#1919** Sprint C backbone Min bundle Render + CF Pages config — ops deploy backbone

---

## §2 — Anti-pattern dominante "Engine LIVE Surface DEAD"

Diagnosticato post-wave: **~30% delle 61 voci catalogate** (18/61) hanno **runtime built ma surface player dead**. Costo opportunità enorme: investimento già fatto, valore non realizzato.

### 8 engine orphan diagnosticati (sweep effort ~17-32h chiude bundle)

| # | Engine LIVE | Surface DEAD | Effort fix |
|---:|---|---|---:|
| 1 | `predictCombat()` N=1000 simulator | Auto-battle button UI mai aggiunto | 3h |
| 2 | Tactics Ogre HUD canonical doc spec | HP floating render.js HUD non implementato | 5-7h |
| 3 | Spore part-pack design doc | `drawMutationDots` overlay mai disegnato | 3h (+ 15h authoring) |
| 4 | Mating engine 469 LOC + 7 endpoint | `gene_slots → lifecycle` wire mancante | 5h |
| 5 | `objectiveEvaluator.js` 5 obj types | encounter scenarios usano solo `elimination` | 3h |
| 6 | `biomeSpawnBias.js` initial wave function | wired SOLO opt-in (1 scenario), no universal initial wave | 2h |
| 7 | QBN engine 17 events | session debrief integration mai chiamata | 3h (✅ partial #1914) |
| 8 | Thought Cabinet 18 thoughts spec | `reveal_text_it` authoring + UI panel mai shipped | 8h |

**Bundle cumulato**: ~32h se incluso authoring. ~17h escluso. **Single biggest strategic ROI** — recupera investimenti già fatti senza scrivere nuovo engine.

### Regola adottata 2026-04-27: Gate 5 — Engine wired (DoD)

Vedi `CLAUDE.md` §"Gate 5". Ogni nuovo engine/service backend DEVE avere wire frontend (UI/HUD/CLI/log player-visible) **PRIMA di essere ship-ready**. Solo backend = WIP, **non production-ready**. Eccezioni esplicite per audit/telemetry/refactor/migration.

---

## §3 — Pillar coverage delta (pre/post sessione)

| # | Pilastro | Pre-wave (synthesis 2026-04-26) | Post-wave (2026-04-27) | Delta drivers |
|---|---|---|---|---|
| **P1** | Tattica leggibile | 🟡 (threat tile bug) | **🟢 candidato** | threat tile + WCAG + AP pip + Wait action shipped |
| **P2** | Evoluzione | 🟡++ (V3 mating + 68 status no-op) | 🟡++ stable | Spore extraction doc + Voidling adoption ma runtime mutation engine ancora 0 |
| **P3** | Specie×Job | 🟡 (44/45 species lifecycle YAML missing) | 🟡 stable | nessun fix mirato — gap freddo persistente |
| **P4** | MBTI/Ennea | 🟡 (Stoico unreachable, T_F gaps) | 🟡+ | Disco MBTI tag debrief shipped, ma `tilt` window EMA + `reveal_text_it` ancora pending |
| **P5** | Co-op | 🟢 candidato | **🟢 candidato** | reconnect snapshot shipped (#1888) — playtest TKT-M11B-06 unico bloccante |
| **P6** | Fairness | 🟡 (cautious broken, gravita dead) | **🟡+** | trait nerf + cautious AI fix + Pathfinder XP + AI Progress meter shipped |

**Score post-wave**: 0/6 🟢 + **2/6 🟢 candidato** (P1+P5) + **3/6 🟡+** (P2/P4/P6) + 1/6 🟡 (P3).

**Trend**: regressioni P1/P6 chiuse, P3 ancora il vero gap a freddo (44/45 species lifecycle YAML stub assenti).

---

## §4 — Quick-win residual identificati (<5h ciascuno)

Cumulati cross-tier post-extraction profonda. Vedi `2026-04-27-stato-arte-completo-vertical-slice.md §B` per l'inventario completo.

### Tier S quick-wins (~16h)
- 🔴 Wesnoth time-of-day enum + formula resolveAttack — **3h**
- 🔴 FFT CT bar visuale charge time HUD — **3-4h**
- 🔴 FFT Facing crit 3-zone (front/side/rear, +50%/+25%) — **4h**
- 🔴 Tactics Ogre Auto-battle quick simulation button (su `predict_combat()` esistente) — **3h**
- 🔴 AncientBeast Beast Bond reaction trigger adjacency — **5h**
- 🔴 AI War Defender's advantage modifier (+50% AI defensive vs player aggressive) — **3h**

### Tier A quick-wins (~16h)
- 🟡 Subnautica habitat lifecycle 5-stage stub gen 44/45 species — **3h**
- 🟡 StS damage forecast inline number su intent icon — **4h** (partial intent SIS shipped)
- 🟢 ITB push/pull arrows + kill probability badge — **3h** (partial)
- 🔵 MHS gene grid 3×3 + bingo set bonus (Spore S6 dependency) — **4h**
- 🔵 Spelunky 4×4 grid PCG — **4h**

### Tier B quick-wins (~13h)
- **Cogmind tooltip stratificati base+expand** — 4-6h (alta priorità)
- **Isaac Anomaly Trait pool raro 1/20** — 4-6h (✅ partial #1923)
- **FF7R critical hit juice (zoom + slow-mo)** — 3-5h (✅ partial #1923)

### Tier E quick-wins (~10-15h)
- **Stockfish SPRT calibration early-stop** — 3-4h
- **LLM-as-critic balance loop auto** — 4-6h
- **DuckDB JSONL telemetry pipeline** — 3-5h

### Surface-DEAD sweep quick-wins (~17h escluso authoring)
Vedi §2. predictCombat auto-battle (3h) + biomeSpawnBias universal wave (2h) + QBN debrief (3h, partial) + objectiveEvaluator universal (3h) + Mating gene_slots wire (5h) + Thought Cabinet UI scaffold senza authoring (1h scaffold).

### Totali

| Bucket | Quick-wins (≤5h) | Effort cumulato |
|---|---:|---:|
| Tier S residuo | 6 pattern | ~22h |
| Tier A residuo | 5 pattern | ~18h |
| Tier B residuo | 3 pattern | ~14h |
| Tier E residuo | 3 pattern | ~10h |
| Surface-DEAD sweep (escluso authoring) | 6 pattern | ~17h |
| **TOTALE QUICK-WINS** | **~23 pattern** | **~64-81h** = ~2 settimane sprint single-dev |

**Full residual ~509h** (73 pattern catalogati cross-tier, vedi `stato-arte-completo §B.5`):
- Tier S (13 giochi): 38 pattern, ~190h
- Tier A (11 giochi): 11 pattern, ~54h
- Tier B (15 giochi): 11 pattern (4 archive), ~115h
- Tier E (20 voci tech): 13 pattern (4 blocked), ~150h

---

## §5 — Decisioni pending che bloccano next sprint

Estratte da `stato-arte-completo §E` + `OPEN_DECISIONS.md`. **6 decisioni richiedono master-dd verdict** prima di sequenziare.

| # | Decisione | Default attuale | Bloccante per |
|---:|---|---|---|
| 1 | **OD-001 Mating UI Path** A/B/C verdict | Path A confirmed (#1921) | gene_slots lifecycle wire (~5h) — SBLOCCATA |
| 2 | **Spore Moderate path adoption** (~21h sprint) | non avviato | P2 → 🟢 candidato — chiude Pattern 6 Voidling |
| 3 | **Surface-DEAD sweep scope** (full 32h vs minimal 17h) | non scelto | recupero ROI 8 engine orphan |
| 4 | **TKT-M11B-06 playtest live** (userland 2-4h) | unico bloccante P5 → 🟢 def | Co-op pillar verde definitivo |
| 5 | **Status engine extension** (~6-8h, wire 68 ancestor consumers) | non avviato | P6 → 🟢 candidato + recupera 297 ancestor batch ROI |
| 6 | **Polish hour bundle** (~4h, 8 micro-fix cosmetici §8 v3.7) | non avviato | clean-up totale, no regressioni |

### 6 opzioni sequenziamento next sprint (rank by ROI)

| Opzione | Scope | Effort | Sblocco principale |
|---|---|---:|---|
| **A** Polish hour batch | 8 micro-fix cosmetici | ~4h | clean-up totale, no regressioni |
| **B** Tactics Ogre HUD bundle | HP floating + StS damage forecast + faction shape + HP critico pulse + ITB push arrows | ~12-14h | **P1 → 🟢 def + Surface-DEAD #1+#2 chiusi** |
| **C** Spore Moderate path | S1 schema + S2 applyMutation + S3 MP pool + S6 bingo + visual swap authoring 30 mutation | ~21h | **P2 → 🟢 candidato** + chiude Pattern 6 Voidling |
| **D** Status engine extension | Wire 68 silent ancestor consumers (linked/fed/attuned/sensed/telepatic_link/frenzy/healing) | ~6-8h | **P6 → 🟢 candidato** + recupera 297 ancestor batch ROI |
| **E** Surface-DEAD sweep (anti-pattern killer) | 8 engine orphan wire (vedi §2) | ~17-32h | **P1+P2+P4 → 🟢 strategico** |
| **F** Userland TKT-M11B-06 playtest | 2-4 amici live + ngrok + tunnel | ~2-4h userland | **P5 → 🟢 def** |

### Path raccomandati

#### Path "Polish + Vertical Slice Demo Ready" (impact/effort max)
**A + D + F** in parallelo (~10-12h work + userland playtest)
- **Outcome**: 3 pillar 🟢 def (P1/P5/P6) + 1 candidato (P2). Demo-ready.

#### Path "P2 closure" (long-term value max)
**C + D** sequenziali (~30h)
- **Outcome**: P2 + P6 → 🟢 candidato. Spore engine fondante per M14+.

#### Path "Anti-pattern killer" (strategic ROI max)
**E** standalone (~25-35h)
- **Outcome**: 3 pillar movimento + 8 ROI orphan recuperati. **Massimo strategic ROI** ma rischio context overload.

---

## §6 — Lessons learned & methodology

### 6.1 — "Engine LIVE Surface DEAD" anti-pattern → Gate 5 DoD permanente

Diagnosi post-wave portò a aggiungere **Gate 5 — Engine wired** in `CLAUDE.md`. Regola: ogni nuovo engine backend DEVE avere wire frontend prima di essere ship-ready. Verifica chiave: _"un player vede questa feature in 60s di gameplay?"_ — se NO senza justification → blocca merge.

### 6.2 — Cross-PC absorption pattern (multi-PC race condition)

8 PR altro PC merged interleaved. Mio PR #1816 redundant chiuso post-detection via `gh pr list --state merged`. Lesson: probe `gh pr list --state merged --limit 30` prima di aprire nuovo PR su scope già touched in last 24h.

### 6.3 — Museum-first protocol validato

`creature-aspect-illuminator` agent ha letto MUSEUM.md spontaneously, consultato card M-005 magnetic_rift, identificato 6 GAP concreti, saved 10-15min repo dig (vedi `docs/qa/2026-04-25-museum-validation.md`).

### 6.4 — Verify Before Claim Done (anti-rescue policy)

Friction `/insights` 2026-04-25: 25 buggy_code incidents (top friction). Pattern dominante: first-pass ships con bug, rescue pass dopo. Skill `/verify-done` orchestrates: run tests + diff vs intent + smoke probe live. Adottato come gate pre-merge.

---

## §7 — File output / artefatti

- **Doc canonical post-sessione**:
  - [`docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md`](2026-04-27-stato-arte-completo-vertical-slice.md) — §A inventario decisioni, §B 73 pattern residui, §C vertical slice 8-fasi, §E 6 decisioni richieste
  - [`docs/reports/2026-04-27-v3.7-cross-pc-update-synthesis.md`](2026-04-27-v3.7-cross-pc-update-synthesis.md) — 6 opzioni action plan
  - [`docs/reports/2026-04-27-cross-game-tier-matrices-synthesis.md`](2026-04-27-cross-game-tier-matrices-synthesis.md) — top 15 ROI ranked
  - [`docs/reports/2026-04-27-deep-analysis-residual-gaps-synthesis.md`](2026-04-27-deep-analysis-residual-gaps-synthesis.md) — 9 domain residual P0/P1/P2

- **Reconciliation reports (questa thread)**:
  - `2026-04-27-identity-dimensions-reconciliation.md`
  - `2026-04-27-identity-stack-reconciliation.md`
  - `2026-04-27-v3-vs-v3.2-reconciliation.md`
  - `2026-04-27-vc-axes-reconciliation.md`
  - `2026-04-27-vertical-slice-roadmap-v3.2.md`
  - `2026-04-27-5axes-ui-mapping-research.md`
  - `2026-04-27-skiv-portable-companion-research-summary.md`
  - `2026-04-27-stat-hybrid-tamagotchi-companion-research.md`
  - `2026-04-27-stadio-phase-A-summary.md`
  - `2026-04-27-ancestors-phase-2-apply-summary.md`
  - `2026-04-27-ancestors-style-guide-audit.md`

- **Backend services nuovi shipped**:
  - `apps/backend/services/combat/encounterLoader.js` (69 LOC)
  - `apps/backend/services/balance/xpBudget.js` (188 LOC)
  - `apps/backend/services/narrative/mbtiInsights.js` (154 LOC)
  - `apps/backend/services/ai/aiProgressMeter.js` (108 LOC)
  - `apps/backend/services/skiv/companionStateStore.js` (NEW)
  - `tools/py/lint_mutations.py` (101 LOC)
  - Migration `0006_skiv_companion_state` (Prisma)

---

## §8 — Anti-pattern dominante cross-game (executive summary)

> **"Engine LIVE Surface DEAD" è la singola voce a maggior impatto strategico residuo del progetto.**

~30% (18/61) delle voci catalogate ha runtime built ma surface player dead. Costo opportunità: 4 mesi mating engine 469 LOC zero frontend, OD-001 decision blocking. Spore 401 LOC research zero authoring. QBN engine 17 events zero session calls. Tactics Ogre HUD canonical doc senza implementation.

**Decision**: adottare **Gate 5 DoD permanente** (CLAUDE.md §"Gate 5") + **Surface-DEAD sweep next sprint** (Opzione E ~17-32h) come strategic ROI massimo. Recupera investimenti già fatti senza scrivere nuovo engine.

**Anti-pattern check obbligatorio** in PR review: _"un player vede questa feature in 60s di gameplay?"_. Se risposta NO senza justification → blocca merge.

---

## §9 — Next session entry-point

Vedi `docs/planning/2026-04-26-vision-gap-sprint-handoff.md` (V1-V7) + `2026-04-27-stato-arte-completo-vertical-slice.md §C.4` per opzioni sequenziamento.

**Decisione user pending**: quale path attivare?
- **A** polish demo (~10-12h)
- **C** P2 closure (~30h)
- **E** surface sweep (~25-35h)
