---
title: 'PILLAR-LIVE-STATUS — runtime status canonical (volatile)'
date: 2026-04-28
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-05-06'
source_of_truth: true
language: it
review_cycle_days: 7
tags: [pillar, status, runtime, live, canonical, volatile, cross-cutting]
related:
  - docs/core/02-PILASTRI.md
  - docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md
  - docs/reports/2026-04-27-situation-report-late.md
  - docs/reports/2026-04-28-canonical-doc-consolidation-plan.md
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

## Stato corrente — 2026-04-28

|  #  | Pilastro             |    Stato    | Ultima verifica | Sprint chiusura |
| :-: | -------------------- | :---------: | :-------------: | :-------------: |
|  1  | P1 Tattica leggibile |  🟢 def++  |   2026-04-28   |   Sprint α + #1975 + #1976 + #1932 |
|  2  | P2 Evoluzione        |  🟢 def++  |   2026-04-28   |   Spore Moderate FULL S1-S6 + #1918 + #1924 + #1967 |
|  3  | P3 Specie × Job      |    🟡++    |   2026-04-28   |   #1960 portrait + #1967 ecology |
|  4  | P4 Temperamenti      |   🟢 def   |   2026-04-28   |   #1966 + #1972 + #1945 + #1979 + #1983 |
|  5  | P5 Co-op vs Sistema  |   🟢 cand  |   2026-04-28   |   M11 stack + #1976 Objective HUD; gate finale TKT-M11B-06 |
|  6  | P6 Fairness          |    🟢      |   2026-04-28   |   pseudoRng + tension gauge + body-part + wounded_perma + #1990s Sprint 13 status engine wave A |

**Score finale**: **5/6 🟢 def + 1/6 🟡++ (P3)**. **Demo-ready confirmed**.

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

### P3 — Specie × Job (🟡++)

**Stato**: 🟡++ (portrait surface + ecology schema).

**Componenti shipped**:
- 84 specie YAML + 7 job canonical
- Progression M13.P3 perks 84 (#1697)
- Lineage tab nestHub (#1911)
- Portrait CK3 INTP-aware (#1960)
- Ecology schema (#1967): trophic_tier + pack_size + competes_with + ...

**Gate per 🟢 def**: morphotype CoQ pool selector (~6h Min) + XCOM points-buy build allocation (~8h).

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

---

## Delta history (snapshot temporali)

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
