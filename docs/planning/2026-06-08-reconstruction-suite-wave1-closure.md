---
title: 'Evo-Tactics reconstruction-suite Wave-1 closure handoff'
date: 2026-06-08
type: session-handoff
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-08'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [evo-tactics, reconstruction, wave-1, handoff, spec-abcd, device-authority]
---

# Reconstruction-suite Wave-1 closure handoff (2026-06-08)

Stato di chiusura della Wave-1 "Contratti di esperienza" della roadmap
(`docs/planning/2026-06-05-evo-tactics-open-points-resolution-roadmap.md` sez. 4).
Tutti i contratti core sono su `main`, tutti i fork ratificati da Eduardo.

## 1. Stato Wave-1: COMPLETA su main

| Spec                              | Doc                                                                | PR                        | Stato fork                          |
| --------------------------------- | ------------------------------------------------------------------ | ------------------------- | ----------------------------------- |
| SPEC-A Device Input Ledger        | `docs/design/evo-tactics-device-input-ledger.md`                   | doc #2616 + backend #2618 | -- (no fork)                        |
| SPEC-B TV/Device Info Contract    | `docs/design/evo-tactics-tv-device-information-contract.md`        | #2617                     | F1-F6 ratificati                    |
| SPEC-C Phone WEGO Composer        | `docs/design/evo-tactics-phone-wego-composer.md`                   | #2619                     | G1-G5 ratificati                    |
| SPEC-D TV Cinematic Director      | `docs/design/evo-tactics-tv-cinematic-round-director.md`           | #2621                     | H1-H5 ratificati                    |
| SPEC-K Device-Authority Reconcile | `docs/design/evo-tactics-godot-device-authority-reconciliation.md` | (pre-esistente)           | taxonomie ratificate ADR-2026-06-07 |
| SPEC-L Runtime Feature Inventory  | `docs/design/evo-tactics-runtime-feature-inventory-reconcile.md`   | (pre-esistente)           | --                                  |

Backend (Gate-5 surface per i contratti):

| Build                                                              | PR    |
| ------------------------------------------------------------------ | ----- |
| SPEC-A ledger backend (schema/tier/engine)                         | #2618 |
| `/declare-reaction` route (chiude gap SPEC-C 4.9)                  | #2622 |
| `declareReaction` fix + `/preview-round` v2 (chiude gap SPEC-C G5) | #2623 |
| sprint-context repoint -> roadmap SPEC-A..L                        | #2620 |

ADR di backing: `ADR-2026-06-07-device-authority-tv-mirror-canon` (#2606).

## 2. Fork ratificati (16, Eduardo 2026-06-08)

Dettaglio + rationale nelle sez. "Decisioni aperte" dei rispettivi doc. Sintesi:

**SPEC-B (F1-F6)** -- pattern trasversale **opt-in self-disclosure** (il player puo'
promuovere i propri dati `private` a `public`, mai imposto):

- F1 Form Pulse: aggregato default + opt-in per-player.
- F2 voti: solo tally default + opt-in self-reveal del voto (pre/post commit).
- F3 campo battaglia TV: unione percettiva del branco (non onnisciente).
- F4 scambio carte: esito `public`, contenuto carta `private` tra i 2 trader.
- F5 consenso lethal: anonimo default + opt-in del coinvolto.
- F6 onboarding 3-scelte: `private` + opt-in (specchio F1).

**SPEC-C (G1-G5)**:

- G1 undo: per-intent (clear+replay con ledger AP locale).
- G2 fallback timeout: AI-suggested auto-commit (+ safeguard: trasparente, override dopo).
- G3 readiness: ready locale + contatore N/M monotono (no timing-tell).
- G4 preview: atteso+range come ghost-preview adattiva sul device (Into the Breach).
- G5 preview delivery: stima client-side v1 (porta aperta a `/preview-round` v2).

**SPEC-D (H1-H5)** -- tutti opzione A:

- H1 camera: salience-ranked (kill > reazione/combo > crit > normale > move).
- H2 ritmo: parallelismo cosmetico, ordine causale preservato.
- H3 sync: deterministica-locale.
- H4 battle feed: highlights + numeri opzionali.
- H5 recap: telegraph pubblico del round successivo (guard SIS-only).

## 3. Principi load-bearing emersi (riusabili in Wave-2)

- **Opt-in self-disclosure**: private di default, promozione a public solo player-initiated.
- **Asse ortogonale SPEC-K vs SPEC-B**: K = chi guida la surface; B = chi vede quale dato.
- **No-alter (SPEC-D)**: la regia TV e' cosmetica; l'event-log e' la verita'.
- **Ground-truth > spec intent**: l'harsh-review (ARCHON critic-redteam) ha beccato P1 di
  fedelta'-API su C+D (commit GLOBALE non per-player; `revealed_intents` = foresight
  telepatica non reveal WEGO; `threat_preview` dal begin-planning successivo). Verificare
  sempre sul codice reale (`roundOrchestrator.js`, `sessionRoundBridge.js`) prima di shippare.

## 4. Wave-2 (residuo roadmap) -- prossimo

| Spec   | Oggetto                                                             |
| ------ | ------------------------------------------------------------------- |
| SPEC-E | Nido groups, party select, tribe (gruppo sociale per-player)        |
| SPEC-F | Custode portable (Skiv template, memoria/resync/incontri/ritorno)   |
| SPEC-G | Tri-Sorgente esteso (reward + dottrina + scambio carte; chiude F4)  |
| SPEC-J | Lethal consent + wound rituals (per-player consent; chiude F5/3.10) |

Entry point: roadmap sez. 4 + i doc Wave-1 come riferimento (le Wave-2 ereditano
tassonomia SPEC-A, visibilita' SPEC-B, authority SPEC-K).

## 5. Note operative

- Tutti i doc Wave-1 restano `doc_status: review_needed` + `source_of_truth: false`:
  la DIREZIONE e i fork sono ratificati, la prosa resta rivedibile. Il flip ad `accepted`
  - `source_of_truth` e' Eduardo-gated (canon-status change).
- Governance: errors=0 su tutta la suite (warnings = backlog stale-doc progressivo, #2614).
- Lesson di sessione: dopo `EnterWorktree`, i path assoluti `C:\dev\Game\...` colpiscono
  il MAIN repo non il worktree -- usare path worktree-assoluti o relativi
  (`feedback_enterworktree_absolute_path_trap.md`).
