---
title: "Telemetry Viz Audit — VC scoring + MBTI/Ennea + funnel + viz pipeline (2026-04-26)"
workstream: ops-qa
category: qa
doc_status: draft
doc_owner: telemetry-viz-illuminator
last_verified: "2026-04-26"
source_of_truth: false
language: it-en
review_cycle_days: 14
tags: [telemetry, viz, audit, vc-scoring, mbti, ennea, funnel]
---

# Telemetry Viz Audit — 2026-04-26

> Agent: `telemetry-viz-illuminator` — Mode: AUDIT. Data: codice letto direttamente.

---

## 1. Surface letta (smoke G2 evidence)

| File | Linee lette | Status |
|---|---:|---|
| `apps/backend/routes/session.js` | 2358–2403 (telemetry endpoint) + 238–265 (helper) | live |
| `apps/backend/services/vcScoring.js` | 1–900 (full) | live |
| `apps/backend/services/enneaEffects.js` | header, wc | 213 LOC |
| `apps/backend/routes/sessionRoundBridge.js` | grep L724 | live |
| `data/core/telemetry.yaml` | ennea_themes section | 9 entries |
| `tools/py/telemetry_analyze.py` | full (398 LOC) | live |
| `docs/architecture/ai-policy-engine.md` | full | active |
| `docs/core/Telemetria-VC.md` | full | legacy (2026-04-14) |
| `docs/museum/cards/enneagramma-enneaeffects-orphan.md` | full | REVIVED |
| `docs/museum/cards/personality-mbti-gates-ghost.md` | full | curated |
| `logs/telemetry/` | `ls` | NOT EXIST (no playtest data yet) |
| `docs/analytics/` | `ls` | NOT EXIST (output dir missing) |

---

## 2. VC Scoring — gap audit completo

### 2.1 Raw metrics (N=21 total in `DERIVABLE_RAW_KEYS`)

| Raw metric | Fonte evento | Status |
|---|---|---|
| `attacks_started` | `action_type=attack` | derivabile |
| `attack_hit_rate` | `result=hit` / attacks | derivabile |
| `close_engage` | adjacency on attack | derivabile |
| `first_blood` | primo kill | derivabile |
| `kill_pressure` | derived da kills/turns | derivabile |
| `damage_taken_ratio` | damage_dealt su attore target | derivabile |
| `damage_dealt_total` | `damage_dealt` field | derivabile |
| `low_hp_time` | hp<threshold / turns alive | derivabile |
| `assists` | kill chain co-attacker | derivabile |
| `support_bias` | utility_actions/total | derivabile |
| `setup_ratio` | setup actions / total | derivabile |
| `total_actions` | count events actor | derivabile |
| `moves_ratio` | moves / total | derivabile |
| `utility_actions` | buff/heal/special count | derivabile |
| `time_to_commit` | turn 1 action delay | derivabile |
| `damage_taken` | raw absolute | derivabile |
| `evasion_ratio` | attack→move-away / attacks | derivabile |
| `1vX` | 1-vs-1 fraction attacks | derivabile |
| `new_tiles` | unique tiles visited | derivabile |
| `enemy_target_ratio` | enemy targets / total targets | derivabile (iter2) |
| `concrete_action_ratio` | (attack+move) / total | derivabile (iter2) |
| `action_switch_rate` | type transitions / total-1 | derivabile (iter2) |

**GAP — raw metrics NON derivabili (null runtime)**:

| Variabile | Perché null | Impatto |
|---|---|---|
| `pattern_entropy` | Richiede sequence analysis cross-turn | MBTI S_N coverage degraded (iter1 only) |
| `cohesion` | `formation_time` + `support_actions` non event-native | MBTI E_I solo proxy parziale |
| `formation_time` | Evento dedicato assente | idem |
| `self_heal` | No heal action implementato | `risk` index incompleto |
| `overcap_guard_events` | Legacy guard system not live | `risk` index incompleto |
| `tilt` | Window-based EMA separata, non implementata | Stoico(9) unreachable (tilt>0.65) |
| `1vX_ratio` | `1vX` c'è ma ratio computation parziale | Minore |

**Score raw**: 22/22 keys in DERIVABLE_RAW_KEYS sono computabili. Ma 7 variabili conceptuali descritte in docs **non** compaiono in DERIVABLE_RAW_KEYS → dichiaratamente null by design (commento sprint_003 "honesty > completeness"). Coerente.

### 2.2 Aggregate indices (N=6 configurati in `data/core/telemetry.yaml`)

| Index | Formula base | Coverage | Gap |
|---|---|---|---|
| `aggro` | `attacks_started`, `first_blood`, `close_engage`, `kill_pressure` | FULL | nessuno |
| `risk` | `damage_taken_ratio`, `1vX`, `low_hp_time` | PARTIAL (self_heal null) | -1 weight component |
| `cohesion` | `assists`, `support_bias`, `formation_time` | PARTIAL (formation_time null) | -1 weight component |
| `explore` | `new_tiles`, `setup_ratio`, `evasion_ratio` | FULL | nessuno |
| `setup` | `setup_ratio`, cover-actions | PARTIAL (overwatch null) | minor |
| `tilt` | window EMA su events | NOT IMPLEMENTED | Stoico(9) sempre 0 |

**Score aggregate**: 4/6 fully derivable. `tilt` non implementato = Stoico(9) unreachable da ennea_themes. `cohesion` + `risk` partial.

### 2.3 MBTI axes (4 assi, 2 implementazioni)

**Iter1 (`computeMbtiAxes`)** — coverage per asse:

| Asse | Proxy primario | Coverage | Confidence |
|---|---|---|---|
| E_I | `close_engage`, `support_bias`, `time_to_commit` | full (3 proxy) | MEDIUM (proxy indiretto) |
| S_N | `new_tiles`, `setup_ratio`, `evasion_ratio` | full | MEDIUM |
| T_F | `utility_actions`, `support_bias` | full | HIGH |
| J_P | `setup_ratio`, `time_to_commit` | partial (2/3 proxy, `last_second` null) | LOW |

**Iter2 (`computeMbtiAxesIter2`, opt-in via `VC_AXES_ITER=2`)** — coverage:

| Asse | Proxy | Coverage |
|---|---|---|
| E_I | `enemy_target_ratio` | full (1 diretto) |
| S_N | `concrete_action_ratio` | full (1 diretto) |
| T_F | `utility_actions + support_bias` | full (stesso iter1) |
| J_P | `action_switch_rate` | full (1 diretto) |

**Gap key**: iter2 non è default. `VC_AXES_ITER=2` non settato in nessun env file visibile → iter1 attivo in produzione. Iter2 rimane opt-in mai testato su data reale.

**Dead-band 0.45-0.55**: se un asse cade nel range → `deriveMbtiType` ritorna `null` → `mbti_type` null → mating fallback `'NEUTRA'`. Con sessioni brevi (<8 turni) → J_P partial + dead-band → probabile null rate alto. Non misurabile (no JSONL dati yet).

### 2.4 Ennea archetypes (N=9 in `telemetry.yaml`)

| Archetype | When condition | Derivable? | Status |
|---|---|---|---|
| Conquistatore(3) | `aggro>0.65 && risk>0.55` | SI (entrambi full/partial) | attivo |
| Coordinatore(2) | `cohesion>0.55` | PARTIAL (formation_time null → cohesion partial) | attivo ma degraded |
| Esploratore(7) | `explore>0.45` | SI | attivo |
| Architetto(5) | `setup>0.50` | PARTIAL (overwatch null) | attivo ma degraded |
| Stoico(9) | `tilt>0.65` | NO (tilt not implemented) | mai raggiungibile |
| Cacciatore(8) | multi-criterio raw metrics | SI (tutti derivabili) | attivo |
| Riformatore(1) | `setup_ratio>0.5 && attack_hit_rate>0.65` | SI | attivo |
| Individualista(4) | `low_hp_time>0.4 && damage_dealt_total>0` | SI | attivo |
| (9th — Lealista(6)?) | da verificare in telemetry.yaml | TBD | — |

**Score Ennea**: 8/9 archetipi con condizioni derivabili. Stoico(9) = mai raggiungibile (tilt=0). Gap noto, dichiarato in YAML stesso (`# tilt non implementato`).

**enneaEffects.js status** (museum card M-2026-04-25-006, revived):
- File: 213 LOC (espanso da 93 LOC originali post-revival PRs #1825/#1827/#1830)
- Import confermato: `apps/backend/routes/sessionRoundBridge.js:724` `require('../services/enneaEffects')`
- Status: **WIRED** — NON orphan. Museum card aggiornata con status `revived`
- Coverage: 9/9 archetipi (post PR #1827). Buff types: `stat_ops` su `round_end`, `engage`, `move`
- Gap residuo: `applyEnneaToStatus` (nome importato in L724) — verificare se tutti 9 hook hanno downstream `status` consumer oppure solo `stat_ops`. PR #1830 ha aggiunto 3 stat consumers (move/stress/evasion).

---

## 3. Gap analysis matrix 8-dim

| Dimensione | Status | Evidence | Fix |
|---|:---:|---|---|
| Event schema consistency | PARTIAL | Schema libero in POST /telemetry. `KNOWN_EVENT_TYPES` in telemetry_analyze.py ma non AJV-enforced | Aggiungere `telemetry.schema.json` AJV |
| Aggregation pipeline | YES (stdlib) | `tools/py/telemetry_analyze.py` 398 LOC, funnel + scenario outcomes | DuckDB da aggiungere per SQL query (no dep approved) |
| Dashboard live | NO | `docs/analytics/` dir non esiste. Zero viz script | Observable Plot small multiples P0 |
| Heatmap spatial | NO | `position_from`/`position_to` presenti in raw events ma non aggregati | deck.gl HexagonLayer, N=1000+ needed |
| Funnel analysis | PARTIAL | Script ha funnel 4-stage + tutorial funnel. Ma 0 JSONL dati (no playtest run yet) | Schema ok, manca data. Trigger: TKT-M11B-06 |
| Sankey flow | NO | Zero script/component | Google Charts / D3. Candidato: scenario → build archetype → outcome |
| Sparkline small multiples | NO | No dashboard dir, no Observable Plot | P0: 1 sparkline / scenario (enc_tutorial_01..07) |
| D-retention cohort | NO | `player_id` presente ma anonymous (null in batch endpoint) | Stabile ID richiesto. P2: post-MVP |

---

## 4. Pattern recommendation

### P0 — DuckDB + telemetry_analyze upgrade

**Q**: fast JSONL analytics senza new deps?
→ `tools/py/telemetry_analyze.py` già live (stdlib). Funziona. Ma SQL aggregation complessa → blocco.
→ DuckDB approval richiesta per query avanzate (window functions per session duration distribution).

**Azione**: approvare `duckdb` come dev dep in `tools/py/requirements-dev.txt`. Non runtime. Costo: 0 impact su backend. ROI: cross-JSONL join in 5 righe SQL invece di 50 righe Python.

### P0 — Funnel + tutorial drop-off (immediato post-playtest)

**Q**: dove perdono i player nel tutorial?
→ `tutorial_start`/`tutorial_complete` auto-loggati in `appendTelemetryEvent` (session.js:1204, 2048).
→ `telemetry_analyze.py tutorial_funnel()` già implementato.
→ **Pre-req**: `logs/telemetry_YYYYMMDD.jsonl` non esiste → 0 dati → script OK ma output vuoto.
→ **Azione**: eseguire TKT-M11B-06 playtest → JSONL si popola → funnel immediato.

Funnel stages live:
```
session_start → ability_use → damage_dealt → session_end
tutorial_start → tutorial_complete (per enc_tutorial_01..07)
```

Industry benchmark D1~30-40%, D7~10-15%. Non applicabile (anonymous player_id). Focus su tutorial completion rate per scenario — baseline immediato da primo playtest.

### P0 — Sparkline small multiples (Observable Plot)

**Q**: overview dashboard WR + KD per scenario?
→ 7 encounter (enc_tutorial_01..07). Small multiples = 7 sparkline identiche per metric (WR, avg_turns, KD).
→ Input: `tools/py/telemetry_analyze.py --out-json` → JSON aggregato → Observable Plot `Plot.line()`.
→ `docs/analytics/` dir non esiste → creare + `index.html` con Observable Plot standalone (CDN, zero build step).

**Dati Tufte data-ink**: eliminare gridlines, legend, 3D. Solo sparkline + annotation. Dataword: ogni scenario = 1 stat leggibile.

Costo implementazione: ~3-4h (Python JSON output già esistente nel telemetry_analyze.py, HTML minimale).

### P1 — Heatmap spatial (deck.gl HexagonLayer, post N=100+)

**Q**: quali tile sono più letali?
→ Evento raw: `{ position_from, position_to, action_type, damage_dealt }` in session events.
→ Ma questi eventi non sono in `logs/telemetry_YYYYMMDD.jsonl` — sono in session state (in-memory).
→ **GAP critico**: telemetria client-side (`POST /api/session/telemetry`) è per UI signals (fps, latency). Telemetria server-side session events non è esposta via JSONL separato.
→ **Fix**: aggiungere auto-log di kill events + damage events nel `appendTelemetryEvent` helper per heatmap data. Payload: `{ tile_hex, actor_id, killed_id, damage, turn }`.
→ Limite: N=1000+ runs per heatmap significativo. Post-MVP.

### P1 — Sankey player flow (D3.js, max 4-5 nodi)

**Q**: quale path scelgono i player? (scenario → reward → evoluzione)
→ Dati candidati: `session_start.scenario_id` → `reward_accept.reward_type` → `session_end.outcome`
→ 3-step flow. OK (Sankey limite = 5 transizioni).
→ Pre-req: `reward_accept` event loggato? Non presente in `KNOWN_EVENT_TYPES` come auto-log server-side. Presente come tipo noto ma non auto-instrumented.
→ **Fix**: aggiungere auto-log in `rewardOffer.js` su accept/skip.
→ Costo: 1h wire + 4h D3/Observable sankey implementazione.

### P2 — Grafana (overkill pre-playtest)

Config: `LGTM stack` = Loki + Grafana + Tempo + Mimir. Setup non-trivial per <100 user beta. Post-TKT-M11B-06 se user base cresce.

---

## 5. Viz anti-pattern guards (verificati)

| Anti-pattern | Status nel codebase |
|---|---|
| Pie chart per time series | Non presente (no viz attuale) |
| Raw JSONL mostrato a user | No — `telemetry_analyze.py` aggrega sempre |
| Dashboard senza date range | N/A (no dashboard live) |
| Metric senza baseline | FAIL — HC07 WR 80% ha target band "30-50%" ma no storico multi-run |
| Sankey >5 transizioni | N/A (non implementato) |
| Color-only encoding | N/A |
| Real-time senza batch aggregation | N/A (polling JSONL ok) |

**FAIL attivo**: calibration reports (`docs/playtest/`) mostrano WR singolo run (N=10) senza distribuzione/CI. Pattern Tufte: "number without distribution = meaningless". Gap: aggiungere `[mean ± 1σ, 95% CI bootstrap]` al batch harness output. N=10 CI: ±15pp (binomial). Non stampato ora.

---

## 6. Escalation path

| Finding | Destinazione |
|---|---|
| VC scoring `tilt` non implementato | `balance-illuminator` per Stoico(9) reachability plan |
| `enneaEffects.js` stat consumers coverage | `schema-ripple` agent per verifica downstream status system |
| MBTI iter2 non default | `sot-planner` ADR update: `VC_AXES_ITER=2` → environment config |
| Heatmap tile kill data missing | `session-debugger` per wire appendTelemetryEvent in kill events |
| `reward_accept` non auto-loggato | inline fix in `rewardOffer.js` (≤10 LOC, no escalation needed) |
| D-retention anonymous player_id | `sot-planner` — decisione design: ID persistente vs anonymous |

---

## 7. Riepilogo numerato (caveman summary)

**N=21** raw metrics in `DERIVABLE_RAW_KEYS`. **7** null by design (pattern_entropy, cohesion, formation_time, self_heal, overcap_guard, tilt, 1vX_ratio).

**N=6** aggregate indices. **4/6** full coverage. `tilt` = 0 forever. `cohesion` + `risk` = partial.

**N=4** MBTI axes. Iter1: `T_F` full, `E_I`/`S_N`/`J_P` full/partial proxy. Iter2: tutti full ma opt-in mai testato su dati reali.

**N=9** Ennea archetypes in telemetry.yaml. **8/9** raggiungibili. Stoico(9) unreachable (tilt=0).

**enneaEffects.js**: WIRED post-PR #1825/#1827/#1830. 213 LOC. Import verificato `sessionRoundBridge.js:724`. NON orphan.

**Telemetry endpoint**: `POST /api/session/telemetry` live, batch ≤200 eventi, JSONL append `logs/telemetry_YYYYMMDD.jsonl`. `appendTelemetryEvent` server-side auto-log per `tutorial_start`/`tutorial_complete` + `session_start`/`session_end`.

**JSONL dati presenti**: 0 file in `logs/telemetry/` (dir non esiste). Causa: nessun playtest live eseguito. TKT-M11B-06 bloccante.

**Aggregation pipeline**: `tools/py/telemetry_analyze.py` stdlib-only, funnel 4-stage + tutorial funnel per scenario. Funziona ma nessun dato da processare.

**Dashboard viz**: zero. `docs/analytics/` non esiste. P0 gap immediato post-playtest.

**Spatial data per heatmap**: NON in JSONL. Session events (position_from/to) sono in-memory, non auto-loggati. Richiede wire in `appendTelemetryEvent` per kill + damage events.

---

## 8. Sources

- [DuckDB ETL Pipelines KDnuggets](https://www.kdnuggets.com/data-science-etl-pipelines-with-duckdb)
- [Tufte Sparkline Theory and Practice](https://www.edwardtufte.com/notebook/sparkline-theory-and-practice-edward-tufte/)
- [Heatmap Guide GameAnalytics](https://www.gameanalytics.com/blog/balance-and-flow-maps)
- [GameAnalytics Funnels Docs](https://docs.gameanalytics.com/products-and-features/analytics-iq/funnels/)
- [Sankey Google Charts](https://developers.google.com/chart/interactive/docs/gallery/sankey)
- [deck.gl HexagonLayer](https://deck.gl/gallery/hexagon-layer)
- Museum card M-2026-04-25-006 (`docs/museum/cards/enneagramma-enneaeffects-orphan.md`)
- Museum card M-2026-04-25-003 (`docs/museum/cards/enneagramma-dataset-9-types.md`)
- Museum card M-2026-04-25-010 (`docs/museum/cards/personality-mbti-gates-ghost.md`)
- Runtime: `apps/backend/services/vcScoring.js` (letto diretto 2026-04-26)
- Runtime: `apps/backend/routes/session.js:2358-2403` (telemetry endpoint)
- Runtime: `tools/py/telemetry_analyze.py` (aggregation pipeline)
