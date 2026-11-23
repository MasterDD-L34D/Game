---
title: Handoff sessione 2026-06-16 -- cron fix + #2744 pressure_tier + #1673 BiomeMemory
date: 2026-06-16
sprint: maintenance-frontier
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-06-16'
source_of_truth: false
review_cycle_days: 30
language: it
---

# Handoff sessione 2026-06-16

## TL;DR

- 4 PR mergiati: 2 cron CI rotti riparati (verde live), #2744 `pressure_tier_floor` A1 (dati) + A2 (spec), #1673 BiomeMemory cross-ref + correlazione.
- Recovery di un checkout `C:/dev/Game` gutato (652 file ripristinati, zero perdita) + main sincronizzato.
- Pulizia: 2 issue-rumore chiuse, 3 stash vecchi + 50 branch morti + 1 worktree stale rimossi.
- 2 Codex P2 verificati ground-truth (entrambi CORRETTI) + indirizzati.

## PR mergiati (4)

| PR    | Scope                                                      | SHA      | Note                                                       |
| ----- | ---------------------------------------------------------- | -------- | ---------------------------------------------------------- |
| #2767 | fix CI cron evo-rollout-status + daily-tracker-refresh     | e959d35f | mkdir parent (script) + commit via PR; verde live dispatch |
| #2769 | #2744 A1: `pressure_tier_floor` schema + 10 YAML           | 48637eb3 | backport campo Godot-only; CI green                        |
| #2770 | #1673 BiomeMemory correlazione (OD-059 + museum + BACKLOG) | d178c59c | doc-only; Codex P2 campaign-scoped indirizzato             |
| #2771 | #2744 A2 spec: pressure_tier backend Sistema mirror        | 5ae999ff | doc-only; Codex P2 computeSistemaTier gate indirizzato     |

## PR aperte residue (master-dd)

- **#2768** chore: daily tracker index refresh (auto-PR generata dal fix cron -- conferma che la pipeline funziona; merge).
- **#2765** chore(governance): weekly drift audit 2026-06-15 (auto, finalize/merge).

## Findings durevoli

- **#1673 BiomeMemory**: NON coperta da nessuna SPEC A..Q. Correlato reale = primitivo runtime `FormSessionState.cumulativeBiomeTurns` (`schema.prisma:294`, migration 0007) -- ma **session-scoped** (key `(sessionId, unitId)`, sessionId fresh per combat, write + carry-over orfani; label `cross_session` aspirazionale). Reuse richiede layer **campaign-scoped/carry-over** (keyed `(campaign_id, unit)`). Tracciato OD-059 (open, P2). Resta parked M12+.
- **#2744 pressure_tier_floor**: campo Godot-v2 (TKT-PRESSURE-TIER-ENCOUNTER, PR #221 shipped Godot). A1 (dati) DONE. A2 (backend mirror) = SPEC `docs/design/2026-06-16-pressure-tier-floor-backend-mirror.md` (draft). Gate canonico backend = `computeSistemaTier`/`SISTEMA_PRESSURE_TIERS` (`sessionHelpers.js:751`, gate intents + reinforcement_budget + intent_types).

## Blockers residui / next entry

1. **A2 BUILD** (gated approvazione master-dd): impl della spec -- helper unico `effectivePressure(p, floor)` applicato a TUTTI i siti (computeSistemaTier/publicSessionView + reinforcement budget + aiProgressMeter + declareSistemaIntents), flag-gated `PRESSURE_TIER_FLOOR_ENABLED` OFF, poi N=40 band-verify + ratifica valori floor.
2. **item-1 flip SPEC**: ~12 SPEC `review_needed`; next candidate SPEC-K (Godot audit) o design-puri F/G/H/J/Q. Verify-first gate per-SPEC.
3. **item-3 Godot** (cross-repo Game-Godot-v2): device char-creation; route-choice UI #2594 -> sblocca flip `META_NETWORK_ROUTING`.
4. **design-call (decisione master-dd)**: hc06 steep-lever (banda piu' larga / knob piu' piatto); A13 3 domande ratifica magnitude; disposition OD-059 (#1673).

## Reference

- Sessione precedente: `docs/planning/2026-06-14-issue-2746-coop-ws-closure-handoff.md`.
- Recovery lesson: shared-cwd contamination (L-067) -- checkout `C:/dev/Game` gutato da sessione concorrente; usare worktree isolati per ogni sessione.

## Memory candidates

- [x] `feedback_respond_italian_concise_chat.md` (chat IT + conciso) -- SALVATO.
- [x] `project_biomememory_1673_correlation.md` (#1673 finding) -- SALVATO.
