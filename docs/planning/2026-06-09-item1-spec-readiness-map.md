---
title: 'Item 1 spec-readiness map -- 17 SPEC review_needed -> active'
date: 2026-06-09
type: session-handoff
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-10'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [evo-tactics, reconstruction, item1, doc-status, governance, spec-readiness]
---

# Item 1 spec-readiness map (2026-06-09)

> **CHECKPOINT 2026-06-10 (sera): questa mappa e' BASELINE STORICA** -- scritta il
> 2026-06-09, superata dagli eventi della mega-sessione 2026-06-10 (L-075: la tabella
> sotto dice ancora "NO flip" per spec ormai active). Stato flip REALE = registry
> (`doc_status`): **6/17 active** (I/K/L/M/N/O). I gate citati sotto per I/M/O sono
> PASSATI (N=40 #2725 + #2701 + #2669/#2670); restano 11 review_needed
> (A/B/C/D/E/F/G/H/J/P/Q) -- per il prossimo flip usare verify-first sul gate +
> registry-sync atomico (pattern #2689), NON questa tabella.

Item 1 = portare le 17 `docs/design/evo-tactics-*.md` da `doc_status: review_needed`
allo stato "done". Questa mappa dice QUALI sono davvero flippabili e CHE gate le blocca.
Git-verificato contro main `fbf6033c6` (post #2664-#2671 + Lenovo #2669/#2670). La roadmap
2026-06-05 (status DESIGN-ONLY/PARTIAL) e' BASELINE stale per le spec avanzate dalla sessione
(L-075: marker != verita').

## 0. Catch terminologia (load-bearing)

Il target NON e' `accepted` -- `accepted` non e' in `docs_registry.json["doc_status_values"]`
(`[active/draft/review_needed/legacy_active/generated/historical_ref/superseded]`) -> flippare
a `accepted` = governance ERROR `invalid_doc_status` (`check_docs_governance.py:204`). **Done = `active`.**

## 1. Mappa per-spec

| Spec                             | Residuo principale                                                               | Gate                                    | -> `active`?                  |
| -------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------- | ----------------------------- |
| SPEC-A Device Input Ledger       | superficie device/TV Godot (backend #2618 LIVE)                                  | item 3                                  | NO                            |
| SPEC-B TV/Device Contract        | A1/A7/A8/B6 surfaces                                                             | item 3                                  | NO                            |
| SPEC-C WEGO Phone Composer       | B7-9 / C1-4 / C10 (molti, surface+impl)                                          | item 3 + impl                           | NO                            |
| SPEC-D Cinematic Round Director  | animation planner Godot sopra event-log                                          | item 3                                  | NO                            |
| SPEC-E Nido / Tribe              | B1-5 / C6-8 + Nido phone authority                                               | item 3 + impl                           | NO                            |
| SPEC-F Custode Portable          | estrazione/memoria/resync (B14)                                                  | design/impl                             | NO                            |
| SPEC-G Tri-Sorgente              | B13 (palette LIVE) / C9 voice profiles                                           | impl                                    | NO                            |
| SPEC-H ALIENA Enforcement        | B14 progressive wiki (Hades Codex)                                               | design/impl                             | NO                            |
| SPEC-I ERMES Runtime Pressure    | A2/A9/B6 surface + **N=40** (A13 built)                                          | item 2 + item 3                         | NO                            |
| SPEC-J Lethal Wounds / Rituals   | scar/wound ritual impl                                                           | design/impl                             | NO                            |
| SPEC-K Godot Device-Authority    | K-01..K-07 audit Godot                                                           | **item 3** (Lenovo Godot)               | NO                            |
| SPEC-L Runtime Feature Inventory | matrice di riferimento (living doc)                                              | manutenzione                            | **FORSE** (e' una ref-matrix) |
| SPEC-M Onboarding Identity       | Form Pulse UX (Godot) + name_pool **N=40** (FP->VC/branco #2666 backend dormant) | item 2 + item 3                         | NO                            |
| SPEC-N Localization i18n         | PR-5 split-namespace TODO + EN ~5% (fondazione+PR-4 migr **DONE** #2664/#2671)   | judgment-call                           | **CANDIDATA**                 |
| SPEC-O Mission Template Library  | OA2 band sabotage/escape DRAFT **N=40** (6 tipi LIVE)                            | **item 2** (Lenovo attivo, #2669/#2670) | NO (vicina)                   |
| SPEC-P Failure-as-Lore           | Memory-mode chronicle VIEWER Godot (backend M-7 4/4 **DONE** #2668)              | item 3                                  | NO                            |
| SPEC-Q DF-levels                 | M-1/M-4/M-5/M-6 non costruite (M-2/M-3/M-7 done)                                 | design/impl                             | NO                            |

## 2. Verdetto

- **0 spec "tutto-fatto"**: anche la piu' avanzata (SPEC-N) ha PR-5 + EN forward-work.
- **item 3 (Godot, NON partito) e' il gate dominante**: blocca SPEC-A/B/C/D/E/K/M/P (8).
- **item 2 (N=40, Lenovo attivo)** blocca SPEC-I/M/O -- O e' la piu' vicina (Lenovo sta ratificando).
- **Design/impl puro** (no item 2/3): SPEC-F/G/H/J + SPEC-Q (M-1/4/5/6).
- **Candidate flip-`active` adesso** (judgment-call master-dd):
  - **SPEC-N**: fondazione i18n + loader + migrazione label-map DONE; PR-5 (split-namespace) + EN-completion = forward-work tracciato, fallback IT graceful (un EN player vede IT). Se "done = la fondazione" -> flippabile; se "done = anche split+EN" -> no.
  - **SPEC-L**: e' una ref-matrix (inventario runtime), non un engine con residui; come living-doc puo' essere `active`.

## 3. Quando item 1 diventa azionabile

Spec-per-spec, man mano che i gate chiudono:

1. **Subito (se master-dd OK)**: SPEC-N (fondazione) + SPEC-L (matrix).
2. **Appena Lenovo chiude item 2 (N=40)**: SPEC-O (band ratificata), poi SPEC-I (con A13/N=40).
3. **Quando item 3 (Godot) avanza**: SPEC-K -> A -> B/M/P/D/E (le superfici device/TV).
4. **Dopo impl design-only**: SPEC-F/G/H/J + SPEC-Q residui.

## 4. Meccanica del flip (per ogni spec, quando azionabile)

1. frontmatter `.md`: `doc_status: review_needed` -> `active`.
2. **registry-sync atomico** stessa PR: `docs/governance/docs_registry.json` entry corrispondente (`tools/docs_governance_migrator.py` per bulk).
3. `python tools/check_docs_governance.py --strict` -> errors=0.
4. coerenza authority A0-A5: supersessioni A3 riconciliate (es. MA1 superseded `51-ONBOARDING`).
5. sync index/roadmap (anch'essi `review_needed`).
