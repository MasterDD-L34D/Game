---
title: Drift Audit 2026-05-04
date: 2026-05-04
doc_status: active
doc_owner: governance-illuminator
workstream: ops-qa
last_verified: 2026-05-04
source_of_truth: false
language: it
---

# Drift Audit — 2026-05-04

## TL;DR

| Metrica | Valore |
|---|---|
| Data audit | 2026-05-04 |
| Findings P0 | **0** |
| Findings P1 | **3** (2 STALE_ADR + 1 BRANCH_STALE) |
| Findings P2 | **4** (476 governance warnings + 4 dormant backlog) |
| Auto-fix eseguiti | **0** (tutti >5 → report-only) |
| Open PR rot | 0 (0 open PR totali) |
| CI_RED main | Non confermato (nessun fail riportato in sprint context) |
| PR questo audit | nessuna remediation — solo report |

---

## Findings P0 — Critici (blocco immediato)

_Nessuno._

---

## Findings P1 — Azione raccomandata

### STALE_ADR

| File | doc_status | Data ADR | Età (giorni) | Note |
|---|---|---|---|---|
| `docs/adr/ADR-2026-04-16-networking-co-op.md` | draft | 2026-04-16 | **18** | Mai promosso ad accepted/superseded |
| `docs/adr/ADR-2026-04-18-plan-reveal-round.md` | draft | 2026-04-18 | **16** | Mai promosso ad accepted/superseded |

**Causa**: entrambi creati durante la migrazione M14/co-op sprint. `networking-co-op` riguarda l'architettura WS (post-pivot Godot rende contenuto parzialmente obsoleto). `plan-reveal-round` descrive il round reveal flow (ora gestito dal round orchestrator). Soglia: `doc_status: draft` + file ADR name date >14 giorni senza promozione.

**Azione**: master-dd deve determinare per ciascuno: `accepted` / `superseded` / `rejected`. Non auto-fixable.

> Altri draft/proposed ADR tutti <14 giorni:
> `ADR-2026-04-26-*` (8 giorni), `ADR-2026-05-02-species-ecology-schema.md` (2 giorni) — non flaggati.

---

### BRANCH_STALE

| Branch | Ultimo commit | Età (giorni) | Open PR | Note |
|---|---|---|---|---|
| `biome/badlands-ptpf-it` | 2025-10-25 | **191** | No | `feat(foodweb): aggiunge foodweb BADLANDS` |

**Causa**: branch creato ~6 mesi fa per dataset foodweb Badlands (IT). Mai aperta PR, mai mergiato. Contenuto: aggiunta foodweb BADLANDS con nodi/archi/trigger. Potenziale overlap con lavoro successivo biomi.

**Azione**: verificare se contenuto è stato integrato altrove → se sì, delete branch. Non auto-fixable (policy: branch delete richiede approvazione).

> Tutti gli altri branch (`claude/*`, `chore/*`, `calibration/*`) hanno last commit **2026-04-13..2026-04-29** (5–21 giorni), sotto soglia 30 giorni. Non flaggati.

---

## Findings P2 — Monitor / Report-only

### GOVERNANCE_MASS_STALE

**Tool**: `python3 tools/check_docs_governance.py --registry docs/governance/docs_registry.json --strict`

```
errors=0  warnings=476
```

| Tipo | Conteggio | Dettaglio |
|---|---|---|
| `stale_document` | 465 | "revisione scaduta il 2026-04-28" (stessa data per tutti) |
| `frontmatter_registry_mismatch` | 11 | last_verified frontmatter ≠ registry; 1 doc_status mismatch |

**`frontmatter_registry_mismatch` (11 file):**

| File | Campo mismatch |
|---|---|
| `docs/core/00-GDD_MASTER.md` | last_verified |
| `docs/core/00-SOURCE-OF-TRUTH.md` | last_verified |
| `docs/core/00B-CANONICAL_PROMOTION_MATRIX.md` | last_verified |
| `docs/core/02-PILASTRI.md` | last_verified |
| `docs/core/90-FINAL-DESIGN-FREEZE.md` | doc_status (active vs draft) + last_verified |
| `docs/hubs/atlas.md` | last_verified |
| `docs/hubs/backend.md` | last_verified |
| `docs/hubs/combat.md` | last_verified |
| `docs/hubs/dataset-pack.md` | last_verified |
| _(+2 altri — vedi `reports/docs/governance_drift_report.json`)_ | last_verified |

**Analisi causa radice**: il registry (`docs_governance/docs_registry.json`) ha 631 entries tutte con `last_verified: '2026-04-14'` (data generazione batch) e `review_cycle_days: 14`. Scadenza: `2026-04-14 + 14 = 2026-04-28`. Oggi 2026-05-04 → scaduto 6 giorni fa. Non >90 giorni: la regola auto-fix (`>90d`) NON si applica. Si tratta di un normale review cycle overdue.

Gli 11 `frontmatter_registry_mismatch`: alcuni doc hanno già `last_verified: '2026-04-28'` nel frontmatter (aggiornati manualmente) ma il registry riporta ancora `'2026-04-14'`. Il tool usa il registry come source of truth → mismatch. `docs/core/90-FINAL-DESIGN-FREEZE.md` ha anche mismatch `doc_status` (frontmatter: `active`, registry: `draft`).

**Azione consigliata**: run `python3 tools/docs_governance_migrator.py` per sincronizzare registry con frontmatter reali. Poi bump `last_verified` entries nel registry alla data odierna. 1 commit autonomo. Non eseguito ora (>5 findings, condizione auto-fix >90d non soddisfatta).

---

### DORMANT_BACKLOG

Items in BACKLOG.md senza timestamp di creazione esplicito e senza commit ref negli ultimi 30 giorni. Classificati come probabilmente dormanti (>30 giorni senza attività tracciata).

| Ticket | Sezione | Effort stimato | Blocco |
|---|---|---|---|
| V3 Mating/Nido system | 🟢 Deferred post-MVP | ~20h | Post-MVP |
| V6 UI TV dashboard polish | 🟢 Deferred post-playtest | ~6h | Post-playtest |
| M12+ P2 Form evoluzione completa | 🟢 Deferred M12+ | ~35h | Sprint M12+ |
| Python rules engine Phase 2/3 removal | Tech debt long-term | indefinito | ADR-2026-04-19 |

**Nota**: tutti e 4 sono **consapevolmente deferred** per decisione product. Non STALE in senso patologico — solo dormanti per policy. Nessuna azione urgente.

---

## CI Status

- Main HEAD: `6af44d2` (PR #2038, test explicit non-override)
- Commit recenti: PR #2035–#2038 (sprint-r series, Godot port features)
- Sprint context: "AI 382/382 verde zero regression preservato" (ultimo aggiornamento 2026-04-29)
- `gh run list` non accessibile via MCP — CI_RED non confermabile direttamente
- **Verdict**: nessun segnale di CI_RED riportato nel sprint context; attività commit attiva → **presumibilmente verde**

---

## Sprint Context Check

| Check | Valore | Flag |
|---|---|---|
| Ultima data aggiornamento | 2026-04-29 (5 giorni fa) | ✅ <14 giorni |
| Test count CLAUDE.md | "AI 382/382" (2026-04-29) | ✅ |
| Open PR | 0 | ✅ |

Nessun SPRINT_STALE.

---

## Handoff Docs Check

| File più vecchio | Età | Flag |
|---|---|---|
| `docs/planning/2026-04-24-session-handoff-compact.md` | 10 giorni | ✅ <45 giorni |

Tutti i 28 handoff file sono compresi tra 2026-04-24 e 2026-05-02 (2–10 giorni). Nessun HANDOFF_STALE. Nessun `git mv` eseguito.

---

## Auto-fix Changelog

_Nessun auto-fix eseguito._

Motivo: tutti i findings auto-fixable (governance stale_document) sono in numero >5 → per policy devono essere listati in report e non eseguiti nel PR. Nessun handoff >45 giorni da muovere. Nessun ADR status auto-fixable (policy).

---

## Suggested Next Actions

| Priorità | Azione | Owner | Effort |
|---|---|---|---|
| P1 | Promuovi o rigetta `ADR-2026-04-16-networking-co-op.md` (`draft → accepted/superseded`) | master-dd | ~15 min |
| P1 | Promuovi o rigetta `ADR-2026-04-18-plan-reveal-round.md` (`draft → accepted`) | master-dd | ~15 min |
| P1 | Verifica `biome/badlands-ptpf-it` contenuto (191 giorni, nessuna PR) → delete se integrato | master-dd | ~10 min |
| P2 | Rigenera registry: `python3 tools/docs_governance_migrator.py` + sync last_verified | autonomous | ~30 min |
| P2 | Fix 11 frontmatter_registry_mismatch (vedi `reports/docs/governance_drift_report.json`) | autonomous | ~1h |
| P2 | Nota `docs/core/90-FINAL-DESIGN-FREEZE.md` ha doc_status mismatch: frontmatter=`active`, registry=`draft` | master-dd | ~5 min |
