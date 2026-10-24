---
title: 'Fase-1 Spore Moderate -- Reconciliation plan (TKT-SPORE-FASE1-RECON-01..06)'
date: 2026-05-26
status: DRAFT -- pending 2-stage review + harsh-reviewer cluster scrutiny
owner: master-dd
workstream: evo-tactics / Pilastro 2 (emergent evolution)
language: it
authority_chain: vault SoT (design) -> ADR-2026-05-26 -> Game runtime
supersedes_estimate: 'Spore research 2026-04-26 §4 Moderate "~21h greenfield" -- OUTDATED. Verified empirically 2026-05-26: 90% SHIPPED. Honest residual: ~8-12h reconciliation.'
related:
  - docs/superpowers/specs/2026-05-26-repro-heir-genetic-model-design.md
  - docs/adr/ADR-2026-05-26-deep-genetics-phase1-supersede-freeze.md
  - docs/adr/ADR-2026-04-26-spore-part-pack-slots.md
  - docs/research/2026-04-26-spore-deep-extraction.md (FONTE OUTDATED -- §4 Moderate 21h estimate non riflette stato 2026-05-26)
  - vault Spaces/Dev/Evo-Tactics/core/90-FINAL-DESIGN-FREEZE.md §21.3 (superseded SCOPED da ADR-2026-05-26)
  - vault Spaces/Dev/Evo-Tactics/core/00-SOURCE-OF-TRUTH.md (D-REPRO/D-HEIR sezione "to AUTHOR" -- promote post-Fase1-ship)
verify_method: 'Read+Grep on file:line concreti 2026-05-26 (NOT inferred from old research doc).'
---

# Fase-1 Spore Moderate -- Reconciliation plan

> **WHY THIS PLAN EXISTS**: la `ADR-2026-05-26` supersede SCOPED §21.3 per "Spore
> Moderate Fase-1" (S1+S2+S3+S4+S6) e cita "~21h". Verifica empirica file-per-file
> 2026-05-26 (vedi §1) mostra che **9 dei 10 pezzi runtime sono gia' SHIPPED**.
> L'effort residuo onesto e' **~8-12h reconciliation + content + Godot wire seam**,
> NON 21h greenfield. Procedere col plan originale duplicherebbe lavoro gia' merged
> e mancherebbe i gap reali (derived_ability NULL su 36/36, bingo physiological
> dominance, Godot 3 impl divergenti).

## 0. Authority chain + scope guard

- **Authority chain**: vault SoT (design canonical) -> ADR-2026-05-26 (Fase-1 scope) -> Game/ runtime (consumer-side). Godot consuma backend, NON ha logica genotype propria (ADR §Decision 4).
- **Scope Fase-1 (questo plan)**: S1 body_slot + S2 part->ability + S3 MP-pool + S4 morphology-first + S6 category-bingo. **TUTTO additivo allo slice freeze attuale (2-gene-slot + 1-env-mutation)**.
- **Esplicitamente FUORI scope (gate vincolante, NON unlocked qui)**:
  - Epigenome / Lamarck-lite (Fase-3, requires decay/regression params TBD)
  - Deep genealogie multi-gen
  - S5 ambient-drift lifecycle hook + cross-lineage isolation bug (Fase-2)
  - Hybrid genuino (mating.yaml hybrid_rules promotion da display-only)
  - Unificazione 3 impl Godot (mating_trigger avg-blend + lineage_merge + offspring_ritual) -- pero' RECON-05 prepara il seam consumer
- **NON-greenfield**: questo plan e' un **catch-up / hardening** dello shipped, non un build. Trigger-fail nuovi ticket greenfield -> harsh-reviewer.

## 1. Verified state 2026-05-26 (file:line empirico)

Tabella truth-source per ogni S-pattern. Status verificato via Read/Grep, non dedotto.

| Pezzo Fase-1                                                                                                       | Status                                                                                                                                                                                     | File:line evidenza                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S1** schema `body_slot` per 36 entries catalog                                                                   | SHIPPED                                                                                                                                                                                    | `data/core/mutations/mutation_catalog.yaml` -- grep `^\s*body_slot:` -> 36 occorrenze. Re-counted 2026-05-26 post harsh-review: mouth=8, tegument=10, appendage=6, sense=4, back=3, null=5 symbiotic. Total 8+10+6+4+3+5=36.                                                                                                    |
| **S1** slot-conflict gating runtime                                                                                | SHIPPED                                                                                                                                                                                    | `apps/backend/services/mutations/mutationEngine.js:73-95` (`checkSlotConflict`, symbiotic exempt)                                                                                                                                                                                                                               |
| **S2** schema `derived_ability_id` per 36 entries                                                                  | SHIPPED schema, **NULL su 36/36** (content gap)                                                                                                                                            | `mutation_catalog.yaml` -- grep `derived_ability_id:` -> 36 occorrenze, **tutte `null`**                                                                                                                                                                                                                                        |
| **S2** `applyMutationPure` emerge derived_ability                                                                  | SHIPPED runtime                                                                                                                                                                            | `mutationEngine.js:133-185` (line 162-167 unlock condizionale; **no-op finche' catalog populated**)                                                                                                                                                                                                                             |
| **S2** route POST /api/v1/mutations/apply                                                                          | SHIPPED                                                                                                                                                                                    | `apps/backend/routes/mutations.js:99-199` (slot+MP+eligible re-check, event sink, bingo recompute)                                                                                                                                                                                                                              |
| **S3** schema `mp_cost` per 36 entries                                                                             | SHIPPED                                                                                                                                                                                    | `mutation_catalog.yaml` -- 36 entries hanno `mp_cost` (range 8-15)                                                                                                                                                                                                                                                              |
| **S3** `mpTracker` accumulator                                                                                     | SHIPPED + WIRED                                                                                                                                                                            | `apps/backend/services/mutations/mpTracker.js:1-123` (TIER_MEDIUM=2, KILL_STATUS=1, BIOME_MATCH=1, cap MP_POOL_MAX=30); call sites: `routes/campaign.js`, `apps/play/src/characterPanel.js`, `tests/services/mpTracker.test.js`                                                                                                 |
| **S3** MP enforce route-side (mutation-apply)                                                                      | SHIPPED                                                                                                                                                                                    | `routes/mutations.js:141-156` (`MUTATION_MP_ENFORCE` env flag, auto-skip se `unit.mp` assente -- back-compat)                                                                                                                                                                                                                   |
| **S3 / G2** complexity-budget Σc ≤ C_max enforce **mating-side** (`rollMatingOffspring` offspring materialization) | **MISSING** -- verified 2026-05-26 post harsh-review                                                                                                                                       | `metaProgression.js:465-551` -- function returns offspring spec unconditionally. Grep `C_max\|complexity\|totalComplexity\|complexityBudget\|totalCost` -> zero match in metaProgression.js. ADR-2026-04-26 lock-in NOT enforced. **G2 gate UNMEETABLE as worded** finche' enforce hook non aggiunto. Coperto RECON-04b inline. |
| **S4** schema `aspect_token` + `visual_swap_it` 36/36                                                              | SHIPPED                                                                                                                                                                                    | `mutation_catalog.yaml` -- grep -> 36 + 36 occorrenze, tutti popolati                                                                                                                                                                                                                                                           |
| **S4** render overlay `drawMutationDots`                                                                           | SHIPPED                                                                                                                                                                                    | `apps/play/src/render.js:580-1249` (`ASPECT_TOKEN_OVERLAY`, backfill 2026-05-05 "36 mutations")                                                                                                                                                                                                                                 |
| **S4** linter Pattern-6                                                                                            | SHIPPED                                                                                                                                                                                    | `tools/py/lint_mutations.py:1-113` (check `visual_swap_it` + `aspect_token` presenti + non-empty, exit code 0/1/2)                                                                                                                                                                                                              |
| **S6** bingo engine 3-of-category + 5 archetype                                                                    | SHIPPED                                                                                                                                                                                    | `mutationEngine.js:21-57` (BINGO_ARCHETYPES tank/ambush/scout/adapter/alpha), `:198-223` (computeMutationBingo), `:236-248` (applyMutationBingoToUnit hydrate)                                                                                                                                                                  |
| **S6** route POST /api/v1/mutations/bingo                                                                          | SHIPPED                                                                                                                                                                                    | `routes/mutations.js:205-216` (read-only preview)                                                                                                                                                                                                                                                                               |
| **S6** catalog distribuzione category                                                                              | **IMBALANCED** -- 14 physiological / 6 behavioral / 6 sensorial / 5 symbiotic / 5 environmental (36 totali). 14 phys >> bingo soglia 3 -> archetype "tank_plus" quasi-garantito ogni build | `mutation_catalog.yaml` -- grep `^\s*category:` count by occurrence                                                                                                                                                                                                                                                             |

**Out-of-scope ma verificato per audit completo (NON tocco in Fase-1)**:

- S5 plumbing `propagateLineage` + `inheritFromLineage`: SHIPPED `apps/backend/services/generation/lineagePropagator.js:79-218`. **Bug cross-lineage isolation `:14-15` deferito Fase-2 (commento `// Cross-lineage isolation deferred...`)**.
- Genotype 2-parent mating: SHIPPED `apps/backend/services/metaProgression.js:296` (inheritGeneSlots), `:364` (pickEnvironmentalMutation), `:465` (rollMatingOffspring).
- Lineage chain SHA1: SHIPPED `apps/backend/services/meta/geneEncoder.js:36-48` (`gn1:<parent>:<self>`).
- Genotype Godot: **3 impl PARZIALI divergenti** -- `mating_trigger.gd` (avg-blend), `lineage_merge_service.gd`, `offspring_ritual_service.gd`. Da unificare Fase-2 dietro consumer backend API.

## 2. Gate obbligatori (cross-cutting -- valgono su ogni ticket)

**G1. SCHEMA-RIPPLE escalation PRE-MERGE** (ADR §Consequences #2):

- Ogni edit che tocca `mutation_catalog.yaml` schema (anche solo populate `derived_ability_id`) -> verify ripple su `progressionEngine`, `rewardOffer`, `formEvolution`.
- Verifica empirica: shape consumer NON cambia (popolare un campo nullable -> consumer gia' gestisce branch null). Se cambia shape (nuovo campo/rename) -> escalation.
- **Owner**: chi apre PR fa check ripple in PR body + harsh-reviewer flag.

**G2. Complexity-budget Σc <= C_max enforce at offspring materialization** (ADR §Risks #2):

- L'inheritance NON deve permettere a una build di eccedere `C_max` indipendentemente dalle parti ereditate.
- Punto di enforcement: `metaProgression.rollMatingOffspring:465-551` post-build, PRIMA di restituire offspring spec. Se Σc(inherited slots + env mutation) > C_max -> reject + retry sampling.
- **VERIFIED MISSING 2026-05-26** post harsh-review: il file NON contiene enforce (grep zero match su C_max / complexity / totalComplexity / complexityBudget / totalCost). **G2 e' UNMEETABLE finche' RECON-04b non aggiunge il hook**. Demotion: G2 e' gate-IN-FASE-1 (parte di Fase-1 ship gate), risolto da RECON-04b inline non da audit-only.

**G3. Bingo catalog rebalance -- AUTHORING DEBT (owner + ticket esplicito)** (ADR §Risks #4):

- Distribuzione corrente 14/6/6/5/5 -- physiological domina al 38.9%.
- Target Spore §S6: 7-8 per categoria (range stretto, archetype "tank_plus" NON quasi-garantito).
- **Owner authoring**: master-dd (rebalance richiede design decisions su nuovi mutation behavioral/sensorial/environmental + spostamento alcuni physiological -> categoria piu' fitting).
- Coperto da **RECON-03a** (rebalance minimal via re-categorize) + opzionalmente **RECON-03b** (full expansion).
- **Ship policy (chiarito post harsh-review P1 #5)**: bingo runtime SHIPS sempre (engine + archetypes wired). Se RECON-03a monte-carlo fail (tank_plus >50%), allora archetype trigger viene gated via env flag `BINGO_ENFORCE=false` (runtime gia' supporta -- vedi `mutationEngine.js`). RECON-03b chiude flag-removal definitive. **Gate qui = "monte-carlo PASS in RECON-03a O env flag set OFF"**.

**G4. tdd-guard workaround per impl JS** (vincolo Ryzen Game backend boot):

- "NO node:test reporter in Game -> blocca impl JS senza RED capturato" -- per impl Fase-1 JS serve workaround:
  - **Option A**: test-first via reporter installato (verify exists `package.json` test script supporta reporter, altrimenti install). Cattura RED prima di scrivere impl.
  - **Option B (bypass autorizzato)**: dichiarare bypass esplicito in PR body con motivazione (es. "ticket = content-only authoring, no impl JS"); applicabile a RECON-02 (catalog content), RECON-03a/b (catalog content), RECON-06 (docs).
- Cross-applicable a RECON-01 (E2E test = INTEGRATION test, separate concern), RECON-04a (verification = read-only, no impl).
- RECON-04b (complexity-budget enforce JS impl) = TDD-CRITICAL: serve workaround Option A o explicit Option B.
- **DECISION GATE PRE-WAVE-1 (harsh-review P1 #4)**: Eduardo decide Option A vs Option B default PRIMA di kickoff. NO mid-wave decision. Default raccomandato Option B per ticket content-only + Option A per RECON-04b.

**G5. Privacy + repo whitelist guard rail**:

- `C:\dev\Game` e' nel whitelist `~/.config/aider-privacy-whitelist.txt` (cloud OK per codice). NON e' un blocker per Fase-1.
- Vault edits (RECON-06) sono sibling-peer NON in whitelist; codemasterdd PUO' aprire feature-branch + PR su vault-shared MA MAI merge (Eduardo-only). Vedi codemasterdd CLAUDE.md §boundary amended 2026-05-16.

**G6. Backend canonical (SoT §1)** (ADR §Decision 4):

- Godot consume genotype via API HTTP, NON deve avere logica genotype divergente.
- RECON-05 prepara il seam HTTP consumer; unificazione 3 impl Godot DEFERITA Fase-2.

## 3. Ticket plan -- TKT-SPORE-FASE1-RECON-01..06

### TKT-SPORE-FASE1-RECON-01 -- E2E integration verify + playtest log [2h]

**Goal**: empirical confirm full path encounter -> mp accrue -> mutation apply -> bingo refresh -> render dot. Document baseline metrics.

**Pre-condition**:

- Ryzen backend boot OK (PG17 standalone `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/game`).
- `@game/*` node_modules = Windows-junction (NO MSYS-symlink).
- E2E test runner config noto (G4 risolto -- workaround tdd-guard chosen).

**Touch points** (NO edit, solo run + measure):

- `npm run dev` (backend express) + `npm run play` (frontend) OR test E2E esistente.
- `apps/backend/routes/mutations.js` (registry/eligible/apply/bingo).
- `apps/backend/services/mutations/mpTracker.js` (accrueEncounter).
- `apps/backend/routes/campaign.js` (hook accrueEncounter post-encounter).
- `apps/play/src/render.js` (drawMutationDots aspect_token overlay).
- `apps/play/src/characterPanel.js` (MP display).

**Steps**:

1. Boot backend + frontend. Verify `/api/v1/mutations/registry` returns 36 mutations.
2. Create test unit (initial mp=5, applied_mutations=[], trait_ids con almeno 1 prereq trait).
3. Trigger encounter tier>=2 + kill_with_status -> verify `unit.mp >= 8`.
4. POST `/api/v1/mutations/apply` su mutation tier 2 con prereq met -> verify 200 + slot conflict check + mp deducted + bingo recomputed.
5. Apply 3 mutation stessa category (es. 3 physiological) -> verify `bingo.archetypes[0].archetype === 'tank_plus'`.
6. Apply 4a stessa category, mismatched body_slot -> 409 slot_conflict.
7. Frontend: open characterPanel, verify mp display update + render dot aspect_token visible.

**Post-condition**:

- Playtest log saved: `docs/research/2026-05-26-fase1-spore-e2e-baseline.md` con metrics (mp accrue rates, bingo trigger frequency, render correctness).
- Issue list creato per ogni gap discovered (separato dai ticket Fase-1 -- inform RECON-02..06 prioritization).

**Risk**:

- Backend boot fail (PG17 down / junction broken) -> blocker pre-Fase1.
- Test runner config incompatible (G4) -> blocker.
- Discovery: integration bug shipped finora non rilevato (es. event sink crash silent) -> escalation, may add RECON-07.

**Definition of Done**:

- E2E log written + linked in DoD checklist.
- Almeno 1 happy path PASS documentato con request/response payload.
- 1 negative path PASS (slot conflict 409).

---

### TKT-SPORE-FASE1-RECON-02 -- Populate derived_ability_id [3-4h authoring]

**Goal**: chiudere S2 emergent ability. Spore research stima "10-15 entries con ability derivata" out of 36. Selezione design-driven, NON all-or-nothing.

**Pre-condition**:

- RECON-01 PASS (engine wire confermato).
- `data/core/traits/active_effects.yaml` (verified 2026-05-26 path correction post harsh-review) accessibile + esistente. Se NON esiste o gap ability_id target -> escalation Fase-1.5.

**Touch points**:

- `data/core/mutations/mutation_catalog.yaml` -- 10-15 entries da populated (current ALL null su 36).
- `data/core/traits/active_effects.yaml` -- verify ability_id target esistenti; se gap, definire.
- Test: `tests/services/mutationEngine.applyMutationPure.test.js` -- estendere caso per derived_ability_id populated.

**Selection criteria** (quali 10-15 entries):

1. Mutation tier 2-3 con `trait_swap.add` che gia' implica ability (es. `denti_chelatanti` -> `bite_chelate` ability).
2. Coverage cross-category (almeno 2 per category per non bias).
3. Skip symbiotic (body_slot=null, ability emergence semantically different per ADR §S2 -- defer Fase-2 symbiont job archetype).
4. Skip Manual_apply_only (`trigger_conditions: []` perche' player-chosen):
   `coda_balanced_to_counter`, `zampe_spring_to_radiant`, `simbionte_lichene_solare`, `branco_cooperazione_segnalata`, `ghiandole_ink_to_acid` -- ability emergence va comunque OK ma documento decisione.

**Authoring template per entry**:

```yaml
derived_ability_id: <ability_id> # ref data/core/active_effects.yaml
# Description in description_it block: aggiungere mention "Sblocca: <ability>"
```

**Test additivo**:

- Unit test: applyMutationPure su entry populated -> assert `result.derived_ability_id === <ability_id>` + `updatedUnit.abilities` contains it.
- Lint extension (opzionale, RECON-03 territory): warn se `tier >= 2 && derived_ability_id === null && category !== 'symbiotic'`.

**Post-condition**:

- 10-15 entries con `derived_ability_id` non-null.
- Active effects mapping presente per ogni id citato.
- Test PASS.

**Risk**:

- `active_effects.yaml` non esiste -> blocker autoring, escalation (likely Fase-1.5).
- Authoring debt -> 36 entries totali, oggi 0 populated; resta debt non-coperto (20-25 entries restano null). DOCUMENTARE explicit nel PR body.

**Definition of Done**:

- PR diff con 10-15 entries populated.
- Test unitario PASS.
- Linter pass (no regressioni Pattern-6).

---

### TKT-SPORE-FASE1-RECON-03a -- Bingo rebalance via re-categorize + monte-carlo [2-3h]

**Goal**: chirurgico re-categorize 2-3 borderline physiological -> environmental (target solo path Hybrid leggero, NO new entries) + monte-carlo test. Sblocca bingo ship con minimal authoring cost.

**Pre-condition**:

- RECON-01 PASS (baseline empirical bingo trigger rate).
- RECON-02 MERGED (perche' RECON-03a edita lo stesso file YAML -- vedi P0 #5 Wave 2 serialization).

**Touch points**:

- `data/core/mutations/mutation_catalog.yaml` -- re-categorize 2-3 entries (no new).
- Test: `tests/services/computeMutationBingo.balance.test.js` (NEW) -- monte-carlo 1000 random build.
- Lint `tools/py/lint_mutations.py` -- mantenere Pattern-6.

**Steps**:

1. Identificare 2-3 borderline physiological con biome dependence forte (es. tegument-related): candidate `pelle_burn_to_dielectric` (gia' env), `scheletro_buffer_upgrade`, `cuticole_wax_to_neutralize`. Scegliere 2-3 con master-dd approval.
2. Grep cross-codebase `category:.physiological\|category:.environmental` per verify nessun saga state fingerprint usa categoria come key. Se positive -> abort re-categorize, escalate RECON-03b.
3. Re-categorize approvato (yaml edit).
4. Monte-carlo test (1000 build x 5 mut random): assert tank_plus trigger < 50%.

**Post-condition**:

- Distribution +- 2 entries shifted physiological -> environmental.
- Monte-carlo test PASS (tank_plus <50%).

**Risk**:

- Se nessuna borderline candidate valida (semantics rompono) -> escalate RECON-03b (catalog expansion). Documentare decisione.

**Definition of Done**:

- PR diff con 2-3 re-categorize.
- Monte-carlo test salvato + PASS.
- PR body note: "tank_plus trigger rate pre/post = X% / Y%".

---

### TKT-SPORE-FASE1-RECON-03b -- Bingo catalog expansion (authoring debt closure) [4-6h authoring]

**Goal**: chiusura definitive authoring debt -- aggiungere 3-4 entries per category bassa fino a target 7-8 per category. Esegue SE RECON-03a fail OR master-dd vuole completare debt da subito.

**STATUS**: gate authoring. Eseguire solo se (a) RECON-03a escalate, OR (b) master-dd decide chiusura immediate debt. Default RECON-03a sufficient per Fase-1 ship; RECON-03b puo' essere Fase-1.5 followup.

**Pre-condition**:

- RECON-02 MERGED.
- RECON-03a MERGED (perche' baseline post-rebalance e' input).
- master-dd kickoff con design decisions su 12-16 nuove mutation (full schema each: body_slot + aspect_token + visual_swap_it + trigger_conditions + description_it + derived_ability_id design).

**Touch points**:

- `data/core/mutations/mutation_catalog.yaml` -- 12-16 new entries.
- Test: monte-carlo update threshold check.

**Definition of Done**:

- Distribution 14/9/9/8/8 -> ~48 entries.
- Monte-carlo PASS (nessun archetype > 50%).
- Lint PASS.

**Note framing onesta (harsh-review P1 #1)**: RECON-03b e' AUTHORING NON reconciliation. Il plan globale e' "reconciliation + authoring debt closure" se 03b incluso; "reconciliation only" se 03a sufficient.

---

---

### TKT-SPORE-FASE1-RECON-04a -- SCHEMA-RIPPLE audit + cost-charging contract test [2-3h]

**Goal**: gate G1 (ripple read-only audit) + cost-charging deferred_m13_p3 contract test. Verificare assenza coupling nascosto che bypassa enforce. G2 complexity-budget e' SPOSTATO a RECON-04b inline implementation (audit-only NON basta -- vedi P0 #2 harsh-review).

**Pre-condition**:

- RECON-01 PASS.

**Touch points** (READ-only):

- `apps/backend/services/progression/progressionEngine.js` -- grep `mutation`, `mp_cost`, `mp_`, `body_slot`. Verify che progressionEngine NON applica mutation bypassing mutationEngine. Se trovato -> gap, escalation.
- `apps/backend/services/rewards/rewardOffer.js` -- grep `mutation`, `mp_cost`, `pool`, `M`. Verify pool M wiring (mpTracker) NON ha duplicato softmax MP handling che possa double-charge.
- `apps/backend/services/forms/formEvolution.js` -- gia' verificato (M12 MBTI evolution, scope diverso da mutation). Confermare non emergent coupling.
- `apps/backend/services/metaProgression.js:465` `rollMatingOffspring` -- verify enforcement complexity-budget Σc <= C_max al return.
- `data/core/mating.yaml` -- verify `gene_slots` schema NON aggira slot-conflict gating.

**Steps**:

1. Grep cross-codebase: `applied_mutations`, `applyMutation`, `mp_cost`, `body_slot`. Map ogni call site.
2. Per ogni call site, classificare: (a) consumer (legge), (b) producer (scrive). Producer fuori da mutationEngine route = potenziale bypass.
3. **Step 5 explicit (harsh-review P1 #3)**: per ognuno di `apps/backend/services/progression/progressionEngine.js` + `apps/backend/services/rewards/rewardOffer.js` + `apps/backend/services/forms/formEvolution.js`, grep `mp_cost\|body_slot\|applied_mutations\|derived_ability` e documenta zero-hit (negative confirmation esplicita, NOT implicit). Se any positive hit -> escalate inline.
4. **Contract test cost-charging (harsh-review P0 #4)**: scrivere `tests/routes/mutations.cost-charging-contract.test.js` che asserta: response da POST /api/v1/mutations/apply contiene `cost_charging: 'deferred_m13_p3'` + zero side-effect su `unit.pe` e `unit.pi` (pre vs post unchanged). Vieta rimozione sentinel senza ADR addendum -- test fail loud se shape change.
5. Write report `docs/research/2026-05-26-fase1-schema-ripple-audit.md` con: call site map + gap list + recommended fix priority (Fase-1 inline / Fase-1.5 followup / Fase-2 deferred).

**Post-condition**:

- Audit report saved.
- Gap list classificato P0/P1/P2.
- Eventuali P0 escalation -> aggiungere ticket inline a Fase-1 (es. RECON-04b).

**Risk**:

- Discovery: progressionEngine ha hidden mutation handling -> contraddice "mutationEngine canonical" pattern -> requires Fase-1 refactor (out of estimate, escalation).
- complexity-budget enforce missing in mating-side -> deferred Fase-2 ma documentato qui.

**Definition of Done**:

- Report saved.
- Cluster check completato + zero P0 hidden gap (OR escalation triggered).
- Cost-charging contract test merged + PASS.

---

### TKT-SPORE-FASE1-RECON-04b -- Complexity-budget Σc<=C_max enforce inline (mating-side) [2-3h]

**Goal**: chiudere G2 gate aggiungendo enforce hook in `rollMatingOffspring` post-build PRE-return. ADR-2026-04-26 lock-in oggi NON enforced -- gate unmeetable senza questo ticket (P0 #2 harsh-review).

**Pre-condition**:

- RECON-04a PASS (audit conferma assenza enforce esistente).
- ADR-2026-04-26 ha `C_max` valore definito (verify -- se TBD, escalate inline owner master-dd per pick numero).
- Test runner config OK (G4 workaround applicato).

**Touch points**:

- `apps/backend/services/metaProgression.js:465-551` `rollMatingOffspring` -- aggiungere enforce block PRE-return linea 545.
- **NEW** test: `tests/services/metaProgression.complexityBudget.test.js` -- 3 caso (under-budget pass, at-budget pass, over-budget reject+retry).
- (Opzionale) `data/core/mating.yaml` -- exportare `c_max` config se vuoi tunable runtime, o hardcode in metaProgression con const.

**Impl approach**:

```javascript
// After bonus traits sampling, before const offspring = {...}:
const totalComplexity = computeOffspringComplexity({
  inheritedSlots,
  environmentalMutation,
  bonus,
});
const C_MAX = Number(process.env.OFFSPRING_C_MAX) || 10; // ADR §S3 default TBD
if (totalComplexity > C_MAX) {
  // Retry sampling with reduced bonus traits OR reject if iter > N
  // Decision design needed: pick strategy (re-sample / reject / drop-lowest-cost-bonus)
}
```

**Decision gate**: strategia su over-budget = master-dd pick. Default raccomandato: drop random bonus trait fino a Σc<=C_max (preserve inherited slots).

**Steps**:

1. Verify `C_max` in ADR-2026-04-26 + decisione strategy con master-dd.
2. Add `computeOffspringComplexity` helper (sum mp_cost? sum tier? need definition from ADR -- VERIFY o escalate).
3. Add enforce block in rollMatingOffspring.
4. Add 3 test case + edge "at-budget exact".
5. Verify smoke: rollMatingOffspring smoke run con parent over-budget -> reject path triggera.

**Post-condition**:

- G2 gate MET (file:line `metaProgression.js` post-build enforce presente).
- Test suite PASS.

**Risk**:

- `C_max` valore TBD in ADR -> blocker. Escalate inline master-dd; default fallback const 10 con TODO documento.
- `computeOffspringComplexity` formula TBD (sum mp_cost vs tier vs custom) -> escalate inline.
- Retry-sampling infinite loop se C_max irraggiungibile -> hard cap iter 5, fallback drop-bonus.

**Definition of Done**:

- Enforce hook presente file:line.
- 3 test PASS.
- §1 truth-table riga S3/G2 aggiornata: SHIPPED.

---

### TKT-SPORE-FASE1-RECON-05 -- [MOVED TO FASE-2] Godot consumer seam

**Status post harsh-review P1 #2**: dead-code seam senza concrete consumer (3 impl divergenti rimangono finche' Fase-2 unification). Costo 3-4h GDScript + GUT test che NESSUNO chiama oggi. Rischio: se Fase-2 unification design cambia API shape, client si riscrive.

**Decision**: SPOSTATO INTERAMENTE A FASE-2 -- unifica seam + 3 impl in un singolo work item, NO dead-code intermedio.

**Fase-2 work item futuro**: "Godot mating unification + canonical HTTP consumer" -- aggiunge `genetics_api_client.gd` E migra ALMENO 1 dei 3 impl (mating_trigger / lineage_merge / offspring_ritual) come proof-of-life. ADR-2026-05-26 §Decision 4 gia' deferisce esplicitamente l'unificazione a Fase-2.

**Allora cosa rimane Fase-1 per Godot?**: NULLA editing-side. PRD-BUILD-STATUS overlay refresh (RECON-06) basta a marcare "backend Fase-1 SHIPPED, Godot unify deferred Fase-2".

---

### TKT-SPORE-FASE1-RECON-06 -- SoT promotion + overlay sync [1-2h docs]

**Goal**: post-ship promotion artefatti -- vault SoT D-HEIR canonical section + cross-repo overlay refresh.

**Pre-condition**:

- RECON-01..05 PASS (Fase-1 ships).

**Touch points**:

- **vault** `Spaces/Dev/Evo-Tactics/core/00-SOURCE-OF-TRUTH.md`:
  - §"Design still to AUTHOR" line 53-56: rimuovere D-HEIR (promosso) e D-REPRO (promosso); lasciare D-CLAN.
  - Aggiungere **§24 D-HEIR canonical (3-layer Genotype/Phenotype/Epigenome)** -- riassunto dello spec design 2026-05-26 con scope flag chiaro: Fase-1 SHIPPED, Fase-2/3 vision.
  - Cross-link a `docs/superpowers/specs/2026-05-26-...` (Game repo) + ADR-2026-05-26.
- **vault** `Spaces/Dev/Evo-Tactics/core/90-FINAL-DESIGN-FREEZE.md`:
  - §21.3 banner gia' merged PR #199 ("superseded SCOPED da ADR-2026-05-26 -- vedi Game ADR"). Verify ancora presente, NO regression.
- **Game-Godot-v2** `docs/godot-v2/PRD-BUILD-STATUS-GODOT-V2.md`:
  - Aggiornare §"Design still to AUTHOR" linee 53-56: rimuovere D-REPRO + D-HEIR (entrambi shipped Fase-1 backend-side).
  - Aggiornare riga `Mating + genetics` a `🟡 (backend canonical SHIPPED Fase-1, Godot unify deferred Fase-2)`.

**Boundary policy (codemasterdd CLAUDE.md amended 2026-05-16)**:

- Codemasterdd PUO' aprire feature-branch + PR su vault-shared (es. `claude/fase1-spore-sot-promotion`). **MAI direct-main push. MAI merge** -- Eduardo media il merge via PR review.
- Game-Godot-v2 -- usa governance interna propria (CLAUDE.md + AGENTS.md). Aprire PR draft, no merge da codemasterdd.

**Post-condition**:

- Vault PR aperto su feature branch.
- Game-Godot-v2 PR aperto su feature branch.
- Codemasterdd CLAUDE.md NON modificato (out of scope -- Fase-1 e' Game-side).

**Risk**:

- Vault commit-msg hook: description LOWERCASE dopo `type():`. Verify formato prima di push.
- Game subject ≤72: stesso vincolo.

**Definition of Done**:

- 2 PR aperti (vault + Game-Godot-v2), 0 merged.
- Eduardo notificato in PR description.

---

## 4. Risk matrix Fase-1 (UPDATED post harsh-review 2026-05-26)

| Risk                                                                        | Likelihood | Severity | Mitigation                                                                         | Owner     |
| --------------------------------------------------------------------------- | ---------- | -------- | ---------------------------------------------------------------------------------- | --------- |
| RECON-01 boot fail Ryzen PG17                                               | Med        | High     | Pre-flight check DB up + junction node_modules; fall back doc                      | claude    |
| RECON-02 active_effects.yaml gap (path corretto: data/core/traits/)         | Med        | Med      | Pre-flight verify file exists; escalation Fase-1.5 se gap ability_id               | claude    |
| RECON-03a monte-carlo regression (re-categorize rompe semantic)             | Low        | Med      | Grep `category:.physiological\|environmental` per fingerprint check PRE-edit       | master-dd |
| RECON-03b authoring debt 12-16 entries scope-creep                          | High       | Med      | Defer come Fase-1.5 default; eseguire solo se RECON-03a fail                       | master-dd |
| RECON-04a P0 hidden bypass discovered (progressionEngine emergent coupling) | Low        | High     | Read-only audit prima fix -> nuovo ticket isolato, NON inline                      | claude    |
| RECON-04b C_max valore TBD in ADR-2026-04-26                                | Med        | Med      | Escalate inline master-dd con default fallback const 10 + TODO                     | master-dd |
| RECON-04b computeOffspringComplexity formula TBD                            | Med        | Med      | Escalate inline master-dd                                                          | master-dd |
| RECON-04b retry-sampling infinite loop                                      | Low        | High     | Hard cap iter 5 + fallback drop-bonus                                              | claude    |
| RECON-06 vault hook lowercase fail                                          | Med        | Low      | Pre-commit dry run; format check inline                                            | claude    |
| Schema-ripple discovered gap mid-RECON-02/03                                | Med        | High     | G1 enforce: stop edit + escalation harsh-reviewer                                  | claude    |
| Bingo trigger >50% post-rebalance (RECON-03a)                               | Med        | Med      | Iterate: escalate RECON-03b authoring                                              | master-dd |
| tdd-guard blocca impl JS (G4)                                               | High       | Med      | G4 workaround chosen PRE-Wave-1 (Eduardo decide Option A/B); BLOCKER se non chiuso | Eduardo   |
| **Wave 2 merge conflict YAML** (RECON-02 + RECON-03a same file)             | **High**   | **Med**  | **Serialize 02 -> 03a (NON parallel) -- vedi §7 sequencing aggiornato**            | claude    |
| Cost-charging M13.P3 double-charge silent (deferred sentinel removed)       | Low        | High     | Contract test in RECON-04a forbids silent removal                                  | claude    |
| Godot CLAUDE.md / AGENTS.md governance conflict                             | Low        | Low      | RECON-06 legge governance interna prima, NO sovrascrivere                          | claude    |

## 5. Out of scope explicit (DOCUMENTATO per evitare scope-creep)

**Fase-1 NON include**:

- Epigenome / Lamarck-lite (Fase-3, requires decay/regression params TBD)
- Deep genealogie multi-gen (Fase-3)
- S5 ambient-drift `propagateLineage` lifecycle hook (Fase-2)
- Cross-lineage isolation bug fix `lineagePropagator.js:14-15` (Fase-2)
- **Godot consumer seam genetics_api_client.gd** (MOVED Fase-2 post harsh-review -- evita dead-code senza concrete consumer, unifica seam + ALMENO 1 dei 3 impl in singolo Fase-2 ticket)
- Unificazione 3 impl Godot mating (mating_trigger avg-blend + lineage_merge + offspring_ritual) (Fase-2)
- Hybrid promotion da display-only a merge genetico reale (Fase-2)
- Cost-charging PE/PI deferred M13.P3 -- routes/mutations.js linea 196 `cost_charging: 'deferred_m13_p3'`. **MITIGATION Fase-1**: RECON-04a contract test forbids silent removal del sentinel (double-charge guard via lock-in test).
- 30 -> 50 mutations expansion (Spore Full path, future) -- RECON-03b parziale fino a ~48
- UI gene grid 3x3 in formsPanel (Spore Full, fuori Moderate)
- biomeSpawnBias mutation gates by biome turn count (Spore Full)
- Speciazione soglia complexity/T-band (Fase-3)

**Anti-pattern guard**:

- Trigger ticket greenfield (es. "rebuild mutationEngine from scratch") -> harsh-reviewer reject. Engine SHIPPED, reconcile non rebuild.
- Trigger ticket "fix lineagePropagator cross-lineage" inline Fase-1 -> reject (ADR esplicito Fase-2).

## 6. Definition of Done Fase-1 globale (UPDATED post harsh-review)

**Distinzione critica (harsh-review P1 #6)**: "Game-runtime SHIPPED" != "closure complete". Eduardo merge-mediation NON deve bloccare STATUS_MULTI_REPO marker SHIPPED.

### Fase-1 Game-runtime SHIPPED (merged, tagged release):

1. RECON-01 E2E log salvato + happy + negative path PASS.
2. RECON-02 PR merged con 10-15 entries derived_ability_id populated + test PASS.
3. RECON-03a PR merged con re-categorize + monte-carlo PASS (no archetype > 50% random build).
4. RECON-04a audit report saved + zero P0 hidden gap + cost-charging contract test PASS.
5. RECON-04b complexity-budget enforce hook merged + 3 test PASS + §1 truth-table aggiornata.
6. (Conditional) RECON-03b merged SE master-dd vuole closure debt immediate; altrimenti tracked Fase-1.5.

### Fase-1 closure complete (post merge Eduardo-mediation):

7. RECON-06 vault PR aperto + Eduardo-merged.
8. RECON-06 Game-Godot-v2 PR aperto + Eduardo-merged.

### Cross-cutting:

9. **NO new ADR required** per chiudere Fase-1 (scope ADR-2026-05-26 sufficient).
10. **STATUS_MULTI_REPO codemasterdd updated** post-step-6 per riflettere "Fase-1 Game-runtime SHIPPED" (NON aspettare 7+8).
11. **Codemasterdd JOURNAL** entry sessione 2026-05-26 con DoD checklist.

## 7. Sequencing + parallelism (UPDATED post harsh-review P0 #5)

**Critical insight**: RECON-02 + RECON-03a entrambi edita `mutation_catalog.yaml`. Parallel = guaranteed merge conflict. SERIALIZE.

```
[Pre-Fase-1] G4 tdd-guard workaround Eduardo-decide PRE-Wave-1 (BLOCKER se non chiuso)
       |
[Wave 1, ~2h]   RECON-01 (E2E baseline -- BLOCKER per resto)
       |
[Wave 2 parallel, ~4-6h]
       |-- RECON-04a (audit + cost-charging contract test, read-only, claude) PARALLEL OK
       |-- RECON-02 (derived_ability authoring, claude) SERIAL-START
       |
[Wave 2.5, ~2-3h]    -- richiede RECON-02 MERGED
       +-- RECON-03a (re-categorize + monte-carlo, claude + master-dd)
       |
[Wave 3 parallel, ~2-3h]    -- richiede Wave 2.5 PASS
       |-- RECON-04b (complexity-budget enforce inline, claude + master-dd C_max decision)
       |-- RECON-06 (SoT + overlay docs, claude)
       |
[Optional Wave 3.5, 4-6h]   -- master-dd decision
       +-- RECON-03b (catalog expansion authoring debt closure)
       |
[Closure] DoD §6 checklist + STATUS_MULTI_REPO update (post Wave 3 sufficient) + harsh-reviewer cluster review pre-merge ogni cluster ≥3 PR
```

**Estimate honest UPDATED**:

- Minimum path (skip 03b): Wave 1 (2h) + Wave 2 (4-6h overlap) + Wave 2.5 (2-3h) + Wave 3 (2-3h) = **8-12h**.
- Full path (include 03b authoring debt closure): + 4-6h = **12-18h total**.
- ADR-2026-05-26 cita "~21h" -- onesto solo se include 03b authoring debt; minimum path conferma ~10h tipico.

## 8. Branch + PR strategy

- **Branch base**: `feat/fase1-spore-reconciliation` (umbrella Game repo).
- Sub-branch per ticket: `feat/fase1-spore-recon-01-e2e`, `feat/fase1-spore-recon-02-derived-ability`, etc.
- PR draft -> 2-stage review per-ticket (self-check + harsh-reviewer su cluster ≥3 PR consecutivi schema-touching).
- NO merge automatic. Eduardo media merge ogni PR.
- Conventional Commits: `feat(spore-fase1): ...` o `chore(spore-fase1-recon): ...` -- subject ≤72.

## 9. Cognitive protocols applied

- **P1 Refresh-verify** OBBLIGATORIO: applicato pre-plan (verificati spec + ADR + spore research + freeze §21.3 + 8 file Game runtime). Catch: spore research §4 outdated -> plan baselined su empirical, NON sul doc 2026-04-26. **Catch addizionale post harsh-review**: §1 body_slot count off-by-2 (mouth+tegument), complexity-budget enforce assente -- P1 stesso aveva miss che harsh-review ha caught.
- **P2 Autoresearch multi-source**: weighted internal > external; empirical (Read/Grep) > documentation (research doc 30-day-old).
- **P5 Harsh-reviewer cluster scrutiny APPLICATO PRE-RELEASE**: subagent general-purpose con boundary read-only invocato pre-final-write 2026-05-26. Trovati **5 P0 + 6 P1 + 3 P2 finding**. P0 #1-5 fixed inline (table counts, complexity-budget demote, active_effects path, cost-charging contract test, Wave 2 serialize). P1 #1-2 fixed inline (RECON-03 split a/b, RECON-05 moved Fase-2). P1 #3-6 + P2 partial-fix. **Pattern adopted as standard** per cluster plan documentation governance-critical (NON solo per code PR cluster).
- **P6 Brainstorming**: NON applicato (advisory plan da spec gia' approvato, NOT new architectural design). Spec D-REPRO/D-HEIR gia' presentato 3 approach + tradeoff in §1-5; Fase-1 e' execution slice.
- **P3 Archon 7-step**: NON applicato (decision high-stakes irreversibile gia' nell'ADR-2026-05-26; questo plan e' execution).
- **P7 SDMG**: NON applicato (questo NON e' self-designed-method da integrare in governance durevole; e' application di metodo gia' adottato writing-plans + harsh-reviewer).

## 10. Gotcha tecnici Ryzen Game (memory: ryzen_game_backend_boot)

- **PG17 standalone**: `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/game`. Docker rotto.
- **@game/\* node_modules**: Windows-junction, NON MSYS-symlink (rompe node resolution).
- **husky lint-staged**: ora funziona post-env-fix sessione 2026-05-26.
- **vault commit-msg hook**: description LOWERCASE dopo `type():`. Esempio OK: `chore(sot): promote d-heir canonical post fase-1 ship`.
- **Game subject ≤72 char**.
- **tdd-guard**: workaround scelto pre-Wave 1 (G4 sopra).

---

## 11. Harsh-review log + amendments 2026-05-26

Pre-finalizzazione: spawned subagent harsh-reviewer (general-purpose, boundary read-only) per cluster scrutiny pre-commit. Findings + applicazione:

**P0 fixed inline (5/5)**:

- P0 #1 §1 table body_slot counts wrong (mouth=8 not 6, tegument=10 not 12) -> fixed §1 table riga 1.
- P0 #2 G2 complexity-budget enforce VERIFIED MISSING in `metaProgression.js:465-551` -> demotion §G2, added §1 table riga G2 MISSING, RECON-04b new ticket inline.
- P0 #3 RECON-02 path `data/core/active_effects.yaml` wrong -> corrected `data/core/traits/active_effects.yaml`.
- P0 #4 cost-charging deferred_m13_p3 silent double-charge risk -> RECON-04a Step 4 added contract test.
- P0 #5 Wave 2 YAML merge conflict (RECON-02 + RECON-03a same file) -> §7 sequencing serialized RECON-02 -> RECON-03a (Wave 2.5).

**P1 fixed inline (2/2 critical, 4 noted)**:

- P1 #1 "90% shipped" framing hides RECON-03 scope creep -> split RECON-03 in 03a (chirurgico 2-3h) + 03b (authoring debt 4-6h, optional).
- P1 #2 RECON-05 dead-code seam risk -> MOVED ENTIRELY Fase-2 (single work item with concrete consumer).
- P1 #3 RECON-04 audit Step 5 explicit grep -> added Step 5 cross-codebase negative confirmation.
- P1 #4 G4 ambiguity gate-vs-question -> DECISION GATE PRE-WAVE-1 Eduardo decide Option A/B con default raccomandato.
- P1 #5 G3 ship policy contradiction -> chiarito: bingo runtime SHIPS sempre con `BINGO_ENFORCE` env flag fallback.
- P1 #6 DoD §6 conflate runtime ship vs closure -> §6 split in "Game-runtime SHIPPED" vs "closure complete".

**P2 noted (not fixed, low priority)**:

- P2 #1 §1 S2 "no-op finche' populated" wording -> nota: well-defined back-compat behavior.
- P2 #2 vault commit-msg lowercase + scope hyphenation -> RECON-06 risk row documentato.
- P2 #3 vault hook High likelihood -> downgrade Med dopo pre-commit dry run mitigation.

**Verdict harsh-reviewer**: "plan strutturalmente sound (P1 visible) ma 5 P0 empirici/structural defects catch reali bug merge-time. 90% framing soft-pedals (a) G2 enforce missing mating-side, (b) 14/36 distribution count off-by-2, (c) Wave 2 YAML conflict garantito. RECON-05 weakest. Fix P0 + P1 #1-2 pre-kickoff, resto landa amendments durante exec." -- TUTTO P0+P1#1-2 ora fixed.

---

## 12. Open-decision resolution log (Eduardo direction 2026-05-26 post empirical research)

5 decisioni risolte via grep+read evidenza repo (NON deduzione):

| #   | Decisione                          | Resolution                                                                                                                                                             | Evidenza                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | G4 tdd-guard Option A vs B         | **NO TOOL INSTALLATO** -- standard TDD discipline (commit test RED prima, commit impl GREEN dopo). NO option needed.                                                   | `grep tdd-guard` Game repo: 0 match. Test runner = `node --test` direct via `scripts/run-test-api.cjs` 17 step, NO reporter wrapper. Husky pre-commit blocca solo lint-staged + replace_all + trait_mirror.                                                                                                                                                                                                              |
| 2   | C_max valore                       | **C_max = 30** (env override `OFFSPRING_C_MAX`). Reducibile a 25 se gameplay testing mostra power-creep.                                                               | ADR-2026-04-26 NON definisce numero. Math empirico: 3 mutation per offspring (mating.yaml `parent_slots:2 + env_mutations:1`) × mp_cost 8-15 catalog real = range 24-45. `MP_POOL_MAX=30` (mpTracker.js:26) -> C_max=30 matches "offspring complessita' ≤ 1 full MP pool".                                                                                                                                               |
| 3   | computeOffspringComplexity formula | **Σ mp_cost(offspring.applied_mutations[])** -- semplice ADR-consistent. Switch tier-based (Σtier, range 3-9, C_max=7) come fallback se mp_cost-sum produce edge case. | gene_slots in mating.yaml = astratti (corpo/arti/corazza), NON mutation_id direct. Complessita' semanticamente applies ai mutation stacked. catalog has mp_cost per entry, tier per entry -- entrambe disponibili.                                                                                                                                                                                                       |
| 4   | RECON-03b inline vs defer          | **DEFER Fase-1.5** -- RECON-03a alone sufficient per ship gate.                                                                                                        | Analytical baseline: catalog 14/6/6/5/5, random 5-pick build P(tank_plus trigger) ≈ 30% via binomial(5, 0.389). Post RECON-03a re-categorize 3 phys->env: distribution 11/6/6/5/8, P(trigger) ≈ 13%. Threshold ship gate plan = 50%. **Caveat**: real builds NON random (player bias verso tank stack). Monte-carlo RECON-03a deve testare BOTH random + tactical-biased build. Se tactical fail -> escalate 03b inline. |
| 5   | Branch + PR mode                   | **SINGLE-PR-per-branch (NO umbrella)** -- allineato pattern recente repo. 6 sub-branch separati.                                                                       | `git log --merges` + `git branch -a` recent: 0 umbrella branch nel pattern 2026-05. Ogni ticket = own branch. Esempi: `feat/orphan-wire-morale-2026-05-26` PR #2390, `claude/parallel-coop-test-coverage-2026-05-20` PR #2335, `chore/design-repro-heir-genetic-model` PR #2392.                                                                                                                                         |

### Branch plan finale (NO umbrella)

```
chore/spore-fase1-recon-plan-2026-05-26     <- QUESTO PR (docs only, plan file)
feat/spore-fase1-recon-01-e2e-baseline       (RECON-01, ~2h)
feat/spore-fase1-recon-02-derived-ability    (RECON-02, ~3-4h)
feat/spore-fase1-recon-03a-bingo-rebalance   (RECON-03a, ~2-3h)
feat/spore-fase1-recon-04a-ripple-audit      (RECON-04a, ~2-3h)
feat/spore-fase1-recon-04b-complexity-budget (RECON-04b, ~2-3h)
chore/spore-fase1-recon-06-sot-promotion     (RECON-06, ~1-2h, cross-repo vault+Godot)
```

Optional (Fase-1.5 defer default):

```
chore/spore-fase15-recon-03b-catalog-expansion (RECON-03b, ~4-6h authoring)
```

Eduardo media merge ogni PR. NO auto-merge anche se L3 criteria satisfied (Eduardo oversight gate mantenuto).

---

**END PLAN -- POST-REVIEW v3 2026-05-26 (5 open decisions resolved, ready for execution).**
