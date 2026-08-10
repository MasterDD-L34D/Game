---
title: Drift Audit 2026-08-10
date: 2026-08-10
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: 2026-08-10
source_of_truth: false
language: it
review_cycle_days: 90
---

# Drift Audit — 2026-08-10

## TL;DR

| Metrica | Valore |
|---|---|
| Totale findings | 6 categorie |
| P0 (bloccante) | 0 |
| P1 (alta priorità) | 1 |
| P2 (hygiene) | 5 |
| Auto-fix applicati | 0 |
| PR rimediazione | `chore/weekly-drift-audit-2026-08-10` (solo report) |
| CI base (main) | ✅ green — ultima run 2026-07-14 (success) |

**P1 persistente**: CLAUDE.md sprint pointer = 2026-07-04 (**37 gg**, 4a settimana consecutiva — invariato da 3 audit precedenti non mergiati).

---

## P0 — Nessun finding

---

## P1 — 1 finding

### 1.1 SPRINT_STALE

| Campo | Valore |
|---|---|
| Pointer in CLAUDE.md | `2026-07-04` (TKT-P6-AP3 closure) |
| Età | **37 giorni** (soglia >14d) |
| Settimane consecutive | **4** (segnalato in #3308, #3309, #3310 — tutti non mergiati) |
| Azione | owner: aggiorna CLAUDE.md sprint context con stato corrente |

---

## P2 — 5 findings

### 2.1 PR_ROT — 4 PR aperte >7 giorni

| # | Titolo | Età | Draft | CI | Azione |
|---|---|---|---|---|---|
| [#3306](https://github.com/MasterDD-L34D/Game/pull/3306) | fix(species): recover rovine_planari | **27 gg** | ❌ no | ✅ clean | **Mergeable — priorità owner** |
| [#3308](https://github.com/MasterDD-L34D/Game/pull/3308) | drift audit 2026-07-20 | **21 gg** | draft | — | Chiudere (superseded da #3309→3310→questo) |
| [#3309](https://github.com/MasterDD-L34D/Game/pull/3309) | drift audit 2026-07-27 | **14 gg** | draft | — | Chiudere (superseded) |
| [#3310](https://github.com/MasterDD-L34D/Game/pull/3310) | drift audit 2026-08-03 | **7 gg** | draft | — | Chiudere (superseded da questo) |

> Pattern: 3 drift audit draft si sono accumulati non mergiati. La coda di audit non supera valore di 1 PR aperta alla volta; l'accumulo indica che il flusso merge è bloccato.

### 2.2 STALE_ADR — 2 ADR fermi in `proposed` >14 giorni

| File | Status | Età |
|---|---|---|
| `docs/adr/ADR-2026-07-10-sistema-action-symmetry.md` | proposed | **31 giorni** |
| `docs/adr/ADR-2026-07-14-worldgen-data-model.md` | proposed | **27 giorni** |

Azione owner: `proposed → accepted` se ratificati, oppure `proposed → draft` se in attesa dati.

### 2.3 GOVERNANCE_STALE — 237 warnings (+34 vs settimana scorsa)

Eseguito `python3 tools/check_docs_governance.py --registry docs/governance/docs_registry.json --strict`:

| Codice | Conteggio | Delta (vs 2026-08-03) |
|---|---|---|
| `stale_document` | 232 | +34 |
| `unregistered_document` | 4 | 0 |
| `frontmatter_registry_mismatch` | 1 | 0 |
| `errors` | **0** | 0 |

- Trend stale_document: +34/settimana → `review_cycle_days` troppo corti su docs/process (consigliato: raise a 90d).
- 4 unregistered: nuovi doc aggiunti senza aggiornare `docs_registry.json`.
- 1 mismatch: `docs/adr/ADR-2026-04-16-session-engine-round-migration.md` — `last_verified` frontmatter vs registry discordanti.
- **Nessun `last_verified` >90d trovato** → nessun auto-fix `last_verified` applicabile.

### 2.4 BRANCH_STALE — top 10 rami obsoleti (>30d, nessuna PR aperta)

| Branch | Ultimo commit | Età |
|---|---|---|
| `biome/badlands-ptpf-it` | 2025-10-25 | **289 gg** |
| `aa01/cap-02-tracking-commit` | 2026-04-25 | 107 gg |
| `aa01/cap-04-changelog-create` | 2026-04-25 | 107 gg |
| `auto/mission-console-dist-2026-05-10-1919` | 2026-05-10 | 93 gg |
| `chore/weekly-drift-audit-2026-06-01` | 2026-06-01 | 70 gg |
| `chore/weekly-drift-audit-2026-06-15` | 2026-06-15 | 56 gg |
| `canon/orphan-biomes-map` | 2026-06-29 | 42 gg |
| `canon-5biomi` | 2026-06-29 | 42 gg |
| `claude/busy-fermat-4cddcb` | 2026-06-30 | 41 gg |
| `ci/app-token-automation-prs` | 2026-07-09 | 32 gg |

Stima totale branch stale (>30d, no PR): ≥190 (invariato da settimana scorsa). **Non auto-fixabili** (delete branch = distruttivo, owner-gated).

### 2.5 DRIFT_AUDIT_QUEUE — 3 PR draft accumulate non mergiati

Trovate 3 PR drift-audit aperte come draft (2026-07-20 / 2026-07-27 / 2026-08-03) non mergiati in main. I report corrispondenti non sono presenti in `docs/reports/` né in `docs_registry.json`. Pattern: il flusso "apri PR draft → merge" è interrotto da quando l'ultimo audit mergiato è `2026-06-29-drift-audit.md`.

Azione: chiudere #3308/3309/3310 (superseded da questo), mergere questo PR, registrare pattern "merge subito se 0 auto-fix".

---

## Auto-fix changelog

Nessun auto-fix eseguito.

| Tipo | Trovati | Motivazione |
|---|---|---|
| `last_verified` >90d | 0 | Nessun documento oltre la soglia |
| handoff >45d | 0 | Tutti i file handoff hanno commit ≥ 2026-07-06 (batch) |
| registry path typo | 0 | Nessuno trovato |

---

## Azioni raccomandate

| Priorità | Responsabile | Azione |
|---|---|---|
| **P1** | owner | Aggiorna CLAUDE.md sprint context con sprint corrente (ultimo: 2026-07-04, 37gg stale) |
| P2 | owner | Mergia #3306 (rovine_planari — CI clean, not draft, 27gg) |
| P2 | owner | Chiudi draft #3308, #3309, #3310 (superseded da questo audit) |
| P2 | owner | ADR-2026-07-10 + ADR-2026-07-14: `proposed → accepted` o `proposed → draft` |
| P2 | governance | Registra 4 doc `unregistered_document` in `docs_registry.json` |
| P2 | governance | Allinea mismatch `ADR-2026-04-16-session-engine-round-migration.md` |
| P2 | governance | Raise `review_cycle_days` su docs stale-trend (+34/wk → cicli troppo corti) |
| P2 | owner | Branch cleanup top-10 (oldest: `biome/badlands-ptpf-it`, 289gg) |
