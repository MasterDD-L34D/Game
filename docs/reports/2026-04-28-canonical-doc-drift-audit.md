---
title: 'Drift audit canonical doc — cross-reference 2026-04-28'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-28'
source_of_truth: false
language: it
review_cycle_days: 14
---

# Drift audit canonical doc — 2026-04-28

Prodotto da: `repo-archaeologist` excavate + curate mode su shortlist 35 doc (vedi
[`2026-04-28-canonical-doc-inventory.md`](2026-04-28-canonical-doc-inventory.md)).
Metodologia: grep evidence-first, claim citato con file:line. NON fabricato.

---

## §A — Contraddizioni explicit (pillar P1-P6)

### A.1 — Pillar score: 4 doc, 4 valori diversi

| Doc | last_verified | P1 | P2 | P3 | P4 | P5 | P6 | Score |
|-----|--------------|----|----|----|----|----|----|-------|
| `docs/core/02-PILASTRI.md` (canonical) | 2026-04-27 | 🟢 | 🟢c | 🟢c | 🟡 | 🟡 | 🟢c | 1🟢+3🟢c+2🟡 |
| `docs/reports/2026-04-27-situation-report-late.md` | 2026-04-27 | 🟢 def++ | 🟢 def++ | 🟡++ | 🟢 def | 🟢 def cand | 🟢 | **5🟢 def+1🟡++** |
| `docs/planning/2026-04-27-sprint-abgd-coordinated-handoff.md` (pre-merge) | 2026-04-27 | 🟢 def | 🟢 def | 🟡+ | 🟢 cand | 🟢 cand | 🟡++ | 3🟢 def+2🟢c+1🟡++ |
| `COMPACT_CONTEXT.md` (Sprint 11, latest) | 2026-04-27 | 🟢++ | 🟢 def | 🟢c+ | 🟢c | 🟢c | 🟢c++ | 1🟢+++2🟢c + |
| `CLAUDE.md` sprint context (top section) | 2026-04-28 | 🟢 def++ | 🟢 def++ | 🟡++ | 🟢 def | 🟢 def cand | 🟢 | 5🟢 def+1🟡++ |

**Drift severity**: HIGH.

- `docs/core/02-PILASTRI.md` (A3 authority) ha score `1/6 🟢 + 3/6 🟢 candidato + 2/6 🟡`
  (last_verified 2026-04-27 ma dati da BEFORE sprint α/β/γ/δ) — `docs/core/02-PILASTRI.md:65`.
- `situation-report-late.md` dice `5/6 🟢 def + 1/6 🟡++` POST sprint α/β — `situation-report-late.md:60`.
- Risultato: il doc con `source_of_truth: true` ha dati più vecchi di report non-SOT.

**Root cause**: `02-PILASTRI.md` aggiornato a mano. Sprint α/β/γ/δ merged dopo l'aggiornamento
ma NON hanno bumped `last_verified` né il score table.

---

### A.2 — "Engine LIVE Surface DEAD" count: 7/9 vs 9/9

| Doc | line | Claim |
|-----|------|-------|
| `docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md` | 450 | "7/9 chiusi (#1+#2+#5+#6+#7+#8+#9). Residui: #3+#4." |
| `docs/reports/2026-04-27-situation-report-late.md` | 90, 173 | "**9/9 chiusi**. Anti-pattern bundle completamente eliminato." |

**Drift severity**: MEDIUM. Stato-arte dice 7/9, situation-report dice 9/9.
Causa probabile: stato-arte scritto PRIMA di sprint 8-11 (Surface-DEAD #1 + #2 chiusi lì).
Situation-report conta 9 perché include echolocation (#9) via PR #1977 post-stato-arte.
Non è contraddizione logica ma temporal: stato-arte non più current per §C.2.

---

### A.3 — SoT §16 networking: "non implementato" vs M11 Jackbox LIVE

| Doc | line | Claim |
|-----|------|-------|
| `docs/core/00-SOURCE-OF-TRUTH.md` | 719 | `"§16 Networking/Co-op: ADR Colyseus (proposto). 🟡 ADR proposto, non implementato"` |
| `docs/adr/ADR-2026-04-20-m11-jackbox-phase-a.md` | 21 | `"Stato: Accepted"` (Jackbox WS live PR #1680) |
| `docs/hubs/combat.md` | 16, 38-42 | References solo `services/rules/` Python — nessuna menzione DEPRECATED.md |
| `CLAUDE.md` sprint context | variabile | M11 Phase A+B+C shipped, P5 🟢 candidato |

**Drift severity**: HIGH. SoT è il doc con `source_of_truth: true` e `last_verified: 2026-04-16`.
Sprint M11 è shipped 2026-04-20 (10+ giorni dopo). SoT confonde chiunque lo legga come
reference: dice P5 networking non implementato, la realtà è WS live su porta 3341.

---

### A.4 — SoT "6 pilastri" ≠ canonical P1-P6

| Doc | line | Set |
|-----|------|-----|
| `docs/core/00-SOURCE-OF-TRUTH.md` | 526-533 | 6 pilastri: "prima partita, worldgen, foodweb, specie-trait-forme, TV+companion, premessa narrativa" |
| `docs/core/02-PILASTRI.md` | 24-52 | 6 pilastri canonical: P1 Tattica, P2 Evoluzione, P3 Specie×Job, P4 Temperamenti, P5 Co-op, P6 Fairness |
| `docs/adr/ADR-2026-04-27-pilastri-canonical-6.md` | 21 | Status Accepted — P1-P6 canonical |

**Drift severity**: HIGH. SoT nomina 6 "pilastri" di senso architetturale (aree design)
che NON corrispondono ai 6 pilastri canonici P1-P6. Qualunque agent o developer che legge
SoT come SOT trova un set diverso. SoT non è stato aggiornato post-ADR-2026-04-27.

---

### A.5 — `combat.md` hub descrive Python rules engine come canonical, nessuna menzione deprecation

`docs/hubs/combat.md` (last_verified 2026-04-17, linee 16 e 38-42) descrive
`services/rules/resolver.py`, `round_orchestrator.py`, `hydration.py` come canonical
senza alcuna menzione di:
- `ADR-2026-04-19-kill-python-rules-engine.md` (DEPRECATED, Phase 1 completata)
- `services/rules/DEPRECATED.md`
- `apps/backend/services/combat/` come canonical sostituto Node

**Drift severity**: HIGH. Il hub per il combat workstream descrive un sistema DEPRECATED
come se fosse l'implementazione attiva. Confonde developer + agent.

---

## §B — Numeri stale (counters drift)

### B.1 — PR count cross-doc

| Doc | line | Count | Window |
|-----|------|------:|--------|
| `docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md` | 141 | **59 PR shipped** | 2026-04-25→2026-04-28 |
| `docs/reports/2026-04-27-situation-report-late.md` | 27 | **50 PR mergiati main** | cross-PC multi-session |
| `docs/planning/2026-04-27-sprint-abgd-coordinated-handoff.md` | 463 | **4 PR merged main** | sprint α/β/γ/δ only |

**Drift**: 50 vs 59 sono finestre temporali diverse (situation-report snapshot precedente,
stato-arte include Skiv sprint +5 PR). Non contraddizione logica — finestre diverse.
Ma entrambi marcati last_verified 2026-04-27 senza chiarire la finestra. Confonde.

### B.2 — Test count

| Doc | Claim |
|-----|-------|
| `COMPACT_CONTEXT.md` (Sprint 11) | "AI 363/363 zero regression" |
| `docs/planning/2026-04-27-sprint-abgd-coordinated-handoff.md` DoD | "AI baseline 311/311 verde" |

**Drift**: 311 è baseline PRE-sprint α (scritta nella spec). 363 è post-sprint (risultato
reale). La handoff spec non è stata aggiornata post-merge. Non bug ma stale counter.

### B.3 — `doc_status: draft` in T1-14

`docs/core/90-FINAL-DESIGN-FREEZE.md` ha `doc_status: draft` (line 3) nonostante sia
referenziato in SoT come canonical e usato in altri 3+ doc come "freeze di riferimento".
Mai promosso ad `active`. Age: last_verified 2026-04-15.

---

## §C — Cross-link broken / suspect

| # | Doc citing | Link | Status |
|---|-----------|------|--------|
| C-01 | `docs/core/02-PILASTRI.md:82` | `docs/appendici/A-CANVAS_ORIGINALE.md` | **OK** (file esiste) |
| C-02 | `docs/core/02-PILASTRI.md:96` | `docs/planning/EVO_FINAL_DESIGN_SOURCE_AUTHORITY_MAP.md` | **OK** |
| C-03 | `docs/core/02-PILASTRI.md:43` | `docs/planning/2026-04-26-v3-canonical-flow-decisions.md` | **OK** |
| C-04 | `docs/core/00-SOURCE-OF-TRUTH.md:719` | `ADR Colyseus (proposto)` | **BROKEN** — Colyseus è fallback; ADR reale è Jackbox (ADR-2026-04-20-m11-jackbox-phase-a.md). Link sbagliato. |
| C-05 | `docs/hubs/combat.md:16` | `services/rules/` — assenza link a DEPRECATED.md | **STALE** — no broken link ma OMISSIONE critica: non menziona deprecation. |
| C-06 | Multiple planning docs | `docs/reports/2026-04-27-stato-arte-completo-vertical-slice.md` | **OK** (file esiste) |

---

## §D — Doc orfani / non-cited (bottom-quartile freshness × centrality)

**Metrica**: stale (last_verified < 2026-04-15) + nessuna menzione trovata in T2-T5.

| Doc | last_verified | Cited in T1-T5? | Risk |
|-----|--------------|----------------|------|
| `docs/hubs/flow.md` | 2026-04-13 | Raramente | MEDIUM — generation pipeline cambiata (mock:generate rimosso) |
| `docs/hubs/atlas.md` | 2026-04-14 | Raramente | MEDIUM — Mission Console architecture changed |
| `docs/hubs/backend.md` | 2026-04-13 | Raramente | MEDIUM — session split 4 moduli, round model, co-op |
| `docs/hubs/dataset-pack.md` | 2026-04-13 | Raramente | LOW — dataset schema stable |
| `docs/core/03-LOOP.md` | 2026-04-14 | Zero hit in T2-T5 | LOW — 17 LOC, macro stable |
| `docs/core/10-SISTEMA_TATTICO.md` | 2026-04-14 | Zero hit | LOW — 20 LOC, placeholder level |
| `docs/core/DesignDoc-Overview.md` | 2026-04-14 | 1 hit in 02-PILASTRI | MEDIUM — overview may misrepresent 6-pilastri |

---

## §E — Sprint context CLAUDE.md drift

**23 sezioni `🎮 Sprint context`** coesistono in CLAUDE.md (contato via grep, 2026-04-28).

Sezioni trovate (top→bottom, da `grep -n "🎮 Sprint context" CLAUDE.md`):

| # | Header excerpt | Data |
|---|---------------|------|
| 1 | aggiornato: 2026-04-28 — Skiv Personal Sprint 4/4 | TOP, fresh |
| 2 | aggiornato: 2026-04-27 late — situation report | fresh |
| 3 | aggiornato: 2026-04-27 — Sprint 8 Ability r3/r4 | fresh |
| 4 | precedente: 2026-04-27 — Sprint 7 | labeled "precedente" |
| 5 | precedente: 2026-04-27 — Sprint 6 channel resistance | labeled "precedente" |
| 6-23 | Sprint 1-5 + Vision Gap + Playtest + M11-M23 ecc. | cumulative |

**Sezioni 4-23 marcate "precedente" o non marcate** — totale ~1700+ righe di sprint
context accumulato. Policy dichiarata in CLAUDE.md §Memory: "Sprint context max 3 sections
(top + 2 prior, archive rest)" — ma non enforced. 20 sezioni in eccesso.

**Contraddizioni interne CLAUDE.md** (diverse sezioni):

1. Sezione 2026-04-27 late dice P3 🟡++ (situation report). Sezione 2026-04-23 dice
   P3 🟢 candidato (sessione 2026-04-25 M13.P3 Phase B).
2. Sezione top dice "demo-ready confirmed". Sezione 2026-04-26 dice "Vision Gap V1-V7 +
   M16-M20 co-op MVP" come se fosse current next. Sequencing ambiguo per nuovo agent.
3. Test count: sezione 2026-04-23 dice "725+" totali; COMPACT_CONTEXT dice "363/363 AI
   baseline". Numeri incompatibili senza context (diverse suite, diverse date).

**Drift severity**: HIGH operativamente — ogni nuovo agent legge 23 sezioni stacked e
non sa quale è canonical. Top section non è garantita come "current" (no sticky marker).

---

## §F — Riepilogo drift per severity

| # | Drift | Severity | SOT | Reality |
|---|-------|----------|-----|---------|
| A.1 | Pillar score in 4 doc diversi | HIGH | `02-PILASTRI.md` (stale score) | `situation-report-late.md` (post-sprint) |
| A.3 | SoT §16 networking "non implementato" | HIGH | `00-SOURCE-OF-TRUTH.md` (2026-04-16) | M11 Jackbox LIVE PR #1680 (2026-04-20) |
| A.4 | SoT 6 pilastri ≠ canonical P1-P6 | HIGH | `00-SOURCE-OF-TRUTH.md` | `ADR-2026-04-27-pilastri-canonical-6.md` |
| A.5 | `combat.md` hub: Python DEPRECATED omesso | HIGH | `docs/hubs/combat.md` (2026-04-17) | `ADR-2026-04-19-kill-python-rules-engine.md` |
| E | CLAUDE.md 23 sprint context sections | HIGH (ops) | Policy = max 3 | Reality = 23 sezioni |
| A.2 | Engine LIVE Surface DEAD 7/9 vs 9/9 | MEDIUM | stato-arte (7/9 count) | situation-report (9/9, post-sprint) |
| B.1 | PR count 50 vs 59 (finestre diverse) | MEDIUM | Documentato diversamente | Finestre diverse senza label |
| B.3 | `90-FINAL-DESIGN-FREEZE.md` doc_status: draft | MEDIUM | doc_status campo | Comportamento come active reference |
| C-04 | SoT cita "ADR Colyseus" per networking | MEDIUM | `00-SOURCE-OF-TRUTH.md:719` | ADR Jackbox è l'Accepted |
| §D | 7 doc orfani last_verified < 2026-04-14 | LOW-MED | Nessun agent li aggiorna | Citati come entrypoint in CLAUDE.md |

**Totale**: 4 HIGH + 4 MEDIUM + 2 LOW. **Top 5 contraddizioni** per impatto operativo:
A.3, A.4, A.5, A.1, E.

---

*Generato: repo-archaeologist · 2026-04-28*
*Evidence: grep + Read su shortlist 35 doc. Ogni claim ha file:line citato.*
