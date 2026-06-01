---
title: 'PILLAR-LIVE-STATUS — runtime status canonical (volatile)'
date: 2026-04-28
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-01'
source_of_truth: true
language: it
review_cycle_days: 7
tags: [pillar, status, runtime, live, canonical, volatile, cross-cutting]
related:
  - docs/core/02-PILASTRI.md
  - docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md
  - docs/reports/2026-04-27-situation-report-late.md
  - docs/reports/2026-04-28-canonical-doc-consolidation-plan.md
  - docs/planning/sprint-context-history.md
---

# PILLAR-LIVE-STATUS — runtime status canonical

> **Single SOT runtime** per stato live dei 6 pilastri canonical (P1-P6).
>
> **Pattern**: separazione spec stable + runtime volatile (Opzione B drift audit 2026-04-28).
>
> - **Spec design canonical** (stable): [`docs/core/02-PILASTRI.md`](../core/02-PILASTRI.md) — definizione P1-P6, intent, pattern proven, ref hub. Bump frequency: ad ogni release o ridefinizione design (mese cadence).
> - **Stato runtime live** (volatile, questo doc): score corrente per pillar + delta history + cross-link PR sprint shipped. Bump frequency: ad ogni sprint shipped (sprint cadence).
>
> **Update policy**: ogni sprint che impatta uno o più pillar deve bump questo doc + cita PR. Snapshot mensili archiviati in `docs/reports/PILLAR-LIVE-STATUS-YYYY-MM-archive.md`.

---

## Stato corrente — 2026-06-01 (⚠️ proposta Claude autonomous — pending master-dd ratify)

> ⚠️ **PROPOSTA AUTONOMA CLAUDE — NON ratificata.** Gli stati nella colonna _"Proposto 2026-06-01"_ sono una proposta evidence-based da audit runtime fresh, **NON** un verdetto canonical. L'assegnazione soggettiva finale (glifo + qualifier) è di **master-dd** (`doc_owner`). Ratificare o correggere prima di trattare come canonical.
>
> **Metodo audit** (riconciliazione 3 surface divergenti — SOT 2026-04-28 / HONEST-CHECK 2026-05-07 / CLAUDE v44.3):
>
> - **Engine** (Game backend, questo repo): verificato LIVE su main `1aec1453` — `roundOrchestrator`/`metaProgression`/`mutationEngine`/`coopOrchestrator`/`vcScoring`/`enneaEffects`/`xpBudget`/`sistemaStateStore` tutti `require`-d nelle route (23 ref / 13 file); workflow CI `CI` + `Docs Governance` verdi su HEAD; catalogo specie single-SoT = **75** (verificato `data/core/species/species_catalog.json`).
> - **Surface** (Godot-v2, repo `MasterDD-L34D/Game-Godot-v2`, NON clonato): inferita via `gh` da **60 PR merged maggio** (#320-#380) + QA spot docs. ⚠️ Nessun re-audit surface _completo_ dal `2026-05-07-godot-surface-coverage-audit.md` → surface da ri-verificare master-dd.

|  #  | Pilastro             | Stato 2026-04-28 (prev) | Proposto 2026-06-01 ⚠️    | Dir | Evidenza chiave maggio (PR)                                                          |
| :-: | -------------------- | :---------------------: | :------------------------ | :-: | ----------------------------------------------------------------------------------- |
|  1  | P1 Tattica leggibile |        🟢 def++         | 🟢 confirmed ⚠️           | ↘   | Engine #2463 crit+orphans · #2470/#2474 job-perks · #2481 overcharge · Godot #372 BeastBondReaction live |
|  2  | P2 Evoluzione        |        🟢 def++         | 🟢 def ⚠️                 | ↔   | Engine #2402/#2404 epigenome Lamarck live-loop · #2426/#2431 mating+offspring · Godot #339 succession, #378 Nido ritual |
|  3  | P3 Specie × Job      |          🟡++           | 🟢 candidato (HARD) ⚠️    | ↗   | Catalogo single-SoT 75 (#2490 canon-reconcile) · #2470/#2474 job-expansion perks · #2507 trait remap |
|  4  | P4 Temperamenti      |         🟢 def          | 🟢 confirmed ⚠️           | ↗   | #2465/#2467/#2461 debrief→phone e2e + voices/conviction · Godot #332 Bond DebriefView, #334 HudView |
|  5  | P5 Co-op vs Sistema  |         🟢 cand         | 🟢 confirmed ⚠️           | ↗   | #2371/#2387 Sistema M1 live-loop e2e (Postgres) · #2483 meta-network · Godot CAMP loop, #375-#380 Nido |
|  6  | P6 Fairness          |          🟢             | 🟢 candidato (reinforced) ⚠️ | ↔ | #2362 both hardcore in-band · #2357/#2361 MAP-Elites+Optuna · #2389 N=40 ratify |

**Score proposto** (⚠️ pending master-dd ratify): **6/6 🟢** (zero 🟡/🔴) — P2 🟢 def · P1/P4/P5 🟢 confirmed · P3 🟢 candidato HARD · P6 🟢 candidato reinforced. Engine LIVE verificato per tutti e 6; residuo = **surface caveat** (sotto).

**Caveat — verificati 2026-06-01** (ground-truth `gh` + grep):

- **P1**: surface debt **AZZERATO** — `MissionTimer` GAP-5 RISOLTO (`HudView %MissionTimerLabel` + tick caller `encounter_runtime.gd` + test `test_mission_timer_hud_wire.gd`) **E** `Reinforcement` telegraph GAP-6 RISOLTO (`main.gd:750-755`: `push_battle_feed_event("⚠ Rinforzi Sistema: N unità in arrivo!")` pre-spawn, Into the Breach rule — era nel file sbagliato al primo check). Entrambi i gap 2026-05-07 chiusi → master-dd può restore `def++`.
- **P5**: gap surface TV LobbyView remote room sync **ancora APERTO** (Godot QA `2026-05-20-tv-ws-sync-gap-p3.md`, design-call pendente — nessuna PR di fix post-2026-05-20). REST `/api/lobby/state?code=` **esiste** lato Game (`routes/lobby.js:118`, query-param non `:code`). Gate playtest live userland pendente (TKT-M11B-06 superseded → Phase B social playtest). Engine non impattato → 🟢 confirmed regge.
- **P6**: regression #2513 (06-01, `balanced` −15pp) = **RUMORE N=40, NON regressione** — re-run N=40 indipendente (`balanced`/enc_tutorial_01/max-rounds 40, env nightly identico) = **WR 95.0%, −5.0pp, ✅ Clean** (`check-thresholds` "within tolerance"). Due N=40 a 85%/95% = swing ±10pp atteso (L-069); WR `balanced` reale ≈90-95%, baseline 100% stale → raccomandato recalibrare `BASELINE_WR.balanced` (~90%) in `tools/sim/check-thresholds.js` per stop falsi-positivi nightly (anche #2158 stesso pattern). `xpBudget.auditEncounter` wired ma surface = dev-log (eccezione Gate-5).

---

## Per-pillar dettaglio

### P1 — Tattica leggibile (🟢 def++)

**Stato**: def++ (rinforzato da multipli sprint).

**Componenti shipped**:
- Combat round model (ADR-2026-04-15)
- Reactions first-class (Beast Bond #1971, intercept/overwatch)
- Wait action (#1896)
- StS damage forecast (#1906)
- ITB threat tile + push/pull arrows (#1884, #1907)
- Tactics Ogre AP pip (#1901)
- Cogmind tooltip (#1938) + tooltip 3-tier (#1960)
- Counter HUD Wildfrost (#1932)
- Sprint α tactical depth (#1959): pseudoRng + bravado + pinDown + morale + interruptFire
- Predict_combat hover preview (#1975)
- Objective HUD (#1976)
- Skiv encounter solo vs Pulverator pack (#1982)
- Echolocation visual pulse (#1977)

**Gate finale**: nessuno bloccante. Userland playtest live conferma demo.

**Aggiornamento 2026-06-01** (⚠️ proposta Claude — pending master-dd):

- **Engine reinforced**: #2463 crit system + 4 Gate-5 orphan wired (Wave 2), #2470/#2474 job-expansion perks Cat A/B (on-kill + apex), #2481 Overcharge verb (SG→+1 AP), #2390 morale check on ally death, #2383 cumulativeStateTracker end-of-round, #2460 ecology→combat stat adapter, #2471 terrain wire flake reso deterministico.
- **Surface Godot**: #372 `BeastBondReaction` LIVE nel combat engine Godot, #373 ERMES eco-band→SISTEMA attack scalar, #374 decay buff a turn-end.
- **Surface re-verificata 2026-06-01**: surface debt **AZZERATO** — `MissionTimer` GAP-5 RISOLTO (HudView `%MissionTimerLabel` + tick caller + test) **E** `Reinforcement` telegraph GAP-6 RISOLTO (`main.gd:750-755` pre-spawn `push_battle_feed_event`). Entrambi i gap 2026-05-07 chiusi.
- **Proposto 🟢 confirmed → candidato restore `def++`** (↗): engine reinforced + surface ora pulita (zero debt residuo) → master-dd può restore `def++`.

### P2 — Evoluzione emergente (🟢 def++)

**Stato**: def++ (Spore Moderate FULL stack + lifecycle + ecology).

**Componenti shipped**:
- Form evolution 16 MBTI (M12 Phase A+B+C+D)
- Mating engine V3 (#1879 mating roll + #1693 campaign trigger)
- Spore Moderate S1 schema (#1913): body_slot + derived_ability_id + mp_cost
- Spore S2+S3+S6 runtime (#1915): mutationEngine + slot conflict + bingo
- MP pool tracker (#1916)
- S6 resolver consumption (#1920+#1941): tank/ambush/scout/adapter/alpha
- S5 propagateLineage + lifecycle hooks (#1918+#1924)
- Mutations tab nestHub (#1922)
- Pulverator + ecology schema (#1967)
- Mutation tree swap MYZ (#1961)
- Legacy death mutation choice ritual Skiv G4 (#1984)

**Gate finale**: aspect_token authoring 26 entries (~13h debt visual layer).

**Aggiornamento 2026-06-01** (⚠️ proposta Claude — pending master-dd):

- **Engine**: #2402 epigenome Fase-3 Lamarck-lite (engine + mating wire + speciation + Frammenti), #2404 live-loop per-creature persistence + accumulation + mating hydration + speciation, #2400 hybrid fusion engine, #2399 cross-lineage isolation, #2407 lineage-propagation sim; spore-fase1 reconciliation #2393-#2398 (E2E baseline + complexity-budget + bingo rebalance + 12 derived_ability_id); #2239 mutation 12/12 kinds complete; #2426 mating vote backend + #2431 server-side offspring birth on resolve.
- **Surface Godot**: #339 M2 generational succession (lifecycle attrition + true-death), #354/#356 genetics_api + offspring-ritual unify, #368/#370 mating vote UI phone, #375-#380 Nido hub (TV+phone, offspring ritual N3, N4 recruit/affinity/trust).
- **Proposto 🟢 def** (↔ reinforced): ciclo mating/nido ora con surface completa cross-stack + epigenome live-loop. Debt visual aspect_token resta polish, non bloccante.

### P3 — Specie × Job (🟡++)

**Stato**: 🟡++ (portrait surface + ecology schema).

**Componenti shipped**:
- 84 specie YAML + 7 job canonical
- Progression M13.P3 perks 84 (#1697)
- Lineage tab nestHub (#1911)
- Portrait CK3 INTP-aware (#1960)
- Ecology schema (#1967): trophic_tier + pack_size + competes_with + ...

**Gate per 🟢 def**: morphotype CoQ pool selector (~6h Min) + XCOM points-buy build allocation (~8h).

**Aggiornamento 2026-06-01** (⚠️ proposta Claude — pending master-dd):

- **Catalogo single-SoT**: migrato a SoT canonica unica (Q1 Option A, ADR-2026-05-15) e ora **75 specie** verificate (#2490 Wave3 CANON-RECONCILE unifica 22 creature gameplay nel canon, da 53), trait integrity #2507 (remap 50 codici TR dangling→glossary + catalog guard), lore prose Strato-2 #2508/#2511.
- **Job**: #2470/#2474 job-expansion perks Cat A/B wired (`data/core/jobs_expansion.yaml` LIVE) — identità Job avanza oltre i 7 canonical.
- **Surface**: Godot #357 PhoneTribesView emergent tribes (§22 meta-loop).
- **Proposto 🟢 candidato (HARD)** (↗ da `🟡++`): allinea HONEST-CHECK 2026-05-07 (🟢ⁿ confirmed) + CLAUDE v44.3 (🟢 cand HARD). Gate per `confirmed`/`def`: morphotype pool selector + points-buy build (resta).

### P4 — Temperamenti MBTI/Ennea (🟢 def)

**Stato**: def (engine completo + reveal diegetico Disco-style).

**Componenti shipped**:
- 4 MBTI axes engine (E_I/S_N/T_F/J_P)
- Ennea 9 archetypes scoring
- VC raw metrics + aggregate
- Disco MBTI tag debrief (#1897)
- Drift briefing vcScore→ink (#1932)
- QBN debrief beats (#1979)
- Thought Cabinet UI panel (#1966)
- Thought cabinet resolver wire (#1780)
- Inner voices Disco-style (#1945): 24 sussurri 4 axes × 2 directions × 3 tier
- Skiv thoughts ritual choice UI G3 (#1983)
- Skill check passive→active popup (#1972)
- Conviction insights (#1891)

**Gate per 🟢 def++**: Ennea voices counterpart (gap noted Skiv) + altri sprint narrative reactivity.

**Aggiornamento 2026-06-01** (⚠️ proposta Claude — pending master-dd):

- **Surface chain CHIUSA** (anti-pattern Engine LIVE Surface DEAD risolto per P4): #2465 wire backend debrief payload → debrief panel, #2461 surface-wire personality voices + conviction badges, #2467 **e2e proof** debrief_payload arriva al phone su socket reale; #2277 vcSnapshotToDebriefPayload serializer (parità cross-stack), #2352 ennea-effects readonly diagnostic.
- **Surface Godot**: Bond storytelling #320-#338 — #332 DebriefView Bond Pairs UI (Gate-5 closure), #334 HudView BondStatsLabel, #330 Cronaca Bond filter chip, #321 BattleFeed bond witness, #331 BondTelemetry (preserva contratto M.7).
- **Proposto 🟢 confirmed** (↗): supera il down-revise 2026-05-07 (🟢 cand) — telemetria MBTI/Ennea ora visibile al player end-to-end. Gate per `def++`: counterpart Ennea voices.

### P5 — Co-op vs Sistema (🟢 candidato)

**Stato**: cand (M11 stack live + Objective HUD; gate finale userland playtest).

**Componenti shipped**:
- M11 Phase A WebSocket lobby (#1680)
- M11 Phase B+C frontend lobby + TV view + reconnect (#1682+#1684+#1685+#1686)
- TKT-M11B-04 canvas TV widescreen (#1688)
- AI personality YAML Sprint γ (#1958)
- Event chain scripting Stellaris Sprint δ (#1961)
- Objective HUD top-bar (#1976)
- Skiv encounter solo vs pack (#1982) — base per future co-op pack scenarios

**Gate finale**: TKT-M11B-06 playtest live userland (2-4 amici + ngrok + phone+TV). User-action only. Chiude P5 🟢 def definitivo.

**Aggiornamento 2026-06-01** (⚠️ proposta Claude — pending master-dd):

- **Sistema = antagonista con memoria** (M1 persistent learning): #2364 sistema-state read-only mirror route, #2371 CAMP-2 accumulation bridge (`/coop/combat/end` folds SistemaState), #2387 M1 live-loop validation con Postgres reale e2e, #2388 ADR Sistema Option B implemented, #2374 collision-resistant run.id. Campaign loop: #2469 N2 roster persist + `GET /api/campaign/roster`, #2483 GAP-C meta-network routing MVP, #2449 gated Nido hub phase.
- **Surface Godot**: #342 Sistema-memory client + telegraph + Cronaca echo, CAMP-1/2/3 TV DebriefView mount on combat-end + #350 TV loop re-entry, #375-#380 Nido co-op hub.
- **Proposto 🟢 confirmed** (↗ da `cand`): allinea HONEST-CHECK 2026-05-07. **Caveat (verificato 2026-06-01)**: gap surface TV LobbyView room sync **ancora APERTO** (Godot QA `2026-05-20-tv-ws-sync-gap-p3.md`, design-call pendente, nessun fix post-05-20; REST `/api/lobby/state?code=` esiste lato Game `routes/lobby.js:118`) + gate playtest live userland pendente per `🟢 def`.

### P6 — Fairness (🟢)

**Stato**: 🟢 (pseudoRng + tension gauge + body-part + wounded_perma).

**Componenti shipped**:
- Pathfinder XP budget
- Cautious AI verdict harness
- Hardcore mission timer Long War 2 (M13.P6)
- 5 Tier E quick wins (SPRT + DuckDB + LLM critic, #1923)
- Pseudo-RNG mitigation Phoenix Point (#1959 Sprint α)
- Tension gauge chromatic Frostpunk (#1960 Sprint β)
- Free-aim body-part overlay Phoenix Point (#1960)
- Status `wounded_perma` Skiv encounter (#1982)
- Lint mutation balance (#1939)
- Status engine wave A — passive ancestor producer + 7 status pips frontend (Sprint 13, recovers 297 ancestor batch ROI)

**Gate per 🟢 def**: calibration N=10 hardcore_07 win 30-50% (TKT-M11B-06 dependency).

**Aggiornamento 2026-06-01** (⚠️ proposta Claude — pending master-dd):

- **Calibration toolkit completo**: #2357 MAP-Elites Method D evaluator, #2361 Optuna parallel-internal (4-shard objective), #2360 drift_verify L-072 direction-test prior-baseline, #2358 staging-writer (Optuna/MAP-Elites mai clobber production); #2354 scenario_overrides + hc06 fix + calibration α P0 trio, #2365 revise hc06 band to engine reality + enemy_damage knob, #2359 hc07 3A iter2 in-band, #2362 handoff v44.5 — **entrambi hardcore in-band**; #2381→#2389 candidate trait tunes ratificati N=40 + EV-parity; #2344 Wave 5-7 cluster nerf.
- **Proposto 🟢 candidato (reinforced)** (↔): il gate calibrazione hardcore (hardcore_06/07, #2362) è sostanzialmente chiuso. **Verificato 2026-06-01 (re-run N=40)**: regression #2513 (`balanced` −15pp) = **rumore N=40, NON regressione** — re-run indipendente N=40 (`balanced`/enc_tutorial_01/max-rounds 40, env nightly identico, backend locale :3334) = **WR 95.0%, −5.0pp, ✅ Clean** (`check-thresholds` "within tolerance"). Due N=40 a 85%/95% = swing ±10pp atteso (L-069); WR `balanced` reale ≈90-95%, baseline 100% stale → raccomandato recalibrare `BASELINE_WR.balanced` (~90%) in `tools/sim/check-thresholds.js` (anche #2158 stesso pattern). `xpBudget.auditEncounter` wired ma surface = dev-log (eccezione Gate-5, non gap player). Gate per `🟢 def`: baseline ricalibrato + N=10 hardcore confirm.

---

## Delta history (snapshot temporali)

### 2026-06-01 (reconciliation runtime audit fresh — ⚠️ Claude autonomous proposal, pending master-dd ratify)

**Trigger**: SOT stale — tabella ferma al 2026-04-28, `last_verified` 2026-05-06, `review_cycle_days` 7 (→ >3x oltre il ciclo); ~6 settimane di lavoro maggio (#23xx-#24xx, entrambi i repo) non riflesse. Post governance consolidation **#2504** questo doc è l'**unica SOT** pillar (snapshot inline rimossi da `02-PILASTRI.md` → ora pointer, e da ~12 sezioni sprint-context CLAUDE.md → archiviate in `docs/planning/sprint-context-history.md`). Un 4° auto-generator per lo stato pillar è stato **rifiutato** (over-engineering per 6 valori soggettivi) → fix = riconciliazione manuale + freshness gate #2489.

**Metodo**: audit runtime fresh cross-stack. **Engine** (Game, questo repo) verificato LIVE su main `1aec1453` — `roundOrchestrator`/`metaProgression`/`mutationEngine`/`coopOrchestrator`/`vcScoring`/`enneaEffects`/`xpBudget`/`sistemaStateStore`+`sistemaStateAccumulator` tutti `require`-d nelle route (23 ref/13 file); CI workflow `CI` + `Docs Governance` verdi; catalogo single-SoT 75 specie. **Surface** (Godot-v2, NON clonato) via `gh`: 60 PR merged maggio (#320-#380) + QA spot docs.

**Riconciliazione 3 surface divergenti**:

- **SOT 2026-04-28** (questo doc, pre-update): 5/6 🟢 def + 1/6 🟡++ (P3).
- **HONEST-CHECK 2026-05-07** (`sprint-context-history.md`): down-revise P1→🟡 e P6→🟡 su debt surface (~67% Godot "Engine LIVE Surface DEAD"); γ leftover #204 risaliva P1+P6 a 🟢.
- **CLAUDE v44.3 2026-05-20**: P3 🟢 cand HARD, P4 🟢 cand HARD, P5 🟢 confirmed HARD, P6 🟢 confirmed cand.

Il debt surface 2026-05-07 è stato **in larga parte ripagato** dai 60 PR Godot di maggio (Bond storytelling DebriefView+HudView #332/#334, Sistema M1 telegraph+Cronaca echo, campaign loop CAMP TV re-entry, Nido hub phone+TV, BeastBondReaction live in combat #372). P4 "Engine LIVE Surface DEAD" **chiuso** (debrief payload→phone e2e #2467).

**Da**: 5/6 🟢 def + 1/6 🟡++ (P3) [2026-04-28]
**A (proposto ⚠️)**: 6/6 🟢 — P2 🟢 def · P1/P4/P5 🟢 confirmed · P3 🟢 candidato HARD · P6 🟢 candidato reinforced

**Driver per pillar** (PR chiave): P1 #2463/#2470/#2474/#2481 + Godot #372 · P2 #2402/#2404/#2426/#2431 + Godot #339/#378 · P3 #2490 (catalogo 75)/#2470/#2474/#2507 · P4 #2465/#2467/#2461 + Godot #332/#334 · P5 #2371/#2387/#2483 + Godot CAMP/#375-#380 · P6 #2357/#2361/#2362/#2389.

**Caveat verificati 2026-06-01** (ground-truth `gh`+grep+sim re-run): P1 surface debt **AZZERATO** (GAP-5 MissionTimer + GAP-6 reinforcement telegraph `main.gd:750-755` entrambi risolti) → `def++` restorable; P5 gap TV LobbyView sync **ancora APERTO** (no fix post-05-20, REST `/lobby/state?code=` esiste) + playtest userland pendente; P6 #2513 `balanced` −15pp = **rumore N=40** (re-run N=40 = WR 95.0% ✅ Clean −5pp; baseline 100% stale → recalibrare ~90%).

### 2026-04-28 (post sprint α/β/γ/δ + Skiv personal sprint + cross-PC sprint 1-11)

**Da**: 1/6 🟢 + 3/6 🟢 cand + 2/6 🟡 (snapshot 02-PILASTRI.md storico)
**A**: **5/6 🟢 def + 1/6 🟡++ (P3)**

**Driver**:
- Sprint α tactical depth → P1 reinforcement
- Spore Moderate FULL → P2 def++
- Sprint β visual UX → P4 def + P3 surface
- Sprint γ tech baseline → infra non pillar-direct
- Sprint δ meta systemic → P2 + P5 reinforcement
- Cross-PC sprint 6-11 → tutte le pillar surface
- Skiv personal sprint → P1 + P2 + P4 closure

### 2026-04-26 (post Spore Moderate research + Bundle B)

**Da**: 1/6 🟢 + 3/6 🟢 cand + 2/6 🟡
**A**: 1/6 🟢 + 3/6 🟢 cand + 2/6 🟡 + research roadmap aperta

### 2026-04-20 (audit reality)

**Snapshot iniziale**: 1/6 🟢 (P1) + 3/6 🟢 cand (P2/P3/P6) + 2/6 🟡 (P4/P5).

---

## Cross-link

- **Spec design canonical**: [`docs/core/02-PILASTRI.md`](../core/02-PILASTRI.md)
- **Vertical slice gameplay flow**: [`docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md`](2026-04-27-stato-arte-completo-vertical-slice.md)
- **Situation report cross-PC**: [`docs/reports/2026-04-27-situation-report-late.md`](2026-04-27-situation-report-late.md)
- **Drift audit + consolidation plan**: [`docs/reports/2026-04-28-canonical-doc-consolidation-plan.md`](2026-04-28-canonical-doc-consolidation-plan.md)
- **HONEST-CHECK surface audit 2026-05-07 + sprint-context archive** (riconciliazione 2026-06-01): [`docs/planning/sprint-context-history.md`](../planning/sprint-context-history.md)

---

## Update protocol (mandatory pattern operativo)

Ad ogni sprint che impatta uno o più pillar:

1. **Bump questo doc** `last_verified` + tabella stato + per-pillar dettaglio + delta history
2. **Cita PR** che ha causato delta
3. **NO update `02-PILASTRI.md`** runtime fields — solo questo doc è SOT runtime
4. **Snapshot mensile**: archive in `PILLAR-LIVE-STATUS-YYYY-MM-archive.md` per provenance trail

Pattern preserva separazione spec stable / runtime volatile, evita drift inter-doc rilevato in audit 2026-04-28.

---

_Doc generato 2026-04-28 PR-2 doc consolidation. Single SOT runtime per pillar status. Bump cadence ad ogni sprint shipped._
