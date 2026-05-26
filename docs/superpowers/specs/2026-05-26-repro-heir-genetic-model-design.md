---
title: 'D-REPRO + D-HEIR — Reproduction taxonomy & deep genetic model (design)'
date: 2026-05-26
status: PROPOSED — POST-FREEZE VISION (requires ADR superseding 90-FINAL-DESIGN-FREEZE §21.3)
owner: master-dd
workstream: evo-tactics / Pilastro 2 (emergent evolution)
language: it
related:
  - docs/research/2026-04-26-spore-deep-extraction.md (6 pattern S1-S6)
  - docs/adr/ADR-2026-04-26-spore-part-pack-slots.md (5 body_slot locked, complexity-budget, S5 deferred)
  - docs/core/Mating-Reclutamento-Nido.md (§Ereditarieta canonica)
  - vault SoT §5 / §9 / §20 (Tri-Sorgente) / §21 / §24.3 (heir, PR #198)
  - vault 90-FINAL-DESIGN-FREEZE §21.3 (defers deep genetics)
impl_anchors:
  - apps/backend/services/metaProgression.js (rollMatingOffspring + inheritGeneSlots)
  - apps/backend/services/generation/lineagePropagator.js (Spore S5 biome-pool)
  - apps/backend/services/meta/geneEncoder.js (SHA1 lineage chain)
  - data/core/mating.yaml (gene_slots inheritance_rules, 3 cat, hybrid_rules)
  - data/core/mutations/mutation_catalog.yaml (30 entries, biome_boost/penalty)
  - apps/backend/services/vcScoring.js (telemetry -> MBTI, epigenome substrate)
  - Game-Godot-v2: succession_engine.gd / mating_trigger.gd / lineage_merge_service.gd / offspring_ritual_service.gd
---

# D-REPRO + D-HEIR — Reproduction taxonomy & deep genetic model

> **STATUS GATE**: il `90-FINAL-DESIGN-FREEZE §21.3` DEFERISCE esplicitamente
> "genetica complessa; genealogie profonde; ecosistema riproduttivo a lungo
> termine". Questo design e' **POST-FREEZE VISION**. Per renderne shippabile
> una parte serve un **ADR che supersede §21.3** definendo lo scope. Lo slice
> freeze attuale (1 nido level, mating trust+nest, output 1-2 seed) resta valido
> come MVP; questo doc e' il target verso cui crescere, **fasato**.

## 0. Non-greenfield: cosa esiste gia' (verify-before-build 2026-05-26)

Il modello NON e' da zero. Stato verificato cross-repo (file:line):

| Pezzo | Stato | Dove |
|---|---|---|
| Genotype 2-parent (slot-pick) | SHIPPED | `metaProgression.inheritGeneSlots` (296) + `rollMatingOffspring` (465) |
| gene_slots schema (3 cat + rules) | SHIPPED | `data/core/mating.yaml` (parent_slots:2, env:1, form_seed_bias; cat Struttura/Funzione/Memorie; mutation_tiers T0/T1/T2 Nido-gated; hybrid_rules) |
| Env-mutation pick (biome) | SHIPPED | `pickEnvironmentalMutation` (364) |
| Lineage chain (provenance) | SHIPPED | `geneEncoder` SHA1 `gn1:parent:self` |
| Phenotype biome boost/penalty | SHIPPED (data) | `mutation_catalog.yaml`, species `*_lifecycle.yaml` |
| Speciazione emergente | SHIPPED | `getTribesEmergent` (>=3 stesso lineage_id = tribe) |
| Ambient drift (Spore S5) | SHIPPED (plumbing, hook deferred) | `lineagePropagator.propagateLineage` (biome-pool, free-grant 1-2) |
| Single-ancestor succession (M2) | SHIPPED (Godot) | `succession_engine.gd` + attrition/lethality + `campaign_state` ledger |
| 2-parent mating (Godot) | SHIPPED (parziale) | `mating_trigger.generate_child_preview` (avg+trait-union FIFO5), `lineage_merge_service`, `offspring_ritual` (3-of-6) |
| Spore S1-S6 part-pack | DESIGNED + ADR | `docs/research/2026-04-26-spore-deep-extraction.md`, ADR-2026-04-26 (5 slot locked, complexity-budget, S5 deferred) |

**Il design ESTENDE/UNIFICA questo, non lo sostituisce.** Il vero net-new = il
layer **Epigenome** (telemetry-heritable). Tutto il resto = formalizzare +
collegare + approfondire pezzi esistenti.

## 1. D-REPRO — taxonomy dei tipi di riproduzione

Quattro tipi, ciascuno con un meccanismo distinto **gia' esistente** (no nuovi
path duplicati — chiarisce i 2 "path in conflitto" come tipi diversi):

1. **Sessuale 2-genitori** (eredi del party) -> `rollMatingOffspring`/`inheritGeneSlots`.
   Ogni genitore contribuisce 1 gene_slot (weighted-pick per categoria) + 1
   mutazione ambientale. Gate §20: **Fiducia>=3 + nest.requirements_met**. Il path
   canonico dell'erede giocatore.
2. **Single-ancestor succession** (NPC/boss, M2) -> Godot `succession_engine.gd`.
   Asessuale: 1 antenato -> erede gen+1 stessa specie, propaga mutazioni al pool.
   Auto-rimpiazzo su morte. NON path del party.
3. **Drift ambientale di popolazione** (Spore S5) -> `lineagePropagator`. Quando
   una unit va in `legacy`, le sue mutazioni entrano in un pool (species_id,
   biome_id); newborn stessa-specie/biome eredita 1-2 **gratis**. = eredita'
   di gene-pool ambientale, non individuale.
   - **LIMITAZIONE NOTA da fixare nell'approfondire**: cross-lineage isolation
     deferita -> due `lineage_id` diversi nello stesso (specie,biome)
     **condividono il pool** (`lineagePropagator.js:14-15`). Va isolato per
     `lineage_id` quando si deepena.
4. **Ibridazione** (cross-lineage) -> `mating.yaml hybrid_rules` + Godot
   `mating_trigger HYBRID_POLICY_DISPLAY_ONLY` (oggi solo label). Da promuovere
   da display-only a merge genetico reale (varianza/drift maggiore).

## 2. D-HEIR — modello genetico a 3 layer (Approach A)

### Layer 1 — Genotype (ereditato)
- **Loci = gene_slots** organizzati nelle 3 categorie canoniche
  **Struttura / Funzione / Memorie** (`mating.yaml`), mappate sui **5 body_slot
  Spore locked** (mouth/appendage/sense/tegument/back, ADR-2026-04-26 / S1).
  Max 1 mutazione per body_slot (cap organico, eccezione `symbiotic`).
- **Ricombinazione 2-parent** = `inheritGeneSlots` (1 slot weighted-pick per
  genitore) + crossover. Estendibile a piu' loci senza rework (slot additivi).
- **Complexity-budget (S3 + ADR)**: somma costi parti <= `C_max` per build, a
  prescindere dall'eredita'. Vincolo hard sul genotype.
- **Lineage** = `geneEncoder` SHA1 chain (provenance, generation count).
- **Category-bingo (S6 / MHS grid)**: 3 mutazioni stessa categoria ->
  specializzazione passiva (es. tank_plus). Gia' previsto.

### Layer 2 — Phenotype (espresso, biome-driven)
- Tratti espressi = genotype x **espressione ambientale**: un allele/parte
  "dorme" o si attiva per pressione bioma (**biome T-bands T0-T3**, ADR;
  `biome_boost`/`biome_penalty` del catalog). Stesso genotype, fenotipo diverso
  per bioma -> bio-plausibile.
- **Part -> ability derivation (S2)**: la parte implica l'abilita'
  (`derived_ability_id`), non scelta esplicita.
- **Morphology-first (S4)**: il player VEDE la parte (`aspect_token` +
  `visual_swap_it`) prima del testo. `form_seed_bias` guida le preferenze.

### Layer 3 — Epigenome (NET-NEW, appreso nel Nido) ⭐
- **Substrato esistente**: `vcScoring` (telemetria VC -> assi MBTI da come giochi)
  + categoria **Memorie** (`memoria_ambientale`, `inheritance_weight:0.0` =
  sempre rigenerata = hook epigenetico) + `form_seed_bias`.
- **Net-new**: rendere lo stato VC-appreso **parzialmente ereditabile**
  (Lamarck-lite): l'epigenome play-shaped dei genitori **bias** l'espressione
  della prole. **Questo e' il motore di "how you play shapes what you become".**
- **DESIGN-NOVEL — giustificazione obbligatoria**: zero precedente canonico per
  l'eredita' Lamarckiana. Giustificato dal pilastro §02 + dal tono bio-plausibile
  ("memoria ambientale" come epigenetica, non magia). Va in ADR con red-team.
- **Economy**: l'epigenome alimenta i **Frammenti Genetici** di Tri-Sorgente
  (§20: skip-cards -> Frammenti, "evoluzione tipo Spore"). **NON inventare una
  currency parallela** -- riusare quella.

### Speciazione emergente
- Divergenza genotype accumulata su generazioni (drift + selezione bioma);
  oltre soglia -> lineage letta come "specie-forma" distinta. Gia' parziale via
  `getTribesEmergent` (>=3 stesso lineage). Estendere con soglia complexity/T-band.

## 3. Vincoli & anti-pattern (da Spore extraction §3 + freeze)
- **Irreversibilita'** (pilastro narrativo): mutazione permanente = peso. NO
  infinite-revert (Spore-trap esplicito).
- **NO**: editor real-time mid-encounter, full 5-stage, creator 3D, sandbox-nav,
  real-time combat. Mutazioni si applicano in nest/debrief.
- **5 body_slot locked** + complexity-budget + biome T-bands = hard constraints.
- **Leggibilita' (§21 A.L.I.E.N.A.)**: il player vede esiti ("la prole ha preso
  la corazza del padre, il deserto ne ha svegliato la sete"), NON loci/alleli.

## 4. Fasatura (anti-over-engineer vs freeze)

Ancora ai 3 reuse-path Spore (`docs/research/...` §4) + i TKT-CREATURE-SPORE-01..10:

- **Fase 0 (MVP-freeze, gia' ~shippable)**: lo slice freeze attuale (2-slot +
  1-env, trust+nest, 1-2 seed). Niente nuovo.
- **Fase 1 (Moderate ~21h, S1-S2-S3-S4p-S6)**: body_slot + part->ability +
  MP-pool + morphology + bingo. **Richiede ADR-supersede §21.3** (sblocca genetica
  oltre il minimal).
- **Fase 2 (Full ~+15h, S5 + reconcile)**: wire `propagateLineage` lifecycle hook
  + **fix cross-lineage isolation** + unificare i 3 impl Godot (mating_trigger
  avg-blend + lineage_merge + ritual) sotto il genotype model + promuovere
  ibridazione da display-only.
- **Fase 3 (Epigenome, net-new)**: layer 3 Lamarck-lite + Frammenti wire +
  speciazione soglia. Il vero contributo di profondita'.

## 5. Decisioni richieste (master-dd, pre-build)
1. **ADR-supersede §21.3**: confermare che il deep-genetics esce dal freeze-defer
   (altrimenti resta vision-only).
2. **Epigenome Lamarck-lite**: accettare il design-novel (eredita' play-shaped)?
   Red-team: rischio "snowball" (genitori forti -> prole sempre piu' forte) ->
   serve decay/regression-to-mean.
3. **Reconcile i 2 path**: confermare che mating (individuale) e drift-pool
   (S5 ambientale) restano tipi distinti + fixare cross-lineage isolation.
4. **Godot unify**: i 3 impl parziali Godot vanno unificati sotto il backend
   genotype, o Godot resta avg-blend "display" finche' il backend e' canonico?

## 6. Out of scope (qui)
Implementazione (writing-plans separato per fase). UI del gene-grid. Authoring
catalog 30->50 mutazioni. Bilanciamento numerico. Promozione a SoT canonico
(nuova sezione vault) -- avviene dopo l'ADR-supersede.
