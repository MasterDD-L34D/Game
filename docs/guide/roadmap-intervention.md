---
title: 'Come intervenire sulla roadmap (post governance auto-sync)'
workstream: cross-cutting
category: guide
doc_status: active
doc_owner: claude-code
last_verified: '2026-05-31'
source_of_truth: false
language: it
review_cycle_days: 60
tags: [roadmap, governance, guide, backlog, adr, open-decisions, anti-drift]
---

# Come intervenire sulla roadmap

> Mappa operativa post anti-drift #19 (#2489 + follow-up #2492/#2493). Una sola roadmap-of-record,
> indici decisionali auto-generati. Intervieni nella fonte giusta; gli indici si aggiornano da soli.

## Dove vive la roadmap — UNA roadmap-of-record, 4 fonti

| Fonte                                                         | Ruolo                                                     | doc_status     |
| ------------------------------------------------------------- | --------------------------------------------------------- | -------------- |
| `docs/core/40-ROADMAP.md`                                     | orizzonte MVP→Alpha (scope lock + sprint cadence)         | ✅ active      |
| `BACKLOG.md` (root)                                           | Goals S/M/L + 🔴 Priorita alta = ticket operativi         | ✅ active      |
| `docs/planning/EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md`      | gate G0-G5 (governance→session→combat→balance→content→UX) | ✅ active      |
| `docs/planning/2026-05-30-design-data-gap-resolution-plan.md` | Wave 1-4 + grafo dipendenze = piano esecuzione corrente   | ✅ active      |
| `docs/planning/EVO_FINAL_DESIGN_MASTER_ROADMAP.md`            | **SUPERSEDED** (#2489) → banner punta a 40-ROADMAP        | ❌ NON toccare |

Definizione pilastri (il "perche"): `docs/core/02-PILASTRI.md`. Design canonico: `docs/core/00-SOURCE-OF-TRUTH.md` + numbered docs.

## La catena (cosa e collegato)

```
DESIGN (perche)          ROADMAP (cosa/quando)              DECISIONI (governance, AUTO-sync)
docs/core/ SoT      →    40-ROADMAP (horizon)          →    ADR docs/adr/        → DECISIONS_LOG (generato)
+ Pillars P1-P6          MILESTONES gate G0-G5              OD OPEN_DECISIONS    → lista "Aperte" (generata)
(02-PILASTRI)            gap-plan Wave 1-4                  docs                 → docs_registry (reconcile)
                         BACKLOG ticket
```

## Come intervenire — per intento

| Vuoi…                                | Edita                                                           | Effetto auto                                              |
| ------------------------------------ | --------------------------------------------------------------- | --------------------------------------------------------- |
| ri-prioritizzare / nuovo big-rock    | `docs/core/40-ROADMAP.md` (+ ticket in `BACKLOG.md`)            | — (PR doc normale, governance frontmatter)                |
| nuovo ticket operativo               | `BACKLOG.md` → 🔴 Priorita alta                                 | —                                                         |
| spostare un gate / DoD milestone     | `EVO_FINAL_DESIGN_MILESTONES_AND_GATES.md` (G0-G5)              | —                                                         |
| **decisione ambigua** apri/chiudi    | `OPEN_DECISIONS.md` con schema `<!-- od id=OD-NNN status= -->`  | lista "Aperte" **rigenerata** (gate R1 fail-on-diff + R7) |
| **decisione architetturale** formale | nuovo ADR in `docs/adr/`                                        | `DECISIONS_LOG.md` **rigenerato** da solo (husky + CI)    |
| design canonico (loop/specie/...)    | `docs/core/00-SOURCE-OF-TRUTH.md` + numbered                    | —                                                         |
| pillar status P1-P6                  | `docs/reports/PILLAR-LIVE-STATUS.md` (SOT unico, hand-attested) | — (NON le tabelle inline; freshness gate #2489)           |

## Regole d'oro (post-governance)

1. **NON editare a mano** `DECISIONS_LOG.md` ne la lista "Aperte" di `OPEN_DECISIONS.md`: sono GENERATI.
   Edita la fonte (ADR / commento `<!-- od -->`) + rigenera (`tools/generate_decisions_log.py` /
   `tools/generate_open_decisions.py`, o lascia fare al pre-commit husky). CI fa fail-on-diff.
2. Ogni heading `### [OD-NNN]` DEVE avere il commento `<!-- od -->` adiacente (gate R7), altrimenti CI rosso.
3. Warning `frontmatter_registry_mismatch` su doc → `python tools/docs_governance_migrator.py reconcile` (NON a mano).
4. Roadmap-item che si chiude → registralo dove serve: ticket BACKLOG closed (SHA), e se decisione → ADR o OD
   (l'indice si aggiorna da solo). NON lasciare il MASTER_ROADMAP superseded "aggiornato a mano".

## Cosa e cambiato (perche conta)

Prima: `MASTER_ROADMAP` hand-maintained, fermo 6 settimane = drift; `DECISIONS_LOG` diceva 43 ADR su 67 reali;
`OPEN_DECISIONS` lista "Aperte" 93% stale. **Ora**: una roadmap-of-record (40-ROADMAP) + indici decisionali
**proiezioni generate** con CI fail-on-diff → quando chiudi un item via ADR/OD l'indice si aggiorna, impossibile driftare.
Intervieni in **un** posto.

## Pillar status — CONSOLIDATO 2026-06-01 (generatore REJECTED)

Prima: status P1-P6 sparso su 3 superfici (CLAUDE.md ×12 sezioni + snapshot `02-PILASTRI` + `PILLAR-LIVE-STATUS.md`),
contraddittorie. Un 4° generatore e' stato **proposto e BOCCIATO** da harsh-review (over-engineering per 6 valori
soggettivi + il SOT esisteva gia'). **Soluzione = consolidamento**: SOT unico `docs/reports/PILLAR-LIVE-STATUS.md`,
snapshot inline rimossi, 11 sezioni sprint-context archiviate in `docs/planning/sprint-context-history.md`. Lo status
resta **hand-attested in un solo file**, tenuto onesto dal freshness gate #2489. **Pending master-dd**: riconciliare
lo stato reale P1-P6 nel SOT (3 superfici divergevano). Dettaglio:
[`docs/superpowers/specs/2026-06-01-pillar-status-autosync-scoping.md`](../superpowers/specs/2026-06-01-pillar-status-autosync-scoping.md).

## Riferimenti

- Spec governance auto-sync: `docs/superpowers/specs/2026-05-30-governance-auto-sync-design.md` (#2489) +
  `2026-05-31-open-decisions-projection-design.md` (#2492) + `2026-05-31-docs-registry-reconcile-design.md` (#2493).
- Tooling: `tools/generate_decisions_log.py`, `tools/generate_open_decisions.py`, `tools/docs_governance_migrator.py reconcile`.
