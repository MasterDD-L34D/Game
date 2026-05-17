---
doc_status: draft
doc_owner: catalog-curator
workstream: dataset-pack
last_verified: 2026-04-25
source_of_truth: false
language: it
review_cycle_days: 30
---

# Mutation System Design — Evo-Tactics

> Sprint context: 2026-04-25 autonomous content sprint. Design doc per
> sistema mutazioni (M14+) + 30 mutation catalog baseline in
> `data/core/mutations/mutation_catalog.yaml`. **Design intent additive**:
> non ancora wired al runtime, ma schema futuro-compatibile con
> `apps/backend/services/forms/formEvolution.js` (M12.A).

## 1. Vision

Le mutazioni rappresentano **specializzazioni evolutive irreversibili** di
una creatura/unit. Differenze rispetto agli altri 2 sistemi di crescita:

| Sistema                   | Cosa cambia                | Reversibile   | Trigger                   | Cadenza             |
| ------------------------- | -------------------------- | ------------- | ------------------------- | ------------------- |
| **Job leveling** (M13.P3) | Stat + perks               | No            | XP threshold              | Lineare 1-7 livelli |
| **Form evolution** (M12)  | MBTI form_id (e.g. "ISTP") | Sì (cooldown) | VC axes confidence        | Discreta 16 form    |
| **Mutation** (M14, NUOVO) | Trait swap fisico          | No            | Multi-trigger (PE+PI+exp) | Branching tree      |

In-fiction: la creatura/specie _si trasforma_ irreversibilmente per
adattarsi a pressione ambientale o esperienza traumatica. Player loop:
**trigger→preview→costo→consequence**.

## 2. Loop player

```
[1] Combat experience      ─→  [2] Mutation eligible event
   (PE earned, biome time)        (server emits "mutation_offered")
                                                ↓
[5] Apply trait_swap        ←──  [3] Modal preview with cost + bias
   (UI flash + sound)              (player sees: trait gained, lost,
                                    biome boost/penalty, mbti shift)
        ↓                                       ↓
[6] Lock-in (irreversible)  ←──  [4] Confirm? PE/PI deducted
   (no undo, save)                             ↓
                                            [LOOP closed]
```

## 3. System mechanics

### 3.1 Tier struttura

| Tier | PE cost | PI cost | Examples                      |
| ---- | ------- | ------- | ----------------------------- |
| 1    | 5       | 3       | Trait acquire (no swap)       |
| 2    | 10-12   | 5-7     | Trait swap singolo            |
| 3    | 20-25   | 10-15   | Capstone trait + chain prereq |

T1 = "acquired", T2 = "specialized", T3 = "evolved capstone". Solo T2/T3
implementati nel baseline catalog (T1 fa parte del job perks system M13).

### 3.2 Trigger types (5 categorie)

1. **Combat XP**: "killed N enemies of trait X with this unit"
2. **Status applied**: "applied N panic / bleeding / fracture"
3. **Biome exposure**: "spent N rounds in biome X"
4. **Survival**: "took N hits without KO" / "survived encounter at <20% HP"
5. **Pressure-driven**: "Sistema warning_signals X attivo" (high
   pressure tier, narrative event)

### 3.3 Gating rules (mirror M12 formEvolution)

Inspired by `apps/backend/services/forms/formEvolution.js` (M12.A):

1. **Confidence**: trigger threshold raggiunto (no false positives)
2. **PE/PI cost**: fondi sufficienti
3. **Cooldown**: stessa mutation non re-applicabile a stessa unit
4. **Cap**: max 3 mutazioni T2 + 1 T3 per unit (prevent stacking infinite)
5. **Same-trait gate**: non puoi swap-out un trait che è prerequisite di
   un'altra mutation pendente

### 3.4 Conflict resolution

Trait incompatibili:

- **Aquatic** (`branchie_*`) ↔ **Desert** (`pelli_anti_ustione`):
  conflict; mutation che aggiunge una rimuove l'altra
- **Light** (`ali_solari_fotoni`) ↔ **Cave** (`antenne_microonde_cavernose`):
  soft conflict (-1 dmg in biome non-affine, ma stackable)
- **Pack synergy** (`canto_di_richiamo`) ↔ **Solo apex** (`circolazione_supercritica`):
  non conflict, ma synergy degradata

Conflict resolver pattern: server checks `mutation_catalog.conflicts[]`
prima di permettere swap.

### 3.5 Reversibility

**Default: NO**. Mutation è permanente per tutta la sessione corrente.

**Exception "Mutable" tag** (futuro M15): trait con flag
`reversible: true` permettono revert al costo di 50% PE original. Nessun
trait nel baseline ha questa flag — design intent per M15+.

## 4. Catalog summary (`mutation_catalog.yaml`)

**Totale: 30 mutations** (24 T2 + 6 T3)

Distribuzione categorie:

| Categoria     | Count | Note                                                                 |
| ------------- | ----- | -------------------------------------------------------------------- |
| physiological | 14    | trait swap fisici (artigli, denti, pelle, scheletro, carapace)       |
| behavioral    | 4     | rage/panic shifts (intimidator, voice, ferocia)                      |
| sensorial     | 5     | occhi/antenne/ali upgrades                                           |
| symbiotic     | 2     | endosimbiont + filamenti echo (require pack synergy)                 |
| environmental | 5     | biome adaptation (epidermide dielettrica, branchie metalloidi, ecc.) |

Distribuzione tier:

- **T2** (24): primary swap layer, low/medium cost
- **T3** (6): capstone — `carapace_fase_variabile`,
  `circolazione_supercritica`, `antenne_plasmatiche_tempesta`,
  `coda_kinetic_chain`, `zampe_radianti`, `ferocia_to_supercritical`

Tutte validate vs `data/core/traits/glossary.json` (zero unresolved IDs).

## 5. Cross-system integration

### 5.1 Form evolution (M12)

Le mutazioni alterano **MBTI alignment** (`mbti_alignment` field): ogni
mutation aggiunge ±1 a uno o più axes. Quando una unit accumula 5+ shift
in un axis (e.g., +3 E), `formEvolution.evaluate()` upgrades la
confidence per le 4 form ESxx/ENxx affini.

Esempio:

- Unit con form ISFP applica `rage_simple_to_super` (E:+1, T:+1)
- VC snapshot rifletteva I:0.55, T:0.45 → ora T:0.50 → form_id ESFP
  diventa "evolve_eligible"

### 5.2 Pack roller (M12)

Le mutazioni biased fanno **bias dei pack roll**: se una unit ha
mutation `wings_dive_to_phono` (sensory I-N), pack roll su quella unit
ha +0.15 weight su pacchetti R "Insight"/"Nocturne".

Implementazione futura: `packRoller` legge `unit.applied_mutations[]` e
applica softmax bias.

### 5.3 Biome trait costs (M11)

Mutation con `biome_boost`/`biome_penalty` interagiscono con
`data/core/balance/trait_environmental_costs.yaml`:

- Boost: -1 al costo biome del trait (più efficiente)
- Penalty: +2 al costo biome del trait (più dispendioso)

Esempio: `wings_ion_to_solar` ha `biome_boost: [altipiani_solari]` →
`ali_solari_fotoni` in altipiani_solari costa attack_mod -0 invece di -1.

## 6. Telemetry hooks (proposti)

Eventi da emettere via `POST /api/session/telemetry`:

```json
{ "event": "mutation_offered", "payload": {
    "unit_id": "u_skiv", "mutation_id": "ali_panic_to_resonance",
    "trigger_type": "biome_exposure", "trigger_evidence": "5 rounds in caverna",
    "pe_cost": 12, "pi_cost": 5, "round": 4
}}

{ "event": "mutation_accepted", "payload": {
    "unit_id": "u_skiv", "mutation_id": "ali_panic_to_resonance",
    "round": 4
}}

{ "event": "mutation_skipped", "payload": {
    "unit_id": "u_skiv", "mutation_id": "ali_panic_to_resonance",
    "reason": "insufficient_pe", "round": 4
}}

{ "event": "mutation_applied", "payload": {
    "unit_id": "u_skiv", "mutation_id": "ali_panic_to_resonance",
    "trait_swap": { "remove": ["ali_membrana_sonica"], "add": ["ali_fono_risonanti"] },
    "mbti_delta": { "I": 1, "N": 1 }, "round": 4
}}
```

## 7. Industry references (adopted vs rejected)

### Adopted patterns

- **Spore evolution slots** (Maxis 2008): trait swap discreto, 1 trait
  per slot fisso. → Adopted per scarsità (max 5 trait active).
- **Subnautica creature data lore**: trait_id machine-readable + flavor
  text in-fiction. → Adopted per cataloghi.
- **RimWorld trait drift**: certain traits unlock during gameplay events
  (e.g., killed 5+ raiders → "bloodlust"). → Adopted per trigger.
- **Stellaris species traits**: `pre_traits` + `add_traits` + `remove_traits`
  YAML schema. → Mirror diretto del nostro `trait_swap`.
- **Crusader Kings 3 lifestyle XP**: lineage-specific XP cumulative,
  capstone perks. → Adopted per `pe_cost` progression.

### Rejected patterns

- **Pokemon evolution by level**: troppo lineare per un tactical d20
  combinatorio. Rejected: i trigger sono multi-asse (PE+biome+survival).
- **Diablo "rare drop" mutations**: troppo random, meno player agency.
  Rejected: mutation è offerta esplicitamente con preview.
- **Slay the Spire card upgrades** (singolo unlock, no chain):
  rejected per chain prereq T3 (richiede T2 prerequisite).

## 8. Open questions

1. **PE economy balance**: 12 PE per T2 mutation è troppo poco/molto?
   Default M13.P3 progression = 25 PE per livello → 1 mutation T2 ogni
   ~50% di un livello. Da playtest validare.

2. **Mutation tree visualization**: serve un UI tree (Slay the Spire
   "deck explorer" style) o list view è sufficient? Effort: ~15h UI vs
   ~3h list.

3. **Cross-encounter persistence**: mutation applicata in encounter 3
   persiste in encounter 4? Default proposed: SÌ in campaign mode, NO
   in single-encounter mode.

4. **Conflict UX**: quando aquatic ↔ desert conflict → blocco hard
   (cannot select) o warning soft (player override)? Proposta: hard
   block + textual hint "Mutation incompatibile con trait attivo X".

5. **NEW_TRAIT_PROPOSAL handling**: catalog cita 4 trait proposti
   (`corno_di_caccia`, `echo_pulse`, `feromoni_assalto`, `cuore_temporale`)
   nel creature catalog. Mutations per questi non implementate finché
   trait non finiscono in glossary. Plan: M14 sprint adda trait → M14.B
   adda mutations relative.

6. **Trigger evidence storage**: i trigger usano `trigger_examples`
   testuali. Per runtime servono structured `trigger_check_fn` o
   `trigger_dsl`. Decisione: design DSL in M14 separate ADR.

7. **Mutation rarity tier**: tutte le mutation sono ugualmente rare?
   Proposta: T2 rarity 60% offered, T3 rarity 20% offered (gating
   ulteriore oltre prerequisiti).

8. **Reversal cost**: 50% PE per "Mutable" (M15+) è giusto? Da
   playtest. Alternativa: full PE refund ma applica `cursed_evolution`
   status (vedi status roadmap).

## 9. Implementation phasing

### Phase A — Catalog YAML + schema (DONE 2026-04-25)

- ✅ `data/core/mutations/mutation_catalog.yaml` (30 entries baseline)
- ✅ Validation script (Python ad-hoc, refs trait IDs)
- Effort: 0 LOC backend (data-only)

### Phase B — Engine

- `apps/backend/services/mutations/mutationEngine.js` (~250 LOC)
- 5 gating rules + trigger evaluator + cost deduction
- API: `evaluate(unit_id) → eligibles[]`, `apply(unit_id, mutation_id)`
- Plugin: `mutationsPlugin.js`
- Effort: ~12h

### Phase C — REST + Frontend

- `apps/backend/routes/mutations.js` (5 endpoints: registry, evaluate,
  preview, apply, history) (~150 LOC)
- `apps/play/src/mutationPanel.js` modal overlay (mirror formsPanel)
- Header button 🧬 Mut
- Effort: ~8h

### Phase D — Persistence

- Prisma `UnitMutationApplied` model + migration (~20 LOC schema)
- Write-through adapter mirror progression Prisma pattern
- Effort: ~4h

### Phase E — Telemetry + balance

- 4 events emitter + JSONL persistence
- Calibration harness `tools/py/batch_calibrate_mutation_balance.py`
- Effort: ~6h

### Phase F — Trigger DSL (advanced)

- ADR per trigger DSL design
- Implementation: structured trigger spec + evaluator (~150 LOC)
- Effort: ~12h

**Total M14 mutation system shipping: ~42h** (Phase A-E).

## 10. Anti-pattern blocklist

- ❌ NON applicare mutation senza preview (player needs informed consent)
- ❌ NON allow stack >3 T2 mutations per unit (balance hell)
- ❌ NON trigger automatic apply (player chooses)
- ❌ NON usare mutation_id come display string (always lookup name_it)
- ❌ NON committare mutations YAML che referenziano trait_id non in glossary
  (validate in CI con `tools/py/validate_mutation_catalog.py` futuro)
- ❌ NON encrypt costo dietro fog-of-war (sempre mostrare PE/PI cost
  esplicitamente)

## 11. Cross-references

- `data/core/mutations/mutation_catalog.yaml` (30 mutation baseline)
- `data/core/traits/glossary.json` (275 entries — validate target)
- `data/core/traits/active_effects.yaml` (111 trait mechanics)
- `data/core/forms/mbti_forms.yaml` (16 forms — alignment hooks)
- `apps/backend/services/forms/formEvolution.js` (M12 — pattern mirror)
- `apps/backend/services/progression/progressionEngine.js` (M13.P3 —
  PE source)
- `data/core/balance/trait_environmental_costs.yaml` (biome interactions)
- `docs/planning/2026-04-25-creature-concept-catalog.md` (mutation
  gateway creatures)
- `docs/planning/2026-04-25-status-effects-roadmap.md` (status
  interactions)
