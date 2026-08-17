---
title: Drift Audit 2026-08-17
date: 2026-08-17
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: 2026-08-17
source_of_truth: false
language: it
---

# Drift Audit — 2026-08-17

## TL;DR

| Severity | Count | PR |
|---|---|---|
| P0 | 0 | — |
| P1 | 2 | questo PR |
| P2 | 5 | questo PR |

**Auto-fix applicati**: 87 handoff stale → archive (batch git mv) · registry mismatch ADR-04-16 allineato.

CI main: ✅ verde (ultimo run 2026-07-14). Main fermo da 34 giorni.

**Finding critico**: loop governance-illuminator ROTTO — 4 PR audit settimanale aperti e mai mergiati (2026-07-20 → 2026-08-10). Richiedono chiusura/merge manuale da master-dd.

---

## P0 — Bloccanti

_Nessuno._

---

## P1 — Urgenti

### P1-1 · SPRINT_STALE

Ultimo "Current sprint" in CLAUDE.md datato **2026-07-04** (44 giorni fa, soglia 14 giorni).

| campo | valore |
|---|---|
| Ultimo aggiornamento | 2026-07-04 (TKT-P6-AP3 closure) |
| Età | 44 giorni |
| Soglia | 14 giorni |
| Impatto | Pointer sprint stale → nuove sessioni partono con contesto errato |

**Azione**: aggiornare sezione "Sprint context" in CLAUDE.md con stato corrente.

---

### P1-2 · GOVERNANCE_LOOP_BROKEN

4 PR settimanali del governance-illuminator aperti senza merge/close, accumulati da 28 giorni:

| PR | Titolo | Creato | Giorni aperti |
|---|---|---|---|
| [#3308](https://github.com/MasterDD-L34D/Game/pull/3308) | weekly drift audit 2026-07-20 | 2026-07-20 | 28 |
| [#3309](https://github.com/MasterDD-L34D/Game/pull/3309) | weekly drift audit 2026-07-27 | 2026-07-27 | 21 |
| [#3310](https://github.com/MasterDD-L34D/Game/pull/3310) | weekly drift audit 2026-08-03 | 2026-08-03 | 14 |
| [#3311](https://github.com/MasterDD-L34D/Game/pull/3311) | weekly drift audit 2026-08-10 | 2026-08-10 | 7 |

Tutti draft, tutti senza review. La governance loop crea report ma non chiude il ciclo.

**Azione**: master-dd merge o close ogni PR audit dopo review. Considerare auto-close dei draft >7 giorni.

---

## P2 — Da risolvere

### P2-1 · HANDOFF_STALE (87 documenti)

87 di 89 handoff in `docs/planning/` sono datati >45 giorni (cutoff 2026-07-03).

Campione più vecchi:

| File | Data | Età |
|---|---|---|
| `2026-04-24-session-handoff-compact.md` | 2026-04-24 | 115 gg |
| `2026-04-25-*.md` (×5) | 2026-04-25 | 114 gg |
| `2026-04-26-*.md` (×2) | 2026-04-26 | 113 gg |
| `2026-04-27-*.md` (×13) | 2026-04-27 | 112 gg |
| `2026-04-28-*.md` (×2) | 2026-04-28 | 111 gg |
| `2026-05-*.md` (×est. 30) | mag 2026 | 75–108 gg |
| `2026-06-*.md` (×est. 35) | giu 2026 | 47–79 gg |

**Auto-fix applicato**: tutti i 87 file → `docs/archive/historical-snapshots/2026-planning-handoffs/` (vedi changelog).

⚠️ CLAUDE.md sprint context linka molti handoff giugno. I link puntano ora alla location archivio.

---

### P2-2 · PR_ROT (#3306)

PR [#3306](https://github.com/MasterDD-L34D/Game/pull/3306) (`fix/rovine-planari-recovery`) aperta da 34 giorni, non-draft, `mergeable_state: clean`.

| campo | valore |
|---|---|
| Titolo | fix(species): recover rovine_planari + ADR addendum |
| Creata | 2026-07-14 |
| Stato | open, non-draft, clean |
| Scope | +4304 / −224 righe, 24 file |

**Azione**: review e merge da master-dd.

---

### P2-3 · BRANCH_STALE (top 10)

Branch senza PR aperta e commit >30 giorni:

| Branch | Ultimo commit | Età stimata |
|---|---|---|
| `chore/weekly-drift-audit-2026-06-01` | 2026-06-01 | 77 gg |
| `chore/weekly-drift-audit-2026-06-15` | 2026-06-15 | 63 gg |
| `chore/weekly-drift-audit-2026-07-06` | 2026-07-06 | 42 gg |
| `chore/weekly-drift-audit-2026-07-13` | 2026-07-13 | 35 gg |
| `aa01/cap-02-tracking-commit` | 2026-04-25 | 114 gg |
| `aa01/cap-07-terrain-reactions-wire` | ~2026-04 | >100 gg |
| `autoresearch/coop-broadcast-debrief-payload` | 2026-05-15 | 94 gg |
| `autoresearch/coop-broadcast-debrief-payload-v2` | ~2026-05 | >90 gg |
| `biome/badlands-ptpf-it` | ~2026-05 | >90 gg |
| `canon/orphan-biomes-map` | ~2026-05 | >90 gg |

_Non auto-fixati: branch delete richiede azione manuale master-dd._

---

### P2-4 · BACKLOG_DORMANT (3 items)

Item aperti in BACKLOG.md senza attività da >90 giorni, tutti master-dd gated:

| BACKLOG line | Item | Età stimata |
|---|---|---|
| 1068 | Phase B trigger 2/3 master-dd (window chiusa 2026-05-14) | 95 gg |
| 1069 | Skiv Monitor fix master-dd (Option A repo setting) | ~95 gg |
| 1048 | Residuo QA visivo phone Godot #2746 (lane GGv2) | ~64 gg |

**Azione**: master-dd close o promote a sprint attivo.

---

### P2-5 · ADR_MISMATCH

`docs/adr/ADR-2026-04-16-session-engine-round-migration.md` — `frontmatter_registry_mismatch`.

| campo | frontmatter | registry |
|---|---|---|
| `last_verified` | `2026-07-05` | `2026-06-06` |

**Auto-fix applicato**: registry allineato a frontmatter (`2026-07-05`).

---

## Auto-fix changelog

| # | Tipo | Descrizione |
|---|---|---|
| 1 | `git mv` batch-1 | 87 handoff da `docs/planning/` → `docs/archive/historical-snapshots/2026-planning-handoffs/` |
| 2 | registry sync | `docs_registry.json`: `last_verified` ADR-04-16 `2026-06-06` → `2026-07-05` |

_Commits nel PR: ≤5._

---

## Suggested next actions

| Priorità | Azione | Owner |
|---|---|---|
| P1 | Aggiorna CLAUDE.md sprint context | master-dd |
| P1 | Merge/close PR audit #3308–#3311 (loop governance) | master-dd |
| P2 | Review + merge #3306 (rovine_planari recovery) | master-dd |
| P2 | Delete 10 branch stale elencate sopra | master-dd |
| P2 | Close/promote 3 BACKLOG item dormant | master-dd |
| info | CI verde, main fermo da 34 giorni — nessun regression attivo | — |
