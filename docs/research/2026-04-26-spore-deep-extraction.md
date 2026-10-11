---
title: 'Spore Deep Extraction — Pilastro 2 emergent evolution transfer plan'
date: 2026-04-26
doc_status: active
doc_owner: creature-aspect-illuminator
workstream: cross-cutting
last_verified: '2026-04-26'
source_of_truth: false
language: it
review_cycle_days: 90
tags: [research, spore, evolution, P2, creature, transfer-plan]
related:
  - docs/research/2026-04-26-cross-game-extraction-MASTER.md
  - docs/research/2026-04-26-tier-s-extraction-matrix.md
  - docs/research/2026-04-26-voidling-bound-evolution-patterns.md
  - docs/core/02-PILASTRI.md
  - docs/core/22-FORME_BASE_16.md
---

# Spore Deep Extraction — Pilastro 2 emergent evolution transfer plan

**Autore**: creature-aspect-illuminator · **Data**: 2026-04-26 · **Status**: active  
**Scope**: reverse-engineer Spore Creature Stage per Pilastro 2. Solo Creature Stage — niente Cell/Tribe/Civilization/Space.  
**Repo state al 2026-04-26**: 84 specie YAML + 30 mutation_catalog entries + 5-fase lifecycle (dune_stalker solo) — **zero runtime evolution engine**.

---

## 1. Spore Creature Stage — systems breakdown

### 1.1 Loop fondamentale

Spore Creature Stage = **episodic encounter loop** con meta-progression additiva:

1. **Nest** (hub centrale): sicuro, punto di ritorno, evolve nel tempo.
2. **Exploration**: mappa generata con creature NPC (alleate/neutre/ostili). Biome-aware spawn.
3. **Encounter**: combat o socializzazione (cantare/ballare/posa). Risoluzione in real-time.
4. **DNA reward**: ogni encounter vittorioso/socializzato produce DNA points (DP) proporzionali alla difficoltà.
5. **Evolution editor**: DP spendibili nel nest per acquisire/swappare parti body. Immediata, reversibile dentro sessione, permanente dopo.
6. **Generation advance**: raggiunto un DP-threshold, la creatura "evolve generazione" → spawn figli con traits ereditati (subset probabilistico delle parti parent).

Mappatura su Evo-Tactics: encounter → DP-threshold → evolution editor → generation è il ciclo che Evo-Tactics non ha. Ha invece: encounter → PE/PI → perk pick → progressionEngine. **Il pezzo mancante è l'evolution editor (slot UI) + generational inheritance logic.**

### 1.2 Part-pack architecture

Spore usa un sistema di **slot per body region**:

| Slot region | Max parts | Examples                                                        |
| ----------- | --------- | --------------------------------------------------------------- |
| Mouth       | 1         | Bite (carnivore), Filter (omnivore), Sucker (social)            |
| Eyes        | 1-2       | Single (basic), Compound (range), Stalk (elevation scan)        |
| Arms/Limbs  | 0-4 pairs | Claws (combat bonus), Hands (social bonus), Spikes (passive DR) |
| Feet        | 1-2 pairs | Sprint (speed), Webbed (swim), Talons (elevation bonus)         |
| Detail/Skin | 0-8       | Spikes (DR), Plates (armor), Glows (social)                     |
| Back        | 0-2       | Wings (flight), Fins (swim), Sails (speed)                      |
| Weapons     | 0-3       | Charge horn, Poison spike, Electric shock                       |

Key insight: **una singola parte produce abilità emergenti**. Mouth carnivore → `Bite` ability auto-derived. Compound eyes → `Sense` auto-derived. Non c'è "equipaggiare abilità": le abilità emergono dalla morfologia.

### 1.3 DNA points cost-budget

- Ogni parte ha costo DP fisso (range 10-200 DP per upgrade).
- Max DP per sessione = funzione del livello generazionale.
- **Budget non è infinito**: scegliere wings (volo) preclude investire in combat limbs (attacco). Genuine trade-off.
- Tier sistema: parte stesso slot con livello 1/2/3 → upgrade incrementale (mantiene riconoscibilità base).

Mappatura: PE/PI di Evo-Tactics già funge da budget DP. Il problema è che PE/PI compra **perk** (flat bonus) non **parti** (ability-emergenti).

### 1.4 Ability emergence dalle parti

Questo è il core del modello Spore:

```
mouth_type: carnivore  → ability: bite (1d6 melee)
mouth_type: omnivore   → ability: spit (ranged stun)
arm_type: claw         → ability: scratch (bleed)
arm_type: hand         → social modifier +2
back_type: wings       → ability: glide (vertical movement)
eye_type: compound     → passive: extended_sight_range
```

**Nessuna ability viene "scelta"**. L'abilità è **deterministica dalla parte**. Questa è la differenza fondamentale rispetto al perk-pick XCOM.

In Evo-Tactics: `mutation_catalog` usa `trait_swap` (rimuovi trait X, aggiungi trait Y). È analogo ma incompleto: manca la **funzione di derivazione automatica** `part → ability`.

### 1.5 Generations + procedural inheritance

Spore genera N figli per generazione. Ogni figlio eredita:

- 50-80% delle parti parent (random subset)
- Mutazione casuale: 1-2 parti cambiate vs parent
- Forma corporea inalterata (corpo base stabile)

Risultato: dopo 3-4 generazioni la creatura è visivamente riconoscibile ma tatticamente differente dall'antenato.

In Evo-Tactics: `lineage_id` esiste nel lifecycle YAML (dune_stalker). Il V3 Mating/Nido (OD-001, 469 LOC runtime) ha `gene_slots`. **La plumbing è lì, non è wired.**

---

## 2. Pattern da estrarre — 6 pattern concreti

### Pattern S1: Slot-based morphology (Part-pack → Mutation slot)

**Cosa è in Spore**: corpo diviso in slot anatomici. Ogni slot ha 1 parte attiva. Swappare la parte cambia abilità.

**Traduzione Evo-Tactics**:

- `data/core/mutations/mutation_catalog.yaml` ha `category: [physiological, behavioral, sensorial, symbiotic, environmental]` ma non ha **slot anatomico**.
- Aggiungere campo `body_slot` (es. `mouth`, `appendage`, `sense`, `tegument`, `back`).
- Gating rule: **max 1 mutation per body_slot** per creatura.
- Questo produce cap organico (niente stack infinito) + leggibilità visiva (ogni slot = 1 change visible).

**File da toccare**:

- `data/core/mutations/mutation_catalog.yaml` — aggiungere campo `body_slot` per tutti e 30 i mutation entries
- `data/core/species/dune_stalker_lifecycle.yaml` `mutation_morphology` — aggiungere `body_slot` a 4 entries esistenti
- `apps/backend/services/forms/formEvolution.js` — aggiungere slot-conflict gating rule (es. `if unit.mutations.find(m => m.body_slot === newMutation.body_slot) throw SlotConflictError`)

**Effort**: ~3h (schema additive + linter + 1 gating rule)  
**Status corrente**: nessun `body_slot` in nessun file. Gap totale.  
**Cross-museum**: nessuna card rilevante.  
**Anti-pattern guard**: NON forzare slot = 1 anche per mutation `category: symbiotic` (le simbiosi per definizione si sovrappongono). Eccezione esplicita.

---

### Pattern S2: Ability derivation automatica (Part → Ability)

**Cosa è in Spore**: ability emergono deterministicamente dalla parte. Nessuna scelta esplicita.

**Traduzione Evo-Tactics**:

- Ogni mutation in `mutation_catalog.yaml` ha già `trait_swap.add[]` — il trait aggiunto **implica** un'abilità via `active_effects.yaml`.
- Il collegamento mancante: `mutation_id → derived_ability_id` come campo esplicito nel catalog.
- Runtime: al momento di `applyMutation(unit, mutationId)` → auto-unlock `mutation.derived_ability` in `unit.abilities`.
- Oggi `progressionEngine.js` gestisce unlock perk su level-up. Lo stesso hook serve per mutation.

**File da toccare**:

- `data/core/mutations/mutation_catalog.yaml` — aggiungere campo `derived_ability_id` (nullable) per i 30 entries; ~10-15 avranno un ability derivata
- `apps/backend/services/progression/progressionEngine.js` — nuova funzione `applyMutation(unit, mutationId, catalog)` → chiama `trait_swap` + unlock `derived_ability`
- `apps/backend/routes/session.js` o `sessionHelpers.js` — esporre `POST /api/session/:id/mutation/apply`

**Effort**: ~6h (schema + engine function + endpoint + 5 test)  
**Status corrente**: `trait_swap` esiste nel YAML come dato, mai consumato a runtime. Zero endpoint per mutation apply.  
**Cross-museum**: card `worldgen-forme-mbti-as-evolutionary-seed.md` (score 4/5) — starter_bioma e seed evolutivo, stessa direzione.

---

### Pattern S3: DNA budget per-encounter (DP-equivalent pool)

**Cosa è in Spore**: ogni encounter produce DP proporzionali alla difficoltà. Budget totale è capped per generazione.

**Traduzione Evo-Tactics**:

- PE (Progression XP) già esiste con budget per level-up.
- Il pezzo mancante: **mutation DP pool separata da PE**. Chiama-la `MP` (Mutation Points).
- MP si accumula da: encounter completati con bersagli di tier ≥ 2, kill con status effect attivo, biome-specific conditions.
- MP si spende in `mutation_catalog` cost field (`pe_cost` → split in `pe_cost` + `mp_cost`).
- Separare PE (perk progression) da MP (mutation evolution) allinea esattamente con il Tri-Sorgente reward pool R/A/P (`rewardOffer.js`): pool A = PE, pool P = PI, nuovo pool M = MP.

**File da toccare**:

- `data/core/mutations/mutation_catalog.yaml` — rinomina `pe_cost` → split `pe_cost` / `mp_cost` (tutti i 30 entries)
- `apps/backend/services/rewards/rewardOffer.js` — aggiungere pool `M` (Mutation Points) al softmax reward engine
- `apps/backend/services/vcScoring.js` — aggiungere metrica `mutation_points_earned` al raw metric aggregator
- `data/derived/skiv_saga.json` — aggiungere campo `mp_pool: 0` allo state

**Effort**: ~4h (schema rename + pool wire + 3 test)  
**Status corrente**: `pe_cost` e `pi_cost` esistono ma nessun sistema accumula/consuma per mutation apply. Pool M = zero.

---

### Pattern S4: Visual emergence prima del testo (Morphology-first)

**Cosa è in Spore**: il player VEDE la parte cambiare sul corpo prima di leggere qualsiasi testo. Forma → stat, non viceversa.

**Traduzione Evo-Tactics** (pattern Wildermyth P0 + Spore S4):

- `dune_stalker_lifecycle.yaml` ha 4 mutation_morphology entries con `visual_swap_it` e `aspect_token`.
- `mutation_catalog.yaml` ha 30 entries con **zero** `visual_swap_it` e **zero** `aspect_token`.
- Gap: 30/30 mutations mancano di morphology. Il linter `tools/py/lint_mutations.py` (da creare, menzionato come pattern P2-Wildermyth nell'agent system prompt) enforcerebbe questo.
- La regola: ogni mutation_id aggiunto al catalog **deve** avere `aspect_token` + `visual_swap_it`. Senza → lint fail.
- Runtime: `render.js drawUnit()` legge `unit.mutations[]` → se mutation ha `aspect_token` → `drawMutationDots(ctx, unit, cx, cy)` (canvas overlay, max 3 dots a CELL=40).

**File da toccare**:

- `data/core/mutations/mutation_catalog.yaml` — aggiungere `aspect_token` + `visual_swap_it` per tutti i 30 entries (authoring budget ~0.5h per entry = 15h total)
- `apps/play/src/render.js` — estendere `drawUnit()` con `drawMutationDots()` dot overlay
- `tools/py/lint_mutations.py` (NEW) — linter che verifica `aspect_token` + `visual_swap_it` presenti per ogni mutation entry

**Effort**: ~18h (authoring 15h + render 2h + linter 1h)  
**Status corrente**: 4/30 hanno morphology (solo quelle nel `dune_stalker_lifecycle.yaml mutation_morphology`). Gap rate = 87%.  
**Severity**: P0 (Wildermyth lesson anti-pattern esplicito).

---

### Pattern S5: Generational inheritance hook (Lineage propagation)

**Cosa è in Spore**: ogni generazione eredita subset delle parti parent. Mutation si propagano con variazione.

**Traduzione Evo-Tactics**:

- `dune_stalker_lifecycle.yaml` ha `lineage_id` nel blocco `skiv_saga_anchor`.
- `apps/backend/services/network/wsSession.js` Mating Engine (card Museum mating_nido-engine-orphan, 469 LOC) ha `gene_slots` runtime mai wired.
- Pattern minimo: quando una creatura va in `legacy` phase → il suo `mutations[]` list viene scritto in `lineage_traits` sul `lineage_id`. La prossima creatura dello stesso `species_id` nata nello stesso biome **eredita** 1-2 mutation random dal pool `lineage_traits` senza pagare MP.
- Questo è il closing loop di Pilastro 2: l'evoluzione non è solo per-run ma trans-generazionale.

**File da toccare**:

- `data/core/species/dune_stalker_lifecycle.yaml` — il `lineage_id` esiste, aggiungere schema `inheritable_traits: []` nel blocco `legacy` phase
- `apps/backend/services/generation/` — nuova funzione `propagateLineage(legacyUnit, speciesId, biomeId)` → write `lineage_traits` a `data/derived/`
- `services/generation/geneEncoder.js` (futuro, CK3 pattern P1) — per ora solo JSON file; encoder per V3

**Effort**: ~5h (schema + 1 function + 3 test — senza CK3 encoder)  
**Status corrente**: `lineage_id` esiste YAML. Nessuna funzione `propagateLineage`. Mating engine ha `gene_slots` ma mai connesso a lifecycle.  
**Cross-museum**: card `mating_nido-engine-orphan.md` score 5/5 — 469 LOC runtime già live, serve solo wire.

---

### Pattern S6: Part-category bingo (MHS gene grid alignment)

**Cosa è in Spore**: 3 parti dello stesso tipo (combat/social/speed) danno bonus di specializzazione (Apex Predator, Alpha sociality, Speed specialist). Non è un grid esplicito ma un count-check.

**Traduzione Evo-Tactics** (Monster Hunter Stories pattern P0 del knowledge base):

- `mutation_catalog.yaml` ha `category: [physiological, behavioral, sensorial, symbiotic, environmental]`.
- **Bingo rule**: 3 mutation della stessa category → bonus specializzazione passivo (es. 3× physiological → `species_archetype: tank_plus`, +1 DR unconditional).
- Questo trasforma la categoria da tag inerte a **meccanica emergente**.
- UI: il gene grid 3×3 (`formsPanel.js` pattern) mostra le mutation organizzate per categoria, le 3 aligned brillano.

**File da toccare**:

- `apps/backend/services/progression/progressionEngine.js` — funzione `computeMutationBingo(unit, catalog)` → se 3+ mutations stessa category → apply bonus passivo
- `apps/play/src/formsPanel.js` — aggiungere pannello mutation grid (3×3 slot per category) nel overlay modale esistente
- `data/core/mutations/mutation_catalog.yaml` — `category` già presente e distribuito (14 physiological / 5 sensorial / 5 environmental / 4 behavioral / 2 symbiotic)

**Effort**: ~7h (engine function 2h + UI panel 4h + 4 test 1h)  
**Status corrente**: `category` esiste ma non produce effetti. Nessun bingo logic.  
**Anti-pattern**: 14/30 mutations sono physiological — con bingo a 3, quasi garantito per ogni build. Abbassare il bingo threshold non risolve; serve bilanciare il catalogo (almeno 7-8 mutation per categoria). Authoring debt da pianificare.

---

## 3. Anti-pattern — cosa NON estrarre da Spore

| Anti-pattern                                       | Motivo skip                                                                                              |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Sandbox open-world navigation**                  | Evo è turn-based tactical su hex grid, non mappa esplorabile real-time                                   |
| **Real-time creature editor mid-encounter**        | Evo è async campaign; mutation si applicano nel nest/debrief phase                                       |
| **Full 5-stage progression** (Cell→Space)          | Solo Creature Stage. Cell Stage = tutorial, altri = scope completamente diverso                          |
| **Asymmetric NPC sociology** (cantare/ballare)     | Non applicabile a combat-first design; socializzazione = out of scope M-future                           |
| **Procedural creature creator 3D**                 | Spore-trap esplicito nel knowledge base. No riconoscibilità, players non si affezionano (Cogmind lesson) |
| **Infinite revert** (DP rimborsabili a costo zero) | Evo ha irreversibilità come pilastro narrativo (Frostpunk lesson). Mutation permanente = weight          |
| **Real-time combat**                               | Evo = d20 turn-based. Spore combat è real-time click-mash, non trasferibile                              |

---

## 4. Reuse path — 3 livelli

### Minimal (~5h)

Cite Spore part-pack pattern in `form_pack_bias.yaml` come commento schema + ADR proposta.

**Deliverables**:

1. `form_pack_bias.yaml` — aggiungere sezione `mutation_slots:` commentata con 5 slot canonici (mouth, appendage, sense, tegument, back)
2. ADR bozza `docs/adr/ADR-2026-04-26-spore-part-pack-slots.md` — documenta decisione schema, gating rule, no runtime change

**Sblocca**: schema agreement prima di authoring 30 mutations. Niente authoring senza schema locked.

### Moderate (~15-20h)

Part-pack runtime semplificato: 5 slot × 30 mutation existing.

**Deliverables** (ordinati da dipendenza):

1. Schema update `mutation_catalog.yaml`: `body_slot` + `aspect_token` + `visual_swap_it` per i 30 entries (authoring: 15h)
2. `formEvolution.js`: slot-conflict gating rule (1h)
3. `progressionEngine.js`: `applyMutation()` + `computeMutationBingo()` (2h)
4. `rewardOffer.js`: pool M (Mutation Points) aggiunto softmax (1h)
5. `render.js`: `drawMutationDots()` dot overlay (1h)
6. `lint_mutations.py` NEW: linter check `aspect_token` presente (1h)

Total: ~21h. Chiude Pattern S1 + S2 + S3 + S4 parziale + S6.

### Full (~35-50h+)

Genuino Spore-style emergent creature creator runtime.

**Aggiunte rispetto Moderate**:

1. `propagateLineage()` per inheritance cross-generational (S5: 5h)
2. `visual_swap_it` per tutti 30 mutation + render overlay canvas layer (S4 completo: 15h)
3. UI panel mutation grid 3×3 in `formsPanel.js` (S6 UI: 4h)
4. `geneEncoder.js` CK3 pattern per V3 Mating/Nido wire (P1: 8h)
5. Biome-aware mutation unlock gates (es. mutation `artigli_freeze_to_glacier` solo offerta in biome glaciale): `biomeSpawnBias.js` extension (3h)
6. Balance pass: amplifica catalog da 30 → 50+ mutations per coprire 8 slot × 5 biome cluster (10h authoring)

Total: ~50h. Chiude tutti i 6 pattern + plumbing completa Pilastro 2 runtime.

---

## 5. Cross-game synergies

### Con Voidling Bound (rarity-gated unlock + visual_swap_it)

Pattern rilevante: Voidling Bound usa rarity tier (common/uncommon/rare/legendary) per gating mutation unlock, + visual_swap obbligatorio per ogni tier. Allineamento diretto con:

- `mutation_catalog.yaml` `tier: [1, 2, 3]` già esistente — map a rarity
- `aspect_token` mancante — Voidling richiede visual per ogni mutation (stesso Wildermyth pattern)
- `path-lock` (scegliere una linea esclude l'altra) — in Evo: `body_slot` conflict è il path-lock naturale

### Con Caves of Qud morphotype gating

Pattern: Morphotype `Chimera` = physical mutations only / `Esper` = mental only.  
In Evo: `mbti_alignment` field già nel catalog (es. `{ S: 1, T: 1 }`). Estendibile:

- T_F axis → physical mutation pool (physiological + environmental)
- N_S axis → sensorial pool
- E_I axis → behavioral pool

Coerenza Pillar 4 senza hand-tag ogni trait. Campo `mbti_pool` già citato nel lifecycle YAML come "future schema".

### Con Monster Hunter Stories gene grid

Già implementato come Pattern S6. `category` del catalog mappa 1:1 su "gene type". Il 3×3 grid con bingo bonus è la UI diretta per `formsPanel.js`. Soglia bingo: richiede catalog più bilanciato (ora 14/30 physiological).

### Con CK3 DNA chains

Inheritance genetica (Pattern S5). `lineage_id` esiste. CK3 encoder `geneEncoder.js` è il passo V3. Minimal viable: solo JSON dump di `mutations[]` al momento di `legacy` phase transition, senza encoder complesso.

### Con Subnautica habitat lifecycle

Mutation biome-gated: `biome_boost` e `biome_penalty` già nel catalog. Estendere a: mutation offerte solo se creatura è stata in biome boost per N turns (trigger_examples già documentati, solo non consumati runtime). Wire in `biomeSpawnBias.js` esistente.

---

## 6. Agent integration

**Owner primario**: `creature-aspect-illuminator` (questo agent) — audit pattern S1/S4, research mode S2/S5.

**Cross-link**:

- `economy-design-illuminator` — Pattern S3 (MP pool): nuova currency nel reward economy. Coordinarsi su split PE/PI/MP prima di authoring.
- `pcg-level-design-illuminator` — Pattern S5 generational inheritance: biome-mutation interaction + encounter seeding.
- `ui-design-illuminator` — Pattern S4 render overlay + Pattern S6 gene grid UI: 10-foot rule + canvas constraint CELL=40.
- `schema-ripple` — Schema change `body_slot` + `mp_cost` su `mutation_catalog.yaml` → ripple su `progressionEngine`, `rewardOffer`, `formEvolution`. Escalare prima di merge.

**Museum card proposta**:

```yaml
# museum/cards/evolution_genetics-spore-part-pack.md
id: evolution_genetics-spore-part-pack
domain: species_candidate
score: 5
status: curated
title: 'Spore Part-Pack Architecture — slot-based mutation anatomy'
provenance: 'Spore Creature Stage (Maxis/EA 2008), Wikipedia creature editor + GDC Maxis 2009'
reuse_path: 'data/core/mutations/mutation_catalog.yaml → body_slot field; formEvolution.js slot-conflict gate'
effort_estimate: '21h Moderate / 50h Full'
blast_radius_multiplier: 3
notes: 'Core pattern per chiudere Pilastro 2 runtime. Extraction doc: docs/research/2026-04-26-spore-deep-extraction.md'
```

---

## 7. Backlog ticket proposti

| Ticket                  | Effort | Descrizione                                                                                         | Dipendenze                                         |
| ----------------------- | ------ | --------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| `TKT-CREATURE-SPORE-01` | 1h     | ADR bozza slot schema + `form_pack_bias.yaml` commento                                              | nessuna                                            |
| `TKT-CREATURE-SPORE-02` | 15h    | Authoring `body_slot` + `aspect_token` + `visual_swap_it` per tutti i 30 mutation entries           | TKT-01 ADR locked                                  |
| `TKT-CREATURE-SPORE-03` | 1h     | `lint_mutations.py` NEW — check `aspect_token` + `visual_swap_it` presenti                          | TKT-02 schema                                      |
| `TKT-CREATURE-SPORE-04` | 2h     | `formEvolution.js` slot-conflict gating rule + 3 test                                               | TKT-01 schema                                      |
| `TKT-CREATURE-SPORE-05` | 3h     | `progressionEngine.js` `applyMutation()` function + endpoint `POST /api/session/:id/mutation/apply` | TKT-04                                             |
| `TKT-CREATURE-SPORE-06` | 2h     | `computeMutationBingo()` + passive bonus wire                                                       | TKT-05                                             |
| `TKT-CREATURE-SPORE-07` | 1h     | `rewardOffer.js` pool M (Mutation Points) nel softmax                                               | TKT-05                                             |
| `TKT-CREATURE-SPORE-08` | 2h     | `render.js` `drawMutationDots()` overlay (max 3 dot CELL=40)                                        | TKT-02 aspect_token                                |
| `TKT-CREATURE-SPORE-09` | 5h     | `propagateLineage()` + `legacy` phase hook + 3 test                                                 | TKT-05, Museum card mating_nido-engine-orphan wire |
| `TKT-CREATURE-SPORE-10` | 4h     | `formsPanel.js` mutation grid 3×3 UI panel                                                          | TKT-06                                             |

**Stima totale Moderate path** (TKT-01 → TKT-08): ~27h  
**Stima totale Full path** (tutti 10): ~36h  
**Entry point raccomandato sessione prossima**: TKT-01 (ADR, 1h) → sblocca parallelo TKT-02 (authoring autonomo) + TKT-04 (engine).

---

## Fonti

Primarie (non content-farm):

- Spore Wiki — creature parts database: `https://spore.fandom.com/wiki/Creature_Stage`
- Maxis GDC 2009 "Procedural Approach in Spore" — part derivation + ability emergence
- Wikipedia Spore (video game) — Creature Stage mechanics section
- `data/core/mutations/mutation_catalog.yaml` (repo, 30 entries, 2026-04-25)
- `data/core/species/dune_stalker_lifecycle.yaml` (repo, 2026-04-25)
- Pattern library da `.claude/agents/creature-aspect-illuminator.md` §Pattern library (P0-P2)

Anti-pattern blocklist applicata: nessuna citazione emergentmind/grokipedia/medium.

---

_Documento generato da creature-aspect-illuminator research mode — decisione Min/Mod/Full delegate al user._
