---
title: 'ADR-2026-04-26 — Spore part-pack slots — schema lock + Moderate scope'
doc_status: active
doc_owner: master-dd
workstream: cross-cutting
last_verified: '2026-04-27'
source_of_truth: true
language: it
review_cycle_days: 180
related:
  - docs/research/2026-04-26-spore-deep-extraction.md
  - docs/core/02-PILASTRI.md
  - docs/core/22-FORME_BASE_16.md
  - data/core/mutations/mutation_catalog.yaml
  - apps/backend/services/forms/formEvolution.js
  - apps/backend/services/progression/progressionEngine.js
  - apps/backend/services/rewards/rewardOffer.js
---

# ADR-2026-04-26 — Spore part-pack slots (Pilastro 2 evoluzione runtime)

## Status

**ACCEPTED** — 2026-04-26 (impl Sprint 2026-04-27)

Chiude debito Pilastro 2 "Evoluzione emergente" — runtime evolution engine assente
nonostante 30 mutation YAML + 84 specie shippate. Ref `docs/research/2026-04-26-spore-deep-extraction.md`.

## Context

Pilastro 2 stato pre-ADR: 🟢c+ (Vision Gap Sprint V2 chiuso tri-sorgente reward,
mating engine 469 LOC backend, ma **nessuna mutation è mai applicata a runtime**).
Player non può evolvere la propria creatura nel ciclo encounter → reward → editor
→ next encounter. Mutation_catalog è inerte.

Spore Creature Stage offre il template canonico:

- **Slot anatomici** (mouth/arms/feet/back/...) — max 1 parte attiva per slot
- **Ability emergenti** dalla parte (no perk-pick esplicito; bite ability nasce da mouth carnivore)
- **Budget DP** spesa per acquisire/swappare parti
- **Visual swap** prima del testo: il player VEDE la parte cambiare

Estrazione completa in `docs/research/2026-04-26-spore-deep-extraction.md` ha 6
pattern (S1..S6). 3 livelli reuse: Minimal (5h schema-only), **Moderate (~21h
runtime semplificato)**, Full (~50h con inheritance + biome gates).

## Decision

**Adottare scope Moderate** (Pattern S1 + S2 + S3 + S4 parziale + S6).
Posticipare Pattern S5 (generational inheritance) e S4 completo (visual layer
canvas) a sprint successivo.

### Scope incluso (Sprint 2026-04-27, ~21h budget)

| Pattern | Scope                                                  | Effort |
| ------- | ------------------------------------------------------ | -----: |
| **S1**  | `body_slot` field + slot-conflict gating rule          |     3h |
| **S2**  | `derived_ability_id` field + `applyMutation()` runtime |     6h |
| **S3**  | Pool MP (Mutation Points) + earn/spend wire            |     4h |
| **S4**  | `aspect_token` + `visual_swap_it` schema lock + linter |     1h |
| **S6**  | Bingo 3×category → passive bonus                       |     7h |

Totale: ~21h. Authoring `aspect_token` per 30 mutation entries differito
(15h authoring debt). Solo 4/30 esistenti (skiv lifecycle) wirate visualmente
nel S4 partial.

### Scope ESCLUSO esplicito

- **S4 completo** (canvas overlay `drawMutationDots`) — differito post primo
  playtest live (richiede authoring 26 entries × 30min = 13h). Schema lock OK ora.
- **S5** (generational inheritance via `propagateLineage`) — richiede V3 Mating
  engine wire (separato da Pilastro 2 evolution editor; OD-001 Path A 4/4 già
  chiuso plumbing). Sprint successivo.
- **CK3 geneEncoder** — futuro V3 Mating only.
- **Biome-aware mutation unlock gates** — già parzialmente coperto da
  `biome_boost`/`biome_penalty` esistenti nel catalog. Wire runtime futuro.

### Schema canonico body_slot (S1)

5 slot anatomici lockati. Ogni mutation deve dichiarare `body_slot ∈`:

```yaml
body_slot: mouth      # bite/spit/jaw — combat oral
body_slot: appendage  # claw/hand/spike/wing — limb-derived
body_slot: sense      # eye/ear/antenna — perception
body_slot: tegument   # skin/scale/plate — defense layer
body_slot: back       # spine/wing-pair/sail — locomotion + display
```

**Eccezione `category: symbiotic`**: `body_slot: null` permesso (le simbiosi
sono soprapposizioni biologiche per definizione, no slot fisico esclusivo).

### Pool MP (Mutation Points) — Pattern S3

Pool separato da PE/PI esistenti (Tri-Sorgente reward R/A/P già live in V2).
MP accumula da:

- Encounter complete con bersaglio tier ≥ 2 → `+2 MP`
- Kill con status effect attivo (bleed/stun/fracture) → `+1 MP`
- Biome affinity match (specie nel proprio bioma preferito) → `+1 MP/encounter`

MP spende: ogni mutation ha `mp_cost` (range 3..15 in base a tier 1/2/3).
PE/PI restano per perk progression. **Niente conversione MP↔PE**: pool separati
forzano scelta strategica (perk vs mutation budget).

### Bingo 3×category (S6)

Trigger: 3 mutation della stessa `category` su una creatura → bonus passivo:

| Category      | 3-mutation bonus                                                           |
| ------------- | -------------------------------------------------------------------------- |
| physiological | `archetype: tank_plus`, +1 DR unconditional                                |
| behavioral    | `archetype: ambush_plus`, +2 init quando crit/flank                        |
| sensorial     | `archetype: scout_plus`, +2 sight range, ignora low-cover                  |
| environmental | `archetype: adapter_plus`, immune ad un hazard biome-locked                |
| symbiotic     | `archetype: alpha_plus`, +1 affinity passive a tutti gli alleati adiacenti |

**Anti-pattern noto**: 14/30 mutation sono `physiological`. Bingo a 3 = quasi
garantito. Mitigazione: lint rule `mutation_catalog_balance.py` (NEW) → warn se
una category > 40% del totale catalog. Authoring debt: rebalance verso 6 entries
per category minimum nel sprint successivo.

## Consequences

### Positive

- **Pilastro 2 🟢c+ → 🟢 candidato**: runtime evolution loop funzionante
  (encounter → MP → mutation pick → ability emerge → next encounter)
- **Schema lock prima authoring**: nessun rework di 30 entries dopo decisione
- **Tri-Sorgente reward extension natural**: pool R/A/P → R/A/P/M coerente con V2
- **Bingo emergente**: trasforma `category` da tag inerte a meccanica strategica
- **Differimento esplicito**: visual canvas + inheritance non bloccano il
  primo playtest (Step 6 backbone deploy può procedere senza)

### Negative

- **15h authoring debt** (`aspect_token` × 30 entries) accumulato esplicitamente
- **Catalog imbalance** (14 physiological vs 2 symbiotic) → bingo physiological
  spesso garantito; rebalance authoring TO-DO
- **No generational closing loop** ancora (S5 differito) → l'evoluzione resta
  per-run, non trans-generazionale fino a sprint successivo

### Neutral

- **Body_slot exception per symbiotic**: documentato, non un bug
- **MP separato da PE**: scelta deliberata, non dimenticanza di unificare

## Implementation plan

Ordinato per dipendenze (no PR può essere unwound senza i precedenti):

1. **PR-S1** schema: `body_slot` + `derived_ability_id` + `mp_cost` field aggiunti
   ai 30 mutation entries. Linter `lint_mutations.py` verifica presenza.
2. **PR-S2** runtime: `progressionEngine.applyMutation()` + `POST /api/session/:id/mutation/apply`
   endpoint. Gating: slot-conflict + MP budget check.
3. **PR-S3** pool: `mpTracker.js` modello (mirror `sgTracker.js` pattern V2),
   wire in `damage step` per kill+status, wire `rewardOffer.js` softmax pool M.
4. **PR-S6** bingo: `computeMutationBingo()` in progressionEngine, apply
   `archetype_*_plus` passives. Test 5 categories.
5. **PR-S4 partial** linter: `tools/py/lint_mutations.py` — verifica
   `aspect_token` presenza per ogni entry; warn se manca (no fail). Authoring
   schema lock per sprint successivo.

Tutti i PR additivi, nessun breaking change su file esistenti runtime.

## Rollback plan

- **Disattivazione runtime**: `MUTATION_ENGINE_ENABLED=false` env flag
  (default `true`) disabilita `/api/session/:id/mutation/apply` endpoint +
  blocca `applyMutation()` con `MutationDisabledError`
- **Pool MP**: fallback a 0 se flag off, no metric leak
- **Bingo**: `computeMutationBingo()` ritorna `{}` se flag off
- **Linter**: warn-only, no CI block

## Verification (DoD)

- [ ] Mutation catalog: 30/30 entries con `body_slot` + `derived_ability_id` + `mp_cost`
- [ ] `node --test tests/services/mutationEngine.test.js` → almeno 12 test verde
- [ ] `node --test tests/api/mutation.apply.test.js` → 5 endpoint test verde
- [ ] `node --test tests/services/mpTracker.test.js` → 6 test verde
- [ ] `node --test tests/services/mutationBingo.test.js` → 5 test (1/category) verde
- [ ] `python tools/py/lint_mutations.py` → 0 schema errors
- [ ] `prettier --check` → ok
- [ ] Pilastro 2 status update in CLAUDE.md sprint context

## References

- Spore Creature Stage analysis: `docs/research/2026-04-26-spore-deep-extraction.md`
- Tri-Sorgente reward (V2 reference): `apps/backend/services/rewards/rewardOffer.js`
- SG tracker pattern (V5 reference): `apps/backend/services/combat/sgTracker.js`
- Forme 16 base canonical: `docs/core/22-FORME_BASE_16.md`
- Pilastri canonical: `docs/core/02-PILASTRI.md`
