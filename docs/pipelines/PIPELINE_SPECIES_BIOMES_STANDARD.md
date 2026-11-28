---
title: Pipeline SPECIES+BIOMES STANDARD (10 step)
doc_status: draft
doc_owner: flow-team
workstream: flow
last_verified: 2026-06-21
source_of_truth: false
language: it-en
review_cycle_days: 30
---

# Pipeline SPECIES+BIOMES STANDARD (10 step)

Pipeline di riferimento per nuove coppie bioma/specie, basata sugli agenti
definiti in `agents/agents_index.json` e sugli schemi dati correnti del repo Game.

## Layout dati corrente (ground-truth 2026-06-21)

- **Specie**: una specie = un file `data/core/species/<id>_lifecycle.yaml`
  (per-specie). L'aggregato e' `data/core/species/species_catalog.json`.
  Il vecchio monolite `data/core/species.yaml` e' stato RIMOSSO (#2271).
  Alias: `data/core/species/aliases.json`. Stat base: `data/core/species/base_stats.yaml`.
- **Biomi**: `data/core/biomes.yaml` + alias `data/core/biome_aliases.yaml`.
- **Pool ambientali/trait per bioma**: `data/core/traits/biome_pools.json`.
- **Affinita' specie-trait**: `data/traits/species_affinity.json`.
- **Schemi canonici**: `schemas/evo/species_catalog.schema.json`,
  `schemas/evo/biome.schema.json` (NON piu' `config/schemas/`, che resta solo
  come copia legacy non canonica).

> **Canon-enforcement (regenerate-or-die)**: i file derivati delle specie
> (`species_catalog.json`, catalogo pack `packs/evo_tactics_pack/.../species/*.json`,
> index) NON si modificano MAI a mano. Portano il marker DO-NOT-EDIT
> (`scripts/utils/generatedMarker.js`); il gate CI regenerate-and-diff
> (`dataset-checks`) reverte qualsiasi hand-edit. Modifica SEMPRE la sorgente
> YAML per-specie e rigenera con `npm run sync:evo-pack`.

## Comandi di validazione (eseguire dopo ogni step che tocca i dati)

```
python3 tools/py/game_cli.py validate-datasets
python3 tools/py/game_cli.py validate-ecosystem-pack \
    --json-out out/validation/pack.json --html-out out/validation/pack.html
npm run schema:lint
npm run sync:evo-pack
pytest tests/scripts/test_trace_hashes.py
node --test tests/scripts/sync_evo_pack_assets.test.js
```

`validate-datasets` valida `species_catalog.json` contro
`schemas/evo/species_catalog.schema.json` e `biomes.yaml` contro
`schemas/evo/biome.schema.json` (oltre al cross-ref ecologia ADR-2026-05-02).

---

1. Kickoff e vincoli (coordinator)
   - Input (file reali): `agents/agents_index.json`; `data/core/biomes.yaml`;
     `data/core/species/species_catalog.json`; `data/core/traits/biome_pools.json`;
     `docs/traits/trait_reference_manual.md`
   - Output attesi: perimetro feature, mappa dipendenze tra bioma/specie/trait,
     checklist impatti su dataset globali
   - Rischio: Basso

2. Identita' e lore (lore-designer)
   - Input (file reali): `data/core/biomes.yaml`; `docs/core/20-SPECIE_E_PARTI.md`
   - Output attesi: descrizione narrativa del bioma, hook narrativi per specie
     native/collegate, tono e temi
   - Rischio: Medio

3. Modellazione bioma (biome-ecosystem-curator)
   - Input (file reali): `data/core/biomes.yaml`; `data/core/biome_aliases.yaml`;
     `schemas/evo/biome.schema.json`; `data/core/traits/biome_pools.json`
   - Output attesi: scheda bioma con livelli ambientali, biome_tags e
     requisiti_ambientali, alias, piano pool ambientali
   - Rischio: Alto

4. Trait ambientali (trait-curator)
   - Input (file reali): `data/core/traits/biome_pools.json`;
     `data/core/traits/glossary.json`; `data/traits/index.json`;
     `data/traits/species_affinity.json`; `docs/traits/trait_reference_manual.md`;
     `apps/trait-editor/docs/howto-author-trait.md`
   - Output attesi: elenco trait ambientali/temporanei, proposte di nuovi trait o
     mapping slug, draft aggiornamento pool e glossary. NB: i VALORI degli effetti
     vivono solo in `data/core/traits/active_effects.yaml` (vedi PIPELINE_TRAIT_STANDARD)
   - Rischio: Alto

5. Specie collegate (species-curator)
   - Input (file reali): `data/core/species/species_catalog.json` (sola lettura
     aggregato); `data/core/species/<id>_lifecycle.yaml` (sorgente per-specie da
     creare/editare); `data/core/species/aliases.json`;
     `data/traits/species_affinity.json`; `docs/core/20-SPECIE_E_PARTI.md`;
     output step 2-4
   - Output attesi: trait_plan e biome_affinity per specie native/collegate, note
     su sinergie/conflitti di trait. Editare la sorgente per-specie, MAI
     `species_catalog.json` (derivato)
   - Rischio: Alto

6. Bilanciamento (balancer)
   - Input (file reali): output step 3-5;
     `packs/evo_tactics_pack/data/balance/trait_mechanics.yaml`;
     `docs/core/10-SISTEMA_TATTICO.md`; `docs/core/11-REGOLE_D20_TV.md`
   - Output attesi: tuning valori numerici e curve di potere, linee guida per
     forme dinamiche o effetti condizionati
   - Rischio: Alto

7. Validazione cross-dataset (coordinator)
   - Input (file reali): output step 3-6; `data/core/traits/biome_pools.json`;
     `data/core/species/species_catalog.json`; `data/core/biomes.yaml`
   - Comandi: `validate-datasets` + `validate-ecosystem-pack` + `schema:lint`
   - Output attesi: report coerenza tra pool e trait_plan, verifica
     duplicati/conflitti, lista patch su dataset globali
   - Rischio: Medio

8. Asset e schede (asset-prep)
   - Input (file reali): `assets/`; `packs/evo_tactics_pack/docs/catalog/`;
     output step 2-6
   - Output attesi: bozze card/illustrazioni e schede `.md` per bioma e specie,
     naming asset e riferimenti visivi
   - Rischio: Medio

9. Documentazione e archiviazione (archivist)
   - Input (file reali): output step 1-8; `docs/traits/trait_reference_manual.md`;
     `docs/README.md`
   - Output attesi: aggiornamenti documentazione e indici, archiviazione report di
     pipeline in `docs/reports/`. Nuovi doc in `docs/` -> frontmatter + registry
     (`python tools/check_docs_governance.py --strict`)
   - Rischio: Basso

10. Piano esecutivo (coordinator)
    - Input (file reali): output step 1-9; `Makefile` (target `evo-validate`,
      `evo-run`); `npm run sync:evo-pack`
    - Output attesi: rigenerazione derivati (`sync:evo-pack`), roadmap esecuzione,
      assegnazione task e check finali per merge/CI
    - Rischio: Basso
