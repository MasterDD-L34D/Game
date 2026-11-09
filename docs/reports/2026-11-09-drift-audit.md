---
title: Drift Audit 2026-11-09
date: '2026-11-09'
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: '2026-11-09'
source_of_truth: false
language: it
review_cycle_days: 7
---

# Drift Audit — 2026-11-09

> Routine settimanale. Caveman style. Generato da governance-illuminator.

---

## TL;DR

| Metrica | Valore |
|---------|--------|
| **P0 (bloccanti)** | 0 |
| **P1 (action required)** | 4 |
| **P2 (tracking)** | 695+ |
| CI main | ✅ green (ultimo run 2026-11-02) |
| Auto-fix applicati | 1 (registry last_verified sync) |
| PR questa run | [aperta sotto](#pr) |

Accumulazione critica di PR drift audit non mergiati: **16 open draft PR** (#3308–#3323, dal 2026-07-20). Master-dd: rivedere + chiudere le vecchie o allineare processo merge.

---

## P1 — Action Required

### 1. SPRINT_STALE

| Campo | Valore |
|-------|--------|
| File | `CLAUDE.md` |
| Ultimo aggiornamento sprint context | 2026-07-04 |
| Giorni fa | **127** (soglia: 14) |
| Ultimo commit main | `c3013af` `docs(adr): last count contradiction` |

CLAUDE.md punta ancora al sprint del 04-07. Nessun commit a `docs/` da ≥30 giorni. **Non flag CI_RED** (CI green su branch audit).

### 2+3. STALE_ADR — 2 ADR proposed > 14 giorni

| ADR | Status | Data frontmatter | Giorni |
|-----|--------|-----------------|--------|
| `ADR-2026-07-10-sistema-action-symmetry.md` | proposed | 2026-07-10 | **122** |
| `ADR-2026-07-14-worldgen-data-model.md` | proposed | 2026-07-14 | **118** |

Entrambi `source_of_truth: true`, `review_cycle_days: 90`. Decider: master-dd (il MERGE dell'ADR ratifica la direzione). Non auto-fixabili.

### 4. PR_ROT — 17 open PR, tutti > 7 giorni

#### Drift audit PR accumulation (P1-critico)

| # | Titolo | Ultima attività | Età |
|---|--------|----------------|-----|
| #3323 | weekly drift audit 2026-11-02 | 2026-11-02 | 7g |
| #3322 | weekly drift remediation 2026-10-26 | 2026-10-26 | 14g |
| #3321 | weekly drift audit 2026-10-19 | 2026-10-19 | 21g |
| #3320 | weekly drift audit 2026-10-12 | 2026-10-12 | 28g |
| #3319 | weekly drift remediation 2026-10-05 | 2026-10-05 | 35g |
| #3318 | weekly drift remediation 2026-09-28 | 2026-09-28 | 42g |
| #3317 | weekly drift remediation 2026-09-21 | 2026-09-21 | 49g |
| #3316 | weekly drift remediation 2026-09-14 | 2026-09-14 | 56g |
| #3315 | weekly drift remediation 2026-09-07 | 2026-09-07 | 63g |
| #3314 | weekly drift remediation 2026-08-31 | 2026-08-31 | 70g |
| #3313 | weekly drift remediation 2026-08-24 | 2026-08-24 | 77g |
| #3312 | weekly drift remediation 2026-08-17 | 2026-08-17 | 84g |
| #3311 | weekly drift audit 2026-08-10 | 2026-08-10 | 91g |
| #3310 | weekly drift audit 2026-08-03 | 2026-08-03 | 98g |
| #3309 | weekly drift audit 2026-07-27 | 2026-07-27 | 105g |
| #3308 | weekly drift audit 2026-07-20 | 2026-07-20 | **112g** |

#### Feature PR stale

| # | Titolo | Ultima attività | Età |
|---|--------|----------------|-----|
| #3306 | fix(species): recover rovine_planari | 2026-07-14 | **118g** |

**Raccomandazione**: chiudere #3308–#3322 (vecchi, senza applicazione fixes) + finalizzare #3306.

---

## P2 — Tracking

### 5. GOVERNANCE — 684 warnings (errors=0)

| Codice | Count | Note |
|--------|-------|------|
| `stale_document` | 679 | Di cui 232 scaduti prima del 2026-08-10 (>90g) |
| `frontmatter_registry_mismatch` | 1 | **AUTO-FIXED** (vedi changelog) |
| `unregistered_document` | 4 | Vedi elenco sotto |

**Unregistered documents (action manuale):**

| Path |
|------|
| `docs/ops/backend-components-inventory.md` |
| `docs/planning/2026-07-14-r1-trait-stub-authoring-istruttoria.md` |
| `docs/planning/2026-07-14-r1-v2-trait-stub-authoring-corrected.md` |
| `docs/superpowers/specs/2026-07-04-ai-los-repositioning-design.md` |

### 6. HANDOFF_STALE — ~40+ file in docs/planning/ con date < 2026-09-25

Campione (più vecchi):

| File | Data |
|------|------|
| `docs/planning/2026-04-24-session-handoff-compact.md` | 2026-04-24 |
| `docs/planning/2026-04-25-*.md` (5 file) | 2026-04-25 |
| `docs/planning/2026-04-26-*.md` (2 file) | 2026-04-26 |
| `docs/planning/2026-04-27-*.md` (10 file) | 2026-04-27 |
| `docs/planning/2026-05-*.md` (12+ file) | mag 2026 |
| `docs/planning/2026-06-*.md` (10+ file) | giu 2026 |
| `docs/planning/2026-07-0[1-4]-*.md` (10+ file) | lug 2026 |

Totale stimato: **~55 file** con data < 2026-09-25.
Auto-fix deferred: aggiornamento `docs_registry.json` atomico necessario per `git mv`. Usare `tools/docs_governance_migrator.py` in batch dedicato.

### 7. BRANCH_STALE — Top 10 rami senza open PR e >30 giorni

| Branch | Stima età |
|--------|-----------|
| `chore/weekly-drift-audit-2026-07-13` | ~119g |
| `chore/weekly-drift-audit-2026-07-06` | ~126g |
| `chore/weekly-drift-audit-2026-06-15` | ~147g |
| `chore/weekly-drift-audit-2026-06-01` | ~161g |
| `auto/mission-console-dist-2026-05-10-1919` | ~183g |
| `auto/mission-console-dist-2026-06-09-2033` | ~153g |
| `autoresearch/coop-broadcast-debrief-payload` | vecchio |
| `autoresearch/coop-broadcast-debrief-payload-v2` | vecchio |
| `biome/badlands-ptpf-it` | vecchio |
| `canon/orphan-biomes-map` | vecchio |

Non auto-deletabili (constraint). Segnalare a master-dd per pulizia.

### 8. BACKLOG_DORMANT

| Item | Data | Note |
|------|------|------|
| "NEXT GOAL (2026-06-02)" section | 2026-06-02 | Sezione header stale (design-closure Fase 1). Non un ticket aperto. |
| `TKT-KEEPER-CONTENT-DEBT` / `TKT-KEEPER-VALIDATOR-SCOPE` | >30g no commit | Tracking items senza PR recente |

---

## Auto-fix changelog

| Fix | File | Dettaglio |
|-----|------|-----------|
| Registry sync | `docs/governance/docs_registry.json` | `ADR-2026-04-16-session-engine-round-migration.md`: `last_verified` `2026-06-06` → `2026-07-05` (allineato a frontmatter) |

---

## Suggested next actions

1. **[master-dd]** Chiudi PR #3308–#3322 (accumulate, non applicate). Mantieni solo la più recente.
2. **[master-dd]** Decide status ADR-2026-07-10 e ADR-2026-07-14 (merge = accepted, close = rejected).
3. **[master-dd]** Aggiorna CLAUDE.md sprint context pointer (127 giorni stale).
4. **[autonomo-ok]** Batch `git mv` handoffs pre-Jun-2026 → `docs/archive/historical-snapshots/` con `tools/docs_governance_migrator.py` + registry sync atomico.
5. **[autonomo-ok]** Registra i 4 unregistered documents in `docs_registry.json`.
6. **[master-dd]** Pulizia branch BRANCH_STALE (10+ rami orfani).
7. **[autonomo-ok]** Governance stale burn-down: bump `last_verified` su batch di doc effettivamente revisionati (232 doc scaduti >90g).
