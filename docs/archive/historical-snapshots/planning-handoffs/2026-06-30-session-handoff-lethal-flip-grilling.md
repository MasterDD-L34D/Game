---
title: '2026-06-30 session handoff -- SPEC-J LETHAL flipped LIVE + Tier-3 value-pick grilling'
workstream: ops-qa
category: process
doc_status: active
doc_owner: claude-code
last_verified: '2026-06-30'
language: en
---

# 2026-06-30 handoff -- LETHAL flipped LIVE prod + Tier-3 value-pick verdicts

> **Resume entry-point**: this doc + [close-out master plan](2026-06-29-closeout-master-plan.md)
>
> - [residual-gate register](2026-06-23-residual-gate-register.md). Memory:
>   `project_closeout_master_plan`, `project_spec_j_lethal_wounds`,
>   `project_form_pulse_v2_flip_readiness`. The continuation chip drains the value-picks below.

## TL;DR

- **SPEC-J LETHAL FLIPPED LIVE PROD** (permadeath active; reversible). Tier-3 N1 DONE.
- Tier-3 N=40 stale-marker reconciliation: ER7 / A2 / DR2 / interoception were ALREADY done
  (git=truth) -- not open. STAMINA + HA1 measured this session.
- **6 grilling verdicts** (master-dd, 2026-06-30) set the continuation work: focus = drain
  owner-value-picks (NOT the W5 build).

## Done this session (merged)

| PR    | what                                                                                               |
| ----- | -------------------------------------------------------------------------------------------------- |
| #3107 | first lethal encounter L'Ultima Caccia + schema `lethal` field (KO-gate 0.344/0.40, hardcore band) |
| #3108 | STAMINA_FATIGUE paired N=40 band-safety evidence (band-SAFE, net-neutral)                          |
| #3109 | HA1 aliena_enforcement strength evidence (guardrail, inert on real pools, flip-safe)               |
| #3110 | STAMINA evidence provenance fix (commit-pin + flag in summary; Codex 2-round)                      |
| #3112 | L'Ultima Caccia scenario-builder (`ultimaCacciaScenario.js` + /api/tutorial route) + canonical WR  |

All Codex threads reply+resolved (0 unresolved). cavecrew-clean on the code PRs.

## The FLIP (prod, master-dd authorized "eseguo flip completo")

Host CODEMASTERDD (canonical prod). Prod was DOWN + 41 commits behind -> a FULL deploy, not 1 flag:

1. `git checkout --detach origin/main` in `/c/dev/_gamewt-lenovo-host` (f859817d; package.json
   unchanged -> no npm ci).
2. `~/.config/api-keys/keys.env` += `export LETHAL_MISSIONS_ENABLED=true` (the `export` form is
   load-bearing: `start-evo-backend.cmd` does `source keys.env && npm run start:api`).
3. `Start-ScheduledTask EvoTacticsBackend`.
4. VERIFIED: ports 3334+3341 up; `GET /api/tutorial/enc_badlands_ultima_caccia_01` -> lethal:true
   - 9 units; `POST /session/start` -> `state.lethal:true`. Permadeath LIVE (KO player-creature +
     consent -> real death). REVERSIBLE: keys.env=false + restart.

🔑 **STAMINA caveat**: `export STAMINA_FATIGUE_ENABLED=true` was ALSO added to keys.env (master-dd
authorized carrier-independent), BUT the running prod (PID started for LETHAL) did NOT pick it up --
a 2nd `Start-ScheduledTask` while the task is already Running is a no-op (no force-restart was done
to avoid risking the LETHAL-live prod). STAMINA activates on the NEXT genuine prod restart. It is
cosmetic (net-neutral), so no urgency.

## Grilling verdicts (master-dd, 2026-06-30) -- the continuation work-list

1. **Focus** = drain owner-value-picks (NOT the W5 sim-harness build).
2. **HA1** = ratify `strength 0.5`, **guardrail-LATENT** (do NOT enable on any encounter; it is
   inert on coherence-uniform pools anyway -> stays machinery-ready for future procedural pools).
   Action: document the ratify; remove HA1 from the open N=40 lane.
3. **STAMINA** = keep **carrier-independent** (accept it is cosmetic flavor; do NOT switch to
   player-only). Already authorized for prod (latent, see caveat).
4. **ER6** = **BUILD carry-over** (unspent overrun reinforcement budget accumulates to the next
   round). reinforcementSpawner change + N=40 (provisional without W5).
5. **D6** imprint mapping = **ratify the #3114 menu** (4 cells, liveness-HARD-gated):
   offense/RAPIDA=`dilatazione_temporale_percettiva`, defense/FLESSIBILE=`risposta_di_fuga`,
   senses/LONTANO=`senso_magnetico`, senses/ACUTO=`occhi_analizzatori_di_tensione`. Wire + N=40.
6. **D8** chain-lightning caps = **3/2** (maxDepth 3, shock 2). N=40 on an electrified encounter
   -> flip `TERRAIN_CHAIN_LIGHTNING_ENABLED`.

> **W5 caveat (shared long-pole)**: master-dd chose to drain the value-picks BEFORE building W5
> (the objective-aware/positioning sim-harness). So the D6/D8/ER6 N=40s above run on the CURRENT
> passive-AI harness = PROVISIONAL bands (the Form-Pulse grilling rejected passive-AI flips for
> power-sensitive mechanics). Flip D8 only if band-safe AND master-dd accepts provisional; D6 power
> ratify stays provisional until W5. See `project_form_pulse_v2_flip_readiness` (W5 = W6 prereq too).

## Completed-plan links

- [Close-out master plan](2026-06-29-closeout-master-plan.md) -- Tier-3 N1 (LETHAL) now DONE+FLIPPED.
- [Residual-gate register](2026-06-23-residual-gate-register.md) -- SPEC-J gate closed.
- `docs/design/evo-tactics-lethal-wounds-rituals.md` -- SPEC-J spec (fully shipped + flipped).
- `docs/playtest/2026-06-30-ultima-caccia-lethal-calibration.md` + `...-canonical-wr.md` -- KO/WR evidence.
- `docs/playtest/2026-06-30-stamina-fatigue-n40-evidence.md` + `...-ha1-aliena-enforcement-evidence.md`.
- `docs/planning/2026-06-30-form-pulse-trait-v2-flip-readiness-build-spec.md` -- W1-W4 done (#3113), W5/W6 parked.

## Next entry point (the continuation chip)

Drain the value-picks in order of effort: (a) doc the HA1 strength-0.5 ratify + STAMINA verdict
(cheap); (b) BUILD ER6 carry-over + N=40; (c) wire D6 #3114 menu (liveness-gated) + N=40; (d) build
D8 3/2 + N=40 + flip if band-safe. All provisional-band caveated (W5 not built). Then W5 becomes the
next long-pole (unblocks Form-Pulse W6 + rigorous re-ratify of D6/D8/ER6 bands).
