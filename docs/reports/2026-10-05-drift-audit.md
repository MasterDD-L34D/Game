---
title: Drift Audit 2026-10-05
date: '2026-10-05'
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: '2026-10-05'
source_of_truth: false
language: it
---

# Drift Audit — 2026-10-05

## TL;DR

| Metrica | Valore |
|---|---|
| Totale finding | 8 |
| P0 (critico) | 1 |
| P1 (alto) | 4 |
| P2 (medio) | 3 |
| Auto-fix applicati | 89 handoff archiviati (`git mv`) |
| PR remediation | vedi link fine documento |

**Finding principale**: 11 PR di drift audit aperte da 7–77 giorni senza merge. Governance work prodotta ogni settimana ma mai accettata → accumulo strutturale.

**CI main**: verde (ultimo run 2026-07-14, success). Main inattivo da 83 giorni — non CI_RED ma stagnazione rilevante.

---

## Findings P0

| ID | Tipo | Dettaglio | Severità |
|---|---|---|---|
| F-01 | PR_ROT_SYSTEMIC | 11 PR drift audit open (7–77 gg senza update): #3308 #3309 #3310 #3311 #3312 #3313 #3314 #3315 #3316 #3317 #3318. Pattern: ogni settimana viene prodotta una PR ma non viene mai mergiata. Anche PR #3306 (`fix/rovine-planari-recovery`) è open. | **P0** |

Azione suggerita: eseguire review + merge batch delle PR governance accumulate, oppure chiudere quelle superate (le più vecchie risolvono finding già risolti da versioni successive).

---

## Findings P1

| ID | Tipo | File / Riferimento | Dettaglio |
|---|---|---|---|
| F-02 | SPRINT_STALE | `CLAUDE.md` §"Sprint context" | Ultimo entry: 2026-07-04 (93 giorni fa). Soglia: 14 giorni. |
| F-03 | STALE_ADR | `docs/adr/ADR-2026-07-10-sistema-action-symmetry.md` | `status: proposed` da 87 giorni. Decider: master-dd. |
| F-04 | STALE_ADR | `docs/adr/ADR-2026-07-14-worldgen-data-model.md` | `status: proposed` da 83 giorni. Decider: master-dd. |
| F-05 | HANDOFF_STALE | `docs/planning/*handoff*.md` (89 file) | Tutti i file handoff nel planning directory sono >45 giorni. **Auto-fix applicato**: `git mv` → `docs/archive/historical-snapshots/handoffs-2026/`. |

---

## Findings P2

| ID | Tipo | File / Riferimento | Dettaglio |
|---|---|---|---|
| F-06 | GOVERNANCE_STALE | `reports/docs/governance_drift_report.json` | 611 `stale_document` warning (review_cycle_days scaduto). Non auto-fixable senza review manuale. Esempi: `AGENTS.md` (scaduto 2026-09-04). |
| F-07 | MAIN_IDLE | `main` branch | Nessun push a main dal 2026-07-14 (83 giorni). CI ultimo run = success su `c3013af1`. Non CI_RED, ma nessuna attività di sviluppo recente. |
| F-08 | BRANCH_STALE | Rami listati sotto | Rami senza open PR con età stimata >30 gg (da naming). Top 10. |

### F-08 — Branch stale (top 10, stima da naming)

| Branch | Note |
|---|---|
| `chore/weekly-drift-audit-2026-06-01` | Jun-01, nessuna PR open corrispondente |
| `chore/weekly-drift-audit-2026-06-15` | Jun-15, nessuna PR open corrispondente |
| `chore/weekly-drift-audit-2026-07-06` | Jul-06, nessuna PR open corrispondente |
| `chore/weekly-drift-audit-2026-07-13` | Jul-13, nessuna PR open corrispondente |
| `auto/mission-console-dist-2026-05-10-1919` | May-10, auto-branch dist |
| `auto/mission-console-dist-2026-06-09-2033` | Jun-09, auto-branch dist |
| `biome/badlands-ptpf-it` | vecchio, nessuna PR open |
| `canon/orphan-biomes-map` | vecchio, nessuna PR open |
| `claude/aisim-aggressive-rebaseline` | vecchio, nessuna PR open stimata |
| `claude/d4-ecoyaml` | vecchio, nessuna PR open stimata |

---

## Nota: BACKLOG drift

Scansione prime 200 righe `BACKLOG.md`: nessun STALE_TICKET trovato nella prima passata. I ticket `[ ]` aperti (D6 graded re-ratify, N3 ER7, TKT-P6 orphans, zone-defense, XP_BUDGET_GEOMETRY flip, TKT-SIM-COOP-SEED) sono work genuinamente pendente, non artefatti stale. Verifica PR referenced (#3238 zone-defense, #3239 D9, #3240 coop-seed) non completata per limiti di contesto — raccomandato spot-check manuale.

---

## Auto-fix changelog

| Azione | Dettaglio |
|---|---|
| `git mv` 89 handoff | `docs/planning/*handoff*.md` (tutti pre-agosto 2026) → `docs/archive/historical-snapshots/handoffs-2026/` |

**Non auto-fixati** (fuori scope per policy):
- Stato ADR (F-03, F-04): richiede decisione master-dd
- `last_verified` bump massa (F-06): 611 doc, richiede review umana
- Chiusura/merge PR (F-01): richiede review master-dd
- Cancellazione branch (F-08): richiede autorizzazione esplicita
- Sprint context update (F-02): richiede conoscenza del progresso reale

---

## Azioni suggerite

1. **[P0] Batch-merge o chiudi PR governance** (#3308–#3318): le più recenti (#3316–#3318) contengono probabilmente fix validi. Le più vecchie (#3308–#3311) vanno verificate per overlap con fix successivi.
2. **[P1] Aggiorna CLAUDE.md sprint context**: ultimo entry 2026-07-04. Se il progetto è in pausa, aggiungere nota esplicita.
3. **[P1] Decidi su ADR-2026-07-10 e ADR-2026-07-14**: 2 proposed ADR senza decisione da 83–87 giorni.
4. **[P2] Review batch `stale_document`**: 611 warning governance. Valuta se alzare `review_cycle_days` per doc stabili invece di eseguire bump meccanici.
5. **[P2] Cleanup branch**: 4+ branch drift-audit senza PR + branch auto/canon/claude obsoleti.
