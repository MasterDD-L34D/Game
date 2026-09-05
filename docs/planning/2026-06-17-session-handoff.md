---
title: Handoff sessione 2026-06-17 -- 14 PR (cron + recovery + A2 + item-1 flip 11/17 + chips P/Q)
date: 2026-06-17
sprint: maintenance-frontier
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-17'
source_of_truth: false
review_cycle_days: 30
language: it
---

# Handoff sessione 2026-06-17

Continua + chiude `docs/planning/2026-06-16-session-handoff.md` (stessa sessione lunga, autonomia formale concessa a meta'-corsa).

## TL;DR

- **14 PR mergiate** (06-16/06-17). 2 cron CI riparati; #1673 + #2744(A2) chiusi; item-1 flip **9->11/17 active**.
- **A2 `pressure_tier_floor`** completo end-to-end: A1 dati + spec + build (flag-gated OFF) + N=40 evidence + caverna fix. **Flip-ON = mani prod (tue)**.
- **item-1**: flippati C/D/E (verify-first workflow) + P/Q (chip build + verify). 6 blocked restanti (build-vero/cross-repo).
- 5 Codex P2 verificati ground-truth e indirizzati; 2 workflow multi-agente + 3 chip; recovery checkout gutato (652 file).

## PR mergiate (14)

| PR    | Scope                                       | SHA      |
| ----- | ------------------------------------------- | -------- |
| #2767 | fix CI cron evo-rollout + daily-tracker     | e959d35f |
| #2769 | #2744 A1 pressure_tier_floor schema+10 YAML | 48637eb3 |
| #2770 | #1673 BiomeMemory correlazione (OD-059)     | d178c59c |
| #2771 | #2744 A2 spec backend Sistema mirror        | 5ae999ff |
| #2772 | handoff 2026-06-16                          | 3b16910d |
| #2768 | tracker auto (dal fix cron)                 | (auto)   |
| #2773 | #2744 A2 build (flag-gated)                 | 2a7f3853 |
| #2774 | #2744 A2 N=40 evidence + probe              | 622cdb40 |
| #2775 | enc_caverna_02 loss_conditions.time_limit   | 7efb2c90 |
| #2776 | item-1 flip C/D/E -> active                 | 747f4b9d |
| #2777 | SPEC-P anti-brick test + #5/#2 reconcile    | (chip)   |
| #2778 | SPEC-Q M-1/M-4/M-6 gates                    | 3c15e309 |
| #2779 | CI: wire orphaned worldgen tests            | (chip)   |
| #2780 | item-1 flip P/Q -> active                   | 88941501 |

## Stato item-1: 11/17 active

**active (11)**: I, K, L, M, N, O, C, D, E, P, Q.
**blocked (6)** -- build-vero/cross-repo (verificati, mappa):

- **A2** (=self-titled SPEC-K): build Godot inerte (0 surface_role, PhoneNidoView read-only, world_confirm host-only). Cross-repo Game-Godot-v2.
- **B** tv-device-info: crit#3 leak Godot gated su SPEC-K + flip riservato a Eduardo.
- **F** custode-portable: route HTTP `/crossbreed` + `/share` assenti (store v0.2.0 LIVE).
- **G** tri-sorgente: `power_level` 0 hit in `data/core/rewards/` + test anti-agency assente (valori = design-call).
- **H** aliena-enforcement: N=40 ALIENA pilot + authoring-gate 6-dim inesistenti (piu' lontana).
- **J** lethal-wounds: layer lethal/consenso/rituali/succession = 0 codice (build grosso).

## A2 -- completo, flip = tue mani

Meccanismo verificato (fire-check: floor 1->Calm..4->Critical via backend), balance-safe N=40 (flag OFF byte-identical), caverna artefatto rimosso. Flip-ON owner-hands:
`PRESSURE_TIER_FLOOR_ENABLED=true` in `~/.config/api-keys/keys.env` + restart backend prod (Lenovo). Magnitudine rivista post-playtest Godot #2.

## Decision backlog (gated -- master-dd)

1. **A2 flip-ON** (env-var, tue mani).
2. **hc06 steep-lever**: (A) banda 15-30% asimm. + (B2) gate policy random / (C) status quo. (dossier 2026-06-17)
3. **A13 magnitude**: gia' RATIFIED-PROVISIONAL #2710 (3 domande verdettate); definitiva = serve player-data umana.
4. **OD-059 #1673**: A (reuse cumulativeBiomeTurns + carry-over campaign-scoped) / C (parked). Default C.
5. **Q flag** `SISTEMA_HIDDEN_ABILITY_REVEAL` + soglia (default 3): owner-gated post data-authoring + surface ALIENA.
6. **SPEC-A flip** (ready, build-type, saltato): -> 12/17 su tuo OK.
7. **item-3 Godot** (cross-repo): device char-creation + route-choice UI #2594 (sblocca flip META_NETWORK_ROUTING).

## Next entry (build autonomo possibile)

- Chip blocked vicini: **F** (route /crossbreed + /share) poi **G** (power_level + test). H/J = build grossi.
- Oppure: chiudere le design-call sopra per sbloccare i prossimi.

## Memory aggiornata

`feedback_respond_italian_concise_chat`, `feedback_autonomy_merge_agents_grant`, `project_a2_pressure_tier_n40`, `project_biomememory_1673_correlation`. Protocollo domande = `feedback_decision_handoff_protocol` (BLUF + AskUserQuestion + `vai`/`stop`).
