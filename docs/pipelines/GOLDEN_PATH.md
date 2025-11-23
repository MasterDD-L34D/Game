# GOLDEN_PATH – Pipeline globale per nuove feature

Questo documento definisce il percorso standard (Golden Path) per introdurre
una nuova feature complessa nel progetto **Game / Evo Tactics** usando
il sistema di agenti (coordinator, lore-designer, trait-curator, species-curator,
biome-ecosystem-curator, balancer, asset-prep, archivist, dev-tooling).

Una “feature” può essere, ad esempio:

- un nuovo bioma + set di specie + pool di trait
- una nuova fazione / sottosistema di trait
- un pacchetto di missioni / encounter che usa specie e biomi esistenti
- un’espansione di regole / strumenti

---

## Fase 0 – Kickoff (Coordinator)

**Obiettivo:** comprendere la feature, i dataset coinvolti e i rischi.

**Agente:** coordinator  
**Input tipici:**

- agent_constitution.md
- agent.md
- router.md
- docs/PIPELINE_TEMPLATES.md
- docs/pipelines/GOLDEN_PATH.md
- eventuali pipelines specifiche (TRAIT / SPECIES+BIOMES)

**Output:**

- perimetro della feature (descrizione chiara)
- lista dei dataset coinvolti (traits, species, biomes, engine, asset, docs)
- checklist rischi (schema, CI, bilanciamento)
- decisione su quali pipeline specifiche usare (TRAIT, SPECIES+BIOMES, ecc.)

---

## Fase 1 – Design & Lore

**Obiettivo:** definire il “cosa” a livello narrativo e concettuale.

**Agenti:**

- lore-designer
- (eventualmente) species-curator
- (eventualmente) biome-ecosystem-curator

**Output:**

- descrizioni di:
  - biomi / ambienti
  - specie / unità / NPC
  - fazioni / archetipi
  - fenomeni speciali (es. correnti, hazard globali)
- documenti sandbox in `docs/lore/`, `docs/biomes/`, `docs/species/`:
  - NON ancora integrati nei dataset core, solo concept.

---

## Fase 2 – Modellazione dati (Traits / Specie / Biomi)

**Obiettivo:** trasformare la visione in struttura dati coerente con gli schemi.

**Agenti:**

- trait-curator
- species-curator
- biome-ecosystem-curator

**Output:**

- trait ambientali / comportamentali / temporanei:
  - strutturati rispetto a:
    - config/schemas/trait.schema.json
    - data/core/traits/glossary.json
    - data/traits/index.json
- pool di trait:
  - data/core/traits/biome_pools.json
- strutture specie:
  - data/core/species.yaml
  - data/traits/species_affinity.json
- strutture biomi:
  - data/core/biomes.yaml
  - data/core/biome_aliases.yaml
  - biomes/terraforming_bands.yaml

Il tutto inizialmente in **formato sandbox** (draft .md / patch proposte).

---

## Fase 3 – Bilanciamento & Regole

**Obiettivo:** assegnare numeri e comportamenti, evitando power creep.

**Agente:** balancer  
**Input:**

- trait_plan & biome_affinity dalle fasi precedenti
- game_functions, sistema D20 TV, regole interne
  **Output:**
- proposte di:
  - HP / Armor / Resist
  - danni, CD, costi, cooldown
  - limiti di stacking
  - logiche di forma (se dinamiche)
- draft in `docs/balance/…_balance_draft.md`

---

## Fase 4 – Validazione cross-dataset

**Obiettivo:** assicurare che tutti i pezzi combacino.

**Agente:** coordinator  
**Input:**

- biomes.yaml
- biome_pools.json
- glossary/index
- species.yaml
- species_affinity.json
- balance draft
  **Output:**
- report di validazione:
  - slug duplicati
  - mismatch trait_plan ↔ pool ↔ bioma
  - problemi di stacking
- patch_proposte (NON applicate) in `docs/reports/…_validation_report.md`

---

## Fase 5 – Asset & Catalogo

**Obiettivo:** creare schede e naming per asset grafici e cataloghi.

**Agente:** asset-prep  
**Output:**

- naming asset in `assets/...`
- schede `.md` per biomi/specie in `docs/catalog/…`
- template card/illustrazioni
- draft in `docs/catalog/…_assets_draft.md`

---

## Fase 6 – Documentazione & Archiviazione

**Obiettivo:** allineare la documentazione di alto livello con il contenuto.

**Agente:** archivist  
**Output:**

- appendici per:
  - docs/biomes.md
  - docs/trait_reference_manual.md
  - eventuali README o manuali
- indexes/species/biomes aggiornati (in bozza)
- changelog / release note in `docs/reports/…_archivist_final.md`

---

## Fase 7 – Piano esecutivo & Patchset

**Obiettivo:** costruire un percorso sicuro per aggiornare i dataset reali.

**Agente:** coordinator  
**Output:**

- execution_plan in `docs/pipelines/<feature>_execution_plan.md` con:
  - ordine patch per dataset core
  - branch Git consigliata
  - sequenza commit
  - controlli CI/lint
- patchset in `docs/reports/<feature>_patchset_sandbox.md`:
  - blocchi `--- PATCH N: path ---` con diff da applicare.

---

## Fase 8 – Applicazione controllata (fuori dal Golden Path “logico”)

Questa fase non è automatica: viene eseguita da un umano (o da tooling dedicato).

**Suggerimento:**

- creare branch `feature/<nome_feature>`
- applicare patch in ordine
- eseguire:
  - lint
  - test
  - validatori schema/slug

---
