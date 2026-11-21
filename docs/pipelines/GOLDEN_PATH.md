---
title: GOLDEN_PATH -- Pipeline globale per nuove feature
doc_status: draft
doc_owner: flow-team
workstream: flow
last_verified: 2026-06-21
source_of_truth: false
language: it-en
review_cycle_days: 30
---

# GOLDEN_PATH -- Pipeline globale per nuove feature

Questo documento definisce il percorso standard (Golden Path) per introdurre
una nuova feature complessa nel progetto **Game / Evo Tactics** usando
il sistema di agenti (coordinator, lore-designer, trait-curator, species-curator,
biome-ecosystem-curator, balancer, asset-prep, archivist, dev-tooling).

Una "feature" puo' essere, ad esempio:

- un nuovo bioma + set di specie + pool di trait
- una nuova fazione / sottosistema di trait
- un pacchetto di missioni / encounter che usa specie e biomi esistenti
- un'espansione di regole / strumenti

> **Layout dati corrente (2026-06):** il monolite `data/core/species.yaml` e'
> stato RIMOSSO (#2271). Le specie vivono in file per-specie sotto
> `data/core/species/*.yaml` + catalogo derivato
> `data/core/species/species_catalog.json`. **Canon-enforcement (regenerate-or-die):**
> i file derivati (catalogo, mirror pack) NON si editano a mano -- si rigenerano
> via `npm run sync:evo-pack` e si validano via `scripts/check-canon-consistency.cjs`.

---

## Fase 0 -- Kickoff (Coordinator)

**Obiettivo:** comprendere la feature, i dataset coinvolti e i rischi.

**Agente:** coordinator
**Input tipici:**

- agent_constitution.md
- agent.md
- router.md
- docs/pipelines/PIPELINE_TEMPLATES.md
- docs/pipelines/GOLDEN_PATH.md
- eventuali pipelines specifiche (TRAIT / SPECIES+BIOMES)

**Output:**

- perimetro della feature (descrizione chiara)
- lista dei dataset coinvolti (traits, species, biomes, engine, asset, docs)
- checklist rischi (schema, CI, bilanciamento)
- decisione su quali pipeline specifiche usare (TRAIT, SPECIES+BIOMES, ecc.)

---

## Fase 1 -- Design & Lore

**Obiettivo:** definire il "cosa" a livello narrativo e concettuale.

**Agenti:**

- lore-designer
- (eventualmente) species-curator
- (eventualmente) biome-ecosystem-curator

**Output:**

- descrizioni di:
  - biomi / ambienti
  - specie / unita' / NPC
  - fazioni / archetipi
  - fenomeni speciali (es. correnti, hazard globali)
- documenti sandbox in `docs/biomes/`, `docs/species/`:
  - NON ancora integrati nei dataset core, solo concept.

---

## Fase 2 -- Modellazione dati (Traits / Specie / Biomi)

**Obiettivo:** trasformare la visione in struttura dati coerente con gli schemi.

**Agenti:**

- trait-curator
- species-curator
- biome-ecosystem-curator

**Output:**

- trait ambientali / comportamentali / temporanei, strutturati rispetto a:
  - config/schemas/trait.schema.json
  - data/core/traits/glossary.json
  - data/core/traits/active_effects.yaml
  - data/traits/index.json
  - meccaniche numeriche: packs/evo_tactics_pack/data/balance/trait_mechanics.yaml
- pool di trait:
  - data/core/traits/biome_pools.json
- strutture specie:
  - data/core/species/<slug>.yaml (file per-specie; il monolite e' stato rimosso)
  - data/core/species/species_catalog.json (catalogo DERIVATO -- rigenerato, non editato a mano)
  - data/traits/species_affinity.json
- strutture biomi:
  - data/core/biomes.yaml
  - data/core/biome_aliases.yaml
  - biomes/terraforming_bands.yaml

Il tutto inizialmente in **formato sandbox** (draft .md / patch proposte).

---

## Fase 3 -- Bilanciamento & Regole

**Obiettivo:** assegnare numeri e comportamenti, evitando power creep.

**Agente:** balancer
**Input:**

- trait_plan & biome_affinity dalle fasi precedenti
- game_functions (data/core/game_functions.yaml), sistema D20 TV, regole interne
- combat engine canonico Node in `apps/backend/services/combat/`
  (il vecchio rules engine Python `services/rules/` e' stato rimosso, ADR-2026-04-19)

**Output:**

- proposte di:
  - HP / Armor / Resist
  - danni, CD, costi, cooldown
  - limiti di stacking
  - logiche di forma (se dinamiche)
- draft in `docs/balance/..._balance_draft.md`

---

## Fase 4 -- Validazione cross-dataset

**Obiettivo:** assicurare che tutti i pezzi combacino.

**Agente:** coordinator
**Input:**

- biomes.yaml
- biome_pools.json
- glossary/index
- data/core/species/\*.yaml + species_catalog.json
- species_affinity.json
- balance draft

**Comandi di validazione (eseguibili):**

- `python3 tools/py/game_cli.py validate-datasets`
- `python3 tools/py/game_cli.py validate-ecosystem-pack --json-out ... --html-out ...`
- `npm run schema:lint` (AJV su schemas/evo)
- `node scripts/check-canon-consistency.cjs` (canon interno specie/catalogo)

**Output:**

- report di validazione:
  - slug duplicati
  - mismatch trait_plan <-> pool <-> bioma
  - problemi di stacking
- patch_proposte (NON applicate) in `docs/reports/..._validation_report.md`

---

## Fase 5 -- Asset & Catalogo

**Obiettivo:** creare schede e naming per asset grafici e cataloghi.

**Agente:** asset-prep
**Output:**

- naming asset in `assets/...`
- schede `.md` per biomi/specie in `docs/catalog/...`
- template card/illustrazioni
- draft in `docs/catalog/..._assets_draft.md`

---

## Fase 6 -- Documentazione & Archiviazione

**Obiettivo:** allineare la documentazione di alto livello con il contenuto.

**Agente:** archivist
**Output:**

- appendici per:
  - docs/biomes/biomes.md
  - docs/traits/trait_reference_manual.md
  - eventuali README o manuali
- indexes/species/biomes aggiornati (in bozza)
- changelog / release note in `docs/reports/..._archivist_final.md`

---

## Fase 7 -- Piano esecutivo & Patchset

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

## Fase 8 -- Applicazione controllata (fuori dal Golden Path "logico")

Questa fase non e' automatica: viene eseguita da un umano (o da tooling dedicato).

**Suggerimento:**

- creare branch `feature/<nome_feature>`
- applicare patch in ordine
- se hai toccato `data/core/species/` -> RIGENERA il catalogo e i mirror pack
  (`npm run sync:evo-pack`), non editare i file derivati a mano
- eseguire:
  - `npm run format:check` (Prettier)
  - `npm run test` / `npm run test:api` (backend) + `node --test tests/ai/*.test.js`
  - `PYTHONPATH=tools/py pytest` (validatori/tooling Python)
  - validatori dataset/schema: `python3 tools/py/game_cli.py validate-datasets`,
    `npm run schema:lint`, `node scripts/check-canon-consistency.cjs`

> Backend Express live su :3334 (`npm run start:api`). Combat = Node in
> `apps/backend/services/combat/`.

---
