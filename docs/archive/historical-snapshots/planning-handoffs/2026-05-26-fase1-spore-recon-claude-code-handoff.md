---
title: 'Handoff Fase-1 Spore Moderate Reconciliation -- Cowork -> Claude Code'
date: 2026-05-26
session_origin: Cowork (Eduardo VGit Ryzen)
session_target: Claude Code CLI (fresh session, no context)
status: RECON-01 PR #2394 pending prisma-fix re-run + RECON-02..06 queued
language: it
authority_chain: vault SoT -> ADR-2026-05-26 -> Game runtime
---

# Handoff Cowork -> Claude Code, 2026-05-26

## 0. Resume trigger phrase canonical (incolla in nuova sessione)

> Riprendi Fase-1 Spore Moderate Reconciliation (plan
> `docs/superpowers/plans/2026-05-26-fase1-spore-moderate-reconciliation-plan.md`,
> ADR `docs/adr/ADR-2026-05-26-deep-genetics-phase1-supersede-freeze.md`).
> Stato: PR #2393 plan DRAFT su `chore/spore-fase1-recon-plan-2026-05-26`;
> PR #2394 RECON-01 baseline DRAFT su `feat/spore-fase1-recon-01-e2e-baseline`
> con primo run FAIL ambientale (prisma generate missing). Re-run post-fix
> pending. Leggi handoff `docs/planning/2026-05-26-fase1-spore-recon-claude-code-handoff.md`
> per stato completo + ticket queue RECON-02..06.

## 1. Authority chain (LEGGI PRIMA)

- **Design SoT**: vault `Spaces/Dev/Evo-Tactics/core/00-SOURCE-OF-TRUTH.md` (v5, 1343 lines)
- **Freeze**: vault `Spaces/Dev/Evo-Tactics/core/90-FINAL-DESIGN-FREEZE.md` §21.3 (superseded SCOPED Fase-1)
- **ADR scoped supersede**: Game `docs/adr/ADR-2026-05-26-deep-genetics-phase1-supersede-freeze.md`
- **Spec design**: Game `docs/superpowers/specs/2026-05-26-repro-heir-genetic-model-design.md` (D-REPRO + D-HEIR, post-freeze vision)
- **Plan execution**: Game `docs/superpowers/plans/2026-05-26-fase1-spore-moderate-reconciliation-plan.md` (v3 post-harsh-review, 5 open-decisions resolved baked-in)
- **Baseline RECON-01**: Game `docs/research/2026-05-26-fase1-spore-e2e-baseline.md`

Backend canonico (SoT §1 runtime-source-of-truth) = Game/. Godot consuma via API. NON duplicare logica genotype Godot-side.

## 2. Scoperta empirica chiave (NON re-derivare)

**Spore Moderate Fase-1 ~90% SHIPPED** verificato file:line 2026-05-26. Spore research `docs/research/2026-04-26-spore-deep-extraction.md` §4 "21h Moderate path" e' OUTDATED. Plan reconcile residuo (~8-12h min path) NON greenfield.

Componenti verified SHIPPED (read empirico, NON dedotto):

| Componente                                 | Stato                  | File:line                                                                                                                                                      |
| ------------------------------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema mutation_catalog 36 entries         | SHIPPED                | `data/core/mutations/mutation_catalog.yaml` -- body_slot/aspect_token/visual_swap_it/mp_cost/trigger_conditions/derived_ability_id (all null pero')            |
| Slot-conflict gating                       | SHIPPED                | `apps/backend/services/mutations/mutationEngine.js:73-95` (`checkSlotConflict`, symbiotic exempt)                                                              |
| MP budget gating                           | SHIPPED                | `mutationEngine.js:97-112` (`checkMpBudget`)                                                                                                                   |
| applyMutationPure + derived_ability unlock | SHIPPED                | `mutationEngine.js:133-185` (no-op finche' derived_ability_id catalog popolato, COVERAGE RECON-02)                                                             |
| Bingo 3-of-category                        | SHIPPED                | `mutationEngine.js:198-223` + BINGO_ARCHETYPES 5cat `:21-57`                                                                                                   |
| Route POST /api/v1/mutations/\*            | SHIPPED                | `apps/backend/routes/mutations.js:99-216` (registry/eligible/apply/bingo)                                                                                      |
| mpTracker accumulator+spend                | SHIPPED+WIRED          | `apps/backend/services/mutations/mpTracker.js:1-123` -- call sites `routes/campaign.js`, `apps/play/src/characterPanel.js`, `tests/services/mpTracker.test.js` |
| MP enforce route-side                      | SHIPPED                | `routes/mutations.js:141-156` (`MUTATION_MP_ENFORCE` env flag, back-compat auto-skip se `unit.mp` assente)                                                     |
| Render aspect_token overlay                | SHIPPED                | `apps/play/src/render.js:580-1249` ("backfill 2026-05-05 36 mutations")                                                                                        |
| Linter Pattern-6                           | SHIPPED                | `tools/py/lint_mutations.py:1-113`                                                                                                                             |
| S5 plumbing propagateLineage               | SHIPPED, hook deferred | `apps/backend/services/generation/lineagePropagator.js:79-218`. **Bug cross-lineage isolation `:14-15` DEFERITO Fase-2.**                                      |
| Genotype 2-parent mating                   | SHIPPED                | `apps/backend/services/metaProgression.js:296` (inheritGeneSlots) + `:364` (pickEnvironmentalMutation) + `:465` (rollMatingOffspring)                          |
| Lineage SHA1 chain                         | SHIPPED                | `apps/backend/services/meta/geneEncoder.js:36-48` (`gn1:<parent>:<self>`)                                                                                      |
| Test coverage mutation routes              | 9 test PASS            | `tests/api/mutationsRoutes.test.js`                                                                                                                            |
| Test coverage mpTracker                    | 10 test PASS           | `tests/services/mpTracker.test.js`                                                                                                                             |

**Gap REALI Fase-1** (cosa rimane):

1. `derived_ability_id` populated 10-15 entries (currently NULL su 36/36) -- RECON-02
2. Bingo catalog rebalance (14 phys imbalance, 38.9% dominanza) -- RECON-03a (defer 03b Fase-1.5)
3. Schema-ripple audit + cost-charging contract test -- RECON-04a
4. **Complexity-budget Σc<=C_max enforce mating-side VERIFIED MISSING** in `metaProgression.js:465-551` (G2 gate unmeetable) -- RECON-04b
5. SoT promotion vault §24 D-HEIR + Game-Godot-v2 PRD overlay -- RECON-06
6. Godot consumer unification 3 impl divergenti = **DEFERITO INTERAMENTE FASE-2** (era RECON-05, rimosso da Fase-1 per evitare dead-code seam)

## 3. PR aperte attuali (2026-05-26)

| PR    | Branch                                    | Status                       | Topic                                                                                                                                                            |
| ----- | ----------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| #2393 | `chore/spore-fase1-recon-plan-2026-05-26` | DRAFT                        | Plan v3 reconciliation (1 file `docs/superpowers/plans/2026-05-26-fase1-spore-moderate-reconciliation-plan.md`)                                                  |
| #2394 | `feat/spore-fase1-recon-01-e2e-baseline`  | DRAFT, primo run FAIL Prisma | RECON-01 baseline (`docs/research/2026-05-26-fase1-spore-e2e-baseline.md`) -- Eduardo deve eseguire `_fix-prisma-and-rerun-recon-01.cmd` per re-run + commit fix |

Entrambe Eduardo-mediated merge. NO auto-merge anche se ADR-2026-05-07 L3 criteria satisfied (oversight gate mantenuto).

## 4. Stato git Eduardo Ryzen (2026-05-26 ~00:30 UTC)

- HEAD `main`: `808e71a2` (post PR #2392 D-REPRO+D-HEIR spec merged)
- Branch correnti locali: `chore/spore-fase1-recon-plan-2026-05-26` (push'd) + `feat/spore-fase1-recon-01-e2e-baseline` (push'd con 1 commit FAIL)
- Untracked working tree: 24 playtest shards `docs/playtest/parallel-hardcore_*` (Eduardo WIP, NON tocco), `_run-fase1-plan-commit.cmd`, `_run-fase1-recon-01.cmd` (committed nel PR #2394 branch), `_fix-prisma-and-rerun-recon-01.cmd` (untracked, pending Eduardo execution), `_pr-body-fase1-plan.md` (template scratch in docs/superpowers/plans/)

## 5. Ticket queue Fase-1

```
WAVE 1 [BLOCKER per resto]
  RECON-01 E2E baseline (~2h) -- PR #2394 DRAFT pending prisma-fix
       Empirical evidence: 19 test esistenti mappati 1:1 a 7 step plan.
       Step 7 (frontend visual) DEFERITO RECON-01.1 manual smoke (non-blocker).
       _fix-prisma-and-rerun-recon-01.cmd da eseguire Eduardo-side per
       portare PR #2394 a 19/19 PASS.

WAVE 2 [parallel + serial mix, post merge #2394]
  RECON-04a Schema-ripple audit + cost-charging contract test (~2-3h, parallel OK)
       Branch: feat/spore-fase1-recon-04a-ripple-audit
       READ-ONLY audit + 1 nuovo test contract (cost_charging 'deferred_m13_p3' guard).
       NO modifica catalog (parallelo a RECON-02).

  RECON-02 Populate derived_ability_id 10-15 entries (~3-4h, serial)
       Branch: feat/spore-fase1-recon-02-derived-ability
       Pre-verify path: data/core/traits/active_effects.yaml (NON data/core/ -- harsh-review P0 #3).
       Selection criteria: tier 2-3 con trait_swap.add che implica ability, coverage cross-category, skip symbiotic.
       Test additivo: tests/services/mutationEngine.applyMutationPure.test.js -- estendere case derived_ability_id populated.

WAVE 2.5 [serial dopo RECON-02]
  RECON-03a Bingo rebalance via re-categorize + monte-carlo (~2-3h)
       Branch: feat/spore-fase1-recon-03a-bingo-rebalance
       Re-categorize 2-3 borderline physiological -> environmental (Hybrid path).
       Test NEW: tests/services/computeMutationBingo.balance.test.js (monte-carlo 1000 build).
       Target: tank_plus < 50% in random build.

WAVE 3 [parallel, post RECON-04a + RECON-03a]
  RECON-04b Complexity-budget Σc<=C_max enforce INLINE mating-side (~2-3h)
       Branch: feat/spore-fase1-recon-04b-complexity-budget
       Hook in metaProgression.js:545 (PRE-return).
       C_max=30 default (env override OFFSPRING_C_MAX). Formula: Σ mp_cost(applied_mutations).
       Strategy over-budget: drop random bonus trait fino a Σc<=C_max (master-dd default; alternatives re-sample/reject).
       Test NEW: tests/services/metaProgression.complexityBudget.test.js (under/at/over-budget cases).
       Closes G2 gate unmeetable pre-RECON-04b (VERIFIED MISSING in rollMatingOffspring:465-551 grep zero match).

  RECON-06 SoT promotion + cross-repo overlay sync (~1-2h docs)
       Branch: chore/spore-fase1-recon-06-sot-promotion
       Vault PR feature branch: 00-SOURCE-OF-TRUTH.md §"Design still to AUTHOR" rimuovi D-HEIR + D-REPRO; aggiungi §24 D-HEIR canonical (3-layer summary).
       Game-Godot-v2 PR feature branch: PRD-BUILD-STATUS-GODOT-V2.md aggiorna "Mating + genetics" a "🟡 (backend canonical SHIPPED Fase-1, Godot unify deferred Fase-2)".
       Codemasterdd PUO' aprire PR su vault + Godot v2, MAI merge (Eduardo-only).

OPTIONAL (defer Fase-1.5)
  RECON-03b Catalog expansion (12-16 new entries, ~4-6h authoring)
       Eseguire solo se RECON-03a fail OR master-dd vuole closure debt subito.
       Authoring debt: master-dd owner per design decisions.
```

## 6. Gate obbligatori (cross-cutting -- valgono ogni ticket)

- **G1 SCHEMA-RIPPLE escalation PRE-MERGE**: ogni edit `mutation_catalog.yaml` schema -> ripple verify progressionEngine + rewardOffer + formEvolution. Owner: PR opener.
- **G2 Complexity-budget Σc<=C_max enforce**: at `rollMatingOffspring` post-build. **CURRENTLY MISSING**. Closed da RECON-04b inline.
- **G3 Bingo catalog rebalance**: 14/6/6/5/5 -> target 7-8 per cat. Owner: master-dd. Coperto RECON-03a (re-categorize) + opzionale RECON-03b. Ship policy: bingo runtime SHIPS sempre; fallback `BINGO_ENFORCE=false` env se monte-carlo fail.
- **G4 tdd-guard discipline**: NO tool installato (verified `grep tdd-guard` Game = 0 match). Standard TDD = commit test RED prima, commit impl GREEN dopo. Per content-only ticket (RECON-02/03/06) -> bypass dichiarato in PR body.
- **G5 Privacy + repo whitelist**: `C:\dev\Game` whitelisted `~/.config/aider-privacy-whitelist.txt`. Cloud OK per codice. Vault sibling-peer (branch+PR OK, merge Eduardo-only).
- **G6 Backend canonical (SoT §1)**: Godot consume via API, NO logica genotype divergente. RECON-05 (Godot consumer) deferred Fase-2.

## 7. Decisioni baked-in (5 open-decisions resolved empirical research 2026-05-26)

1. **G4 tdd-guard**: NO TOOL installato. Standard TDD discipline. (`grep tdd-guard` Game repo: 0 match)
2. **C_max valore**: **30** default (env override `OFFSPRING_C_MAX`). Math: 3 mut x mp_cost 8-15 = range 24-45. `MP_POOL_MAX=30` (mpTracker.js:26) -> matches "offspring complessita' <= 1 full MP pool"
3. **computeOffspringComplexity formula**: `Σ mp_cost(offspring.applied_mutations[])` semplice ADR-consistent. Fallback tier-based (Σtier, range 3-9, C_max=7) se mp_cost-sum edge case
4. **RECON-03b inline vs defer**: **DEFER Fase-1.5**. Analytic baseline: P(tank_plus random 5-pick) ~= 30%. Post RECON-03a re-categorize 3 phys->env: ~13%. Sotto threshold ship gate 50%. RECON-03a alone sufficient
5. **Branch + PR mode**: **SINGLE-PR-per-branch (NO umbrella)**. Verified `git log --merges` + `git branch -a` pattern recente repo (zero umbrella 2026-05). 6 sub-branch separati

## 8. Harsh-review log (Stage 2 review applicato pre-plan-merge)

Subagent general-purpose read-only invocato 2026-05-26. **5 P0 + 6 P1 + 3 P2 finding** addressed inline plan v3:

**P0 fixed**:

1. §1 body_slot table counts off-by-2 (mouth=8 non 6, tegument=10 non 12)
2. G2 complexity-budget enforce VERIFIED MISSING -> RECON-04b nuovo ticket inline (era audit-only RECON-04 originale)
3. RECON-02 path errato `data/core/active_effects.yaml` -> corretto `data/core/traits/active_effects.yaml`
4. cost-charging `deferred_m13_p3` silent double-charge risk -> RECON-04a Step 4 contract test
5. Wave 2 YAML merge conflict garantito (RECON-02 + 03a same file) -> serializzato 02 -> 03a in §7 sequencing

**P1 critical fixed**:

- RECON-03 split a/b
- RECON-05 (Godot client) MOVED ENTIRELY Fase-2 (dead-code seam)
- RECON-04 step 5 grep explicit negative confirmation
- G4 decision gate PRE-Wave-1 con default Option B per content-only
- G3 ship policy clarified (env flag `BINGO_ENFORCE` fallback)
- DoD §6 split "Game-runtime SHIPPED" vs "closure complete"

Pattern adopted: harsh-reviewer subagent applicabile a cluster plan documentation governance-critical, NON solo PR code cluster.

## 9. Cognitive protocols applicati (ADR-0026 codemasterdd reference)

- **P1 Refresh-verify** OBBLIGATORIO pre-plan: applicato 2026-05-26. **Catch addizionale post harsh-review**: P1 stesso aveva miss (body_slot off-by-2, complexity-budget missing) -- enforcement empirical via grep+read multipli source
- **P2 Autoresearch multi-source**: weighted internal > external; empirical (Read/Grep) > documentation (research doc 30-day-old). Spore research 2026-04-26 esempio fonte stale superata da empirical
- **P5 Harsh-reviewer cluster scrutiny APPLICATO**: subagent read-only pre-final-write. 5 P0 fixed inline
- **P6 Brainstorming**: NON applicato (plan = execution slice da spec gia' approvato, NOT generative architectural design)
- **P3 Archon 7-step**: NON applicato (decision high-stakes irreversibile gia' nell'ADR-2026-05-26)
- **P7 SDMG**: NON applicato (questo NON e' self-designed-method da integrare governance durevole)

## 10. Gotcha tecnici Ryzen Game (memory ai-station: ryzen_game_backend_boot)

- **PG17 standalone**: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/game`. Docker rotto.
- **@game/\* node_modules**: Windows-junction NON MSYS-symlink (rompe node resolution).
- **husky lint-staged**: ora funziona post env-fix 2026-05-26 sera.
- **Prisma client generate**: **`npm install` NON triggera automatic**. Test che caricano `apps/backend/app.js` (-> storage.js -> db/prisma.js -> @prisma/client) FAIL con `Cannot find module '.prisma/client/default'` finche' NON eseguito `npx prisma generate --schema apps/backend/prisma/schema.prisma`. Workaround: aggiungere step `prisma generate` in pre-flight ogni \_run-\*.cmd helper.
- **vault commit-msg hook**: description LOWERCASE dopo `type():`. Esempio OK: `chore(sot): promote d-heir canonical post fase-1 ship`.
- **Game subject ≤72 char**.
- **tdd-guard**: NO TOOL installato. Standard discipline.
- **Console mojibake CP850**: per UTF-8 in cmd: `chcp 65001` prima di redirect output.
- **Pre-commit hook blocca main**: `git commit` su main fail (per design). Usa feature branch.
- **Sandbox Cowork limit**: `.git/index.lock` ACL Windows NON bypassable da sandbox bash/Python/sudo (sudo no_new_privileges). Push GitHub auth NON disponibile sandbox. Tutte ops git -> Eduardo Windows-side via .cmd helper.

## 11. Pattern caveman mode (Game CLAUDE.md)

- Terse like caveman. Drop articles/filler. Fragments OK.
- Off: `stop caveman` / `normal mode` -- On: `/caveman`
- Auto-exceptions: security warnings, irreversible actions, multi-step ambiguous risk.

## 12. Branch protocol Game (post Eduardo direction 2026-05-26)

- Pattern: `feat/{topic}-{date}` o `chore/{topic}` o `claude/{topic}-{date}` -- single-PR-per-branch, NO umbrella
- Conventional Commits lowercase. Subject ≤72 char.
- PR draft -> 2-stage review per-ticket (self-check + harsh-reviewer su cluster ≥3 PR consecutivi schema-touching).
- Eduardo media merge ogni PR. NO auto-merge anche se L3 criteria satisfied.
- Per ai-station (codemasterdd) edits cross-repo: vault sibling-peer branch+PR push OK, merge Eduardo-only.

## 13. File scratch helper esistenti (cleanup post Fase-1)

Quando Fase-1 ships, Eduardo puo' eliminare:

- `C:\dev\Game\_run-fase1-plan-commit.cmd`
- `C:\dev\Game\_run-fase1-recon-01.cmd` (committed in PR #2394 branch -- valutare se rimuovere via separato commit cleanup)
- `C:\dev\Game\_fix-prisma-and-rerun-recon-01.cmd`
- `C:\dev\Game\docs\superpowers\plans\_pr-body-fase1-plan.md`

Pattern stesso per ticket RECON-02..06: helper .cmd transient, cleanup post-merge.

## 14. Action item immediato Eduardo (NON-blocker per Claude Code session ma utile pre-Wave-2)

1. **Doppio-click `_fix-prisma-and-rerun-recon-01.cmd`** -> 19/19 PASS expected -> commit + push amend PR #2394
2. (Opzionale) Merge PR #2393 plan -> sblocca baseline.md link interno (cosmetic)
3. (Opzionale) Merge PR #2394 RECON-01 -> sblocca Wave-2

## 15. Next session Claude Code action

Dopo Eduardo run #14.1 + merge #2393 + #2394:

```
WAVE 2 kickoff (parallel):
  - branch feat/spore-fase1-recon-04a-ripple-audit
    Read-only audit cross-codebase per:
      apps/backend/services/progression/progressionEngine.js
      apps/backend/services/rewards/rewardOffer.js
      apps/backend/services/forms/formEvolution.js
    grep mp_cost|body_slot|applied_mutations|derived_ability
    Documenta zero-hit (negative confirmation) -> docs/research/2026-05-26-fase1-schema-ripple-audit.md
    NEW test tests/routes/mutations.cost-charging-contract.test.js (deferred_m13_p3 guard)

  - branch feat/spore-fase1-recon-02-derived-ability (DOPO #2394 merged)
    Read data/core/traits/active_effects.yaml (verify path empirical)
    Pick 10-15 mutation tier 2-3 candidate (cross-category, skip symbiotic)
    Populate derived_ability_id field nel mutation_catalog.yaml
    Estendi tests/services/mutationEngine.applyMutationPure.test.js per assert
```

Pattern: 1 cmd helper per ticket, sandbox-side preparation, Eduardo doppio-click esegue git ops.

## 16. References

- ADR-2026-05-26 deep-genetics-phase1-supersede-freeze: `docs/adr/ADR-2026-05-26-deep-genetics-phase1-supersede-freeze.md`
- Spec D-REPRO + D-HEIR: `docs/superpowers/specs/2026-05-26-repro-heir-genetic-model-design.md`
- Plan v3: `docs/superpowers/plans/2026-05-26-fase1-spore-moderate-reconciliation-plan.md`
- Baseline RECON-01: `docs/research/2026-05-26-fase1-spore-e2e-baseline.md`
- ADR canonical Spore Moderate: `docs/adr/ADR-2026-04-26-spore-part-pack-slots.md`
- Spore research OUTDATED: `docs/research/2026-04-26-spore-deep-extraction.md` (riferimento storico, NON baseline)
- Vault freeze §21.3: `C:\dev\vault\Spaces\Dev\Evo-Tactics\core\90-FINAL-DESIGN-FREEZE.md`
- Vault SoT v5: `C:\dev\vault\Spaces\Dev\Evo-Tactics\core\00-SOURCE-OF-TRUTH.md`
- Game-Godot-v2 PRD overlay: `C:\dev\Game-Godot-v2\docs\godot-v2\PRD-BUILD-STATUS-GODOT-V2.md`
- codemasterdd CLAUDE.md (governance + cognitive protocols): `C:\dev\codemasterdd-ai-station\CLAUDE.md`
- Game CLAUDE.md (project conventions + caveman + Gate 5): `C:\dev\Game\CLAUDE.md`

## 17. Memory chiavi codemasterdd ai-station (per reference Claude Code se ha accesso)

- `feedback_governance_refresh_verify` (Protocol 1)
- `feedback_autoresearch_default` (Protocol 2)
- `reference_archon_protocol` (Protocol 3)
- `project_aa01_studio` (Protocol 4)
- `feedback_codex_post_cascade_audit` (Protocol 5 + post-cascade audit OBBLIGATORIO)
- `project_p4_storytelling_cascade_2026_05_20` (multi-agent dispatch pattern)
- `ryzen_game_backend_boot` (gotcha tecnici PG17 + junction)

---

**END HANDOFF -- ready Claude Code pickup.**
