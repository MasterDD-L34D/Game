---
title: 'Pillar-status: generator REJECTED → consolidation (follow-up #2489, 3rd target)'
workstream: ops-qa
category: spec
doc_status: active
doc_owner: claude-code
last_verified: '2026-06-01'
source_of_truth: false
language: it
review_cycle_days: 60
tags: [governance, anti-drift, pillar-status, consolidation, follow-up-2489, sprint-context]
---

# Pillar-status — generator REJECTED, consolidation instead

> Terzo target anti-pattern #19 (dopo DECISIONS_LOG #2489, OPEN_DECISIONS #2492, registry-reconcile #2493).
> **Lo scoping originale (un 4° generatore) e' stato BOCCIATO da harsh-review SDMG — giustamente.**
> Premessa originale FALSA: il SOT pillar esiste gia'. Niente generatore; il fix e' consolidamento.

## Harsh-review — VERDICT: REJECT-REDESIGN (ARCHON critic 4-pass, 2026-06-01, adottato)

Lo scoping v1 proponeva `tools/generate_pillar_status.py` + fail-on-diff. Il critic ha trovato (verificato su file reali):

1. **Premessa FALSA** (EMPIRICA-1, 🔴): `docs/reports/PILLAR-LIVE-STATUS.md` **esiste gia'** —
   `source_of_truth: true`, registry-tracked, tabella P1-P6 + Update protocol, designato SOT runtime dal
   2026-04-28 (drift audit Opzione B). Lo scoping v1 grep-o' `data/`/`packs/` (dir sbagliate) e dichiaro'
   "nessuna sorgente machine-readable" → **anti-pattern #8 (ground-truth non verificato)**. Il SOT non va
   creato: va **ravvivato + applicato**.
2. **fail-on-diff vacuo per un giudizio soggettivo** (LOGICA-2, 🔴): il gate cattura solo "hai editato la
   proiezione invece della sorgente", **NON** "lo status e' stale/sbagliato" — il drift reale. Lo strumento
   anti-stale corretto e' il **freshness gate** (gia' costruito #2489: warn/fail su eta' `last_verified`).
   `PILLAR-LIVE-STATUS.md` e' gia' a 2026-05-06 / review_cycle 7 → >2x stale → il gate gia' lo segnalerebbe.
3. **Over-engineering** (ALT-1, 🔴): 6 righe soggettive, low-frequency. Un 4° generatore + CI + husky per
   evitare di ri-digitare 6 celle in 2 posti = sproporzionato vs #2489 (67 ADR fattuali, high-churn).
4. **`data/derived/` = category error** (VALORI-1, 🔴): un giudizio umano autorato NON e' derived-data.
5. **3 superfici contraddittorie** (EMPIRICA-3): CLAUDE.md prosa (×12 sezioni, L858 P1🟢 vs L939 "HONEST
   CHECK" P1🟡) + snapshot inline `02-PILASTRI.md` + `PILLAR-LIVE-STATUS.md` → la migrazione e' una
   **riconciliazione manuale master-dd**, non un'estrazione 6-righe "latest-wins".

(Errore del critic, per onesta': EMPIRICA-5 diceva "#2492 generator assente su main" — falso, ha letto il
clone su branch `claude/fix-ecotypes-enum` stale; verificato: `generate_open_decisions.py` + marker SONO su
main. I finding core 1-5 reggono comunque.)

## Soluzione adottata — CONSOLIDAMENTO (zero nuovo tooling)

1. **SOT unico** = `docs/reports/PILLAR-LIVE-STATUS.md` (gia' esiste, `source_of_truth: true`).
2. **De-dup superfici** (FATTO in questo PR):
   - `02-PILASTRI.md`: snapshot inline RIMOSSO → solo pointer al SOT.
   - `CLAUDE.md`: 11 sezioni sprint-context storiche + pillar-audit 2026-04-20 archiviate in
     `docs/planning/sprint-context-history.md`; resta solo la sprint-context corrente + un pointer al SOT.
     (CLAUDE.md 1283 → 588 righe: de-bloat + de-drift; zero info lost.)
3. **Riconciliazione stato reale P1-P6** = **GATED master-dd** (giudizio soggettivo su 3 superfici
   contraddittorie). NON autonomo. Output atteso: `PILLAR-LIVE-STATUS.md` freshato + `last_verified` bump.
4. **Freshness gate** (gia' #2489): punta al SOT; quando stale, segnala (warn graduato). Nessun fail-on-diff.
5. **Niente `generate_pillar_status.py`.** Niente `data/derived/pillar_status.yaml`.

## Stato

- ✅ FATTO (questo PR): 02-PILASTRI de-dup + CLAUDE.md archive + questo spec corretto + guida roadmap.
- 🧑 PENDING master-dd: riconciliare lo stato reale P1-P6 in `PILLAR-LIVE-STATUS.md` (3 superfici divergono)
  - bump `last_verified`. Poi il freshness gate #2489 lo tiene onesto.
- (Opzionale futuro) escalare il freshness gate a fail-tier SOLO per il SOT pillar, se warn non basta — ma
  #2489 ha deliberatamente tenuto freshness = warn globale; da valutare separatamente.

## Riferimenti

- Famiglia #2489: `2026-05-30-governance-auto-sync-design.md` + `2026-05-31-open-decisions-projection-design.md`
  - `2026-05-31-docs-registry-reconcile-design.md`. Guida: `docs/guide/roadmap-intervention.md`.
- SOT pillar: `docs/reports/PILLAR-LIVE-STATUS.md`. Def: `docs/core/02-PILASTRI.md`. Archivio: `docs/planning/sprint-context-history.md`.
