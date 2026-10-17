---
title: 'Handoff 2026-06-02 — H2 economy COMPLETE + full-loop AI-playtest runner MVP (build)'
date: 2026-06-02
type: session-handoff
doc_status: active
doc_owner: master-dd
workstream: ops-qa
last_verified: '2026-06-02'
source_of_truth: false
language: it
review_cycle_days: 30
tags: [handoff, full-loop, ai-playtest, economy, runner, meta-loop, pending-build]
---

# Handoff 2026-06-02 — full-loop AI-playtest runner (build sessione)

> Continuazione del GOAL design-closure (`docs/planning/2026-06-02-design-closure-goal.md`). Questa sessione
> ha chiuso **H2 economy** (Fase-2) e poi ha **costruito il full-loop AI-playtest runner** fino a un MVP che
> gioca il meta-loop completo. Memory: `~/.claude/projects/C--dev-Game/memory/project_full_loop_ai_playtest_runner.md`
>
> - `feedback_ai_playtest_is_the_nord.md` + `project_design_closure_2026_06_02.md`.

## TL;DR (30s)

L'AI ora gioca il **loop intero** end-to-end: `campagna → combat REALE → advance(esito vero) → Nido recruit →
choose → completed`. Era il Nord-gap (meta-loop non-AI-played); **chiuso a livello MVP**. 7 PR (6 merged + 1
open). 12/12 sim test. **Codex down** (usage limit) → #2563 lasciato OPEN per review al ritorno.

## PR della sessione

| #     | SHA        | Cosa                                                                 | Stato     |
| ----- | ---------- | -------------------------------------------------------------------- | --------- |
| #2557 | `9b057ccd` | H2 PT economy slice (ptTracker per-round pool + cost-gate)           | ✅ merged |
| #2558 | `1e202354` | Rescale verdict (KEEP consume-all) + docs + museum M-2026-06-02-002  | ✅ merged |
| #2559 | `40620bcc` | Full-loop AI-playtest runner — design spec (grounded, 2 round Codex) | ✅ merged |
| #2561 | `723b8548` | fase-0: combat-policy + combatAdapter (Option B refined)             | ✅ merged |
| #2562 | `c151ce29` | fase-1b-1: campaign+combat join (real outcomes vs faked)             | ✅ merged |
| #2563 | (open)     | fase-1b-2: Nido meta-step (greedy recruit)                           | 🔵 OPEN   |

**H2 ECONOMY COMPLETO**: SG (#2554) + PP (#2555) + PT (#2557) cost-gate tutti live + rescale deciso.

## Full-loop runner — stato (cosa esiste, `tools/sim/`)

- `combat-policy.js` — `dist`+`selectPlayerAction` puri (estratti da `tests/smoke/ai-driven-sim.js`, riusati).
- `combat-adapter.js` — `runEncounter(http,{roster,enemies,scenarioId,seed,maxRounds})` → `/session/start`
  col roster reale (no co-op) + loop → `{outcome,rounds,rosterIds,survivorIds}`. **Codex P2 fixati**: campo
  `seed` (non `run_seed`, session.js:1637) + move `position` (non `target_position`, session.js:2310) +
  `/turn/end` su non-2xx.
- `campaign-driver.js` — wrappers `/api/campaign/{start,summary,advance,choose}`.
- `full-loop-invariants.js` — puro: advance==200, outcome valido, pe≥0, identità-roster.
- `greedy-policy.js` — `chooseRecruits` (struttura per `chooseMatings`/`spendAffinity`).
- `full-loop-runner.js` — `runFullLoop(http,{playerId,roster,branchKey,seed})`: orchestratore cave_path +
  `applyMetaStep` (recruit additivo su victory). Ritorna `{completed,chapters,violations,recruited,metaViolations,finalRoster}`.

Test: `tests/sim/*.test.js` = **12/12** (combatPolicy 4 + combatAdapter 2 + invariants 3 + runner 1 + greedy 2).
Harness: `createApp({databasePath:null})` + supertest (no WS/lobby).

## API seam verificate (verify-first, da non rifare)

- Campaign: `POST /api/campaign/start {player_id}→{campaign:{id}}` · `GET /api/campaign/summary?id→{current_encounter:{encounter_id},campaign}`
  · `POST /api/campaign/advance {id,outcome,pe_earned,survivors}→{choice_required?,next_encounter_id?,campaign_completed?}`
  · `POST /api/campaign/choose {id,branch_key}`. createApp monta campaign a `/api` (app.js:792).
- Meta/Nido a **`/api/meta/*`** (via `pluginLoader.js:64-65`, plugin `meta`): `POST /api/meta/recruit
{npc_id,affinity_at_recruit,campaign_id}` (affinity_at_recruit≥1 bypassa il gate; NPC `getOrCreate`) ·
  `/api/meta/affinity` · `/api/meta/trust` · `/api/meta/mating {npc_id,party_member}` · `GET /api/meta/nest`.

## Decisioni bloccate (master-dd consent)

- Approccio combat = **Option B rifinita** (combatAdapter nuovo + riusa selectPlayerAction; NON seam in
  ai-driven-sim, che è coop-coupled).
- Roster: Option A seam scartata (recon ha ribaltato il trade-off).
- Arco MVP = cave_path (~5-8 cap). GAP-C routing = fase-2 (`META_NETWORK_ROUTING=true` NON `=1`, session.js:215).
- Meta = option-a recruit-seam (recruited → `party_rosters`/Nido, NON roster-combat).
- Codex down → "continua self-review-only + Codex review dei risultati quando torna" → #2563 OPEN.

## NEXT (resume entry point)

1. **Codex back** → review #2563 → indirizza eventuali finding → merge #2563.
2. **fase-1b-3**: (a) recruit→combat **stat-resolution** (far combattere il recruited next-mission) + (b)
   `chooseMatings`/`chooseAffinity` (mating via `/api/meta/mating` + `/api/meta/mating/roll`). Design-call (a).
3. **fase-2**: enemy **scaled** (encounter YAML, non più weak-fissi) + **band-metriche** meta (completion-rate
   40-70% XCOM-LW2, attrition, economy PE→PI, offspring) + `mbtiPolicy` + routing test-context + **N=40**
   (L-069). Band-target derivati §7 dello spec, ratifica master-dd post-N=40.
4. Cleanup worktree `_gamewt-fl1b2` (+ `_gamewt-fl1b` se residuo) post-merge.

## Gotchas / lezioni sessione

- 🔴 **main checkout `C:/dev/Game` node_modules ROTTO** (js-yaml mancante) → probe da main falliscono (la
  "blocker" meta era falso-allarme env, anti-pattern #19). Fix: `npm ci` in `C:/dev/Game` (fatto/da-fare).
- 🔴 `.gitignore:74 Lib/` (case-insensitive Windows) cattura `tools/sim/lib/` → moduli a `tools/sim/` flat.
  `git check-ignore <path>` se un file nuovo "sparisce" dal commit.
- 🔴 Codex usage-limit a metà sessione → niente review post-#2562. Merge self-review-only autorizzato (low-risk
  tooling). #2563 OPEN per review al ritorno.
- 🔴 currency-gate (3a volta): PT earn-curve era già canon (`26-ECONOMY §PT`). Leggi il SoT COMPLETO.
- `git checkout <file>` reverte fix UNCOMMITTED (perso il P1 fix combatAdapter dopo toggle-test, ricostruito).

## Constraints (invarianti)

Worktree ISOLATO off origin/main (`npm ci`); MAI committare sul main checkout. ADR-0011 trailer (Coding-Agent

- Trace-Id uuidv7, no Co-Authored-By); commit lowercase ≤72 no-em-dash; prettier pre-commit; governance strict
  errors=0; `node --test tests/sim/*.test.js` (glob, node v24); NO forbidden paths. Gate-5 eccezione
  methodology-tooling (full-loop runner). Band-safe = zero engine change (solo `tools/sim`).
