# GOLDEN_PATH_FEATURE – Pipeline istanziata per nuove feature complesse

Questa guida istanzia il Golden Path (vedi `docs/pipelines/GOLDEN_PATH.md`) per
una feature complessa **Bioma + Specie + Trait**, mantenendo l'esecuzione in
STRICT MODE / SANDBOX. Usala quando ricevi un comando `GOLDEN_PATH_FEATURE`
con la descrizione della feature ad alto livello.

---

## 0) Input iniziale

- **Feature (descrizione sintetica):** _inserisci qui la richiesta utente (es. “Nuovo bioma X con specie Y, Z, pool di trait e correnti temporanee”)_
- **Pipeline da combinare:**
  - SPECIE+BIOMI (se la feature introduce bioma e specie collegate)
  - TRAIT (se aggiunge o modifica soltanto trait/glossary/index)
  - eventuali pipeline custom (missioni/encounter, regole engine)

---

## 1) Kickoff (coordinator)

- **Obiettivo:** delimitare il perimetro e scegliere le pipeline specifiche da attivare.
- **Agente:** coordinator
- **Input:**
  - agent_constitution.md, agent.md, router.md
  - docs/pipelines/GOLDEN_PATH.md, docs/pipelines/GOLDEN_PATH_FEATURE.md
  - pipeline specifiche selezionate (SPECIE+BIOMI, TRAIT)
- **Output (sandbox):** briefing `docs/pipelines/<feature>_step1_kickoff.md` con scope, dataset coinvolti, rischi, pipeline selezionate.
- **Esecuzione:** via `PIPELINE_EXECUTOR` Step 1, STRICT MODE / SANDBOX.

---

## 2) Design & Lore (lore-designer + curator)

- **Obiettivo:** definire identità, livelli ambientali, hook delle specie.
- **Agenti:** lore-designer (+ species-curator / biome-ecosystem-curator se rilevante)
- **Input:** output Step 1, docs/biomes.md, docs/20-SPECIE_E_PARTI.md, hooks narrativi esistenti.
- **Output (sandbox):** `docs/biomes/<feature>_lore.md` e/o `docs/species/<feature>_lore.md` con descrizioni narrative.
- **Esecuzione:** `PIPELINE_EXECUTOR` Step 2, STRICT MODE / SANDBOX.

---

## 3) Modellazione dati Bioma/Pool/Specie (curator)

- **Obiettivo:** strutturare bioma, pool, trait_plan senza toccare dataset reali.
- **Agenti:** biome-ecosystem-curator, trait-curator, species-curator
- **Input:** output Step 2, config/schemas/\*, data/core/biomes.yaml, biome_pools.json, species.yaml, glossary/index.
- **Output (sandbox):**
  - `docs/biomes/<feature>_biome.md` (scheda tecnica + alias/terraform bands)
  - `docs/traits/<feature>_trait_draft.md` (pool + trait temporanei)
  - `docs/species/<feature>_species_draft.md` (trait_plan, biome_affinity)
- **Esecuzione:** `PIPELINE_EXECUTOR` Step 3-4-5 (SPECIE+BIOMI) e/o Step della pipeline TRAIT, sempre STRICT MODE.

---

## 4) Bilanciamento (balancer)

- **Obiettivo:** proporre numeri, scaling, limiti di stacking/form shift.
- **Agente:** balancer
- **Input:** output Step 3, 4, 5; docs/10-SISTEMA_TATTICO.md; data/core/game_functions.yaml.
- **Output (sandbox):** `docs/balance/<feature>_balance_draft.md` con HP/Armor/Resist, attacchi, costi, regole dinamiche.
- **Esecuzione:** `PIPELINE_EXECUTOR` Step 6 (SPECIE+BIOMI) in STRICT MODE.

---

## 5) Validazione cross-dataset (coordinator)

- **Obiettivo:** verificare coerenza slug/pool/trait_plan/biome_affinity e conflitti.
- **Agente:** coordinator
- **Input:** draft sandbox (biome, trait, species, balance), dataset core per confronto, script `tools/traits/check_biome_feature.py`.
- **Output (sandbox):** `docs/reports/<feature>_validation_report.md` con problemi e patch_proposte.
- **Esecuzione:** `PIPELINE_EXECUTOR` Step 7 (SPECIE+BIOMI) + run opzionale `python tools/traits/check_biome_feature.py --biome <slug> --dry-run --verbose`.

---

## 6) Asset & Catalogo (asset-prep)

- **Obiettivo:** naming asset e schede `.md` per bioma/specie.
- **Agente:** asset-prep
- **Input:** output dei passi precedenti, cartelle assets/ e docs/catalog/.
- **Output (sandbox):** `docs/catalog/<feature>_assets_draft.md` + eventuali stub card.
- **Esecuzione:** `PIPELINE_EXECUTOR` Step 8, STRICT MODE.

---

## 7) Documentazione & Archiviazione (archivist)

- **Obiettivo:** appendici per manuali e changelog.
- **Agente:** archivist
- **Input:** output dei passi 1–6.
- **Output (sandbox):** `docs/reports/<feature>_archivist_final.md` con appendici per docs/biomes.md, docs/trait_reference_manual.md e changelog.
- **Esecuzione:** `PIPELINE_EXECUTOR` Step 9, STRICT MODE.

---

## 8) Piano esecutivo & Patchset (coordinator)

- **Obiettivo:** preparare applicazione controllata delle patch.
- **Agente:** coordinator
- **Input:** tutti gli output sandbox + GOLDEN_PATH.md.
- **Output (sandbox):**
  - `docs/pipelines/<feature>_execution_plan.md` con ordine dataset/CI
  - `docs/reports/<feature>_patchset_sandbox.md` con blocchi `PATCH N`
- **Esecuzione:** `PIPELINE_EXECUTOR` Step 10 o comando APPLY_PIPELINE_RESULT (sandbox) per generare patch.

---

## 9) Applicazione patch (manuale)

- **Agente umano / dev-tooling**
- **Procedura consigliata:**
  1. `git checkout -b feature/<slug_feature>`
  2. applicare i blocchi patch in ordine dal patchset sandbox
  3. eseguire lint/test/schema:
     - `npm run lint` (o `npm run lint:stack` se definito)
     - `python tools/traits/check_biome_feature.py --biome <slug> --dry-run --verbose`
     - validazioni schema JSON/YAML (ajv/jsonschema)
  4. preparare PR con checklist CI green e nessun slug duplicato.

---

## Note operative

- Ogni Step va eseguito via `PIPELINE_EXECUTOR` in STRICT MODE / SANDBOX: si producono
  solo draft/patch, mai scritture dirette sui dataset core.
- In caso di feature solo trait (senza bioma/specie), usa la pipeline TRAIT e
  ometti gli Step specie/bioma non pertinenti, mantenendo comunque Kickoff →
  Modellazione → Validazione → Patchset.
- Documenta nel briefing di Step 1 quali parti del Golden Path vengono incluse o
  saltate in base alla feature.
