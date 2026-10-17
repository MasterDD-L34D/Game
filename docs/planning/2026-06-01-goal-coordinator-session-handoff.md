---
title: 'GOAL coordinator session handoff — PHASEC 22/32 + catalog + cross-session triage'
doc_status: active
doc_owner: claude-code
workstream: cross-cutting
last_verified: '2026-06-01'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [handoff, goal, phasec, symbiont, minion, catalog, cross-session]
---

# GOAL coordinator session handoff (2026-06-01)

> Sessione coordinatrice unica (master GOAL: PHASEC 32/32 + catalog + cross-session).
> Sopravvissuta a un BLACKOUT a metà B4a (WIP su disco intatto, zero perdita).
> Worktree seriale `C:/dev/_gamewt-phasec-cg` off `origin/main`.

## Shipped (MERGED su main)

| PR    | Squash     | Cosa                                                                                                              | Tag  |
| ----- | ---------- | ----------------------------------------------------------------------------------------------------------------- | ---- |
| #2538 | `6fcadecb` | A1b — phenotype_shift 1d6 table (Cat F **7/7**)                                                                   | +2   |
| #2539 | `868a72b4` | B4a — symbiont core + redirect (bond_redirect_strong, dual_bond, emergency_full_redirect, bond_no_distance_limit) | +4   |
| #2541 | `c70e1bf5` | B4b — symbiont support (bonded_proximity_defense, chain_heal_adjacent, bonded_death_grace) → symbiont **7/7**     | +3   |
| #2540 | `b9d731da` | Catalog audit doc + biome stress-profile readonly endpoint (A6)                                                   | wire |
| #2527 | (closed)   | PE-canon decision-doc — recommend-close (verdict A shipped #2528)                                                 | —    |

**Tag totale wired: 22/32.** Tutti band-neutral (symbiont/aberrant assenti dai sim party; AI 500/500 byte-identical). Ogni Codex P2 risolto.

## In-flight / held

- **#2542 V5 shared_hp_pool (capstone, +1 → symbiont 8/8) = DRAFT**. Core equal-split + both-KO + mutual-exclusion-con-redirect implementato (7 edge test, AI 500/500, combat-api 22/22 = nessuna party-wipe regression). **Tenuto draft** per 2 Codex P2 = death-semantics cross-module (phase-2 per spec #2530): (1) il bonus focus_fire/synergy applicato post-performAttack in `sessionRoundBridge.js` (~L438/L465) bypassa il pool; (2) su both_ko il counterpart muore senza emit kill/objective. Entrambi = **verdict death-semantics dedicato** (come dovrebbe un shared-pool interagire con focus-fire; un FRIENDLY pool-death deve emettere objective/pressure o basta il defeat sweep?). NON forzati a session-tail.

## Remaining → 32/32 (sequenza)

1. **V5 phase-2 death-semantics** (sblocca #2542): route bridge bonus through pool + emit counterpart KO. ~S, ma master-dd verdict su semantica.
2. **B5 minion (8 tag, +8 → 31)** [V4 COSTRUISCI, ma **SPIKE-POC-FIRST + coop-phase-validator-smoke gate**]. Ground-truth: `summon_companion` = self-buff no-op (zero handler backend); `owner_id`/`is_minion` NON esistono; defeat/lose-condition in `routes/session.js`. V4 = `controlled_by 'player' + owner_id` → "morte espendibile (NON party-wipe)" RICHIEDE un'esclusione minion nel defeat count = **superficie co-op P5 regression** → coop-smoke OBBLIGATORIO. Blast-radius ALTO (~5 sessioni: nuovo unit type + AI scriptata + pack_command + spawn-adiacente + resurrect + agisce nel turno BM). Tag: max_minions, minion_attack_buff, minion_resurrect_chance, encounter_start_buff_minions, pack_command_extended_range, alpha_pack_buff, minion_proximity_dmg, minion_kill_pe_bonus.
3. **V6 first_kill_pe_bonus (+1 → 32)** [DOPO B5]. `grantXpToSurvivors` ESISTE in progressionApply → V6 = aggiungere param `perUnitBonus` + canale debrief `first_kill_actor_id`. minion_kill_pe_bonus dipende da B5.

## Cross-session triage (NON clobbered)

- **#2509 GAP-C** = OWNER ATTIVO (ha fixato il proprio Codex P2 alle 18:28Z mentre lavoravo) → NON mergiato (collision-avoidance: branch-delete = clobber sessione attiva); owner si auto-mergia. Pronto (CLEAN + thread risolto).
- **D4 18 draft** = **band-NEUTRAL by code**: HC06/HC07 hardcoded biome `rovine_planari` (hardcoreScenario.js:31,287), disgiunto dai 18 biomi draft → il gate G3 HC06/HC07 band-verify è DEGENERE (zero signal). Promote = catalog-write canonico owner-gated su gate degenere → **SURFACED, non auto-promosso**. Raccomandazione: band-verify ogni draft vs lo scenario che USA il suo bioma (es. `badlands_pilot_01`→badlands), oppure direct-promote (nessuna regressione HC). `rovine_planari` off-limits (D6).
- **#2535/#2532** OD-058 (woundSystem engine + docs, combat altra sessione) + **#2536** (species-enrichment + MIGRATION = forbidden path) = lasciati intatti (coordina, non tocca).
- **#2512** weekly drift audit = low-touch, lasciato.

## Resume trigger (next session)

> _"riprendi GOAL PHASEC: V5 #2542 phase-2 death-semantics (bonus-through-pool + counterpart-KO emit) → B5 minion spike POC (summon_companion spawn + owner_id + defeat-exclusion) + coop-phase-validator smoke → B5 8 tag → V6 first_kill_pe campaign-XP. Memory project_phasec_job_perks_plan.md ha il dettaglio."_

Memory aggiornata: `~/.claude/projects/C--dev-Game/memory/project_phasec_job_perks_plan.md` (sezione "SESSION 2026-06-01 (GOAL coordinator)").
